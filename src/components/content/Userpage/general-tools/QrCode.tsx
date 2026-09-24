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
      QR.toDataURL(text, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' }).then((u) => alive && setSrc(u))
    );
    return () => {
      alive = false;
    };
  }, [text, size]);
  return src ? <img src={src} alt="QR コード" width={size} height={size} className="bg-white" /> : <div style={{ width: size, height: size }} className="bg-gray-100" />;
}

export function QrModal({ title, text, note, onClose }: { title: string; text: string; note?: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[10000] bg-black/40 flex items-start justify-center pt-16" style={{ top: 'var(--nav-height, 35px)' }} onClick={onClose}>
      <div className="bg-white border border-[#3b3b3b] w-[320px] p-4 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center text-[12px] font-bold">
          <span className="truncate">{title}</span>
          <button type="button" onClick={onClose} aria-label="閉じる"><FiX /></button>
        </div>
        <div className="flex justify-center"><QrImage text={text} size={220} /></div>
        {note && <p className="text-[11px] text-gray-600 text-left leading-relaxed">{note}</p>}
      </div>
    </div>,
    document.body
  );
}
