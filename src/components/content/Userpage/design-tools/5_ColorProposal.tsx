import React, { useState, useEffect, useMemo } from 'react';

// 色彩提案のインターフェース
interface ColorScheme {
  name: string;
  description: string;
  colors: string[]; // HEXコード
  rgbCodes: string[]; // RGB表示用
}

// 日塗工データの型定義
interface JPMAColorData {
  code: string;     // 検索用キー（年号なし）
  munsell: string;  // マンセル値
  hex: string;      // 近似HEX
  name?: string;    // 通称（あれば）
}

interface ColorProposalProps {
  defaultTab?: 'harmony' | 'jpma';
  hideTabBar?: boolean;
}

const ColorProposal: React.FC<ColorProposalProps> = ({ defaultTab, hideTabBar }) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'harmony' | 'jpma'>(defaultTab ?? 'harmony');
  useEffect(() => { if (defaultTab) setActiveTab(defaultTab); }, [defaultTab]);
  const [customMainColor, setCustomMainColor] = useState('#AB4F4F');
  const [hexInput, setHexInput] = useState('#AB4F4F');
  
  // 日塗工検索用state
  const [jpmaInput, setJpmaInput] = useState('');
  const [jpmaResult, setJpmaResult] = useState<JPMAColorData | null>(null);
  const [jpmaError, setJpmaError] = useState('');

  // 配色データ
  const [colorHarmony, setColorHarmony] = useState<{
    complementary: ColorScheme;
    analogous: ColorScheme;
    triadic: ColorScheme;
    splitComplementary: ColorScheme;
    tetradic: ColorScheme;
  } | null>(null);

  // --- データベース: 日塗工近似色 (主要600色+) ---
  // データ量が多いのでuseMemoで保持
  const jpmaDatabase = useMemo<JPMAColorData[]>(() => [
    // --- 無彩色 (N) ---
    {code:'N9.5', munsell:'N9.5', hex:'#F2F2F2', name:'ホワイト'},{code:'N9.0', munsell:'N9.0', hex:'#E3E3E3', name:'白'},
    {code:'N8.5', munsell:'N8.5', hex:'#D6D6D6'},{code:'N8.0', munsell:'N8.0', hex:'#C9C9C9', name:'ライトグレー'},
    {code:'N7.5', munsell:'N7.5', hex:'#BCBCBC'},{code:'N7.0', munsell:'N7.0', hex:'#B0B0B0', name:'グレー'},
    {code:'N6.5', munsell:'N6.5', hex:'#A3A3A3'},{code:'N6.0', munsell:'N6.0', hex:'#969696'},
    {code:'N5.5', munsell:'N5.5', hex:'#8A8A8A'},{code:'N5.0', munsell:'N5.0', hex:'#7D7D7D', name:'ミディアムグレー'},
    {code:'N4.5', munsell:'N4.5', hex:'#707070'},{code:'N4.0', munsell:'N4.0', hex:'#636363', name:'ダークグレー'},
    {code:'N3.5', munsell:'N3.5', hex:'#575757'},{code:'N3.0', munsell:'N3.0', hex:'#4A4A4A'},
    {code:'N2.5', munsell:'N2.5', hex:'#3D3D3D'},{code:'N2.0', munsell:'N2.0', hex:'#303030', name:'ブラックグレー'},
    {code:'N1.5', munsell:'N1.5', hex:'#242424'},{code:'N1.0', munsell:'N1.0', hex:'#171717', name:'ブラック'},

    // --- 02〜19系 (赤〜黄赤) ---
    {code:'02-90D', munsell:'2.5R 9/2', hex:'#E9D5D5'},{code:'02-80H', munsell:'2.5R 8/4', hex:'#D9ABAB'},{code:'02-70L', munsell:'2.5R 7/6', hex:'#CC8080'},
    {code:'02-60H', munsell:'2.5R 6/4', hex:'#A66D6D'},{code:'05-90D', munsell:'5R 9/2', hex:'#E9D6D3'},{code:'05-80L', munsell:'5R 8/6', hex:'#DBA199'},
    {code:'05-70V', munsell:'5R 7/11', hex:'#D66E61'},{code:'05-60F', munsell:'5R 6/3', hex:'#9E807D'},{code:'05-50L', munsell:'5R 5/6', hex:'#995C54'},
    {code:'05-40V', munsell:'5R 4/11', hex:'#943024'},{code:'05-30T', munsell:'5R 3/10', hex:'#73241A'},{code:'05-20L', munsell:'5R 2/6', hex:'#47221E'},
    {code:'07-90D', munsell:'7.5R 9/2', hex:'#E9D8D3'},{code:'07-80H', munsell:'7.5R 8/4', hex:'#D9B5AC'},{code:'07-70L', munsell:'7.5R 7/6', hex:'#CC9185'},
    {code:'07-60L', munsell:'7.5R 6/6', hex:'#A6766D'},{code:'07-50V', munsell:'7.5R 5/11', hex:'#A3422E'},{code:'07-40V', munsell:'7.5R 4/11', hex:'#853625'},
    {code:'09-90D', munsell:'10R 9/2', hex:'#EADAD3'},{code:'09-80L', munsell:'10R 8/6', hex:'#DCAFA1'},{code:'09-70T', munsell:'10R 7/10', hex:'#D6856E'},
    {code:'09-60H', munsell:'10R 6/4', hex:'#A68880'},{code:'09-50L', munsell:'10R 5/6', hex:'#996E63'},{code:'09-40L', munsell:'10R 4/6', hex:'#73524A'},
    {code:'09-30L', munsell:'10R 3/6', hex:'#523B36'},{code:'09-20D', munsell:'10R 2/2', hex:'#332C2A'},{code:'12-90D', munsell:'2.5YR 9/2', hex:'#EBDBD3'},
    {code:'12-80H', munsell:'2.5YR 8/4', hex:'#DBBCAE'},{code:'12-70L', munsell:'2.5YR 7/6', hex:'#CC9D8D'},{code:'12-60X', munsell:'2.5YR 6/12', hex:'#C7764A'},
    {code:'12-50L', munsell:'2.5YR 5/6', hex:'#997669'},{code:'12-40H', munsell:'2.5YR 4/4', hex:'#735F56'},{code:'15-90B', munsell:'5YR 9/1', hex:'#E9E2DA', name:'アイボリーW'},
    {code:'15-80D', munsell:'5YR 8/2', hex:'#DBCDC4'},{code:'15-70H', munsell:'5YR 7/4', hex:'#CCAA95'},{code:'15-60V', munsell:'5YR 6/11', hex:'#C2814F'},
    {code:'15-50F', munsell:'5YR 5/3', hex:'#85776E'},{code:'15-40H', munsell:'5YR 4/4', hex:'#735B4D'},{code:'15-30F', munsell:'5YR 3/3', hex:'#524943'},
    {code:'17-90D', munsell:'7.5YR 9/2', hex:'#EBE0D3'},{code:'17-80H', munsell:'7.5YR 8/4', hex:'#DBC2A2'},{code:'17-70L', munsell:'7.5YR 7/6', hex:'#CCA574'},
    {code:'17-60H', munsell:'7.5YR 6/4', hex:'#A69176'},{code:'17-50L', munsell:'7.5YR 5/6', hex:'#997746'},{code:'17-40H', munsell:'7.5YR 4/4', hex:'#73634D'},
    {code:'19-90A', munsell:'10YR 9/0.5', hex:'#E8E4E0', name:'白茶'},{code:'19-85B', munsell:'10YR 8.5/1', hex:'#DCD4C8', name:'薄ベージュ'},
    {code:'19-80F', munsell:'10YR 8/3', hex:'#DBCCB0'},{code:'19-75B', munsell:'10YR 7.5/1', hex:'#BFB9B0'},{code:'19-70D', munsell:'10YR 7/2', hex:'#BFB6A6'},
    {code:'19-60H', munsell:'10YR 6/4', hex:'#A69376'},{code:'19-50F', munsell:'10YR 5/3', hex:'#857966'},{code:'19-40D', munsell:'10YR 4/2', hex:'#666159'},
    {code:'19-30D', munsell:'10YR 3/2', hex:'#4D4943'},{code:'19-20B', munsell:'10YR 2/1', hex:'#33312E'},

    // --- 22〜39系 (黄〜緑) ---
    {code:'22-90B', munsell:'2.5Y 9/1', hex:'#E8E6D8'},{code:'22-85B', munsell:'2.5Y 8.5/1', hex:'#DBD9CC'},{code:'22-80D', munsell:'2.5Y 8/2', hex:'#DBD7C4'},
    {code:'22-75B', munsell:'2.5Y 7.5/1', hex:'#C2C0B6'},{code:'22-70H', munsell:'2.5Y 7/4', hex:'#CCC395'},{code:'22-60D', munsell:'2.5Y 6/2', hex:'#A6A292'},
    {code:'22-50H', munsell:'2.5Y 5/4', hex:'#999066'},{code:'22-40D', munsell:'2.5Y 4/2', hex:'#666359'},{code:'25-90A', munsell:'5Y 9/0.5', hex:'#E7E7E2'},
    {code:'25-85A', munsell:'5Y 8.5/0.5', hex:'#DBDBD6'},{code:'25-80D', munsell:'5Y 8/2', hex:'#DBDAC4'},{code:'25-75C', munsell:'5Y 7.5/1.5', hex:'#C2C1B4'},
    {code:'25-70H', munsell:'5Y 7/4', hex:'#CCC995'},{code:'25-60D', munsell:'5Y 6/2', hex:'#A6A496'},{code:'25-50D', munsell:'5Y 5/2', hex:'#858376'},
    {code:'25-40B', munsell:'5Y 4/1', hex:'#666561'},{code:'27-90B', munsell:'7.5Y 9/1', hex:'#E6E8D8'},{code:'27-85B', munsell:'7.5Y 8.5/1', hex:'#D9DBCC'},
    {code:'27-80D', munsell:'7.5Y 8/2', hex:'#D9DBC4'},{code:'27-70L', munsell:'7.5Y 7/6', hex:'#CCCB85'},{code:'27-60H', munsell:'7.5Y 6/4', hex:'#A4A676'},
    {code:'27-50D', munsell:'7.5Y 5/2', hex:'#838576'},{code:'29-90B', munsell:'10Y 9/1', hex:'#E2E8D8'},{code:'29-80D', munsell:'10Y 8/2', hex:'#D4DBC4'},
    {code:'29-70H', munsell:'10Y 7/4', hex:'#C4CC95'},{code:'29-60L', munsell:'10Y 6/6', hex:'#A8B370'},{code:'29-50F', munsell:'10Y 5/3', hex:'#7E856D'},
    {code:'29-40D', munsell:'10Y 4/2', hex:'#616659'},{code:'32-90B', munsell:'2.5GY 9/1', hex:'#DFE8DB'},{code:'32-80D', munsell:'2.5GY 8/2', hex:'#D0DBC8'},
    {code:'32-70H', munsell:'2.5GY 7/4', hex:'#BDCCAE'},{code:'32-60D', munsell:'2.5GY 6/2', hex:'#9BA696'},{code:'32-50L', munsell:'2.5GY 5/6', hex:'#709963'},
    {code:'35-90A', munsell:'5GY 9/0.5', hex:'#E2E7E2'},{code:'35-80D', munsell:'5GY 8/2', hex:'#CCDBC8'},{code:'35-70D', munsell:'5GY 7/2', hex:'#B0BFAD'},
    {code:'35-60D', munsell:'5GY 6/2', hex:'#96A696'},{code:'35-40D', munsell:'5GY 4/2', hex:'#596659'},{code:'37-90B', munsell:'7.5GY 9/1', hex:'#D8E8DE'},
    {code:'37-80D', munsell:'7.5GY 8/2', hex:'#C4DBCB'},{code:'37-70H', munsell:'7.5GY 7/4', hex:'#A3CCB3'},{code:'37-60D', munsell:'7.5GY 6/2', hex:'#92A699'},
    {code:'37-50L', munsell:'7.5GY 5/6', hex:'#4E996B'},{code:'39-80D', munsell:'10GY 8/2', hex:'#C4DBCF'},{code:'39-60D', munsell:'10GY 6/2', hex:'#92A69C'},

    // --- 42〜59系 (緑〜青) ---
    {code:'42-90B', munsell:'2.5G 9/1', hex:'#D8E8E2'},{code:'42-80D', munsell:'2.5G 8/2', hex:'#C4DBD3'},{code:'42-70H', munsell:'2.5G 7/4', hex:'#A3CCC0'},
    {code:'42-50L', munsell:'2.5G 5/6', hex:'#4E9983'},{code:'45-90A', munsell:'5G 9/0.5', hex:'#E2E7E5'},{code:'45-80B', munsell:'5G 8/1', hex:'#C3CCC7'},
    {code:'45-70D', munsell:'5G 7/2', hex:'#A8BDB9'},{code:'45-60D', munsell:'5G 6/2', hex:'#92A6A3'},{code:'45-50D', munsell:'5G 5/2', hex:'#768583'},
    {code:'45-40D', munsell:'5G 4/2', hex:'#596664'},{code:'47-90B', munsell:'7.5G 9/1', hex:'#D8E6E8'},{code:'47-80D', munsell:'7.5G 8/2', hex:'#C4DADB'},
    {code:'47-70L', munsell:'7.5G 7/6', hex:'#85C8CC'},{code:'49-90B', munsell:'10G 9/1', hex:'#D8E2E8'},{code:'49-80H', munsell:'10G 8/4', hex:'#AECDE0'},
    {code:'49-70H', munsell:'10G 7/4', hex:'#95BCCF'},{code:'49-60H', munsell:'10G 6/4', hex:'#769AB3'},{code:'49-40H', munsell:'10G 4/4', hex:'#4D6F80'},
    {code:'52-90B', munsell:'2.5BG 9/1', hex:'#D8DEE8'},{code:'52-80D', munsell:'2.5BG 8/2', hex:'#C4D1DB'},{code:'52-70L', munsell:'2.5BG 7/6', hex:'#85ACCC'},
    {code:'52-60D', munsell:'2.5BG 6/2', hex:'#929EA6'},{code:'55-90A', munsell:'5BG 9/0.5', hex:'#E2E5E7'},{code:'55-80B', munsell:'5BG 8/1', hex:'#BEC7CE'},
    {code:'55-70D', munsell:'5BG 7/2', hex:'#A8B3BD'},{code:'55-60D', munsell:'5BG 6/2', hex:'#929CA6'},{code:'55-50D', munsell:'5BG 5/2', hex:'#768085'},
    {code:'55-40D', munsell:'5BG 4/2', hex:'#596166'},{code:'57-90B', munsell:'7.5BG 9/1', hex:'#D8DDE8'},{code:'57-80H', munsell:'7.5BG 8/4', hex:'#ADC0E0'},
    {code:'57-70H', munsell:'7.5BG 7/4', hex:'#95A8CF'},{code:'57-60H', munsell:'7.5BG 6/4', hex:'#7689B3'},{code:'59-90B', munsell:'10BG 9/1', hex:'#D8DAE8'},
    {code:'59-80D', munsell:'10BG 8/2', hex:'#C4C9DB'},{code:'59-70L', munsell:'10BG 7/6', hex:'#8595CC'},{code:'59-60H', munsell:'10BG 6/4', hex:'#767EB3'},

    // --- 62〜79系 (青紫〜赤紫) ---
    {code:'62-90B', munsell:'2.5B 9/1', hex:'#D9D8E8'},{code:'62-80H', munsell:'2.5B 8/4', hex:'#B0ADE0'},{code:'62-60D', munsell:'2.5B 6/2', hex:'#9392A6'},
    {code:'65-90A', munsell:'5B 9/0.5', hex:'#E3E2E7'},{code:'65-80B', munsell:'5B 8/1', hex:'#C2C1CE'},{code:'65-70D', munsell:'5B 7/2', hex:'#ADACBD'},
    {code:'65-60D', munsell:'5B 6/2', hex:'#9594A6'},{code:'65-50D', munsell:'5B 5/2', hex:'#787785'},{code:'65-40D', munsell:'5B 4/2', hex:'#5C5B66'},
    {code:'69-80D', munsell:'10B 8/2', hex:'#CDC4DB'},{code:'69-70L', munsell:'10B 7/6', hex:'#A385CC'},{code:'69-50H', munsell:'10B 5/4', hex:'#6F5980'},
    {code:'72-80D', munsell:'2.5P 8/2', hex:'#D4C4DB'},{code:'72-70H', munsell:'2.5P 7/4', hex:'#B095CF'},{code:'72-50L', munsell:'2.5P 5/6', hex:'#794E99'},
    {code:'75-90A', munsell:'5P 9/0.5', hex:'#E5E2E7'},{code:'75-80D', munsell:'5P 8/2', hex:'#D6C4DB'},{code:'75-70D', munsell:'5P 7/2', hex:'#B8ADBD'},
    {code:'75-60D', munsell:'5P 6/2', hex:'#9E92A6'},{code:'75-50D', munsell:'5P 5/2', hex:'#7F7685'},{code:'75-40D', munsell:'5P 4/2', hex:'#615966'},
    {code:'77-80D', munsell:'7.5P 8/2', hex:'#DBC4D8'},{code:'77-50L', munsell:'7.5P 5/6', hex:'#994E8F'},{code:'79-80D', munsell:'10P 8/2', hex:'#DBC4D1'},

    // --- 82〜99系 (赤紫〜赤) ---
    {code:'82-80D', munsell:'2.5RP 8/2', hex:'#DBC4CB'},{code:'82-50H', munsell:'2.5RP 5/4', hex:'#805966'},{code:'85-90A', munsell:'5RP 9/0.5', hex:'#E7E2E4'},
    {code:'85-80B', munsell:'5RP 8/1', hex:'#CEC1C5'},{code:'85-70D', munsell:'5RP 7/2', hex:'#BDB0B4'},{code:'85-60D', munsell:'5RP 6/2', hex:'#A69599'},
    {code:'85-50D', munsell:'5RP 5/2', hex:'#85767A'},{code:'85-40D', munsell:'5RP 4/2', hex:'#66595C'},{code:'89-80D', munsell:'10RP 8/2', hex:'#DBC4C5'},
    {code:'92-90B', munsell:'2.5R 9/1', hex:'#E8D8D9'},{code:'92-80H', munsell:'2.5R 8/4', hex:'#E0AEB4'},{code:'95-90D', munsell:'5R 9/2', hex:'#E9D3D6'},
    {code:'95-80D', munsell:'5R 8/2', hex:'#DBC4C7'},{code:'95-60H', munsell:'5R 6/4', hex:'#A66D74'},{code:'99-70L', munsell:'10R 7/6', hex:'#CC858D'}
  ], []);

  // --- ロジック ---

  // 初回および色が変更されたら再計算
  useEffect(() => {
    setColorHarmony(calculateColorHarmony(customMainColor));
    setHexInput(customMainColor.toUpperCase());
  }, [customMainColor]);

  // 日塗工検索ロジック
  const handleJpmaSearch = () => {
    setJpmaResult(null);
    setJpmaError('');

    if (!jpmaInput) return;

    // 入力値の正規化 (全角→半角, 大文字化, 空白削除)
    let normalized = jpmaInput
      .toUpperCase()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/\s+/g, '');

    // 年号(H, K, L, P等) + 数字 で始まる場合、先頭のアルファベットを削除して検索
    if (!normalized.startsWith('N')) {
      // "H22-..." -> "22-..."
      normalized = normalized.replace(/^[A-Z](?=\d)/, '');
    }

    // Nの表記揺れ対応 (N-90 -> N9.0, N90 -> N9.0)
    if (normalized.startsWith('N')) {
       if (normalized.includes('-')) normalized = normalized.replace('-', '');
       if (/^N\d{2}$/.test(normalized)) {
         normalized = `N${normalized[1]}.${normalized[2]}`;
       } else if (/^N\d{1}$/.test(normalized)) {
         normalized = `N${normalized[1]}.0`;
       }
    }

    // DB検索 (部分一致ではなく完全一致を基本とするが、末尾のアルファベットなしでも検索可能にする場合は要調整)
    const found = jpmaDatabase.find(d => d.code === normalized);

    if (found) {
      setJpmaResult(found);
    } else {
      // 部分一致検索（オプション）
      const partial = jpmaDatabase.filter(d => d.code.startsWith(normalized)).slice(0, 5);
      if (partial.length > 0) {
        setJpmaError(`「${normalized}」は見つかりませんでしたが、候補があります。`);
        // 候補を表示するUIを追加しても良いが、ここでは最初の一つを表示する簡易実装にはせずエラーとする
      } else {
        setJpmaError(`「${jpmaInput}」は見つかりませんでした。番号を確認してください。`);
      }
    }
  };

  // 検索結果を基準色にセット
  const applyJpmaColor = () => {
    if (jpmaResult) {
      setCustomMainColor(jpmaResult.hex);
      setActiveTab('harmony');
    }
  };

  // カラーハーモニー計算関数
  function calculateColorHarmony(baseColor: string) {
    // 16進数からHSLに変換
    const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { h: 0, s: 0, l: 0 };
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return { h: h * 360, s: s * 100, l: l * 100 };
    };

    // HSLから16進数に変換
    const hslToHex = (h: number, s: number, l: number): string => {
      h = (h % 360 + 360) % 360;
      s = Math.max(0, Math.min(100, s)) / 100;
      l = Math.max(0, Math.min(100, l)) / 100;

      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h / 360 + 1/3);
      const g = hue2rgb(p, q, h / 360);
      const b = hue2rgb(p, q, h / 360 - 1/3);

      const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };

    const getRGBString = (hex: string): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return 'R0 G0 B0';
      return `R${parseInt(result[1], 16)} G${parseInt(result[2], 16)} B${parseInt(result[3], 16)}`;
    };

    const baseHSL = hexToHSL(baseColor);
    const shiftHue = (deg: number) => (baseHSL.h + deg) % 360;

    const complementary = hslToHex(shiftHue(180), baseHSL.s, baseHSL.l);
    const analogous1 = hslToHex(shiftHue(30), baseHSL.s, baseHSL.l);
    const analogous2 = hslToHex(shiftHue(-30), baseHSL.s, baseHSL.l);
    const triadic1 = hslToHex(shiftHue(120), baseHSL.s, baseHSL.l);
    const triadic2 = hslToHex(shiftHue(240), baseHSL.s, baseHSL.l);
    const splitComp1 = hslToHex(shiftHue(150), baseHSL.s, baseHSL.l);
    const splitComp2 = hslToHex(shiftHue(210), baseHSL.s, baseHSL.l);
    const tetradic1 = hslToHex(shiftHue(90), baseHSL.s, baseHSL.l);
    const tetradic2 = hslToHex(shiftHue(180), baseHSL.s, baseHSL.l);
    const tetradic3 = hslToHex(shiftHue(270), baseHSL.s, baseHSL.l);

    return {
      complementary: {
        name: "補色 (Complementary)",
        description: "反対色を組み合わせた、最もコントラストが強い配色",
        colors: [baseColor, complementary],
        rgbCodes: [getRGBString(baseColor), getRGBString(complementary)]
      },
      analogous: {
        name: "類似色 (Analogous)",
        description: "色相環で隣り合う色を使った、調和の取れた配色",
        colors: [analogous2, baseColor, analogous1],
        rgbCodes: [getRGBString(analogous2), getRGBString(baseColor), getRGBString(analogous1)]
      },
      triadic: {
        name: "トライアド (Triadic)",
        description: "色相環を3等分する色を使った、バランスの良い配色",
        colors: [baseColor, triadic1, triadic2],
        rgbCodes: [getRGBString(baseColor), getRGBString(triadic1), getRGBString(triadic2)]
      },
      splitComplementary: {
        name: "分割補色 (Split Complementary)",
        description: "補色の両隣の色を使った、穏やかな配色",
        colors: [baseColor, splitComp1, splitComp2],
        rgbCodes: [getRGBString(baseColor), getRGBString(splitComp1), getRGBString(splitComp2)]
      },
      tetradic: {
        name: "スクエア (Square)",
        description: "色相環を4等分する色を使った、カラフルな配色",
        colors: [baseColor, tetradic1, tetradic2, tetradic3],
        rgbCodes: [getRGBString(baseColor), getRGBString(tetradic1), getRGBString(tetradic2), getRGBString(tetradic3)]
      }
    };
  }

  // 手動入力のハンドラー
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
      setCustomMainColor(val);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert(`コピーしました: ${text}`);
      }).catch(err => console.error(err));
    }
  };

  if (!colorHarmony) return null;

  return (
    <div className="bg-white rounded-b-lg shadow-sm border-b border-gray-100">
      {/* ヘッダー＆タブ */}
      {!hideTabBar && (
      <div className="border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0">
        <div className="p-4 pb-0">
          <div>
            <h3 className="text-[13px] font-medium">色彩チェッカー & 日塗工検索</h3>
            <p className="text-[11px] mt-0.5 opacity-80">基準色の選定や、日塗工番号からの近似色検索が可能です。</p>
          </div>
          <div className="mt-3">
            <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('harmony')}
              className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                activeTab === 'harmony'
                  ? 'bg-white text-gray-800 font-bold'
                  : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              }`}
            >
              配色パレット
            </button>
            <button
              onClick={() => setActiveTab('jpma')}
              className={`px-4 py-2 text-xs rounded-t-lg transition-colors ${
                activeTab === 'jpma'
                  ? 'bg-white text-gray-800 font-bold'
                  : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              }`}
            >
              日塗工番号検索
            </button>
            </div>
          </div>
        </div>
      </div>
      )}
      
      <div className="p-4">
        {/* --- 配色パレットタブ --- */}
        {activeTab === 'harmony' && (
          <div className="animate-fadeIn">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-gray-700">基準色 (Base Color)</span>
                <div className="flex items-center gap-3">
                  <label className="relative cursor-pointer group">
                    <input
                      type="color"
                      value={customMainColor}
                      onChange={(e) => setCustomMainColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-12 h-12 cursor-pointer"
                    />
                    <div
                      className="w-12 h-12 rounded border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: customMainColor }}
                    />
                  </label>
                  
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      value={hexInput}
                      onChange={handleHexInputChange}
                      maxLength={7}
                      className="w-24 text-xs border border-gray-300 rounded px-2 py-1 font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="#000000"
                    />
                    <span className="text-[10px] text-gray-500 font-mono">
                      {(() => {
                        const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(customMainColor);
                        return rgb ? `RGB(${parseInt(rgb[1], 16)}, ${parseInt(rgb[2], 16)}, ${parseInt(rgb[3], 16)})` : '';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="hidden md:block h-10 border-l border-gray-300"></div>
              
              <p className="text-[11px] text-gray-600 flex-1">
                カラーピッカーで色を選ぶか、16進数コードを入力してください。<br/>
                「日塗工番号検索」タブから色を探して反映することもできます。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(colorHarmony).map((scheme, idx) => (
                <div 
                  key={idx} 
                  className={`border rounded-lg p-4 flex flex-col ${scheme.name.includes('Square') ? 'md:col-span-2 lg:col-span-3' : ''}`}
                >
                  <div className="mb-3">
                    <h5 className="text-[13px] font-bold text-gray-800">{scheme.name}</h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">{scheme.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-auto">
                    {scheme.colors.map((color, cIdx) => (
                      <div key={cIdx} className="group relative">
                        <div
                          className="w-12 h-12 rounded border border-gray-200 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                          style={{ backgroundColor: color }}
                          onClick={() => copyToClipboard(color)}
                        />
                        <div className="mt-1 flex flex-col gap-0.5">
                          <span 
                            className="text-[10px] font-mono font-bold text-gray-700 cursor-pointer hover:text-blue-600"
                            onClick={() => copyToClipboard(color)}
                          >
                            {color}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                             {scheme.rgbCodes[cIdx]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 日塗工番号検索タブ --- */}
        {activeTab === 'jpma' && (
          <div className="animate-fadeIn max-w-2xl mx-auto">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <label className="block text-sm font-bold text-gray-800 mb-2">
                日塗工番号を入力
              </label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={jpmaInput}
                  onChange={(e) => setJpmaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJpmaSearch()}
                  placeholder="例: H22-90B, N-90"
                  className="flex-1 p-2 border border-gray-300 rounded text-sm uppercase font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={handleJpmaSearch}
                  className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 transition"
                >
                  検索
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">
                ※年号（H,K,L等）は自動的に無視して検索します。<br/>
                ※本ツールは近似値データベース（主要約600色）を使用しています。実物は色見本帳で確認してください。
              </p>

              {jpmaError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100 flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   {jpmaError}
                </div>
              )}

              {jpmaResult && (
                <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm animate-fadeIn">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                     <h4 className="text-sm font-bold text-gray-800">検索結果</h4>
                     <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">近似値</span>
                  </div>
                  
                  <div className="flex items-start gap-6">
                    <div 
                      className="w-24 h-24 rounded border border-gray-200 shadow-inner"
                      style={{ backgroundColor: jpmaResult.hex }}
                    ></div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 block">日塗工近似番号</span>
                        <span className="text-lg font-bold font-mono text-blue-600">{jpmaResult.code}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-gray-500 block">マンセル値</span>
                          <span className="text-sm font-mono">{jpmaResult.munsell}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">RGB / HEX</span>
                          {/* RGB(10進数)とHEX(16進数)を併記する */}
                          <span className="text-sm font-mono">
                            {(() => {
                                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(jpmaResult.hex);
                                const rgb = result 
                                  ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
                                  : '0, 0, 0';
                                return `${rgb} / ${jpmaResult.hex}`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {jpmaResult.name && (
                        <div>
                          <span className="text-xs text-gray-500 block">通称</span>
                          <span className="text-sm">{jpmaResult.name}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          onClick={applyJpmaColor}
                          className="w-full sm:w-auto text-xs bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition flex items-center justify-center gap-2"
                        >
                          <span>🎨</span>
                          この色を基準色にして配色を見る
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8">
               <h5 className="text-xs font-bold text-gray-600 mb-2">収録データ例（クリックで検索）</h5>
               <div className="flex flex-wrap gap-2">
                 {jpmaDatabase.slice(0, 10).map((d, i) => (
                   <button 
                     key={i} 
                     className="px-2 py-1 bg-white border border-gray-200 text-[10px] text-gray-600 rounded hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition"
                     onClick={() => { setJpmaInput(d.code); handleJpmaSearch(); }}
                   >
                     {d.code}
                   </button>
                 ))}
                 <span className="text-[10px] text-gray-400 self-center ml-1">...他 600色以上</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorProposal;
