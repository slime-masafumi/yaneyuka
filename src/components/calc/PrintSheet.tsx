'use client';
/**
 * 設計ツールの「計算書」印刷。2026-11-15
 * 囲んだツールの入力と答えだけを A4 で印刷する(ブラウザの印刷から PDF 保存もできる)。
 * ページの他の部分が空白ページとして残らないよう、ツールの写しを見えない iframe に入れて、そちらを印刷する。
 *   - 入力欄・選択の値は写しに書き戻す(cloneNode は今の値を写さない)
 *   - canvas(日影図など)は画像にして写す
 * 印刷のときだけ、ツール名・根拠・日付・URL の頭書きと、免責の 1 行を出す。
 * 計算書型のツール(ガラス厚・結露・24 時間換気)は自前の印刷があるので使わない。
 */
import React, { useRef, useState } from 'react';
import { FiPrinter, FiSave } from 'react-icons/fi';
import { saveToolResult } from '@/lib/karte/saveFromTool';
import './print-sheet.css';

function snapshot(src: HTMLElement): HTMLElement {
  const copy = src.cloneNode(true) as HTMLElement;
  const a = src.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
  const b = copy.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
  a.forEach((el, i) => {
    const c = b[i];
    if (!c) return;
    if (el instanceof HTMLSelectElement && c instanceof HTMLSelectElement) {
      Array.from(c.options).forEach((o, k) => (o.selected = k === el.selectedIndex));
      Array.from(c.options).forEach((o) => (o.selected ? o.setAttribute('selected', '') : o.removeAttribute('selected')));
    } else if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (el.checked) c.setAttribute('checked', '');
      else c.removeAttribute('checked');
    } else if (el instanceof HTMLTextAreaElement) {
      c.textContent = el.value;
    } else {
      c.setAttribute('value', (el as HTMLInputElement).value);
    }
  });
  const ca = src.querySelectorAll('canvas');
  const cb = copy.querySelectorAll('canvas');
  ca.forEach((cv, i) => {
    try {
      const img = document.createElement('img');
      img.src = cv.toDataURL('image/png');
      img.style.width = cv.style.width || `${cv.clientWidth}px`;
      img.style.maxWidth = '100%';
      cb[i]?.replaceWith(img);
    } catch {
      /* 写せない canvas はそのまま */
    }
  });
  return copy;
}

export default function PrintSheet({ title, basis, url, children }: { title: string; basis?: string; url?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState<React.ReactNode>(null);
  // 物件カルテ(この端末)の今の物件に、答えを記録として残す
  const save = () => {
    const el = ref.current;
    if (!el) return;
    const r = saveToolResult(el, { title, basis, href: url ? new URL(url).pathname : undefined });
    if (r.ok) setSaved(<>物件「{r.project}」に保存しました · <a href="/karte/">物件カルテで見る</a></>);
    else if (r.reason === 'no-karte') setSaved(<>先に<a href="/karte/">物件カルテ</a>で物件を作ると保存できます</>);
    else setSaved('答えが出てから保存してください');
  };
  const print = () => {
    const el = ref.current;
    if (!el) return;
    const copy = snapshot(el);
    copy.classList.add('is-printing');
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((n) => n.outerHTML)
      .join('');
    doc.open();
    doc.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title} 計算書</title><base href="${location.origin}/">${styles}</head><body class="yy-ps-doc"></body></html>`);
    doc.close();
    doc.body.appendChild(doc.importNode(copy, true));
    const go = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    };
    // スタイルの読み込みを待ってから
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    let left = links.length;
    if (!left) setTimeout(go, 100);
    else {
      const one = () => {
        left -= 1;
        if (left <= 0) setTimeout(go, 100);
      };
      links.forEach((l) => {
        l.addEventListener('load', one);
        l.addEventListener('error', one);
      });
      setTimeout(() => left > 0 && ((left = 0), go()), 3000);
    }
  };
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  return (
    <div ref={ref} className="yy-ps">
      <div className="yy-ps__bar">
        {saved && <span className="yy-ps__msg">{saved}</span>}
        <button type="button" className="yy-dt-link yy-ps__btn" onClick={save} title="入力と答えを、物件カルテで開いている物件の記録に残します">
          <FiSave aria-hidden="true" /> 物件カルテに保存
        </button>
        <button type="button" className="yy-dt-link yy-ps__btn" onClick={print} title="入力と答えを A4 の計算書として印刷します(印刷画面で PDF に保存できます)">
          <FiPrinter aria-hidden="true" /> 計算書を印刷・PDF
        </button>
      </div>
      <header className="yy-ps__head" aria-hidden="true">
        <span className="yy-ps__label">CALCULATION SHEET — yaneyuka.com</span>
        <h1 className="yy-ps__title">{title}</h1>
        {basis && <p className="yy-ps__basis">根拠: {basis}</p>}
        <p className="yy-ps__meta">
          作成日 {today}
          {url ? ` · ${url}` : ''}
        </p>
      </header>
      {children}
      <footer className="yy-ps__foot" aria-hidden="true">
        この計算書は設計の目安です。最終判断は建築士など有資格者が、最新の法令・告示・基準を確認したうえで行ってください。
      </footer>
    </div>
  );
}
