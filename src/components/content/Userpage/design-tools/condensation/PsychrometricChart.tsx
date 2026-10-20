'use client';
/**
 * 結露検討 › 湿り空気線図（T-x 線図）。室内・外側の状態をプロットする。
 */
import React from 'react';
import { absoluteHumidity } from '@/lib/condensation';

interface Props {
  ti: number;
  rhi: number;
  te: number;
  rhe: number;
  outLabel: string;
}

export default function PsychrometricChart({ ti, rhi, te, rhe, outLabel }: Props) {
    // 描画範囲設定 (X:温度 -10~50℃, Y:絶対湿度 0~0.040kg/kg)
    const minT = -10;
    const maxT = 50;
    const rangeT = maxT - minT;
    const maxAbsHum = 0.040; // 40g/kg(DA)

    // 座標変換ヘルパー
    const toPxX = (t: number) => ((t - minT) / rangeT) * 100;
    const toPxY = (x: number) => 100 - (x / maxAbsHum) * 100;

    // --- 計算ヘルパー (Chart用) ---
    // エンタルピー h = 1.006*t + (2501 + 1.805*t)*x [kJ/kg]
    // 特定のエンタルピー h における、温度 t に対する絶対湿度 x を求める
    // x = (h - 1.006*t) / (2501 + 1.805*t)
    const getXFromEnthalpy = (t: number, h: number) => {
        return (h - 1.006 * t) / (2501 + 1.805 * t);
    };

    // 比容積 v = (Ra * T) / P * (1 + 1.6078 * x) [m3/kg]（T = t + 273.15, P = 101325, Ra = 287）
    // 特定の比容積 v における、温度 t に対する絶対湿度 x を求める
    // x = ( (v * P) / (Ra * T) - 1 ) / 1.6078
    const getXFromVolume = (t: number, v: number) => {
        const T = t + 273.15;
        const P = 101325;
        const Ra = 287;
        return ((v * P) / (Ra * T) - 1) / 1.6078;
    };

    // パス生成: 相対湿度曲線
    const generateRhPath = (rh: number) => {
        let path = `M ${toPxX(minT)},${toPxY(absoluteHumidity(minT, rh))}`;
        for (let t = minT + 1; t <= maxT; t += 1) {
            const x = absoluteHumidity(t, rh);
            if (x > maxAbsHum) break; 
            path += ` L ${toPxX(t)},${toPxY(x)}`;
        }
        return path;
    };

    // パス生成: 等エンタルピー線 (h: -10 ~ 120 kJ/kg)
    const generateEnthalpyPaths = (): React.JSX.Element[] => {
        const paths: React.JSX.Element[] = [];
        // 5kJ/kg刻み
        for (let h = -10; h <= 120; h += 5) {
            let d = "";
            let started = false;
            for (let t = minT; t <= maxT; t += 1) {
                const x = getXFromEnthalpy(t, h);
                // 飽和状態(RH100%)を超えたら描画しない（本来は霧域だがチャートとしてはカットが一般的）
                const satX = absoluteHumidity(t, 100);
                
                if (x >= 0 && x <= maxAbsHum && x <= satX) {
                    const px = toPxX(t);
                    const py = toPxY(x);
                    if (!started) {
                        d += `M ${px},${py}`;
                        started = true;
                    } else {
                        d += ` L ${px},${py}`;
                    }
                }
            }
            if (d !== "") paths.push(<path key={`h-${h}`} d={d} fill="none" stroke="#fca5a5" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />);
        }
        return paths;
    };

    // パス生成: 等比容積線 (v: 0.75 ~ 0.95 m3/kg)
    const generateVolumePaths = (): React.JSX.Element[] => {
        const paths: React.JSX.Element[] = [];
        // 0.01 m3/kg刻み
        for (let v = 75; v <= 95; v += 1) {
            const vol = v / 100;
            let d = "";
            let started = false;
            for (let t = minT; t <= maxT; t += 1) {
                const x = getXFromVolume(t, vol);
                const satX = absoluteHumidity(t, 100);
                if (x >= 0 && x <= maxAbsHum && x <= satX) {
                    const px = toPxX(t);
                    const py = toPxY(x);
                    if (!started) {
                        d += `M ${px},${py}`;
                        started = true;
                    } else {
                        d += ` L ${px},${py}`;
                    }
                }
            }
             if (d !== "") paths.push(<path key={`v-${vol}`} d={d} fill="none" stroke="#86efac" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />);
        }
        return paths;
    };

    const indoorPt = { x: toPxX(ti), y: toPxY(absoluteHumidity(ti, rhi)) };
    const outdoorPt = { x: toPxX(te), y: toPxY(absoluteHumidity(te, rhe)) };

    return (
        <div className="relative w-full h-[500px] bg-white border border-gray-200 rounded p-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                
                {/* 1. 等比容積線 (緑) */}
                {generateVolumePaths()}

                {/* 2. 等エンタルピー線 (赤) - 湿球温度線と近似 */}
                {generateEnthalpyPaths()}

                {/* 3. グリッド (温度 - 乾球温度) */}
                {[...Array(13)].map((_, i) => {
                    const t = minT + i * 5; // 5度刻み
                    return (
                        <g key={`gt-${t}`}>
                            <line x1={toPxX(t)} y1="0" x2={toPxX(t)} y2="100" stroke="#eee" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                            {t % 10 === 0 && <text x={toPxX(t)} y="99" fontSize="2.5" fill="#666" textAnchor="middle">{t}</text>}
                        </g>
                    )
                })}
                {/* 4. グリッド (絶対湿度) */}
                {[...Array(9)].map((_, i) => {
                    const x = i * 0.005; // 0.005刻み
                    return (
                        <g key={`gx-${x}`}>
                            <line x1="0" y1={toPxY(x)} x2="100" y2={toPxY(x)} stroke="#eee" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                            <text x="100" y={toPxY(x) - 0.5} fontSize="2.5" fill="#666" textAnchor="end">{(x * 1000).toFixed(0)}</text>
                        </g>
                    )
                })}

                {/* 5. 相対湿度曲線 (青系) */}
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(rh => (
                    <g key={`rh-${rh}`}>
                         <path d={generateRhPath(rh)} fill="none" stroke="#93c5fd" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                         {/* ラベル (30℃付近に配置) */}
                         <text x={toPxX(35)} y={toPxY(absoluteHumidity(35, rh)) - 0.5} fontSize="2" fill="#93c5fd">{rh}%</text>
                    </g>
                ))}
                
                {/* 6. 100%飽和曲線 (太線) */}
                <path d={generateRhPath(100)} fill="none" stroke="#2563eb" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <text x={toPxX(30)} y={toPxY(absoluteHumidity(30, 100)) - 1} fontSize="2.5" fill="#2563eb" fontWeight="bold">飽和曲線</text>

                {/* プロット: 室内・室外ポイント */}
                <line x1={indoorPt.x} y1={indoorPt.y} x2={outdoorPt.x} y2={outdoorPt.y} stroke="#333" strokeWidth="0.8" strokeDasharray="1 1" vectorEffect="non-scaling-stroke"/>
                
                <circle cx={indoorPt.x} cy={indoorPt.y} r="1" fill="red" stroke="white" strokeWidth="0.2" />
                <text x={indoorPt.x} y={indoorPt.y - 2} fontSize="3" fill="red" textAnchor="middle" fontWeight="bold" style={{textShadow: "0px 0px 2px white"}}>室内</text>

                <circle cx={outdoorPt.x} cy={outdoorPt.y} r="1" fill="blue" stroke="white" strokeWidth="0.2" />
                <text x={outdoorPt.x} y={outdoorPt.y + 4} fontSize="3" fill="blue" textAnchor="middle" fontWeight="bold" style={{textShadow: "0px 0px 2px white"}}>{outLabel}</text>
            </svg>
            
            {/* 凡例・軸ラベル */}
            <div className="absolute top-2 left-2 text-xs text-gray-500 bg-white/80 p-1 rounded border border-gray-100">
                <div><span className="inline-block w-3 h-0.5 bg-blue-500 mr-1"></span>相対湿度</div>
                <div><span className="inline-block w-3 h-0.5 bg-red-300 mr-1"></span>エンタルピー</div>
                <div><span className="inline-block w-3 h-0.5 bg-green-300 mr-1"></span>比容積</div>
            </div>
            <div className="absolute top-2 right-2 text-xs text-gray-500 text-right">↑ 絶対湿度 x [g/kg(DA)]</div>
            <div className="absolute bottom-1 right-1/2 translate-x-1/2 text-xs text-gray-500">乾球温度 DB [℃] →</div>
        </div>
    );
}
