import React, { useState } from 'react';

// 要件の型定義
interface Requirement {
  type: string[];
  minArea?: number; // 非耐火・通常階の基準面積
  minFloor?: number;
  capacity?: number; // 収容人員要件
  conditionText: string;
  law: string;
  // 追加: 無窓階や地階の場合の特別基準フラグなどが必要ですが、今回は簡易ロジックで対応
  strictForBasementOrWindowless?: boolean; 
}

// 設備の型定義
interface Equipment {
  name_jp: string;
  requirements: Requirement[];
}

interface FireEquipmentProps {
  hideHeader?: boolean;
}

const FireEquipment: React.FC<FireEquipmentProps> = ({ hideHeader }) => {
  // 消防設備関連のstate
  const [buildingType, setBuildingType] = useState<string>('');
  const [floorCount, setFloorCount] = useState<number>(0);
  const [totalArea, setTotalArea] = useState<number>(0);
  const [capacity, setCapacity] = useState<number>(0); // 追加: 収容人員
  const [isFireproof, setIsFireproof] = useState<boolean>(true); // 追加: 耐火・準耐火建築物かどうか
  const [hasBasementOrWindowless, setHasBasementOrWindowless] = useState<boolean>(false); // 追加: 無窓階・地階の有無
  const [showResults, setShowResults] = useState<boolean>(false);
  const [results, setResults] = useState<any[]>([]);

  // 消防設備設置基準データ（修正版）
  // ※倍読み（耐火構造なら面積2倍など）はロジック側で吸収します
  const equipmentStandards: Record<string, Equipment> = {
    shoukaki: {
      name_jp: "消火器",
      requirements: [
        { type: ['all'], minArea: 150, conditionText: "延べ面積150㎡以上 (耐火構造等は300㎡)", law: "令第10条" },
        { type: ['1-i', '1-ro', '2-i', '2-ro', '2-ha', '2-ni', '3-i', '3-ro', '4', '5-i', '6-i', '6-ro', '6-ha', '9-i', '12-ro', '16-i', '16-2', '16-3'], minArea: 0, conditionText: "特定防火対象物（一部除く）または地階・無窓階・3階以上は面積に関わらず必要", law: "令第10条" },
        // 地階・無窓階・3階以上は面積に関係なく設置が必要なため、簡易的に全対象として判定
      ]
    },
    okunaiShoukasen: {
      name_jp: "屋内消火栓設備",
      requirements: [
        // 耐火建築物はロジックで基準値を倍にします（700 -> 1400, 1400 -> 2800）
        { type: ['1-i', '1-ro', '2-i', '2-ro', '2-ha', '2-ni', '3-i', '3-ro', '4', '5-i', '6-i', '6-ro', '6-ha', '9-i', '12-ro', '16-i'], minArea: 700, conditionText: "特定防火対象物 延べ700㎡以上 (耐火構造は倍読み)", law: "令第11条" },
        { type: ['7','8','9-ro','10','11','12-i','13-i','13-ro','14','15','17'], minArea: 1400, conditionText: "非特定防火対象物 延べ1400㎡以上 (耐火構造は倍読み)", law: "令第11条" },
        // 地階・無窓階等の厳しい基準
        { type: ['all'], minArea: 150, strictForBasementOrWindowless: true, conditionText: "地階・無窓階・4階以上で床面積が基準(100㎡/150㎡)以上", law: "令第11条" }
      ]
    },
    sprinkler: {
      name_jp: "スプリンクラー設備",
      requirements: [
        { type: ['all'], minFloor: 11, conditionText: "11階以上の階", law: "令第12条" },
        // 6項ロ（重要修正）
        { type: ['6-ro', '6-ha'], minArea: 275, conditionText: "6項ロ・ハ（介助が必要な施設）275㎡以上 ※条件により全域設置", law: "令第12条" },
        { type: ['1-i', '1-ro', '2-i', '2-ro', '2-ha', '2-ni'], minArea: 3000, conditionText: "特定用途 3000㎡以上 (耐火構造でも倍読みなし)", law: "令第12条" },
        { type: ['4', '5-i', '16-i'], minArea: 3000, conditionText: "店舗・ホテル等 3000㎡以上 (※複合用途の場合は基準が複雑)", law: "令第12条" },
        // 無窓階・地階
        { type: ['all'], minArea: 1000, strictForBasementOrWindowless: true, conditionText: "地階・無窓階・4階以上・11階以上で基準面積以上", law: "令第12条" }
      ]
    },
    jikaHou: {
      name_jp: "自動火災報知設備",
      requirements: [
        { type: ['6-i', '6-ro', '6-ha', '6-ni'], minArea: 0, conditionText: "病院・福祉施設等は原則全域設置 (面積要件なし)", law: "令第21条" },
        { type: ['1-i', '1-ro', '2-i', '2-ro', '2-ha', '2-ni', '3-i', '3-ro', '4', '5-i', '9-i', '16-i', '16-2', '16-3'], minArea: 300, conditionText: "特定防火対象物 300㎡以上", law: "令第21条" },
        { type: ['5-ro', '7','8','9-ro','10','11','12-i','12-ro','13-i','13-ro','14','15','17'], minArea: 500, conditionText: "非特定防火対象物 500㎡以上", law: "令第21条" },
        { type: ['all'], minArea: 0, strictForBasementOrWindowless: true, conditionText: "地階・無窓階・3階以上等は小さな面積でも必要", law: "令第21条" }
      ]
    },
    hijouKeihou: {
      name_jp: "非常警報器具・設備",
      requirements: [
        // 収容人員での判定を修正
        { type: ['all'], capacity: 50, conditionText: "収容人員50人以上 (特定用途・非特定用途問わず)", law: "令第24条" },
        { type: ['all'], minArea: 0, strictForBasementOrWindowless: true, capacity: 20, conditionText: "地階・無窓階で20人以上", law: "令第24条" }
      ]
    },
    yuudouTou: {
      name_jp: "誘導灯",
      requirements: [
        { type: ['all'], minArea: 0, conditionText: "原則設置 (特定用途は必須、非特定は条件緩和あり)", law: "令第26条" }
      ]
    },
    hinanKigu: {
      name_jp: "避難器具",
      requirements: [
        { type: ['all'], capacity: 20, minFloor: 2, conditionText: "2階以上で収容人員が一定(20~50人)以上", law: "令第25条" },
        { type: ['6-i', '6-ro', '6-ha'], minFloor: 2, conditionText: "福祉施設等は2階以上で設置義務の可能性高", law: "令第25条" }
      ]
    },
    shoubouYousui: {
      name_jp: "消防用水",
      requirements: [
        // 敷地面積ルールは複雑なため、一般的な延べ面積ルールのみ記載
        // 耐火建築物かどうかが重要
        { type: ['all'], minArea: 7000, conditionText: "延べ面積が広大(7000㎡~)な場合", law: "令第27条" }
      ]
    }
  };

  const checkRequirements = () => {
    if (!buildingType || floorCount <= 0 || totalArea <= 0) {
      alert('全ての項目を正しく入力してください。');
      return;
    }

    const newResults: any[] = [];

    Object.keys(equipmentStandards).forEach((key) => {
      const equipment = equipmentStandards[key];
      let required = false;
      let matchedReq: Requirement | null = null;

      for (const req of equipment.requirements) {
        // 用途判定
        const typeMatch = req.type.includes('all') || req.type.includes(buildingType);
        if (!typeMatch) continue;

        // 階数判定
        const floorMatch = !req.minFloor || floorCount >= req.minFloor;
        if (!floorMatch) continue;

        // 収容人員判定 (入力がある場合のみチェック、0なら無視または簡易判定)
        const capacityMatch = !req.capacity || (capacity > 0 && capacity >= req.capacity);
        
        // 面積判定 (重要: 耐火構造の倍読み処理)
        let effectiveMinArea = req.minArea || 0;
        
        // 消火器は倍読みあり
        if (key === 'shoukaki' && isFireproof) {
            effectiveMinArea = effectiveMinArea * 2;
        }
        // 屋内消火栓は倍読みあり
        if (key === 'okunaiShoukasen' && isFireproof) {
            // 地階・無窓階要件でなければ倍読み
            if (!req.strictForBasementOrWindowless) {
                 effectiveMinArea = effectiveMinArea * 2; // 正確には耐火は2倍、準耐火も計算あり
            }
        }
        
        // 地階・無窓階がある場合、面積要件が厳しくなる(または0になる)ケースの簡易再現
        let areaMatch = totalArea >= effectiveMinArea;
        
        if (hasBasementOrWindowless && req.strictForBasementOrWindowless) {
            // 無窓階フラグがあり、かつその要件定義がある場合
            // 通常より厳しい基準（例：150㎡以上など）で判定
            if (totalArea >= (effectiveMinArea > 0 ? 150 : 0)) { // 簡易的に150㎡などを閾値に
                 areaMatch = true;
            }
        } else if (req.strictForBasementOrWindowless && !hasBasementOrWindowless) {
            // 無窓階用のルールの場合は、無窓階フラグがないならスキップ
            continue; 
        }

        if (areaMatch && capacityMatch) {
          required = true;
          matchedReq = req;
          break; // 一つでも要件に合致すれば「必要」
        }
      }

      newResults.push({
        name: equipment.name_jp,
        required: required ? '〇' : '－', // ✕よりーの方が誤解が少ない
        law: required ? matchedReq?.law : '',
        condition: required ? matchedReq?.conditionText : '基準以下の可能性'
      });
    });

    setResults(newResults);
    setShowResults(true);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 max-w-2xl mx-auto my-8">
      {!hideHeader && (
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white rounded-t-lg">
        <h3 className="text-[13px] font-medium">消防設備判定ツール (Beta)</h3>
      </div>
      )}
      <div className="p-6">
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          <strong>重要:</strong> 建築構造（耐火・準耐火）や無窓階の有無により基準は大きく異なります。
          このツールは目安であり、法的効力はありません。必ず所轄消防署へ相談してください。
        </div>

        <div className="space-y-4">
            {/* 1. 防火対象物区分 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">1. 用途区分</label>
              <select 
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-xs"
              >
                <option value="">選択してください</option>
                <optgroup label="特定防火対象物">
                  <option value="1-i">1項イ（劇場・映画館）</option>
                  <option value="2-i">2項イ（キャバレー・遊技場）</option>
                  <option value="3-ro">3項ロ（飲食店）</option>
                  <option value="4">4項（物品販売店舗）</option>
                  <option value="5-i">5項イ（ホテル・旅館）</option>
                  <option value="6-i">6項イ（病院・診療所）</option>
                  <option value="6-ro">6項ロ（老人ホーム・福祉施設）</option>
                  <option value="16-2">16項の2（地下街）</option>
                </optgroup>
                <optgroup label="非特定防火対象物">
                  <option value="5-ro">5項ロ（共同住宅）</option>
                  <option value="7">7項（学校）</option>
                  <option value="12-i">12項イ（工場）</option>
                  <option value="14">14項（倉庫）</option>
                  <option value="15">15項（事務所）</option>
                </optgroup>
              </select>
            </div>

            {/* 2. 建物の規模 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">2. 延床面積 (m²)</label>
                <input 
                    type="number" 
                    value={totalArea || ''}
                    onChange={(e) => setTotalArea(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded text-xs"
                />
                </div>
                <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">3. 階数</label>
                <input 
                    type="number" 
                    value={floorCount || ''}
                    onChange={(e) => setFloorCount(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded text-xs"
                />
                </div>
            </div>

            {/* 3. 詳細条件（ここが重要） */}
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 mb-2">4. 建物の詳細条件</label>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            id="fireproof"
                            checked={isFireproof}
                            onChange={(e) => setIsFireproof(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="fireproof" className="text-xs">
                            耐火建築物・準耐火建築物である (基準面積が緩和されます)
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            id="basement"
                            checked={hasBasementOrWindowless}
                            onChange={(e) => setHasBasementOrWindowless(e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="basement" className="text-xs">
                            地階 または 無窓階（窓が規定より少ない階）がある
                        </label>
                    </div>
                    <div className="flex items-center mt-2">
                        <label className="text-xs mr-2 w-20">収容人員:</label>
                        <input 
                            type="number" 
                            value={capacity || ''}
                            onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                            placeholder="人数"
                            className="w-24 p-1 border border-gray-300 rounded text-xs"
                        />
                        <span className="text-[10px] text-gray-500 ml-2">※従業員と利用者の合計</span>
                    </div>
                </div>
            </div>

            <div className="text-center pt-2">
              <button 
                onClick={checkRequirements}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 text-xs font-bold shadow-sm"
              >
                判定を実行
              </button>
            </div>
        </div>

        {/* 結果表示 */}
        {showResults && (
            <div className="mt-6 border-t pt-4">
              <h2 className="text-xs font-bold mb-3">判定結果</h2>
              <div className="grid grid-cols-1 gap-2">
                {results.map((result, index) => (
                  <div key={index} className={`p-2 rounded border flex justify-between items-center ${result.required === '〇' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="w-1/3">
                      <span className="text-xs font-bold text-gray-800">{result.name}</span>
                    </div>
                    <div className="w-2/3 pl-2 border-l border-gray-200">
                        <div className="flex items-center mb-1">
                            <span className={`text-sm font-bold mr-2 ${result.required === '〇' ? 'text-red-600' : 'text-gray-400'}`}>
                                {result.required === '〇' ? '設置が必要' : '対象外の可能性'}
                            </span>
                            {result.law && <span className="text-[10px] bg-gray-200 px-1 rounded text-gray-600">{result.law}</span>}
                        </div>
                        <p className="text-[10px] text-gray-600 leading-tight">{result.condition}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default FireEquipment;
