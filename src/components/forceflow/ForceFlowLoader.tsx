'use client';

import { lazy } from 'react';
import AfterMount from '@/components/AfterMount';

// canvas と Web Worker を使うのでサーバーでは描かない。説明文はページ側がサーバーで出す。
const ForceFlowTool = lazy(() => import('./ForceFlowTool'));

export default function ForceFlowLoader({ example }: { example?: string }) {
  return (
    <div className="max-w-[1240px] mx-auto bg-white">
      <AfterMount fallback={<div className="p-8 text-center text-[12px] text-gray-500">読み込み中...</div>}>
        <ForceFlowTool initialExample={example ?? 'wall-opening'} />
      </AfterMount>
    </div>
  );
}
