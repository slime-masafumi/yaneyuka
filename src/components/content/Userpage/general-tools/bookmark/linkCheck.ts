/**
 * ブックマークのリンク確認（/api/link-preview）を呼ぶ側の道具。
 * 結果は各ブックマークの Firestore ドキュメントに書く（linkStatus / linkCheckedAt ほか）。
 * 以前は画面の中だけに持っていて、閉じると消え、毎回全部確かめ直していた。
 */
import { normalizeUrl } from './url';

export type LinkState = 'ok' | 'redirect' | 'broken' | 'unknown';

export type LinkCheckResult = {
  linkStatus: LinkState;
  linkCheckedAt: number;
  /** 転送先（redirect のときだけ） */
  linkFinalUrl: string;
  /** 切れた・確かめられなかった理由（ok のときは空） */
  linkError: string;
};

/** 開いたときに自動で確かめる間隔と、1 回に確かめる上限 */
export const RECHECK_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTO_CHECK_LIMIT = 20;

const CLIENT_TIMEOUT_MS = 15_000;

/** 1 件確かめる。失敗しても投げない（unknown を返す）。再試行はしない */
export async function checkLink(rawUrl: string): Promise<LinkCheckResult> {
  const now = Date.now();
  const url = normalizeUrl(rawUrl);
  if (!url) return { linkStatus: 'unknown', linkCheckedAt: now, linkFinalUrl: '', linkError: 'URL が空です' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/link-preview/?url=${encodeURIComponent(url)}&check=1`, { signal: controller.signal });
    const data = (await res.json()) as { state?: LinkState; finalUrl?: string; error?: string; alive?: boolean };
    const state: LinkState = data?.state ?? (data?.alive ? 'ok' : 'unknown');
    return {
      linkStatus: state,
      linkCheckedAt: now,
      linkFinalUrl: state === 'redirect' ? data.finalUrl || '' : '',
      linkError: state === 'ok' || state === 'redirect' ? '' : data?.error || '',
    };
  } catch {
    return { linkStatus: 'unknown', linkCheckedAt: now, linkFinalUrl: '', linkError: '確認できませんでした' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * まとめて確かめる。相手のサーバーやこちらの API に一気に投げないよう、少しずつ。
 * shouldStop が true を返したら（画面を閉じた等）、残りは確かめない。
 */
export async function checkLinks<T extends { id: string; url: string }>(
  items: T[],
  onResult: (item: T, result: LinkCheckResult) => void | Promise<void>,
  options: { concurrency?: number; shouldStop?: () => boolean } = {},
): Promise<void> {
  const { concurrency = 3, shouldStop } = options;
  const queue = [...items];
  const worker = async () => {
    while (queue.length) {
      if (shouldStop?.()) return;
      const item = queue.shift();
      if (!item) return;
      const result = await checkLink(item.url);
      if (shouldStop?.()) return;
      await onResult(item, result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}
