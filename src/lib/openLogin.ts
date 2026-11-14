/**
 * ツールの中から「ログイン画面を開く」ための頼み。
 *
 * ツールのコンポーネントは MainLayout の handleMenuClick を props で受け取っていない。
 * MainLayout は 'yaneyuka-navigate' イベントを受けて handleMenuClick(page) を呼ぶので、それを使う。
 * 左カラムの「ログイン」を押したときと同じ画面が開く。
 */
/** ログインし終えたら戻る画面（?m=… のクエリ）。MainLayout がログイン成功時に読んで消す */
export const LOGIN_RETURN_KEY = 'yy-login-return';

export const openLogin = () => {
  try {
    // ツールから来たときは、ログイン後にそのツールへ戻す（以前はホームへ飛んでいた）
    if (window.location.search) sessionStorage.setItem(LOGIN_RETURN_KEY, window.location.search);
  } catch {
    /* sessionStorage が使えなくてもログインは開く */
  }
  try {
    window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'login' }));
  } catch {
    /* SSR では何もしない */
  }
};
