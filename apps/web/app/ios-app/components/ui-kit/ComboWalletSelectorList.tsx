'use client';

import React from 'react';
import { formatComboName, type IosCustomerComboWalletItem } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { ComboSessionBadge } from './ComboSessionBadge';
import { ComboExpiryStatusBadge } from './ComboExpiryStatusBadge';
import { Check, Lock, Sparkles } from 'lucide-react';

export interface ComboWalletSelectorListProps {
  wallets: IosCustomerComboWalletItem[];
  selectedBalanceId?: number | null;
  skipCombo: boolean;
  serviceGroup: 'upper' | 'under';
  onSelectWallet: (wallet: IosCustomerComboWalletItem) => void;
  onSelectSkipCombo: () => void;
  compact?: boolean;
  className?: string;
}

export function ComboWalletSelectorList({
  wallets,
  selectedBalanceId,
  skipCombo,
  serviceGroup,
  onSelectWallet,
  onSelectSkipCombo,
  compact = false,
  className = '',
}: ComboWalletSelectorListProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  if (!wallets || wallets.length === 0) {
    return null;
  }

  const liveWallets = wallets.filter((w) => !w.isExpired && w.remainingSessions > 0);
  const groupLabel = serviceGroup === 'under' ? 'Mi Dưới' : 'Mi Trên';
  const hasMultipleWallets = wallets.length >= 2;
  const accentBorder =
    serviceGroup === 'under'
      ? isDark
        ? 'border-purple-500/60 bg-purple-950/35'
        : 'border-purple-400 bg-purple-50/90'
      : isDark
        ? 'border-emerald-500/60 bg-emerald-950/30'
        : 'border-emerald-500 bg-emerald-50/90';

  const checkBg = serviceGroup === 'under' ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white';

  return (
    <div className={`space-y-1.5 ${className}`} data-testid={`combo-wallet-selector-${serviceGroup}`}>
      {hasMultipleWallets && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center justify-center leading-none py-1 px-2 rounded-full text-[10px] font-black tracking-wide border ${
              serviceGroup === 'under'
                ? isDark
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-purple-50 text-purple-700 border-purple-300'
                : isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}
          >
            Đang có {wallets.length} gói ❖ {groupLabel} · Chạm chọn gói dùng lần này
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        {wallets.map((w) => {
          const isExpired = Boolean(w.isExpired);
          const isSelected = !skipCombo && !isExpired && Number(selectedBalanceId) === Number(w.balanceId);
          const displayName = formatComboName(w.comboName, w.packageKey) || `Gói ❖ ${groupLabel}`;

          if (isExpired) {
            return (
              <div
                key={`${w.serviceGroup}-${w.balanceId}`}
                data-testid={`combo-wallet-option-expired-${w.balanceId}`}
                className={`w-full rounded-xl border ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} flex items-center justify-between gap-2 opacity-90 ${
                  isDark
                    ? 'border-rose-500/50 bg-rose-950/30 text-rose-100'
                    : 'border-rose-300 bg-rose-50/80 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white inline-flex items-center justify-center shrink-0">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11.5px] font-extrabold truncate">{displayName}</span>
                      {w.balanceId > 0 && (
                        <span
                          className={`text-[9.5px] font-bold tabular-nums shrink-0 ${
                            isDark ? 'text-rose-300/80' : 'text-rose-700/80'
                          }`}
                        >
                          #{w.balanceId}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-400">
                      Đã hết hạn · Khóa trừ 0đ (Mua gói mới để cứu {w.remainingSessions} buổi)
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 tabular-nums">
                  <ComboSessionBadge
                    normalRemaining={w.normalRemaining}
                    retainRemaining={w.retainRemaining}
                    remainingSessions={w.remainingSessions}
                    comboName={w.comboName}
                    size="xs"
                    theme={isDark ? 'dark' : 'light'}
                  />
                  <ComboExpiryStatusBadge status={w} compact theme={isDark ? 'dark' : 'light'} />
                </div>
              </div>
            );
          }

          return (
            <button
              key={`${w.serviceGroup}-${w.balanceId}`}
              type="button"
              data-testid={`combo-wallet-option-${w.balanceId}`}
              aria-pressed={isSelected}
              onClick={() => onSelectWallet(w)}
              className={`w-full text-left rounded-xl border ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-[0.99] ${
                isSelected
                  ? accentBorder
                  : isDark
                    ? 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-raised)] hover:border-neutral-600 text-[var(--mos-text)]'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? `${checkBg} border-transparent shadow-2xs`
                      : isDark
                        ? 'border-neutral-600 bg-transparent'
                        : 'border-neutral-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11.5px] font-extrabold truncate">{displayName}</span>
                    {w.balanceId > 0 && (
                      <span
                        className={`text-[9.5px] font-bold tabular-nums shrink-0 ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        #{w.balanceId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 tabular-nums">
                <ComboSessionBadge
                  normalRemaining={w.normalRemaining}
                  retainRemaining={w.retainRemaining}
                  remainingSessions={w.remainingSessions}
                  comboName={w.comboName}
                  size="xs"
                  theme={isDark ? 'dark' : 'light'}
                />
                <ComboExpiryStatusBadge status={w} compact theme={isDark ? 'dark' : 'light'} />
              </div>
            </button>
          );
        })}

        {liveWallets.length > 0 && (
          <button
            type="button"
            data-testid={`combo-wallet-skip-${serviceGroup}`}
            aria-pressed={skipCombo}
            onClick={onSelectSkipCombo}
            className={`w-full text-left rounded-xl border ${compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5'} flex items-center justify-between gap-2 transition-all cursor-pointer ${
              skipCombo
                ? isDark
                  ? 'border-amber-400/70 bg-amber-950/40 text-amber-200'
                  : 'border-amber-400 bg-amber-50 text-amber-900'
                : isDark
                  ? 'border-[var(--mos-surface-border)] bg-[var(--mos-surface)] text-[var(--mos-text-muted)] hover:border-amber-500/40'
                  : 'border-neutral-200 bg-neutral-50/70 text-neutral-600 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 border ${
                  skipCombo
                    ? 'bg-amber-500 text-black border-transparent'
                    : isDark
                      ? 'border-neutral-600 bg-transparent'
                      : 'border-neutral-300 bg-white'
                }`}
              >
                {skipCombo ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Sparkles className="w-2.5 h-2.5" />}
              </span>
              <span className="text-[11px] font-bold truncate">Không trừ gói {groupLabel} · Đi lẻ lần này</span>
            </div>
            <span
              className={`inline-flex items-center justify-center leading-none py-1 px-2 rounded-full text-[9.5px] font-extrabold border shrink-0 ${
                skipCombo
                  ? isDark
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-white text-amber-800 border-amber-300'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    : 'bg-white text-neutral-500 border-neutral-200'
              }`}
            >
              {serviceGroup === 'under' ? '+390K Mới / +250K Dặm' : '≤ 21N: Giá Dặm'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
