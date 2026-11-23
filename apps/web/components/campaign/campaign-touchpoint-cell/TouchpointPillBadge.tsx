'use client';

import React from 'react';
import {
  BellRing,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  HeartOff,
  Hourglass,
  MessageSquare,
  PhoneCall,
  PhoneOff,
} from 'lucide-react';
import type { TouchpointDisplayStatus } from './touchpoint-cell-types';
import { getTouchpointPillClassName } from './touchpoint-cell-utils';

export interface TouchpointPillBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  displayStatus: TouchpointDisplayStatus;
  isDark: boolean;
  loading: boolean;
  hasReferredDiamond: boolean;
  currentNote: string;
  onCellClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function renderPillIcon(displayStatus: TouchpointDisplayStatus) {
  switch (displayStatus) {
    case 'DONE':
      return <CheckCircle2 size={13} className="text-emerald-400" />;
    case 'BOOKED':
      return <CalendarCheck size={13} className="text-indigo-400" />;
    case 'SUCCESS':
      return <PhoneCall size={12} className="text-emerald-400" />;
    case 'CALLBACK':
      return <Clock size={12} className="text-purple-400" />;
    case 'MESSAGED':
      return <MessageSquare size={12} className="text-cyan-400" />;
    case 'FAILED':
      return <PhoneOff size={12} className="text-rose-400" />;
    case 'LOST':
      return <HeartOff size={12} className="text-pink-400" />;
    case 'DUE_TODAY':
      return <BellRing size={13} className="text-amber-400 animate-pulse" />;
    case 'OVERDUE':
      return <Hourglass size={12} className="text-rose-400 opacity-80" />;
    default:
      return <Hourglass size={12} className="text-slate-400 opacity-60" />;
  }
}

export const TouchpointPillBadge = React.forwardRef<HTMLDivElement, TouchpointPillBadgeProps>(
  (
    { displayStatus, isDark, loading, hasReferredDiamond, currentNote, onCellClick, onClick, className, ...restProps },
    ref
  ) => {
    const pillClassName = getTouchpointPillClassName(displayStatus, isDark, loading);

    return (
      <div
        ref={ref}
        {...restProps}
        className={className ? `${pillClassName} ${className}` : pillClassName}
        onClick={(e) => {
          onCellClick(e);
          if (!loading) {
            onClick?.(e);
          }
        }}
      >
        {/* Main Status Icon */}
        {renderPillIcon(displayStatus)}

        {/* Top-Right Corner Diamond Badge */}
        {hasReferredDiamond && (
          <span
            className="absolute -top-[6px] -right-[6px] text-[11px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] z-[2]"
            title="Đã tư vấn Chương Trình Kim Cương"
          >
            💎
          </span>
        )}

        {/* Bottom-Left Corner Note Indicator */}
        {currentNote && (
          <span
            className={`absolute -bottom-[4px] -left-[4px] w-[12px] h-[12px] rounded-full flex items-center justify-center border shadow-[0_1px_2px_rgba(0,0,0,0.3)] z-[2] ${
              isDark ? 'bg-slate-800 border-slate-600 text-amber-400' : 'bg-white border-slate-300 text-amber-600'
            }`}
            title={`Ghi chú: ${currentNote}`}
          >
            <FileText size={8} />
          </span>
        )}
      </div>
    );
  }
);

TouchpointPillBadge.displayName = 'TouchpointPillBadge';
