const fs = require('fs');
const path = require('path');

/**
 * 漢数字をアラビア数字に変換
 */
function kanjiToNumber(text) {
  const kanjiMap = {
    '〇': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '二十': 20, '三十': 30, '四十': 40, '五十': 50,
    '六十': 60, '七十': 70, '八十': 80, '九十': 90,
    '百': 100, '二百': 200, '三百': 300, '四百': 400, '五百': 500,
    '六百': 600, '七百': 700, '八百': 800, '九百': 900,
    '千': 1000, '二千': 2000
  };
  
  // 複合的な数値（例: 二百平方メートル、一・二五）
  for (const [kanji, num] of Object.entries(kanjiMap).reverse()) {
    if (text.includes(kanji)) {
      return num;
    }
  }
  
  // 小数点を含む場合（例: 一・二五）
  const decimalMatch = text.match(/([一二三四五六七八九十〇]+)・([一二三四五六七八九十〇]+)/);
  if (decimalMatch) {
    const whole = kanjiMap[decimalMatch[1]] || 0;
    const decimal = kanjiMap[decimalMatch[2]] || 0;
    const decimalStr = decimal.toString();
    return parseFloat(`${whole}.${decimalStr.length === 1 ? decimalStr : decimalStr.substring(0, 2)}`);
  }
  
  return null;
}

/**
 * 数値と単位を分離してオブジェクトに変換
 */
function parseNumberAndUnit(text) {
  if (!text || text.trim() === '') {
    return { value: null, unit: null, text: text };
  }
  
  // 単位のパターン
  const unitPatterns = [
    { pattern: /平方メートル/g, unit: '平方メートル' },
    { pattern: /メートル/g, unit: 'メートル' },
    { pattern: /キロワット/g, unit: 'キロワット' },
    { pattern: /リットル/g, unit: 'リットル' },
    { pattern: /ミリメートル/g, unit: 'ミリメートル' },
    { pattern: /時間/g, unit: '時間' },
    { pattern: /時間/g, unit: '時間' }
  ];
  
  // 数値のパターン（アラビア数字）
  const arabicNumberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (arabicNumberMatch) {
    const value = parseFloat(arabicNumberMatch[1]);
    let unit = null;
    
    for (const { pattern, unit: u } of unitPatterns) {
      if (pattern.test(text)) {
        unit = u;
        break;
      }
    }
    
    return { value, unit, text };
  }
  
  // 漢数字のパターン
  const value = kanjiToNumber(text);
  if (value !== null) {
    let unit = null;
    
    for (const { pattern, unit: u } of unitPatterns) {
      if (pattern.test(text)) {
        unit = u;
        break;
      }
    }
    
    return { value, unit, text };
  }
  
  // 分数のパターン（例: 十分の二十）
  const fractionMatch = text.match(/十分の(\d+|[一二三四五六七八九十百千]+)/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]) || kanjiToNumber(fractionMatch[1]) || 0;
    return { value: num / 10, unit: null, text, type: 'fraction' };
  }
  
  return { value: null, unit: null, text };
}

/**
 * 実務的なキーワード（tags）を抽出
 */
function extractTags(content, articleNumber = '', articleTitle = '') {
  const tags = [];
  const contentLower = (content || '').toLowerCase();
  const fullText = `${articleNumber} ${articleTitle} ${content}`.toLowerCase();
  
  // キーワードパターン
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
    if (keywords.some(keyword => fullText.includes(keyword))) {
      tags.push(tag);
    }
  }
  
  // 条文番号から推測
  if (articleNumber.includes('第一条') || content.includes('目的')) {
    tags.push('目的');
  }
  if (articleNumber.includes('第二条') || content.includes('用語')) {
    tags.push('用語定義');
  }
  
  // 別表の場合
  if (content.includes('別表')) {
    if (content.includes('耐火建築物')) tags.push('耐火建築物', '特殊建築物');
    if (content.includes('用途地域')) tags.push('用途地域');
    if (content.includes('高さの制限')) tags.push('高さ制限');
    if (content.includes('日影')) tags.push('日影', '高さ制限');
  }
  
  return [...new Set(tags)]; // 重複を除去
}

/**
 * テキストファイルを解析してJSON構造に変換
 */
function parseTextFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  const result = {
    law_name: '建築基準法',
    law_number: '昭和二十五年法律第二百一号',
    chapters: [],
    appendix_tables: []
  };
  
  let currentChapter = null;
  let currentSection = null;
  let currentArticle = null;
  let currentParagraph = null;
  let inAppendixTable = false;
  let currentTable = null;
  let tableStartLine = -1;
  
  // 別表の開始行を特定
  const tableStarts = {
    '別表第一': -1,
    '別表第二': -1,
    '別表第三': -1,
    '別表第四': -1
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 別表の開始を検出
    if (line.startsWith('別表第一') || line.startsWith('別表第二') || 
        line.startsWith('別表第三') || line.startsWith('別表第四')) {
      inAppendixTable = true;
      const tableMatch = line.match(/別表(第[一二三四]+)/);
      if (tableMatch) {
        const tableType = `別表${tableMatch[1]}`;
        currentTable = {
          table_type: tableType,
          table_title: line.replace(/別表第[一二三四]+[　\s]*/, ''),
          rows: [],
          tags: []
        };
        tableStarts[tableType] = i;
      }
      continue;
    }
    
    // 別表の終了を検出（次の章が始まるまで）
    if (inAppendixTable && (line.match(/^第[一二三四五六七八九十]+章/) || line.match(/^附則/))) {
      if (currentTable) {
        currentTable.tags = extractTags(currentTable.table_title, '', currentTable.table_type);
        result.appendix_tables.push(currentTable);
      }
      inAppendixTable = false;
      currentTable = null;
    }
    
    // 別表の処理は後で実装
    if (inAppendixTable) {
      // 別表の処理は複雑なので、後で別途実装
      continue;
    }
    
    // 章の検出
    const chapterMatch = line.match(/^第([一二三四五六七八九十]+)章[　\s]+(.+?)(?:（|$)/);
    if (chapterMatch) {
      currentChapter = {
        chapter_number: chapterMatch[1],
        chapter_title: chapterMatch[2].trim(),
        sections: [],
        articles: []
      };
      result.chapters.push(currentChapter);
      currentSection = null;
      continue;
    }
    
    // 節の検出
    const sectionMatch = line.match(/^第([一二三四五六七八九十]+)節[　\s]+(.+?)(?:（|$)/);
    if (sectionMatch && currentChapter) {
      currentSection = {
        section_number: sectionMatch[1],
        section_title: sectionMatch[2].trim(),
        articles: []
      };
      currentChapter.sections.push(currentSection);
      continue;
    }
    
    // 条の検出
    const articleMatch = line.match(/^第([一二三四五六七八九十]+)条[　\s]*(.+?)(?:$|（)/);
    if (articleMatch) {
      const articleNumber = `第${articleMatch[1]}条`;
      const articleTitle = articleMatch[2] ? articleMatch[2].trim() : '';
      
      currentArticle = {
        article_number: articleNumber,
        article_title: articleTitle,
        content: [],
        paragraphs: [],
        tags: []
      };
      
      if (currentSection) {
        currentSection.articles.push(currentArticle);
      } else if (currentChapter) {
        currentChapter.articles.push(currentArticle);
      }
      
      currentParagraph = null;
      continue;
    }
    
    // 項の検出（数字）
    const paragraphMatch = line.match(/^([一二三四五六七八九十]+)[　\s]+(.+)$/);
    if (paragraphMatch && currentArticle) {
      const paragraphNumber = paragraphMatch[1];
      const paragraphContent = paragraphMatch[2].trim();
      
      currentParagraph = {
        paragraph_number: paragraphNumber,
        content: paragraphContent,
        items: []
      };
      
      currentArticle.paragraphs.push(currentParagraph);
      continue;
    }
    
    // 号の検出（一、二、三...）
    const itemMatch = line.match(/^([一二三四五六七八九十]+)[　\s]+(.+)$/);
    if (itemMatch && currentParagraph) {
      const itemNumber = itemMatch[1];
      const itemContent = itemMatch[2].trim();
      
      currentParagraph.items.push({
        item_number: itemNumber,
        content: itemContent
      });
      continue;
    }
    
    // 条の内容（項や号がない場合）
    if (currentArticle && !line.match(/^第/) && !line.match(/^（/) && line.length > 0) {
      if (currentArticle.content.length === 0 || typeof currentArticle.content === 'string') {
        currentArticle.content = [line];
      } else {
        currentArticle.content.push(line);
      }
    }
  }
  
  // 最後の別表を処理
  if (inAppendixTable && currentTable) {
    currentTable.tags = extractTags(currentTable.table_title, '', currentTable.table_type);
    result.appendix_tables.push(currentTable);
  }
  
  // 全ての条にtagsを付与
  function addTagsToArticles(articles) {
    for (const article of articles) {
      if (article.content) {
        const contentText = Array.isArray(article.content) 
          ? article.content.join(' ') 
          : article.content;
        article.tags = extractTags(contentText, article.article_number, article.article_title);
      }
      
      for (const paragraph of article.paragraphs || []) {
        if (paragraph.items && paragraph.items.length > 0) {
          for (const item of paragraph.items) {
            // itemsにもtagsを追加できる
          }
        }
      }
    }
  }
  
  for (const chapter of result.chapters) {
    addTagsToArticles(chapter.articles);
    for (const section of chapter.sections) {
      addTagsToArticles(section.articles);
    }
  }
  
  return result;
}

// メイン処理
const inputFile = 'c:/Users/slime/Downloads/kijyunhou.txt';
const outputFile = path.join(__dirname, '../kijyunhou_1.json');

try {
  console.log('テキストファイルを解析中...');
  const result = parseTextFile(inputFile);
  
  console.log('JSONファイルを書き込み中...');
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');
  
  console.log('完了しました！');
  console.log(`章数: ${result.chapters.length}`);
  console.log(`別表数: ${result.appendix_tables.length}`);
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

