import React, { useState, useEffect } from 'react';

// 用途地域の定義
interface ZoningRegulation {
  name: string;
  buildingCoverageRatios: number[];
  floorAreaRatios: number[];
}

interface ZoningArea {
  zoning: string;
  area: number;
  selectedBCR: number;
  selectedFAR: number;
}

interface BuildingRegulationsProps {
  hideHeader?: boolean;
}

const BuildingRegulations: React.FC<BuildingRegulationsProps> = ({ hideHeader }) => {
  const ZONING_REGULATIONS: { [key: string]: ZoningRegulation } = {
    category1Low: {
      name: '第一種低層住居専用地域',
      buildingCoverageRatios: [30, 40, 50, 60],
      floorAreaRatios: [50, 60, 80, 100, 150, 200]
    },
    category2Low: {
      name: '第二種低層住居専用地域',
      buildingCoverageRatios: [30, 40, 50, 60],
      floorAreaRatios: [50, 60, 80, 100, 150, 200]
    },
    category1Mid: {
      name: '第一種中高層住居専用地域',
      buildingCoverageRatios: [30, 40, 50, 60],
      floorAreaRatios: [100, 150, 200, 300]
    },
    category2Mid: {
      name: '第二種中高層住居専用地域',
      buildingCoverageRatios: [40, 50, 60],
      floorAreaRatios: [100, 150, 200, 300]
    },
    category1: {
      name: '第一種住居地域',
      buildingCoverageRatios: [50, 60],
      floorAreaRatios: [100, 200, 300]
    },
    category2: {
      name: '第二種住居地域',
      buildingCoverageRatios: [50, 60],
      floorAreaRatios: [200, 300, 400]
    },
    quasiCategory: {
      name: '準住居地域',
      buildingCoverageRatios: [50, 60, 80],
      floorAreaRatios: [200, 300, 400]
    },
    neighborhood: {
      name: '近隣商業地域',
      buildingCoverageRatios: [60, 80],
      floorAreaRatios: [200, 300, 400]
    },
    commercial: {
      name: '商業地域',
      buildingCoverageRatios: [80],
      floorAreaRatios: [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300]
    },
    quasiIndustrial: {
      name: '準工業地域',
      buildingCoverageRatios: [50, 60],
      floorAreaRatios: [200, 300, 400]
    },
    industrial: {
      name: '工業地域',
      buildingCoverageRatios: [50, 60],
      floorAreaRatios: [200, 300, 400]
    },
    exclusiveIndustrial: {
      name: '工業専用地域',
      buildingCoverageRatios: [30, 40, 50, 60],
      floorAreaRatios: [200, 300, 400]
    }
  };

  const RESIDENTIAL_ZONES = [
    'category1Low',
    'category2Low',
    'category1Medium',
    'category2Medium',
    'category1Residential',
    'category2Residential',
    'quasiResidential'
  ];

  // State
  const [zoningAreas, setZoningAreas] = useState<ZoningArea[]>([
    {
      zoning: 'category1Low',
      area: 0,
      selectedBCR: ZONING_REGULATIONS.category1Low.buildingCoverageRatios[0],
      selectedFAR: ZONING_REGULATIONS.category1Low.floorAreaRatios[0]
    }
  ]);
  const [isCornerLot, setIsCornerLot] = useState<boolean>(false);
  const [isFireproofBuilding, setIsFireproofBuilding] = useState<boolean>(false);
  const [hasRoadWidthLimit, setHasRoadWidthLimit] = useState<boolean>(false);
  const [roadWidth, setRoadWidth] = useState<number>(0);
  const [calculationResults, setCalculationResults] = useState<{
    averageBCR: number;
    averageFAR: number;
    maxBuildingFootprint: number;
    maxFloorArea: number;
  } | null>(null);

  // 計算ロジック
  const calculateBuildingRegulations = () => {
    const totalLandArea = zoningAreas.reduce((sum, area) => sum + (area.area || 0), 0);
    if (totalLandArea <= 0) return null;

    let weightedBCR = 0;
    let weightedFAR = 0;
    let totalArea = 0;

    zoningAreas.forEach(({ area, selectedBCR, selectedFAR }) => {
      if (area > 0) {
        weightedBCR += (selectedBCR / 100) * area;
        weightedFAR += (selectedFAR / 100) * area;
        totalArea += area;
      }
    });

    if (totalArea <= 0) return null;

    let averageBCR = (weightedBCR / totalArea) * 100;
    let averageFAR = (weightedFAR / totalArea) * 100;

    // 前面道路幅員による容積率制限
    if (hasRoadWidthLimit && roadWidth > 0) {
      const residentialArea = zoningAreas.reduce((sum, { area, zoning }) => 
        RESIDENTIAL_ZONES.includes(zoning) ? sum + (area || 0) : sum, 0);
      const otherArea = totalArea - residentialArea;

      const residentialRoadLimit = roadWidth * 0.4 * 100;
      const otherRoadLimit = roadWidth * 0.6 * 100;

      const weightedRoadLimit = 
        (residentialRoadLimit * residentialArea + otherRoadLimit * otherArea) / totalArea;

      averageFAR = Math.min(averageFAR, weightedRoadLimit);
    }

    // 緩和の適用
    const relaxationPercentage = (isCornerLot ? 10 : 0) + (isFireproofBuilding ? 10 : 0);
    averageBCR = Math.min(averageBCR + relaxationPercentage, 100);

    const maxBuildingFootprint = totalLandArea * (averageBCR / 100);
    const maxFloorArea = totalLandArea * (averageFAR / 100);

    return {
      averageBCR,
      averageFAR,
      maxBuildingFootprint,
      maxFloorArea
    };
  };

  // 用途地域の追加
  const addZoningArea = () => {
    if (zoningAreas.length < 3) {
      const newZoning = 'category1Low';
      setZoningAreas([...zoningAreas, {
        zoning: newZoning,
        area: 0,
        selectedBCR: ZONING_REGULATIONS[newZoning].buildingCoverageRatios[0],
        selectedFAR: ZONING_REGULATIONS[newZoning].floorAreaRatios[0]
      }]);
    }
  };

  // 用途地域の削除
  const removeZoningArea = (index: number) => {
    if (zoningAreas.length > 1) {
      setZoningAreas(zoningAreas.filter((_, i) => i !== index));
    }
  };

  // 用途地域の更新
  const updateZoningArea = (index: number, field: 'zoning' | 'area' | 'selectedBCR' | 'selectedFAR', value: string | number) => {
    const newZoningAreas = [...zoningAreas];
    if (field === 'zoning') {
      const zoning = value as string;
      newZoningAreas[index] = {
        ...newZoningAreas[index],
        zoning,
        selectedBCR: ZONING_REGULATIONS[zoning].buildingCoverageRatios[0],
        selectedFAR: ZONING_REGULATIONS[zoning].floorAreaRatios[0]
      };
    } else if (field === 'area') {
      newZoningAreas[index].area = Number(value) || 0;
    } else if (field === 'selectedBCR') {
      newZoningAreas[index].selectedBCR = Number(value);
    } else if (field === 'selectedFAR') {
      newZoningAreas[index].selectedFAR = Number(value);
    }
    setZoningAreas(newZoningAreas);
  };

  // 計算結果の更新
  useEffect(() => {
    const results = calculateBuildingRegulations();
    setCalculationResults(results);
  }, [zoningAreas, isCornerLot, isFireproofBuilding, hasRoadWidthLimit, roadWidth]);

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100 font-sans">
      {!hideHeader && (
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
        <h3 className="text-[13px] font-medium">建蔽容積率計算</h3>
          <p className="text-[11px] mt-0.5">用途地域に基づく建蔽率・容積率の計算</p>
        </div>
      </div>
      )}
      <div className="p-4">
        <div className="flex gap-4">
          {/* 左側：入力エリア */}
          <div className="w-[700px] space-y-4">
            {/* 全体敷地面積の表示 */}
            <div className="w-1/4">
              <label className="block text-[12px] font-medium text-gray-600 mb-1">
                全体敷地面積 (m²)
              </label>
              <div className="w-full px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded text-right">
                {zoningAreas.reduce((sum, area) => sum + (area.area || 0), 0).toFixed(2)} m²
              </div>
            </div>

            {/* 緩和条件のチェックボックス */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cornerLot"
                  checked={isCornerLot}
                  onChange={(e) => setIsCornerLot(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="cornerLot" className="ml-2 text-[12px] text-gray-700">
                  角地緩和
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fireproofBuilding"
                  checked={isFireproofBuilding}
                  onChange={(e) => setIsFireproofBuilding(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="fireproofBuilding" className="ml-2 text-[12px] text-gray-700">
                  防火地域+耐火建築物
                </label>
              </div>
            </div>

            {/* 前面道路幅員制限 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="roadWidthLimit"
                  checked={hasRoadWidthLimit}
                  onChange={(e) => setHasRoadWidthLimit(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="roadWidthLimit" className="ml-2 text-[12px] text-gray-700">
                  前面道路幅員制限
                </label>
              </div>
              {hasRoadWidthLimit && (
                <div className="flex items-center space-x-2">
                  <label className="text-[12px] text-gray-700">道路幅員:</label>
                  <input
                    type="number"
                    value={roadWidth}
                    onChange={(e) => setRoadWidth(Number(e.target.value))}
                    className="w-20 px-2 py-1 text-[12px] border border-gray-200 rounded"
                    placeholder="0"
                  />
                  <span className="text-[12px] text-gray-700">m</span>
                </div>
              )}
            </div>

            {/* 用途地域入力 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-medium text-gray-700">用途地域</h4>
                <button
                  onClick={addZoningArea}
                  disabled={zoningAreas.length >= 3}
                  className="px-2 py-1 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  追加
                </button>
              </div>

              {zoningAreas.map((area, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border border-gray-200 rounded">
                  <div className="col-span-4">
                    <label className="block text-[12px] font-medium text-gray-600 mb-1">
                      用途地域
                    </label>
                    <select
                      value={area.zoning}
                      onChange={(e) => updateZoningArea(index, 'zoning', e.target.value)}
                      className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded"
                    >
                      {Object.entries(ZONING_REGULATIONS).map(([key, regulation]) => (
                        <option key={key} value={key}>
                          {regulation.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-gray-600 mb-1">
                      面積 (m²)
                    </label>
                    <input
                      type="number"
                      value={area.area || ''}
                      onChange={(e) => updateZoningArea(index, 'area', e.target.value)}
                      className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-right"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-gray-600 mb-1">
                      建蔽率 (%)
                    </label>
                    <select
                      value={area.selectedBCR}
                      onChange={(e) => updateZoningArea(index, 'selectedBCR', e.target.value)}
                      className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-center"
                    >
                      {ZONING_REGULATIONS[area.zoning].buildingCoverageRatios.map((ratio) => (
                        <option key={ratio} value={ratio}>
                          {ratio}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-gray-600 mb-1">
                      容積率 (%)
                    </label>
                    <select
                      value={area.selectedFAR}
                      onChange={(e) => updateZoningArea(index, 'selectedFAR', e.target.value)}
                      className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-center"
                    >
                      {ZONING_REGULATIONS[area.zoning].floorAreaRatios.map((ratio) => (
                        <option key={ratio} value={ratio}>
                          {ratio}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => removeZoningArea(index)}
                      disabled={zoningAreas.length <= 1}
                      className="w-full px-2 py-1.5 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：計算結果 */}
          <div className="w-72 space-y-4 border-l border-gray-100 pl-4">
            <div>
              <div className="mb-4">
                <p className="text-[12px] text-gray-600">許容建蔽率:</p>
                <p className="text-lg font-bold text-gray-800">
                  {calculationResults?.averageBCR.toFixed(2) ?? '-'}%
                </p>
              </div>
              <div className="mb-4">
                <p className="text-[12px] text-gray-600">許容容積率:</p>
                <p className="text-lg font-bold text-gray-800">
                  {calculationResults?.averageFAR.toFixed(2) ?? '-'}%
                </p>
              </div>
              <div className="mb-4">
                <p className="text-[12px] text-gray-600">可能建築面積:</p>
                <p className="text-lg font-bold text-gray-800">
                  {calculationResults?.maxBuildingFootprint.toFixed(2) ?? '-'} m²
                </p>
              </div>
              <div>
                <p className="text-[12px] text-gray-600">可能延床面積:</p>
                <p className="text-lg font-bold text-gray-800">
                  {calculationResults?.maxFloorArea.toFixed(2) ?? '-'} m²
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingRegulations; 