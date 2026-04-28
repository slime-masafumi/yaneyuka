'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebaseClient';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- Types ---
interface PropertyCardData {
  id: string;
  name: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  fields: Record<string, string>;
  memos: Record<string, string>;
}

type FieldType = 'text' | 'select' | 'textarea' | 'date' | 'number';

interface SectionItem {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  unit?: string;
  half?: boolean;
}

interface Section {
  id: string;
  title: string;
  items: SectionItem[];
}

// --- 12 Sections ---
const SECTIONS: Section[] = [
  {
    id: 's1', title: '1. 敷地基本情報',
    items: [
      { key: 's1-1', label: '物件名称', type: 'text', placeholder: '例: ○○ビル新築工事' },
      { key: 's1-2', label: '所在地', type: 'text', placeholder: '例: 東京都○○区○○町1-2-3' },
      { key: 's1-3', label: '地番', type: 'text', placeholder: '例: ○○番地○' },
      { key: 's1-4', label: '敷地面積（実測）', type: 'number', placeholder: '例: 500.00', unit: '㎡', half: true },
      { key: 's1-5', label: '敷地面積（公簿）', type: 'number', placeholder: '例: 498.50', unit: '㎡', half: true },
      { key: 's1-6', label: '前面道路 幅員', type: 'text', placeholder: '例: 6.0m 市道', half: true },
      { key: 's1-7', label: '側面道路 幅員', type: 'text', placeholder: '例: 4.0m 私道', half: true },
      { key: 's1-8', label: '道路種別', type: 'select', options: ['', '42条1項1号（道路法）', '42条1項2号（開発道路）', '42条1項3号（既存道路）', '42条1項4号（計画道路）', '42条1項5号（位置指定道路）', '42条2項（みなし道路）', '42条3項', '43条但書', 'その他'] },
      { key: 's1-9', label: '接道長さ', type: 'text', placeholder: '例: 前面15.0m、側面8.0m' },
      { key: 's1-10', label: '敷地形状', type: 'select', options: ['', '整形（矩形）', '整形（正方形）', '不整形', '旗竿（路地状）', '台形', '三角形', 'L字型', 'その他'], half: true },
      { key: 's1-11', label: '敷地の高低差', type: 'text', placeholder: '例: 道路面より+0.5m', half: true },
      { key: 's1-12', label: '方位', type: 'select', options: ['', '北', '北東', '東', '南東', '南', '南西', '西', '北西'], half: true },
      { key: 's1-13', label: '最寄り駅・交通', type: 'text', placeholder: '例: ○○線○○駅 徒歩5分', half: true },
      { key: 's1-14', label: '現況', type: 'select', options: ['', '更地', '既存建物あり', '駐車場', '農地', '山林', 'その他'] },
    ],
  },
  {
    id: 's2', title: '2. 都市計画・法規制',
    items: [
      { key: 's2-1', label: '都市計画区域', type: 'select', options: ['', '市街化区域', '市街化調整区域', '非線引き区域', '都市計画区域外', '準都市計画区域'] },
      { key: 's2-2', label: '区域区分', type: 'text', placeholder: '例: 市街化区域' },
      { key: 's2-3', label: '用途地域', type: 'select', options: ['', '第一種低層住居専用地域', '第二種低層住居専用地域', '第一種中高層住居専用地域', '第二種中高層住居専用地域', '第一種住居地域', '第二種住居地域', '準住居地域', '田園住居地域', '近隣商業地域', '商業地域', '準工業地域', '工業地域', '工業専用地域', '指定なし'] },
      { key: 's2-4', label: '建蔽率', type: 'text', placeholder: '例: 60%', half: true },
      { key: 's2-5', label: '容積率', type: 'text', placeholder: '例: 200%', half: true },
      { key: 's2-6', label: '高度地区', type: 'text', placeholder: '例: 第2種高度地区' },
      { key: 's2-7', label: '防火地域', type: 'select', options: ['', '防火地域', '準防火地域', '法22条区域', '指定なし'], half: true },
      { key: 's2-8', label: '日影規制', type: 'text', placeholder: '例: 5h/3h（測定面4m）', half: true },
      { key: 's2-9', label: '風致地区', type: 'select', options: ['', '該当', '非該当'], half: true },
      { key: 's2-10', label: '景観地区・景観計画', type: 'text', placeholder: '例: ○○景観地区', half: true },
      { key: 's2-11', label: '地区計画', type: 'text', placeholder: '例: ○○地区計画', half: true },
      { key: 's2-12', label: '建築協定', type: 'select', options: ['', '該当', '非該当'], half: true },
      { key: 's2-13', label: '壁面後退', type: 'text', placeholder: '例: 道路側1.0m、隣地側0.5m', half: true },
      { key: 's2-14', label: '特定街区', type: 'select', options: ['', '該当', '非該当'], half: true },
      { key: 's2-15', label: '道路斜線制限', type: 'text', placeholder: '例: 適用距離20m、勾配1.5' },
      { key: 's2-16', label: '隣地斜線制限', type: 'text', placeholder: '例: 立上り20m、勾配1.25' },
      { key: 's2-17', label: '北側斜線制限', type: 'text', placeholder: '例: 立上り5m、勾配1.25' },
      { key: 's2-18', label: 'その他の規制', type: 'textarea', placeholder: '宅地造成工事規制区域、急傾斜地等' },
    ],
  },
  {
    id: 's3', title: '3. 建築基準法関連',
    items: [
      { key: 's3-1', label: '建築物の用途', type: 'text', placeholder: '例: 事務所、共同住宅' },
      { key: 's3-2', label: '構造', type: 'select', options: ['', '木造（W造）', '鉄骨造（S造）', '鉄筋コンクリート造（RC造）', '鉄骨鉄筋コンクリート造（SRC造）', '補強コンクリートブロック造（CB造）', '混構造', 'その他'] },
      { key: 's3-3', label: '階数（地上）', type: 'text', placeholder: '例: 地上3階', half: true },
      { key: 's3-4', label: '階数（地下）', type: 'text', placeholder: '例: 地下1階', half: true },
      { key: 's3-5', label: '建築面積', type: 'number', placeholder: '例: 300.00', unit: '㎡', half: true },
      { key: 's3-6', label: '延べ面積', type: 'number', placeholder: '例: 900.00', unit: '㎡', half: true },
      { key: 's3-7', label: '最高高さ', type: 'text', placeholder: '例: 12.5m' },
      { key: 's3-8', label: '耐火要求', type: 'select', options: ['', '耐火建築物', '準耐火建築物（イ）', '準耐火建築物（ロ）', 'その他の建築物', '要確認'], half: true },
      { key: 's3-9', label: '内装制限', type: 'text', placeholder: '例: 居室・通路 準不燃以上', half: true },
      { key: 's3-10', label: '確認申請の区分', type: 'select', options: ['', '第1号（特殊建築物）', '第2号（大規模木造）', '第3号（大規模非木造）', '第4号（小規模）', '要確認'] },
    ],
  },
  {
    id: 's4', title: '4. 関連法令・許認可',
    items: [
      { key: 's4-1', label: '開発許可（都市計画法）', type: 'select', options: ['', '必要', '不要', '要確認'], half: true },
      { key: 's4-2', label: '宅地造成等規制法', type: 'select', options: ['', '該当', '非該当', '要確認'], half: true },
      { key: 's4-3', label: '土地区画整理法', type: 'select', options: ['', '区域内', '区域外', '要確認'], half: true },
      { key: 's4-4', label: '消防法（消防同意）', type: 'select', options: ['', '必要', '不要', '要確認'], half: true },
      { key: 's4-5', label: '文化財保護法', type: 'select', options: ['', '該当', '非該当', '要確認'], half: true },
      { key: 's4-6', label: '農地法', type: 'select', options: ['', '該当（転用許可要）', '非該当', '要確認'], half: true },
      { key: 's4-7', label: '河川法', type: 'select', options: ['', '該当', '非該当', '要確認'], half: true },
      { key: 's4-8', label: 'バリアフリー法', type: 'select', options: ['', '適合義務', '努力義務', '対象外', '要確認'], half: true },
      { key: 's4-9', label: '省エネ法', type: 'select', options: ['', '適合義務', '届出義務', '説明義務', '対象外', '要確認'], half: true },
      { key: 's4-10', label: '長期優良住宅', type: 'select', options: ['', '申請予定', '申請なし', '要検討'], half: true },
      { key: 's4-11', label: '低炭素建築物', type: 'select', options: ['', '申請予定', '申請なし', '要検討'], half: true },
      { key: 's4-12', label: 'その他の法令', type: 'textarea', placeholder: '駐車場法、大規模小売店舗立地法、福祉のまちづくり条例 等' },
    ],
  },
  {
    id: 's5', title: '5. インフラ・ライフライン',
    items: [
      { key: 's5-1', label: '上水道', type: 'select', options: ['', '本管あり（引込済）', '本管あり（引込なし）', '本管なし', '要確認'], half: true },
      { key: 's5-2', label: '下水道（汚水）', type: 'select', options: ['', '公共下水あり（接続済）', '公共下水あり（未接続）', '公共下水なし', '要確認'], half: true },
      { key: 's5-3', label: '下水道（雨水）', type: 'select', options: ['', '公共下水あり（接続済）', '公共下水あり（未接続）', '浸透処理', '側溝放流', '要確認'], half: true },
      { key: 's5-4', label: '都市ガス', type: 'select', options: ['', '本管あり（引込済）', '本管あり（引込なし）', '本管なし（プロパン）', '要確認'], half: true },
      { key: 's5-5', label: '電気', type: 'select', options: ['', '引込あり', '引込なし', '要確認'], half: true },
      { key: 's5-6', label: '通信（電話・光回線）', type: 'select', options: ['', '引込あり', '引込なし', '要確認'], half: true },
      { key: 's5-7', label: '引込位置', type: 'text', placeholder: '各インフラの引込位置メモ' },
      { key: 's5-8', label: '管径（上水）', type: 'text', placeholder: '例: φ20mm', half: true },
      { key: 's5-9', label: '管径（下水）', type: 'text', placeholder: '例: φ150mm', half: true },
      { key: 's5-10', label: '処理区域', type: 'text', placeholder: '例: ○○処理区' },
      { key: 's5-11', label: '浄化槽の要否', type: 'select', options: ['', '必要', '不要', '要確認'] },
      { key: 's5-12', label: 'その他', type: 'textarea', placeholder: 'CATV、集中冷暖房等' },
    ],
  },
  {
    id: 's6', title: '6. 地盤・地質',
    items: [
      { key: 's6-1', label: '地盤調査の有無', type: 'select', options: ['', '調査済み', '未実施', '実施予定'], half: true },
      { key: 's6-2', label: '調査方法', type: 'select', options: ['', 'スウェーデン式サウンディング（SWS）', '標準貫入試験（ボーリング）', '表面波探査', '平板載荷試験', 'その他', '未定'], half: true },
      { key: 's6-3', label: '地耐力', type: 'text', placeholder: '例: 30kN/㎡', half: true },
      { key: 's6-4', label: '支持層深度', type: 'text', placeholder: '例: GL-5.0m', half: true },
      { key: 's6-5', label: '液状化リスク', type: 'select', options: ['', '高い', 'やや高い', '低い', 'なし', '不明'], half: true },
      { key: 's6-6', label: '地下水位', type: 'text', placeholder: '例: GL-2.0m', half: true },
      { key: 's6-7', label: '土壌汚染', type: 'select', options: ['', '汚染なし', '汚染あり（対策済）', '汚染あり（未対策）', '調査未実施', '要確認'], half: true },
      { key: 's6-8', label: '地盤改良の要否', type: 'select', options: ['', '必要', '不要', '要検討'], half: true },
    ],
  },
  {
    id: 's7', title: '7. 近隣・周辺環境',
    items: [
      { key: 's7-1', label: '隣接建物（北側）', type: 'text', placeholder: '例: 2F住宅、境界離れ1.0m', half: true },
      { key: 's7-2', label: '隣接建物（東側）', type: 'text', placeholder: '例: 3F事務所ビル、境界離れ0.5m', half: true },
      { key: 's7-3', label: '隣接建物（南側）', type: 'text', placeholder: '例: 駐車場（空地）', half: true },
      { key: 's7-4', label: '隣接建物（西側）', type: 'text', placeholder: '例: 道路（幅員6m）', half: true },
      { key: 's7-5', label: '近隣への配慮事項', type: 'textarea', placeholder: '騒音、振動、日照、プライバシー、工事車両等' },
    ],
  },
  {
    id: 's8', title: '8. 既存建物',
    items: [
      { key: 's8-1', label: '既存建物の有無', type: 'select', options: ['', 'あり', 'なし'], half: true },
      { key: 's8-2', label: '既存建物の概要', type: 'textarea', placeholder: '構造、階数、面積、築年数等' },
      { key: 's8-3', label: '解体の要否', type: 'select', options: ['', '要（全解体）', '要（一部解体）', '不要', '未定'], half: true },
      { key: 's8-4', label: 'アスベスト調査', type: 'select', options: ['', '調査済（含有なし）', '調査済（含有あり）', '未調査', '対象外'], half: true },
    ],
  },
  {
    id: 's9', title: '9. 構造・設備計画',
    items: [
      { key: 's9-1', label: '構造計画概要', type: 'textarea', placeholder: '基礎形式、構造形式、スパン等' },
      { key: 's9-2', label: '設備計画概要', type: 'textarea', placeholder: '空調方式、給排水方式、電気容量等' },
      { key: 's9-3', label: '外構計画概要', type: 'textarea', placeholder: '駐車場台数、植栽、フェンス等' },
    ],
  },
  {
    id: 's10', title: '10. 事業・プロジェクト条件',
    items: [
      { key: 's10-1', label: '事業主（建築主）', type: 'text', placeholder: '例: ○○株式会社', half: true },
      { key: 's10-2', label: '設計者', type: 'text', placeholder: '例: ○○設計事務所', half: true },
      { key: 's10-3', label: '施工者', type: 'text', placeholder: '例: ○○建設（未定の場合は「未定」）', half: true },
      { key: 's10-4', label: '工事予定期間', type: 'text', placeholder: '例: 約12ヶ月', half: true },
      { key: 's10-5', label: '概算工事費', type: 'text', placeholder: '例: 約○億○千万円', half: true },
      { key: 's10-6', label: '設計期間', type: 'text', placeholder: '例: 2024年4月〜2024年9月', half: true },
      { key: 's10-7', label: '確認申請予定日', type: 'date', half: true },
      { key: 's10-8', label: '着工予定日', type: 'date', half: true },
      { key: 's10-9', label: '竣工予定日', type: 'date', half: true },
    ],
  },
  {
    id: 's11', title: '11. 行政協議・手続き',
    items: [
      { key: 's11-1', label: '事前協議', type: 'textarea', placeholder: '協議先、協議内容、結果等' },
      { key: 's11-2', label: '近隣説明', type: 'textarea', placeholder: '説明会の実施状況、要望事項等' },
      { key: 's11-3', label: 'その他手続き', type: 'textarea', placeholder: '中高層条例、景観届出、各種届出等' },
    ],
  },
  {
    id: 's12', title: '12. 備考・特記事項',
    items: [
      { key: 's12-1', label: '設計上の注意事項', type: 'textarea', placeholder: '設計条件、特殊な要件等' },
      { key: 's12-2', label: '施工上の注意事項', type: 'textarea', placeholder: '施工条件、搬入経路、仮設計画等' },
      { key: 's12-3', label: 'その他特記事項', type: 'textarea', placeholder: '自由記入' },
    ],
  },
];

const STORAGE_KEY = 'propertyCards';
const MAX_CARDS = 10;

function createEmptyCard(author: string): PropertyCardData {
  const now = new Date().toISOString();
  return {
    id: String(Date.now()),
    name: '',
    author,
    createdAt: now,
    updatedAt: now,
    fields: {},
    memos: {},
  };
}

function formatDateJP(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  } catch { return ''; }
}

// --- Print CSS (injected once) ---
const PRINT_STYLE_ID = 'property-card-print-style';
function ensurePrintStyle() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      @page { size: A4; margin: 15mm; }

      /* Hide everything except the property card */
      body > *:not(#__next),
      #__next > *:not([class]),
      nav, header, footer, aside,
      .left-column,
      [class*="sidebar"],
      [class*="Sidebar"],
      [class*="music"],
      [class*="Music"],
      [class*="Navigation"],
      [class*="navigation"],
      [class*="Footer"],
      [class*="Header"] {
        display: none !important;
      }

      /* Force show all sections */
      .pc-section-body {
        display: block !important;
      }

      /* Page break control */
      .pc-section {
        break-inside: avoid;
      }

      /* Hide interactive buttons */
      .pc-no-print {
        display: none !important;
      }

      /* Style inputs as plain text for print */
      .pc-print-area input,
      .pc-print-area select,
      .pc-print-area textarea {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        border-bottom: 1px solid #999 !important;
        border-radius: 0 !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        font-size: 10px !important;
      }

      .pc-print-area textarea {
        border: 1px solid #ccc !important;
        border-radius: 2px !important;
      }

      .pc-print-area {
        font-size: 10px;
      }
    }
  `;
  document.head.appendChild(style);
}

// --- Component ---
const PropertyCard: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const { currentUser, isLoggedIn } = useAuth();

  const [cards, setCards] = useState<PropertyCardData[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ s1: true });
  const [isSaving, setIsSaving] = useState(false);
  const suppressSnapshotRef = useRef(false);

  const activeCard = cards.find(c => c.id === activeCardId) || null;

  // --- Persistence: Load from localStorage, then subscribe to Firestore ---
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed: PropertyCardData[] = JSON.parse(raw);
        setCards(parsed);
        if (parsed.length > 0) setActiveCardId(parsed[0].id);
      } catch {}
    }

    if (!currentUser) return;
    const colRef = collection(db, 'users', currentUser.uid, 'propertyCards');
    const unsub = onSnapshot(colRef, (snap) => {
      if (suppressSnapshotRef.current) return;
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PropertyCardData, 'id'>) }));
      setCards(list);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      if (list.length > 0) {
        setActiveCardId(prev => {
          if (prev && list.some(c => c.id === prev)) return prev;
          return list[0].id;
        });
      }
    });
    return () => unsub();
  }, [currentUser]);

  // --- Save to localStorage + Firestore ---
  const saveCard = useCallback(async (card: PropertyCardData) => {
    setIsSaving(true);
    const updated = { ...card, updatedAt: new Date().toISOString() };
    const newCards = cards.map(c => c.id === updated.id ? updated : c);
    setCards(newCards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    if (currentUser) {
      suppressSnapshotRef.current = true;
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'propertyCards', updated.id);
        const { id, ...rest } = updated;
        await setDoc(docRef, rest);
      } catch (e) { console.error('Firestore save error:', e); }
      setTimeout(() => { suppressSnapshotRef.current = false; }, 1000);
    }
    setIsSaving(false);
  }, [cards, currentUser]);

  // --- Create new card ---
  const handleNew = () => {
    if (!currentUser) {
      alert('物件カルテを作成するにはログインが必要です。');
      return;
    }
    if (cards.length >= MAX_CARDS) {
      alert(`物件カルテは最大${MAX_CARDS}件までです。不要なカルテを削除してください。`);
      return;
    }
    const newCard = createEmptyCard(currentUser.username || '');
    const newCards = [...cards, newCard];
    setCards(newCards);
    setActiveCardId(newCard.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    setOpenSections({ s1: true });
  };

  // --- Delete card ---
  const handleDelete = async () => {
    if (!activeCard) return;
    if (!confirm(`「${activeCard.name || '無題'}」を削除しますか？`)) return;
    const newCards = cards.filter(c => c.id !== activeCard.id);
    setCards(newCards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
    setActiveCardId(newCards.length > 0 ? newCards[0].id : null);
    if (currentUser) {
      try { await deleteDoc(doc(db, 'users', currentUser.uid, 'propertyCards', activeCard.id)); } catch {}
    }
  };

  // --- Field change ---
  const handleFieldChange = (key: string, value: string) => {
    if (!activeCard) return;
    setCards(prev => prev.map(c => c.id === activeCard.id
      ? { ...c, fields: { ...c.fields, [key]: value } }
      : c
    ));
  };

  const handleMemoChange = (key: string, value: string) => {
    if (!activeCard) return;
    setCards(prev => prev.map(c => c.id === activeCard.id
      ? { ...c, memos: { ...c.memos, [key]: value } }
      : c
    ));
  };

  const handleCardMetaChange = (field: 'name' | 'author', value: string) => {
    if (!activeCard) return;
    setCards(prev => prev.map(c => c.id === activeCard.id ? { ...c, [field]: value } : c));
  };

  // --- Save current card ---
  const handleSave = () => {
    if (!activeCard) return;
    if (!activeCard.name.trim()) {
      alert('物件名を入力してください。');
      return;
    }
    saveCard(activeCard);
    alert('保存しました。');
  };

  // --- Toggle section ---
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggleAllSections = (open: boolean) => {
    const newState: Record<string, boolean> = {};
    SECTIONS.forEach(s => { newState[s.id] = open; });
    setOpenSections(newState);
  };

  // --- PDF / Print ---
  const handlePrint = () => {
    ensurePrintStyle();
    // Save current open state, open all sections, print, then restore
    const prevOpen = { ...openSections };
    const allOpen: Record<string, boolean> = {};
    SECTIONS.forEach(s => { allOpen[s.id] = true; });
    setOpenSections(allOpen);
    // Wait for React re-render, then print
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setOpenSections(prevOpen);
      });
    });
  };

  // --- Render ---
  return (
    <div className="bg-white rounded-b-lg shadow-sm pc-print-area">
      {/* Upper bar */}
      <div className="bg-gray-50 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Property selector */}
          <select
            className="border rounded px-2 py-1.5 text-sm bg-white min-w-[180px] pc-no-print"
            value={activeCardId || ''}
            onChange={e => setActiveCardId(e.target.value)}
          >
            {cards.length === 0 && <option value="">（物件なし）</option>}
            {cards.map(c => (
              <option key={c.id} value={c.id}>
                {c.name || '無題'} ({formatDateJP(c.updatedAt)})
              </option>
            ))}
          </select>

          <button onClick={handleNew} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap pc-no-print">
            新規作成
          </button>
          <button onClick={handleSave} disabled={!activeCard || isSaving} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 whitespace-nowrap pc-no-print">
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button onClick={handleDelete} disabled={!activeCard} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40 whitespace-nowrap pc-no-print">
            削除
          </button>
          <button onClick={handlePrint} disabled={!activeCard} className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-40 whitespace-nowrap pc-no-print">
            PDF出力
          </button>
          <span className="text-xs text-gray-500 ml-auto pc-no-print">{cards.length}/{MAX_CARDS}件</span>
        </div>

        {/* Card meta */}
        {activeCard && (
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <label className="flex items-center gap-1 text-xs text-gray-600">
              物件名:
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm w-48"
                value={activeCard.name}
                onChange={e => handleCardMetaChange('name', e.target.value)}
                placeholder="物件名を入力"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              作成者:
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm w-28"
                value={activeCard.author}
                onChange={e => handleCardMetaChange('author', e.target.value)}
              />
            </label>
            <span className="text-xs text-gray-400">
              作成: {formatDateJP(activeCard.createdAt)} / 更新: {formatDateJP(activeCard.updatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Section body */}
      {activeCard ? (
        <div className="px-4 py-3">
          {/* Expand/Collapse all */}
          <div className="flex gap-2 mb-2 pc-no-print">
            <button onClick={() => toggleAllSections(true)} className="text-xs text-blue-600 hover:underline">すべて開く</button>
            <button onClick={() => toggleAllSections(false)} className="text-xs text-blue-600 hover:underline">すべて閉じる</button>
          </div>

          {SECTIONS.map((section) => {
            const isOpen = !!openSections[section.id];
            const filledCount = section.items.filter(item => activeCard.fields[item.key]?.trim()).length;

            return (
              <div key={section.id} className="mb-2 border rounded pc-section">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-t text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{filledCount}/{section.items.length}</span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''} pc-no-print`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {/* Section content (CSS grid) */}
                {isOpen && (
                  <div className="px-3 py-2 pc-section-body">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1">
                      {section.items.map((item) => {
                        const isFullWidth = !item.half || item.type === 'textarea';
                        return (
                          <div key={item.key} className={`${isFullWidth ? 'lg:col-span-2' : 'col-span-1'} py-1`}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <label className="text-xs font-medium text-gray-700 block mb-0.5">{item.label}</label>
                                <FieldInput
                                  item={item}
                                  value={activeCard.fields[item.key] || ''}
                                  onChange={v => handleFieldChange(item.key, v)}
                                />
                              </div>
                              <div className="w-56 shrink-0">
                                <label className="text-xs text-gray-400 block mb-0.5">備考</label>
                                <input
                                  type="text"
                                  className="w-full border rounded px-2 py-1 text-xs"
                                  value={activeCard.memos[item.key] || ''}
                                  onChange={e => handleMemoChange(item.key, e.target.value)}
                                  placeholder="備考"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">物件カルテ</h3>
          <p className="text-sm text-gray-500 mb-4">建築設計の事前確認項目を物件ごとに管理します。</p>
          <button onClick={handleNew} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            新規作成
          </button>
        </div>
      )}
    </div>
  );
};

// --- Field Input sub-component ---
function FieldInput({ item, value, onChange }: { item: SectionItem; value: string; onChange: (v: string) => void }) {
  switch (item.type) {
    case 'select':
      return (
        <select
          className="w-full border rounded px-2 py-1 text-xs bg-white"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          {item.options?.map(opt => (
            <option key={opt} value={opt}>{opt || '---'}</option>
          ))}
        </select>
      );
    case 'textarea':
      return (
        <textarea
          className="w-full border rounded px-2 py-1 text-xs resize-y"
          rows={2}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={item.placeholder}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          className="w-full border rounded px-2 py-1 text-xs"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            className="flex-1 border rounded px-2 py-1 text-xs"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={item.placeholder}
          />
          {item.unit && <span className="text-xs text-gray-500 whitespace-nowrap">{item.unit}</span>}
        </div>
      );
    default:
      return (
        <input
          type="text"
          className="w-full border rounded px-2 py-1 text-xs"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={item.placeholder}
        />
      );
  }
}

export default PropertyCard;
