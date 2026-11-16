'use client';

/**
 * 物件を選ぶ入力欄(物件の共通台帳 src/lib/projectRegistry.ts から選ぶ)。2026-11-16
 * 文字を打つと台帳の物件が候補に出る。台帳に無い名前で確定すると「新しい物件として登録」を出す。
 * 値は物件名(文字)。各ツールの既存の保存形式(Myタスクの【】・写真の工事名など)を変えずに使える。
 *
 *   <ProjectPicker value={name} onChange={setName} />
 */
import React, { useId, useState } from 'react';
import { projectKey, useProjectRegistry } from '@/lib/projectRegistry';

type Props = {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
  /** 入力欄の aria-label(見出しが別にあるとき) */
  label?: string;
  /** 台帳に無い名前を自動で登録する(既定は「登録する」ボタンを出す) */
  autoRegister?: boolean;
};

export default function ProjectPicker({ value, onChange, placeholder = '物件を選ぶ・入れる', className, label = '物件', autoRegister = false }: Props) {
  const listId = useId();
  const { active, add, find, ready } = useProjectRegistry();
  const [busy, setBusy] = useState(false);
  const v = value.trim();
  const known = v ? find(v) : null;
  // 表記ゆれ(全角・空白・括弧の違い)で台帳の名前と違うときは、台帳の名前にそろえる
  const normalize = () => {
    if (known && known.name !== value) onChange(known.name);
  };
  const register = async () => {
    if (!v || known) return;
    setBusy(true);
    await add(v);
    setBusy(false);
  };

  return (
    <span className={`yy-projpick${className ? ` ${className}` : ''}`}>
      <input
        type="text"
        list={listId}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          normalize();
          if (autoRegister) void register();
        }}
      />
      <datalist id={listId}>
        {active.map((p) => (
          <option key={p.id} value={p.name}>
            {p.addr ?? ''}
          </option>
        ))}
      </datalist>
      {ready && v && !known && !autoRegister && (
        <button type="button" className="yy-projpick__add" onClick={register} disabled={busy} title="物件の台帳に登録すると、ほかのツールでも同じ名前で選べます">
          ＋ 物件として登録
        </button>
      )}
      {known && <span className="yy-projpick__ok" title="物件の台帳にある物件">台帳</span>}
    </span>
  );
}

export { projectKey };
