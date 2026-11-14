'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { openMakerConect } from '@/lib/makerConectPreset';

/**
 * 建材ページの表で「問い合わせるメーカー」を選ぶ仕組み。2026-11-14
 * 表の各行のチェックで選び、画面の下に出る帯から Maker conect にまとめて渡す(相見積・比較)。
 * Maker conect の宛先は 5 社までなので、ここも 5 社まで。
 */
export const PICK_MAX = 5;

type Pick = { names: string[]; part: string };
type Ctx = {
  picked: string[];
  toggle: (name: string, part: string) => void;
  clear: () => void;
  part: string;
};

const MakerPickContext = createContext<Ctx | null>(null);

export function MakerPickProvider({ children }: { children: React.ReactNode }) {
  const [pick, setPick] = useState<Pick>({ names: [], part: '' });
  const value = useMemo<Ctx>(
    () => ({
      picked: pick.names,
      part: pick.part,
      toggle: (name, part) =>
        setPick((p) => {
          if (p.names.includes(name)) return { ...p, names: p.names.filter((n) => n !== name) };
          if (p.names.length >= PICK_MAX) return p;
          return { names: [...p.names, name], part: p.part || part };
        }),
      clear: () => setPick({ names: [], part: '' }),
    }),
    [pick]
  );
  return (
    <MakerPickContext.Provider value={value}>
      {children}
      <MakerPickBar />
    </MakerPickContext.Provider>
  );
}

/** 表の行から使う。Provider の外(比較ページなど)では null を返し、チェック欄を出さない */
export const useMakerPick = () => useContext(MakerPickContext);

function MakerPickBar() {
  const ctx = useContext(MakerPickContext);
  if (!ctx || !ctx.picked.length) return null;
  const { picked, part, clear } = ctx;
  return (
    <div className="yy-mkpick" role="region" aria-label="選んだメーカー">
      <span className="yy-mkpick__n">
        <b>{picked.length}</b> / {PICK_MAX} 社
      </span>
      <span className="yy-mkpick__names" title={picked.join('、')}>
        {picked.join('、')}
      </span>
      <button type="button" className="yy-mkpick__clear" onClick={clear}>
        選び直す
      </button>
      <button
        type="button"
        className="yy-pill yy-mkpick__go"
        onClick={() => {
          openMakerConect({ makers: picked, part });
          clear();
        }}
      >
        まとめて問い合わせ(Maker conect)→
      </button>
    </div>
  );
}
