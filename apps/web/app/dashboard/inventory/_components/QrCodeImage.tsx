'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface QrCodeImageProps {
  text: string;
  size: number;
  className?: string;
}

export function QrCodeImage({ text, size, className = '' }: QrCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    if (!text) return;
    void QRCode.toDataURL(text, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [text, size]);

  if (!dataUrl) {
    return <span className={`inline-block border border-slate-300 bg-white ${className}`} aria-label={text} />;
  }

  return <img src={dataUrl} alt={text} width={size} height={size} className={className} />;
}
