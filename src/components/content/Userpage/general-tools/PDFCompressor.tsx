'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { FiFile, FiX, FiDownload } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthContext';
import { usePdfjs } from '@/lib/pdfjs';
import { requestGeneralTool } from '@/lib/generalToolsMenu';
import ToolHeader from '../ToolHeader';
import { isLargeFormat, paperText } from './pdf/paper';

/**
 * PDF圧縮。
 *
 * 「圧縮」と一口に言っても、図面と資料ではやってよいことが逆になる。
 *   - 図面: ページを画像にすると細線がにじみ、拡大しても読めなくなる。文字検索も効かなくなる。
 *           だから線と文字はデータのまま、不要なデータだけを落とす（効果は小さい）。
 *   - 資料: スキャンや写真が主なら、ページごと JPEG にしてしまうのが一番縮む。
 * 以前は「強力圧縮（画像化）」が既定で、図面を入れると細線が潰れた PDF がそのまま出ていた。
 * 既定を図面向けにし、画像化したものが図面らしいときは結果に注意を出す。
 */

type CompressionLevel = 'low' | 'medium' | 'high';

type ProcessMode = 'rasterize' | 'optimize';

const MODES: { id: ProcessMode; label: string; what: string; use: string }[] = [
  {
    id: 'optimize',
    label: '図面向け（線を残す）',
    what: '線と文字はデータのまま。拡大しても細線はにじまず、文字の検索・コピーもそのまま。減るのは不要なデータの分だけ（数%〜数十%）。',
    use: 'CAD から出した図面、提出・印刷するもの',
  },
  {
    id: 'rasterize',
    label: '資料向け（画像を圧縮）',
    what: '各ページを写真（JPEG）に置き換える。大きく縮むが、細線はにじみ、文字は検索・コピーできなくなる。',
    use: 'スキャン・写真の多い資料、メール添付の容量に収めたいとき',
  },
];

const PRESETS: Record<CompressionLevel, { dpi: number; quality: number }> = {
  high: { dpi: 96, quality: 0.4 },
  medium: { dpi: 144, quality: 0.6 },
  low: { dpi: 200, quality: 0.8 },
};

/**
 * 1 ページを描くキャンバスの上限（画素）。
 * iPad / iPhone の Safari はキャンバスが約 1670 万画素を超えると真っ白になる。
 * A1 を 144dpi で描くとこれを超えるので、大判は解像度を下げて描く。
 */
const MAX_PIXELS = 16_000_000;

/** メール添付で弾かれやすい大きさ。社内メールは 10MB 前後が上限のことが多い */
const MAIL_LIMIT = 10 * 1024 * 1024;

type DrawingHint = {
  /** A2 以上の大判ページ数 */
  largePages: number;
  /** 一番大きいページの用紙 */
  largestPaper: string;
  /** 線のデータ（パス）が多く、画像がほぼ無い＝CAD 出力らしい */
  vectorHeavy: boolean;
};

type Job = {
  id: string;
  file: File;
  status: 'waiting' | 'running' | 'done' | 'error';
  progress: number;
  mode?: ProcessMode;
  blob?: Blob;
  url?: string;
  outName?: string;
  error?: string;
  hint?: DrawingHint;
  /** 大判のため解像度を下げたときの最低 dpi */
  minDpi?: number;
  pageCount?: number;
};

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const changeText = (before: number, after: number) =>
  after < before
    ? `−${((1 - after / before) * 100).toFixed(1)}%`
    : `+${((after / before - 1) * 100).toFixed(1)}%`;

const looksLikeDrawing = (h?: DrawingHint) => !!h && (h.largePages > 0 || h.vectorHeavy);

const PDFCompressor: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const pdfjsLib = usePdfjs();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState('');

  // 設定。既定は図面向け（線を残す）。画像化は選んだときだけ。
  const [mode, setMode] = useState<ProcessMode>('optimize');
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [dpi, setDpi] = useState<number>(PRESETS.medium.dpi);
  const [quality, setQuality] = useState<number>(PRESETS.medium.quality);
  const [grayscale, setGrayscale] = useState<boolean>(false);

  const modeRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 作ったダウンロード用 URL。圧縮を繰り返すたびに数十MB単位でメモリに残るので、
  // 作り直し・取り外し・画面を閉じたときに必ず解放する。
  const urlsRef = useRef(new Set<string>());
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);
  const revoke = (url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  };

  const getDpiDescription = (val: number) => {
    if (val <= 96) return 'モニタ閲覧用。ファイルサイズを最小限に抑えます。';
    if (val <= 144) return 'PCやタブレットでの閲覧に適したバランスの良い設定です。';
    return '印刷に耐えうる画質ですが、ファイルサイズは大きくなります。';
  };

  const pickPreset = (level: CompressionLevel) => {
    setCompressionLevel(level);
    setDpi(PRESETS[level].dpi);
    setQuality(PRESETS[level].quality);
  };

  const loginNotice = '入力するには会員登録（無料）・ログインが必要です。';

  const onDrop = (acceptedFiles: File[], rejected: unknown[]) => {
    if (!isLoggedIn) {
      setNotice(loginNotice);
      return;
    }
    const pdfs = acceptedFiles.filter((f) => f.type.includes('pdf') || /\.pdf$/i.test(f.name));
    const skipped = acceptedFiles.length - pdfs.length + rejected.length;
    setNotice(skipped > 0 ? `PDF以外の ${skipped} 件は外しました。` : '');
    if (pdfs.length === 0) return;
    setJobs((prev) => [...prev, ...pdfs.map((file) => ({ id: newId(), file, status: 'waiting' as const, progress: 0 }))]);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    noClick: true, // クリックはボタンに任せる
    disabled: running,
  });

  const pickFiles = () => {
    if (!isLoggedIn) {
      setNotice(loginNotice);
      return;
    }
    open();
  };

  const update = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const removeJob = (id: string) =>
    setJobs((prev) => {
      revoke(prev.find((j) => j.id === id)?.url);
      return prev.filter((j) => j.id !== id);
    });

  const clearJobs = () =>
    setJobs((prev) => {
      prev.forEach((j) => revoke(j.url));
      return [];
    });

  // --- 図面向け: 線と文字はそのまま、入れ物だけ詰め直す -------------------------
  const optimize = async (file: File) => {
    const srcPdf = await PDFDocument.load(await file.arrayBuffer());
    const outPdf = await PDFDocument.create();
    const copiedPages = await outPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    copiedPages.forEach((page) => outPdf.addPage(page));
    outPdf.setTitle(file.name);
    outPdf.setCreator('Yaneyuka Tool');
    const bytes = await outPdf.save({ useObjectStreams: true });
    return { bytes, pageCount: copiedPages.length, hint: undefined, minDpi: undefined };
  };

  // --- 資料向け: ページを JPEG にして貼り直す ------------------------------------
  const rasterize = async (file: File, onProgress: (p: number) => void) => {
    if (!pdfjsLib) throw new Error('PDFエンジン初期化中です。');
    const OPS = pdfjsLib.OPS;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pageCount = pdf.numPages;
    const outPdf = await PDFDocument.create();

    let largePages = 0;
    let largest = { w: 0, h: 0 };
    let paths = 0;
    let images = 0;
    let minDpi = dpi;

    try {
      for (let i = 1; i <= pageCount; i++) {
        onProgress(Math.round(((i - 1) / pageCount) * 100));
        const page = await pdf.getPage(i);
        const base = page.getViewport({ scale: 1 });

        // 図面らしさの目安: 大判か、線のデータが多く画像がほぼ無いか（最初の 3 ページだけ数える）
        if (isLargeFormat(base.width, base.height)) largePages++;
        if (base.width * base.height > largest.w * largest.h) largest = { w: base.width, h: base.height };
        if (i <= 3) {
          try {
            const ops = await page.getOperatorList();
            for (const fn of ops.fnArray) {
              if (fn === OPS.constructPath) paths++;
              else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) images++;
            }
          } catch {
            /* 数えられなくても圧縮は続ける */
          }
        }

        let scale = dpi / 72;
        if (base.width * scale * base.height * scale > MAX_PIXELS) {
          scale = Math.sqrt(MAX_PIXELS / (base.width * base.height));
          minDpi = Math.min(minDpi, Math.floor(scale * 72));
        }
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        // 透明部分が JPEG で黒くならないよう白で敷く
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;

        if (grayscale) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let p = 0; p < data.length; p += 4) {
            const y = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
            data[p] = data[p + 1] = data[p + 2] = y;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const jpegBlob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => {
          if (!b) { reject(new Error('画像の変換に失敗しました')); return; }
          resolve(b);
        }, 'image/jpeg', Math.min(1, Math.max(0.1, quality))));

        const jpg = await outPdf.embedJpg(await jpegBlob.arrayBuffer());
        // ページの大きさは元の用紙のまま（pt）。以前は画素数をそのまま pt にしていたため、
        // 144dpi だと A4 が A2 相当の大きさで出力され、実寸印刷で縮尺が狂っていた。
        const pageOut = outPdf.addPage([base.width, base.height]);
        pageOut.drawImage(jpg, { x: 0, y: 0, width: base.width, height: base.height });

        // ページごとにcanvasとpdf.js側のバッファを解放する。
        // 200dpiのA4は約1700×2200=15MB/枚あり、
        // 数十ページのPDFではこれを溜め込むとタブが落ちる。
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    } finally {
      await pdf.destroy();
    }

    const bytes = await outPdf.save({ useObjectStreams: true });
    const hint: DrawingHint = {
      largePages,
      largestPaper: largest.w > 0 ? paperText(largest.w, largest.h) : '',
      // CAD 出力は 1 ページで数千のパスを持ち、画像はほぼ無い。Word や Excel の表は数百程度
      vectorHeavy: paths >= 1500 && paths > images * 300,
    };
    return { bytes, pageCount, hint, minDpi: minDpi < dpi ? minDpi : undefined };
  };

  /** 並んでいる全ファイルを、今の設定で順番に処理する（やり直しも同じ）。 */
  const run = async (modeArg?: ProcessMode) => {
    const m = modeArg ?? mode;
    if (jobs.length === 0 || running) return;
    if (m === 'rasterize' && !pdfjsLib) {
      setNotice('PDFエンジンを準備中です。数秒後にもう一度押してください。');
      return;
    }
    setNotice('');
    setRunning(true);
    const list = jobs.map((j) => ({ id: j.id, file: j.file }));
    jobs.forEach((j) => revoke(j.url));
    setJobs((prev) => prev.map((j) => ({ id: j.id, file: j.file, status: 'waiting', progress: 0 })));

    for (const { id, file } of list) {
      update(id, { status: 'running', progress: 0 });
      try {
        const r = m === 'optimize' ? await optimize(file) : await rasterize(file, (p) => update(id, { progress: p }));
        const blob = new Blob([r.bytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        urlsRef.current.add(url);
        update(id, {
          status: 'done',
          progress: 100,
          mode: m,
          blob,
          url,
          outName: `${m === 'optimize' ? 'optimized' : 'compressed'}_${file.name}`,
          hint: r.hint,
          minDpi: r.minDpi,
          pageCount: r.pageCount,
        });
      } catch (err) {
        console.error('PDF処理エラー:', err);
        const msg = err instanceof Error ? err.message : '処理に失敗しました';
        update(id, {
          status: 'error',
          progress: 0,
          error: /encrypt|password/i.test(msg) ? 'パスワード付きのPDFは扱えません。' : msg,
        });
      }
    }
    setRunning(false);
    scrollTo(resultRef);
  };

  const redoAsDrawing = () => {
    setMode('optimize');
    run('optimize');
  };

  const done = jobs.filter((j) => j.status === 'done' && j.blob);
  const totalBefore = done.reduce((s, j) => s + j.file.size, 0);
  const totalAfter = done.reduce((s, j) => s + (j.blob?.size ?? 0), 0);

  const saveZip = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const used = new Set<string>();
    done.forEach((j) => {
      let name = j.outName ?? j.file.name;
      for (let n = 2; used.has(name); n++) name = name.replace(/(\.pdf)?$/i, ` (${n})$1`);
      used.add(name);
      zip.file(name, j.blob!);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const monoLabel = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';

  return (
    <div className="w-full bg-white">
      <ToolHeader
        no="07"
        code="PDF / COMPRESS"
        title="PDF圧縮"
        description="メールで送れない重いPDFを軽くする。図面は線を残したまま、資料は画像にして大きく縮める"
        aside={jobs.length > 0 ? <span className="yy-mono text-[10px] tracking-[0.12em] uppercase">{jobs.length} Files</span> : undefined}
        features={[
          { label: '図面向け（線を残す）', onClick: () => { setMode('optimize'); scrollTo(modeRef); }, active: mode === 'optimize' },
          { label: '資料向け（画像を圧縮）', onClick: () => { setMode('rasterize'); scrollTo(modeRef); }, active: mode === 'rasterize' },
          { label: '複数ファイルをまとめて', login: true, hint: 'ログインすると、PDFを何本でもまとめて圧縮し、ZIPで保存できます', onClick: pickFiles },
          { label: '圧縮前後のサイズ比較', onClick: () => scrollTo(resultRef) },
          { label: 'ページの抜き出し・結合 → 図面PDF', onClick: () => requestGeneralTool({ toolId: 'drawing-pdf' }) },
        ]}
      />

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* --- 左カラム：入力・設定 --- */}
          <div className="space-y-5 min-w-0">

            {/* 1. ファイル選択 */}
            <div>
              <div
                {...getRootProps()}
                className={`border border-dashed p-6 text-center transition-colors ${
                  isDragActive ? 'border-[#141414] bg-[#f4f4f2]' : 'border-gray-400 hover:border-[#141414]'
                }`}
              >
                <input {...getInputProps()} />
                <FiFile className="w-3.5 h-3.5 mx-auto text-gray-400" />
                <p className="text-[11px] text-gray-600 mt-2">PDFをドラッグ＆ドロップ（何本でもまとめて）</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); pickFiles(); }}
                  disabled={running}
                  className="mt-2 text-[11px] text-gray-700 underline underline-offset-2 disabled:opacity-40"
                >
                  {jobs.length > 0 ? 'PDFを追加' : 'ファイルを選択'}
                </button>
              </div>
              {notice && <p className="text-[11px] text-gray-600 border-l border-[#52aa96] pl-2 mt-2">{notice}</p>}
              <p className="text-[10px] text-gray-500 mt-2">
                ページの抜き出し・結合・回転は{' '}
                <button type="button" onClick={() => requestGeneralTool({ toolId: 'drawing-pdf' })} className="underline underline-offset-2 text-gray-700">
                  図面PDF
                </button>
                {' '}で。
              </p>
            </div>

            {/* 2. 図面か資料か */}
            <div ref={modeRef} className="yy-panel scroll-mt-2">
              <div className="yy-panel__head">何を圧縮しますか</div>
              <div role="radiogroup" aria-label="圧縮の方法">
                {MODES.map((m, i) => {
                  const on = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMode(m.id)}
                      className={`w-full text-left px-3 py-2.5 border-l ${i > 0 ? 'border-t border-t-gray-200' : ''} ${
                        on ? 'border-l-[#52aa96] bg-white' : 'border-l-transparent hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className={monoLabel}>{String(i + 1).padStart(3, '0')}</span>
                        <span className={`text-[12px] ${on ? 'font-bold text-[#141414]' : 'text-gray-600'}`}>{m.label}</span>
                        {i === 0 && <span className={`${monoLabel} ml-auto`}>既定</span>}
                      </span>
                      <span className="block text-[11px] text-gray-600 mt-1 leading-relaxed">{m.what}</span>
                      <span className="block text-[10px] text-gray-500 mt-0.5">向いているもの: {m.use}</span>
                    </button>
                  );
                })}
              </div>

              {mode === 'optimize' && (
                <p className="text-[10px] text-gray-500 px-3 py-2 border-t border-gray-200 leading-relaxed">
                  画質は劣化しません。しおり（目次）は引き継がれません。すでに軽いPDFはほとんど減らないことがあります。
                </p>
              )}

              {mode === 'rasterize' && (
                <div className="px-3 py-3 border-t border-gray-200 space-y-4">
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    図面（A2 以上・CAD 出力）には使わないでください。細線がにじみ、文字も検索できなくなります。
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">プリセット</label>
                      <select
                        value={compressionLevel}
                        onChange={(e) => pickPreset(e.target.value as CompressionLevel)}
                        className="w-full p-1.5 text-[11px] bg-white"
                      >
                        <option value="low">低圧縮 (高品質)</option>
                        <option value="medium">標準</option>
                        <option value="high">高圧縮 (低品質)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">解像度 (DPI)</label>
                      <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))} className="w-full p-1.5 text-[11px] bg-white">
                        <option value={96}>96 dpi</option>
                        <option value={144}>144 dpi</option>
                        <option value={200}>200 dpi</option>
                      </select>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">{getDpiDescription(dpi)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <label className="block text-[10px] text-gray-500">JPEG画質</label>
                      <span className="yy-mono text-[11px] text-gray-700">{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range" min={0.1} max={1} step={0.1}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full cursor-pointer accent-[#3b3b3b]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>低画質(小)</span>
                      <span>高画質(大)</span>
                    </div>
                  </div>

                  <label className="inline-flex items-center text-[11px] gap-2 cursor-pointer text-gray-700">
                    <input type="checkbox" checked={grayscale} onChange={(e) => setGrayscale(e.target.checked)} />
                    モノクロ化してさらに圧縮
                  </label>

                  {compressionLevel === 'high' && (
                    <p className="text-[10px] text-gray-700 border-l border-[#141414] pl-2">
                      高圧縮は画質が落ち、細かい文字や線が潰れることがあります。
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 3. 実行 */}
            <div>
              <button
                type="button"
                onClick={() => run()}
                disabled={jobs.length === 0 || running || (!pdfjsLib && mode === 'rasterize')}
                className="yy-btn yy-btn--primary w-full"
              >
                {running
                  ? '処理中…'
                  : jobs.length > 1
                    ? `${jobs.length} 本を${mode === 'optimize' ? '図面向け' : '資料向け'}で圧縮する`
                    : `${mode === 'optimize' ? '図面向け' : '資料向け'}で圧縮する`}
              </button>
              {!pdfjsLib && mode === 'rasterize' && <p className="text-[10px] text-center text-gray-500 mt-1">エンジン準備中…</p>}
            </div>
          </div>

          {/* --- 右カラム：結果 --- */}
          <div ref={resultRef} className="yy-panel flex flex-col min-h-[300px] min-w-0 scroll-mt-2">
            <div className="yy-panel__head flex items-center justify-between gap-2">
              <span>処理結果</span>
              {jobs.length > 0 && !running && (
                <button type="button" onClick={clearJobs} className="text-[10px] font-normal text-gray-500 underline underline-offset-2 hover:text-gray-800">
                  すべて外す
                </button>
              )}
            </div>

            {jobs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-4 text-[11px] text-gray-400">
                <span>
                  PDFを入れると、圧縮前後のサイズがここに並びます —{' '}
                  <button type="button" onClick={pickFiles} className="underline underline-offset-2 text-gray-600">ファイルを選択</button>
                </span>
              </div>
            ) : (
              <>
                {done.length > 0 && (
                  <div className="px-3 py-2 border-b border-gray-200 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="yy-mono text-[11px] text-gray-700">
                      {formatFileSize(totalBefore)} → {formatFileSize(totalAfter)}
                      <span className="ml-2 text-[#141414] font-bold">{changeText(totalBefore, totalAfter)}</span>
                    </span>
                    {done.length > 1 && (
                      <button type="button" onClick={saveZip} className="yy-btn flex items-center gap-1">
                        <FiDownload className="w-3 h-3" /> {done.length} 本をZIPで保存
                      </button>
                    )}
                  </div>
                )}
                <ul className="flex-1">
                  {jobs.map((j, i) => {
                    const after = j.blob?.size ?? 0;
                    const drawingWarn = j.status === 'done' && j.mode === 'rasterize' && looksLikeDrawing(j.hint);
                    return (
                      <li key={j.id} className="px-3 py-2.5 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className={monoLabel}>{String(i + 1).padStart(3, '0')}</span>
                          <span className="text-[11px] text-gray-800 truncate flex-1 min-w-0" title={j.file.name}>{j.file.name}</span>
                          {!running && (
                            <button type="button" onClick={() => removeJob(j.id)} className="text-gray-400 hover:text-gray-800 shrink-0" title="外す">
                              <FiX className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {j.status === 'waiting' && (
                          <p className={`${monoLabel} mt-1`}>{formatFileSize(j.file.size)} · 待機中</p>
                        )}

                        {j.status === 'running' && (
                          <div className="mt-1.5">
                            <div className="h-px bg-gray-200 w-full">
                              <div className="h-px bg-[#141414] transition-all duration-300" style={{ width: `${Math.max(4, j.progress)}%` }} />
                            </div>
                            <p className={`${monoLabel} mt-1`}>処理中 {j.progress}%</p>
                          </div>
                        )}

                        {j.status === 'error' && (
                          <p className="text-[11px] text-red-600 mt-1">エラー: {j.error}</p>
                        )}

                        {j.status === 'done' && j.url && (
                          <div className="mt-1 space-y-1">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                              <span className="yy-mono text-[11px] text-gray-600">
                                {formatFileSize(j.file.size)} → <span className="text-[#141414] font-bold">{formatFileSize(after)}</span>
                              </span>
                              <span className={`yy-mono text-[11px] ${after < j.file.size ? 'text-[#141414]' : 'text-red-600'}`}>
                                {changeText(j.file.size, after)}
                              </span>
                              <span className={monoLabel}>
                                {j.mode === 'optimize' ? '図面向け' : '資料向け'}{j.pageCount ? ` · ${j.pageCount}p` : ''}
                              </span>
                              <a href={j.url} download={j.outName} className="text-[11px] text-gray-800 underline underline-offset-2 ml-auto">
                                ダウンロード
                              </a>
                            </div>

                            {drawingWarn && j.hint && (
                              <div className="text-[11px] text-gray-800 border-l border-[#141414] pl-2 leading-relaxed">
                                <span className="font-bold">図面のようです</span>
                                （{[
                                  j.hint.largePages > 0 ? `A2 以上の大判 ${j.hint.largePages} ページ${j.hint.largestPaper ? `・最大 ${j.hint.largestPaper}` : ''}` : '',
                                  j.hint.vectorHeavy ? '線のデータが多い' : '',
                                ].filter(Boolean).join(' / ')}）。
                                画像にしたため細線がにじみ、文字も検索できなくなっています。提出・印刷用なら{' '}
                                <button type="button" onClick={redoAsDrawing} disabled={running} className="underline underline-offset-2">
                                  図面向けで作り直す
                                </button>
                              </div>
                            )}

                            {after >= j.file.size && (
                              <p className="text-[10px] text-gray-500 leading-relaxed">
                                {j.mode === 'optimize'
                                  ? 'すでに最適化されていて減りませんでした。図面なら元のファイルをそのまま送るのが安全です。スキャン・写真の資料なら「資料向け」を試してください。'
                                  : '画像にしたら逆に大きくなりました。元のファイルを使ってください。'}
                              </p>
                            )}

                            {j.minDpi && (
                              <p className="text-[10px] text-gray-500">大判のため、一部のページは {j.minDpi}dpi まで下げて画像にしました（ブラウザの描画上限）。</p>
                            )}

                            {after > MAIL_LIMIT && (
                              <p className="text-[10px] text-gray-500">10MB を超えています。社内メールは添付 10MB 前後が上限のことが多く、弾かれることがあります。</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PDFCompressor;
