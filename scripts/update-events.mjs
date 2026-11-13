// 展示会の公式サイトから会期を読み取り、src/data/events.json を更新する。
//   node scripts/update-events.mjs [--dry-run]
//   .github/workflows/update-events.yml が週次で実行
//
// 展示会サイトの URL は年をまたいでも変わらないことが多いので（例: messe.nikkei.co.jp/ac/）、
// 同じ URL を読み直すだけで翌年の会期を拾える。実際 2026-08 時点で
// 建築・建材展のページには既に 2027 年の会期が出ていた。
//
// 会期が過ぎたまま放置されていた（15 件中 9 件）のがこの仕組みを入れた理由。
// 表示側は endDate で足切りするので、ここが動かなくても古い情報は出ない。

import fs from 'node:fs';
import { discoverEvents } from './lib/event-discover.mjs';

const FILE = 'src/data/events.json';
const TIMEOUT_MS = 25000;
const UA = 'Mozilla/5.0 (compatible; yaneyuka-eventbot/1.0; +https://yaneyuka.com/)';

const dryRun = process.argv.includes('--dry-run');

async function fetchText(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const toIso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * 「2027年3月2日(火)～5日(金)」「2027年5月26日(水)～28日(金)」といった表記から会期を取る。
 * 開始日しか書かれていない場合は終了日を開始日と同じにする。
 */
/**
 * ページに埋め込まれた機械可読な会期を読む。
 * "startDate":"2026-08-26 10:00","endDate":"2026-08-28 17:00" の形で入っている。
 * 本文から日付を拾うと姉妹展の会期を掴んでしまうので、これがあれば最優先で使う。
 */
function extractStructuredPeriod(html) {
  const s = html.match(/"startDate"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  const e = html.match(/"endDate"\s*:\s*"(\d{4}-\d{2}-\d{2})/);
  if (!s) return null;
  return { start: s[1], end: e ? e[1] : s[1], structured: true };
}

/**
 * 公式ページの og:image(SNS で共有されたときに出る画像)を、一覧に添える写真として拾う。
 * 相対パスは絶対化し、http は https に寄せる。取れなければ ''。
 */
function extractImage(html, pageUrl) {
  const meta = (key) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i'))?.[1] ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, 'i'))?.[1] ||
    '';
  const raw = meta('og:image(?::secure_url|:url)?') || meta('twitter:image(?::src)?');
  if (!raw) return '';
  try {
    const u = new URL(raw.replace(/&amp;/g, '&').trim(), pageUrl);
    if (u.protocol === 'http:') u.protocol = 'https:';
    if (u.protocol !== 'https:' || /\.(svg|ico)$/i.test(u.pathname)) return '';
    return u.toString();
  } catch {
    return '';
  }
}

function extractPeriod(html) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#x?[0-9a-f]+;/gi, ' ').replace(/\s+/g, ' ');
  const candidates = [];

  // 年月日 ～ 日（同月内）
  for (const m of text.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日[^0-9]{0,8}[〜~～-]\s*(\d{1,2})日/g)) {
    candidates.push({ start: toIso(+m[1], +m[2], +m[3]), end: toIso(+m[1], +m[2], +m[4]) });
  }
  // 年月日 ～ 月日（月をまたぐ）
  for (const m of text.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日[^0-9]{0,8}[〜~～-]\s*(\d{1,2})月\s*(\d{1,2})日/g)) {
    candidates.push({ start: toIso(+m[1], +m[2], +m[3]), end: toIso(+m[1], +m[4], +m[5]) });
  }
  // 「2027年6月23日(水)・24日(木)・25日(金)・26日(土)」のように中黒で日を並べる書式。
  // 〜で結ばないので範囲の正規表現に掛からず、単日として拾われて会期が縮んでいた。
  for (const m of text.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*\([^)]*\))?((?:\s*[・､、]\s*\d{1,2}日(?:\s*\([^)]*\))?)+)/g)) {
    const days = [...m[4].matchAll(/(\d{1,2})日/g)].map((x) => +x[1]);
    const last = days[days.length - 1];
    candidates.push({ start: toIso(+m[1], +m[2], +m[3]), end: toIso(+m[1], +m[2], last) });
  }

  // 単日
  for (const m of text.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)) {
    candidates.push({ start: toIso(+m[1], +m[2], +m[3]), end: toIso(+m[1], +m[2], +m[3]) });
  }

  if (!candidates.length) return null;

  // 今日以降で最も早いもの＝次回開催とみなす。
  // ページ内には過去回の実績も載っているため、単純な最初の一致では拾えない。
  const today = new Date().toISOString().slice(0, 10);
  // 同じ開始日でも、書式によって「4日間」と「単日」の両方が候補に挙がる。
  // 会期を縮めてしまわないよう、開始日が同じなら終了日が遅い方を採る。
  const future = candidates
    .filter((c) => c.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
  return future[0] || null;
}

async function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const events = data.events || [];
  const today = new Date().toISOString().slice(0, 10);

  const review = [];
  let updated = 0;
  let unreachable = 0;
  let expired = 0;
  let imaged = 0;

  for (const ev of events) {
    if (!ev.link) continue;
    // 会場の開催予定から自動で足したものは、会期も写真も会場の情報が正しい。公式ページを読み直さない
    if (ev.discovered) continue;
    const html = await fetchText(ev.link);
    if (!html) {
      ev.isLinkActive = false;
      unreachable++;
      console.log(`  × 到達不可  ${ev.title}`);
      continue;
    }
    ev.isLinkActive = true;

    // 一覧に添える写真。取れたときだけ差し替える(取れなかった週に消さない)
    const image = extractImage(html, ev.link);
    if (image && image !== ev.image) {
      ev.image = image;
      imaged++;
    }

    const period = extractStructuredPeriod(html) || extractPeriod(html);
    if (!period) {
      if (ev.endDate && ev.endDate < today) {
        expired++;
        console.log(`  ! 会期不明かつ終了済  ${ev.title}（${ev.endDate}）`);
      }
      continue;
    }
    if (period.start === ev.startDate && period.end === ev.endDate) continue;

    // 展示会サイトは姉妹展の会期も載せているので、素直に拾うと別の展示会の日付で
    // 上書きしてしまう（JAPAN BUILD TOKYO の 12/2 が大阪展の 8/26 に化けた）。
    // 確実なものだけ自動反映し、それ以外は人の確認に回す。
    const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;
    const movesForward = period.start > ev.startDate;
    const sameLength = days(period.start, period.end) === days(ev.startDate, ev.endDate);

    // ページ自身が機械可読な形で会期を宣言している場合は、その主催者の申告を信じる。
    // 本文から拾った日付にだけ、姉妹展を掴んでいないかの検査をかける。
    if (!period.structured && (!movesForward || !sameLength)) {
      review.push({
        title: ev.title,
        current: `${ev.startDate}〜${ev.endDate}`,
        found: `${period.start}〜${period.end}`,
        reason: !movesForward ? '会期が前に戻っている' : '会期の日数が違う',
      });
      continue;
    }

    {
      console.log(`  ↑ 更新  ${ev.title}`);
      console.log(`      ${ev.startDate}〜${ev.endDate}  ->  ${period.start}〜${period.end}`);
      ev.startDate = period.start;
      ev.endDate = period.end;
      // 会期が翌年に進んだのにタイトルが前年のままだと「建築・建材展 2026」が
      // 2027 年開催と表示されて紛らわしいので、年号も追随させる。
      const oldYear = ev.dateText?.match(/(20\d{2})年/)?.[1];
      const newYear = period.start.slice(0, 4);
      if (oldYear && oldYear !== newYear && ev.title.includes(oldYear)) {
        ev.title = ev.title.replaceAll(oldYear, newYear);
      }
      // 表示用の文字列も作り直す（元の書式に合わせる）
      const [sy, sm, sd] = period.start.split('-').map(Number);
      const [, em, ed] = period.end.split('-').map(Number);
      ev.dateText = sm === em
        ? `${sy}年${sm}月${sd}日～${ed}日`
        : `${sy}年${sm}月${sd}日～${em}月${ed}日`;
      updated++;
    }
  }

  // 同じ展示会を年度別に 2 件登録していると、会期が追いつくと同じ内容が並ぶ。
  // （建築・建材展 2026 と 2027 の両方が 2027-03-02 になった）
  // 会場の開催予定から、建築系のイベントを足す(scripts/lib/event-discover.mjs)。
  // 同時開催の一覧は毎週作り直す(会場側の掲載が変わるため)
  for (const e of events) delete e.coShows;
  const disc = await discoverEvents(events, today);

  const dupes = new Map();
  for (const e of events) {
    const k = `${e.link}|${e.startDate}|${e.endDate}`;
    dupes.set(k, (dupes.get(k) || 0) + 1);
  }
  const duplicated = [...dupes.entries()].filter(([, n]) => n > 1);

  const stillExpired = events.filter((e) => e.endDate && e.endDate < today);
  data.updatedAt = today;

  console.log('');
  console.log(`会期を更新   : ${updated} 件`);
  console.log(`写真を更新   : ${imaged} 件`);
  console.log(`会場から追加 : ${disc.added.length} 件(会場の予定 ${disc.scanned} 件を確認 / 終了した自動登録 ${disc.removed} 件を削除)`);
  disc.added.forEach((t) => console.log(`    + ${t}`));
  events.filter((e) => e.coShows?.length).forEach((e) => console.log(`    ＝ ${e.title} の同時開催 ${e.coShows.length} 展`));
  console.log(`要確認       : ${review.length} 件（自動反映していない）`);
  review.forEach((r) => {
    console.log(`    ${r.title}`);
    console.log(`      現在 ${r.current} / 検出 ${r.found}  — ${r.reason}`);
  });
  if (duplicated.length) {
    console.log(`重複         : ${duplicated.length} 組（同じ会場・会期の登録が二重になっている）`);
    duplicated.forEach(([k]) => console.log(`    ${k}`));
  }
  console.log(`到達できない : ${unreachable} 件`);
  console.log(`終了済のまま : ${stillExpired.length} 件（表示側で非表示になる）`);
  stillExpired.forEach((e) => console.log(`    ${e.endDate}  ${e.title}`));

  if (dryRun) {
    console.log('\n--dry-run のため書き込みませんでした。');
  } else {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
    console.log(`\n${FILE} を更新しました。`);
  }
}

run();
