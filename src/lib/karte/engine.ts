/**
 * 物件カルテの計算エンジンと保存層。
 * UI（src/components/karte/）から分離した純粋関数群。
 *
 * 既知の粗さ（指示書 §5 より。順に潰す）:
 *  1. 機器の室内発熱を電力の一律 50% としている
 *  2. 給水の瞬時最大が簡便式 12√n。器具給水負荷単位の本式に置き換えるべき
 *  3. 照明は室別 W/m² まで。器具レベルの積み上げではない
 *  4. コンセントは面積 × 10VA/m² 固定
 */
import { ROUGH_LABEL } from './glass';
import {
  AC_LABEL,
  BIZ,
  DEMO_PROJECT,
  DEP_UNIT,
  EQ,
  EX_LABEL,
  GAS_CAP,
  ROOM_TYPE,
  WSUP_CAP,
  checksFor,
  type BizKey,
  type CatKey,
  type ItemDef,
  type Project,
  type RoomTypeKey,
  type ToolKey,
  itemKey,
} from './masters';
import type { Roughness } from './glass';

/* ══════ 型 ══════ */
export type Room = {
  id: string;
  t: RoomTypeKey;
  name: string;
  /** 面積 m² */
  a: number;
  /** 天井高 m */
  ch: number;
  /** 照明 W/m² */
  lw: number;
  /** 人員（seatable の室のみ） */
  seat?: number;
  /** フード種別 "40" | "30" | "20"（火気使用室のみ） */
  hood?: string;
};

export type Equip = {
  id: string;
  /** EQ のキー */
  k: string;
  room: string | null;
  n: number;
  /** null なら代表値 */
  e: number | null;
  g: number | null;
  /** 機器表で確定した値か */
  fixed: boolean;
};

export type Fnb = {
  name: string;
  type: BizKey;
  hours: number;
  staff: number;
  floor: number;
  /** 床の設計積載荷重 N/m² */
  load: number;
  rooms: Room[];
  equips: Equip[];
};

export type Study = {
  id: string;
  projId: string;
  tool: ToolKey;
  title: string;
  basis: string;
  /** 保存時の物件条件スナップショット */
  deps: Record<string, string | number>;
  inputs: Record<string, string>;
  result: string;
  ok: boolean;
  detail: string;
  memo: string;
  /** ISO 日時 */
  at: string;
};

/** 保存前の検討（id / projId / memo / at が付く前） */
export type StudyDraft = Omit<Study, 'id' | 'projId' | 'memo' | 'at'>;

export type View = 'chart' | 'design' | 'struct' | 'mep' | 'elec' | 'glass' | 'pipe' | 'fnb';
export type TabView = Extract<View, 'chart' | CatKey>;

export type DB = {
  projects: Project[];
  studies: Study[];
  fnb: Record<string, Fnb>;
  fnbChecks: Record<string, Record<string, boolean>>;
  itemChecks: Record<string, Record<string, boolean>>;
  backTo: TabView;
  current: string;
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export function defaultDb(): DB {
  return {
    projects: [{ ...DEMO_PROJECT }],
    studies: [],
    fnb: {},
    fnbChecks: {},
    itemChecks: {},
    backTo: 'chart',
    current: DEMO_PROJECT.id,
  };
}

/* ══════ 保存層 ══════ */
const STORAGE_KEY = 'yaneyuka.karte';

/** localStorage が使えない環境（プライベートモード等）ではメモリに退避する */
export const Store = (() => {
  let mem: DB | null = null;
  let ok = true;
  const probe = () => {
    if (typeof window === 'undefined') return false;
    try {
      window.localStorage.setItem('__t', '1');
      window.localStorage.removeItem('__t');
      return true;
    } catch {
      return false;
    }
  };
  return {
    load(): DB | null {
      ok = probe();
      if (!ok) return mem;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw) as Partial<DB>;
        if (!d || !Array.isArray(d.projects) || !d.projects.length) return null;
        const base = defaultDb();
        return {
          projects: d.projects,
          studies: Array.isArray(d.studies) ? d.studies : [],
          fnb: d.fnb || {},
          fnbChecks: d.fnbChecks || {},
          itemChecks: d.itemChecks || {},
          backTo: d.backTo || base.backTo,
          current: d.projects.some((p) => p.id === d.current) ? (d.current as string) : d.projects[0].id,
        };
      } catch {
        return null;
      }
    },
    save(d: DB) {
      mem = d;
      if (!ok) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      } catch {
        /* 容量超過などは黙って諦める（メモリには残る） */
      }
    },
    get persistent() {
      return ok;
    },
  };
})();

/* ══════ 内装：データ ══════ */
export function presetOf(type: BizKey): { rooms: Room[]; equips: Equip[] } {
  const B = BIZ[type];
  const rooms: Room[] = B.rooms.map((r) => {
    const T = ROOM_TYPE[r[0]];
    return {
      id: uid(),
      t: r[0],
      name: r[1],
      a: r[2],
      ch: T.ch,
      lw: T.lw,
      seat: T.seatable ? r[3] || 0 : undefined,
      hood: T.fire ? '20' : undefined,
    };
  });
  const equips: Equip[] = B.equips.map((k) => {
    const want = EQ[k].cat;
    let r = rooms.find((x) => x.t === want);
    if (!r) r = rooms.find((x) => ROOM_TYPE[x.t].fire) || rooms[0];
    if (k === 'lav' || k === 'toiletw') r = rooms.find((x) => x.t === 'toilet') || r;
    return { id: uid(), k, room: r ? r.id : null, n: 1, e: null, g: null, fixed: false };
  });
  return { rooms, equips };
}

export function defaultFnb(): Fnb {
  const pre = presetOf('cafe');
  return { name: '1F テナントA', type: 'cafe', hours: 12, staff: 3, floor: 1, load: 2900, rooms: pre.rooms, equips: pre.equips };
}

export const eqE = (e: Equip) => (e.e !== null && e.e !== undefined && !Number.isNaN(e.e) ? +e.e : EQ[e.k].e || 0);
export const eqG = (e: Equip) => (e.g !== null && e.g !== undefined && !Number.isNaN(e.g) ? +e.g : EQ[e.k].g || 0);

const K_GAS = 0.93; // m³/kWh（S45建告1826）
const HEAT_13A = 45; // MJ/m³（都市ガス13A 総発熱量）
const HOOD_N: Record<string, number> = { '40': 40, '30': 30, '20': 20 };
const GT_SIZES = [40, 50, 65, 80, 100, 150, 200, 300, 400, 500];
const OUTLET_VA = 10; // 一般コンセント VA/m²

export type VentRow = { r: Room; v: number; detail: string; basis: string };
export type LegRow = { label: string; p: number; legs: number; m: number };

export type FnbCalc = ReturnType<typeof fnbCalc>;

/* ══════ 内装：積み上げ計算 ══════ */
export function fnbCalc(p: Project, f: Fnb) {
  const t = BIZ[f.type];
  const hours = Math.max(1, +f.hours || 12);
  const roomById = (id: string | null) => f.rooms.find((r) => r.id === id);
  const eqOf = (rid: string) => f.equips.filter((e) => e.room === rid);

  /* 室ごとの換気と照明 */
  const ventRows: VentRow[] = [];
  let totalEx = 0;
  let vaLight = 0;
  let vaOutlet = 0;
  f.rooms.forEach((r) => {
    const T = ROOM_TYPE[r.t];
    const a = +r.a || 0;
    const vol = a * (+r.ch || T.ch);
    const byAch = vol * T.ach;
    let byPer = 0;
    let byLaw = 0;
    let detail = '';
    if (T.per && r.seat) byPer = (r.seat ?? 0) * T.per;
    if (T.fire) {
      const N = HOOD_N[r.hood || '20'];
      const Q = eqOf(r.id).reduce((s, e) => s + eqG(e) * (e.n || 1), 0);
      byLaw = N * K_GAS * Q;
      detail = `法令 ${fmt(byLaw)}（${N}KQ、ガス機器 ${Q.toFixed(1)}kW）／ ${T.ach}回/h ${fmt(byAch)}`;
    } else if (byPer) {
      detail = `人員 ${fmt(byPer)}（${r.seat || 0}人×${T.per}）／ ${T.ach}回/h ${fmt(byAch)}`;
    } else {
      detail = `${T.ach}回/h × ${vol.toFixed(1)}m³`;
    }
    const v = Math.max(byAch, byPer, byLaw);
    totalEx += v;
    vaLight += a * (r.lw !== undefined ? +r.lw : T.lw);
    vaOutlet += a * OUTLET_VA;
    ventRows.push({ r, v, detail, basis: T.basis });
  });

  /* 機器の積み上げ */
  let eqKW = 0;
  let eqGasKW = 0;
  let nW = 0;
  let nHW = 0;
  let nD = 0;
  let nGrease = 0;
  let eqCount = 0;
  let fixedCount = 0;
  let massAll = 0;
  let greaseFix = 0;
  const legRows: LegRow[] = [];
  f.equips.forEach((e) => {
    const n = +e.n || 1;
    const M = EQ[e.k];
    if (!M) return;
    eqCount += n;
    if (e.fixed) fixedCount += n;
    eqKW += eqE(e) * n;
    eqGasKW += eqG(e) * n;
    nW += (M.w || 0) * n;
    nHW += (M.hw || 0) * n;
    nD += (M.d || 0) * n;
    nGrease += (M.grease || 0) * n;
    if (M.grease) greaseFix += ((M.w || 0) + (M.hw || 0)) * n;
    massAll += (M.m || 0) * n;
    if (M.m && M.legs) legRows.push({ label: M.label, p: (M.m * 9.8) / M.legs, legs: M.legs, m: M.m });
  });
  legRows.sort((a, b) => b.p - a.p);
  const maxLeg = legRows.length ? legRows[0] : null;

  /* 室別の質量 */
  const roomMass: Record<string, number> = {};
  f.equips.forEach((e) => {
    if (!e.room || !EQ[e.k]) return;
    roomMass[e.room] = (roomMass[e.room] || 0) + (EQ[e.k].m || 0) * (+e.n || 1);
  });
  let worstRoom: { r: Room; q: number; mass: number } | null = null;
  f.rooms.forEach((r) => {
    const a = +r.a || 0;
    if (!a) return;
    const q = ((roomMass[r.id] || 0) * 9.8) / a;
    if (!worstRoom || q > worstRoom.q) worstRoom = { r, q, mass: roomMass[r.id] || 0 };
  });

  const allArea = f.rooms.reduce((s, r) => s + (+r.a || 0), 0);
  const seats = f.rooms.reduce((s, r) => s + (r.seat ?? 0), 0);

  /* 空調：主室（居室）を対象 */
  const mainRooms = f.rooms.filter((r) => ROOM_TYPE[r.t].per);
  const mainArea = mainRooms.reduce((s, r) => s + (+r.a || 0), 0);
  const mainVent = ventRows.filter((v) => ROOM_TYPE[v.r.t].per).reduce((s, v) => s + v.v, 0);
  const mainEqHeat = f.equips
    .filter((e) => {
      const r = roomById(e.room);
      return r && ROOM_TYPE[r.t].per;
    })
    .reduce((s, e) => s + eqE(e) * (e.n || 1) * 1000 * 0.5, 0);
  const mainLight = mainRooms.reduce((s, r) => s + (+r.a || 0) * (r.lw !== undefined ? +r.lw : ROOM_TYPE[r.t].lw), 0);
  const acLight = mainArea * t.heat + mainLight;
  const acBody = seats * 130;
  const acOA = mainVent * 11;
  const acW = acLight + acBody + acOA + mainEqHeat;
  const acKW = acW / 1000;
  const hp = acKW / 2.8;

  const vaEq = eqKW * 1000;
  const vaAC = (acKW / 3.0) * 1000;
  const kva = ((vaLight + vaOutlet + vaEq + vaAC) * 0.7) / 1000;
  const amp = (kva * 1000) / 200;

  /* 給排水 */
  const fixtures = nW + nHW;
  const peakLpm = fixtures > 0 ? 12 * Math.sqrt(fixtures) : 0;
  const waterDay = (seats > 0 ? seats : Math.floor(allArea / 3)) * t.water;
  const hotDay = waterDay * 0.4;
  const avgLpm = waterDay / hours / 60;

  /* グリストラップ：グリース系器具の同時使用流量 × 滞留3分 */
  const gtQ = greaseFix > 0 ? 12 * Math.sqrt(greaseFix) : 0;
  const gtV = gtQ * 3;
  const gtSize = gtV > 0 ? GT_SIZES.find((v) => v >= gtV) || GT_SIZES[GT_SIZES.length - 1] : 0;

  const gasM3 = (eqGasKW * 3.6) / HEAT_13A;

  /* 構造・意匠 */
  const loadSet = +f.load || 2900;
  const hallA = mainArea;
  const occ = (+f.staff || 0) + (seats > 0 ? seats : Math.floor(hallA / 3));
  const hasFire = f.equips.some((e) => eqG(e) > 0 || !!EQ[e.k]?.hood);

  return {
    p, f, t, hours, ventRows, totalEx, allArea, seats,
    eqKW, eqGasKW, eqCount, fixedCount, nW, nHW, nD, nGrease, fixtures, greaseFix,
    massAll, legRows, maxLeg, worstRoom: worstRoom as { r: Room; q: number; mass: number } | null, loadSet,
    vaLight, vaOutlet, vaEq, vaAC, kva, amp,
    acLight, acBody, acOA, mainEqHeat, acKW, hp, mainArea,
    waterDay, hotDay, avgLpm, peakLpm, gtQ, gtV, gtSize, gasM3, occ, hasFire, hallA,
  };
}

export type Verdict = 'ok' | 'talk' | 'ng';

export function fnbVerdicts(c: FnbCalc) {
  const { p, f } = c;
  const vOcc: Verdict = (+f.floor || 1) < 0 ? 'talk' : 'ok';
  const vLeg: Verdict = !c.maxLeg ? 'talk' : c.maxLeg.p <= 1000 ? 'ok' : c.maxLeg.p <= 2000 ? 'talk' : 'ng';
  const vRoomLoad: Verdict = !c.worstRoom
    ? 'talk'
    : c.worstRoom.q <= c.loadSet * 0.5
      ? 'ok'
      : c.worstRoom.q <= c.loadSet
        ? 'talk'
        : 'ng';
  const vLoad = (['ng', 'talk', 'ok'] as Verdict[]).find((x) => [vLeg, vRoomLoad].includes(x)) as Verdict;
  const capKva = +p.cap || 0;
  const vElec: Verdict = capKva === 0 ? 'ng' : c.kva <= capKva * 0.85 ? 'ok' : c.kva <= capKva ? 'talk' : 'ng';
  const vAC: Verdict = p.ac === 'none' ? 'ng' : p.ac === 'individual' ? 'talk' : c.acKW <= (+p.accap || 0) ? 'ok' : 'ng';
  const vEx: Verdict = p.ex === 'yes' ? 'ok' : p.ex === 'talk' ? 'talk' : 'ng';
  const gasCap = GAS_CAP[p.gas] || 0;
  const vGas: Verdict = c.eqGasKW === 0 ? 'ok' : gasCap === 0 ? 'ng' : c.gasM3 <= gasCap * 0.8 ? 'ok' : c.gasM3 <= gasCap ? 'talk' : 'ng';
  const wCap = WSUP_CAP[p.wsup] || 30;
  const vW: Verdict = c.peakLpm <= wCap * 0.8 ? 'ok' : c.peakLpm <= wCap ? 'talk' : 'ng';
  const vGT: Verdict = c.gtSize === 0 ? 'ok' : 'talk';
  const cover = c.eqCount ? Math.round((c.fixedCount / c.eqCount) * 100) : 0;
  const all: Verdict[] = [vOcc, vLoad, vElec, vAC, vEx, vGas, vW];
  return { vOcc, vLeg, vRoomLoad, vLoad, vElec, vAC, vEx, vGas, vW, vGT, capKva, gasCap, wCap, cover, all };
}

/** 未決チェック数 */
export function fnbOpenChecks(f: Fnb, done: Record<string, boolean>) {
  return checksFor(f.type).filter((x) => !done[x[1]]).length;
}

/* ══════ 変更追従 ══════ */
export type Diff = { k: string; was: string | number; now: string | number };

/** 保存時のスナップショットと現在の物件条件を突き合わせ、差があれば返す */
export function staleOf(s: Study, p: Project): Diff[] {
  const diffs: Diff[] = [];
  for (const k of Object.keys(s.deps)) {
    const now = (p as unknown as Record<string, string | number>)[k];
    if (String(s.deps[k]) !== String(now)) diffs.push({ k, was: s.deps[k], now });
  }
  return diffs;
}

export function depShow(k: string, val: string | number): string {
  if (k === 'rough') return ROUGH_LABEL[String(val) as Roughness] ?? String(val);
  if (k === 'ac') return AC_LABEL[val as keyof typeof AC_LABEL] ?? String(val);
  if (k === 'ex') return EX_LABEL[val as keyof typeof EX_LABEL] ?? String(val);
  if (k === 'gas' && String(val) === '0') return '引込なし';
  return `${val}${DEP_UNIT[k] ?? ''}`;
}

/* ══════ 検討項目の状態 ══════ */
export type ItemStatus = 'na' | 'done' | 'todo' | 'warn';

export function itemStatus(it: ItemDef, studies: Study[], p: Project, checks: Record<string, boolean>): ItemStatus {
  if (it.na && it.na(p)) return 'na';
  const manual = !!checks[itemKey(it)];
  if (!it.tool) return manual ? 'done' : 'todo';
  const st = studies.find((s) => s.tool === it.tool);
  if (!st) return manual ? 'done' : 'todo';
  return staleOf(st, p).length ? 'warn' : st.ok ? 'done' : 'warn';
}

export const fmt = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('ja-JP') : '—');

export function stamp(iso: string): string {
  const d = new Date(iso);
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}
