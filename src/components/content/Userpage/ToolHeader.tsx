import React from 'react';
import './general-tools/tool-premium.css';

/**
 * ツールの頭（番号・題・説明・できること）。
 *
 * 左カラム「使う」の一般ツール 22 本の見出しはすべてこれを使う。直書きの帯を置かない。
 *
 * 見た目は「高級感 3」の PageHead にそろえる（src/components/ui/PageHead.tsx と同じ組み方）。
 * - 1 行: 「番号 — TOOL · GENERAL」の小さな等幅ラベル / 明朝の題 / 説明 / 右に件数など
 * - その下に二重線。墨の帯や大きな文字は使わない
 * - features は「このツールで何ができるか」の目次。下線タブと同じ見え方で 1 行に並べ、
 *   今開いている機能だけ緑の下線を引く
 *
 * no は一般ツール一覧（src/lib/railMenu.ts の GENERAL_TOOL_GROUPS）の並び順 01〜22。
 * code（英字コード）は画面には出さず、data-code に残す（ツールの識別に使う）。
 *
 * header / nav タグは使わない。globals.css がサイト全体の header / nav に色を
 * !important で固定していて、ここも巻き込まれる。
 *
 * features はログインしないと出ない機能や、モーダル・タブの奥にある機能が多く
 * 「何も変わっていない」と見えていたので、入口をここに並べる。onClick があれば押すとその機能を開く。
 */
export type ToolFeature = {
  label: string;
  /** 押したときの説明（title 属性） */
  hint?: string;
  /** 押すとその機能を開く・その場所へ移る */
  onClick?: () => void;
  /** ログインが要る機能（未ログインで押すと hint を出すだけにする） */
  login?: boolean;
  /** 今開いている機能 */
  active?: boolean;
};

type ToolHeaderProps = {
  title: string;
  description: string;
  /** 見出しの右端に出す補助表示（件数・状態・ボタンなど）。無ければ出さない。 */
  aside?: React.ReactNode;
  /** 英字コード（例: 'PDF / COMPRESS'）。画面には出さず data-code に残す */
  code?: string;
  /** 番号（例: '07'）。一般ツール一覧の並び順 */
  no?: string;
  features?: ToolFeature[];
};

const ToolHeader: React.FC<ToolHeaderProps> = ({ title, description, aside, code, no, features }) => (
  <div className="yy-th shrink-0" data-code={code}>
    <div className="yy-pagehead">
      <div className="yy-pagehead__row">
        <span className="yy-label">{[no, 'tool · general'].filter(Boolean).join(' — ')}</span>
        <h2 className="yy-pagehead__title">{title}</h2>
        <span className="yy-pagehead__desc">{description}</span>
        {aside ? <span className="yy-pagehead__right yy-th__aside">{aside}</span> : null}
      </div>
      <div className="yy-rule2" />
    </div>
    {features && features.length > 0 && (
      <div role="navigation" className="yy-th__feats" aria-label={`${title}でできること`}>
        {features.map((f, i) => {
          const body = (
            <>
              <span className="yy-th__no">{String(i + 1).padStart(2, '0')}</span>
              <span>{f.label}</span>
              {f.login ? <span className="yy-th__tag">ログイン</span> : null}
            </>
          );
          return f.onClick ? (
            <button
              key={f.label}
              type="button"
              onClick={f.onClick}
              title={f.hint}
              aria-pressed={f.active ? true : undefined}
              className={`yy-th__feat${f.active ? ' is-active' : ''}`}
            >
              {body}
            </button>
          ) : (
            <span key={f.label} title={f.hint} className="yy-th__feat is-static">
              {body}
            </span>
          );
        })}
      </div>
    )}
  </div>
);

export default ToolHeader;
