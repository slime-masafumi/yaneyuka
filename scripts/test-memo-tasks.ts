// メモから宿題を拾う（src/lib/memoTasks.ts）のテスト。  node scripts/test-memo-tasks.ts
// memoTasks は chatTools を拡張子なしで import しているので、一時フォルダに写して import 文だけ直して読む。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'memo-tasks-'));
fs.copyFileSync('src/lib/chatTools.ts', path.join(tmp, 'chatTools.ts'));
fs.writeFileSync(path.join(tmp, 'memoTasks.ts'), fs.readFileSync('src/lib/memoTasks.ts', 'utf8').replace("from './chatTools'", "from './chatTools.ts'"));
const { extractHomework, projectOfMemo, taskContent } = await import(pathToFileURL(path.join(tmp, 'memoTasks.ts')).href);

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const today = new Date(2026, 8, 24);
const minutes = [
  '日時・場所', '9/24 現場事務所', '出席者', '施主・設計・施工',
  '決定事項', '外壁は ALC 37mm', '☑ 色決め済み',
  '宿題（担当 / 期限）',
  '・サッシ見積の取り直し 担当: 田中 / 9/30',
  '・地盤調査の日程調整（鈴木）',
  '・外構プラン修正 来週月曜まで',
  '次回', '10/8 10:00',
  '☐ 施主へ議事録送付',
].join('\n');
const hw = extractHomework(minutes, today);
check('宿題の見出しの下と ☐ を拾う', hw.map((h) => h.text), ['サッシ見積の取り直し', '地盤調査の日程調整', '外構プラン修正 来週月曜まで', '施主へ議事録送付']);
check('担当: と期限', hw[0], { text: 'サッシ見積の取り直し', who: '田中', due: '2026-09-30' });
check('（担当）', hw[1].who, '鈴木');
check('来週月曜', hw[2].due, '2026-09-28');
check('決定事項・次回は拾わない', hw.some((h) => /ALC|10\/8/.test(h.text)), false);
check('☑ は拾わない', hw.some((h) => h.text.includes('色決め')), false);

const patrol = ['物件名', 'A邸 新築工事', '指摘・是正', '1. 2F 床合板のビス間隔不足', '2. 外部防水立上り不足 @山本さん', '写真メモ', 'IMG_001'].join('\n');
const p = extractHomework(patrol, today);
check('番号つきの指摘', p.map((h) => [h.text, h.who]), [['2F 床合板のビス間隔不足', null], ['外部防水立上り不足 @山本さん', '山本']]);
check('物件名の見出しから', projectOfMemo(patrol, '現場'), 'A邸 新築工事');
check('物件らしいフォルダ', projectOfMemo('本文', 'B病院'), 'B病院');
check('汎用フォルダは物件にしない', projectOfMemo('本文', '議事録'), null);
check('タスクの文言', taskContent(hw[0], 'A邸'), '【A邸】サッシ見積の取り直し（田中）');

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
