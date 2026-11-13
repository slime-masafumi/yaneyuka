import { MATERIAL_SCREEN_TO_PATH } from './siteScreens';
/**
 * 建材カテゴリと小分類の対応。
 *
 * MainLayout.tsx にカテゴリごとの配列と分岐が 16 組ぶん直書きされていて、
 * 1 組 24 行 × 16 でほぼ同じ処理が並んでいた。データをここへ移して、呼び出し側は
 * 表を引くだけにする。
 *
 * ⚠️ src/data/makers.json の pages とは一致しない。あちらは「メーカーが載っている
 * 小分類」で、こちらは「画面が受け付ける小分類」。エクステリアの大型引戸・駐輪場の
 * ように、ナビにはあるがメーカーを載せていない分類が意図的に存在する
 * （掲載依頼を引き出すため歯抜けにしてある）。makers.json から導出しないこと。
 */

/** カテゴリ -> ページの URL */
export const CATEGORY_ROUTES: Readonly<Record<string, string>> = MATERIAL_SCREEN_TO_PATH;

/** カテゴリ -> そのページが受け付ける小分類 */
export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  "roof": ["折板","金属屋根","スレート","瓦","屋根その他"],
  "exterior-wall": ["alc","ecp","金属サイディング","窯業サイディング","metalpanel","exterior-wall-other","paint","plaster","tile","stone-brick","metal-panel","wood-board","decorative","other-finish"],
  "opening": ["aluminum-sash","resin-sash","wood-sash","light-shutter","heavy-shutter"],
  "external-floor": ["external-tile","external-stone-brick","pvc-sheet","external-finish"],
  "exterior-other": ["笠木水切","庇オーニング","雨どい","ハト小屋","太陽光パネル","手摺"],
  "internal-floor": ["フローリング","ビニールタイル","ビニールシート","カーペット","内装タイル","内装床石レンガ","畳","巾木床見切","内装床機能性","内装床その他"],
  "internal-wall": ["内装壁壁紙","内装壁化粧板","内装壁化粧シート","内装壁化粧パネル","内装壁金属板","内装壁塗り壁","内装壁タイル","内装壁石レンガ","内装壁装飾材","内装壁機能性","内装壁壁見切","内装壁その他"],
  "internal-ceiling": ["内装天井ボード","内装天井化粧材","内装天井装飾材","内装天井機能性","内装天井その他"],
  "internal-other": ["トイレブース","内装サッシ","内装シャッター","ノンスリップ","内装手摺","グレーチング","内装緑化","点検口","隔壁","保護材","点字","ディスプレイ","内装その他製品"],
  "waterproof": ["ウレタン防水","アスファルト防水","シート防水","FRP防水","防水その他"],
  "hardware": ["ハンドル","引棒","建具金物","棚フック","サニタリー","家具金物","鍵関係","EXP,J","金物その他"],
  "furniture": ["家具","カーテン","ブラインド","生地","ファニチャーその他"],
  "electrical-systems": ["照明","外構照明","スイッチコンセント","発電機","電気設備その他"],
  "mechanical-systems": ["水栓","衛生機器","住宅設備","キッチン","空調機","機械設備その他"],
  "exterior-infrastructure": ["縁石","外構舗装","雨水桝","桝蓋","外構グレーチング","外構その他"],
  "exterior": ["宅配ボックス","郵便受け","表札","門扉","フェンス","カーポート","大型引戸","ウッドデッキ","駐輪場","ゴミストッカー","エクステリア緑化","エクステリアその他"],
};

/**
 * 外壁のうち「外壁仕上げ」に当たる小分類。
 * 外壁ページの一部で、広告の出し分けにだけ使う。
 */
export const EXTERIOR_FINISH_SUBCATEGORIES = [
  'paint', 'plaster', 'tile', 'stone-brick', 'metal-panel', 'wood-board', 'decorative', 'other-finish',
];

/** 小分類名から、それが属するカテゴリを引く。見つからなければ null */
export function findCategoryBySubcategory(subcategory: string): string | null {
  for (const [category, list] of Object.entries(CATEGORY_SUBCATEGORIES)) {
    if (list.includes(subcategory)) return category;
  }
  return null;
}

/** 英字 id の小分類は画面上の名前に置き換える(左カラムの表記と同じ) */
const SUB_LABEL: Record<string, string> = {
  alc: 'ALC', ecp: 'ECPパネル', metalpanel: '金属パネル', 'exterior-wall-other': '外壁その他',
  'aluminum-sash': 'アルミサッシ', 'resin-sash': '樹脂サッシ', 'wood-sash': '木製サッシ',
  'light-shutter': '軽量シャッター', 'heavy-shutter': '重量シャッター',
  paint: '塗装', plaster: '塗り壁', tile: 'タイル', 'stone-brick': '石・レンガ', 'metal-panel': '金属パネル仕上げ',
  'wood-board': '木板材', decorative: '装飾材', 'other-finish': '外壁仕上げその他',
  'external-tile': 'タイル', 'external-stone-brick': '石・レンガ', 'pvc-sheet': '塩ビシート', 'external-finish': '外部床その他',
  外構照明: '外構照明',
};

/** 「内装壁壁紙」→「壁紙」。小分類の id は分類名を頭に付けて重複を避けているので、表示では外す */
const PREFIX = /^(内装壁|内装天井|内装床|内装|外構|エクステリア|機械設備|電気設備|ファニチャー|金物|防水|屋根)(?=.)/;
export const subcategoryLabel = (id: string) => SUB_LABEL[id] ?? id.replace(PREFIX, '');

/* ───────── 小分類ごとの URL(/roof/seppan/ など。2026-11-14 追加) ─────────
 * 以前は /roof/?subcategory=折板 で切り替えるだけで、canonical が分類の URL のため
 * 先頭以外の小分類のメーカー表は検索エンジンに載らなかった。小分類ごとに URL を持たせる。
 * 旧 URL(?subcategory=)もそのまま動く(リンク切れにしない)。
 * slug は英小文字とハイフンだけ。英字 id の小分類はそのまま、日本語 id の小分類はこの表で決める。
 * ⚠️ 公開したら slug は変えない(URL になる)。 */
const SUB_SLUG: Record<string, Record<string, string>> = {
  roof: { 折板: 'seppan', 金属屋根: 'metal-roof', スレート: 'slate', 瓦: 'kawara', 屋根その他: 'other' },
  'exterior-wall': { 金属サイディング: 'metal-siding', 窯業サイディング: 'ceramic-siding' },
  'exterior-other': { 笠木水切: 'coping-flashing', 庇オーニング: 'canopy-awning', 雨どい: 'gutter', ハト小屋: 'hatogoya', 太陽光パネル: 'solar-panel', 手摺: 'handrail' },
  'internal-floor': { フローリング: 'flooring', ビニールタイル: 'vinyl-tile', ビニールシート: 'vinyl-sheet', カーペット: 'carpet', 内装タイル: 'tile', 内装床石レンガ: 'stone-brick', 畳: 'tatami', 巾木床見切: 'baseboard', 内装床機能性: 'functional', 内装床その他: 'other' },
  'internal-wall': { 内装壁壁紙: 'wallpaper', 内装壁化粧板: 'decorative-board', 内装壁化粧シート: 'decorative-sheet', 内装壁化粧パネル: 'decorative-panel', 内装壁金属板: 'metal-sheet', 内装壁塗り壁: 'plaster', 内装壁タイル: 'tile', 内装壁石レンガ: 'stone-brick', 内装壁装飾材: 'ornament', 内装壁機能性: 'functional', 内装壁壁見切: 'trim', 内装壁その他: 'other' },
  'internal-ceiling': { 内装天井ボード: 'board', 内装天井化粧材: 'finish', 内装天井装飾材: 'ornament', 内装天井機能性: 'functional', 内装天井その他: 'other' },
  'internal-other': { トイレブース: 'toilet-booth', 内装サッシ: 'interior-sash', 内装シャッター: 'interior-shutter', ノンスリップ: 'non-slip', 内装手摺: 'handrail', グレーチング: 'grating', 内装緑化: 'greening', 点検口: 'access-panel', 隔壁: 'partition', 保護材: 'protector', 点字: 'braille', ディスプレイ: 'display', 内装その他製品: 'other' },
  waterproof: { ウレタン防水: 'urethane', アスファルト防水: 'asphalt', シート防水: 'sheet', FRP防水: 'frp', 防水その他: 'other' },
  hardware: { ハンドル: 'handle', 引棒: 'pull-bar', 建具金物: 'door-hardware', 棚フック: 'shelf-hook', サニタリー: 'sanitary', 家具金物: 'furniture-hardware', 鍵関係: 'lock', 'EXP,J': 'expansion-joint', 金物その他: 'other' },
  furniture: { 家具: 'furniture', カーテン: 'curtain', ブラインド: 'blind', 生地: 'fabric', ファニチャーその他: 'other' },
  'electrical-systems': { 照明: 'lighting', 外構照明: 'exterior-lighting', スイッチコンセント: 'switch-outlet', 発電機: 'generator', 電気設備その他: 'other' },
  'mechanical-systems': { 水栓: 'faucet', 衛生機器: 'sanitary-ware', 住宅設備: 'housing-equipment', キッチン: 'kitchen', 空調機: 'air-conditioner', 機械設備その他: 'other' },
  'exterior-infrastructure': { 縁石: 'curb', 外構舗装: 'paving', 雨水桝: 'rainwater-basin', 桝蓋: 'basin-cover', 外構グレーチング: 'grating', 外構その他: 'other' },
  exterior: { 宅配ボックス: 'delivery-box', 郵便受け: 'mailbox', 表札: 'nameplate', 門扉: 'gate', フェンス: 'fence', カーポート: 'carport', 大型引戸: 'large-sliding-gate', ウッドデッキ: 'wood-deck', 駐輪場: 'bicycle-parking', ゴミストッカー: 'garbage-stocker', エクステリア緑化: 'greening', エクステリアその他: 'other' },
};

/** 小分類 id → URL の slug */
export const subSlug = (category: string, sub: string): string => SUB_SLUG[category]?.[sub] ?? sub;

/** URL の slug → 小分類 id。無ければ null */
export function subFromSlug(category: string, slug: string): string | null {
  let s = slug;
  try { s = decodeURIComponent(slug); } catch {}
  return (CATEGORY_SUBCATEGORIES[category] || []).find((id) => subSlug(category, id) === s) ?? null;
}

/** 小分類のページの URL(末尾 / 付き)。例 /roof/seppan/ */
export const materialSubPath = (category: string, sub: string): string =>
  `${CATEGORY_ROUTES[category]}/${subSlug(category, sub)}/`;

const ROUTE_TO_CATEGORY: Record<string, string> = Object.fromEntries(Object.entries(CATEGORY_ROUTES).map(([c, r]) => [r, c]));

/** '/roof' や '/roof/seppan'(末尾 / なし)から { category, sub }。sub はパスに小分類が無ければ null。建材のパスでなければ null */
export function parseMaterialPath(path: string): { category: string; sub: string | null } | null {
  const m = /^(\/[^/]+)(?:\/([^/]+))?\/?$/.exec(path);
  if (!m) return null;
  const category = ROUTE_TO_CATEGORY[m[1]];
  if (!category) return null;
  if (!m[2]) return { category, sub: null };
  const sub = subFromSlug(category, m[2]);
  return sub ? { category, sub } : null;
}
