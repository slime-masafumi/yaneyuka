'use client';
/**
 * 天空率(法 56 条 7 項)の測定結果の表。斜線制限(SetbackCalc)とボリューム検討(VolumeStudy)だけが使う。
 * 計算は src/lib/skyFactor.ts。2026-11-16
 * 判定は「適合 / 不適合 / 要確認」。計画と適合の差が誤差の範囲(SKY_TOL)なら要確認。
 */
import React from 'react';
import { DIR_JA, SKY_TOL, pct3, type SkyCheck } from '@/lib/skyFactor';

const KIND: Record<SkyCheck['kind'], string> = { road: '道路', side: '隣地', north: '北側' };

export const skyVerdict = (c: SkyCheck) => (c.skipped ? 'かからない' : c.close ? '要確認' : c.ok ? '適合' : '不適合');

export default function SkyTable({ checks, needed }: { checks: SkyCheck[]; /** 斜線を超えていて天空率が要る種類。無ければ全部を判定として出す */ needed?: Set<SkyCheck['kind']> }) {
  return (
    <table className="w-full text-[11.5px]">
      <thead>
        <tr>
          <th className="text-left py-1 pr-2">測定</th>
          <th className="text-left py-1 pr-2">測定点</th>
          <th className="text-left py-1 pr-2">いちばん差の小さい点(計画 / 適合)</th>
          <th className="text-left py-1 pr-2">判定</th>
          <th className="text-left py-1">根拠</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c) => {
          const w = c.worst >= 0 ? c.points[c.worst] : null;
          const need = !needed || needed.has(c.kind);
          return (
            <tr key={`${c.kind}-${c.dir}`} className="border-b border-[#e3e1db]">
              <td className="py-1 pr-2 align-top whitespace-nowrap">
                {KIND[c.kind]}({DIR_JA[c.dir]})
              </td>
              <td className="py-1 pr-2 align-top text-[10.5px]">
                {c.skipped ? c.skipped : `${c.points.length} 点 · ${c.line}`}
              </td>
              <td className="py-1 pr-2 align-top tabular-nums">
                {w ? `${pct3(w.plan)} / ${pct3(w.fit)}(差 ${(c.margin * 100).toFixed(3)} ポイント)` : '—'}
              </td>
              <td className="py-1 pr-2 align-top whitespace-nowrap">
                {skyVerdict(c)}
                {!need && !c.skipped ? '(斜線に収まる)' : ''}
              </td>
              <td className="py-1 align-top text-[10.5px] text-gray-500">{c.basis}</td>
            </tr>
          );
        })}
        <tr>
          <td colSpan={5} className="pt-1 text-[10px] text-gray-400 leading-relaxed">
            天空率 =(想定半球の水平投影面積 − 建築物と敷地の地盤の正射影の面積)/ 想定半球の水平投影面積(令 135 条の 5)。計画建築物の天空率が、すべての測定点で適合建築物の天空率以上なら適合。
            方位方向を 0.2° 以下の区間に分けた数値積分(仰角方向は厳密)で、差が {(SKY_TOL * 100).toFixed(2)} ポイント未満は要確認。
          </td>
        </tr>
      </tbody>
    </table>
  );
}
