'use client';
/**
 * 建材ページのメーカー行で「お問い合わせ」「カタログ」「サンプル」を押したら、
 * 担当者連絡先のやり取りの履歴に 1 行残す（手で書かなくても、いつどの会社に当たったかが残る）。
 *
 * - ログインしていなければ何もしない
 * - リンクの遷移は止めない（記録は裏で投げっぱなし。失敗しても開く方を優先）
 * - 同じ会社・同じ窓口は 1 日 1 回まで（何度か開き直しても履歴が埋まらないように）
 *
 * 記録の書き方は Maker conect と同じ（recordContactLog: 同じ会社のカードに積み、無ければ会社名だけのカードを作る）。
 */
import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { entryFromMakerLink, isMakerLinkSlot, todayYmd } from '@/lib/contactLog';

export default function MakerLinkLogger({ name, page, children }: { name: string; page: string; children: React.ReactNode }) {
  const { currentUser } = useAuth();

  const onClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (!currentUser) return;
    const a = (e.target as HTMLElement).closest('a');
    if (!a || !e.currentTarget.contains(a)) return;
    const slot = a.closest('[data-maker-slot]')?.getAttribute('data-maker-slot');
    if (!isMakerLinkSlot(slot)) return;

    const today = todayYmd();
    const key = `makerLinkLog:${currentUser.uid}:${name}:${slot}`;
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch {
      /* 保存できない環境では毎回記録する */
    }
    const uid = currentUser.uid;
    // Firestore の読み込みはリンクを開いたあとでよいので、動的に読み込む
    void import('@/lib/contactLogStore')
      .then(({ recordContactLog }) => recordContactLog(uid, name, entryFromMakerLink(slot, page, today)))
      .catch((err) => console.warn('担当者連絡先への記録に失敗', err));
  };

  return (
    <span className="flex gap-1 flex-wrap" onClick={onClick} onAuxClick={onClick}>
      {children}
    </span>
  );
}
