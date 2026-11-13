import type { UserpageTarget } from './userpageUrl';

/**
 * ページ本文(ホームなど MainLayout の children)から、左カラムの画面(ツールなど)を開くための橋。
 * children は MainLayout の handleMenuClick を受け取れないので、イベントで頼む。
 * MainLayout が 'yy:open-screen' を聞いて、左カラムから押したときと同じ手順で開く。
 */
export const OPEN_SCREEN_EVENT = 'yy:open-screen';

export function openScreen(target: UserpageTarget) {
  window.dispatchEvent(new CustomEvent<UserpageTarget>(OPEN_SCREEN_EVENT, { detail: target }));
}

/** a の href に使う URL(JS が無い・新しいタブで開くときもこの URL で同じ画面になる) */
export function screenHref(target: UserpageTarget): string {
  const p = new URLSearchParams({ m: target.menu });
  if (target.tool) p.set('t', target.tool);
  if (target.category) p.set('c', target.category);
  if (target.sub) p.set('s', target.sub);
  return `/?${p.toString()}`;
}
