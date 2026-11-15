import React, { useMemo, useState } from 'react';
import { ResultPanel, ResultRow } from '@/components/ui/Sheet';

/**
 * 建蔽率・容積率(設計ツール › 法規)。
 *
 * 2026-11-16 に実務の手順に合わせて計算を作り直した(e-Gov の建築基準法・施行令の現行本文と照合)。
 *   容積率 = 地域ごとに min(都市計画の数値〔52 条 1 項〕, 前面道路の幅員 × 乗数〔52 条 2 項〕)を出し、面積で加重平均(52 条 7 項)
 *            前面道路が 2 以上なら幅員の最大のもの(52 条 2 項かっこ書)。特定道路の加算 Wa =(12 − Wr)(70 − L)/ 70(52 条 9 項・令 135 条の 18)
 *   建蔽率 = 地域ごとに 53 条 1 項の数値 + 緩和(53 条 3 項)を出し、面積で加重平均(53 条 2 項)
 *            防火地域(建蔽率 80% の地域)内の耐火建築物等は制限なし(53 条 6 項 1 号)
 *            敷地が防火地域の内外 → 全部が耐火建築物等なら全部を防火地域とみなす(53 条 7 項)
 *            敷地が準防火地域と指定なしの区域 → 全部が耐火・準耐火建築物等なら全部を準防火地域とみなす(53 条 8 項)
 *   敷地面積は 2 項道路の後退部分を除く(令 2 条 1 項 1 号)
 * それまでの誤り: 防火の緩和を地域・構造に関係なく一律 +10% にしていた(準防火・準耐火の緩和が無く、商業地域の防火・耐火が 90% になっていた)。
 * 前面道路の制限を「加重平均した指定容積率」と「加重平均した道路の値」の小さいほうで取っていた(地域ごとに小さいほうを取ってから平均するのが正しい)。
 * 用途地域の指定のない区域・特定道路・特定行政庁が指定する乗数が無かった。
 */

type ZoneDef = {
  name: string;
  /** 53 条 1 項の選択肢(%) */
  bcr: number[];
  /** 52 条 1 項の選択肢(%) */
  far: number[];
  /** 52 条 2 項の乗数。先頭が原則、残りは特定行政庁が指定する区域の値 */
  roadK: number[];
  /** 53 条 1 項 2〜4 号の地域(80% のとき 6 項 1 号の対象) */
  bcr80Group: boolean;
};

const ZONES: Record<string, ZoneDef> = {
  category1Low: { name: '第一種低層住居専用地域', bcr: [30, 40, 50, 60], far: [50, 60, 80, 100, 150, 200], roadK: [0.4], bcr80Group: false },
  category2Low: { name: '第二種低層住居専用地域', bcr: [30, 40, 50, 60], far: [50, 60, 80, 100, 150, 200], roadK: [0.4], bcr80Group: false },
  rural: { name: '田園住居地域', bcr: [30, 40, 50, 60], far: [50, 60, 80, 100, 150, 200], roadK: [0.4], bcr80Group: false },
  category1Mid: { name: '第一種中高層住居専用地域', bcr: [30, 40, 50, 60], far: [100, 150, 200, 300, 400, 500], roadK: [0.4, 0.6], bcr80Group: false },
  category2Mid: { name: '第二種中高層住居専用地域', bcr: [30, 40, 50, 60], far: [100, 150, 200, 300, 400, 500], roadK: [0.4, 0.6], bcr80Group: false },
  category1: { name: '第一種住居地域', bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadK: [0.4, 0.6], bcr80Group: true },
  category2: { name: '第二種住居地域', bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadK: [0.4, 0.6], bcr80Group: true },
  quasiCategory: { name: '準住居地域', bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadK: [0.4, 0.6], bcr80Group: true },
  neighborhood: { name: '近隣商業地域', bcr: [60, 80], far: [100, 150, 200, 300, 400, 500], roadK: [0.6, 0.4, 0.8], bcr80Group: true },
  commercial: { name: '商業地域', bcr: [80], far: [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300], roadK: [0.6, 0.4, 0.8], bcr80Group: true },
  quasiIndustrial: { name: '準工業地域', bcr: [50, 60, 80], far: [100, 150, 200, 300, 400, 500], roadK: [0.6, 0.4, 0.8], bcr80Group: true },
  industrial: { name: '工業地域', bcr: [50, 60], far: [100, 150, 200, 300, 400], roadK: [0.6, 0.4, 0.8], bcr80Group: false },
  exclusiveIndustrial: { name: '工業専用地域', bcr: [30, 40, 50, 60], far: [100, 150, 200, 300, 400], roadK: [0.6, 0.4, 0.8], bcr80Group: false },
  none: { name: '用途地域の指定のない区域', bcr: [30, 40, 50, 60, 70], far: [50, 80, 100, 200, 300, 400], roadK: [0.6, 0.4, 0.8], bcr80Group: false },
};

type FireDistrict = 'none' | 'fire' | 'quasi' | 'fireSpan' | 'quasiSpan';
type Structure = 'fr' | 'qfr' | 'other';

const FIRE_LABEL: Record<FireDistrict, string> = {
  none: '指定なし',
  fire: '防火地域',
  quasi: '準防火地域',
  fireSpan: '防火地域の内外にわたる',
  quasiSpan: '準防火地域と指定なしの区域にわたる',
};

const STRUCTURE_LABEL: Record<Structure, string> = {
  fr: '耐火建築物等',
  qfr: '準耐火建築物等',
  other: 'その他',
};

interface ZoningArea {
  zoning: string;
  area: number;
  bcr: number;
  far: number;
  roadK: number;
}

export type RegIn = {
  rows: ZoningArea[];
  corner: boolean;
  fire: FireDistrict;
  structure: Structure;
  /** 前面道路の幅員(最大のもの)m。0 = 未入力 */
  roadW: number;
  tokutei: boolean;
  /** 特定道路から敷地が接する前面道路の部分の直近の端までの延長(m) */
  tokuteiL: number;
};

export type RowOut = {
  name: string;
  area: number;
  bcrBase: number;
  /** 適用する建蔽率(%)。制限なしは 100 */
  bcr: number;
  bcrNote: string;
  farBase: number;
  /** 前面道路による値(%)。かからないときは null */
  farRoad: number | null;
  roadK: number;
  far: number;
};

export type RegOut = {
  total: number;
  rows: RowOut[];
  bcr: number;
  far: number;
  footprint: number;
  floor: number;
  /** 容積率の計算に使う幅員(特定道路の加算後) */
  wEff: number | null;
  wa: number;
  fireApplied: 'fire' | 'quasi' | null;
  notes: string[];
};

/** 計算の本体(画面と切り離して node で確かめられるように) */
export function calcRegulations(v: RegIn): RegOut | null {
  const rows = v.rows.filter((r) => r.area > 0);
  const total = rows.reduce((s, r) => s + r.area, 0);
  if (total <= 0) return null;
  const notes: string[] = [];

  // 防火の緩和に使う地域(53 条 7 項・8 項のみなしを含む)
  let fireApplied: 'fire' | 'quasi' | null = null;
  if (v.fire === 'fire') fireApplied = 'fire';
  else if (v.fire === 'quasi') fireApplied = 'quasi';
  else if (v.fire === 'fireSpan') {
    if (v.structure === 'fr') fireApplied = 'fire';
    else notes.push('敷地が防火地域の内外にわたり、建物の全部が耐火建築物等でないため、53 条 7 項のみなしは使えません。防火の緩和は入れていません(部分ごとの扱いは特定行政庁に確認)。');
  } else if (v.fire === 'quasiSpan') {
    if (v.structure === 'fr' || v.structure === 'qfr') fireApplied = 'quasi';
    else notes.push('敷地が準防火地域と指定なしの区域にわたり、建物の全部が耐火・準耐火建築物等でないため、53 条 8 項のみなしは使えません。');
  }
  if (fireApplied === 'fire' && v.structure !== 'fr') {
    fireApplied = null;
    notes.push('防火地域の緩和は耐火建築物等だけです(53 条 3 項 1 号イ)。');
  }
  if (fireApplied === 'quasi' && v.structure === 'other') {
    fireApplied = null;
    notes.push('準防火地域の緩和は耐火建築物等・準耐火建築物等だけです(53 条 3 項 1 号)。');
  }

  // 前面道路の幅員(52 条 2 項・9 項)
  let wEff: number | null = null;
  let wa = 0;
  if (v.roadW > 0) {
    wEff = v.roadW;
    if (v.tokutei) {
      if (v.roadW >= 6 && v.roadW < 12 && v.tokuteiL >= 0 && v.tokuteiL <= 70) {
        wa = ((12 - v.roadW) * (70 - v.tokuteiL)) / 70;
        wEff = v.roadW + wa;
      } else {
        notes.push('特定道路の加算は、前面道路の幅員が 6m 以上 12m 未満で、特定道路からの延長が 70m 以内のときだけです(52 条 9 項)。加算していません。');
      }
    }
  } else {
    notes.push('前面道路の幅員が未入力のため、前面道路による容積率の制限(52 条 2 項)を計算していません。');
  }

  const out: RowOut[] = rows.map((r) => {
    const z = ZONES[r.zoning];
    let bcr = r.bcr;
    const why: string[] = [];
    let unlimited = false;
    if (fireApplied === 'fire' && z.bcr80Group && r.bcr === 80) {
      unlimited = true;
      why.push('防火地域内の耐火建築物等(53 条 6 項 1 号)で制限なし');
    } else {
      if (fireApplied) {
        bcr += 10;
        why.push(fireApplied === 'fire' ? '防火・耐火 +10' : '準防火・耐火/準耐火 +10');
      }
      if (v.corner) {
        bcr += 10;
        why.push('角地 +10');
      }
    }
    if (unlimited) bcr = 100;
    bcr = Math.min(bcr, 100);
    const farRoad = wEff !== null && wEff < 12 ? wEff * r.roadK * 100 : null;
    const far = farRoad !== null ? Math.min(r.far, farRoad) : r.far;
    return { name: z.name, area: r.area, bcrBase: r.bcr, bcr, bcrNote: why.join('・'), farBase: r.far, farRoad, roadK: r.roadK, far };
  });

  const bcr = out.reduce((s, r) => s + r.bcr * r.area, 0) / total;
  const far = out.reduce((s, r) => s + r.far * r.area, 0) / total;
  return { total, rows: out, bcr, far, footprint: (total * bcr) / 100, floor: (total * far) / 100, wEff, wa, fireApplied, notes };
}

interface BuildingRegulationsProps {
  hideHeader?: boolean;
}

const fmt = (n: number) => n.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${Number.isInteger(Math.round(n * 100) / 100) ? Math.round(n) : n.toFixed(2)}%`;

const newRow = (zoning = 'category1Low'): ZoningArea => ({
  zoning,
  area: 0,
  bcr: ZONES[zoning].bcr[0],
  far: ZONES[zoning].far[0],
  roadK: ZONES[zoning].roadK[0],
});

const BuildingRegulations: React.FC<BuildingRegulationsProps> = ({ hideHeader }) => {
  const [zoningAreas, setZoningAreas] = useState<ZoningArea[]>([newRow()]);
  const [isCornerLot, setIsCornerLot] = useState<boolean>(false);
  const [fire, setFire] = useState<FireDistrict>('none');
  const [structure, setStructure] = useState<Structure>('other');
  const [roadWidth, setRoadWidth] = useState<string>('');
  const [tokutei, setTokutei] = useState<boolean>(false);
  const [tokuteiL, setTokuteiL] = useState<string>('');

  const result = useMemo(
    () =>
      calcRegulations({
        rows: zoningAreas,
        corner: isCornerLot,
        fire,
        structure,
        roadW: Number(roadWidth) || 0,
        tokutei,
        tokuteiL: tokuteiL === '' ? NaN : Number(tokuteiL),
      }),
    [zoningAreas, isCornerLot, fire, structure, roadWidth, tokutei, tokuteiL]
  );

  const addZoningArea = () => {
    if (zoningAreas.length < 3) setZoningAreas([...zoningAreas, newRow()]);
  };
  const removeZoningArea = (index: number) => {
    if (zoningAreas.length > 1) setZoningAreas(zoningAreas.filter((_, i) => i !== index));
  };
  const updateZoningArea = (index: number, field: keyof ZoningArea, value: string) => {
    const next = [...zoningAreas];
    if (field === 'zoning') next[index] = { ...newRow(value), area: next[index].area };
    else next[index] = { ...next[index], [field]: Number(value) || 0 };
    setZoningAreas(next);
  };

  const totalArea = zoningAreas.reduce((sum, a) => sum + (a.area || 0), 0);
  const blankRows = zoningAreas.filter((a) => !(a.area > 0)).length;

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100 font-sans">
      {!hideHeader && (
        <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
          <div>
            <h3 className="text-[13px] font-medium">建蔽容積率計算</h3>
            <p className="text-[11px] mt-0.5">用途地域に基づく建蔽率・容積率の計算</p>
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="yy-dt-split">
          {/* 左側：入力エリア */}
          <div className="space-y-4">
            <div className="yy-kv max-w-[320px]">
              <span className="yy-kv__k">全体敷地面積</span>
              <span className="yy-leader" />
              <span className="yy-kv__v">{totalArea.toFixed(2)} m²</span>
            </div>

            {/* 用途地域入力 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-medium text-gray-700">用途地域(敷地が 2 以上の地域にわたるときは行を足す)</h4>
                <button onClick={addZoningArea} disabled={zoningAreas.length >= 3} className="yy-btn">
                  追加
                </button>
              </div>

              {zoningAreas.map((area, index) => {
                const z = ZONES[area.zoning];
                return (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border border-gray-200 rounded">
                    <div className="col-span-12 sm:col-span-3">
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">用途地域</label>
                      <select value={area.zoning} onChange={(e) => updateZoningArea(index, 'zoning', e.target.value)} className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded">
                        {Object.entries(ZONES).map(([key, d]) => (
                          <option key={key} value={key}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">敷地面積 (m²)</label>
                      <input
                        type="number"
                        min="0"
                        value={area.area || ''}
                        onChange={(e) => updateZoningArea(index, 'area', e.target.value)}
                        className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-right"
                        placeholder="未入力"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">建蔽率 (%)</label>
                      <select value={area.bcr} onChange={(e) => updateZoningArea(index, 'bcr', e.target.value)} className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-center">
                        {z.bcr.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <label className="block text-[12px] font-medium text-gray-600 mb-1">容積率 (%)</label>
                      <select value={area.far} onChange={(e) => updateZoningArea(index, 'far', e.target.value)} className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-center">
                        {z.far.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[12px] font-medium text-gray-600 mb-1" title="法 52 条 2 項。特定行政庁が指定する区域は括弧の値">
                        道路幅員の乗数
                      </label>
                      <select
                        value={area.roadK}
                        onChange={(e) => updateZoningArea(index, 'roadK', e.target.value)}
                        disabled={z.roadK.length < 2}
                        className="w-full px-2 py-1.5 text-[12px] border border-gray-200 rounded text-center"
                      >
                        {z.roadK.map((k, i) => (
                          <option key={k} value={k}>
                            {i === 0 ? `${k}` : `${k}(指定区域)`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <button
                        onClick={() => removeZoningArea(index)}
                        disabled={zoningAreas.length <= 1}
                        className="yy-dt-link is-danger w-full text-center disabled:opacity-40 disabled:cursor-default"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
              <p className="text-[10px] text-gray-500 leading-relaxed">
                敷地面積は、2 項道路(法 42 条 2 項)の後退部分を除いた面積を入れてください(令 2 条 1 項 1 号)。建蔽率・容積率は都市計画図で指定された値を選びます。
              </p>
            </div>

            {/* 前面道路 */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-medium text-gray-700">前面道路</h4>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] text-gray-700">幅員(2 以上あるときは最大のもの)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={roadWidth}
                  onChange={(e) => setRoadWidth(e.target.value)}
                  className="w-20 px-2 py-1 text-[12px] border border-gray-200 rounded text-right"
                  placeholder="未入力"
                />
                <span className="text-[12px] text-gray-700">m</span>
              </div>
              <p className="text-[10px] text-gray-500">12m 未満なら、幅員 × 乗数で容積率が下がります(法 52 条 2 項)。2 項道路は後退後の幅員(通常 4m)を入れます。</p>
              <div className="flex flex-wrap items-center gap-2">
                <input type="checkbox" id="tokutei" checked={tokutei} onChange={(e) => setTokutei(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="tokutei" className="text-[12px] text-gray-700">
                  特定道路(幅員 15m 以上)に接続する前面道路
                </label>
                {tokutei && (
                  <>
                    <span className="text-[12px] text-gray-700">特定道路からの延長 L</span>
                    <input
                      type="number"
                      min="0"
                      value={tokuteiL}
                      onChange={(e) => setTokuteiL(e.target.value)}
                      className="w-20 px-2 py-1 text-[12px] border border-gray-200 rounded text-right"
                      placeholder="m"
                    />
                    <span className="text-[12px] text-gray-700">m</span>
                  </>
                )}
              </div>
              {tokutei && <p className="text-[10px] text-gray-500">L は特定道路から、敷地が接する前面道路の部分の直近の端までの延長(令 135 条の 18)。</p>}
            </div>

            {/* 建蔽率の緩和 */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-medium text-gray-700">建蔽率の緩和(法 53 条 3 項・6 項〜8 項)</h4>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] text-gray-700 w-24">防火の指定</label>
                <select value={fire} onChange={(e) => setFire(e.target.value as FireDistrict)} className="px-2 py-1 text-[12px] border border-gray-200 rounded">
                  {(Object.keys(FIRE_LABEL) as FireDistrict[]).map((k) => (
                    <option key={k} value={k}>
                      {FIRE_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[12px] text-gray-700 w-24">建物の構造</label>
                <select value={structure} onChange={(e) => setStructure(e.target.value as Structure)} className="px-2 py-1 text-[12px] border border-gray-200 rounded">
                  {(Object.keys(STRUCTURE_LABEL) as Structure[]).map((k) => (
                    <option key={k} value={k}>
                      {STRUCTURE_LABEL[k]}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500">耐火建築物等 = 耐火建築物またはこれと同等以上の延焼防止性能のもの</span>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="cornerLot" checked={isCornerLot} onChange={(e) => setIsCornerLot(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="cornerLot" className="ml-2 text-[12px] text-gray-700">
                  角地(特定行政庁が指定する角地またはこれに準ずる敷地)
                </label>
              </div>
            </div>
          </div>

          {/* 右側：計算結果 */}
          <aside className="space-y-4">
            <ResultPanel label="可能延床面積(容積率対象)" value={result ? fmt(result.floor) : '-'} unit="m²" sub={result ? undefined : '敷地面積を入れると計算します'}>
              <ResultRow k="許容建蔽率" v={result ? pct(result.bcr) : '-'} />
              <ResultRow k="許容容積率" v={result ? pct(result.far) : '-'} />
              <ResultRow k="可能建築面積" v={result ? `${fmt(result.footprint)} m²` : '-'} />
              {result && result.wEff !== null && (
                <ResultRow k="容積率に使う道路幅員" v={result.wa > 0 ? `${Number(roadWidth)} + Wa ${result.wa.toFixed(2)} = ${result.wEff.toFixed(2)} m` : `${result.wEff} m${result.wEff >= 12 ? '(12m 以上: 52 条 2 項かからない)' : ''}`} />
              )}
              <ResultRow k="防火の緩和" v={result ? (result.fireApplied === 'fire' ? '防火地域・耐火建築物等' : result.fireApplied === 'quasi' ? '準防火地域・耐火/準耐火建築物等' : 'なし') : '-'} />
            </ResultPanel>

            {result && (
              <div className="text-[11px] text-gray-700 space-y-2">
                <h4 className="yy-dt-sec">地域ごとの内訳</h4>
                {result.rows.map((r, i) => (
                  <div key={i} className="border-b border-gray-200 pb-1 leading-relaxed">
                    <div className="font-medium">
                      {r.name} {fmt(r.area)} m²
                    </div>
                    <div>
                      建蔽率 {r.bcrBase}%{r.bcrNote ? ` → ${r.bcr >= 100 && r.bcrNote.includes('制限なし') ? '制限なし' : `${r.bcr}%`}(${r.bcrNote})` : ''}
                    </div>
                    <div>
                      容積率{' '}
                      {r.farRoad !== null
                        ? `min(指定 ${r.farBase}%, 道路 ${result.wEff!.toFixed(2)} × ${r.roadK} =${r.farRoad.toFixed(1)}%) = ${pct(r.far)}`
                        : `${r.farBase}%`}
                    </div>
                  </div>
                ))}
                {blankRows > 0 && <p className="text-[#b4402f]">敷地面積が未入力の行が {blankRows} 行あります(計算に入れていません)。</p>}
                {result.notes.map((n) => (
                  <p key={n} className="text-[#b4402f]">
                    {n}
                  </p>
                ))}
              </div>
            )}

            <p className="text-[10px] text-gray-400 leading-relaxed">
              ※ 建築基準法 52 条(1・2・7・9 項)・53 条(1〜3・6〜8 項)・令 2 条 1 項 1 号・令 135 条の 18 による目安です(e-Gov の現行本文で確認)。
              <br />※ 入っていないもの: 容積率の不算入(地階の住宅等 52 条 3 項、昇降路・共同住宅の共用廊下等 6 項、車庫等 令 2 条 3 項)、住宅の容積率の緩和(52 条 8 項)、高度利用地区・地区計画・壁面線の指定、建蔽率の許可(53 条 4 項・5 項)、敷地面積の最低限度(53 条の 2)。
              <br />※ 前面道路が 2 以上あって幅員が違う場合の容積率は、最大の幅員で計算しています。最終的な数値は特定行政庁・確認検査機関に確認してください。
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BuildingRegulations;
