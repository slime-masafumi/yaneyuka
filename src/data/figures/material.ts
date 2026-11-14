/**
 * 材料情報(早見表)の節に添える図(自作の SVG)。2026-11-14
 * 本体は public/figures/{id}.svg。節(MaterialInfo.tsx の id="section-◯")の見出しの注記の下、表の上に出る。
 */
export type MatFig = {
  /** m-{英小文字の短い名前}。例 m-h-beam */
  id: string;
  /** 節の id(src/lib/infoLinks.ts の MATERIAL_INFO_SECTIONS と同じ。例 section-13) */
  sec: string;
  /** 図の題(alt にも使う)。30 字以内 */
  title: string;
  /** 図の説明(1〜2 文、80 字以内)。規格番号があれば入れる */
  caption: string;
  w: number;
  h: number;
};

export const MAT_FIGS: MatFig[] = [
  // 意匠
  {
    id: 'm-glass',
    sec: 'section-1',
    title: 'ガラスの断面構成(単板・合わせ・複層)',
    caption: '合わせガラスは 2 枚を中間膜で接着、複層ガラスはスペーサーで中空層をつくり周囲をシールする。厚さの表記 5+12A+5 の読み方。',
    w: 720,
    h: 310,
  },
  {
    id: 'm-gypsum-edge',
    sec: 'section-42',
    title: '石膏ボードの長辺エッジの形と継目',
    caption: 'スクエア・テーパー・ベベルの 3 形状と主な張り方。テーパーエッジはテープとパテの継目処理で平らな面に仕上げる。',
    w: 720,
    h: 250,
  },
  {
    id: 'm-waterproof',
    sec: 'section-44',
    title: '防水工法ごとの層の構成',
    caption: 'アスファルト A-1・改質アスファルトシート AS-T1・シートの機械的固定・ウレタン塗膜 X-1 の層の重なり(標仕 9章)。',
    w: 720,
    h: 340,
  },
  {
    id: 'm-lgs-ceiling',
    sec: 'section-11a',
    title: '軽量鉄骨天井下地の構成',
    caption: '吊りボルト・ハンガー・野縁受け・クリップ・野縁・ボードの順に吊る。ボードの継目はダブル野縁で受ける(19 形)。',
    w: 720,
    h: 330,
  },
  {
    id: 'm-lgs-wall',
    sec: 'section-11a',
    title: '軽量鉄骨壁下地(間仕切)の構成',
    caption: 'ランナー・スタッド・振れ止め・開口部補強材の位置。振れ止めは床から約 1.2m ごと、ランナーの幅はスタッド+2mm。',
    w: 720,
    h: 330,
  },
  // 構造
  {
    id: 'm-rebar',
    sec: 'section-12',
    title: '異形棒鋼の節・リブと公称直径',
    caption: '公称直径 d・節の間隔 P・節の高さ h と、鋼種を示す圧延マーク(突起の数)。JIS G 3112。',
    w: 720,
    h: 300,
  },
  {
    id: 'm-h-beam',
    sec: 'section-13',
    title: 'H形鋼の断面と寸法記号',
    caption: '呼称 H×B×tw×tf の各寸法とフィレット r、強軸 X–X。図は H-300×150×6.5×9 の比率(JIS G 3192)。',
    w: 720,
    h: 320,
  },
  {
    id: 'm-hex-bolt',
    sec: 'section-14',
    title: '六角ボルト・平座金の寸法記号',
    caption: '二面幅 SW・頭部高さ k・呼び径 d・ピッチ P と平座金の d/D/t。図は M12 の比率。ボルト孔径は令68条4項。',
    w: 720,
    h: 300,
  },
  {
    id: 'm-equal-angle',
    sec: 'section-17',
    title: '等辺山形鋼の断面と寸法記号',
    caption: '辺 A・B(等辺は A=B)・厚さ t・丸み r1/r2。図は L-65×65×6 の比率(JIS G 3192)。',
    w: 720,
    h: 300,
  },
  {
    id: 'm-channel',
    sec: 'section-18',
    title: '溝形鋼の断面と寸法記号',
    caption: 'h×b×tw×tf と丸み r1・r2。tf はフランジの中ほどで測る。図は C-150×75×6.5×10 の比率(JIS G 3192)。',
    w: 720,
    h: 300,
  },
  {
    id: 'm-square-tube',
    sec: 'section-19',
    title: '角形鋼管の断面と寸法記号',
    caption: '外法寸法 A×B と板厚 t。□100×100×4.5 と 50×100×2.3 を同じ縮尺で描いた(JIS G 3466)。',
    w: 720,
    h: 280,
  },
  {
    id: 'm-htb-joint',
    sec: 'section-20',
    title: '高力ボルトのセットと摩擦接合',
    caption: 'ボルト・ナット・座金 2 枚のセットで板を締め付け、摩擦面で力を伝える。図は M20 の比率。孔径は令68条2項。',
    w: 720,
    h: 330,
  },
  {
    id: 'm-anchor-bolt',
    sec: 'section-22',
    title: 'アンカーボルトの種類と埋込み長さ',
    caption: 'J 型・ストレート型(定着板付き)・接着系アンカーの納まり。埋込み長さ・へりあきは構造図と施工要領による。',
    w: 720,
    h: 340,
  },
  {
    id: 'm-cb-block',
    sec: 'section-46',
    title: 'コンクリートブロックの呼び寸法と製品寸法',
    caption: '製品寸法=呼び寸法−目地幅(400×200、目地 10 → 390×190)。空洞部の形は製品による(JIS A 5406)。',
    w: 720,
    h: 290,
  },
  // 機械
  {
    id: 'm-pipe-od',
    sec: 'section-47',
    title: '呼び径と外径・厚さ(管種による違い)',
    caption: 'SGP 40A・VP 40・VU 40・SUS 50Su を同じ縮尺で比べた。外径と厚さは呼び径の数字でなく管種で決まる。',
    w: 720,
    h: 336,
  },
  {
    id: 'm-duct',
    sec: 'section-26',
    title: '空調ダクトの形と寸法の呼び方',
    caption: '角ダクト(長辺 a×短辺 b)・スパイラル・フレキシブル・グラスウールダクトの形。角ダクトの a/b は 4 以下が目安。',
    w: 720,
    h: 290,
  },
  // 電気
  {
    id: 'm-cable',
    sec: 'section-33',
    title: 'VVF・CV ケーブルの断面と呼び方',
    caption: 'VVF 2.0-2C は直径 2.0mm の単線 2 心、CV 3.5sq-3C は断面積 3.5mm² のより線 3 心。各部の名称。',
    w: 720,
    h: 300,
  },
  {
    id: 'm-earthing',
    sec: 'section-37',
    title: '接地工事の種類と接地する部分',
    caption: 'A・C・D 種(と表に無い B 種)の対象・抵抗値・接地線の太さ。電気設備の技術基準の解釈 17条・29条。',
    w: 720,
    h: 310,
  },
];

export const matFigsOf = (sec: string) => MAT_FIGS.filter((f) => f.sec === sec);
