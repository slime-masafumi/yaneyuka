'use client';

import React, { useEffect, useState } from 'react';

const QualificationsVideos: React.FC = () => {
  const videoIds = [
    'ACPKHg0hSSo', // 1番目
    '8w_4FtbB9eM', // 2番目
    '6nAvy1ftY84', // 3番目
  ];

  const [offsetPx, setOffsetPx] = useState(0);

  useEffect(() => {
    const recalc = () => {
      try {
        const sticky = document.getElementById('qual-right-sticky');
        const target = document.getElementById('qual-first-section');
        if (sticky && target) {
          const s = sticky.getBoundingClientRect();
          const t = target.getBoundingClientRect();
          const gap = Math.max(0, Math.round(t.top - s.top));
          const adjusted = Math.max(0, gap + 1); // 1pxだけ上方向に寄せる
          setOffsetPx(adjusted);
        }
      } catch {}
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  return (
    <div className="bg-white p-4 rounded border border-gray-300" style={{ marginTop: offsetPx }}>
      <h3 className="font-bold mb-2 text-[13px]">資格試験 過去問・解説（YouTube）</h3>
      <div className="space-y-3">
        {videoIds.map((videoId, index) => {
          const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          return (
            <div key={videoId} className="aspect-video w-full relative">
              <iframe
                className="w-full h-full rounded pointer-events-none"
                src={embedUrl}
                title={`資格試験動画 ${index + 1}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 w-full h-full rounded cursor-pointer"
                aria-label={`YouTube動画 ${index + 1}を開く`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QualificationsVideos;


