/**
 * 写真の無い記事(NEWS・新製品・イベント)に出す「話題の写真」を選ぶ。2026-11-14
 *
 * 題の言葉から話題を 1 つ決め、public/image/cover/{slug}-{1|2}.jpg を表紙に使う。
 * 写真は Codex に作らせた汎用の写真で、記事そのものの写真ではないので、表紙には「IMAGE」の札を付ける。
 * 写真がまだ置かれていなければ(404)、FeedPic がハッチの表紙に戻す。
 *
 * 並び順が優先順位。先に当たった話題を使う(「耐震改修」は耐震、「木造住宅の断熱」は省エネ)。
 */
export type Topic = { slug: string; label: string; words: RegExp };

export const TOPICS: Topic[] = [
  { slug: 'exhibition', label: '展示会', words: /展示会|見本市|フェア|EXPO|エキスポ|ショー|展$|展示場/i },
  { slug: 'seismic', label: '耐震・防災', words: /耐震|免震|制震|地震|防災|災害|被災|復旧|液状化/ },
  { slug: 'energy', label: '省エネ', words: /断熱|省エネ|ZEH|ZEB|太陽光|脱炭素|カーボン|GX|蓄電|再エネ|気密/i },
  { slug: 'digital', label: 'DX', words: /BIM|CIM|DX|AI|ドローン|デジタル|システム|アプリ|クラウド|ロボット|3D|IoT|ソフト/i },
  { slug: 'finance', label: '金利・ローン', words: /金利|ローン|融資|住宅ローン|フラット35/ },
  { slug: 'economy', label: '経営・統計', words: /倒産|決算|売上|業績|受注|調査|件数|前年|市場規模|景気|指数|統計|ランキング|動向/ },
  { slug: 'policy', label: '行政・制度', words: /国交省|国土交通省|政府|閣議|法改正|法案|制度|基準|告示|補助金|助成|自治体|首都|規制|省令/ },
  { slug: 'safety', label: '安全', words: /事故|労災|安全|墜落|熱中症|点検/ },
  { slug: 'workforce', label: '人材', words: /人手不足|担い手|職人|大工|採用|人材|働き方|研修|教室|学生|育成|技能|資格/ },
  { slug: 'civil', label: '土木', words: /道路|橋|トンネル|ダム|河川|堤防|港湾|鉄道|インフラ|土木|下水|上水/ },
  { slug: 'wood', label: '木造・木材', words: /木造|木材|CLT|林業|国産材|製材|木質/ },
  { slug: 'renovation', label: 'リフォーム', words: /リフォーム|リノベ|改修|塗装|塗り替え|修繕|改築/ },
  { slug: 'lighting', label: '照明', words: /照明|LED|照明器具|ダウンライト/ },
  { slug: 'equipment', label: '住宅設備', words: /キッチン|浴室|バス|トイレ|洗面|給湯|換気|空調|エアコン|設備/ },
  { slug: 'windows', label: '窓・建具', words: /サッシ|窓|ドア|建具|玄関|シャッター|網戸/ },
  { slug: 'exterior', label: '外装・屋根', words: /外壁|屋根|外装|タイル|防水|雨樋|外構|エクステリア|ガーデン|フェンス/ },
  { slug: 'interior', label: '内装', words: /内装|インテリア|床|フロア|壁紙|クロス|家具|収納|天井|畳/ },
  { slug: 'frame', label: '構造・下地', words: /鉄骨|金物|下地|構造|基礎|鉄筋|コンクリート|杭|接合/ },
  { slug: 'condo', label: '集合住宅', words: /マンション|賃貸|集合住宅|アパート|団地/ },
  { slug: 'realestate', label: '不動産', words: /不動産|地価|土地|中古|空き家|売買|仲介/ },
  { slug: 'office', label: '都市・ビル', words: /再開発|ビル|オフィス|都市|駅前|街づくり|まちづくり|商業施設|ホテル|物流|倉庫|工場/ },
  { slug: 'design', label: '建築・デザイン', words: /建築家|デザイン|設計|賞|美術館|ミュージアム|図書館|作品|展覧/ },
  { slug: 'site', label: '現場', words: /工事|現場|施工|着工|竣工|完成|建設/ },
  { slug: 'house', label: '住宅', words: /住宅|戸建|注文|分譲|住まい|ハウス|ホーム|家/ },
  { slug: 'materials', label: '建材', words: /建材|新製品|新商品|発売|製品|素材|材料/ },
];

/** どの話題にも当たらないとき */
export const DEFAULT_TOPIC: Topic = { slug: 'detail', label: '建築', words: /$^/ };

/** 新製品の分類 → 話題(題で決まらないとき) */
const PRODUCT_CATEGORY: Record<string, string> = {
  exterior: 'exterior',
  interior: 'interior',
  structure: 'frame',
  opening: 'windows',
  equipment: 'equipment',
  technology: 'lighting',
};

export function topicOf(text: string, category?: string): Topic {
  const hit = TOPICS.find((t) => t.words.test(text));
  if (hit) return hit;
  const byCat = category && PRODUCT_CATEGORY[category];
  return (byCat && TOPICS.find((t) => t.slug === byCat)) || DEFAULT_TOPIC;
}

/**
 * public/image/cover/ に写真を置いた話題。置く前に URL を出すと 404 を何度も踏むので、置いたものだけ並べる。
 * Codex の写真が届いたら slug を足す(2 枚そろっている話題だけ)。
 */
// 2026-11-14 Codex の 52 枚(26 話題 × 2)を検品して全部入れた
const READY = new Set<string>(['exhibition', 'seismic', 'energy', 'digital', 'finance', 'economy', 'policy', 'safety', 'workforce', 'civil', 'wood', 'renovation', 'lighting', 'equipment', 'windows', 'exterior', 'interior', 'frame', 'condo', 'realestate', 'office', 'design', 'site', 'house', 'materials', 'detail']);

/** 同じ話題が並んでも同じ写真ばかりにならないよう、記事ごとに 1 か 2 を選ぶ。写真がまだ無い話題は undefined(ハッチの表紙) */
export function topicPhoto(topic: Topic, key: string): string | undefined {
  if (!READY.has(topic.slug)) return undefined;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return `/image/cover/${topic.slug}-${(Math.abs(h) % 2) + 1}.jpg`;
}
