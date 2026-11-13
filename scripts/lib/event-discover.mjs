// 展示会場の開催予定から、建築・建設に関係するイベントを見つける(scripts/update-events.mjs が週次で使う)。
//
// 以前の events.json は手で登録した 14 件だけで、新しい展示会は人が足さない限り増えなかった。
// 会場が公開している開催予定を読み、題・説明に建築系の語があるものを足す。
//   東京ビッグサイト … /visitor/event/search.php?page=N(1 件ずつ article.lyt-event-01)
//   幕張メッセ       … /event/?page=N(li.eventInr。リンク先は会場の詳細ページ)
// どちらも robots.txt での制限は無い(2026-11-14 確認)。読むのは週 1 回、各数ページだけ。
import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (compatible; yaneyuka-eventbot/1.0; +https://yaneyuka.com/)';

/** 建築・建設・住まい・設備に関係するイベントの語(題か説明に含む) */
export const ARCH_WORDS = /建築|建材|住宅|住まい|建設|リフォーム|リノベ|インテリア|照明|ライティング|空調|冷凍|設備|ビル|不動産|BIM|CAD|土木|測量|防災|ファシリティ|メンテナンス|エクステリア|ガーデン|木材|木造|塗料|塗装|防水|店舗|商空間|オフィス|スマートシティ|まちづくり|都市|インフラ|省エネ|太陽光|断熱|ZEB|ZEH|JAPAN BUILD|JAPAN SHOP|HCJ|ジャパンホーム/;
/** 建築系の語を含んでも対象外(就職・資格予備校・物販の催事など) */
const EXCLUDE = /インターンシップ|就職|採用|合同説明会|キャリア|同人|コミック|ゲーム|アニメ|アイドル|ライブ|コンサート|即売会|物産展|ペット|ブライダル|学会|学術大会|総会|介護|ケアウィーク|CareTEX|医療|通信技術/;

async function fetchText(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 25000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers: { 'User-Agent': UA } });
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

const strip = (s) => s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, '').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** 「2026年11月14日（土）～2026年11月15日（日）」「2026.11.12(木) 〜 2026.11.14(土)」から開始日と終了日 */
function period(text) {
  const ds = [...text.matchAll(/(20\d{2})[年.](\d{1,2})[月.](\d{1,2})/g)].map((m) => iso(+m[1], +m[2], +m[3]));
  if (!ds.length) return null;
  return { start: ds[0], end: ds[ds.length - 1] };
}

function dateText(start, end) {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  if (start === end) return `${sy}年${sm}月${sd}日`;
  if (sy !== ey) return `${sy}年${sm}月${sd}日～${ey}年${em}月${ed}日`;
  return sm === em ? `${sy}年${sm}月${sd}日～${ed}日` : `${sy}年${sm}月${sd}日～${em}月${ed}日`;
}

async function bigsight() {
  const out = [];
  for (let page = 1; page <= 8; page++) {
    const html = await fetchText(`https://www.bigsight.jp/visitor/event/search.php?page=${page}`);
    const blocks = html.split('<article class="lyt-event-01">').slice(1);
    if (!blocks.length) break;
    for (const b of blocks) {
      const h = b.match(/<h3[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!h) continue;
      const title = strip(h[2]);
      const desc = strip(b.match(/<\/h3>\s*<p>([\s\S]*?)<\/p>/)?.[1] || '');
      const img = b.match(/<img src="([^"]+)"/)?.[1] || '';
      const hall = strip(b.match(/利用施設<\/dt>\s*<dd>([\s\S]*?)<\/dd>/)?.[1] || '');
      const p = period(b.match(/開催期間<\/dt>\s*<dd>([\s\S]*?)<\/dd>/)?.[1] || '');
      if (!p) continue;
      out.push({
        title, desc, link: new URL(h[1], 'https://www.bigsight.jp/').toString(),
        image: img ? new URL(img, 'https://www.bigsight.jp/').toString() : '',
        venue: `東京ビッグサイト${hall ? ` ${hall}` : ''}`, region: 'tokyo', from: 'bigsight', ...p,
      });
    }
  }
  return out;
}

async function makuhari() {
  const out = [];
  for (let page = 1; page <= 6; page++) {
    const html = await fetchText(`https://www.m-messe.co.jp/event/?page=${page}`);
    const blocks = html.split('<li class="eventInr clear">').slice(1);
    if (!blocks.length) break;
    for (const b of blocks) {
      const href = b.match(/<a href="([^"]+)"/)?.[1];
      const title = strip(b.match(/class="eventTit">([\s\S]*?)<\/div>/)?.[1] || '');
      const cat = strip(b.match(/class="category">([\s\S]*?)<\/div>/)?.[1] || '');
      const img = b.match(/<img src="([^"]+)"/)?.[1] || '';
      const p = period(b.match(/class="date">([\s\S]*?)<\/div>/)?.[1] || '');
      if (!href || !title || !p) continue;
      out.push({
        title, desc: cat, link: new URL(href, 'https://www.m-messe.co.jp/').toString(),
        image: img ? new URL(img, 'https://www.m-messe.co.jp/').toString() : '',
        venue: '幕張メッセ', region: 'chiba', from: 'makuhari', ...p,
      });
    }
  }
  return out;
}

/** 題の比べ方: 空白・年号・括弧の中を外す */
const norm = (s) => s.replace(/[（(][^）)]*[）)]/g, '').replace(/20\d{2}|第\d+回/g, '').replace(/[\s　・\-–—:：]/g, '').toLowerCase();

/**
 * 会場の開催予定から足す。既にある(同じリンク、または題が似ていて開始日が 3 日以内)ものは足さない。
 * 終わってから 30 日たった自動登録分は消す(手で登録したものは消さない)。
 * 戻り値: { added: 追加した題の一覧, removed: 消した件数, scanned: 読んだ件数 }
 */
export async function discoverEvents(events, today) {
  const found = [...(await bigsight()), ...(await makuhari())];
  const near = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) <= 3 * 86_400_000;
  const added = [];
  for (const f of found) {
    if (f.end < today) continue;
    if (!ARCH_WORDS.test(`${f.title} ${f.desc}`) || EXCLUDE.test(`${f.title} ${f.desc}`)) continue;
    const n = norm(f.title);
    // 手で登録した展示会と同じ会場・同じ会期なら、その「同時開催」として名前だけ足す
    // (JAPAN BUILD の構成展 10 本などが別々の行に並ばないように)
    const base = f.venue.split(' ')[0];
    const host = events.find((e) => !e.discovered && e.startDate === f.start && e.endDate === f.end && (e.venue || '').startsWith(base));
    if (host) {
      const name = f.title.replace(/[（(][^）)]*[）)]/g, '').trim();
      host.coShows = [...new Set([...(host.coShows || []), name])];
      continue;
    }
    const dup = events.some((e) => e.link === f.link || ((norm(e.title).includes(n.slice(0, 6)) || n.includes(norm(e.title).slice(0, 6))) && near(e.startDate, f.start)));
    if (dup) continue;
    const id = `auto-${f.from}-${crypto.createHash('sha1').update(f.link + f.start).digest('hex').slice(0, 10)}`;
    events.push({
      id,
      title: f.title,
      description: f.desc,
      dateText: dateText(f.start, f.end),
      startDate: f.start,
      endDate: f.end,
      venue: f.venue,
      region: f.region,
      link: f.link,
      isLinkActive: true,
      ...(f.image ? { image: f.image } : {}),
      discovered: f.from,
    });
    added.push(`${f.start}  ${f.title}(${f.venue})`);
  }
  const cutoff = new Date(Date.parse(today) - 30 * 86_400_000).toISOString().slice(0, 10);
  const before = events.length;
  const kept = events.filter((e) => !(e.discovered && e.endDate && e.endDate < cutoff));
  events.splice(0, events.length, ...kept);
  return { added, removed: before - kept.length, scanned: found.length };
}
