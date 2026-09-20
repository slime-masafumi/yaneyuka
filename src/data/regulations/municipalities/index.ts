import type { MunicipalPack, Municipality, RegulationRule } from '../types';
import { SAPPORO, SAPPORO_CATEGORY } from './sapporo';
import { SHIZUOKA } from './shizuoka';
import { YOKOHAMA, YOKOHAMA_CATEGORY } from './yokohama';

/**
 * 自治体パックの登録簿
 *
 * 自治体を追加するときは、このディレクトリに 1 ファイル足して、下の PACKS に
 * 並べるだけでよい。全国共通レイヤー(nationalRules.ts)には手を触れない。
 */

export const PACKS: MunicipalPack[] = [SHIZUOKA, SAPPORO, YOKOHAMA];

const SHIZUOKA_CATEGORY = '静岡市・静岡県の条例等';

/** 結果画面でのカテゴリの並び順（自治体カテゴリは共通カテゴリの後ろ） */
export const MUNICIPAL_CATEGORIES = [SHIZUOKA_CATEGORY, SAPPORO_CATEGORY, YOKOHAMA_CATEGORY];

export function getPack(municipalityId: string): MunicipalPack | undefined {
  return PACKS.find((p) => p.id === municipalityId);
}

export function getMunicipalRules(municipalityId: string): RegulationRule[] {
  return getPack(municipalityId)?.rules ?? [];
}

/** 全国共通ルールの調査先の上書き表を返す */
export function getAuthorityOverrides(municipalityId: string): Record<string, string> {
  return getPack(municipalityId)?.authorityOverrides ?? {};
}

/**
 * 画面の選択肢。
 * 条例レイヤーを整備済みの自治体をパックから組み立て、最後に「その他」を足す。
 */
export const MUNICIPALITY_OPTIONS: Municipality[] = [
  ...PACKS.map((p) => ({
    id: p.id,
    label: p.label,
    hasLocalLayer: true,
    sourceLabel: p.sourceLabel,
    sourceUrl: p.sourceUrl,
    asOf: p.asOf,
  })),
  { id: 'other', label: 'その他の自治体(全国共通レイヤーのみ)', hasLocalLayer: false },
];
