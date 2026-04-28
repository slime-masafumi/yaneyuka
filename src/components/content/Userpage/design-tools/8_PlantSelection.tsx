import React, { useState, useMemo } from 'react';

interface PlantSelectionProps {
  hideHeader?: boolean;
}

// ==========================================
// 型定義
// ==========================================

interface PlantData {
  name: string;
  // 検索・フィルタ用
  type: '常緑高木' | '落葉高木' | '針葉樹' | '常緑中木' | '落葉中木' | '常緑低木' | '落葉低木' | '地被・草花' | 'つる性' | '特殊';
  category: '高木' | '中木' | '低木' | '地被・草花' | 'つる性' | '針葉樹' | '特殊';
  
  // 表示用スペック
  height: string;        // 樹高・草丈
  features: string;      // 花色・実・葉などの特徴
  season: string;        // 見頃（花期・実・紅葉）
  
  // フィルタ判定用データ
  sunlight: string;      // 表示用テキスト（例：日向〜半日陰）
  sunlightTags: ('日向' | '半日陰' | '日陰')[]; // フィルタ判定用配列
  
  maintenance: '易' | '普通' | '難' | '要注意(成長速)';
  growthRate: '早い' | '普通' | '遅い';
  
  // 追加: 耐性フラグ
  tolerance: {
    heat: boolean; // 暑さに強い
    cold: boolean; // 寒さに強い
    salt: boolean; // 潮風に強い
  };
  
  // スタイル・備考
  style: string[];       // 洋風, 和風, モダン, ドライ, ナチュラル, シェード
  description: string;   // 備考
  
  // オプショナル: 地域情報
  regions?: string[];    // 地域別の適応性
}

// ==========================================
// 植栽データベース (Source 1:樹木 & Source 2:GCP 統合版)
// ==========================================
const MASTER_PLANT_DATA: PlantData[] = [
  // --- Source 1: 高木・中木・低木・針葉樹 ---
  { name: 'アオキ', type: '常緑低木', category: '低木', height: '1-2m', features: '赤実(冬),耐陰性', season: '冬', sunlight: '日陰', sunlightTags: ['日陰', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '完全な日陰でも育つ最強の陰樹。' },
  { name: 'アオダモ', type: '落葉高木', category: '高木', height: '5-10m', features: '白花,涼しげな樹形', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'モダン'], description: '自然な樹形が美しくシンボルツリーとして人気。' },
  { name: 'アオハダ', type: '落葉高木', category: '高木', height: '5-10m', features: '赤実,黄葉', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '幹肌が美しく、秋の赤い実が特徴。' },
  { name: 'アカエゾマツ', type: '針葉樹', category: '針葉樹', height: '10m+', features: '耐寒性強', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: '寒冷地に適した針葉樹。暑さには弱い。' },
  { name: 'アジサイ類', type: '落葉低木', category: '低木', height: '1-2m', features: '梅雨の花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '洋風', 'シェード'], description: '日陰の庭を彩る定番花木。' },
  { name: 'ウバメガシ', type: '常緑高木', category: '高木', height: '5-10m', features: '耐潮性最強', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '生垣'], description: '備長炭の原料。潮風や乾燥に極めて強い。' },
  { name: 'アセビ', type: '常緑低木', category: '低木', height: '1-3m', features: 'スズラン状花', season: '早春', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '日陰に強く、毒性があり食害されにくい。' },
  { name: 'アベリア', type: '常緑低木', category: '低木', height: '1m', features: '花期長い', season: '夏〜秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', '生垣'], description: '非常に強健で道路脇にも使われる。' },
  { name: 'アラカシ', type: '常緑高木', category: '高木', height: '10-20m', features: '目隠し,防風', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '生垣'], description: '日陰に強く強健。' },
  { name: 'イロハモミジ', type: '落葉高木', category: '高木', height: '5-10m', features: '紅葉代表', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'モダン'], description: '西日と潮風を嫌う。' },
  { name: 'ウメモドキ', type: '落葉低木', category: '低木', height: '2-3m', features: '赤実(冬)', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '茶庭'], description: '落葉後も実が残り美しい。' },
  { name: 'ウメ類', type: '落葉高木', category: '高木', height: '3-6m', features: '早春花,香り', season: '冬〜早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '花も実も楽しめる。剪定が必要。' },
  { name: 'エゴノキ', type: '落葉高木', category: '高木', height: '5-8m', features: '白下向花', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '星型の花が可愛い。' },
  { name: 'オリーブ類', type: '常緑高木', category: '高木', height: '2-5m', features: '銀葉,実', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風', 'ドライ'], description: '乾燥と潮風に強いが、過湿と極寒は苦手。' },
  { name: 'カツラ', type: '落葉高木', category: '高木', height: '10m+', features: 'ハート葉,香り', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: '黄葉時に甘い香りがする。' },
  { name: 'ガマズミ', type: '落葉低木', category: '低木', height: '2-3m', features: '白花,赤実', season: '春・秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '和風'], description: '実が美しく野鳥が好む。' },
  { name: 'キンモクセイ', type: '常緑高木', category: '中木', height: '3-6m', features: '強芳香', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '秋の香りの代表。大気汚染にやや弱い。' },
  { name: 'クロガネモチ', type: '常緑高木', category: '高木', height: '5-10m', features: '赤実,縁起木', season: '冬', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '「金持ち」に通じ縁起が良い。' },
  { name: 'ゲッケイジュ', type: '常緑高木', category: '高木', height: '5-10m', features: '芳香葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ハーブ'], description: '葉は料理（ローリエ）に使われる。' },
  { name: 'コニファー類', type: '針葉樹', category: '針葉樹', height: '2-5m', features: '常緑,葉色', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風', 'ドライ'], description: '日本の高温多湿（蒸れ）に弱い品種が多い。' },
  { name: 'サルスベリ類', type: '落葉高木', category: '高木', height: '3-7m', features: '夏花,滑幹', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '花期が長い。' },
  { name: 'シャリンバイ', type: '常緑低木', category: '低木', height: '2m', features: '白花,車輪葉', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '公園'], description: '潮風や大気汚染に強く、道路脇によく植えられる。' },
  { name: 'シャラノキ(ナツツバキ)', type: '落葉高木', category: '高木', height: '5-10m', features: '白花,美幹', season: '夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '茶庭'], description: '西日を嫌う。' },
  { name: 'シラカシ', type: '常緑高木', category: '高木', height: '10-20m', features: '防風,目隠し', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '生垣'], description: '非常に強健。' },
  { name: 'ジンチョウゲ', type: '常緑低木', category: '低木', height: '1m', features: '春芳香', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '移植を嫌う。' },
  { name: 'ソヨゴ', type: '常緑高木', category: '高木', height: '3-7m', features: '赤実,波葉', season: '秋冬', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'モダン'], description: '成長が遅く管理しやすい。' },
  { name: 'ドウダンツツジ', type: '落葉低木', category: '低木', height: '1-2m', features: '白花,紅葉', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '生垣'], description: '紅葉が非常に鮮やか。' },
  { name: 'マホニア・コンフューサ', type: '常緑低木', category: '低木', height: '1m', features: '細葉,アジアン', season: '通年', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['モダン'], description: 'トゲが少なくモダンな印象。' },
  { name: 'マンサク類', type: '落葉中木', category: '中木', height: '3m', features: '早春黄花', season: '早春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '「まず咲く」。' },

  // --- Source 2: GCP (Ground Cover Plants) ・地被・草花・ツル ---
  { name: 'アガパンサス類', type: '地被・草花', category: '地被・草花', height: '0.6-1m', features: '青紫花,涼しげ', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '海岸近くでもよく育つ。' },
  { name: 'アジュガ', type: '地被・草花', category: '地被・草花', height: '15cm', features: '紫穂,被覆', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'シェード'], description: '半日陰の被覆に最適。' },
  { name: 'アベリア コンフェッティ', type: '常緑低木', category: '低木', height: '0.5m', features: '斑入り葉', season: '夏〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '明るい葉色が魅力。' },
  { name: 'アメリカハイビャクシン', type: '針葉樹', category: '地被・草花', height: '這性', features: 'コニファー這性', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ドライ'], description: '乾燥に強いグランドカバー。' },
  { name: 'イカリソウ', type: '地被・草花', category: '地被・草花', height: '30cm', features: '独特花形', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '山野草'], description: '和の趣がある。' },
  { name: 'オオバジャノヒゲ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '黒竜などが有名', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'モダン'], description: '非常に強健。' },
  { name: 'ガザニア類', type: '地被・草花', category: '地被・草花', height: '20cm', features: '鮮やか花', season: '春〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '潮風や乾燥に強い。' },
  { name: 'ギボウシ類(ホスタ)', type: '地被・草花', category: '地被・草花', height: '20-100cm', features: '美葉,日陰主役', season: '春〜秋', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風', 'シェード'], description: '品種によりサイズ多様。冬は落葉。' },
  { name: 'クリスマスローズ', type: '地被・草花', category: '地被・草花', height: '30-50cm', features: '冬花', season: '冬・早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: '冬の庭の貴婦人。' },
  { name: 'クレマチス類', type: 'つる性', category: 'つる性', height: '登はん性', features: '豪華花', season: '春〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'つる性植物の女王。' },
  { name: 'コトネアスター類', type: '常緑低木', category: '地被・草花', height: '這性', features: '赤実,這い性', season: '秋冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'グランドカバーやロックガーデンに。' },
  { name: 'シバザクラ類', type: '地被・草花', category: '地被・草花', height: '10cm', features: '春の花絨毯', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '乾燥に強い。' },
  { name: 'シャガ', type: '地被・草花', category: '地被・草花', height: '40cm', features: '日陰で咲く花', season: '春', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '湿った日陰を好む。' },
  { name: 'スイカズラ', type: 'つる性', category: 'つる性', height: '登はん性', features: '香り,薬用', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: 'ハニーサックル。' },
  { name: 'セイヨウイワナンテン', type: '常緑低木', category: '低木', height: '1m', features: '葉色変化', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'レインボーなどの品種がある。' },
  { name: 'タイム類', type: '地被・草花', category: '地被・草花', height: '10cm', features: '香り,踏圧強', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ハーブ'], description: 'グランドカバーハーブの代表。' },
  { name: 'タマリュウ', type: '地被・草花', category: '地被・草花', height: '10cm', features: '駐車場目地', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '踏圧に強い。' },
  { name: 'ツルニチニチソウ', type: 'つる性', category: 'つる性', height: '這性', features: '青花,日陰OK', season: '春', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'シェード'], description: '斑入り品種が明るい。' },
  { name: 'ツワブキ', type: '地被・草花', category: '地被・草花', height: '40cm', features: '丸葉,黄花', season: '晩秋', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '和風庭園の下草として定番。' },
  { name: 'トクサ', type: '地被・草花', category: '地被・草花', height: '50cm', features: '直立茎', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'モダン'], description: 'モダンな和風演出に。' },
  { name: 'ハツユキカズラ', type: 'つる性', category: 'つる性', height: '這性', features: 'ピンク新芽', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '寄せ植えやグランドカバーに。' },
  { name: 'ヒペリカム類', type: '常緑低木', category: '低木', height: '0.5m', features: '黄花,赤実', season: '夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '実が可愛い。' },
  { name: 'フッキソウ', type: '常緑低木', category: '地被・草花', height: '20cm', features: '耐陰性常緑', season: '通年', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '寒冷地でも育つ。' },
  { name: 'ヘデラ類(アイビー)', type: 'つる性', category: 'つる性', height: '這性', features: '多様な葉色', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '非常に強健で潮風にも耐える。' },
  { name: 'マツバギク', type: '地被・草花', category: '地被・草花', height: '10cm', features: '耐乾多肉', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: '塩害や乾燥に強い。' },
  { name: 'ミント類', type: '地被・草花', category: '地被・草花', height: '30cm', features: '強芳香', season: '夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ハーブ'], description: '繁殖力が強すぎるので区画が必要。' },
  { name: 'ヤブラン', type: '地被・草花', category: '地被・草花', height: '30cm', features: '耐陰性,紫穂', season: '秋', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '下草の定番。斑入りが人気。' },
  { name: 'ラベンダー類', type: '常緑低木', category: '低木', height: '40cm', features: '香り,銀葉', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ハーブ'], description: '多湿を嫌う。' },
  { name: 'ローズマリー類', type: '常緑低木', category: '低木', height: '0.3-1m', features: '料理,香り', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: '乾燥・潮風に強い。' },
  { name: 'ワイヤープランツ', type: '地被・草花', category: '地被・草花', height: '這性', features: '細かい葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'ふんわりと広がる。' },
  { name: 'クマザサ', type: '地被・草花', category: '地被・草花', height: '1m', features: '縁取り葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '冬に葉の縁が隈取られる。' },
  { name: 'コウホネ', type: '地被・草花', category: '地被・草花', height: '水生', features: '水生植物', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ビオトープ'], description: '池や水鉢に。' },
  { name: 'シロタエギク', type: '地被・草花', category: '地被・草花', height: '30cm', features: '銀葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', '寄せ植え'], description: 'シルバーリーフの代表。' },
  { name: 'ハラン', type: '常緑低木', category: '地被・草花', height: '50cm', features: '大きな葉', season: '通年', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '寿司の仕切り飾りの由来。完全な日陰OK。' },
  { name: 'ビナンカズラ', type: 'つる性', category: 'つる性', height: '登はん性', features: '赤実', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '昔は整髪料に使われた。' },
  { name: 'フジ類', type: 'つる性', category: 'つる性', height: '登はん性', features: '紫の房花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '棚'], description: '藤棚で有名。' },
  { name: 'ムスカリ', type: '地被・草花', category: '地被・草花', height: '15cm', features: '紫小花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '球根植物。群生させると綺麗。' },
  { name: 'ユリ類', type: '地被・草花', category: '地被・草花', height: '1m', features: '豪華花,香り', season: '夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', '和風'], description: 'ヤマユリ、カサブランカなど。' },
  { name: 'リシマキア', type: '地被・草花', category: '地被・草花', height: '這性', features: '黄葉/花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'シェード'], description: '這うように広がる。ヌムラリアが有名。' },

  // === 追加データ Part 1 (樹木: ア行〜カ行など) ===
  { name: 'アカガシ', type: '常緑高木', category: '高木', height: '10-20m', features: '防風,目隠し', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '材が赤みを帯びる。強健。' },
  { name: 'アカシデ', type: '落葉高木', category: '高木', height: '5-10m', features: '新緑,紅葉', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '和風'], description: '春の赤みを帯びた新芽が美しい。' },
  { name: 'アカマツ', type: '針葉樹', category: '針葉樹', height: '10m+', features: '赤樹皮,和風', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '日本の代表的な松。日当たり必須。' },
  { name: 'アキグミ', type: '落葉低木', category: '低木', height: '2-3m', features: '赤実,白花', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['ナチュラル'], description: '実は食用にもなる。潮風に強い。' },
  { name: 'アキニレ', type: '落葉高木', category: '高木', height: '10m', features: '黄葉,樹皮', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['公園', '洋風'], description: '秋に花が咲く珍しいニレ。' },
  { name: 'アスナロ', type: '針葉樹', category: '針葉樹', height: '10-20m', features: '常緑,美葉', season: '通年', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '「明日はヒノキになろう」。' },
  { name: 'アブラチャン', type: '落葉高木', category: '高木', height: '3-5m', features: '黄小花', season: '早春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木'], description: '自然な風情が魅力。' },
  { name: 'アベマキ', type: '落葉高木', category: '高木', height: '10m+', features: 'コルク質樹皮', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: 'クヌギに似るが樹皮がコルク質。' },
  { name: 'アメリカザイフリボク', type: '落葉高木', category: '高木', height: '5m', features: '花,実,紅葉', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: 'ジューンベリーの別名。' },
  { name: 'アメリカフウ', type: '落葉高木', category: '高木', height: '10-20m', features: '紅葉鮮やか', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'モミジバフウとも呼ばれる。' },
  { name: 'イスノキ', type: '常緑高木', category: '高木', height: '10m+', features: '虫こぶ', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '非常に材が硬い。' },
  { name: 'イタヤカエデ', type: '落葉高木', category: '高木', height: '10-20m', features: '黄葉', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '葉が大きく明るい黄色に紅葉する。' },
  { name: 'イタリアポプラ', type: '落葉高木', category: '高木', height: '20m', features: '直立樹形', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '成長が極めて早い。' },
  { name: 'イタリアンサイプレス', type: '針葉樹', category: '針葉樹', height: '5-10m', features: '細円柱形', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: true }, style: ['洋風'], description: '洋風庭園のアクセント。' },
  { name: 'イチイ', type: '針葉樹', category: '針葉樹', height: '5-10m', features: '赤実', season: '秋冬', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '刈り込みに強く生垣にもなる。' },
  { name: 'イチイガシ', type: '常緑高木', category: '高木', height: '15m', features: '防風', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '暖地に適する。' },
  { name: 'イチョウ', type: '落葉高木', category: '高木', height: '20m', features: '黄葉,銀杏', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '秋の黄葉が美しい。' },
  { name: 'イトヒバ', type: '針葉樹', category: '針葉樹', height: '5m', features: '枝垂れ', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '和風庭園向き。' },
  { name: 'イヌエンジュ', type: '落葉高木', category: '高木', height: '10m', features: '白花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '街路樹に使われる。' },
  { name: 'イヌコリヤナギ', type: '落葉低木', category: '低木', height: '2m', features: '斑入り葉', season: '春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: 'ハクロニシキが有名。' },
  { name: 'イヌシデ', type: '落葉高木', category: '高木', height: '10m', features: '新緑・紅葉', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '和風'], description: '盆栽にも使われる。' },
  { name: 'イヌツゲ', type: '常緑低木', category: '低木', height: '1-3m', features: '細かい葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '和風庭園の玉散らし仕立てが定番。' },
  { name: 'イヌマキ', type: '針葉樹', category: '針葉樹', height: '10m', features: '防風,目隠し', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '千葉県の県木。潮風に強い。' },
  { name: 'ウグイスカグラ', type: '落葉低木', category: '低木', height: '2m', features: '赤花,赤実', season: '春・初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '野趣あふれる姿。' },
  { name: 'ウツギ', type: '落葉低木', category: '低木', height: '2m', features: '白花(卯の花)', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '「夏は来ぬ」で歌われる花。' },
  { name: 'ウラジロガシ', type: '常緑高木', category: '高木', height: '15m', features: '葉裏が白', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'ドングリがなる。' },
  { name: 'ウラジロモミ', type: '針葉樹', category: '針葉樹', height: '15m', features: '葉裏が白', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'クリスマスツリー。' },
  { name: 'ウリハダカエデ', type: '落葉高木', category: '高木', height: '10m', features: '樹皮,紅葉', season: '秋', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '樹皮が瓜に似る。' },
  { name: 'エゴノキ ピンクチャイム', type: '落葉高木', category: '高木', height: '5m', features: '赤花', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '洋風'], description: 'ピンクの花が咲くエゴノキ。' },
  { name: 'エゾムラサキツツジ', type: '常緑低木', category: '低木', height: '1m', features: '紫花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '寒冷地向き。' },
  { name: 'エヅユズリハ', type: '常緑低木', category: '低木', height: '2m', features: '譲り葉', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'ユズリハの矮性種。' },
  { name: 'エニシダ', type: '落葉低木', category: '低木', height: '2m', features: '黄花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '鮮やかな黄色の花が咲く。' },
  { name: 'エノキ', type: '落葉高木', category: '高木', height: '20m', features: '巨木', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['公園', 'ナチュラル'], description: '非常に大きくなる。国蝶オオムラサキの食樹。' },
  { name: 'エンジュ', type: '落葉高木', category: '高木', height: '10m', features: '黄白花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '街路樹に使われる。' },
  { name: 'オウゴンコノテ', type: '針葉樹', category: '針葉樹', height: '3m', features: '黄金葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: 'コニファーの一種。' },
  { name: 'オオシマザクラ', type: '落葉高木', category: '高木', height: '10m', features: '白花,香り', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '洋風'], description: '桜餅の葉に使われる。潮風に強い。' },
  { name: 'オオベニウツギ', type: '落葉低木', category: '低木', height: '2m', features: '赤花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '強健で花付きが良い。' },
  { name: 'オオムラサキツツジ', type: '常緑低木', category: '低木', height: '1.5m', features: '紫大花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '街路樹の定番。公害に強い。' },
  { name: 'オオヤマザクラ', type: '落葉高木', category: '高木', height: '15m', features: '濃ピンク花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '寒冷地向きの桜。' },
  { name: 'オガタマノキ', type: '常緑高木', category: '高木', height: '10m', features: '芳香花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '神聖な木として扱われる。' },
  { name: 'オトメツバキ', type: '常緑高木', category: '中木', height: '3-4m', features: 'ピンク八重花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '花形が整っており美しい。' },
  { name: 'カイコウズ', type: '落葉高木', category: '高木', height: '5m', features: '赤花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: 'アメリカデイゴ。鹿児島県の県木。' },
  { name: 'カイヅカイブキ', type: '針葉樹', category: '針葉樹', height: '5m', features: '生垣', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '潮風に強い。' },
  { name: 'カイノキ', type: '落葉高木', category: '高木', height: '10m', features: '紅葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '「学問の木」と呼ばれる。' },
  { name: 'ガクアジサイ', type: '落葉低木', category: '低木', height: '1-2m', features: '額縁花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '洋風'], description: 'アジサイの原種。' },
  { name: 'カクレミノ', type: '常緑高木', category: '高木', height: '5m', features: '異形葉', season: '通年', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '日陰に強く、葉の形が変わる。' },
  { name: 'カシワ', type: '落葉高木', category: '高木', height: '10m', features: '大葉', season: '端午の節句', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '柏餅の葉。縁起が良い。' },
  { name: 'カマクラヒバ', type: '針葉樹', category: '針葉樹', height: '3m', features: '生垣', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '刈り込みに強い。' },
  { name: 'カヤ', type: '針葉樹', category: '針葉樹', height: '15m', features: '美材', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '碁盤の最高級材。' },
  { name: 'カラタネオガタマ', type: '常緑高木', category: '高木', height: '3-5m', features: 'バナナ香', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: false }, style: ['和風', '洋風'], description: 'バナナのような甘い香りの花。' },
  { name: 'カラマツ', type: '針葉樹', category: '針葉樹', height: '20m', features: '落葉針葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: '秋に黄葉する珍しい針葉樹。' },
  { name: 'カリン', type: '落葉高木', category: '高木', height: '5m', features: '芳香実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '実は喉の薬になる。' },
  { name: 'カルミア', type: '常緑低木', category: '低木', height: '1.5m', features: '金平糖花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'アメリカシャクナゲとも呼ばれる。' },
  { name: 'カロリナポプラ', type: '落葉高木', category: '高木', height: '20m', features: '直立', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '成長が非常に早い。' },
  { name: 'カンチク', type: '特殊', category: '特殊', height: '2m', features: '寒竹', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '冬にタケノコが出る。' },
  { name: 'カンツバキ', type: '常緑低木', category: '低木', height: '1.5m', features: '冬花', season: '冬', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: 'サザンカの一種。這い性がある。' },
  { name: 'カンヒザクラ', type: '落葉高木', category: '高木', height: '5m', features: '濃紅花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '沖縄で桜といえばこれ。' },
  { name: 'キッコウチク', type: '特殊', category: '特殊', height: '5m', features: '亀甲竹', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '棹の基部が亀甲状になる。' },
  { name: 'キブシ', type: '落葉低木', category: '低木', height: '3m', features: '穂状黄花', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '和風'], description: 'かんざしのような花。' },
  { name: 'キャラボク', type: '針葉樹', category: '針葉樹', height: '1-2m', features: '玉散らし', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'イチイの変種。仕立てものに使われる。' },
  { name: 'キョウチクトウ', type: '常緑低木', category: '低木', height: '3m', features: '夏花,公害強', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['公園', '洋風'], description: '非常に強健だが有毒。' },
  { name: 'キンシバイ', type: '落葉低木', category: '低木', height: '1m', features: '黄花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '半日陰のグランドカバー低木。' },
  { name: 'キンメイチク', type: '特殊', category: '特殊', height: '5m', features: '金明竹', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '黄色と緑の縞模様が入る。' },
  { name: 'キンメツゲ', type: '常緑低木', category: '低木', height: '1m', features: '新芽黄色', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '新芽が美しい。生垣によい。' },
  { name: 'ギンヨウアカシア', type: '常緑高木', category: '高木', height: '5m', features: '黄花,銀葉', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: 'ミモザ。風に弱いので支柱必須。' },

  // === 追加データ Part 2 (樹木: ク行〜ホ行) ===
  { name: 'クスノキ', type: '常緑高木', category: '高木', height: '20m', features: '巨木,香り', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['公園', '和風'], description: '神社の御神木として有名。非常に大きくなる。' },
  { name: 'クチナシ', type: '常緑低木', category: '低木', height: '1m', features: '白花,甘い香り', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風', '洋風'], description: '三大香木の一つ。オオスカシバの幼虫に注意。' },
  { name: 'クヌギ', type: '落葉高木', category: '高木', height: '15m', features: 'ドングリ', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: 'カブトムシが集まる雑木林の主。' },
  { name: 'グミ ギルトエッジ', type: '常緑低木', category: '低木', height: '2m', features: '黄斑入り葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '明るい葉色が特徴のナワシログミの園芸種。' },
  { name: 'クルメツツジ', type: '常緑低木', category: '低木', height: '1m', features: '小花満開', season: '春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '花が株全体を覆うように咲く。' },
  { name: 'クロガネモチ', type: '常緑高木', category: '高木', height: '10m', features: '赤実,縁起木', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '「金持ち」に通じ縁起が良い。潮風や排ガスに強い。' },
  { name: 'クロチク', type: '特殊', category: '特殊', height: '3-5m', features: '黒い茎', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'モダン'], description: '黒い幹が和モダンな雰囲気を演出する。' },
  { name: 'クロマツ', type: '針葉樹', category: '針葉樹', height: '20m', features: '剛健,和風', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '潮風に強い海岸の松。剪定は難しい。' },
  { name: 'クロモジ', type: '落葉低木', category: '低木', height: '3m', features: '芳香枝,黄葉', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '雑木'], description: '高級爪楊枝の材料。枝を折ると良い香りがする。' },
  { name: 'ゲッケイジュ', type: '常緑高木', category: '高木', height: '5-10m', features: '芳香葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風', 'ハーブ'], description: '葉はローリエとして料理に使われる。萌芽力が強い。' },
  { name: 'ケヤキ', type: '落葉高木', category: '高木', height: '20m', features: '箒状樹形', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '広大なスペースが必要。街路樹や公園のシンボル。' },
  { name: 'コウオトメツバキ', type: '常緑高木', category: '中木', height: '4m', features: '桃花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '乙女椿の赤花品種。' },
  { name: 'コウヤマキ', type: '針葉樹', category: '針葉樹', height: '15m', features: '美樹形', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '世界三大造園木の一つ。水に強い。' },
  { name: 'コデマリ', type: '落葉低木', category: '低木', height: '1.5m', features: '白手毬花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '小さな白い花が手毬状に咲く。' },
  { name: 'コナラ', type: '落葉高木', category: '高木', height: '15m', features: '紅葉,ドングリ', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '雑木の庭の主木として人気。' },
  { name: 'コノテガシワ エレガンティシマ', type: '針葉樹', category: '針葉樹', height: '4m', features: '黄金葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '葉が垂直に立つコニファー。' },
  { name: 'コブシ', type: '落葉高木', category: '高木', height: '10m', features: '白花(早春)', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '雑木'], description: '桜より早く、春の訪れを告げる白い花。' },
  { name: 'コムラサキ', type: '落葉低木', category: '低木', height: '1.5m', features: '紫実', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '秋に付く紫色の実が美しい。' },
  { name: 'ゴヨウマツ', type: '針葉樹', category: '針葉樹', height: '10m', features: '盆栽', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '成長が遅く樹形が乱れにくい。' },
  { name: 'サカキ', type: '常緑高木', category: '高木', height: '5m', features: '神事', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '本榊。神棚に供える。関東以北ではヒサカキで代用。' },
  { name: 'サザンカ', type: '常緑高木', category: '中木', height: '4m', features: '冬花', season: '冬', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '冬に咲く貴重な花木。生垣の定番。' },
  { name: 'サツキ オオサカヅキ', type: '常緑低木', category: '低木', height: '1m', features: '花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '公園'], description: '刈り込みに強く、公共植栽によく使われる。' },
  { name: 'サトザクラ', type: '落葉高木', category: '高木', height: '8m', features: '八重花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'ボタンザクラとも呼ばれる。花期はソメイヨシノより遅い。' },
  { name: 'サラサドウダン', type: '落葉低木', category: '低木', height: '3m', features: '釣鐘花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'フウリンツツジとも。暑さを嫌う。' },
  { name: 'サルスベリ', type: '落葉高木', category: '高木', height: '5m', features: '夏花,滑幹', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', '洋風'], description: '百日紅。夏の間咲き続ける。' },
  { name: 'サワグルミ', type: '落葉高木', category: '高木', height: '20m', features: '湿地向', season: '新緑', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '渓流沿いに自生する。' },
  { name: 'サワラ', type: '針葉樹', category: '針葉樹', height: '15m', features: 'ヒノキ似', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '湿気を好む。葉裏の気孔帯がX字。' },
  { name: 'サンゴジュ', type: '常緑高木', category: '高木', height: '8m', features: '赤実,防火', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['公園', '和風'], description: '水分を多く含み防火樹として使われる。' },
  { name: 'サンシュユ', type: '落葉高木', category: '高木', height: '5m', features: '黄花(早春)', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '雑木'], description: '春黄金花。秋には赤い実がなる。' },
  { name: 'シキミ', type: '常緑高木', category: '高木', height: '5m', features: '仏事', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '有毒植物。仏事に使われる。' },
  { name: 'シダレザクラ', type: '落葉高木', category: '高木', height: '10m', features: '枝垂れ', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '風情のある桜。' },
  { name: 'シダレモミジ', type: '落葉高木', category: '高木', height: '3m', features: '枝垂れ紅葉', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'モダン'], description: '繊細な葉が枝垂れる。' },
  { name: 'シダレヤナギ', type: '落葉高木', category: '高木', height: '10m', features: '水辺', season: '新緑', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '水湿地を好む。' },
  { name: 'シデコブシ', type: '落葉高木', category: '高木', height: '4m', features: '早春花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '雑木'], description: '花弁が多いコブシの仲間。' },
  { name: 'シナノキ', type: '落葉高木', category: '高木', height: '15m', features: '菩提樹', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '冷涼地を好む。' },
  { name: 'シマサルスベリ', type: '落葉高木', category: '高木', height: '10m', features: '白花,美幹', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: 'サルスベリより大型で成長が早い。' },
  { name: 'シマトネリコ', type: '常緑高木', category: '高木', height: '8m', features: '涼小葉', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風', 'モダン'], description: '洋風・モダンに合う人気の庭木。成長が非常に早い。' },
  { name: 'シモツケ', type: '落葉低木', category: '低木', height: '1m', features: '桃花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '強健で育てやすい。' },
  { name: 'シャクナゲ', type: '常緑低木', category: '低木', height: '2m', features: '豪華花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '洋風'], description: '夏の暑さと乾燥を嫌う。' },
  { name: 'シャリンバイ', type: '常緑低木', category: '低木', height: '2m', features: '白花,黒実', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', '公園'], description: '潮風や大気汚染に強い。' },
  { name: 'ショウジョウノムラ', type: '落葉高木', category: '高木', height: '4m', features: '紫葉', season: '春〜秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'モダン'], description: 'ノムラモミジ。一年中葉が赤い。' },
  { name: 'シラカシ', type: '常緑高木', category: '高木', height: '15m', features: '防風', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '日陰でも育つ最強の常緑樹。' },
  { name: 'シラカンバ', type: '落葉高木', category: '高木', height: '15m', features: '白幹', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '高原の木。暖地ではテッポウムシの被害に遭いやすい。' },
  { name: 'シラキ', type: '落葉高木', category: '高木', height: '6m', features: '紅葉,美幹', season: '秋', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '雑木'], description: '紅葉が非常に美しい。' },
  { name: 'シロダモ', type: '常緑高木', category: '高木', height: '10m', features: '葉裏白', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '新芽の毛が金色に見える。' },
  { name: 'シロバナハギ', type: '落葉低木', category: '低木', height: '1.5m', features: '白花', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '秋の七草。' },
  { name: 'シロヤマブキ', type: '落葉低木', category: '低木', height: '1m', features: '白花,黒実', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'ヤマブキとは別属。日陰に耐える。' },
  { name: 'シンジュ', type: '落葉高木', category: '高木', height: '15m', features: '成長速', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['公園'], description: 'ニワウルシ。繁殖力が強すぎるため注意。' },
  { name: 'ジンチョウゲ', type: '常緑低木', category: '低木', height: '1m', features: '芳香', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '春の香りの代表。移植を嫌う。' },
  { name: 'スギ', type: '針葉樹', category: '針葉樹', height: '30m', features: '直立', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '公園'], description: '日本固有種。' },
  { name: 'スズコナリヒラ', type: '特殊', category: '特殊', height: '3m', features: '竹', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '株立ち状になる竹。' },
  { name: 'スダジイ', type: '常緑高木', category: '高木', height: '20m', features: '椎の実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '実は渋抜きなしで食べられる。' },
  { name: 'セイヨウイボタ', type: '常緑低木', category: '低木', height: '2m', features: '生垣', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'プリペット。洋風の生垣に。' },
  { name: 'セイヨウシャクナゲ', type: '常緑低木', category: '低木', height: '2m', features: '豪華花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: '花色が豊富。' },
  { name: 'セイヨウバイカウツギ', type: '落葉低木', category: '低木', height: '2m', features: '白花,香', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'ベルエトワールなどが人気。' },
  { name: 'セイヨウバクチノキ', type: '常緑高木', category: '高木', height: '8m', features: '生垣', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: '葉が大きい。' },
  { name: 'セイヨウヒイラギ', type: '常緑高木', category: '高木', height: '5m', features: '赤実,Xmas', season: '冬', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'クリスマスホーリー。' },
  { name: 'センダン', type: '落葉高木', category: '高木', height: '15m', features: '紫花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['公園', 'ナチュラル'], description: '成長が非常に早い。' },
  { name: 'センペルセコイア', type: '針葉樹', category: '針葉樹', height: '30m', features: '巨木', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '世界一高くなる木の仲間。' },
  { name: 'センリョウ', type: '常緑低木', category: '低木', height: '0.8m', features: '赤実,縁起', season: '冬', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '正月の縁起物。実は葉の上につく。' },
  { name: 'ソシンロウバイ', type: '落葉低木', category: '中木', height: '3m', features: '黄花,芳香', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '花の中心まで黄色いロウバイ。' },
  { name: 'ソテツ', type: '特殊', category: '特殊', height: '2-4m', features: '南国風', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', 'リゾート'], description: '非常に寿命が長い。寒さには弱い。' },
  { name: 'ソメイヨシノ', type: '落葉高木', category: '高木', height: '10m', features: '桜', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '日本の桜の代表。寿命は60年程度。' },
  { name: 'ソヨゴ', type: '常緑高木', category: '高木', height: '5m', features: '赤実,波葉', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'モダン'], description: '成長が遅く管理しやすいシンボルツリー。' },
  { name: 'タイワンフウ', type: '落葉高木', category: '高木', height: '15m', features: '紅葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: 'フウの仲間。暖地向き。' },
  { name: 'タギョウショウ', type: '針葉樹', category: '針葉樹', height: '3m', features: '傘状樹形', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'アカマツの園芸品種。' },
  { name: 'タチカンツバキ', type: '常緑高木', category: '中木', height: '3m', features: '冬花', season: '冬', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '立ち性のカンツバキ。' },
  { name: 'タニウツギ', type: '落葉低木', category: '低木', height: '2m', features: 'ピンク花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '日本海側に多い。' },
  { name: 'タブノキ', type: '常緑高木', category: '高木', height: '15m', features: '大木', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '海岸沿いの照葉樹林の主木。' },
  { name: 'タマイブキ', type: '針葉樹', category: '針葉樹', height: '1m', features: '玉散らし', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '丸く刈り込まれる。' },
  { name: 'タラヨウ', type: '常緑高木', category: '高木', height: '10m', features: '葉書', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '葉の裏に文字が書ける（ハガキの語源）。' },
  { name: 'ダンコウバイ', type: '落葉高木', category: '高木', height: '4m', features: '黄花,黄葉', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '雑木'], description: '葉の形がユニーク。' },
  { name: 'チャイニーズホーリー', type: '常緑高木', category: '中木', height: '3m', features: '赤実,トゲ', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'クリスマスホーリー。' },
  { name: 'チャノキ', type: '常緑低木', category: '低木', height: '1m', features: '茶葉,花', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'お茶の木。ツバキ科。' },
  { name: 'チャボヒバ', type: '針葉樹', category: '針葉樹', height: '3m', features: '和風', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'ヒノキの園芸品種。' },
  { name: 'チャメロップス', type: '特殊', category: '特殊', height: '2m', features: '掌状葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: '耐寒性のあるヤシ。' },
  { name: 'チョウセンゴヨウ', type: '針葉樹', category: '針葉樹', height: '15m', features: '松ぼっくり', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '実は松の実として食用になる。' },
  { name: 'ツガ', type: '針葉樹', category: '針葉樹', height: '20m', features: '美林', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'モミと並ぶ針葉樹。' },
  { name: 'ツブラジイ', type: '常緑高木', category: '高木', height: '15m', features: '椎の実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: 'スダジイより実が丸い。' },
  { name: 'テーダマツ', type: '針葉樹', category: '針葉樹', height: '20m', features: '三葉松', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '北米原産。成長早い。' },
  { name: 'テンダイウヤク', type: '常緑低木', category: '低木', height: '3m', features: '薬用', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '葉裏が白い。' },
  { name: 'ドイツトウヒ', type: '針葉樹', category: '針葉樹', height: '20m', features: 'Xmasツリー', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'ヨーロッパのクリスマスツリー。' },
  { name: 'トウカエデ', type: '落葉高木', category: '高木', height: '15m', features: '紅葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '街路樹によく使われる。' },
  { name: 'トウジュロ', type: '特殊', category: '特殊', height: '4m', features: 'ヤシ', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['リゾート'], description: 'シュロより葉が垂れない。' },
  { name: 'ドウダンツツジ', type: '落葉低木', category: '低木', height: '1.5m', features: '紅葉,白花', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '生垣'], description: '紅葉が真っ赤で美しい。' },
  { name: 'トウチク', type: '特殊', category: '特殊', height: '3m', features: '竹', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '大名竹。' },
  { name: 'トキワイカリソウ', type: '地被・草花', category: '地被・草花', height: '30cm', features: '常緑,花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '常緑性のイカリソウ。' },
  { name: 'トキワマンサク', type: '常緑高木', category: '中木', height: '3m', features: 'リボン状花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: '生垣に人気。赤葉品種もある。' },
  { name: 'トサミズキ', type: '落葉低木', category: '低木', height: '2m', features: '黄花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '早春に黄色い花が下がる。' },
  { name: 'トチノキ', type: '落葉高木', category: '高木', height: '20m', features: '大木,実', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '実は栃餅になる。' },
  { name: 'トドマツ', type: '針葉樹', category: '針葉樹', height: '20m', features: '北国', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '北海道の主要樹種。' },
  { name: 'トベラ', type: '常緑低木', category: '低木', height: '3m', features: '芳香,耐潮', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['海岸', '公園'], description: '海岸に強く、節分の魔除けにもなる。' },
  { name: 'ドロノキ', type: '落葉高木', category: '高木', height: '20m', features: '早生', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: 'ポプラの仲間。' },
  { name: 'ナギ', type: '針葉樹', category: '針葉樹', height: '15m', features: '神木,良縁', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '葉がちぎれないことから縁結びの木とされる。' },
  { name: 'ナツグミ', type: '落葉低木', category: '低木', height: '2m', features: '実(食用)', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '初夏に実が熟す。' },
  { name: 'ナツツバキ', type: '落葉高木', category: '高木', height: '8m', features: '白花,幹', season: '夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '茶庭'], description: 'シャラノキ。幹肌が美しい。' },
  { name: 'ナツハゼ', type: '落葉低木', category: '低木', height: '2m', features: '黒実,紅葉', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '和製ブルーベリー。' },
  { name: 'ナナカマド', type: '落葉高木', category: '高木', height: '8m', features: '赤実,紅葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '雑木'], description: '寒冷地で美しく紅葉する。' },
  { name: 'ナナミノキ', type: '常緑高木', category: '高木', height: '10m', features: '赤実', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '実がたくさんなる。' },
  { name: 'ナリヒラダケ', type: '特殊', category: '特殊', height: '4m', features: '竹', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '在原業平にちなむ。' },
  { name: 'ナワシログミ', type: '常緑低木', category: '低木', height: '2m', features: '芳香花', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '洋風'], description: '苗代の時期に実が熟す。' },
  { name: 'ナンキンハゼ', type: '落葉高木', category: '高木', height: '10m', features: '紅葉,白実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['公園', '洋風'], description: '紅葉が美しく、白い実が残る。' },
  { name: 'ナンテン', type: '常緑低木', category: '低木', height: '2m', features: '赤実,縁起', season: '冬', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '「難を転ずる」縁起木。' },
  { name: 'ニオイシュロラン', type: '特殊', category: '特殊', height: '5m', features: '南国風', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: 'コルジリネの一種。' },
  { name: 'ニオイヒバ', type: '針葉樹', category: '針葉樹', height: '5m', features: '芳香', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '葉を揉むと香る。' },
  { name: 'ニシキギ', type: '落葉低木', category: '低木', height: '2m', features: '紅葉,翼', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '雑木'], description: '枝にコルク質の翼がある。紅葉が鮮やか。' },
  { name: 'ニッコウヒバ', type: '針葉樹', category: '針葉樹', height: '15m', features: '針葉', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'サワラの園芸品種。' },
  { name: 'ニワウメ', type: '落葉低木', category: '低木', height: '1.5m', features: '桃花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '庭に植えやすい。' },
  { name: 'ネコヤナギ', type: '落葉低木', category: '低木', height: '2m', features: '花穂', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '銀白色の毛に覆われた花穂。' },
  { name: 'ネズミモチ', type: '常緑高木', category: '高木', height: '5m', features: '黒実', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '非常に強健で生垣に使われる。' },
  { name: 'ネムノキ', type: '落葉高木', category: '高木', height: '8m', features: '合歓の花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '夜になると葉が閉じる。' },
  { name: 'ノリウツギ', type: '落葉低木', category: '低木', height: '3m', features: '白花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '洋風'], description: 'ピラミッドアジサイの仲間。' },
  { name: 'ハイノキ', type: '常緑高木', category: '高木', height: '4m', features: '白花,繊細', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: false, salt: false }, style: ['和風'], description: '成長が遅く樹形が乱れにくい。' },
  { name: 'ハイビスカス', type: '常緑低木', category: '低木', height: '1.5m', features: '熱帯花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: '寒さに弱い。' },
  { name: 'ハクウンボク', type: '落葉高木', category: '高木', height: '8m', features: '白花,大葉', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: 'エゴノキの仲間。' },
  { name: 'ハクサンボク', type: '常緑低木', category: '低木', height: '3m', features: '白花,赤実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', '洋風'], description: 'ガマズミの常緑版。' },
  { name: 'ハクチョウゲ', type: '常緑低木', category: '低木', height: '0.6m', features: '白小花', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '刈り込みに強い。' },
  { name: 'ハクモクレン', type: '落葉高木', category: '中木', height: '5m', features: '白大花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '春の空に白い花が映える。' },
  { name: 'ハコネウツギ', type: '落葉低木', category: '低木', height: '3m', features: '紅白花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '洋風'], description: '花の色が白から赤へ変化する。' },
  { name: 'ハナカイドウ', type: '落葉高木', category: '高木', height: '5m', features: '桃花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '美人の代名詞。' },
  { name: 'ハナズオウ', type: '落葉低木', category: '低木', height: '3m', features: '紫紅花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '枝に直接花が咲く。' },
  { name: 'ハナノキ', type: '落葉高木', category: '高木', height: '20m', features: '紅葉,赤花', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '湿地を好むカエデの仲間。' },
  { name: 'ハナミズキ', type: '落葉高木', category: '高木', height: '6m', features: '花,紅葉', season: '春・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '春の代表花木。うどんこ病に注意。' },
  { name: 'ハマナス', type: '落葉低木', category: '低木', height: '1.5m', features: '赤花,実', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: false, cold: true, salt: true }, style: ['ナチュラル'], description: '海岸の砂地に生えるバラ。' },
  { name: 'ハマヒサカキ', type: '常緑低木', category: '低木', height: '2m', features: '耐潮', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '海岸沿いの生垣に最適。' },
  { name: 'ハマビワ', type: '常緑高木', category: '高木', height: '5m', features: '毛深い葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: 'ビワに似た葉を持つ。' },
  { name: 'ハマボウ', type: '落葉高木', category: '高木', height: '3m', features: '黄花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', 'リゾート'], description: '夏にハイビスカス似の花が咲く。' },
  { name: 'ハルニレ', type: '落葉高木', category: '高木', height: '20m', features: '大木', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: 'エルム。寒冷地向き。' },
  { name: 'バンクスマツ', type: '針葉樹', category: '針葉樹', height: '15m', features: '曲がった幹', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '寒さに非常に強い。' },
  { name: 'ハンノキ', type: '落葉高木', category: '高木', height: '15m', features: '湿地向', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '痩せ地や湿地でも育つ。' },
  { name: 'ヒイラギ', type: '常緑高木', category: '中木', height: '4m', features: 'トゲ葉', season: '冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '節分の魔除け。老木になると葉が丸くなる。' },
  { name: 'ヒイラギナンテン', type: '常緑低木', category: '低木', height: '1.5m', features: '黄花', season: '早春', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '日陰に強く、黄色い花が咲く。' },
  { name: 'ヒイラギモクセイ', type: '常緑高木', category: '中木', height: '4m', features: 'トゲ葉,芳香', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '防犯生垣に使われる。' },
  { name: 'ヒサカキ', type: '常緑低木', category: '低木', height: '3m', features: '仏事', season: '通年', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '独特のガスのような匂いがある。' },
  { name: 'ヒトツバタゴ', type: '落葉高木', category: '高木', height: '10m', features: '白花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: 'ナンジャモンジャ。木全体が白く見えるほど咲く。' },
  { name: 'ヒノキ', type: '針葉樹', category: '針葉樹', height: '20m', features: '良材', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '高級建材。香りが良い。' },
  { name: 'ヒノキ クリプシィー', type: '針葉樹', category: '針葉樹', height: '3m', features: '黄金葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '明るい葉色のコニファー。' },
  { name: 'ヒマラヤスギ', type: '針葉樹', category: '針葉樹', height: '20m', features: '大木', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '世界三大造園木。円錐形の樹形が美しい。' },
  { name: 'ヒメシャラ', type: '落葉高木', category: '高木', height: '8m', features: '赤肌,白花', season: '夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'モダン'], description: '赤褐色の幹肌が美しく、シンボルツリーに人気。' },
  { name: 'ヒメユズリハ', type: '常緑高木', category: '高木', height: '8m', features: '縁起', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: 'ユズリハより小型で庭に使いやすい。' },
  { name: 'ヒョウガミズキ', type: '落葉低木', category: '低木', height: '2m', features: '黄花', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'トサミズキより花が小さい。' },
  { name: 'ビヨウヤナギ', type: '常緑低木', category: '低木', height: '1m', features: '黄花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '長い雄しべが特徴的。' },
  { name: 'ピラカンサ', type: '常緑低木', category: '低木', height: '2m', features: '赤実,トゲ', season: '秋冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '実がびっしりと付き、防犯生垣にもなる。' },
  { name: 'ヒラドツツジ', type: '常緑低木', category: '低木', height: '2m', features: '大花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '大型のツツジ。公園や街路樹に多い。' },
  { name: 'ビロウ', type: '特殊', category: '特殊', height: '5m', features: 'ヤシ', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: '沖縄などに自生するヤシ。' },
  { name: 'フェイジョア', type: '常緑低木', category: '中木', height: '3m', features: '果樹,花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: 'エキゾチックな花と食用になる実。' },
  { name: 'フサアカシア', type: '常緑高木', category: '高木', height: '8m', features: '黄花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: 'ミモザ。成長が早く風で倒れやすい。' },
  { name: 'ブナ', type: '落葉高木', category: '高木', height: '20m', features: '美林', season: '新緑', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '温帯林の主要樹種。平地では育ちにくい。' },
  { name: 'プラタナス', type: '落葉高木', category: '高木', height: '20m', features: '迷彩柄幹', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['公園', '洋風'], description: 'スズカケノキ。街路樹の定番。' },
  { name: 'ブルーベリー', type: '落葉低木', category: '低木', height: '1.5m', features: '実(食用),紅葉', season: '初夏・秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: '酸性土壌を好む。紅葉も美しい。' },
  { name: 'プンゲンストウヒ', type: '針葉樹', category: '針葉樹', height: '10m', features: '銀葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'ホプシーなどの園芸種が人気。暑さに弱い。' },
  { name: 'ベニカナメ', type: '常緑高木', category: '高木', height: '5m', features: '赤芽', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: '生垣の定番。ごま色斑点病に注意。' },
  { name: 'ベニバスモモ', type: '落葉低木', category: '低木', height: '4m', features: '赤葉,桃花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '春に咲くピンクの花と銅葉が美しい。' },
  { name: 'ベニバナシャリンバイ', type: '常緑低木', category: '低木', height: '2m', features: '赤花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', '公園'], description: 'シャリンバイの赤花品種。' },
  { name: 'ベニバナトチノキ', type: '落葉高木', category: '高木', height: '10m', features: '赤花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: 'トチノキとアカバナトチノキの交配種。' },
  { name: 'ホウオウチク', type: '特殊', category: '特殊', height: '3m', features: '竹', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '鳳凰が羽を広げたような葉姿。' },
  { name: 'ホオノキ', type: '落葉高木', category: '高木', height: '15m', features: '巨葉,白大花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '葉は朴葉味噌などに使われる。' },
  { name: 'ボケ', type: '落葉低木', category: '低木', height: '1.5m', features: '花,実', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '花色が豊富。枝にトゲがある。' },
  { name: 'ホソバタイサンボク', type: '常緑高木', category: '高木', height: '8m', features: '白大花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: 'タイサンボクより葉が細い。' },
  { name: 'ボックスウッド', type: '常緑低木', category: '低木', height: '1m', features: '生垣', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '西洋ツゲ。刈り込みに強い。' },
  { name: 'ホテイチク', type: '特殊', category: '特殊', height: '3m', features: '竹', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '布袋竹。節が膨らむ。' },
  { name: 'ホルトノキ', type: '常緑高木', category: '高木', height: '15m', features: '紅葉(通年)', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '常に一部の葉が紅葉している。' },

  // === 追加データ Part 3 (樹木: マ行〜ワ行 & GCP/地被類) ===
  { name: 'マサキ', type: '常緑低木', category: '中木', height: '3m', features: '光沢葉,耐潮性', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '生垣'], description: '非常に丈夫で潮風にも耐える。生垣によく使われる。' },
  { name: 'マテバシイ', type: '常緑高木', category: '高木', height: '10m', features: '実(食用)', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: 'ドングリはアク抜き不要で食べられる。' },
  { name: 'マメツゲ', type: '常緑低木', category: '低木', height: '1m', features: '小葉,玉散らし', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '葉が丸く小さい。刈り込みに強い。' },
  { name: 'マユミ', type: '落葉高木', category: '中木', height: '3m', features: '赤実,紅葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', '雑木'], description: '秋に殻が割れて赤い種が出る。' },
  { name: 'マルバシャリンバイ', type: '常緑低木', category: '低木', height: '1.5m', features: '丸葉,白花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', '公園'], description: '葉が丸く、潮風や乾燥に強い。' },
  { name: 'マンサク', type: '落葉高木', category: '中木', height: '4m', features: '早春黄花', season: '早春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '「まず咲く」が名の由来。' },
  { name: 'マンリョウ', type: '常緑低木', category: '低木', height: '0.8m', features: '赤実,縁起', season: '冬', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '実は葉の下に垂れ下がる。' },
  { name: 'ミズナラ', type: '落葉高木', category: '高木', height: '20m', features: '紅葉,ドングリ', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '寒冷地の代表的な広葉樹。' },
  { name: 'ミツバツツジ類', type: '落葉低木', category: '低木', height: '2m', features: '紫花(早春)', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '葉が出る前に花が咲く。' },
  { name: 'ミツマタ', type: '落葉低木', category: '低木', height: '2m', features: '黄花,和紙', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '枝が三つ又に分かれる。' },
  { name: 'ミヤマシキミ', type: '常緑低木', category: '低木', height: '1m', features: '赤実,日陰', season: '冬', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '有毒。日陰の赤い実は貴重。' },
  { name: 'ムクゲ', type: '落葉高木', category: '中木', height: '3m', features: '夏花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '夏の間次々と花を咲かせる。' },
  { name: 'ムクノキ', type: '落葉高木', category: '高木', height: '20m', features: '巨木,黒実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '葉の表面がざらつき、研磨に使われた。' },
  { name: 'ムラサキシキブ', type: '落葉低木', category: '低木', height: '2m', features: '紫実', season: '秋', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '雑木'], description: '鮮やかな紫色の実が美しい。' },
  { name: 'メタセコイア', type: '針葉樹', category: '針葉樹', height: '25m', features: '紅葉,円錐形', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '「生きた化石」。紅葉する針葉樹。' },
  { name: 'モウソウチク', type: '特殊', category: '特殊', height: '10m+', features: '竹林', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '日本最大の竹。タケノコが採れる。' },
  { name: 'モクレン(シモクレン)', type: '落葉高木', category: '中木', height: '4m', features: '紫大花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '紫色の大きな花が上向きに咲く。' },
  { name: 'モチノキ', type: '常緑高木', category: '高木', height: '10m', features: '赤実', season: '冬', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '樹皮からとりもちが作れる。' },
  { name: 'モッコク', type: '常緑高木', category: '高木', height: '6m', features: '整形美', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: '「庭木の王」。樹形が整いやすい。' },
  { name: 'ヤシャブシ類', type: '落葉高木', category: '高木', height: '10m', features: '実は染料', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '痩せ地でも育つ肥料木。' },
  { name: 'ヤタイヤシ', type: '特殊', category: '特殊', height: '5m', features: '南国風', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: 'ブラジルヤシ。耐寒性が比較的ある。' },
  { name: 'ヤダケ', type: '特殊', category: '特殊', height: '3m', features: '矢の材料', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '節が低く滑らか。' },
  { name: 'ヤチダモ', type: '落葉高木', category: '高木', height: '20m', features: '野球バット', season: '新緑', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '寒冷地の湿地を好む。' },
  { name: 'ヤツデ', type: '常緑低木', category: '低木', height: '2m', features: '大葉,日陰', season: '冬', sunlight: '日陰〜半日陰', sunlightTags: ['日陰', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '「天狗の団扇」。縁起が良い。' },
  { name: 'ヤブツバキ', type: '常緑高木', category: '中木', height: '5m', features: '赤花', season: '冬', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風'], description: '日本原産のツバキ。' },
  { name: 'ヤブニッケイ', type: '常緑高木', category: '高木', height: '10m', features: '香気', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: 'シナモンの仲間。' },
  { name: 'ヤマザクラ', type: '落葉高木', category: '高木', height: '20m', features: '花と赤芽', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '日本の野生の桜。寿命が長い。' },
  { name: 'ヤマツツジ', type: '落葉低木', category: '低木', height: '2m', features: '朱赤花', season: '春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '日本の山野に自生する。' },
  { name: 'ヤマハギ', type: '落葉低木', category: '低木', height: '2m', features: '紫花', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '秋の七草。' },
  { name: 'ヤマハンノキ', type: '落葉高木', category: '高木', height: '15m', features: '肥料木', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', 'ナチュラル'], description: '荒廃地の緑化に使われる。' },
  { name: 'ヤマブキ', type: '落葉低木', category: '低木', height: '1m', features: '黄金花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '鮮やかな黄色の花。' },
  { name: 'ヤマボウシ', type: '落葉高木', category: '高木', height: '8m', features: '白花,赤実', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '洋風'], description: '花・実・紅葉と楽しめる。' },
  { name: 'ヤマボウシ ミルキーウェイ', type: '落葉高木', category: '高木', height: '5m', features: '多花性', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', '洋風'], description: '花付きが良い選抜品種。' },
  { name: 'ヤマモモ', type: '常緑高木', category: '高木', height: '10m', features: '赤実(食用)', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風'], description: '雌雄異株。街路樹にも多い。' },
  { name: 'ユーカリ類', type: '常緑高木', category: '高木', height: '10m+', features: '銀葉,香り', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '要注意(成長速)', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: '成長が極めて早く、乾燥を好む。' },
  { name: 'ユキヤナギ', type: '落葉低木', category: '低木', height: '1.5m', features: '白小花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '枝垂れた枝に白い花が満開になる。' },
  { name: 'ユズリハ', type: '常緑高木', category: '高木', height: '10m', features: '縁起', season: '正月', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '新旧の葉が交代することから縁起物とされる。' },
  { name: 'ユリノキ', type: '落葉高木', category: '高木', height: '20m', features: '黄緑花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: 'チューリップのような花が咲く。' },
  { name: 'ライラック類', type: '落葉低木', category: '中木', height: '3m', features: '紫花,芳香', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: '冷涼地を好む。' },
  { name: 'ラカンマキ', type: '針葉樹', category: '針葉樹', height: '5m', features: '繊細葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風'], description: 'イヌマキより葉が細かく上品。' },
  { name: 'ラクウショウ', type: '針葉樹', category: '針葉樹', height: '20m', features: '落葉針葉', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['公園', '洋風'], description: '湿地を好み、気根を出す。' },
  { name: 'リュウキュウツツジ', type: '常緑低木', category: '低木', height: '1m', features: '白花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風', '洋風'], description: '暑さに強い。' },
  { name: 'リョウブ', type: '落葉高木', category: '高木', height: '7m', features: '白花穂,美幹', season: '夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['雑木', 'ナチュラル'], description: '幹が剥がれて美しい模様になる。' },
  { name: 'レンギョウ類', type: '落葉低木', category: '低木', height: '2m', features: '黄花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '春一番に鮮やかな黄色い花を咲かせる。' },
  { name: 'レンゲツツジ', type: '落葉低木', category: '低木', height: '1.5m', features: '朱赤花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '難', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '高原植物。暑さに弱い。有毒。' },
  { name: 'ワシントニア ロブスタ', type: '特殊', category: '特殊', height: '10m+', features: '南国', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: '背が高くなるヤシ。' },

  // --- GCP (Ground Cover Plants) Source 2 の残りと主要種 ---
  { name: 'キチジョウソウ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '吉事,花', season: '秋', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '花が咲くと良いことがあると言われる。' },
  { name: 'ギボウシ(小葉系)', type: '地被・草花', category: '地被・草花', height: '20cm', features: '美葉', season: '春夏', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風', 'シェード'], description: 'コンパクトなホスタ。' },
  { name: 'ギボウシ(大葉系)', type: '地被・草花', category: '地被・草花', height: '80cm', features: '存在感', season: '春夏', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風', 'シェード'], description: '日陰の主役になる大型種。' },
  { name: 'キモオッコウバラ', type: 'つる性', category: 'つる性', height: '登はん', features: '黄花,無棘', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'トゲがなく扱いやすい。' },
  { name: 'キンロバイ', type: '落葉低木', category: '低木', height: '1m', features: '黄花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '高山植物の仲間。' },
  { name: 'クサキョウチクトウ', type: '地被・草花', category: '地被・草花', height: '60cm', features: '花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'フロックス。' },
  { name: 'クサソテツ', type: '地被・草花', category: '地被・草花', height: '60cm', features: '羊歯', season: '春', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'コゴミ（食用）として知られる。' },
  { name: 'クサツゲ', type: '常緑低木', category: '低木', height: '0.3m', features: '縁取り', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '花壇の縁取りに使われる。' },
  { name: 'クサボケ', type: '落葉低木', category: '低木', height: '0.5m', features: '朱赤花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '地を這うように広がる。' },
  { name: 'クマザサ', type: '地被・草花', category: '地被・草花', height: '1m', features: '縁取り葉', season: '冬', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '冬に葉の縁が白く隈取られる。' },
  { name: 'クリスマスローズ オリエンタリス', type: '地被・草花', category: '地被・草花', height: '40cm', features: '春咲き', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: 'レンテンローズ。丈夫。' },
  { name: 'クリーピングタイム', type: '地被・草花', category: '地被・草花', height: '5cm', features: '香,被覆', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ハーブ'], description: '踏圧に強く香りが良い。' },
  { name: 'クレマチス アーマンディー', type: 'つる性', category: 'つる性', height: '登はん', features: '常緑,白花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['洋風'], description: '常緑性のクレマチス。' },
  { name: 'クロコスミア', type: '地被・草花', category: '地被・草花', height: '80cm', features: 'オレンジ花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'ヒオウギズイセン。非常に強健。' },
  { name: 'クロッカス', type: '地被・草花', category: '地被・草花', height: '10cm', features: '早春花', season: '早春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: '雪解けとともに咲く。' },
  { name: 'コウボウムギ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '砂浜', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['ナチュラル'], description: '海浜植物。' },
  { name: 'コウホネ', type: '地被・草花', category: '地被・草花', height: '水生', features: '黄花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ビオトープ'], description: '水生植物。' },
  { name: 'コクチナシ', type: '常緑低木', category: '低木', height: '0.5m', features: '白花,香', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: false }, style: ['和風', '洋風'], description: 'クチナシの矮性種。' },
  { name: 'コグマザサ', type: '地被・草花', category: '地被・草花', height: '0.3m', features: '被覆', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'グランドカバーに最適。' },
  { name: 'ゴシキドクダミ', type: '地被・草花', category: '地被・草花', height: '30cm', features: 'カラーリーフ', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'カメレオン。独特の臭い。' },
  { name: 'コトネアスター ダメリ', type: '常緑低木', category: '地被・草花', height: '這性', features: '赤実', season: '秋冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '地面を這う。' },
  { name: 'コルチカム', type: '地被・草花', category: '地被・草花', height: '15cm', features: '秋花', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'イヌサフラン。球根。' },
  { name: 'サフランモドキ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '桃花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: 'ゼフィランサス。' },
  { name: 'サルココッカ', type: '常緑低木', category: '低木', height: '0.6m', features: '芳香,耐陰', season: '早春', sunlight: '日陰〜半日陰', sunlightTags: ['日陰', '半日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '日陰でも育ち香りも良い。' },
  { name: 'サワラ フィリフェラオーレア', type: '針葉樹', category: '針葉樹', height: '3m', features: '黄金葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'グランドカバーコニファーの定番。' },
  { name: 'シマカンスゲ', type: '地被・草花', category: '地被・草花', height: '30cm', features: '縞斑', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: 'グラスプランツ。' },
  { name: 'シャスタデージー', type: '地被・草花', category: '地被・草花', height: '60cm', features: '白花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '丈夫なキク科。' },
  { name: 'ジャーマンアイリス', type: '地被・草花', category: '地被・草花', height: '60cm', features: '虹の花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '多湿を嫌う。' },
  { name: 'シュウカイドウ', type: '地被・草花', category: '地被・草花', height: '40cm', features: 'ピンク花', season: '秋', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: false, salt: false }, style: ['和風'], description: '日陰の湿地を好む。' },
  { name: 'シュロガヤツリ', type: '地被・草花', category: '地被・草花', height: '1m', features: '水辺', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: false }, style: ['和風', 'ビオトープ'], description: 'シペラス。水生植物。' },
  { name: 'シュンラン', type: '地被・草花', category: '地被・草花', height: '20cm', features: '早春花', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '日本の野生ラン。' },
  { name: 'シロタエギク', type: '地被・草花', category: '地被・草花', height: '30cm', features: '銀葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', '寄せ植え'], description: 'ダスティミラー。' },
  { name: 'シロバナサギゴケ', type: '地被・草花', category: '地被・草花', height: '5cm', features: '被覆,白花', season: '春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '湿った場所を好む。' },
  { name: 'スイレン', type: '地被・草花', category: '地被・草花', height: '水生', features: '花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'ビオトープ'], description: '水面に浮く葉。' },
  { name: 'スギゴケ', type: '地被・草花', category: '地被・草花', height: '10cm', features: '苔庭', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '日本庭園の苔。' },
  { name: 'スカイロケット', type: '針葉樹', category: '針葉樹', height: '4m', features: '直立', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'コニファー。' },
  { name: 'セイヨウオダマキ', type: '地被・草花', category: '地被・草花', height: '40cm', features: '独特花', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: '花形がユニーク。' },
  { name: 'セイヨウノコギリソウ', type: '地被・草花', category: '地被・草花', height: '60cm', features: 'ハーブ', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ハーブ'], description: 'ヤロウ。' },
  { name: 'セキショウ', type: '地被・草花', category: '地被・草花', height: '30cm', features: '水辺,常緑', season: '通年', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'ショウブに似るが小さい。' },
  { name: 'セダム コーラルカーペット', type: '地被・草花', category: '地被・草花', height: '5cm', features: '多肉,紅葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: '屋上緑化に使われる。' },
  { name: 'セラスチュウム', type: '地被・草花', category: '地被・草花', height: '15cm', features: '銀葉,白花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'ナツユキソウ。高温多湿嫌う。' },
  { name: 'ダイアンサス', type: '地被・草花', category: '地被・草花', height: '20cm', features: 'ナデシコ', season: '春夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '花期が長い。' },
  { name: 'タツタナデシコ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '銀葉', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '常緑のナデシコ。' },
  { name: 'タマスダレ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '白花,球根', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'レインリリー。' },
  { name: 'チゴザサ', type: '地被・草花', category: '地被・草花', height: '30cm', features: '小笹', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '稚児笹。' },
  { name: 'ツキヌキニンドウ', type: 'つる性', category: 'つる性', height: '登はん', features: '赤花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'ハニーサックルの近縁。' },
  { name: 'ツルアジサイ', type: 'つる性', category: 'つる性', height: '登はん', features: '白花', season: '初夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '気根で登る。' },
  { name: 'ツルウメモドキ', type: 'つる性', category: 'つる性', height: '絡み', features: '赤実', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '実が美しいがつるが強い。' },
  { name: 'ツルバラ', type: 'つる性', category: 'つる性', height: '登はん', features: '豪華花', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'アーチやフェンスに。' },
  { name: 'ツルマサキ', type: 'つる性', category: 'つる性', height: '這性', features: '常緑', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'アメリカツルマサキなど。' },
  { name: 'テリハノイバラ', type: 'つる性', category: 'つる性', height: '這性', features: '白花,耐潮', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['ナチュラル'], description: '日本の野生バラ。' },
  { name: 'ドイツスズラン', type: '地被・草花', category: '地被・草花', height: '20cm', features: '香花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: '日本スズランより大型。' },
  { name: 'ナギイカダ', type: '常緑低木', category: '低木', height: '0.5m', features: '赤実,葉上', season: '冬', sunlight: '半日陰〜日陰', sunlightTags: ['半日陰', '日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '葉の上に実がなる。' },
  { name: 'ナツヅタ', type: 'つる性', category: 'つる性', height: '吸着', features: '紅葉', season: '夏緑', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', '洋風'], description: '甲子園のツタ。冬は落葉。' },
  { name: 'ナツユキカズラ', type: 'つる性', category: 'つる性', height: '登はん', features: '白花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '夏に雪のように咲く。' },
  { name: 'ニシキテイカ', type: 'つる性', category: 'つる性', height: '登はん', features: '斑入葉', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: 'テイカカズラの斑入り品種。' },
  { name: 'ニッコウキスゲ', type: '地被・草花', category: '地被・草花', height: '60cm', features: '黄花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '高原植物。' },
  { name: 'ニューサイラン', type: '地被・草花', category: '地被・草花', height: '1-2m', features: '剣葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: false, salt: true }, style: ['リゾート'], description: 'オーナメンタルグラス。' },
  { name: 'ノウゼンカズラ', type: 'つる性', category: 'つる性', height: '吸着', features: '橙花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '夏に鮮やかな花。' },
  { name: 'ノシラン', type: '地被・草花', category: '地被・草花', height: '40cm', features: '白花,青実', season: '夏', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', 'シェード'], description: '日陰に強い。' },
  { name: 'ハイネズ', type: '針葉樹', category: '地被・草花', height: '這性', features: 'ネズミ刺し', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: '海岸のグランドカバー。チクチクする。' },
  { name: 'ハナショウブ', type: '地被・草花', category: '地被・草花', height: '80cm', features: '水辺花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '湿地を好む。' },
  { name: 'ハナニラ', type: '地被・草花', category: '地被・草花', height: '15cm', features: '青白花', season: '春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'イフェイオン。丈夫な球根。' },
  { name: 'バーベナ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '花', season: '春夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: '宿根バーベナ。' },
  { name: 'ハマギク', type: '地被・草花', category: '地被・草花', height: '50cm', features: '白菊', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', 'ナチュラル'], description: '海岸の崖に咲く。' },
  { name: 'ハマゴウ', type: '落葉低木', category: '地被・草花', height: '這性', features: '青花,香', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['ナチュラル'], description: '砂浜の植物。' },
  { name: 'ハマヒルガオ', type: '地被・草花', category: '地被・草花', height: '這性', features: 'ピンク花', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['ナチュラル'], description: '海浜植物。' },
  { name: 'ヒメウツギ', type: '落葉低木', category: '低木', height: '0.6m', features: '白花', season: '初夏', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '小型のウツギ。' },
  { name: 'ヒメイワダレソウ', type: '地被・草花', category: '地被・草花', height: '5cm', features: '被覆', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: 'リッピア。繁殖力旺盛。' },
  { name: 'ヒメシャガ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '薄紫花', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '小型のシャガ。' },
  { name: 'ヒマラヤユキノシタ', type: '地被・草花', category: '地被・草花', height: '30cm', features: '大葉,早春花', season: '早春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '常緑の大きな葉。' },
  { name: 'フイリアマドコロ', type: '地被・草花', category: '地被・草花', height: '40cm', features: '斑入葉', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'ナルコユリに似る。' },
  { name: 'ブッドレア', type: '落葉低木', category: '中木', height: '3m', features: '蝶が集まる', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'バタフライブッシュ。' },
  { name: 'フヨウ', type: '落葉低木', category: '中木', height: '2m', features: '大花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['和風', '洋風'], description: 'ムクゲに似る。' },
  { name: 'ヘデラ カナリエンシス', type: 'つる性', category: 'つる性', height: '這性', features: '大葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'オカメヅタ。被覆力が高い。' },
  { name: 'ベニシダ', type: '地被・草花', category: '地被・草花', height: '50cm', features: '赤新芽', season: '通年', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '新芽が赤いシダ。' },
  { name: 'ヘメロカリス', type: '地被・草花', category: '地被・草花', height: '60cm', features: '一日花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'デイリリー。非常に強健。' },
  { name: 'ポテンチラ', type: '地被・草花', category: '地被・草花', height: '10cm', features: '黄花', season: '春夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'イチゴのような葉。' },
  { name: 'ミズバショウ', type: '地被・草花', category: '地被・草花', height: '40cm', features: '湿地', season: '早春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '難', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'ビオトープ'], description: '夏の暑さを嫌う。' },
  { name: 'ミソハギ', type: '地被・草花', category: '地被・草花', height: '1m', features: '盆花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '水辺を好む。' },
  { name: 'ミヤギノハギ', type: '落葉低木', category: '低木', height: '1.5m', features: '枝垂れ', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '枝垂れて咲くハギ。' },
  { name: 'ミヤコザサ', type: '地被・草花', category: '地被・草花', height: '0.5m', features: '冬枯れ', season: '春夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '冬は縁が枯れる。' },
  { name: 'ミヤマビャクシン', type: '針葉樹', category: '針葉樹', height: '1m', features: '這性', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: '高山性のビャクシン。' },
  { name: 'ミヤママタタビ', type: 'つる性', category: 'つる性', height: '登はん', features: '白ピンク葉', season: '夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '普通', growthRate: '普通', tolerance: { heat: false, cold: true, salt: false }, style: ['和風', 'ナチュラル'], description: '葉が白やピンクに変色する。' },
  { name: 'ムベ', type: 'つる性', category: 'つる性', height: '登はん', features: '常緑,実', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: 'アケビに似るが常緑。' },
  { name: 'メギ', type: '落葉低木', category: '低木', height: '1m', features: '赤葉,トゲ', season: '春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: 'オーレアやローズグロウなどの品種。' },
  { name: 'メキシコマンネングサ', type: '地被・草花', category: '地被・草花', height: '10cm', features: '黄花,強健', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: '帰化植物。セダム。' },
  { name: 'モンタナマツ', type: '針葉樹', category: '針葉樹', height: '2m', features: '矮性松', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '遅い', tolerance: { heat: false, cold: true, salt: false }, style: ['和風'], description: 'ムゴマツ。ロックガーデン向き。' },
  { name: 'ヤブカンゾウ', type: '地被・草花', category: '地被・草花', height: '80cm', features: '橙八重花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '若葉は食用になる。' },
  { name: 'ヤブコウジ', type: '常緑低木', category: '地被・草花', height: '20cm', features: '赤実,日陰', season: '冬', sunlight: '日陰', sunlightTags: ['日陰'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '十両。' },
  { name: 'ユキノシタ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '日陰,花', season: '初夏', sunlight: '日陰〜半日陰', sunlightTags: ['日陰', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', 'シェード'], description: '湿った日陰を好む。' },
  { name: 'ユリオプスデージー', type: '常緑低木', category: '地被・草花', height: '0.8m', features: '銀葉,黄花', season: '冬春', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: false, salt: true }, style: ['洋風'], description: '冬に咲く明るい花。' },
  { name: 'ラミューム', type: '地被・草花', category: '地被・草花', height: '20cm', features: '斑入葉', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: false, cold: true, salt: false }, style: ['洋風'], description: 'オドリコソウの仲間。' },
  { name: 'ルブス カリシノイデス', type: '常緑低木', category: '地被・草花', height: '這性', features: 'ちりめん葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '冬に紅葉する常緑キイチゴ。' },
  { name: 'ロニセラ ニティダ', type: '常緑低木', category: '低木', height: '1m', features: '小葉', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'グランドカバーや低い生垣に。' },

  // === 追加データ Part 4 (品種違い・ササ類・残り全種) ===
  // --- ニオイヒバ系 ---
  { name: "ニオイヒバ 'グリーンコーン'", type: '針葉樹', category: '針葉樹', height: '4m', features: '円錐形,美葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '芯が立ちやすく樹形が整う。' },
  { name: "ニオイヒバ 'サンキスト'", type: '針葉樹', category: '針葉樹', height: '3m', features: '黄金葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '美しい黄金色の葉。' },
  { name: "ニオイヒバ 'スマラグ'", type: '針葉樹', category: '針葉樹', height: '4m', features: '濃緑葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'エメラルドグリーン。冬も変色しにくい。' },
  { name: "ニオイヒバ 'ヨーロッパゴールド'", type: '針葉樹', category: '針葉樹', height: '4m', features: '黄金葉', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '冬はオレンジがかる黄金葉。' },
  { name: "ニオイヒバ 'ラインゴールド'", type: '針葉樹', category: '針葉樹', height: '1m', features: '玉状,黄金', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '矮性種。丸く育つ。' },

  // --- ヘデラ（アイビー）品種 ---
  { name: "ヘデラ 'アイバレース'", type: 'つる性', category: 'つる性', height: '這性', features: 'レース葉', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '葉の縁が波打つ品種。' },
  { name: "ヘデラ 'グレーシャー'", type: 'つる性', category: 'つる性', height: '這性', features: '白斑', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'シルバーグレイと白の斑入り。' },
  { name: "ヘデラ 'ゴールドチャイルド'", type: 'つる性', category: 'つる性', height: '這性', features: '黄斑', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '鮮やかな黄色の縁取り。' },
  { name: "ヘデラ 'ゴールドハート'", type: 'つる性', category: 'つる性', height: '這性', features: '中心黄斑', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '葉の中心が黄金色。' },
  { name: "ヘデラ 'ピッツバーグ'", type: 'つる性', category: 'つる性', height: '這性', features: '緑葉', season: '通年', sunlight: '日向〜日陰', sunlightTags: ['日向', '半日陰', '日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '強健な緑葉品種。' },

  // --- コトネアスター品種 ---
  { name: "コトネアスター 'オータムファイア'", type: '常緑低木', category: '地被・草花', height: '這性', features: '赤実,紅葉', season: '秋冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '紅葉と実が美しい。' },
  { name: "コトネアスター 'レペンス'", type: '常緑低木', category: '地被・草花', height: '這性', features: '大実', season: '秋冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '実が大きめの這い性品種。' },
  { name: 'コトネアスター ホリゾンタリス', type: '落葉低木', category: '地被・草花', height: '這性', features: '魚の骨状', season: '秋冬', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '枝が水平に広がる。' },

  // --- メギ品種 ---
  { name: "メギ 'アトロプルプレア'", type: '落葉低木', category: '低木', height: '1m', features: '赤紫葉', season: '春〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: 'シックな銅葉。' },
  { name: "メギ 'アトロプルプレア ナナ'", type: '落葉低木', category: '低木', height: '0.5m', features: '矮性,赤葉', season: '春〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '遅い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '非常にコンパクトな銅葉。' },
  { name: "メギ 'オーレア'", type: '落葉低木', category: '低木', height: '1m', features: '黄金葉', season: '春〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '明るいライムゴールドの葉。' },
  { name: "メギ 'ローズグロウ'", type: '落葉低木', category: '低木', height: '1m', features: '斑入り赤葉', season: '春〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: 'ピンクの斑が入る銅葉。' },

  // --- ツルマサキ・その他品種 ---
  { name: "ツルマサキ 'エメラルドガエティ'", type: 'つる性', category: 'つる性', height: '這性', features: '白斑', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '白斑入り品種。' },
  { name: "ツルマサキ 'エメラルドゴールド'", type: 'つる性', category: 'つる性', height: '這性', features: '黄斑', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '黄斑入り品種。' },
  { name: "ツルマサキ 'コロラータス'", type: 'つる性', category: 'つる性', height: '這性', features: '紫紅葉', season: '冬', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '冬に葉が紫色になる。' },
  { name: "ビンカマジョール 'バリエガタ'", type: 'つる性', category: 'つる性', height: '這性', features: '斑入葉,大葉', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'ツルニチニチソウの斑入り。' },
  { name: "ビンカミノール 'バリエガタ'", type: 'つる性', category: 'つる性', height: '這性', features: '斑入葉,小葉', season: '春', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'ヒメツルニチニチソウの斑入り。' },

  // --- ササ・竹・グラス類（詳細） ---
  { name: 'アズマネザサ', type: '地被・草花', category: '地被・草花', height: '1-2m', features: '強健', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '非常に繁殖力が強い。' },
  { name: 'アシ', type: '地被・草花', category: '地被・草花', height: '2m', features: '水辺,浄化', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['和風', 'ビオトープ'], description: 'ヨシ。水質浄化作用がある。' },
  { name: 'オロシマチク', type: '地被・草花', category: '地被・草花', height: '0.5m', features: '小葉,縞斑', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '庭園の下草向き。' },
  { name: 'カムロザサ', type: '地被・草花', category: '地被・草花', height: '0.5m', features: '密生', season: '通年', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '禿笹。被覆力が高い。' },
  { name: 'フイリシイヤザサ', type: '地被・草花', category: '地被・草花', height: '0.5m', features: '白斑', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '明るい斑入り葉のササ。' },
  { name: 'ミヤコザサ', type: '地被・草花', category: '地被・草花', height: '0.5m', features: '冬枯れ', season: '春夏', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風'], description: '冬に葉の縁が枯れる風情。' },
  { name: 'パンパスグラス', type: '地被・草花', category: '地被・草花', height: '2-3m', features: '巨大穂', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風', 'ナチュラル'], description: 'お化けススキ。広大な場所が必要。' },

  // --- その他 ---
  { name: 'キウイ', type: 'つる性', category: 'つる性', height: '棚', features: '果実(食用)', season: '秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '普通', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['和風', '洋風'], description: '雌雄異株。棚が必要。' },
  { name: 'アベリア フランシスメイソン', type: '常緑低木', category: '低木', height: '1m', features: '黄斑葉', season: '夏〜秋', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '黄色い斑入り葉のアベリア。' },
  { name: 'アメリカイワナンテン', type: '常緑低木', category: '低木', height: '1m', features: '紅葉,白花', season: '春', sunlight: '日向〜半日陰', sunlightTags: ['日向', '半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'セイヨウイワナンテンと同義。' },
  { name: 'ハイビャクシン', type: '針葉樹', category: '地被・草花', height: '這性', features: '被覆', season: '通年', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風', 'ドライ'], description: 'ソナレ。海岸の岩場に自生。' },
  { name: 'バーベナ テネラ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '切れ込み葉', season: '春夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: 'ヒメビジョザクラ。' },
  { name: 'バーベナ ペルビアーナ', type: '地被・草花', category: '地被・草花', height: '20cm', features: '赤花', season: '春夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: true }, style: ['洋風'], description: '鮮やかな赤花。' },
  { name: 'ノウゼンカズラ マダムガレン', type: 'つる性', category: 'つる性', height: '登はん', features: '杏色花', season: '夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: '従来種より花色が優しい。' },
  { name: 'ハトスヘデラ', type: 'つる性', category: 'つる性', height: '這性', features: '交配種', season: '通年', sunlight: '半日陰', sunlightTags: ['半日陰'], maintenance: '易', growthRate: '普通', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'ヤツデとヘデラの交配種。' },
  { name: 'ビグノニア', type: 'つる性', category: 'つる性', height: '吸着', features: 'カレー香', season: '初夏', sunlight: '日向', sunlightTags: ['日向'], maintenance: '易', growthRate: '早い', tolerance: { heat: true, cold: true, salt: false }, style: ['洋風'], description: 'カレーカズラ。' }
];

// ==========================================
// コンポーネント本体
// ==========================================

const PlantSelection: React.FC<PlantSelectionProps> = ({ hideHeader }) => {
  const [plantSearchTerm, setPlantSearchTerm] = useState<string>('');
  const [selectedLeafType, setSelectedLeafType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedSunlight, setSelectedSunlight] = useState<string>('all');
  
  // 追加: 耐性フィルタ用のstate
  const [toleranceFilters, setToleranceFilters] = useState({
    heat: false,
    cold: false,
    salt: false,
  });

  // Google画像検索を開く
  const searchGoogleImage = (plantName: string) => {
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(plantName + " 庭木")}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // フィルタリング処理
  const filteredPlants = useMemo(() => {
    return MASTER_PLANT_DATA.filter(plant => {
      // 1. 検索語句
      const searchMatch = plantSearchTerm === '' || 
        plant.name.includes(plantSearchTerm) || 
        plant.features.includes(plantSearchTerm) ||
        plant.description.includes(plantSearchTerm);

      // 2. 葉のタイプ（常緑/落葉/その他）
      // 特殊や地被はタイプ名に含まれていればヒットさせる。'all'の場合は全通し。
      let typeMatch = true;
      if (selectedLeafType !== 'all') {
        if (selectedLeafType === '常緑') {
          // 常緑の場合は、常緑を含むタイプまたは針葉樹も含める
          typeMatch = plant.type.includes('常緑') || 
                     plant.type === '針葉樹' || 
                     plant.category === '針葉樹';
        } else if (selectedLeafType === '落葉') {
          typeMatch = plant.type.includes('落葉');
        } else {
          // 地被・つる性など
          typeMatch = plant.type.includes(selectedLeafType);
        }
      }

      // 3. カテゴリ
      const categoryMatch = selectedCategory === 'all' || plant.category === selectedCategory;

      // 4. スタイル
      const styleMatch = selectedStyle === 'all' || plant.style.includes(selectedStyle);

      // 5. 日照 (Tag配列に含まれているか)
      const sunlightMatch = selectedSunlight === 'all' || 
                            plant.sunlightTags.includes(selectedSunlight as any);
      
      // 6. 耐性フィルタ (チェックされている項目のみ判定)
      // チェックがついている場合、その耐性が true でなければ除外
      const heatMatch = !toleranceFilters.heat || plant.tolerance.heat;
      const coldMatch = !toleranceFilters.cold || plant.tolerance.cold;
      const saltMatch = !toleranceFilters.salt || plant.tolerance.salt;

      return searchMatch && typeMatch && categoryMatch && styleMatch && sunlightMatch && heatMatch && coldMatch && saltMatch;
    });
  }, [plantSearchTerm, selectedLeafType, selectedCategory, selectedStyle, selectedSunlight, toleranceFilters]);

  return (
    <div className="w-full bg-white rounded-b-lg shadow-sm border-b border-gray-100 font-sans">
      {!hideHeader && (
      <div className="p-4 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div>
          <h3 className="text-[13px] font-medium">植栽データベース選定ツール</h3>
          <p className="text-[11px] mt-0.5">条件に合う庭木・草花を検索できます（収録数: {MASTER_PLANT_DATA.length}種）</p>
        </div>
      </div>
      )}
      
      <div className="p-4">
        {/* 検索・フィルタエリア */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

            {/* カテゴリ */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">大きさ・種類</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
              >
                <option value="all">すべて</option>
                <option value="高木">高木 (シンボルツリー)</option>
                <option value="中木">中木 (目隠し・サブ)</option>
                <option value="低木">低木 (添え木・生垣)</option>
                <option value="地被・草花">地被・草花 (グランドカバー)</option>
                <option value="つる性">つる性 (フェンス・壁面)</option>
                <option value="針葉樹">針葉樹 (コニファー)</option>
                <option value="特殊">特殊</option>
              </select>
            </div>

            {/* 葉のタイプ */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">葉の性質</label>
              <select 
                value={selectedLeafType} 
                onChange={(e) => setSelectedLeafType(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
              >
                <option value="all">すべて</option>
                <option value="常緑">常緑 (一年中葉がある)</option>
                <option value="落葉">落葉 (季節感・紅葉)</option>
                <option value="つる性">つる性</option>
                <option value="地被・草花">草花・地被</option>
              </select>
            </div>

            {/* 耐性オプション (追加部分) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">環境耐性 (強いもの)</label>
              <div className="flex flex-wrap gap-2 text-xs">
                <label className="inline-flex items-center bg-white border border-gray-300 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    checked={toleranceFilters.heat}
                    onChange={(e) => setToleranceFilters({...toleranceFilters, heat: e.target.checked})}
                    className="mr-1.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  暑さ (耐暑)
                </label>
                <label className="inline-flex items-center bg-white border border-gray-300 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    checked={toleranceFilters.cold}
                    onChange={(e) => setToleranceFilters({...toleranceFilters, cold: e.target.checked})}
                    className="mr-1.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  寒さ (耐寒)
                </label>
                <label className="inline-flex items-center bg-white border border-gray-300 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    checked={toleranceFilters.salt}
                    onChange={(e) => setToleranceFilters({...toleranceFilters, salt: e.target.checked})}
                    className="mr-1.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  潮風 (耐塩)
                </label>
              </div>
            </div>

            {/* 日照条件 */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">日当たり環境</label>
              <select 
                value={selectedSunlight} 
                onChange={(e) => setSelectedSunlight(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
              >
                <option value="all">すべて</option>
                <option value="日向">日向 (一日中当たる)</option>
                <option value="半日陰">半日陰 (木漏れ日・半日程度)</option>
                <option value="日陰">日陰 (北側・建物裏)</option>
              </select>
            </div>

             {/* スタイル */}
             <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">庭のスタイル</label>
              <select 
                value={selectedStyle} 
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded p-2 bg-white"
              >
                <option value="all">すべて</option>
                <option value="洋風">洋風</option>
                <option value="和風">和風</option>
                <option value="モダン">モダン・シンプル</option>
                <option value="ナチュラル">ナチュラル・雑木</option>
                <option value="ドライ">ドライガーデン</option>
                <option value="シェード">シェードガーデン(日陰)</option>
              </select>
            </div>

            {/* フリーワード */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">フリーワード</label>
              <input 
                type="text" 
                value={plantSearchTerm} 
                onChange={(e) => setPlantSearchTerm(e.target.value)}
                placeholder="名前、花、実、香りなど"
                className="w-full text-xs border border-gray-300 rounded p-2"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
             <button
                onClick={() => {
                  setPlantSearchTerm('');
                  setSelectedLeafType('all');
                  setSelectedCategory('all');
                  setSelectedStyle('all');
                  setSelectedSunlight('all');
                  setToleranceFilters({ heat: false, cold: false, salt: false });
                }}
                className="text-xs text-gray-500 underline hover:text-blue-600"
              >
                条件をリセット
              </button>
          </div>
        </div>

        {/* 検索結果リスト */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-700 border-b pb-1">
            検索結果: {filteredPlants.length}件
          </h4>
          
          {filteredPlants.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              条件に一致する植栽が見つかりませんでした。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlants.map((plant, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white flex flex-col h-full relative group">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="text-sm font-bold text-gray-800 flex-1 pr-2">{plant.name}</h5>
                    <div className="flex gap-1 flex-shrink-0">
                         {/* 種類バッジ */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded text-white whitespace-nowrap ${
                        plant.type.includes('常緑') ? 'bg-green-600' : 
                        plant.type.includes('落葉') ? 'bg-orange-500' : 
                        plant.type.includes('地被') ? 'bg-emerald-500' :
                        plant.type.includes('つる') ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                        {plant.type.replace('常緑','').replace('落葉','').substring(0,4)}
                        </span>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-gray-600 mb-2 flex-grow">
                    {plant.description}
                  </p>
                  
                  <div className="bg-gray-50 rounded p-2 text-[10px] space-y-1 mt-auto">
                    {/* 耐性バッジ表示 */}
                    {(plant.tolerance.heat || plant.tolerance.cold || plant.tolerance.salt) && (
                      <div className="flex gap-1 mb-1.5 flex-wrap">
                        {plant.tolerance.heat && <span className="bg-orange-100 text-orange-700 px-1 rounded border border-orange-200 text-[9px]">耐暑</span>}
                        {plant.tolerance.cold && <span className="bg-blue-100 text-blue-700 px-1 rounded border border-blue-200 text-[9px]">耐寒</span>}
                        {plant.tolerance.salt && <span className="bg-cyan-100 text-cyan-700 px-1 rounded border border-cyan-200 text-[9px]">耐潮</span>}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span><span className="font-bold text-gray-500">高さ:</span> {plant.height}</span>
                      <span><span className="font-bold text-gray-500">管理:</span> {plant.maintenance}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span><span className="font-bold text-gray-500">日照:</span> {plant.sunlight}</span>
                      <span><span className="font-bold text-gray-500">見頃:</span> {plant.season}</span>
                    </div>
                    <div className="pt-1 border-t border-gray-200 mt-1 truncate" title={plant.features}>
                      <span className="font-bold text-gray-500">特徴:</span> {plant.features}
                    </div>
                    </div>

                  {/* Google画像検索ボタン（常時表示） */}
                  <div className="absolute top-2 right-12">
                     <button
                        onClick={() => searchGoogleImage(plant.name)}
                        className="text-[10px] bg-white text-blue-600 border border-blue-200 px-2 py-0.5 rounded shadow-sm hover:bg-blue-50 transition-colors"
                        title="Google画像検索を開く"
                     >
                       画像検索
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlantSelection;
