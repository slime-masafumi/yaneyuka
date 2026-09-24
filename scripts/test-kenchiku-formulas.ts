// 表計算の建築関数（尺・ボード枚数・本数・英字名）のテスト。
//   node --experimental-transform-types scripts/test-kenchiku-formulas.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const src = 'src/components/content/Userpage/general-tools/spreadsheet';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kformula-'));
fs.copyFileSync(`${src}/kenchikuFormulas.ts`, path.join(tmp, 'kenchikuFormulas.ts'));
fs.writeFileSync(path.join(tmp, 'FormulaEngine.ts'), fs.readFileSync(`${src}/FormulaEngine.ts`, 'utf8').replace("from './kenchikuFormulas'", "from './kenchikuFormulas.ts'"));
const { default: FormulaEngine } = await import(pathToFileURL(path.join(tmp, 'FormulaEngine.ts')).href);

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};
const eng = new FormulaEngine();
const run = (f: string) => {
  const v = eng.evaluateRaw(f, new Set(), () => ({ value: '', formula: '' }), () => '');
  return typeof v === 'number' ? Math.round(v * 100) / 100 : String(v);
};

check('尺', run('=尺(1818)'), 6);
check('尺ミリ', run('=尺ミリ(3)'), 909.09);
check('ボード枚数 3x6 ロス5%', run('=ボード枚数(100)'), 64);
check('ボード枚数 規格とロス', run('=ボード枚数(100,"4x8",0)'), 34);
check('全角と×も読む', run('=ボード枚数(10,"３×８",0)'), 5);
check('知らない規格は #VALUE!', run('=ボード枚数(10,"5x5")'), '#VALUE!');
check('本数', run('=本数(38.5,4,5)'), 11);
check('TSUBO', run('=TSUBO(100)'), 30.25);
check('SHAKU', run('=SHAKU(909.09)'), 3);
check('BOARD', run('=BOARD(100)'), 64);
check('ROLL', run('=ROLL(10,4)'), 3);
check('小文字でも', run('=tsubo(100)'), 30.25);

console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
