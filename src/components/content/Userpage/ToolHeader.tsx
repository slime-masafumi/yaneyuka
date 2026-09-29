import React from 'react';

/**
 * ツール上部の帯（番号・英字コード・タイトル・説明・できること）。
 *
 * 左カラム Ⅲ（一般ツール・業務アプリ）の見出しはすべてこれを使う。直書きの帯を置かない。
 *
 * 見た目の決まり（globals.css の .yy-head）
 * - 墨の帯に、等幅の小さな大文字（番号・コード）と、細いウェイトのタイトル。中間の大きさを作らない
 * - 差し色（#52AA96）は光として 1 点だけ: 「できること」の選択中・フォーカスの細線
 *
 * features は「このツールで何ができるか」の目次。ログインしないと出ない機能や、
 * モーダル・タブの奥にある機能が多く「何も変わっていない」と見えていたので、
 * 入口をここに並べる。onClick があれば押すとその機能を開く。
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
  /** 帯の右端に出す補助表示（件数・状態・ボタンなど）。無ければ出さない。 */
  aside?: React.ReactNode;
  /** 英字コード（例: 'PDF / COMPRESS'）。等幅の小さな大文字で出す */
  code?: string;
  /** 番号（例: '07'）。左カラムの並び順 */
  no?: string;
  features?: ToolFeature[];
};

const ToolHeader: React.FC<ToolHeaderProps> = ({ title, description, aside, code, no, features }) => (
  <header className="yy-head shrink-0">
    <div className="yy-head__row">
      <div className="min-w-0">
        {(code || no) && (
          <p className="yy-head__code">
            {no ? <span>[ {no} ]</span> : null}
            {code ? <span>{code}</span> : null}
          </p>
        )}
        <h3 className="yy-head__title">{title}</h3>
        <p className="yy-head__lead">{description}</p>
      </div>
      {aside ? <div className="yy-head__aside">{aside}</div> : null}
    </div>
    {features && features.length > 0 && (
      <nav className="yy-head__features" aria-label={`${title}でできること`}>
        {features.map((f, i) => {
          const body = (
            <>
              <span className="yy-head__no">{String(i + 1).padStart(3, '0')}</span>
              <span>{f.label}</span>
              {f.login ? <span className="yy-head__tag">LOGIN</span> : null}
            </>
          );
          return f.onClick ? (
            <button
              key={f.label}
              type="button"
              onClick={f.onClick}
              title={f.hint}
              className={`yy-head__feature${f.active ? ' is-active' : ''}`}
            >
              {body}
            </button>
          ) : (
            <span key={f.label} title={f.hint} className="yy-head__feature is-static">
              {body}
            </span>
          );
        })}
      </nav>
    )}
  </header>
);

export default ToolHeader;
