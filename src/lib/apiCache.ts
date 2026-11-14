/**
 * 一覧の API(NEWS・新製品・イベント)の応答を、ページを開いている間だけ覚えておく。
 *
 * 左メニューを押したら中央がすぐ出るように(2026-11-14):
 *   - 最初のページを出したあと、手が空いたときに prefetchApi() で先に取っておく(MainLayout)
 *   - 各画面は getJson() で読む。取ってあればその場で返す(待ち 0)。古ければ裏で取り直す
 * 同じ URL は末尾の / の有無を同じものとして扱う(/api/news と /api/news/)。
 */
type Entry = { at: number; data?: unknown; pending?: Promise<unknown> };
const store = new Map<string, Entry>();
const FRESH_MS = 5 * 60_000;

const key = (url: string) => {
  const [path, q] = url.split('?');
  return (path.endsWith('/') ? path : `${path}/`) + (q ? `?${q}` : '');
};

function load(url: string): Promise<unknown> {
  const k = key(url);
  const e = store.get(k);
  if (e?.pending) return e.pending;
  const pending = fetch(k, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
    .then((data) => {
      store.set(k, { at: Date.now(), data });
      return data;
    })
    .catch((err) => {
      store.set(k, { at: e?.at ?? 0, data: e?.data });
      throw err;
    });
  store.set(k, { at: e?.at ?? 0, data: e?.data, pending });
  return pending;
}

/** 取ってあればそれ(古ければ裏で取り直す)、無ければ取りに行く */
export function getJson<T>(url: string): Promise<T> {
  const e = store.get(key(url));
  if (e?.data !== undefined) {
    if (Date.now() - e.at > FRESH_MS && !e.pending) load(url).catch(() => {});
    return Promise.resolve(e.data as T);
  }
  return load(url) as Promise<T>;
}

/** 取ってあるものをその場で(無ければ undefined)。最初の描画で「読み込み中」を出さないために使う */
export function peekJson<T>(url: string): T | undefined {
  return store.get(key(url))?.data as T | undefined;
}

/** 先に取っておく(失敗しても何もしない) */
export function prefetchApi(urls: string[]) {
  for (const u of urls) {
    const e = store.get(key(u));
    if (e?.data !== undefined || e?.pending) continue;
    load(u).catch(() => {});
  }
}
