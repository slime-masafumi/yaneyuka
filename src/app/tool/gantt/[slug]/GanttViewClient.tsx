'use client';
/**
 * 工程表の閲覧リンク（見るだけ）。設計ツールの工程表で「閲覧リンクを作る」と publicGantts/{slug} に写しが置かれる。
 * 持ち主が保存するたびに写しも新しくなるので、開き直せば最新になる。
 */
import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { normalizeCalendar, normalizeTasks, type GanttTask, type WorkCalendar } from '@/lib/gantt';
import GanttPreview, { normalizeView, type ViewSettings } from '@/components/content/Userpage/design-tools/schedule/GanttPreview';
import { printSvgPages } from '@/components/content/Userpage/design-tools/schedule/output';
import { useHolidays } from '@/components/content/Userpage/design-tools/schedule/useHolidays';

type Shared = { name: string; sub: string; author: string; tasks: GanttTask[]; calendar: WorkCalendar; view: ViewSettings; updatedAt: number };

export default function GanttViewClient({ slug }: { slug: string }) {
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(60);
  const holidays = useHolidays();
  const pagesRef = useRef<SVGSVGElement[]>([]);

  useEffect(() => {
    if (!/^[a-z0-9]{6,40}$/.test(slug)) {
      setError('リンクが正しくありません。');
      return;
    }
    getDoc(doc(db, 'publicGantts', slug))
      .then((s) => {
        if (!s.exists()) {
          setError('この工程表は見られません（リンクが止められたか、間違っています）。');
          return;
        }
        const d = s.data();
        setData({
          name: typeof d.name === 'string' ? d.name : '工程表',
          sub: typeof d.sub === 'string' ? d.sub : '',
          author: typeof d.author === 'string' ? d.author : '',
          tasks: normalizeTasks(d.tasks),
          calendar: normalizeCalendar(d.calendar),
          view: normalizeView(d.view),
          updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0,
        });
        document.title = `${typeof d.name === 'string' ? d.name : ''} 工程表 | yaneyuka`.trim();
      })
      .catch(() => setError('読み込めませんでした。通信を確かめてください。'));
  }, [slug]);

  // 画面の幅に合わせた拡大率から始める
  useEffect(() => {
    if (!data) return;
    const w = data.view.paper === 'A4' ? 1123 : 1587;
    setZoom(Math.max(30, Math.min(100, Math.floor(((window.innerWidth - 64) / w) * 10) * 10)));
  }, [data]);

  const updated = data?.updatedAt ? new Date(data.updatedAt) : null;
  const stamp = updated ? `${updated.getFullYear()}.${String(updated.getMonth() + 1).padStart(2, '0')}.${String(updated.getDate()).padStart(2, '0')}` : '';

  return (
    <div className="min-h-screen bg-[#1f1f1f] text-[#ece9e2]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[#3b3b3b] text-[12px]">
        <span className="font-mono text-[10px] tracking-[0.18em] text-[#9a978f]">[ SCHEDULE ]</span>
        <h1 className="text-[18px] font-light tracking-[-0.02em] truncate max-w-[60vw]">{data?.name ?? '工程表'}</h1>
        {stamp && <span className="font-mono text-[10px] tracking-[0.12em] text-[#9a978f]">UPDATED {stamp}</span>}
        {data && (
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="px-2 border border-[#5a5a5a] hover:border-white" onClick={() => setZoom((z) => Math.max(30, z - 10))} aria-label="縮小">−</button>
            <span className="font-mono w-10 text-center">{zoom}%</span>
            <button type="button" className="px-2 border border-[#5a5a5a] hover:border-white" onClick={() => setZoom((z) => Math.min(200, z + 10))} aria-label="拡大">＋</button>
            <button
              type="button"
              className="px-3 py-1 border border-[#ece9e2] hover:bg-[#ece9e2] hover:text-[#1f1f1f]"
              onClick={() => printSvgPages(pagesRef.current.filter(Boolean), data.view.paper, `${data.name} 工程表`)}
            >
              印刷 / PDF
            </button>
          </div>
        )}
      </div>
      {error ? (
        <p className="p-10 text-center text-[13px]">{error}</p>
      ) : !data ? (
        <p className="p-10 text-center text-[13px] text-[#9a978f]">読み込んでいます…</p>
      ) : data.tasks.length === 0 ? (
        <p className="p-10 text-center text-[13px]">工程がまだありません。</p>
      ) : (
        <GanttPreview
          tasks={data.tasks}
          cal={data.calendar}
          holidays={holidays}
          view={data.view}
          title={data.name}
          sub={data.sub}
          author={data.author}
          updated={stamp}
          zoom={zoom}
          pagesRef={pagesRef}
          height="calc(100vh - 92px)"
        />
      )}
      <p className="px-4 py-2 text-[10px] text-[#9a978f] border-t border-[#3b3b3b]">
        見るだけのリンクです。工程表は <a href="https://yaneyuka.com/" className="underline">yaneyuka.com</a> の設計ツールで作られています。
      </p>
    </div>
  );
}
