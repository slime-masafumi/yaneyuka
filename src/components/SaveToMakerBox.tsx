'use client';
/**
 * 建材ページのメーカー行の末尾に出す「資料箱へ」。押すとそのメーカーの 6 点のリンクを
 * マイページ（ブックマーク → メーカー資料箱）に 1 枚のカードとして控える。
 */
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import makers from '@/data/makers.json';
import { boxId, mergeMaker, type MakerData } from '@/lib/makerBox';
import { useMakerBox, saveMakerBoxItem, removeMakerBoxItem } from '@/lib/useMakerBox';

const DATA = makers as unknown as MakerData;

export default function SaveToMakerBox({ name }: { name: string }) {
  const { currentUser } = useAuth();
  const box = useMakerBox(currentUser?.uid);
  const [busy, setBusy] = useState(false);
  const id = boxId(name);
  const saved = box.some((b) => b.id === id);

  const toggle = async () => {
    if (!currentUser) {
      alert('メーカー資料箱を使うには会員登録（無料）が必要です。');
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        await removeMakerBoxItem(currentUser.uid, id);
      } else {
        const m = mergeMaker(DATA, name);
        if (!m) return;
        await saveMakerBoxItem(currentUser.uid, { id, ...m, extra: [], note: '', createdAt: Date.now() });
      }
    } catch (e) {
      console.error('資料箱の保存に失敗', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`ml-1 text-[11px] whitespace-nowrap ${saved ? 'text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-800'}`}
      title={saved ? 'メーカー資料箱から外す' : 'マイページのメーカー資料箱に控える（商品ページ・カタログ・CAD などを 1 枚に）'}
    >
      {saved ? '✓資料箱' : '＋資料箱'}
    </button>
  );
}
