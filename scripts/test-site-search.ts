// 建材Chatbot の検索（src/lib/siteSearch.ts）を実データ（knowledge.json・makers.json）で確かめる。
//   node scripts/test-site-search.ts
import fs from 'node:fs';
import { searchKnowledge, searchTools, makersForPage, makersNamedIn, asksForMakers, grams, excerpt } from '../src/lib/siteSearch.ts';

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const K = JSON.parse(fs.readFileSync('src/data/knowledge.json', 'utf8'));
const M = JSON.parse(fs.readFileSync('src/data/makers.json', 'utf8'));
const top = (q: string) => searchKnowledge(K, q, 3).map((h) => h.page.name);

check('カタカナ語を捨てない', grams('フローリング').map((g) => g.g).includes('ふろ'), true);
check('助詞をまたぐ 2 文字は捨てる', grams('屋根で結露').map((g) => g.g), ['屋根', '結露']);
check('決まり文句を捨てる', grams('おすすめを教えてください'), []);
check('折板の結露', top('折板屋根で結露対策したい')[0], '折板');
check('外壁のリフォーム → 重ね張り・サイディング', /重ね張り|サイディング|改修/.test(top('外壁のリフォームにおすすめは？')[0] ?? ''), true);
check('防火地域のサッシ → サッシのページ', top('防火地域のサッシの選び方').slice(0, 2).every((n) => /サッシ/.test(n)), true);
check('フローリングの種類', top('フローリングの種類を教えて')[0], 'フローリング');
check('ベランダの雨漏り → 防水', top('ベランダの雨漏り').some((n) => /防水/.test(n)), true);
check('商品名から一般名（アスロック → ECP）', (top('アスロックの特徴')[0] ?? '').startsWith('ECP'), true);
check('シーリングの打ち替え', /シーリング/.test(searchKnowledge(K, 'シーリングの打ち替え時期', 1)[0]?.text ?? ''), true);
check('関係ない質問は拾わない', top('今日の天気'), []);

const page = searchKnowledge(K, '折板屋根', 1)[0].page;
const mk = makersForPage(M, page, 5);
check('ページのメーカー（重複なし・掲載準備中なし）', mk.length > 0 && new Set(mk.map((m) => m.name)).size === mk.length && !mk.some((m) => m.name === '掲載準備中'), true);
check('社名がそのまま入っていれば拾う', makersNamedIn(M, 'LIXILのサッシ'), ['LIXIL']);
check('「メーカーは？」は追いかけの質問', asksForMakers('メーカーは？'), true);
check('中身のある質問は追いかけではない', asksForMakers('防水のメーカー'), false);

const tools = [
  { label: '結露検討', title: '結露検討', description: '多層壁体の温度分布・露点から結露判定', href: '/?m=design-tools', group: '設計ツール' },
  { label: '日影規制', title: '日影規制', description: '日影規制の検討ツール（準備中）', href: '/', group: '設計ツール' },
];
check('ツールも引ける', searchTools(tools, '壁の結露を計算したい').map((t) => t.label), ['結露検討']);
check('準備中のツールは出さない', searchTools(tools, '日影規制'), []);
check('抜粋は当たった語の近く', excerpt('あ'.repeat(300) + '結露が起きる' + 'い'.repeat(300), '結露', 60).includes('結露'), true);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
