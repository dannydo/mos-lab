'use client';

import React, { useMemo, useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { CvFeather1Badge, CvFeather2Badge } from '../ui-kit/CvFeatherLabels';
import { BookingItem, STAFF_QUEUE } from '../../state/mockData';
import { IosBranchConfig } from '../../state/useIosAppState';
import { Check } from 'lucide-react';

interface Screen04StaffQueueAssignProps {
  booking?: BookingItem;
  currentBranch?: IosBranchConfig;
  onBack: () => void;
  onAssign: (staffId: number, staffName: string, bed: string) => void;
}

interface QueueSpecialistOption {
  staffId: number;
  name: string;
  initials: string;
  bed: string;
  tierBadge: 'CVL' | 'CVLL' | null;
  isBooked: boolean;
  statusText: string;
  statusTone: 'ready' | 'busy' | 'waiting';
  metaText?: string;
}

export function Screen04StaffQueueAssign({ booking, currentBranch, onBack, onAssign }: Screen04StaffQueueAssignProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const queueOptions = useMemo<QueueSpecialistOption[]>(() => {
    const base: QueueSpecialistOption[] = STAFF_QUEUE.map((s, idx) => {
      const cleanName = s.name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      const words = cleanName.split(/\s+/).filter(Boolean);
      const initials = words
        .slice(-2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('');
      const bedLabel =
        Number(booking?.assignedStaffId) === s.id && booking?.assignedBed
          ? booking.assignedBed
          : s.bed || `Giường ${String(idx + 1).padStart(2, '0')}`;
      const isBooked =
        Number(booking?.assignedStaffId) === s.id ||
        (!booking?.assignedStaffId && !booking?.isUnassignedQueue && idx === 0);
      const tierBadge: 'CVL' | 'CVLL' | null = s.role.includes('CVLL') ? 'CVLL' : s.role.includes('CVL') ? 'CVL' : null;
      return {
        staffId: s.id,
        name: s.name,
        initials: initials || 'CV',
        bed: bedLabel,
        tierBadge,
        isBooked,
        statusText:
          s.status === 'READY'
            ? `● Sẵn sàng · ${bedLabel}`
            : s.status === 'BUSY'
              ? `Đang làm mi · ${bedLabel}`
              : 'Chờ ca tiếp theo',
        statusTone: s.status === 'READY' ? 'ready' : s.status === 'BUSY' ? 'busy' : 'waiting',
        metaText: `Đánh giá: ${s.rating.toFixed(2)} ★`,
      };
    });

    if (
      booking?.assignedStaffId &&
      booking.assignedStaffName &&
      !base.some((opt) => opt.staffId === Number(booking.assignedStaffId))
    ) {
      const words = booking.assignedStaffName.trim().split(/\s+/);
      const initials = words
        .slice(-2)
        .map((w) => w.charAt(0).toUpperCase())
        .join('');
      base.unshift({
        staffId: Number(booking.assignedStaffId),
        name: booking.assignedStaffName,
        initials: initials || 'CV',
        bed: booking.assignedBed || 'Giường 01',
        tierBadge: 'CVL',
        isBooked: true,
        statusText: `● Sẵn sàng · ${booking.assignedBed || 'Giường 01'}`,
        statusTone: 'ready',
        metaText: 'Chuyên viên khách đặt lịch trực tiếp',
      });
    }
    return base;
  }, [booking]);

  const [selectedStaffId, setSelectedStaffId] = useState<number>(() =>
    booking?.assignedStaffId ? Number(booking.assignedStaffId) : queueOptions[0]?.staffId || 46272
  );
  const [activeTab, setActiveTab] = useState<'LASHES' | 'LASH_LIFT' | 'NAILS' | 'ALL'>('LASHES');

  const selectedOption = queueOptions.find((opt) => opt.staffId === selectedStaffId) || queueOptions[0];

  const handleConfirm = () => {
    if (!selectedOption) return;
    onAssign(selectedOption.staffId, selectedOption.name, selectedOption.bed);
  };

  const branchLabel = (booking?.branchName || currentBranch?.shortName || 'Salon Đề Thám').toUpperCase();
  const appointmentTime = booking?.time12h || booking?.timeSlot?.split('-')[0]?.trim() || 'Hôm nay';
  const serviceDisplay = booking?.serviceName || 'Dịch vụ nối mi thiết kế';
  const requestedSpecialist = booking?.isUnassignedQueue
    ? 'Khách đầu tua sảnh (Chưa chỉ định)'
    : `Khách yêu cầu đích danh: CHUYÊN VIÊN ${(booking?.assignedStaffName || selectedOption?.name || 'THẢO LY').toUpperCase()}`;

  return (
    <div
      className={`flex-1 flex flex-col ${'bg-[var(--background)] text-[var(--mos-text)]'} overflow-y-auto select-none`}
    >
      <IosNavigationBar
        title="Assign Specialist"
        onBack={onBack}
        backTitle="Consultation"
        rightAction={
          <button
            onClick={handleConfirm}
            className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60 cursor-pointer"
          >
            Done
          </button>
        }
      />

      {/* Sub-navbar Category Tabs on Black */}
      <div className="bg-black px-3 pt-1 pb-2 flex items-center justify-between border-b border-neutral-900 shrink-0 text-[12px]">
        {(['LASHES', 'LASH_LIFT', 'NAILS', 'ALL'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="pb-1 relative font-bold cursor-pointer">
            <span className={activeTab === tab ? 'text-[#FFB400]' : 'text-neutral-400'}>
              {tab === 'LASH_LIFT' ? 'LASH LIFT' : tab}
            </span>
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FFB400]" />}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {/* Amber Notification Banner */}
        <div
          className={`${
            isDark ? 'bg-amber-950/30 border-amber-700/60' : 'bg-amber-50/70 border-amber-200'
          } border rounded-2xl p-3.5 shadow-xs`}
        >
          <div className={`text-[13px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'} leading-snug`}>
            {requestedSpecialist}
          </div>
          <div
            className={`text-[12px] ${isDark ? 'text-amber-200/80' : 'text-amber-700/90'} mt-0.5 font-medium tabular-nums`}
          >
            {booking?.customerName ? `${booking.customerName} · ` : ''}Ca hẹn {appointmentTime} · {serviceDisplay}
          </div>
        </div>

        {/* Section Header */}
        <div
          className={`text-[11px] font-semibold ${
            isDark ? 'text-neutral-400' : 'text-gray-500'
          } uppercase tracking-wider px-1 pt-1`}
        >
          HÀNG ĐỢI CHUYÊN VIÊN TẠI {branchLabel}
        </div>

        {/* Specialist Queue List */}
        <div
          className={`${
            isDark
              ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800'
              : 'bg-white border-neutral-100 divide-gray-100'
          } rounded-2xl shadow-sm border overflow-hidden divide-y`}
        >
          {queueOptions.map((opt) => {
            const isSelected = opt.staffId === selectedOption?.staffId;
            return (
              <div
                key={opt.staffId}
                onClick={() => setSelectedStaffId(opt.staffId)}
                data-testid={`assign-specialist-row-${opt.staffId}`}
                className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                  isDark ? 'active:bg-neutral-800/70 hover:bg-neutral-800/40' : 'active:bg-gray-50 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-base shrink-0 shadow-xs ${
                      isSelected
                        ? 'bg-[#FFB400] border-2 border-[#34C759] text-black'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-300'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {opt.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[15px] font-bold ${
                          isDark ? 'text-white' : 'text-black'
                        } inline-flex items-center gap-0.5`}
                      >
                        {opt.name}
                        {opt.tierBadge === 'CVLL' ? (
                          <>
                            {' '}
                            (<CvFeather2Badge />)
                          </>
                        ) : opt.tierBadge === 'CVL' ? (
                          <>
                            {' '}
                            (<CvFeather1Badge />)
                          </>
                        ) : null}
                      </span>
                      {opt.isBooked && (
                        <span className="bg-[#FF9500] text-black font-black text-[10px] px-1.5 py-0.5 rounded tracking-wider">
                          BOOKED
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[12px] font-medium mt-0.5 tabular-nums ${
                        opt.statusTone === 'ready'
                          ? 'text-[#34C759]'
                          : opt.statusTone === 'busy'
                            ? 'text-amber-500'
                            : isDark
                              ? 'text-neutral-400'
                              : 'text-gray-400'
                      }`}
                    >
                      {opt.statusText}
                    </div>
                    {opt.metaText && (
                      <div
                        className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-400'} mt-0.5 tabular-nums`}
                      >
                        {opt.metaText}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF9500] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full border-2 ${isDark ? 'border-neutral-600' : 'border-gray-300'}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Big Action Button */}
        <div className="pt-3">
          <button
            onClick={handleConfirm}
            data-testid="confirm-assign-specialist"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-bold text-[15px] shadow-md active:scale-98 transition-transform text-center cursor-pointer uppercase"
          >
            XÁC NHẬN GÁN CV {selectedOption?.name || 'THẢO LY'} ({selectedOption?.bed || 'GIƯỜNG 03'})
          </button>
        </div>
      </div>
    </div>
  );
}
