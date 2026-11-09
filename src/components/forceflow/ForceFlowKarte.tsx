'use client';
/** 検討を物件カルテに残す欄と、物件カルテ側に出す一覧。 */
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { requestDesignToolsTarget } from '@/lib/designToolsNav';
import { deleteStudy, flowStudyNav, listProperties, listStudies, listStudiesOfProperty, saveStudy, type FlowStudy, type PropertyOption } from '@/lib/forceFlowStudies';
import type { FlowModel } from '@/lib/forceFlow';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
};

const describe = (s: FlowStudy) => {
  try {
    const m = JSON.parse(s.modelJson) as FlowModel;
    return `${m.width.toLocaleString()}×${m.height.toLocaleString()} mm・${m.material.label}`;
  } catch {
    return '';
  }
};

type SaveProps = {
  planName: string;
  memo: string;
  model: FlowModel;
  onOpen: (study: FlowStudy) => void;
  onPropertyChange: (name: string) => void;
};

export function ForceFlowSave({ planName, memo, model, onOpen, onPropertyChange }: SaveProps) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? '';
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [studies, setStudies] = useState<FlowStudy[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const reload = useCallback(async () => {
    if (!uid) return;
    try {
      const [p, s] = await Promise.all([listProperties(uid), listStudies(uid)]);
      setProperties(p);
      setStudies(s);
    } catch (e) {
      console.error('force-flow: load studies', e);
    }
  }, [uid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (state !== 'saved') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  if (!uid) {
    return (
      <p className="text-[11px] text-gray-600">
        物件カルテへの保存にはログインが必要です。
        <Link href="/login/" className="underline ml-1">ログイン</Link>
        <span className="text-gray-500 ml-1">（画像と PDF はログインなしで保存できます）</span>
      </p>
    );
  }

  const selectProperty = (id: string) => {
    setPropertyId(id);
    onPropertyChange(properties.find((p) => p.id === id)?.name ?? '');
  };

  const save = async () => {
    setState('saving');
    try {
      await saveStudy(uid, {
        propertyId,
        propertyName: properties.find((p) => p.id === propertyId)?.name ?? '',
        planName: planName.trim() || '無題の案',
        memo,
        modelJson: JSON.stringify(model),
      });
      setState('saved');
      void reload();
    } catch (e) {
      console.error('force-flow: save', e);
      setState('error');
    }
  };

  const remove = async (s: FlowStudy) => {
    if (!window.confirm(`「${s.planName}」を削除しますか？`)) return;
    await deleteStudy(uid, s.id);
    void reload();
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="block text-[10px] text-gray-500 mb-1">物件</span>
        <select value={propertyId} onChange={(e) => selectProperty(e.target.value)} className="w-full text-[12px] px-2 py-1.5 border border-gray-300">
          <option value="">物件に紐づけない</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={save} disabled={state === 'saving'} className="px-3 py-1.5 text-[11px] bg-[#3b3b3b] text-white disabled:opacity-50">
          {state === 'saving' ? '保存中…' : '物件カルテに保存'}
        </button>
        {state === 'saved' && <span className="text-[11px] text-[#127a68]">保存しました</span>}
        {state === 'error' && <span className="text-[11px] text-red-700">保存できませんでした。通信を確認してください。</span>}
      </div>
      {studies.length > 0 && (
        <div className="border-t pt-2">
          <p className="text-[10px] text-gray-500 mb-1">保存した検討（開くと最新のエンジンで再計算します）</p>
          <ul className="max-h-[180px] overflow-y-auto divide-y">
            {studies.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-1 text-[11px]">
                <button type="button" onClick={() => onOpen(s)} className="flex-1 min-w-0 text-left hover:underline truncate">
                  {s.planName}
                  {s.propertyName && <span className="text-gray-500">・{s.propertyName}</span>}
                </button>
                <span className="text-[10px] text-gray-500 tabular-nums">{formatDate(s.createdAt)}</span>
                <button type="button" onClick={() => remove(s)} className="text-[10px] text-gray-400 hover:text-red-700">削除</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 物件カルテの画面に出す、その物件に紐づいた検討の一覧。 */
export function PropertyFlowStudies({ propertyId }: { propertyId: string }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? '';
  const [studies, setStudies] = useState<FlowStudy[] | null>(null);

  useEffect(() => {
    let alive = true;
    setStudies(null);
    if (!uid) return;
    listStudiesOfProperty(uid, propertyId)
      .then((s) => alive && setStudies(s))
      .catch((e) => console.error('force-flow: list by property', e));
    return () => {
      alive = false;
    };
  }, [uid, propertyId]);

  if (!studies || studies.length === 0) return null;

  const open = (s: FlowStudy) => {
    flowStudyNav.request(s);
    requestDesignToolsTarget({ categoryId: 'structural-design', subTabId: 'force-flow' });
  };

  return (
    <div className="mb-2 border rounded pc-section">
      <div className="px-3 py-2 bg-gray-100 rounded-t flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">構造フローの検討</span>
        <span className="text-xs text-gray-500">{studies.length}件</span>
      </div>
      <ul className="px-3 py-1 divide-y">
        {studies.map((s) => (
          <li key={s.id} className="py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => open(s)} className="text-blue-600 hover:underline text-left pc-no-print">{s.planName}</button>
              <span className="text-gray-500 tabular-nums">{formatDate(s.createdAt)}</span>
              <span className="text-gray-500">{describe(s)}</span>
            </div>
            {s.memo && <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{s.memo}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
