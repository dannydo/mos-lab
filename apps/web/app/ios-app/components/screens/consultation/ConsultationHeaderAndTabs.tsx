'use client';

import React from 'react';
import { AlertTriangle, Sparkles, Check, Eye, Lock, Sliders, Save, Loader2, CloudOff } from 'lucide-react';
import { CustomerAvatarPicker } from '../../ui-kit/CustomerAvatarPicker';
import type { BookingItem } from '../../../state/mockData';
import type { ConsultationSaveStatus } from './ConsultationTypes';

interface ConsultationAutoSaveButtonProps {
  saveStatus: ConsultationSaveStatus;
  isDark: boolean;
  onManualSaveClick: () => void;
}

export function ConsultationAutoSaveButton({ saveStatus, isDark, onManualSaveClick }: ConsultationAutoSaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onManualSaveClick}
      className={`py-1 px-2.5 min-w-[78px] rounded-full inline-flex items-center justify-center leading-none gap-1.5 transition-colors duration-200 cursor-pointer active:scale-95 ${
        saveStatus === 'saving'
          ? 'bg-amber-500/15 border border-amber-500/30 text-[#FFB400] shadow-[0_0_10px_rgba(255,180,0,0.2)]'
          : saveStatus === 'saved'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            : saveStatus === 'error'
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
              : isDark
                ? 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white'
                : 'bg-white border border-neutral-200 text-neutral-700 hover:text-black'
      }`}
      title={
        saveStatus === 'saving'
          ? 'Đang tự động lưu...'
          : saveStatus === 'saved'
            ? 'Đã tự động lưu nháp'
            : saveStatus === 'error'
              ? 'Lỗi khi lưu - Chạm để thử lại'
              : 'Chạm để lưu nháp ngay'
      }
      aria-label="Trạng thái tự động lưu"
    >
      {saveStatus === 'saving' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-[#FFB400]" />
          <span className="text-[11.5px] font-bold tabular-nums">Đang lưu</span>
        </>
      ) : saveStatus === 'saved' ? (
        <>
          <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0 text-emerald-400" />
          <span className="text-[11.5px] font-bold text-emerald-400">Đã lưu</span>
        </>
      ) : saveStatus === 'error' ? (
        <>
          <CloudOff className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span className="text-[11.5px] font-bold text-rose-400">Thử lại</span>
        </>
      ) : (
        <>
          <Save className="w-3.5 h-3.5 shrink-0 text-emerald-400/90" />
          <span className="text-[11.5px] font-medium text-emerald-400">Đã lưu</span>
        </>
      )}
    </button>
  );
}

interface ConsultationHeaderAndTabsProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  actorName: string;
  avatarRingClass: string;
  onUpdateAvatar?: (avatarUrl: string, targetBookingId?: number) => Promise<any> | void;
  isNewClient: boolean;
  mustCompleteNaturalLashBeforeProceeding: boolean;
  showMandatoryLashCheckAlert: boolean;
  isNaturalLashComplete: boolean;
  missingNaturalLashFields: string[];
  completedNaturalLashCount: number;
  naturalCountLabel: string | null;
  naturalLengthLabel: string | null;
  naturalThicknessLabel: string | null;
  activeSubTab: 'SPECS' | 'PROFILE';
  setActiveSubTab: (tab: 'SPECS' | 'PROFILE') => void;
  triggerMandatoryLashCheckGuard: () => void;
  showStaffRewards?: boolean;
}

export function ConsultationHeaderAndTabs({
  isDark,
  booking,
  customerName,
  customerPhone,
  serviceName,
  actorName,
  avatarRingClass,
  onUpdateAvatar,
  isNewClient,
  mustCompleteNaturalLashBeforeProceeding,
  showMandatoryLashCheckAlert,
  isNaturalLashComplete,
  missingNaturalLashFields,
  completedNaturalLashCount,
  naturalCountLabel,
  naturalLengthLabel,
  naturalThicknessLabel,
  activeSubTab,
  setActiveSubTab,
  triggerMandatoryLashCheckGuard,
  showStaffRewards = false,
}: ConsultationHeaderAndTabsProps) {
  return (
    <>
      {/* 1. Customer & Consultation Header Card */}
      <div
        className={`rounded-2xl p-3 shadow-xs border flex items-center gap-3 transition-colors ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
        }`}
      >
        <CustomerAvatarPicker
          avatarUrl={booking?.customerAvatar}
          customerName={customerName}
          customerPhone={customerPhone}
          avatarRingClass={avatarRingClass}
          size={46}
          onUpdateAvatar={async (newUrl) => {
            if (onUpdateAvatar) {
              await onUpdateAvatar(newUrl, booking?.id);
            }
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className={`text-[14px] font-bold truncate text-[var(--mos-text)]`}>{customerName}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums ${
                isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-gray-700'
              }`}
            >
              {customerPhone}
            </span>
            <span
              className={`text-[9.5px] px-2 py-0.5 rounded-full font-black ${
                isNewClient
                  ? isDark
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                  : isDark
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {isNewClient ? 'KHÁCH MỚI' : `LẦN ${booking?.customerVisits || 2}`}
            </span>
          </div>
          <div className={`text-[11.5px] mt-0.5 font-medium truncate text-[var(--mos-text-muted)]`}>
            Dịch vụ:{' '}
            <strong className={isDark ? 'text-white' : 'text-black'}>
              {serviceName.toLowerCase().includes('any') ? 'Chưa chọn mẫu mi' : serviceName}
            </strong>
            {showStaffRewards && (
              <>
                {' '}
                · In: <strong className="text-emerald-500">{actorName}</strong>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cảnh Báo Khách Mới Hoặc Tóm Tắt Mi Thật */}
      {mustCompleteNaturalLashBeforeProceeding ? (
        <div
          role={showMandatoryLashCheckAlert ? 'alert' : undefined}
          aria-live={showMandatoryLashCheckAlert ? 'assertive' : undefined}
          className={`border-2 rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2 transition-colors ${
            showMandatoryLashCheckAlert
              ? isDark
                ? 'border-rose-500 bg-gradient-to-r from-rose-950/60 to-amber-950/40'
                : 'border-rose-500 bg-gradient-to-r from-rose-50 to-amber-50'
              : isDark
                ? 'border-[#FFB400] bg-gradient-to-r from-amber-950/40 to-orange-950/30'
                : 'border-[#FFB400] bg-gradient-to-r from-amber-50 to-orange-50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                showMandatoryLashCheckAlert ? 'bg-rose-500 text-white' : 'bg-[#FFB400] text-black'
              }`}
            >
              {showMandatoryLashCheckAlert ? (
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-black" />
              )}
            </span>
            <div className="min-w-0">
              <div
                className={`text-[11px] font-black uppercase tracking-tight ${
                  showMandatoryLashCheckAlert
                    ? isDark
                      ? 'text-rose-300'
                      : 'text-rose-900'
                    : isDark
                      ? 'text-amber-300'
                      : 'text-amber-950'
                }`}
              >
                {showMandatoryLashCheckAlert
                  ? !isNaturalLashComplete
                    ? 'BẮT BUỘC ĐO & CHỌN ĐỦ 7 THÔNG SỐ MI THẬT!'
                    : 'BẮT BUỘC XÁC NHẬN KIỂM TRA MI THẬT TRƯỚC!'
                  : isNewClient
                    ? 'KHÁCH MỚI · BẮT BUỘC KIỂM TRA MI THẬT (KHÔNG MẶC ĐỊNH)'
                    : 'CHƯA CÓ HỒ SƠ MI THẬT · BẮT BUỘC KIỂM TRA ĐỦ 7 MỤC'}
              </div>
              <div
                className={`text-[10px] font-medium truncate ${
                  showMandatoryLashCheckAlert
                    ? isDark
                      ? 'text-rose-200/90'
                      : 'text-rose-800'
                    : isDark
                      ? 'text-amber-200/80'
                      : 'text-amber-800'
                }`}
              >
                {!isNaturalLashComplete
                  ? `Còn thiếu ${missingNaturalLashFields.length}/7 mục: ${missingNaturalLashFields.join(', ')}`
                  : 'Đã đo đủ 7/7 mục · Bấm xác nhận bên dưới để mở khóa Thiết kế mi'}
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold shrink-0 inline-flex items-center justify-center leading-none tabular-nums ${
              showMandatoryLashCheckAlert
                ? 'bg-rose-600 text-white'
                : isNaturalLashComplete
                  ? 'bg-emerald-500 text-black'
                  : 'bg-black text-[#FFB400]'
            }`}
          >
            {completedNaturalLashCount}/7
          </span>
        </div>
      ) : isNaturalLashComplete ? (
        <div
          className={`border rounded-2xl px-3 py-2 shadow-xs flex items-center justify-between gap-2 transition-colors ${
            isDark
              ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-100'
              : 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
            <div className="min-w-0">
              <div
                className={`text-[10.5px] font-black uppercase tracking-tight ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}
              >
                ĐÃ KIỂM TRA MI THẬT · ĐỦ ĐIỀU KIỆN THIẾT KẾ
              </div>
              <div
                className={`text-[10px] font-semibold truncate tabular-nums ${isDark ? 'text-emerald-200/80' : 'text-emerald-800'}`}
              >
                {naturalCountLabel} sợi · {naturalLengthLabel}mm · {naturalThicknessLabel}mm
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('PROFILE')}
            className={`font-bold text-[10.5px] hover:underline cursor-pointer shrink-0 ${
              isDark ? 'text-emerald-300' : 'text-emerald-800'
            }`}
          >
            Đo lại mi →
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl px-3 py-1.5 shadow-xs border flex items-center justify-between text-[11px] transition-colors ${
            isDark ? 'bg-[#1C1C1E] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-100 text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className={`font-medium shrink-0 text-[var(--mos-text-muted)]`}>Mi Thật:</span>
            {isNaturalLashComplete ? (
              <strong className={`font-extrabold truncate tabular-nums text-[var(--mos-text)]`}>
                {naturalCountLabel} sợi · {naturalLengthLabel}mm · {naturalThicknessLabel}mm
              </strong>
            ) : (
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full shrink-0 inline-flex items-center justify-center leading-none ${
                  isDark
                    ? 'text-amber-300 bg-amber-950/60 border border-amber-800'
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}
              >
                Chưa đo mi thật
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('PROFILE')}
            className={`font-bold text-[10.5px] hover:underline cursor-pointer shrink-0 ml-1.5 ${
              isDark ? 'text-[#FFB400]' : 'text-[#D97706]'
            }`}
          >
            {isNaturalLashComplete ? 'Đo lại mi →' : '+ Đo mi thật →'}
          </button>
        </div>
      )}

      {/* 2. Sub-tab Filter Segment Bar */}
      <div
        role="tablist"
        aria-label="Các bước tư vấn dáng mi"
        className={`p-1 rounded-xl shadow-xs border grid grid-cols-2 gap-1.5 transition-colors ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white/80 backdrop-blur-xs border-gray-200/80'
        }`}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'PROFILE'}
          onClick={() => setActiveSubTab('PROFILE')}
          className={`py-2 px-2 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1.5 leading-none relative cursor-pointer ${
            activeSubTab === 'PROFILE'
              ? isDark
                ? 'bg-[#2C2C2E] text-[#FFB400] shadow-xs'
                : 'bg-black text-[#FFB400] shadow-sm'
              : isDark
                ? 'text-neutral-400 hover:text-white'
                : 'text-gray-600 hover:text-black'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Kiểm Tra Mi Thật</span>
          {mustCompleteNaturalLashBeforeProceeding ? (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          ) : isNaturalLashComplete ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'SPECS'}
          aria-disabled={mustCompleteNaturalLashBeforeProceeding}
          title={
            mustCompleteNaturalLashBeforeProceeding
              ? 'Vui lòng đo & chọn đủ 7 thông số Kiểm Tra Mi Thật trước khi chuyển sang Thiết Kế Trên Mi Thật'
              : 'Thiết Kế Trên Mi Thật'
          }
          onClick={() => {
            if (mustCompleteNaturalLashBeforeProceeding) {
              triggerMandatoryLashCheckGuard();
              return;
            }
            setActiveSubTab('SPECS');
          }}
          className={`py-2 px-2 rounded-lg text-[11px] font-extrabold transition-all text-center flex items-center justify-center gap-1.5 leading-none cursor-pointer ${
            activeSubTab === 'SPECS'
              ? isDark
                ? 'bg-[#2C2C2E] text-[#FFB400] shadow-xs'
                : 'bg-black text-[#FFB400] shadow-sm'
              : mustCompleteNaturalLashBeforeProceeding
                ? isDark
                  ? 'text-neutral-500 opacity-75'
                  : 'text-gray-400 opacity-75'
                : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-gray-600 hover:text-black'
          }`}
        >
          {mustCompleteNaturalLashBeforeProceeding ? (
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          ) : (
            <Sliders className="w-3.5 h-3.5" />
          )}
          <span>Thiết Kế Trên Mi Thật</span>
        </button>
      </div>
    </>
  );
}
