// 建材Chatbot(AI なし)の答えの検査。質問ごとに「要点に入っているべき語句」を決めて、通った数を出す。2026-11-14
//   node --import ./scripts/lib/register-ts.mjs scripts/check-chatbot.ts [-v]
// 答えの組み立て(src/lib/chatbot/answer.ts)を直したら、これで下がっていないことを確かめる。
import knowledge from '../src/data/knowledge.json';
import { designPosts } from '../src/data/design-posts.ts';
import { GUIDES } from '../src/lib/karte/guides.ts';
import { answer, buildIndex } from '../src/lib/chatbot/answer.ts';

/** [質問, 要点のどれかに入っているべき語句(正規表現)] */
const CASES: Array<[string, RegExp]> = [
  ['屋上防水の改修方法', /かぶせ|撤去工法/],
  ['RC造の屋上を改修したい。既存はアスファルト防水で、住みながら工事したい。どの工法がいい？', /かぶせ|撤去工法/],
  ['住宅の階段の蹴上げと踏面の基準は？', /23cm/],
  ['折板屋根の結露対策', /裏貼り|二重折板/],
  ['防火地域のサッシの選び方', /防火設備/],
  ['ALCとECPの違い', /ECPは|ALCは/],
  ['シックハウスの換気回数', /0\.5回/],
  ['天井の高いホールの天井で気をつけること', /特定天井|脱落/],
  ['タイルの剥落を防ぐには', /剥落/],
  ['外壁の塗り替えの時期', /再塗装|塗り替え|塗替/],
  ['事務所の照度はどれくらい必要？', /300\s?lx|750\s?lx/],
  ['排煙口の位置', /80\s?cm/],
  ['接地工事の種類', /A種/],
  ['床暖房に使えるフローリング', /床暖房対応/],
  ['特定天井の条件', /6m/],
  ['住宅の居室の採光の基準', /1\/7|7分の1/],
  ['2以上の直通階段が必要な場合', /直通階段/],
  ['防火区画の面積', /1,?500/],
  ['角地の建蔽率の緩和', /角地/],
  ['LGSの種類', /19形|25形/],
  ['ベランダの防水', /FRP/],
  ['外壁タイルの定期調査', /打診/],
];

const verbose = process.argv.includes('-v');
const ix = buildIndex(knowledge as never, designPosts, GUIDES);
let ok = 0;
for (const [q, want] of CASES) {
  const a = answer(ix, q);
  // 要点に入っていれば合格。入っていなくても、上位 3 件の出典の題に入っていれば合格(資料には辿り着ける)
  const pass = a.points.some((p) => want.test(p.text)) || a.sources.slice(0, 3).some((s) => want.test(s.title));
  if (pass) ok++;
  console.log(`${pass ? 'OK ' : 'NG '} ${q}`);
  if (verbose || !pass) {
    a.points.forEach((p) => console.log(`      ・ ${p.text.slice(0, 90)} [${p.n}]`));
    a.sources.slice(0, 4).forEach((s) => console.log(`        ${s.n} ${s.kind} | ${s.title.slice(0, 50)} ${s.score.toFixed(2)}`));
  }
}
console.log(`\n${ok} / ${CASES.length}`);
