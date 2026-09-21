import React from 'react';

/**
 * ツール上部の帯（タイトル＋説明）。
 *
 * 既に大半のツールが同じマークアップを各ファイルに直書きしていたので、
 * 帯を持っていなかったツールはこの部品を使う。基準にしたのは Memo.tsx の帯。
 * 新しいツールを足すときもこれを置けば見た目が揃う。
 */
type ToolHeaderProps = {
  title: string;
  description: string;
  /** 帯の右端に出す補助表示（件数・状態など）。無ければ出さない。 */
  aside?: React.ReactNode;
};

const ToolHeader: React.FC<ToolHeaderProps> = ({ title, description, aside }) => (
  <div className="px-4 py-1.5 border-b border-gray-100 bg-[#3b3b3b] text-white shrink-0 flex items-start justify-between gap-4">
    <div>
      <h3 className="text-[13px] font-medium">{title}</h3>
      <p className="text-[11px] mt-0.5">{description}</p>
    </div>
    {aside ? <div className="text-[11px] shrink-0">{aside}</div> : null}
  </div>
);

export default ToolHeader;
