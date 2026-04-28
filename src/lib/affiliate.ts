export function decorateAffiliateLink(rawUrl: string): string {
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return rawUrl;
  try {
    const url = new URL(rawUrl);
    // Amazon Associates: ?tag=xxxxx-22
    if (url.hostname.endsWith('amazon.co.jp')) {
      const tag = process.env.NEXT_PUBLIC_AMAZON_TAG;
      if (tag && !url.searchParams.has('tag')) {
        url.searchParams.set('tag', tag);
      }
      return url.toString();
    }
    // Rakuten Affiliate: 既に発行済みのアフィリエイトURLはそのまま使用
    if (url.hostname.includes('rakuten.co.jp') || url.hostname.includes('hb.afl.rakuten.co.jp')) {
      return url.toString();
    }
    // Yahoo!ショッピング・PayPayモールは個別の発行URLをそのまま使用
    return url.toString();
  } catch {
    return rawUrl;
  }
}

// 画像取得ポリシー：Amazon商品画像はPA-API経由が原則
// 実運用ではサーバ側でPA-APIを叩き、ここではそのプロキシを呼ぶ
export async function fetchAmazonItemImage(asin: string): Promise<string | null> {
  try {
    const endpoint = process.env.NEXT_PUBLIC_AMAZON_PROXY_ENDPOINT;
    if (!endpoint) return null;
    const res = await fetch(`${endpoint}?asin=${encodeURIComponent(asin)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.imageUrl as string) || null;
  } catch {
    return null;
  }
}


