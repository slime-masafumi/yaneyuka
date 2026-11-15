/**
 * 建材メーカーの「会社のサイト」のホスト。2026-11-15
 * 商品ページ(無ければ営業所・問い合わせ)の URL から取る。フォーム・電子カタログ置き場など、
 * 会社のサイトでないホストは飛ばす。シンボルの対応表 src/data/maker-icons.json のキー
 * (scripts/collect-maker-icons.ts が作る)と、表の描画(MakerRows.tsx)の両方で使う。
 */
const NOT_COMPANY = /docs\.google\.com|forms\.gle|catalog-?(adv|search)|ebook|digital-?catalog|actibook|meclib/i;

export function makerHost(m: { products?: string; office?: string; contact?: string }): string {
  for (const u of [m.products, m.office, m.contact]) {
    if (!u) continue;
    try {
      const h = new URL(u).hostname;
      if (NOT_COMPANY.test(h)) continue;
      return h;
    } catch {
      /* 次へ */
    }
  }
  return '';
}
