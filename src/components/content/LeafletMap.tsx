'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const icon = L.divIcon({
  className: 'yaneyuka-map-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `<div class="yaneyuka-map-pin-inner"></div>`,
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [map, center]);
  return null;
}

interface LeafletMapProps {
  center: [number, number];
}

const LeafletMap: React.FC<LeafletMapProps> = ({ center }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // クリーンアップ: コンポーネントがアンマウントされる際にマップを破棄
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // centerが変更されたときにマップを再初期化するためのkey
  const mapKey = `${center[0]}-${center[1]}`;

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <ChangeView center={center} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={center} icon={icon} />
      </MapContainer>
    </div>
  );
};

export default LeafletMap; 