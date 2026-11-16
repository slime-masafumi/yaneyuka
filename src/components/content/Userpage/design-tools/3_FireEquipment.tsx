import React, { useMemo, useState } from 'react';
import {
  USES,
  EQ,
  floorLabel,
  head,
  is16,
  judge,
  judgeWithFloors,
  labelOfUse,
  shortUse,
  type FireIn,
  type FloorIn,
  type FloorResult,
  type PartResult,
  type Row,
  type Status,
  type Structure,
  type UseCode,
} from '@/lib/fireEquipment';

/**
 * 消防用設備等の設置の目安(消防法施行令 第 9 条〜第 29 条の 2・別表第一)。
 * 判定は src/lib/fireEquipment.ts(条文との照合の経緯もそこに書いてある)。
 *
 * 階の床面積の入れ方は 2 通り:
 *   - 最大の階だけ入れる(従来どおり。地階・無窓階・3 階以上・4〜10 階のうち最大の階の床面積で判定)
 *   - 階ごとに表で入れる(延べ面積・階数は表の合計から出し、地階・無窓階・階の位置で決まる基準は階ごとに当てる)
 */

interface FireEquipmentProps {
  hideHeader?: boolean;
}

const numOr = (s: string) => (s.trim() === '' ? NaN : Number(s));

const inp = 'w-full p-2 border border-gray-300 rounded text-xs';
const cell = 'w-full p-1 border border-gray-300 rounded text-xs';
const lab = 'block text-xs font-bold text-gray-700 mb-1';

/** 数値の入力欄(コンポーネントの外に置く。中で定義すると入力のたびに作り直されてフォーカスが外れる) */
function Field({ k, v, set, hint, ph }: { k: string; v: string; set: (s: string) => void; hint?: string; ph?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-gray-500 mb-1">{k}</span>
      <input type="number" min="0" value={v} onChange={(e) => set(e.target.value)} className={inp} placeholder={ph} />
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

function Check({ checked, set, children }: { checked: boolean; set: (b: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-1 text-[11px]">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="mt-0.5" /> <span>{children}</span>
    </label>
  );
}

/** 階の表の 1 行(入力中の文字列のまま持つ) */
type FloorRowState = { id: number; level: number; area: string; use: UseCode | ''; windowless: boolean; cap: string; evac: boolean };

const fmt = (n: number) => n.toLocaleString('ja-JP');

const FireEquipment: React.FC<FireEquipmentProps> = ({ hideHeader }) => {
  const [use, setUse] = useState<UseCode | ''>('');
  const [total, setTotal] = useState('');
  const [above, setAbove] = useState('');
  const [below, setBelow] = useState('0');
  const [bwMax, setBwMax] = useState('0');
  const [up3Max, setUp3Max] = useState('');
  const [up4Max, setUp4Max] = useState('');
  const [basementTotal, setBasementTotal] = useState('0');
  const [f12, setF12] = useState('');
  const [site, setSite] = useState('');
  const [height, setHeight] = useState('');
  const [structure, setStructure] = useState<Structure>('other');
  const [interior, setInterior] = useState(false);
  const [cap, setCap] = useState('');
  const [capBW, setCapBW] = useState('');
  const [capFloor, setCapFloor] = useState('');
  const [lowerTokutei, setLowerTokutei] = useState(false);
  const [stairsLack, setStairsLack] = useState(false);
  const [fireUse, setFireUse] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [lodging, setLodging] = useState(false);
  // 2026-11-16 追加: ガス漏れ・漏電・通報と (16)項イ・(16の3)項の特定用途部分
  const [tokuteiArea, setTokuteiArea] = useState('');
  const [basementTokutei, setBasementTokutei] = useState('');
  const [lath, setLath] = useState(false);
  const [ampere, setAmpere] = useState('');
  const [fuelGas, setFuelGas] = useState(false);
  const [hotSpring, setHotSpring] = useState(false);
  const [nearStation, setNearStation] = useState(false);
  // 階ごとの表
  const [floorMode, setFloorMode] = useState(false);
  const [floors, setFloors] = useState<FloorRowState[]>([]);
  const [nextId, setNextId] = useState(1);

  const u = use as UseCode;
  const c16 = is16(use);

  /** 表を開いたとき、地上階数・地階の階数から行を作る */
  const openFloors = () => {
    setFloorMode(true);
    if (floors.length) return;
    const a = Math.max(1, Math.floor(Number(above)) || 1);
    const b = Math.max(0, Math.floor(Number(below)) || 0);
    const levels = [...Array.from({ length: a }, (_, i) => a - i), ...Array.from({ length: b }, (_, i) => -(i + 1))];
    setFloors(levels.map((level, i) => ({ id: i + 1, level, area: '', use: '', windowless: false, cap: '', evac: level === 1 })));
    setNextId(levels.length + 1);
  };
  const addFloor = (up: boolean) => {
    const top = Math.max(0, ...floors.map((f) => f.level));
    const bottom = Math.min(0, ...floors.map((f) => f.level));
    const level = up ? top + 1 : bottom - 1;
    const row: FloorRowState = { id: nextId, level, area: '', use: '', windowless: false, cap: '', evac: level === 1 };
    setFloors((fs) => [...fs, row].sort((x, y) => y.level - x.level));
    setNextId((n) => n + 1);
  };
  const patchFloor = (id: number, p: Partial<FloorRowState>) => setFloors((fs) => fs.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeFloor = (id: number) => setFloors((fs) => fs.filter((f) => f.id !== id));

  const floorIn: FloorIn[] = useMemo(
    () => floors.map((f) => ({ level: f.level, area: numOr(f.area), use: f.use, windowless: f.level > 0 && f.windowless, cap: numOr(f.cap), evac: f.evac })),
    [floors],
  );
  const floorSum = floorIn.reduce((s, f) => s + (Number.isFinite(f.area) && f.area > 0 ? f.area : 0), 0);
  const floorAbove = Math.max(0, ...floorIn.filter((f) => f.area > 0 && f.level > 0).map((f) => f.level));
  const floorBelow = Math.max(0, ...floorIn.filter((f) => f.area > 0 && f.level < 0).map((f) => -f.level));

  const missing: string[] = [];
  if (!use) missing.push('用途');
  if (floorMode) {
    if (!(floorSum > 0) || !(floorAbove > 0)) missing.push('地上階の床面積');
  } else {
    if (!(Number(total) > 0)) missing.push('延べ面積');
    if (!(Number(above) > 0)) missing.push('地上階数');
  }

  const out = useMemo((): { rows: Row[]; floors: FloorResult[]; parts: PartResult[] } | null => {
    if (!use) return null;
    const base: FireIn = {
      use,
      total: Number(total),
      above: Math.floor(Number(above)),
      below: Math.floor(Number(below) || 0),
      bwMax: Number(bwMax) || 0,
      up3Max: up3Max === '' ? 0 : Number(up3Max),
      up4Max: up4Max === '' ? 0 : Number(up4Max),
      basementTotal: Number(basementTotal) || 0,
      f12: Number(f12) || 0,
      site: Number(site) || 0,
      height: Number(height) || 0,
      structure,
      interiorNonComb: interior,
      cap: numOr(cap),
      capBW: numOr(capBW),
      capFloor: numOr(capFloor),
      lowerTokutei,
      stairsLack,
      fireUse,
      assisted,
      lodging,
      tokuteiArea: numOr(tokuteiArea),
      basementTokutei: numOr(basementTokutei),
      lath,
      ampere: numOr(ampere),
      fuelGas,
      hotSpring,
      nearStation,
    };
    if (floorMode) {
      if (!(floorSum > 0) || !(floorAbove > 0)) return null;
      // 表の行で階の値を決めるので、「最大の階」の欄は使わない(収容人員の地階・無窓階・最大の階も表から出す)
      // (16)項イの特定用途部分は表の用途から出す(欄は隠しているので、残った値を使わない)
      const t16 = use === '16i' ? { tokuteiArea: NaN, basementTokutei: NaN } : {};
      const r = judgeWithFloors({ ...base, ...t16, bwMax: 0, up3Max: 0, up4Max: 0, basementTotal: 0, f12: 0, capBW: NaN, capFloor: NaN }, floorIn);
      return { rows: r.rows, floors: r.floors, parts: r.parts };
    }
    if (!(Number(total) > 0) || !(Number(above) > 0)) return null;
    return { rows: judge(base), floors: [], parts: [] };
  }, [
    use, total, above, below, bwMax, up3Max, up4Max, basementTotal, f12, site, height, structure, interior, cap, capBW, capFloor,
    lowerTokutei, stairsLack, fireUse, assisted, lodging, tokuteiArea, basementTokutei, lath, ampere, fuelGas, hotSpring, nearStation,
    floorMode, floorIn, floorSum, floorAbove,
  ]);
  const results = out?.rows ?? null;

  const STATUS: Record<Status, React.ReactNode> = {
    req: (
      <span className="yy-dt-req">
        <i className="yy-dot" />
        設置が必要
      </span>
    ),
    part: (
      <span className="yy-dt-req">
        <i className="yy-dot" />
        該当する階・部分に必要
      </span>
    ),
    check: <span className="text-[#b4402f]">要確認</span>,
    no: <span className="text-gray-400">不要の見込み</span>,
  };

  /** 階の表の結果: 建物全体で必要なものは除き、その階で要るものだけ */
  const wholeReq = new Set((results ?? []).filter((r) => r.status === 'req').map((r) => r.name));
  const partNeeds = (label: string) =>
    (out?.parts ?? []).filter((p) => p.floors.includes(label)).flatMap((p) => p.rows.filter((r) => r.status === 'req' && !wholeReq.has(r.name)).map((r) => ({ p, r })));

  return (
    <div className="w-full bg-white">
      {!hideHeader && (
        <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white rounded-t-lg">
          <h3 className="text-[13px] font-medium">消防設備判定ツール (Beta)</h3>
        </div>
      )}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-7 items-start">
          <div className="min-w-0">
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded text-[11px] leading-relaxed text-red-800">
              <strong>重要:</strong> 消防法施行令の設置基準による目安です。無窓階の判定(規則 5 条の 5)・収容人員の算定(規則 1 条の 3)・特例(令 32 条)・市町村の火災予防条例の上乗せで結果は変わります。必ず所轄消防署の事前相談で確かめてください。
            </div>

            <div className="space-y-4">
              <div>
                <label className={lab}>1. 用途区分(消防法施行令 別表第一)</label>
                <select value={use} onChange={(e) => setUse(e.target.value as UseCode)} className={inp}>
                  <option value="">選択してください</option>
                  {USES.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map(([c, l]) => (
                        <option key={c} value={c}>
                          {l}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {use && head(u) === '3' && (
                  <Check checked={fireUse} set={setFireUse}>
                    火を使用する設備・器具(厨房のガスこんろ等)を設けている
                  </Check>
                )}
                {(use === '6ro2' || use === '6ro4' || use === '6ro5') && (
                  <Check checked={assisted} set={setAssisted}>
                    介助がなければ避難できない者を主として入所させる
                  </Check>
                )}
                {use === '6ha' && (
                  <Check checked={lodging} set={setLodging}>
                    利用者を入居させ、または宿泊させる
                  </Check>
                )}
              </div>

              <div>
                <label className={lab}>2. 規模</label>
                {floorMode ? (
                  <p className="text-[11px] text-gray-600">
                    階の表から: 延べ面積 {fmt(floorSum)}㎡ / 地上 {floorAbove} 階 / 地階 {floorBelow} 階
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Field k="延べ面積(㎡)" v={total} set={setTotal} ph="必須" />
                    <Field k="地上階数" v={above} set={setAbove} ph="必須" />
                    <Field k="地階の階数" v={below} set={setBelow} />
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>3. 階ごとの床面積(階で決まる基準に使う)</label>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <label className="flex items-center gap-1">
                    <input type="radio" name="fe-floor-mode" checked={!floorMode} onChange={() => setFloorMode(false)} /> 最大の階だけ入れる
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="fe-floor-mode" checked={floorMode} onChange={openFloors} /> 階ごとに表で入れる
                  </label>
                </div>
                {floorMode ? (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="yy-tbl min-w-[300px]">
                        <thead>
                          <tr>
                            <th className="pr-1">階</th>
                            <th className="pr-1">床面積㎡</th>
                            {c16 && <th className="pr-1">用途</th>}
                            <th className="pr-1">無窓階</th>
                            <th className="pr-1">避難階</th>
                            <th className="pr-1">収容人員</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {floors.map((f) => (
                            <tr key={f.id}>
                              <td className="pr-1 whitespace-nowrap text-[11px]">{floorLabel(f.level)}</td>
                              <td className="pr-1 w-[72px]">
                                <input type="number" min="0" value={f.area} onChange={(e) => patchFloor(f.id, { area: e.target.value })} className={cell} />
                              </td>
                              {c16 && (
                                <td className="pr-1 min-w-[120px]">
                                  <select value={f.use} onChange={(e) => patchFloor(f.id, { use: e.target.value as UseCode | '' })} className={cell}>
                                    <option value="">選ぶ</option>
                                    {USES.flatMap((g) => g.items)
                                      .filter(([c]) => !is16(c) && c !== '16-2' && c !== '16-3')
                                      .map(([c, l]) => (
                                        <option key={c} value={c}>
                                          {l}
                                        </option>
                                      ))}
                                  </select>
                                </td>
                              )}
                              <td className="pr-1 text-center">
                                {f.level > 0 ? <input type="checkbox" checked={f.windowless} onChange={(e) => patchFloor(f.id, { windowless: e.target.checked })} /> : <span className="text-[10px] text-gray-400">地階</span>}
                              </td>
                              <td className="pr-1 text-center">
                                <input type="checkbox" checked={f.evac} onChange={(e) => patchFloor(f.id, { evac: e.target.checked })} />
                              </td>
                              <td className="pr-1 w-[64px]">
                                <input type="number" min="0" value={f.cap} onChange={(e) => patchFloor(f.id, { cap: e.target.value })} className={cell} placeholder="未入力" />
                              </td>
                              <td className="text-right">
                                <button type="button" className="text-[10px] text-gray-500 underline" onClick={() => removeFloor(f.id)}>
                                  消す
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="yy-btn" onClick={() => addFloor(true)}>
                        上の階を足す
                      </button>
                      <button type="button" className="yy-btn" onClick={() => addFloor(false)}>
                        地階を足す
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      無窓階は消防法施行規則 5 条の 5 で判定。避難階は直接地上へ通じる出入口のある階(初期値は 1 階)。収容人員は規則 1 条の 3 で階ごとに算定(避難器具・地階と無窓階の非常警報に使う)。
                      {c16 && '(16)項は階ごとに主な用途を選ぶ。1 つの階に複数の用途があるときは、部分ごとの面積で所轄に確かめる。'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Field k="地階・無窓階のうち最大の階の床面積(㎡)" v={bwMax} set={setBwMax} hint="無ければ 0。無窓階は消防法施行規則 5 条の 5 で判定" />
                    <Field k="地階の床面積の合計(㎡)" v={basementTotal} set={setBasementTotal} />
                    <Field k="3 階以上の階のうち最大の床面積(㎡)" v={up3Max} set={setUp3Max} />
                    <Field k="4〜10 階の階のうち最大の床面積(㎡)" v={up4Max} set={setUp4Max} />
                    <Field k="1 階と 2 階の床面積の合計(㎡)" v={f12} set={setF12} hint="平屋は 1 階。屋外消火栓・消防用水(令 19 条)" />
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>4. 構造・敷地</label>
                <select value={structure} onChange={(e) => setStructure(e.target.value as Structure)} className={inp}>
                  <option value="fr">耐火建築物(特定主要構造部が耐火構造)</option>
                  <option value="qfr">準耐火建築物(建築基準法 2 条 9 号の 3 イ・ロ)</option>
                  <option value="other">その他</option>
                </select>
                <Check checked={interior} set={setInterior}>
                  壁・天井の室内に面する部分の仕上げが難燃材料(屋内消火栓の倍読みに使う)
                </Check>
                <div className="grid grid-cols-2 gap-2">
                  <Field k="敷地面積(㎡)" v={site} set={setSite} hint="消防用水(令 27 条)" />
                  <Field k="建物の高さ(m)" v={height} set={setHeight} />
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>5. 収容人員・避難(消防法施行規則 1 条の 3 で算定)</label>
                {floorMode ? (
                  <Field k="建物全体(人)" v={cap} set={setCap} ph="空なら階の合計" hint="地階・無窓階と各階の収容人員は表から" />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Field k="建物全体(人)" v={cap} set={setCap} ph="未入力" />
                    <Field k="地階・無窓階(人)" v={capBW} set={setCapBW} ph="未入力" />
                    <Field k="2 階以上・地階で最大の階(人)" v={capFloor} set={setCapFloor} ph="未入力" />
                  </div>
                )}
                <Check checked={lowerTokutei} set={setLowerTokutei}>
                  下の階に (1)〜(4)・(9)・(12)イ・(13)イ・(14)・(15)項の用途がある(避難器具の基準が 10 人に下がる){floorMode && c16 ? '。表の用途からも判定する' : ''}
                </Check>
                <Check checked={stairsLack} set={setStairsLack}>
                  避難階以外の階から避難階・地上へ直通する階段が 2 以上ない(屋外階段・特別避難階段等なら 1 で可)
                </Check>
              </div>

              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
                <label className={lab}>6. 警報・通報の条件</label>
                {(use === '16-3' || (use === '16i' && !floorMode)) && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field k="特定用途部分の床面積の合計(㎡)" v={tokuteiArea} set={setTokuteiArea} ph="未入力" hint="(1)〜(4)・(5)イ・(6)・(9)イ項の部分" />
                    {use === '16i' && <Field k="うち地階にある部分(㎡)" v={basementTokutei} set={setBasementTokutei} ph="未入力" hint="ガス漏れ(令 21 条の 2 第 1 項 5 号)" />}
                  </div>
                )}
                <Check checked={fuelGas} set={setFuelGas}>
                  燃料用ガス(都市ガス等)を使う。液化石油ガス販売事業による LP ガスは除く(ガス漏れ火災警報設備・規則 24 条の 2 の 2)
                </Check>
                <Check checked={hotSpring} set={setHotSpring}>
                  建物の内部に温泉の採取のための設備がある(令 21 条の 2 第 1 項 3 号)
                </Check>
                <Check checked={lath} set={setLath}>
                  間柱・下地を準不燃材料以外で造った鉄網入りの壁・床・天井がある(ラスモルタル等。漏電火災警報器・令 22 条)
                </Check>
                <div className="grid grid-cols-2 gap-2">
                  <Field k="契約電流容量(A)" v={ampere} set={setAmpere} ph="未入力" hint="50A 超で漏電火災警報器(令 22 条 1 項 7 号)" />
                </div>
                <Check checked={nearStation} set={setNearStation}>
                  消防機関(消防署・出張所)からの歩行距離が 500m 以下(令 23 条ただし書・規則 25 条)
                </Check>
              </div>
            </div>
          </div>

          {/* 結果表示(索引の組み方。設置が必要な行は薄い緑) */}
          <div className="min-w-0">
            <h2 className="yy-dt-sec">判定結果{use ? ` — ${labelOfUse(u)}` : ''}</h2>
            {results ? (
              <>
                <table className="w-full text-[12px]">
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.name} className={`border-b${r.status === 'req' || r.status === 'part' ? ' yy-dt-hi' : ''}`}>
                        <td className="py-2 pr-3 align-top whitespace-nowrap text-gray-800">{r.name}</td>
                        <td className="py-2 pr-3 align-top whitespace-nowrap">{STATUS[r.status]}</td>
                        <td className="py-2 align-top text-[11px] leading-snug text-gray-600">
                          {r.text}
                          <span className="yy-fmt ml-2 whitespace-nowrap">{r.law}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {floorMode && out && out.floors.length > 0 && (
                  <>
                    <h2 className="yy-dt-sec mt-6">階ごとの判定</h2>
                    <p className="yy-dt-note pb-2">建物全体で「設置が必要」の設備({wholeReq.size ? Array.from(wholeReq).join('・') : 'なし'})は全部の階に要るので、ここには出さない。</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <tbody>
                          {out.floors.map((fr) => {
                            const pn = partNeeds(fr.label);
                            const hits = fr.hits.filter((h) => !wholeReq.has(h.name) && !pn.some((x) => x.r.name === h.name));
                            const tags = [
                              fr.floor.level < 0 ? '地階' : fr.floor.windowless ? '無窓階' : '',
                              (fr.floor.evac === undefined ? fr.floor.level === 1 : fr.floor.evac) ? '避難階' : '',
                              fr.floor.level >= 11 ? '11 階以上' : '',
                              c16 && fr.floor.use ? shortUse(fr.floor.use as UseCode) : '',
                            ].filter(Boolean);
                            const any = hits.length > 0 || pn.length > 0;
                            return (
                              <tr key={fr.label} className={`border-b${hits.some((h) => h.status === 'part') || pn.length ? ' yy-dt-hi' : ''}`}>
                                <td className="py-2 pr-3 align-top whitespace-nowrap text-gray-800">{fr.label}</td>
                                <td className="py-2 pr-3 align-top whitespace-nowrap text-[11px] text-gray-600">
                                  {fmt(fr.floor.area)}㎡
                                  {tags.length > 0 && <span className="block text-[10px] text-gray-400">{tags.join('・')}</span>}
                                </td>
                                <td className="py-2 align-top text-[11px] leading-snug text-gray-600">
                                  {!any && <span className="text-gray-400">この階だけで要るものは無い</span>}
                                  {hits.map((h, i) => (
                                    <span key={`${h.name}${i}`} className="block">
                                      {h.status === 'check' ? <span className="text-[#b4402f]">要確認 </span> : null}
                                      {h.name}: {h.why}
                                      <span className="yy-fmt ml-2 whitespace-nowrap">{h.law}</span>
                                    </span>
                                  ))}
                                  {pn.map(({ p, r }) => (
                                    <span key={`${p.use}${r.name}`} className="block">
                                      {r.name}: {shortUse(p.use)}の部分(計 {fmt(p.area)}㎡)
                                      <span className="yy-fmt ml-2 whitespace-nowrap">{r.law}・令 9 条</span>
                                    </span>
                                  ))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <p className="yy-dt-note pt-3 leading-relaxed">
                  判定していないもの: 水噴霧・泡・不活性ガス等の消火設備(令 13 条。駐車場・電気室等)、無線通信補助設備(令 29 条の 3)、自動火災報知設備の駐車部分(令 21 条 1 項 13 号)・通信機器室(同 15 号)・道路部分(同 12 号)、総合操作盤・防火対象物の点検。地下街と一体の地階の指定(令 9 条の 2)は所轄に確かめてください。
                  {floorMode
                    ? ' 階の表では、1 つの階を 1 つの用途として判定しています。'
                    : ` 地階・無窓階・各階の床面積で決まる基準は、入れた「最大の階」で見ているので、どの階にかかるかは「階ごとに表で入れる」か、階ごとに確かめてください。`}
                  {` ${EQ.gas}は燃料用ガスの使用、${EQ.leak}は鉄網入りの壁等の有無で決まります(入力欄 6)。`}
                </p>
              </>
            ) : (
              <p className="yy-dt-note pt-3">{missing.join('・')}を入れると、ここに設備ごとの判定が出ます。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FireEquipment;
