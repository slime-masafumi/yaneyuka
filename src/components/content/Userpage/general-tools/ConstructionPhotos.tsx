'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiImage, FiDownload, FiTrash2, FiFileText } from 'react-icons/fi';
import {
  resizeToLongSide,
  readOrientation,
  loadImageBitmap,
  applyOrientationTransform,
} from '@/lib/imageOrientation';

/**
 * 工事写真の一括処理。
 *
 * 現場で撮った写真を提出物にするまでに毎回やっていること――
 * 長辺を縮める／Exif を落とす／連番に付け替える／黒板を入れる／
 * 台紙に貼って写真帳にする――をまとめて1回でやる。
 *
 * 画像は canvas を通すので Exif は丸ごと落ちる（位置情報も撮影日時も）。
 * 撮影日は落ちる前に読み取って、ファイル名と黒板に焼き込む。
 * 処理は全部ブラウザの中で終わり、写真はどこにも送らない。
 */

type Photo = {
  id: string;
  file: File;
  /** Exif から読んだ撮影日。無ければファイルの更新日。 */
  shotAt: Date;
  /** この写真だけ工種を変えたいとき。空なら全体の設定を使う。 */
  kind?: string;
  previewUrl: string;
  orientation: number;
};

type BoardPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'none';

const LONG_SIDES = [3000, 2048, 1920, 1600, 1280];

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const ymdSlash = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;

/** ファイル名に使えない文字を落とす。工事名をそのまま入れられるように。 */
const safeForFilename = (value: string) => value.replace(/[\\/:*?"<>|]/g, '_').trim();

/**
 * 撮影日を読む。Exif の DateTimeOriginal が本命で、
 * 無ければファイルの更新日時で代用する（スクショや加工済みの写真）。
 */
async function readShotDate(file: File): Promise<Date> {
  try {
    const exifr = await import('exifr');
    const data = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] });
    const value = data?.DateTimeOriginal || data?.CreateDate;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    /* 読めない形式はファイルの日時で代用する */
  }
  return new Date(file.lastModified || Date.now());
}

/** 黒板。白地に黒文字の札を、写真の隅に焼き込む。 */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  rows: Array<[string, string]>,
  position: BoardPosition,
) {
  if (position === 'none' || rows.length === 0) return;

  // 写真の大きさに対する比で決める。縮めても読める大きさを保つため。
  const scale = Math.max(canvasWidth, canvasHeight) / 1920;
  const fontSize = Math.round(26 * scale);
  const padding = Math.round(14 * scale);
  const lineHeight = Math.round(fontSize * 1.5);
  const labelWidth = Math.round(150 * scale);

  ctx.font = `${fontSize}px sans-serif`;
  const valueWidth = Math.max(...rows.map(([, v]) => ctx.measureText(v).width));
  const boardWidth = Math.min(labelWidth + valueWidth + padding * 3, canvasWidth - padding * 2);
  const boardHeight = rows.length * lineHeight + padding * 2;

  const x = position.endsWith('left') ? padding : canvasWidth - boardWidth - padding;
  const y = position.startsWith('top') ? padding : canvasHeight - boardHeight - padding;

  // 下地。完全な不透明にすると写真を隠しすぎるので、少しだけ透かす。
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(x, y, boardWidth, boardHeight);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(2, Math.round(2 * scale));
  ctx.strokeRect(x, y, boardWidth, boardHeight);

  ctx.textBaseline = 'middle';
  rows.forEach(([label, value], i) => {
    const rowY = y + padding + lineHeight * i + lineHeight / 2;
    ctx.fillStyle = '#444444';
    ctx.fillText(label, x + padding, rowY);
    ctx.fillStyle = '#111111';
    ctx.fillText(value, x + padding + labelWidth, rowY);
    if (i < rows.length - 1) {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + padding / 2, rowY + lineHeight / 2);
      ctx.lineTo(x + boardWidth - padding / 2, rowY + lineHeight / 2);
      ctx.stroke();
    }
  });
}

const ConstructionPhotos: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projectName, setProjectName] = useState('');
  const [defaultKind, setDefaultKind] = useState('');
  const [contractor, setContractor] = useState('');
  const [longSide, setLongSide] = useState(1920);
  const [quality, setQuality] = useState(85);
  const [boardPosition, setBoardPosition] = useState<BoardPosition>('bottom-left');
  const [startNumber, setStartNumber] = useState(1);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // プレビュー用の URL は、破棄しないとページを開いている間ずっと残る
  const urlsRef = useRef<string[]>([]);

  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (list.length === 0) return;

    setBusy('読み込み中…');
    const added: Photo[] = [];
    for (const file of list) {
      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);
      added.push({
        id: generateId(),
        file,
        shotAt: await readShotDate(file),
        previewUrl: url,
        orientation: await readOrientation(file),
      });
    }
    // 撮影順に並べる。連番が撮った順になっていないと写真帳として読めない。
    const next = [...photos, ...added].sort((a, b) => a.shotAt.getTime() - b.shotAt.getTime());
    setPhotos(next);
    setBusy('');
  };

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));
  const clearAll = () => setPhotos([]);

  const fileNameFor = (photo: Photo, index: number) => {
    const kind = safeForFilename(photo.kind || defaultKind) || '工事写真';
    return `${ymd(photo.shotAt)}_${kind}_${pad(startNumber + index, 3)}.jpg`;
  };

  const boardRowsFor = (photo: Photo): Array<[string, string]> => {
    const rows: Array<[string, string]> = [];
    if (projectName.trim()) rows.push(['工事名', projectName.trim()]);
    const kind = photo.kind || defaultKind;
    if (kind.trim()) rows.push(['工種', kind.trim()]);
    rows.push(['撮影日', ymdSlash(photo.shotAt)]);
    if (contractor.trim()) rows.push(['施工者', contractor.trim()]);
    return rows;
  };

  /** 1枚を仕上げる。向き補正 → 縮小 → 黒板 → JPEG。 */
  const renderPhoto = async (photo: Photo): Promise<Blob | null> => {
    const image = await loadImageBitmap(photo.file);
    const naturalWidth = (image as ImageBitmap).width;
    const naturalHeight = (image as ImageBitmap).height;

    const { width: rawWidth, height: rawHeight } = resizeToLongSide(naturalWidth, naturalHeight, longSide);
    // EXIF orientation 5〜8 は縦横が入れ替わるので、canvas の寸法も入れ替える
    const needSwap = photo.orientation >= 5 && photo.orientation <= 8;
    const canvas = document.createElement('canvas');
    canvas.width = needSwap ? rawHeight : rawWidth;
    canvas.height = needSwap ? rawWidth : rawHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    applyOrientationTransform(ctx, canvas.width, canvas.height, photo.orientation);
    // 回転後の座標系に描くので、渡すのは回転前の寸法
    ctx.drawImage(image as CanvasImageSource, 0, 0, rawWidth, rawHeight);
    ctx.restore();

    // 黒板は回転を戻してから描く（一緒に回ると読めなくなる）
    drawBoard(ctx, canvas.width, canvas.height, boardRowsFor(photo), boardPosition);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality / 100),
    );
  };

  const exportZip = async () => {
    if (photos.length === 0) return;
    setBusy('書き出し中…');
    setProgress({ done: 0, total: photos.length });
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < photos.length; i++) {
        const blob = await renderPhoto(photos[i]);
        if (blob) zip.file(fileNameFor(photos[i], i), blob);
        setProgress({ done: i + 1, total: photos.length });
      }

      const out = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(out);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeForFilename(projectName) || '工事写真'}_${ymd(new Date())}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('工事写真の書き出しに失敗しました', error);
      alert('書き出しに失敗しました。');
    } finally {
      setBusy('');
      setProgress({ done: 0, total: 0 });
    }
  };

  /** 台紙に貼った写真帳。A4 縦に4枚（2列×2段）で並べる。 */
  const exportAlbum = async () => {
    if (photos.length === 0) return;
    setBusy('写真帳を作成中…');
    setProgress({ done: 0, total: photos.length });

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.fontFamily = "'Noto Sans JP', sans-serif";

    try {
      for (let i = 0; i < photos.length; i += 4) {
        const page = document.createElement('div');
        page.style.padding = '10mm';
        page.style.boxSizing = 'border-box';
        // 最後のページ以外は改ページ
        if (i + 4 < photos.length) page.style.pageBreakAfter = 'always';

        const heading = document.createElement('div');
        heading.style.cssText = 'font-size:11px;border-bottom:1px solid #333;padding-bottom:3px;margin-bottom:6px;display:flex;justify-content:space-between;';
        heading.innerHTML = `<span>${escapeHtml(projectName || '工事写真帳')}</span><span>${escapeHtml(contractor)}</span>`;
        page.appendChild(heading);

        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:5mm;';

        for (const photo of photos.slice(i, i + 4)) {
          const index = photos.indexOf(photo);
          const blob = await renderPhoto(photo);
          setProgress({ done: index + 1, total: photos.length });
          if (!blob) continue;

          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });

          const cell = document.createElement('div');
          cell.style.cssText = 'border:1px solid #999;padding:3mm;';
          cell.innerHTML =
            `<img src="${dataUrl}" style="width:100%;height:55mm;object-fit:contain;background:#f4f4f4;" />` +
            `<div style="font-size:9px;margin-top:2mm;line-height:1.5;">` +
            `<div>No.${pad(startNumber + index, 3)}　${escapeHtml(photo.kind || defaultKind)}</div>` +
            `<div>${ymdSlash(photo.shotAt)}</div>` +
            `</div>`;
          grid.appendChild(cell);
        }

        page.appendChild(grid);
        container.appendChild(page);
      }

      document.body.appendChild(container);
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      await html2pdf()
        .set({
          margin: 0,
          filename: `${safeForFilename(projectName) || '工事写真帳'}_${ymd(new Date())}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css'] },
        })
        .from(container)
        .save();
      document.body.removeChild(container);
    } catch (error) {
      console.error('写真帳の作成に失敗しました', error);
      alert('写真帳の作成に失敗しました。');
    } finally {
      setBusy('');
      setProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">工事写真</h3>
          <p className="text-[11px] mt-0.5">現場写真を一括で縮小・Exif削除・連番リネーム。黒板の焼き込みと、台紙に貼った写真帳PDFの出力に対応</p>
        </div>
      </div>

      <div className="p-3 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">

          {/* 左：取り込みと設定 */}
          <div className="space-y-3 min-h-0 overflow-y-auto pr-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed p-6 text-center cursor-pointer transition ${
                isDragging ? 'border-[#3b3b3b] bg-gray-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <FiImage className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[11px] mt-2 text-gray-600">現場写真をドラッグ＆ドロップ</p>
              <p className="text-[10px] mt-1 text-gray-400">JPEG / PNG / HEIC。撮影日順に自動で並びます</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              />
            </div>

            <div className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3">
              <div className="text-[11px] font-bold text-gray-600">黒板・ファイル名</div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">工事名</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  placeholder="○○邸新築工事"
                  className="w-full p-1.5 text-[11px] border border-gray-300" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">工種</label>
                  <input type="text" value={defaultKind} onChange={(e) => setDefaultKind(e.target.value)}
                    placeholder="基礎配筋"
                    className="w-full p-1.5 text-[11px] border border-gray-300" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">施工者</label>
                  <input type="text" value={contractor} onChange={(e) => setContractor(e.target.value)}
                    placeholder="○○建設"
                    className="w-full p-1.5 text-[11px] border border-gray-300" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">黒板の位置</label>
                  <select value={boardPosition} onChange={(e) => setBoardPosition(e.target.value as BoardPosition)}
                    className="w-full p-1.5 text-[11px] border border-gray-300 bg-white">
                    <option value="bottom-left">左下</option>
                    <option value="bottom-right">右下</option>
                    <option value="top-left">左上</option>
                    <option value="top-right">右上</option>
                    <option value="none">入れない</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-[10px] text-gray-500 mb-1">開始番号</label>
                  <input type="number" min={1} value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-1.5 text-[11px] border border-gray-300 text-right" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3">
              <div className="text-[11px] font-bold text-gray-600">画像</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">長辺</label>
                  <select value={longSide} onChange={(e) => setLongSide(Number(e.target.value))}
                    className="w-full p-1.5 text-[11px] border border-gray-300 bg-white">
                    {LONG_SIDES.map((s) => (
                      <option key={s} value={s}>{s}px{s === 1920 ? '（納品でよく使う）' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-[10px] text-gray-500 mb-1">画質 {quality}%</label>
                  <input type="range" min={50} max={100} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                書き出したファイルからは <strong>Exif（位置情報・撮影日時）が削除されます</strong>。
                撮影日は消える前に読み取って、ファイル名と黒板に入れます。写真はブラウザの中だけで処理され、どこにも送信しません。
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={exportZip} disabled={photos.length === 0 || !!busy}
                className="flex-1 bg-gray-700 text-white py-2 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40">
                <FiDownload className="w-3.5 h-3.5" /> ZIPで書き出し
              </button>
              <button onClick={exportAlbum} disabled={photos.length === 0 || !!busy}
                className="flex-1 bg-gray-700 text-white py-2 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40">
                <FiFileText className="w-3.5 h-3.5" /> 写真帳PDF
              </button>
            </div>
            {busy && (
              <p className="text-[10px] text-gray-600">
                {busy}{progress.total > 0 ? ` ${progress.done}/${progress.total}` : ''}
              </p>
            )}
          </div>

          {/* 右：取り込んだ写真 */}
          <div className="bg-gray-50 border border-[#3b3b3b] p-4 flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[11px] font-bold text-gray-600">
                取り込んだ写真 {photos.length > 0 ? `(${photos.length}枚)` : ''}
              </span>
              {photos.length > 0 && (
                <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-red-600">すべて削除</button>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-[11px]">
                写真を追加するとここに並びます
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="bg-white border border-gray-200 p-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.previewUrl} alt="" className="w-14 h-14 object-cover border border-gray-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-gray-700 truncate">{fileNameFor(photo, index)}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{ymdSlash(photo.shotAt)}</div>
                      {/* 1枚だけ工種が違うことは普通にあるので、個別に上書きできるようにする */}
                      <input
                        type="text"
                        value={photo.kind ?? ''}
                        onChange={(e) =>
                          setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, kind: e.target.value } : p)))
                        }
                        placeholder={defaultKind ? `工種（既定: ${defaultKind}）` : '工種'}
                        className="mt-1 w-full text-[10px] px-1.5 py-0.5 border border-gray-200"
                      />
                    </div>
                    <button onClick={() => removePhoto(photo.id)}
                      className="text-gray-400 hover:text-red-600 shrink-0" title="この写真を外す">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** 写真帳は innerHTML で組むので、工事名などをそのまま入れない。 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default ConstructionPhotos;
