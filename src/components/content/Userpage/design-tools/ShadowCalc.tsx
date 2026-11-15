'use client';
/**
 * 基本設計 › 日影規制。直方体の建物 1 棟の日影時間を冬至日の真太陽時で数え、別表第 4 の規制時間と比べる。
 * 計算は src/lib/shadow.ts。2026-11-14
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { CITIES, SHADOW_ZONES, computeShadow, hm, sunAt, type ShadowIn, type ShadowOut } from '@/lib/shadow';

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
function PlanMap({ r, v, near, far }: { r: ShadowOut; v: ShadowIn; near: number; far: number }) {
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
        // 56 条の 2: 規制時間「以上」日影となる部分を生じさせない → ちょうども超える側
        const over = (d > 10 && h >= far - 1e-6) || (d > 5 && d <= 10 && h >= near - 1e-6);
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
  }, [r, v, near, far, W, H, scale]);
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

  const z = SHADOW_ZONES.find((x) => x.id === zone) ?? SHADOW_ZONES[0];
  const row = z.rows.find((x) => x.go === go) ?? z.rows[0];
  const planeN = z.planes.includes(Number(plane)) ? Number(plane) : z.planes[0];
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
    }),
    [lat, hokkaido, bw, bd, bh, rot, planeN, setN, setE, setS, setW, wayN, wayE, wayS, wayW, diff]
  );
  const valid = v.bw > 0 && v.bd > 0 && v.bh > 0 && v.lat > 20 && v.lat < 50;
  const r = useMemo(() => (valid ? computeShadow(v) : null), [v, valid]);
  // 56 条の 2 第 1 項: 規制時間「以上」日影となる部分を生じさせない(ちょうども不適合)。10 分刻みの数え方なので境目は ±5 分程度ずれうる
  const ngNear = r ? r.maxNear >= near - 1e-6 : false;
  const ngFar = r ? r.maxFar >= far - 1e-6 : false;
  // 規制の対象になる建築物か(別表第 4(ろ)欄)。直方体なので軒の高さ = 高さとみなす
  const lowType = z.id === 'low' || z.id === 'none-i';
  const covered = lowType ? v.bh > 7 || floors3 : v.bh > 10;
  const coverText = lowType
    ? covered
      ? `対象(${v.bh > 7 ? '軒の高さ 7m 超' : '地階を除く階数 3 以上'})`
      : '対象外(軒の高さ 7m 以下かつ地階を除く階数 2 以下)'
    : covered
      ? '対象(高さ 10m 超)'
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
                const nz = SHADOW_ZONES.find((x) => x.id === e.target.value)!;
                setZone(e.target.value);
                setGo(nz.rows[0].go);
                setPlane(String(nz.planes[0]));
              }}
              className={field}
            >
              {SHADOW_ZONES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
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
            {lowType && (
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
        </div>

        <div className="space-y-3">
          {r ? (
            <>
              <div className="flex flex-wrap gap-4 items-start">
                <div className="flex-1 min-w-[260px] max-w-[420px]">
                  <DtResult
                    label={`日影時間の最大(冬至日 真太陽時 ${r.t0}〜${r.t1} 時・測定面 ${planeN}m)`}
                    value={!covered ? '規制の対象外' : ngNear || ngFar ? '超える' : '収まる'}
                    text
                    ng={covered && (ngNear || ngFar)}
                    sub={`規制 ${near} 時間 / ${far} 時間以上の日影を生じさせない(${z.label} ${row.go})`}
                  >
                    <ResultRow k="規制の対象か(別表第 4(ろ)欄)" v={coverText} />
                    <ResultRow k="5m を超え 10m 以内" v={`${hm(r.maxNear)}(${near} 時間未満であること)${ngNear ? ' · 超える' : ''}`} />
                    <ResultRow k="10m を超える範囲" v={`${hm(r.maxFar)}(${far} 時間未満であること)${ngFar ? ' · 超える' : ''}`} />
                    <ResultRow k="正午の太陽高度" v={`${((noon.alt * 180) / Math.PI).toFixed(1)}°`} />
                    <ResultRow k="計算の細かさ" v={`${r.step} m 格子・10 分刻み`} />
                  </DtResult>
                </div>
              </div>
              <div>
                <div className="yy-sec">
                  <span className="yy-sec__title">日影時間の平面図</span>
                  <span className="yy-sec__right">濃いほど長い · 赤 = 規制時間を超える · 破線 5m / 点線 10m</span>
                </div>
                <PlanMap r={r} v={v} near={near} far={far} />
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-500">建物の幅・奥行き・高さと緯度を入れると計算します。</p>
          )}

          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※ 建築基準法 第 56 条の 2・別表第 4 の規制時間と、冬至日(赤緯 −23.44°)の真太陽時の太陽位置で数えた目安です(e-Gov、2026-05-27 施行版で確認)。
            <br />※ 規制時間は「その時間以上日影となる部分を生じさせない」なので、ちょうどの時間も超える扱いです。10 分刻みで数えているので境目は数分ずれます。
            <br />※ 建物は直方体 1 棟、敷地は建物と同じ向きの長方形、平均地盤面は平らとしています。同じ敷地の 2 以上の建物は 1 つとみなす(56 条の 2 第 2 項)ため、別棟があれば合わせて検討が必要です。塔屋・パラペット、規制の異なる区域にまたがる場合(令 135 条の 13)、商業地域等の対象区域外は入っていません。
            <br />※ 確認申請の日影図は専用ソフトで作ってください。このツールは計画初期のボリューム検討用です。
          </p>
        </div>
      </div>
    </div>
  );
}
