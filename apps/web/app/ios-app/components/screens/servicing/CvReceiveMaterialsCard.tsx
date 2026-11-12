'use client';

import React from 'react';
import { hasCompleteNaturalLashSet } from '@mos-lab/shared';
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
  return (
    <div className="bg-[#242426] rounded-2xl p-3 space-y-2.5 border border-neutral-700/80">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <LashTrayIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" /> NGUYÊN VẬT LIỆU
        </span>
      </div>

      {/* Slot 1: Mi Trên */}
      <div className="bg-gradient-to-b from-[#2A2315] to-[#1A1A1C] rounded-xl p-2.5 border border-amber-500/40 space-y-2 shadow-xs">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-tight flex items-center gap-1.5">
              <LashTrayIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" /> MI TRÊN
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                isRetain
                  ? 'bg-purple-500/25 text-purple-300 border-purple-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
              }`}
            >
              {isRetain ? 'Dặm' : 'Nối Mới'}
            </span>
          </div>
          <span className="text-[9.5px] font-black text-amber-200 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-md">
            {booking.attributes?.material || 'HyperLight'} · {booking.attributes?.volume || '3X'} ·{' '}
            {booking.attributes?.count || '70 fan'}
          </span>
        </div>

        {/* 4 Stat Chips Grid: Cột Độ dài rộng hơn để chứa đủ 5 sizes */}
        <div className="grid grid-cols-[1fr_0.75fr_1.6fr_0.85fr] gap-1">
          <div className="bg-black/60 border border-white/10 rounded-lg py-1 px-1 text-center min-w-0">
            <span className="text-[8.5px] font-bold text-neutral-400 uppercase block">Dáng</span>
            <span className="text-[10.5px] font-black text-white block truncate mt-0.5 whitespace-nowrap">
              {booking.attributes?.style || 'Natural'}
            </span>
          </div>
          <div className="bg-black/60 border border-blue-500/30 rounded-lg py-1 px-1 text-center min-w-0">
            <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Cong</span>
            <span className="text-[11px] font-black text-blue-300 block truncate mt-0.5 whitespace-nowrap">
              {(booking.attributes?.curl || 'C').replace(/^Cong\s+/i, '')}
            </span>
          </div>
          <div className="bg-black/60 border border-emerald-500/30 rounded-lg py-1 px-1 text-center min-w-0">
            <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Độ dài</span>
            {(() => {
              const rawLen = (booking.attributes?.length || '10-12')
                .replace(/\s*mm/gi, '')
                .replace(/\s*-\s*/g, '-')
                .trim();
              return (
                <span
                  className={`font-black text-emerald-300 block mt-0.5 whitespace-nowrap tabular-nums tracking-tighter ${
                    rawLen.length > 9 ? 'text-[9.5px]' : 'text-[11px]'
                  }`}
                  title={booking.attributes?.length}
                >
                  {rawLen}
                </span>
              );
            })()}
          </div>
          <div className="bg-black/60 border border-purple-500/30 rounded-lg py-1 px-1 text-center min-w-0">
            <span className="text-[8.5px] font-bold text-purple-400 uppercase block">Độ dày</span>
            <span className="text-[11px] font-black text-purple-300 block truncate mt-0.5 whitespace-nowrap tabular-nums">
              {(booking.attributes?.thickness || '0.10').replace(/\s*mm/gi, '')}
            </span>
          </div>
        </div>
      </div>

      {/* Slot 2: Mi Dưới */}
      {booking.attributes?.hasUnderMink && (
        <div className="bg-gradient-to-b from-[#261633] to-[#1A1A1C] rounded-xl p-2.5 border border-purple-500/50 space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-black text-purple-300 uppercase tracking-tight flex items-center gap-1.5">
                <LashTrayIcon className="w-3.5 h-3.5 text-purple-300 shrink-0" /> MI DƯỚI
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border ${
                  booking.attributes?.underMinkServiceType === 'Retain'
                    ? 'bg-purple-500/25 text-purple-200 border-purple-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                }`}
              >
                {booking.attributes?.underMinkServiceType === 'Retain' ? 'Dặm' : 'Nối Mới'}
              </span>
            </div>
            <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40">
              {booking.attributes?.underMinkCount || '30 sợi'}
            </span>
          </div>

          {/* 4 Stat Chips Grid */}
          <div className="grid grid-cols-[1fr_0.75fr_1.6fr_0.85fr] gap-1">
            <div className="bg-black/60 border border-purple-400/20 rounded-lg py-1 px-1 text-center min-w-0">
              <span className="text-[8.5px] font-bold text-neutral-400 uppercase block">Chất liệu</span>
              <span className="text-[10.5px] font-black text-purple-200 block truncate mt-0.5 whitespace-nowrap">
                1D Mink
              </span>
            </div>
            <div className="bg-black/60 border border-blue-500/30 rounded-lg py-1 px-1 text-center min-w-0">
              <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Cong</span>
              <span className="text-[11px] font-black text-blue-300 block truncate mt-0.5 whitespace-nowrap">
                {(booking.attributes?.underMinkCurl || 'B').replace(/^Cong\s+/i, '')}
              </span>
            </div>
            <div className="bg-black/60 border border-emerald-500/30 rounded-lg py-1 px-1 text-center min-w-0">
              <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Độ dài</span>
              <span className="text-[11px] font-black text-emerald-300 block truncate mt-0.5 whitespace-nowrap tabular-nums">
                {(booking.attributes?.underMinkLength || '7').replace(/\s*mm/gi, '')}
              </span>
            </div>
            <div className="bg-black/60 border border-purple-500/30 rounded-lg py-1 px-1 text-center min-w-0">
              <span className="text-[8.5px] font-bold text-purple-400 uppercase block">Độ dày</span>
              <span className="text-[11px] font-black text-purple-300 block truncate mt-0.5 whitespace-nowrap tabular-nums">
                {(booking.attributes?.underMinkThickness || '0.10').replace(/\s*mm/gi, '')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mini-HUD: Thông số mi thật đã khám */}
      <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-2.5 space-y-1.5">
        <span className="text-[9.5px] font-black uppercase text-blue-400 tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>👁️</span> HỒ SƠ MI THẬT (MỤC TIÊU NỐI)
          </span>
          <span className="text-[9px] text-blue-300/80 font-bold">
            {hasCompleteNaturalLashSet(booking) ? 'Đã lưu' : 'Chưa đo'}
          </span>
        </span>
        <div className="grid grid-cols-[0.85fr_1.35fr_1fr] gap-1.5 text-center">
          <div className="bg-black/50 border border-blue-400/20 rounded-lg py-1 px-1 min-w-0">
            <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Dài</span>
            <span className="text-[11.5px] font-black text-white block mt-0.5 whitespace-nowrap tabular-nums">
              {booking.attributes?.naturalLashLength
                ? booking.attributes.naturalLashLength.replace(/\s*mm/gi, '').trim()
                : '—'}
            </span>
          </div>
          <div className="bg-black/50 border border-emerald-400/20 rounded-lg py-1 px-1 min-w-0">
            <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Dày</span>
            <span className="text-[11px] font-black text-emerald-300 block mt-0.5 whitespace-nowrap tabular-nums tracking-tight">
              {booking.attributes?.naturalLashThickness
                ? booking.attributes.naturalLashThickness.replace(/\s*mm/gi, '').trim()
                : '—'}
            </span>
          </div>
          <div className="bg-black/50 border border-purple-400/20 rounded-lg py-1 px-1 min-w-0">
            <span className="text-[8.5px] font-bold text-purple-400 uppercase block">Mí</span>
            <span className="text-[10.5px] font-black text-purple-300 block truncate mt-0.5 whitespace-nowrap">
              {booking.attributes?.eyeShape ? booking.attributes.eyeShape.split('(')[0].split('/')[0].trim() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Quest Note: Dặn dò CC / Booker với Avatar */}
      <div className="bg-[#2C241E] border border-amber-500/30 rounded-xl p-2.5 flex items-start gap-2.5">
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-400/60 bg-neutral-800 shrink-0 mt-0.5">
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
            <div className="w-full h-full bg-amber-600 text-black font-black text-[10px] flex items-center justify-center">
              CC
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 px-0.8 py-0.2 rounded bg-amber-400 text-black text-[6.5px] font-black leading-none">
            Note
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[9.5px] font-black uppercase text-amber-400 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>DẶN DÒ TỪ {booking.bookerName || 'CC'}</span>
          </span>
          <p className="text-[11.5px] text-amber-100/90 font-medium leading-snug mt-0.5">
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
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Đổi Chất Liệu / Sửa Thông Số Mi</span>
          </button>
        </div>
      )}
    </div>
  );
}
