'use client';

import React, { useState, useMemo } from 'react';

interface QualificationItem {
  name: string;
  url?: string;
  applicationDeadline?: string; // 受付期限
  examSchedule?: string;        // 試験日程
  resultDate?: string;          // 合否発表日
  desc?: string;                // 互換性維持のため（表示はしない）
}

interface QualificationSection { title: string; items: QualificationItem[] }

const sections: QualificationSection[] = [
  {
    title: '建築設計・意匠・構造・設備系',
    items: [
      { 
        name: '一級建築士', 
        url: 'https://www.jaeic.or.jp/smph/shiken/1k/index.html',
        applicationDeadline: '4月上旬～中旬',
        examSchedule: '学科: 7月下旬 / 設計製図: 10月中旬',
        resultDate: '学科: 9月上旬 / 製図: 12月下旬'
      },
      { 
        name: '二級建築士', 
        url: 'https://www.jaeic.or.jp/smph/shiken/2k/index.html?utm_source=chatgpt.com',
        applicationDeadline: '4月上旬～中旬',
        examSchedule: '学科: 7月上旬 / 製図: 9月中旬',
        resultDate: '学科: 8月下旬 / 製図: 12月上旬'
      },
      { 
        name: '木造建築士', 
        url: 'https://www.jaeic.or.jp/smph/shiken/mk/index.html',
        applicationDeadline: '4月上旬～中旬',
        examSchedule: '学科: 7月下旬 / 製図: 10月中旬',
        resultDate: '学科: 8月下旬 / 製図: 12月上旬'
      },
      { 
        name: '構造設計一級建築士', 
        url: 'https://www.jaeic.or.jp/smph/koshuannai/koshu/s1k/index.html',
        applicationDeadline: '6月上旬～下旬',
        examSchedule: '講習: 9月下旬～10月中旬 / 修了試験: 11月下旬',
        resultDate: '修了発表: 1月下旬'
      },
      { 
        name: '設備設計一級建築士', 
        url: 'https://www.jaeic.or.jp/smph/koshuannai/koshu/b1k/index.html',
        applicationDeadline: '6月上旬～下旬',
        examSchedule: '講習: 9月中旬～10月上旬 / 修了試験: 11月中旬',
        resultDate: '修了発表: 1月下旬'
      },
      { 
        name: '建築設備士', 
        url: 'https://www.jaeic.or.jp/smph/shiken/bmee/index.html',
        applicationDeadline: '2月下旬～3月中旬',
        examSchedule: '第一次（学科）: 6月下旬 / 第二次（設計製図）: 8月下旬',
        resultDate: '第一次: 7月下旬 / 第二次: 11月上旬'
      },
      { 
        name: 'インテリアプランナー', 
        url: 'https://www.jaeic.or.jp/smph/shiken/ip/index.html',
        applicationDeadline: '前期: 3月中旬～4月中旬 / 後期: 9月上旬～下旬',
        examSchedule: '学科試験: 6月下旬 / 設計製図試験: 11月中旬',
        resultDate: '学科: 8月下旬 / 製図: 1月下旬'
      },
      { 
        name: '照明コンサルタント', 
        url: 'https://www.ieij.or.jp/educate/kiso.html',
        applicationDeadline: '4月上旬～6月上旬',
        examSchedule: '講習期間: 7月～翌年3月',
        resultDate: '未定'
      },
      { 
        name: 'カラーコーディネーター（東京商工会議所）', 
        url: 'https://kentei.tokyo-cci.or.jp/color/',
        applicationDeadline: '第60回: 5月中旬～下旬 / 第61回: 9月中旬～下旬',
        examSchedule: '第60回: 6月中旬～7月上旬 / 第61回: 10月下旬～11月上旬',
        resultDate: '即時'
      },
    ],
  },
  {
    title: '施工管理・工事監督系',
    items: [
      { 
        name: '一級建築施工管理技士', 
        desc: '建築工事の現場監督資格。現場代理人・主任技術者・監理技術者として必須。', 
        url: 'https://www.fcip-shiken.jp/ken1/',
        applicationDeadline: '一次・二次: 2月中旬～下旬',
        examSchedule: '一次: 7月中旬 / 二次: 10月中旬',
        resultDate: '一次: 8月下旬 / 二次: 1月上旬'
      },
      { 
        name: '二級建築施工管理技士', 
        desc: '中小規模工事向けの施工監理資格。', 
        url: 'https://www.fcip-shiken.jp/ken2/',
        applicationDeadline: '前期一次: 2月上旬～下旬 / 後期一次・二次: 6月下旬～7月下旬',
        examSchedule: '前期一次: 6月上旬 / 後期一次・二次: 11月上旬',
        resultDate: '前期一次: 7月上旬 / 後期一次: 12月下旬 / 後期二次: 2月上旬'
      },
      { 
        name: '一級土木施工管理技士', 
        desc: '土木現場の監督資格。道路・橋梁・ダムなど。', 
        url: 'https://www.jctc.jp/exam/doboku-1/',
        applicationDeadline: '3月下旬～4月上旬',
        examSchedule: '一次: 7月上旬 / 二次: 10月上旬',
        resultDate: '一次: 8月中旬 / 二次: 1月上旬'
      },
      { 
        name: '二級土木施工管理技士', 
        desc: '小規模土木工事に従事。', 
        url: 'https://www.jctc.jp/exam/doboku-2/',
        applicationDeadline: '前期一次: 3月上旬～中旬 / 後期一次・二次: 7月上旬～中旬',
        examSchedule: '前期一次: 6月上旬 / 後期一次・二次: 10月下旬',
        resultDate: '前期一次: 7月上旬 / 後期一次・二次: 12月上旬'
      },
      { 
        name: '管工事施工管理技士（1級）', 
        desc: '給排水・空調・衛生など管設備工事の管理資格。', 
        url: 'https://www.jctc.jp/exam/kankouji-1/',
        applicationDeadline: '一次・二次: 5月上旬～中旬',
        examSchedule: '一次: 9月上旬 / 二次: 12月上旬',
        resultDate: '一次: 10月上旬 / 二次: 3月上旬'
      },
      { 
        name: '管工事施工管理技士（2級）', 
        desc: '給排水・空調・衛生など管設備工事の管理資格。', 
        url: 'https://www.jctc.jp/exam/kankouji-1/',
        applicationDeadline: '前期一次: 3月上旬～中旬 / 後期一次・二次: 7月上旬～下旬',
        examSchedule: '前期一次: 6月上旬 / 後期一次・二次: 11月中旬',
        resultDate: '前期一次: 7月上旬 / 後期一次: 1月上旬 / 後期二次: 3月上旬'
      },
      { 
        name: '電気工事施工管理技士（1級）', 
        desc: '建築電気設備工事の監督・管理を行う。', 
        url: 'https://www.fcip-shiken.jp/den1/',
        applicationDeadline: '一次・二次: 2月中旬～下旬',
        examSchedule: '一次: 7月中旬 / 二次: 10月中旬',
        resultDate: '一次: 8月下旬 / 二次: 1月上旬'
      },
      { 
        name: '電気工事施工管理技士（2級）', 
        desc: '建築電気設備工事の監督・管理を行う。', 
        url: 'https://www.fcip-shiken.jp/den1/',
        applicationDeadline: '前期一次: 2月上旬～下旬 / 後期一次・二次: 6月下旬～7月下旬',
        examSchedule: '前期一次: 6月上旬 / 後期一次・二次: 11月上旬',
        resultDate: '前期一次: 7月上旬 / 後期一次: 12月下旬 / 後期二次: 2月上旬'
      },
      { 
        name: '造園施工管理技士（1級）', 
        desc: '公園・緑地などの造園工事に関する資格。', 
        url: 'https://www.jctc.jp/exam/zouen-1/',
        applicationDeadline: '一次・二次: 5月上旬～中旬',
        examSchedule: '一次: 9月上旬 / 二次: 12月上旬',
        resultDate: '一次: 10月上旬 / 二次: 3月上旬'
      },
      { 
        name: '造園施工管理技士（2級）', 
        desc: '公園・緑地などの造園工事に関する資格。', 
        url: 'https://www.jctc.jp/exam/zouen-1/',
        applicationDeadline: '前期一次: 3月上旬～中旬 / 後期一次・二次: 7月上旬～下旬',
        examSchedule: '前期一次: 6月上旬 / 後期一次・二次: 11月中旬',
        resultDate: '前期一次: 7月上旬 / 後期一次: 1月上旬 / 後期二次: 3月上旬'
      },
      { 
        name: '建築機械施工管理技士（1級）', 
        desc: 'ブルドーザー・ショベル等の施工管理。', 
        url: 'https://jcmanet-shiken.jp/',
        applicationDeadline: '一次・二次: 2月中旬～3月中旬',
        examSchedule: '一次・二次（筆記）: 6月中旬 / 二次（実技）: 8月下旬～9月中旬',
        resultDate: '一次: 7月下旬 / 二次: 11月中旬'
      },
      { 
        name: '建築機械施工管理技士（2級）', 
        desc: 'ブルドーザー・ショベル等の施工管理。', 
        url: 'https://jcmanet-shiken.jp/',
        applicationDeadline: '一次・二次: 2月中旬～3月中旬',
        examSchedule: '一次・二次（筆記）: 6月中旬 / 二次（実技）: 8月下旬～9月中旬',
        resultDate: '一次: 7月下旬 / 二次: 11月中旬'
      },
    ],
  },
  {
    title: '設備・電気・衛生・環境系',
    items: [
      { 
        name: '第一種電気主任技術者', 
        desc: 'ビル・工場などの電気設備の保安監督。', 
        url: 'https://www.shiken.or.jp/',
        applicationDeadline: '5月中旬～6月上旬',
        examSchedule: '一次（筆記）: 8月下旬 / 二次: 11月中旬',
        resultDate: '未定'
      },
      { 
        name: '第二種電気主任技術者', 
        desc: 'ビル・工場などの電気設備の保安監督。', 
        url: 'https://www.shiken.or.jp/',
        applicationDeadline: '5月中旬～6月上旬',
        examSchedule: '一次（筆記）: 8月下旬 / 二次: 11月中旬',
        resultDate: '未定'
      },
      { 
        name: '第三種電気主任技術者', 
        desc: 'ビル・工場などの電気設備の保安監督。', 
        url: 'https://www.shiken.or.jp/',
        applicationDeadline: '11月中旬～下旬',
        examSchedule: '一次（CBT）: 2月上旬～3月上旬 / 一次（筆記）: 3月下旬',
        resultDate: '未定'
      },
      { name: '電気工事士（第一種・第二種）', desc: '電気配線・設備工事の実務資格。', url: 'https://www.shiken.or.jp/' },
      { 
        name: '給水装置工事主任技術者', 
        desc: '給水装置工事の主任技術者。水道局指定業者に必須。',
        applicationDeadline: '6月上旬～7月上旬',
        examSchedule: '10月下旬',
        resultDate: '11月下旬'
      },
      { 
        name: '排水設備工事責任技術者', 
        desc: '下水道接続工事などの責任技術者。自治体認定。',
        applicationDeadline: '6月下旬～7月下旬',
        examSchedule: '10月中旬',
        resultDate: '12月上旬'
      },
      { 
        name: '空気調和・衛生工学会設備士', 
        desc: 'HVAC（空調衛生）設計・施工の技術認定。', 
        url: 'https://www.shasej.org/',
        applicationDeadline: '8月上旬～下旬',
        examSchedule: '空調部門: 11月下旬 / 衛生部門: 11月下旬',
        resultDate: '2月上旬'
      },
      { 
        name: '冷凍空調技士（1〜3種）', 
        desc: '冷媒回路・冷凍機設備の施工・保守資格。', 
        url: 'https://www.jsrae.or.jp/shiken/',
        applicationDeadline: '12月上旬～翌年1月下旬',
        examSchedule: '2月中旬',
        resultDate: '4月下旬'
      },
      { 
        name: 'エネルギー管理士', 
        desc: '省エネ設備・建築エネルギー管理の国家資格。', 
        url: 'https://www.eccj.or.jp/education_system/qualification/',
        applicationDeadline: '4月上旬～6月下旬',
        examSchedule: '8月上旬',
        resultDate: '9月下旬'
      },
      { 
        name: '環境プランナー/CASBEE不動産評価員', 
        desc: '環境性能評価（CASBEE等）の専門資格。', 
        url: 'https://www.ibec.or.jp/CASBEE/',
        applicationDeadline: '11月中旬～12月上旬',
        examSchedule: '1月下旬',
        resultDate: '未定'
      },
      { 
        name: '環境プランナー/CASBEE建築評価員', 
        desc: '環境性能評価（CASBEE等）の専門資格。', 
        url: 'https://www.ibec.or.jp/CASBEE/',
        applicationDeadline: 'オンライン講義視聴: 7月下旬～8月中旬',
        examSchedule: '大阪: 8月下旬 / 東京: 9月上旬',
        resultDate: '未定'
      },
      { 
        name: '環境プランナー/CASBEE戸建評価員', 
        desc: '環境性能評価（CASBEE等）の専門資格。', 
        url: 'https://www.ibec.or.jp/CASBEE/',
        applicationDeadline: 'オンライン講義視聴: 5月下旬～6月上旬',
        examSchedule: '6月中旬',
        resultDate: '未定'
      },
      { 
        name: '省エネ適合性判定員', 
        desc: '省エネ適合性判定の専門資格。',
        applicationDeadline: '8月下旬～9月上旬',
        examSchedule: '10月中旬',
        resultDate: '11月下旬～12月上旬'
      },
      { 
        name: 'エコ住宅アドバイザー', 
        desc: 'エコ住宅に関するアドバイザー資格。',
        applicationDeadline: '10月中旬～翌年1月上旬',
        examSchedule: '1月中旬',
        resultDate: '未定'
      },
    ],
  },
  {
    title: '土木・測量・地質・耐震系',
    items: [
      { 
        name: '技術士（建設部門・都市及び地方計画など）', 
        desc: '工学技術全般の最高位資格。専門分野の設計審査や監督も可能。', 
        url: 'https://www.engineer.or.jp/',
        applicationDeadline: '一次: 6月中旬～下旬 / 二次: 4月上旬～中旬',
        examSchedule: '一次: 11月下旬 / 二次（筆記）: 7月中旬 / 二次（口頭）: 12月上旬～翌年1月上旬',
        resultDate: '一次: 2月下旬 / 二次（筆記）: 10月下旬 / 二次（口頭）: 3月上旬'
      },
      { 
        name: '測量士・測量士補', 
        desc: '測量計画・実施・成果検定を行う国家資格。', 
        url: 'https://www.gsi.go.jp/',
        applicationDeadline: '12月上旬（国土地理院HP・官報で発表）',
        examSchedule: '5月中旬',
        resultDate: '測量士: 7月上旬 / 測量士補: 6月下旬'
      },
      { 
        name: '地質調査技士', 
        desc: '地盤調査・地質解析の技術者資格。', 
        url: 'https://www.zenchiren.or.jp/',
        applicationDeadline: '4月上旬～5月上旬',
        examSchedule: '7月第2土曜日',
        resultDate: '9月上旬'
      },
      { 
        name: '土地家屋調査士', 
        desc: '登記に関する測量・境界確定を行う国家資格。', 
        url: 'https://www.chosashi.or.jp/',
        applicationDeadline: '7月下旬～8月上旬',
        examSchedule: '筆記: 10月中旬 / 口頭: 1月下旬',
        resultDate: '筆記: 1月上旬 / 口頭最終: 2月中旬'
      },
      { name: '耐震診断士・耐震技術認定者', desc: '既存建物の耐震診断・補強計画の専門家。' },
      { 
        name: '地盤品質判定士', 
        desc: '地盤沈下・地盤リスク評価の専門資格。', 
        url: 'https://www.geohin.jp/',
        applicationDeadline: '5月上旬～6月下旬',
        examSchedule: '10月下旬',
        resultDate: '1月上旬'
      },
    ],
  },
  {
    title: '不動産・建築関連法務・コンサル系',
    items: [
      { 
        name: '宅地建物取引士', 
        desc: '不動産取引・契約に関する必須資格。', 
        url: 'https://www.retio.or.jp/',
        applicationDeadline: '7月上旬～下旬',
        examSchedule: '10月中旬',
        resultDate: '11月下旬'
      },
      { 
        name: 'マンション管理士', 
        desc: '分譲マンション管理運営の専門家。', 
        url: 'https://www.mankan.org/',
        applicationDeadline: '8月上旬～下旬',
        examSchedule: '11月下旬',
        resultDate: '1月上旬'
      },
      { 
        name: '管理業務主任者', 
        desc: '管理組合運営に関する国家資格。', 
        url: 'https://www.mankan.org/',
        applicationDeadline: 'Web: 8月上旬～9月下旬 / 郵送: 8月上旬～下旬',
        examSchedule: '12月上旬',
        resultDate: '1月中旬'
      },
      { 
        name: '不動産鑑定士', 
        desc: '土地・建物の経済価値を評価する資格。', 
        url: 'https://www.fudousan-kanteishi.or.jp/',
        applicationDeadline: '2月上旬～3月上旬',
        examSchedule: '短答式: 5月中旬 / 論文式: 8月上旬～上旬',
        resultDate: '短答式: 6月下旬 / 論文式: 10月中旬'
      },
      { 
        name: '建築コスト管理士', 
        desc: '建築プロジェクトの原価・コスト管理の専門資格。', 
        url: 'https://www.bsij.or.jp/news/2025cost_shiken/index.html',
        applicationDeadline: '6月上旬～9月上旬',
        examSchedule: '10月下旬',
        resultDate: '12月中旬（入会・登録期間：1月中旬）'
      },
      { 
        name: '建設業経理士（1・2級）', 
        desc: '建設業会計・原価計算に特化した資格。', 
        url: 'https://www.kensetsu-kentei.jp/keiri/',
        applicationDeadline: '前期: 5月中旬～6月中旬',
        examSchedule: '9月上旬',
        resultDate: '11月中旬'
      },
      { 
        name: '建設業経理士（1・2・3・4級）', 
        desc: '建設業会計・原価計算に特化した資格。', 
        url: 'https://www.kensetsu-kentei.jp/keiri/',
        applicationDeadline: '前期: 6月第1～3週 / 後期: 10月第2～4週',
        examSchedule: '前期: 7月第2～5週 / 後期: 11月第2週～12月第1週',
        resultDate: '未定'
      },
    ],
  },
  {
    title: '住宅・インテリア・福祉住環境系',
    items: [
      { 
        name: '福祉住環境コーディネーター', 
        desc: '高齢者・障がい者に配慮した住宅改修計画。', 
        url: 'https://kentei.tokyo-cci.or.jp/fukushi/',
        applicationDeadline: '7月中旬～8月下旬',
        examSchedule: '一次: 9月中旬～10月中旬（受験者が希望日選択） / 二次: 12月上旬',
        resultDate: '一次: 11月中旬 / 二次: 2月中旬'
      },
      { 
        name: 'インテリアコーディネーター', 
        desc: '住宅・店舗の内装・家具・照明などトータル提案。', 
        url: 'https://www.interior.or.jp/exam/coordinator/',
        applicationDeadline: '11月中旬～下旬',
        examSchedule: '学科: 11月中旬～下旬 / 実技: 12月上旬',
        resultDate: '2月上旬'
      },
      { 
        name: 'キッチンスペシャリスト', 
        desc: 'キッチン空間の設計・提案・商品知識資格。', 
        url: 'https://www.interior.or.jp/exam/ks/',
        applicationDeadline: '10月下旬～12月上旬',
        examSchedule: '1月中旬',
        resultDate: '2月下旬'
      },
      { 
        name: 'リフォームスタイリスト', 
        desc: '住宅リフォームに特化した実務資格。',
        applicationDeadline: '年4回（3月・6月・9月・12月）',
        examSchedule: '未定',
        resultDate: '未定'
      },
      { 
        name: '住宅建築コーディネーター', 
        desc: '設計・施工・営業をつなぐ住宅提案資格。', 
        url: 'https://www.jcaj.or.jp/',
        applicationDeadline: '未定',
        examSchedule: '未定',
        resultDate: '未定'
      },
    ],
  },
  {
    title: '安全管理・法令・労務系',
    items: [
      { 
        name: '労働安全コンサルタント', 
        desc: '労働災害防止・安全衛生管理の専門家。', 
        url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000184038.html',
        applicationDeadline: '7月上旬～下旬',
        examSchedule: '筆記: 10月下旬 / 口頭: 大阪 1月中旬 / 東京 1月下旬～下旬',
        resultDate: '筆記: 12月上旬 / 口頭: 2月下旬'
      },
      { 
        name: '衛生管理者（第1・第2種）', 
        desc: '事業場の労働衛生管理責任者。', 
        url: 'https://www.jisha.or.jp/edu/qualifications/eisei.html',
        applicationDeadline: '試験日の2ヶ月前～14日前',
        examSchedule: '未定',
        resultDate: '「免許試験合格通知」または「実技試験受験票」で通知'
      },
      { 
        name: '建設業法令遵守責任者', 
        desc: '元請・下請けのコンプライアンス管理。',
        applicationDeadline: '未定',
        examSchedule: '未定',
        resultDate: '未定'
      },
      { 
        name: '建築物環境衛生管理技術者（ビル管）', 
        desc: '建築物衛生法に基づく管理資格。', 
        url: 'https://www.jahmec.or.jp/qualification/building/',
        applicationDeadline: '5月上旬～6月中旬',
        examSchedule: '10月上旬',
        resultDate: '9月上旬'
      },
      { 
        name: '特定化学物質及び四アルキル鉛等作業主任者', 
        desc: 'アスベスト等有害物管理資格。', 
        url: 'https://www.mhlw.go.jp/',
        applicationDeadline: '毎月実施',
        examSchedule: '未定',
        resultDate: '未定'
      },
    ],
  },
  {
    title: 'その他関連資格（補助・評価・技術認定）',
    items: [
      { 
        name: '建築CAD検定試験', 
        desc: '', 
        url: 'https://www.aacl.gr.jp/',
        applicationDeadline: '前期: 2月初旬～2月下旬 / 後期: 8月上旬～下旬',
        examSchedule: '前期: 4月上旬～下旬（試験会場による） / 後期: 10月上旬～下旬（試験会場による）',
        resultDate: '前期: 6月中旬 / 後期: 12月中旬'
      },
      { 
        name: 'BIM利用技術者試験', 
        desc: '',
        url: 'https://www.acsp.jp/bim/ind.html',
        applicationDeadline: '前期: 4月下旬～5月下旬 / 後期: 9月中旬～10月中旬',
        examSchedule: '前期: 6月下旬 / 後期: 11月下旬',
        resultDate: '前期: 9月上旬（予定） / 後期: 翌年2月下旬（予定）'
      },
      { 
        name: 'ドローン測量管理士', 
        desc: '',
        url: 'https://dsero.org/license',
        applicationDeadline: '【前期】一次: 6月上旬～中旬 / 二次: 7月中旬～8月上旬 / 【後期】一次: 10月上旬～10月下旬 / 二次: 11月中旬～下旬',
        examSchedule: '【前期】一次: 7月上旬 / 二次: 8月下旬 / 【後期】一次: 11月上旬 / 二次: 12月上旬',
        resultDate: '未定'
      },
      { 
        name: '建築積算士', 
        desc: '', 
        url: 'https://www.bsij.or.jp/news/2025sekisan_shiken/content2.html',
        applicationDeadline: '一次: 10月上旬～12月上旬',
        examSchedule: '一次: 10月下旬',
        resultDate: '一次: 12月上旬'
      },
      { 
        name: '環境再生医', 
        desc: '', 
        url: 'https://www.kankyo-saisei.org/',
        applicationDeadline: '12月上旬',
        examSchedule: 'テキスト試験: 1月中旬 / 認定講習: 1月中旬～下旬',
        resultDate: '未定'
      },
      { 
        name: 'CASBEE不動産評価員', 
        desc: '', 
        url: 'https://www.ibec.or.jp/CASBEE/',
        applicationDeadline: '11月中旬～12月上旬',
        examSchedule: '1月下旬',
        resultDate: '試験当日に案内'
      },
      { 
        name: '公害防止管理者（大気・水質）', 
        desc: '', 
        url: 'https://www.jemai.or.jp/koujouboushi/',
        applicationDeadline: '7月上旬～下旬',
        examSchedule: '10月上旬',
        resultDate: '11月中旬'
      },
      { 
        name: '住宅性能評価員', 
        desc: '',
        applicationDeadline: '住宅性能評価員養成研修受講後、評価員登録',
        examSchedule: '未定',
        resultDate: '未定'
      },
      { 
        name: '省エネ建築診断士（エコ住宅系）', 
        desc: '',
        applicationDeadline: '2日間の研修・試験受講後、合格者に「省エネ建築診断士」IDカード発行',
        examSchedule: '未定',
        resultDate: '未定'
      },
    ],
  },
]

/**
 * Parse a Japanese deadline string like "4月上旬～中旬" into an approximate Date.
 * Uses the current year (or next year if the date appears to have passed).
 * Returns null if parsing fails or the string is non-date-like (e.g. "未定", descriptive text).
 */
function parseApproxDeadlineDate(deadline: string | undefined): Date | null {
  if (!deadline) return null;

  // Skip clearly non-date strings
  if (/未定|毎月|年4回|研修|受講|視聴|登録/.test(deadline)) return null;

  // Take the first date-like segment (before "/" or "【後期】" etc.)
  const segment = deadline.split(/\s*\/\s*/)[0]
    .replace(/^(前期|後期|Web|郵送|一次|二次|一次・二次)[:\s：]*/g, '')
    .replace(/【[^】]*】/g, '')
    .trim();

  const monthMatch = segment.match(/(\d{1,2})月/);
  if (!monthMatch) return null;
  const month = parseInt(monthMatch[1], 10);

  // Determine day from 上旬/中旬/下旬
  let day = 15; // default to mid-month
  if (/上旬/.test(segment)) day = 5;
  else if (/下旬/.test(segment)) day = 25;
  else if (/中旬/.test(segment)) day = 15;

  // For "～" ranges, use the end part if it has 旬
  const rangeEnd = segment.split(/～/)[1];
  if (rangeEnd) {
    const endMonthMatch = rangeEnd.match(/(\d{1,2})月/);
    const endMonth = endMonthMatch ? parseInt(endMonthMatch[1], 10) : month;
    let endDay = day;
    if (/上旬/.test(rangeEnd)) endDay = 10;
    else if (/下旬/.test(rangeEnd)) endDay = 28;
    else if (/中旬/.test(rangeEnd)) endDay = 20;

    const now = new Date();
    const year = now.getFullYear();
    let d = new Date(year, endMonth - 1, endDay);
    // If the date has already passed this year, use next year
    if (d.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
      d = new Date(year + 1, endMonth - 1, endDay);
    }
    return d;
  }

  const now = new Date();
  const year = now.getFullYear();
  let d = new Date(year, month - 1, day);
  if (d.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
    d = new Date(year + 1, month - 1, day);
  }
  return d;
}

/** Calculate days remaining from today. Returns null if date is null or already passed. */
function daysRemaining(target: Date | null): number | null {
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

/** Format the countdown badge text */
function countdownText(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return '本日締切';
  return `あと${days}日`;
}

const Qualifications: React.FC = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach(section => { init[section.title] = false; });
    return init;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByDeadline, setSortByDeadline] = useState(false);

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Flatten all items with section info, compute deadline dates
  const allItemsWithMeta = useMemo(() => {
    return sections.flatMap(section =>
      section.items.map(item => ({
        ...item,
        sectionTitle: section.title,
        deadlineDate: parseApproxDeadlineDate(item.applicationDeadline),
      }))
    );
  }, []);

  // Filtered sections for accordion view
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.trim().toLowerCase();
    return sections
      .map(section => ({
        ...section,
        items: section.items.filter(it => it.name.toLowerCase().includes(q)),
      }))
      .filter(section => section.items.length > 0);
  }, [searchQuery]);

  // Sorted flat list for deadline view
  const sortedItems = useMemo(() => {
    let items = allItemsWithMeta;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(it => it.name.toLowerCase().includes(q));
    }
    // Items with a parseable deadline first (sorted nearest first), then items without
    const withDate = items.filter(it => it.deadlineDate !== null)
      .sort((a, b) => a.deadlineDate!.getTime() - b.deadlineDate!.getTime());
    const withoutDate = items.filter(it => it.deadlineDate === null);
    return [...withDate, ...withoutDate];
  }, [searchQuery, allItemsWithMeta]);

  /** Render a single qualification item */
  const renderItem = (it: QualificationItem, key: string | number, sectionLabel?: string) => {
    const deadlineDate = parseApproxDeadlineDate(it.applicationDeadline);
    const remaining = daysRemaining(deadlineDate);
    const badge = countdownText(remaining);

    return (
      <li key={key} className="leading-6">
        <span className="mr-1">・</span>
        {it.url ? (
          <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 hover:underline">{it.name}</a>
        ) : (
          <span className="font-medium">{it.name}</span>
        )}
        {sectionLabel && (
          <span className="ml-2 text-[10px] text-gray-400">[{sectionLabel}]</span>
        )}
        <div className="ml-4 text-[11px] text-gray-600">
          <span className="mr-3">
            <span className="font-medium">受付期限:</span> {it.applicationDeadline || '未定'}
            {badge && (
              <span className={`ml-1.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                remaining !== null && remaining <= 7
                  ? 'bg-red-100 text-red-700'
                  : remaining !== null && remaining <= 30
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {badge}
              </span>
            )}
          </span>
          <span className="mr-3"><span className="font-medium">試験日程:</span> {it.examSchedule || '未定'}</span>
          <span><span className="font-medium">合否発表日:</span> {it.resultDate || '未定'}</span>
        </div>
      </li>
    );
  };

  return (
    <div>
      <div className="flex items-baseline mb-2">
        <h2 className="text-xl font-semibold">資格試験</h2>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建築・設備・不動産領域の主な資格試験スケジュールをカテゴリ別にまとめています。受験計画や社内共有にご活用ください。
      </p>

      {/* Search and sort controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          placeholder="資格名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-1.5 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={() => setSortByDeadline(prev => !prev)}
          className={`px-3 py-1.5 text-[12px] rounded border whitespace-nowrap transition-colors ${
            sortByDeadline
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {sortByDeadline ? '締切順 ON' : '締切順に並べ替え'}
        </button>
      </div>

      {/* Deadline-sorted flat list view */}
      {sortByDeadline ? (
        <div className="bg-white p-4 rounded border border-gray-300">
          {sortedItems.length === 0 ? (
            <p className="text-[13px] text-gray-500">該当する資格が見つかりません。</p>
          ) : (
            <ul className="space-y-1 text-[13px]">
              {sortedItems.map((it, idx) => renderItem(it, idx, it.sectionTitle))}
            </ul>
          )}
        </div>
      ) : (
        /* Default accordion view */
        <div className="space-y-2">
          {filteredSections.length === 0 ? (
            <p className="text-[13px] text-gray-500 p-4">該当する資格が見つかりません。</p>
          ) : (
            filteredSections.map((section, sIdx) => (
              <div key={sIdx} id={sIdx === 0 ? 'qual-first-section' : undefined} className="bg-white p-4 rounded border border-gray-300">
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={openSections[section.title]}
                  className="flex items-center gap-2 font-bold mb-2 text-[13px] text-left w-full"
                >
                  <span className={`inline-block w-4 text-[16px] transition-transform ${openSections[section.title] ? 'rotate-90' : ''}`}>▸</span>
                  <span>{section.title}</span>
                  <span className="text-[11px] font-normal text-gray-400 ml-1">({section.items.length})</span>
                </button>
                {openSections[section.title] && (
                  <ul className="space-y-1 text-[13px] pl-5">
                    {section.items.map((it, iIdx) => renderItem(it, iIdx))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Qualifications;


