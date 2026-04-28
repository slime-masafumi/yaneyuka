'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import screenfull from 'screenfull';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

// Leafletの動的インポート
const LeafletMap = dynamic(
  () => import('../../LeafletMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[600px] rounded overflow-hidden border border-gray-200 flex items-center justify-center">
        <p>地図を読み込み中...</p>
      </div>
    )
  }
);

interface MapViewProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
}

const MapView: React.FC<MapViewProps> = ({ searchQuery, onSearchQueryChange }) => {
  const [center, setCenter] = useState<[number, number]>([35.6812362, 139.7671248]); // 東京都庁
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleFullscreenChange = () => {
      if (screenfull.isEnabled) {
        setIsFullscreen(screenfull.isFullscreen);
      }
    };

    if (screenfull.isEnabled) {
      screenfull.on('change', handleFullscreenChange);
    }

    return () => {
      if (screenfull.isEnabled) {
        screenfull.off('change', handleFullscreenChange);
      }
    };
  }, []);

  const handleFullscreen = () => {
    if (screenfull.isEnabled && mapContainerRef.current) {
      screenfull.toggle(mapContainerRef.current);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    const tryNominatim = async () => {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        countrycodes: 'jp',
        limit: '1',
        'accept-language': 'ja'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (isNaN(lat) || isNaN(lon)) return null;
      return [lat, lon] as [number, number];
    };

    const tryGsi = async () => {
      const params = new URLSearchParams({
        q: query,
      });
      const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?${params.toString()}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0 || !data[0]?.geometry?.coordinates) return null;
      const [lon, lat] = data[0].geometry.coordinates;
      if (typeof lat !== 'number' || typeof lon !== 'number') return null;
      return [lat, lon] as [number, number];
    };

    try {
      const coords = (await tryNominatim()) ?? (await tryGsi());
      if (coords) {
        setCenter(coords);
      } else {
        alert('該当する場所が見つかりませんでした。表記を変えて再度お試しください。');
      }
    } catch (error) {
      console.error('検索エラー:', error);
      alert('検索中にエラーが発生しました。時間をおいて再度お試しください。');
    }
  };

  if (!isMounted) {
    return (
      <div className="h-[600px] rounded overflow-hidden border border-gray-200 flex items-center justify-center">
        <p>地図を読み込み中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="場所を検索..."
            className="flex-1 px-3 py-1.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:border-gray-300"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 text-[11px] bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            検索
          </button>
        </div>
      </div>

      <div className="relative map-container" ref={mapContainerRef}>
        <div className="h-[600px] rounded overflow-hidden border border-gray-200" style={{ position: 'relative', zIndex: 1 }}>
          <LeafletMap center={center} />
        </div>
        <div className="map-controls absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleFullscreen}
            className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
            title={isFullscreen ? 'フルスクリーンを終了 (ESCキー)' : 'フルスクリーンで表示'}
          >
            <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapView; 