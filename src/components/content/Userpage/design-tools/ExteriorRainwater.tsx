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
      <div className="px-4 pt-2">
        <div className="yy-tabs" style={{ marginBottom: 0 }}>
          {([
            { id: 'flow', label: '排水能力', icon: <FiDroplet /> },
            { id: 'load', label: '管渠の耐荷重', icon: <FiTruck /> },
          ] as const).map((t) => (
            <button key={t.id} type="button" className="yy-tab" aria-pressed={mode === t.id} onClick={() => setMode(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'flow' ? <RainwaterCalculation mode="exterior" hideTabBar /> : <PipeLoadCheck />}
    </div>
  );
}
