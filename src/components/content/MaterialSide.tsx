'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MATERIAL_LINKS } from '@/lib/materialLinks';
import { subcategoryLabel } from '@/lib/materialCategories';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { TOOL_ART } from '@/components/home/toolArt';
import { ScreenLink } from '@/components/home/HomeParts';
import { useInfoRows } from '@/lib/useInfoRows';
import CaseMaterials from '@/components/materials/CaseMaterials';
import makers from '@/data/makers.json';

/**
 * 建材ページの周り(モック「高級感 3」Q9)。
 *   MaterialSponsor … 左 210px の掲載枠(以前は右の広告欄に出していた分類ごとの見本画像)
 *   MakerNews       … II メーカーのお知らせ(src/data/maker-feeds.json。各社サイトの更新情報)
 *   MaterialSide    … 右列。案件で使う建材(CaseMaterials) / III この分類のツール / IV 調べもの
 */

const SPONSOR_IMG: Record<string, string> = {
  roof: '/image/seppan_cm_sample.png',
  'exterior-wall': '/image/gaiheki_cm_sample.png',
  opening: '/image/kaikou_cm_sample.png',
  'external-floor': '/image/gaibu-floor_cm_sample.png',
  'exterior-other': '/image/gaibu-etc_cm_sample.png',
  'internal-floor': '/image/naibu-floor_cm_sample.png',
  'internal-wall': '/image/naibu-wall_cm_sample.png',
  'internal-other': '/image/naibu-etc_cm_sample.png',
  waterproof: '/image/bousui_cm_sample.png',
  hardware: '/image/kanamono_cm_sample.png',
  furniture: '/image/kagu_cm_sample.png',
  // 2026-11-15 Codex に作ってもらう 5 枚。届くまでは分類の写真(public/image/mat/)で代わりにする
  'internal-ceiling': '/image/tenjou_cm_sample.png',
  'electrical-systems': '/image/denki_cm_sample.png',
  'mechanical-systems': '/image/kikai_cm_sample.png',
  'exterior-infrastructure': '/image/gaikou_cm_sample.png',
  exterior: '/image/exterior_cm_sample.png',
};
/** 掲載の募集(画像の下の 2 段目)。2026-11-15 までは見本画像が無い分類で上の枠いっぱいに引き伸ばしていた */
const RECRUIT = '/image/掲載募集中a.png';
const matImg = (category: string) => `/image/mat/${category}.jpg`;

function SecHead({ no, title, right }: { no: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="yy-sec">
      {no && <span className="yy-sec__no">{no}</span>}
      <span className="yy-sec__title">{title}</span>
      {right && <span className="yy-sec__right">{right}</span>}
    </div>
  );
}

export function MaterialSponsor({ category, subcategory, onRegister }: { category: string; subcategory: string; onRegister: () => void }) {
  const want = SPONSOR_IMG[category] ?? matImg(category);
  const [src, setSrc] = useState(want);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const label = subcategoryLabel(subcategory);
  // 見本画像がまだ無い分類は分類の写真に替える。サーバーで出した <img> は画面の準備より先に読み込みに
  // 失敗することがあり、onError だけでは拾えないので、準備ができた時点でも確かめる
  const fallback = matImg(category);
  useEffect(() => {
    setSrc(want);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0 && want !== fallback) setSrc(fallback);
  }, [want, fallback]);
  return (
    <aside className="yy-matpage__spon" aria-label="掲載枠">
      {/* 1 段目: 掲載イメージ(見本)。2 段目: 掲載企業の募集 */}
      <button type="button" className="yy-spon" onClick={onRegister} title="この枠への掲載を希望する">
        <img
          ref={imgRef}
          src={src}
          alt={`${label} の掲載枠(見本)`}
          onError={() => {
            if (src !== fallback) setSrc(fallback);
          }}
        />
        <span className="yy-spon__label">materials — {label}</span>
      </button>
      <button type="button" className="yy-spon__recruit" onClick={onRegister} title="この枠への掲載を希望する">
        <img src={RECRUIT} alt="掲載企業様募集中 · 掲載希望はこちらからご相談ください" width={575} height={170} />
      </button>
    </aside>
  );
}

type Feed = { origin: string; name: string; categories: string[]; sample: string[]; newest: string };

export function MakerNews({ category }: { category: string }) {
  const key = MATERIAL_LINKS[category]?.maker;
  const [rows, setRows] = useState<Feed[] | null>(null);
  useEffect(() => {
    let alive = true;
    // 65KB あるので、建材ページを開いたときだけ読む
    import('@/data/maker-feeds.json').then((m) => {
      if (!alive) return;
      const feeds = ((m.default as { feeds: Feed[] }).feeds || []).filter(
        (f) => key && f.categories.includes(key) && f.sample?.[0] && f.sample[0] !== f.name,
      );
      feeds.sort((a, b) => (b.newest || '').localeCompare(a.newest || ''));
      setRows(feeds.slice(0, 3));
    });
    return () => {
      alive = false;
    };
  }, [key]);
  if (!key || !rows || !rows.length) return null;
  return (
    <section className="yy-matnews">
      <SecHead no="II" title={`メーカーのお知らせ · ${key}`} right={`${rows.length} 件 · 各社サイトから`} />
      <ul>
        {rows.map((f) => (
          <li key={f.origin}>
            <span className="yy-matnews__name">{f.name}</span>
            <a href={f.origin} target="_blank" rel="noopener noreferrer" title={f.sample[0]}>
              {f.sample[0]}
            </a>
            <span className="yy-leader" />
            <span className="yy-matnews__date">{f.newest?.slice(5).replace('-', '/')}</span>
            <span className="yy-matnews__ext" aria-hidden="true">↗</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type MakerRow = { name: string; pages: string[] };
const MAKERS = makers as unknown as Record<string, MakerRow[]>;
const toolLabel = (cat: string, sub: string) =>
  DESIGN_TOOL_MENU.find((c) => c.id === cat)?.subTabs.find((t) => t.id === sub)?.label ?? sub;

export function MaterialSide({ category, subcategory }: { category: string; subcategory: string }) {
  const link = MATERIAL_LINKS[category];
  // 案件の欄でメーカーの候補に出す、この小分類に載っている社(makers.json の pages は id か表示名)
  const subMakers = React.useMemo(() => {
    const label = subcategoryLabel(subcategory);
    const rows = MAKERS[link?.maker ?? ''] ?? [];
    return [...new Set(rows.filter((m) => m.pages.includes(subcategory) || m.pages.includes(label)).map((m) => m.name))];
  }, [link?.maker, subcategory]);

  // 建築の調べもの(材料情報の章・設計情報の記事)。2026-11-14 まで条文の目次を出していた
  const info = useInfoRows(link?.info.sections, link?.info.posts);

  return (
    <aside className="yy-matpage__side">
      <CaseMaterials category={category} subcategory={subcategory} makers={subMakers} />

      {link && link.tools.length > 0 && (
        <section>
          <SecHead no="III" title="この分類のツール" />
          <ul className="yy-matside__tools">
            {link.tools.map((t) => (
              <li key={t.sub}>
                <ScreenLink target={{ menu: 'design-tools', category: t.cat, sub: t.sub }} className="yy-matside__tool">
                  {t.art ? (
                    <svg className="yy-thumb yy-thumb--s" viewBox="0 0 270 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TOOL_ART[t.art] ?? '' }} />
                  ) : (
                    <span className="yy-thumb yy-thumb--s" aria-hidden="true" />
                  )}
                  <span className="yy-matside__name">{toolLabel(t.cat, t.sub)}</span>
                  <span className="yy-matside__why">{t.why}</span>
                </ScreenLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {info.length > 0 && (
        <section>
          <SecHead no="IV" title="建築の調べもの" right={`${info.length} 件`} />
          <ul className="yy-matside__idx">
            {info.map((r) => (
              <li key={r.href}>
                <a href={r.href} title={`${r.kind} · ${r.title}`}>
                  <span className="yy-matside__it">{r.title}</span>
                  <span className="yy-leader" />
                  <span className="yy-fmt">{r.kind === '材料情報' ? '早見表' : '読みもの'}</span>
                </a>
              </li>
            ))}
          </ul>
          <Link className="yy-home__more" href="/lookup/?tab=material">
            材料情報をすべて <span aria-hidden="true">›</span>
          </Link>
        </section>
      )}
    </aside>
  );
}
