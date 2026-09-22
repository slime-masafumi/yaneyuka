import { lookup } from 'dns/promises';

/**
 * 「ユーザーが指定した URL をサーバーが取りに行く」ための共通の関門。
 *
 * この形は放っておくと踏み台（SSRF）になる。社内ネットワークやクラウドの
 * メタデータ endpoint を、サーバーに代わりに叩かせることができてしまう。
 * 同じ危険が別の API でも繰り返されないよう、判定と取得をここに集める。
 *
 * 通す条件:
 *   - https のみ（http・file・gopher 等は弾く）
 *   - 名前解決した IP が私有・ループバック・リンクローカル・CGNAT なら弾く
 *     （ホスト名だけで判断すると、内部アドレスを指す外部ドメインで抜けられる）
 *   - リダイレクトは追わない（追った先で上の判定をすり抜けられるため）
 *   - 時間と大きさに上限を置く
 *
 * 呼び出し側へはステータスや内部のエラーを細かく返さない。
 * 応答の違いだけで内部ネットワークの地図を描かれるのを避けるため。
 */

/** 私有・ループバック・リンクローカル・共有アドレス帯か。 */
export function isBlockedAddress(ip: string, family: number): boolean {
  if (family === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    // ユニークローカル fc00::/7 とリンクローカル fe80::/10
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;
    // IPv4 射影（::ffff:10.0.0.1 など）は中の v4 で判定する
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1], 4);
    return false;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 0) return true;                   // 0.0.0.0/8
  if (a === 10) return true;                  // 私有
  if (a === 127) return true;                 // ループバック
  if (a === 169 && b === 254) return true;    // リンクローカル（クラウドのメタデータ）
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true;                  // マルチキャスト・予約
  return false;
}

export type UrlCheck =
  | { ok: true; url: URL }
  | { ok: false; error: string; status: number };

/** 取りに行ってよい URL かを調べる。名前解決まで済ませる。 */
export async function checkExternalUrl(raw: string | null): Promise<UrlCheck> {
  if (!raw) return { ok: false, error: 'url を指定してください', status: 400 };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: 'URL の形式が正しくありません', status: 400 };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'https の URL だけ読み込めます', status: 400 };
  }

  try {
    const addresses = await lookup(parsed.hostname, { all: true });
    if (addresses.length === 0) {
      return { ok: false, error: 'ホストが見つかりません', status: 400 };
    }
    if (addresses.some((a) => isBlockedAddress(a.address, a.family))) {
      return { ok: false, error: 'この宛先は読み込めません', status: 400 };
    }
  } catch {
    return { ok: false, error: 'ホストが見つかりません', status: 400 };
  }

  return { ok: true, url: parsed };
}

/**
 * 本文を文字に直す。
 *
 * 建築・建材のサイトは古いものが多く、Shift_JIS や EUC-JP がまだ現役。
 * UTF-8 決め打ちで読むとタイトルが化けるので、文字コードを見てから直す。
 * 見る順番は Content-Type ヘッダ → HTML 中の meta。
 */
export function decodeBody(bytes: Uint8Array, contentType: string | null): string {
  const fromHeader = contentType?.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1];

  const decodeWith = (label: string) => {
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      return null;
    }
  };

  if (fromHeader && !/^utf-?8$/i.test(fromHeader)) {
    const decoded = decodeWith(fromHeader);
    if (decoded !== null) return decoded;
  }

  // ヘッダに無い場合。まず UTF-8 で読んで、HTML 側の宣言を確かめる。
  // ASCII 部分はどの日本語コードでも同じなので、meta タグは読み取れる。
  const asUtf8 = decodeWith('utf-8') ?? '';
  const fromMeta =
    asUtf8.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1] ??
    asUtf8.match(/<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([\w-]+)/i)?.[1];

  if (fromMeta && !/^utf-?8$/i.test(fromMeta)) {
    const decoded = decodeWith(fromMeta);
    if (decoded !== null) return decoded;
  }

  return asUtf8;
}

export type FetchResult =
  | { ok: true; text: string; status: number }
  | { ok: false; error: string; status: number };

/**
 * 関門を通してから取得する。
 * maxBytes を超えたぶんは読まずに捨てる（本文全部をメモリに載せない）。
 */
export async function fetchExternalText(
  raw: string | null,
  options: { timeoutMs?: number; maxBytes?: number; accept?: string } = {},
): Promise<FetchResult> {
  const { timeoutMs = 10_000, maxBytes = 2 * 1024 * 1024, accept = '*/*' } = options;

  const checked = await checkExternalUrl(raw);
  if (!checked.ok) return { ok: false, error: checked.error, status: checked.status };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(checked.url.toString(), {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        Accept: accept,
        // 名乗らないと弾くサイトがあるので、素性を明かして名乗る
        'User-Agent': 'yaneyuka-link-bot/1.0 (+https://yaneyuka.com)',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      return { ok: false, error: '転送される URL は読み込めません', status: 400 };
    }
    if (!res.ok) {
      return { ok: false, error: '取得できませんでした', status: res.status };
    }

    const declared = Number(res.headers.get('content-length') || 0);
    if (declared > maxBytes) {
      return { ok: false, error: '大きすぎます', status: 413 };
    }

    // content-length が無い相手もいるので、読みながら打ち切る
    const reader = res.body?.getReader();
    if (!reader) {
      const buffer = new Uint8Array(await res.arrayBuffer());
      return buffer.length > maxBytes
        ? { ok: false, error: '大きすぎます', status: 413 }
        : { ok: true, text: decodeBody(buffer, res.headers.get('content-type')), status: res.status };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const merged = new Uint8Array(total > maxBytes ? maxBytes : total);
    let offset = 0;
    for (const chunk of chunks) {
      if (offset + chunk.length > merged.length) break;
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return {
      ok: true,
      text: decodeBody(merged, res.headers.get('content-type')),
      status: res.status,
    };
  } catch {
    return { ok: false, error: '取得できませんでした', status: 502 };
  } finally {
    clearTimeout(timer);
  }
}
