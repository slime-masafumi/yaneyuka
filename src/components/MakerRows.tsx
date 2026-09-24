import React from 'react';
import MakerLink from '@/components/MakerLink';
import makers from '@/data/makers.json';
import SaveToMakerBox from '@/components/SaveToMakerBox';

/**
 * 建材メーカーの一覧行。
 *
 * 以前は 1 社ぶん 10 行の JSX を mak_*.tsx に直接書いていたため、追加も一括修正も
 * できなかった。データは src/data/makers.json に集約し、ここが唯一の描画箇所。
 * メーカーを増やすときは JSON に 1 行足すだけでよい。
 *
 * データと元ファイルの一致は npm run makers:verify で検証している。
 *
 * ⚠️ pages は意図的に歯抜けにしてある。
 * メーカーが扱っている分類でも、あえて載せない分類を残しておくことで
 * 「ウチはそっちもやってますよ」と先方から掲載依頼が来ることを狙っている。
 * 網羅されていないのは不備ではないので、確認なしに pages を足さないこと。
 * 掲載依頼が来たときに、その分類を足すのが正規の流れ。
 */

type Maker = {
  name: string;
  pages: string[];
  group: string;
  products: string;
  catalog: string;
  office: string;
  contact: string;
  sample: string;
  cad: string;
};

const DATA = makers as unknown as Record<string, Maker[]>;

// 表示順とラベルは全ファイル共通
const SLOTS: { key: keyof Maker; label: string }[] = [
  { key: 'products', label: '商品ページ' },
  { key: 'catalog', label: 'カタログ' },
  { key: 'office', label: '営業所' },
  { key: 'contact', label: 'お問い合わせ' },
  { key: 'sample', label: 'サンプル' },
  { key: 'cad', label: 'CADDOWNLOAD' },
];

type MakerRowsProps = {
  /** makers.json のキー（例: 屋根） */
  category: string;
  /** URL の ?subcategory= に対応する表示ページ（例: 金属屋根） */
  page: string;
  /** ページ内の見出し（例: 立平葺）。省略時は見出しに属さない行 */
  group?: string;
  /** 社名欄の幅。ファイルにより 180px と 200px がある */
  nameWidth?: '180px' | '200px';
  /** 先頭行に余白を付けるか（元の JSX に mt-4 があった箇所向け） */
  topMargin?: boolean;
};

const MakerRows: React.FC<MakerRowsProps> = ({
  category,
  page,
  group = '',
  nameWidth = '180px',
  topMargin = false,
}) => {
  const rows = (DATA[category] || []).filter(
    (m) => m.pages.includes(page) && (m.group || '') === group
  );

  return (
    <>
      {rows.map((m, i) => (
        <div
          key={`${m.name}-${i}`}
          className={`text-[13px] flex items-start gap-2${topMargin && i === 0 ? ' mt-4' : ''}`}
        >
          {/* Tailwind は文字列連結で作ったクラス名を拾えないので、リテラルで分岐する */}
          <span className={nameWidth === '200px' ? 'w-[200px]' : 'w-[180px]'}>・{m.name}</span>
          <span className="flex gap-1 flex-wrap">
            {SLOTS.map((slot, si) => (
              <React.Fragment key={slot.key}>
                <MakerLink url={m[slot.key] as string} label={slot.label} />
                {si < SLOTS.length - 1 ? '｜' : null}
              </React.Fragment>
            ))}
            <SaveToMakerBox name={m.name} />
          </span>
        </div>
      ))}
    </>
  );
};

export default MakerRows;
