/**
 * 左カラム(入口だけ)と、中央カラムのツール一覧が共有する定義。
 *
 * 2026-11-13 にモック「高級感 3」に合わせて作り直した:
 *   左カラム … 見る / 使う / つながる の 3 群に入口だけを並べる(中身は出さない)
 *   中央カラム … 一般ツール・設計ツール・外部ツールを押すと、その一覧(ToolIndex.tsx)を出す
 * 設計ツールの中身は designToolsMenu.ts、一般ツールのタブは generalToolsMenu.ts が正本。
 */
import type { GeneralToolId } from './generalToolsMenu';

/** 中央カラムに一覧を出す画面の ID(URL の ?m= にも載る) */
export const INDEX_MENUS = {
  general: 'general-index',
  design: 'design-index',
  external: 'external-index',
} as const;

export type ToolItem = {
  label: string;
  /** handleMenuClick に渡す ID。http で始まる場合は外部リンク */
  menu: string;
  /** 一般ツールの中のタブを直接開くとき */
  tool?: GeneralToolId;
  /** 一覧に出す 1 行の説明 */
  desc?: string;
  /** アプリのアイコン(外部ツールだけ) */
  icon?: string;
  /** Web 版に加えて iOS 版もあるとき、その App Store の URL */
  store?: string;
};

export type ToolGroup = { label: string; items: ToolItem[] };

/** 一般ツール 22 本。性格で 3 つに寄せてある */
export const GENERAL_TOOL_GROUPS: ToolGroup[] = [
  {
    label: '手元で完結する道具',
    items: [
      { label: 'Myカレンダー', menu: 'my-calendar', desc: '現場定例・検査・申請の期限を月の表で。タスクの期日も重ね、.ics でやりとりする' },
      { label: 'Myタスク', menu: 'my-tasks', desc: '宿題管理。【物件名】でまとめて見る。期限超過は赤、前日と当日はベルで知らせる' },
      { label: 'メモ', menu: 'general-tools', tool: 'memo', desc: '打合せ・現場巡回・電話の記録をその場で残し、宿題はタスクへ、清書は PDF・Word で' },
      { label: '表計算', menu: 'general-tools', tool: 'sheet', desc: '面積表・仕上表・数量拾いを式つきで作り、Excel でやりとりする' },
      { label: '関数電卓', menu: 'general-tools', tool: 'calc', desc: '間・尺・坪・畳のまま計算し、根拠にメモを付けて計算書 PDF にまとめる' },
      { label: '単位変換', menu: 'general-tools', tool: 'unit-converter', desc: '寸・尺・間・坪・畳とメートル法を行き来し、単価・縮尺読み・必要枚数まで' },
      { label: 'ブックマーク', menu: 'general-tools', tool: 'bookmark', desc: 'よく開くサイトを整理する' },
      { label: '画像変換', menu: 'general-tools', tool: 'image-converter', desc: '現場写真を納品サイズに縮め、HEIC を JPEG にし、位置情報を消して渡す' },
      { label: 'PDF圧縮', menu: 'general-tools', tool: 'pdf-compressor', desc: 'メールで送れない重い PDF を軽くする。図面は線を残したまま' },
    ],
  },
  {
    label: '相手とやりとりする道具',
    items: [
      { label: 'yymail', menu: 'yymail', desc: '物件メール台帳。.eml / .msg を物件ごとに仕分け、添付の図面を図番と版で積む' },
      { label: 'yychat', menu: 'yychat', desc: '現場チャット。物件ごとに部屋を分け、発言はそのままタスクや議事録に' },
      { label: 'OnlineMeetingTool', menu: 'general-tools', tool: 'olmt', desc: '会議ソフトの隣で同じ図面を囲む。全員で赤を入れ、その場で議事録に' },
      { label: 'スケジュール調整', menu: 'general-tools', tool: 'schedule', desc: '定例・検査・施主打合せの日程を、必要な人が揃う日に決める' },
      { label: 'Teamタスク', menu: 'team-tasks', desc: '物件ごとのボードをチームで共有し、担当・役割・期限を付けて工程表で見る' },
      { label: '端末間受け渡し', menu: 'general-tools', tool: 'temp-storage', desc: '自分の端末どうしでファイルを渡す。QR を読むだけ、24 時間で自動で消える' },
      { label: '図面送付', menu: 'general-tools', tool: 'file-transfer', desc: '図面を相手先へ送る。送付状を添え、相手が開いたかを台帳に残す' },
    ],
  },
  {
    label: '建築の仕事に紐づく道具',
    items: [
      { label: 'My法規', menu: 'my-regulations', desc: 'よく引く条文を注記付きで手元に置き、e-Gov と照合して改正に気づく' },
      { label: '地図', menu: 'general-tools', tool: 'map', desc: '敷地調査と付近見取図。用途地域・建蔽率・容積率・防火指定を重ねて読む' },
      { label: '工事写真', menu: 'general-tools', tool: 'construction-photos', desc: '写真を撮影日順に並べ、黒板を焼き込み、連番で写真帳 PDF にする' },
      { label: '図面PDF', menu: 'general-tools', tool: 'drawing-pdf', desc: '提出前の図面 PDF を、Acrobat を開かずに整える' },
      { label: '業務管理・アラーム', menu: 'general-tools', tool: 'alarm', desc: '案件ごとの作業時間を日報に残し、設計料と突き合わせて時間単価を見る' },
      { label: '担当連絡先', menu: 'contacts', desc: 'メーカー・業者の担当者と、いつ何を頼みどう返ってきたかを残す' },
    ],
  },
];

const appStore = (id: number) => `https://apps.apple.com/jp/app/id${id}`;

/**
 * 外部ツール(自作アプリの入口)。どれも新しいタブで開く。
 * 一覧は App Store の開発者ページ(artistId 1866103675)から起こした。アイコンは public/image/apps/。
 */
export const EXTERNAL_TOOL_GROUPS: ToolGroup[] = [
  {
    label: '建築',
    items: [
      { label: '建築基準法 yaneyuka', menu: appStore(6757323409), icon: '/image/apps/kenchikukijun.png', desc: 'iOS' },
      { label: '消防法規 yaneyuka', menu: appStore(6762936797), icon: '/image/apps/shoubouhou.png', desc: 'iOS' },
      { label: 'PDFGap', menu: 'https://pdfgap-yaneyuka.web.app/', icon: '/image/PDFGap-icon.svg', desc: 'Web' },
      { label: 'Rules', menu: 'https://rules-yaneyuka.web.app/', icon: '/image/apps/rules.png', store: appStore(6759982040), desc: 'Web · iOS' },
      { label: 'DayLine', menu: 'https://dayline-yaneyuka.web.app/', icon: '/image/apps/dayline.png', store: appStore(6760655431), desc: 'Web · iOS' },
    ],
  },
  {
    label: 'その他',
    items: [
      { label: 'Noteleaf', menu: appStore(6775574147), icon: '/image/apps/noteleaf.png', desc: 'iOS' },
      { label: 'Epoch Camera', menu: appStore(6761734348), icon: '/image/apps/epochcamera.png', desc: 'iOS' },
      { label: 'Trailmark', menu: appStore(6774257425), icon: '/image/apps/trailmark.png', desc: 'iOS' },
      { label: 'Weatherchime', menu: appStore(6774901663), icon: '/image/apps/weatherchime.png', desc: 'iOS' },
      { label: 'NewsFilter', menu: appStore(6760270206), icon: '/image/apps/newsfilter.png', desc: 'iOS' },
      { label: 'World Folkbook', menu: appStore(6766574221), icon: '/image/apps/worldfolkbook.png', desc: 'iOS' },
      { label: 'FX Signal', menu: appStore(6767257165), icon: '/image/apps/fxsignal.png', desc: 'iOS' },
      { label: 'CFD Signal', menu: appStore(6769496079), icon: '/image/apps/cfdsignal.png', desc: 'iOS' },
    ],
  },
];

/** 一般ツールの画面(タブではない独立画面も含む)。左カラムで「一般ツール」を選択中にする判定に使う */
export const GENERAL_TOOL_MENU_IDS = new Set<string>([
  INDEX_MENUS.general,
  ...GENERAL_TOOL_GROUPS.flatMap((g) => g.items.map((i) => i.menu)),
]);
