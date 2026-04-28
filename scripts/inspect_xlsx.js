const XLSX = require('xlsx');
const path = require('path');

const xlsxPath = process.argv[2] || path.resolve(process.cwd(), '鋼材断面性能表(雛型).xlsx');
const wb = XLSX.readFile(xlsxPath);
console.log('Sheets:', wb.SheetNames);
wb.SheetNames.forEach((name) => {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  console.log('---', name, 'rows:', rows.length);
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    console.log(i, rows[i]);
  }
});







