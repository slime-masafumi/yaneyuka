'use client';
/**
 * 外構設計 › 外構雨水。排水能力（マニング公式）と管渠の耐荷重をボタンで切り替える。
 * ボタンの見た目は 業務管理・アラーム に合わせてある（本文側に並べる細い枠のボタン）。
 */
import React, { useState } from 'react';
import { FiDroplet, FiTruck } from 'react-icons/fi';
import RainwaterCalculation from './2_RainwaterCalculation';
import PipeLoadCheck from './PipeLoadCheck';

type Mode = 'flow' | 'load';

export default function ExteriorRainwater() {
  const [mode, setMode] = useState<Mode>('flow');
  return (
    <div className="w-full bg-white">
      <div className="px-4 pt-3">
        <div className="flex gap-2">
          {([
            { id: 'flow', label: '排水能力', icon: <FiDroplet /> },
            { id: 'load', label: '管渠の耐荷重', icon: <FiTruck /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`px-4 py-1.5 text-xs border transition-colors flex items-center gap-1.5 ${
                mode === t.id ? 'bg-[#3b3b3b] text-white border-[#3b3b3b] font-bold' : 'bg-white text-gray-700 border-[#3b3b3b] hover:bg-gray-100'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'flow' ? <RainwaterCalculation mode="exterior" hideTabBar /> : <PipeLoadCheck />}
    </div>
  );
}
