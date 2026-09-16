'use client';

import React, { useState } from 'react';
import SaveBar from './SaveBar';
import {
  eqE,
  eqG,
  fmt,
  fnbCalc,
  fnbVerdicts,
  presetOf,
  uid,
  type Equip,
  type Fnb,
  type FnbCalc,
  type Room,
  type StudyDraft,
  type Verdict,
} from '@/lib/karte/engine';
import { BIZ, CATS, EQ, ROOM_TYPE, checksFor, type BizKey, type Project, type RoomTypeKey } from '@/lib/karte/masters';

type Props = {
  project: Project;
  fnb: Fnb;
  checks: Record<string, boolean>;
  onChange: (f: Fnb) => void;
  onCheck: (id: string, on: boolean) => void;
  onBack: () => void;
  onGotoProject: () => void;
  onSave: (draft: StudyDraft, memo: string) => void;
};

/** 数値入力: 空文字は無視して直前の値を保つ（入力途中で 0 に化けないように） */
const numIn = (cb: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.value === '') return;
  const n = +e.target.value;
  if (Number.isFinite(n)) cb(n);
};

function SupCard({ title, need, brk, verdict, vs }: { title: string; need: string; brk: string; verdict: Verdict; vs: string }) {
  const tag = verdict === 'ok' ? '余裕あり' : verdict === 'talk' ? '要確認' : '不足';
  return (
    <div className={`yk-sup yk-${verdict}`}>
      <header>
        <h3>{title}</h3>
        <span className="yk-need">{need}</span>
        <span className="yk-tag">{tag}</span>
      </header>
      <p className="yk-brk">{brk}</p>
      <p className="yk-vs">{vs}</p>
    </div>
  );
}

/**
 * 内装の必要諸元。上から順に埋めると、必要量の算定 → 建物側との突合せ → 決定事項の確認まで一巡する。
 * 機器を 1 台登録すると、電力・ガス・給排水・発熱・換気に同時に効く。
 */
export default function FnbView({ project: p, fnb: f, checks, onChange, onCheck, onBack, onGotoProject, onSave }: Props) {
  const [memo, setMemo] = useState('');
  const [newRoom, setNewRoom] = useState<RoomTypeKey>('hall');
  const [newEq, setNewEq] = useState('');
  const [newEqRoom, setNewEqRoom] = useState('');

  const c: FnbCalc = fnbCalc(p, f);
  const v = fnbVerdicts(c);
  const CHECKS = checksFor(f.type);
  const left = CHECKS.filter((x) => !checks[x[1]]).length;

  const set = (patch: Partial<Fnb>) => onChange({ ...f, ...patch });
  const setRoom = (id: string, patch: Partial<Room>) => set({ rooms: f.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const setEq = (id: string, patch: Partial<Equip>) => set({ equips: f.equips.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const delRoom = (id: string) => {
    if (f.equips.some((x) => x.room === id) && !window.confirm('この室に登録された機器も一緒に削除します。よろしいですか。')) return;
    set({ rooms: f.rooms.filter((x) => x.id !== id), equips: f.equips.filter((x) => x.room !== id) });
  };
  const loadPreset = () => {
    if (!window.confirm(`${BIZ[f.type].label}の標準構成を読み込みます。\n現在の室と機器は置き換わります。よろしいですか。`)) return;
    const pre = presetOf(f.type);
    set({ rooms: pre.rooms, equips: pre.equips });
  };
  const addRoom = () => {
    const T = ROOM_TYPE[newRoom];
    set({
      rooms: [
        ...f.rooms,
        { id: uid(), t: newRoom, name: T.label, a: 10, ch: T.ch, lw: T.lw, seat: T.seatable ? 0 : undefined, hood: T.fire ? '20' : undefined },
      ],
    });
  };
  const usable = Object.keys(EQ).filter((k) => BIZ[f.type].cats.includes(EQ[k].cat));
  const eqKey = usable.includes(newEq) ? newEq : usable[0];
  const eqRoom = f.rooms.some((r) => r.id === newEqRoom) ? newEqRoom : f.rooms[0]?.id ?? '';
  const addEq = () => {
    if (!f.rooms.length) {
      window.alert('先に室を追加してください。');
      return;
    }
    set({ equips: [...f.equips, { id: uid(), k: eqKey, room: eqRoom, n: 1, e: null, g: null, fixed: false }] });
  };
  const editEqValue = (e: Equip, k: 'e' | 'g', n: number) => {
    const next = { ...e, [k]: n } as Equip;
    const M = EQ[e.k];
    next.fixed = eqE(next) !== (M.e || 0) || eqG(next) !== (M.g || 0);
    setEq(e.id, next);
  };

  /* ── 判定文 ── */
  const occMsg: string[] = [];
  occMsg.push(c.occ >= 30 ? '30人以上のため防火管理者の選任が必要です。' : '30人未満のため防火管理者の選任は不要です。');
  occMsg.push(c.hasFire ? '火を使用する設備があるため、面積にかかわらず消火器が必要です（消防令10条）。' : '火を使用する設備がないため、消火器は延べ150m²以上で必要です。');
  if (c.allArea >= 300) occMsg.push('延べ300m²以上のため自動火災報知設備が必要です。');
  if ((+f.floor || 1) < 0) occMsg.push('地階のため内装制限と避難規定が強化されます。');

  const steps: Array<[string, boolean, string]> = [
    ['区画の条件', !!f.name && f.hours > 0 && f.load > 0, ''],
    ['室の登録', f.rooms.length > 0 && f.rooms.every((r) => +r.a > 0), `${f.rooms.length}室`],
    ['機器の登録', f.equips.length > 0, `${c.eqCount}台・確定${v.cover}%`],
    ['建物側との突合せ', !v.all.includes('ng'), `${v.all.filter((x) => x === 'ng').length}件の不足`],
    ['決定事項の確認', left === 0, `未決${left}件`],
  ];

  const draft: StudyDraft = {
    tool: 'fnb',
    title: `内装の必要諸元（${BIZ[f.type].label}）`,
    basis: '令20条の2・令20条の3／S45建告1826／SHASE-S206／内線規程',
    deps: { cap: p.cap, ac: p.ac, accap: p.accap, ex: p.ex, gas: p.gas, wsup: p.wsup },
    inputs: {
      区画: `${f.name}（${f.rooms.length}室 ${c.allArea.toFixed(0)}m² ／ ${f.floor > 0 ? `${f.floor}階` : `${Math.abs(f.floor)}階地下`}）`,
      機器: `${c.eqCount}台 ${fmt(c.massAll)}kg（機器表で確定 ${v.cover}%）`,
      収容人員: `${c.occ} 人`,
      必要電力: `${c.kva.toFixed(1)} kVA（機器 ${c.eqKW.toFixed(1)} kW の積み上げ）`,
      空調能力: `${c.acKW.toFixed(1)} kW（約${c.hp.toFixed(1)}馬力）`,
      排気風量: `${fmt(c.totalEx)} m³/h`,
      ガス: c.eqGasKW === 0 ? 'なし' : `${c.gasM3.toFixed(2)} m³/h`,
      給水: `${fmt(c.waterDay)} L/日（器具 ${c.fixtures} 個）`,
      グリストラップ: c.gtSize > 0 ? `${c.gtSize} L 以上` : '—',
      床荷重: c.worstRoom ? `${fmt(c.worstRoom.q)} N/m²` : '—',
      未決項目: `${left} 件`,
    },
    result: v.all.includes('ng') ? '要調整あり' : left > 0 ? `未決 ${left} 件` : '整合・確認済',
    ok: !v.all.includes('ng'),
    detail: `機器${c.eqCount}台の積み上げ。建物側との突合せ。未決 ${left} 件`,
  };

  return (
    <section>
      <p className="yk-backbar"><button type="button" className="yk-back" onClick={onBack}>← 一覧に戻る</button></p>
      <h1>内装の必要諸元</h1>
      <p className="yk-hint" style={{ marginBottom: 12 }}>上から順に埋めると、必要量の算定と建物側との突合せ、決定事項の確認まで一巡します。</p>
      <ol className="yk-steps">
        {steps.map((st, i) => (
          <li key={st[0]} className={st[1] ? 'yk-done' : i < 3 ? '' : 'yk-warn'}>
            <span className="yk-no">{st[1] ? '✓' : i + 1}</span>
            {st[0]}
            {!st[1] && st[2] && <span style={{ opacity: 0.8 }}>（{st[2]}）</span>}
          </li>
        ))}
      </ol>

      <div className="yk-from">
        <b>建物側より</b>
        <span className="yk-v">
          {[
            `分電盤 ${p.cap || 0}kVA`,
            `空調 ${p.ac === 'central' ? `セントラル ${p.accap || 0}kW` : p.ac === 'individual' ? '個別' : '供給なし'}`,
            `排気 ${p.ex === 'yes' ? '確保済' : p.ex === 'talk' ? '要協議' : 'なし'}`,
            `ガス ${p.gas === '0' ? '引込なし' : `${p.gas}A`}`,
          ].join(' ／ ')}
        </span>
        <button type="button" className="yk-btn yk-ghost yk-small" onClick={onGotoProject}>変更</button>
      </div>

      <div className="yk-panel">
        <div className="yk-grid">
          <div className="yk-f yk-wide"><label htmlFor="f-name">区画名</label><input id="f-name" defaultValue={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
          <div className="yk-f">
            <label htmlFor="f-type">業種</label>
            <div className="yk-pair">
              <select id="f-type" value={f.type} onChange={(e) => set({ type: e.target.value as BizKey })}>
                {(Object.keys(BIZ) as BizKey[]).map((k) => <option key={k} value={k}>{BIZ[k].label}</option>)}
              </select>
              <button type="button" className="yk-btn yk-ghost yk-small" style={{ flex: 'none' }} onClick={loadPreset}>標準構成を読込</button>
            </div>
            <p className="yk-hint">読込むと室と機器が業種の標準構成に置き換わります。</p>
          </div>
          <div className="yk-f"><label htmlFor="f-hours">営業時間</label><div className="yk-pair"><input type="number" id="f-hours" defaultValue={f.hours} min={1} step={1} onChange={numIn((n) => set({ hours: n }))} /><span>時間</span></div></div>
          <div className="yk-f"><label htmlFor="f-staff">従業者数</label><div className="yk-pair"><input type="number" id="f-staff" defaultValue={f.staff} min={0} step={1} onChange={numIn((n) => set({ staff: n }))} /><span>人</span></div></div>
          <div className="yk-f"><label htmlFor="f-floor">所在階</label><div className="yk-pair"><input type="number" id="f-floor" defaultValue={f.floor} step={1} onChange={numIn((n) => set({ floor: n }))} /><span>階</span></div><p className="yk-hint">地階は負の数で。</p></div>
          <div className="yk-f"><label htmlFor="f-load">床の設計積載荷重</label><div className="yk-pair"><input type="number" id="f-load" defaultValue={f.load} min={0} step={100} onChange={numIn((n) => set({ load: n }))} /><span>N/m²</span></div></div>
        </div>
      </div>

      {/* ── 室 ── */}
      <h2>室{f.rooms.length > 0 && <span className="yk-cnt">　{f.rooms.length}室／{c.allArea.toFixed(0)} m²</span>}</h2>
      <p className="yk-hint" style={{ marginBottom: 10 }}>室ごとに換気の根拠が変わります。用途を選ぶと自動で判定します。</p>
      {f.rooms.length === 0 ? (
        <div className="yk-empty-row">室がありません。下から追加してください。</div>
      ) : (
        f.rooms.map((r) => {
          const T = ROOM_TYPE[r.t];
          const vr = c.ventRows.find((x) => x.r.id === r.id);
          return (
            <div key={r.id} className="yk-row">
              <div className="yk-head">
                <span className="yk-nm"><input defaultValue={r.name} aria-label="室名" onChange={(e) => setRoom(r.id, { name: e.target.value })} /></span>
                <span className="yk-mode yk-fixed">{T.label}</span>
                <button type="button" className="yk-x" title="削除" aria-label={`${r.name} を削除`} onClick={() => delRoom(r.id)}>×</button>
              </div>
              <div className="yk-fields">
                <span className="yk-fl">面積 <input type="number" min={0} step={0.5} defaultValue={r.a} onChange={numIn((n) => setRoom(r.id, { a: n }))} /> m²</span>
                <span className="yk-fl">天井高 <input type="number" min={1} step={0.1} defaultValue={r.ch || T.ch} onChange={numIn((n) => setRoom(r.id, { ch: n }))} /> m</span>
                <span className="yk-fl">照明 <input type="number" min={0} step={1} defaultValue={r.lw !== undefined ? r.lw : T.lw} onChange={numIn((n) => setRoom(r.id, { lw: n }))} /> W/m²</span>
                {T.seatable && (
                  <span className="yk-fl">人員 <input type="number" min={0} step={1} defaultValue={r.seat || 0} onChange={numIn((n) => setRoom(r.id, { seat: n }))} /></span>
                )}
                {T.fire && (
                  <span className="yk-fl">
                    フード{' '}
                    <select value={r.hood || '20'} onChange={(e) => setRoom(r.id, { hood: e.target.value })}>
                      <option value="40">なし・換気扇</option>
                      <option value="30">Ⅰ型</option>
                      <option value="20">Ⅱ型</option>
                    </select>
                  </span>
                )}
              </div>
              {vr && <p className="yk-basis">必要換気量 {fmt(vr.v)} m³/h　{vr.detail}</p>}
              {vr && <p className="yk-util">{vr.basis}</p>}
            </div>
          );
        })
      )}
      <div className="yk-addrow">
        <select value={newRoom} aria-label="追加する室の用途" onChange={(e) => setNewRoom(e.target.value as RoomTypeKey)}>
          {(Object.keys(ROOM_TYPE) as RoomTypeKey[]).map((k) => <option key={k} value={k}>{ROOM_TYPE[k].label}</option>)}
        </select>
        <button type="button" className="yk-btn yk-ghost yk-small" onClick={addRoom}>＋ 室を追加</button>
      </div>

      {/* ── 機器 ── */}
      <h2>
        機器
        {f.equips.length > 0 && <span className="yk-cnt">　{c.eqCount}台／{fmt(c.massAll)} kg（機器表で確定 {c.fixedCount}台）</span>}
      </h2>
      <p className="yk-hint" style={{ marginBottom: 10 }}>1台登録すると、電力・ガス・給排水・発熱・換気に同時に反映されます。代表値が入るので、機器表が出たら上書きしてください。</p>
      {f.equips.length === 0 ? (
        <div className="yk-empty-row">機器がありません。下から追加すると積み上げ計算に入ります。</div>
      ) : (
        f.equips.map((e) => {
          const M = EQ[e.k];
          if (!M) return null;
          const util: string[] = [];
          if (M.w) util.push('給水');
          if (M.hw) util.push('給湯');
          if (M.d) util.push('排水');
          if (M.grease) util.push('グリース');
          if (M.hood) util.push('フード下');
          if (M.m) util.push(`${M.m}kg${M.legs ? `・${M.legs}脚 ${fmt((M.m * 9.8) / M.legs)}N/脚` : ''}`);
          return (
            <div key={e.id} className={`yk-row ${e.fixed ? 'yk-fixed' : 'yk-est'}`}>
              <div className="yk-head">
                <span className="yk-nm">{M.label}</span>
                <span className={`yk-mode ${e.fixed ? 'yk-fixed' : 'yk-est'}`}>{e.fixed ? '機器表' : '代表値'}</span>
                <button type="button" className="yk-x" title="削除" aria-label={`${M.label} を削除`} onClick={() => set({ equips: f.equips.filter((x) => x.id !== e.id) })}>×</button>
              </div>
              <div className="yk-fields">
                <span className="yk-fl">
                  室{' '}
                  <select value={e.room ?? ''} onChange={(ev) => setEq(e.id, { room: ev.target.value })}>
                    {f.rooms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </span>
                <span className="yk-fl">台数 <input type="number" min={1} step={1} defaultValue={e.n || 1} onChange={numIn((n) => setEq(e.id, { n: Math.max(1, n) }))} /></span>
                <span className="yk-fl">電力 <input type="number" min={0} step={0.1} defaultValue={eqE(e)} onChange={numIn((n) => editEqValue(e, 'e', n))} /> kW</span>
                <span className="yk-fl">ガス <input type="number" min={0} step={0.5} defaultValue={eqG(e)} onChange={numIn((n) => editEqValue(e, 'g', n))} /> kW</span>
              </div>
              {util.length > 0 && <p className="yk-util">{util.map((u) => <span key={u}>{u}</span>)}</p>}
            </div>
          );
        })
      )}
      <div className="yk-addrow">
        <select value={eqKey} aria-label="追加する機器" onChange={(e) => setNewEq(e.target.value)}>
          {usable.map((k) => <option key={k} value={k}>{EQ[k].label}</option>)}
        </select>
        <select value={eqRoom} aria-label="機器を置く室" onChange={(e) => setNewEqRoom(e.target.value)}>
          {f.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button type="button" className="yk-btn yk-ghost yk-small" onClick={addEq}>＋ 機器を追加</button>
      </div>

      {/* ── 突合せ ── */}
      <h2>必要諸元と建物側との突合せ</h2>
      <h3 className="yk-grp">意匠</h3>
      <SupCard
        title="収容人員"
        need={`${c.occ} 人`}
        brk={`従業者 ${f.staff || 0} 人 ＋ ${c.seats > 0 ? `客席・在室 ${c.seats} 人` : `主室面積÷3 = ${Math.floor(c.hallA / 3)} 人`}（消防規則1条の3）`}
        verdict={v.vOcc}
        vs={occMsg.join(' ')}
      />
      <h3 className="yk-grp">構造</h3>
      <SupCard
        title="機器の床荷重"
        need={c.worstRoom ? `${fmt(c.worstRoom.q)} N/m²（${c.worstRoom.r.name}）` : '機器未登録'}
        brk={
          c.worstRoom
            ? `室内機器 ${fmt(c.worstRoom.mass)} kg ÷ ${c.worstRoom.r.a} m²（平均）` +
              (c.maxLeg ? `　最大の脚部荷重 ${c.maxLeg.label} ${fmt(c.maxLeg.p)} N/脚（${c.maxLeg.m}kg・${c.maxLeg.legs}脚）` : '')
            : '機器を登録すると算定します'
        }
        verdict={v.vLoad}
        vs={
          !c.worstRoom
            ? '機器が未登録です。'
            : (c.worstRoom.q <= c.loadSet
                ? `設計積載荷重 ${c.loadSet.toLocaleString('ja-JP')} N/m² に対して平均では収まっています。`
                : `設計積載荷重 ${c.loadSet.toLocaleString('ja-JP')} N/m² を平均で超えています。構造への確認が必要です。`) +
              (c.maxLeg && c.maxLeg.p > 1000 ? ' 脚部の集中荷重が大きいため、床仕上げとスラブの局部検討が必要です。' : ' 脚部の集中荷重は別途確認してください。')
        }
      />
      <h3 className="yk-grp">設備</h3>
      <SupCard
        title="空調能力（主室）"
        need={`${c.acKW.toFixed(1)} kW（約${c.hp.toFixed(1)}馬力）`}
        brk={`照明・外皮 ${fmt(c.acLight)} ＋ 人体 ${fmt(c.acBody)} ＋ 外気 ${fmt(c.acOA)} ＋ 機器発熱 ${fmt(c.mainEqHeat)} W（対象 ${c.mainArea} m²）`}
        verdict={v.vAC}
        vs={
          p.ac === 'individual'
            ? '個別方式のため室外機の設置場所・荷重・騒音の確認が必要です。'
            : p.ac === 'none'
              ? '建物からの空調供給がありません。方式の検討が必要です。'
              : `ビル供給 ${p.accap || 0} kW に対して ${c.acKW <= (+p.accap || 0) ? '収まっています' : '不足。増設または補助空調の検討が必要です'}`
        }
      />
      <SupCard
        title="排気風量"
        need={`${fmt(c.totalEx)} m³/h`}
        brk={`${c.ventRows.map((x) => `${x.r.name} ${fmt(x.v)}`).join('／')} m³/h`}
        verdict={v.vEx}
        vs={p.ex === 'yes' ? '排気ルートが確保されています。ダクトサイズと圧損の検討へ。' : p.ex === 'talk' ? '排気ルートが未確定です。' : '排気ルートがありません。入居可否から再検討してください。'}
      />
      <SupCard
        title="ガス消費量"
        need={c.eqGasKW === 0 ? 'ガス機器なし' : `${c.gasM3.toFixed(2)} m³/h`}
        brk={c.eqGasKW === 0 ? '登録されたガス機器がありません' : `機器合計 ${c.eqGasKW.toFixed(1)} kW ／ 13A 45MJ/m³ 換算`}
        verdict={v.vGas}
        vs={
          c.eqGasKW === 0
            ? 'ガス引込は不要です。'
            : v.gasCap === 0
              ? 'ガスの引込がありません。新設協議が必要です。'
              : `${p.gas}A の目安供給量 ${v.gasCap} m³/h に対して ${c.gasM3 <= v.gasCap ? '収まっています' : '不足。口径アップの協議が必要です'}`
        }
      />
      <SupCard
        title="給水・給湯"
        need={`${fmt(c.waterDay)} L/日`}
        brk={`給水器具 ${c.nW} ／ 給湯器具 ${c.nHW} ／ 排水 ${c.nD} → 瞬時最大 約${c.peakLpm.toFixed(0)} L/min ／ 給湯 ${fmt(c.hotDay)} L/日`}
        verdict={v.vW}
        vs={`${p.wsup}A の目安流量 ${v.wCap} L/min に対して ${c.peakLpm <= v.wCap ? '収まっています' : '不足。口径アップの協議が必要です'}`}
      />
      {c.gtSize > 0 && (
        <SupCard
          title="グリストラップ"
          need={`呼び容量 ${c.gtSize} L 以上`}
          brk={`グリース排水器具 ${c.nGrease} 台（給水栓 ${c.greaseFix} 個）→ 流入 約${c.gtQ.toFixed(0)} L/min × 滞留3分 = ${Math.round(c.gtV)} L`}
          verdict={v.vGT}
          vs="標準品への切上げによる目安です。自治体条例と厨房の調理内容で変わるため、メーカー選定と保健所・下水道部局の確認が必要です。"
        />
      )}
      <h3 className="yk-grp">電気</h3>
      <SupCard
        title="必要電力"
        need={`${c.kva.toFixed(1)} kVA（約${Math.round(c.amp)}A）`}
        brk={`機器 ${c.eqKW.toFixed(1)} kW（${c.eqCount}台の積み上げ・機器表確定 ${v.cover}%）＋ 照明 ${fmt(c.vaLight)} VA（室別）＋ コンセント ${fmt(c.vaOutlet)} VA ＋ 空調 ${fmt(c.vaAC)} VA、需要率0.7`}
        verdict={v.vElec}
        vs={
          v.capKva === 0
            ? '建物側の分電盤容量が未入力です。'
            : `建物側 ${v.capKva} kVA に対して ${c.kva <= v.capKva ? '収まっています' : `約${(c.kva - v.capKva).toFixed(1)} kVA 不足。幹線の増設協議が必要です`}`
        }
      />

      {/* ── チェックリスト ── */}
      <h2>
        決めておく項目
        <span style={{ fontWeight: 400, fontSize: '.82rem', color: 'var(--flag)' }}>{left ? `　未決 ${left} 件` : '　すべて確認済み'}</span>
      </h2>
      <p className="yk-hint" style={{ marginBottom: 10 }}>業態に応じて出し分けています。チェックを付けると未決から外れます。</p>
      {CATS.map(([key, label]) => {
        const items = CHECKS.filter((x) => x[0] === key);
        if (!items.length) return null;
        const n = items.filter((x) => !checks[x[1]]).length;
        return (
          <React.Fragment key={key}>
            <h3 className="yk-grp">
              {label}
              <span className="yk-cnt">{n ? `未決 ${n} / ${items.length} 件` : `確認済 ${items.length} 件`}</span>
            </h3>
            {items.map((x) => {
              const on = !!checks[x[1]];
              return (
                <label key={x[1]} className={`yk-chk${on ? ' yk-done' : ''}`}>
                  <input type="checkbox" checked={on} onChange={(e) => onCheck(x[1], e.target.checked)} />
                  <span className="yk-body"><b>{x[2]}</b><small>{x[3]}</small></span>
                </label>
              );
            })}
          </React.Fragment>
        );
      })}

      <div className="yk-panel" style={{ marginTop: 16 }}>
        <SaveBar bare id="f-memo" memo={memo} onMemo={setMemo} placeholder="ビルオーナーとの協議内容、機器表の入手状況など。" onSave={() => onSave(draft, memo)} />
      </div>
    </section>
  );
}
