'use client';

import dynamic from 'next/dynamic';

// canvas と Web Worker を使うのでサーバーでは描かない。説明文はページ側がサーバーで出す。
const ForceFlowTool = dynamic(() => import('./ForceFlowTool'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-[12px] text-gray-500">読み込み中...</div>,
});

export default function ForceFlowLoader({ example }: { example?: string }) {
  return (
    <div className="max-w-[1240px] mx-auto bg-white">
      <ForceFlowTool initialExample={example ?? 'wall-opening'} />
    </div>
  );
}
