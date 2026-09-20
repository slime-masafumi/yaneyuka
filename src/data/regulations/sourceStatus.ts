import status from './sourceStatus.json';
import { LAW_IDS } from './lawSources';
import type { RegulationRule, SourceAlert } from './types';

export type { SourceAlert };

/**
 * 原典の更新状況
 *
 * scripts/check-regulation-sources.mjs が sourceStatus.json を書き出し、ここが読む。
 * 判定ルールは自治体の条例・要綱を人が読んで書き起こしているので、原典が改訂されると
 * こちらのデータは黙って古くなる。それを画面に出すためのもの。
 *
 * 「原典が更新されている」ことは分かるが「新しい内容が何か」は分からない。
 * だから表示も断定せず、原典を見に行く導線を出すに留める。
 */

interface DocumentEntry {
  label: string;
  ruleIds: string[];
  status: string;
  baselineAt?: string;
  changedAt?: string;
  error?: string;
}

const documents = status.documents as Record<string, DocumentEntry>;
const lawUpdates = (status.egov?.updates ?? []) as { lawId: string; lawName: string; date: string }[];

/** e-Gov の法令ページURL -> 法令ID */
const urlToLawId = new Map<string, string>(
  Object.values(LAW_IDS).map((id) => [`https://laws.e-gov.go.jp/law/${id}`, id as string])
);

/** この更新検知そのものが最後に走った日時 */
export const SOURCE_STATUS_GENERATED_AT: string = status.generatedAt;

/** 更新が見つかった原典を持つルールのID */
export const AFFECTED_RULE_IDS: ReadonlySet<string> = new Set(status.affectedRuleIds ?? []);

export const SOURCE_STATUS_SUMMARY = status.summary;

/**
 * 1件のルールについて、原典側で起きている変化を返す。
 * 何も起きていなければ空配列。
 */
export function getSourceAlerts(rule: RegulationRule): SourceAlert[] {
  const alerts: SourceAlert[] = [];

  for (const s of rule.sources) {
    // 自治体の資料
    const doc = documents[s.url];
    if (doc && (doc.status === 'changed' || doc.status === 'error')) {
      alerts.push({
        kind: 'document',
        label: s.label,
        url: s.url,
        baselineAt: doc.baselineAt,
        changedAt: doc.changedAt,
        error: doc.status === 'error' ? doc.error : undefined,
      });
      continue;
    }

    // e-Gov の法令
    const lawId = urlToLawId.get(s.url);
    if (!lawId) continue;
    for (const u of lawUpdates) {
      if (u.lawId !== lawId) continue;
      alerts.push({ kind: 'law', label: u.lawName || s.label, url: s.url, date: u.date });
    }
  }

  return alerts;
}

/** YYYYMMDD を読みやすくする */
export function formatLawDate(d?: string): string {
  if (!d || d.length !== 8) return d ?? '';
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

/** ISO日時を日付だけにする */
export function formatIsoDate(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}
