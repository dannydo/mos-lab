'use client';

import React, { useEffect, useState } from 'react';
import { X, Search, UserPlus, Users, Clock, Calendar, Check, Sparkles, FlaskConical, Loader2 } from 'lucide-react';
import type { IosBookingItem, IosBookingServiceCatalogItem, IosCustomerLookupCandidate } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useTheme } from '../../../../../context/ThemeContext';

const TIME_SLOT_PRESETS = ['09:30', '11:00', '13:30', '15:00', '17:00', '19:00'];

const DEFAULT_BOOKING_SERVICES: IosBookingServiceCatalogItem[] = [
  { serviceId: 101, serviceName: 'Classic 1D', serviceGroup: 'Lashes', price: 550000, durationMinute: 90 },
  { serviceId: 102, serviceName: 'Flawless Mink 1D', serviceGroup: 'Lashes', price: 880000, durationMinute: 70 },
  { serviceId: 103, serviceName: 'HyperLight 3X', serviceGroup: 'Lashes', price: 660000, durationMinute: 70 },
  { serviceId: 104, serviceName: 'HyperLight 4X', serviceGroup: 'Lashes', price: 770000, durationMinute: 70 },
  { serviceId: 105, serviceName: 'UltraLight 3D', serviceGroup: 'Lashes', price: 550000, durationMinute: 60 },
];

interface IosCreateBookingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulationMode: boolean;
  selectedStoreId: number;
  branchName?: string;
  targetDate: string;
  actorStaffId?: number;
  onCreated: (booking?: IosBookingItem) => void;
}

export function IosCreateBookingSheet({
  isOpen,
  onClose,
  isSimulationMode,
  selectedStoreId,
  branchName,
  targetDate,
  actorStaffId,
  onCreated,
}: IosCreateBookingSheetProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [customerMode, setCustomerMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<IosCustomerLookupCandidate[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<IosCustomerLookupCandidate | null>(null);

  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [services, setServices] = useState<IosBookingServiceCatalogItem[]>(DEFAULT_BOOKING_SERVICES);
  const [selectedService, setSelectedService] = useState<IosBookingServiceCatalogItem>(DEFAULT_BOOKING_SERVICES[0]);
  const [dateStr, setDateStr] = useState(targetDate);
  const [timeSlot, setTimeSlot] = useState('15:00');
  const [bookingNote, setBookingNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDateStr(targetDate);
    setErrorMsg(null);
    let cancelled = false;

    void apiClient.ios
      .getServiceCatalog()
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.services) && res.services.length > 0) {
          setServices(res.services);
          setSelectedService(res.services[0]);
        }
      })
      .catch(() => {
        // Fallback catalog already preloaded
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetDate]);

  useEffect(() => {
    if (!isOpen || customerMode !== 'EXISTING') return;
    let cancelled = false;
    const trimmed = searchQuery.trim();
    const timer = setTimeout(() => {
      setLookupLoading(true);
      void apiClient.ios
        .lookupCustomers(trimmed)
        .then((res) => {
          if (!cancelled && res.success && Array.isArray(res.customers)) {
            setLookupResults(res.customers);
          }
        })
        .catch(() => {
          if (!cancelled) setLookupResults([]);
        })
        .finally(() => {
          if (!cancelled) setLookupLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, customerMode, searchQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (customerMode === 'EXISTING' && !selectedCandidate) {
      setErrorMsg('Vui lòng chọn 1 khách quen từ danh sách tìm kiếm.');
      return;
    }
    if (customerMode === 'NEW' && !newCustomerName.trim()) {
      setErrorMsg('Vui lòng nhập họ tên khách hàng mới.');
      return;
    }
    if (!isSimulationMode && customerMode === 'NEW' && !newCustomerPhone.trim()) {
      setErrorMsg('Tạo lịch thực tế cần nhập số điện thoại khách hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.ios.createBooking({
        simulationMode: isSimulationMode,
        storeId: selectedStoreId,
        date: dateStr || targetDate,
        timeSlot: timeSlot || '15:00',
        customerMode,
        existingCustomerId: customerMode === 'EXISTING' ? selectedCandidate?.customerId : undefined,
        customerName: customerMode === 'EXISTING' ? selectedCandidate?.fullName : newCustomerName.trim(),
        customerPhone: customerMode === 'NEW' ? newCustomerPhone.trim() || undefined : undefined,
        serviceId: selectedService.serviceId,
        serviceName: selectedService.serviceName,
        servicePrice: selectedService.price,
        serviceDuration: selectedService.durationMinute,
        assignedStaffId: actorStaffId,
        bookingNote: bookingNote.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Không thể tạo lịch hẹn. Vui lòng thử lại.');
        return;
      }
      onCreated(res.booking);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Lỗi kết nối khi tạo lịch hẹn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[430px] max-h-[90dvh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? 'bg-[#141414] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header with Right/End Close Button (Drawer Close Button Placement Invariant) */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isSimulationMode ? (
                <FlaskConical className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <h3 className="text-[14px] font-black truncate">
                {isSimulationMode ? 'Đặt Lịch Mô Phỏng (Sandbox)' : 'Tạo Lịch Hẹn Thực Tế'}
              </h3>
            </div>
            <p className={`text-[11px] truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {branchName || 'Wings Lashes'} ·{' '}
              {isSimulationMode ? 'An toàn 100% · Không ghi vào dữ liệu thật' : 'Lưu trực tiếp vào hàng đợi sảnh'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Customer Type Tabs */}
          <div
            className={`grid grid-cols-2 gap-1 p-1 rounded-2xl border ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setCustomerMode('EXISTING')}
              className={`py-2 px-3 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                customerMode === 'EXISTING'
                  ? 'bg-[#FFB400] text-black shadow-xs'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Khách Quen (MySQL)</span>
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('NEW')}
              className={`py-2 px-3 rounded-xl text-[12px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                customerMode === 'NEW'
                  ? 'bg-[#FFB400] text-black shadow-xs'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Khách Mới (Lần 1)</span>
            </button>
          </div>

          {customerMode === 'EXISTING' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tên khách (vd: Ngọc Phạm) hoặc 4 số cuối SĐT..."
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-[12.5px] font-medium focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400'
                  }`}
                />
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                {lookupLoading ? (
                  <div className="py-5 text-center text-[11.5px] text-neutral-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Đang tìm khách hàng real-time...</span>
                  </div>
                ) : lookupResults.length === 0 ? (
                  <div className="py-4 text-center text-[11.5px] text-neutral-400">
                    Chưa thấy khách phù hợp. Thử nhập tên khác hoặc chọn &ldquo;Khách Mới (Lần 1)&rdquo;.
                  </div>
                ) : (
                  lookupResults.map((c) => {
                    const active = selectedCandidate?.customerId === c.customerId;
                    return (
                      <button
                        key={c.customerId}
                        type="button"
                        onClick={() => setSelectedCandidate(c)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-amber-950/50 border-amber-400 text-white'
                              : 'bg-amber-50 border-amber-500 text-neutral-900'
                            : isDark
                              ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                              : 'bg-white border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-black truncate">{c.fullName}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 tabular-nums leading-none">
                              Lần {Math.max(1, c.customerVisits || 1)}
                            </span>
                            {c.hasActiveCombo && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 tabular-nums leading-none">
                                Combo {c.remainingSessions ?? 0}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}
                          >
                            {c.maskedPhone} · {c.naturalLashRecorded ? 'Đã có hồ sơ mi thật' : 'Chưa đo mi thật'}
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold mb-1 opacity-75">Tên khách hàng mới *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ví dụ: Chị Bảo Ngọc (Tập luyện)"
                  className={`w-full px-3 py-2.5 rounded-xl border text-[12.5px] font-semibold focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1 opacity-75">
                  Số điện thoại {isSimulationMode ? '(Tùy chọn trong Mô phỏng)' : '*'}
                </label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="090xxxxxxx"
                  className={`w-full px-3 py-2.5 rounded-xl border text-[12.5px] font-semibold tabular-nums focus:outline-none focus:border-amber-500 ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Service Selection */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider opacity-70">
              Dịch vụ nối mi dự kiến
            </label>
            <div className="max-h-36 overflow-y-auto grid grid-cols-1 gap-1.5 pr-0.5">
              {services.slice(0, 12).map((svc) => {
                const active = selectedService.serviceId === svc.serviceId;
                return (
                  <button
                    key={svc.serviceId}
                    type="button"
                    onClick={() => setSelectedService(svc)}
                    className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-amber-950/40 border-amber-400 text-white'
                          : 'bg-amber-50 border-amber-500 text-neutral-900'
                        : isDark
                          ? 'bg-neutral-900/60 border-neutral-800 text-neutral-200'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold truncate">{svc.serviceName}</div>
                      <div className="text-[10px] opacity-70 tabular-nums">{svc.durationMinute} phút</div>
                    </div>
                    <span className="text-[12px] font-black text-amber-500 tabular-nums shrink-0">
                      {svc.price.toLocaleString('vi-VN')}đ
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold opacity-75 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3" /> Ngày hẹn
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-[12px] font-bold tabular-nums focus:outline-none ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold opacity-75 flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3" /> Giờ hẹn
                </label>
                <input
                  type="time"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-[12px] font-bold tabular-nums focus:outline-none ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_SLOT_PRESETS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums border cursor-pointer transition-all ${
                    timeSlot === slot
                      ? 'bg-[#FFB400] text-black border-amber-500'
                      : isDark
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-bold mb-1 opacity-75">Ghi chú lịch hẹn</label>
            <input
              type="text"
              value={bookingNote}
              onChange={(e) => setBookingNote(e.target.value)}
              placeholder="Ví dụ: Khách hẹn dặm nhẹ, ưu tiên tư vấn dưỡng mi..."
              className={`w-full px-3 py-2 rounded-xl border text-[12px] focus:outline-none focus:border-amber-500 ${
                isDark
                  ? 'bg-neutral-900 border-neutral-800 text-white'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900'
              }`}
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[11.5px] font-bold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] hover:bg-amber-400 text-black font-black text-[13.5px] shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang khởi tạo lịch hẹn...</span>
              </>
            ) : (
              <span>{isSimulationMode ? 'TẠO LỊCH MÔ PHỎNG NGAY →' : 'LƯU LỊCH HẸN THỰC TẾ →'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
