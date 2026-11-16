'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FiImage, FiDownload, FiTrash2, FiFileText, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import {
  resizeToLongSide,
  readOrientation,
  loadImageBitmap,
  applyOrientationTransform,
} from '@/lib/imageOrientation';
import ProjectPicker from '@/components/ui/ProjectPicker';
import ToolHeader from '../ToolHeader';

/**
 * 工事写真の一括処理。
 *
 * 現場で撮った写真を提出物にするまでに毎回やっていること――
 * 長辺を縮める／Exif を落とす／連番に付け替える／黒板を入れる／
 * 台紙に貼って写真帳にする――をまとめて1回でやる。
 *
 * 画像は canvas を通すので Exif は丸ごと落ちる（位置情報も撮影日時も）。
 * 撮影日は落ちる前に読み取って、ファイル名と黒板に焼き込む。
 * 処理は全部ブラウザの中で終わり、写真はどこにも送らない。
 *
 * 2026-11-16
 * - 工事名は物件の共通台帳（ProjectPicker）から選ぶ。ほかのツールと同じ名前になる
 * - 写真帳は「A4 縦・3 枚・右に説明欄」（事務所で実際に使う形）を既定にし、2×2 も残す。
 *   説明欄は写真ごとに 撮影日・工種・撮影箇所・内容／寸法 を書ける
 * - 作業中の写真・並び順・説明はこのブラウザの IndexedDB に残す（再読み込みで消えない）。
 *   「作業をクリア」で消す。元の写真ファイルには一切触れない
 * - 黒板を焼き込まずに書き出せる（黒板の情報は写真帳の説明欄にだけ載せる）。
 *   ZIP は「元の写真のまま（名前だけ連番）」も選べる
 */

type Photo = {
  id: string;
  /** 描くのに使うファイル。HEIC は JPEG に起こしたもの */
  file: File;
  /** 取り込んだ元のファイル（HEIC を起こしたときだけ。それ以外は file が元のまま） */
  source?: File;
  /** Exif から読んだ撮影日。無ければファイルの更新日。説明欄で直せる */
  shotAt: Date;
  /** この写真だけ工種を変えたいとき。空なら全体の設定を使う。 */
  kind?: string;
  /** 撮影箇所（X1-Y2 通り 基礎梁 など） */
  place?: string;
  /** 内容・寸法（D13@200 かぶり 60 など） */
  memo?: string;
  previewUrl: string;
  orientation: number;
};

type BoardPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'none';
/** 写真帳の形。a4-3 = A4 縦に 3 枚・右に説明欄 / a4-4 = 2 列 × 2 段 */
type AlbumLayout = 'a4-3' | 'a4-4';

const LONG_SIDES = [3000, 2048, 1920, 1600, 1280];
/** 写真帳に貼る写真の長辺。A4 の 1/3 段に貼ると 300dpi でも 1400px 程度で足りる */
const ALBUM_LONG_SIDE = 1600;

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const ymdSlash = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
const ymdDash = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** ファイル名に使えない文字を落とす。工事名をそのまま入れられるように。 */
const safeForFilename = (value: string) => value.replace(/[\\/:*?"<>|]/g, '_').trim();

/** 撮影日順になっているか（手で並べ替えたあとかどうかの判定） */
export const isDateOrdered = (list: { shotAt: Date }[]) =>
  list.every((p, i) => i === 0 || list[i - 1].shotAt.getTime() <= p.shotAt.getTime());

/**
 * 写真を足したときの並び。まだ撮影日順なら全体を並べ直す。
 * 手で並べ替えたあとなら、その順を崩さず、足した分を撮影日順で末尾に付ける。
 */
export function mergeAdded<T extends { shotAt: Date }>(prev: T[], added: T[]): { list: T[]; appended: boolean } {
  const byDate = (a: T, b: T) => a.shotAt.getTime() - b.shotAt.getTime();
  if (isDateOrdered(prev)) return { list: [...prev, ...added].sort(byDate), appended: false };
  return { list: [...prev, ...[...added].sort(byDate)], appended: true };
}

/** from 番目を to 番目へ動かす */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * 箱（boxW × boxH）に縦横比を保って収めた大きさ。
 * 写真帳は html2canvas で PDF にするが、html2canvas は object-fit を描けず写真が潰れるので、
 * 寸法を自前で決めて img に直接入れる。
 */
export function fitInBox(w: number, h: number, boxW: number, boxH: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: boxW, height: boxH };
  const r = Math.min(boxW / w, boxH / h);
  return { width: w * r, height: h * r };
}

/**
 * 撮影日を読む。Exif の DateTimeOriginal が本命で、
 * 無ければファイルの更新日時で代用する（スクショや加工済みの写真）。
 */
async function readShotDate(file: File): Promise<Date> {
  try {
    const exifr = await import('exifr');
    const data = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] });
    const value = data?.DateTimeOriginal || data?.CreateDate;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    /* 読めない形式はファイルの日時で代用する */
  }
  return new Date(file.lastModified || Date.now());
}

const isHeicFile = (file: File) => /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);

/**
 * HEIC/HEIF を JPEG に起こす。Chrome などは HEIC をそのまま描けず、
 * 以前は iPhone の写真を入れると一覧が真っ白で、書き出しも丸ごと失敗していた。
 * デコーダは数MBあるので HEIC を入れたときだけ読み込む（画像変換と同じ部品）。
 */
async function heicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import('heic-to');
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
}

/** 工事名・施工者・画像の設定はこのブラウザに覚えておく（毎回打ち直さないため） */
const SETTINGS_KEY = 'yy-guest-construction-photos';
type SavedSettings = {
  projectName?: string;
  defaultKind?: string;
  contractor?: string;
  longSide?: number;
  quality?: number;
  boardPosition?: BoardPosition;
  albumLayout?: AlbumLayout;
  albumBoard?: boolean;
  zipOriginal?: boolean;
};

// --- 作業の保存（IndexedDB） ------------------------------------------------
//
// 写真の並べ替えと説明は手間がかかるのに、以前は再読み込みで全部消えていた。
// 写真（Blob）は大きいので localStorage には入らない。IndexedDB に置く。
//   blobs: id → { file, source? }（取り込んだときに 1 回だけ書く）
//   state: 'current' → { photos: 並び順どおりのメタ情報, startNumber }（変わるたびに書く）

const IDB_NAME = 'yy-construction-photos';
const IDB_BLOBS = 'blobs';
const IDB_STATE = 'state';

type PhotoMeta = {
  id: string;
  shotAt: number;
  kind?: string;
  place?: string;
  memo?: string;
  orientation: number;
};
type WorkState = { photos: PhotoMeta[]; startNumber: number };
type BlobRecord = { file: File; source?: File };

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB を使えません'));
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_BLOBS)) db.createObjectStore(IDB_BLOBS);
        if (!db.objectStoreNames.contains(IDB_STATE)) db.createObjectStore(IDB_STATE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

/** 1 つのトランザクションで書く。終わる（または失敗する）まで待つ */
async function idbWrite(stores: string[], work: (t: IDBTransaction) => void): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(stores, 'readwrite');
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    work(t);
  });
}

async function idbLoad(): Promise<{ state: WorkState | null; blobs: Map<string, BlobRecord> }> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([IDB_BLOBS, IDB_STATE], 'readonly');
    const blobs = new Map<string, BlobRecord>();
    let state: WorkState | null = null;
    const stateReq = t.objectStore(IDB_STATE).get('current');
    stateReq.onsuccess = () => {
      state = (stateReq.result as WorkState | undefined) ?? null;
    };
    const cursorReq = t.objectStore(IDB_BLOBS).openCursor();
    cursorReq.onsuccess = () => {
      const c = cursorReq.result;
      if (!c) return;
      blobs.set(String(c.key), c.value as BlobRecord);
      c.continue();
    };
    t.oncomplete = () => resolve({ state, blobs });
    t.onerror = () => reject(t.error);
  });
}

const toMeta = (p: Photo): PhotoMeta => ({
  id: p.id,
  shotAt: p.shotAt.getTime(),
  kind: p.kind,
  place: p.place,
  memo: p.memo,
  orientation: p.orientation,
});

/** 黒板。白地に黒文字の札を、写真の隅に焼き込む。 */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  rows: Array<[string, string]>,
  position: BoardPosition,
) {
  if (position === 'none' || rows.length === 0) return;

  // 写真の大きさに対する比で決める。縮めても読める大きさを保つため。
  const scale = Math.max(canvasWidth, canvasHeight) / 1920;
  const fontSize = Math.round(26 * scale);
  const padding = Math.round(14 * scale);
  const lineHeight = Math.round(fontSize * 1.5);
  const labelWidth = Math.round(150 * scale);

  ctx.font = `${fontSize}px sans-serif`;
  const valueWidth = Math.max(...rows.map(([, v]) => ctx.measureText(v).width));
  const boardWidth = Math.min(labelWidth + valueWidth + padding * 3, canvasWidth - padding * 2);
  const boardHeight = rows.length * lineHeight + padding * 2;

  const x = position.endsWith('left') ? padding : canvasWidth - boardWidth - padding;
  const y = position.startsWith('top') ? padding : canvasHeight - boardHeight - padding;

  // 下地。完全な不透明にすると写真を隠しすぎるので、少しだけ透かす。
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(x, y, boardWidth, boardHeight);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(2, Math.round(2 * scale));
  ctx.strokeRect(x, y, boardWidth, boardHeight);

  ctx.textBaseline = 'middle';
  rows.forEach(([label, value], i) => {
    const rowY = y + padding + lineHeight * i + lineHeight / 2;
    ctx.fillStyle = '#444444';
    ctx.fillText(label, x + padding, rowY);
    ctx.fillStyle = '#111111';
    ctx.fillText(value, x + padding + labelWidth, rowY);
    if (i < rows.length - 1) {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + padding / 2, rowY + lineHeight / 2);
      ctx.lineTo(x + boardWidth - padding / 2, rowY + lineHeight / 2);
      ctx.stroke();
    }
  });
}

const ConstructionPhotos: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projectName, setProjectName] = useState('');
  const [defaultKind, setDefaultKind] = useState('');
  const [contractor, setContractor] = useState('');
  const [longSide, setLongSide] = useState(1920);
  const [quality, setQuality] = useState(85);
  const [boardPosition, setBoardPosition] = useState<BoardPosition>('bottom-left');
  const [albumLayout, setAlbumLayout] = useState<AlbumLayout>('a4-3');
  /** 写真帳の写真にも黒板を焼き込むか（既定は焼き込まず、説明欄にだけ書く） */
  const [albumBoard, setAlbumBoard] = useState(false);
  /** ZIP を元の写真のまま（名前だけ連番）で書き出す */
  const [zipOriginal, setZipOriginal] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState('');
  /** 並べ替えでつかんでいる写真 */
  const [dragId, setDragId] = useState<string | null>(null);

  // 前回の工事名・施工者などを戻す
  const settingsLoaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as SavedSettings;
        if (typeof s.projectName === 'string') setProjectName(s.projectName);
        if (typeof s.defaultKind === 'string') setDefaultKind(s.defaultKind);
        if (typeof s.contractor === 'string') setContractor(s.contractor);
        if (typeof s.longSide === 'number' && LONG_SIDES.includes(s.longSide)) setLongSide(s.longSide);
        if (typeof s.quality === 'number') setQuality(Math.min(100, Math.max(50, s.quality)));
        if (s.boardPosition) setBoardPosition(s.boardPosition);
        if (s.albumLayout === 'a4-3' || s.albumLayout === 'a4-4') setAlbumLayout(s.albumLayout);
        if (typeof s.albumBoard === 'boolean') setAlbumBoard(s.albumBoard);
        if (typeof s.zipOriginal === 'boolean') setZipOriginal(s.zipOriginal);
      }
    } catch {
      /* 読めなければ既定値のまま */
    }
    settingsLoaded.current = true;
  }, []);
  useEffect(() => {
    if (!settingsLoaded.current) return;
    try {
      const s: SavedSettings = { projectName, defaultKind, contractor, longSide, quality, boardPosition, albumLayout, albumBoard, zipOriginal };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* 保存できなくても、このページを開いている間は使える */
    }
  }, [projectName, defaultKind, contractor, longSide, quality, boardPosition, albumLayout, albumBoard, zipOriginal]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // プレビュー用の URL は、破棄しないとページを開いている間ずっと残る
  const urlsRef = useRef<string[]>([]);
  // 見出し帯の「できること」から各欄へ飛ぶための足場
  const boardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollToPhotoRef = (r: React.RefObject<HTMLElement | null>) =>
    r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  // --- 作業の保存と復元 -----------------------------------------------------
  /** 復元が終わるまでは保存しない（空の一覧で前回の作業を上書きしないため） */
  const restoredRef = useRef(false);
  /** IndexedDB に写真を書き終えた id */
  const storedIdsRef = useRef(new Set<string>());
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { state, blobs } = await idbLoad();
        if (!alive) return;
        const restored: Photo[] = [];
        for (const m of state?.photos ?? []) {
          const rec = blobs.get(m.id);
          if (!rec?.file) continue;
          const url = URL.createObjectURL(rec.file);
          urlsRef.current.push(url);
          restored.push({
            id: m.id,
            file: rec.file,
            source: rec.source,
            shotAt: new Date(m.shotAt),
            kind: m.kind,
            place: m.place,
            memo: m.memo,
            orientation: m.orientation,
            previewUrl: url,
          });
          storedIdsRef.current.add(m.id);
        }
        // 並びに載っていない写真（書き込みの途中で閉じたもの）は消す
        const orphans = Array.from(blobs.keys()).filter((id) => !storedIdsRef.current.has(id));
        if (orphans.length) {
          void idbWrite([IDB_BLOBS], (t) => orphans.forEach((id) => t.objectStore(IDB_BLOBS).delete(id))).catch(() => undefined);
        }
        if (restored.length) {
          setPhotos(restored);
          if (state?.startNumber) setStartNumber(Math.max(1, state.startNumber));
          setNotice(`前回の作業（${restored.length} 枚・並び順・説明）を戻しました。新しく始めるときは「作業をクリア」。`);
        }
      } catch (error) {
        console.error('工事写真の作業を戻せませんでした', error);
        setStorageOk(false);
      } finally {
        restoredRef.current = true;
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 並び順・説明・開始番号が変わったら書く（打つたびに書かないよう少し待つ）
  useEffect(() => {
    if (!restoredRef.current) return;
    const timer = setTimeout(() => {
      const ids = new Set(photos.map((p) => p.id));
      const gone = Array.from(storedIdsRef.current).filter((id) => !ids.has(id));
      const state: WorkState = { photos: photos.map(toMeta), startNumber };
      idbWrite([IDB_BLOBS, IDB_STATE], (t) => {
        t.objectStore(IDB_STATE).put(state, 'current');
        gone.forEach((id) => t.objectStore(IDB_BLOBS).delete(id));
      })
        .then(() => gone.forEach((id) => storedIdsRef.current.delete(id)))
        .catch((error) => {
          console.error('工事写真の作業を保存できませんでした', error);
          setStorageOk(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [photos, startNumber]);

  /** 取り込んだ写真を IndexedDB に置く（1 枚ずつ。容量不足でも残りは画面で使える） */
  const storePhotos = async (list: Photo[]) => {
    let failed = 0;
    for (const p of list) {
      try {
        const rec: BlobRecord = p.source ? { file: p.file, source: p.source } : { file: p.file };
        await idbWrite([IDB_BLOBS], (t) => t.objectStore(IDB_BLOBS).put(rec, p.id));
        // 書いている間に外された写真は、書き終えたらすぐ消す
        if (!photosRef.current.some((x) => x.id === p.id)) {
          await idbWrite([IDB_BLOBS], (t) => t.objectStore(IDB_BLOBS).delete(p.id)).catch(() => undefined);
        } else {
          storedIdsRef.current.add(p.id);
        }
      } catch (error) {
        console.error('写真をこのブラウザに保存できませんでした', p.file.name, error);
        failed++;
      }
    }
    if (failed) {
      setStorageOk(false);
      setNotice(`${failed} 枚はこのブラウザに保存しきれませんでした（空き容量不足）。このページを閉じるとその写真は外れます。書き出しは今のまま使えます。`);
    }
  };

  const addFiles = async (files: FileList | File[]) => {
    const all = Array.from(files);
    const list = all.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    const skipped = all.length - list.length;
    if (list.length === 0) {
      if (skipped > 0) setNotice('画像ではないファイルは取り込めません。JPEG / PNG / HEIC を選んでください。');
      return;
    }

    setBusy('読み込み中…');
    setNotice('');
    const added: Photo[] = [];
    const failed: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const original = list[i];
      if (list.length > 1) setProgress({ done: i, total: list.length });
      try {
        // 撮影日は元のファイル（HEIC なら HEIC）の Exif から読む
        const shotAt = await readShotDate(original);
        let file = original;
        let source: File | undefined;
        let orientation: number;
        if (isHeicFile(original)) {
          file = await heicToJpeg(original);
          source = original;
          // libheif は回転（irot）を展開時に適用済み。Exif の向きを重ねると二重に回る
          orientation = 1;
        } else {
          orientation = await readOrientation(original);
        }
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        added.push({ id: generateId(), file, source, shotAt, previewUrl: url, orientation });
      } catch (error) {
        console.error('写真の取り込みに失敗しました', original.name, error);
        failed.push(original.name);
      }
    }
    // 撮影順に並べる。連番が撮った順になっていないと写真帳として読めない。
    // ただし手で並べ替えたあとは、その順を崩さない（足した分は末尾）。
    const appended = !isDateOrdered(photosRef.current);
    setPhotos((prev) => mergeAdded(prev, added).list);
    setBusy('');
    setProgress({ done: 0, total: 0 });
    const notes: string[] = [];
    if (appended && added.length) notes.push('手で並べ替えた順を保つため、足した写真は末尾に入れました（「撮影日順に並べ直す」で並べ直せます）。');
    if (failed.length) notes.push(`取り込めなかった写真: ${failed.join('、')}（壊れているか、読めない形式です）。`);
    if (skipped > 0) notes.push(`画像ではない ${skipped} 件は外しました。`);
    setNotice(notes.join(' '));
    if (added.length) void storePhotos(added);
  };

  /** 保存させる。すぐ URL を解放すると保存が始まらないブラウザがあるので少し待つ。 */
  const saveBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const updatePhoto = (id: string, patch: Partial<Photo>) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));
  const movePhoto = (from: number, to: number) => setPhotos((prev) => moveItem(prev, from, to));
  const sortByDate = () =>
    setPhotos((prev) => [...prev].sort((a, b) => a.shotAt.getTime() - b.shotAt.getTime()));

  /** 作業をクリア。取り込んだ写真・並び順・説明をこのブラウザから消す（元のファイルは消えない） */
  const clearWork = async () => {
    if (photos.length > 0 && !window.confirm(`取り込んだ ${photos.length} 枚と、並び順・説明をこのブラウザから消します。元の写真ファイルは消えません。よろしいですか？`)) return;
    setPhotos([]);
    photosRef.current = [];
    setStartNumber(1);
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    try {
      await idbWrite([IDB_BLOBS, IDB_STATE], (t) => {
        t.objectStore(IDB_BLOBS).clear();
        t.objectStore(IDB_STATE).clear();
      });
      storedIdsRef.current.clear();
      setStorageOk(true);
      setNotice('作業をクリアしました。');
    } catch (error) {
      console.error('工事写真の作業を消せませんでした', error);
      setNotice('画面からは外しましたが、このブラウザの保存分を消せませんでした。ページを再読み込みしてもう一度「作業をクリア」を押してください。');
    }
  };

  const kindOf = (photo: Photo) => (photo.kind || defaultKind).trim();

  const fileNameFor = (photo: Photo, index: number, ext = '.jpg') => {
    const kind = safeForFilename(photo.kind || defaultKind) || '工事写真';
    return `${ymd(photo.shotAt)}_${kind}_${pad(startNumber + index, 3)}${ext}`;
  };

  const boardRowsFor = (photo: Photo): Array<[string, string]> => {
    const rows: Array<[string, string]> = [];
    if (projectName.trim()) rows.push(['工事名', projectName.trim()]);
    const kind = kindOf(photo);
    if (kind) rows.push(['工種', kind]);
    if (photo.place?.trim()) rows.push(['撮影箇所', photo.place.trim()]);
    rows.push(['撮影日', ymdSlash(photo.shotAt)]);
    if (contractor.trim()) rows.push(['施工者', contractor.trim()]);
    return rows;
  };

  /** 1枚を仕上げる。向き補正 → 縮小 → 黒板 → JPEG。 */
  const renderPhoto = async (
    photo: Photo,
    opts: { long: number; board: BoardPosition },
  ): Promise<{ blob: Blob; width: number; height: number } | null> => {
    const image = await loadImageBitmap(photo.file);
    const naturalWidth = (image as ImageBitmap).width;
    const naturalHeight = (image as ImageBitmap).height;

    const { width: rawWidth, height: rawHeight } = resizeToLongSide(naturalWidth, naturalHeight, opts.long);
    // EXIF orientation 5〜8 は縦横が入れ替わるので、canvas の寸法も入れ替える
    const needSwap = photo.orientation >= 5 && photo.orientation <= 8;
    const canvas = document.createElement('canvas');
    canvas.width = needSwap ? rawHeight : rawWidth;
    canvas.height = needSwap ? rawWidth : rawHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    applyOrientationTransform(ctx, canvas.width, canvas.height, photo.orientation);
    // 回転後の座標系に描くので、渡すのは回転前の寸法
    ctx.drawImage(image as CanvasImageSource, 0, 0, rawWidth, rawHeight);
    ctx.restore();

    // 黒板は回転を戻してから描く（一緒に回ると読めなくなる）
    drawBoard(ctx, canvas.width, canvas.height, boardRowsFor(photo), opts.board);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality / 100),
    );
    return blob ? { blob, width: canvas.width, height: canvas.height } : null;
  };

  const exportZip = async () => {
    if (photos.length === 0) return;
    setBusy('書き出し中…');
    setNotice('');
    setProgress({ done: 0, total: photos.length });
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const failed: string[] = [];

      // 1 枚失敗しても残りは書き出す（以前は 1 枚の失敗で全部止まっていた）
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (zipOriginal) {
          // 元の写真のまま。中身（Exif・画質・大きさ）には触れず、名前だけ連番にする
          const orig = photo.source ?? photo.file;
          const ext = (orig.name.match(/\.[^.]+$/)?.[0] ?? '.jpg').toLowerCase();
          zip.file(fileNameFor(photo, i, ext), orig);
        } else {
          const out = await renderPhoto(photo, { long: longSide, board: boardPosition }).catch((error) => {
            console.error('写真の書き出しに失敗しました', photo.file.name, error);
            return null;
          });
          if (out) zip.file(fileNameFor(photo, i), out.blob);
          else failed.push(photo.file.name);
        }
        setProgress({ done: i + 1, total: photos.length });
      }
      if (failed.length === photos.length) {
        setNotice('写真を書き出せませんでした。写真が壊れているか、このブラウザが読めない形式です。');
        return;
      }

      const out = await zip.generateAsync({ type: 'blob' });
      saveBlob(out, `${safeForFilename(projectName) || '工事写真'}_${ymd(new Date())}.zip`);
      setNotice(
        failed.length
          ? `${photos.length - failed.length} 枚を ZIP で保存しました。書き出せなかった写真: ${failed.join('、')}`
          : `${photos.length} 枚を ZIP で保存しました${zipOriginal ? '（元の写真のまま・名前だけ連番）' : ''}。`
      );
    } catch (error) {
      console.error('工事写真の書き出しに失敗しました', error);
      setNotice('書き出しに失敗しました。写真の枚数を減らすか、ページを再読み込みしてやり直してください。');
    } finally {
      setBusy('');
      setProgress({ done: 0, total: 0 });
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  /**
   * 台紙に貼った写真帳（A4 縦）。
   *   a4-3: 3 枚。左に写真、右に説明欄（No.・撮影日・工種・撮影箇所・内容／寸法）
   *   a4-4: 4 枚（2 列 × 2 段）。写真の下に短い説明
   * 黒板は既定では焼き込まない（説明欄に同じことを書くので二重になる）。
   */
  const exportAlbum = async () => {
    if (photos.length === 0) return;
    const perPage = albumLayout === 'a4-3' ? 3 : 4;
    const totalPages = Math.ceil(photos.length / perPage);
    setBusy('写真帳を作成中…');
    setProgress({ done: 0, total: photos.length });

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.background = '#ffffff';
    container.style.color = '#111111';
    container.style.fontFamily = "'Noto Sans JP', sans-serif";
    setNotice('');
    const failed: string[] = [];
    const board: BoardPosition = albumBoard ? (boardPosition === 'none' ? 'bottom-left' : boardPosition) : 'none';

    const cellText = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br>');

    try {
      for (let pageNo = 0; pageNo < totalPages; pageNo++) {
        const i = pageNo * perPage;
        const page = document.createElement('div');
        // 高さを決めておく（html2canvas の丸めで 297mm を超えると白紙のページが挟まる）
        page.style.cssText = 'width:210mm;height:296mm;padding:10mm 10mm 8mm;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;';
        if (pageNo < totalPages - 1) page.style.pageBreakAfter = 'always';

        const heading = document.createElement('div');
        heading.style.cssText = 'font-size:11px;border-bottom:1px solid #333;padding-bottom:3px;margin-bottom:4mm;display:flex;justify-content:space-between;flex:0 0 auto;';
        heading.innerHTML = `<span>${escapeHtml(projectName || '工事写真帳')}</span><span>${escapeHtml(contractor)}</span>`;
        page.appendChild(heading);

        const body = document.createElement('div');
        body.style.cssText = albumLayout === 'a4-3'
          ? 'flex:1 1 auto;display:flex;flex-direction:column;border-top:1px solid #333;'
          : 'flex:1 1 auto;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:min-content;gap:5mm;';

        for (const photo of photos.slice(i, i + perPage)) {
          const index = photos.indexOf(photo);
          const out = await renderPhoto(photo, { long: Math.min(longSide, ALBUM_LONG_SIDE), board }).catch((error) => {
            console.error('写真の書き出しに失敗しました', photo.file.name, error);
            return null;
          });
          setProgress({ done: index + 1, total: photos.length });
          if (!out) failed.push(photo.file.name);
          const dataUrl = out ? await blobToDataUrl(out.blob) : '';
          const no = `No.${pad(startNumber + index, 3)}`;

          const cell = document.createElement('div');
          if (albumLayout === 'a4-3') {
            // 1 段 = 写真（幅 118mm）+ 説明欄。3 段で A4 縦の本文（約 270mm）を埋める
            const boxW = 118;
            const boxH = 82;
            const fit = out ? fitInBox(out.width, out.height, boxW - 4, boxH - 4) : { width: 0, height: 0 };
            cell.style.cssText = 'height:86mm;display:flex;border:1px solid #333;border-top:0;box-sizing:border-box;';
            const rows: Array<[string, string]> = [
              ['撮影日', ymdSlash(photo.shotAt)],
              ['工種', kindOf(photo)],
              ['撮影箇所', (photo.place ?? '').trim()],
            ];
            cell.innerHTML =
              `<div style="width:${boxW}mm;height:100%;border-right:1px solid #333;display:flex;align-items:center;justify-content:center;background:#f4f4f4;flex:0 0 auto;">` +
              (out
                ? `<img src="${dataUrl}" style="width:${fit.width.toFixed(2)}mm;height:${fit.height.toFixed(2)}mm;display:block;" />`
                : `<span style="font-size:10px;color:#888;">写真を描けませんでした</span>`) +
              `</div>` +
              `<div style="flex:1 1 auto;display:flex;flex-direction:column;font-size:10px;line-height:1.5;min-width:0;">` +
              `<div style="padding:1.5mm 2mm;border-bottom:1px solid #999;font-weight:700;letter-spacing:0.04em;">${no}</div>` +
              rows
                .map(
                  ([label, value]) =>
                    `<div style="display:flex;border-bottom:1px solid #999;">` +
                    `<div style="width:16mm;flex:0 0 auto;padding:1.5mm 2mm;color:#555;border-right:1px solid #999;">${label}</div>` +
                    `<div style="flex:1 1 auto;padding:1.5mm 2mm;word-break:break-all;">${cellText(value)}</div>` +
                    `</div>`,
                )
                .join('') +
              `<div style="padding:1.5mm 2mm 0;color:#555;">内容・寸法</div>` +
              `<div style="flex:1 1 auto;padding:1mm 2mm 2mm;word-break:break-all;overflow:hidden;">${cellText((photo.memo ?? '').trim())}</div>` +
              `</div>`;
          } else {
            const boxW = 85;
            const boxH = 60;
            const fit = out ? fitInBox(out.width, out.height, boxW, boxH) : { width: 0, height: 0 };
            cell.style.cssText = 'border:1px solid #999;padding:3mm;box-sizing:border-box;';
            const sub = [kindOf(photo), (photo.place ?? '').trim()].filter(Boolean).join('　');
            cell.innerHTML =
              `<div style="width:${boxW}mm;height:${boxH}mm;display:flex;align-items:center;justify-content:center;background:#f4f4f4;">` +
              (out ? `<img src="${dataUrl}" style="width:${fit.width.toFixed(2)}mm;height:${fit.height.toFixed(2)}mm;display:block;" />` : '') +
              `</div>` +
              `<div style="font-size:9px;margin-top:2mm;line-height:1.5;">` +
              `<div>${no}　${escapeHtml(sub)}</div>` +
              `<div>${ymdSlash(photo.shotAt)}</div>` +
              (photo.memo?.trim() ? `<div style="word-break:break-all;">${cellText(photo.memo.trim())}</div>` : '') +
              `</div>`;
          }
          body.appendChild(cell);
        }

        page.appendChild(body);
        const footer = document.createElement('div');
        footer.style.cssText = 'flex:0 0 auto;font-size:9px;text-align:center;color:#555;padding-top:2mm;';
        footer.textContent = `${pageNo + 1} / ${totalPages}`;
        page.appendChild(footer);
        container.appendChild(page);
      }

      if (failed.length === photos.length) {
        setNotice('写真を描けませんでした。写真が壊れているか、このブラウザが読めない形式です。');
        return;
      }

      document.body.appendChild(container);
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      await html2pdf()
        .set({
          margin: 0,
          filename: `${safeForFilename(projectName) || '工事写真帳'}_${ymd(new Date())}.pdf`,
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css'] },
        })
        .from(container)
        .save();
      setNotice(
        failed.length
          ? `写真帳 PDF を保存しました。描けなかった写真: ${failed.join('、')}`
          : `写真帳 PDF（${totalPages} ページ・1 ページ ${perPage} 枚）を保存しました。`
      );
    } catch (error) {
      console.error('写真帳の作成に失敗しました', error);
      setNotice('写真帳の作成に失敗しました。写真の枚数を減らすか、ページを再読み込みしてやり直してください。');
    } finally {
      if (container.parentNode) container.parentNode.removeChild(container);
      setBusy('');
      setProgress({ done: 0, total: 0 });
    }
  };

  const fieldCls = 'w-full text-[10px] px-1.5 py-0.5 border border-gray-200 bg-white';

  return (
    <div className="w-full bg-white flex flex-col h-full lg:h-[calc(100vh-var(--nav-height))] overflow-hidden">
      <ToolHeader
        no="19"
        code="SITE PHOTO"
        title="工事写真"
        description="撮った写真を撮影日順に並べ、黒板を焼き込み、連番で名前を付けて写真帳 PDF にする。民間工事・社内記録・打合せ資料用。公共工事の提出写真には使わない(後から黒板を入れた写真は編集した写真の扱いになり、撮影日時などの Exif も消える。電子小黒板は改ざん検知に対応したアプリで撮影時に入れる)。元の写真は必ず手元に残す。ブラウザの中だけで処理する。"
        features={[
          {
            label: '写真を取り込む',
            hint: 'JPEG / PNG / HEIC。撮影日順に自動で並ぶ。並び順と説明はこのブラウザに残る',
            onClick: () => fileInputRef.current?.click(),
          },
          {
            label: '黒板の焼き込み',
            hint: '工事名・工種・撮影箇所・撮影日・施工者を写真の隅に入れる。入れずに書き出すこともできる',
            active: boardPosition !== 'none',
            onClick: () => scrollToPhotoRef(boardRef),
          },
          {
            label: '連番リネーム',
            hint: '撮影日_工種_001.jpg の形で名前を付け直す。開始番号も選べる',
            onClick: () => scrollToPhotoRef(boardRef),
          },
          {
            label: '縮小・Exif 削除',
            hint: '長辺を納品サイズに縮め、位置情報を消す',
            onClick: () => scrollToPhotoRef(imageRef),
          },
          {
            label: '写真の説明',
            hint: '写真ごとに 撮影日・工種・撮影箇所・内容／寸法 を書く。写真帳の説明欄に載る',
            onClick: () => scrollToPhotoRef(listRef),
          },
          {
            label: '写真帳 PDF（A4・3 枚＋説明欄）',
            hint: 'A4 縦に 3 枚、右に説明欄。2 列 × 2 段も選べる。ZIP でも書き出せる',
            onClick: () => scrollToPhotoRef(exportRef),
          },
        ]}
      />

      <div className="p-3 flex-1 min-h-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">

          {/* 左：取り込みと設定 */}
          <div className="space-y-3 min-h-0 overflow-y-auto pr-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed p-6 text-center cursor-pointer transition ${
                isDragging ? 'border-[#52AA96] bg-gray-50' : 'border-gray-400 hover:border-[#3b3b3b]'
              }`}
            >
              <FiImage className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[11px] mt-2 text-gray-600">現場写真をドラッグ＆ドロップ</p>
              <p className="text-[10px] mt-1 text-gray-400">JPEG / PNG / HEIC。撮影日順に自動で並びます</p>
              <button type="button" className="mt-2 text-[11px] text-gray-700 underline underline-offset-2">
                {photos.length > 0 ? '写真を追加' : '写真を選ぶ'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              />
            </div>

            <div ref={boardRef} className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3 scroll-mt-3">
              <div className="text-[11px] font-bold text-gray-600">黒板・ファイル名</div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1">工事名（物件）</label>
                {/* 物件の共通台帳から選ぶ。Myタスク・yymail などと同じ名前になる */}
                <ProjectPicker value={projectName} onChange={setProjectName} placeholder="○○邸新築工事" label="工事名" />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">工種</label>
                  <input type="text" value={defaultKind} onChange={(e) => setDefaultKind(e.target.value)}
                    placeholder="基礎配筋"
                    className="w-full p-1.5 text-[11px] border border-gray-300" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">施工者</label>
                  <input type="text" value={contractor} onChange={(e) => setContractor(e.target.value)}
                    placeholder="○○建設"
                    className="w-full p-1.5 text-[11px] border border-gray-300" />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">黒板の位置（ZIP）</label>
                  <select value={boardPosition} onChange={(e) => setBoardPosition(e.target.value as BoardPosition)}
                    className="w-full p-1.5 text-[11px] border border-gray-300 bg-white">
                    <option value="bottom-left">左下</option>
                    <option value="bottom-right">右下</option>
                    <option value="top-left">左上</option>
                    <option value="top-right">右上</option>
                    <option value="none">入れない</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-[10px] text-gray-500 mb-1">開始番号</label>
                  <input type="number" min={1} value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full p-1.5 text-[11px] border border-gray-300 text-right" />
                </div>
              </div>
            </div>

            <div ref={imageRef} className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3 scroll-mt-3">
              <div className="text-[11px] font-bold text-gray-600">画像</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 mb-1">長辺</label>
                  <select value={longSide} onChange={(e) => setLongSide(Number(e.target.value))}
                    className="w-full p-1.5 text-[11px] border border-gray-300 bg-white">
                    {LONG_SIDES.map((s) => (
                      <option key={s} value={s}>{s}px{s === 1920 ? '（納品でよく使う）' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="block text-[10px] text-gray-500 mb-1">画質 {quality}%</label>
                  <input type="range" min={50} max={100} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                書き出したファイルからは <strong>Exif（位置情報・撮影日時）が削除されます</strong>。
                撮影日は消える前に読み取って、ファイル名と黒板に入れます。写真はブラウザの中だけで処理され、どこにも送信しません。
                取り込んだ写真・並び順・説明は、このブラウザの中（IndexedDB）に残します。元の写真ファイルは書き換えません。
              </p>
            </div>

            <div ref={exportRef} className="bg-gray-50 p-4 border border-[#3b3b3b] space-y-3 scroll-mt-3">
              <div className="text-[11px] font-bold text-gray-600">書き出し</div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">写真帳の形</label>
                <select value={albumLayout} onChange={(e) => setAlbumLayout(e.target.value as AlbumLayout)}
                  className="w-full p-1.5 text-[11px] border border-gray-300 bg-white">
                  <option value="a4-3">A4 縦・3 枚（右に説明欄：撮影日・工種・撮影箇所・内容／寸法）</option>
                  <option value="a4-4">A4 縦・4 枚（2 列 × 2 段・写真の下に短い説明）</option>
                </select>
              </div>
              <label className="flex items-start gap-1.5 text-[10px] text-gray-600">
                <input type="checkbox" className="mt-0.5" checked={albumBoard} onChange={(e) => setAlbumBoard(e.target.checked)} />
                <span>写真帳の写真にも黒板を焼き込む（外すと写真はそのまま貼り、黒板の内容は説明欄にだけ載せる）</span>
              </label>
              <label className="flex items-start gap-1.5 text-[10px] text-gray-600">
                <input type="checkbox" className="mt-0.5" checked={zipOriginal} onChange={(e) => setZipOriginal(e.target.checked)} />
                <span>ZIP は元の写真のまま（名前だけ連番。縮小・黒板・Exif 削除をしない。HEIC は HEIC のまま）</span>
              </label>
              <div className="flex gap-2">
                <button onClick={exportZip} disabled={photos.length === 0 || !!busy}
                  className="yy-btn flex-1 !py-2 flex items-center justify-center gap-1">
                  <FiDownload className="w-3.5 h-3.5" /> ZIPで書き出し
                </button>
                <button onClick={exportAlbum} disabled={photos.length === 0 || !!busy}
                  className="yy-btn yy-btn--primary flex-1 !py-2 flex items-center justify-center gap-1">
                  <FiFileText className="w-3.5 h-3.5" /> 写真帳PDF
                </button>
              </div>
            </div>
            {busy && (
              <p className="yy-mono text-[10px] tracking-[0.08em] text-gray-600" role="status">
                {busy}{progress.total > 0 ? ` ${progress.done}/${progress.total}` : ''}
              </p>
            )}
            {notice && !busy && (
              <p className="text-[11px] text-gray-600 border-l border-[#52aa96] pl-2" role="status">{notice}</p>
            )}
            {!storageOk && !busy && (
              <p className="text-[10px] text-gray-500">このブラウザでは作業を保存できていません（プライベートモード・空き容量不足など）。閉じる前に書き出してください。</p>
            )}
          </div>

          {/* 右：取り込んだ写真と説明 */}
          <div
            ref={listRef}
            // 写真の一覧にファイルを落としても取り込む（以前はブラウザがその写真を開いてしまった）
            onDragOver={(e) => {
              if (!dragId && e.dataTransfer.types.includes('Files')) e.preventDefault();
            }}
            onDrop={(e) => {
              if (dragId || e.dataTransfer.files.length === 0) return;
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="bg-gray-50 border border-[#3b3b3b] p-4 flex flex-col h-full min-h-0 scroll-mt-3"
          >
            <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
              <span className="text-[11px] font-bold text-gray-600">
                取り込んだ写真 {photos.length > 0 && <span className="yy-mono font-normal text-gray-400 ml-1">{String(photos.length).padStart(3, '0')}</span>}
              </span>
              {photos.length > 0 && (
                <span className="flex items-center gap-3">
                  {!isDateOrdered(photos) && (
                    <button onClick={sortByDate} className="text-[10px] text-gray-600 underline underline-offset-2">撮影日順に並べ直す</button>
                  )}
                  <button onClick={() => void clearWork()} className="text-[10px] text-gray-500 hover:text-red-600 underline underline-offset-2">作業をクリア</button>
                </span>
              )}
            </div>

            {photos.length === 0 ? (
              <p className="text-[11px] text-gray-500">
                写真を追加すると、撮影日順に付け直した名前で並びます。並べ替え（つかんで動かす・▲▼）と説明は、このブラウザに残ります。{' '}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="underline underline-offset-2 text-gray-800">写真を選ぶ</button>
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(photo.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/x-yy-photo', photo.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => {
                      if (dragId) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      const from = photos.findIndex((p) => p.id === dragId);
                      movePhoto(from, index);
                      setDragId(null);
                    }}
                    className={`bg-white border p-2 flex items-start gap-2 ${dragId === photo.id ? 'border-[#52AA96] opacity-60' : 'border-gray-200'}`}
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.previewUrl} alt="" className="w-20 h-20 object-cover border border-gray-200 cursor-grab" title="つかんで並べ替え" />
                      <div className="flex gap-1">
                        <button onClick={() => movePhoto(index, index - 1)} disabled={index === 0}
                          className="text-gray-400 hover:text-gray-800 disabled:opacity-30" title="前へ" aria-label="前へ">
                          <FiChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => movePhoto(index, index + 1)} disabled={index === photos.length - 1}
                          className="text-gray-400 hover:text-gray-800 disabled:opacity-30" title="後ろへ" aria-label="後ろへ">
                          <FiChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[11px] font-bold text-gray-700 truncate">{fileNameFor(photo, index)}</div>
                      <div className="flex gap-1">
                        <input
                          type="date"
                          value={ymdDash(photo.shotAt)}
                          aria-label="撮影日"
                          onChange={(e) => {
                            const [y, m, d] = e.target.value.split('-').map(Number);
                            if (!y || !m || !d) return;
                            const next = new Date(photo.shotAt);
                            next.setFullYear(y, m - 1, d);
                            updatePhoto(photo.id, { shotAt: next });
                          }}
                          className={`${fieldCls} yy-mono !w-32 shrink-0`}
                        />
                        {/* 1枚だけ工種が違うことは普通にあるので、個別に上書きできるようにする */}
                        <input
                          type="text"
                          value={photo.kind ?? ''}
                          onChange={(e) => updatePhoto(photo.id, { kind: e.target.value })}
                          placeholder={defaultKind ? `工種（既定: ${defaultKind}）` : '工種'}
                          aria-label="工種"
                          className={fieldCls}
                        />
                      </div>
                      <input
                        type="text"
                        value={photo.place ?? ''}
                        onChange={(e) => updatePhoto(photo.id, { place: e.target.value })}
                        placeholder="撮影箇所（X1-Y2 通り 基礎梁 など）"
                        aria-label="撮影箇所"
                        className={fieldCls}
                      />
                      <textarea
                        value={photo.memo ?? ''}
                        onChange={(e) => updatePhoto(photo.id, { memo: e.target.value })}
                        placeholder="内容・寸法（D13@200 かぶり 60 など）"
                        aria-label="内容・寸法"
                        rows={2}
                        className={`${fieldCls} resize-y`}
                      />
                    </div>
                    <button onClick={() => removePhoto(photo.id)}
                      className="text-gray-400 hover:text-red-600 shrink-0" title="この写真を外す">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** 写真帳は innerHTML で組むので、工事名などをそのまま入れない。 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default ConstructionPhotos;
