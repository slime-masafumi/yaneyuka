// Node script: Convert Excel catalog to JSON for the app
// Usage: node scripts/convert_hbeam_xlsx.js "./鋼材断面性能表(雛型).xlsx" "./src/data/hbeam_catalog.json"

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function detectSeriesFromSheetName(name) {
  if (!name) return 'HM';
  if (name.includes('広幅') || name.toUpperCase().includes('HW')) return 'HW';
  if (name.includes('中幅') || name.toUpperCase().includes('HM')) return 'HM';
  if (name.includes('細幅') || name.toUpperCase().includes('HN')) return 'HN';
  return 'HM';
}

function normalizeNum(v) {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  if (s === '' || s === '-' ) return undefined;
  const n = parseFloat(s);
  return Number.isNaN(n) ? undefined : n;
}

function normalizeCallName(v) {
  if (!v) return undefined;
  let s = String(v).trim();
  s = s.replace(/\*/g, '');
  s = s.replace(/x/g, '×');
  // Ensure format like 300×300 or 200×204
  const m = s.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (m) return `H-${m[1]}×${m[2]}`;
  // Fallback: maybe includes leading H-
  const m2 = s.match(/H-?(\d+)\s*[×x]\s*(\d+)/i);
  if (m2) return `H-${m2[1]}×${m2[2]}`;
  return undefined;
}

function makeLabel(H, B, tw, tf) {
  if ([H, B, tw, tf].every(v => typeof v === 'number' && !Number.isNaN(v))) {
    return `H-${H}×${B}×${tw}×${tf}`;
  }
  return undefined;
}

function main() {
  let xlsxPath = process.argv[2] || path.resolve(process.cwd(), '鋼材断面性能表(雛型).xlsx');
  const outPath = process.argv[3] || path.resolve(process.cwd(), 'public/data/hbeam_catalog.json');
  if (!fs.existsSync(xlsxPath)) {
    // Fallback: pick the first .xlsx in CWD
    const cand = fs.readdirSync(process.cwd()).filter(f => f.toLowerCase().endsWith('.xlsx'))[0];
    if (cand) {
      xlsxPath = path.resolve(process.cwd(), cand);
      console.log('Using detected XLSX:', xlsxPath);
    } else {
      console.error('XLSX not found:', xlsxPath);
      process.exit(1);
    }
  }
  const wb = XLSX.readFile(xlsxPath);
  const all = [];
  wb.SheetNames.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    if (!rows || rows.length === 0) return;
    // find header row (the row that contains actual column keys like H,B,t1,t2,r)
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(30, rows.length); i++) {
      const row = rows[i];
      const s = row.map(c => (c !== undefined ? String(c) : '')).join('|');
      if (s.includes('呼称') && (s.includes('H') && s.includes('B')) && (s.includes('t1') || s.includes('t_w'))) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) return;
    const header = rows[headerRowIdx];
    // heuristic column indices
    const idx = (label) => header.findIndex(h => String(h).includes(label));
    const iCall = idx('呼称');
    const iH = idx('H');
    const iB = idx('B');
    // t_w / t_f columns may be t1, t2 or tw, tf
    let itw = idx('t_w'); if (itw === -1) itw = idx('t1'); if (itw === -1) itw = idx('tᵥ');
    let itf = idx('t_f'); if (itf === -1) itf = idx('t2');
    const ir = idx('r');
    const iA = header.findIndex(h => String(h).includes('断面積'));
    const iW = header.findIndex(h => String(h).includes('単位') && String(h).includes('質量'));
    const iIx = header.findIndex(h => String(h).includes('Ix'));
    const iIy = header.findIndex(h => String(h).includes('Iy'));
    const iZx = header.findIndex(h => String(h).includes('Zx'));
    const iZy = header.findIndex(h => String(h).includes('Zy'));

    const series = detectSeriesFromSheetName(sheetName);
    let lastCallName;
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const callNameRaw = row[iCall];
      const callName = normalizeCallName(callNameRaw) || lastCallName;
      if (normalizeCallName(callNameRaw)) lastCallName = normalizeCallName(callNameRaw);
      const H = normalizeNum(row[iH]);
      const B = normalizeNum(row[iB]);
      const tw = normalizeNum(row[itw]);
      const tf = normalizeNum(row[itf]);
      const rad = normalizeNum(row[ir]);
      const A = normalizeNum(row[iA]);
      const W = normalizeNum(row[iW]);
      const Ix = normalizeNum(row[iIx]);
      const Iy = normalizeNum(row[iIy]);
      const Zx = normalizeNum(row[iZx]);
      const Zy = normalizeNum(row[iZy]);

      if (!H || !B || !tw || !tf) continue;
      const label = makeLabel(H, B, tw, tf);
      all.push({
        series,
        label: label || (callName ? callName : 'H'),
        H, B, tw, tf,
        r: rad,
        A_cm2: A,
        unitWeightKgPerM: W,
        Ix_cm4: Ix,
        Iy_cm4: Iy,
        Zx_cm3: Zx,
        Zy_cm3: Zy,
        callName: callName,
      });
    }
  });

  // write
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
  console.log(`Wrote ${all.length} entries to`, outPath);
}

main();


