'use client';

import React, { useMemo, useState } from 'react';
import {
  BEPPYO_KOU_LABEL,
  SITE_FLAGS,
  STRUCTURE_OPTIONS,
  USE_GROUPS,
  USE_OPTIONS,
  WORK_TYPES,
  ZONING_OPTIONS,
} from '@/data/regulations/options';
import { MUNICIPALITY_OPTIONS } from '@/data/regulations/municipalities';
import type { BeppyoKou, FireUseInput, ProjectInput, StructureType } from '@/data/regulations/types';
import {
  CONFIDENCE_LABEL,
  DISCLAIMER,
  describeInput,
  evaluate,
  formatIsoDate,
  formatLawDate,
  toHtml,
  toMarkdown,
} from '@/lib/regulationEngine';

/**
 * 対象法令チェック（試作）
 *
 * 建設地・用途・規模・高さ・立地を入れると、関係しうる法令・条例を抽出して
 * 根拠条項・閾値・調査先・出典つきで一覧にする。
 *
 * 判定はすべてクライアント側の決定論的なルールで行う。生成AIは通していないので、
 * 通信も課金も発生しないし、条文にない項目が出てくることもない。
 */

/**
 * 入力欄は文字列のまま持つ。空欄を 0 にしてしまうと「0 を入れた」と「入れていない」が区別できず、
 * 判定が黙って「該当なし」に倒れる(2026-11-16 まで。地下階数・形質変更面積などで起きていた)。
 * 判定に回すときに空欄は 0 にして blank に名前を入れ、ルール側で「入力の確認」に回す。
 */
const NUM_KEYS = [
  'siteArea',
  'buildingArea',
  'totalFloorArea',
  'floorsAbove',
  'floorsBelow',
  'maxHeight',
  'storeArea',
  'demolitionArea',
  'formChangeArea',
  'contractAmountManYen',
] as const;
type NumKey = (typeof NUM_KEYS)[number];

const FIRE_NUM_KEYS = ['topFloor', 'area', 'area2F', 'area3FUp', 'seatArea', 'outdoorSeatArea'] as const;
type FireNumKey = (typeof FIRE_NUM_KEYS)[number];
type FireForm = Partial<Record<FireNumKey, string>> & { mainFloorNot1F?: '' | 'yes' | 'no' };

type FormState = Omit<ProjectInput, NumKey | 'blank' | 'fireUses'> &
  Record<NumKey, string> & { fire: Partial<Record<BeppyoKou, FireForm>> };

const parseNum = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === '') return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
};

function toInput(f: FormState): ProjectInput {
  const { fire, ...rest } = f;
  const blank: string[] = [];
  const nums = {} as Record<NumKey, number>;
  NUM_KEYS.forEach((k) => {
    const v = parseNum(f[k]);
    if (v === null) blank.push(k);
    nums[k] = v ?? 0;
  });
  const fireUses: Partial<Record<BeppyoKou, FireUseInput>> = {};
  (Object.keys(fire) as unknown as BeppyoKou[]).forEach((key) => {
    const k = Number(key) as BeppyoKou;
    const d = fire[k];
    if (!d) return;
    const out: FireUseInput = {};
    FIRE_NUM_KEYS.forEach((fk) => {
      out[fk] = parseNum(d[fk]);
    });
    out.mainFloorNot1F = d.mainFloorNot1F === 'yes' ? true : d.mainFloorNot1F === 'no' ? false : null;
    fireUses[k] = out;
  });
  return { ...rest, ...nums, blank, fireUses };
}

/** 選んだ用途が当たる別表第一の項 */
const kousOf = (useIds: string[]): BeppyoKou[] => {
  const s = new Set<BeppyoKou>();
  useIds.forEach((id) => USE_OPTIONS.find((u) => u.id === id)?.beppyoKou?.forEach((k) => s.add(k)));
  return [...s].sort((a, b) => a - b);
};

/** 初期値は「未入力」。構造・都市計画区域の内外も勝手に決めない */
const INITIAL: FormState = {
  municipalityId: 'shizuoka',
  workTypes: ['new'],
  useIds: [],
  totalFloorArea: '',
  buildingArea: '',
  siteArea: '',
  floorsAbove: '',
  floorsBelow: '',
  maxHeight: '',
  structure: '',
  zoning: '未選択',
  inCityPlanningArea: null,
  urbanizationControlArea: false,
  storeArea: '',
  contractAmountManYen: '',
  formChangeArea: '',
  demolitionArea: '',
  siteFlags: [],
  fire: {},
};

/** 動作を見るためのサンプル。静岡市で医療モールを建てる想定 */
const SAMPLE: FormState = {
  ...INITIAL,
  municipalityId: 'shizuoka',
  workTypes: ['new'],
  useIds: ['clinicNoBeds', 'pharmacy', 'office'],
  siteArea: '1200',
  buildingArea: '600',
  totalFloorArea: '2400',
  floorsAbove: '4',
  floorsBelow: '0',
  maxHeight: '16.5',
  structure: 'rc',
  zoning: '第一種住居地域',
  inCityPlanningArea: true,
  storeArea: '120',
  formChangeArea: '0',
  siteFlags: ['buriedCulturalProperty'],
  // 薬局(物品販売業を営む店舗 = 別表第一(四)項)を 1 階に 120m2
  fire: { 4: { topFloor: '1', area: '120', area2F: '0' } },
};

/** 法27条の入力欄。項ごとに要る欄だけ出す */
const FIRE_FIELDS: Record<BeppyoKou, { k: FireNumKey; label: string }[]> = {
  1: [
    { k: 'topFloor', label: '最も上の階' },
    { k: 'seatArea', label: '客席の床面積 (m2)' },
    { k: 'outdoorSeatArea', label: '屋外観覧席 (m2)' },
  ],
  2: [
    { k: 'topFloor', label: '最も上の階' },
    { k: 'area2F', label: '2階の部分 (m2)' },
  ],
  3: [
    { k: 'topFloor', label: '最も上の階' },
    { k: 'area', label: '床面積の合計 (m2)' },
  ],
  4: [
    { k: 'topFloor', label: '最も上の階' },
    { k: 'area', label: '床面積の合計 (m2)' },
    { k: 'area2F', label: '2階の部分 (m2)' },
  ],
  5: [
    { k: 'area', label: '床面積の合計 (m2)' },
    { k: 'area3FUp', label: '3階以上の部分 (m2)' },
  ],
  6: [
    { k: 'topFloor', label: '最も上の階' },
    { k: 'area', label: '床面積の合計 (m2)' },
  ],
};

const card = 'bg-white p-4 rounded border border-gray-300';
const labelCls = 'block text-[11px] font-bold text-gray-700 mb-1';
const inputCls =
  'w-full border border-gray-300 rounded px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-blue-400';
const chip = 'text-[11px] px-2 py-1 rounded border cursor-pointer select-none transition-colors';

const badgeStyle: Record<string, string> = {
  definite: 'bg-red-50 text-red-800 border-red-300',
  likely: 'bg-orange-50 text-orange-800 border-orange-300',
  check: 'bg-sky-50 text-sky-800 border-sky-300',
};

const RegulationCheck: React.FC = () => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const input = useMemo(() => toInput(form), [form]);
  const result = useMemo(() => evaluate(input), [input]);
  const municipality = MUNICIPALITY_OPTIONS.find((m) => m.id === form.municipalityId);
  const kous = kousOf(form.useIds);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: 'useIds' | 'siteFlags' | 'workTypes', id: string) =>
    setForm((prev) => {
      const list = prev[key] as string[];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { ...prev, [key]: next } as FormState;
    });

  /** 数値欄は入力の文字列をそのまま持つ(空欄は空欄のまま) */
  const num = (key: NumKey) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value);
  const numProps = (key: NumKey) => ({ value: form[key], onChange: num(key), placeholder: '未入力' });

  const setFire = (k: BeppyoKou, key: keyof FireForm, value: string) =>
    setForm((prev) => ({ ...prev, fire: { ...prev.fire, [k]: { ...(prev.fire[k] ?? {}), [key]: value } } }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(input, result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handlePrint = () => {
    const html = toHtml(input, result);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const handleWord = async () => {
    try {
      const mod = await import('html-docx-js/dist/html-docx');
      const HtmlDocx = (mod as unknown as { default?: { asBlob: (h: string) => Blob }; asBlob?: (h: string) => Blob });
      const asBlob = HtmlDocx.default?.asBlob ?? HtmlDocx.asBlob;
      if (!asBlob) return;
      const blob = asBlob(toHtml(input, result));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `対象法令チェックリスト_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Word出力に失敗しました', e);
    }
  };

  return (
    <div>
      <div className="flex items-baseline mb-2 gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">対象法令チェック</h2>
        <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-0.5">
          試作版
        </span>
      </div>
      <p className="text-[12px] text-gray-600 mb-3">
        建設地・用途・規模・高さ・立地を入れると、関係しうる法令と条例を根拠条項・閾値・調査先つきで抽出します。
        判定はすべて閾値の照合で行っており、生成AIは使っていません。同じ入力からは必ず同じ結果が出ます。
      </p>

      {/* 免責 */}
      <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-3">
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>ご利用にあたって:</strong> {DISCLAIMER}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ------------------------------ 入力 ------------------------------ */}
        <div className="space-y-3">
          <div className={card}>
            <div className="flex items-center justify-between mb-2 border-b pb-1 border-gray-100">
              <h3 className="font-bold text-[13px]">敷地と工事</h3>
              <button
                type="button"
                onClick={() => {
                  setForm(SAMPLE);
                  setSubmitted(true);
                }}
                className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100"
              >
                サンプルを入れる
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className={labelCls}>建設地</label>
                <select
                  className={inputCls}
                  value={form.municipalityId}
                  onChange={(e) => set('municipalityId', e.target.value)}
                >
                  {MUNICIPALITY_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>用途地域</label>
                <select className={inputCls} value={form.zoning} onChange={(e) => set('zoning', e.target.value)}>
                  {ZONING_OPTIONS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className={labelCls}>工事種別</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {WORK_TYPES.map((w) => {
                const on = form.workTypes.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggle('workTypes', w.id)}
                    className={`${chip} ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1 text-[11px] text-gray-700">
                都市計画区域・準都市計画区域等
                <select
                  className="border border-gray-300 rounded px-1 py-0.5 text-[11px]"
                  value={form.inCityPlanningArea === null ? '' : form.inCityPlanningArea ? 'in' : 'out'}
                  onChange={(e) => set('inCityPlanningArea', e.target.value === '' ? null : e.target.value === 'in')}
                >
                  <option value="">未入力</option>
                  <option value="in">区域の内</option>
                  <option value="out">区域の外</option>
                </select>
              </label>
              <label className="flex items-center gap-1 text-[11px] text-gray-700">
                <input
                  type="checkbox"
                  checked={form.urbanizationControlArea}
                  onChange={(e) => set('urbanizationControlArea', e.target.checked)}
                />
                市街化調整区域
              </label>
            </div>
          </div>

          <div className={card}>
            <h3 className="font-bold mb-2 text-[13px] border-b pb-1 border-gray-100">用途（複数選択可）</h3>
            {USE_GROUPS.map((g) => (
              <div key={g} className="mb-2">
                <div className="text-[10px] text-gray-500 mb-1">{g}</div>
                <div className="flex flex-wrap gap-1.5">
                  {USE_OPTIONS.filter((u) => u.group === g).map((u) => {
                    const on = form.useIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggle('useIds', u.id)}
                        className={`${chip} ${on ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                      >
                        {u.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className={card}>
            <h3 className="font-bold mb-2 text-[13px] border-b pb-1 border-gray-100">規模</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>敷地面積 (m2)</label>
                <input type="number" className={inputCls} {...numProps('siteArea')} />
              </div>
              <div>
                <label className={labelCls}>建築面積 (m2)</label>
                <input type="number" className={inputCls} {...numProps('buildingArea')} />
              </div>
              <div>
                <label className={labelCls}>延べ面積 (m2)</label>
                <input type="number" className={inputCls} {...numProps('totalFloorArea')} />
              </div>
              <div>
                <label className={labelCls}>地上階数</label>
                <input type="number" className={inputCls} {...numProps('floorsAbove')} />
              </div>
              <div>
                <label className={labelCls}>地下階数(無ければ 0)</label>
                <input type="number" className={inputCls} {...numProps('floorsBelow')} />
              </div>
              <div>
                <label className={labelCls}>最高高さ (m)</label>
                <input type="number" step="0.1" className={inputCls} {...numProps('maxHeight')} />
              </div>
              <div>
                <label className={labelCls}>構造</label>
                <select
                  className={inputCls}
                  value={form.structure}
                  onChange={(e) => set('structure', e.target.value as StructureType | '')}
                >
                  <option value="">未入力</option>
                  {STRUCTURE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>店舗面積 (m2)</label>
                <input type="number" className={inputCls} {...numProps('storeArea')} />
              </div>
              <div>
                <label className={labelCls}>解体床面積 (m2)</label>
                <input type="number" className={inputCls} {...numProps('demolitionArea')} />
              </div>
              <div>
                <label className={labelCls}>形質変更面積 (m2・無ければ 0)</label>
                <input type="number" className={inputCls} {...numProps('formChangeArea')} />
              </div>
              <div>
                <label className={labelCls}>請負金額 (万円)</label>
                <input type="number" className={inputCls} {...numProps('contractAmountManYen')} />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              空欄は「未入力」として扱い、その値で決まる法令は「入力の確認」に回します(0 とはみなしません)。
            </p>
          </div>

          {kous.length > 0 && (
            <div className={card}>
              <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">
                特殊建築物の階と床面積(法27条)
              </h3>
              <p className="text-[10px] text-gray-500 mb-2">
                別表第一の項ごとに、その用途に供する部分の最も上の階と床面積を入れます(同じ項の用途は合算)。
                空欄なら建物の地上階数・延べ面積を上限として当てはめ、決めきれないものは「入力の確認」に出します。
              </p>
              <div className="space-y-2">
                {kous.map((k) => {
                  const d = form.fire[k] ?? {};
                  const uses = form.useIds
                    .filter((id) => USE_OPTIONS.find((u) => u.id === id)?.beppyoKou?.includes(k))
                    .map((id) => USE_OPTIONS.find((u) => u.id === id)?.label ?? id);
                  return (
                    <div key={k} className="border border-gray-200 rounded p-2">
                      <div className="text-[11px] font-bold text-gray-700 mb-1">
                        {BEPPYO_KOU_LABEL[k]}
                        <span className="ml-1 font-normal text-gray-500">({uses.join('・')})</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {FIRE_FIELDS[k].map((f) => (
                          <div key={f.k}>
                            <label className={labelCls}>{f.label}</label>
                            <input
                              type="number"
                              className={inputCls}
                              placeholder="未入力"
                              value={d[f.k] ?? ''}
                              onChange={(e) => setFire(k, f.k, e.target.value)}
                            />
                          </div>
                        ))}
                        {k === 1 && form.useIds.includes('theater') && (
                          <div>
                            <label className={labelCls}>劇場・映画館・演芸場の主階</label>
                            <select
                              className={inputCls}
                              value={d.mainFloorNot1F ?? ''}
                              onChange={(e) => setFire(k, 'mainFloorNot1F', e.target.value)}
                            >
                              <option value="">未入力</option>
                              <option value="no">1階にある</option>
                              <option value="yes">1階にない</option>
                            </select>
                          </div>
                        )}
                      </div>
                      {k === 2 && uses.some((l) => l.includes('病院') || l.includes('診療所')) && (
                        <p className="text-[10px] text-gray-500 mt-1">病院・診療所の2階の部分は、患者の収容施設がある部分だけを入れます。</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={card}>
            <h3 className="font-bold mb-1 text-[13px] border-b pb-1 border-gray-100">立地条件</h3>
            <p className="text-[10px] text-gray-500 mb-2">
              現時点では自己申告です。将来は国土交通省の都市計画決定GISデータ（用途地域・地区計画・高度地区・防火地域等）を敷地座標で引いて自動判定に置き換えます。
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SITE_FLAGS.map((f) => {
                const on = form.siteFlags.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    title={f.hint}
                    onClick={() => toggle('siteFlags', f.id)}
                    className={`${chip} ${on ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="flex-1 bg-blue-600 text-white text-[12px] font-bold rounded px-4 py-2 hover:bg-blue-700"
            >
              対象法令を抽出する
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(INITIAL);
                setSubmitted(false);
              }}
              className="text-[12px] text-gray-700 bg-gray-100 border border-gray-300 rounded px-4 py-2 hover:bg-gray-200"
            >
              クリア
            </button>
          </div>
        </div>

        {/* ------------------------------ 結果 ------------------------------ */}
        <div className="space-y-3">
          {!submitted ? (
            <div className={`${card} text-center py-10`}>
              <p className="text-[12px] text-gray-500">
                条件を入力して「対象法令を抽出する」を押してください。
                <br />
                動きを見るだけなら「サンプルを入れる」が早いです。
              </p>
            </div>
          ) : (
            <>
              <div className={card}>
                <div className="flex items-baseline justify-between mb-2 border-b pb-1 border-gray-100 flex-wrap gap-1">
                  <h3 className="font-bold text-[13px]">抽出結果 {result.total} 件</h3>
                  <div className="flex gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeStyle.definite}`}>
                      該当 {result.byConfidence.definite}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeStyle.likely}`}>
                      見込み {result.byConfidence.likely}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeStyle.check}`}>
                      要確認 {result.byConfidence.check}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-100"
                  >
                    印刷 / PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleWord}
                    className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-100"
                  >
                    Wordで保存
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] text-gray-700 bg-gray-50 border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100"
                  >
                    {copied ? 'コピーしました' : 'Markdownをコピー'}
                  </button>
                </div>

                {result.staleCount > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 mb-2">
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      <strong>原典が更新されている項目が {result.staleCount} 件あります。</strong>
                      該当項目に「原典更新あり」を付けています。出典の文書が取り込み時点から変わったことを示すもので、
                      内容がどう変わったかは示していません。原典を直接ご確認ください。
                    </p>
                  </div>
                )}

                <div className="text-[10px] text-gray-500 leading-relaxed">
                  原典の更新確認: {formatIsoDate(result.sourceCheckedAt) || '未実行'} 実行
                  <br />
                  建設地: {result.municipalityLabel}
                  {municipality?.hasLocalLayer ? (
                    <>
                      {' '}／ 条例レイヤーあり（
                      <a
                        href={municipality.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                      >
                        {municipality.sourceLabel}
                      </a>
                      ・基準日 {municipality.asOf}）
                    </>
                  ) : (
                    ' ／ 条例レイヤー未整備のため、国の法令のみを抽出しています'
                  )}
                </div>
              </div>

              {result.categories.map((cat) => (
                <div key={cat.category} className={card}>
                  <h3 className="font-bold mb-2 text-[13px] border-b pb-1 border-gray-100">
                    {cat.category}
                    <span className="ml-2 text-[10px] font-normal text-gray-500">{cat.hits.length} 件</span>
                  </h3>
                  <div className="space-y-2">
                    {cat.hits.map((hit) => {
                      const r = hit.rule;
                      return (
                        <details key={r.id} className="border border-gray-200 rounded">
                          <summary className="cursor-pointer px-2 py-1.5 hover:bg-gray-50 list-none">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border mr-1.5 ${badgeStyle[r.confidence]}`}>
                              {CONFIDENCE_LABEL[r.confidence]}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-300 mr-1.5">
                              {r.action}
                            </span>
                            {hit.alerts.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-400 mr-1.5">
                                原典更新あり
                              </span>
                            )}
                            <span className="text-[12px] font-bold text-gray-800">{r.title}</span>
                            <span className="block text-[10px] text-gray-500 mt-0.5 pl-0.5">
                              {r.law} {r.provision}
                            </span>
                          </summary>
                          <div className="px-2 pb-2 pt-1 border-t border-gray-100 space-y-1">
                            {hit.alerts.map((a) => (
                              <p
                                key={`${a.kind}-${a.url}-${a.date ?? ''}`}
                                className="text-[11px] bg-amber-50 border border-amber-300 rounded px-2 py-1 text-amber-900"
                              >
                                {a.error ? (
                                  <>原典を取得できませんでした: {a.label}（{a.error}）</>
                                ) : a.kind === 'law' ? (
                                  <>
                                    この法令は {formatLawDate(a.date)} に改正されています: {a.label}
                                  </>
                                ) : (
                                  <>
                                    原典が更新されています: {a.label}
                                    （取り込み {formatIsoDate(a.baselineAt)} / 更新検知 {formatIsoDate(a.changedAt)}）
                                  </>
                                )}
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-blue-700 underline"
                                >
                                  原典を開く
                                </a>
                              </p>
                            ))}
                            {r.threshold && (
                              <p className="text-[11px]">
                                <span className="text-gray-500">閾値: </span>
                                {r.threshold}
                              </p>
                            )}
                            <p className="text-[11px] bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                              <span className="text-gray-500">該当理由: </span>
                              {hit.reason}
                            </p>
                            <p className="text-[11px] text-gray-700 leading-relaxed">{r.summary}</p>
                            <p className="text-[11px]">
                              <span className="text-gray-500">調査先: </span>
                              {hit.authority}
                            </p>
                            {r.note && (
                              <p className="text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                注記: {r.note}
                              </p>
                            )}
                            <p className="text-[10px] text-gray-500">
                              出典:{' '}
                              {r.sources.map((s, i) => (
                                <React.Fragment key={s.url}>
                                  {i > 0 && ' / '}
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 underline"
                                  >
                                    {s.label}
                                  </a>
                                </React.Fragment>
                              ))}
                              （基準日 {r.asOf}）
                            </p>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className={card}>
                <h3 className="font-bold mb-2 text-[13px] border-b pb-1 border-gray-100">入力条件</h3>
                <table className="w-full text-[11px]">
                  <tbody>
                    {describeInput(input).map((r) => (
                      <tr key={r.label} className="border-b border-gray-100 last:border-0">
                        <th className="text-left text-gray-500 font-normal py-1 pr-2 w-32 align-top">{r.label}</th>
                        <td className="py-1">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-500 mt-3">
        法令データの出典: e-Gov法令検索（デジタル庁）／政府標準利用規約（第2.0版）。
        条例・要綱は各自治体の公開資料に基づき、項目ごとに出典と基準日を表示しています。
      </p>
    </div>
  );
};

export default RegulationCheck;
