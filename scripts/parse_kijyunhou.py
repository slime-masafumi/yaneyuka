#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
建築基準法テキストファイルを解析してJSONに変換するスクリプト
"""

import re
import json
from typing import Dict, List, Any, Optional
from pathlib import Path

def parse_number_and_unit(text: str) -> Dict[str, Any]:
    """
    テキストから数値と単位を抽出してオブジェクトに変換
    例: "二百平方メートル" -> {"value": 200, "unit": "平方メートル"}
         "一・二五" -> {"value": 1.25, "unit": None}
         "二十メートル" -> {"value": 20, "unit": "メートル"}
    """
    if not text or text.strip() == "":
        return {"value": None, "unit": None, "text": text}
    
    # 漢数字からアラビア数字への変換マッピング
    kanji_numbers = {
        "〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
        "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
        "二十": 20, "三十": 30, "四十": 40, "五十": 50, "六十": 60,
        "七十": 70, "八十": 80, "九十": 90, "百": 100, "千": 1000,
        "二百": 200, "三百": 300, "四百": 400, "五百": 500,
        "六百": 600, "七百": 700, "八百": 800, "九百": 900
    }
    
    # 単位のパターン
    unit_patterns = [
        r"平方メートル", r"メートル", r"キロワット", r"リットル",
        r"時間", r"時間", r"ミリメートル", r"キログラム"
    ]
    
    original_text = text
    
    # 単位を抽出
    unit = None
    for pattern in unit_patterns:
        match = re.search(pattern, text)
        if match:
            unit = match.group(0)
            text = text.replace(unit, "").strip()
            break
    
    # 数値の抽出
    value = None
    
    # アラビア数字と小数点のパターン（例: "1.25"、"一・二五"）
    arabic_match = re.search(r"(\d+(?:\.\d+)?)", text)
    if arabic_match:
        value = float(arabic_match.group(1))
    else:
        # 漢数字のパターン
        # "一・二五" のような形式
        dot_match = re.search(r"([一二三四五六七八九十]+)・([一二三四五六七八九十]+)", text)
        if dot_match:
            integer_part = dot_match.group(1)
            decimal_part = dot_match.group(2)
            int_val = kanji_numbers.get(integer_part, 0)
            dec_val = 0
            if len(decimal_part) == 2:  # "二五" -> 0.25
                dec_val = kanji_numbers.get(decimal_part[0], 0) * 0.1 + kanji_numbers.get(decimal_part[1], 0) * 0.01
            elif len(decimal_part) == 1:  # "五" -> 0.5
                dec_val = kanji_numbers.get(decimal_part, 0) * 0.1
            value = int_val + dec_val
        else:
            # 単純な漢数字（例: "二百"）
            for kanji, num in kanji_numbers.items():
                if text.startswith(kanji):
                    value = num
                    break
    
    return {
        "value": value,
        "unit": unit,
        "text": original_text
    }

def extract_tags(content: str, article_number: str) -> List[str]:
    """
    条文の内容から実務的なキーワード（tags）を抽出
    """
    tags = []
    content_lower = content.lower()
    
    # 実務的なキーワードパターン
    keyword_patterns = {
        "確認申請": ["確認", "申請", "建築主事", "確認済証"],
        "構造計算": ["構造計算", "構造設計", "適合性判定"],
        "容積率": ["容積率", "延べ面積", "敷地面積"],
        "建蔽率": ["建蔽率", "建築面積"],
        "高さ制限": ["高さ", "高さ制限", "斜線制限"],
        "用途地域": ["用途地域", "第一種", "第二種", "住居", "商業", "工業"],
        "防火": ["防火", "耐火", "準耐火", "不燃"],
        "避難": ["避難", "廊下", "階段", "出入口"],
        "採光換気": ["採光", "換気", "窓", "開口部"],
        "道路": ["道路", "接道", "幅員", "前面道路"],
        "確認検査": ["確認", "検査", "完了検査", "中間検査"],
        "建築士": ["建築士", "設計", "工事監理"],
        "許可": ["許可", "特定行政庁", "建築審査会"],
        "条例": ["条例", "地方公共団体", "市町村"],
        "工作物": ["工作物", "煙突", "広告塔"],
        "増築改築": ["増築", "改築", "移転", "修繕", "模様替"],
    }
    
    for tag, keywords in keyword_patterns.items():
        if any(keyword in content_lower for keyword in keywords):
            tags.append(tag)
    
    # 条文番号から推測できるタグ
    if "第一条" in article_number or "目的" in content:
        tags.append("目的")
    if "第二条" in article_number or "用語" in content:
        tags.append("用語定義")
    
    return list(set(tags))  # 重複を除去

def parse_text_file(file_path: str) -> Dict[str, Any]:
    """
    テキストファイルを解析してJSON構造に変換
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    result = {
        "law_name": "建築基準法",
        "law_number": "昭和二十五年法律第二百一号",
        "chapters": []
    }
    
    current_chapter = None
    current_section = None
    current_article = None
    current_paragraph = None
    in_appendix_table = False
    current_table = None
    current_table_type = None
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        if not line:
            i += 1
            continue
        
        # 別表の開始を検出
        if line.startswith("別表第一") or line.startswith("別表第二") or \
           line.startswith("別表第三") or line.startswith("別表第四"):
            in_appendix_table = True
            table_match = re.match(r"別表(第一|第二|第三|第四)", line)
            if table_match:
                table_name_map = {"第一": "別表第一", "第二": "別表第二", 
                                "第三": "別表第三", "第四": "別表第四"}
                current_table_type = table_name_map[table_match.group(1)]
                # 別表のタイトルを取得（次の行まで確認）
                title_match = re.search(r"別表(第一|第二|第三|第四)　(.+)", line)
                if title_match:
                    table_title = title_match.group(2).split("（")[0]  # （以降を除去
                else:
                    table_title = current_table_type
                
                # 別表用のセクションを作成
                if not current_chapter:
                    current_chapter = {
                        "chapter_number": "附録",
                        "chapter_title": "別表",
                        "sections": []
                    }
                    result["chapters"].append(current_chapter)
                
                current_table = {
                    "table_type": current_table_type,
                    "table_title": table_title,
                    "rows": []
                }
                current_section = {
                    "section_number": current_table_type,
                    "section_title": table_title,
                    "articles": [],
                    "table_data": current_table
                }
                current_chapter["sections"].append(current_section)
            i += 1
            continue
        
        # 別表内のデータ処理は複雑なので、簡易版を実装
        if in_appendix_table:
            # 別表の終了を検出（次の章や別表が始まるまで）
            if re.match(r"^第[一二三四五六七八九十百]+章", line) or \
               line.startswith("附則") or \
               (i + 1 < len(lines) and lines[i+1].strip().startswith("別表")):
                in_appendix_table = False
                current_table = None
                current_table_type = None
            else:
                # 別表のデータ行を処理（簡易版 - 実際の実装ではより詳細な解析が必要）
                if current_table and current_table_type:
                    # 数値と単位を含む行を処理
                    if re.search(r"[〇一二三四五六七八九十百千]*(平方メートル|メートル|キロワット|リットル|時間)", line):
                        parsed = parse_number_and_unit(line)
                        current_table["rows"].append({
                            "text": line,
                            "parsed": parsed
                        })
                i += 1
                continue
        
        # 章の検出
        chapter_match = re.match(r"^第([一二三四五六七八九十百]+)章[　\s]*(.+)", line)
        if chapter_match:
            chapter_num = chapter_match.group(1)
            chapter_title = chapter_match.group(2).split("（")[0].strip()
            current_chapter = {
                "chapter_number": chapter_num,
                "chapter_title": chapter_title,
                "sections": []
            }
            result["chapters"].append(current_chapter)
            current_section = None
            current_article = None
            current_paragraph = None
            i += 1
            continue
        
        # 節の検出
        section_match = re.match(r"^第([一二三四五六七八九十]+)節[　\s]*(.+)", line)
        if section_match:
            section_num = section_match.group(1)
            section_title = section_match.group(2).split("（")[0].strip()
            if current_chapter:
                current_section = {
                    "section_number": section_num,
                    "section_title": section_title,
                    "articles": []
                }
                current_chapter["sections"].append(current_section)
                current_article = None
                current_paragraph = None
            i += 1
            continue
        
        # 条の検出
        article_match = re.match(r"^第([〇一二三四五六七八九十百]+)条[　\s]*(.+)", line)
        if article_match:
            article_num = article_match.group(1)
            article_title = article_match.group(2).strip() if article_match.group(2) else ""
            
            # 条のタイトルを括弧内から抽出
            title_match = re.search(r"（(.+)）", article_title)
            if title_match:
                article_title = title_match.group(1)
            
            if current_section:
                current_article = {
                    "article_number": article_num,
                    "article_title": article_title,
                    "content": [],
                    "paragraphs": []
                }
                current_section["articles"].append(current_article)
                current_paragraph = None
            i += 1
            continue
        
        # 項の検出（数字）
        paragraph_match = re.match(r"^([〇一二三四五六七八九十]+)[　\s]+(.+)", line)
        if paragraph_match and current_article:
            para_num = paragraph_match.group(1)
            para_content = paragraph_match.group(2).strip()
            
            # 項の中に複数の号があるかチェック
            items = []
            item_pattern = r"([一二三四五六七八九十]+)[　\s]+(.+?)(?=(?:[一二三四五六七八九十]+[　\s]+|$))"
            item_matches = re.finditer(item_pattern, para_content, re.DOTALL)
            
            for item_match in item_matches:
                item_num = item_match.group(1)
                item_content = item_match.group(2).strip()
                items.append({
                    "item_number": item_num,
                    "content": item_content,
                    "tags": extract_tags(item_content, f"第{current_article['article_number']}条")
                })
            
            # 項の内容（号がない場合）
            if not items:
                para_obj = {
                    "paragraph_number": para_num,
                    "content": para_content,
                    "items": [],
                    "tags": extract_tags(para_content, f"第{current_article['article_number']}条")
                }
            else:
                para_obj = {
                    "paragraph_number": para_num,
                    "content": para_content,
                    "items": items,
                    "tags": extract_tags(para_content, f"第{current_article['article_number']}条")
                }
            
            current_article["paragraphs"].append(para_obj)
            if not current_article["content"]:
                current_article["content"] = para_content
            else:
                # 複数の項がある場合は配列に
                if isinstance(current_article["content"], str):
                    current_article["content"] = [current_article["content"]]
                current_article["content"].append(para_content)
            i += 1
            continue
        
        # 条の本文（項がない場合）
        if current_article and not current_article["content"]:
            if line and not line.startswith("（") and not line.startswith("別表"):
                current_article["content"] = line
                current_article["tags"] = extract_tags(line, f"第{current_article['article_number']}条")
        
        i += 1
    
    return result

def main():
    input_file = Path("c:/Users/slime/Downloads/kijyunhou.txt")
    output_file = Path("kijyunhou_1.json")
    
    print(f"テキストファイルを解析中: {input_file}")
    result = parse_text_file(str(input_file))
    
    print(f"JSONファイルを出力中: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("完了しました。")

if __name__ == "__main__":
    main()

