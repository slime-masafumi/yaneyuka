'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import type { PDFDocumentProxy, PageViewport } from 'pdfjs-dist';
import { PAPERS_MM, PT_PER_MM, paperText, ptToMm } from './paper';

/**
 * 縮尺を保ったトリミング（図面PDF）。
 *
 * 大判図面の一部だけを A3 で渡したい、余白の大きい出力を詰めたい、というときに
 * 「範囲を囲んで切る」だけをする。拡大縮小は一切しないので、1/100 の図面は
 * 切った後も 1/100 のまま印刷できる（ここが画像編集ソフトで切るのとの違い）。
 *
 * 範囲は PDF の座標（pt）で持つ。書き出しでは MediaBox / CropBox をその範囲に
 * するだけで、中身の線は元のまま残る。
 */

export type CropRect = { x: number; y: number; width: number; height: number };
/** サムネイルに枠を重ねるための、表示上の割合（0〜1）。元のページの見た目に対する位置。 */
export type CropView = { l: number; t: number; w: number; h: number };
export type PageCrop = { rect: CropRect; view: CropView };

type VpRect = { x0: number; y0: number; x1: number; y1: number };

type Props = {
  getDoc: (sourceIndex: number) => Promise<PDFDocumentProxy>;
  sourceIndex: number;
  pageIndex: number;
  /** 見出しに出す「3. 平面図.pdf p.2」 */
  title: string;
  initial?: PageCrop;
  /** このページと同じ大きさのページの数（このページを除く） */
  sameSizeCount: number;
  /** 用紙サイズ変換が指定されているか（トリミングしたページには掛けないことを知らせる） */
  paperConvertOn: boolean;
  onApply: (crop: PageCrop | null, toSameSize: boolean) => void;
  onClose: () => void;
};

// 枠の選択肢。図面を「A3 に 1:1 で収まる範囲だけ切り出す」使い方を想定して、用紙の枠を固定で動かせる。
const FRAMES = PAPERS_MM.filter((p) => ['A4', 'A3', 'A2', 'A1', 'B4', 'B3'].includes(p.name)).flatMap((p) => [
  { id: `${p.name}-横`, label: `${p.name} 横`, wMm: p.h, hMm: p.w },
  { id: `${p.name}-縦`, label: `${p.name} 縦`, wMm: p.w, hMm: p.h },
]);

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const CropEditor: React.FC<Props> = ({
  getDoc,
  sourceIndex,
  pageIndex,
  title,
  initial,
  sameSizeCount,
  paperConvertOn,
  onApply,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // 描いたときの pdfjs の表示座標系。見たままの位置 ⇔ PDF の座標の変換に使う
  const [vpSize, setVpSize] = useState<{ vp: PageViewport; w: number; h: number; scale: number } | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<VpRect | null>(null);
  const [frame, setFrame] = useState('free');
  const [failed, setFailed] = useState(false);

  // ページを大きめに描く。長辺 1600px（細線が見分けられる程度）。
  useEffect(() => {
    // ページが替わるときは key で作り直すので、ここで状態を戻す必要はない
    let alive = true;
    (async () => {
      try {
        const doc = await getDoc(sourceIndex);
        const p = await doc.getPage(pageIndex + 1);
        const base = p.getViewport({ scale: 1 });
        const scale = Math.min(4, 1600 / Math.max(base.width, base.height));
        const vp = p.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || !alive) return;
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await p.render({ canvasContext: ctx, viewport: vp } as Parameters<typeof p.render>[0]).promise;
        if (!alive) return;
        setVpSize({ vp, w: vp.width, h: vp.height, scale });
        if (initial) {
          const { x, y, width, height } = initial.rect;
          const [ax, ay] = vp.convertToViewportPoint(x, y) as number[];
          const [bx, by] = vp.convertToViewportPoint(x + width, y + height) as number[];
          setRect({ x0: ax, y0: ay, x1: bx, y1: by });
        } else {
          setRect(null);
        }
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
    // initial はページを開いたときだけ読む（適用のたびに描き直さない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDoc, sourceIndex, pageIndex]);

  // 表示枠の大きさを追う（狭い画面・ウィンドウの伸縮）
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const k = vpSize && stage.w > 0 && stage.h > 0 ? Math.min(stage.w / vpSize.w, stage.h / vpSize.h) : 0;
  const dispW = vpSize ? vpSize.w * k : 0;
  const dispH = vpSize ? vpSize.h * k : 0;

  const frameDef = FRAMES.find((f) => f.id === frame) ?? null;
  const framePx = frameDef && vpSize
    ? { w: frameDef.wMm * PT_PER_MM * vpSize.scale, h: frameDef.hMm * PT_PER_MM * vpSize.scale }
    : null;

  // ページより大きい枠は選べない（切り出しではなく余白足しになる）
  const frameFits = (f: (typeof FRAMES)[number]) =>
    !vpSize || (f.wMm * PT_PER_MM * vpSize.scale <= vpSize.w + 1 && f.hMm * PT_PER_MM * vpSize.scale <= vpSize.h + 1);

  const placeFrame = (cx: number, cy: number, fp = framePx) => {
    if (!fp || !vpSize) return;
    const x = clamp(cx, fp.w / 2, vpSize.w - fp.w / 2);
    const y = clamp(cy, fp.h / 2, vpSize.h - fp.h / 2);
    setRect({ x0: x - fp.w / 2, y0: y - fp.h / 2, x1: x + fp.w / 2, y1: y + fp.h / 2 });
  };

  const changeFrame = (id: string) => {
    setFrame(id);
    const f = FRAMES.find((x) => x.id === id);
    if (!f || !vpSize) return;
    const fp = { w: f.wMm * PT_PER_MM * vpSize.scale, h: f.hMm * PT_PER_MM * vpSize.scale };
    // 今の範囲があればその中心に、無ければページの中央に置く
    const cx = rect ? (rect.x0 + rect.x1) / 2 : vpSize.w / 2;
    const cy = rect ? (rect.y0 + rect.y1) / 2 : vpSize.h / 2;
    placeFrame(cx, cy, fp);
  };

  const toVp = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: clamp((e.clientX - r.left) / k, 0, vpSize?.w ?? 0),
      y: clamp((e.clientY - r.top) / k, 0, vpSize?.h ?? 0),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!vpSize || k === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toVp(e);
    dragRef.current = p;
    if (framePx) placeFrame(p.x, p.y);
    else setRect({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    const p = toVp(e);
    if (framePx) placeFrame(p.x, p.y);
    else setRect({ x0: start.x, y0: start.y, x1: p.x, y1: p.y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
    // クリックだけ（ほぼ面積ゼロ）は取り消しとみなす
    if (!framePx && rect && (Math.abs(rect.x1 - rect.x0) * k < 6 || Math.abs(rect.y1 - rect.y0) * k < 6)) {
      setRect(null);
    }
  };

  /** 見たままの範囲 → PDF の座標。回転の付いたページも pdfjs の変換に任せる。 */
  const crop = useMemo<PageCrop | null>(() => {
    if (!rect || !vpSize) return null;
    const { vp } = vpSize;
    const [ax, ay] = vp.convertToPdfPoint(rect.x0, rect.y0) as number[];
    const [bx, by] = vp.convertToPdfPoint(rect.x1, rect.y1) as number[];
    let width = Math.abs(bx - ax);
    let height = Math.abs(by - ay);
    if (frameDef) {
      // 用紙の枠は誤差を残さず、ちょうどの寸法にする（A3 が 419.9mm にならないように）
      const fw = frameDef.wMm * PT_PER_MM;
      const fh = frameDef.hMm * PT_PER_MM;
      const same = Math.abs(width - fw) + Math.abs(height - fh) <= Math.abs(width - fh) + Math.abs(height - fw);
      [width, height] = same ? [fw, fh] : [fh, fw];
    }
    const round = (v: number) => Math.round(v * 100) / 100;
    return {
      rect: { x: round(Math.min(ax, bx)), y: round(Math.min(ay, by)), width: round(width), height: round(height) },
      view: {
        l: Math.min(rect.x0, rect.x1) / vpSize.w,
        t: Math.min(rect.y0, rect.y1) / vpSize.h,
        w: Math.abs(rect.x1 - rect.x0) / vpSize.w,
        h: Math.abs(rect.y1 - rect.y0) / vpSize.h,
      },
    };
  }, [rect, vpSize, frameDef]);

  // 見たままの向きの寸法（pt）
  const seenW = rect && vpSize ? Math.abs(rect.x1 - rect.x0) / vpSize.scale : 0;
  const seenH = rect && vpSize ? Math.abs(rect.y1 - rect.y0) / vpSize.scale : 0;

  const r = rect
    ? {
        x: Math.min(rect.x0, rect.x1) * k,
        y: Math.min(rect.y0, rect.y1) * k,
        w: Math.abs(rect.x1 - rect.x0) * k,
        h: Math.abs(rect.y1 - rect.y0) * k,
      }
    : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#3b3b3b] shrink-0">
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 shrink-0">Crop / 1:1</span>
          <span className="text-[11px] text-gray-700 truncate">{title}</span>
        </div>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900 shrink-0" title="閉じる">
          <FiX className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 shrink-0">
        <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
          枠
          <select value={frame} onChange={(e) => changeFrame(e.target.value)} className="p-1 text-[11px] bg-white">
            <option value="free">自由（ドラッグで囲む）</option>
            {FRAMES.map((f) => (
              <option key={f.id} value={f.id} disabled={!frameFits(f)}>
                {f.label}{frameFits(f) ? '' : '（ページより大きい）'}
              </option>
            ))}
          </select>
        </label>
        <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500">
          {rect
            ? `W ${ptToMm(seenW).toFixed(1)} × H ${ptToMm(seenH).toFixed(1)} mm`
            : frameDef ? 'クリックで枠を置く' : 'ドラッグで範囲を囲む'}
        </span>
        {rect && <span className="text-[11px] text-gray-700">{paperText(seenW, seenH)}</span>}
      </div>

      <div ref={stageRef} className="relative h-[55vh] lg:h-auto lg:flex-1 min-h-0 bg-[#f4f4f2] flex items-center justify-center overflow-hidden">
        {failed && <p className="text-[11px] text-gray-500">このページは表示できませんでした。</p>}
        <div className="relative" style={{ width: dispW, height: dispH, visibility: vpSize ? 'visible' : 'hidden' }}>
          <canvas ref={canvasRef} style={{ width: dispW, height: dispH, display: 'block' }} />
          <div
            className={`absolute inset-0 ${frameDef ? 'cursor-move' : 'cursor-crosshair'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {r && (
              <svg width={dispW} height={dispH} className="absolute inset-0 pointer-events-none">
                {/* 範囲の外を暗くして、残る部分だけを見せる */}
                <path
                  fillRule="evenodd"
                  fill="rgba(20,20,20,0.45)"
                  d={`M0 0H${dispW}V${dispH}H0Z M${r.x} ${r.y}V${r.y + r.h}H${r.x + r.w}V${r.y}Z`}
                />
                <rect x={r.x + 0.5} y={r.y + 0.5} width={Math.max(0, r.w - 1)} height={Math.max(0, r.h - 1)}
                  fill="none" stroke="#52aa96" strokeWidth={1} />
              </svg>
            )}
          </div>
        </div>
        {!vpSize && !failed && <p className="absolute text-[11px] text-gray-400">描画中…</p>}
      </div>

      <div className="pt-2 shrink-0 space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="yy-btn yy-btn--primary" disabled={!crop} onClick={() => crop && onApply(crop, false)}>
            このページに適用
          </button>
          {sameSizeCount > 0 && (
            <button type="button" className="yy-btn" disabled={!crop} onClick={() => crop && onApply(crop, true)}>
              同じ大きさの {sameSizeCount} ページにも適用
            </button>
          )}
          {initial && (
            <button type="button" className="yy-btn" onClick={() => onApply(null, false)}>
              トリミングを外す
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          拡大縮小はしません。1/100 の図面は切った後も 1/100 のまま印刷できます。範囲の外は見えなくなるだけで、データとしては残ります（社外に見せられない部分を消す用途には使わないでください）。
        </p>
        {paperConvertOn && (
          <p className="text-[10px] text-gray-500">トリミングしたページには用紙サイズ変換を掛けません（縮尺を保つため）。</p>
        )}
      </div>
    </div>
  );
};

export default CropEditor;
