'use client';

import React from 'react';
import { hasCompleteNaturalLashSet } from '@mos-lab/shared';
import { useTheme } from '../../../../../context/ThemeContext';
import { BookingItem } from '../../../state/mockData';
import { Edit3, MessageSquare } from 'lucide-react';

export function LashTrayIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      {/* Lash Tile / Tray base */}
      <rect x="2" y="2" width="12" height="12" rx="2" strokeWidth="1.5" />
      {/* Lash strips arranged horizontally */}
      <line x1="4.5" y1="5.5" x2="11.5" y2="5.5" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4.5" y1="8.5" x2="11.5" y2="8.5" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4.5" y1="11.5" x2="9.5" y2="11.5" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface CvReceiveMaterialsCardProps {
  booking: BookingItem;
  isRetain: boolean;
  bookerAvatar?: string | null;
  onEditService?: () => void;
}

export function CvReceiveMaterialsCard({
  booking,
  isRetain,
  bookerAvatar,
  onEditService,
}: CvReceiveMaterialsCardProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const chipClass = isDark
    ? 'bg-black/60'
    : 'bg-[var(--mos-surface)] shadow-2xs';

  return (
    <div className="bg-[var(--mos-surface)] rounded-2xl p-3 space-y-2.5 border border-[var(--mos-surface-border)] shadow-xs">
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          <LashTrayIcon className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} /> NGUYÊN VẬT LIỆU
        </span>
      </div>

      {/* Slot 1: Mi Trên */}
      <div className={`rounded-xl p-2.5 border space-y-2 shadow-xs ${isDark ? 'bg-gradient-to-b from-[#2A2315] to-[#1A1A1C] border-amber-500/40' : 'bg-gradient-to-b from-amber-50/90 to-[var(--mos-surface-raised)] border-amber-300'}`}>
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              <LashTrayIcon className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} /> MI TRÊN
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                isRetain
                  ? (isDark ? 'bg-purple-500/25 text-purple-300 border-purple-400/40' : 'bg-purple-100 text-purple-700 border-purple-300')
                  : (isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300')
              }`}
            >
              {isRetain ? 'Dặm' : 'Nối Mới'}
            </span>
          </div>
          <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border ${isDark ? 'text-amber-200 bg-amber-400/15 border-amber-400/30' : 'text-amber-800 bg-amber-100 border-amber-300'}`}>
            {booking.attributes?.material || 'HyperLight'} · {booking.attributes?.volume || '3X'} ·{' '}
            {booking.attributes?.count || '70 fan'}
          </span>
        </div>

        {/* 4 Stat Chips Grid: Cột Độ dài rộng hơn để chứa đủ 5 sizes */}
        <div className="grid grid-cols-[1fr_0.75fr_1.6fr_0.85fr] gap-1">
          <div className={`${chipClass} border border-[var(--mos-surface-border)] rounded-lg py-1 px-1 text-center min-w-0`}>
            <span className="text-[8.5px] font-bold text-[var(--mos-text-muted)] uppercase block">Dáng</span>
            <span className="text-[10.5px] font-black text-[var(--mos-text)] block truncate mt-0.5 whitespace-nowrap">
              {booking.attributes?.style || 'Natural'}
            </span>
          </div>
          <div className={`${chipClass} border ${isDark ? 'border-blue-500/30' : 'border-blue-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
            <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Cong</span>
            <span className={`text-[11px] font-black block truncate mt-0.5 whitespace-nowrap ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              {(booking.attributes?.curl || 'C').replace(/^Cong\s+/i, '')}
            </span>
          </div>
          <div className={`${chipClass} border ${isDark ? 'border-emerald-500/30' : 'border-emerald-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
            <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Độ dài</span>
            {(() => {
              const rawLen = (booking.attributes?.length || '10-12')
                .replace(/\s*mm/gi, '')
                .replace(/\s*-\s*/g, '-')
                .trim();
              return (
                <span
                  className={`font-black block mt-0.5 whitespace-nowrap tabular-nums tracking-tighter ${
                    rawLen.length > 9 ? 'text-[9.5px]' : 'text-[11px]'
                  } ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}
                  title={booking.attributes?.length}
                >
                  {rawLen}
                </span>
              );
            })()}
          </div>
          <div className={`${chipClass} border ${isDark ? 'border-purple-500/30' : 'border-purple-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
            <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Độ dày</span>
            <span className={`text-[11px] font-black block truncate mt-0.5 whitespace-nowrap tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              {(booking.attributes?.thickness || '0.10').replace(/\s*mm/gi, '')}
            </span>
          </div>
        </div>
      </div>

      {/* Slot 2: Mi Dưới */}
      {booking.attributes?.hasUnderMink && (
        <div className={`rounded-xl p-2.5 border space-y-2 shadow-xs ${isDark ? 'bg-gradient-to-b from-[#261633] to-[#1A1A1C] border-purple-500/50' : 'bg-gradient-to-b from-purple-50/90 to-[var(--mos-surface-raised)] border-purple-300'}`}>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1.5 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                <LashTrayIcon className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} /> MI DƯỚI
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                  booking.attributes?.underMinkServiceType === 'Retain'
                    ? (isDark ? 'bg-purple-500/25 text-purple-200 border-purple-400/40' : 'bg-purple-100 text-purple-700 border-purple-300')
                    : (isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300')
                }`}
              >
                {booking.attributes?.underMinkServiceType === 'Retain' ? 'Dặm' : 'Nối Mới'}
              </span>
            </div>
            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-md border ${isDark ? 'bg-purple-500/30 text-purple-200 border-purple-400/40' : 'bg-purple-100 text-purple-700 border-purple-300'}`}>
              {booking.attributes?.underMinkCount || '30 sợi'}
            </span>
          </div>

          {/* 4 Stat Chips Grid */}
          <div className="grid grid-cols-[1fr_0.75fr_1.6fr_0.85fr] gap-1">
            <div className={`${chipClass} border ${isDark ? 'border-purple-400/20' : 'border-purple-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
              <span className="text-[8.5px] font-bold text-[var(--mos-text-muted)] uppercase block">Chất liệu</span>
              <span className={`text-[10.5px] font-black block truncate mt-0.5 whitespace-nowrap ${isDark ? 'text-purple-200' : 'text-purple-700'}`}>
                1D Mink
              </span>
            </div>
            <div className={`${chipClass} border ${isDark ? 'border-blue-500/30' : 'border-blue-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
              <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Cong</span>
              <span className={`text-[11px] font-black block truncate mt-0.5 whitespace-nowrap ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {(booking.attributes?.underMinkCurl || 'B').replace(/^Cong\s+/i, '')}
              </span>
            </div>
            <div className={`${chipClass} border ${isDark ? 'border-emerald-500/30' : 'border-emerald-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
              <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Độ dài</span>
              <span className={`text-[11px] font-black block truncate mt-0.5 whitespace-nowrap tabular-nums ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {(booking.attributes?.underMinkLength || '7').replace(/\s*mm/gi, '')}
              </span>
            </div>
            <div className={`${chipClass} border ${isDark ? 'border-purple-500/30' : 'border-purple-200'} rounded-lg py-1 px-1 text-center min-w-0`}>
              <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Độ dày</span>
              <span className={`text-[11px] font-black block truncate mt-0.5 whitespace-nowrap tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                {(booking.attributes?.underMinkThickness || '0.10').replace(/\s*mm/gi, '')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mini-HUD: Thông số mi thật đã khám */}
      <div className={`rounded-xl p-2.5 space-y-1.5 border ${isDark ? 'bg-blue-950/40 border-blue-500/30' : 'bg-blue-50/80 border-blue-200'}`}>
        <span className={`text-[9.5px] font-black uppercase tracking-wider flex items-center justify-between ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
          <span className="flex items-center gap-1">
            <span>👁️</span> HỒ SƠ MI THẬT (MỤC TIÊU NỐI)
          </span>
          <span className={`text-[9px] font-bold ${isDark ? 'text-blue-300/80' : 'text-blue-600'}`}>
            {hasCompleteNaturalLashSet(booking) ? 'Đã lưu' : 'Chưa đo'}
          </span>
        </span>
        <div className="grid grid-cols-[0.85fr_1.35fr_1fr] gap-1.5 text-center">
          <div className={`${chipClass} border ${isDark ? 'border-blue-400/20' : 'border-blue-200'} rounded-lg py-1 px-1 min-w-0`}>
            <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Dài</span>
            <span className="text-[11.5px] font-black text-[var(--mos-text)] block mt-0.5 whitespace-nowrap tabular-nums">
              {booking.attributes?.naturalLashLength
                ? booking.attributes.naturalLashLength.replace(/\s*mm/gi, '').trim()
                : '—'}
            </span>
          </div>
          <div className={`${chipClass} border ${isDark ? 'border-emerald-400/20' : 'border-emerald-200'} rounded-lg py-1 px-1 min-w-0`}>
            <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Dày</span>
            <span className={`text-[11px] font-black block mt-0.5 whitespace-nowrap tabular-nums tracking-tight ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {booking.attributes?.naturalLashThickness
                ? booking.attributes.naturalLashThickness.replace(/\s*mm/gi, '').trim()
                : '—'}
            </span>
          </div>
          <div className={`${chipClass} border ${isDark ? 'border-purple-400/20' : 'border-purple-200'} rounded-lg py-1 px-1 min-w-0`}>
            <span className={`text-[8.5px] font-bold uppercase block ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Mí</span>
            <span className={`text-[10.5px] font-black block truncate mt-0.5 whitespace-nowrap ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              {booking.attributes?.eyeShape ? booking.attributes.eyeShape.split('(')[0].split('/')[0].trim() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Quest Note: Dặn dò CC / Booker với Avatar */}
      <div className={`border rounded-xl p-2.5 flex items-start gap-2.5 ${isDark ? 'bg-[#2C241E] border-amber-500/30' : 'bg-amber-50/90 border-amber-200'}`}>
        <div className={`relative w-8 h-8 rounded-full overflow-hidden border shrink-0 mt-0.5 ${isDark ? 'border-amber-400/60 bg-neutral-800' : 'border-amber-400 bg-amber-100'}`}>
          {bookerAvatar ? (
            <img
              src={bookerAvatar}
              alt="Booker"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center">
              CC
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 px-0.8 py-0.2 rounded bg-amber-400 text-black text-[6.5px] font-black leading-none">
            Note
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span className={`text-[9.5px] font-black uppercase flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span>DẶN DÒ TỪ {booking.bookerName || 'CC'}</span>
          </span>
          <p className={`text-[11.5px] font-medium leading-snug mt-0.5 ${isDark ? 'text-amber-100/90' : 'text-amber-950'}`}>
            {booking.customerNote || '31/10 c book Thảo Ly'}
          </p>
        </div>
      </div>

      {/* Action link: Đổi chất liệu / Sửa thông số mi */}
      {onEditService && (
        <div className="pt-0.5 flex justify-end">
          <button
            type="button"
            onClick={onEditService}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs ${isDark ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Đổi Chất Liệu / Sửa Thông Số Mi</span>
          </button>
        </div>
      )}
    </div>
  );
}
