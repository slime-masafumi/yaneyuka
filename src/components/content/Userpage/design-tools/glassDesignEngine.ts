// glassDesignEngine.ts
// 日本板硝子「板ガラスの強度と安全」に基づくガラス厚さ計算エンジン
// 対応ケース：
//  - 等分布荷重 × 四辺単純支持矩形板（面中央応力・たわみ）
//  - 等分布荷重 × 二辺単純支持矩形板（長辺支持・フリー辺中央の応力・たわみ）
//
// 単位系：寸法 [mm], 荷重 [kN/m²], 応力 [MPa = N/mm²]
//
// ※最終設計では必ず元カタログと自社基準での照査を行うこと。

// ------------------------------------------------------------
// 型定義
// ------------------------------------------------------------

export type SupportCondition =
  | 'FOUR_EDGES_SIMPLY_SUPPORTED'          // 四辺単純支持
  | 'TWO_EDGES_LONG_EDGES_SUPPORTED';      // 二辺単純支持（長辺支持・短辺フリー）

export type GlassType = 'float' | 'tempered' | 'laminated';

export interface PanelInput {
  /** 短辺方向寸法 [mm]（幅 or 高さ、どちらでもよいが短い方） */
  shortSideMm: number;
  /** 長辺方向寸法 [mm] */
  longSideMm: number;
  /** 設計面荷重 [kN/m²]（風圧など） */
  designPressureKnm2: number;
  /** 支持条件 */
  support: SupportCondition;
}

export interface ThicknessCheckResult {
  thicknessMm: number;
  sigmaMaxMpa: number;        // 最大曲げ応力 [MPa]
  deflectionMaxMm: number;    // 最大たわみ [mm]
  sigmaAllowMpa: number;      // 許容曲げ応力度 [MPa]
  deflectionAllowMm: number;  // 許容たわみ [mm]
  sigmaRatio: number;         // 応力比 σ / σ_allow
  deflectionRatio: number;    // たわみ比 δ / δ_allow
  isOk: boolean;              // 応力・たわみ両方 OK なら true
}

export interface ThicknessSearchResult {
  ok: boolean;
  recommendedThicknessMm: number | null;
  selected?: ThicknessCheckResult;
  allCandidates: ThicknessCheckResult[];
  message: string;
}

// ------------------------------------------------------------
// 物性・基本定数
// ------------------------------------------------------------

/** ガラスのヤング率 [MPa = N/mm²]（NSG カタログ値 7.16×10⁴） */
const E_GLASS_MPA = 7.16e4;

/**
 * フロート板ガラスの短期許容応力（面内 σac） [MPa]
 * 出典：「板ガラスの強度と安全」 各種板ガラスの短期・長期許容応力 表
 */
function getFloatGlassShortTermAllowableMpa(thicknessMm: number): number {
  const t = thicknessMm;

  if (t <= 8)   return 24.5;
  if (t <= 12)  return 22.1;
  if (t <= 20)  return 19.6;
  // 20mm 超
  return 18.6;
}

/**
 * 強化ガラスの短期許容応力 [MPa]
 * 出典：日本板硝子「板ガラスの強度と安全」
 * 強化ガラスは熱処理により表面に圧縮応力層を形成し、
 * フロートガラスの約3倍の曲げ強度を持つ。
 * 実務上の短期許容応力として 58.8 MPa（= 600 kgf/cm²）を採用。
 */
function getTemperedGlassShortTermAllowableMpa(): number {
  return 58.8;
}

/**
 * ガラス種別に応じた短期許容応力を返す
 */
function getGlassShortTermAllowableMpa(glassType: GlassType, thicknessMm: number): number {
  switch (glassType) {
    case 'tempered':
      return getTemperedGlassShortTermAllowableMpa();
    case 'float':
    case 'laminated':
    default:
      return getFloatGlassShortTermAllowableMpa(thicknessMm);
  }
}

/**
 * たわみ許容値 [mm]
 * デフォルト L/200（L = a）を採用。必要なら ratio を変える。
 */
function getDeflectionAllowMm(spanMm: number, limitRatio = 200): number {
  return spanMm / limitRatio;
}

// ------------------------------------------------------------
// β・α係数テーブル
//   - 四辺単純支持 × 等分布荷重（ケース①）
//   - 二辺単純支持 × 等分布荷重（ケース④）
// ------------------------------------------------------------

interface BetaAlphaRow {
  aspectBa: number;  // b/a
  beta: number;
  alpha: number;
}

/**
 * 四辺単純支持 × 等分布荷重（①）の β・α
 * b/a = 1, 1.2, 1.5, 2, 3, 4, 5
 */
const BETA_ALPHA_FOUR_EDGES_UNIFORM: BetaAlphaRow[] = [
  { aspectBa: 1.0, beta: 0.272, alpha: 0.047 },
  { aspectBa: 1.2, beta: 0.362, alpha: 0.065 },
  { aspectBa: 1.5, beta: 0.476, alpha: 0.088 },
  { aspectBa: 2.0, beta: 0.603, alpha: 0.116 },
  { aspectBa: 3.0, beta: 0.711, alpha: 0.139 },
  { aspectBa: 4.0, beta: 0.740, alpha: 0.146 },
  { aspectBa: 5.0, beta: 0.748, alpha: 0.148 },
];

/**
 * 二辺単純支持 × 等分布荷重（④）の β・α
 * ※「a はフリー辺とする」
 *   → ここでは shortSideMm をフリー辺 a とみなし、
 *      longSideMm を支持辺 b として b/a を計算している。
 *
 * b/a = 0.5, 0.7, 1, 1.2, 1.5, 2, 3, ∞
 *  ∞ は「十分大きい値」として 1e6 で代用
 */
const BETA_ALPHA_TWO_EDGES_UNIFORM: BetaAlphaRow[] = [
  { aspectBa: 0.5, beta: 0.350, alpha: 0.076 },
  { aspectBa: 0.7, beta: 0.511, alpha: 0.108 },
  { aspectBa: 1.0, beta: 0.661, alpha: 0.139 },
  { aspectBa: 1.2, beta: 0.715, alpha: 0.150 },
  { aspectBa: 1.5, beta: 0.758, alpha: 0.158 },
  { aspectBa: 2.0, beta: 0.783, alpha: 0.164 },
  { aspectBa: 3.0, beta: 0.791, alpha: 0.165 },
  { aspectBa: 1e6, beta: 0.791, alpha: 0.165 }, // b/a → ∞ の近似
];

/** 単純な線形補間（aspectBa がテーブル範囲外なら端値を使用） */
function interpolateBetaAlpha(
  table: BetaAlphaRow[],
  aspectBaRaw: number,
): { beta: number; alpha: number } {
  if (!Number.isFinite(aspectBaRaw) || aspectBaRaw <= 0) {
    throw new Error(`b/a が不正です: ${aspectBaRaw}`);
  }

  const aspectBa = aspectBaRaw;

  // 昇順前提
  const sorted = table;

  if (aspectBa <= sorted[0].aspectBa) {
    return { beta: sorted[0].beta, alpha: sorted[0].alpha };
  }

  const last = sorted[sorted.length - 1];
  if (aspectBa >= last.aspectBa) {
    return { beta: last.beta, alpha: last.alpha };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const r1 = sorted[i];
    const r2 = sorted[i + 1];

    if (aspectBa >= r1.aspectBa && aspectBa <= r2.aspectBa) {
      const t = (aspectBa - r1.aspectBa) / (r2.aspectBa - r1.aspectBa);
      const beta = r1.beta + t * (r2.beta - r1.beta);
      const alpha = r1.alpha + t * (r2.alpha - r1.alpha);
      return { beta, alpha };
    }
  }

  // ここには基本的に来ない想定
  return { beta: last.beta, alpha: last.alpha };
}

/**
 * 支持条件ごとの β・α 取得
 */
function getBetaAlphaForSupport(
  support: SupportCondition,
  aspectBa: number,
): { beta: number; alpha: number } {
  switch (support) {
    case 'FOUR_EDGES_SIMPLY_SUPPORTED':
      return interpolateBetaAlpha(BETA_ALPHA_FOUR_EDGES_UNIFORM, aspectBa);

    case 'TWO_EDGES_LONG_EDGES_SUPPORTED':
      return interpolateBetaAlpha(BETA_ALPHA_TWO_EDGES_UNIFORM, aspectBa);

    default:
      // 将来拡張用
      throw new Error(`未対応の支持条件です: ${support}`);
  }
}

// ------------------------------------------------------------
// 単一板厚の応力・たわみチェック
// ------------------------------------------------------------

export interface CheckOptions {
  /** たわみ制限比 L/○○ の ○○ 部分（デフォルト 200） */
  deflectionLimitRatio?: number;
  /** ガラス種別（デフォルト 'float'） */
  glassType?: GlassType;
}

/**
 * 指定板厚での応力・たわみを計算して判定
 */
export function checkThickness(
  panel: PanelInput,
  thicknessMm: number,
  options?: CheckOptions,
): ThicknessCheckResult {
  const { shortSideMm, longSideMm, designPressureKnm2, support } = panel;

  if (shortSideMm <= 0 || longSideMm <= 0) {
    throw new Error('shortSideMm / longSideMm は正の値で入力してください。');
  }
  if (thicknessMm <= 0) {
    throw new Error('thicknessMm は正の値で入力してください。');
  }

  // a：基準辺
  // - 四辺支持：一般的に短辺 a
  // - 二辺支持：NSG 式で「a はフリー辺」と定義 → ここでは短辺をフリー辺とみなす
  const a = Math.min(shortSideMm, longSideMm); // [mm] 短辺 ≒ フリー辺
  const b = Math.max(shortSideMm, longSideMm); // [mm] 長辺 ≒ 支持辺
  const ba = b / a;

  // 設計荷重 [kN/m²] → 等分布荷重 w [N/mm² = MPa]
  // 1 kN/m² = 1000 N / (1,000,000 mm²) = 0.001 N/mm²
  const w = designPressureKnm2 * 0.001;

  const { beta, alpha } = getBetaAlphaForSupport(support, ba);

  // 最大曲げ応力 σmax [MPa]
  //   四辺支持：σc（面中央）
  //   二辺支持：σe（フリー辺中央）
  const sigmaMax = beta * w * (a * a) / (thicknessMm * thicknessMm);

  // 最大たわみ δmax [mm]
  const deltaMax =
    alpha * w * Math.pow(a, 4) / (E_GLASS_MPA * Math.pow(thicknessMm, 3));

  const sigmaAllow = getGlassShortTermAllowableMpa(options?.glassType ?? 'float', thicknessMm);
  const deflectionAllow = getDeflectionAllowMm(
    a,
    options?.deflectionLimitRatio ?? 200,
  );

  const sigmaRatio = sigmaMax / sigmaAllow;
  const deflectionRatio = deltaMax / deflectionAllow;

  return {
    thicknessMm,
    sigmaMaxMpa: sigmaMax,
    deflectionMaxMm: deltaMax,
    sigmaAllowMpa: sigmaAllow,
    deflectionAllowMm: deflectionAllow,
    sigmaRatio,
    deflectionRatio,
    isOk: sigmaRatio <= 1 && deflectionRatio <= 1,
  };
}

// ------------------------------------------------------------
// 候補板厚から必要板厚を選定
// ------------------------------------------------------------

export function findRequiredThickness(
  panel: PanelInput,
  candidateThicknessesMm: number[],
  options?: CheckOptions,
): ThicknessSearchResult {
  if (!candidateThicknessesMm.length) {
    throw new Error('候補板厚リストが空です。');
  }

  const results: ThicknessCheckResult[] = [];
  let chosen: ThicknessCheckResult | undefined;

  const sorted = [...candidateThicknessesMm].sort((a, b) => a - b);

  for (const t of sorted) {
    const r = checkThickness(panel, t, options);
    results.push(r);
    if (!chosen && r.isOk) {
      chosen = r;
    }
  }

  if (!chosen) {
    return {
      ok: false,
      recommendedThicknessMm: null,
      selected: undefined,
      allCandidates: results,
      message:
        '候補板厚の中に、許容応力・たわみの両方を満足する厚さがありません。' +
        '荷重・寸法・たわみ制限比、または候補板厚を見直してください。',
    };
  }

  return {
    ok: true,
    recommendedThicknessMm: chosen.thicknessMm,
    selected: chosen,
    allCandidates: results,
    message:
      `推奨板厚 ${chosen.thicknessMm} mm ` +
      `(応力比=${chosen.sigmaRatio.toFixed(2)}, ` +
      `たわみ比=${chosen.deflectionRatio.toFixed(2)})`,
  };
}

// ------------------------------------------------------------
// 合わせガラスの計算
// ------------------------------------------------------------

/**
 * 合わせガラスの等価単板厚を計算
 * 
 * 【出典・前提条件】
 * - 出典: 日本板硝子「板ガラスの強度と安全」等の実務手引き
 * - 適用条件: 短期荷重時、常温、PVB中間膜（一般的な合わせガラス）
 * - 等価単板厚の式: t = 0.866 * T - 0.268
 * 
 * 【注意事項】
 * - この線形近似式（y = ax - b）は特定の条件下での実務近似式です
 * - 中間膜の種類（PVB/SentryGlas等）、温度、荷重継続時間によって等価厚は変化します
 * - 一般的な理論範囲（剛性なし: t_eq = ∛(t₁³ + t₂³) ～ 完全剛性: t_eq = t₁ + t₂）の間で、
 *   この式は「中間的な剛性がある」側の評価となります
 * - より厳密な計算が必要な場合は、メーカーカタログや詳細計算式を参照してください
 * 
 * @param totalThicknessMm 中間膜を除いたガラス板の合計厚 [mm]（例：8+10=18）
 * @returns 等価な単板ガラスの板厚 [mm]
 */
export function calculateLaminatedGlassEquivalentThickness(totalThicknessMm: number): number {
  if (totalThicknessMm <= 0) {
    throw new Error('合計板厚は正の値で入力してください。');
  }
  return 0.866 * totalThicknessMm - 0.268;
}

/**
 * 合わせガラスの必要合計板厚を計算
 * 等価単板厚 t が必要板厚 t_required 以上になるように、合計板厚 T を逆算
 * 
 * @param requiredEquivalentThicknessMm 必要な等価単板厚 [mm]
 * @returns 必要な合計板厚 [mm]（中間膜を除く）
 */
export function calculateRequiredLaminatedGlassTotalThickness(requiredEquivalentThicknessMm: number): number {
  if (requiredEquivalentThicknessMm <= 0) {
    throw new Error('必要な等価板厚は正の値で入力してください。');
  }
  // t = 0.866 * T - 0.268
  // T = (t + 0.268) / 0.866
  return (requiredEquivalentThicknessMm + 0.268) / 0.866;
}

/**
 * 合わせガラスの候補合計板厚から必要板厚を選定
 * 
 * @param panel パネル入力データ
 * @param candidateTotalThicknessesMm 候補となる合計板厚のリスト [mm]（例：[18, 20, 22]）
 * @param options チェックオプション
 * @returns 選定結果
 */
export function findRequiredLaminatedGlassThickness(
  panel: PanelInput,
  candidateTotalThicknessesMm: number[],
  options?: CheckOptions,
): ThicknessSearchResult {
  if (!candidateTotalThicknessesMm.length) {
    throw new Error('候補合計板厚リストが空です。');
  }

  const results: ThicknessCheckResult[] = [];
  let chosen: ThicknessCheckResult | undefined;

  const sorted = [...candidateTotalThicknessesMm].sort((a, b) => a - b);

  for (const totalThickness of sorted) {
    // 等価単板厚を計算
    const equivalentThickness = calculateLaminatedGlassEquivalentThickness(totalThickness);
    
    // 等価単板厚で応力・たわみをチェック
    const r = checkThickness(panel, equivalentThickness, options);
    
    // 結果に実際の合計板厚を記録（表示用）
    const result: ThicknessCheckResult = {
      ...r,
      thicknessMm: totalThickness, // 表示は合計板厚
    };
    
    results.push(result);
    if (!chosen && r.isOk) {
      chosen = result;
    }
  }

  if (!chosen) {
    return {
      ok: false,
      recommendedThicknessMm: null,
      selected: undefined,
      allCandidates: results,
      message:
        '候補合計板厚の中に、許容応力・たわみの両方を満足する厚さがありません。' +
        '荷重・寸法・たわみ制限比、または候補合計板厚を見直してください。',
    };
  }

  const equivalentThickness = calculateLaminatedGlassEquivalentThickness(chosen.thicknessMm);
  return {
    ok: true,
    recommendedThicknessMm: chosen.thicknessMm,
    selected: chosen,
    allCandidates: results,
    message:
      `推奨合計板厚 ${chosen.thicknessMm} mm ` +
      `(等価単板厚 ${equivalentThickness.toFixed(1)} mm, ` +
      `応力比=${chosen.sigmaRatio.toFixed(2)}, ` +
      `たわみ比=${chosen.deflectionRatio.toFixed(2)})`,
  };
}

