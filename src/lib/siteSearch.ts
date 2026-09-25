/**
 * 建材Chatbot の「引き出し」。サイトに既にある中身だけで答える（外部の AI には送らない）。
 *   - 建材ページの基本知識（src/data/knowledge.json。scripts/extract-knowledge.mjs が書き出す）
 *   - メーカー一覧（src/data/makers.json）
 *   - 設計ツール・一般ツール
 * 日本語は単語に切れないので、2 文字ずつ（bi-gram）の重なりで近さを測る。
 */

export type KnowledgePage = {
  route: string;
  param: string;
  name: string;
  title: string;
  makerPages: { category: string; page: string }[];
  sections: { heading: string; text: string }[];
};

export type MakerRowLite = { name: string; pages: string[]; products?: string; catalog?: string; contact?: string; sample?: string; cad?: string };

export type ToolEntry = { label: string; title: string; description: string; href: string; group: string };

export type SectionHit = { page: KnowledgePage; heading: string; text: string; score: number };
export type ToolHit = ToolEntry & { score: number };

/** 検索用に寄せる: 全角英数→半角、カタカナ→ひらがな、大文字→小文字 */
export function norm(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** 言い換え（質問に出てくる言い方 → ページで使っている言い方） */
const SYNONYMS: Array<[RegExp, string]> = [
  [/雨漏り|漏水|雨仕舞/, '防水 雨漏り'],
  [/窓/, 'サッシ'],
  [/防音|音漏れ/, '遮音'],
  [/床鳴り|きしみ/, 'フローリング 床鳴り'],
  [/クロス/, '壁紙'],
  [/コーキング/, 'シーリング'],
  [/錆|さび|サビ/, '防錆 腐食'],
  [/寒い|暑い/, '断熱'],
  [/カビ/, '結露 カビ'],
  [/ベランダ|バルコニー/, 'バルコニー FRP防水'],
  [/外構|駐車場/, '外構 舗装'],
  [/ガルバ/, 'ガルバリウム'],
  [/リフォーム|改修/, '改修 リフォーム カバー工法'],
  // 商品名 → 一般名（ページは一般名で書いてある）
  [/ヘーベル|シポレックス/, 'ALC'],
  [/アスロック|メース|ラムダ/, 'ECP 押出成形セメント板'],
  [/コロニアル|カラーベスト/, 'スレート'],
  [/ジプトーン|石膏ボード|プラスターボード/, '石膏ボード 天井'],
  [/モエン|光セラ/, '窯業サイディング'],
  [/サーモス|エピソード|APW/i, 'サッシ 断熱'],
];

/** 質問の決まり文句（中身が無いので捨てる） */
const STOP = /教えて(ください)?|おすすめ(は)?|について|知りたい|したい|ください|下さい|どう(すれば|したら|する)?|ですか|ますか|とは|でしょうか/g;
/** どのページにも出てくる語は軽く数える */
const GENERIC = new Set(['違い', '種類', '選び', '対策', '方法', '注意', '特徴', '比較']);
/** 語の後ろに付く助詞（「屋根で」の「で」など） */
const PARTICLE = /[のをにはがでとへもやか]/;

export type Gram = { g: string; w: number };

/**
 * 2 文字ずつに切る。
 *   - ひらがなだけの 2 文字（語尾・助詞）と、ひらがなで始まる 2 文字は捨てる
 *   - 後ろが助詞の 2 文字（「根で」「域の」）も捨てる。送り仮名（「選び」「漏り」）は残す
 *   - 英字の語はそのまま 1 語としても持つ（LIXIL など）
 * カタカナ→ひらがなの寄せは、この判定のあとでする（寄せてからだとカタカナ語が消える）
 */
export function grams(s: string): Gram[] {
  const t = s.normalize('NFKC').toLowerCase().replace(STOP, ' ').replace(/[\s、。・,.!?！？「」『』（）()[\]【】:：/]/g, ' ');
  const out = new Map<string, number>();
  const add = (g: string) => {
    const k = norm(g);
    out.set(k, GENERIC.has(g) ? 0.3 : 1);
  };
  for (const w of t.split(/\s+/)) {
    if (!w) continue;
    if (/^[a-z0-9]{2,}$/.test(w)) add(w);
    if (w.length === 1 && /[一-鿿]/.test(w)) add(w);
    for (let i = 0; i + 1 < w.length; i++) {
      const g = w.slice(i, i + 2);
      if (/^[ぁ-ゖ]/.test(g)) continue;
      if (/[ぁ-ゖ]$/.test(g) && PARTICLE.test(g[1])) continue;
      if (/^[ー]/.test(g)) continue;
      add(g);
    }
  }
  return [...out].map(([g, w]) => ({ g, w }));
}

export function expandQuery(q: string): string {
  let extra = '';
  for (const [re, add] of SYNONYMS) if (re.test(q)) extra += ' ' + add;
  return q + extra;
}

const scoreText = (qg: Gram[], text: string) => {
  if (!qg.length) return 0;
  const t = norm(text);
  let hit = 0;
  let all = 0;
  for (const { g, w } of qg) {
    all += w;
    if (t.includes(g)) hit += w;
  }
  return all ? hit / all : 0;
};

/** 基本知識の節を探す。見出し・ページ名に当たるほど強い */
export function searchKnowledge(pages: KnowledgePage[], query: string, limit = 5): SectionHit[] {
  const qg = grams(expandQuery(query));
  if (!qg.length) return [];
  const hits: SectionHit[] = [];
  for (const p of pages) {
    const pageScore = scoreText(qg, `${p.name} ${p.param} ${p.title}`);
    for (const s of p.sections) {
      const score = pageScore * 1.5 + scoreText(qg, s.heading) * 2 + scoreText(qg, s.text);
      if (score >= 0.35) hits.push({ page: p, heading: s.heading || p.title, text: s.text, score });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  // 同じページの節ばかりにならないよう、1 ページ 2 節まで
  const per = new Map<string, number>();
  const out: SectionHit[] = [];
  for (const h of hits) {
    const key = h.page.route + h.page.param;
    const n = per.get(key) ?? 0;
    if (n >= 2) continue;
    per.set(key, n + 1);
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}

export function searchTools(tools: ToolEntry[], query: string, limit = 3): ToolHit[] {
  const qg = grams(expandQuery(query));
  return tools
    .map((t) => ({ ...t, score: scoreText(qg, t.label) * 2 + scoreText(qg, t.title) * 1.5 + scoreText(qg, t.description) }))
    .filter((t) => t.score >= 0.6 && !/準備中/.test(t.description))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** 質問に社名がそのまま入っていれば、そのメーカー */
export function makersNamedIn(data: Record<string, MakerRowLite[]>, query: string): string[] {
  const q = norm(query).replace(/\s+/g, '');
  const names = new Set<string>();
  for (const rows of Object.values(data)) {
    for (const r of rows) {
      const n = norm(r.name).replace(/株式会社|\(株\)|\s+/g, '');
      if (n.length >= 2 && q.includes(n) && r.name !== '掲載準備中') names.add(r.name);
    }
  }
  return [...names].slice(0, 5);
}

/** ページに載っているメーカー（重複なし・リンクの多い順） */
export function makersForPage(data: Record<string, MakerRowLite[]>, page: Pick<KnowledgePage, 'makerPages'>, limit = 8): MakerRowLite[] {
  const seen = new Map<string, MakerRowLite>();
  for (const { category, page: pg } of page.makerPages) {
    for (const r of data[category] ?? []) {
      if (!r.pages.includes(pg) || r.name === '掲載準備中' || seen.has(r.name)) continue;
      seen.set(r.name, r);
    }
  }
  const links = (r: MakerRowLite) => [r.products, r.catalog, r.contact, r.sample, r.cad].filter((u) => u && u !== '#').length;
  return [...seen.values()].sort((a, b) => links(b) - links(a)).slice(0, limit);
}

/** 追いかけの質問（「メーカーは？」「カタログ」）かどうか */
export const asksForMakers = (q: string) =>
  /メーカー|製品|商品|会社|カタログ|サンプル|CAD|どこの/i.test(q.normalize('NFKC')) &&
  grams(q.replace(/メーカー|製品|商品|会社|カタログ|サンプル|CAD|どこの|ある/gi, '')).length === 0;

/** 長い本文を、当たった語の近くから切り出す */
export function excerpt(text: string, query: string, max = 220): string {
  if (text.length <= max) return text;
  const qg = grams(expandQuery(query));
  const t = norm(text);
  let at = -1;
  for (const { g } of qg) {
    const i = t.indexOf(g);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  const from = at < 0 ? 0 : Math.max(0, Math.min(at - 40, text.length - max));
  return (from > 0 ? '…' : '') + text.slice(from, from + max) + (from + max < text.length ? '…' : '');
}
