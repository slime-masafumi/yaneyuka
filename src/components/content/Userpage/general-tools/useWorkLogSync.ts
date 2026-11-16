'use client';
/**
 * 業務管理の端末間同期。
 *
 * これまで工数はこのブラウザの localStorage にしか無く、職場と自宅で別々の記録になっていた。
 * 業務の記録としては致命的なので、ログイン中は Firestore にも置く。
 *   users/{uid}/workLog/settings   … 案件の一覧・目標時間単価
 *   users/{uid}/workLog/m-YYYY-MM  … その月の日報（1か月 1 文書）
 * localStorage はそのまま残す（ログインしていないときと、オフラインの控え）。
 *
 * ■ 行（エントリ）単位で合わせる（2026-11-16）
 * 以前は日付単位で合わせていて、
 *   - 2 台目の端末で、クラウドに同じ日付があると、その日の手元の行が捨てられた
 *   - 書き込みの 1 秒待ちの間にクラウドの更新が届くと、打ちかけの入力が上書きされた
 * 今は月の文書の entries に「日付|行 id → 行」を持ち、行ごとに更新時刻（updatedAt）を付ける。
 *   - 和集合をとり、同じ行は updatedAt の新しい方を残す
 *   - 消した行は deleted: true の墓標として残す（別の端末の古い行で生き返らせない）
 *   - クラウドの更新が届いたら、先に手元の未送信の変更に時刻を付けてから合わせる（打ちかけを捨てない）
 *   - 書くのは変わった行だけ（setDoc の merge で行ごと。別の端末が同じ月の別の行を書いても消し合わない）
 * 旧形式（days だけの文書）は、更新時刻 0 の行として読み、次の書き込みで entries に移す。
 * days も書き続ける（更新前のコードが開いたままのタブでも中身が見えるように）。
 *
 * 行ごとの時刻と墓標は、このブラウザにも控える（localStorage 'tracker_sync_rows:{uid}'）。
 * 控えが無い端末（初めてこの端末で同期する）の手元の行は時刻 0 で扱う＝クラウドに同じ行があればクラウドが勝ち、
 * クラウドに無い行は足される（手元の記録を捨てない・古い控えで新しい記録を上書きしない）。
 */
import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { type DailyRecords, type WorkEntry, type WorkProject } from '@/lib/workLog';

type Settings = { projects: WorkProject[]; targetRate: number };

/** クラウド・控えに置く 1 行 */
export type StoredRow = {
  date: string;
  id: string;
  projectId: string;
  description: string;
  hours: number | '';
  phase: string;
  /** その日の中での並び（別の端末で足された行を並べるときに使う） */
  seq: number;
  /** 最後に変えた時刻（ms）。0 は「いつか分からない」（旧形式・初めての端末） */
  updatedAt: number;
  deleted: boolean;
};
export type RowMap = Record<string, StoredRow>;

export const rowKey = (date: string, id: string) => `${date}|${id}`;
const monthOfKey = (key: string) => key.slice(0, 7);

/** 保存する行か（案件・内容・時間のどれかが入っている） */
const isFilled = (e: WorkEntry) => !!(e.projectId || e.description || (e.hours !== '' && e.hours != null));

const content = (r: { projectId?: string; description?: string; hours?: number | '' | null; phase?: string | null }) =>
  JSON.stringify([r.projectId || '', r.description || '', r.hours === '' || r.hours == null ? '' : Number(r.hours), r.phase || '']);

const sameRow = (a: StoredRow, b: StoredRow) => a.deleted === b.deleted && a.updatedAt === b.updatedAt && content(a) === content(b);

function toRow(date: string, e: WorkEntry, seq: number, updatedAt: number): StoredRow {
  return {
    date,
    id: e.id,
    projectId: e.projectId || '',
    description: e.description || '',
    hours: e.hours === '' || e.hours == null ? '' : Number(e.hours),
    phase: e.phase || '',
    seq,
    updatedAt,
    deleted: false,
  };
}

function toEntry(r: StoredRow): WorkEntry {
  return { id: r.id, projectId: r.projectId, description: r.description, hours: r.hours, ...(r.phase ? { phase: r.phase } : {}) };
}

/**
 * 手元の画面の記録を控え（known）に取り込む。変わった行・新しい行に時刻 now を付け、消えた行は墓標にする。
 * firstTime（この端末の控えが無い）なら、新しい行の時刻は 0。
 * 返り値: 何か変わったか
 */
export function absorbLocal(known: RowMap, records: DailyRecords, now: number, firstTime: boolean): boolean {
  let changed = false;
  const seen = new Set<string>();
  for (const [date, entries] of Object.entries(records)) {
    if (!Array.isArray(entries)) continue;
    entries.forEach((e, i) => {
      if (!e || !e.id || !isFilled(e)) return;
      const k = rowKey(date, e.id);
      seen.add(k);
      const cur = known[k];
      if (!cur) {
        known[k] = toRow(date, e, i, firstTime ? 0 : now);
        changed = true;
      } else if (cur.deleted || content(cur) !== content(e)) {
        known[k] = toRow(date, e, i, now);
        changed = true;
      } else if (cur.seq !== i) {
        // 並びだけの違いは時刻を進めない（書く必要もない）
        known[k] = { ...cur, seq: i };
      }
    });
  }
  if (!firstTime) {
    for (const [k, r] of Object.entries(known)) {
      if (r.deleted || seen.has(k)) continue;
      known[k] = { ...r, projectId: '', description: '', hours: '', phase: '', deleted: true, updatedAt: now };
      changed = true;
    }
  }
  return changed;
}

/** クラウドの行を控えに合わせる。同じ行は updatedAt の新しい方（同じならクラウド）。返り値: 控えが変わったか */
export function mergeRemote(known: RowMap, remote: RowMap): boolean {
  let changed = false;
  for (const [k, r] of Object.entries(remote)) {
    const cur = known[k];
    if (!cur || r.updatedAt > cur.updatedAt || (r.updatedAt === cur.updatedAt && !sameRow(r, cur))) {
      known[k] = { ...r };
      changed = true;
    }
  }
  return changed;
}

/**
 * 控えから画面の記録を作る。手元の並び・まだ空の行（入力前に足した行）はそのまま残し、
 * 別の端末で足された行は seq の順で後ろに足す。中身が同じ行は手元のオブジェクトをそのまま使う。
 */
export function buildRecords(known: RowMap, local: DailyRecords): DailyRecords {
  const out: DailyRecords = {};
  const used = new Set<string>();
  for (const [date, entries] of Object.entries(local)) {
    if (!Array.isArray(entries)) continue;
    const list: WorkEntry[] = [];
    for (const e of entries) {
      if (!e) continue;
      if (!e.id) {
        list.push(e);
        continue;
      }
      const k = rowKey(date, e.id);
      const r = known[k];
      if (!r) {
        // 控えに無い＝空の行（保存しない行）。画面からは消さない
        if (!isFilled(e)) list.push(e);
        continue;
      }
      used.add(k);
      if (r.deleted) continue;
      list.push(content(r) === content(e) ? e : toEntry(r));
    }
    out[date] = list;
  }
  const extra: Record<string, StoredRow[]> = {};
  for (const [k, r] of Object.entries(known)) {
    if (r.deleted || used.has(k)) continue;
    (extra[r.date] ??= []).push(r);
  }
  for (const [date, rows] of Object.entries(extra)) {
    rows.sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
    out[date] = [...(out[date] ?? []), ...rows.map(toEntry)];
  }
  // 手元に空の日（行が全部消えた日）が残るだけなら、元の形に合わせて落とす
  for (const date of Object.keys(out)) {
    if (!out[date].length && !(date in local && local[date].length === 0)) delete out[date];
  }
  return out;
}

/** クラウドの文書（月ごと）を行の表にする。旧形式（days だけ）は時刻 0 の行として読む */
export function parseMonthDoc(data: { days?: DailyRecords; entries?: Record<string, Partial<StoredRow>> }): { rows: RowMap; legacy: boolean } {
  const rows: RowMap = {};
  if (data.entries && typeof data.entries === 'object') {
    for (const [k, v] of Object.entries(data.entries)) {
      if (!v || typeof v !== 'object' || !v.date || !v.id) continue;
      rows[k] = {
        date: v.date,
        id: v.id,
        projectId: v.projectId || '',
        description: v.description || '',
        hours: v.hours === '' || v.hours == null ? '' : Number(v.hours),
        phase: v.phase || '',
        seq: Number(v.seq) || 0,
        updatedAt: Number(v.updatedAt) || 0,
        deleted: !!v.deleted,
      };
    }
    return { rows, legacy: false };
  }
  for (const [date, entries] of Object.entries(data.days ?? {})) {
    if (!Array.isArray(entries)) continue;
    entries.forEach((e, i) => {
      if (e && e.id && isFilled(e)) rows[rowKey(date, e.id)] = toRow(date, e, i, 0);
    });
  }
  return { rows, legacy: true };
}

/** 書くべき行（控えとクラウドで違う行、旧形式の月の行）を月ごとに */
export function pendingWrites(known: RowMap, remote: RowMap, legacyMonths: Set<string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, r] of Object.entries(known)) {
    const m = monthOfKey(k);
    const rr = remote[k];
    if (!rr || !sameRow(r, rr) || legacyMonths.has(m)) (out[m] ??= []).push(k);
  }
  return out;
}

/**
 * 書くべき行を batch に積む（月の文書へ行ごとの merge）。触った日の見える行は days にも写す
 * （更新前のコードが開いたままのタブでも中身が見えるように）。
 * 積んだ行はクラウドの控え（remote）にも入れる（自分の書き込みの戻りで二度書かない）。返り値: 積んだ文書の数
 */
function stageRows(
  batch: ReturnType<typeof writeBatch>,
  col: ReturnType<typeof collection>,
  known: RowMap,
  remote: RowMap,
  legacyMonths: Set<string>,
): number {
  const writes = pendingWrites(known, remote, legacyMonths);
  let n = 0;
  for (const [m, keys] of Object.entries(writes)) {
    const entries: Record<string, StoredRow> = {};
    const dates = new Set<string>();
    for (const k of keys) {
      entries[k] = known[k];
      dates.add(known[k].date);
    }
    const days: Record<string, WorkEntry[]> = {};
    for (const d of dates) {
      days[d] = Object.values(known)
        .filter((r) => r.date === d && !r.deleted)
        .sort((a, b) => a.seq - b.seq)
        .map(toEntry);
    }
    batch.set(doc(col, `m-${m}`), { entries, days }, { merge: true });
    for (const k of keys) remote[k] = { ...known[k] };
    legacyMonths.delete(m);
    n++;
  }
  return n;
}

const metaKey = (uid: string) => `tracker_sync_rows:${uid}`;
function readMeta(uid: string): RowMap | null {
  try {
    const raw = localStorage.getItem(metaKey(uid));
    const d = raw ? (JSON.parse(raw) as RowMap) : null;
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}
function writeMeta(uid: string, rows: RowMap) {
  try {
    localStorage.setItem(metaKey(uid), JSON.stringify(rows));
  } catch {
    /* 保存できない環境では、開いている間だけ持つ（次に開いたときは初めての端末として合わせる） */
  }
}

export function useWorkLogSync(
  uid: string | undefined,
  state: { records: DailyRecords; settings: Settings },
  apply: (next: { records?: DailyRecords; settings?: Settings }) => void
): 'local' | 'syncing' | 'synced' | 'error' {
  const [status, setStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const stateRef = useRef(state);
  stateRef.current = state;
  const applyRef = useRef(apply);
  applyRef.current = apply;

  // 行の控え（手元とクラウドを合わせた結果。墓標を含む）・最後に見たクラウドの行・旧形式の月
  const known = useRef<RowMap>({});
  const firstTime = useRef(true);
  const remote = useRef<RowMap>({});
  const legacy = useRef<Set<string>>(new Set());
  // 最初のクラウドの読み込みが済んだか（済むまでは書かない）
  const ready = useRef(false);
  // 設定: 最後にクラウドと一致していた中身
  const syncedSettings = useRef<string | null>(null);

  useEffect(() => {
    ready.current = false;
    remote.current = {};
    legacy.current = new Set();
    syncedSettings.current = null;
    if (!uid) {
      known.current = {};
      setStatus('local');
      return;
    }
    const meta = readMeta(uid);
    known.current = meta ?? {};
    firstTime.current = !meta;
    setStatus('syncing');
    const col = collection(db, 'users', uid, 'workLog');

    /** 変わった行を月ごとに書く（行ごとの merge） */
    const flushRows = async () => {
      const batch = writeBatch(db);
      if (!stageRows(batch, col, known.current, remote.current, legacy.current)) return;
      try {
        await batch.commit();
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    };

    /** 手元の未送信の変更に時刻を付けて控えへ（クラウドの更新と合わせる前に必ず呼ぶ） */
    const absorb = () => {
      const changed = absorbLocal(known.current, stateRef.current.records, Date.now(), firstTime.current);
      firstTime.current = false;
      if (changed) writeMeta(uid, known.current);
      return changed;
    };

    const unsub = onSnapshot(
      col,
      (snap) => {
        let cloudSettings: Settings | null = null;
        const rows: RowMap = {};
        const legacyMonths = new Set<string>();
        snap.docs.forEach((d) => {
          if (d.id === 'settings') cloudSettings = d.data() as Settings;
          else if (d.id.startsWith('m-')) {
            const parsed = parseMonthDoc(d.data() as { days?: DailyRecords; entries?: Record<string, Partial<StoredRow>> });
            Object.assign(rows, parsed.rows);
            if (parsed.legacy && Object.keys(parsed.rows).length) legacyMonths.add(d.id.slice(2));
          }
        });
        remote.current = rows;
        legacy.current = legacyMonths;

        // 1) 打ちかけの入力を先に控えへ（時刻 now が付くので、届いた古い更新に負けない）
        absorb();
        // 2) クラウドの行を合わせる
        if (mergeRemote(known.current, rows)) writeMeta(uid, known.current);
        // 3) 画面へ（変わったときだけ）
        const local = stateRef.current.records;
        const next = buildRecords(known.current, local);
        const recordsChanged = JSON.stringify(next) !== JSON.stringify(local);

        // 設定（案件の一覧・目標単価）
        //   この端末で初めて合わせるとき … クラウドを正とし、手元にしか無い案件を足す
        //   以後、手元に未送信の変更があるとき … 手元を正とし、クラウドにしか無い案件を足す（打ちかけを捨てない）
        //   未送信の変更が無いとき … クラウドのとおり
        const localSettings = stateRef.current.settings;
        const localJson = JSON.stringify(localSettings);
        let nextSettings: Settings | undefined;
        if (cloudSettings) {
          const cs = cloudSettings as Settings;
          const cloudProjects = Array.isArray(cs.projects) ? cs.projects : [];
          const cloudJson = JSON.stringify(cs);
          const union = (base: WorkProject[], add: WorkProject[]) => [...base, ...add.filter((p) => !base.some((b) => b.id === p.id))];
          let merged: Settings;
          if (syncedSettings.current === null) {
            merged = { projects: union(cloudProjects, localSettings.projects), targetRate: cs.targetRate > 0 ? cs.targetRate : localSettings.targetRate };
          } else if (localJson !== syncedSettings.current) {
            merged = { projects: union(localSettings.projects, cloudProjects), targetRate: localSettings.targetRate || cs.targetRate };
          } else {
            merged = cs;
          }
          if (JSON.stringify(merged) !== localJson) nextSettings = merged;
          // クラウドと違えば下で書く（synced はクラウドの中身にしておく）
          syncedSettings.current = cloudJson;
        } else if (syncedSettings.current === null) {
          syncedSettings.current = '';
        }

        if (recordsChanged || nextSettings) {
          // 画面が描き直される前に次の通知が来ても、消えた行を「手元にまだある」と読み違えないように先に入れる
          stateRef.current = { records: recordsChanged ? next : local, settings: nextSettings ?? localSettings };
          applyRef.current({ records: recordsChanged ? next : undefined, settings: nextSettings });
        }

        const wasReady = ready.current;
        ready.current = true;
        void flushRows();
        // 設定の書き込み（初回にクラウドが空なら手元を上げる＝移行。手元を優先した合わせ直しもここで上がる）
        const s = stateRef.current.settings;
        const sJson = JSON.stringify(s);
        if (sJson !== syncedSettings.current && (s.projects.length || cloudSettings)) {
          syncedSettings.current = sJson;
          setDoc(doc(col, 'settings'), s).catch(() => setStatus('error'));
        }
        if (!wasReady) setStatus('synced');
      },
      () => setStatus('error')
    );
    return () => {
      // 抜ける前に、待っている変更を控えへ（次に開いたときに時刻付きで上がる）
      try {
        if (ready.current) absorb();
      } catch {
        /* 控えに書けなくても、次に開いたときに初めての端末として合わせる */
      }
      unsub();
    };
  }, [uid]);

  // 手元で変えたら、変わった行と設定だけを書く（打鍵のたびに書かないよう 1 秒待つ）
  useEffect(() => {
    if (!uid || !ready.current) return;
    const t = setTimeout(async () => {
      if (!ready.current) return;
      const col = collection(db, 'users', uid, 'workLog');
      const changed = absorbLocal(known.current, stateRef.current.records, Date.now(), false);
      firstTime.current = false;
      if (changed) writeMeta(uid, known.current);
      const batch = writeBatch(db);
      let n = stageRows(batch, col, known.current, remote.current, legacy.current);
      const s = JSON.stringify(stateRef.current.settings);
      if (s !== syncedSettings.current) {
        batch.set(doc(col, 'settings'), stateRef.current.settings);
        syncedSettings.current = s;
        n++;
      }
      if (!n) return;
      try {
        await batch.commit();
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [uid, state.records, state.settings]);

  return status;
}
