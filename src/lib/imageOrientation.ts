/**
 * 画像の向き・寸法まわりの共通処理。
 *
 * 画像変換ツールと工事写真ツールが同じ扱いをする必要がある部分だけを置く。
 * とくに EXIF の orientation は取り違えると写真が横倒しになるうえ、
 * 二重に回すと直したつもりで壊れる。複製すると必ず片方だけ直されるので、
 * ここを唯一の置き場にする。
 */

export function resizeToLongSide(width: number, height: number, longSide: number | null) {
  if (!longSide || longSide <= 0) return { width, height };
  const maxSide = Math.max(width, height);
  if (maxSide <= longSide) return { width, height };
  const ratio = longSide / maxSide;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
/**
 * 位置情報を持っているかだけを見る。
 *
 * このツールは canvas を通して書き出すので、出力からは Exif が丸ごと落ちる。
 * つまり位置情報は既に消えているのだが、画面にその説明がどこにも無かった。
 * 現場写真をそのまま相手に渡すと座標が付いて回るので、「元は持っていた」
 * 「出力からは消える」の両方を出す。
 */
export async function hasGpsData(file: File): Promise<boolean> {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.gps(file);
    return !!gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number';
  } catch {
    // 読めない形式は判定しない。出力から Exif が落ちること自体は変わらない。
    return false;
  }
}

export async function readOrientation(file: File): Promise<number> {
  try {
    const exifr = await import('exifr');
    const data = await exifr.parse(file, { translateValues: false, pick: ['Orientation'] });
    const value = Array.isArray(data) ? data[0]?.Orientation : data?.Orientation;
    return typeof value === 'number' ? value : 1;
  } catch (error) {
    return 1;
  }
}

// 画像の寸法を読み取るヘルパー関数を追加
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  // ブラウザで扱える画像のみ対象
  if (!file.type.startsWith('image/')) return null;
  if (file.type === 'image/heic' || file.type === 'image/heif') return null; // 軽量化のためHEICはスキップ
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function loadImageBitmap(file: File) {
  if ('createImageBitmap' in window) {
    const blob = file.slice(0, file.size, file.type || 'image/*');
    // imageOrientation は既定でブラウザがEXIFの回転を適用してしまう実装がある。
    // このツールは exifr で読んだ orientation を自前でcanvasに適用するので、
    // ここで適用されると二重に回転する。明示的に無効化しておく。
    return await createImageBitmap(blob, { imageOrientation: 'none' });
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  orientation: number,
) {
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.translate(width, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7:
      ctx.translate(width, height);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.translate(0, height);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }
}
