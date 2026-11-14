/**
 * 建築の調べもの(/lookup/)の中身 = 設計情報(読みもの)と材料情報(早見表)へのつなぎ。
 * 建材ページの右列・計算ツールの横・サイト内検索が使う(2026-11-14。旧・条文の目次の代わり)。
 *
 *   材料情報の章 … /lookup/?tab=material&sec=section-6
 *   設計情報の記事 … /lookup/?post=7
 */
import { designPosts } from '@/data/design-posts';

export type InfoCat = '意匠' | '構造' | '機械' | '電気';

/** 材料情報の章(MaterialInfo の目次と同じ。章の本文は MaterialInfo.tsx の id と対応) */
export const MATERIAL_INFO_SECTIONS: Record<InfoCat, { id: string; title: string }[]> = {
  意匠: [
    { id: 'section-1', title: 'ガラス種別（JIS R 3202 他）' },
    { id: 'section-2', title: '木材比較表（代表樹種）' },
    { id: 'section-3', title: '内装仕上げ材（例）' },
    { id: 'section-4', title: 'タイル・石材・左官材' },
    { id: 'section-5', title: '内装壁・天井材' },
    { id: 'section-6', title: '外壁材・屋根材' },
    { id: 'section-7', title: '天井材（システム天井含む）' },
    { id: 'section-8', title: '金属板材' },
    { id: 'section-9', title: '塗料種別' },
    { id: 'section-10', title: 'シーリング材（シール材）' },
    { id: 'section-11', title: '主要断熱材一覧（熱伝導率 λ：W/m･K）' },
    { id: 'section-11a', title: 'LGS（軽量鉄骨天井・壁下地）規格（JIS A 6517）' },
  ],
  構造: [
    { id: 'section-12', title: '鉄筋（JIS G 3112）' },
    { id: 'section-13', title: 'H形鋼（JIS G 3192 形鋼の寸法・質量）' },
    { id: 'section-14', title: '六角ボルト（JIS B 1180・JIS B 1051）' },
    { id: 'section-15', title: '一般的な鋼板の板厚（JIS G 3193 他）' },
    { id: 'section-16', title: '鉄筋 断面積・単位重量 早見（参考）' },
    { id: 'section-17', title: '等辺山形鋼（L形） 代表例' },
    { id: 'section-18', title: '溝形鋼（C形鋼） 代表例' },
    { id: 'section-19', title: '角形・矩形鋼管（JIS G 3466 STKR 代表）' },
    { id: 'section-20', title: '高力ボルト（JIS B 1186 等）' },
    { id: 'section-21', title: '座金・ナット（対応規格）' },
    { id: 'section-22', title: 'アンカーボルト（定着材）' },
    { id: 'section-23', title: 'コンクリート（設計基準強度・材料特性）' },
    { id: 'section-24', title: '耐震補強・補強材（RC・SRC・S造共通）' },
  ],
  機械: [
    { id: 'section-25', title: '給排水・衛生配管材' },
    { id: 'section-26', title: '空調ダクト（材質・用途別）' },
    { id: 'section-27', title: '熱絶縁（保温材）' },
    { id: 'section-28', title: '空調・換気機器例（抜粋）' },
    { id: 'section-29', title: '冷媒配管・ドレン・機器接続材' },
    { id: 'section-30', title: '衛生器具・給排水装置' },
    { id: 'section-31', title: 'ポンプ・給水・排水装置' },
    { id: 'section-32', title: '消火設備・加圧装置' },
  ],
  電気: [
    { id: 'section-33', title: '電線・配線材（JIS C 3307 等）' },
    { id: 'section-34', title: '分電盤・配電設備' },
    { id: 'section-35', title: '照明・スイッチ・コンセント類' },
    { id: 'section-36', title: '弱電・情報・セキュリティ設備' },
    { id: 'section-37', title: '接地・避雷・保安設備' },
    { id: 'section-38', title: '非常電源・防災・避難設備' },
    { id: 'section-39', title: '制御・計装・BEMS対応' },
    { id: 'section-40', title: '照度基準と設計目安（JIS Z 9110）' },
    { id: 'section-41', title: '実務的な配線・設計注意点' },
  ],
};

export const materialInfoHref = (sectionId: string) => `/lookup/?tab=material&sec=${encodeURIComponent(sectionId)}`;
export const designInfoHref = (postId: string) => `/lookup/?post=${encodeURIComponent(postId)}`;

/** 章 id → { 分野, 題 }。無ければ null */
export function findMaterialSection(id: string): { cat: InfoCat; id: string; title: string } | null {
  for (const [cat, list] of Object.entries(MATERIAL_INFO_SECTIONS) as [InfoCat, { id: string; title: string }[]][]) {
    const s = list.find((x) => x.id === id);
    if (s) return { cat, ...s };
  }
  return null;
}

export type InfoRow = { kind: '材料情報' | '設計情報'; title: string; sub: string; href: string };

/** 章 id・記事 id の並びを、一覧の行に。見つからないものは飛ばす */
export function infoRows(sections: string[] = [], posts: string[] = []): InfoRow[] {
  const rows: InfoRow[] = [];
  for (const id of sections) {
    const s = findMaterialSection(id);
    if (s) rows.push({ kind: '材料情報', title: s.title.replace(/（.*?）/g, ''), sub: `${s.cat} · 早見表`, href: materialInfoHref(id) });
  }
  for (const id of posts) {
    const p = designPosts.find((x) => x.id === id);
    if (p) rows.push({ kind: '設計情報', title: p.title.replace(/^【[^】]*】\s*/, ''), sub: `${p.category} · 読みもの`, href: designInfoHref(id) });
  }
  return rows;
}
