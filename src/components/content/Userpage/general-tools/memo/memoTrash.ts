/**
 * メモのゴミ箱（2026-11-16）。
 *
 * 以前は「削除」で即座に消え、取り返せなかった（ログイン中は Firestore から、未ログインはこのブラウザから）。
 * 削除したメモは 30 日ゴミ箱に置き、その間は元に戻せる。30 日を過ぎたものは開いたときに片付ける。
 *   ログイン中 … users/{uid}/memoTrash/{id}（本人だけが読み書き。既存のルール users/{uid}/{document=**}）
 *   未ログイン … このブラウザ（localStorage 'yy-guest-memo-trash'）
 * ここは画面から切り離した計算だけ（node でも読める）。
 */

export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** ゴミ箱に入れてから 30 日を過ぎたか */
export const isExpired = (deletedAt: number, now: number = Date.now()) => now - deletedAt >= TRASH_DAYS * DAY;

/** あと何日で消えるか（今日中に消えるものは 0） */
export const daysLeftInTrash = (deletedAt: number, now: number = Date.now()) =>
  Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY - now) / DAY) - 1);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * ひな形の「物件名」見出しの下の空行に物件名を入れる（現場巡回記録・是正指示）。
 * 見出しが無いひな形はそのまま返す。
 */
export function fillProjectName(html: string, name: string): string {
  const n = name.trim();
  if (!n) return html;
  return html.replace('<p><strong>物件名</strong></p><p><br></p>', `<p><strong>物件名</strong></p><p>${esc(n)}</p>`);
}
