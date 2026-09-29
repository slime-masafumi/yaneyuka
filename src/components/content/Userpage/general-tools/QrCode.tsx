'use client';
/**
 * QR コード。PC の画面に出して、スマホのカメラで読んでもらう（URL を打たずに済む）。
 * 生成は qrcode（MIT）。画像は data URL なので外へは何も送らない。
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export function QrImage({ text, size = 180 }: { text: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode').then((QR) =>
      QR.toDataURL(text, { margin: 1, width: size * 2, errorCorrectionLevel: 'M', color: { dark: '#141414', light: '#ffffff' } }).then((u) => alive && setSrc(u))
    );
    return () => {
      alive = false;
    };
  }, [text, size]);
  // eslint-disable-next-line @next/next/no-img-element -- data URL をそのまま出すだけなので next/image は要らない
  return src ? <img src={src} alt="QR コード" width={size} height={size} className="bg-white" /> : <div style={{ width: size, height: size }} className="bg-gray-100" />;
}

export function QrModal({ title, text, note, onClose }: { title: string; text: string; note?: string; onClose: () => void }) {
  // Esc で閉じる（スマホに読ませたらすぐ閉じたい）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/40 flex items-start justify-center pt-16 px-4" style={{ top: 'var(--nav-height, 35px)' }} onClick={onClose}>
      <div className="bg-white border border-[#3b3b3b] w-full max-w-[320px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${title} の QR コード`}>
        <div className="flex justify-between items-center gap-3 px-4 py-2 border-b border-[#3b3b3b]">
          <span className="yy-mono text-[10px] tracking-[0.12em] uppercase text-gray-500 shrink-0">Scan with phone</span>
          <button type="button" onClick={onClose} aria-label="閉じる" className="text-gray-500 hover:text-black">
            <FiX size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[12px] font-bold text-[#141414] truncate">{title}</p>
          <div className="flex justify-center">
            <QrImage text={text} size={220} />
          </div>
          {note && <p className="text-[11px] text-gray-600 leading-relaxed">{note}</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}
