'use client';

import React, { useState } from 'react';
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
    <div className="yk-pair">
      <input type="number" id={p.id} value={p.value} step={p.step} min={p.min} max={p.max} onChange={p.onChange} />
      <span>{p.unit}</span>
    </div>
  );
}

/**
 * 物件条件の入力。全ツール共通の入力を物件が持つ。
 * 親側で key={project.id} を付け、物件切替時にフォームを作り直す。
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

  return (
    <div className="yk-panel">
      <div className="yk-grid">
        <div className="yk-f yk-wide"><label htmlFor="p-name">物件名</label><input id="p-name" value={f.name} onChange={set('name')} /></div>
        <div className="yk-f yk-wide"><label htmlFor="p-addr">所在地</label><input id="p-addr" value={f.addr} onChange={set('addr')} /></div>
        <div className="yk-f">
          <label htmlFor="p-zone">用途地域</label>
          <select id="p-zone" value={f.zone} onChange={set('zone')}>
            {ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
        </div>
        <div className="yk-f">
          <label htmlFor="p-use">主用途</label>
          <select id="p-use" value={f.use} onChange={set('use')}>
            {(Object.keys(USE_LABEL) as UseType[]).map((u) => <option key={u} value={u}>{USE_LABEL[u]}</option>)}
          </select>
        </div>
        <div className="yk-f">
          <label htmlFor="p-str">構造種別</label>
          <select id="p-str" value={f.str} onChange={set('str')}>
            {(Object.keys(STR_LABEL) as StructureType[]).map((s) => <option key={s} value={s}>{STR_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="yk-f"><label htmlFor="p-fl">地上階数</label>{Num({ id: "p-fl", k: "fl", unit: "階", min: 1, step: 1 })}</div>
        <div className="yk-f"><label htmlFor="p-bf">地下階数</label>{Num({ id: "p-bf", k: "bf", unit: "階", min: 0, step: 1 })}</div>
        <div className="yk-f"><label htmlFor="p-area">延べ面積</label>{Num({ id: "p-area", k: "area", unit: "m²", min: 0, step: 10 })}</div>
        <div className="yk-f">
          <label htmlFor="p-fire">防火指定</label>
          <select id="p-fire" value={f.fire} onChange={set('fire')}>
            {FIRE_ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
        </div>
        <div className="yk-f"><label htmlFor="p-h">建築物の高さ H</label>{Num({ id: "p-h", k: "H", unit: "m", min: 1, step: 0.5 })}</div>
        <div className="yk-f"><label htmlFor="p-v0">基準風速 V₀</label>{Num({ id: "p-v0", k: "v0", unit: "m/s", min: 30, max: 46, step: 1 })}</div>
        <div className="yk-f">
          <label htmlFor="p-rough">地表面粗度区分</label>
          <select id="p-rough" value={f.rough} onChange={set('rough')}>
            {(Object.keys(ROUGH_DESC) as Roughness[]).map((r) => <option key={r} value={r}>{ROUGH_DESC[r]}</option>)}
          </select>
        </div>
        <div className="yk-f"><label htmlFor="p-rain">設計用降雨強度</label>{Num({ id: "p-rain", k: "rain", unit: "mm/h", min: 50, step: 5 })}</div>
        <div className="yk-f"><label htmlFor="p-z">地震地域係数 Z</label>{Num({ id: "p-z", k: "z", unit: "", min: 0.7, max: 1.0, step: 0.1 })}</div>
        <div className="yk-f"><label htmlFor="p-snow">垂直積雪量</label>{Num({ id: "p-snow", k: "snow", unit: "cm", min: 0, step: 5 })}</div>
      </div>

      <h2 style={{ marginTop: 26 }}>建物側の供給スペック</h2>
      <p className="yk-hint" style={{ marginBottom: 12 }}>テナント工事で最後に効くのはここです。必要量を出しても、建物が供給できなければ成立しません。</p>
      <div className="yk-grid">
        <div className="yk-f"><label htmlFor="p-cap">テナント分電盤の容量</label>{Num({ id: "p-cap", k: "cap", unit: "kVA", min: 0, step: 1 })}</div>
        <div className="yk-f">
          <label htmlFor="p-ac">空調方式</label>
          <select id="p-ac" value={f.ac} onChange={set('ac')}>
            {(Object.keys(AC_DESC) as AcType[]).map((a) => <option key={a} value={a}>{AC_DESC[a]}</option>)}
          </select>
        </div>
        <div className="yk-f"><label htmlFor="p-accap">供給可能な冷房能力</label>{Num({ id: "p-accap", k: "accap", unit: "kW", min: 0, step: 1 })}</div>
        <div className="yk-f">
          <label htmlFor="p-ex">厨房排気ルート</label>
          <select id="p-ex" value={f.ex} onChange={set('ex')}>
            {(Object.keys(EX_DESC) as ExType[]).map((x) => <option key={x} value={x}>{EX_DESC[x]}</option>)}
          </select>
        </div>
        <div className="yk-f">
          <label htmlFor="p-gas">ガス引込口径</label>
          <select id="p-gas" value={f.gas} onChange={set('gas')}>
            {GAS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="yk-f">
          <label htmlFor="p-wsup">給水引込口径</label>
          <select id="p-wsup" value={f.wsup} onChange={set('wsup')}>
            {WSUP_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="yk-save">
        <button type="button" className="yk-btn" onClick={save}>条件を保存</button>
        {saved && <span className="yk-saved">保存しました</span>}
      </div>
    </div>
  );
}
