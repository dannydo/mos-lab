'use client';

import React, { useState, useEffect, useRef } from 'react';

export const CampaignClaimCountdown: React.FC<{ expiresAt: string | null; onExpire?: () => void }> = ({
  expiresAt,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt) return;
    const initialDiff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    setSecondsLeft(Math.max(0, initialDiff));
    if (initialDiff <= 0) {
      onExpireRef.current?.();
      return;
    }
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft <= 0) {
    return <span className="text-rose-500 font-bold text-[10px]">HẾT GIỜ</span>;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return (
    <span className="font-mono tabular-nums text-[10px] text-amber-600 dark:text-amber-400 font-bold">
      {mins}:{secs < 10 ? `0${secs}` : secs}
    </span>
  );
};
