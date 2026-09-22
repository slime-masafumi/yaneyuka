'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiFile, FiDownload, FiTrash2, FiRotateCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * 図面PDFの整備。
 *
 * 提出のたびに Acrobat を開いてやっていたこと――要るページだけ抜く、
 * 順番を直す、複数のPDFを1本にまとめる、向きを揃える、用紙を変える、
 * 透かしと図番を入れる――をブラウザの中だけで済ませる。
 *
 * 中身の再圧縮はしない。図面PDFはラスタライズすると細線が飛ぶので、
 * ページの入れ替えと注記の追加だけに留めて、線は元のまま持ち越す。
 * 差分の比較は PDFGap が持っているのでここでは扱わない。
 *
 * できないこと:
 *   パスワードの付与・解除。pdf-lib は暗号化に対応しておらず、
 *   「掛かったように見えて掛かっていない」が一番まずいので実装しない。
 */

// 用紙サイズ（pt, 縦置き）。1pt = 1/72inch
const PAPER_SIZES: Record<string, [number, number]> = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A2: [1190.55, 1683.78],
  A1: [1683.78, 2383.94],
  A0: [2383.94, 3370.39],
};

type PageItem = {
  id: string;
  /** 読み込んだ PDF の通し番号（どのファイル由来か） */
  sourceIndex: number;
  sourceName: string;
  /** 元 PDF の中でのページ番号（0始まり） */
  pageIndex: number;
  /** この編集で足した回転（度）。元の回転に足し込む。 */
  rotation: number;
  width: number;
  height: number;
  selected: boolean;
};

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * 文字を PNG にして返す。
 *
 * pdf-lib の標準フォントは欧文しか持たず、日本語を渡すと落ちる。
 * 日本語フォントを同梱すると数MBになるので、ブラウザに描かせて画像にする。
 * これなら物件名でも図番でも、画面に出せる文字はそのまま入る。
 */
function textToPng(
  text: string,
  options: { fontSize: number; color: string; bold?: boolean },
): { dataUrl: string; width: number; height: number } | null {
  if (!text.trim()) return null;
  const scale = 3; // PDF に置いたとき粗く見えないよう、大きめに描いて縮める
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  const font = `${options.bold ? 'bold ' : ''}${options.fontSize * scale}px sans-serif`;
  probe.font = font;
  const metrics = probe.measureText(text);
  const width = Math.ceil(metrics.width) + 8;
  const height = Math.ceil(options.fontSize * scale * 1.4);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.color;
  ctx.fillText(text, 4, height / 2);

  return { dataUrl: canvas.toDataURL('image/png'), width: width / scale, height: height / scale };
}

const DrawingPdf: React.FC = () => {
  const [pages, setPages] = useState<PageItem[]>([]);
  // 読み込んだ PDF の中身。ページを書き出すときに元を参照する。
  const sourcesRef = useRef<ArrayBuffer[]>([]);

  const [paperSize, setPaperSize] = useState('keep');
  const [watermark, setWatermark] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(15);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [numberStart, setNumberStart] = useState(1);
  const [addNumbers, setAddNumbers] = useState(false);
  const [splitPerPage, setSplitPerPage] = useState(false);

  const [busy, setBusy] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (list.length === 0) return;

    setBusy('読み込み中…');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const added: PageItem[] = [];

      for (const file of list) {
        const buffer = await file.arrayBuffer();
        sourcesRef.current.push(buffer.slice(0));
        const sourceIndex = sourcesRef.current.length - 1;

        const doc = await PDFDocument.load(buffer);
        doc.getPages().forEach((page, i) => {
          const { width, height } = page.getSize();
          added.push({
            id: generateId(),
            sourceIndex,
            sourceName: file.name,
            pageIndex: i,
            rotation: 0,
            width,
            height,
            selected: false,
          });
        });
      }

      setPages((prev) => [...prev, ...added]);
    } catch (error) {
      console.error('PDFの読み込みに失敗しました', error);
      alert('PDFを読み込めませんでした。パスワード付きのPDFには対応していません。');
    } finally {
      setBusy('');
    }
  };

  /** 用紙の呼び名。図面は A3・A1 が多いので、寸法より名前で見たい。 */
  const paperLabel = (width: number, height: number) => {
    const shortSide = Math.min(width, height);
    const longSide = Math.max(width, height);
    const match = Object.entries(PAPER_SIZES).find(
      ([, [w, h]]) => Math.abs(w - shortSide) < 6 && Math.abs(h - longSide) < 6,
    );
    const orientation = width > height ? '横' : '縦';
    return match ? `${match[0]} ${orientation}` : `${Math.round(width)}×${Math.round(height)}pt`;
  };

  const toggleSelect = (id: string) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));

  const selectAll = (value: boolean) =>
    setPages((prev) => prev.map((p) => ({ ...p, selected: value })));

  const selectedCount = pages.filter((p) => p.selected).length;
  /** 選択が無いときは全ページを対象にする（毎回「全選択」を押させない） */
  const targets = selectedCount > 0 ? pages.filter((p) => p.selected) : pages;

  const rotateTargets = (delta: number) =>
    setPages((prev) =>
      prev.map((p) =>
        (selectedCount === 0 || p.selected) ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p,
      ),
    );

  const removeSelected = () => {
    if (selectedCount === 0) return;
    setPages((prev) => prev.filter((p) => !p.selected));
  };

  const movePage = (id: string, direction: -1 | 1) => {
    setPages((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  const clearAll = () => {
    setPages([]);
    sourcesRef.current = [];
  };

  /** 並べた順どおりに組み立てる。分割が指定されていればページごとに分ける。 */
  const exportPdf = async () => {
    if (pages.length === 0) return;
    setBusy('書き出し中…');

    try {
      const { PDFDocument, degrees } = await import('pdf-lib');

      // 元 PDF は一度だけ開いて使い回す
      const loaded = await Promise.all(
        sourcesRef.current.map((buffer) => PDFDocument.load(buffer.slice(0))),
      );

      const buildDoc = async (items: PageItem[]) => {
        const out = await PDFDocument.create();
        const copied = await Promise.all(
          items.map((item) => out.copyPages(loaded[item.sourceIndex], [item.pageIndex]).then((p) => p[0])),
        );

        for (let i = 0; i < copied.length; i++) {
          const page = copied[i];
          const item = items[i];

          if (item.rotation) {
            page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360));
          }

          if (paperSize !== 'keep') {
            const [targetW, targetH] = PAPER_SIZES[paperSize];
            const { width, height } = page.getSize();
            // 横長のページには用紙も横で当てる
            const [fitW, fitH] = width > height ? [targetH, targetW] : [targetW, targetH];
            // 内容は比率を保ったまま。図面は縦横比が崩れると寸法が読めなくなる
            const scale = Math.min(fitW / width, fitH / height);
            page.scaleContent(scale, scale);
            page.setSize(fitW, fitH);
            // 縮めた内容を中央へ寄せる
            page.translateContent((fitW - width * scale) / 2, (fitH - height * scale) / 2);
          }

          const { width, height } = page.getSize();

          if (watermark.trim()) {
            const png = textToPng(watermark.trim(), {
              fontSize: Math.max(24, Math.min(width, height) / 8),
              color: '#ff0000',
              bold: true,
            });
            if (png) {
              const image = await out.embedPng(png.dataUrl);
              // 斜めに1つ置く。並べて敷き詰めると図面が読めなくなる
              page.drawImage(image, {
                x: (width - png.width) / 2,
                y: (height - png.height) / 2,
                width: png.width,
                height: png.height,
                opacity: watermarkOpacity / 100,
                rotate: degrees(30),
              });
            }
          }

          if (addNumbers) {
            const label = `${numberPrefix}${numberStart + i}`;
            const png = textToPng(label, { fontSize: 12, color: '#000000', bold: true });
            if (png) {
              const image = await out.embedPng(png.dataUrl);
              // 右下。図面枠の外に出ないよう少し内側に入れる
              page.drawImage(image, {
                x: width - png.width - 24,
                y: 18,
                width: png.width,
                height: png.height,
              });
            }
          }

          out.addPage(page);
        }

        return out.save();
      };

      const download = (bytes: Uint8Array, name: string) => {
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      if (splitPerPage) {
        for (let i = 0; i < pages.length; i++) {
          const bytes = await buildDoc([pages[i]]);
          download(bytes, `図面_${String(i + 1).padStart(3, '0')}_${stamp}.pdf`);
        }
      } else {
        const bytes = await buildDoc(pages);
        download(bytes, `図面_${stamp}.pdf`);
      }
    } catch (error) {
      console.error('PDFの書き出しに失敗しました', error);
      alert('書き出しに失敗しました。');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">図面PDF</h3>
          <p className="text-[11px] mt-0.5">複数のPDFからページを抜き出して並べ替え・結合・分割。一括回転、用紙サイズ変換、透かしと図面番号の付与に対応</p>
        </div>
      </div>

      <div className="p-3 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 h-full">

          {/* 左：取り込みと設定 */}
          <div className="space-y-3 min-h-0 overflow-y-auto pr-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed p-5 text-center cursor-pointer transition ${
                isDragging ? 'border-[#3b3b3b] bg-gray-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <FiFile className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[11px] mt-2 text-gray-600">PDFをドラッグ＆ドロップ</p>
              <p className="text-[10px] mt-1 text-gray-400">
                複数まとめて読み込めます
              </p>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            </div>

            <div className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3">
              <div className="text-[11px] font-bold text-gray-600">
                ページ操作
                <span className="ml-2 font-normal text-gray-500">
                  {selectedCount > 0 ? `${selectedCount}ページを選択中` : '未選択＝全ページ'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => rotateTargets(90)} className="text-[10px] bg-white border border-gray-300 px-2 py-1 flex items-center gap-1">
                  <FiRotateCw className="w-3 h-3" /> 右90°
                </button>
                <button onClick={() => rotateTargets(-90)} className="text-[10px] bg-white border border-gray-300 px-2 py-1">左90°</button>
                <button onClick={() => rotateTargets(180)} className="text-[10px] bg-white border border-gray-300 px-2 py-1">180°</button>
                <button onClick={() => selectAll(true)} className="text-[10px] bg-white border border-gray-300 px-2 py-1">全選択</button>
                <button onClick={() => selectAll(false)} className="text-[10px] bg-white border border-gray-300 px-2 py-1">選択解除</button>
                <button onClick={removeSelected} disabled={selectedCount === 0}
                  className="text-[10px] bg-red-600 text-white px-2 py-1 disabled:opacity-40">選択を削除</button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3">
              <div className="text-[11px] font-bold text-gray-600">用紙・注記</div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">用紙サイズ</label>
                <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full p-1.5 text-[11px] border border-gray-300 bg-white">
                  <option value="keep">元のまま</option>
                  {Object.keys(PAPER_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">縦横比は保ったまま中央に配置します（図面の比率を崩さないため）。</p>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">透かし</label>
                <input type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)}
                  placeholder="DRAFT / 社外秘 / 物件名"
                  className="w-full p-1.5 text-[11px] border border-gray-300" />
                {watermark.trim() && (
                  <div className="mt-1">
                    <label className="block text-[10px] text-gray-500">濃さ {watermarkOpacity}%</label>
                    <input type="range" min={5} max={60} value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))} className="w-full" />
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <input type="checkbox" checked={addNumbers} onChange={(e) => setAddNumbers(e.target.checked)} />
                  図面番号を右下に入れる
                </label>
                {addNumbers && (
                  <div className="flex gap-2 mt-1">
                    <input type="text" value={numberPrefix} onChange={(e) => setNumberPrefix(e.target.value)}
                      placeholder="A-" className="flex-1 p-1.5 text-[11px] border border-gray-300" />
                    <input type="number" min={1} value={numberStart}
                      onChange={(e) => setNumberStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 p-1.5 text-[11px] border border-gray-300 text-right" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <input type="checkbox" checked={splitPerPage} onChange={(e) => setSplitPerPage(e.target.checked)} />
                ページごとに別ファイルで保存する
              </label>
              <button onClick={exportPdf} disabled={pages.length === 0 || !!busy}
                className="w-full bg-gray-700 text-white py-2 text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40">
                <FiDownload className="w-3.5 h-3.5" /> {busy || 'PDFを書き出す'}
              </button>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                中身の再圧縮はしません（図面の細線が飛ぶため）。パスワードの付与・解除には対応していません。
              </p>
            </div>
          </div>

          {/* 右：ページ一覧 */}
          <div className="bg-gray-50 border border-[#3b3b3b] p-4 flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[11px] font-bold text-gray-600">
                ページ {pages.length > 0 ? `(${pages.length})` : ''}
              </span>
              {pages.length > 0 && (
                <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-red-600">すべて削除</button>
              )}
            </div>

            {pages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-[11px]">
                PDFを追加するとページがここに並びます
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                  {pages.map((page, index) => (
                    <div key={page.id}
                      className={`bg-white border p-1.5 ${page.selected ? 'border-[#3b3b3b] ring-1 ring-[#3b3b3b]' : 'border-gray-200'}`}>
                      {/* 用紙の向きが分かるよう、縦横比そのままの箱で示す。
                          図面の中身までは出さない（描画に pdfjs が要り、
                          そこがこの環境で固まったため、まずは形と向きだけ）。 */}
                      <div onClick={() => toggleSelect(page.id)} className="cursor-pointer flex items-center justify-center bg-gray-100 h-24">
                        <div
                          className="bg-white border border-gray-400 flex items-center justify-center text-[9px] text-gray-500"
                          style={{
                            width: page.width > page.height ? 72 : 72 * (page.width / page.height),
                            height: page.width > page.height ? 72 * (page.height / page.width) : 72,
                            transform: `rotate(${page.rotation}deg)`,
                            transition: 'transform 150ms',
                          }}
                        >
                          {page.pageIndex + 1}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1 truncate" title={`${page.sourceName} p.${page.pageIndex + 1}`}>
                        {index + 1}. {page.sourceName} p.{page.pageIndex + 1}
                      </div>
                      <div className="text-[9px] text-gray-400">{paperLabel(page.width, page.height)}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex gap-0.5">
                          <button onClick={() => movePage(page.id, -1)} disabled={index === 0}
                            className="text-gray-400 hover:text-gray-800 disabled:opacity-30" title="前へ">
                            <FiChevronLeft className="w-3 h-3" />
                          </button>
                          <button onClick={() => movePage(page.id, 1)} disabled={index === pages.length - 1}
                            className="text-gray-400 hover:text-gray-800 disabled:opacity-30" title="後ろへ">
                            <FiChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        {page.rotation !== 0 && <span className="text-[9px] text-gray-500">{page.rotation}°</span>}
                        <button onClick={() => setPages((prev) => prev.filter((p) => p.id !== page.id))}
                          className="text-gray-400 hover:text-red-600" title="このページを外す">
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingPdf;
