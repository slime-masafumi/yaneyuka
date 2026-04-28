'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface DiffResult {
  data: Uint8ClampedArray;
  changed: number;
  total: number;
}

interface PageCache {
  c1: HTMLCanvasElement;
  c2: HTMLCanvasElement;
  diff: DiffResult;
  W: number;
  H: number;
}

const PdfDiffTool: React.FC = () => {
  const [files, setFiles] = useState<(File | null)[]>([null, null]);
  const [pdfs, setPdfs] = useState<any[]>([null, null]);
  const [currentView, setCurrentView] = useState<'overlay' | 'side' | 'diff'>('overlay');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sensitivity, setSensitivity] = useState(10);
  const [opacity, setOpacity] = useState(70);
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [showStatus, setShowStatus] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [stats, setStats] = useState({ changed: '—', pct: '—', same: '—', pages: '—' });
  const [isComparing, setIsComparing] = useState(false);

  const diffCacheRef = useRef<Record<number, PageCache>>({});
  const lastDiffRef = useRef<PageCache | null>(null);
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const pdfjsLoadedRef = useRef(false);
  const pdfjsLibRef = useRef<any>(null);

  // Load pdf.js dynamically
  const loadPdfJs = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (pdfjsLibRef.current) {
        resolve(pdfjsLibRef.current);
        return;
      }
      if ((window as any)['pdfjs-dist/build/pdf']) {
        const lib = (window as any)['pdfjs-dist/build/pdf'];
        pdfjsLibRef.current = lib;
        resolve(lib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const lib = (window as any)['pdfjs-dist/build/pdf'];
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLibRef.current = lib;
        resolve(lib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }, []);

  const processFile = useCallback(async (idx: number, file: File) => {
    const pdfjsLib = await loadPdfJs();
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    setFiles(prev => { const n = [...prev]; n[idx] = file; return n; });
    setPdfs(prev => { const n = [...prev]; n[idx] = pdf; return n; });
  }, [loadPdfJs]);

  const handleFileChange = useCallback((idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(idx, file);
  }, [processFile]);

  const handleDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.pdf')) processFile(idx, file);
  }, [processFile]);

  const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  const computeDiff = useCallback((d1: ImageData, d2: ImageData, W: number, H: number): DiffResult => {
    const thresh = sensitivity * 5;
    const diff = new Uint8ClampedArray(W * H * 4);
    let changed = 0;
    const len = d1.data.length;
    for (let i = 0; i < len; i += 4) {
      const dr = Math.abs(d1.data[i] - d2.data[i]);
      const dg = Math.abs(d1.data[i + 1] - d2.data[i + 1]);
      const db = Math.abs(d1.data[i + 2] - d2.data[i + 2]);
      if (dr + dg + db > thresh) {
        diff[i] = 220; diff[i + 1] = 38; diff[i + 2] = 38; diff[i + 3] = 210;
        changed++;
      }
    }
    return { data: diff, changed, total: W * H };
  }, [sensitivity]);

  const updateStats = useCallback((diff: DiffResult, pages: number) => {
    const pct = ((diff.changed / diff.total) * 100).toFixed(2);
    const same = (100 - parseFloat(pct)).toFixed(1);
    setStats({
      changed: diff.changed.toLocaleString(),
      pct: pct + '%',
      same: same + '%',
      pages: pages + ' ページ',
    });
  }, []);

  const makeOverlayCanvas = useCallback((diff: DiffResult, W: number, H: number): HTMLCanvasElement => {
    const op = opacity / 100;
    const oc = makeCanvas(W, H);
    const octx = oc.getContext('2d')!;
    const id = new ImageData(diff.data.slice(), W, H);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = Math.round(id.data[i] * op);
    octx.putImageData(id, 0, 0);
    return oc;
  }, [opacity]);

  const renderView = useCallback(() => {
    const container = viewContainerRef.current;
    if (!container || !lastDiffRef.current) return;
    container.innerHTML = '';

    const { c1, c2, diff, W, H } = lastDiffRef.current;

    if (currentView === 'side') {
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = '1fr 1fr';
      grid.style.gap = '2px';
      grid.style.width = '100%';

      const createPane = (canvas: HTMLCanvasElement, label: string) => {
        const pane = document.createElement('div');
        pane.style.position = 'relative';
        pane.style.overflow = 'hidden';
        const img = makeCanvas(W, H);
        img.getContext('2d')!.drawImage(canvas, 0, 0);
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        const ov = makeOverlayCanvas(diff, W, H);
        ov.style.position = 'absolute';
        ov.style.top = '0';
        ov.style.left = '0';
        ov.style.width = '100%';
        ov.style.height = '100%';
        ov.style.pointerEvents = 'none';
        const lbl = document.createElement('div');
        lbl.style.cssText = 'position:absolute;top:8px;left:8px;font-size:11px;font-weight:600;color:#fff;background:rgba(0,0,0,0.55);padding:2px 8px;border-radius:4px;';
        lbl.textContent = label;
        pane.appendChild(img);
        pane.appendChild(ov);
        pane.appendChild(lbl);
        return pane;
      };

      grid.appendChild(createPane(c1, '旧 (基準)'));
      grid.appendChild(createPane(c2, '新 (比較)'));
      container.appendChild(grid);

    } else if (currentView === 'diff') {
      const dc = makeCanvas(W, H);
      const dctx = dc.getContext('2d')!;
      dctx.fillStyle = '#fff';
      dctx.fillRect(0, 0, W, H);
      const id = new ImageData(diff.data.slice(), W, H);
      dctx.putImageData(id, 0, 0);
      dc.style.width = '100%';
      dc.style.height = 'auto';
      dc.style.display = 'block';
      container.appendChild(dc);

    } else {
      // overlay
      const wrap = document.createElement('div');
      wrap.style.position = 'relative';
      wrap.style.width = '100%';
      const base = makeCanvas(W, H);
      base.getContext('2d')!.drawImage(c1, 0, 0);
      base.style.width = '100%';
      base.style.height = 'auto';
      base.style.display = 'block';
      const ov = makeOverlayCanvas(diff, W, H);
      ov.style.position = 'absolute';
      ov.style.top = '0';
      ov.style.left = '0';
      ov.style.width = '100%';
      ov.style.height = '100%';
      ov.style.pointerEvents = 'none';
      wrap.appendChild(base);
      wrap.appendChild(ov);
      container.appendChild(wrap);
    }
  }, [currentView, makeOverlayCanvas]);

  const renderAndCompare = useCallback(async (pageNum: number, pdfArr: any[], tp: number) => {
    setProgress(20);
    setStatusMsg(`ページ ${pageNum} をレンダリング中...`);
    const SCALE = 2.0;

    const page1 = await pdfArr[0].getPage(pageNum);
    const page2 = await pdfArr[1].getPage(pageNum);
    const vp1 = page1.getViewport({ scale: SCALE });
    const vp2 = page2.getViewport({ scale: SCALE });
    const W = Math.max(vp1.width, vp2.width) | 0;
    const H = Math.max(vp1.height, vp2.height) | 0;

    const c1 = makeCanvas(W, H);
    const c2 = makeCanvas(W, H);
    const ctx1 = c1.getContext('2d')!;
    const ctx2 = c2.getContext('2d')!;

    ctx1.fillStyle = '#fff'; ctx1.fillRect(0, 0, W, H);
    ctx2.fillStyle = '#fff'; ctx2.fillRect(0, 0, W, H);

    await page1.render({ canvasContext: ctx1, viewport: vp1 }).promise;
    setProgress(50);
    setStatusMsg('差分を計算中...');
    await page2.render({ canvasContext: ctx2, viewport: vp2 }).promise;
    setProgress(75);
    setStatusMsg('ハイライトを生成中...');

    const d1 = ctx1.getImageData(0, 0, W, H);
    const d2 = ctx2.getImageData(0, 0, W, H);
    const diffResult = computeDiff(d1, d2, W, H);

    const cache: PageCache = { c1, c2, diff: diffResult, W, H };
    diffCacheRef.current[pageNum] = cache;
    lastDiffRef.current = cache;

    updateStats(diffResult, tp);
    setProgress(100);
    setStatusMsg('完了');
  }, [computeDiff, updateStats]);

  const runCompare = useCallback(async () => {
    if (!pdfs[0] || !pdfs[1]) return;
    setIsComparing(true);
    diffCacheRef.current = {};
    lastDiffRef.current = null;
    setShowStatus(true);
    setShowStats(false);
    setShowExport(false);

    const tp = Math.min(pdfs[0].numPages, pdfs[1].numPages);
    setTotalPages(tp);
    setCurrentPage(1);

    await renderAndCompare(1, pdfs, tp);

    setShowStatus(false);
    setShowStats(true);
    setShowExport(true);
    setIsComparing(false);
  }, [pdfs, renderAndCompare]);

  // Re-render view when lastDiff changes
  useEffect(() => {
    if (lastDiffRef.current && showStats) {
      renderView();
    }
  }, [showStats, currentView, opacity, renderView]);

  // Redraw diff when sensitivity changes
  useEffect(() => {
    if (!lastDiffRef.current || !showStats) return;
    const { c1, c2, W, H } = lastDiffRef.current;
    const ctx1 = c1.getContext('2d')!;
    const ctx2 = c2.getContext('2d')!;
    const d1 = ctx1.getImageData(0, 0, W, H);
    const d2 = ctx2.getImageData(0, 0, W, H);
    const diffResult = computeDiff(d1, d2, W, H);
    lastDiffRef.current.diff = diffResult;
    diffCacheRef.current[currentPage].diff = diffResult;
    updateStats(diffResult, totalPages);
    renderView();
  }, [sensitivity]);

  const goPage = useCallback(async (dir: number) => {
    const next = currentPage + dir;
    if (next < 1 || next > totalPages) return;
    setCurrentPage(next);
    if (diffCacheRef.current[next]) {
      lastDiffRef.current = diffCacheRef.current[next];
      renderView();
    } else {
      setShowStatus(true);
      await renderAndCompare(next, pdfs, totalPages);
      setShowStatus(false);
      renderView();
    }
  }, [currentPage, totalPages, pdfs, renderAndCompare, renderView]);

  const exportPNG = useCallback(() => {
    if (!lastDiffRef.current) return;
    const { c1, diff, W, H } = lastDiffRef.current;
    const op = opacity / 100;
    const out = makeCanvas(W, H);
    const ctx = out.getContext('2d')!;
    ctx.drawImage(c1, 0, 0);
    const id = new ImageData(diff.data.slice(), W, H);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = Math.round(id.data[i] * op);
    ctx.putImageData(id, 0, 0);
    const a = document.createElement('a');
    a.download = `diff_page${currentPage}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
  }, [currentPage, opacity]);

  const exportDiffPDF = useCallback(() => {
    if (!lastDiffRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = async () => {
      const { jsPDF } = (window as any).jspdf;
      const op = 220 / 255;

      const buildComposite = (pc1: HTMLCanvasElement, pdiff: DiffResult, pW: number, pH: number) => {
        const out = makeCanvas(pW, pH);
        const ctx = out.getContext('2d')!;
        ctx.drawImage(pc1, 0, 0);
        const id = new ImageData(pdiff.data.slice(), pW, pH);
        for (let i = 3; i < id.data.length; i += 4) id.data[i] = Math.round(id.data[i] * op);
        ctx.putImageData(id, 0, 0);
        return out;
      };

      const { c1, diff, W, H } = lastDiffRef.current!;
      const first = buildComposite(c1, diff, W, H);
      const pdf = new jsPDF({
        orientation: W > H ? 'landscape' : 'portrait',
        unit: 'px',
        format: [W, H],
      });
      pdf.addImage(first.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);

      for (let p = 2; p <= totalPages; p++) {
        if (diffCacheRef.current[p]) {
          const { c1: pc1, diff: pd, W: pW, H: pH } = diffCacheRef.current[p];
          const composite = buildComposite(pc1, pd, pW, pH);
          pdf.addPage([pW, pH], pW > pH ? 'landscape' : 'portrait');
          pdf.addImage(composite.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pW, pH);
        }
      }
      pdf.save('pdf_diff_result.pdf');
    };
    document.head.appendChild(script);
  }, [totalPages]);

  const canCompare = pdfs[0] && pdfs[1];

  return (
    <div className="pt-0 pb-4" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 mb-4 border-b border-gray-300">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">PDF 差分比較ツール</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">図面・契約書の変更箇所を自動検出</p>
        </div>
        <span className="text-[11px] bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">画像差分エンジン</span>
      </div>

      {/* Upload row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {[0, 1].map(idx => (
          <div
            key={idx}
            className={`border-2 border-dashed rounded-xl p-7 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors min-h-[120px] relative ${
              files[idx] ? 'border-solid border-green-500 bg-green-50' : 'border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400'
            }`}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => handleDrop(idx, e)}
            onClick={() => document.getElementById(`pdf-input-${idx}`)?.click()}
          >
            <span className={`text-[11px] font-semibold text-white px-2 py-0.5 rounded ${idx === 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
              {idx === 0 ? '旧 / 基準' : '新 / 比較対象'}
            </span>
            <svg className="text-gray-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <span className={`text-[13px] ${files[idx] ? 'font-medium text-green-700 max-w-full overflow-hidden text-ellipsis whitespace-nowrap' : 'text-gray-400'}`}>
              {files[idx]?.name || 'クリックまたはドロップ'}
            </span>
            <input
              id={`pdf-input-${idx}`}
              type="file"
              accept=".pdf"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={e => handleFileChange(idx, e)}
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 flex-wrap mb-4">
        <button
          className={`text-[13px] font-medium px-5 py-2 rounded-lg border transition-colors whitespace-nowrap ${
            canCompare && !isComparing
              ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-700 cursor-pointer'
              : 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
          disabled={!canCompare || isComparing}
          onClick={runCompare}
        >
          差分を検出
        </button>

        <div className="flex flex-col gap-1 min-w-[160px] flex-1">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>検出感度</span>
            <span className="font-semibold text-gray-800">{sensitivity}</span>
          </div>
          <input
            type="range" min="1" max="50" value={sensitivity}
            onChange={e => setSensitivity(parseInt(e.target.value))}
            className="w-full h-1 accent-gray-900 cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[160px] flex-1">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>ハイライト透過度</span>
            <span className="font-semibold text-gray-800">{opacity}%</span>
          </div>
          <input
            type="range" min="20" max="100" value={opacity}
            onChange={e => setOpacity(parseInt(e.target.value))}
            className="w-full h-1 accent-gray-900 cursor-pointer"
          />
        </div>

        <div className="flex border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {(['overlay', 'side', 'diff'] as const).map(v => (
            <button
              key={v}
              className={`text-[12px] font-medium px-3.5 py-1.5 border-none cursor-pointer whitespace-nowrap transition-colors ${
                currentView === v ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
              onClick={() => setCurrentView(v)}
            >
              {v === 'overlay' ? '重ね合わせ' : v === 'side' ? '並列' : '差分のみ'}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      {showStatus && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-col gap-3">
          <div className="text-[13px] text-gray-600">{statusMsg}</div>
          <div className="h-1 rounded bg-gray-200 overflow-hidden">
            <div className="h-full bg-gray-900 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-200 min-h-[480px] flex items-center justify-center mb-4">
        {!showStats && (
          <div className="flex flex-col items-center gap-3 text-gray-400 p-10 text-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" style={{ opacity: 0.4 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <p className="text-[13px] leading-relaxed max-w-[280px]">
              旧PDFと新PDFをアップロードして<br />「差分を検出」を押してください
            </p>
          </div>
        )}
        <div ref={viewContainerRef} style={{ display: showStats ? 'block' : 'none', width: '100%', overflow: 'auto' }} />
      </div>

      {/* Stats row */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="text-2xl font-semibold tracking-tight text-red-700">{stats.changed}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">変更ピクセル数</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="text-2xl font-semibold tracking-tight text-blue-700">{stats.pct}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">変更率</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="text-2xl font-semibold tracking-tight text-green-700">{stats.same}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">一致率</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="text-2xl font-semibold tracking-tight">{stats.pages}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">比較ページ数</div>
          </div>
        </div>
      )}

      {/* Export row */}
      {showExport && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-red-600" />変更あり
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
              <div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300" />変更なし
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="text-[13px] font-medium px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer" onClick={exportDiffPDF}>
              差分PDFを保存
            </button>
            <button className="text-[13px] font-medium px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer" onClick={exportPNG}>
              PNG保存
            </button>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 ml-auto">
              <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => goPage(-1)}>
                ← 前
              </button>
              <span className="text-[13px] text-gray-600">{currentPage} / {totalPages}</span>
              <button className="text-[13px] font-medium px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => goPage(1)}>
                次 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfDiffTool;
