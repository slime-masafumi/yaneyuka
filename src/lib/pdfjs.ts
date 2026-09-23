'use client';
/**
 * pdfjs の読み込み。PDF 圧縮と同じやり方（動いている実績がある）に揃えてある:
 *   - 本体は動的 import（最初の画面を重くしない）
 *   - ワーカーは同一オリジンから配信（CDN を遮断する社内ネットワークでも動く）
 */
import { useEffect, useState } from 'react';

type PdfjsLib = typeof import('pdfjs-dist');

let loading: Promise<PdfjsLib> | null = null;

export function loadPdfjs(): Promise<PdfjsLib> {
  loading ??= import('pdfjs-dist').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return lib;
  });
  return loading;
}

export function usePdfjs(): PdfjsLib | null {
  const [lib, setLib] = useState<PdfjsLib | null>(null);
  useEffect(() => {
    let alive = true;
    loadPdfjs()
      .then((l) => alive && setLib(l))
      .catch(() => alive && setLib(null));
    return () => {
      alive = false;
    };
  }, []);
  return lib;
}
