/**
 * 図面送付の「図面リスト」（送付状に載せる 図面番号・図面名・版・縮尺・枚数）。
 *
 * 図面を送るときに毎回手で打っていた一覧を、ファイル名から下書きする。
 * 事務所ごとに命名はばらばらなので、完璧に当てることは狙わない。
 * 「A-101_平面図_Rev2.pdf」のようなよくある形だけ拾い、外れたら人が直す前提。
 */

export type DrawingRow = {
  /** 画面の行を区別するためだけの ID（保存しない） */
  key: string;
  no: string;
  title: string;
  rev: string;
  scale: string;
  /** 入力途中の空欄を許すので文字列で持つ */
  sheets: string;
  /** 下書きの元にしたファイル名（PDF の頁数を後から入れるときの目印。保存しない） */
  src?: string;
};

/** Firestore（uploads/{fileId}.drawings）に置く形 */
export type StoredDrawing = { no: string; title: string; rev: string; scale: string; sheets: number };

let seq = 0;
const nextKey = () => `d${Date.now().toString(36)}${(seq += 1).toString(36)}`;

export const emptyRow = (): DrawingRow => ({ key: nextKey(), no: '', title: '', rev: '', scale: '', sheets: '1' });

/** 縮尺の分母としてあり得る値。区切りが「-」「_」のときはこの中にあるものだけ縮尺とみなす（A-101 を 1/01 と読まないため） */
const SCALE_DENOMS = new Set([1, 2, 3, 5, 10, 20, 25, 30, 50, 60, 100, 150, 200, 250, 300, 400, 500, 600, 1000, 1200, 1500, 2000, 2500, 3000, 5000, 10000]);

/**
 * ファイル名から図面リストの 1 行を下書きする。
 * 例: 「A-101_平面図_Rev2.pdf」→ A-101 / 平面図 / Rev2
 *     「S201 基礎伏図 第3版 1-100.pdf」→ S201 / 基礎伏図 / 第3版 / 1/100
 */
export function parseDrawingFileName(fileName: string): DrawingRow {
  let s = fileName.normalize('NFKC').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  let rev = '';
  let scale = '';
  let no = '';

  // 版: Rev2 / rev.B / R3 / 第3版 / v2 / (改2)
  const revPatterns: RegExp[] = [
    /(?:^|[\s_\-.(（［[)）\]］])((?:rev|Rev|REV)\.?\s*[0-9A-Za-z]{1,4})(?=$|[\s_\-.(（)）\]］])/,
    /(第\s*[0-9]{1,3}\s*版)/,
    /(改\s*[0-9A-Za-z]{1,3})/,
    /(?:^|[\s_\-.(（])([Rr][0-9]{1,3})(?=$|[\s_\-.)）])/,
    /(?:^|[\s_\-.(（])([Vv][0-9]{1,3})(?=$|[\s_\-.)）])/,
  ];
  for (const re of revPatterns) {
    const m = s.match(re);
    if (m) {
      rev = m[1].replace(/\s+/g, '');
      s = s.replace(m[1], ' ');
      break;
    }
  }

  // 縮尺: S=1/100, 1:50, 1／200, 1-100（区切りが - _ のときは既知の分母だけ）
  const scaleRe = /(?:^|[^0-9A-Za-z])((?:S\s*=?\s*)?1\s*([/:：_-])\s*([0-9]{1,5}))(?![0-9])/g;
  for (const m of Array.from(s.matchAll(scaleRe))) {
    const denom = Number(m[3]);
    if (m[2] === '-' || m[2] === '_') {
      if (!SCALE_DENOMS.has(denom)) continue;
    }
    if (denom < 1) continue;
    scale = `1/${denom}`;
    s = s.replace(m[1], ' ');
    break;
  }

  // 図面番号: 先頭の A-101 / S201 / E-01-02 / 001 など
  // カメラの連番（IMG_2034 など）は図面番号ではない
  const noMatch = /^(IMG|DSC|DSCN|DSCF|PXL|MVI|VID|SCAN)[-_ ]?[0-9]/i.test(s) ? null : s.match(/^\s*([A-Za-z]{1,3}[-_]?[0-9]{1,4}(?:[-_][0-9]{1,3})?|[0-9]{2,4})(?=$|[\s_\-.　])/);
  if (noMatch) {
    no = noMatch[1].replace(/_/g, '-');
    s = s.slice(noMatch[0].length);
  }

  const title = s
    .replace(/[_]+/g, ' ')
    .replace(/([(（［[])\s+/g, '$1')
    .replace(/\s+([)）\]］])/g, '$1')
    .replace(/[(（［[][)）\]］]/g, ' ')
    .replace(/^[\s\-.　]+|[\s\-.　]+$/g, '')
    .replace(/\s{2,}/g, ' ');

  return { ...emptyRow(), no, title: title || (no ? '' : fileName), rev, scale, src: fileName };
}

export const toStored = (rows: DrawingRow[]): StoredDrawing[] =>
  rows
    .filter((r) => r.no.trim() || r.title.trim())
    .map((r) => ({
      no: r.no.trim(),
      title: r.title.trim(),
      rev: r.rev.trim(),
      scale: r.scale.trim(),
      sheets: Math.max(0, Math.floor(Number(r.sheets) || 0)),
    }));

export const fromStored = (list: unknown): DrawingRow[] =>
  Array.isArray(list)
    ? list
        .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
        .map((d) => ({
          ...emptyRow(),
          no: String(d.no ?? ''),
          title: String(d.title ?? ''),
          rev: String(d.rev ?? ''),
          scale: String(d.scale ?? ''),
          sheets: String(typeof d.sheets === 'number' ? d.sheets : 1),
        }))
    : [];

export const totalSheets = (list: StoredDrawing[]) => list.reduce((a, d) => a + (d.sheets || 0), 0);

/** 図面リストのテキスト（メール本文・送付文に貼る用） */
export function drawingListText(list: StoredDrawing[]): string {
  if (list.length === 0) return '';
  const lines = list.map((d, i) => {
    const parts = [String(i + 1).padStart(2, '0'), d.no, d.title, d.rev, d.scale, d.sheets ? `${d.sheets}枚` : ''].filter(Boolean);
    return `  ${parts.join('  ')}`;
  });
  return ['図面リスト（計 ' + totalSheets(list) + ' 枚）', ...lines].join('\n');
}

/**
 * PDF の頁数を数える（枚数の下書き用）。大きいファイルはメモリを食うので数えない。
 * pdf-lib は既に依存にある（図面PDF・PDF圧縮で使用）。
 */
export async function countPdfPages(file: File, maxBytes = 40 * 1024 * 1024): Promise<number | null> {
  if (file.size > maxBytes || !/\.pdf$/i.test(file.name)) return null;
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return null;
  }
}
