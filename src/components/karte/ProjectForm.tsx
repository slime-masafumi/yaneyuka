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

type Props = {
  project: Project;
  onSave: (p: Project) => void;
};

type Form = { [K in keyof Project]: string };

const toForm = (p: Project): Form =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v ?? '')])) as Form;

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
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Project) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const save = () => {
    onSave({
      id: project.id,
      name: f.name.trim() || '無題',
      addr: f.addr,
      zone: f.zone,
      fire: f.fire,
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
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  // コンポーネントではなく関数呼び出しにする（レンダーごとに別コンポーネントになると
  // 入力欄が作り直されてフォーカスが飛ぶ）
  const Num = ({ id, k, unit, step, min, max }: { id: string; k: keyof Project; unit: string; step?: number; min?: number; max?: number }) =>
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
            k={L('p-zone', '用途地域')}
            v={
              <select id="p-zone" value={f.zone} onChange={set('zone')}>
                {ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            }
          />
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
          <KV
            k={L('p-fire', '防火指定')}
            v={
              <select id="p-fire" value={f.fire} onChange={set('fire')}>
                {FIRE_ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            }
          />
          <KV k={L('p-fl', '地上階数')} v={Num({ id: 'p-fl', k: 'fl', unit: '階', min: 1, step: 1 })} />
          <KV k={L('p-bf', '地下階数')} v={Num({ id: 'p-bf', k: 'bf', unit: '階', min: 0, step: 1 })} />
          <KV k={L('p-area', '延べ面積')} v={Num({ id: 'p-area', k: 'area', unit: 'm²', min: 0, step: 10 })} />
          <KV k={L('p-h', '建築物の高さ H')} v={Num({ id: 'p-h', k: 'H', unit: 'm', min: 1, step: 0.5 })} />
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
        <p className="yy-kt-note">
          ここに入れた条件が、意匠・構造・設備・電気の各検討で共通に使われます。関係のない項目は自動でグレーになります。V₀・粗度区分・Z・垂直積雪量は告示および自治体規則で地域ごとに定まります。所在地からの自動取得は今後の対応です。
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
          <button type="button" className="yy-btn is-primary" onClick={save}>条件を保存</button>
          {saved && <span className="yy-kt-saved">✓ 保存しました</span>}
        </div>
      </section>
    </>
  );
}
