'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [isMounted, setIsMounted] = useState(false);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // クライアントサイドでのみマウント
    setIsMounted(true);

    return () => {
      // クリーンアップ: マップインスタンスを破棄
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // 既に破棄されている場合は無視
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // centerが変更されたときにマップを再初期化するためのkey
  // JSON.stringifyで一意なキーを生成
  const mapKey = isMounted ? JSON.stringify(center) : 'initial';

  if (!isMounted) {
    return <div style={{ height: '100%', width: '100%', background: '#f0f0f0' }}>Loading Map...</div>;
  }

  return (
    // 親divにkeyを設定することで、ReactにDOMごと破棄・再生成させる
    <div key={mapKey} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        ref={mapInstanceRef}
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