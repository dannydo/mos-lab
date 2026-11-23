'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Sparkles } from 'lucide-react';

export interface WorkshopLaunchCountdownProps {
  targetIso: string;
  onExpired: () => void;
}

function computeTimeLeft(targetIso: string) {
  const diff = dayjs(targetIso).diff(dayjs(), 'second');
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
  };
}

export function WorkshopLaunchCountdown({ targetIso, onExpired }: WorkshopLaunchCountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState(() => computeTimeLeft(targetIso));

  React.useEffect(() => {
    const timer = setInterval(() => {
      const next = computeTimeLeft(targetIso);
      if (!next) {
        setTimeLeft(null);
        onExpired();
      } else {
        setTimeLeft(next);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [targetIso, onExpired]);

  if (!timeLeft) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const units = [
    { key: 'days', value: pad(timeLeft.days), label: 'Ngày', accent: false },
    { key: 'hours', value: pad(timeLeft.hours), label: 'Giờ', accent: false },
    { key: 'minutes', value: pad(timeLeft.minutes), label: 'Phút', accent: false },
    { key: 'seconds', value: pad(timeLeft.seconds), label: 'Giây', accent: true },
  ];

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
        <Sparkles size={14} aria-hidden="true" />
        <span>Cổng đăng ký sẽ mở sau</span>
      </div>

      <div className="my-4 grid grid-cols-4 gap-2">
        {units.map((unit) => (
          <div
            key={unit.key}
            className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2 text-center backdrop-blur-sm"
          >
            <div
              className={`text-xl sm:text-2xl font-bold tabular-nums ${
                unit.accent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {unit.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{unit.label}</div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400">
        Chính thức mở vào lúc:{' '}
        <strong className="text-slate-700 dark:text-slate-200">{dayjs(targetIso).format('HH:mm · DD/MM/YYYY')}</strong>
      </div>
      <p className="mb-0 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Hệ thống sẽ tự động mở form đăng ký khi thời gian đếm ngược kết thúc.
      </p>
    </div>
  );
}
