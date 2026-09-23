'use client';

/**
 * 地図 — 敷地調査・付近見取図。
 *
 * 汎用の地図では出せないものだけを載せる:
 *   - 用途地域・建蔽率・容積率・防火指定を重ねて、クリックした地点の指定を読む
 *   - 距離と方位（真北から何度）、面積（㎡・坪）を地図上で測る
 *   - 磁北の偏角（磁石で真北を出すときの補正量）
 *   - 敷地をピンとメモで保存（ログイン中は端末間で揃う）
 *   - 付近見取図として A3 横で印刷（方位記号・縮尺バー・出典つき）
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import {
  FiCrosshair, FiMapPin, FiMaximize2, FiPrinter, FiRotateCcw, FiSearch, FiTrash2, FiX,
} from 'react-icons/fi';
import {
  bearing, bearingLabel, degMin, distance, magneticDeclination, pathLength, polygonArea, toTsubo,
  ZONE_COLORS, type LatLng,
} from '@/lib/siteGeo';
import { zoneInfoAt, ZONING_MIN_ZOOM, type ZoneInfo, type ZoningStatus } from './map/zoningStore';
import { useSites, type Site } from './map/useSites';
import { BASES, type BaseId, type MapViewState } from './map/SiteMap';

const SiteMap = dynamic(() => import('./map/SiteMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-50 text-[11px] text-gray-500">地図を読み込み中…</div>,
});

type Mode = 'none' | 'distance' | 'area';
type Found = { title: string; lat: number; lng: number };

const LAST_VIEW_KEY = 'yy-map-last-view';
const TOKYO: MapViewState = { lat: 35.6812362, lng: 139.7671248, zoom: 16 };

const fmtArea = (sqm: number) => `${sqm.toFixed(2)} ㎡（${toTsubo(sqm).toFixed(2)} 坪）`;
const fmtLen = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(3)} km` : `${m.toFixed(2)} m`);

/** 住所は国土地理院、施設名は OpenStreetMap で探す（前者は番地まで強く、後者は建物名に強い） */
async function geocode(q: string): Promise<Found[]> {
  const out: Found[] = [];
  try {
    const res = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      for (const d of (Array.isArray(data) ? data : []).slice(0, 5)) {
        const [lng, lat] = d?.geometry?.coordinates ?? [];
        if (typeof lat === 'number' && typeof lng === 'number') out.push({ title: d.properties?.title ?? q, lat, lng });
      }
    }
  } catch {
    /* 次を試す */
  }
  if (out.length) return out;
  const params = new URLSearchParams({ format: 'json', q, countrycodes: 'jp', limit: '5', 'accept-language': 'ja' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .map((d: { display_name: string; lat: string; lon: string }) => ({ title: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }))
    .filter((d: Found) => !isNaN(d.lat) && !isNaN(d.lng));
}

const ZONING_NOTE: Record<ZoningStatus, string> = {
  off: '',
  'zoom-in': `拡大すると表示します（ズーム ${ZONING_MIN_ZOOM} 以上）`,
  loading: '読み込み中…',
  ok: '',
  'not-configured': '用途地域の表示は準備中です（データ提供元の利用申請中）',
  error: '一部の区域を読み込めませんでした',
};

/** 方位記号。地図は上が真北（経線が縦になる投影）なので、上向きの矢印で正しい */
const NorthArrow: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 40 52" aria-label="真北">
    <polygon points="20,2 30,34 20,28 10,34" fill="#111" />
    <polygon points="20,2 20,28 10,34" fill="#fff" stroke="#111" strokeWidth="1" />
    <text x="20" y="50" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#111">N</text>
  </svg>
);

const ZoneLines: React.FC<{ zone?: ZoneInfo | null }> = ({ zone }) =>
  zone ? (
    <dl className="grid grid-cols-[5em_1fr] gap-y-0.5 text-[11px]">
      <dt className="text-gray-500">用途地域</dt>
      <dd className="font-bold">{zone.use ?? '—'}</dd>
      <dt className="text-gray-500">建蔽率</dt>
      <dd>{zone.coverage ?? '—'}</dd>
      <dt className="text-gray-500">容積率</dt>
      <dd>{zone.floorArea ?? '—'}</dd>
      <dt className="text-gray-500">防火</dt>
      <dd>{zone.fire ?? '指定なし'}</dd>
      {zone.city && (
        <>
          <dt className="text-gray-500">決定</dt>
          <dd>
            {zone.city}
            {zone.decided ? `（${zone.decided}）` : ''}
          </dd>
        </>
      )}
    </dl>
  ) : null;

const MapView: React.FC = () => {
  const [view, setView] = useState<MapViewState & { seq: number }>({ ...TOKYO, seq: 0 });
  const currentView = useRef<MapViewState>(TOKYO);
  const [base, setBase] = useState<BaseId>('pale');
  const [zoning, setZoning] = useState(true);
  const [zoningStatus, setZoningStatus] = useState<ZoningStatus>('off');
  const [mode, setMode] = useState<Mode>('none');
  const [points, setPoints] = useState<LatLng[]>([]);
  const [selected, setSelected] = useState<LatLng | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [printSite, setPrintSite] = useState<Site | 'view' | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const { sites, add, update, remove, synced } = useSites();

  // 前回見ていた場所から始める
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(LAST_VIEW_KEY) || 'null');
      if (v && typeof v.lat === 'number') setView({ ...v, seq: 1 });
    } catch {
      /* 既定の場所のまま */
    }
  }, []);

  const flyTo = (lat: number, lng: number, zoom?: number) =>
    setView((v) => ({ lat, lng, zoom: zoom ?? Math.max(currentView.current.zoom, 17), seq: v.seq + 1 }));

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const list = await geocode(q);
      setFound(list);
      if (list[0]) flyTo(list[0].lat, list[0].lng, 17);
    } catch {
      setFound([]);
    } finally {
      setSearching(false);
    }
  };

  const onMapClick = (p: LatLng) => {
    if (mode !== 'none') {
      setPoints((ps) => [...ps, p]);
      return;
    }
    setSelected(p);
    setSelectedZone(zoneInfoAt(p));
  };

  // 用途地域の読み込みが終わったら、選んでいた地点の指定を引き直す
  useEffect(() => {
    if (zoningStatus === 'ok' && selected) setSelectedZone(zoneInfoAt(selected));
  }, [zoningStatus, selected]);

  const switchMode = (m: Mode) => {
    setMode(m === mode ? 'none' : m);
    setPoints([]);
  };

  const measure = useMemo(() => {
    const segs = points.slice(1).map((p, i) => ({ len: distance(points[i], p), brg: bearing(points[i], p) }));
    if (mode === 'area' && points.length > 2) {
      const last = points[points.length - 1];
      segs.push({ len: distance(last, points[0]), brg: bearing(last, points[0]) });
    }
    return {
      segs,
      total: mode === 'area' && points.length > 2 ? segs.reduce((s, x) => s + x.len, 0) : pathLength(points),
      area: mode === 'area' ? polygonArea(points) : 0,
    };
  }, [points, mode]);

  const pinSelected = () => {
    if (!selected) return;
    const name = prompt('名前（物件名など）', query.trim() || `地点 ${sites.length + 1}`);
    if (name === null) return;
    void add({ name: name || `地点 ${sites.length + 1}`, lat: selected.lat, lng: selected.lng, zoom: currentView.current.zoom, memo: '', zone: selectedZone ?? undefined });
  };

  const saveArea = () => {
    if (points.length < 3) return;
    const c = { lat: points.reduce((s, p) => s + p.lat, 0) / points.length, lng: points.reduce((s, p) => s + p.lng, 0) / points.length };
    const name = prompt('敷地の名前', query.trim() || `敷地 ${sites.length + 1}`);
    if (name === null) return;
    void add({
      name: name || `敷地 ${sites.length + 1}`,
      ...c,
      zoom: currentView.current.zoom,
      memo: '',
      polygon: points,
      area: measure.area,
      zone: zoneInfoAt(c) ?? undefined,
    });
    setMode('none');
    setPoints([]);
  };

  const declination = selected ? magneticDeclination(selected) : magneticDeclination(currentView.current);

  const btn = (active: boolean) =>
    `px-2 py-1 text-[11px] border ${active ? 'bg-[#3b3b3b] text-white border-[#3b3b3b]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;

  return (
    <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <h3 className="text-[13px] font-medium">地図</h3>
        <p className="text-[11px] mt-0.5">
          敷地調査と付近見取図。用途地域・建蔽率・容積率・防火指定を重ねて読み、距離・方位・面積を測って、敷地ごとに保存・印刷できます
        </p>
      </div>

      <div className="p-3 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 h-full">
          {/* 左：操作 */}
          <div className="space-y-3 min-h-0 overflow-y-auto pr-1 order-2 lg:order-1">
            {/* 検索 */}
            <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
              <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); void search(); }}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="住所・地番・施設名"
                  className="flex-1 px-2 py-1 text-[11px]"
                />
                <button type="submit" className="px-3 py-1 text-[11px] bg-[#3b3b3b] text-white flex items-center gap-1" disabled={searching}>
                  <FiSearch /> {searching ? '…' : '検索'}
                </button>
              </form>
              {found && found.length === 0 && <p className="text-[11px] text-gray-500">見つかりませんでした。表記を変えてお試しください。</p>}
              {found && found.length > 1 && (
                <ul className="text-[11px] divide-y border bg-white max-h-[120px] overflow-y-auto">
                  {found.map((f, i) => (
                    <li key={i}>
                      <button type="button" className="w-full text-left px-2 py-1 hover:bg-gray-50 truncate" onClick={() => flyTo(f.lat, f.lng, 17)} title={f.title}>
                        {f.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 表示 */}
            <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
              <div className="text-[11px] font-bold text-gray-600">下図</div>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(BASES) as BaseId[]).map((id) => (
                  <button key={id} type="button" className={btn(base === id)} onClick={() => setBase(id)}>
                    {BASES[id].label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[11px] pt-1">
                <input type="checkbox" checked={zoning} onChange={(e) => setZoning(e.target.checked)} />
                用途地域・防火地域を重ねる
              </label>
              {zoning && ZONING_NOTE[zoningStatus] && (
                <p className={`text-[11px] ${zoningStatus === 'not-configured' || zoningStatus === 'error' ? 'text-orange-700' : 'text-gray-500'}`}>
                  {ZONING_NOTE[zoningStatus]}
                </p>
              )}
              {zoning && (
                <button type="button" className="text-[11px] underline text-gray-600" onClick={() => setShowLegend((v) => !v)}>
                  凡例を{showLegend ? '閉じる' : '見る'}
                </button>
              )}
              {zoning && showLegend && (
                <ul className="text-[10px] grid grid-cols-1 gap-0.5">
                  {ZONE_COLORS.map(([name, color]) => (
                    <li key={name} className="flex items-center gap-1">
                      <span className="w-3 h-3 border border-gray-400 shrink-0" style={{ background: color, opacity: 0.7 }} />
                      {name}
                    </li>
                  ))}
                  <li className="flex items-center gap-1">
                    <span className="w-3 border-t-2 border-dashed border-[#c62828] shrink-0" /> 防火地域
                  </li>
                  <li className="flex items-center gap-1">
                    <span className="w-3 border-t-2 border-dashed border-[#ef6c00] shrink-0" /> 準防火地域
                  </li>
                  <li className="text-gray-500 mt-1">色は都市計画図の慣習に合わせた目安です。指定の確認は必ず自治体の都市計画図で。</li>
                </ul>
              )}
            </div>

            {/* 計測 */}
            <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
              <div className="text-[11px] font-bold text-gray-600">測る</div>
              <div className="flex gap-1">
                <button type="button" className={btn(mode === 'none')} onClick={() => switchMode('none')}>
                  <FiCrosshair className="inline mr-1" />地点を調べる
                </button>
                <button type="button" className={btn(mode === 'distance')} onClick={() => switchMode('distance')}>距離・方位</button>
                <button type="button" className={btn(mode === 'area')} onClick={() => switchMode('area')}>面積</button>
              </div>
              {mode !== 'none' && (
                <>
                  <p className="text-[11px] text-gray-500">
                    {mode === 'distance' ? '地図をクリックして点を打つと、区間ごとの長さと方位が出ます。' : '敷地の角を順にクリックすると、囲んだ面積が出ます。'}
                  </p>
                  {measure.segs.length > 0 && (
                    <table className="w-full text-[11px] bg-white border">
                      <thead className="bg-gray-100">
                        <tr><th className="text-left px-1">区間</th><th className="text-right px-1">長さ</th><th className="text-right px-1">方位（真北から）</th></tr>
                      </thead>
                      <tbody>
                        {measure.segs.map((s, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-1">{i + 1}–{i + 2 > points.length ? 1 : i + 2}</td>
                            <td className="text-right px-1 tabular-nums">{s.len.toFixed(2)} m</td>
                            <td className="text-right px-1 tabular-nums">{bearingLabel(s.brg)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="text-[11px] space-y-0.5">
                    <div>{mode === 'area' ? '周長' : '合計'}: <b className="tabular-nums">{fmtLen(measure.total)}</b></div>
                    {mode === 'area' && points.length > 2 && <div>面積: <b className="tabular-nums">{fmtArea(measure.area)}</b></div>}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className={btn(false)} onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}>
                      <FiRotateCcw className="inline mr-1" />1つ戻す
                    </button>
                    <button type="button" className={btn(false)} onClick={() => setPoints([])} disabled={!points.length}>クリア</button>
                    {mode === 'area' && points.length > 2 && (
                      <button type="button" className={btn(true)} onClick={saveArea}>敷地として保存</button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">地図上の概算です（誤差 0.1% 程度）。確認申請の求積には測量図を使ってください。</p>
                </>
              )}

              {mode === 'none' && (
                selected ? (
                  <div className="bg-white border p-2 space-y-2">
                    <div className="text-[11px] text-gray-500 tabular-nums">
                      {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                    </div>
                    {zoning && zoningStatus !== 'not-configured' && (
                      selectedZone ? <ZoneLines zone={selectedZone} /> : (
                        <p className="text-[11px] text-gray-500">
                          {zoningStatus === 'zoom-in' ? '拡大すると用途地域を読めます' : zoningStatus === 'loading' ? '読み込み中…' : '都市計画区域外か、データがありません'}
                        </p>
                      )
                    )}
                    <p className="text-[11px]">
                      磁北は真北から<b>西へ {degMin(declination)}</b>
                      <span className="block text-[10px] text-gray-400">国土地理院 磁気図2020.0年値の近似式。磁石で真北を出すときの補正量</span>
                    </p>
                    <button type="button" className={btn(true)} onClick={pinSelected}>
                      <FiMapPin className="inline mr-1" />この地点を保存
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">地図をクリックすると、その地点の用途地域・建蔽率・容積率・防火指定と磁北の偏角が出ます。</p>
                )
              )}
            </div>

            {/* 保存した敷地 */}
            <div className="bg-gray-50 p-3 border border-[#3b3b3b] space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-gray-600">保存した敷地（{sites.length}）</div>
                <span className="text-[10px] text-gray-400">{synced ? '端末間で同期' : 'このブラウザに保存・ログインで同期'}</span>
              </div>
              {sites.length === 0 && <p className="text-[11px] text-gray-500">地点や求積した敷地を保存すると、ここに並びます。</p>}
              {sites.map((s) => (
                <div key={s.id} className="bg-white border p-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <input
                      defaultValue={s.name}
                      onBlur={(e) => e.target.value !== s.name && void update(s.id, { name: e.target.value || s.name })}
                      className="flex-1 min-w-0 px-1 py-0.5 text-[11px] font-bold"
                    />
                    <button type="button" title="地図で見る" className="p-1 text-gray-600" onClick={() => flyTo(s.lat, s.lng, s.zoom)}>
                      <FiMaximize2 />
                    </button>
                    <button type="button" title="付近見取図を印刷" className="p-1 text-gray-600" onClick={() => { flyTo(s.lat, s.lng, s.zoom); setPrintSite(s); }}>
                      <FiPrinter />
                    </button>
                    <button type="button" title="削除" className="p-1 text-red-600" onClick={() => confirm(`「${s.name}」を削除しますか？`) && void remove(s.id)}>
                      <FiTrash2 />
                    </button>
                  </div>
                  {s.area ? <div className="text-[11px]">敷地面積（概算）: {fmtArea(s.area)}</div> : null}
                  <ZoneLines zone={s.zone} />
                  <textarea
                    defaultValue={s.memo}
                    onBlur={(e) => e.target.value !== s.memo && void update(s.id, { memo: e.target.value })}
                    placeholder="メモ（前面道路の幅員、接道長さ、高度地区など）"
                    rows={2}
                    className="w-full px-1 py-0.5 text-[11px]"
                  />
                </div>
              ))}
            </div>

            <button type="button" className="w-full py-2 text-[11px] bg-[#3b3b3b] text-white flex items-center justify-center gap-1" onClick={() => setPrintSite('view')}>
              <FiPrinter /> 今の表示を付近見取図として印刷
            </button>
          </div>

          {/* 右：地図 */}
          <div ref={mapBoxRef} className="relative border border-[#3b3b3b] min-h-[360px] h-full order-1 lg:order-2" style={{ zIndex: 1 }}>
            <SiteMap
              view={view}
              base={base}
              zoning={zoning}
              measureMode={mode}
              points={points}
              sites={sites}
              selected={selected}
              onMapClick={onMapClick}
              onViewChange={(v) => {
                currentView.current = v;
                try { localStorage.setItem(LAST_VIEW_KEY, JSON.stringify(v)); } catch { /* 覚えられなくても動く */ }
              }}
              onZoningStatus={setZoningStatus}
              onSiteClick={(id) => {
                const s = sites.find((x) => x.id === id);
                if (s) { setSelected({ lat: s.lat, lng: s.lng }); setSelectedZone(s.zone ?? zoneInfoAt(s)); }
              }}
            />
            <div className="absolute top-2 right-2 z-[500] bg-white/90 px-1 pt-1 pointer-events-none" title="地図の上が真北">
              <NorthArrow size={22} />
            </div>
            {mode !== 'none' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[500] bg-[#1565c0] text-white text-[11px] px-2 py-1">
                {mode === 'distance' ? '距離・方位を測っています' : '面積を測っています'} — クリックで点を追加
              </div>
            )}
          </div>
        </div>
      </div>

      {printSite && (
        <PrintSheet
          site={printSite === 'view' ? null : printSite}
          view={printSite === 'view' ? currentView.current : { lat: printSite.lat, lng: printSite.lng, zoom: printSite.zoom }}
          base={base === 'photo' ? 'pale' : base}
          zoning={zoning && zoningStatus !== 'not-configured'}
          sites={printSite === 'view' ? sites : [printSite]}
          onClose={() => setPrintSite(null)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 付近見取図（A3 横）
// ---------------------------------------------------------------------------

const PrintSheet: React.FC<{
  site: Site | null;
  view: MapViewState;
  base: BaseId;
  zoning: boolean;
  sites: Site[];
  onClose: () => void;
}> = ({ site, view, base, zoning, sites, onClose }) => {
  const [title, setTitle] = useState(site?.name ?? '');
  const [scale, setScale] = useState(0.5);
  // A3 横（420×297mm ≒ 1587×1123px）を画面に収まる大きさで見せる。印刷時は等倍に戻す（globals.css）
  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerWidth - 48) / 1587, (window.innerHeight - 120) / 1123, 1));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const sheetView = useMemo(() => ({ ...view, seq: 0 }), [view]);

  // body 直下に出す。上のナビは z-index が最大値で何を重ねても隠れるので、その下から始める
  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[10000] bg-black/60 flex flex-col items-center overflow-auto"
      style={{ top: 'var(--nav-height, 35px)' }}
    >
      <div className="no-print flex items-center gap-2 bg-white px-3 py-2 mt-3 border border-[#3b3b3b]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="物件名（図面に入ります）" className="px-2 py-1 text-[12px] w-[240px]" />
        <button type="button" className="px-3 py-1 text-[12px] bg-[#3b3b3b] text-white flex items-center gap-1" onClick={() => window.print()}>
          <FiPrinter /> 印刷（A3 横）
        </button>
        <button type="button" className="px-3 py-1 text-[12px] border flex items-center gap-1" onClick={onClose}>
          <FiX /> 閉じる
        </button>
        <span className="text-[11px] text-gray-500">航空写真は印刷向きでないため淡色地図で出します</span>
      </div>
      <div className="yy-print-scaler mt-3 mb-6" style={{ width: 1587 * scale, height: 1123 * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} className="yy-print-scaler">
          <div id="print-target-container" className="bg-white flex flex-col" style={{ width: '420mm', height: '297mm', padding: '10mm', boxSizing: 'border-box' }}>
            <div className="flex items-end justify-between border-b-2 border-black pb-2 mb-3">
              <div>
                <div className="text-[28px] font-bold tracking-widest">付近見取図</div>
                {title && <div className="text-[18px] mt-1">{title}</div>}
              </div>
              <div className="text-right text-[12px] leading-relaxed">
                {site?.zone?.use && (
                  <div>
                    {site.zone.use}　建蔽率 {site.zone.coverage ?? '—'}　容積率 {site.zone.floorArea ?? '—'}　{site.zone.fire ?? ''}
                  </div>
                )}
                {site?.area ? <div>敷地面積（概算）{site.area.toFixed(2)} ㎡</div> : null}
                <div>作成日 {today}</div>
              </div>
            </div>
            <div className="relative flex-1 border border-black">
              <SiteMap
                view={sheetView}
                base={base}
                zoning={zoning}
                measureMode="none"
                points={[]}
                sites={sites}
                selected={null}
                interactive={false}
              />
              <div className="absolute top-3 right-3 z-[500] bg-white px-2 pt-2">
                <NorthArrow size={48} />
              </div>
            </div>
            <div className="flex justify-between text-[11px] mt-2">
              <span>方位は真北（地図の上）。縮尺は左下の縮尺バーによる。</span>
              <span>
                地図: {base === 'osm' ? '© OpenStreetMap contributors' : '国土地理院 地理院タイル'}
                {zoning ? '／用途地域: 国土交通省 不動産情報ライブラリ' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MapView;
