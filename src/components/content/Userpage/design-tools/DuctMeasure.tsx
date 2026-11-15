'use client';

import React, { useState, useEffect } from 'react';
import { ResultRow } from '@/components/ui/Sheet';
import DtResult from './DtResult';
import { 
  solveDiameter, 
  snapToStandard, 
  calculateFrictionLoss, 
  calculateRectSize, 
  checkCondensation,
  estimateOutletSize
} from '@/utils/ductCalc';

/**
 * estimateOutletSize(@/utils/ductCalc)が使っているネック風速の上限と同じ対応。
 * 画面の説明文がこれと食い違っていた(NC-30 以下 3.0 / それ以外 4.5 と表示)ので、ここから出す
 */
const neckVmax = (nc: number) => (nc <= 25 ? 2.5 : nc <= 30 ? 3.5 : nc <= 35 ? 4.5 : 6.0);

interface DuctMeasureProps {
  defaultTab?: 'duct' | 'insulation' | 'outlet';
  hideTabBar?: boolean;
}

const DuctMeasure: React.FC<DuctMeasureProps> = ({ defaultTab, hideTabBar }) => {
  const [activeTab, setActiveTab] = useState<'duct' | 'insulation' | 'outlet'>(defaultTab ?? 'duct');
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);

  // --- 共通・ダクト計算 State ---
  const [airflow, setAirflow] = useState<number>(1000);
  const [targetLoss, setTargetLoss] = useState<number>(1.0);
  const [ductTemp, setDuctTemp] = useState<number>(15); // ダクト内温度
  
  // ダクト計算結果
  const [ductResult, setDuctResult] = useState<any>(null);

  // --- 保温計算 State ---
  const [roomTemp, setRoomTemp] = useState<number>(30); // 天井裏温度
  const [roomRh, setRoomRh] = useState<number>(70);     // 天井裏湿度
  const [insulationThick, setInsulationThick] = useState<number>(25); // 保温厚み
  const [insulationRes, setInsulationRes] = useState<any>(null);

  // --- 吹出口計算 State ---
  // 吹出口 1 個の風量はダクトの風量(系統全体)と別に持つ。共有すると 1000 ㎥/h のまま 1 個に吹かせてしまう
  const [outletFlow, setOutletFlow] = useState<number>(300);
  const [targetNC, setTargetNC] = useState<number>(35); // 目標NC値
  const [outletRes, setOutletRes] = useState<any>(null);

  // 一括計算
  useEffect(() => {
    // 1. ダクト計算(風量・基準損失が 0 や空欄のときは出さない。NaN が φ600 に化けていた)
    try {
      if (!(airflow > 0) || !(targetLoss > 0)) {
        setDuctResult({ empty: true });
      } else {
        const exactD = solveDiameter(airflow, targetLoss, ductTemp);
        const stdD = snapToStandard(exactD);
        const perf = calculateFrictionLoss(stdD, airflow, ductTemp);
        const rects = calculateRectSize(stdD);
        setDuctResult({
          exactD, stdD,
          over: !Number.isFinite(exactD) || exactD > stdD, // 標準径の表(600 まで)を超える
          velocity: perf.velocity,
          realLoss: perf.loss,
          rects
        });
      }
    } catch (error) {
      console.error('ダクト計算エラー:', error);
    }

    // 2. 保温計算
    try {
      const insCalc = checkCondensation(ductTemp, roomTemp, roomRh, insulationThick);
      setInsulationRes(insCalc);
    } catch (error) {
      console.error('保温計算エラー:', error);
    }

    // 3. 吹出口計算
    try {
      const outCalc = outletFlow > 0 ? estimateOutletSize(outletFlow, targetNC) : null;
      setOutletRes(outCalc ? { ...outCalc, maxV: neckVmax(targetNC), over: outCalc.velocity > neckVmax(targetNC) + 1e-9 } : { empty: true });
    } catch (error) {
      console.error('吹出口計算エラー:', error);
    }

  }, [airflow, targetLoss, ductTemp, roomTemp, roomRh, insulationThick, targetNC, outletFlow]);

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* Header & Tabs (StructuralToolsスタイルに統一) */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">ダクトメジャー</h3>
            <p className="text-[11px] mt-0.5 opacity-80">ダクト選定・結露判定・吹出口選定の統合ツール</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('duct')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'duct'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                ダクト選定
              </button>
              <button
                onClick={() => setActiveTab('insulation')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'insulation'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                結露・保温
              </button>
              <button
                onClick={() => setActiveTab('outlet')}
                className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                  activeTab === 'outlet'
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
              >
                吹出口・NC
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="p-4">
          
          {/* === TAB 1: ダクト選定 === */}
          {activeTab === 'duct' && ductResult && (
            <div className="animate-fadeIn yy-dt-split">
              
              {/* 入力フォーム */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">設計条件入力</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">風量 (m³/h)</label>
                      <input 
                        type="number" 
                        value={airflow} 
                        onChange={e=>setAirflow(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">基準損失 (Pa/m)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={targetLoss} 
                          onChange={e=>setTargetLoss(Number(e.target.value))} 
                          className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">ダクト内温度 (℃)</label>
                        <input 
                          type="number" 
                          value={ductTemp} 
                          onChange={e=>setDuctTemp(Number(e.target.value))} 
                          className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 計算結果(深い緑の答え) */}
              <aside className="space-y-4">
                {ductResult.empty ? (
                  <p className="text-[11px] text-gray-500">風量と基準損失(0 より大きい値)を入れると計算します。</p>
                ) : (
                <>
                <DtResult
                  label="推奨サイズ · 丸ダクト径"
                  value={ductResult.over ? '表の範囲外' : `Φ${ductResult.stdD}`}
                  text={ductResult.over}
                  ng={ductResult.over || ductResult.velocity > 15}
                  sub={`理論径 ${ductResult.exactD.toFixed(1)} mm`}
                >
                  <ResultRow k="実風速" v={`${ductResult.velocity.toFixed(2)} m/s`} />
                  <ResultRow k="実摩擦損失" v={`${ductResult.realLoss.toFixed(2)} Pa/m`} />
                  {ductResult.over && <ResultRow k="注" v="丸ダクトの標準径(600 まで)を超えます。角ダクトにするか系統を分けてください" />}
                  {!ductResult.over && ductResult.velocity > 15 && <ResultRow k="注" v="風速が 15 m/s を超えます(低速ダクトの範囲外)。騒音・圧損を確かめてください" />}
                </DtResult>
                <p className="yy-dt-note">
                  ※ 等摩擦法の 1 区間分です。スパイラルダクト(粗さ 0.15mm)・空気密度は温度から計算。全圧損失は直管の摩擦損失 × 長さに、曲がり・分岐・ダンパ・吹出口などの局部損失を足して送風機の静圧を決めます。標準径は 100〜600 の主な径だけ(175・225 などの中間径は入れていません)。
                </p>
                <div>
                  <h5 className="yy-dt-sec">角ダクト換算候補</h5>
                  <table className="w-full text-[12px]">
                    <tbody>
                      {ductResult.rects.slice(0,4).map((r: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="py-1.5">{r.h} x {r.w}</td>
                          <td className="py-1.5 text-right text-[11px] text-gray-500">{(r.w/r.h).toFixed(2)}:1</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="yy-dt-note">※ 丸ダクト径と等しい摩擦損失になる角ダクト(Huebscher の式 De = 1.30(ab)^0.625/(a+b)^0.25)。10mm で丸めているので、実際は 50mm 刻みの寸法に切り上げてください。縦横比は 4:1 以下が目安。</p>
                </div>
                </>
                )}
              </aside>

            </div>
          )}

          {/* === TAB 2: 保温・結露判定 === */}
          {activeTab === 'insulation' && insulationRes && (
            <div className="animate-fadeIn yy-dt-split">
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">環境条件入力</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">周囲温度 (℃)</label>
                      <input 
                        type="number" 
                        value={roomTemp} 
                        onChange={e=>setRoomTemp(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">相対湿度 (%)</label>
                      <input 
                        type="number" 
                        value={roomRh} 
                        onChange={e=>setRoomRh(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">ダクト内温度 (℃)</label>
                      <input 
                        type="number" 
                        value={ductTemp} 
                        onChange={e=>setDuctTemp(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">保温材厚み</label>
                      <select 
                        value={insulationThick} 
                        onChange={e=>setInsulationThick(Number(e.target.value))} 
                        className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="20">20mm</option>
                        <option value="25">25mm (一般)</option>
                        <option value="40">40mm</option>
                        <option value="50">50mm (高断熱)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                <DtResult
                  label="判定結果"
                  value={insulationRes.isSafe ? 'OK' : 'NG'}
                  unit={insulationRes.isSafe ? '結露なし' : '結露注意'}
                  ng={!insulationRes.isSafe}
                >
                  <ResultRow k="露点温度" v={`${insulationRes.dewPoint.toFixed(1)}℃`} />
                  <ResultRow k="表面温度" v={`${insulationRes.surfaceTemp.toFixed(1)}℃`} />
                  <ResultRow k="余裕(表面 − 露点)" v={`${(insulationRes.surfaceTemp - insulationRes.dewPoint).toFixed(1)}℃`} />
                </DtResult>
                <p className="yy-dt-note">
                  ※ 表面温度が露点を少しでも上回れば OK と出しています。余裕が小さいときは、湿度の変動や継ぎ目を考えて厚みを上げてください。
                  <br />※ グラスウール(熱伝導率 0.042 W/mK)・外表面の熱伝達率 9 W/㎡K の平板近似(ダクト内面の熱抵抗と円筒の効果は無視)。外装材・防湿層の性能、継ぎ目の施工は見ていません。保温の仕様は公共建築工事標準仕様書・特記仕様も確認してください。
                </p>
              </aside>

            </div>
          )}

          {/* === TAB 3: 吹出口・NC値 === */}
          {activeTab === 'outlet' && outletRes && (
            <div className="animate-fadeIn yy-dt-split">
              
              <div className="space-y-4">
                 <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <p className="text-[11px] font-bold text-gray-700 mb-2">条件入力</p>
                  <div className="mb-3">
                    <label className="block text-[10px] text-gray-500 mb-1">吹出風量 (m³/h /個)</label>
                    <input
                      type="number"
                      value={outletFlow}
                      onChange={e=>setOutletFlow(Number(e.target.value))}
                      className="w-full text-[12px] border border-gray-300 rounded px-2 py-1.5 text-right focus:border-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">系統の風量 ÷ 吹出口の数。ダクト選定の風量とは別に入れます</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-gray-500">目標NC値</label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">NC-{targetNC}</span>
                    </div>
                    <input 
                      type="range" 
                      min="20" 
                      max="50" 
                      step="5" 
                      value={targetNC} 
                      onChange={e => setTargetNC(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                      <span>NC-20 (静穏)</span>
                      <span>NC-50 (騒)</span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-3">
                {outletRes.empty ? (
                  <p className="text-[11px] text-gray-500">吹出風量を入れると計算します。</p>
                ) : (
                  <>
                    {/* 「#番号」の付け方はメーカーで違うので、ネック径で出す(以前は ネック径 ÷ 50 を # と表示していた) */}
                    <DtResult
                      label="アネモ型吹出口 · ネック径の目安"
                      value={`φ${outletRes.neckDia}`}
                      ng={outletRes.over}
                      sub={outletRes.over ? `φ450 でもネック風速が ${outletRes.maxV} m/s を超えます。吹出口を増やしてください` : `ネック風速 ${outletRes.maxV} m/s 以下で選んだ径`}
                    >
                      <ResultRow k="想定ネック風速" v={`${outletRes.velocity.toFixed(2)} m/s`} />
                    </DtResult>
                    <p className="yy-dt-note">
                      設計メモ: NC-{targetNC} の目安としてネック風速 {outletRes.maxV} m/s 以下になる最小のネック径です(NC-25 以下 2.5 · NC-30 以下 3.5 · NC-35 以下 4.5 · それ以上 6.0 m/s の概略値)。発生騒音・到達距離は吹出口の形式とメーカーで大きく違うので、型番はメーカーの選定表(風量—NC—到達距離)で決めてください。
                    </p>
                  </>
                )}
              </aside>

            </div>
          )}

      </div>
    </div>
  );
};

export default DuctMeasure;
