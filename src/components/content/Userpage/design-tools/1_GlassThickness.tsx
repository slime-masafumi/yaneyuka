import React, { useState } from 'react';
import { WindSpeedTableModal } from './WindSpeedTableModal';
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
}

const GlassThickness: React.FC<GlassThicknessProps> = ({ hideHeader }) => {
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

  // 地表面粗度係数 Er の計算（告示1454号に基づく）
  // 地表面粗度区分と建物高さHに依存
  const calculateEr = (regionTypeNum: number, buildingHeightNum: number): number => {
    // H < 5m の場合は 5m として扱う（ここで補正してしまう）
    const H = Math.max(buildingHeightNum, 5);

    // 地域区分ごとの係数定義 [係数, 指数]
    // 1:海岸, 2:平地, 3:丘陵, 4:山岳
    const factors: Record<number, { base: number; exp: number }> = {
      1: { base: 1.38, exp: 0.12 },
      2: { base: 1.00, exp: 0.15 },
      3: { base: 0.69, exp: 0.18 },
      4: { base: 0.47, exp: 0.21 }
    };

    const factor = factors[regionTypeNum] || factors[2]; // デフォルトはⅡ地域

    // 基本Er算出 (告示簡略式ベース)
    const baseEr = factor.base * Math.pow(H / 250, factor.exp);

    // 計算方法による分岐
    if (pressureMethod === 'KOKUJI_SIMPLE') {
      return baseEr;
    } else {
      // NSG簡略などはⅡ地域のみ補正係数を掛ける運用
      // ★補正係数1.624の根拠: 板硝子協会の簡略表（実務手引き）において、
      // Ⅱ地域・H=20m付近での速度圧を告示簡略式の結果に近似させるための補正係数。
      // 告示簡略式のみでは実測値や実務表値より低めに出る傾向があるため、
      // 安全側（高め）に補正する目的で導入。出典: 板硝子協会「板ガラスの強度と安全」等の実務手引き
      const scale = regionTypeNum === 2 ? 1.624 : 1.0;
      return baseEr * scale;
    }
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
      setWindErrorMessage('有効な地域区分、建物高さ（>0）、基準風速を入力してください。');
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

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* 統一された黒帯 */}
      {!hideHeader && (
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
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
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">地域区分</label>
              <select
                value={regionType}
                onChange={(e) => setRegionType(e.target.value)}
                className="w-full text-[11px] border rounded px-2 py-1"
              >
                <option value="1">Ⅰ地域（海岸部）</option>
                <option value="2">Ⅱ地域（平地部）</option>
                <option value="3">Ⅲ地域（丘陵部）</option>
                <option value="4">Ⅳ地域（山岳部）</option>
              </select>
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