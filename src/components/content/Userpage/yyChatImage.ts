/**
 * yychat の写真の縮め方(2026-11-16)。YyChat.tsx だけが使う。
 *
 * 写真は Firestore の発言(chatRooms/{room}/messages/{id})の imageUrl に data URL で入れる。
 * 2026-11-16 から、元の写真は Storage(chatRooms/{room}/{uid}/、yyChatFiles.ts)に置き、imageUrl には
 * 一覧用の小さな写真(長辺 720px)だけを入れる。Storage に置けなかったときは、下の手順で縮めた写真を入れる。
 *
 * 以前は長辺 500px・画質 0.5 で、配筋のピッチやひび割れの幅が読めなかった。
 * Firestore の 1 文書は 1MiB(1,048,576 バイト)まで。本文・名前・既読の分を残して、
 * 写真は 900,000 文字(base64 は 1 文字 1 バイト)までに収める。
 * 長辺 1600px・画質 0.75 から始めて、入らなければ段階的に落とす。
 */

/** 写真に使ってよい文字数(data URL 全体)。1MiB から本文などの分を引いた値 */
export const INLINE_IMAGE_MAX_CHARS = 900_000;
/** 発言 1 件の上限(Firestore の 1 文書 1MiB)。余裕を見て少し下げる */
export const MESSAGE_DOC_MAX_BYTES = 1_040_000;

/** 試す順。上から順に、収まった最初のものを使う */
export const INLINE_STEPS: ReadonlyArray<{ long: number; quality: number }> = [
  { long: 1600, quality: 0.75 },
  { long: 1600, quality: 0.65 },
  { long: 1400, quality: 0.6 },
  { long: 1280, quality: 0.55 },
  { long: 1024, quality: 0.5 },
  { long: 800, quality: 0.5 },
];

export type Encoded = { dataUrl: string; long: number; quality: number };

/**
 * 収まる組み合わせを探す。encode(長辺, 画質) が data URL を返す。
 * どれも入らなければ null(呼び出し側で「送れない」と出す)。
 */
export async function pickInlineEncoding(
  encode: (long: number, quality: number) => Promise<string> | string,
  maxChars = INLINE_IMAGE_MAX_CHARS,
  steps = INLINE_STEPS,
): Promise<Encoded | null> {
  for (const s of steps) {
    const dataUrl = await encode(s.long, s.quality);
    if (dataUrl.length <= maxChars) return { dataUrl, long: s.long, quality: s.quality };
  }
  return null;
}

/** 文字列の UTF-8 のバイト数(Firestore は文字列をこれで数える) */
export function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

/** 発言 1 件が 1 文書に入るか(写真 + 本文 + 名前などの余白 4KB) */
export function fitsInMessage(imageDataUrl: string | null, content: string): boolean {
  return (imageDataUrl ? imageDataUrl.length : 0) + utf8Bytes(content) + 4096 <= MESSAGE_DOC_MAX_BYTES;
}

/** 長辺を long 以下にした幅・高さ(拡大はしない) */
export function fitLong(w: number, h: number, long: number): { width: number; height: number } {
  const m = Math.max(w, h);
  if (m <= long) return { width: w, height: h };
  const r = long / m;
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

const isHeic = (file: File) => /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読めませんでした'));
    img.src = src;
  });
}

function drawJpeg(img: HTMLImageElement, long: number, quality: number): string {
  const { width, height } = fitLong(img.naturalWidth, img.naturalHeight, long);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas を使えません');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  // <img> はブラウザが Exif の向きを当てて描く(image-orientation: from-image が既定)
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 送る写真を作る。iPhone の HEIC は Chrome が描けないので、先に JPEG に起こす
 * (以前は HEIC を選ぶと読み込みが終わらないまま止まっていた)。
 */
export async function compressForChat(file: File): Promise<(Encoded & { thumb: string; original: Blob; originalType: string }) | null> {
  let src: Blob = file;
  if (isHeic(file)) {
    const { heicTo } = await import('heic-to');
    src = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 });
  }
  const url = URL.createObjectURL(src);
  try {
    const img = await loadImage(url);
    const inline = await pickInlineEncoding((long, q) => drawJpeg(img, long, q));
    if (!inline) return null;
    // 元の写真を Storage に置けたときは、発言には一覧用の小さな写真だけを入れる(部屋を開くときの読み込みを軽くする)
    const thumb = drawJpeg(img, 720, 0.6);
    // 元の写真: HEIC は他の端末で開けないので JPEG に起こしたものを、それ以外は選んだファイルそのものを置く
    const originalType = src === file ? file.type || 'image/jpeg' : 'image/jpeg';
    return { ...inline, thumb, original: src, originalType };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** data URL の写真を小さく描き直す(議事録のメモに貼る分。メモも 1 文書 1MiB) */
export async function shrinkDataUrl(dataUrl: string, long = 640, quality = 0.6): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    if (Math.max(img.naturalWidth, img.naturalHeight) <= long && dataUrl.length < 80_000) return dataUrl;
    return drawJpeg(img, long, quality);
  } catch {
    return dataUrl;
  }
}
