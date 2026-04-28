'use client';

import React, { useState, useEffect } from 'react';

interface WeatherData {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface WeatherLocation {
  value: string;
  label: string;
}

// ラベルを英語に変更
const LOCATIONS: WeatherLocation[] = [
  { value: '43.0642,141.3469', label: 'Sapporo' },
  { value: '38.2682,140.8694', label: 'Sendai' },
  { value: '35.6895,139.6917', label: 'Tokyo' },
  { value: '35.4478,139.6425', label: 'Yokohama' },
  { value: '35.1815,136.9066', label: 'Nagoya' },
  { value: '34.6937,135.5023', label: 'Osaka' },
  { value: '34.3963,132.4594', label: 'Hiroshima' },
  { value: '33.5904,130.4017', label: 'Fukuoka' },
  { value: '26.2124,127.6809', label: 'Naha' },
];

// シンプルなSVGアイコンコンポーネント
const SimpleWeatherIcon: React.FC<{ code: number }> = ({ code }) => {
  // 晴れ (0, 1)
  if (code <= 1) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD4A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    );
  }
  // 曇り (2, 3, 45, 48)
  if (code <= 48) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
      </svg>
    );
  }
  // 雨 (51-67, 80-82)
  if (code <= 67 || (code >= 80 && code <= 82)) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B0E0E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a9.5 9.5 0 0 0-19 0z"></path>
        <line x1="12" y1="5.5" x2="12" y2="2"></line>
        <path d="M12 15v6"></path>
        <path d="M12 21a2 2 0 1 0 4 0"></path>
      </svg>
    );
  }
  // 雪 (71-77, 85-86)
  if (code <= 77 || (code >= 85 && code <= 86)) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="22"></line>
        <line x1="12" y1="2" x2="12" y2="22" transform="rotate(60 12 12)"></line>
        <line x1="12" y1="2" x2="12" y2="22" transform="rotate(120 12 12)"></line>
      </svg>
    );
  }
  // 雷 (95-99)
  if (code <= 99) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    );
  }
  return <span>-</span>;
};

const WeatherWidget: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string>('35.6895,139.6917');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 日付ラベルを取得（英語表記または短縮表記に変更可、ここでは日本語のまま）
  const getDayName = (dateString: string, index: number): string => {
    if (index === 0) return 'Today';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const fetchWeather = async (lat: string, lon: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed');

      const data = await response.json();
      setWeatherData(data.daily);
    } catch (err) {
      console.error(err);
      setError('Error');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedLocation(value);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_weather_location', value);
    }

    const [lat, lon] = value.split(',');
    fetchWeather(lat, lon);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedLocation = localStorage.getItem('user_weather_location');
    if (savedLocation) {
      setSelectedLocation(savedLocation);
      const [lat, lon] = savedLocation.split(',');
      fetchWeather(lat, lon);
    } else {
      const [lat, lon] = selectedLocation.split(',');
      fetchWeather(lat, lon);
    }
  }, []);

  return (
    <div className="weather-widget">
      {/* 天気情報エリア */}
      <div className="weather-container">
        {loading ? (
          <span className="status-text">Loading...</span>
        ) : error ? (
          <span className="status-text">Error</span>
        ) : weatherData ? (
          weatherData.time.slice(0, 7).map((time, index) => (
            <div key={time} className="weather-item">
              <span className="weather-date">{getDayName(time, index)}</span>
              <span className="weather-icon">
                <SimpleWeatherIcon code={weatherData.weathercode[index]} />
              </span>
              <span className="weather-temp">
                {Math.round(weatherData.temperature_2m_max[index])}°
              </span>
            </div>
          ))
        ) : null}
      </div>

      {/* 場所選択エリア（右寄せ） */}
      <div className="location-container">
        <select
          id="weather-location"
          value={selectedLocation}
          onChange={handleLocationChange}
          className="location-select"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>

      <style jsx>{`
        .weather-widget {
          display: flex;
          flex-direction: column; /* 縦並び */
          align-items: flex-end;  /* 右寄せ */
          gap: 2px;
          padding: 4px;
        }

        .weather-container {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 2px;
        }

        .weather-container::-webkit-scrollbar {
          display: none;
        }

        .weather-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 24px;
        }

        .weather-date {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 2px;
          font-family: sans-serif;
        }

        .weather-icon {
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1px;
        }

        .weather-temp {
          font-size: 9px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .status-text {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
        }

        .location-container {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }

        .location-select {
          font-size: 10px;
          padding: 0;
          border: none; /* 外枠なし */
          background: transparent; /* 背景透明 */
          color: rgba(255, 255, 255, 0.5); /* 目立たない色 */
          cursor: pointer;
          outline: none;
          text-align: right;
          font-family: sans-serif;
          appearance: none; /* デフォルトの矢印を消す */
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .location-select:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        /* ドロップダウンの選択肢 */
        .location-select option {
          background: #ffffff; /* 背景白 */
          color: #333333;      /* 文字黒 */
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default WeatherWidget;
