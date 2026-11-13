/**
 * NEWS の配信元(/api/news とクライアント側の予備取得、右列の「配信元」表示が共有する)。
 *
 * 2026-11-14 の点検で、それまでの主力 6 本のうち 5 本が止まっていた
 * (国交省 mlit_rss.xml 404 / KENPLASE 応答なし / 建設通信 /feeds 404 / R.E.port 503 / HOME'S PRESS 404)。
 * そのため NEWS は Google ニュース検索経由の記事ばかりになり、記事の写真も取れなかった。
 * 生きている URL に差し替え、各社の直接の RSS に寄せた(写真は記事ページの og:image から取る)。
 *
 *   trusted … 建設・住宅の専門紙。キーワードの点数で足切りしない(除外語だけ見る)
 *   must    … 総合媒体。この語を題に含む記事だけ採る(点数の足切りもしない)
 *   exclude … 題にこの語を含む記事は落とす(求人告知・連載マンガなど)
 *   どちらも無い … 点数(strong / domain キーワード)で足切りする
 */
export type NewsSource = {
  url: string;
  source: string;
  kind: 'RSS' | '検索';
  trusted?: boolean;
  must?: RegExp;
  exclude?: RegExp;
};

const AEC = /建築|建設|土木|住宅|住まい|施工|ゼネコン|設計事務所|不動産|都市計画|再開発|BIM|耐震|木造|建材|インフラ/;

export const NEWS_SOURCES: NewsSource[] = [
  { url: 'https://www.mlit.go.jp/index.rdf', source: '国土交通省', kind: 'RSS', must: /建築|建設|住宅|都市|土地|不動産|公共工事|インフラ|道路|河川|下水道|技能|技術者|入札|空き家|まちづくり|耐震|省エネ/ },
  { url: 'https://www.kensetsunews.com/feed', source: '建設通信新聞', kind: 'RSS', trusted: true },
  { url: 'https://www.decn.co.jp/?feed=rss2', source: '建設工業新聞', kind: 'RSS', trusted: true },
  { url: 'https://www.housenews.jp/feed', source: 'ハウジング・トリビューン', kind: 'RSS', trusted: true },
  { url: 'https://www.s-housing.jp/feed', source: '新建ハウジング', kind: 'RSS', trusted: true },
  // 2026-11-14 追加: 建設テック・建築作品・施工の現場・住まい・デザイン誌・産業紙
  { url: 'https://rss.itmedia.co.jp/rss/2.0/sj_built.xml', source: 'BUILT(ITmedia)', kind: 'RSS', trusted: true },
  { url: 'https://architecturephoto.net/feed/', source: 'architecturephoto', kind: 'RSS', trusted: true, exclude: /ap job|求人/ },
  { url: 'https://sekokan-navi.jp/magazine/feed', source: '施工の神様', kind: 'RSS', trusted: true, exclude: /マンガ|解体屋ゲン|求人/ },
  { url: 'https://suumo.jp/journal/feed/', source: 'SUUMOジャーナル', kind: 'RSS', must: /建築|住宅|住まい|家づくり|リノベ|リフォーム|マンション|賃貸|不動産|空き家|まちづくり|間取り|断熱/ },
  { url: 'https://casabrutus.com/feed', source: 'Casa BRUTUS', kind: 'RSS', must: /建築|建築家|住宅|邸|インテリア|空間|庭園|設計|リノベ|家具/ },
  { url: 'https://www.nikkan.co.jp/rss/nksrdf.rdf', source: '日刊工業新聞', kind: 'RSS', must: /建設|建築|ゼネコン|住宅|建材|土木|リフォーム|再開発|施工|インフラ/ },
  { url: 'https://xtech.nikkei.com/rss/index.rdf', source: '日経xTECH', kind: 'RSS', must: AEC },
  { url: 'https://www.japandesign.ne.jp/feed/', source: 'JDN', kind: 'RSS', must: /建築|インテリア|空間|住宅|建築家|まちづくり|リノベ/ },
  { url: 'https://www.lmaga.jp/feed/', source: 'Lmaga.jp', kind: 'RSS', must: /建築|建設|リノベ|設計|建物|再開発|新ビル|街づくり|まちづくり/ },
  { url: 'https://www.elle.com/jp/rss/all.xml/', source: 'ELLE Japan', kind: 'RSS', must: /建築|インテリア|建築家|住まい|家具|邸宅/ },
  {
    url: 'https://news.google.com/rss/search?q=site:jp.wsj.com+(%E4%B8%8D%E5%8B%95%E7%94%A3+OR+%E5%BB%BA%E8%A8%AD+OR+%E5%BB%BA%E7%AF%89)&hl=ja&gl=JP&ceid=JP:ja',
    source: 'WSJ日本版(検索)',
    kind: '検索',
  },
];

/** 1 つの配信元が一覧を占領しないよう、上位 40 件に入れる上限 */
export const PER_SOURCE_CAP = 8;
