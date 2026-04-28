const fs = require('fs');
const path = require('path');

// 既存の関数をコピー
function kanjiToNumber(text) {
  if (!text) return null;
  const kanjiMap = {
    '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '二十': 20, '三十': 30, '四十': 40, '五十': 50,
    '六十': 60, '七十': 70, '八十': 80, '九十': 90,
    '百': 100, '二百': 200, '三百': 300, '四百': 400, '五百': 500,
    '六百': 600, '七百': 700, '八百': 800, '九百': 900,
    '千': 1000, '二千': 2000, '三千': 3000, '四千': 4000, '五千': 5000
  };
  const arabicMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (arabicMatch) return parseFloat(arabicMatch[1]);
  const decimalMatch = text.match(/([一二三四五六七八九十〇]+)・([一二三四五六七八九十〇]+)/);
  if (decimalMatch) {
    const whole = kanjiMap[decimalMatch[1]] || 0;
    const decimal = kanjiMap[decimalMatch[2]] || 0;
    const decimalStr = decimal.toString().padStart(2, '0').substring(0, 2);
    return parseFloat(`${whole}.${decimalStr}`);
  }
  for (const [kanji, num] of Object.entries(kanjiMap).sort((a, b) => b[1] - a[1])) {
    if (text.includes(kanji)) return num;
  }
  return null;
}

function parseNumberAndUnit(text) {
  if (!text || text.trim() === '') return { value: null, unit: null, text: text };
  const originalText = text;
  const unitPatterns = [
    { pattern: /平方メートル/g, unit: '平方メートル' },
    { pattern: /ミリメートル/g, unit: 'ミリメートル' },
    { pattern: /メートル/g, unit: 'メートル' },
    { pattern: /キロワット/g, unit: 'キロワット' },
    { pattern: /リットル/g, unit: 'リットル' },
    { pattern: /時間/g, unit: '時間' }
  ];
  const arabicNumberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (arabicNumberMatch) {
    const value = parseFloat(arabicNumberMatch[1]);
    let unit = null;
    for (const { pattern, unit: u } of unitPatterns) {
      if (pattern.test(text)) { unit = u; break; }
    }
    return { value, unit, text: originalText };
  }
  const value = kanjiToNumber(text);
  if (value !== null) {
    let unit = null;
    for (const { pattern, unit: u } of unitPatterns) {
      if (pattern.test(text)) { unit = u; break; }
    }
    return { value, unit, text: originalText };
  }
  const fractionMatch = text.match(/十分の(\d+|[一二三四五六七八九十百千]+)/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]) || kanjiToNumber(fractionMatch[1]) || 0;
    return { value: num / 10, unit: null, text: originalText, type: 'fraction' };
  }
  return { value: null, unit: null, text: originalText };
}

function extractTags(content, articleNumber = '', articleTitle = '') {
  const tags = [];
  const fullText = `${articleNumber} ${articleTitle} ${content || ''}`.toLowerCase();
  const keywordPatterns = {
    '確認申請': ['確認', '申請', '建築主事', '確認済証'],
    '構造計算': ['構造計算', '構造設計', '適合性判定'],
    '容積率': ['容積率', '延べ面積', '敷地面積'],
    '建蔽率': ['建蔽率', '建築面積'],
    '高さ制限': ['高さ', '高さ制限', '斜線制限', '日影'],
    '用途地域': ['用途地域', '第一種', '第二種', '住居', '商業', '工業'],
    '防火': ['防火', '耐火', '準耐火', '不燃'],
    '避難': ['避難', '廊下', '階段', '出入口'],
    '採光換気': ['採光', '換気', '窓', '開口部'],
    '道路': ['道路', '接道', '幅員', '前面道路'],
    '確認検査': ['確認', '検査', '完了検査', '中間検査'],
    '建築士': ['建築士', '設計', '工事監理'],
    '許可': ['許可', '特定行政庁', '建築審査会'],
    '条例': ['条例', '地方公共団体', '市町村'],
    '工作物': ['工作物', '煙突', '広告塔'],
    '増築改築': ['増築', '改築', '移転', '修繕', '模様替']
  };
  for (const [tag, keywords] of Object.entries(keywordPatterns)) {
    if (keywords.some(keyword => fullText.includes(keyword))) tags.push(tag);
  }
  if (articleNumber.includes('第一条') || content.includes('目的')) tags.push('目的');
  if (articleNumber.includes('第二条') || content.includes('用語')) tags.push('用語定義');
  if (content.includes('別表')) {
    if (content.includes('耐火建築物')) tags.push('耐火建築物', '特殊建築物');
    if (content.includes('用途地域')) tags.push('用途地域');
    if (content.includes('高さの制限')) tags.push('高さ制限');
    if (content.includes('日影')) tags.push('日影', '高さ制限');
  }
  return [...new Set(tags)];
}

// 別表の処理を実装するための関数
function parseTable(lines, startIdx, tableType) {
  const rows = [];
  let i = startIdx;
  let currentRow = null;
  let columnHeaders = [];
  let columnDescriptions = [];
  let inHeader = true;
  let headerProcessed = false;
  
  while (i < lines.length) {
    const line = lines[i];
    if (!line) { i++; continue; }
    
    // 別表の終了を検出
    if (line.match(/^別表第[一二三四]+/) || line.match(/^第[一二三四五六七八九十]+章/) || line.match(/^附則/)) {
      if (i > startIdx) break;
    }
    
    // 列ヘッダーの検出（い）、（ろ）、（は）、（に）など
    if (inHeader && line.match(/^[　\s]*（[いろはにほへとりちぬ]+）[　\s]*$/)) {
      const headerMatch = line.match(/（([いろはにほへとりちぬ]+)）/);
      if (headerMatch) {
        columnHeaders.push(headerMatch[1]);
      }
      i++;
      continue;
    }
    
    // 列の説明行をスキップ
    if (inHeader && !headerProcessed && (line.includes('欄') || line.includes('用途') || line.includes('階') || line.includes('床面積') || line.includes('高さ') || line.includes('距離') || line.includes('時間'))) {
      if (columnHeaders.length > 0 && !columnDescriptions.length) {
        // 列の説明を保存
        columnDescriptions.push(line.trim());
      }
      i++;
      continue;
    }
    
    if (inHeader && columnHeaders.length > 0) {
      headerProcessed = true;
      inHeader = false;
    }
    
    // 行の開始を検出（一）、（二）など
    const rowStartMatch = line.match(/^[　\s]*（([一二三四五六七八九十]+)）[　\s]*(.*)$/);
    if (rowStartMatch) {
      if (currentRow) rows.push(currentRow);
      currentRow = {
        row_number: `（${rowStartMatch[1]}）`,
        columns: {}
      };
      // 最初の列のデータ
      if (rowStartMatch[2]) {
        const colName = columnHeaders[0] ? `（${columnHeaders[0]}）` : '（い）';
        currentRow.columns[colName] = rowStartMatch[2].trim();
      }
      i++;
      continue;
    }
    
    // 列データの追加
    if (currentRow) {
      // 数値と単位を含む可能性のあるテキストを処理
      const parsed = parseNumberAndUnit(line.trim());
      if (parsed.value !== null || parsed.text) {
        // 現在の列インデックスを決定
        const currentColIndex = Object.keys(currentRow.columns).length;
        if (currentColIndex < columnHeaders.length) {
          const colName = `（${columnHeaders[currentColIndex]}）`;
          if (parsed.value !== null && parsed.unit) {
            currentRow.columns[colName] = parsed;
          } else {
            currentRow.columns[colName] = parsed.text || line.trim();
          }
        }
      }
    }
    
    i++;
  }
  
  if (currentRow) rows.push(currentRow);
  
  return { rows, nextIndex: i };
}

// メイン処理（簡易版 - 別表の処理のみ）
const inputFile = 'c:/Users/slime/Downloads/kijyunhou.txt';
const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n').map(line => line.trim()).filter(line => line);

// 別表第一の処理をテスト
const table1Idx = lines.findIndex(l => l.startsWith('別表第一'));
if (table1Idx >= 0) {
  console.log('別表第一を処理中...');
  const result = parseTable(lines, table1Idx + 1, '別表第一');
  console.log('行数:', result.rows.length);
  console.log('最初の行:', JSON.stringify(result.rows[0], null, 2));
}

