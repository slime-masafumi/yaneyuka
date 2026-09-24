'use client';
/**
 * 設計計画 › 面積表。
 * 面積表は表計算のテンプレート（式つき）として作ってある。ここから表計算をテンプレート付きで開く。
 * 表計算は Excel の読み書き・印刷・共有まで持っているので、別の面積表ツールを作るより強い。
 */
import React from 'react';
import { PENDING_TEMPLATE_KEY } from '../general-tools/spreadsheet/templates';

export default function AreaTableLauncher() {
  const open = (id: string) => {
    try {
      sessionStorage.setItem(PENDING_TEMPLATE_KEY, id);
    } catch {
      /* 渡せなければ表計算の「テンプレートから作成」で選んでもらう */
    }
    window.location.href = '/?m=general-tools&t=sheet';
  };
  return (
    <div className="p-6 text-[12px] text-gray-700 space-y-3 max-w-[640px]">
      <p>
        面積表は<b>表計算のテンプレート</b>で作れます。室ごとの幅×奥行から面積と坪を出し、延べ面積・建蔽率・容積率まで式が入っています。
        Excel での書き出し・印刷も表計算の機能がそのまま使えます。
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => open('area')} className="px-4 py-2 bg-[#3b3b3b] text-white">
          表計算で面積表を開く
        </button>
        <button type="button" onClick={() => open('finish')} className="px-4 py-2 border border-[#3b3b3b] bg-white">
          仕上表
        </button>
        <button type="button" onClick={() => open('door')} className="px-4 py-2 border border-[#3b3b3b] bg-white">
          建具表
        </button>
      </div>
      <p className="text-[10px] text-gray-500">ログインしていると新しいシートとして保存されます。</p>
    </div>
  );
}
