import React from 'react';
import { matFigsOf } from '@/data/figures/material';

/** 材料情報の節に添える図。図の無い節では何も出さない。2026-11-14 */
export default function MatFigs({ sec }: { sec: string }) {
  const figs = matFigsOf(sec);
  if (!figs.length) return null;
  return (
    <>
      {figs.map((f, i) => (
        <figure key={f.id} className="yy-di-fig yy-mi-fig">
          <a href={`/figures/${f.id}.svg`} target="_blank" rel="noopener" title="図を別のタブで大きく見る">
            <img src={`/figures/${f.id}.svg`} alt={f.title} width={f.w} height={f.h} loading="lazy" decoding="async" />
          </a>
          <figcaption>
            <span className="yy-di-figno">FIG. {sec.replace('section-', 'M')}-{i + 1}</span>
            <b>{f.title}</b>
            <span>{f.caption}</span>
          </figcaption>
        </figure>
      ))}
    </>
  );
}
