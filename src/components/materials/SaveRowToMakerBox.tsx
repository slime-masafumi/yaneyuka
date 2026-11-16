'use client';
/**
 * 建材ページのメーカー表の行末に出す「資料箱」(2026-11-16)。
 * 共通の SaveToMakerBox は社名だけで makers.json を引くため、分類をまたいだ最初の行のリンク
 * (屋根のページで押しても外壁のカタログ)が控えられていた。ここは押した行(分類 + 小分類 + 群)の
 * リンクを先に控え、その行に無い列だけ同じ社のほかの行で埋める(mergeMaker の prefer)。
 * 見た目と保存先は SaveToMakerBox と同じ。
 */
import React, { useState } from 'react';
import { FiCheck, FiPlus } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthContext';
import makers from '@/data/makers.json';
import { boxId, mergeMaker, type MakerData } from '@/lib/makerBox';
import { useMakerBox, saveMakerBoxItem, removeMakerBoxItem } from '@/lib/useMakerBox';

const DATA = makers as unknown as MakerData;

export default function SaveRowToMakerBox({ name, category, page, group = '' }: { name: string; category: string; page: string; group?: string }) {
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
        const m = mergeMaker(DATA, name, { category, page, group });
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
      className={`ml-1 inline-flex items-center gap-0.5 text-[11px] whitespace-nowrap ${saved ? 'text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-800'}`}
      title={saved ? 'メーカー資料箱から外す' : 'マイページのメーカー資料箱に控える（この行の商品ページ・カタログ・CAD などを 1 枚に）'}
    >
      {saved ? <FiCheck className="w-3 h-3" aria-hidden /> : <FiPlus className="w-3 h-3" aria-hidden />}
      資料箱
    </button>
  );
}
