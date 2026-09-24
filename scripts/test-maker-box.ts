// メーカー資料箱（src/lib/makerBox.ts）のテスト。  node scripts/test-maker-box.ts
import { mergeMaker, searchMakers, linkChanges, fallbackFor, relatedBookmarks, boxId, type MakerData } from '../src/lib/makerBox.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const row = (name: string, o: Record<string, string> = {}, pages = ['ALC']) => ({ name, pages, products: '', catalog: '', office: '', contact: '', sample: '', cad: '', ...o });
const data: MakerData = {
  外壁: [row('旭化成建材', { products: 'https://www.asahikasei-kenzai.com/akk/hebel/', catalog: '#' }), row('クボタ', { products: 'https://kubota.example/wall' }, ['窯業サイディング'])],
  屋根: [row('旭化成建材', { catalog: 'https://www.asahikasei-kenzai.com/catalog.pdf', cad: 'https://cad.example/akk' }, ['折板'])],
};

const m = mergeMaker(data, '旭化成建材');
check('分類をまたいでまとめる', m?.categories, ['外壁', '屋根']);
check('空と # は後の行で埋める', [m?.links.products, m?.links.catalog, m?.links.cad], ['https://www.asahikasei-kenzai.com/akk/hebel/', 'https://www.asahikasei-kenzai.com/catalog.pdf', 'https://cad.example/akk']);
check('無い社名', mergeMaker(data, '無い会社'), null);

check('カタカナ・ひらがなを寄せて前方一致', searchMakers(data, 'くぼた').map((x) => x.name), ['クボタ']);
check('ページ名でも探せる', searchMakers(data, 'サイディング').map((x) => x.name), ['クボタ']);
check('1社1件', searchMakers(data, '旭化成').length, 1);

check('リンクの更新を拾う', linkChanges({ ...m!.links, catalog: 'https://old.example/c.pdf' }, m!.links).map((c) => c.label), ['カタログ']);
check('空になった側は知らせない', linkChanges(m!.links, { ...m!.links, cad: '' }), []);

const broken = [{ url: 'https://x.example/a', fallback: 'https://x.example' }, { url: 'https://y.example/b' }];
check('切れていれば会社トップ', fallbackFor('https://x.example/a', broken), 'https://x.example');
check('振り替え先なし', fallbackFor('https://y.example/b', broken), '');
check('切れていない', fallbackFor('https://z.example', broken), null);

const bms = [{ url: 'https://asahikasei-kenzai.com/news' }, { url: 'https://other.example' }];
check('同じドメインのブックマーク', relatedBookmarks(m!, bms).length, 1);
check('ID に / を使わない', boxId('A/B 建材'), 'A／B 建材');

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
