'use client';
/**
 * 基本設計 › 日影規制。直方体の建物 1 棟の日影時間を冬至日の真太陽時で数え、別表第 4 の規制時間と比べる。
 * 計算は src/lib/shadow.ts。2026-11-14
 * 2026-11-16: 塔屋(令 2 条 1 項 6 号ロ)と、日影時間の制限の異なる区域にまたがる場合(法 56 条の 2 第 4・5 項・令 135 条の 13)を足した。
 *   どちらも入れなければ(区域 1 つ・塔屋なし)これまでと同じ値。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { CITIES, SHADOW_ZONES, computeShadowZones, hm, sunAt, type ShadowIn, type ShadowOut, type ZoneSplit } from '@/lib/shadow';
import { penthouseCounted, type Penthouse } from '@/lib/setback';

const SPLIT_DIRS: { id: ZoneSplit['dir']; label: string }[] = [
  { id: 'N', label: '北' },
  { id: 'E', label: '東' },
  { id: 'S', label: '南' },
  { id: 'W', label: '西' },
];

const field = 'w-full text-[12px] px-2 py-1.5';
const label = 'block text-[11px] font-bold text-gray-700 mb-1';
const box = 'bg-gray-50 p-3 border border-[#3b3b3b] space-y-2';

function Num({ k, v, set, step = '0.5' }: { k: string; v: string; set: (s: string) => void; step?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" step={step} value={v} onChange={(e) => set(e.target.value)} className={field} />
    </label>
  );
}

/** 平面の日影時間図。規制時間を超えるところを赤く、5m・10m の線を破線で */
function PlanMap({ r, v, lims, zoneIdx, split }: { r: ShadowOut; v: ShadowIn; lims: ([number, number] | null)[]; zoneIdx: Uint8Array | null; split: ZoneSplit | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 560;
  const Hh = Math.round((W * r.ny) / r.nx);
  const H = Math.min(Hh, 520);
  const scale = Math.min(W / (r.nx * r.step), H / (r.ny * r.step));
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = W * dpr;
    c.height = H * dpr;
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#f7f7f4';
    g.fillRect(0, 0, W, H);
    const px = (x: number) => (x - r.x0) * scale;
    const py = (y: number) => H - (y - r.y0) * scale;
    const cell = r.step * scale + 0.6;
    for (let j = 0; j < r.ny; j++) {
      for (let i = 0; i < r.nx; i++) {
        const k = j * r.nx + i;
        const h = r.hours[k];
        if (h <= 0) continue;
        const d = r.dist[k];
        const lim = lims[zoneIdx ? zoneIdx[k] : 0] ?? null;
        // 56 条の 2: 規制時間「以上」日影となる部分を生じさせない → ちょうども超える側。対象区域外・対象外の区域は塗らない
        const over = lim !== null && ((d > 10 && h >= lim[1] - 1e-6) || (d > 5 && d <= 10 && h >= lim[0] - 1e-6));
        if (over) g.fillStyle = 'rgba(180, 64, 47, 0.55)';
        else g.fillStyle = `rgba(59, 59, 59, ${Math.min(0.08 + h * 0.06, 0.5)})`;
        g.fillRect(px(r.x0 + i * r.step), py(r.y0 + (j + 1) * r.step), cell, cell);
      }
    }
    // 5m・10m の線(敷地境界線からの水平距離。角は丸い)
    const ring = (off: number, color: string, dash: number[]) => {
      g.save();
      g.strokeStyle = color;
      g.setLineDash(dash);
      g.lineWidth = 1;
      const { x0, y0, x1, y1 } = r.site;
      g.beginPath();
      g.moveTo(px(x0), py(y1 + off));
      g.lineTo(px(x1), py(y1 + off));
      g.arc(px(x1), py(y1), off * scale, -Math.PI / 2, 0);
      g.lineTo(px(x1 + off), py(y0));
      g.arc(px(x1), py(y0), off * scale, 0, Math.PI / 2);
      g.lineTo(px(x0), py(y0 - off));
      g.arc(px(x0), py(y0), off * scale, Math.PI / 2, Math.PI);
      g.lineTo(px(x0 - off), py(y1));
      g.arc(px(x0), py(y1), off * scale, Math.PI, Math.PI * 1.5);
      g.stroke();
      g.restore();
    };
    ring(5, '#2f6f5e', [4, 3]);
    ring(10, '#2f6f5e', [1, 3]);
    // 敷地・建物(道路・水面等の緩和があるときは、みなした境界線を細い破線で)
    g.strokeStyle = '#3b3b3b';
    g.lineWidth = 1;
    g.strokeRect(px(r.real.x0), py(r.real.y1), (r.real.x1 - r.real.x0) * scale, (r.real.y1 - r.real.y0) * scale);
    if (r.site.x0 !== r.real.x0 || r.site.y0 !== r.real.y0 || r.site.x1 !== r.real.x1 || r.site.y1 !== r.real.y1) {
      g.save();
      g.setLineDash([2, 2]);
      g.strokeStyle = '#8a8a85';
      g.strokeRect(px(r.site.x0), py(r.site.y1), (r.site.x1 - r.site.x0) * scale, (r.site.y1 - r.site.y0) * scale);
      g.restore();
    }
    g.fillStyle = '#2b2b2b';
    g.fillRect(px(0), py(v.bd), v.bw * scale, v.bd * scale);
    if (v.pent && v.pent.h > 0) {
      g.strokeStyle = '#f7f7f4';
      g.strokeRect(px(v.pent.x0), py(v.pent.y1), (v.pent.x1 - v.pent.x0) * scale, (v.pent.y1 - v.pent.y0) * scale);
    }
    // 区域の境界(令 135 条の 13)
    if (split) {
      const gx1 = r.x0 + r.nx * r.step;
      const gy1 = r.y0 + r.ny * r.step;
      g.save();
      g.strokeStyle = '#3b3b3b';
      g.setLineDash([6, 3]);
      g.beginPath();
      if (split.dir === 'N' || split.dir === 'S') {
        const y = split.dir === 'N' ? r.real.y1 + split.dist : r.real.y0 - split.dist;
        g.moveTo(px(r.x0), py(y));
        g.lineTo(px(gx1), py(y));
      } else {
        const x = split.dir === 'E' ? r.real.x1 + split.dist : r.real.x0 - split.dist;
        g.moveTo(px(x), py(r.y0));
        g.lineTo(px(x), py(gy1));
      }
      g.stroke();
      g.restore();
    }
    // 真北
    const cx = W - 26;
    const cy = 30;
    const a = (-v.rot * Math.PI) / 180;
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.strokeStyle = '#3b3b3b';
    g.beginPath();
    g.moveTo(0, 14);
    g.lineTo(0, -14);
    g.lineTo(-4, -6);
    g.moveTo(0, -14);
    g.lineTo(4, -6);
    g.stroke();
    g.fillStyle = '#3b3b3b';
    g.font = '10px sans-serif';
    g.textAlign = 'center';
    g.fillText('N', 0, -18);
    g.restore();
  }, [r, v, lims, zoneIdx, split, W, H, scale]);
  return <canvas ref={ref} style={{ width: W, height: H, maxWidth: '100%' }} aria-label="日影時間の平面図" />;
}

export default function ShadowCalc() {
  const [city, setCity] = useState('東京');
  const [lat, setLat] = useState('35.68');
  const [hokkaido, setHokkaido] = useState(false);
  const [zone, setZone] = useState('mid');
  const [go, setGo] = useState('(一)');
  const [plane, setPlane] = useState('4');
  const [bw, setBw] = useState('20');
  const [bd, setBd] = useState('10');
  const [bh, setBh] = useState('15');
  const [rot, setRot] = useState('0');
  const [setN, setSetN] = useState('5');
  const [setE, setSetE] = useState('3');
  const [setS, setSetS] = useState('5');
  const [setW, setSetW] = useState('3');
  const [wayN, setWayN] = useState('0');
  const [wayE, setWayE] = useState('0');
  const [wayS, setWayS] = useState('0');
  const [wayW, setWayW] = useState('0');
  const [diff, setDiff] = useState('0');
  const [floors3, setFloors3] = useState(false);
  // 塔屋(令 2 条 1 項 6 号ロ)。位置は建物の南西の角から(空欄 = 中央)
  const [pw, setPw] = useState('');
  const [pd, setPd] = useState('');
  const [ph, setPh] = useState('');
  const [pxo, setPxo] = useState('');
  const [pyo, setPyo] = useState('');
  // 2 つ目の区域(令 135 条の 13)
  const [splitOn, setSplitOn] = useState(false);
  const [splitDir, setSplitDir] = useState<ZoneSplit['dir']>('N');
  const [splitDist, setSplitDist] = useState('5');
  const [zoneB, setZoneB] = useState('low');
  const [goB, setGoB] = useState('(一)');
  const [planeB, setPlaneB] = useState('1.5');

  const outA = zone === 'out';
  const z = SHADOW_ZONES.find((x) => x.id === zone) ?? SHADOW_ZONES[0];
  const zB = SHADOW_ZONES.find((x) => x.id === zoneB) ?? null;
  const row = z.rows.find((x) => x.go === go) ?? z.rows[0];
  // 測定面の高さは数値だけを依存にする(z から直接求めると React Compiler が下の useMemo を最適化できなかった)
  const planeN = useMemo(() => {
    const planes = (SHADOW_ZONES.find((x) => x.id === zone) ?? SHADOW_ZONES[0]).planes;
    return planes.includes(Number(plane)) ? Number(plane) : planes[0];
  }, [zone, plane]);
  const near = hokkaido ? row.nearH : row.near;
  const far = hokkaido ? row.farH : row.far;

  const v: ShadowIn = useMemo(
    () => ({
      lat: Number(lat),
      hokkaido,
      bw: Number(bw),
      bd: Number(bd),
      bh: Number(bh),
      rot: Number(rot),
      plane: planeN,
      setN: Number(setN),
      setE: Number(setE),
      setS: Number(setS),
      setW: Number(setW),
      wayN: Number(wayN) || 0,
      wayE: Number(wayE) || 0,
      wayS: Number(wayS) || 0,
      wayW: Number(wayW) || 0,
      diff: Number(diff) || 0,
      pent:
        Number(pw) > 0 && Number(pd) > 0 && Number(ph) > 0
          ? {
              x0: pxo.trim() === '' ? (Number(bw) - Number(pw)) / 2 : Number(pxo),
              y0: pyo.trim() === '' ? (Number(bd) - Number(pd)) / 2 : Number(pyo),
              x1: (pxo.trim() === '' ? (Number(bw) - Number(pw)) / 2 : Number(pxo)) + Number(pw),
              y1: (pyo.trim() === '' ? (Number(bd) - Number(pd)) / 2 : Number(pyo)) + Number(pd),
              h: Number(ph),
            }
          : null,
    }),
    [lat, hokkaido, bw, bd, bh, rot, planeN, setN, setE, setS, setW, wayN, wayE, wayS, wayW, diff, pw, pd, ph, pxo, pyo]
  );
  const valid = v.bw > 0 && v.bd > 0 && v.bh > 0 && v.lat > 20 && v.lat < 50;
  // 塔屋: 「高さ 10m 超」の判定(別表第 4(ろ)欄二・三・四の項ロ、56 条の 2 第 4 項)では 1/8 以内なら 5m まで不算入
  const pentP: Penthouse | null = v.pent ? { area: (v.pent.x1 - v.pent.x0) * (v.pent.y1 - v.pent.y0), height: v.pent.h, bldgArea: v.bw * v.bd } : null;
  const pentC = penthouseCounted(pentP, 'shadow10');
  const h10 = v.bh + pentC.counted;
  const split: ZoneSplit | null = useMemo(() => (splitOn ? { dir: splitDir, dist: Number(splitDist) || 0 } : null), [splitOn, splitDir, splitDist]);
  const zr = useMemo(
    () =>
      valid
        ? computeShadowZones(v, { group: zone, go, plane: planeN }, split ? { group: zoneB, go: goB, plane: Number(planeB) } : null, split, hokkaido, { eave: v.bh, floors3, h10 })
        : null,
    [v, valid, zone, go, planeN, split, zoneB, goB, planeB, hokkaido, floors3, h10]
  );
  const r = zr ? zr.out : null;
  const zA = zr ? zr.zones[0] : null;
  const zBr = zr && zr.zones.length > 1 ? zr.zones[1] : null;
  // 56 条の 2 第 1 項: 規制時間「以上」日影となる部分を生じさせない(ちょうども不適合)。10 分刻みの数え方なので境目は ±5 分程度ずれうる
  const ngNear = zA ? zA.maxNear >= near - 1e-6 : false;
  const ngFar = zA ? zA.maxFar >= far - 1e-6 : false;
  // 規制の対象になる建築物か(別表第 4(ろ)欄)。直方体なので軒の高さ = 高さとみなす
  const lowType = z.id === 'low' || z.id === 'none-i';
  const covered = outA ? false : lowType ? v.bh > 7 || floors3 : h10 > 10;
  const ngB = !!zBr && (zBr.ngNear || zBr.ngFar);
  const anyApplies = covered || !!zBr?.applies;
  const anyNg = (covered && (ngNear || ngFar)) || ngB;
  const lims = useMemo<([number, number] | null)[]>(
    () => (zr ? zr.zones.map((x, i) => ((i === 0 ? covered : x.applies) && x.near !== null && x.far !== null ? [x.near, x.far] : null)) : []),
    [zr, covered]
  );
  const coverText = outA
    ? h10 > 10
      ? '敷地は対象区域外。高さ 10m 超なので、対象区域に落ちる影は規制される(法 56 条の 2 第 4 項)'
      : '敷地は対象区域外。高さ 10m 以下なので規制されない(法 56 条の 2 第 4 項)'
    : lowType
    ? covered
      ? `対象(${v.bh > 7 ? '軒の高さ 7m 超' : '地階を除く階数 3 以上'})`
      : '対象外(軒の高さ 7m 以下かつ地階を除く階数 2 以下)'
    : covered
      ? `対象(高さ ${h10 !== v.bh ? `${h10} m(塔屋を含む)` : '10m'} 超)`
      : '対象外(高さ 10m 以下。区域外の 10m 超の建物が対象区域に影を落とす場合は 56 条の 2 第 4 項)';
  const noon = sunAt(Number(lat), 12);

  return (
    <div className="p-4 text-[12px] text-gray-700">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className={box}>
            <span className={label}>場所(緯度)</span>
            <select
              value={city}
              onChange={(e) => {
                const c = CITIES.find((x) => x.label === e.target.value);
                setCity(e.target.value);
                if (c) {
                  setLat(String(c.lat));
                  setHokkaido(!!c.hokkaido);
                }
              }}
              className={field}
            >
              {CITIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}(北緯 {c.lat}°)
                </option>
              ))}
              <option value="">緯度を入れる</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Num k="北緯(°)" v={lat} set={setLat} step="0.01" />
              <label className="flex items-end gap-1 pb-2 text-[11px]">
                <input type="checkbox" checked={hokkaido} onChange={(e) => setHokkaido(e.target.checked)} /> 北海道(9〜15 時)
              </label>
            </div>
          </div>

          <div className={box}>
            <span className={label}>規制(別表第 4・条例で指定)</span>
            <select
              value={zone}
              onChange={(e) => {
                const nz = SHADOW_ZONES.find((x) => x.id === e.target.value);
                setZone(e.target.value);
                if (nz) {
                  setGo(nz.rows[0].go);
                  setPlane(String(nz.planes[0]));
                } else setSplitOn(true);
              }}
              className={field}
            >
              {SHADOW_ZONES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
              <option value="out">対象区域外(商業地域・工業地域など)</option>
            </select>
            {outA ? (
              <p className="text-[10px] text-gray-500">敷地は日影規制の対象区域外。高さ 10m 超の建物が、対象区域に影を落とすと規制される(法 56 条の 2 第 4 項)。下の「区域がまたがる場合」で対象区域を入れる。</p>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">号</span>
                <select value={go} onChange={(e) => setGo(e.target.value)} className={field}>
                  {z.rows.map((x) => (
                    <option key={x.go} value={x.go}>
                      {x.go} {hokkaido ? x.nearH : x.near}h / {hokkaido ? x.farH : x.far}h
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] text-gray-500 mb-1">測定面(平均地盤面から)</span>
                <select value={planeN} onChange={(e) => setPlane(e.target.value)} className={field}>
                  {z.planes.map((p) => (
                    <option key={p} value={p}>
                      {p} m
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-[10px] text-gray-500">対象: {z.applies}(別表第 4 {z.item}の項)。号と測定面の高さは条例で指定されたものを選ぶ</p>
              </>
            )}
            {(lowType || (splitOn && zB !== null && (zB.id === 'low' || zB.id === 'none-i'))) && !outA && (
              <label className="flex items-start gap-1 text-[11px]">
                <input type="checkbox" checked={floors3} onChange={(e) => setFloors3(e.target.checked)} className="mt-0.5" /> 地階を除く階数が 3 以上
              </label>
            )}
          </div>

          <div className={box}>
            <span className={label}>建物(直方体)と敷地</span>
            <div className="grid grid-cols-3 gap-2">
              <Num k="幅(m)" v={bw} set={setBw} />
              <Num k="奥行き(m)" v={bd} set={setBd} />
              <Num k="高さ(m)" v={bh} set={setBh} />
            </div>
            <Num k="建物の向き(真北から時計回りの角度 °)" v={rot} set={setRot} step="1" />
            <span className="block text-[10px] text-gray-500">建物から敷地境界線までの距離(m)</span>
            <div className="grid grid-cols-4 gap-2">
              <Num k="北" v={setN} set={setSetN} />
              <Num k="東" v={setE} set={setSetE} />
              <Num k="南" v={setS} set={setSetS} />
              <Num k="西" v={setW} set={setSetW} />
            </div>
          </div>

          <details className={box}>
            <summary className="text-[11px] font-bold text-gray-700 cursor-pointer">道路・水面等と高低差の緩和(令 135 条の 12 第 3 項)</summary>
            <span className="block text-[10px] text-gray-500">敷地が接する道路・水面・線路敷等の幅(m。無ければ 0)</span>
            <div className="grid grid-cols-4 gap-2">
              <Num k="北" v={wayN} set={setWayN} />
              <Num k="東" v={wayE} set={setWayE} />
              <Num k="南" v={wayS} set={setWayS} />
              <Num k="西" v={wayW} set={setWayW} />
            </div>
            <p className="text-[10px] text-gray-400">境界線を幅の 1/2 外側にみなす。幅 10m 超は反対側の境界線から 5m 内側の線。</p>
            <Num k="隣地(影の落ちる土地)の地盤面 − 敷地の平均地盤面(m)" v={diff} set={setDiff} step="0.1" />
            <p className="text-[10px] text-gray-400">1m 以上低い敷地は、平均地盤面を(差 − 1)/ 2 高くみなす。特定行政庁が規則で別に定めている場合はそちら。</p>
          </details>

          <details className={box} open={splitOn}>
            <summary className="text-[11px] font-bold text-gray-700 cursor-pointer">区域がまたがる場合(法 56 条の 2 第 4・5 項・令 135 条の 13)</summary>
            <label className="flex items-start gap-1 text-[11px]">
              <input type="checkbox" checked={splitOn} onChange={(e) => setSplitOn(e.target.checked)} className="mt-0.5" /> 規制の異なる区域が近くにある・敷地が区域の内外にわたる
            </label>
            {splitOn && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[10px] text-gray-500 mb-1">区域の境界がある側</span>
                    <select value={splitDir} onChange={(e) => setSplitDir(e.target.value as ZoneSplit['dir'])} className={field}>
                      {SPLIT_DIRS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] text-gray-500 mb-1">敷地境界線から区域の境界まで(m)</span>
                    <input type="number" step="0.5" value={splitDist} onChange={(e) => setSplitDist(e.target.value)} className={field} />
                  </label>
                </div>
                <p className="text-[10px] text-gray-400">建物の向きに沿った軸で、その側の敷地境界線(実際の線)から外側へ測る。負の値 = 敷地の内側(建物が区域の内外にわたる)。境界より外側が 2 つ目の区域。</p>
                <select
                  value={zoneB}
                  onChange={(e) => {
                    const nz = SHADOW_ZONES.find((x) => x.id === e.target.value);
                    setZoneB(e.target.value);
                    if (nz) {
                      setGoB(nz.rows[0].go);
                      setPlaneB(String(nz.planes[0]));
                    }
                  }}
                  className={field}
                  aria-label="2 つ目の区域"
                >
                  {SHADOW_ZONES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                  <option value="out">対象区域外(商業地域・工業地域など)</option>
                </select>
                {zB && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-1">号</span>
                      <select value={goB} onChange={(e) => setGoB(e.target.value)} className={field}>
                        {zB.rows.map((x) => (
                          <option key={x.go} value={x.go}>
                            {x.go} {hokkaido ? x.nearH : x.near}h / {hokkaido ? x.farH : x.far}h
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="block text-[10px] text-gray-500 mb-1">測定面</span>
                      <select value={planeB} onChange={(e) => setPlaneB(e.target.value)} className={field}>
                        {zB.planes.map((p) => (
                          <option key={p} value={p}>
                            {p} m
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <p className="text-[10px] text-gray-400">
                  影が落ちる側の区域の規制時間・測定面で判定する(その区域に建物があるものとみなす)。5m・10m の線はどちらも敷地境界線から測る。対象区域外に落ちる影は規制しない。
                </p>
              </>
            )}
          </details>

          <details className={box} open={!!v.pent}>
            <summary className="text-[11px] font-bold text-gray-700 cursor-pointer">塔屋(令 2 条 1 項 6 号ロ)</summary>
            <div className="grid grid-cols-3 gap-2">
              <Num k="幅(m)" v={pw} set={setPw} />
              <Num k="奥行き(m)" v={pd} set={setPd} />
              <Num k="屋上からの高さ(m)" v={ph} set={setPh} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Num k="建物の西端から(m・空欄 = 中央)" v={pxo} set={setPxo} />
              <Num k="建物の南端から(m・空欄 = 中央)" v={pyo} set={setPyo} />
            </div>
            <p className="text-[10px] text-gray-400">
              日影は塔屋の影も含めて数える。規制の対象になるか(高さ 10m 超)は、塔屋が建築面積の 1/8 以内なら 5m まで算入しない(別表第 4(ろ)欄二・三・四の項ロ、法 56 条の 2 第 4 項)。軒の高さ 7m の判定には入れない。
            </p>
          </details>
        </div>

        <div className="space-y-3">
          {r ? (
            <>
              <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[260px] max-w-[420px]">
                  <DtResult
                    label={`日影時間の最大(冬至日 真太陽時 ${r.t0}〜${r.t1} 時${outA ? '' : `・測定面 ${planeN}m`})`}
                    value={!anyApplies ? '規制の対象外' : anyNg ? '超える' : '収まる'}
                    text
                    ng={anyNg}
                    sub={outA ? '敷地は対象区域外(法 56 条の 2 第 4 項)' : `規制 ${near} 時間 / ${far} 時間以上の日影を生じさせない(${z.label} ${row.go})`}
                  >
                    <ResultRow k="規制の対象か(別表第 4(ろ)欄)" v={coverText} />
                    {!outA && <ResultRow k={zBr ? '敷地のある区域 5m を超え 10m 以内' : '5m を超え 10m 以内'} v={`${hm(zA ? zA.maxNear : 0)}(${near} 時間未満であること)${covered && ngNear ? ' · 超える' : ''}`} />}
                    {!outA && <ResultRow k={zBr ? '敷地のある区域 10m を超える範囲' : '10m を超える範囲'} v={`${hm(zA ? zA.maxFar : 0)}(${far} 時間未満であること)${covered && ngFar ? ' · 超える' : ''}`} />}
                    {zBr && (
                      <ResultRow
                        k={`2 つ目の区域(${zBr.label}${zBr.near !== null ? ` ${zBr.rule.go}・測定面 ${zBr.plane}m` : ''})`}
                        v={
                          zBr.near === null || zBr.far === null
                            ? '対象区域外(規制しない)'
                            : !zBr.applies
                              ? `規制しない(対象建築物でない・令 135 条の 13)`
                              : `5〜10m ${hm(zBr.maxNear)}(${zBr.near} 時間未満)${zBr.ngNear ? ' · 超える' : ''} / 10m 超 ${hm(zBr.maxFar)}(${zBr.far} 時間未満)${zBr.ngFar ? ' · 超える' : ''}`
                        }
                      />
                    )}
                    {zr && zBr && <ResultRow k="令 135 条の 13 の対象建築物" v={zr.target ? `該当(${outA ? '高さ 10m 超・法 56 条の 2 第 4 項' : '区域外の土地に影を落とす建物として、その区域の規制を当てる'})` : '該当しない'} />}
                    {zr && zr.unsure.map((x) => <ResultRow key={x} k="要確認" v={x} />)}
                    {pentP && <ResultRow k={`塔屋 ${(pentP.area).toFixed(2)} m² / 建築面積の 1/8 = ${(pentP.bldgArea / 8).toFixed(2)} m²`} v={`高さ 10m 超の判定に ${pentC.counted} m を算入(${pentC.basis})· 影は塔屋も含めて数える`} />}
                    <ResultRow k="正午の太陽高度" v={`${((noon.alt * 180) / Math.PI).toFixed(1)}°`} />
                    <ResultRow k="計算の細かさ" v={`${r.step} m 格子・10 分刻み`} />
                  </DtResult>
                </div>
              </div>
              <div>
                <div className="yy-sec">
                  <span className="yy-sec__title">日影時間の平面図</span>
                  <span className="yy-sec__right">濃いほど長い · 赤 = 規制時間を超える · 破線 5m / 点線 10m{split ? ' · 長い破線 = 区域の境界' : ''}</span>
                </div>
                <PlanMap r={r} v={v} lims={lims} zoneIdx={zr && zr.zones.length > 1 ? zr.zoneIdx : null} split={split} />
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-500">建物の幅・奥行き・高さと緯度を入れると計算します。</p>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 建築基準法 第 56 条の 2・別表第 4 の規制時間と、冬至日(赤緯 −23.44°)の真太陽時の太陽位置で数えた目安です(e-Gov、2026-05-27 施行版で確認)。
            <br />※ 規制時間は「その時間以上日影となる部分を生じさせない」なので、ちょうどの時間も超える扱いです。10 分刻みで数えているので境目は数分ずれます。
            <br />※ 建物は直方体 1 棟、敷地は建物と同じ向きの長方形、平均地盤面は平らとしています。同じ敷地の 2 以上の建物は 1 つとみなす(56 条の 2 第 2 項)ため、別棟があれば合わせて検討が必要です。パラペット・棟飾等は入っていません。
            <br />※ 区域がまたがる場合は、区域の境界を 1 本の直線で入れます(2 つまで)。2 つ目の区域の測定面が違うときは、測定面ごとに数えた時間をその区域の点に当てます。
            <br />※ 確認申請の日影図は専用ソフトで作ってください。このツールは計画初期のボリューム検討用です。
          </p>
        </div>
      </div>
    </div>
  );
}
