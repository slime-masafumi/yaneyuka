/**
 * 左カラムから「中央のどのツールを開くか」を渡すための小さな受け渡し。
 *
 * 対象コンポーネント（DesignTools / GeneralTools）は、どれを開いているかを
 * 自分の state で持っていて props を取らない。MainLayout 側に状態を増やさずに
 * 指定だけ渡したいので、次の2経路を用意する。
 *
 *   - モジュール変数 … まだマウントされていないとき（左カラムで開く直前に置く）
 *   - window イベント … すでにマウントされているとき（別のツールに切り替える）
 *
 * 使う側は createToolNav() を呼んで、その3つの関数を export する。
 */
export type ToolNav<T> = {
  /** 左カラムから呼ぶ。onMenuClick(...) の直前に実行すること。 */
  request: (target: T) => void;
  /** 対象コンポーネントのマウント時に1回だけ呼ぶ。読んだら消える。 */
  consume: () => T | null;
  /** マウント済みのときに切替を受け取る。戻り値は解除関数。 */
  subscribe: (handler: (target: T) => void) => () => void;
};

export function createToolNav<T>(eventName: string): ToolNav<T> {
  let pending: T | null = null;

  return {
    request(target: T) {
      pending = target;
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: target }));
      } catch {
        /* SSR / 非対応環境では何もしない */
      }
    },

    consume() {
      const value = pending;
      pending = null;
      return value;
    },

    subscribe(handler) {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent).detail as T | undefined;
        if (detail) handler(detail);
      };
      window.addEventListener(eventName, listener);
      return () => window.removeEventListener(eventName, listener);
    },
  };
}
