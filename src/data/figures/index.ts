import type { Fig } from './types';
import { FIGS_1 } from './batch1';
import { FIGS_2 } from './batch2';
import { FIGS_3 } from './batch3';
import { FIGS_4 } from './batch4';

export type { Fig };
export const FIGURES: Fig[] = [...FIGS_1, ...FIGS_2, ...FIGS_3, ...FIGS_4];

export const figuresOf = (postId: string) => FIGURES.filter((f) => f.post === postId);
export const figureSrc = (f: Fig) => `/figures/${f.id}.svg`;
