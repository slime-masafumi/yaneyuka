'use client';

import React, { useState } from 'react';
import { ModeBar } from '@/components/ui/Sheet';
import { DesignIndexSide, StatusCell, useToolStates } from './ToolIndexDesignSide';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { requestDesignToolsTarget } from '@/lib/designToolsNav';
import { requestGeneralTool } from '@/lib/generalToolsMenu';
import { EXTERNAL_TOOL_GROUPS, GENERAL_TOOL_GROUPS, type ToolItem } from '@/lib/railMenu';
import type { UserpageTarget } from '@/lib/userpageUrl';

/**
 * 中央カラムのツール一覧(モック「高級感 3」の設計ツール一覧 Q6 の組み方)。
 * 左カラムは入口だけにしたので、一般ツール・設計ツール・外部ツールの中身はここに出す。
 * 群ごとに見出し + 番号つきの行。行の区切りは 1px の線だけ。
 */

type Kind = 'general' | 'design' | 'external';
type Row = { key: string; label: string; desc?: string; soon?: boolean; cat?: string; icon?: string; store?: string; open: () => void; href?: string };
type Group = { label: string; rows: Row[] };

const HEAD: Record<Kind, { no: string; en: string; title: string; desc: string }> = {
  design: { no: '12', en: 'design tools', title: '設計ツール', desc: '分野ごとの計算・判定・検討。条件はその場で入れる' },
  general: { no: '13', en: 'general tools', title: '一般ツール', desc: '日々の仕事の道具。予定・記録・やりとり・現場' },
  external: { no: '17', en: 'apps', title: '外部ツール', desc: 'yaneyuka の Web アプリと iOS アプリ。新しいタブで開く' },
};

export default function ToolIndex({
  kind,
  onMenuClick,
}: {
  kind: Kind;
  onMenuClick: (menu: string, target?: UserpageTarget) => void;
}) {
  const [tab, setTab] = useState<string>('all');
  const { mode, states } = useToolStates();
  const caseMode = kind === 'design' && mode === 'case';
  const openDesign = (sub: string) => {
    const c = DESIGN_TOOL_MENU.find((x) => x.subTabs.some((t) => t.id === sub));
    if (!c) return;
    requestDesignToolsTarget({ categoryId: c.id, subTabId: sub });
    onMenuClick('design-tools', { menu: 'design-tools', category: c.id, sub });
  };
  const openGeneral = (item: ToolItem) => {
    if (item.tool) requestGeneralTool({ toolId: item.tool });
    onMenuClick(item.menu, { menu: item.menu, tool: item.tool });
  };

  let groups: Group[];
  if (kind === 'design') {
    groups = DESIGN_TOOL_MENU.map((c) => ({
      label: c.label,
      rows: c.subTabs.map((t) => ({
        key: t.id,
        cat: c.id,
        label: t.label,
        desc: t.description.replace(/（準備中）$/, ''),
        soon: t.description.includes('準備中'),
        open: () => {
          requestDesignToolsTarget({ categoryId: c.id, subTabId: t.id });
          onMenuClick('design-tools', { menu: 'design-tools', category: c.id, sub: t.id });
        },
      })),
    }));
  } else {
    const src = kind === 'general' ? GENERAL_TOOL_GROUPS : EXTERNAL_TOOL_GROUPS;
    groups = src.map((g) => ({
      label: g.label,
      rows: g.items.map((i) => ({
        key: i.label,
        label: i.label,
        desc: i.desc,
        icon: i.icon,
        store: i.store,
        href: i.menu.startsWith('http') ? i.menu : undefined,
        open: () => openGeneral(i),
      })),
    }));
  }

  const allGroups = groups;
  if (kind === 'design' && tab !== 'all') groups = groups.filter((g) => g.label === tab);
  const total = allGroups.reduce((n, g) => n + g.rows.length, 0);
  const soon = allGroups.reduce((n, g) => n + g.rows.filter((r) => r.soon).length, 0);
  const head = HEAD[kind];
  let n = 0;

  return (
    <div className="yy-tix">
      {kind === 'design' && <ModeBar />}
      <PageHead
        no={head.no}
        en={head.en}
        title={head.title}
        desc={head.desc}
        right={
          <>
            <Stat n={total} label="本" />
            <Stat n={allGroups.length} label="分類" />
            {caseMode && <Stat n={Object.values(states).filter((x) => x.status === 'done').length} label="済" />}
            {caseMode && <Stat n={Object.values(states).filter((x) => x.status === 'na').length} label="対象外" />}
            {soon > 0 && <Stat n={soon} label="準備中" />}
          </>
        }
      />
      {kind === 'design' && (
        <div className="yy-tabs">
          {[['all', 'すべて', total] as const, ...allGroups.map((g) => [g.label, g.label, g.rows.length] as const)].map(([k, l, n]) => (
            <button key={k} type="button" className="yy-tab" aria-pressed={tab === k} onClick={() => setTab(k)}>
              {l}
              <small>{n}</small>
            </button>
          ))}
        </div>
      )}
      <div className={kind === 'design' ? 'yy-tix__wrap' : undefined}>
      <div className={`yy-tix__cols yy-tix__cols--${kind}`}>
        {groups.map((g) => (
          <section key={g.label} className="yy-tix__group">
            <h3 className="yy-tix__ghead">
              <span>{g.label}</span>
              <span className="yy-tix__gcount">{g.rows.length} 本</span>
            </h3>
            <ol className="yy-tix__list">
              {g.rows.map((r) => {
                n += 1;
                const body = (
                  <>
                    <span className="yy-tix__no">{String(n).padStart(2, '0')}</span>
                    {r.icon && <img className="yy-tix__icon" src={r.icon} alt="" aria-hidden="true" width={20} height={20} loading="lazy" />}
                    <span className="yy-tix__text">
                      <span className="yy-tix__name">{r.label}</span>
                      {caseMode ? (
                        states[r.key]?.item && <span className="yy-tix__desc">{states[r.key]?.item}</span>
                      ) : (
                        r.desc && <span className="yy-tix__desc" title={r.desc}>{r.desc}</span>
                      )}
                    </span>
                    {caseMode ? <StatusCell s={states[r.key]} /> : r.soon && <span className="yy-tix__soon">準備中</span>}
                  </>
                );
                return (
                  <li key={r.key} className={r.soon || (caseMode && states[r.key]?.status === 'na') ? 'is-soon' : undefined}>
                    {r.href ? (
                      <a className="yy-tix__row" href={r.href} target="_blank" rel="noopener noreferrer">
                        {body}
                        <span className="yy-tix__ext" aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <button type="button" className="yy-tix__row" onClick={r.open}>
                        {body}
                      </button>
                    )}
                    {r.store && (
                      <a className="yy-tix__store" href={r.store} target="_blank" rel="noopener noreferrer" title={`${r.label}(iOS 版)を App Store で開く`}>
                        iOS
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      {kind === 'design' && <DesignIndexSide onOpen={openDesign} />}
      </div>
    </div>
  );
}
