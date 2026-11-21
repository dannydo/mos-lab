'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Cake, Calendar, CreditCard, History, RefreshCw, X } from 'lucide-react';
import {
  getCustomerBirthdayThisMonthStatus,
  type IosBookingItem,
  type IosCustomerHistoryResponse,
  type IosCustomerHistoryTab,
  type IosCustomerNoteItem,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import { CustomerLashPortfolioTab } from './customer-history/CustomerLashPortfolioTab';
import { CustomerHistoryDiamondCard, CustomerHistoryVisitCard } from './customer-history/CustomerHistoryCards';
import { CustomerNotesTab } from './customer-history/CustomerNotesTab';
import { LashPhotoCompareLightbox, LashPhotoComparePayload } from './customer-history/LashPhotoCompareLightbox';
import { PostCheckoutCvlNoteModal } from '../screens/post-checkout/PostCheckoutCvlNoteModal';

interface CustomerHistoryAndSpendingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Partial<IosBookingItem> & Pick<IosBookingItem, 'id' | 'customerName'>;
  initialTab?: IosCustomerHistoryTab;
  isSimulationMode?: boolean;
  customerFacingMode?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onNoteCreated?: (note: IosCustomerNoteItem) => void;
}

const TAB_CONFIG: Array<{ key: IosCustomerHistoryTab; label: string }> = [
  { key: 'LASH_PHOTOS', label: 'BỘ MI' },
  { key: 'ALL', label: 'TẤT CẢ' },
  { key: 'PAYMENTS', label: 'THANH TOÁN' },
  { key: 'FIX', label: 'FIX' },
  { key: 'REWARDS', label: 'THƯỞNG' },
  { key: 'NOTES', label: 'GHI CHÚ' },
];

const formatVnd = (val: number) => `${Math.round(val || 0).toLocaleString('vi-VN')} đ`;

export const CustomerHistoryAndSpendingSheet: React.FC<CustomerHistoryAndSpendingSheetProps> = ({
  isOpen,
  onClose,
  booking,
  initialTab = 'LASH_PHOTOS',
  isSimulationMode = false,
  customerFacingMode = false,
  primaryActionLabel,
  onPrimaryAction,
  onNoteCreated,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<IosCustomerHistoryTab>(initialTab);
  const [data, setData] = useState<IosCustomerHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightboxPayload, setLightboxPayload] = useState<LashPhotoComparePayload | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

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
  const customerNotes = data?.notes || booking.cvlNotes || [];
  const birthdayStatus = getCustomerBirthdayThisMonthStatus(data?.customerDateOfBirth ?? booking.customerDateOfBirth);
  const effectiveTab: IosCustomerHistoryTab = customerFacingMode ? 'LASH_PHOTOS' : activeTab;

  const getTabCount = (key: IosCustomerHistoryTab) => {
    if (key === 'LASH_PHOTOS') return visits.length || (booking.lashHistory?.length ?? 0);
    if (key === 'ALL') return visits.length;
    if (key === 'PAYMENTS') return payments.length;
    if (key === 'FIX') return fixVisits.length;
    if (key === 'NOTES') return customerNotes.length;
    return diamondTxns.length;
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
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
                    {birthdayStatus.normalizedDob && (
                      <>
                        <span>·</span>
                        <span
                          data-testid="customer-history-birthday"
                          className={`inline-flex items-center gap-1 font-semibold ${
                            birthdayStatus.isBirthdayThisMonth
                              ? isDark
                                ? 'text-amber-300'
                                : 'text-amber-700'
                              : ''
                          }`}
                        >
                          <Cake className="h-3 w-3 shrink-0" />
                          <span>{birthdayStatus.ddMm}</span>
                        </span>
                      </>
                    )}
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
                className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <span>Tổng {summary?.totalBookings ?? 0} lịch</span>
                <span>·</span>
                <span className="text-amber-500 font-semibold">💎 {summary?.diamondBalance ?? 0} KC</span>
                {(summary?.totalDebt ?? 0) > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-rose-500 font-bold">Nợ {formatVnd(summary!.totalDebt)}</span>
                  </>
                )}
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
              className={`grid grid-cols-6 gap-1 rounded-xl p-1 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}
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
          ) : !booking?.customerId || booking.customerId <= 0 ? (
            <div
              data-testid="history-missing-customer-id"
              className={`rounded-2xl border p-5 text-center text-xs ${
                isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              Chưa có mã hồ sơ khách hàng trên hệ thống (khách mới hoặc lịch nháp chưa liên kết ID).
            </div>
          ) : (
            <>
              {effectiveTab === 'ALL' &&
                (visits.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Chưa ghi nhận lịch sử ghé thăm nào.
                  </p>
                ) : (
                  visits.map((v, i) => (
                    <CustomerHistoryVisitCard
                      key={`ALL-${v.orderId}-${i}`}
                      item={v}
                      index={i}
                      mode="ALL"
                      isDark={isDark}
                    />
                  ))
                ))}

              {effectiveTab === 'PAYMENTS' &&
                (payments.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Chưa có giao dịch thanh toán nào.
                  </p>
                ) : (
                  payments.map((v, i) => (
                    <CustomerHistoryVisitCard
                      key={`PAYMENTS-${v.orderId}-${i}`}
                      item={v}
                      index={i}
                      mode="PAYMENTS"
                      isDark={isDark}
                    />
                  ))
                ))}

              {effectiveTab === 'FIX' &&
                (fixVisits.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Khách hàng chưa có lượt FIX / bảo hành nào.
                  </p>
                ) : (
                  fixVisits.map((v, i) => (
                    <CustomerHistoryVisitCard
                      key={`FIX-${v.orderId}-${i}`}
                      item={v}
                      index={i}
                      mode="FIX"
                      isDark={isDark}
                    />
                  ))
                ))}

              {effectiveTab === 'REWARDS' &&
                (diamondTxns.length === 0 ? (
                  <p className={`py-8 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Chưa có lịch sử tích / sử dụng Kim Cương.
                  </p>
                ) : (
                  diamondTxns.map((tx, i) => (
                    <CustomerHistoryDiamondCard key={`diamond-${tx.id}-${i}`} tx={tx} isDark={isDark} />
                  ))
                ))}

              {effectiveTab === 'NOTES' && (
                <CustomerNotesTab
                  notes={customerNotes}
                  isDark={isDark}
                  canAddNote={Boolean(booking?.customerId && booking.customerId > 0)}
                  onOpenAddModal={() => setIsAddNoteOpen(true)}
                />
              )}
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
      {booking?.customerId && booking.customerId > 0 && (
        <PostCheckoutCvlNoteModal
          isOpen={isAddNoteOpen}
          onClose={() => setIsAddNoteOpen(false)}
          customerId={booking.customerId}
          customerName={data?.customerName || booking.customerName || 'Khách hàng'}
          bookingId={booking.id}
          orderNumber={booking.orderNumber}
          isSimulationMode={Boolean(isSimulationMode || booking.isSimulationBooking)}
          onNoteCreated={(created) => {
            setData((prev) => (prev ? { ...prev, notes: [created, ...(prev.notes || [])] } : prev));
            onNoteCreated?.(created);
          }}
        />
      )}
    </div>
  );
};
