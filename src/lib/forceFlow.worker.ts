/// <reference lib="webworker" />
/** 構造フロービューアの計算を画面と別スレッドで回す。 */
import { FlowError, solveFlow, type FlowModel, type SolveOptions } from './forceFlow';

type Job = { id: number; model: FlowModel; opts: SolveOptions };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (ev: MessageEvent<Job>) => {
  const { id, model, opts } = ev.data;
  try {
    const result = solveFlow(model, opts);
    ctx.postMessage({ id, result }, [
      result.active.buffer,
      result.nodeActive.buffer,
      result.flag.buffer,
      result.ux.buffer,
      result.uy.buffer,
      result.sx.buffer,
      result.sy.buffer,
      result.txy.buffer,
      result.s1.buffer,
      result.s2.buffer,
      result.ratio.buffer,
    ]);
  } catch (e) {
    const message = e instanceof FlowError ? e.message : '解析に失敗しました。寸法と条件を確認してください。';
    if (!(e instanceof FlowError)) console.error(e);
    ctx.postMessage({ id, error: message });
  }
};
