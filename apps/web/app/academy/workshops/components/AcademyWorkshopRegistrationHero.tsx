'use client';

import dayjs from 'dayjs';
import { CalendarDays, MapPin, Moon, Sun, UsersRound } from 'lucide-react';
import type { AcademyWorkshopPublicRegistrationInfo } from '@mos-lab/shared';
import { AppIcon, IconButton } from '../../../../components/ui';

const DEFAULT_HERO_IMAGE = '/academy/workshops/lash-workshop-hero-v1.png';

function formatFee(feeVnd: number) {
  return feeVnd > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(feeVnd))} đ` : 'Miễn phí';
}

export default function AcademyWorkshopRegistrationHero({
  workshop,
  themeMode,
  onToggleTheme,
  registrationHref,
}: {
  workshop: AcademyWorkshopPublicRegistrationInfo['workshop'];
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  registrationHref: string;
}) {
  const seatsAvailable = workshop.remainingSeats > 0;
  const seatLabel = seatsAvailable ? `Còn ${workshop.remainingSeats}/${workshop.capacity} chỗ` : 'Đã đủ chỗ';

  return (
    <header className="relative isolate min-h-[320px] overflow-hidden bg-slate-950 px-5 py-6 text-white sm:min-h-[360px] sm:px-8 sm:py-8">
      <img
        src={workshop.heroImageUrl || DEFAULT_HERO_IMAGE}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[66%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,6,23,0.93)_0%,rgba(2,6,23,0.78)_48%,rgba(2,6,23,0.3)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-[linear-gradient(0deg,rgba(2,6,23,0.8),transparent)]" />

      <div className="relative flex min-h-[272px] max-w-xl flex-col sm:min-h-[296px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">
            <span>Wings Academy</span>
            <span className="h-1 w-1 rounded-full bg-white/45" aria-hidden="true" />
            <span>Lash mastery</span>
          </div>
          <IconButton
            label={themeMode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            icon={themeMode === 'dark' ? Sun : Moon}
            aria-pressed={themeMode === 'dark'}
            tone="text"
            className="!h-11 !w-11 !min-w-11 !rounded-full !border !border-white/15 !bg-black/25 !text-white backdrop-blur hover:!border-white/25 hover:!bg-white/15 sm:!h-9 sm:!w-9 sm:!min-w-9"
            onClick={onToggleTheme}
          />
        </div>

        <div className="mt-auto pt-12">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
            {workshop.name}
          </h1>
          {workshop.description ? (
            <p className="mt-3 max-w-lg text-[15px] leading-6 text-white/75">{workshop.description}</p>
          ) : null}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/15 pt-4 text-sm text-white/85">
          <span className="inline-flex items-center gap-2">
            <AppIcon icon={CalendarDays} size="sm" className="text-white/60" />
            {dayjs(workshop.startsAt).format('ddd, DD/MM · HH:mm')}
          </span>
          <span className="inline-flex min-w-0 items-center gap-2">
            <AppIcon icon={MapPin} size="sm" className="shrink-0 text-white/60" />
            <span className="truncate">{workshop.location}</span>
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-semibold text-amber-200">{formatFee(workshop.feeVnd)}</span>
          <span className="h-1 w-1 rounded-full bg-white/35" aria-hidden="true" />
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${seatsAvailable ? 'text-emerald-200' : 'text-rose-200'}`}
          >
            <AppIcon icon={UsersRound} size="sm" /> {seatLabel}
          </span>
        </div>
        <a
          href={registrationHref}
          className="mt-4 inline-flex w-fit items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition hover:bg-rose-50 sm:!hidden"
        >
          Đăng ký giữ chỗ
        </a>
      </div>
    </header>
  );
}
