'use client';
/**
 * 建材ページの右列「案件で使う建材」(2026-11-16)。
 *
 * それまでは「＋ 使う建材に追加」が物件カルテの案件 id ごとに小分類の名前を localStorage
 * ('yy-case-materials')へ書くだけで、どこからも読まれていなかった。
 * いま:
 *   - 物件は共通の台帳(src/lib/projectRegistry.ts)から ProjectPicker で選ぶ。名前は台帳のもの
 *   - 1 件 = 小分類 + メーカー + 品番・色(自由記入) + メモ。案件(台帳の id)ごとに控える
 *   - 選んだ案件の一覧をこの列に出し、CSV(仕上表の下書き用)で書き出せる
 * 保存先:
 *   このブラウザ … localStorage 'yy-case-materials-v2'(未ログインでも使える)
 *   ログイン中   … Firestore users/{uid}/caseMaterials/{projectId} にも書く(別の端末でも同じ一覧)
 * 旧 'yy-case-materials'(カルテの案件 id → 小分類)は、台帳でつながった案件へ 1 回だけ移す(メーカー未定の行として)。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useProjectRegistry, type RegProject } from '@/lib/projectRegistry';
import ProjectPicker from '@/components/ui/ProjectPicker';
import { CATEGORY_SUBCATEGORIES, subcategoryLabel } from '@/lib/materialCategories';
import { SCREEN_LABEL } from '@/lib/siteScreens';
import { Store as Karte } from '@/lib/karte/engine';
import './caseMaterials.css';

export type CaseItem = {
  id: string;
  /** 画面の分類(roof など) */
  category: string;
  /** 小分類(id か表示名。makers.json の pages と同じ) */
  sub: string;
  maker: string;
  /** 品番・色(自由記入) */
  spec: string;
  note: string;
  at: number;
};
type LocalStore = { v: 2; last?: string; v1Done?: boolean; projects: Record<string, CaseItem[]> };

const KEY = 'yy-case-materials-v2';
const V1_KEY = 'yy-case-materials';
const EVENT = 'yy-case-materials';

function readStore(): LocalStore {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as LocalStore | null;
    if (s && s.v === 2 && s.projects && typeof s.projects === 'object') return s;
  } catch {
    /* 壊れていれば空から */
  }
  return { v: 2, projects: {} };
}
function writeStore(s: LocalStore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* 保存できない端末はこの画面の間だけ */
  }
}
const cleanItems = (list: unknown): CaseItem[] =>
  Array.isArray(list) ? (list as CaseItem[]).filter((x) => x && typeof x.id === 'string' && typeof x.sub === 'string') : [];
const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 旧形式(カルテの案件 id → 小分類の配列)を、台帳でカルテとつながった案件へ移す */
function migrateV1(projects: RegProject[]) {
  const s = readStore();
  if (s.v1Done) return;
  let old: Record<string, string[]> = {};
  try {
    old = JSON.parse(localStorage.getItem(V1_KEY) || '{}') as Record<string, string[]>;
  } catch {
    /* 読めなければ移すものは無い */
  }
  const pending = Object.entries(old).filter(([, subs]) => Array.isArray(subs) && subs.length);
  // 台帳がまだカルテの案件を取り込んでいなければ次の機会に回す
  if (pending.some(([kid]) => !projects.some((p) => p.karteId === kid))) return;
  for (const [kid, subs] of pending) {
    const p = projects.find((x) => x.karteId === kid)!;
    const list = s.projects[p.id] ?? [];
    for (const sub of subs) {
      if (list.some((x) => x.sub === sub)) continue;
      const category = Object.keys(CATEGORY_SUBCATEGORIES).find((c) => CATEGORY_SUBCATEGORIES[c].includes(sub)) ?? '';
      list.push({ id: newId(), category, sub, maker: '', spec: '', note: '', at: Date.now() });
    }
    s.projects[p.id] = list;
  }
  s.v1Done = true;
  writeStore(s);
}

/** 案件 1 件ぶんの一覧。ログイン中は Firestore を正とし、このブラウザにも写しを置く */
function useCaseItems(projectId: string | null, projectName: string) {
  const { currentUser, authReady } = useAuth();
  const uid = currentUser?.uid ?? null;
  const [items, setItems] = useState<CaseItem[]>([]);

  useEffect(() => {
    if (!projectId) {
      setItems([]);
      return;
    }
    const local = () => setItems(readStore().projects[projectId] ?? []);
    local();
    if (!authReady || !uid) {
      window.addEventListener(EVENT, local);
      window.addEventListener('storage', local);
      return () => {
        window.removeEventListener(EVENT, local);
        window.removeEventListener('storage', local);
      };
    }
    const ref = doc(db, 'users', uid, 'caseMaterials', projectId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const list = cleanItems(snap.data().items);
          const s = readStore();
          s.projects[projectId] = list;
          writeStore(s);
          setItems(list);
        } else {
          // まだ Firestore に無ければ、このブラウザで控えていた分を上げる
          const list = readStore().projects[projectId] ?? [];
          if (list.length) void setDoc(ref, { projectName, items: list, updatedAt: Date.now() }).catch(() => {});
        }
      },
      () => local(),
    );
    return () => unsub();
    // projectName は書き込みの付記だけなので、変わっても読み直さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, uid, authReady]);

  const save = (next: CaseItem[]) => {
    if (!projectId) return;
    setItems(next);
    const s = readStore();
    s.projects[projectId] = next;
    writeStore(s);
    if (uid) {
      void setDoc(doc(db, 'users', uid, 'caseMaterials', projectId), JSON.parse(JSON.stringify({ projectName, items: next, updatedAt: Date.now() }))).catch((e) =>
        console.warn('案件の建材を保存できませんでした', e),
      );
    }
  };
  return { items, save, loggedIn: !!uid };
}

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const ymd = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 仕上表の下書き用。Excel で文字化けしないよう BOM 付きの UTF-8 */
function downloadCsv(projectName: string, items: CaseItem[]) {
  const head = ['部位', '小分類', 'メーカー', '品番・色', '備考', '控えた日'];
  const rows = items.map((x) => [SCREEN_LABEL[x.category] ?? x.category, subcategoryLabel(x.sub), x.maker, x.spec, x.note, ymd(x.at)]);
  const text = '﻿' + [head, ...rows].map((r) => r.map((c) => csvCell(String(c ?? ''))).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.replace(/[\\/:*?"<>|]/g, '_')}_使用建材.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = {
  /** 画面の分類(roof など) */
  category: string;
  /** 小分類 */
  subcategory: string;
  /** この小分類に載っているメーカー(入力の候補) */
  makers: string[];
};

export default function CaseMaterials({ category, subcategory, makers }: Props) {
  const { projects, find, ready } = useProjectRegistry();
  const [name, setName] = useState('');
  const [maker, setMaker] = useState('');
  const [spec, setSpec] = useState('');
  const [note, setNote] = useState('');
  const project = name.trim() ? find(name) : null;
  const { items, save, loggedIn } = useCaseItems(project?.id ?? null, project?.name ?? '');
  const label = subcategoryLabel(subcategory);

  // 最初に出す案件: 前回この欄で選んだもの → 物件カルテで開いている案件(台帳でつながっていれば)
  useEffect(() => {
    if (!ready || name) return;
    migrateV1(projects);
    const last = readStore().last;
    let p = last ? projects.find((x) => x.id === last && x.status === 'active') : undefined;
    if (!p) {
      const k = Karte.load();
      if (k?.current) p = projects.find((x) => x.karteId === k.current && x.status === 'active');
    }
    if (p) setName(p.name);
    // 最初の 1 回だけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 選んだ案件を覚える(次に建材ページを開いたとき同じ案件から)
  useEffect(() => {
    if (!project) return;
    const s = readStore();
    if (s.last !== project.id) {
      s.last = project.id;
      writeStore(s);
    }
  }, [project]);

  // この小分類の行を先に、あとは控えた順
  const sorted = useMemo(() => {
    const here = (x: CaseItem) => x.sub === subcategory || subcategoryLabel(x.sub) === label;
    return [...items].sort((a, b) => Number(here(b)) - Number(here(a)) || a.at - b.at);
  }, [items, subcategory, label]);
  const hereCount = items.filter((x) => x.sub === subcategory || subcategoryLabel(x.sub) === label).length;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const m = maker.trim();
    const s = spec.trim();
    const n = note.trim();
    // 同じ小分類・メーカー・品番はもう一度足さない
    if (items.some((x) => x.sub === subcategory && x.maker === m && x.spec === s)) return;
    save([...items, { id: newId(), category, sub: subcategory, maker: m, spec: s, note: n, at: Date.now() }]);
    setMaker('');
    setSpec('');
    setNote('');
  };
  const remove = (id: string) => save(items.filter((x) => x.id !== id));
  const listId = `yy-case2-makers-${category}`;

  return (
    <div className="yy-gray yy-gray--case yy-case2">
      <span className="yy-label">case — 案件で使う建材</span>
      <ProjectPicker value={name} onChange={setName} label="案件(物件)" placeholder="案件を選ぶ・入れる" />
      {!name.trim() ? (
        <span className="yy-gray__text">
          物件の台帳から案件を選ぶと、この案件で使う建材(メーカー・品番・色)を控えて、仕上表の下書きに CSV で書き出せます。
        </span>
      ) : !project ? (
        <span className="yy-gray__text">台帳に無い名前です。「物件として登録」すると控えられます(ほかのツールでも同じ名前で選べます)。</span>
      ) : (
        <>
          <form className="yy-case2__form" onSubmit={add}>
            <span className="yy-case2__sub">
              <span className="yy-case2__k">部位</span>
              {SCREEN_LABEL[category] ?? category} · {label}
            </span>
            <input type="text" list={listId} value={maker} onChange={(e) => setMaker(e.target.value)} placeholder="メーカー" aria-label="メーカー" />
            <datalist id={listId}>
              {makers.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <input type="text" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="品番・色(例: ◯◯-1234 / ホワイト)" aria-label="品番・色" />
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="メモ(使う場所・張り方など)" aria-label="メモ" />
            <button type="submit" className="yy-pill">
              ＋ この案件に控える
            </button>
          </form>

          <div className="yy-case2__head">
            <span className="yy-case2__k">
              {String(items.length).padStart(3, '0')} 件{hereCount ? ` · ${label} ${hereCount}` : ''}
            </span>
            {items.length > 0 && (
              <button type="button" className="yy-case2__csv" onClick={() => downloadCsv(project.name, sorted)} title="仕上表の下書き用(部位・小分類・メーカー・品番・色・備考)">
                CSV
              </button>
            )}
          </div>
          {sorted.length > 0 ? (
            <ol className="yy-case2__list">
              {sorted.map((x, i) => (
                <li key={x.id} className={x.sub === subcategory || subcategoryLabel(x.sub) === label ? 'is-here' : undefined}>
                  <span className="yy-case2__no">{String(i + 1).padStart(3, '0')}</span>
                  <span className="yy-case2__body">
                    <span className="yy-case2__what">
                      {subcategoryLabel(x.sub)} · {x.maker || 'メーカー未定'}
                    </span>
                    {(x.spec || x.note) && <span className="yy-case2__spec">{[x.spec, x.note].filter(Boolean).join(' / ')}</span>}
                  </span>
                  <button type="button" className="yy-case2__del" onClick={() => remove(x.id)} aria-label={`${subcategoryLabel(x.sub)} ${x.maker} を外す`} title="外す">
                    ×
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <span className="yy-gray__text">まだ控えた建材はありません。</span>
          )}
          <span className="yy-case2__k">{loggedIn ? 'アカウントに保存' : 'この端末に保存 · ログインするとほかの端末でも'}</span>
        </>
      )}
    </div>
  );
}
