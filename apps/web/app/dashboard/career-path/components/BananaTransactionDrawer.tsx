'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, Input, Segmented, Tooltip } from 'antd';
import { AdaptiveDrawer, StatePanel } from '../../../../components/ui';
import {
  Heart,
  Gift,
  Clock,
  Award,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Calendar,
  X,
  Smile,
} from 'lucide-react';
import type { BananaTransactionResponse, BananaTransactionItem, BananaTransactionCategory } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';

interface BananaTransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  staffId: number | null;
  staffName?: string;
  avatarUrl?: string | null;
  initialCategory?: BananaTransactionCategory;
}

export function BananaTransactionDrawer({
  open,
  onClose,
  staffId,
  staffName,
  avatarUrl,
  initialCategory = 'ALL',
}: BananaTransactionDrawerProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BananaTransactionResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<BananaTransactionCategory>(initialCategory);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'all'>('90d');
  const [searchTerm, setSearchTerm] = useState('');

  const loadTransactions = useCallback(async () => {
    if (!staffId || !open) return;
    try {
      setLoading(true);
      const res = await apiClient.career.getBananaTransactions(staffId, {
        category: activeCategory,
        timeRange,
        search: searchTerm.trim() || undefined,
        limit: 150,
      });
      setData(res);
    } catch (_err) {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  }, [staffId, open, activeCategory, timeRange, searchTerm]);

  useEffect(() => {
    if (open) {
      loadTransactions();
    }
  }, [open, loadTransactions]);

  const currentBalance = data?.currentBalance ?? 0;
  const isNegative = currentBalance < 0;

  // Filter categories metadata
  const categoriesList: { key: BananaTransactionCategory; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'ALL', label: 'Tất cả', icon: <span>🍌</span> },
    {
      key: 'GIVE_AWAY_RECEIVED',
      label: 'Được tặng',
      icon: <Gift className="w-3.5 h-3.5 text-emerald-500" />,
      count: data?.countReceivedGiveAway,
    },
    {
      key: 'GIVE_AWAY_SENT',
      label: 'Đã gửi tặng',
      icon: <Heart className="w-3.5 h-3.5 text-rose-500" />,
      count: data?.countSentGiveAway,
    },
    { key: 'SHIFT', label: 'Trừ ca làm', icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
    { key: 'REWARD', label: 'Thưởng & Task', icon: <Award className="w-3.5 h-3.5 text-blue-500" /> },
    { key: 'OTHER', label: 'Khác', icon: <Sparkles className="w-3.5 h-3.5 text-slate-500" /> },
  ];

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      intent="detail"
      placement={isMobile ? 'bottom' : 'right'}
      height={isMobile ? '88vh' : undefined}
      width={isMobile ? '100vw' : 500}
      closable={false}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
      }}
      className={isMobile ? 'rounded-t-3xl overflow-hidden' : ''}
    >
      {/* Mobile Top Drag Handle Bar */}
      {isMobile && (
        <div
          onClick={onClose}
          className="w-full flex justify-center py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 cursor-pointer active:opacity-70 transition-opacity"
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
      )}

      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={avatarUrl || undefined}
              size={42}
              className="bg-gradient-to-tr from-amber-400 to-amber-600 text-white font-bold shrink-0 shadow-sm"
            >
              {staffName?.[0] || 'U'}
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                <span>{staffName || 'Nhân sự'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Lịch sử Chuối
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Sao kê biến động chuối & chuối yêu thương
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real Balance Highlight Card */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            isNegative
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>Số dư chuối thực tế</span>
                {isNegative && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                    Âm ví
                  </span>
                )}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl">🍌</span>
                <span
                  className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                    isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {currentBalance.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Chuối</span>
              </div>
            </div>

            {isNegative ? (
              <div className="text-right">
                <div className="inline-flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 px-2 py-1 rounded-lg">
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                  <span>Trừ ca định kỳ</span>
                </div>
              </div>
            ) : (
              <div className="text-right">
                <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Số dư khả dụng</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats: Chuối yêu thương nhận & tặng */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Gift className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Được tặng</div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums leading-tight truncate">
                  +{(data?.totalReceivedGiveAway || 0).toLocaleString('vi-VN')} Chuối
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Heart className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Đã gửi tặng</div>
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums leading-tight truncate">
                  -{(data?.totalSentGiveAway || 0).toLocaleString('vi-VN')} Chuối
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-3 sm:px-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 space-y-2.5 shrink-0">
        {/* Category Pills (Horizontal Scroll on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categoriesList.map((cat) => {
            const isSelected = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-xs scale-102 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                {cat.count !== undefined && cat.count > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {cat.count > 999 ? '999+' : cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Time Range Bar */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tìm theo tên bạn bè, lời chúc..."
            prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="small"
            className="flex-1 rounded-xl text-xs py-1.5"
          />

          <Segmented
            size="small"
            value={timeRange}
            onChange={(val) => setTimeRange(val as any)}
            options={[
              { label: '30 ngày', value: '30d' },
              { label: '90 ngày', value: '90d' },
              { label: 'Tất cả', value: 'all' },
            ]}
            className="shrink-0 text-xs"
          />
        </div>
      </div>

      {/* Transaction List Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
        {loading ? (
          <StatePanel kind="loading" title="Đang tải lịch sử sao kê Chuối..." surface={false} minHeight={180} />
        ) : !data?.transactions || data.transactions.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Chưa có giao dịch chuối nào"
            description="Không tìm thấy giao dịch nào phù hợp với bộ lọc hiện tại"
            surface={false}
            minHeight={180}
          />
        ) : (
          data.transactions.map((tx) => {
            const isGain = tx.amount > 0;
            const isGiveAway = tx.category === 'GIVE_AWAY_RECEIVED' || tx.category === 'GIVE_AWAY_SENT';
            const formattedDate = new Date(tx.dateCreated).toLocaleDateString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <div
                key={tx.id}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xs hover:border-amber-200 dark:hover:border-amber-800/40 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Category Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        tx.category === 'GIVE_AWAY_RECEIVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : tx.category === 'GIVE_AWAY_SENT'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            : tx.category === 'SHIFT'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                              : tx.category === 'REWARD'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tx.category === 'GIVE_AWAY_RECEIVED' ? (
                        <Gift className="w-4 h-4" />
                      ) : tx.category === 'GIVE_AWAY_SENT' ? (
                        <Heart className="w-4 h-4" />
                      ) : tx.category === 'SHIFT' ? (
                        <Clock className="w-4 h-4" />
                      ) : tx.category === 'REWARD' ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    {/* Title & Metadata */}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                        {tx.title}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-0.5">
                        {formattedDate}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Amount */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-black font-mono tabular-nums leading-tight ${
                        isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isGain ? `+${tx.amount.toLocaleString('vi-VN')}` : tx.amount.toLocaleString('vi-VN')}{' '}
                      <span className="text-[11px] font-normal">🍌</span>
                    </div>
                    {tx.balance !== undefined && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums mt-0.5">
                        Dư: {tx.balance.toLocaleString('vi-VN')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Speech Bubble Lời Chúc (Với Chuối Yêu Thương) */}
                {isGiveAway && tx.giveAway?.message && (
                  <div className="ml-10.5 pl-0.5">
                    <div className="inline-block relative bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-3 py-1.5 rounded-2xl rounded-tl-xs text-xs text-slate-700 dark:text-slate-200 max-w-full shadow-2xs">
                      <span className="italic">“{tx.giveAway.message}”</span>
                    </div>
                  </div>
                )}

                {/* Description khác nếu có */}
                {!isGiveAway && tx.description && (
                  <div className="ml-10.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                    {tx.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer Status */}
      <div className="p-3 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span>Hiển thị {data?.transactions?.length || 0} giao dịch gần nhất</span>
        <button
          onClick={loadTransactions}
          className="text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
        >
          Làm mới
        </button>
      </div>
    </AdaptiveDrawer>
  );
}
