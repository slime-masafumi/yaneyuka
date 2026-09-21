'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

type CellFormat = {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  border?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
  bg?: string;
  color?: string;
  fontSize?: number;
  wrap?: boolean;
};
type Merge = { r: number; c: number; rs: number; cs: number };
type SharedSheet = {
  name: string;
  rows: number;
  cols: number;
  cells: Record<string, string>;
  formats?: Record<string, CellFormat>;
  merges?: Merge[];
  colWidths?: number[];
};

const BORDER = '1px solid #6b7280';

/** 表計算ツール側と同じ見た目になるよう、書式をCSSに落とす */
function formatToStyle(f?: CellFormat): React.CSSProperties {
  if (!f) return {};
  const s: React.CSSProperties = {};
  if (f.bg) s.backgroundColor = f.bg;
  if (f.color) s.color = f.color;
  if (f.fontSize) s.fontSize = `${f.fontSize}px`;
  if (f.italic) s.fontStyle = 'italic';
  if (f.bold) s.fontWeight = 700;
  if (f.align) s.textAlign = f.align;
  if (f.border) {
    if (f.border.top) s.borderTop = BORDER;
    if (f.border.right) s.borderRight = BORDER;
    if (f.border.bottom) s.borderBottom = BORDER;
    if (f.border.left) s.borderLeft = BORDER;
  }
  return s;
}

const colName = (index: number) => {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

export default function SheetViewClient({ code }: { code: string }) {
  const [sheet, setSheet] = useState<SharedSheet | null>(null);
  const [message, setMessage] = useState('シートを読み込んでいます...');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'sheetShares', code));
        if (cancelled) return;
        if (!snap.exists()) {
          setMessage('このリンクは見つかりませんでした。公開が停止された可能性があります。');
          return;
        }
        setSheet(snap.data() as SharedSheet);
      } catch (e) {
        console.error('[sheet] 読み込みに失敗', e);
        if (!cancelled) setMessage('シートを読み込めませんでした。');
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (!sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">yaneyuka</h1>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  // 結合セルの索引。左上以外は描かない
  const anchors = new Map<string, { rs: number; cs: number }>();
  const covered = new Set<string>();
  (sheet.merges || []).forEach(m => {
    anchors.set(`R${m.r}C${m.c}`, { rs: m.rs, cs: m.cs });
    for (let r = m.r; r < m.r + m.rs; r++) {
      for (let c = m.c; c < m.c + m.cs; c++) {
        if (r !== m.r || c !== m.c) covered.add(`R${r}C${c}`);
      }
    }
  });

  const rows = Array.from({ length: sheet.rows }, (_, i) => i);
  const cols = Array.from({ length: sheet.cols }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{sheet.name}</h1>
            <p className="text-[11px] text-gray-500">yaneyuka の表計算ツールで作成・共有されたシート（閲覧専用）</p>
          </div>
          <a href="https://yaneyuka.com" className="text-xs text-blue-600 hover:text-blue-800 underline">yaneyuka.com</a>
        </div>

        <div className="overflow-auto border border-[#3b3b3b] bg-white">
          <table className="min-w-max text-[12px] border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-20">
              <tr>
                <th className="border px-2 py-1 w-8 sticky left-0 z-30 bg-gray-100"></th>
                {cols.map(c => (
                  <th key={c} className="border px-2 py-1 text-center text-gray-600" style={{ width: sheet.colWidths?.[c] ?? 96 }}>
                    {colName(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r}>
                  <td className="border px-2 py-1 text-center w-8 sticky left-0 z-10 bg-gray-50 text-gray-600">{r + 1}</td>
                  {cols.map(c => {
                    const key = `R${r}C${c}`;
                    if (covered.has(key)) return null;
                    const span = anchors.get(key);
                    const fmt = sheet.formats?.[key];
                    return (
                      <td
                        key={key}
                        rowSpan={span?.rs}
                        colSpan={span?.cs}
                        className="border px-2 py-1 align-middle"
                        style={{
                          width: span && span.cs > 1 ? undefined : (sheet.colWidths?.[c] ?? 96),
                          whiteSpace: fmt?.wrap ? 'pre-wrap' : 'nowrap',
                          ...formatToStyle(fmt),
                        }}
                      >
                        {sheet.cells[key] ?? ' '}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-gray-500 mt-3">
          このページは共有時点の内容です。編集はできません。
        </p>
      </div>
    </div>
  );
}
