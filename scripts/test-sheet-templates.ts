// 表計算テンプレート（spreadsheet/templates.ts）の式を、実際の FormulaEngine で計算して確かめる。
//   node --experimental-transform-types scripts/test-sheet-templates.ts
// FormulaEngine は拡張子なしで import しているので、一時フォルダに写して import 文だけ直して読む。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const src = 'src/components/content/Userpage/general-tools/spreadsheet';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sheet-'));
fs.copyFileSync(`${src}/kenchikuFormulas.ts`, path.join(tmp, 'kenchikuFormulas.ts'));
fs.writeFileSync(path.join(tmp, 'FormulaEngine.ts'), fs.readFileSync(`${src}/FormulaEngine.ts`, 'utf8').replace("from './kenchikuFormulas'", "from './kenchikuFormulas.ts'"));
fs.copyFileSync(`${src}/templates.ts`, path.join(tmp, 'templates.ts'));
const { default: FormulaEngine } = await import(pathToFileURL(path.join(tmp, 'FormulaEngine.ts')).href);
const { SHEET_TEMPLATES } = await import(pathToFileURL(path.join(tmp, 'templates.ts')).href);

let bad = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'NG '} ${label} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
};

/** テンプレートに値を入れて、指定セルの計算結果を返す */
function run(id: string, inputs: Record<string, string>) {
  const tpl = SHEET_TEMPLATES.find((t: { id: string }) => t.id === id);
  const eng = new FormulaEngine();
  const cells: Record<string, string> = { ...tpl.cells };
  for (const [addr, v] of Object.entries(inputs)) {
    const rc = eng.addressToRC(addr)!;
    cells[`R${rc.row}C${rc.col}`] = v;
  }
  const evalCell = (r: number, c: number, visited: Set<string>): number | string => {
    const k = `R${r}C${c}`;
    const raw = cells[k] ?? '';
    if (!raw.startsWith('=')) return raw === '' ? '' : isNaN(Number(raw)) ? raw : Number(raw);
    if (visited.has(k)) return '#CIRC!';
    const next = new Set(visited).add(k);
    return eng.evaluateRaw(raw, next, (cell: { row: number; col: number }) => ({ value: cells[`R${cell.row}C${cell.col}`] ?? '', formula: '' }), (cell: { row: number; col: number }) => evalCell(cell.row, cell.col, next));
  };
  return (addr: string) => {
    const rc = eng.addressToRC(addr)!;
    const v = evalCell(rc.row, rc.col, new Set());
    return typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
  };
}

check('テンプレートは5種', SHEET_TEMPLATES.map((t: { name: string }) => t.name), ['面積表', '仕上表', '建具表', '数量拾い（ボード）', '工事費内訳']);

// 面積表: 3行目・4行目に 5×4、6×3.5 → 20 + 21 = 41 ㎡
{
  const v = run('area', { D3: '5', E3: '4', D4: '6', E4: '3.5', F16: '30', F17: '100' });
  check('面積 = 幅×奥行', v('F3'), 20);
  check('空の行は空', v('F5'), '');
  check('坪', v('G3'), 6.05);
  check('延べ面積', v('F15'), 41);
  check('建蔽率 = 建築面積 ÷ 敷地面積', v('F18'), 0.3);
  check('容積率 = 延べ面積 ÷ 敷地面積', v('F19'), 0.41);
}
// 数量拾い: 3.64m × 2.4m = 8.736㎡、910×1820（1.6562㎡）、ロス5% → ceil(9.1728/1.6562) = 6 枚
{
  const v = run('takeoff', { A3: '北面壁', B3: '3.64', C3: '2.4' });
  check('面積', v('D3'), 8.736);
  check('必要枚数', v('H3'), 6);
  check('空の行は空', v('H4'), '');
  check('合計枚数', v('H15'), 6);
}
// 工事費内訳: 10 × 3,000 + 2 × 50,000 = 130,000、税 13,000、合計 143,000
{
  const v = run('estimate', { C3: '10', E3: '3000', C4: '2', E4: '50000' });
  check('金額', v('F3'), 30000);
  check('小計', v('F18'), 130000);
  check('消費税', v('F19'), 13000);
  check('合計', v('F20'), 143000);
}
// 建具表: 数量の合計
check('建具の数量合計', run('door', { F3: '2', F4: '3' })('F18'), 5);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `\n${bad} 件 NG` : '\nすべて ok');
process.exit(bad ? 1 : 0);
