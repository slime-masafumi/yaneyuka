'use client';
/**
 * 建材Chatbot — 建材ページの基本知識・メーカー一覧・設計ツールから答える案内役。
 *
 * 答えはサイトに既にある中身だけ（外部の AI には送らない）:
 *   - 基本知識 … src/data/knowledge.json（建材ページから scripts/extract-knowledge.mjs が書き出す）
 *   - メーカー … src/data/makers.json（建材ページと同じ一覧）
 *   - ツール   … 設計ツール・一般ツールのメニュー
 * 見つけたメーカーはその場で資料箱に入れたり、Maker conect で問い合わせたりできる。
 * 会話はタブを閉じるまで残す（ページを開いて戻っても消えない）。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchKnowledge, searchTools, makersForPage, makersNamedIn, asksForMakers, excerpt, type KnowledgePage, type MakerRowLite, type ToolEntry } from '@/lib/siteSearch';
import { mergeMaker, type MakerData } from '@/lib/makerBox';
import { DESIGN_TOOL_MENU } from '@/lib/designToolsMenu';
import { GENERAL_TOOL_MENU } from '@/lib/generalToolsMenu';
import { buildUserpageQuery } from '@/lib/userpageUrl';
import { openMakerConect } from '@/lib/makerConectPreset';
import { CATEGORY_SUBCATEGORIES, materialSubPath, parseMaterialPath } from '@/lib/materialCategories';
import SaveToMakerBox from '@/components/SaveToMakerBox';
import PageHead, { Stat } from '@/components/ui/PageHead';
import { SecHead } from '@/components/ui/Sheet';
import './materials.css';

const HISTORY_KEY = 'chatbot-history-v2';

/** 一般ツールは名前だけでは引けないので、何ができるかを書き添える */
const GENERAL_HINTS: Partial<Record<string, string>> = {
  memo: '議事録・現場巡回記録・是正指示のひな形、写真、音声入力',
  sheet: '面積表・仕上表・建具表・数量拾い・工事費内訳のテンプレート、坪・ボード枚数の関数',
  calc: '関数電卓 計算書をPDFに',
  'unit-converter': '坪 平米 尺 間 縮尺 kgf N/mm2 数量換算 枚数',
  bookmark: 'メーカー資料箱 カタログ URL',
  'image-converter': '写真の縮小 HEIC JPEG 変換',
  'pdf-compressor': 'PDF の容量を小さく',
  olmt: 'オンライン会議 図面を共有して赤入れ',
  schedule: '日程調整 現場定例 検査',
  'temp-storage': 'スマホと PC のファイル受け渡し QR',
  'file-transfer': '大きいファイルを送る 送付台帳 合言葉',
  map: '敷地調査 付近見取図 用途地域',
  'construction-photos': '工事写真 黒板 写真帳',
  'drawing-pdf': '図面PDF 結合 分割 回転 透かし 図面番号',
  alarm: '工数記録 業務時間 設計料',
};

type Section = { route: string; param: string; pageName: string; heading: string; text: string };
type Answer = {
  query: string;
  sections: Section[];
  page?: { route: string; param: string; name: string };
  makers: MakerRowLite[];
  named: MakerRowLite[];
  tools: ToolEntry[];
  followUps: string[];
};
type Msg = { role: 'user' | 'bot'; text?: string; answer?: Answer; chips?: string[] };

const EXAMPLES = ['折板屋根の結露対策', '外壁をカバー工法で改修したい', '防火地域のサッシの選び方', 'フローリングの表面材の違い', 'ベランダの防水', 'タイルの剥落を防ぐには'];

// 小分類のページは /roof/seppan/ の形。その分類に無い小分類なら旧形式(?subcategory=)のまま
const pageHref = (route: string, param: string) => {
  if (!param) return route;
  const mat = parseMaterialPath(route.endsWith('/') ? route.slice(0, -1) : route);
  if (mat && CATEGORY_SUBCATEGORIES[mat.category]?.includes(param)) return materialSubPath(mat.category, param);
  return `${route}/?subcategory=${encodeURIComponent(param)}`;
};

const Chatbot: React.FC = () => {
  const [knowledge, setKnowledge] = useState<KnowledgePage[] | null>(null);
  const [makers, setMakers] = useState<MakerData | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // 建材ページの基本知識（約15万字）とメーカー一覧は開いたときに読む
  useEffect(() => {
    import('@/data/knowledge.json').then((m) => setKnowledge((m.default ?? m) as unknown as KnowledgePage[]));
    import('@/data/makers.json').then((m) => setMakers((m.default ?? m) as unknown as MakerData));
  }, []);

  const tools = useMemo<ToolEntry[]>(
    () => [
      ...DESIGN_TOOL_MENU.flatMap((c) =>
        c.subTabs.map((s) => ({ label: s.label, title: s.title, description: s.description, group: `設計ツール / ${c.label}`, href: `/${buildUserpageQuery({ menu: 'design-tools', category: c.id, sub: s.id })}` })),
      ),
      ...GENERAL_TOOL_MENU.map((t) => ({ label: t.label, title: t.label, description: GENERAL_HINTS[t.id] ?? '', group: '一般ツール', href: `/${buildUserpageQuery({ menu: 'general-tools', tool: t.id })}` })),
    ],
    [],
  );

  // 会話はタブの間だけ残す
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      if (raw) {
        setMessages(JSON.parse(raw));
        return;
      }
    } catch {
      /* 読めなければ最初から */
    }
    setMessages([{ role: 'bot', text: '建材の選び方・納まり・不具合の対策を、建材ページの基本知識とメーカー一覧から探します。\n部位や困りごとをそのまま書いてください。', chips: EXAMPLES }]);
  }, []);
  useEffect(() => {
    if (!messages.length) return;
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* 保存できなくても会話は続く */
    }
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const lastPage = [...messages].reverse().find((m) => m.answer?.page)?.answer?.page;

  const answer = (q: string): Msg => {
    if (!knowledge || !makers) return { role: 'bot', text: '読み込み中です。少し待ってからもう一度送ってください。' };
    // 「メーカーは？」など、前の話題の続き
    if (asksForMakers(q) && lastPage) {
      const kp = knowledge.find((k) => k.route === lastPage.route && k.param === lastPage.param);
      const list = kp ? makersForPage(makers, kp, 10) : [];
      return { role: 'bot', answer: { query: q, sections: [], page: lastPage, makers: list, named: [], tools: [], followUps: [] } };
    }
    const hits = searchKnowledge(knowledge, q, 4);
    const named = makersNamedIn(makers, q)
      .map((n) => {
        const m = mergeMaker(makers, n);
        return m ? ({ name: n, pages: [], ...m.links } as MakerRowLite) : null;
      })
      .filter((x): x is MakerRowLite => !!x);
    const toolHits = searchTools(tools, q, 3);
    const top = hits.find((h) => h.page.param)?.page;
    if (!hits.length && !named.length && !toolHits.length) {
      return {
        role: 'bot',
        text: '建材ページの基本知識からは見つかりませんでした。部位（屋根・外壁・床…）や建材名を入れると探しやすくなります。\nメーカーに直接聞くなら Maker conect、ほかの設計者に聞くならフォーラムへ。',
        chips: EXAMPLES.slice(0, 4),
      };
    }
    const followUps = top ? top.sections.map((s) => s.heading).filter((h) => h && !hits.some((x) => x.heading === h)).slice(0, 4) : [];
    return {
      role: 'bot',
      answer: {
        query: q,
        sections: hits.map((h) => ({ route: h.page.route, param: h.page.param, pageName: h.page.name, heading: h.heading, text: h.text })),
        page: top ? { route: top.route, param: top.param, name: top.name } : undefined,
        makers: top ? makersForPage(makers, top, 6) : [],
        named,
        tools: toolHits,
        followUps: followUps.map((h) => `${top!.name} ${h.replace(/[「」【】]/g, '')}`),
      },
    };
  };

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }, answer(q)]);
  };

  const reset = () => {
    try {
      sessionStorage.removeItem(HISTORY_KEY);
    } catch {
      /* なくても困らない */
    }
    setOpen({});
    setMessages([{ role: 'bot', text: '最初からどうぞ。部位や困りごとをそのまま書いてください。', chips: EXAMPLES }]);
  };

  const makerLinks = (m: MakerRowLite) =>
    ([['products', '商品'], ['catalog', 'カタログ'], ['cad', 'CAD']] as const)
      .filter(([k]) => m[k] && m[k] !== '#')
      .map(([k, label]) => (
        <a key={k} href={m[k]} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ));

  const MakerList = ({ list, title, part }: { list: MakerRowLite[]; title: string; part?: string }) =>
    list.length ? (
      <div className="yy-mk2-cb__block">
        <div className="yy-mk2-cb__bhead">
          <span className="yy-label">{title}</span>
          {list.length > 1 && (
            <button type="button" className="yy-mk2-link" onClick={() => openMakerConect({ makers: list.slice(0, 3).map((m) => m.name), part })}>
              上の{Math.min(3, list.length)}社にまとめて問い合わせ
            </button>
          )}
        </div>
        <ul className="yy-mk2-cb__list">
          {list.map((m, k) => (
            <li key={m.name} className="yy-mk2-cb__row">
              <span className="yy-mk2-cb__no">{String(k + 1).padStart(2, '0')}</span>
              <span className="yy-mk2-cb__name" title={m.name}>{m.name}</span>
              <span className="yy-mk2-cb__links">{makerLinks(m)}</span>
              <span className="yy-mk2-cb__end">
                <SaveToMakerBox name={m.name} />
                <button type="button" className="yy-mk2-link" onClick={() => openMakerConect({ makers: [m.name], part })}>
                  問い合わせ
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const makerTotal = useMemo(() => (makers ? new Set(Object.values(makers).flat().map((m) => m.name)).size : 0), [makers]);
  // 質問の通し番号（01, 02 …）
  const qNos = messages.reduce<number[]>((acc, m) => [...acc, (acc[acc.length - 1] ?? 0) + (m.role === 'user' ? 1 : 0)], []);
  const questions = qNos[qNos.length - 1] ?? 0;

  return (
    <div className="scroll-mt-[180px]">
      <PageHead
        en="materials"
        title="建材 Chatbot"
        desc="建材ページの基本知識・メーカー一覧・設計ツールから答えます"
        right={
          <>
            <Stat n={knowledge ? knowledge.length : '—'} label="項目" />
            <Stat n={makers ? makerTotal : '—'} label="社" />
            <Stat n={tools.length} label="ツール" />
          </>
        }
      />
      <div className="yy-mk2-bar">
        <span>会話はこのタブを閉じるまで残ります{questions ? ` · 質問 ${questions} 件` : ''}</span>
        <span className="yy-mk2-bar__right">
          <button type="button" onClick={reset} className="yy-mk2-link yy-mk2-link--quiet">
            最初から
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'registration' }))} className="yy-mk2-link yy-mk2-link--quiet">
            掲載希望はコチラ
          </button>
        </span>
      </div>

      <div className="yy-mk2-cb">
        <div className="yy-mk2-cb__main">
          <div ref={listRef} className="yy-mk2-cb__log">
            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={i} className="yy-mk2-cb__q">
                    <span className="yy-mk2-cb__qno">{String(qNos[i]).padStart(2, '0')}</span>
                    <span className="yy-mk2-cb__qtext">{m.text}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="yy-mk2-cb__a">
                  {m.text && <p className="yy-mk2-cb__text">{m.text}</p>}

                  {m.answer && (
                    <>
                      {m.answer.sections.map((s, j) => {
                        const key = `${i}-${j}`;
                        const full = open[key];
                        return (
                          <div key={key} className="yy-mk2-cb__sec">
                            <div className="yy-mk2-cb__secno">
                              <span>{String(j + 1).padStart(3, '0')}</span>
                              <span>{s.param ? s.pageName : 'よくある質問'}</span>
                            </div>
                            <div className="yy-mk2-cb__sech">{s.heading}</div>
                            <div className="yy-mk2-cb__secbody">{full ? s.text : excerpt(s.text, m.answer!.query)}</div>
                            <div className="yy-mk2-cb__acts">
                              {!full && excerpt(s.text, m.answer!.query) !== s.text && (
                                <button type="button" className="yy-mk2-link yy-mk2-link--quiet" onClick={() => setOpen((p) => ({ ...p, [key]: true }))}>
                                  全文
                                </button>
                              )}
                              {s.route && (
                                <a href={pageHref(s.route, s.param)} className="yy-mk2-link">
                                  {s.param ? `${s.pageName} のページを開く →` : '関連する建材ページを開く →'}
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <MakerList list={m.answer.named} title="Maker — 質問に出てきたメーカー" part={m.answer.page?.name} />
                      {m.answer.page && <MakerList list={m.answer.makers} title={`Maker — ${m.answer.page.name} のメーカー`} part={m.answer.page.name} />}

                      {m.answer.tools.length > 0 && (
                        <div className="yy-mk2-cb__block">
                          <div className="yy-mk2-cb__bhead">
                            <span className="yy-label">Tool — 使えるツール</span>
                          </div>
                          <ul className="yy-mk2-cb__list">
                            {m.answer.tools.map((t, k) => (
                              <li key={t.href} className="yy-mk2-cb__row">
                                <span className="yy-mk2-cb__no">{String(k + 1).padStart(2, '0')}</span>
                                <a href={t.href} className="yy-mk2-cb__tool">{t.title}</a>
                                <span className="yy-mk2-cb__why" title={`${t.group}。${t.description}`}>
                                  {t.group}。{t.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!m.answer.sections.length && !m.answer.makers.length && m.answer.page && (
                        <p className="yy-mk2-cb__text">{m.answer.page.name} のメーカーは登録がありません。</p>
                      )}
                    </>
                  )}

                  {(m.chips?.length || m.answer?.followUps.length || (m.answer?.page && !m.answer.makers.length)) ? (
                    <div className="yy-mk2-cb__chips">
                      {[...(m.chips ?? []), ...(m.answer?.followUps ?? [])].map((c) => (
                        <button key={c} type="button" onClick={() => send(c)} className="yy-mk2-btn">
                          {c}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <form
            className="yy-mk2-cb__form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={knowledge ? '例: 金属屋根の熱伸縮、ALCとECPの違い、床暖房に使えるフローリング' : '読み込み中…'}
              className="yy-mk2-in"
              aria-label="質問"
            />
            <button type="submit" disabled={!knowledge || !input.trim()} className="yy-pill yy-mk2-pill">
              送信
            </button>
          </form>
        </div>

        <aside className="yy-mk2-cb__side" aria-label="質問の例と答えの出どころ">
          <section>
            <SecHead no="I" title="質問の例" right={`${EXAMPLES.length} 件`} />
            <ul className="yy-mk2-cb__ex">
              {EXAMPLES.map((c, k) => (
                <li key={c}>
                  <button type="button" onClick={() => send(c)}>
                    <span className="yy-mk2-cb__no">{String(k + 1).padStart(2, '0')}</span>
                    <span className="yy-mk2-cb__ext">{c}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <SecHead no="II" title="答えの出どころ" />
            <div className="yy-mk2-kv"><span>建材ページの基本知識</span><span className="yy-leader" /><span>{knowledge ? `${knowledge.length} 項目` : '読み込み中'}</span></div>
            <div className="yy-mk2-kv"><span>メーカー一覧</span><span className="yy-leader" /><span>{makers ? `${makerTotal} 社` : '読み込み中'}</span></div>
            <div className="yy-mk2-kv"><span>設計ツール・一般ツール</span><span className="yy-leader" /><span>{tools.length} 本</span></div>
            <p className="yy-mk2-note">サイトに載っている中身だけから探します。外部の AI には送りません。</p>
          </section>
          <section>
            <SecHead no="III" title="人に聞く" />
            <p className="yy-mk2-note">メーカーに直接聞くなら Maker conect、ほかの設計者に聞くならフォーラムへ。</p>
            <div className="yy-mk2-cb__acts">
              <button type="button" className="yy-mk2-link" onClick={() => window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'makerconect' }))}>
                Maker conect を開く →
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Chatbot;
