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
import SaveToMakerBox from '@/components/SaveToMakerBox';

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

const pageHref = (route: string, param: string) => (param ? `${route}/?subcategory=${encodeURIComponent(param)}` : route);

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
        <a key={k} href={m[k]} target="_blank" rel="noopener noreferrer" className="underline">
          {label}
        </a>
      ));

  const MakerList = ({ list, title, part }: { list: MakerRowLite[]; title: string; part?: string }) =>
    list.length ? (
      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] tracking-widest font-mono text-gray-400">{title}</span>
          {list.length > 1 && (
            <button type="button" className="text-[11px] underline" onClick={() => openMakerConect({ makers: list.slice(0, 3).map((m) => m.name), part })}>
              上の{Math.min(3, list.length)}社にまとめて問い合わせ
            </button>
          )}
        </div>
        <ul className="divide-y divide-gray-100 border-t border-gray-200 mt-1">
          {list.map((m) => (
            <li key={m.name} className="py-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-bold min-w-[120px]">{m.name}</span>
              <span className="flex gap-2 text-[11px] text-gray-600">{makerLinks(m)}</span>
              <span className="ml-auto flex items-center gap-2">
                <SaveToMakerBox name={m.name} />
                <button type="button" className="text-[11px] underline" onClick={() => openMakerConect({ makers: [m.name], part })}>
                  問い合わせ
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="scroll-mt-[180px]">
      <div className="flex items-baseline mb-2 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">建材Chatbot</h2>
        <span className="text-[12px] text-gray-500">建材ページの基本知識 {knowledge ? `${knowledge.length}項目` : ''}・メーカー一覧・設計ツールから答えます</span>
        <button type="button" onClick={reset} className="ml-auto text-[11px] text-gray-500 hover:text-gray-800 underline">
          最初から
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('yaneyuka-navigate', { detail: 'registration' }))} className="text-gray-500 hover:text-gray-800 text-[11px]">
          掲載希望はコチラ
        </button>
      </div>
      <div className="max-w-4xl border border-gray-300 text-[12px] bg-white">
        <div ref={listRef} className="min-h-[160px] max-h-[620px] overflow-y-auto p-3 space-y-3 bg-gray-50">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-[20%] bg-[#3b3b3b] text-white px-3 py-2 whitespace-pre-line">
                {m.text}
              </div>
            ) : (
              <div key={i} className="mr-[6%] bg-white border border-gray-200 px-3 py-2">
                {m.text && <div className="whitespace-pre-line leading-relaxed">{m.text}</div>}

                {m.answer && (
                  <>
                    {m.answer.sections.map((s, j) => {
                      const key = `${i}-${j}`;
                      const full = open[key];
                      return (
                        <div key={key} className={j ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                          <div className="text-[10px] tracking-widest font-mono text-gray-400">
                            {String(j + 1).padStart(3, '0')} {s.param ? s.pageName : 'よくある質問'}
                          </div>
                          <div className="font-bold text-[13px] mt-0.5">{s.heading}</div>
                          <div className="whitespace-pre-line leading-relaxed text-gray-700 mt-1">{full ? s.text : excerpt(s.text, m.answer!.query)}</div>
                          <div className="flex gap-3 mt-1 text-[11px]">
                            {!full && excerpt(s.text, m.answer!.query) !== s.text && (
                              <button type="button" className="underline text-gray-500" onClick={() => setOpen((p) => ({ ...p, [key]: true }))}>
                                全文
                              </button>
                            )}
                            {s.route && (
                              <a href={pageHref(s.route, s.param)} className="underline">
                                {s.param ? `${s.pageName} のページを開く →` : '関連する建材ページを開く →'}
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <MakerList list={m.answer.named} title="MAKER 質問に出てきたメーカー" part={m.answer.page?.name} />
                    {m.answer.page && <MakerList list={m.answer.makers} title={`MAKER ${m.answer.page.name} のメーカー`} part={m.answer.page.name} />}


                    {m.answer.tools.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] tracking-widest font-mono text-gray-400">TOOL 使えるツール</div>
                        <ul className="mt-1 space-y-0.5">
                          {m.answer.tools.map((t) => (
                            <li key={t.href}>
                              <a href={t.href} className="underline font-bold">{t.title}</a>
                              <span className="text-gray-500 text-[11px]"> — {t.group}。{t.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!m.answer.sections.length && !m.answer.makers.length && m.answer.page && (
                      <p className="text-gray-500">{m.answer.page.name} のメーカーは登録がありません。</p>
                    )}
                  </>
                )}

                {(m.chips?.length || m.answer?.followUps.length || (m.answer?.page && !m.answer.makers.length)) ? (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {[...(m.chips ?? []), ...(m.answer?.followUps ?? [])].map((c) => (
                      <button key={c} type="button" onClick={() => send(c)} className="px-2 py-1 border border-gray-300 bg-white hover:border-gray-800 text-[11px]">
                        {c}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
        <form
          className="flex gap-2 p-2.5 border-t border-gray-200"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={knowledge ? '例: 金属屋根の熱伸縮、ALCとECPの違い、床暖房に使えるフローリング' : '読み込み中…'}
            className="flex-1 px-2.5 py-2 border border-gray-300 text-[12px] focus:outline-none focus:border-gray-800"
          />
          <button type="submit" disabled={!knowledge || !input.trim()} className="px-5 py-2 bg-[#3b3b3b] text-white text-[12px] disabled:opacity-40">
            送信
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
