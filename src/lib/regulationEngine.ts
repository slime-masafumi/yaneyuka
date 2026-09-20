import { NATIONAL_CATEGORY_ORDER, NATIONAL_RULES } from '@/data/regulations/nationalRules';
import {
  getAuthorityOverrides,
  getMunicipalRules,
  MUNICIPAL_CATEGORIES,
  MUNICIPALITY_OPTIONS,
} from '@/data/regulations/municipalities';
import { USE_OPTIONS, SITE_FLAGS, WORK_TYPES, STRUCTURE_OPTIONS } from '@/data/regulations/options';
import {
  formatIsoDate,
  formatLawDate,
  getSourceAlerts,
  SOURCE_STATUS_GENERATED_AT,
} from '@/data/regulations/sourceStatus';
import type { Confidence, ProjectInput, RegulationRule, RuleHit } from '@/data/regulations/types';

export { MUNICIPALITY_OPTIONS, SOURCE_STATUS_GENERATED_AT, formatIsoDate, formatLawDate };

/**
 * 判定エンジン
 *
 * 生成AIを通さない。入力値と閾値の照合だけで結果が決まるので、同じ入力からは
 * 必ず同じ結果が出るし、条文にない項目が生えてくることもない。
 * ここを決定論に寄せているのは、この道具の役割が「答えを出すこと」ではなく
 * 「調査項目の漏れを潰すこと」だから。
 */

export interface CategoryResult {
  category: string;
  hits: RuleHit[];
}

export interface EvaluationResult {
  categories: CategoryResult[];
  total: number;
  byConfidence: Record<Confidence, number>;
  municipalityLabel: string;
  hasLocalLayer: boolean;
  generatedAt: Date;
  /** 抽出された項目のうち、出典側が取り込み時点から更新されているものの件数 */
  staleCount: number;
  /** 原典の更新確認を最後に実行した日時 */
  sourceCheckedAt: string;
}

function runRules(
  rules: RegulationRule[],
  input: ProjectInput,
  overrides: Record<string, string>
): RuleHit[] {
  const hits: RuleHit[] = [];
  for (const rule of rules) {
    let reason: string | null = null;
    try {
      reason = rule.match(input);
    } catch {
      // 1件のルールの不具合で全体が落ちないようにする
      reason = null;
    }
    if (reason) {
      // 国の法令でも、実際に行く窓口は自治体ごとに違う。
      // 自治体パックに課名・連絡先があればそちらを表示する。
      hits.push({
        rule,
        reason,
        authority: overrides[rule.id] ?? rule.authority,
        alerts: getSourceAlerts(rule),
      });
    }
  }
  return hits;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { definite: 0, likely: 1, check: 2 };

export function evaluate(input: ProjectInput): EvaluationResult {
  const municipality = MUNICIPALITY_OPTIONS.find((m) => m.id === input.municipalityId);
  const municipalRules = getMunicipalRules(input.municipalityId);
  const overrides = getAuthorityOverrides(input.municipalityId);

  const allHits = [
    ...runRules(NATIONAL_RULES, input, overrides),
    ...runRules(municipalRules, input, overrides),
  ];

  const order = [...NATIONAL_CATEGORY_ORDER, ...MUNICIPAL_CATEGORIES];
  const categories: CategoryResult[] = order
    .map((category) => ({
      category,
      hits: allHits
        .filter((h) => h.rule.category === category)
        .sort((a, b) => CONFIDENCE_RANK[a.rule.confidence] - CONFIDENCE_RANK[b.rule.confidence]),
    }))
    .filter((c) => c.hits.length > 0);

  const byConfidence: Record<Confidence, number> = { definite: 0, likely: 0, check: 0 };
  allHits.forEach((h) => {
    byConfidence[h.rule.confidence] += 1;
  });

  return {
    categories,
    total: allHits.length,
    byConfidence,
    municipalityLabel: municipality?.label ?? '未選択',
    hasLocalLayer: !!municipality?.hasLocalLayer,
    generatedAt: new Date(),
    staleCount: allHits.filter((h) => h.alerts.length > 0).length,
    sourceCheckedAt: SOURCE_STATUS_GENERATED_AT,
  };
}

// ---------------------------------------------------------------------------
// レポート生成
// ---------------------------------------------------------------------------

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  definite: '該当',
  likely: '該当の見込み',
  check: '要確認',
};

const label = <T extends { id: string; label: string }>(list: readonly T[], id: string) =>
  list.find((x) => x.id === id)?.label ?? id;

function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 入力条件を人が読める行の配列にする */
export function describeInput(input: ProjectInput): { label: string; value: string }[] {
  const uses = input.useIds.map((id) => label(USE_OPTIONS, id)).join('・') || '未選択';
  const works = input.workTypes.map((id) => label(WORK_TYPES, id)).join('・') || '未選択';
  const flags = input.siteFlags.map((id) => label(SITE_FLAGS, id)).join(' / ') || 'なし';
  const rows: { label: string; value: string }[] = [
    { label: '建設地', value: label(MUNICIPALITY_OPTIONS, input.municipalityId) },
    { label: '工事種別', value: works },
    { label: '用途', value: uses },
    { label: '用途地域', value: input.zoning },
    { label: '区域', value: `${input.inCityPlanningArea ? '都市計画区域等の内' : '都市計画区域外'}${input.urbanizationControlArea ? ' / 市街化調整区域' : ''}` },
    { label: '敷地面積', value: `${input.siteArea.toLocaleString()} m2` },
    { label: '建築面積', value: `${input.buildingArea.toLocaleString()} m2` },
    { label: '延べ面積', value: `${input.totalFloorArea.toLocaleString()} m2` },
    { label: '階数', value: `地上 ${input.floorsAbove} / 地下 ${input.floorsBelow}` },
    { label: '最高高さ', value: `${input.maxHeight} m` },
    { label: '構造', value: label(STRUCTURE_OPTIONS, input.structure) },
  ];
  if (input.storeArea > 0) rows.push({ label: '店舗面積', value: `${input.storeArea.toLocaleString()} m2` });
  if (input.demolitionArea > 0) rows.push({ label: '解体部分の床面積', value: `${input.demolitionArea.toLocaleString()} m2` });
  if (input.formChangeArea > 0) rows.push({ label: '土地の形質変更面積', value: `${input.formChangeArea.toLocaleString()} m2` });
  if (input.contractAmountManYen > 0) rows.push({ label: '請負金額', value: `${input.contractAmountManYen.toLocaleString()} 万円` });
  rows.push({ label: '立地条件', value: flags });
  return rows;
}

export const DISCLAIMER =
  'このレポートは、入力された条件から関係しうる法令・条例を機械的に抽出した調査の手掛かりです。' +
  '該当の有無および解釈の最終的な判断は、建築主事・特定行政庁・指定確認検査機関および各所管窓口の確認によります。' +
  '本レポートの内容が実際の審査結果を保証するものではありません。各項目は必ず原典と窓口で確認してください。';

/** レポートをMarkdownで書き出す */
export function toMarkdown(input: ProjectInput, result: EvaluationResult): string {
  const lines: string[] = [];
  lines.push(`# 対象法令チェックリスト`);
  lines.push('');
  lines.push(`作成日: ${formatDate(result.generatedAt)} / 建設地: ${result.municipalityLabel}`);
  lines.push('');
  lines.push('## 入力条件');
  lines.push('');
  lines.push('| 項目 | 内容 |');
  lines.push('| --- | --- |');
  describeInput(input).forEach((r) => lines.push(`| ${r.label} | ${r.value} |`));
  lines.push('');
  lines.push(
    `## 抽出結果（${result.total}件: 該当 ${result.byConfidence.definite} / 見込み ${result.byConfidence.likely} / 要確認 ${result.byConfidence.check}）`
  );
  lines.push('');
  lines.push(`原典の更新確認: ${formatIsoDate(result.sourceCheckedAt)} 実行`);
  if (result.staleCount > 0) {
    lines.push('');
    lines.push(
      `> **原典が更新されている項目が ${result.staleCount} 件あります。** 該当項目には「原典更新あり」と付けています。` +
        'この表示は出典の文書が取り込み時点から変わったことを示すもので、内容がどう変わったかは示しません。原典を直接確認してください。'
    );
  }
  lines.push('');

  result.categories.forEach((cat) => {
    lines.push(`### ${cat.category}`);
    lines.push('');
    cat.hits.forEach((hit, i) => {
      const r = hit.rule;
      const stale = hit.alerts.length > 0 ? ' ⚠原典更新あり' : '';
      lines.push(`${i + 1}. **${r.title}**（${CONFIDENCE_LABEL[r.confidence]}・${r.action}）${stale}`);
      lines.push(`   - 根拠: ${r.law} ${r.provision}`);
      if (r.threshold) lines.push(`   - 閾値: ${r.threshold}`);
      lines.push(`   - 該当理由: ${hit.reason}`);
      lines.push(`   - 内容: ${r.summary}`);
      lines.push(`   - 調査先: ${hit.authority}`);
      if (r.note) lines.push(`   - 注記: ${r.note}`);
      lines.push(`   - 出典: ${r.sources.map((s) => `${s.label} ${s.url}`).join(' / ')}（基準日 ${r.asOf}）`);
      hit.alerts.forEach((a) => {
        if (a.error) {
          lines.push(`   - ⚠ 原典を取得できませんでした: ${a.label}（${a.error}）`);
        } else if (a.kind === 'law') {
          lines.push(`   - ⚠ この法令は ${formatLawDate(a.date)} に改正されています: ${a.label}`);
        } else {
          lines.push(
            `   - ⚠ 原典が更新されています: ${a.label}（取り込み ${formatIsoDate(a.baselineAt)} / 更新検知 ${formatIsoDate(a.changedAt)}）`
          );
        }
      });
      lines.push('');
    });
  });

  lines.push('---');
  lines.push('');
  lines.push(DISCLAIMER);
  lines.push('');
  lines.push('法令データの出典: e-Gov法令検索（デジタル庁）政府標準利用規約（第2.0版）');
  return lines.join('\n');
}

/** レポートをHTMLで書き出す（Word/PDF出力と印刷に使う） */
export function toHtml(input: ProjectInput, result: EvaluationResult): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const inputRows = describeInput(input)
    .map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`)
    .join('');

  const body = result.categories
    .map((cat) => {
      const items = cat.hits
        .map((hit) => {
          const r = hit.rule;
          const sources = r.sources
            .map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`)
            .join(' / ');
          const alertRow = hit.alerts.length
            ? `<tr><th>原典の更新</th><td class="stale">${hit.alerts
                .map((a) =>
                  a.error
                    ? `原典を取得できませんでした: ${esc(a.label)}（${esc(a.error)}）`
                    : a.kind === 'law'
                      ? `この法令は ${esc(formatLawDate(a.date))} に改正されています: ${esc(a.label)}`
                      : `原典が更新されています: ${esc(a.label)}（取り込み ${esc(formatIsoDate(a.baselineAt))} / 更新検知 ${esc(formatIsoDate(a.changedAt))}）`
                )
                .join('<br>')}</td></tr>`
            : '';
          return `
        <div class="item">
          <div class="item-head">
            <span class="badge badge-${r.confidence}">${CONFIDENCE_LABEL[r.confidence]}</span>
            <span class="badge badge-action">${esc(r.action)}</span>
            ${hit.alerts.length ? '<span class="badge badge-stale">原典更新あり</span>' : ''}
            <span class="item-title">${esc(r.title)}</span>
          </div>
          <table class="detail">
            <tr><th>根拠</th><td>${esc(r.law)} ${esc(r.provision)}</td></tr>
            ${r.threshold ? `<tr><th>閾値</th><td>${esc(r.threshold)}</td></tr>` : ''}
            <tr><th>該当理由</th><td>${esc(hit.reason)}</td></tr>
            <tr><th>内容</th><td>${esc(r.summary)}</td></tr>
            <tr><th>調査先</th><td>${esc(hit.authority)}</td></tr>
            ${r.note ? `<tr><th>注記</th><td>${esc(r.note)}</td></tr>` : ''}
            <tr><th>出典</th><td>${sources}（基準日 ${esc(r.asOf)}）</td></tr>
            ${alertRow}
          </table>
        </div>`;
        })
        .join('');
      return `<h2>${esc(cat.category)}</h2>${items}`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>対象法令チェックリスト</title>
<style>
  body { font-family: "Yu Gothic", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif; font-size: 11pt; color: #111; line-height: 1.6; }
  h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 4px; }
  h2 { font-size: 13pt; margin-top: 20px; background: #f1f5f9; padding: 5px 8px; border-left: 4px solid #475569; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; font-size: 10pt; }
  th { background: #f8fafc; width: 100px; white-space: nowrap; }
  .item { margin-bottom: 12px; page-break-inside: avoid; }
  .item-head { margin-bottom: 4px; }
  .item-title { font-weight: bold; font-size: 11pt; }
  .badge { display: inline-block; font-size: 9pt; padding: 1px 6px; border-radius: 3px; margin-right: 4px; border: 1px solid; }
  .badge-definite { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  .badge-likely { background: #ffedd5; border-color: #fdba74; color: #9a3412; }
  .badge-check { background: #e0f2fe; border-color: #7dd3fc; color: #075985; }
  .badge-action { background: #f1f5f9; border-color: #cbd5e1; color: #334155; }
  .badge-stale { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
  .stale { background: #fffbeb; }
  .meta { color: #475569; font-size: 10pt; }
  .notice { margin: 8px 0; border: 1px solid #fcd34d; background: #fffbeb; padding: 6px 8px; font-size: 10pt; }
  .disclaimer { margin-top: 20px; border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-size: 9.5pt; }
</style></head><body>
<h1>対象法令チェックリスト</h1>
<p class="meta">作成日: ${formatDate(result.generatedAt)}　建設地: ${esc(result.municipalityLabel)}　抽出 ${result.total} 件（該当 ${result.byConfidence.definite} / 見込み ${result.byConfidence.likely} / 要確認 ${result.byConfidence.check}）　原典の更新確認: ${esc(formatIsoDate(result.sourceCheckedAt))} 実行</p>
${
  result.staleCount > 0
    ? `<div class="notice"><strong>原典が更新されている項目が ${result.staleCount} 件あります。</strong> 該当項目に「原典更新あり」と付けています。これは出典の文書が取り込み時点から変わったことを示すもので、内容がどう変わったかは示しません。原典を直接確認してください。</div>`
    : ''
}
<h2>入力条件</h2>
<table>${inputRows}</table>
${body}
<div class="disclaimer">${esc(DISCLAIMER)}<br>法令データの出典: e-Gov法令検索（デジタル庁）政府標準利用規約（第2.0版）</div>
</body></html>`;
}
