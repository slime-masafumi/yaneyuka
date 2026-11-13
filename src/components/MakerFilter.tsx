'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * 建材ページのメーカー表の絞り込み(CAD あり / カタログあり / サンプルあり)。
 * 見出しの集計(MakerCount)で切り替え、同じ小分類の表(MakerRows、群ごとに複数ある)がまとめて従う。
 * 小分類が変わったら MainLayout が key で作り直すので、絞り込みは引き継がない。
 *
 * サーバーでは絞り込みなし(全社)で組むので、配信 HTML には全メーカーが載る。
 */
export type MakerFilterKey = 'catalog' | 'cad' | 'sample';

type Ctx = { filter: MakerFilterKey | null; setFilter: (f: MakerFilterKey | null) => void };

const MakerFilterContext = createContext<Ctx>({ filter: null, setFilter: () => {} });

export function MakerFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<MakerFilterKey | null>(null);
  return <MakerFilterContext.Provider value={{ filter, setFilter }}>{children}</MakerFilterContext.Provider>;
}

export const useMakerFilter = () => useContext(MakerFilterContext);
