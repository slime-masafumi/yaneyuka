/**
 * 構造フロービューアの作図。画面の canvas と出力用のシートで同じ関数を使う。
 * 座標は CSS px。出力時は呼び出し側が ctx.scale してから渡す。
 */
import { levelOf, traceStressLines, type FlowModel, type FlowResult, type FlowZone, type StressLine } from '@/lib/forceFlow';

export type FlowField = 'principal' | 'ratio' | 'sx' | 'sy' | 'txy';

export type FlowView = {
  field: FlowField;
  fill: boolean;
  lines: boolean;
  vectors: boolean;
  deformed: boolean;
};

export const FIELD_LABELS: Record<FlowField, string> = {
  principal: '主応力（引張＋／圧縮−）',
  ratio: '強度に対する目安（3 段階）',
  sx: 'σx（水平方向）',
  sy: 'σy（鉛直方向）',
  txy: 'τxy（せん断）',
};

export const PAPER = '#faf9f6';
const INK = '#2b2b2b';
const MUTED = '#77736b';
const TENSION: [number, number, number] = [214, 45, 32];
const COMPRESSION: [number, number, number] = [29, 88, 196];
const NEUTRAL: [number, number, number] = [240, 237, 230];
const TENSION_LINE = 'rgb(176,30,20)';
const COMPRESSION_LINE = 'rgb(18,62,150)';
export const LEVEL_COLORS: [number, number, number][] = [
  [231, 228, 220],
  [242, 180, 60],
  [214, 60, 30],
];

const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace';

const PAD = { l: 62, r: 40, t: 46, b: 50 };

export type Layout = { ppm: number; ox: number; oy: number; w: number; h: number };

export function computeLayout(model: Pick<FlowModel, 'width' | 'height'>, width: number, maxHeight: number): Layout {
  const availW = Math.max(40, width - PAD.l - PAD.r);
  const availH = Math.max(40, maxHeight - PAD.t - PAD.b);
  const ppm = Math.min(availW / model.width, availH / model.height);
  const drawH = model.height * ppm;
  return { ppm, ox: PAD.l + (availW - model.width * ppm) / 2, oy: PAD.t + drawH, w: width, h: drawH + PAD.t + PAD.b };
}

export const toModel = (l: Layout, px: number, py: number) => ({ x: (px - l.ox) / l.ppm, y: (l.oy - py) / l.ppm });

/** 節点ごとの表示値 */
function valueAt(r: FlowResult, field: FlowField, id: number): number {
  switch (field) {
    case 'principal':
      return Math.abs(r.s1[id]) >= Math.abs(r.s2[id]) ? r.s1[id] : r.s2[id];
    case 'ratio':
      return r.ratio[id];
    case 'sx':
      return r.sx[id];
    case 'sy':
      return r.sy[id];
    default:
      return r.txy[id];
  }
}

/** 色の尺度。集中部を除いた絶対値の 99% 点（端の特異点に色を引きずられないように）。 */
export function fieldScale(r: FlowResult, field: FlowField): number {
  if (field === 'ratio') return 1;
  const a: number[] = [];
  for (let id = 0; id < r.nodeActive.length; id++) {
    if (!r.nodeActive[id] || r.flag[id]) continue;
    const v = Math.abs(valueAt(r, field, id));
    if (Number.isFinite(v)) a.push(v);
  }
  if (!a.length) return 1;
  a.sort((p, q) => p - q);
  return a[Math.min(a.length - 1, Math.floor(a.length * 0.99))] || 1;
}

export function divergingColor(t: number): [number, number, number] {
  const a = Math.min(1, Math.abs(t)) ** 0.65;
  const c = t >= 0 ? TENSION : COMPRESSION;
  return [NEUTRAL[0] + (c[0] - NEUTRAL[0]) * a, NEUTRAL[1] + (c[1] - NEUTRAL[1]) * a, NEUTRAL[2] + (c[2] - NEUTRAL[2]) * a];
}

const cssRgb = (c: [number, number, number]) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

/** 凡例のグラデーション（CSS） */
export const divergingGradient = () => {
  const stops: string[] = [];
  for (let i = 0; i <= 20; i++) stops.push(cssRgb(divergingColor(-1 + i / 10)));
  return `linear-gradient(to right, ${stops.join(',')})`;
};

const fieldCache = new WeakMap<FlowResult, Map<string, HTMLCanvasElement>>();

function fieldImage(r: FlowResult, field: FlowField, scale: number): HTMLCanvasElement {
  let byKey = fieldCache.get(r);
  if (!byKey) {
    byKey = new Map();
    fieldCache.set(r, byKey);
  }
  const key = `${field}:${scale}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = r.nx + 1;
  c.height = r.ny + 1;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const img = ctx.createImageData(c.width, c.height);
  for (let j = 0; j <= r.ny; j++) {
    const row = r.ny - j;
    for (let i = 0; i <= r.nx; i++) {
      const id = j * (r.nx + 1) + i;
      if (!r.nodeActive[id]) continue;
      const v = valueAt(r, field, id);
      const col = field === 'ratio' ? LEVEL_COLORS[levelOf(v)] : divergingColor(v / scale);
      const p = (row * c.width + i) * 4;
      img.data[p] = col[0];
      img.data[p + 1] = col[1];
      img.data[p + 2] = col[2];
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  byKey.set(key, c);
  return c;
}

const lineCache = new WeakMap<FlowResult, { tension: ReturnType<typeof traceStressLines>; compression: ReturnType<typeof traceStressLines> }>();

function stressLines(r: FlowResult) {
  let hit = lineCache.get(r);
  if (!hit) {
    const sep = Math.max(Math.max(r.W, r.H) / 70, Math.min(r.dx, r.dy) * 1.5);
    hit = { tension: traceStressLines(r, 1, sep), compression: traceStressLines(r, 2, sep) };
    lineCache.set(r, hit);
  }
  return hit;
}

export function deformScale(r: FlowResult): number {
  const d = Math.max(r.summary.deflection.vertical.value, r.summary.deflection.horizontal.value);
  return d > 1e-9 ? (0.25 * Math.min(r.W, r.H)) / d : 0;
}

export type DrawOptions = {
  model: FlowModel;
  result: FlowResult | null;
  view: FlowView;
  layout: Layout;
  scale: number;
  deform: number;
  selectedZone?: string | null;
  probe?: { x: number; y: number } | null;
};

export function drawFlow(ctx: CanvasRenderingContext2D, opts: DrawOptions): void {
  const { model, view, layout, scale, deform, selectedZone, probe } = opts;
  const { ppm, ox, oy, w, h } = layout;
  const W = model.width;
  const H = model.height;
  const X = (x: number) => ox + x * ppm;
  const Y = (y: number) => oy - y * ppm;
  // 寸法の編集中など、結果が今の形と合っていないときは結果を描かない
  const r = opts.result && opts.result.W === W && opts.result.H === H ? opts.result : null;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(X(0), Y(H), W * ppm, H * ppm);
  ctx.clip();
  if (r && view.fill) {
    ctx.imageSmoothingEnabled = view.field !== 'ratio';
    ctx.drawImage(fieldImage(r, view.field, scale), X(-r.dx / 2), Y(H + r.dy / 2), (W + r.dx) * ppm, (H + r.dy) * ppm);
  } else {
    ctx.fillStyle = '#efece5';
    ctx.fillRect(X(0), Y(H), W * ppm, H * ppm);
  }
  if (r) {
    ctx.fillStyle = PAPER;
    for (let j = 0; j < r.ny; j++) {
      let run = -1;
      for (let i = 0; i <= r.nx; i++) {
        const off = i < r.nx && !r.active[j * r.nx + i];
        if (off && run < 0) run = i;
        if (!off && run >= 0) {
          ctx.fillRect(X(run * r.dx), Y((j + 1) * r.dy) - 0.5, (i - run) * r.dx * ppm, r.dy * ppm + 1);
          run = -1;
        }
      }
    }
  } else {
    ctx.fillStyle = PAPER;
    for (const z of model.zones) {
      if (z.kind !== 'opening') continue;
      zonePath(ctx, z, X, Y, ppm);
      ctx.fill();
    }
  }
  ctx.restore();

  if (r && view.vectors) drawVectors(ctx, r, X, Y, ppm);
  if (r && view.lines) drawLines(ctx, r, X, Y);
  if (r && view.deformed && deform > 0) drawDeformed(ctx, r, deform, X, Y);

  // 外形
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(X(0), Y(H), W * ppm, H * ppm);

  for (const z of model.zones) drawZone(ctx, z, X, Y, ppm, z.id === selectedZone);
  drawSupports(ctx, model, X, Y);
  drawLoads(ctx, model, X, Y);
  drawDimensions(ctx, model, X, Y);

  if (r && view.deformed && deform > 0) {
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`変形倍率 ×${formatFactor(deform)}`, w - 8, h - 8);
  }

  if (probe) {
    const px = X(probe.x);
    const py = Y(probe.y);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 9, py);
    ctx.lineTo(px + 9, py);
    ctx.moveTo(px, py - 9);
    ctx.lineTo(px, py + 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export const formatFactor = (k: number) => {
  const m = 10 ** Math.floor(Math.log10(k));
  return (Math.round(k / m) * m).toLocaleString();
};

function zonePath(ctx: CanvasRenderingContext2D, z: FlowZone, X: (x: number) => number, Y: (y: number) => number, ppm: number) {
  ctx.beginPath();
  if (z.shape === 'circle') {
    ctx.ellipse(X(z.x + z.w / 2), Y(z.y + z.h / 2), (z.w / 2) * ppm, (z.h / 2) * ppm, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(X(z.x), Y(z.y + z.h), z.w * ppm, z.h * ppm);
  }
}

function drawZone(ctx: CanvasRenderingContext2D, z: FlowZone, X: (x: number) => number, Y: (y: number) => number, ppm: number, selected: boolean) {
  zonePath(ctx, z, X, Y, ppm);
  ctx.setLineDash(z.kind === 'column' ? [4, 3] : []);
  ctx.strokeStyle = selected ? '#1dad95' : INK;
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `10px ${MONO}`;
  ctx.fillStyle = selected ? '#127a68' : MUTED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = z.kind === 'column' ? '柱' : z.shape === 'circle' ? `φ${Math.round(z.w)}` : `${Math.round(z.w)}×${Math.round(z.h)}`;
  const tw = ctx.measureText(label).width;
  if (z.w * ppm > tw + 6 && z.h * ppm > 14) ctx.fillText(label, X(z.x + z.w / 2), Y(z.y + z.h / 2));
}

function drawVectors(ctx: CanvasRenderingContext2D, r: FlowResult, X: (x: number) => number, Y: (y: number) => number, ppm: number) {
  const pitch = Math.max(r.W, r.H) / 34;
  const stepI = Math.max(1, Math.round(pitch / r.dx));
  const stepJ = Math.max(1, Math.round(pitch / r.dy));
  let ref = 0;
  for (let k = 0; k < r.s1.length; k++) {
    if (r.flag[k] || !r.nodeActive[k]) continue;
    ref = Math.max(ref, Math.abs(r.s1[k]), Math.abs(r.s2[k]));
  }
  if (ref <= 0) return;
  const maxLen = Math.min(stepI * r.dx, stepJ * r.dy) * 0.46 * ppm;
  ctx.lineWidth = 1;
  const seg = (px: number, py: number, ang: number, value: number) => {
    const len = Math.min(1, Math.abs(value) / ref) * maxLen;
    if (len < 0.8) return;
    const c = Math.cos(ang) * len;
    const s = Math.sin(ang) * len;
    ctx.strokeStyle = value >= 0 ? TENSION_LINE : COMPRESSION_LINE;
    ctx.beginPath();
    ctx.moveTo(px - c, py + s);
    ctx.lineTo(px + c, py - s);
    ctx.stroke();
  };
  for (let j = Math.floor(stepJ / 2); j <= r.ny; j += stepJ) {
    for (let i = Math.floor(stepI / 2); i <= r.nx; i += stepI) {
      const id = j * (r.nx + 1) + i;
      if (!r.nodeActive[id]) continue;
      const ang = 0.5 * Math.atan2(2 * r.txy[id], r.sx[id] - r.sy[id]);
      const px = X(i * r.dx);
      const py = Y(j * r.dy);
      seg(px, py, ang, r.s1[id]);
      seg(px, py, ang + Math.PI / 2, r.s2[id]);
    }
  }
}

function drawLines(ctx: CanvasRenderingContext2D, r: FlowResult, X: (x: number) => number, Y: (y: number) => number) {
  const { tension, compression } = stressLines(r);
  const draw = (lines: StressLine[], ref: number, color: string) => {
    if (ref <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    // 太さを 4 段にまとめて描く（線分ごとに stroke すると重い）
    for (let b = 0; b < 4; b++) {
      ctx.beginPath();
      for (const line of lines) {
        for (let k = 3; k < line.length; k += 3) {
          const t = Math.min(0.999, Math.abs(line[k + 2]) / ref);
          if (Math.floor(t * 4) !== b) continue;
          ctx.moveTo(X(line[k - 3]), Y(line[k - 2]));
          ctx.lineTo(X(line[k]), Y(line[k + 1]));
        }
      }
      ctx.lineWidth = 0.6 + b * 0.55;
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  };
  draw(compression.lines, compression.ref, COMPRESSION_LINE);
  draw(tension.lines, tension.ref, TENSION_LINE);
}

function drawDeformed(ctx: CanvasRenderingContext2D, r: FlowResult, k: number, X: (x: number) => number, Y: (y: number) => number) {
  const id = (i: number, j: number) => j * (r.nx + 1) + i;
  const on = (i: number, j: number) => i >= 0 && j >= 0 && i < r.nx && j < r.ny && !!r.active[j * r.nx + i];
  const px = (n: number, i: number) => X(i * r.dx + r.ux[n] * k);
  const py = (n: number, j: number) => Y(j * r.dy + r.uy[n] * k);
  ctx.strokeStyle = 'rgba(43,43,43,0.75)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  const edge = (i0: number, j0: number, i1: number, j1: number) => {
    const a = id(i0, j0);
    const b = id(i1, j1);
    ctx.moveTo(px(a, i0), py(a, j0));
    ctx.lineTo(px(b, i1), py(b, j1));
  };
  for (let j = 0; j <= r.ny; j++) {
    for (let i = 0; i < r.nx; i++) if (on(i, j) !== on(i, j - 1)) edge(i, j, i + 1, j);
  }
  for (let j = 0; j < r.ny; j++) {
    for (let i = 0; i <= r.nx; i++) if (on(i, j) !== on(i - 1, j)) edge(i, j, i, j + 1);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSupports(ctx: CanvasRenderingContext2D, model: FlowModel, X: (x: number) => number, Y: (y: number) => number) {
  const size = 9;
  ctx.strokeStyle = INK;
  ctx.fillStyle = PAPER;
  ctx.lineWidth = 1;
  for (const s of model.supports) {
    const alongX = s.edge === 'bottom' || s.edge === 'top';
    const point = (c: number) => {
      if (s.edge === 'bottom') return { x: X(c), y: Y(0), nx: 0, ny: 1 };
      if (s.edge === 'top') return { x: X(c), y: Y(model.height), nx: 0, ny: -1 };
      if (s.edge === 'left') return { x: X(0), y: Y(c), nx: -1, ny: 0 };
      return { x: X(model.width), y: Y(c), nx: 1, ny: 0 };
    };
    const lo = Math.min(s.from, s.to);
    const hi = Math.max(s.from, s.to);
    if (s.type === 'fixed' && hi > lo) {
      const a = point(lo);
      const b = point(hi);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x + a.nx * 1.5, a.y + a.ny * 1.5);
      ctx.lineTo(b.x + b.nx * 1.5, b.y + b.ny * 1.5);
      ctx.stroke();
      ctx.lineWidth = 1;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const count = Math.max(2, Math.floor(length / 7));
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = a.x + (b.x - a.x) * t + a.nx * 2;
        const py = a.y + (b.y - a.y) * t + a.ny * 2;
        ctx.moveTo(px, py);
        // 斜めのハッチ
        ctx.lineTo(px + a.nx * 6 + (alongX ? -4 : 0), py + a.ny * 6 + (alongX ? 0 : -4));
      }
      ctx.stroke();
    } else {
      const p = point((lo + hi) / 2);
      const tx = p.ny !== 0 ? 1 : 0;
      const ty = p.nx !== 0 ? 1 : 0;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.nx * size + tx * size * 0.7, p.y + p.ny * size + ty * size * 0.7);
      ctx.lineTo(p.x + p.nx * size - tx * size * 0.7, p.y + p.ny * size - ty * size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (s.type === 'roller') {
        const off = size + 3;
        ctx.beginPath();
        ctx.moveTo(p.x + p.nx * off + tx * size, p.y + p.ny * off + ty * size);
        ctx.lineTo(p.x + p.nx * off - tx * size, p.y + p.ny * off - ty * size);
        ctx.stroke();
      }
    }
  }
}

function arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, head = 4) {
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - 0.45), y1 - head * Math.sin(ang - 0.45));
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang + 0.45), y1 - head * Math.sin(ang + 0.45));
  ctx.stroke();
}

function drawLoads(ctx: CanvasRenderingContext2D, model: FlowModel, X: (x: number) => number, Y: (y: number) => number) {
  ctx.strokeStyle = '#1f1f1f';
  ctx.fillStyle = '#1f1f1f';
  ctx.lineWidth = 0.9;
  ctx.font = `10px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  for (const l of model.loads) {
    if (l.kind === 'line') {
      if (l.q === 0) continue;
      const a = X(Math.min(l.x0, l.x1));
      const b = X(Math.max(l.x0, l.x1));
      const y = Y(l.y);
      const onTop = l.y >= model.height - 1;
      const len = onTop ? 16 : 11;
      const count = Math.max(2, Math.floor((b - a) / 26));
      const dir = l.q > 0 ? 1 : -1;
      for (let i = 0; i <= count; i++) {
        const x = a + ((b - a) * i) / count;
        arrow(ctx, x, y - (dir > 0 ? len : 0), x, y - (dir > 0 ? 0 : len), 3.5);
      }
      ctx.beginPath();
      ctx.moveTo(a, y - len);
      ctx.lineTo(b, y - len);
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillText(`${l.q} kN/m`, a + 2, y - len - 4);
    } else if (l.kind === 'shear') {
      if (l.H === 0) continue;
      const y = Y(l.y);
      const right = l.H > 0;
      const x = right ? X(0) : X(model.width);
      arrow(ctx, x + (right ? -30 : 30), y, x + (right ? -3 : 3), y, 5);
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillText(`${Math.abs(l.H)} kN`, x + (right ? -6 : 6), y - 5);
    } else {
      const x = X(l.x);
      const y = Y(l.y);
      if (l.fy !== 0) {
        const d = l.fy > 0 ? 1 : -1;
        arrow(ctx, x, y - d * 26, x, y - d * 2, 5);
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.abs(l.fy)} kN`, x + 4, y - d * 24);
      }
      if (l.fx !== 0) {
        const d = l.fx > 0 ? 1 : -1;
        arrow(ctx, x - d * 26, y, x - d * 2, y, 5);
        ctx.textAlign = d > 0 ? 'right' : 'left';
        ctx.fillText(`${Math.abs(l.fx)} kN`, x - d * 12, y - 5);
      }
    }
  }
}

function drawDimensions(ctx: CanvasRenderingContext2D, model: FlowModel, X: (x: number) => number, Y: (y: number) => number) {
  const W = model.width;
  const H = model.height;
  ctx.strokeStyle = MUTED;
  ctx.fillStyle = MUTED;
  ctx.lineWidth = 0.75;
  ctx.font = `10px ${MONO}`;
  const by = Y(0) + 32;
  ctx.beginPath();
  ctx.moveTo(X(0), by);
  ctx.lineTo(X(W), by);
  for (const x of [X(0), X(W)]) {
    ctx.moveTo(x, by - 4);
    ctx.lineTo(x, by + 4);
  }
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(W.toLocaleString(), X(W / 2), by - 4);

  const lx = X(0) - 42;
  ctx.beginPath();
  ctx.moveTo(lx, Y(0));
  ctx.lineTo(lx, Y(H));
  for (const y of [Y(0), Y(H)]) {
    ctx.moveTo(lx - 4, y);
    ctx.lineTo(lx + 4, y);
  }
  ctx.stroke();
  ctx.save();
  ctx.translate(lx - 5, Y(H / 2));
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(H.toLocaleString(), 0, 0);
  ctx.restore();
}

/** 座標 → 開口・柱（手前に描いたものを優先） */
export function hitZone(model: FlowModel, x: number, y: number, margin: number): FlowZone | null {
  for (let i = model.zones.length - 1; i >= 0; i--) {
    const z = model.zones[i];
    if (x >= z.x - margin && x <= z.x + z.w + margin && y >= z.y - margin && y <= z.y + z.h + margin) return z;
  }
  return null;
}
