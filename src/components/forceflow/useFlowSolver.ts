'use client';
/**
 * 案ごとの解析を Web Worker に流す。ドラッグ中は次々に形が変わるので、
 * 動いている計算は止めず、待ちは案ごとに最新の 1 件だけ残す。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MAX_ELEMENTS, FlowError, solveFlow, type FlowModel, type FlowResult } from '@/lib/forceFlow';

export type SlotState = { result: FlowResult | null; error: string | null; busy: boolean };

const EMPTY: SlotState = { result: null, error: null, busy: false };
/** スマホは 5 千要素を上限にする（性能目標と同じ値） */
const MOBILE_MAX_ELEMENTS = 5000;

function deviceMaxElements(): number {
  if (typeof window === 'undefined') return DEFAULT_MAX_ELEMENTS;
  const small = window.innerWidth < 768 && navigator.maxTouchPoints > 0;
  const weak = (navigator.hardwareConcurrency || 4) <= 2;
  return small || weak ? MOBILE_MAX_ELEMENTS : DEFAULT_MAX_ELEMENTS;
}

type Job = { slot: number; model: FlowModel };

export function useFlowSolver() {
  const [slots, setSlots] = useState<SlotState[]>([EMPTY, EMPTY]);
  const workerRef = useRef<Worker | null>(null);
  const runningRef = useRef<{ id: number; slot: number; model: FlowModel } | null>(null);
  const pendingRef = useRef<Map<number, FlowModel>>(new Map());
  const lastRef = useRef<Map<number, FlowModel>>(new Map());
  const seqRef = useRef(0);
  const maxElementsRef = useRef(DEFAULT_MAX_ELEMENTS);
  const pumpRef = useRef<() => void>(() => {});

  const patch = useCallback((slot: number, next: Partial<SlotState>) => {
    setSlots((s) => s.map((v, i) => (i === slot ? { ...v, ...next } : v)));
  }, []);

  /** Worker が使えない環境の代替（画面は一瞬固まるが結果は出す） */
  const runInline = useCallback(
    ({ slot, model }: Job) => {
      runningRef.current = { id: -1, slot, model };
      setTimeout(() => {
        try {
          patch(slot, { result: solveFlow(model, { maxElements: maxElementsRef.current }), error: null, busy: false });
        } catch (e) {
          patch(slot, { error: e instanceof FlowError ? e.message : '解析に失敗しました。', busy: false });
        }
        runningRef.current = null;
        pumpRef.current();
      }, 0);
    },
    [patch]
  );

  useEffect(() => {
    pumpRef.current = () => {
      if (runningRef.current) return;
      const next = pendingRef.current.entries().next();
      if (next.done) return;
      const [slot, model] = next.value;
      pendingRef.current.delete(slot);
      const worker = workerRef.current;
      if (!worker) {
        runInline({ slot, model });
        return;
      }
      const id = ++seqRef.current;
      runningRef.current = { id, slot, model };
      worker.postMessage({ id, model, opts: { maxElements: maxElementsRef.current } });
    };
    maxElementsRef.current = deviceMaxElements();
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../../lib/forceFlow.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    if (worker) {
      worker.onmessage = (ev: MessageEvent<{ id: number; result?: FlowResult; error?: string }>) => {
        const job = runningRef.current;
        runningRef.current = null;
        if (job && ev.data.id === job.id) {
          // 次の計算が待っているなら busy のまま結果だけ差し替える
          const busy = pendingRef.current.has(job.slot);
          if (ev.data.result) patch(job.slot, { result: ev.data.result, error: null, busy });
          else patch(job.slot, { error: ev.data.error ?? '解析に失敗しました。', busy });
        }
        pumpRef.current();
      };
      worker.onerror = () => {
        // 読み込みに失敗したら以後はメインスレッドで解く
        const job = runningRef.current;
        worker?.terminate();
        workerRef.current = null;
        runningRef.current = null;
        if (job && !pendingRef.current.has(job.slot)) pendingRef.current.set(job.slot, job.model);
        pumpRef.current();
      };
    }
    workerRef.current = worker;
    pumpRef.current();
    return () => {
      worker?.terminate();
      workerRef.current = null;
      runningRef.current = null;
    };
  }, [patch, runInline]);

  const request = useCallback(
    (slot: number, model: FlowModel) => {
      if (lastRef.current.get(slot) === model) return;
      lastRef.current.set(slot, model);
      pendingRef.current.set(slot, model);
      patch(slot, { busy: true });
      pumpRef.current();
    },
    [patch]
  );

  const clear = useCallback(
    (slot: number) => {
      lastRef.current.delete(slot);
      pendingRef.current.delete(slot);
      patch(slot, EMPTY);
    },
    [patch]
  );

  return { slots, request, clear };
}
