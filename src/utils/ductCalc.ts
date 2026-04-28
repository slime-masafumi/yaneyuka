/**
 * ダクト計算ユーティリティ
 * ダクトサイズ選定、結露判定、吹出口選定の計算ロジック
 */

/**
 * 空気の密度を計算 (kg/m³)
 * @param tempC 温度(℃)
 */
export const getAirDensity = (tempC: number): number => {
  // 理想気体の状態方程式から簡易計算
  // ρ = P / (R * T)
  // 標準大気圧: 101325 Pa, 空気の気体定数: 287.05 J/(kg·K)
  const T = tempC + 273.15; // 絶対温度
  return 101325 / (287.05 * T);
};

/**
 * ダクト径を計算（コールブルック式の簡易版）
 * @param airflow_m3h 風量 (m³/h)
 * @param targetLoss 目標摩擦損失 (Pa/m)
 * @param tempC 空気温度 (℃)
 */
export const solveDiameter = (
  airflow_m3h: number,
  targetLoss: number,
  tempC: number = 20
): number => {
  const rho = getAirDensity(tempC);
  const Q = airflow_m3h / 3600; // m³/s
  const mu = 1.81e-5; // 動粘度 (Pa·s) @ 20℃
  
  // コールブルック式の簡易近似
  // レイノルズ数 Re = 4Qρ / (πDμ)
  // 摩擦損失 ΔP/L = f * (ρV²) / (2D)
  // V = Q / (πD²/4)
  
  // 初期推定値
  let D = 0.1; // 100mmから開始
  const epsilon = 0.00015; // 粗度 (m) - 一般的なスパイラルダクト
  
  for (let i = 0; i < 50; i++) {
    const A = Math.PI * Math.pow(D / 2, 2);
    const V = Q / A;
    const Re = (4 * Q * rho) / (Math.PI * D * mu);
    
    // コールブルック式で摩擦係数を計算
    const f = 0.25 / Math.pow(Math.log10(epsilon / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2);
    
    const calculatedLoss = (f * rho * Math.pow(V, 2)) / (2 * D);
    
    if (Math.abs(calculatedLoss - targetLoss) < 0.01) break;
    
    // ニュートン法で更新
    D = D * Math.sqrt(targetLoss / calculatedLoss);
  }
  
  return D * 1000; // mmに変換
};

/**
 * 標準サイズにスナップ
 */
export const snapToStandard = (diameter_mm: number): number => {
  const standards = [100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600];
  return standards.find(s => s >= diameter_mm) || standards[standards.length - 1];
};

/**
 * 摩擦損失を計算
 */
export const calculateFrictionLoss = (
  diameter_mm: number,
  airflow_m3h: number,
  tempC: number = 20
): { loss: number; velocity: number } => {
  const rho = getAirDensity(tempC);
  const Q = airflow_m3h / 3600;
  const D = diameter_mm / 1000; // m
  const A = Math.PI * Math.pow(D / 2, 2);
  const V = Q / A;
  const mu = 1.81e-5;
  const epsilon = 0.00015;
  
  const Re = (4 * Q * rho) / (Math.PI * D * mu);
  const f = 0.25 / Math.pow(Math.log10(epsilon / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2);
  const loss = (f * rho * Math.pow(V, 2)) / (2 * D);
  
  return { loss, velocity: V };
};

/**
 * 角ダクトサイズを計算（等価直径）
 */
export const calculateRectSize = (diameter_mm: number): Array<{ h: number; w: number }> => {
  const De = diameter_mm; // 等価直径
  const candidates: Array<{ h: number; w: number }> = [];
  
  // 一般的なアスペクト比で候補を生成
  const ratios = [1, 1.2, 1.5, 2, 2.5, 3, 4];
  
  ratios.forEach(ratio => {
    // De = 1.3 * (a*b)^0.625 / (a+b)^0.25
    // 簡易化: De ≈ 2ab/(a+b) の近似式から逆算
    const h = Math.round((De / (1.3 * Math.pow(ratio, 0.625))) * Math.pow(1 + ratio, 0.25) / 10) * 10;
    const w = Math.round(h * ratio / 10) * 10;
    
    if (h >= 50 && w <= 2000) {
      candidates.push({ h, w });
    }
  });
  
  return candidates.filter((c, i, arr) => 
    arr.findIndex(x => x.h === c.h && x.w === c.w) === i
  ).sort((a, b) => (a.h + a.w) - (b.h + b.w));
};

/**
 * 露点温度を計算 (Tetensの近似式)
 * @param tempC 周囲温度(℃)
 * @param rh 相対湿度(%) 0~100
 */
export const calculateDewPoint = (tempC: number, rh: number): number => {
  // 飽和水蒸気圧 E (hPa)
  const a = 7.5;
  const b = 237.3;
  const E = 6.1078 * Math.pow(10, (a * tempC) / (b + tempC));
  
  // 水蒸気圧 e (hPa)
  const e = E * (rh / 100);
  
  // 露点温度 Td
  const Td = (b * Math.log10(e / 6.1078)) / (a - Math.log10(e / 6.1078));
  return Td;
};

/**
 * 保温材の表面温度を計算し、結露リスクを判定
 * @param ductTempC ダクト内温度（冷風温度）
 * @param roomTempC 天井裏/室内温度
 * @param roomRh 周囲相対湿度 (%)
 * @param thickness_mm 保温材厚み (mm)
 * @param conductivity 熱伝導率 (W/mK) 一般的なグラスウール24Kで0.042程度
 */
export const checkCondensation = (
  ductTempC: number,
  roomTempC: number,
  roomRh: number,
  thickness_mm: number,
  conductivity: number = 0.042
): { isSafe: boolean; surfaceTemp: number; dewPoint: number } => {
  
  const dewPoint = calculateDewPoint(roomTempC, roomRh);
  
  // 表面熱伝達率 (屋内静穏時: 9.0 W/m2K 程度とする)
  const alpha = 9.0;
  
  // 熱通過抵抗 R = (1/alpha) + (厚み / 熱伝導率)
  // 円筒補正は簡易化のため省略し、平面近似で計算（安全側評価）
  const R = (1 / alpha) + ((thickness_mm / 1000) / conductivity);
  
  // 熱貫流率 K
  const K = 1 / R;
  
  // 熱流束 q = K * (To - Ti)
  // 表面温度 Ts = To - (q / alpha)
  // 変形すると Ts = To - (K * (To - Ti) / alpha)
  const surfaceTemp = roomTempC - (K * (roomTempC - ductTempC) / alpha);
  
  // 表面温度が露点より高ければ結露しない
  return {
    isSafe: surfaceTemp > dewPoint,
    surfaceTemp: surfaceTemp,
    dewPoint: dewPoint
  };
};

/**
 * 吹出口サイズとNC値の目安選定
 * 一般的なアネモスタット(C-2)を想定したネック風速からの逆算
 */
export const estimateOutletSize = (airflow_m3h: number, targetNC: number): { neckDia: number; velocity: number } => {
  // NC値と推奨ネック風速の目安 (各社技術資料に基づく近似)
  // NC-25 -> 2.5m/s
  // NC-30 -> 3.0~3.5m/s
  // NC-35 -> 4.0m/s
  // NC-40 -> 5.0m/s
  let maxV = 3.0;
  if (targetNC <= 25) maxV = 2.5;
  else if (targetNC <= 30) maxV = 3.5;
  else if (targetNC <= 35) maxV = 4.5;
  else maxV = 6.0;

  // 必要ネック面積 A = Q / V
  const q_sec = airflow_m3h / 3600;
  const requiredArea = q_sec / maxV;
  
  // 必要直径 D = sqrt(4A / PI)
  const d_mm = Math.sqrt((4 * requiredArea) / Math.PI) * 1000;
  
  // 規格サイズ(50mm単位)に切り上げ
  const sizes = [150, 200, 250, 300, 350, 400, 450];
  const selectedD = sizes.find(s => s >= d_mm) || sizes[sizes.length-1];
  
  // 実際の風速
  const actualV = q_sec / (Math.PI * Math.pow(selectedD/1000/2, 2));

  return { neckDia: selectedD, velocity: actualV };
};




















