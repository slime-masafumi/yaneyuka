'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiFile, FiDownload, FiTrash2, FiRotateCw, FiChevronLeft, FiChevronRight, FiCrop } from 'react-icons/fi';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfjs } from '@/lib/pdfjs';
import ToolHeader from '../ToolHeader';
import CropEditor, { type PageCrop } from './pdf/CropEditor';
import { A_SERIES_PT, nearestPaper, ptToMm } from './pdf/paper';
import { convertedScale, fitScale, paperRatio, parseScaleDenom, type ConvertedScale } from './pdf/scale';

/**
 * 図面PDFの整備。
 *
 * 提出のたびに Acrobat を開いてやっていたこと――要るページだけ抜く、
 * 順番を直す、複数のPDFを1本にまとめる、向きを揃える、用紙を変える、
 * 透かしと図番を入れる、要る範囲だけ切り出す――をブラウザの中だけで済ませる。
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
const PAPER_SIZES = A_SERIES_PT;

type PageItem = {
  id: string;
  /** 読み込んだ PDF の通し番号（どのファイル由来か） */
  sourceIndex: number;
  sourceName: string;
  /** 元 PDF の中でのページ番号（0始まり） */
  pageIndex: number;
  /** この編集で足した回転（度）。元の回転に足し込む。 */
  rotation: number;
  /** 元の PDF に最初から付いている回転（度）。向きの表示に使う */
  baseRotation: number;
  width: number;
  height: number;
  /** MediaBox の原点。同じ大きさのページへトリミングを写すときのずれ補正 */
  originX: number;
  originY: number;
  selected: boolean;
  /** 縮尺を保ったトリミング（無ければ元の大きさのまま） */
  crop?: PageCrop;
};

type Thumb = { url: string; w: number; h: number };

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
  options: { fontSize: number; color: string; bold?: boolean; background?: string },
): { dataUrl: string; width: number; height: number } | null {
  if (!text.trim()) return null;
  const scale = 3; // PDF に置いたとき粗く見えないよう、大きめに描いて縮める
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  const font = `${options.bold ? 'bold ' : ''}${options.fontSize * scale}px sans-serif`;
  probe.font = font;
  const metrics = probe.measureText(text);
  // 地を敷くときは枠と文字の間を空ける
  const padX = options.background ? Math.round(options.fontSize * scale * 0.5) : 4;
  const width = Math.ceil(metrics.width) + padX * 2;
  const height = Math.ceil(options.fontSize * scale * (options.background ? 1.7 : 1.4));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (options.background) {
    // 図面の線の上に載せても読めるよう、地を敷いて細い枠で囲む
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = scale;
    ctx.strokeRect(scale / 2, scale / 2, width - scale, height - scale);
  }
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.color;
  ctx.fillText(text, padX, height / 2);

  return { dataUrl: canvas.toDataURL('image/png'), width: width / scale, height: height / scale };
}

/**
 * 見えている向きの座標（左下原点 u, v）を、ページの座標（回転前）に直す。
 * /Rotate はページを時計回りに回して見せるので、その逆をたどる。
 * 回転したページ（A3 横の図面に多い）に図番を入れると、以前は回転前の右下＝見た目では
 * 別の角に、横倒しで入っていた。
 */
const viewToPage = (u: number, v: number, rot: number, w: number, h: number, ox: number, oy: number): [number, number] => {
  switch (rot) {
    case 90: return [ox + w - v, oy + u];
    case 180: return [ox + w - u, oy + h - v];
    case 270: return [ox + v, oy + h - u];
    default: return [ox + u, oy + v];
  }
};

/** 見たままの向きの幅・高さ（pt）。トリミングと回転を反映する。 */
const seenSize = (page: PageItem) => {
  const w = page.crop ? page.crop.rect.width : page.width;
  const h = page.crop ? page.crop.rect.height : page.height;
  return (page.baseRotation + page.rotation) % 180 === 0 ? [w, h] : [h, w];
};

/** 用紙の呼び名。図面は A3・A1 が多いので、寸法より名前で見たい。 */
const paperLabel = (page: PageItem) => {
  const [w, h] = seenSize(page);
  const n = nearestPaper(w, h);
  return n.exact ? `${n.name} ${n.orientation}` : `${Math.round(ptToMm(w))}×${Math.round(ptToMm(h))}mm`;
};

/**
 * ページのサムネイル。pdfjs で小さく描いて画像にする。
 *
 * 以前「pdfjs で固まる」としてサムネイルを外したが、原因は検証に使ったブラウザの
 * 画面が隠れていて requestAnimationFrame が止まっていたことだった（pdfjs は表示用の
 * 描画を rAF で進める）。実際に使う画面では止まらない。
 * 何十ページも一度に描くと重いので、1枚ずつ順番に描く（renderQueue）。
 * 描けなかったときは、これまでどおり縦横比の箱と番号を出す。
 */
let renderQueue: Promise<unknown> = Promise.resolve();

function PageThumb({
  page,
  getDoc,
  cache,
}: {
  page: PageItem;
  getDoc: (sourceIndex: number) => Promise<PDFDocumentProxy>;
  cache: Map<string, Thumb>;
}) {
  const key = `${page.sourceIndex}-${page.pageIndex}`;
  const [thumb, setThumb] = useState<Thumb | null>(cache.get(key) ?? null);

  useEffect(() => {
    if (cache.has(key)) return;
    let alive = true;
    const job = renderQueue.then(async () => {
      if (!alive) return;
      try {
        const doc = await getDoc(page.sourceIndex);
        const p = await doc.getPage(page.pageIndex + 1);
        const base = p.getViewport({ scale: 1 });
        const vp = p.getViewport({ scale: 200 / Math.max(base.width, base.height) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vp.width);
        canvas.height = Math.ceil(vp.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await p.render({ canvasContext: ctx, viewport: vp } as Parameters<typeof p.render>[0]).promise;
        const t = { url: canvas.toDataURL('image/jpeg', 0.8), w: canvas.width, h: canvas.height };
        cache.set(key, t);
        if (alive) setThumb(t);
      } catch {
        /* 描けなければ箱のまま */
      }
    });
    renderQueue = job.catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key, cache, getDoc, page.sourceIndex, page.pageIndex]);

  // 縦横比は描けた画像から取る。元から回転の付いたページ（/Rotate 90）で
  // MediaBox の縦横と見た目が逆になり、潰れて見えていたため。
  const baseW = thumb ? thumb.w : page.baseRotation % 180 === 0 ? page.width : page.height;
  const baseH = thumb ? thumb.h : page.baseRotation % 180 === 0 ? page.height : page.width;
  const landscape = baseW > baseH;
  const w = landscape ? 88 : 88 * (baseW / baseH);
  const h = landscape ? 88 * (baseH / baseW) : 88;
  const v = page.crop?.view;
  return (
    <div
      className="relative border border-gray-400 bg-white"
      style={{ width: w, height: h, transform: `rotate(${page.rotation}deg)`, transition: 'transform 150ms' }}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt={`p.${page.pageIndex + 1}`} className="block w-full h-full" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-500">{page.pageIndex + 1}</div>
      )}
      {v && (
        // 切り出す範囲。外側を薄く沈めて、残る部分を見せる
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1 1" preserveAspectRatio="none">
          <path
            fillRule="evenodd"
            fill="rgba(20,20,20,0.35)"
            d={`M0 0H1V1H0Z M${v.l} ${v.t}V${v.t + v.h}H${v.l + v.w}V${v.t}Z`}
          />
          <rect x={v.l} y={v.t} width={v.w} height={v.h} fill="none" stroke="#52aa96" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

const DrawingPdf: React.FC = () => {
  const [pages, setPages] = useState<PageItem[]>([]);
  // 読み込んだ PDF の中身。ページを書き出すときに元を参照する。
  const sourcesRef = useRef<ArrayBuffer[]>([]);
  // サムネイル用に pdfjs で開いた PDF と、描いた画像
  const docsRef = useRef(new Map<number, Promise<PDFDocumentProxy>>());
  const thumbsRef = useRef(new Map<string, Thumb>());
  const getDoc = useRef((sourceIndex: number) => {
    let p = docsRef.current.get(sourceIndex);
    if (!p) {
      // pdfjs は受け取った ArrayBuffer をワーカーへ渡して手放すので、写しを渡す
      p = loadPdfjs().then((lib) => lib.getDocument({ data: new Uint8Array(sourcesRef.current[sourceIndex].slice(0)) }).promise);
      docsRef.current.set(sourceIndex, p);
    }
    return p;
  }).current;

  const [paperSize, setPaperSize] = useState('keep');
  const [watermark, setWatermark] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(15);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [numberStart, setNumberStart] = useState(1);
  const [addNumbers, setAddNumbers] = useState(false);
  const [splitPerPage, setSplitPerPage] = useState(false);
  // 用紙を変えるときの縮尺。元の縮尺を聞いて、変換後の縮尺を各図面に入れる
  const [origScale, setOrigScale] = useState('');
  /** 元の用紙。auto はページの大きさから判定し、実際に掛けた倍率で計算する */
  const [origPaper, setOrigPaper] = useState('auto');
  const [scalePos, setScalePos] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');

  const origDenom = parseScaleDenom(origScale);
  /** このページを用紙サイズ変換したときの縮尺(変換しないページ・縮尺未入力は null) */
  const scaleFor = (item: PageItem): ConvertedScale | null => {
    if (paperSize === 'keep' || item.crop || !origDenom) return null;
    const [tw, th] = PAPER_SIZES[paperSize];
    if (origPaper === 'auto') {
      const { scale } = fitScale(item.width, item.height, tw, th);
      return convertedScale(nearestPaper(item.width, item.height).name, origDenom, paperSize, scale);
    }
    // 元の用紙を指定したときは用紙どうしの比で決める(A1 の図面を A3 に縮めて PDF にしたものでも正しく出る)
    const r = paperRatio(origPaper, paperSize);
    return r ? convertedScale(origPaper, origDenom, paperSize, r) : null;
  };
  const scalePreview = (() => {
    const first = pages.find((p) => !p.crop);
    if (paperSize === 'keep' || !origDenom) return null;
    if (first) return scaleFor(first);
    return null;
  })();

  const [busy, setBusy] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState('');
  /** トリミング中のページ（無ければページ一覧を出す） */
  const [cropId, setCropId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 見出し帯の「できること」から飛ぶ先
  const listRef = useRef<HTMLDivElement>(null);
  const opsRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const addFiles = async (files: FileList | File[]) => {
    const all = Array.from(files);
    const list = all.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    const skipped = all.length - list.length;
    if (list.length === 0) {
      if (skipped > 0) setNotice('PDFではないファイルは読み込めません。PDFを選んでください。');
      return;
    }

    setBusy('読み込み中…');
    setNotice('');
    const failed: string[] = [];
    try {
      const { PDFDocument } = await import('pdf-lib');
      const added: PageItem[] = [];

      // 1 本読めなくても、残りは読み込む（以前は 1 本の失敗で全部止まっていた）
      for (const file of list) {
        // pdf-lib は壊れたファイルでも load は通り、ページを数える段で落ちることがあるので、ページの読み取りまで 1 つの try に入れる
        try {
          const buffer = await file.arrayBuffer();
          const doc = await PDFDocument.load(buffer.slice(0));
          const sourceIndex = sourcesRef.current.length;
          const items: PageItem[] = doc.getPages().map((page, i) => {
            const { x, y, width, height } = page.getMediaBox();
            return {
              id: generateId(),
              sourceIndex,
              sourceName: file.name,
              pageIndex: i,
              rotation: 0,
              baseRotation: ((page.getRotation().angle % 360) + 360) % 360,
              width,
              height,
              originX: x,
              originY: y,
              selected: false,
            };
          });
          if (items.length === 0) throw new Error('ページがありません');
          sourcesRef.current.push(buffer);
          added.push(...items);
        } catch (error) {
          console.error('PDFの読み込みに失敗しました', file.name, error);
          const msg = error instanceof Error ? error.message : '';
          failed.push(`${file.name}（${/encrypt|password/i.test(msg) ? 'パスワード付き' : 'PDFとして読めない'}）`);
        }
      }

      setPages((prev) => [...prev, ...added]);
    } catch (error) {
      console.error('PDFの読み込みに失敗しました', error);
      setNotice('PDFを読む部品を準備できませんでした。ページを再読み込みしてやり直してください。');
      setBusy('');
      return;
    } finally {
      setBusy('');
    }
    const notes: string[] = [];
    if (failed.length) notes.push(`読み込めなかったPDF: ${failed.join('、')}。パスワード付きのPDFはパスワードを外してから入れてください。`);
    if (skipped > 0) notes.push(`PDFではない ${skipped} 件は外しました。`);
    setNotice(notes.join(' '));
  };

  const toggleSelect = (id: string) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));

  const selectAll = (value: boolean) =>
    setPages((prev) => prev.map((p) => ({ ...p, selected: value })));

  const selectedCount = pages.filter((p) => p.selected).length;
  const croppedCount = pages.filter((p) => p.crop).length;

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
    setCropId(null);
    sourcesRef.current = [];
    docsRef.current.forEach((p) => p.then((d) => d.destroy()).catch(() => undefined));
    docsRef.current.clear();
    thumbsRef.current.clear();
  };

  // --- 縮尺を保ったトリミング ---------------------------------------------

  const cropPage = pages.find((p) => p.id === cropId) ?? null;

  /** 同じ大きさ・同じ向きのページ（選択があれば選択の中だけ）。図面セットは全ページ同じ枠なので一度で済ませたい。 */
  const sameSizeAs = (base: PageItem) =>
    pages.filter(
      (p) =>
        p.id !== base.id &&
        (selectedCount === 0 || p.selected) &&
        Math.abs(p.width - base.width) < 1 &&
        Math.abs(p.height - base.height) < 1 &&
        p.baseRotation === base.baseRotation,
    );

  const applyCrop = (crop: PageCrop | null, toSameSize: boolean) => {
    if (!cropPage) return;
    const others = toSameSize ? new Set(sameSizeAs(cropPage).map((p) => p.id)) : new Set<string>();
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === cropPage.id) return { ...p, crop: crop ?? undefined };
        if (!crop || !others.has(p.id)) return p;
        // 原点がずれている PDF もあるので、MediaBox の原点からの位置で写す
        const rect = {
          ...crop.rect,
          x: crop.rect.x - cropPage.originX + p.originX,
          y: crop.rect.y - cropPage.originY + p.originY,
        };
        return { ...p, crop: { rect, view: crop.view } };
      }),
    );
    setCropId(null);
  };

  const openCrop = () => {
    if (pages.length === 0) {
      setNotice('PDFを読み込むと、各ページの切り抜きアイコンから範囲を囲んで切り出せます。');
      return;
    }
    setNotice('');
    setCropId((pages.find((p) => p.selected) ?? pages[0]).id);
  };

  /**
   * 並べた順どおりに組み立てる。分割が指定されていればページごとに分ける。
   * onlySelected のときは選んだページだけ（抜き出し）。
   */
  const exportPdf = async (onlySelected = false) => {
    const targets = onlySelected ? pages.filter((p) => p.selected) : pages;
    if (targets.length === 0) return;
    setBusy('書き出し中…');
    setNotice('');

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

          if (item.crop) {
            // 縮尺を保ったトリミング: 箱を範囲に合わせるだけで中身には触れない（拡大縮小なし）。
            // 印刷や面付けで TrimBox / BleedBox を見るソフトもあるので、全部の箱を揃える。
            const { x, y, width: cw, height: ch } = item.crop.rect;
            page.setMediaBox(x, y, cw, ch);
            page.setCropBox(x, y, cw, ch);
            page.setBleedBox(x, y, cw, ch);
            page.setTrimBox(x, y, cw, ch);
            page.setArtBox(x, y, cw, ch);
          }

          if (item.rotation) {
            page.setRotation(degrees((page.getRotation().angle + item.rotation) % 360));
          }

          // トリミングしたページは縮尺を保つのが目的なので、用紙サイズ変換（拡縮）を掛けない
          if (paperSize !== 'keep' && !item.crop) {
            const [targetW, targetH] = PAPER_SIZES[paperSize];
            const { width, height } = page.getSize();
            // 横長のページには用紙も横で当てる。内容は比率を保ったまま
            // (図面は縦横比が崩れると寸法が読めなくなる)
            const { scale, fitW, fitH } = fitScale(width, height, targetW, targetH);
            page.scaleContent(scale, scale);
            page.setSize(fitW, fitH);
            // 縮めた内容を中央へ寄せる
            page.translateContent((fitW - width * scale) / 2, (fitH - height * scale) / 2);
          }

          // 注記は「見えている範囲」の原点から置く。トリミングすると原点が 0,0 でなくなるため。
          const { x: ox, y: oy, width, height } = page.getCropBox();
          // 見えている向きで置く（回転したページでも、見た目の右下・中央に正立で入る）
          const rot = ((page.getRotation().angle % 360) + 360) % 360;
          const viewW = rot % 180 === 0 ? width : height;
          const viewH = rot % 180 === 0 ? height : width;
          const place = (u: number, v: number, angle: number) => {
            const [x, y] = viewToPage(u, v, rot, width, height, ox, oy);
            return { x, y, rotate: degrees(rot + angle) };
          };

          if (watermark.trim()) {
            const png = textToPng(watermark.trim(), {
              fontSize: Math.max(24, Math.min(width, height) / 8),
              color: '#ff0000',
              bold: true,
            });
            if (png) {
              const image = await out.embedPng(png.dataUrl);
              // 斜めに1つ、中央に置く。並べて敷き詰めると図面が読めなくなる。
              // 回転は左下の角を軸に掛かるので、中心が真ん中に来るよう角の位置を戻す
              const a = (30 * Math.PI) / 180;
              const u0 = viewW / 2 - ((png.width / 2) * Math.cos(a) - (png.height / 2) * Math.sin(a));
              const v0 = viewH / 2 - ((png.width / 2) * Math.sin(a) + (png.height / 2) * Math.cos(a));
              page.drawImage(image, {
                ...place(u0, v0, 30),
                width: png.width,
                height: png.height,
                opacity: watermarkOpacity / 100,
              });
            }
          }

          let numberTop = 0;
          if (addNumbers) {
            const label = `${numberPrefix}${numberStart + i}`;
            const png = textToPng(label, { fontSize: 12, color: '#000000', bold: true });
            if (png) {
              const image = await out.embedPng(png.dataUrl);
              // 右下。図面枠の外に出ないよう少し内側に入れる
              page.drawImage(image, {
                ...place(viewW - png.width - 24, 18, 0),
                width: png.width,
                height: png.height,
              });
              numberTop = 18 + png.height;
            }
          }

          // 変換後の縮尺。縮めた図面に元の「1/100」が残ったままだと、そのまま測られる
          const sc = scaleFor(item);
          if (sc) {
            const png = textToPng(sc.label, { fontSize: 10, color: '#000000', bold: true, background: '#ffffff' });
            if (png) {
              const image = await out.embedPng(png.dataUrl);
              const right = scalePos.endsWith('right');
              const top = scalePos.startsWith('top');
              const u = right ? viewW - png.width - 24 : 24;
              // 右下に図面番号があるときはその上に積む
              const v = top ? viewH - png.height - 18 : right && numberTop ? numberTop + 4 : 18;
              page.drawImage(image, { ...place(u, v, 0), width: png.width, height: png.height });
            }
          }

          out.addPage(page);
        }

        return out.save();
      };

      const download = (data: Blob, name: string) => {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // すぐ解放すると保存が始まらないブラウザがあるので、少し待ってから
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      };
      const asPdf = (bytes: Uint8Array) => new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

      const stamp = new Date().toLocaleDateString('sv-SE').replace(/-/g, ''); // 日本時間の日付（toISOString は UTC で朝 9 時まで前日になる）

      if (splitPerPage && targets.length > 1) {
        // 何十本も続けて保存させるとブラウザが「複数のダウンロード」を止めるので、ZIP 1 つにまとめる
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (let i = 0; i < targets.length; i++) {
          setBusy(`書き出し中… ${i + 1}/${targets.length}`);
          zip.file(`図面_${String(i + 1).padStart(3, '0')}_${stamp}.pdf`, await buildDoc([targets[i]]));
        }
        download(await zip.generateAsync({ type: 'blob' }), `図面_分割_${stamp}.zip`);
        setNotice(`${targets.length} ファイルに分けて ZIP で保存しました。`);
      } else {
        const bytes = await buildDoc(targets);
        download(asPdf(bytes), `図面_${stamp}.pdf`);
        setNotice(`${targets.length} ページの PDF を保存しました。`);
      }
    } catch (error) {
      console.error('PDFの書き出しに失敗しました', error);
      const msg = error instanceof Error ? error.message : '';
      setNotice(
        /memory|allocation/i.test(msg)
          ? '書き出しに失敗しました。ページが多くメモリが足りません。分けて書き出してください。'
          : '書き出しに失敗しました。もう一度押すか、ページを再読み込みしてやり直してください。'
      );
    } finally {
      setBusy('');
    }
  };

  const smallBtn = 'text-[10px] bg-white border border-[#3b3b3b] px-2 py-1 hover:bg-gray-100';
  const monoLabel = 'yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500';

  return (
    <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      <ToolHeader
        no="20"
        code="DRAWING / PDF"
        title="図面PDF"
        description="提出前の図面PDFを、Acrobat を開かずに整える。線は元のまま（再圧縮しない）"
        aside={pages.length > 0 ? <span className="yy-mono text-[10px] tracking-[0.12em] uppercase">{pages.length} Pages</span> : undefined}
        features={[
          { label: '抜き出し・並べ替え', onClick: () => { setCropId(null); scrollTo(listRef); }, active: pages.length > 0 && !cropId },
          { label: '結合・ページごとに分割', onClick: () => scrollTo(exportRef) },
          { label: '一括回転', onClick: () => scrollTo(opsRef) },
          { label: '縮尺を保ったトリミング', onClick: openCrop, active: !!cropId, hint: '範囲を囲んで切り出す。拡大縮小しないので縮尺はそのまま' },
          { label: '用紙サイズ変換', onClick: () => scrollTo(paperRef), hint: '元の縮尺を入れると、変換後の縮尺（A3 1/200 など）を各図面に入れる' },
          { label: '透かし・図面番号', onClick: () => scrollTo(paperRef) },
        ]}
      />

      <div className="p-3 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 h-full">

          {/* 左：取り込みと設定 */}
          <div className="space-y-3 min-h-0 overflow-y-auto pr-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed p-5 text-center cursor-pointer transition ${
                isDragging ? 'border-[#141414] bg-[#f4f4f2]' : 'border-gray-400 hover:border-[#141414]'
              }`}
            >
              <FiFile className="w-3.5 h-3.5 mx-auto text-gray-400" />
              <p className="text-[11px] mt-2 text-gray-600">PDFをドラッグ＆ドロップ</p>
              <p className="text-[10px] mt-1 text-gray-400">
                複数まとめて読み込めます。処理はこのブラウザの中だけで行い、PDFはどこにも送りません
              </p>
              <button type="button" className="mt-2 text-[11px] text-gray-700 underline underline-offset-2">
                {busy === '読み込み中…' ? '読み込み中…' : pages.length > 0 ? 'PDFを追加' : 'ファイルを選択'}
              </button>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
            {notice && <p className="text-[11px] text-gray-600 border-l border-[#52aa96] pl-2">{notice}</p>}

            <div ref={opsRef} className="yy-panel scroll-mt-2">
              <div className="yy-panel__head">ページ操作</div>
              <div className="p-3 space-y-2">
                <p className="text-[10px] text-gray-500">
                  {selectedCount > 0 ? `${selectedCount}ページを選択中` : '未選択＝全ページが対象'}
                </p>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => rotateTargets(90)} className={`${smallBtn} flex items-center gap-1`}>
                    <FiRotateCw className="w-3 h-3" /> 右90°
                  </button>
                  <button onClick={() => rotateTargets(-90)} className={smallBtn}>左90°</button>
                  <button onClick={() => rotateTargets(180)} className={smallBtn}>180°</button>
                  <button onClick={() => selectAll(true)} className={smallBtn}>全選択</button>
                  <button onClick={() => selectAll(false)} className={smallBtn}>選択解除</button>
                  <button onClick={removeSelected} disabled={selectedCount === 0}
                    className="text-[10px] bg-red-600 text-white px-2 py-1 disabled:opacity-40">選択を削除</button>
                </div>
                <button onClick={openCrop} className={`${smallBtn} flex items-center gap-1`}>
                  <FiCrop className="w-3 h-3" /> 縮尺を保ってトリミング
                  {croppedCount > 0 && <span className="yy-mono text-gray-500 ml-1">{croppedCount}</span>}
                </button>
              </div>
            </div>

            <div ref={paperRef} className="yy-panel scroll-mt-2">
              <div className="yy-panel__head">用紙・注記</div>
              <div className="p-3 space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">用紙サイズ</label>
                  <select value={paperSize} onChange={(e) => setPaperSize(e.target.value)}
                    className="w-full p-1.5 text-[11px] bg-white">
                    <option value="keep">元のまま</option>
                    {Object.keys(PAPER_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">縦横比は保ったまま中央に配置します（図面の比率を崩さないため）。縮尺は変わります。</p>
                  {paperSize !== 'keep' && croppedCount > 0 && (
                    <p className="text-[10px] text-gray-500 mt-0.5">トリミングした {croppedCount} ページは対象外（縮尺を保つため）。</p>
                  )}
                </div>

                {paperSize !== 'keep' && (
                  <div className="border-l border-[#3b3b3b] pl-2 space-y-1.5">
                    <label className="block text-[10px] text-gray-500">元の縮尺（変換後の縮尺を各図面に入れる）</label>
                    <div className="flex gap-2">
                      <select value={origPaper} onChange={(e) => setOrigPaper(e.target.value)}
                        className="w-28 p-1.5 text-[11px] bg-white" aria-label="元の用紙">
                        <option value="auto">用紙はページから</option>
                        {['A0', 'A1', 'A2', 'A3', 'A4'].map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <input type="text" inputMode="numeric" value={origScale} onChange={(e) => setOrigScale(e.target.value)}
                        placeholder="1/100" aria-label="元の縮尺"
                        className="flex-1 min-w-0 p-1.5 text-[11px]" />
                    </div>
                    {origScale.trim() && !origDenom && (
                      <p className="text-[10px] text-red-700">縮尺は「1/100」「1:100」「100」の形で入れてください。</p>
                    )}
                    {scalePreview && (
                      <p className="text-[10px] text-gray-700 leading-relaxed">
                        {scalePreview.note}
                      </p>
                    )}
                    {origDenom && pages.length === 0 && (
                      <p className="text-[10px] text-gray-500">PDF を読み込むと、変換後の縮尺をここに出します。</p>
                    )}
                    {origDenom && (
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-gray-500 shrink-0">入れる位置</label>
                        <select value={scalePos} onChange={(e) => setScalePos(e.target.value as typeof scalePos)}
                          className="flex-1 p-1 text-[11px] bg-white">
                          <option value="bottom-right">右下（表題欄の上）</option>
                          <option value="bottom-left">左下</option>
                          <option value="top-right">右上</option>
                          <option value="top-left">左上</option>
                        </select>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      A1→A3・A2→A4 は 1/2 でそのまま言えます。A2→A3・A1→A2 などは 1/√2（約 0.71 倍）で半端になるので、数字の縮尺は書かず「A3 縮小（A2 1/100）」と入れます。図面の中の「1/100」の文字はそのまま残ります（スケールバーは一緒に縮むので正しいまま）。
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">透かし</label>
                  <input type="text" value={watermark} onChange={(e) => setWatermark(e.target.value)}
                    placeholder="DRAFT / 社外秘 / 物件名"
                    className="w-full p-1.5 text-[11px]" />
                  {watermark.trim() && (
                    <div className="mt-1">
                      <label className="block text-[10px] text-gray-500">濃さ <span className="yy-mono">{watermarkOpacity}%</span></label>
                      <input type="range" min={5} max={60} value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(Number(e.target.value))} className="w-full accent-[#3b3b3b]" />
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
                        placeholder="A-" className="flex-1 min-w-0 p-1.5 text-[11px]" />
                      <input type="number" min={1} value={numberStart}
                        onChange={(e) => setNumberStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-20 p-1.5 text-[11px] text-right" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={exportRef} className="yy-panel scroll-mt-2">
              <div className="yy-panel__head">書き出し</div>
              <div className="p-3 space-y-2">
                <label className="flex items-center gap-1.5 text-[10px] text-gray-600">
                  <input type="checkbox" checked={splitPerPage} onChange={(e) => setSplitPerPage(e.target.checked)} />
                  ページごとに別ファイルで保存する（分割）
                </label>
                <button onClick={() => exportPdf(false)} disabled={pages.length === 0 || !!busy}
                  className="yy-btn yy-btn--primary w-full flex items-center justify-center gap-1">
                  <FiDownload className="w-3.5 h-3.5" /> {busy || (splitPerPage ? `${pages.length} ファイルに分けて書き出す（ZIP）` : 'PDFを書き出す（結合）')}
                </button>
                {selectedCount > 0 && (
                  <button onClick={() => exportPdf(true)} disabled={!!busy}
                    className="yy-btn w-full flex items-center justify-center gap-1">
                    <FiDownload className="w-3.5 h-3.5" /> 選んだ {selectedCount} ページだけ書き出す（抜き出し）
                  </button>
                )}
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  中身の再圧縮はしません（図面の細線が飛ぶため）。
                </p>
                <details className="text-[10px] text-gray-500">
                  <summary className="cursor-pointer select-none underline underline-offset-2 decoration-gray-300 w-fit">パスワードは？</summary>
                  <p className="mt-1 leading-relaxed">付けられません。使っている部品（pdf-lib）が暗号化に対応しておらず、掛かったように見えて掛かっていない状態を避けるためです。書き出した後に Acrobat などで付けてください。</p>
                </details>
              </div>
            </div>
          </div>

          {/* 右：ページ一覧（トリミング中はその画面） */}
          <div ref={listRef} className="border border-[#3b3b3b] bg-white p-3 flex flex-col h-full min-h-0 scroll-mt-2">
            {cropPage ? (
              <CropEditor
                key={cropPage.id}
                getDoc={getDoc}
                sourceIndex={cropPage.sourceIndex}
                pageIndex={cropPage.pageIndex}
                title={`${pages.indexOf(cropPage) + 1}. ${cropPage.sourceName} p.${cropPage.pageIndex + 1}`}
                initial={cropPage.crop}
                sameSizeCount={sameSizeAs(cropPage).length}
                paperConvertOn={paperSize !== 'keep'}
                onApply={applyCrop}
                onClose={() => setCropId(null)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200 shrink-0">
                  <span className="text-[11px] font-bold text-gray-700">
                    ページ
                    {pages.length > 0 && <span className={`${monoLabel} font-normal ml-2`}>{String(pages.length).padStart(3, '0')}</span>}
                  </span>
                  {pages.length > 0 && (
                    <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-red-600 underline underline-offset-2">すべて外す</button>
                  )}
                </div>

                {pages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-10 text-[11px] text-gray-400">
                    <span>
                      PDFを追加するとページがここに並びます —{' '}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="underline underline-offset-2 text-gray-600">
                        PDFを選ぶ
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                      {pages.map((page, index) => (
                        <div key={page.id}
                          className={`bg-white border p-1.5 ${page.selected ? 'border-[#141414] ring-1 ring-[#141414]' : 'border-gray-200'}`}>
                          <div onClick={() => toggleSelect(page.id)} className="cursor-pointer flex items-center justify-center bg-[#f4f4f2] h-28">
                            <PageThumb page={page} getDoc={getDoc} cache={thumbsRef.current} />
                          </div>
                          <div className="text-[9px] text-gray-500 mt-1 truncate" title={`${page.sourceName} p.${page.pageIndex + 1}`}>
                            <span className="yy-mono">{String(index + 1).padStart(3, '0')}</span> {page.sourceName} p.{page.pageIndex + 1}
                          </div>
                          <div className="text-[9px] text-gray-400 flex items-center gap-1">
                            {page.crop && <span className="yy-mono tracking-[0.12em] text-[#3b3b3b]">CROP</span>}
                            <span className="truncate">{paperLabel(page)}</span>
                          </div>
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
                            {page.rotation !== 0 && <span className="yy-mono text-[9px] text-gray-500">{page.rotation}°</span>}
                            <div className="flex gap-1">
                              <button onClick={() => { setNotice(''); setCropId(page.id); }}
                                className={page.crop ? 'text-[#3b3b3b]' : 'text-gray-400 hover:text-gray-800'} title="縮尺を保ってトリミング">
                                <FiCrop className="w-3 h-3" />
                              </button>
                              <button onClick={() => setPages((prev) => prev.filter((p) => p.id !== page.id))}
                                className="text-gray-400 hover:text-red-600" title="このページを外す">
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingPdf;
