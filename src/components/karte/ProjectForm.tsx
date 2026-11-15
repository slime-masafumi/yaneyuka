'use client';

import React, { useState } from 'react';
import { KV, SecHead } from '@/components/ui/Sheet';
import { ROUGH_DESC, type Roughness } from '@/lib/karte/glass';
import {
  AC_DESC,
  EX_DESC,
  FIRE_ZONES,
  GAS_OPTIONS,
  STR_LABEL,
  USE_LABEL,
  WSUP_OPTIONS,
  ZONES,
  type AcType,
  type ExType,
  type Project,
  type StructureType,
  type UseType,
} from '@/lib/karte/masters';
import { effectiveFire, heightNotes, majorityZone, partsOf, siteAreaOf, type SitePart } from '@/lib/karte/site';
import { ZONE_GUIDES } from '@/lib/zoneGuide';

type Props = {
  project: Project;
  onSave: (p: Project) => void;
};

type Form = { [K in Exclude<keyof Project, 'parts'>]: string };

// 後から足した項目(前面道路・その他の制限)は古い物件に無いので空で始める
const toForm = (p: Project): Form =>
  ({
    road: '',
    other: '',
    ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'parts').map(([k, v]) => [k, String(v ?? '')])),
  }) as Form;

/** 指定建蔽率・指定容積率の選択肢(法 53 条 1 項・52 条 1 項)。用途地域の指定のない区域は 53 条 1 項 6 号・52 条 1 項 8 号 */
const NONE_ZONE = '用途地域の指定のない区域';
function ratioOptions(zone: string): { bc: number[]; far: number[] } {
  if (zone === NONE_ZONE) return { bc: [30, 40, 50, 60, 70], far: [50, 80, 100, 200, 300, 400] };
  const g = ZONE_GUIDES.find((z) => z.name === zone);
  return g ? { bc: g.bcr, far: g.far } : { bc: [], far: [] };
}
const f1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('ja-JP');

const num = (s: string, fallback = 0) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

function numField(p: {
  id: string;
  value: string;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <>
      <input type="number" id={p.id} value={p.value} step={p.step} min={p.min} max={p.max} onChange={p.onChange} />
      <span className="yy-kt-unit">{p.unit}</span>
    </>
  );
}

/**
 * 物件条件の入力。全ツール共通の入力を物件が持つ。
 * 親側で key={project.id} を付け、物件切替時にフォームを作り直す。
 * 組版は計算書と同じ「項目 ……… 値」(KV)。入力欄は 1px の下線だけ。
 */
export default function ProjectForm({ project, onSave }: Props) {
  const [f, setF] = useState<Form>(() => toForm(project));
  // 敷地の部分(用途地域・防火指定・面積・指定建蔽率・指定容積率)。2 以上にわたる敷地のため行を足せる
  const [parts, setPartsRaw] = useState<SitePart[]>(() => partsOf(project).map((x) => ({ ...x })));
  // 保存していない変更があるか(この画面の入力は「条件を保存」を押すまで各分野の判定に反映されない)
  const [dirty, setDirty] = useState(false);
  const setParts: typeof setPartsRaw = (u) => {
    setDirty(true);
    setPartsRaw(u);
  };
  const setPart = (i: number, patch: Partial<SitePart>) => setParts((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addPart = () =>
    setParts((prev) => [...prev, { zone: prev[prev.length - 1]?.zone ?? ZONES[0], fire: prev[prev.length - 1]?.fire ?? FIRE_ZONES[0], area: 0, bc: 0, far: 0, bldg: true }]);
  const removePart = (i: number) => setParts((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));
  const major = majorityZone(parts);
  const fireRule = effectiveFire(parts);
  const siteArea = siteAreaOf(parts);
  const hNotes = heightNotes(parts);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setDirty(true);
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  };

  const save = () => {
    onSave({
      id: project.id,
      name: f.name.trim() || '無題',
      addr: f.addr,
      zone: major.zone,
      fire: fireRule.fire,
      parts: parts.map((x) => ({ ...x, area: Number(x.area) || 0, bc: Number(x.bc) || 0, far: Number(x.far) || 0 })),
      H: num(f.H, project.H),
      v0: num(f.v0, project.v0),
      rough: (f.rough as Roughness) || '3',
      rain: num(f.rain, project.rain),
      z: num(f.z, project.z),
      snow: num(f.snow, project.snow),
      cap: num(f.cap),
      ac: f.ac as AcType,
      accap: num(f.accap),
      ex: f.ex as ExType,
      gas: f.gas,
      wsup: f.wsup,
      use: f.use as UseType,
      str: f.str as StructureType,
      fl: num(f.fl, 1),
      bf: num(f.bf, 0),
      area: num(f.area, 0),
      road: f.road.trim() === '' ? undefined : num(f.road, 0),
      other: f.other,
    });
    setDirty(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  // コンポーネントではなく関数呼び出しにする（レンダーごとに別コンポーネントになると
  // 入力欄が作り直されてフォーカスが飛ぶ）
  const Num = ({ id, k, unit, step, min, max }: { id: string; k: keyof Form; unit: string; step?: number; min?: number; max?: number }) =>
    numField({ id, value: f[k], unit, step, min, max, onChange: set(k) });

  const L = (id: string, t: string) => <label htmlFor={id}>{t}</label>;

  return (
    <>
      <section>
        <SecHead no="I" title="物件条件" right="各分野の検討で共通に使う" />
        <div className="yy-kt-form">
          <KV k={L('p-name', '物件名')} v={<input id="p-name" className="is-text" value={f.name} onChange={set('name')} />} />
          <KV k={L('p-addr', '所在地')} v={<input id="p-addr" className="is-text" value={f.addr} onChange={set('addr')} />} />
          <KV
            k={L('p-use', '主用途')}
            v={
              <select id="p-use" value={f.use} onChange={set('use')}>
                {(Object.keys(USE_LABEL) as UseType[]).map((u) => <option key={u} value={u}>{USE_LABEL[u]}</option>)}
              </select>
            }
          />
          <KV
            k={L('p-str', '構造種別')}
            v={
              <select id="p-str" value={f.str} onChange={set('str')}>
                {(Object.keys(STR_LABEL) as StructureType[]).map((s) => <option key={s} value={s}>{STR_LABEL[s]}</option>)}
              </select>
            }
          />
          <KV k={L('p-fl', '地上階数(地階を除く)')} v={Num({ id: 'p-fl', k: 'fl', unit: '階', min: 1, step: 1 })} />
          <KV k={L('p-bf', '地下階数')} v={Num({ id: 'p-bf', k: 'bf', unit: '階', min: 0, step: 1 })} />
          <KV k={L('p-area', '延べ面積(各階の床面積の合計)')} v={Num({ id: 'p-area', k: 'area', unit: 'm²', min: 0, step: 10 })} />
          <KV k={L('p-h', '建築物の高さ H(地盤面から)')} v={Num({ id: 'p-h', k: 'H', unit: 'm', min: 1, step: 0.5 })} />
          <KV k={L('p-road', '前面道路の幅員(最大のもの)')} v={Num({ id: 'p-road', k: 'road', unit: 'm', min: 0, step: 0.1 })} />
          <KV k={L('p-v0', '基準風速 V₀')} v={Num({ id: 'p-v0', k: 'v0', unit: 'm/s', min: 30, max: 46, step: 1 })} />
          <KV
            k={L('p-rough', '地表面粗度区分')}
            v={
              <select id="p-rough" value={f.rough} onChange={set('rough')}>
                {(Object.keys(ROUGH_DESC) as Roughness[]).map((r) => <option key={r} value={r}>{ROUGH_DESC[r]}</option>)}
              </select>
            }
          />
          <KV k={L('p-rain', '設計用降雨強度')} v={Num({ id: 'p-rain', k: 'rain', unit: 'mm/h', min: 50, step: 5 })} />
          <KV k={L('p-z', '地震地域係数 Z')} v={Num({ id: 'p-z', k: 'z', unit: '', min: 0.7, max: 1.0, step: 0.1 })} />
          <KV k={L('p-snow', '垂直積雪量')} v={Num({ id: 'p-snow', k: 'snow', unit: 'cm', min: 0, step: 5 })} />
        </div>
        <div className="yy-kt-parts">
          <div className="yy-kt-parts__head">
            <span className="yy-kt-parts__title">敷地の地域</span>
            <span className="yy-kt-parts__hint">敷地が 2 以上の用途地域・防火指定にわたるときは、行を足して部分ごとの面積を入れる</span>
          </div>
          <div className="yy-kt-parts__scroll">
            <table className="yy-kt-parts__tbl">
              <thead>
                <tr>
                  <th>用途地域</th>
                  <th>防火指定</th>
                  <th>面積(m²)</th>
                  <th>指定建蔽率</th>
                  <th>指定容積率</th>
                  <th>建物がかかる</th>
                  <th aria-label="削除" />
                </tr>
              </thead>
              <tbody>
                {parts.map((x, i) => {
                  const opt = ratioOptions(x.zone);
                  return (
                    <tr key={i}>
                      <td>
                        <select aria-label={`${i + 1} 行目の用途地域`} value={x.zone} onChange={(e) => setPart(i, { zone: e.target.value, bc: 0, far: 0 })}>
                          {ZONES.map((z) => <option key={z}>{z}</option>)}
                        </select>
                      </td>
                      <td>
                        <select aria-label={`${i + 1} 行目の防火指定`} value={x.fire} onChange={(e) => setPart(i, { fire: e.target.value })}>
                          {FIRE_ZONES.map((z) => <option key={z}>{z}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          aria-label={`${i + 1} 行目の面積`}
                          min={0}
                          step={0.01}
                          value={x.area || ''}
                          placeholder={parts.length === 1 ? '敷地面積' : ''}
                          onChange={(e) => setPart(i, { area: Number(e.target.value) })}
                        />
                      </td>
                      <td>
                        <select aria-label={`${i + 1} 行目の指定建蔽率`} value={x.bc || ''} onChange={(e) => setPart(i, { bc: Number(e.target.value) })}>
                          <option value="">—</option>
                          {opt.bc.map((n) => <option key={n} value={n}>{n}%</option>)}
                        </select>
                      </td>
                      <td>
                        <select aria-label={`${i + 1} 行目の指定容積率`} value={x.far || ''} onChange={(e) => setPart(i, { far: Number(e.target.value) })}>
                          <option value="">—</option>
                          {opt.far.map((n) => <option key={n} value={n}>{n}%</option>)}
                        </select>
                      </td>
                      <td className="is-c">
                        <input type="checkbox" aria-label={`${i + 1} 行目に建物がかかる`} checked={x.bldg} onChange={(e) => setPart(i, { bldg: e.target.checked })} />
                      </td>
                      <td className="is-c">
                        {parts.length > 1 && (
                          <button type="button" className="yy-kt-parts__del" onClick={() => removePart(i)} aria-label={`${i + 1} 行目を消す`}>
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="yy-kt-parts__add" onClick={addPart}>
            ＋ 地域を足す(敷地が 2 以上にわたるとき)
          </button>
          <dl className="yy-kt-parts__rule">
            {siteArea > 0 && (
              <>
                <dt>敷地面積</dt>
                <dd>{f1(siteArea)} m²</dd>
              </>
            )}
            <dt>用途の制限</dt>
            <dd>
              {major.multi
                ? major.majority
                  ? `${major.zone}(敷地の ${f1(major.share * 100)}%)の規定を、建物と敷地の全部に適用(法 91 条)`
                  : `過半を占める地域がありません。最も広いのは${major.zone}(${f1(major.share * 100)}%)。特定行政庁に扱いを確認`
                : major.zone}
            </dd>
            <dt>防火</dt>
            <dd>
              {fireRule.spans
                ? `建物が${fireRule.fire}と${fireRule.lower}にわたるので、建物の全部に${fireRule.fire}の規定(法 65 条)。${fireRule.lower}の側を防火壁で区画すれば、その外側は${fireRule.lower === '準防火地域' ? '準防火地域の規定' : '防火・準防火の規定の外'}`
                : fireRule.fire}
            </dd>
            {major.multi && (
              <>
                <dt>建蔽率・容積率</dt>
                <dd>部分ごとの限度を面積で加重平均(法 53 条 2 項・52 条 7 項)。カルテの「建蔽率・容積率の判定」はこの表の値で計算します</dd>
              </>
            )}
          </dl>
          {hNotes.length > 0 && (
            <ul className="yy-kt-parts__notes">
              {hNotes.map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
        </div>
        <div className="yy-kt-form">
          <KV
            k={L('p-other', 'その他の制限(判定の外)')}
            v={
              <input
                id="p-other"
                className="is-text"
                value={f.other}
                onChange={set('other')}
                placeholder="高度地区・地区計画・建築協定・景観地区・条例など"
              />
            }
          />
        </div>
        <p className="yy-kt-note">
          ここに入れた条件が、意匠・構造・設備・電気の各検討で共通に使われます。関係のない項目は自動でグレーになります。高さ H は地盤面からの建築物の高さ(令 2 条 1 項 6 号)。階段室・昇降機塔などで水平投影面積が建築面積の 1/8 以内の部分は、12m まで高さに入れない規定と入れる規定(北側斜線など)があるので、各項目で確かめてください。前面道路の幅員は 2 項道路なら後退後の 4m(指定区域は 6m)。高度地区・地区計画・建築協定・条例はカルテでは判定しないので、「その他の制限」に書いておくと確認書に残ります。V₀・粗度区分・Z・垂直積雪量は告示および自治体規則で地域ごとに定まります。所在地からの自動取得は今後の対応です。
        </p>
      </section>

      <section>
        <SecHead no="II" title="建物側の供給スペック" right="テナント工事で最後に効く" />
        <div className="yy-kt-form">
          <KV k={L('p-cap', 'テナント分電盤の容量')} v={Num({ id: 'p-cap', k: 'cap', unit: 'kVA', min: 0, step: 1 })} />
          <KV
            k={L('p-ac', '空調方式')}
            v={
              <select id="p-ac" value={f.ac} onChange={set('ac')}>
                {(Object.keys(AC_DESC) as AcType[]).map((a) => <option key={a} value={a}>{AC_DESC[a]}</option>)}
              </select>
            }
          />
          <KV k={L('p-accap', '供給可能な冷房能力')} v={Num({ id: 'p-accap', k: 'accap', unit: 'kW', min: 0, step: 1 })} />
          <KV
            k={L('p-ex', '厨房排気ルート')}
            v={
              <select id="p-ex" value={f.ex} onChange={set('ex')}>
                {(Object.keys(EX_DESC) as ExType[]).map((x) => <option key={x} value={x}>{EX_DESC[x]}</option>)}
              </select>
            }
          />
          <KV
            k={L('p-gas', 'ガス引込口径')}
            v={
              <select id="p-gas" value={f.gas} onChange={set('gas')}>
                {GAS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            }
          />
          <KV
            k={L('p-wsup', '給水引込口径')}
            v={
              <select id="p-wsup" value={f.wsup} onChange={set('wsup')}>
                {WSUP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            }
          />
        </div>
        <p className="yy-kt-note">必要量を出しても、建物が供給できなければ成立しません。</p>
        <div className="yy-kt-acts">
          <button type="button" className="yy-btn is-primary" onClick={save}>条件を保存(I・II とも)</button>
          {saved && <span className="yy-kt-saved">✓ 保存しました</span>}
          {!saved && dirty && <span className="yy-kt-note" style={{ marginTop: 0 }}>保存していない変更があります。保存するまで各分野の判定には反映されません</span>}
        </div>
      </section>
    </>
  );
}
