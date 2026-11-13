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
