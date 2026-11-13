import React, { useEffect, useRef, useState } from 'react';
import { WindSpeedTableModal } from './WindSpeedTableModal';
import { ModeBar, SheetHead, SheetButton, Sheet, SecHead, KV, Step, ResultPanel, ResultRow, CaseSave, LookupList } from '@/components/ui/Sheet';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import './glass-sheet.css';
import {
  findRequiredThickness,
  findRequiredLaminatedGlassThickness,
  checkThickness,
  type PanelInput,
  type SupportCondition,
  type GlassType,
  type ThicknessSearchResult,
  type ThicknessCheckResult
} from './glassDesignEngine';

interface GlassThicknessProps {
  hideHeader?: boolean;
  /** true = 計算書の組版(モック「高級感 3」Q3)で出す。設計ツールの画面から渡す */
  sheet?: boolean;
}

// ── 計算書の組版(sheet)で使う表示用の小物。計算式には触れない ──

/** 設計ツール一覧と同じ通し番号(01〜) */
const GLASS_TOOL_NO = (() => {
  const i = DESIGN_TOOL_MENU.flatMap((c) => c.subTabs).findIndex((t) => t.id === 'glass-thickness');
  return i >= 0 ? String(i + 1).padStart(2, '0') : '';
})();

/** 3 桁区切りの整数 */
const fmtInt = (n: number) => Math.round(n).toLocaleString('ja-JP');
/** 余裕(+31 % / −18 %)。マイナスは全角でなく U+2212 */
const fmtPct = (r: number) => {
  const v = Math.round(r * 100);
  return `${v >= 0 ? '+' : '−'}${Math.abs(v)} %`;
};

const GLASS_TYPE_LABEL: Record<GlassType, string> = {
  float: 'フロート板ガラス',
  tempered: '強化ガラス',
  laminated: '合わせガラス',
};
const SUPPORT_LABEL: Record<SupportCondition, string> = {
  FOUR_EDGES_SIMPLY_SUPPORTED: '4 辺支持',
  TWO_EDGES_LONG_EDGES_SUPPORTED: '2 辺支持(長辺)',
};
const METHOD_LABEL = { NSG_SIMPLE: 'NSG 簡略', KOKUJI_SIMPLE: '告示簡略', KOKUJI_FULL: '告示フル' } as const;

/**
 * 図:左に建物の立面と基準高さ・基準風速、右にガラスの立面と寸法・設計風圧(モック gen-x-svg.js の glassSvg を入力値で描く)
 * 値が無いところは「—」。ガラスの縦横比は入力した短辺・長辺に合わせる
 */
function GlassFigure({
  heightM, v0, shortMm, longMm, wNm2, support, caption,
}: {
  heightM: number | null; v0: number | null; shortMm: number | null; longMm: number | null; wNm2: number | null;
  support: SupportCondition; caption: string;
}) {
  const INK = '#141414', T2 = '#5c5c5a', T3 = '#9a9a96', LINE = '#e6e6e2', ACC = '#52AA96', COLD = '#2f78c4', GLASS = '#eef4fb';
  // 建物:階数は高さ ÷ 約 4 m(1〜12 階に丸める)。高さが無ければ 7 階で描く
  const floors = heightM && heightM > 0 ? Math.min(12, Math.max(1, Math.round(heightM / 4))) : 7;
  const bTop = 72, bBot = 380, fh = (bBot - bTop) / floors;
  // ガラス:短辺を横、長辺を縦。170 × 240 の枠に収める
  const s = shortMm && shortMm > 0 ? shortMm : 1500;
  const l = longMm && longMm > 0 ? longMm : 2400;
  const k = Math.min(170 / s, 240 / l);
  const gw = s * k, gh = l * k;
  const gx = 475 - gw / 2, gy = 80 + (240 - gh) / 2;
  const four = support === 'FOUR_EDGES_SIMPLY_SUPPORTED';
  const arrowsY = [0.17, 0.39, 0.61, 0.83].map((r) => gy + gh * r);
  return (
    <svg viewBox="0 0 640 420" role="img" aria-label="建物の高さと基準風速、ガラスの寸法と設計風圧の図">
      <defs>
        <marker id="glass-sheet-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill={COLD} />
        </marker>
      </defs>
      {/* 左:建物 */}
      <line x1="20" y1={bBot} x2="250" y2={bBot} stroke={INK} strokeWidth="1.5" />
      <rect x="70" y={bTop} width="130" height={bBot - bTop} fill="#ffffff" stroke={INK} strokeWidth="1.5" />
      {Array.from({ length: floors }, (_, i) => {
        const y = bBot - fh * (i + 1);
        const wh = Math.min(26, fh - 14);
        return (
          <g key={i}>
            {i < floors - 1 && <line x1="70" x2="200" y1={y} y2={y} stroke="#d6d6d6" />}
            {wh > 3 && [84, 118, 152].map((x) => (
              <rect key={x} x={x} y={y + (fh - wh) / 2} width="28" height={wh} fill={i === floors - 1 ? ACC : GLASS} stroke="#bdbdbd" strokeWidth=".8" />
            ))}
          </g>
        );
      })}
      <path d={`M220 ${bBot} V${bTop}`} stroke={INK} strokeWidth="1" />
      <path d={`M214 ${bBot} h12 M214 ${bTop} h12`} stroke={INK} />
      <text x="232" y="230" fontSize="13" fontWeight="700" fill={INK}>{`高さ ${heightM && heightM > 0 ? heightM.toLocaleString('ja-JP') : '—'} m`}</text>
      <text x="232" y="248" fontSize="11" fill={T3}>基準高さ H</text>
      <text x="70" y="62" fontSize="11" fill={T2}>頂部 · いちばん厳しい位置</text>
      {[110, 170, 230, 290].map((y) => (
        <path key={y} d={`M8 ${y} H58`} stroke={COLD} strokeWidth="1.6" markerEnd="url(#glass-sheet-arrow)" />
      ))}
      <text x="8" y="100" fontSize="11" fill={COLD}>{`V₀ ${v0 ?? '—'} m/s`}</text>
      {/* 右:ガラス */}
      <path d="M320 40 H640" stroke={LINE} />
      {four ? (
        <rect x={gx} y={gy} width={gw} height={gh} fill={GLASS} stroke={INK} strokeWidth="2" />
      ) : (
        <>
          {/* 2 辺支持:支持する長辺を太く、自由な短辺は破線 */}
          <rect x={gx} y={gy} width={gw} height={gh} fill={GLASS} stroke={T3} strokeWidth="1" strokeDasharray="4 3" />
          <path d={`M${gx} ${gy} V${gy + gh} M${gx + gw} ${gy} V${gy + gh}`} stroke={INK} strokeWidth="3" />
        </>
      )}
      <path d={`M${gx + gw * 0.13} ${gy + gh * 0.92} L${gx + gw * 0.8} ${gy + gh * 0.13} M${gx + gw * 0.3} ${gy + gh * 0.93} L${gx + gw * 0.93} ${gy + gh * 0.21}`} stroke="#ffffff" strokeWidth="6" />
      <path d={`M${gx} 344 H${gx + gw} M${gx} 338 v12 M${gx + gw} 338 v12`} stroke={INK} />
      <text x={gx + gw / 2} y="366" fontSize="13" fill={INK} textAnchor="middle">{shortMm && shortMm > 0 ? shortMm.toLocaleString('ja-JP') : '—'}</text>
      <path d={`M576 ${gy} V${gy + gh} M570 ${gy} h12 M570 ${gy + gh} h12`} stroke={INK} />
      <text x="590" y={gy + gh / 2 + 5} fontSize="13" fill={INK}>{longMm && longMm > 0 ? longMm.toLocaleString('ja-JP') : '—'}</text>
      {arrowsY.map((y) => (
        <path key={y} d={`M330 ${y} H${gx - 8}`} stroke={COLD} strokeWidth="1.6" markerEnd="url(#glass-sheet-arrow)" />
      ))}
      <text x="330" y="100" fontSize="11" fill={COLD}>設計風圧</text>
      <text x="330" y="116" fontSize="11" fill={COLD}>{wNm2 && wNm2 > 0 ? `${fmtInt(wNm2)} N/㎡` : '— N/㎡'}</text>
      <text x="390" y="396" fontSize="11" fill={T3}>{caption}</text>
    </svg>
  );
}

const GlassThickness: React.FC<GlassThicknessProps> = ({ hideHeader, sheet }) => {
  // ガラス厚計算関連のstate
  const [shortSide, setShortSide] = useState<string>('');
  const [longSide, setLongSide] = useState<string>('');
  const [windPressure, setWindPressure] = useState<string>('');
  const [supportCondition, setSupportCondition] = useState<SupportCondition>('FOUR_EDGES_SIMPLY_SUPPORTED');
  const [deflectionLimitRatio, setDeflectionLimitRatio] = useState<string>('200');
  const [glassType, setGlassType] = useState<GlassType>('float');
  const [regionType, setRegionType] = useState<string>('2');
  const [buildingHeight, setBuildingHeight] = useState<string>('');
  const [basicWindSpeed, setBasicWindSpeed] = useState<string>('34');
  const [pressureMethod, setPressureMethod] = useState<'KOKUJI_SIMPLE' | 'NSG_SIMPLE' | 'KOKUJI_FULL'>('NSG_SIMPLE');
  // 告示(フル)用 係数
  const [gustFactor, setGustFactor] = useState<string>('2.0'); // Gf 初期: 壁で概ね2前後の代表
  const [cpe, setCpe] = useState<string>('-0.8'); // 外圧係数 代表例（負圧）
  const [cpi, setCpi] = useState<string>('0.0');  // 内圧係数 条件により±
  // ★追加: 隅角部かどうかのチェック（風力係数Cfの考慮用）
  const [isCorner, setIsCorner] = useState<boolean>(false);
  const [calculationResult, setCalculationResult] = useState<ThicknessSearchResult | null>(null);
  const [calculationLog, setCalculationLog] = useState<string>('');
  const [glassErrorMessage, setGlassErrorMessage] = useState<string>('');
  const [windErrorMessage, setWindErrorMessage] = useState<string>('');

  // 平成12年建設省告示第1454号 第1 の地表面粗度区分ごとの定数
  //   Zb: 地表付近で風速が一定とみなせる高さ [m]
  //   ZG: 地表面の影響が及ばなくなる高さ [m]
  //   alpha: 平均風速の高さ方向の分布を表す指数
  const ROUGHNESS_PARAMS: Record<number, { Zb: number; ZG: number; alpha: number }> = {
    1: { Zb: 5, ZG: 250, alpha: 0.10 },  // Ⅰ 海岸沿い
    2: { Zb: 5, ZG: 350, alpha: 0.15 },  // Ⅱ 田畑・住宅が散在
    3: { Zb: 5, ZG: 450, alpha: 0.20 },  // Ⅲ 通常の市街地
    4: { Zb: 10, ZG: 550, alpha: 0.27 }, // Ⅳ 大都市中心部
  };

  /**
   * 平均風速の高さ方向の分布を表す係数 Er（告示1454号）
   *   H ≦ Zb のとき  Er = 1.7 × (Zb/ZG)^α
   *   H >  Zb のとき  Er = 1.7 × (H /ZG)^α
   *
   * ★修正前は ZG を全区分 250 固定、係数を 1.38/1.00/0.69/0.47 とする独自式で、
   *   さらに区分Ⅱのときだけ 1.624 を掛けて辻褄を合わせていた。
   *   その結果、区分Ⅱ以外では速度圧が大幅に過小評価されていた
   *   （告示比で 区分Ⅰ≒0.6倍、区分Ⅲ≒0.23倍、区分Ⅳ≒0.16倍）。
   *   区分Ⅱは補正係数のおかげで結果的にほぼ正しく、今回の修正での変化は約1%。
   */
  const calculateEr = (regionTypeNum: number, buildingHeightNum: number): number => {
    const p = ROUGHNESS_PARAMS[regionTypeNum] || ROUGHNESS_PARAMS[2];
    const H = buildingHeightNum <= p.Zb ? p.Zb : buildingHeightNum;
    return 1.7 * Math.pow(H / p.ZG, p.alpha);
  };

  // 合わせガラスの推奨組み合わせ表示（合計板厚→代表的な構成）
  const getLaminatedCombinationLabel = (totalThicknessMm?: number | null): string | null => {
    if (!totalThicknessMm) return null;
    const map: Record<number, string> = {
      12: '6mm + 6mm',
      14: '6mm + 8mm',
      16: '8mm + 8mm',
      18: '8mm + 10mm',
      20: '10mm + 10mm',
      22: '10mm + 12mm',
      24: '12mm + 12mm',
      26: '12mm + 14mm',
      28: '14mm + 14mm',
      30: '15mm + 15mm',
    };
    if (map[totalThicknessMm]) return map[totalThicknessMm];
    const half = (totalThicknessMm / 2).toFixed(1).replace(/\.0$/, '');
    return `${half}mm + ${half}mm`;
  };

  // 風圧力計算の関数
  const calculateWindPressure = () => {
    const regionTypeNum = parseFloat(regionType);
    const buildingHeightNum = parseFloat(buildingHeight);
    const basicWindSpeedNum = parseFloat(basicWindSpeed);
    const gfNum = parseFloat(gustFactor);
    const cpeNum = parseFloat(cpe);
    const cpiNum = parseFloat(cpi);

    if (
      isNaN(regionTypeNum) ||
      isNaN(buildingHeightNum) || buildingHeightNum <= 0 ||
      isNaN(basicWindSpeedNum) || basicWindSpeedNum <= 0
    ) {
      setWindErrorMessage('有効な地表面粗度区分、建物高さ（>0）、基準風速を入力してください。');
      return;
    }
    setWindErrorMessage('');

    // 地表面粗度係数 Er（建物高さに依存）
    const Er = calculateEr(regionTypeNum, buildingHeightNum);

    let pressure: number; // N/m²
    if (pressureMethod === 'KOKUJI_FULL') {
      // 告示(フル)系: 速度圧にGfを乗じた上で、外内圧係数で正味に
      if (isNaN(gfNum) || gfNum <= 0 || isNaN(cpeNum) || isNaN(cpiNum)) {
        setWindErrorMessage('Gf, Cpe, Cpi に有効な数値を入力してください。');
        return;
      }
      const q = 0.6 * Math.pow(Er, 2) * gfNum * Math.pow(basicWindSpeedNum, 2); // N/m²
      const net = q * (cpeNum - cpiNum); // 正味風圧
      // 正味が負になった場合は符号を保持（吸引）しつつ、絶対値で設計する運用もあるが、ここでは絶対値を設計用に採用
      pressure = Math.abs(net);
    } else {
      // 簡略: 板硝子協会の平均速度圧レベル（Gfは含めない）
      // q = 0.6 * Er² * V0²（速度圧）
      const q = 0.6 * Math.pow(Er, 2) * Math.pow(basicWindSpeedNum, 2);
      
      // ★重要: 風力係数Cfを考慮して設計用風圧力に変換
      // 一般部: Cf ≈ 1.0（壁面中央部）
      // 隅角部: Cf ≈ 1.5（建物の角部では負圧係数が大きくなる）
      // 注意: 簡易計算では風力係数を簡略化しています。より正確な計算には告示フル計算を使用してください
      const Cf = isCorner ? 1.5 : 1.0;
      pressure = q * Cf;
    }

    // 計算結果を設定（N/m²単位で表示）
    setWindPressure(Math.round(pressure).toString());
  };

  // ガラス厚計算の関数
  const calculateGlassThickness = () => {
    const shortSideNum = parseFloat(shortSide);
    const longSideNum = parseFloat(longSide);
    const windPressureNm2 = parseFloat(windPressure);
    const deflectionRatio = parseFloat(deflectionLimitRatio);

    if (isNaN(shortSideNum) || shortSideNum <= 0 || isNaN(longSideNum) || longSideNum <= 0 || isNaN(windPressureNm2) || windPressureNm2 <= 0) {
      setGlassErrorMessage('有効な寸法と風圧力（>0）を入力してください。');
      return;
    }

    if (isNaN(deflectionRatio) || deflectionRatio <= 0) {
      setGlassErrorMessage('有効なたわみ制限比を入力してください。');
      return;
    }
    setGlassErrorMessage('');

    // 単位変換: N/m² → kN/m²
    const designPressureKnm2 = windPressureNm2 / 1000;

    // パネル入力データ
    const panel: PanelInput = {
      shortSideMm: shortSideNum,
      longSideMm: longSideNum,
      designPressureKnm2: designPressureKnm2,
      support: supportCondition,
    };

    // 計算ログを初期化
    const log: string[] = [];
    log.push(`=== ガラス厚計算ログ ===`);
    log.push(`短辺: ${shortSideNum} mm, 長辺: ${longSideNum} mm`);
    log.push(`設計風圧: ${designPressureKnm2.toFixed(3)} kN/m² (${windPressureNm2} N/m²)`);
    log.push(`風圧算定法: ${
      pressureMethod === 'NSG_SIMPLE'
        ? 'NSG簡略（板硝子協会・実務近似）'
        : pressureMethod === 'KOKUJI_SIMPLE'
        ? '告示簡略'
        : '告示フル（Gf・外圧/内圧係数で正味）'
    }`);
    // ★追加: 風力係数の情報をログに追加
    if (pressureMethod === 'NSG_SIMPLE' || pressureMethod === 'KOKUJI_SIMPLE') {
      log.push(`風力係数 Cf: ${isCorner ? '1.5（隅角部）' : '1.0（一般部）'}`);
    }
    log.push(`支持条件: ${supportCondition === 'FOUR_EDGES_SIMPLY_SUPPORTED' ? '四辺単純支持' : '二辺単純支持（長辺支持）'}`);
    log.push(`たわみ制限: L/${deflectionLimitRatio}`);
    log.push(
      `ガラス種別: ${
        glassType === 'float'
          ? 'フロートガラス（単板）'
          : glassType === 'tempered'
          ? '強化ガラス'
          : '合わせガラス'
      }`,
    );

    try {
      let result: ThicknessSearchResult;
      
      if (glassType === 'laminated') {
        // 合わせガラスの場合
        // まず単板で必要板厚を計算
        const candidateThicknesses = [3, 4, 5, 6, 8, 10, 12, 15, 19];
        const singleResult = findRequiredThickness(panel, candidateThicknesses, {
          deflectionLimitRatio: deflectionRatio,
          glassType: 'float', // 合わせガラスの素板はフロートガラスとして評価
        });

        if (!singleResult.ok || !singleResult.recommendedThicknessMm) {
          setCalculationResult(singleResult);
          setCalculationLog(log.join('\n'));
          return;
        }

        const requiredEquivalentThickness = singleResult.recommendedThicknessMm;
        log.push(`必要な等価単板厚: ${requiredEquivalentThickness.toFixed(1)} mm`);

        // 合わせガラスの候補合計板厚（実務的な組み合わせ）
        const candidateTotalThicknesses = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

        result = findRequiredLaminatedGlassThickness(panel, candidateTotalThicknesses, {
          deflectionLimitRatio: deflectionRatio,
          glassType: 'laminated',
        });

        log.push(`推奨合計板厚: ${result.recommendedThicknessMm} mm`);
        const combo = getLaminatedCombinationLabel(result.recommendedThicknessMm ?? undefined);
        if (combo) {
          log.push(`推奨板厚構成: ${combo}`);
        }
        if (result.selected && result.recommendedThicknessMm !== null) {
          const equivalentThickness = 0.866 * result.recommendedThicknessMm - 0.268;
          log.push(`等価単板厚: ${equivalentThickness.toFixed(1)} mm`);
        }
      } else {
        // フロートガラス or 強化ガラス（単板）の場合
        const candidateThicknesses = [3, 4, 5, 6, 8, 10, 12, 15, 19];

        result = findRequiredThickness(panel, candidateThicknesses, {
          deflectionLimitRatio: deflectionRatio,
          glassType: glassType,
        });

        log.push(`推奨板厚: ${result.recommendedThicknessMm} mm`);
        if (glassType === 'tempered') {
          log.push(`※ 強化ガラス許容応力: 58.8 MPa を適用`);
        }
      }

      if (result.selected) {
        log.push(`最大応力: ${result.selected.sigmaMaxMpa.toFixed(2)} MPa`);
        log.push(`許容応力: ${result.selected.sigmaAllowMpa.toFixed(1)} MPa`);
        log.push(`応力比: ${result.selected.sigmaRatio.toFixed(2)}`);
        log.push(`最大たわみ: ${result.selected.deflectionMaxMm.toFixed(2)} mm`);
        log.push(`許容たわみ: ${result.selected.deflectionAllowMm.toFixed(2)} mm`);
        log.push(`たわみ比: ${result.selected.deflectionRatio.toFixed(2)}`);
      }

      setCalculationResult(result);
      setCalculationLog(log.join('\n'));
      setGlassErrorMessage('');
    } catch (error) {
      setGlassErrorMessage(`計算エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      setCalculationLog(log.join('\n'));
    }
  };

  // 別表（基準風速）モーダル表示フラグ
  const [showWindSpeedTable, setShowWindSpeedTable] = useState<boolean>(false);

  // ── 計算書の組版(sheet)では、入力が揃ったらその場で計算する(ボタンを押さない)。
  //    計算そのものは上の calculateWindPressure / calculateGlassThickness をそのまま呼ぶ ──

  // 風圧:建物高さが入っていれば、風の条件が変わるたびに設計風圧 W を求め直す(W の直接入力は次に風の条件を変えるまで残る)
  useEffect(() => {
    if (!sheet) return;
    const h = parseFloat(buildingHeight);
    if (isNaN(h) || h <= 0) return;
    calculateWindPressure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, regionType, buildingHeight, basicWindSpeed, pressureMethod, gustFactor, cpe, cpi, isCorner]);

  // 板厚:短辺・長辺・W が揃っていれば求め直す。欠けていれば結果を空にする
  useEffect(() => {
    if (!sheet) return;
    const s = parseFloat(shortSide), l = parseFloat(longSide), w = parseFloat(windPressure);
    if (!(s > 0) || !(l > 0) || !(w > 0)) {
      setCalculationResult(null);
      setCalculationLog('');
      setGlassErrorMessage('');
      return;
    }
    calculateGlassThickness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, shortSide, longSide, windPressure, supportCondition, deflectionLimitRatio, glassType, pressureMethod, isCorner]);

  const caseSaveRef = useRef<HTMLDivElement>(null);

  if (sheet) {
    // ── 表示用の値(計算式は変えない。途中の値を見せるために同じ式で求め直すだけ) ──
    const hNum = parseFloat(buildingHeight);
    const v0Num = parseFloat(basicWindSpeed);
    const rNum = parseFloat(regionType);
    const gfNum = parseFloat(gustFactor);
    const cpeNum = parseFloat(cpe);
    const cpiNum = parseFloat(cpi);
    const sNum = parseFloat(shortSide);
    const lNum = parseFloat(longSide);
    const wNum = parseFloat(windPressure);
    const isFull = pressureMethod === 'KOKUJI_FULL';
    const er = !isNaN(rNum) && hNum > 0 ? calculateEr(rNum, hNum) : null;
    const q = er !== null && v0Num > 0 ? (isFull ? (gfNum > 0 ? 0.6 * er * er * gfNum * v0Num * v0Num : null) : 0.6 * er * er * v0Num * v0Num) : null;
    const wOk = wNum > 0;

    const res = calculationResult;
    const sel = res?.ok ? res.selected : undefined;
    // 応力比・たわみ比の大きい方。σ・δ は W に比例するので、許容できる風圧 = W ÷ これ
    const govRatio = (c: ThicknessCheckResult) => Math.max(c.sigmaRatio, c.deflectionRatio);
    const selRatio = sel ? govRatio(sel) : null;
    const laminated = glassType === 'laminated';
    const t = res?.recommendedThicknessMm ?? null;
    const combo = laminated ? getLaminatedCombinationLabel(t) : null;
    const resultLine = res ? (res.ok && t !== null ? (laminated ? `合わせ ${t} mm${combo ? `(${combo})` : ''}` : `${t} mm`) : '不足') : '';

    const caption = `${isFull ? `Cpe ${cpe} · Cpi ${cpi}` : isCorner ? '隅角部' : '一般部'} · ${SUPPORT_LABEL[supportCondition]} · ${GLASS_TYPE_LABEL[glassType]}`;

    const saveToCase = () => {
      const box = caseSaveRef.current;
      if (!box) return;
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 案件があれば灰色の面の「案件に保存」を押す。案件が無ければ物件カルテへの案内を見せるだけ
      const btn = box.querySelector<HTMLButtonElement>('button.yy-pill');
      if (btn && !btn.disabled) btn.click();
    };

    const left = (
      <>
        <section className="yy-sheet__block">
          <SecHead no="I" title="条件" right="入れるとその場で計算" />
          <KV
            k="風圧算定法"
            v={
              <select value={pressureMethod} onChange={(e) => setPressureMethod(e.target.value as 'KOKUJI_SIMPLE' | 'NSG_SIMPLE' | 'KOKUJI_FULL')} aria-label="風圧算定法">
                <option value="NSG_SIMPLE">NSG 簡略</option>
                <option value="KOKUJI_SIMPLE">告示簡略</option>
                <option value="KOKUJI_FULL">告示フル(Gf・Cpe/Cpi)</option>
              </select>
            }
          />
          <KV
            k="建物の高さ"
            v={
              <>
                <input type="number" value={buildingHeight} onChange={(e) => setBuildingHeight(e.target.value)} placeholder="28" aria-label="建物の高さ (m)" />
                <span className="glass-sheet__unit">m</span>
              </>
            }
          />
          <KV
            k={
              <>
                基準風速 V₀
                <button type="button" className="glass-sheet__keylink" onClick={() => setShowWindSpeedTable(true)}>別表</button>
              </>
            }
            v={
              <>
                <select value={basicWindSpeed} onChange={(e) => setBasicWindSpeed(e.target.value)} aria-label="基準風速 V₀ (m/s)">
                  {['30', '32', '34', '36', '38', '40', '42', '44', '46'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <span className="glass-sheet__unit">m/s</span>
              </>
            }
          />
          <KV
            k="地表面粗度区分"
            v={
              <select
                value={regionType}
                onChange={(e) => setRegionType(e.target.value)}
                aria-label="地表面粗度区分"
                title="周囲の建物・樹木が多いほど番号が大きくなります(＝風圧は小さくなります)。地形の起伏ではありません"
              >
                <option value="1">Ⅰ 海岸線付近</option>
                <option value="2">Ⅱ 田園・低層散在</option>
                <option value="3">Ⅲ 一般の市街地</option>
                <option value="4">Ⅳ 大都市中心部</option>
              </select>
            }
          />
          {isFull ? (
            <>
              <KV k="ガスト影響係数 Gf" v={<input type="number" step="0.01" value={gustFactor} onChange={(e) => setGustFactor(e.target.value)} placeholder="2.0" aria-label="ガスト影響係数 Gf" />} />
              <KV k="外圧係数 Cpe" v={<input type="number" step="0.01" value={cpe} onChange={(e) => setCpe(e.target.value)} placeholder="-0.8" aria-label="外圧係数 Cpe" />} />
              <KV k="内圧係数 Cpi" v={<input type="number" step="0.01" value={cpi} onChange={(e) => setCpi(e.target.value)} placeholder="0.0" aria-label="内圧係数 Cpi" />} />
            </>
          ) : (
            <KV
              k="ガラスの位置"
              v={
                <select value={isCorner ? 'corner' : 'general'} onChange={(e) => setIsCorner(e.target.value === 'corner')} aria-label="ガラスの位置" title="隅角部では風力係数 Cf = 1.5、一般部は Cf = 1.0">
                  <option value="general">一般部 Cf 1.0</option>
                  <option value="corner">隅角部 Cf 1.5</option>
                </select>
              }
            />
          )}
          <KV
            k="設計風圧 W"
            v={
              <>
                <input type="number" value={windPressure} onChange={(e) => setWindPressure(e.target.value)} placeholder="自動" aria-label="設計風圧力 (N/m²)" title="高さ・風速から自動で入ります。直接入力もできます" />
                <span className="glass-sheet__unit">N/㎡</span>
              </>
            }
          />
          <KV
            k="ガラスの種類"
            v={
              <select value={glassType} onChange={(e) => setGlassType(e.target.value as 'float' | 'tempered' | 'laminated')} aria-label="ガラス種別">
                <option value="float">フロート 単板</option>
                <option value="tempered">強化ガラス</option>
                <option value="laminated">合わせガラス</option>
              </select>
            }
          />
          <KV
            k="短辺 × 長辺"
            v={
              <span className="glass-sheet__wh" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <input type="number" value={shortSide} onChange={(e) => setShortSide(e.target.value)} placeholder="1500" aria-label="短辺 (mm)" />
                <span className="glass-sheet__x">×</span>
                <input type="number" value={longSide} onChange={(e) => setLongSide(e.target.value)} placeholder="2400" aria-label="長辺 (mm)" />
                <span className="glass-sheet__unit">mm</span>
              </span>
            }
          />
          <KV
            k="支持"
            v={
              <select value={supportCondition} onChange={(e) => setSupportCondition(e.target.value as SupportCondition)} aria-label="支持条件">
                <option value="FOUR_EDGES_SIMPLY_SUPPORTED">4 辺支持</option>
                <option value="TWO_EDGES_LONG_EDGES_SUPPORTED">2 辺支持(長辺)</option>
              </select>
            }
          />
          <KV
            k="たわみ制限"
            v={
              <select value={deflectionLimitRatio} onChange={(e) => setDeflectionLimitRatio(e.target.value)} aria-label="たわみ制限比" title="L/200 一般的な壁ガラス・標準 / L/175 サッシュ入りガラスなど / L/150 中間的な基準 / L/100 より厳しい基準">
                <option value="200">L/200 標準</option>
                <option value="175">L/175 サッシ</option>
                <option value="150">L/150</option>
                <option value="100">L/100</option>
              </select>
            }
          />
          {!isFull && (
            <p className="glass-sheet__note">
              簡略計算は<strong>ガスト影響係数 Gf を含みません</strong>。告示に基づく設計用風圧力より小さい値になります。設計値としては「告示フル」で照査してください。
            </p>
          )}
          <p className="glass-sheet__note">W は高さ・風速から自動で入ります。直接入力もできます(風の条件を変えると入れ直します)。</p>
          {windErrorMessage && <p className="glass-sheet__err">{windErrorMessage}</p>}
          {glassErrorMessage && <p className="glass-sheet__err">{glassErrorMessage}</p>}
        </section>

        <section className="yy-sheet__block">
          <SecHead no="II" title="計算の過程" right={METHOD_LABEL[pressureMethod]} />
          <Step n="1" k="平均風速の分布係数" f="Er = 1.7 (H/ZG)^α" v={er !== null ? er.toFixed(3) : '—'} />
          <Step n="2" k="速度圧" f={isFull ? 'q = 0.6 Er² Gf V₀²' : 'q = 0.6 Er² V₀²'} v={q !== null ? `${fmtInt(q)} N/㎡` : '—'} />
          <Step
            n="3"
            k="設計風圧"
            f={isFull ? 'W = q · |Cpe − Cpi|' : `W = q · Cf(Cf = ${isCorner ? '1.5' : '1.0'})`}
            v={wOk ? `${fmtInt(wNum)} N/㎡` : '—'}
            strong
          />
          {laminated && (
            <Step n="·" k="等価単板厚" f="t = 0.866 T − 0.268" v={t !== null ? `${(0.866 * t - 0.268).toFixed(1)} mm` : '—'} />
          )}
          <Step
            n="4"
            k={`最大応力${sel ? `(t = ${sel.thicknessMm} mm)` : ''}`}
            f="σ = β w a² / t² ≤ σa"
            v={sel ? `${sel.sigmaMaxMpa.toFixed(2)} / ${sel.sigmaAllowMpa.toFixed(1)} MPa` : '—'}
          />
          <Step
            n="5"
            k="最大たわみ"
            f={`δ = α w a⁴ / (E t³) ≤ a/${deflectionLimitRatio}`}
            v={sel ? `${sel.deflectionMaxMm.toFixed(2)} / ${sel.deflectionAllowMm.toFixed(2)} mm` : '—'}
          />
          <Step n="6" k="判定" f="σ ≤ σa かつ δ ≤ δa" v={res ? (res.ok ? 'OK' : '不足') : '—'} strong />
          {calculationLog && (
            <details className="glass-sheet__log">
              <summary>計算ログ</summary>
              <pre>{calculationLog}</pre>
            </details>
          )}
        </section>
      </>
    );

    const center = (
      <>
        <div className="yy-sheet__fig glass-sheet__fig">
          <GlassFigure
            heightM={hNum > 0 ? hNum : null}
            v0={v0Num > 0 ? v0Num : null}
            shortMm={sNum > 0 ? sNum : null}
            longMm={lNum > 0 ? lNum : null}
            wNm2={wOk ? wNum : null}
            support={supportCondition}
            caption={caption}
          />
        </div>
        <section className="yy-sheet__block">
          <SecHead no="III" title="板厚ごとの比較" right={res ? `候補 ${res.allCandidates.length} 種` : undefined} />
          {res && res.allCandidates.length ? (
            <table className="yy-tbl">
              <colgroup>
                <col style={{ width: 86 }} />
                <col />
                <col />
                <col />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{laminated ? '合計板厚' : '板厚'}</th>
                  <th>許容風圧 N/㎡</th>
                  <th>設計風圧 N/㎡</th>
                  <th>余裕</th>
                  <th>判定</th>
                </tr>
              </thead>
              <tbody>
                {res.allCandidates.map((c) => {
                  const r = govRatio(c);
                  const isMin = !!sel && c.thicknessMm === sel.thicknessMm;
                  return (
                    <tr
                      key={c.thicknessMm}
                      className={isMin ? 'is-hi' : undefined}
                      title={`応力比 ${c.sigmaRatio.toFixed(2)} · たわみ比 ${c.deflectionRatio.toFixed(2)}`}
                    >
                      <td><span className="glass-sheet__t">{c.thicknessMm} mm</span></td>
                      <td>{r > 0 ? fmtInt(wNum / r) : '—'}</td>
                      <td className="glass-sheet__dim">{fmtInt(wNum)}</td>
                      <td className={c.isOk ? undefined : 'is-ng'}>{r > 0 ? fmtPct(1 / r - 1) : '—'}</td>
                      <td>
                        <span className={`glass-sheet__judge ${c.isOk ? 'is-ok' : 'is-ng'}`}>
                          {c.isOk && <i className="yy-dot" style={{ marginRight: 0 }} />}
                          {c.isOk ? (isMin ? 'OK · 最小' : 'OK') : '不足'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="glass-sheet__empty">短辺・長辺・設計風圧 W を入れると、候補の板厚ごとに並びます</p>
          )}
          {res && res.allCandidates.length > 0 && (
            <p className="glass-sheet__foot">
              許容風圧 = W ÷ 応力比・たわみ比の大きい方(σ・δ は W に比例)。行にカーソルを置くと両方の比が出ます
            </p>
          )}
        </section>
      </>
    );

    const right = (
      <>
        <div className={res && !res.ok ? 'glass-sheet__ng' : undefined}>
          {res && res.ok && sel && t !== null && selRatio !== null ? (
            <ResultPanel
              label={laminated ? 'result — 必要な合計厚' : 'result — 必要な厚さ'}
              value={`${t} mm`}
              unit={`以上 · 余裕 ${Math.round((1 / selRatio - 1) * 100)} %`}
              sub={`設計風圧 ${fmtInt(wNum)} N/㎡ ≤ 許容 ${fmtInt(wNum / selRatio)} N/㎡`}
            >
              {laminated && combo && <ResultRow k="構成" v={combo} />}
              {laminated && <ResultRow k="等価単板厚" v={`${(0.866 * t - 0.268).toFixed(1)} mm`} />}
              <ResultRow k="最大応力 / 許容" v={`${sel.sigmaMaxMpa.toFixed(2)} / ${sel.sigmaAllowMpa.toFixed(1)} MPa`} />
              <ResultRow k="最大たわみ / 許容" v={`${sel.deflectionMaxMm.toFixed(2)} / ${sel.deflectionAllowMm.toFixed(2)} mm`} />
              <ResultRow k="決まるもの" v={sel.sigmaRatio >= sel.deflectionRatio ? '応力' : 'たわみ'} />
              <ResultRow k="ガラス · 支持" v={`${GLASS_TYPE_LABEL[glassType]} · ${SUPPORT_LABEL[supportCondition]}`} />
            </ResultPanel>
          ) : res ? (
            <ResultPanel label="result — 必要な厚さ" value="不足" unit="候補の板厚では満たせません" sub={res.message} />
          ) : (
            <ResultPanel label="result — 必要な厚さ" value="— mm" sub="短辺・長辺・設計風圧 W を入れると出ます" />
          )}
        </div>
        <div ref={caseSaveRef}>
          <CaseSave tool="glass-thickness" result={resultLine} ok={!!res?.ok} />
        </div>
        <LookupList slug="design" section="1-8" no="IV" />
      </>
    );

    return (
      <div className="glass-sheet">
        <ModeBar />
        <SheetHead
          no={GLASS_TOOL_NO}
          en="tool · 意匠設計"
          title="ガラス厚計算"
          desc="令82条の4 · 告示 1454 · 板ガラスの応力とたわみ(NSG 技術資料)"
          actions={
            <>
              <SheetButton onClick={() => window.print()} title="この画面を印刷します">計算書</SheetButton>
              <SheetButton primary onClick={saveToCase} disabled={!resultLine} title={resultLine ? undefined : '計算すると保存できます'}>
                案件に保存
              </SheetButton>
            </>
          }
        />
        <Sheet left={left} center={center} right={right} />
        {/* 基準風速別表モーダル */}
        {showWindSpeedTable && <WindSpeedTableModal onClose={() => setShowWindSpeedTable(false)} />}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* 統一された黒帯 */}
      {!hideHeader && (
      <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">ガラス厚計算ツール</h3>
          <p className="text-[11px] mt-0.5">風圧力に基づくガラス厚さの計算と風圧力計算</p>
        </div>
      </div>
      )}
        
      {/* 左中右の三分割エリア */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* 左側：ガラス厚計算 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">短辺 (mm)</label>
              <input
                type="number"
                value={shortSide}
                onChange={(e) => setShortSide(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
                placeholder="短辺の長さを入力"
              />
            </div>
            
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">長辺 (mm)</label>
              <input
                type="number"
                value={longSide}
                onChange={(e) => setLongSide(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
                placeholder="長辺の長さを入力"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-600 mb-1">設計風圧力 (N/m²)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={windPressure}
                  onChange={(e) => setWindPressure(e.target.value)}
                  className="flex-1 text-[11px] border rounded px-2 py-1"
                  placeholder="直接入力 or 風圧力計算で自動反映"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-600 mb-1">ガラス種別</label>
              <select
                value={glassType}
                onChange={(e) => setGlassType(e.target.value as 'float' | 'tempered' | 'laminated')}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="float">フロートガラス（単板）</option>
                <option value="tempered">強化ガラス</option>
                <option value="laminated">合わせガラス</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-600 mb-1">支持条件</label>
              <select
                value={supportCondition}
                onChange={(e) => setSupportCondition(e.target.value as SupportCondition)}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="FOUR_EDGES_SIMPLY_SUPPORTED">四辺単純支持</option>
                <option value="TWO_EDGES_LONG_EDGES_SUPPORTED">二辺単純支持（長辺支持）</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-600 mb-1">たわみ制限比 (L/○○)</label>
              <select
                value={deflectionLimitRatio}
                onChange={(e) => setDeflectionLimitRatio(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="200">L/200 (一般的な壁ガラス・標準)</option>
                <option value="175">L/175 (サッシュ入りガラスなど)</option>
                <option value="150">L/150 (中間的な基準)</option>
                <option value="100">L/100 (より厳しい基準)</option>
              </select>
            </div>

            {glassErrorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-[11px] text-red-700">{glassErrorMessage}</p>
              </div>
            )}

            <button
              onClick={calculateGlassThickness}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded text-[11px] hover:bg-blue-700 transition"
            >
              ガラス厚計算
            </button>
          </div>
        </div>
      </div>

        {/* 中央：風圧力計算 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">風圧算定法</label>
              <select
                value={pressureMethod}
                onChange={(e) => setPressureMethod(e.target.value as 'KOKUJI_SIMPLE' | 'NSG_SIMPLE' | 'KOKUJI_FULL')}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="NSG_SIMPLE">NSG簡略（板硝子協会・実務近似）</option>
                <option value="KOKUJI_SIMPLE">告示簡略（従来式）</option>
                <option value="KOKUJI_FULL">告示フル（Gf・外圧/内圧係数で正味）</option>
              </select>
              {pressureMethod !== 'KOKUJI_FULL' && (
                <p className="mt-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  簡略計算は<strong>ガスト影響係数 Gf を含みません</strong>。告示に基づく設計用風圧力より小さい値になります。設計値としては「告示フル」で照査してください。
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">地表面粗度区分</label>
              {/*
                ★修正前は「Ⅲ=丘陵部」「Ⅳ=山岳部」と地形の起伏で説明していたが、
                  告示1454号の粗度区分は「周囲の建物・樹木の多さ」の区分であり別物。
                  市街地の設計者がⅢ/Ⅳを選べず、逆に平坦地の設計者が「山岳部」と誤解して
                  Ⅳを選ぶと風圧が大幅に小さく出る（＝危険側）ため、告示の定義に合わせる。
              */}
              <select
                value={regionType}
                onChange={(e) => setRegionType(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="1">Ⅰ（極めて平坦で障害物がない・海岸線付近）</option>
                <option value="2">Ⅱ（田園地帯・樹木や低層建築物が散在）</option>
                <option value="3">Ⅲ（一般の市街地）</option>
                <option value="4">Ⅳ（中高層建築物が密集する大都市中心部）</option>
              </select>
              <p className="mt-1 text-[10px] text-gray-500">
                周囲の建物・樹木が多いほど番号が大きくなります（＝風圧は小さくなります）。地形の起伏ではありません。
              </p>
            </div>
            
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">建物高さ <span className="font-bold">(m)</span></label>
              <input
                type="number"
                value={buildingHeight}
                onChange={(e) => setBuildingHeight(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
                placeholder="建物高さを入力"
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-600 mb-1">
                基準風速 V₀ (m/s)
                <button
                  type="button"
                  onClick={() => setShowWindSpeedTable(true)}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline text-[10px]"
                >
                  別表を見る
                </button>
              </label>
              <select
                value={basicWindSpeed}
                onChange={(e) => setBasicWindSpeed(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="30">30 m/s</option>
                <option value="32">32 m/s</option>
                <option value="34">34 m/s</option>
                <option value="36">36 m/s</option>
                <option value="38">38 m/s</option>
                <option value="40">40 m/s</option>
                <option value="42">42 m/s</option>
                <option value="44">44 m/s</option>
                <option value="46">46 m/s</option>
              </select>
            </div>
            {/* ★追加: 簡易計算での風力係数（Cf）考慮 */}
            {(pressureMethod === 'NSG_SIMPLE' || pressureMethod === 'KOKUJI_SIMPLE') && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCorner}
                    onChange={(e) => setIsCorner(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="text-[11px] font-semibold text-gray-800">隅角部（建物の角部）</span>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      隅角部では風力係数Cf=1.5として計算します（一般部はCf=1.0）
                    </p>
                  </div>
                </label>
              </div>
            )}
            {pressureMethod === 'KOKUJI_FULL' && (
              <>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">ガスト影響係数 Gf</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gustFactor}
                    onChange={(e) => setGustFactor(e.target.value)}
                    className="w-full text-[11px] border rounded px-2 py-1"
                    placeholder="例: 2.0"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">外圧係数 Cpe</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cpe}
                      onChange={(e) => setCpe(e.target.value)}
                      className="w-full text-[11px] border rounded px-2 py-1"
                      placeholder="例: -0.8"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">内圧係数 Cpi</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cpi}
                      onChange={(e) => setCpi(e.target.value)}
                      className="w-full text-[11px] border rounded px-2 py-1"
                      placeholder="例: 0.0"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              onClick={calculateWindPressure}
              className="w-full bg-green-600 text-white px-4 py-2 rounded text-[11px] hover:bg-green-700 transition"
            >
              風圧力計算
            </button>

            {windErrorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-[11px] text-red-700">{windErrorMessage}</p>
              </div>
            )}

            <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded">
              <p className="text-[11px] text-gray-700">
                計算結果は左側の設計風圧力に自動反映されます。直接入力も可能です。
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* 右側：計算結果エリア */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4">
          {calculationResult ? (
            calculationResult.ok && calculationResult.selected ? (
              <>
                {/* 上段：推奨板厚（大きく） */}
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <p className="text-[11px] text-gray-600">
                    {glassType === 'laminated' ? '推奨合計板厚' : '推奨板厚'}
                  </p>
                  <p className="text-xl font-bold text-gray-800">
                    {calculationResult.recommendedThicknessMm} <span className="text-[11px]">mm</span>
                  </p>
                  {glassType === 'laminated' && calculationResult.recommendedThicknessMm && (
                    <>
                      <p className="text-[10px] text-gray-500 mt-1">
                        推奨板厚構成: {getLaminatedCombinationLabel(calculationResult.recommendedThicknessMm)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        等価単板厚: {(0.866 * calculationResult.recommendedThicknessMm - 0.268).toFixed(1)} mm
                      </p>
                    </>
                  )}
                </div>
                {/* 中段1：使用した設計風圧 × 最大応力（横並び） */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[11px] text-gray-600">使用した設計風圧</p>
                    <p className="text-sm font-bold text-gray-800">
                      {windPressure} <span className="text-[10px]">N/m²</span> ({(parseFloat(windPressure) / 1000).toFixed(3)} <span className="text-[10px]">kN/m²</span>)
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      風圧算定法: {
                        pressureMethod === 'NSG_SIMPLE'
                          ? 'NSG簡略'
                          : pressureMethod === 'KOKUJI_SIMPLE'
                          ? '告示簡略'
                          : '告示フル'
                      }
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[11px] text-gray-600">最大応力</p>
                    <p className="text-sm font-bold text-gray-800">
                      {calculationResult.selected.sigmaMaxMpa.toFixed(2)} <span className="text-[10px]">MPa</span>
                    </p>
                    <p className="text-[10px] text-gray-500">応力比: {calculationResult.selected.sigmaRatio.toFixed(2)}</p>
                  </div>
                </div>
                {/* 中段2：最大たわみ × 許容応力（横並び） */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[11px] text-gray-600">最大たわみ</p>
                    <p className="text-sm font-bold text-gray-800">
                      {calculationResult.selected.deflectionMaxMm.toFixed(2)} <span className="text-[10px]">mm</span>
                    </p>
                    <p className="text-[10px] text-gray-500">たわみ比: {calculationResult.selected.deflectionRatio.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[11px] text-gray-600">許容応力</p>
                    <p className="text-sm font-bold text-gray-800">
                      {calculationResult.selected.sigmaAllowMpa.toFixed(1)} <span className="text-[10px]">MPa</span>
                    </p>
                    <p className="text-[10px] text-gray-500">許容たわみ: {calculationResult.selected.deflectionAllowMm.toFixed(2)} mm</p>
                  </div>
                </div>
                <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded mt-3">
                  <p className="text-[10px] text-gray-700 mb-2 font-semibold">計算ログ</p>
                  <pre className="text-[9px] text-gray-600 whitespace-pre-wrap font-mono max-h-80 overflow-auto">
                    {calculationLog}
                  </pre>
                </div>
              </>
            ) : (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                <p className="text-[11px] font-semibold text-red-800 mb-1">計算結果</p>
                <p className="text-[11px] text-red-700">{calculationResult.message}</p>
              </div>
            )
          ) : (
            <div className="text-center text-gray-400 text-[11px] py-8">
              <p>計算結果がここに表示されます</p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* 基準風速別表モーダル */}
      {showWindSpeedTable && (
        <WindSpeedTableModal onClose={() => setShowWindSpeedTable(false)} />
      )}
    </div>
  );
};

export default GlassThickness; 