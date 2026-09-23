'use client';
/**
 * 敷地調査マップの地図部分（Leaflet）。操作と保存は MapView が持ち、ここは描くことに専念する。
 * SSR できないので、MapView から next/dynamic（ssr: false）で読む。
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { distance, zoneColor, type LatLng } from '@/lib/siteGeo';
import { loadZoning, type ZoneFeature, type ZoneLayer, type ZoningStatus } from './zoningStore';
import type { Site } from './useSites';

export type BaseId = 'pale' | 'std' | 'photo' | 'osm';

const GSI_ATTR = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener noreferrer">国土地理院</a>';

export const BASES: Record<BaseId, { label: string; url: string; attribution: string; maxNativeZoom: number }> = {
  pale: { label: '淡色地図', url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', attribution: GSI_ATTR, maxNativeZoom: 18 },
  std: { label: '標準地図', url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', attribution: GSI_ATTR, maxNativeZoom: 18 },
  photo: { label: '航空写真', url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', attribution: GSI_ATTR, maxNativeZoom: 18 },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
};

const pinIcon = L.divIcon({
  className: 'yaneyuka-map-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<div class="yaneyuka-map-pin-inner"></div>',
});

export type MapViewState = { lat: number; lng: number; zoom: number };

type Props = {
  /** seq が変わったときだけ地図をそこへ動かす（利用者のスクロールを毎回戻さないため） */
  view: MapViewState & { seq: number };
  base: BaseId;
  zoning: boolean;
  measureMode: 'none' | 'distance' | 'area';
  points: LatLng[];
  sites: Site[];
  selected: LatLng | null;
  interactive?: boolean;
  onMapClick?: (p: LatLng) => void;
  onViewChange?: (v: MapViewState) => void;
  onZoningStatus?: (s: ZoningStatus) => void;
  onSiteClick?: (id: string) => void;
  /** 下図のタイルを読み終えたとき（印刷の合図に使う） */
  onTilesLoaded?: () => void;
};

function ViewSync({ view }: { view: Props['view'] }) {
  const map = useMap();
  useEffect(() => {
    map.setView([view.lat, view.lng], view.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, view.seq]);
  return null;
}

type LoadedTile = { key: string; layer: ZoneLayer; features: ZoneFeature[] };

function Events({ onMapClick, onViewChange, zoning, onZoning }: {
  onMapClick?: (p: LatLng) => void;
  onViewChange?: (v: MapViewState) => void;
  zoning: boolean;
  onZoning: (status: ZoningStatus, tiles: LoadedTile[] | null) => void;
}) {
  const reqRef = useRef(0);
  const refresh = (map: L.Map) => {
    const c = map.getCenter();
    onViewChange?.({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    if (!zoning) return onZoning('off', []);
    const b = map.getBounds();
    const req = ++reqRef.current;
    onZoning('loading', null);
    loadZoning({ lat: b.getSouth(), lng: b.getWest() }, { lat: b.getNorth(), lng: b.getEast() }, map.getZoom()).then((r) => {
      // 古い要求の結果で上書きしない
      if (req === reqRef.current) onZoning(r.status, r.tiles);
    });
  };
  const map = useMapEvents({
    click: (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
    moveend: () => refresh(map),
  });
  useEffect(() => {
    refresh(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoning]);
  return null;
}

const mid = (a: LatLng, b: LatLng): [number, number] => [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];

const SiteMap: React.FC<Props> = ({
  view,
  base,
  zoning,
  measureMode,
  points,
  sites,
  selected,
  interactive = true,
  onMapClick,
  onViewChange,
  onZoningStatus,
  onSiteClick,
  onTilesLoaded,
}) => {
  const [zoneTiles, setZoneTiles] = useState<LoadedTile[]>([]);
  const b = BASES[base];
  const segments = measureMode === 'area' && points.length > 2 ? [...points, points[0]] : points;

  return (
    <MapContainer
      center={[view.lat, view.lng]}
      zoom={view.zoom}
      maxZoom={19}
      style={{ height: '100%', width: '100%' }}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive && measureMode === 'none'}
      attributionControl
    >
      <ViewSync view={view} />
      <Events
        onMapClick={interactive ? onMapClick : undefined}
        onViewChange={onViewChange}
        zoning={zoning}
        onZoning={(status, tiles) => {
          onZoningStatus?.(status);
          if (tiles) setZoneTiles(tiles);
        }}
      />
      <TileLayer
        key={base}
        url={b.url}
        attribution={b.attribution}
        maxNativeZoom={b.maxNativeZoom}
        maxZoom={19}
        eventHandlers={{ load: () => onTilesLoaded?.() }}
      />
      <ScaleControl position="bottomleft" imperial={false} />

      {zoning &&
        zoneTiles.map((t) =>
          t.layer === 'youto' ? (
            <GeoJSON
              key={t.key}
              data={{ type: 'FeatureCollection', features: t.features } as GeoJSON.FeatureCollection}
              interactive={false}
              style={(f) => ({
                color: zoneColor(f?.properties?.use_area_ja),
                weight: 1,
                fillColor: zoneColor(f?.properties?.use_area_ja),
                fillOpacity: 0.35,
              })}
            />
          ) : (
            <GeoJSON
              key={t.key}
              data={{ type: 'FeatureCollection', features: t.features } as GeoJSON.FeatureCollection}
              interactive={false}
              style={(f) => ({
                color: String(f?.properties?.fire_prevention_ja ?? '').startsWith('防火') ? '#c62828' : '#ef6c00',
                weight: 2,
                dashArray: '6 4',
                fill: false,
              })}
            />
          )
        )}

      {/* 保存した敷地 */}
      {sites.map((s) => (
        <React.Fragment key={s.id}>
          {s.polygon && s.polygon.length > 2 && (
            <Polygon
              positions={s.polygon.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#3b3b3b', weight: 2, fillOpacity: 0.08 }}
              interactive={false}
            />
          )}
          <Marker
            position={[s.lat, s.lng]}
            icon={pinIcon}
            eventHandlers={{ click: () => onSiteClick?.(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent={!interactive}>
              {s.name}
            </Tooltip>
          </Marker>
        </React.Fragment>
      ))}

      {/* 計測中の図形 */}
      {points.length > 1 &&
        (measureMode === 'area' && points.length > 2 ? (
          <Polygon
            positions={points.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: '#1565c0', weight: 2, fillOpacity: 0.15 }}
            interactive={false}
          />
        ) : (
          <Polyline positions={points.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#1565c0', weight: 3 }} interactive={false} />
        ))}
      {segments.slice(1).map((p, i) => (
        <CircleMarker key={`seg-${i}`} center={mid(segments[i], p)} radius={0} interactive={false}>
          <Tooltip permanent direction="center" className="yy-map-seg">
            {distance(segments[i], p).toFixed(2)}m
          </Tooltip>
        </CircleMarker>
      ))}
      {points.map((p, i) => (
        <CircleMarker
          key={`pt-${i}`}
          center={[p.lat, p.lng]}
          radius={4}
          pathOptions={{ color: '#1565c0', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
          interactive={false}
        />
      ))}

      {selected && measureMode === 'none' && (
        <CircleMarker
          center={[selected.lat, selected.lng]}
          radius={7}
          pathOptions={{ color: '#dc2626', weight: 2, fillOpacity: 0.15 }}
          interactive={false}
        />
      )}
    </MapContainer>
  );
};

export default SiteMap;
