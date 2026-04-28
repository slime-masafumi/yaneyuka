'use client';

import React from 'react';
import { usePersistentState } from '@/lib/usePersistentState';

const panelWidthOpen = 300;

const UserpageMusicPanel: React.FC = () => {
  const [open, setOpen] = usePersistentState<boolean>('userpage:musicPanelOpen', true);

  return (
    <aside
      className="shrink-0 relative"
      style={{ width: open ? panelWidthOpen : 0, transition: 'width 200ms ease' }}
      aria-expanded={open}
    >
      <div className="sticky top-2">
        {/* BGM toggle button — always visible, flush to right edge */}
        <div className="flex flex-col items-end">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`
              group flex items-center gap-1.5
              bg-white/90 backdrop-blur-sm
              text-gray-700 text-xs font-medium
              py-2 px-3
              rounded-l-2xl shadow-sm border border-r-0 border-gray-200
              hover:bg-gray-50 transition-all
            `}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 shrink-0">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <span className="max-w-0 group-hover:max-w-[6rem] overflow-hidden whitespace-nowrap transition-all duration-200">
              作業music
            </span>
          </button>
        </div>

        {/* panel content (open only) */}
        <div
          className={`mt-1 bg-white rounded border border-gray-200 overflow-hidden ${
            open ? '' : 'hidden'
          }`}
        >
          <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center justify-center text-gray-600 text-sm font-medium w-6 h-6 rounded hover:bg-gray-100 transition-all"
            >
              <span className="text-lg leading-none">›</span>
            </button>
            <h4 className="text-xs font-semibold">作業music</h4>
          </div>
          <div className="p-3">
            <div className="space-y-3">
              <div className="aspect-video w-full">
                <iframe
                  className="w-full h-full rounded"
                  src="https://www.youtube.com/embed/N3KYHywHvso"
                  title="作業用YouTube動画"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="aspect-video w-full">
                <iframe
                  className="w-full h-full rounded"
                  src="https://www.youtube.com/embed/Hg-IkpV9GsQ?start=3613"
                  title="作業用YouTube動画"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default UserpageMusicPanel;
