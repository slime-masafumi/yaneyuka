'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Product {
  maker: string;
  product: string;
  description: string;
  features: string[];
  price_range: string;
  link: string;
}

interface KnowledgeTip {
  keywords: string[];
  title: string;
  content: string;
  relatedPage?: string;
}

interface Message {
  content: string | Product[];
  isUser: boolean;
  options?: string[];
  onOptionClick?: (option: string) => void;
  navigateTo?: string;
}

interface ChatState {
  category: string | null;
  usage: string | null;
  priceRange: string | null;
  features: string[];
}

// サイト内ページ遷移用
const subcategoryToPage: Record<string, string> = {
  '折板': 'roof', '金属屋根': 'roof', 'スレート': 'roof', '瓦': 'roof',
  'ALC': 'exterior-wall', 'ECP': 'exterior-wall', '金属サイディング': 'exterior-wall', '窯業サイディング': 'exterior-wall', '金属パネル': 'exterior-wall', '木板張り': 'exterior-wall',
  '塗装': 'exterior-wall', '塗り壁': 'exterior-wall', 'タイル': 'exterior-wall', '石・レンガ': 'exterior-wall',
  'アルミ樹脂複合サッシ': 'opening', '樹脂サッシ': 'opening', '木製サッシ': 'opening', '軽量シャッター': 'opening', '重量シャッター': 'opening',
  'フローリング': 'internal-floor', 'ビニールタイル': 'internal-floor', 'カーペット': 'internal-floor', '畳': 'internal-floor', '巾木': 'internal-floor',
  '壁紙': 'internal-wall', '化粧板': 'internal-wall', '化粧シート': 'internal-wall',
  '天井ボード': 'internal-ceiling', '天井化粧材': 'internal-ceiling',
  'ウレタン防水': 'waterproof', 'アスファルト防水': 'waterproof', 'シート防水': 'waterproof', 'FRP防水': 'waterproof',
  'ハンドル': 'hardware', '建具金物': 'hardware', '鍵関係': 'hardware',
  '笠木・水切': 'exterior-other', '庇・オーニング': 'exterior-other', '雨どい': 'exterior-other', '太陽光パネル': 'exterior-other', '手摺': 'exterior-other',
  'カーテン': 'furniture', 'ブラインド': 'furniture',
  '照明': 'electrical-systems', 'スイッチ・コンセント': 'electrical-systems',
  '空調機': 'mechanical-systems', '水栓': 'mechanical-systems', '衛生機器': 'mechanical-systems',
  'カーポート': 'exterior', 'フェンス': 'exterior', '門扉': 'exterior',
  '舗装': 'exterior-infrastructure',
};

// 建材データ（mak_*.tsx の実メーカー情報を反映）
const productData: Record<string, Record<string, Product[]>> = {
  '屋根': {
    '折板': [
      { maker: '三晃金属工業', product: 'ハイタフルーフ', description: '大スパン対応の高強度折板。工場・倉庫・体育館等の大型建築に実績多数', features: ['高強度', '大スパン', '施工性'], price_range: '中価格帯', link: 'https://www.sankometal.co.jp/' },
      { maker: '日鉄鋼板', product: 'スーパールーフ', description: '高耐久ガルバリウム鋼板折板。SGL（エスジーエル）仕様で従来比3倍の耐食性', features: ['高耐久', '耐食性', '防水性'], price_range: '中価格帯', link: 'https://www.nisc-s.co.jp/' },
      { maker: '元旦ビューティ工業', product: '元旦折板', description: '意匠性と機能性を両立したデザイン折板', features: ['意匠性', '施工性', '防水性'], price_range: '中〜高価格帯', link: 'https://www.gantan.co.jp/' },
      { maker: '月星商事', product: 'タフワイド', description: '二重折板対応・断熱折板システム。結露対策に有効', features: ['断熱性', '結露防止', '防水性'], price_range: '高価格帯', link: 'https://www.tsukiboshi.co.jp/' },
      { maker: 'JFE鋼板', product: 'JFE折板', description: 'コスト重視の標準折板。汎用性が高い', features: ['コスト重視', '汎用性', '施工性'], price_range: '低〜中価格帯', link: 'https://www.jfe-kouhan.co.jp/' },
    ],
    '金属屋根': [
      { maker: '三晃金属工業', product: 'スタンディングシーム', description: '立平葺き金属屋根。緩勾配対応で意匠性が高い', features: ['意匠性', '防水性', '軽量'], price_range: '中価格帯', link: 'https://www.sankometal.co.jp/' },
      { maker: 'アイジー工業', product: 'ガルテクト', description: '断熱材一体型金属屋根。リフォームのカバー工法にも最適', features: ['断熱性', '軽量', 'リフォーム対応'], price_range: '中〜高価格帯', link: 'https://www.igkogyo.co.jp/' },
      { maker: 'セキノ興産', product: 'ダンネツトップ', description: '断熱性能に優れた金属屋根材', features: ['断熱性', '遮音性', '施工性'], price_range: '中価格帯', link: 'https://www.sekino.co.jp/' },
      { maker: '稲垣商事', product: 'ヒランビー', description: '軽量で施工性に優れた横葺き金属屋根', features: ['軽量', '施工性', 'コスト重視'], price_range: '中価格帯', link: 'https://www.inagaki-shoji.co.jp/' },
    ],
    'スレート': [
      { maker: 'ケイミュー', product: 'コロニアルグラッサ', description: 'グラッサコートで色褪せに強い。住宅屋根の定番スレート', features: ['耐久性', 'デザイン性', '防水性'], price_range: '中価格帯', link: 'https://www.kmew.co.jp/' },
      { maker: 'ニチハ', product: 'パミール', description: '大波スレート。工場・倉庫向け', features: ['コスト重視', '施工性', '汎用性'], price_range: '低〜中価格帯', link: 'https://www.nichiha.co.jp/' },
    ],
    '瓦': [
      { maker: '鶴弥', product: 'スーパートライ110', description: '防災瓦のトップブランド。耐風・耐震性能に優れたF形瓦', features: ['耐久性', '耐風性', '防災性'], price_range: '高価格帯', link: 'https://www.try110.com/' },
      { maker: 'マルスギ', product: 'イーグルロック', description: '軽量で施工性に優れた陶器瓦', features: ['意匠性', '耐久性', '軽量'], price_range: '高価格帯', link: 'https://www.marusugi.co.jp/' },
    ],
  },
  '外壁': {
    'ALC': [
      { maker: '旭化成建材', product: 'ヘーベル', description: 'ALC業界トップシェア。耐火・断熱・遮音に優れた軽量気泡コンクリート', features: ['耐火性', '断熱性', '遮音性'], price_range: '中〜高価格帯', link: 'https://www.asahikasei-kenzai.com/' },
      { maker: 'クリオン', product: 'シポレックス', description: '高品質ALCパネル。デザインパネルも充実', features: ['軽量', '断熱性', '意匠性'], price_range: '中価格帯', link: 'https://www.clion.co.jp/' },
    ],
    'ECP': [
      { maker: 'ノザワ', product: 'アスロック', description: 'ECP（押出成形セメント板）の代名詞。中空構造で軽量・高強度', features: ['高強度', '耐火性', '意匠性'], price_range: '中〜高価格帯', link: 'https://www.nozawa-kobe.co.jp/' },
      { maker: '神島化学工業', product: 'ラムダ', description: '薄型ECPパネル。リブ形状による意匠性が特徴', features: ['意匠性', '耐火性', '軽量'], price_range: '中価格帯', link: 'https://www.konoshima.co.jp/' },
    ],
    '金属サイディング': [
      { maker: 'アイジー工業', product: 'ガルスパン', description: '断熱材一体型金属サイディング。リフォームにも最適', features: ['断熱性', 'メンテナンス性', '軽量'], price_range: '中価格帯', link: 'https://www.igkogyo.co.jp/' },
      { maker: 'ニチハ', product: 'センターサイディング', description: '高意匠金属サイディング。木目調・石目調など豊富なデザイン', features: ['意匠性', '断熱性', '施工性'], price_range: '中価格帯', link: 'https://www.nichiha.co.jp/' },
    ],
    '窯業サイディング': [
      { maker: 'ニチハ', product: 'モエンエクセラード', description: '業界トップシェアの窯業サイディング。超高耐候塗装で色褪せに強い', features: ['耐久性', 'デザイン性', '防火性'], price_range: '中価格帯', link: 'https://www.nichiha.co.jp/' },
      { maker: 'ケイミュー', product: 'ネオロック・光セラ', description: '光触媒でセルフクリーニング機能付き', features: ['防汚性', '耐候性', '意匠性'], price_range: '中〜高価格帯', link: 'https://www.kmew.co.jp/' },
    ],
  },
  '開口部': {
    'アルミ樹脂複合サッシ': [
      { maker: 'LIXIL', product: 'サーモスX', description: '高性能ハイブリッドサッシ。外アルミ＋内樹脂で断熱と耐久性を両立', features: ['断熱性', '気密性', '耐久性'], price_range: '中〜高価格帯', link: 'https://www.lixil.co.jp/' },
      { maker: 'YKK AP', product: 'エピソードNEO', description: '高コストパフォーマンスの複合サッシ。Low-E複層ガラス標準', features: ['断熱性', 'コスト重視', '遮音性'], price_range: '中価格帯', link: 'https://www.ykkap.co.jp/' },
      { maker: '三協立山', product: 'アルジオ', description: '高断熱アルミ樹脂複合サッシ', features: ['断熱性', '気密性', '意匠性'], price_range: '中価格帯', link: 'https://alumi.st-grp.co.jp/' },
    ],
    '樹脂サッシ': [
      { maker: 'YKK AP', product: 'APW330/430', description: 'オール樹脂サッシ。APW430はトリプルガラス対応で世界トップクラスの断熱性能', features: ['高断熱', '結露防止', '遮音性'], price_range: '高価格帯', link: 'https://www.ykkap.co.jp/' },
      { maker: 'エクセルシャノン', product: 'シャノンウインドII', description: '樹脂サッシ専業メーカー。北海道での実績が豊富', features: ['高断熱', '気密性', '結露防止'], price_range: '高価格帯', link: 'https://www.excelshanon.co.jp/' },
    ],
    '軽量シャッター': [
      { maker: '三和シャッター', product: 'サンオート', description: '業界最大手。住宅・店舗向け電動シャッター', features: ['防犯性', '耐久性', '操作性'], price_range: '中価格帯', link: 'https://www.sanwa-ss.co.jp/' },
      { maker: '文化シヤッター', product: 'マドマスターシリーズ', description: '窓シャッターの定番。防犯・防災対応', features: ['防犯性', '防災性', '操作性'], price_range: '中価格帯', link: 'https://www.bunka-s.co.jp/' },
    ],
  },
  '内部床材': {
    'フローリング': [
      { maker: '大建工業', product: 'ハピアフロア', description: '高機能複合フローリング。傷・汚れに強いWPC加工', features: ['耐傷性', 'メンテナンス性', '意匠性'], price_range: '中価格帯', link: 'https://www.daiken.ne.jp/' },
      { maker: '永大産業', product: 'リアルグレインアトム', description: '挽き板仕様の高級フローリング。天然木の質感と耐久性を両立', features: ['意匠性', '耐久性', '質感'], price_range: '高価格帯', link: 'https://www.eidai.com/' },
      { maker: '朝日ウッドテック', product: 'ライブナチュラルプレミアム', description: '挽き板フローリングの代名詞。無垢に近い質感', features: ['意匠性', '質感', '耐久性'], price_range: '高価格帯', link: 'https://www.woodtec.co.jp/' },
      { maker: 'ウッドワン', product: 'ピノアース', description: 'ニュージーランド産パイン無垢フローリング', features: ['自然素材', '調湿性', '質感'], price_range: '中〜高価格帯', link: 'https://www.woodone.co.jp/' },
    ],
    'ビニールタイル': [
      { maker: '東リ', product: 'ロイヤルストーン', description: '高意匠ビニールタイル。石目・木目のリアルな再現', features: ['意匠性', '耐久性', 'メンテナンス性'], price_range: '中価格帯', link: 'https://www.toli.co.jp/' },
      { maker: 'サンゲツ', product: 'フロアタイル', description: '豊富なデザインと機能性を両立', features: ['意匠性', '施工性', 'コスト重視'], price_range: '中価格帯', link: 'https://www.sangetsu.co.jp/' },
    ],
    'カーペット': [
      { maker: 'スミノエ', product: 'ホームカーペット', description: '住宅用高機能カーペット', features: ['遮音性', '防炎性', '質感'], price_range: '中価格帯', link: 'https://suminoe.co.jp/' },
      { maker: '川島織物セルコン', product: 'ユニットラグ', description: 'タイル式カーペット。部分交換可能', features: ['メンテナンス性', '意匠性', '施工性'], price_range: '中価格帯', link: 'https://www.kawashimaselkon.co.jp/' },
    ],
  },
  '内装壁材': {
    '壁紙': [
      { maker: 'サンゲツ', product: 'リザーブ/FEシリーズ', description: '業界最大手の壁紙メーカー。量産品から1000番台まで幅広いラインナップ', features: ['意匠性', '防火性', '施工性'], price_range: '低〜高価格帯', link: 'https://www.sangetsu.co.jp/' },
      { maker: 'リリカラ', product: 'LWシリーズ', description: '機能性壁紙が充実。消臭・抗菌・通気性タイプあり', features: ['機能性', '意匠性', '施工性'], price_range: '中価格帯', link: 'https://www.lilycolor.co.jp/' },
      { maker: 'シンコール', product: 'ウォールプロ', description: '高品質壁紙コレクション', features: ['意匠性', '防火性', '耐久性'], price_range: '中価格帯', link: 'https://www.sincol.co.jp/' },
    ],
    '化粧板': [
      { maker: 'アイカ工業', product: 'セラール/メラミン化粧板', description: 'メラミン化粧板のトップメーカー。不燃認定品セラールはキッチン・トイレに最適', features: ['耐熱性', '耐久性', '防汚性'], price_range: '中価格帯', link: 'https://www.aica.co.jp/' },
      { maker: '大建工業', product: 'ダイライト', description: '高機能化粧パネル。病院・施設向けも充実', features: ['耐久性', '機能性', '施工性'], price_range: '中価格帯', link: 'https://www.daiken.ne.jp/' },
    ],
  },
  '防水': {
    'ウレタン防水': [
      { maker: 'AGCポリマー建材', product: 'ウレタックス', description: '密着工法・通気緩衝工法に対応。改修にも強い', features: ['防水性', '施工性', '改修対応'], price_range: '中価格帯', link: 'https://www.agc-polymer.com/' },
      { maker: 'エスケー化研', product: 'プリントウレタン', description: '意匠性の高いウレタン防水。カラーバリエーション豊富', features: ['防水性', '意匠性', '耐候性'], price_range: '中価格帯', link: 'https://www.sk-kaken.co.jp/' },
    ],
    'シート防水': [
      { maker: 'ロンシール工業', product: 'ベストプルーフ', description: '塩ビシート防水の定番。機械固定工法で下地を選ばない', features: ['防水性', '耐久性', '改修対応'], price_range: '中価格帯', link: 'https://www.lonseal.co.jp/' },
      { maker: '田島ルーフィング', product: 'ビュートップ', description: '高品質塩ビシート防水', features: ['防水性', '耐久性', '施工性'], price_range: '中価格帯', link: 'https://www.tajima.jp/' },
    ],
    'アスファルト防水': [
      { maker: '田島ルーフィング', product: 'タジマアスファルト防水', description: '最も歴史のある防水工法。信頼性が高い', features: ['防水性', '耐久性', '信頼性'], price_range: '中〜高価格帯', link: 'https://www.tajima.jp/' },
    ],
    'FRP防水': [
      { maker: 'アイカ工業', product: 'ジョリエースFRP', description: 'バルコニー・ベランダ向けFRP防水。硬くて丈夫', features: ['防水性', '耐久性', '歩行対応'], price_range: '中価格帯', link: 'https://www.aica.co.jp/' },
    ],
  },
  '金物': {
    'ハンドル': [
      { maker: 'シロクマ', product: 'レバーハンドル', description: 'デザインハンドルの老舗。豊富なバリエーション', features: ['意匠性', '操作性', '耐久性'], price_range: '中価格帯', link: 'https://www.shirokuma.co.jp/' },
      { maker: 'カワジュン', product: 'レバーハンドル', description: 'シンプルモダンなデザイン金物', features: ['意匠性', '操作性', '質感'], price_range: '中〜高価格帯', link: 'https://www.kawajun.jp/' },
      { maker: '美和ロック', product: 'レバーハンドル', description: '鍵の老舗メーカー。高セキュリティ錠前と一体型', features: ['防犯性', '耐久性', '操作性'], price_range: '中価格帯', link: 'https://www.miwa-lock.co.jp/' },
    ],
    '建具金物': [
      { maker: 'スガツネ工業', product: 'ランプ', description: '建具金物・家具金物の定番。丁番・スライドレール等', features: ['耐久性', '精度', '施工性'], price_range: '中価格帯', link: 'https://www.sugatsune.co.jp/' },
      { maker: 'シブタニ', product: 'フランス落し他', description: 'ドア周り金物の専業メーカー', features: ['耐久性', '操作性', '施工性'], price_range: '中価格帯', link: 'https://www.shibutani.co.jp/' },
    ],
    '鍵関係': [
      { maker: '美和ロック', product: 'ディンプルキー', description: 'ディンプルキーのトップメーカー。防犯性が高い', features: ['防犯性', '耐久性', '信頼性'], price_range: '中〜高価格帯', link: 'https://www.miwa-lock.co.jp/' },
      { maker: 'ゴール', product: 'V18シリンダー', description: '高セキュリティシリンダー錠', features: ['防犯性', '耐久性', '操作性'], price_range: '中価格帯', link: 'https://www.goal-lock.com/' },
    ],
  },
  '外部その他': {
    '笠木・水切': [
      { maker: 'アルファン', product: '笠木シリーズ', description: 'オープンジョイント工法対応。パラペット部の雨漏り対策に', features: ['防水性', '耐久性', '施工性'], price_range: '中価格帯', link: '' },
      { maker: 'ケイミュー', product: '水切り部材', description: '雨垂れ汚染を防ぐ水切り形状', features: ['防汚性', '耐久性', '施工性'], price_range: '中価格帯', link: 'https://www.kmew.co.jp/' },
    ],
    '庇・オーニング': [
      { maker: 'YKK AP', product: 'コンバイザー', description: '後付け可能な庇。日除けと雨除けを両立', features: ['施工性', '意匠性', '耐候性'], price_range: '中価格帯', link: 'https://www.ykkap.co.jp/' },
      { maker: 'ダイケン', product: 'RSバイザー', description: '薄型デザインの庇。ステンレスワイヤー吊り', features: ['意匠性', '耐久性', '軽量'], price_range: '中〜高価格帯', link: 'https://www.daiken.ne.jp/' },
    ],
    '太陽光パネル': [
      { maker: 'パナソニック', product: 'HIT', description: '高効率ヘテロ接合型太陽電池', features: ['高効率', '耐久性', '発電性能'], price_range: '高価格帯', link: 'https://www.panasonic.com/' },
      { maker: 'シャープ', product: 'ブラックソーラー', description: '屋根一体型も対応。住宅向け太陽光の定番', features: ['発電性能', '意匠性', '施工性'], price_range: '高価格帯', link: 'https://www.sharp.co.jp/' },
      { maker: '京セラ', product: 'エコノルーツ', description: '長寿命で信頼性の高い太陽光パネル', features: ['耐久性', '信頼性', '発電性能'], price_range: '高価格帯', link: 'https://www.kyocera.co.jp/' },
    ],
    '手摺': [
      { maker: 'サンレール', product: 'アルミ手摺', description: 'バルコニー・屋上向けアルミ手摺', features: ['耐久性', '意匠性', '施工性'], price_range: '中価格帯', link: '' },
      { maker: 'ナカ工業', product: '歩行補助手摺', description: '福祉施設・公共建築向け手摺', features: ['安全性', '耐久性', 'バリアフリー'], price_range: '中価格帯', link: 'https://www.naka-kogyo.co.jp/' },
    ],
    '雨どい': [
      { maker: 'パナソニック', product: 'アイアン丸', description: '住宅向け雨どいの定番。カラーバリエーション豊富', features: ['耐久性', '施工性', '意匠性'], price_range: '中価格帯', link: 'https://www.panasonic.com/' },
    ],
  },
  '電気設備': {
    '照明': [
      { maker: 'パナソニック', product: 'iDシリーズ', description: '施設用LED照明。省エネ・長寿命', features: ['省エネ', '長寿命', '調光性'], price_range: '中価格帯', link: 'https://www.panasonic.com/' },
      { maker: 'コイズミ照明', product: 'Fit調色シリーズ', description: '住宅用LED照明。調光・調色対応', features: ['省エネ', '意匠性', '調光性'], price_range: '中価格帯', link: 'https://www.koizumi-lt.co.jp/' },
    ],
  },
  '機械設備': {
    '空調機': [
      { maker: 'ダイキン', product: 'Eco-ZEAS', description: '業務用エアコンのトップメーカー。省エネ性能に優れる', features: ['省エネ', '静音性', '快適性'], price_range: '高価格帯', link: 'https://www.daikin.co.jp/' },
    ],
    '水栓': [
      { maker: 'TOTO', product: 'TLシリーズ', description: '水栓金具のトップメーカー。節水・清潔機能', features: ['節水', '耐久性', '操作性'], price_range: '中〜高価格帯', link: 'https://www.toto.co.jp/' },
    ],
  },
  'エクステリア': {
    'カーポート': [
      { maker: 'LIXIL', product: 'アーキフラン', description: 'フラット屋根のスタイリッシュカーポート', features: ['意匠性', '耐久性', '施工性'], price_range: '中〜高価格帯', link: 'https://www.lixil.co.jp/' },
      { maker: '三協アルミ', product: 'カーポートSC', description: 'アルミ屋根の高級カーポート', features: ['耐久性', '意匠性', '遮熱性'], price_range: '高価格帯', link: 'https://alumi.st-grp.co.jp/' },
    ],
    'フェンス': [
      { maker: 'LIXIL', product: 'フェンスAB', description: '豊富なデザインバリエーション。目隠し・採光タイプあり', features: ['意匠性', '防犯性', '耐久性'], price_range: '中価格帯', link: 'https://www.lixil.co.jp/' },
      { maker: 'YKK AP', product: 'シンプレオフェンス', description: 'シンプルモダンなアルミフェンス', features: ['意匠性', '耐久性', '施工性'], price_range: '中価格帯', link: 'https://www.ykkap.co.jp/' },
    ],
  },
  '外構': {
    '舗装': [
      { maker: '東洋工業', product: 'ペイブメント', description: 'インターロッキングブロック等の舗装材', features: ['耐久性', '意匠性', '防滑性'], price_range: '中価格帯', link: 'https://www.toyo-kogyo.co.jp/' },
    ],
  },
};

// 専門知識データベース（mak_*.tsxの基本知識セクションから抽出）
const knowledgeTips: KnowledgeTip[] = [
  // 屋根
  { keywords: ['折板', '大スパン', '工場', '倉庫', '体育館'], title: '折板屋根の基本知識', content: '折板屋根は大スパン（6m超）に対応できる金属屋根です。固定工法はタイトフレーム式（重ねタイプ/はぜ締めタイプ）と嵌合タイプの3種類。二重折板にすれば断熱・結露対策も可能です。素材はガルバリウム鋼板が主流で、SGL（エスジーエル）仕様なら従来比3倍の耐食性があります。', relatedPage: 'roof' },
  { keywords: ['結露', '屋根', '断熱'], title: '屋根の結露対策', content: '金属屋根の結露対策には①裏面に断熱材を貼る ②二重折板にする ③通気層を設ける方法があります。特に内部湿度が高い用途（プール・厨房等）では二重折板が推奨されます。ペフ（発泡ポリエチレン）の裏貼りは簡易的な対策です。', relatedPage: 'roof' },
  { keywords: ['金属屋根', '熱伸縮', '電食', 'ガルバ'], title: '金属屋根の注意点', content: '金属屋根は熱伸縮が大きいため、長尺物は伸縮対策が必須です。また異種金属の接触は電食（ガルバニック腐食）を起こすため、絶縁処理が必要。例：アルミと鉄、銅とガルバリウムの直接接触はNG。', relatedPage: 'roof' },
  // 外壁
  { keywords: ['ALC', '外壁', '軽量', '断熱', '遮音'], title: 'ALCパネルの特徴', content: 'ALCは気泡を含んだ軽量コンクリートで、断熱・遮音・耐火に優れます。ただし素材自体に防水性がないため、塗装仕上げ＋シーリング処理が必須。厚型（100mm以上）と薄型（50mm程度）があり、RC造にはロッキング工法で取り付けるのが一般的です。', relatedPage: 'exterior-wall' },
  { keywords: ['ECP', 'アスロック', '押出成形'], title: 'ECPパネルの特徴', content: 'ECP（押出成形セメント板）は中空構造で軽量かつ高強度。ALCより硬くてシャープなデザインが可能です。代表的な商品名は「アスロック」（ノザワ）と「メース」。タイル先付け工法にも対応し、デザインの自由度が高い外壁材です。', relatedPage: 'exterior-wall' },
  { keywords: ['サイディング', '窯業', '金属', 'リフォーム'], title: 'サイディングの選び方', content: '窯業系サイディングはデザインが豊富でコストバランスが良く、住宅で最もシェアが高い外壁材です。金属サイディングは軽量で断熱材一体型が多く、リフォーム（カバー工法）に最適。窯業系は定期的なシーリング打ち替えと塗装が必要です。', relatedPage: 'exterior-wall' },
  // 開口部
  { keywords: ['サッシ', '断熱', '結露', '窓', 'Low-E'], title: 'サッシの断熱性能', content: 'サッシの断熱性能は素材で大きく変わります。アルミ < アルミ樹脂複合 < 樹脂 < 木製の順に高性能。Low-E複層ガラスの組み合わせが現在の標準。寒冷地ではAPW430（トリプルガラス樹脂サッシ）が推奨。防火地域では防火認定品の確認が必須です。', relatedPage: 'opening' },
  { keywords: ['防火', '防火地域', '準防火', 'サッシ', '窓'], title: '防火地域のサッシ選び', content: '防火地域・準防火地域では防火設備認定のサッシが必要です。樹脂サッシは防火認定品が限られるため、アルミ樹脂複合を選ぶケースが多いです。近年は樹脂サッシでも防火認定品が増えています。カバー工法でのリフォーム時も防火性能の確認を忘れずに。', relatedPage: 'opening' },
  // 内部床
  { keywords: ['フローリング', '無垢', '複合', '挽き板', '突き板'], title: 'フローリングの種類', content: '複合フローリングの表面材は①挽き板（2mm厚の天然木、無垢に近い質感）②突き板（0.3mm厚、コスパ良好）③シート（印刷フィルム、最も安価で傷に強い）の3グレード。無垢材は調湿性に優れますが反り・隙間が出やすい。マンションでは遮音等級（LL-45等）の確認が必須です。', relatedPage: 'internal-floor' },
  { keywords: ['床暖房', 'フローリング', '床暖'], title: '床暖房対応フローリング', content: '床暖房には必ず対応品を使用してください。非対応品は反り・割れ・接着剤劣化の原因になります。床暖房対応品は基材の熱伝導性と寸法安定性が調整されています。無垢フローリングは原則非対応ですが、一部メーカーから対応品が出ています。', relatedPage: 'internal-floor' },
  // 内装壁
  { keywords: ['壁紙', 'クロス', '量産', '1000番台', 'グレード'], title: '壁紙のグレード分類', content: '壁紙は「量産品（SP級）」と「1000番台」に大別されます。量産品は低コストで施工性が良く賃貸・ローコスト住宅向き。1000番台はデザイン・機能性が豊富で注文住宅・商業施設向き。機能性壁紙（消臭・抗菌・通気性等）は効果に寿命があるため注意。', relatedPage: 'internal-wall' },
  { keywords: ['メラミン', '化粧板', 'セラール', '不燃', 'キッチン'], title: 'メラミン化粧板の選び方', content: 'メラミン化粧板はキッチン・トイレ・洗面に最適な内装材です。不燃認定品「セラール」（アイカ工業）は火気使用室にも対応。ポリ合板（ポリエステル化粧板）はメラミンより安価ですが耐熱・耐久性は劣ります。住宅ではポリ合板、施設ではメラミンが一般的。', relatedPage: 'internal-wall' },
  // 防水
  { keywords: ['防水', 'ウレタン', '密着', '通気緩衝', 'トップコート'], title: '防水工法の選び方', content: '主な防水工法は①ウレタン防水（改修に最適、形状の自由度高い）②シート防水（塩ビシート機械固定工法が主流）③アスファルト防水（最も歴史があり信頼性高い）④FRP防水（バルコニー向け、硬くて丈夫）。トップコートは防水層を保護する塗料で、5年ごとの塗り替えが目安です。', relatedPage: 'waterproof' },
  { keywords: ['防水', '改修', 'かぶせ', '膜厚'], title: '防水改修のポイント', content: 'ウレタン防水の改修は既存防水層の上に塗り重ねる「かぶせ工法」が一般的。密着工法は下地の影響を受けやすいため、改修時は通気緩衝工法が推奨。膜厚管理が品質の鍵で、ピンゲージでの確認が必要です。', relatedPage: 'waterproof' },
  // 金物
  { keywords: ['レバーハンドル', 'ドアノブ', '鍵', '錠前', 'バックセット'], title: 'ドア金物の基本', content: 'レバーハンドル選びで注意すべきはバックセット寸法（ドア端面からシリンダー中心までの距離）。リフォームでは既存のバックセット寸法に合わせないと取付不可。錠前は空錠（施錠なし）・表示錠（トイレ用）・シリンダー錠の3種類が基本。', relatedPage: 'hardware' },
  // 外部その他
  { keywords: ['笠木', 'パラペット', '雨漏り', '水切'], title: '笠木と雨漏り対策', content: 'パラペット（立上がり壁）の笠木は雨漏りの最大リスクポイントの一つ。オープンジョイント工法を採用し、下地に防水紙を施工することが重要です。水切りは適切な形状（返し付き）を選ばないと、雨垂れによる外壁汚染の原因になります。', relatedPage: 'exterior-other' },
  // 汎用
  { keywords: ['耐火', '不燃', '準不燃', '難燃', '防火材料'], title: '防火材料の区分', content: '建築基準法の防火材料は①不燃材料（20分）②準不燃材料（10分）③難燃材料（5分）の3段階。内装制限のある部屋（火気使用室、地下室等）では不燃・準不燃材料の使用が義務付けられます。認定番号の確認を忘れずに。' },
  { keywords: ['シーリング', 'コーキング', '打ち替え', '目地'], title: 'シーリングのメンテナンス', content: 'シーリング（コーキング）の寿命は一般的に10〜15年。ひび割れ・肉やせが見られたら打ち替え時期です。「増し打ち」は応急処置で、本格改修では「打ち替え」が必須。変成シリコン系が外壁目地の標準です。' },
];

const categories: Record<string, string[]> = {
  '屋根': ['屋根', '折板', '金属屋根', 'スレート', '瓦', 'ガルバ', '鋼板', '立平', '横葺'],
  '外壁': ['外壁', 'ALC', 'ECP', 'サイディング', '金属パネル', 'アスロック', 'ヘーベル'],
  '開口部': ['開口部', 'サッシ', 'アルミサッシ', '樹脂サッシ', '木製サッシ', 'シャッター', '窓', 'ガラス'],
  '外壁仕上げ': ['外壁仕上げ', '塗装', '塗り壁', 'タイル', '石材', 'レンガ'],
  '外部床': ['外部床', '外床', '防滑', 'インターロッキング'],
  '外部その他': ['笠木', '水切', '庇', 'オーニング', '雨どい', '太陽光パネル', '手摺', 'パラペット'],
  '内部床材': ['フローリング', 'ビニールタイル', 'カーペット', '畳', '巾木', '床材', '内部床', '床暖'],
  '内装壁材': ['壁紙', 'クロス', '化粧板', '化粧シート', 'メラミン', 'セラール', '内装壁'],
  '内装天井材': ['天井', 'ボード', '石膏ボード', 'ジプトーン', 'ロックウール', '天井材'],
  '防水': ['防水', 'ウレタン', 'アスファルト', 'シート', 'FRP', 'トップコート'],
  '金物': ['ハンドル', '引棒', '建具', '金物', 'サニタリー', '鍵', '錠前', 'レバー', 'ドアノブ'],
  'ファニチャー': ['カーテン', 'ブラインド', '家具', '生地'],
  '電気設備': ['照明', 'LED', 'スイッチ', 'コンセント', '発電機'],
  '機械設備': ['水栓', '衛生機器', 'キッチン', '空調', 'エアコン', 'トイレ'],
  '外構': ['縁石', '舗装', '雨水桝', 'グレーチング', 'インターロッキング'],
  'エクステリア': ['カーポート', 'フェンス', '門扉', 'ウッドデッキ', '駐輪場', '宅配ボックス'],
};

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentState, setCurrentState] = useState<ChatState>({
    category: null, usage: null, priceRange: null, features: [],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(currentState);

  useEffect(() => { stateRef.current = currentState; }, [currentState]);

  const performanceOptions = ['耐久性', '防火性', '断熱性', '遮音性', '防水性', '意匠性', '施工性', 'メンテナンス性', 'コスト重視', '指定なし'];

  // 初期メッセージ
  useEffect(() => {
    const categoryNames = Object.keys(categories);
    setMessages([{
      content: `建材選定をお手伝いします。\n部位やお悩みを入力してください。\n\n例：\n・折板屋根で結露対策したい\n・外壁のリフォームにおすすめは？\n・防火地域のサッシの選び方\n・フローリングの種類を教えて\n\nまたは下のボタンからカテゴリを選択：`,
      isUser: false,
      options: categoryNames,
      onOptionClick: (selected) => handleCategorySelect(selected),
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const addMessage = (content: string | Product[], isUser: boolean, options?: string[], onOptionClick?: (option: string) => void, navigateTo?: string) => {
    setMessages(prev => [...prev, { content, isUser, options, onOptionClick, navigateTo }]);
  };

  const navigateToPage = (page: string) => {
    window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: page }));
  };

  // 知識ベースから関連するTipを検索
  const findKnowledgeTips = (input: string): KnowledgeTip[] => {
    const normalizedInput = input.toLowerCase();
    return knowledgeTips.filter(tip =>
      tip.keywords.some(kw => normalizedInput.includes(kw.toLowerCase()))
    ).slice(0, 3);
  };

  const handleCategorySelect = (selected: string) => {
    addMessage(selected, true);
    const newState = { ...stateRef.current, category: selected };
    setCurrentState(newState);
    const data = productData[selected];
    if (data) {
      const usageOptions = Object.keys(data);
      addMessage(`${selected}ですね。用途を選んでください：`, false, usageOptions, (opt) => {
        addMessage(opt, true);
        handleUsageSelection(opt, { ...newState });
      });
    } else {
      addMessage(`${selected}は現在データ準備中です。テキスト入力で質問いただければ、専門知識からお答えします。`, false);
      setCurrentState({ category: null, usage: null, priceRange: null, features: [] });
    }
  };

  const handleUsageSelection = (input: string, state: ChatState) => {
    const category = state.category!;
    const data = productData[category];
    if (data && data[input]) {
      const newState = { ...state, usage: input };
      setCurrentState(newState);

      // 該当サブカテゴリの専門知識があれば先に提供
      const tips = findKnowledgeTips(input + ' ' + category);
      if (tips.length > 0) {
        const tip = tips[0];
        addMessage(`💡 ${tip.title}\n\n${tip.content}`, false);
      }

      addMessage('重視する性能を教えてください：', false, performanceOptions, (selected) => {
        addMessage(selected, true);
        handleFeatureSelection(selected);
      });
      return;
    }
    addMessage('用途を選択してください。', false);
  };

  const handleFeatureSelection = (feature: string) => {
    const selectedFeatures = feature && feature !== '指定なし' ? [feature] : [];
    const newState = { ...stateRef.current, features: selectedFeatures };
    setCurrentState(newState);
    addMessage('価格帯の希望はありますか？', false, ['高価格帯', '中価格帯', '低価格帯', '指定なし'], (selected) => {
      addMessage(selected, true);
      handlePriceSelection(selected, newState);
    });
  };

  const handlePriceSelection = (priceRange: string, state?: ChatState) => {
    const s = state || stateRef.current;
    const newState = { ...s, priceRange };
    setCurrentState(newState);

    const category = s.category!;
    const usage = s.usage!;
    const products = productData[category]?.[usage] || [];
    let filtered = [...products];

    if (s.features.length > 0) {
      const featureFiltered = filtered.filter(p =>
        s.features.some(f => p.features.some(pf => pf.includes(f) || f.includes(pf)))
      );
      if (featureFiltered.length > 0) filtered = featureFiltered;
    }

    if (priceRange !== '指定なし') {
      const priceFiltered = filtered.filter(p => p.price_range.includes(priceRange.replace('価格帯', '')));
      if (priceFiltered.length > 0) filtered = priceFiltered;
    }

    const pageName = subcategoryToPage[usage] || '';
    addMessage(`${category} > ${usage}のおすすめ製品（${filtered.length}件）：`, false);
    addMessage(filtered, false, undefined, undefined, pageName);

    // リセット
    setCurrentState({ category: null, usage: null, priceRange: null, features: [] });
    addMessage('他に質問はありますか？ カテゴリ選択またはテキスト入力で続けられます。', false, Object.keys(categories), (selected) => handleCategorySelect(selected));
  };

  const handleUserInput = (input: string) => {
    const state = stateRef.current;

    // 専門知識に該当する質問があればまず回答
    if (!state.category) {
      const tips = findKnowledgeTips(input);
      if (tips.length > 0) {
        for (const tip of tips) {
          const pageLink = tip.relatedPage || '';
          addMessage(`💡 ${tip.title}\n\n${tip.content}`, false, undefined, undefined, pageLink);
        }
      }

      // カテゴリ判定
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => input.includes(keyword))) {
          const data = productData[category];
          if (!data) {
            addMessage(`${category}は現在データ準備中です。`, false);
            return;
          }

          // サブカテゴリも同時に判定
          const matchedUsage = Object.keys(data).find(usage =>
            input.includes(usage) || keywords.some(kw => usage.includes(kw) && input.includes(kw))
          );

          const newState = { ...state, category };
          setCurrentState(newState);

          if (matchedUsage) {
            addMessage(`${category} > ${matchedUsage}ですね。`, false);
            handleUsageSelection(matchedUsage, newState);
          } else {
            const usageOptions = Object.keys(data);
            addMessage(`${category}についてですね。用途を選んでください：`, false, usageOptions, (opt) => {
              addMessage(opt, true);
              handleUsageSelection(opt, newState);
            });
          }
          return;
        }
      }

      // どのカテゴリにも当てはまらない + tipsもなかった場合
      if (tips.length === 0) {
        addMessage(`該当するカテゴリが見つかりませんでした。\n以下からカテゴリを選択するか、建材名・部位名を入力してください。`, false, Object.keys(categories), (selected) => handleCategorySelect(selected));
      }
      return;
    }

    if (!state.usage) {
      handleUsageSelection(input, state);
      return;
    }

    if (state.features.length === 0) {
      handleFeatureSelection(input);
      return;
    }

    if (!state.priceRange) {
      handlePriceSelection(input);
      return;
    }
  };

  const sendMessage = () => {
    const message = inputValue.trim();
    if (message) {
      addMessage(message, true);
      handleUserInput(message);
      setInputValue('');
    }
  };

  return (
    <div className="scroll-mt-[180px]">
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">建材Chatbot</h2>
        <button
          onClick={() => navigateToPage('registration')}
          className="text-gray-600 hover:text-gray-800 text-[11px] ml-4"
        >
          掲載希望はコチラ
        </button>
      </div>
      <div className="max-w-4xl border border-gray-300 rounded-lg text-[12px]">
        <div
          ref={messagesContainerRef}
          className="min-h-[120px] max-h-[500px] overflow-y-auto p-2.5 border border-gray-200 bg-gray-50 rounded-t"
        >
          {messages.map((message, index) => (
            <div key={index} className={`m-2 p-3 rounded-lg max-w-[85%] ${
              message.isUser
                ? 'bg-blue-50 ml-[15%]'
                : 'bg-white border border-gray-200 mr-[10%]'
            }`}>
              {typeof message.content === 'string' ? (
                <div className="whitespace-pre-line leading-relaxed">{message.content}</div>
              ) : (
                <div className="space-y-2">
                  {message.content.map((product, idx) => (
                    <div key={idx} className="border border-gray-200 p-2.5 rounded bg-gray-50">
                      <h3 className="font-bold text-[13px] mb-1 text-gray-700">{product.maker} — {product.product}</h3>
                      <p className="text-gray-600 mb-1.5 text-[12px] leading-relaxed">{product.description}</p>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {product.features.map((f, fi) => (
                          <span key={fi} className="inline-block bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                        <span className="inline-block bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{product.price_range}</span>
                      </div>
                      {product.link && (
                        <a
                          href={product.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-[11px]"
                        >
                          メーカーサイト →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* サイト内ページ遷移リンク */}
              {message.navigateTo && (
                <button
                  onClick={() => navigateToPage(message.navigateTo!)}
                  className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 underline block"
                >
                  このカテゴリの詳細ページを見る →
                </button>
              )}

              {message.options && message.onOptionClick && (
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  {message.options.map((option, idx) => (
                    <button
                      key={idx}
                      className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-full cursor-pointer text-[11px] hover:bg-green-50 hover:border-green-400 transition-colors"
                      onClick={() => message.onOptionClick!(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 p-2.5 border-t border-gray-200 bg-white rounded-b">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="例: 折板屋根の結露対策、フローリングのおすすめ..."
            className="flex-1 p-2.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:border-green-500"
          />
          <button
            onClick={sendMessage}
            className="px-5 py-2.5 bg-green-600 text-white border-none rounded cursor-pointer text-[12px] hover:bg-green-700 transition-colors font-medium"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
