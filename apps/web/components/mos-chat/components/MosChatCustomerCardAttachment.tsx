'use client';

import React, { useContext } from 'react';
import { ExternalLink } from 'lucide-react';
import { message as antdMessage, Tooltip, Avatar } from 'antd';
import type { MosChatCustomerCard } from '@mos-lab/shared';
import { useTheme } from '../../../context/ThemeContext';
import { MosChatContext } from '../context/MosChatContext';

export interface MosChatCustomerCardAttachmentProps {
  card: MosChatCustomerCard;
  isMe?: boolean;
  onOpenCustomer?: (customerId: number) => void;
  className?: string;
}

export const MosChatCustomerCardAttachment: React.FC<MosChatCustomerCardAttachmentProps> = ({
  card,
  isMe = false,
  onOpenCustomer,
  className = '',
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const chatContext = useContext(MosChatContext);
  const handleOpen = onOpenCustomer || chatContext?.openCustomerDetail;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (card.customerId && handleOpen) {
      handleOpen(card.customerId);
    } else {
      antdMessage.info(`Hồ sơ khách hàng: ${card.name}`);
    }
  };

  const initials = (card.name || 'KH')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase();

  return (
    <div
      data-testid="mos-chat-customer-card"
      onClick={handleClick}
      className={`mt-2 p-2.5 rounded-xl border flex items-center justify-between gap-3 max-w-full cursor-pointer hover:border-amber-400/50 transition-colors shadow-sm select-none ${className}`}
      style={{
        background: isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)',
        borderColor: 'rgba(212, 168, 75, 0.35)',
      }}
      title="Bấm để xem hồ sơ khách hàng"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <Avatar
          size={36}
          src={card.avatarUrl || undefined}
          data-testid="mos-chat-customer-card-avatar"
          className="shrink-0 font-bold border border-amber-400/40 select-none shadow-sm"
          style={{
            backgroundColor: isDark ? '#b45309' : '#d97706',
            color: '#ffffff',
          }}
        >
          {initials}
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-white truncate flex items-center gap-1.5">
            <span className="truncate">{card.name}</span>
            <span className="text-amber-400 font-semibold truncate shrink-0">· {card.meta}</span>
          </div>
          {(card.cvName || card.phone) && (
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {card.cvName || ''}
              {card.cvName && card.phone ? ' · ' : ''}
              {card.phone || ''}
            </div>
          )}
        </div>
      </div>

      <Tooltip title="Mở hồ sơ khách hàng">
        <button
          type="button"
          aria-label="Mở hồ sơ khách hàng"
          onClick={handleClick}
          className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer bg-slate-900/70 border border-slate-700/70 text-slate-300 hover:text-amber-400 active:scale-95 transition-all shadow-sm"
        >
          <ExternalLink size={14} />
        </button>
      </Tooltip>
    </div>
  );
};
