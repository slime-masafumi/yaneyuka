'use client';

import React, { useEffect, useState } from 'react';
import { MATERIAL_LINKS } from '@/lib/materialLinks';
import { subcategoryLabel } from '@/lib/materialCategories';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { Store } from '@/lib/karte/engine';
import { TOOL_ART } from '@/components/home/toolArt';
import { ScreenLink } from '@/components/home/HomeParts';
import { infoRows } from '@/lib/infoLinks';

/**
 * 建材ページの周り(モック「高級感 3」Q9)。
 *   MaterialSponsor … 左 210px の掲載枠(以前は右の広告欄に出していた分類ごとの見本画像)
 *   MakerNews       … II メーカーのお知らせ(src/data/maker-feeds.json。各社サイトの更新情報)
 *   MaterialSide    … 右列。案件の帯 / III この分類のツール / IV 調べもの
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
};

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
  const src = SPONSOR_IMG[category] ?? '/image/掲載募集中a.png';
  const label = subcategoryLabel(subcategory);
  return (
    <aside className="yy-matpage__spon" aria-label="掲載枠">
      <button type="button" className="yy-spon" onClick={onRegister} title="この枠への掲載を希望する">
        <img src={src} alt={`${label} の掲載枠(見本)`} />
        <span className="yy-spon__label">materials — {label}</span>
      </button>
      <span className="yy-spon__note">
        sponsor — 掲載枠 ·{' '}
        <button type="button" onClick={onRegister}>
          掲載希望
        </button>
      </span>
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

const CASE_KEY = 'yy-case-materials';
const toolLabel = (cat: string, sub: string) =>
  DESIGN_TOOL_MENU.find((c) => c.id === cat)?.subTabs.find((t) => t.id === sub)?.label ?? sub;

export function MaterialSide({ category, subcategory }: { category: string; subcategory: string }) {
  const link = MATERIAL_LINKS[category];
  const [proj, setProj] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const db = Store.load();
    const p = db ? db.projects.find((x) => x.id === db.current) ?? db.projects[0] : null;
    setProj(p ? { id: p.id, name: p.name } : null);
    if (p) {
      try {
        const all = JSON.parse(localStorage.getItem(CASE_KEY) || '{}') as Record<string, string[]>;
        setAdded((all[p.id] || []).includes(subcategory));
      } catch {}
    }
  }, [subcategory]);

  // 建築の調べもの(材料情報の章・設計情報の記事)。2026-11-14 まで条文の目次を出していた
  const info = link ? infoRows(link.info.sections, link.info.posts) : [];

  const toggleAdd = () => {
    if (!proj) return;
    try {
      const all = JSON.parse(localStorage.getItem(CASE_KEY) || '{}') as Record<string, string[]>;
      const list = new Set(all[proj.id] || []);
      if (list.has(subcategory)) list.delete(subcategory);
      else list.add(subcategory);
      all[proj.id] = [...list];
      localStorage.setItem(CASE_KEY, JSON.stringify(all));
      setAdded(list.has(subcategory));
    } catch {}
  };

  const label = subcategoryLabel(subcategory);
  return (
    <aside className="yy-matpage__side">
      <div className="yy-gray">
        <span className="yy-label">case — 案件で使う</span>
        {proj === undefined ? null : proj ? (
          <>
            <span className="yy-gray__title">{proj.name}</span>
            <span className="yy-gray__text">この案件で使う建材として「{label}」を控えておく(この端末に保存)</span>
            <button type="button" className={`yy-pill${added ? ' is-on' : ''}`} onClick={toggleAdd}>
              {added ? '✓ 使う建材に追加済み' : '＋ 使う建材に追加'}
            </button>
          </>
        ) : (
          <>
            <span className="yy-gray__text">物件カルテで案件を作ると、使う建材を案件ごとに控えておけます</span>
            <a className="yy-pill" href="/karte/">
              物件カルテを開く
            </a>
          </>
        )}
      </div>

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
          <a className="yy-home__more" href="/lookup/?tab=material">
            材料情報をすべて <span aria-hidden="true">›</span>
          </a>
        </section>
      )}
    </aside>
  );
}
