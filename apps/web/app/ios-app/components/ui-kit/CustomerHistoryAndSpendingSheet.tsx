'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calendar, CreditCard, Gem, History, MapPin, RefreshCw, User, Wrench, X } from 'lucide-react';
import type {
  IosBookingItem,
  IosCustomerDiamondTxnItem,
  IosCustomerHistoryResponse,
  IosCustomerHistoryTab,
  IosCustomerHistoryVisitItem,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import { CustomerLashPortfolioTab } from './customer-history/CustomerLashPortfolioTab';
import { LashPhotoCompareLightbox, LashPhotoComparePayload } from './customer-history/LashPhotoCompareLightbox';

interface CustomerHistoryAndSpendingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Partial<IosBookingItem> & Pick<IosBookingItem, 'id' | 'customerName'>;
  initialTab?: IosCustomerHistoryTab;
  isSimulationMode?: boolean;
  customerFacingMode?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

const TAB_CONFIG: Array<{ key: IosCustomerHistoryTab; label: string }> = [
  { key: 'LASH_PHOTOS', label: '📸 BỘ MI' },
  { key: 'ALL', label: 'TẤT CẢ' },
  { key: 'PAYMENTS', label: 'THANH TOÁN' },
  { key: 'FIX', label: 'FIX' },
  { key: 'REWARDS', label: 'THƯỞNG' },
];

const formatVnd = (val: number) => `${Math.round(val || 0).toLocaleString('vi-VN')} đ`;

const getStatusStripeClass = (tone: IosCustomerHistoryVisitItem['statusTone']) => {
  if (tone === 'completed') return 'bg-emerald-500';
  if (tone === 'servicing') return 'bg-cyan-500';
  if (tone === 'canceled') return 'bg-rose-400';
  return 'bg-amber-400';
};

const getStatusBadgeClass = (tone: IosCustomerHistoryVisitItem['statusTone'], isDark: boolean) => {
  if (tone === 'completed') {
    return isDark
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (tone === 'servicing') {
    return isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }
  if (tone === 'canceled') {
    return isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200';
};

export const CustomerHistoryAndSpendingSheet: React.FC<CustomerHistoryAndSpendingSheetProps> = ({
  isOpen,
  onClose,
  booking,
  initialTab = 'LASH_PHOTOS',
  isSimulationMode = false,
  customerFacingMode = false,
  primaryActionLabel,
  onPrimaryAction,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<IosCustomerHistoryTab>(initialTab);
  const [data, setData] = useState<IosCustomerHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightboxPayload, setLightboxPayload] = useState<LashPhotoComparePayload | null>(null);

  const loadHistory = useCallback(
    async (signal?: AbortSignal) => {
      if (!booking?.customerId || booking.customerId <= 0) {
        setData(null);
        setErrorMsg(null);
        return;
      }
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await apiClient.ios.getCustomerHistory(
          booking.customerId,
          {
            bookingId: booking.id > 0 ? booking.id : undefined,
            sim: Boolean(isSimulationMode || booking.isSimulationBooking),
          },
          { signal }
        );
        if (!res?.success) {
          setErrorMsg(res?.error || 'Không tải được lịch sử khách hàng.');
          setData(null);
        } else {
          setData(res);
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError' || (err as { code?: string })?.code === 'ERR_CANCELED') {
          return;
        }
        const msg =
          (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
          (err as { message?: string })?.message ||
          'Không thể kết nối máy chủ để tải lịch sử.';
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [booking.customerId, booking.id, booking.isSimulationBooking, isSimulationMode]
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(customerFacingMode ? 'LASH_PHOTOS' : initialTab);
    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [isOpen, initialTab, customerFacingMode, loadHistory]);

  if (!isOpen) return null;

  const summary = data?.summary;
  const visits = data?.visits || [];
  const payments = data?.payments || [];
  const fixVisits = data?.fixVisits || [];
  const diamondTxns = data?.diamondTransactions || [];
  const effectiveTab: IosCustomerHistoryTab = customerFacingMode ? 'LASH_PHOTOS' : activeTab;

  const getTabCount = (key: IosCustomerHistoryTab) => {
    if (key === 'LASH_PHOTOS') return visits.length || (booking.lashHistory?.length ?? 0);
    if (key === 'ALL') return visits.length;
    if (key === 'PAYMENTS') return payments.length;
    if (key === 'FIX') return fixVisits.length;
    return diamondTxns.length;
  };

  const renderVisitCard = (item: IosCustomerHistoryVisitItem, index: number, mode: 'ALL' | 'PAYMENTS' | 'FIX') => {
    const isPaymentMode = mode === 'PAYMENTS';
    return (
      <div
        key={`${mode}-${item.orderId}-${index}`}
        data-testid={`history-row-${mode}-${item.orderId}`}
        className={`relative overflow-hidden rounded-2xl border p-3.5 pl-4 transition-colors ${
          isDark ? 'border-slate-800 bg-slate-900/75' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className={`absolute bottom-0 left-0 top-0 w-1 ${getStatusStripeClass(item.statusTone)}`} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {index + 1}
              </span>
              {isPaymentMode ? (
                <span
                  className={`text-base font-extrabold tabular-nums ${
                    item.debtAmount > 0
                      ? 'text-rose-500'
                      : item.paidAmount > 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-slate-300'
                          : 'text-slate-700'
                  }`}
                >
                  {formatVnd(item.paidAmount)}
                </span>
              ) : (
                <span className={`text-[13px] font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {item.serviceName}
                </span>
              )}
              <span
                className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${getStatusBadgeClass(
                  item.statusTone,
                  isDark
                )}`}
              >
                {item.statusLabel}
              </span>
              {item.isFixOrder && (
                <span
                  className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${
                    isDark
                      ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  <Wrench className="h-2.5 w-2.5" />
                  FIX
                </span>
              )}
            </div>

            {isPaymentMode && (
              <div className={`mt-1 text-[12px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {item.serviceName}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {isPaymentMode ? (
              <span
                className={`inline-flex items-center justify-center rounded-lg px-2 py-1 text-[10px] font-semibold leading-none ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.paymentMethodLabel}
              </span>
            ) : (
              <>
                {item.diamondEarned > 0 && (
                  <span
                    className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums leading-none ${
                      isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <Gem className="h-2.5 w-2.5" />+{item.diamondEarned}
                  </span>
                )}
                {item.diamondUsed > 0 && (
                  <span
                    className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums leading-none ${
                      isDark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <Gem className="h-2.5 w-2.5" />-{item.diamondUsed}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {isPaymentMode && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
            {item.totalPrice > 0 && (
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                Giá trị đơn:{' '}
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{formatVnd(item.totalPrice)}</strong>
              </span>
            )}
            {item.discountAmount > 0 && (
              <span className="text-amber-500">Combo/Giảm: -{formatVnd(item.discountAmount)}</span>
            )}
            {item.diamondUsed > 0 && <span className="text-sky-400">Dùng {item.diamondUsed} KC</span>}
            {item.tipAmount > 0 && <span className="text-emerald-400">Tip: +{formatVnd(item.tipAmount)}</span>}
            {item.debtAmount > 0 && (
              <span className="font-bold text-rose-500">Công nợ: {formatVnd(item.debtAmount)}</span>
            )}
          </div>
        )}

        {item.bookingNote && (
          <div
            className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${
              isDark ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-50 text-slate-600'
            }`}
          >
            {item.bookingNote}
          </div>
        )}

        <div
          className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold ${item.daysAgoLabel === 'Hôm Nay' ? 'text-emerald-500' : ''}`}>
              {item.daysAgoLabel || item.dateDisplay}
            </span>
            <span>·</span>
            <span>
              {item.timeDisplay} {item.dateDisplay}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <MapPin className="h-2.5 w-2.5" />
              {item.branchName}
            </span>
          </div>

          {item.staffNames.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium">
              <User className="h-3 w-3 opacity-70" />
              <span className="truncate max-w-[160px]">{item.staffNames.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDiamondRow = (tx: IosCustomerDiamondTxnItem, index: number) => {
    const isEarn = tx.amount > 0;
    return (
      <div
        key={`diamond-${tx.id}-${index}`}
        data-testid={`history-row-REWARDS-${tx.id}`}
        className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 ${
          isDark ? 'border-slate-800 bg-slate-900/75' : 'border-slate-200 bg-white shadow-xs'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Gem className={`h-4 w-4 shrink-0 ${isEarn ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span
              className={`text-sm font-extrabold tabular-nums ${
                isEarn ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-rose-500'
              }`}
            >
              {isEarn ? `+${tx.amount}` : tx.amount} Kim Cương
            </span>
            {tx.orderId && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                #{tx.orderId}
              </span>
            )}
          </div>
          {tx.note && (
            <p className={`mt-1 text-xs leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{tx.note}</p>
          )}
          <div
            className={`mt-1.5 flex items-center gap-2 text-[11px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            <span>{tx.daysAgoLabel || tx.dateDisplay}</span>
            <span>·</span>
            <span>
              {tx.timeDisplay} {tx.dateDisplay}
            </span>
            {tx.branchName && (
              <>
                <span>·</span>
                <span>{tx.branchName}</span>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right tabular-nums">
          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Số dư sau GD</div>
          <div className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
            {tx.balanceAfter} KC
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Lịch sử ghé thăm và chi tiêu khách hàng"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative flex max-h-[92vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border shadow-2xl ${
          isDark ? 'border-slate-700/80 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
        }`}
      >
        {/* Header (Drawer Close Button Invariant: Title Top-Left, [X] Top-Right) */}
        <div
          className={`flex items-center justify-between gap-3 border-b px-4 py-3.5 ${
            isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-extrabold leading-tight">
                {data?.customerName || booking.customerName || 'Khách hàng'}
              </h2>
              <div
                className={`mt-0.5 flex items-center gap-2 text-[11px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {customerFacingMode ? (
                  <span>Hồ Sơ Bộ Mi &amp; Hình Ảnh</span>
                ) : (
                  <>
                    <span>{(data?.customerPhone ?? booking.customerPhone) || 'Chưa có SĐT'}</span>
                    <span>·</span>
                    <span>ID #{booking.customerId || 0}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadHistory()}
              aria-label="Làm mới lịch sử"
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng lịch sử khách hàng"
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI Spending & Visit Summary (ẩn hoàn toàn khi ở chế độ đưa khách xem) */}
        {!customerFacingMode && (
          <div
            className={`grid grid-cols-2 gap-2 border-b px-4 py-3 ${isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-200 bg-white/80'}`}
          >
            <div
              className={`rounded-2xl border p-2.5 ${isDark ? 'border-emerald-500/25 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50/70'}`}
            >
              <div
                className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}
              >
                <CreditCard className="h-3 w-3" />
                Tổng chi tiêu
              </div>
              <div
                className={`mt-1 text-[16px] font-black tabular-nums ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}
              >
                {summary ? formatVnd(summary.totalSpent) : '--'}
              </div>
              <div className={`mt-0.5 text-[10px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                TB {summary ? formatVnd(summary.avgSpendPerVisit) : '--'} / lần hoàn thành
              </div>
            </div>

            <div
              className={`rounded-2xl border p-2.5 ${isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'}`}
            >
              <div
                className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <Calendar className="h-3 w-3" />
                Lịch sử ghé thăm
              </div>
              <div className={`mt-1 text-[16px] font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {summary ? `${summary.completedVisits} hoàn thành` : '--'}
              </div>
              <div
                className={`mt-0.5 flex items-center gap-2 text-[10px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <span>Tổng {summary?.totalBookings ?? 0} lịch</span>
                <span>·</span>
                <span className="text-amber-500 font-semibold">💎 {summary?.diamondBalance ?? 0} KC</span>
              </div>
            </div>
          </div>
        )}

        {/* Segmented Tabs (BỘ MI | TẤT CẢ | THANH TOÁN | FIX | THƯỞNG) - Ẩn tab tài chính khi đưa khách xem */}
        {!customerFacingMode && (
          <div
            className={`border-b px-3 py-2 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}
          >
            <div
              role="tablist"
              aria-label="Phân loại lịch sử khách hàng"
              className={`grid grid-cols-5 gap-1 rounded-xl p-1 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
            >
              {TAB_CONFIG.map((tab) => {
                const isActive = effectiveTab === tab.key;
                const count = getTabCount(tab.key);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[9.5px] font-bold transition-colors duration-75 tabular-nums cursor-pointer ${
                      isActive
                        ? isDark
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-white text-emerald-700 shadow-xs'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{tab.label}</span>
                    <span className={`mt-0.5 text-[9px] font-semibold ${isActive ? 'opacity-90' : 'opacity-65'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {errorMsg && effectiveTab !== 'LASH_PHOTOS' ? (
            <div
              className={`flex flex-col items-center justify-center rounded-2xl border p-6 text-center ${
                isDark ? 'border-rose-500/30 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              <AlertCircle className="h-8 w-8 text-rose-500" />
              <p className="mt-2 text-xs font-medium">{errorMsg}</p>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="mt-3 rounded-xl bg-rose-500 px-4 py-1.5 text-xs font-bold text-white"
              >
                Thử lại
              </button>
            </div>
          ) : effectiveTab === 'LASH_PHOTOS' ? (
            <CustomerLashPortfolioTab
              booking={booking}
              visits={visits}
              isLoading={isLoading}
              isDark={isDark}
              customerFacingMode={customerFacingMode}
              onOpenLightbox={setLightboxPayload}
            />
          ) : isLoading && !data ? (
            <div className="space-y-2.5 py-4" data-testid="history-loading">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-24 animate-pulse rounded-2xl border ${
                    isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                  }`}
                />
              ))}
            </div>
          ) : (
            <>
              {effectiveTab === 'ALL' &&
                (visits.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Chưa ghi nhận lịch sử ghé thăm nào.
                  </p>
                ) : (
                  visits.map((v, i) => renderVisitCard(v, i, 'ALL'))
                ))}

              {effectiveTab === 'PAYMENTS' &&
                (payments.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Chưa có giao dịch thanh toán nào.
                  </p>
                ) : (
                  payments.map((v, i) => renderVisitCard(v, i, 'PAYMENTS'))
                ))}

              {effectiveTab === 'FIX' &&
                (fixVisits.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Khách hàng chưa có lượt FIX / bảo hành nào.
                  </p>
                ) : (
                  fixVisits.map((v, i) => renderVisitCard(v, i, 'FIX'))
                ))}

              {effectiveTab === 'REWARDS' &&
                (diamondTxns.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Chưa có lịch sử tích / sử dụng Kim Cương.
                  </p>
                ) : (
                  diamondTxns.map((tx, i) => renderDiamondRow(tx, i))
                ))}
            </>
          )}
        </div>

        {primaryActionLabel && onPrimaryAction && (
          <div
            className={`flex items-center gap-2 border-t px-4 py-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border px-4 py-2.5 text-xs font-bold cursor-pointer ${
                isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              className="flex-1 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-black shadow-md active:scale-[0.98] cursor-pointer"
            >
              {primaryActionLabel}
            </button>
          </div>
        )}
      </div>

      <LashPhotoCompareLightbox payload={lightboxPayload} onClose={() => setLightboxPayload(null)} />
    </div>
  );
};
