import { USE_OPTIONS } from '../options';
import type { ProjectInput } from '../types';

/** 自治体パックの各ファイルで共通に使う判定の小道具 */

export const useLabel = (id: string) => USE_OPTIONS.find((u) => u.id === id)?.label ?? id;

export const hasUse = (p: ProjectInput, ...ids: string[]) => ids.some((id) => p.useIds.includes(id));

export const hasFlag = (p: ProjectInput, id: string) => p.siteFlags.includes(id);

export const isWork = (p: ProjectInput, ...w: string[]) => w.some((x) => p.workTypes.includes(x as never));

/** 新築・増築・改築のいずれか */
export const isBuilding = (p: ProjectInput) => isWork(p, 'new', 'extension', 'rebuild');

export const m2 = (n: number) => `${n.toLocaleString()}m2`;

/** 住居系用途地域（中高層条例などで基準が切り替わる区分） */
export const RESIDENTIAL_ZONES = [
  '第一種低層住居専用地域',
  '第二種低層住居専用地域',
  '第一種中高層住居専用地域',
  '第二種中高層住居専用地域',
  '第一種住居地域',
  '第二種住居地域',
  '準住居地域',
  '田園住居地域',
];

/** 商業系用途地域 */
export const COMMERCIAL_ZONES = ['近隣商業地域', '商業地域'];

/**
 * 住居系かどうか。用途地域が未選択のときは安全側に倒して住居系として扱う
 * （基準が厳しい側で拾っておき、利用者に確認させる）
 */
export const isResidentialZone = (p: ProjectInput) =>
  RESIDENTIAL_ZONES.includes(p.zoning) || p.zoning === '未選択' || p.zoning === '用途地域の指定のない区域';

/** 用途属性を満たす選択済み用途のラベル一覧 */
export function usesWith(p: ProjectInput, key: keyof (typeof USE_OPTIONS)[number]): string[] {
  return p.useIds
    .map((id) => USE_OPTIONS.find((u) => u.id === id))
    .filter((u): u is (typeof USE_OPTIONS)[number] => !!u && !!u[key])
    .map((u) => u.label);
}
