'use client';

import React from 'react';
import {
  BarChart3,
  CalendarPlus,
  Camera,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  LogOut,
  MessageSquareWarning,
  Phone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { IosSimulationMenteeOption } from '@mos-lab/shared';
import { openBugReport } from '../../../lib/bug-diagnostics';
import type { UnifiedProfileAppContext } from './types';

interface StandardActionButtonProps {
  isDark: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  iconBgClassName: string;
  title: string;
  subtitle: string;
  trailing?: React.ReactNode;
  dataUserMenuBugReport?: boolean;
}

const StandardActionButton: React.FC<StandardActionButtonProps> = ({
  isDark,
  onClick,
  icon,
  iconBgClassName,
  title,
  subtitle,
  trailing,
  dataUserMenuBugReport,
}) => (
  <button
    type="button"
    data-user-menu-bug-report={dataUserMenuBugReport || undefined}
    onClick={onClick}
    className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
      isDark
        ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
        : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
    }`}
  >
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBgClassName}`}>{icon}</div>
      <div>
        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>{title}</div>
        <div className="text-[10.5px] text-neutral-400">{subtitle}</div>
      </div>
    </div>
    {trailing ?? <ChevronRight className="w-4 h-4 text-neutral-400" />}
  </button>
);

export interface ProfileActionRowsProps {
  isDark: boolean;
  appContext: UnifiedProfileAppContext;
  isCv: boolean;
  isSimulationMode: boolean;
  onToggleSimulationMode?: () => void;
  menteesList: IosSimulationMenteeOption[];
  selectedMenteeStaffId?: number;
  onSelectMentee?: (staffId: number | undefined) => void;
  onOpenCreateBooking?: () => void;
  onOpenPaystub?: () => void;
  dailyCallsCount: number;
  onOpenDailyCalls?: () => void;
  onOpenTelesalesDashboard?: () => void;
  bugAttentionCount: number;
  onOpenAvatarCrop: () => void;
  onClose: () => void;
  onLogout: () => Promise<void> | void;
}

export const ProfileActionRows: React.FC<ProfileActionRowsProps> = ({
  isDark,
  appContext,
  isCv,
  isSimulationMode,
  onToggleSimulationMode,
  menteesList,
  selectedMenteeStaffId,
  onSelectMentee,
  onOpenCreateBooking,
  onOpenPaystub,
  dailyCallsCount,
  onOpenDailyCalls,
  onOpenTelesalesDashboard,
  bugAttentionCount,
  onOpenAvatarCrop,
  onClose,
  onLogout,
}) => {
  return (
    <div className="space-y-1.5 pt-0.5">
      {appContext === 'ios' && onToggleSimulationMode && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onToggleSimulationMode();
          }}
          className={`w-full p-2.5 rounded-2xl active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border text-left ${
            isSimulationMode
              ? isDark
                ? 'bg-amber-950/60 hover:bg-amber-950/80 border-amber-500/50 text-amber-100'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-950'
              : isDark
                ? 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800/80 text-white'
                : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>Phòng Tập Luyện (Mô Phỏng)</span>
                <span
                  className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                    isSimulationMode
                      ? 'bg-amber-500 text-black'
                      : isDark
                        ? 'bg-neutral-800 text-amber-400'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isSimulationMode ? 'ĐANG BẬT' : 'SANDBOX'}
                </span>
              </div>
              <div className="text-[10.5px] text-neutral-400">
                {isSimulationMode
                  ? 'Bấm để thoát Mô phỏng · Quay về sảnh thật'
                  : 'Thực hành tư vấn, checkout & Revert thoải mái trên data thật'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>
      )}

      {appContext === 'ios' && isSimulationMode && menteesList.length > 0 && onSelectMentee && (
        <div
          className={`w-full p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${
            isDark ? 'bg-pink-500/10 border-pink-400/30 text-pink-100' : 'bg-pink-50 border-pink-300 text-pink-950'
          }`}
        >
          <span className="text-[11px] font-bold shrink-0">Xem bài tập:</span>
          <div className="relative flex-1 max-w-[210px]">
            <select
              value={selectedMenteeStaffId ? String(selectedMenteeStaffId) : ''}
              onChange={(e) => {
                const val = e.target.value;
                onSelectMentee(val ? Number(val) : undefined);
                onClose();
              }}
              className={`w-full appearance-none pl-2.5 pr-6 py-1 rounded-xl text-[11px] font-bold border truncate cursor-pointer focus:outline-none ${
                isDark ? 'bg-neutral-900 border-pink-400/35 text-pink-200' : 'bg-white border-pink-300 text-neutral-900'
              }`}
              aria-label="Chọn bài tập mô phỏng trong menu"
            >
              <option value="">Sandbox của tôi</option>
              {menteesList.map((m) => (
                <option key={m.menteeStaffId} value={String(m.menteeStaffId)}>
                  {m.menteeName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
          </div>
        </div>
      )}

      {appContext === 'ios' && onOpenCreateBooking && (
        <StandardActionButton
          isDark={isDark}
          onClick={() => {
            onClose();
            onOpenCreateBooking();
          }}
          icon={<CalendarPlus className="w-4 h-4" />}
          iconBgClassName="bg-emerald-500/15 text-emerald-500"
          title={isSimulationMode ? 'Đặt Lịch Mô Phỏng (+ Khách Mới / Quen)' : 'Tạo Lịch Hẹn Khách Mới / Khách Quen'}
          subtitle={
            isSimulationMode
              ? 'Tạo lịch tập luyện trong Sandbox không ghi MySQL'
              : 'Thêm nhanh booking vào hàng đợi Chờ đón'
          }
        />
      )}

      {appContext === 'ios' && onOpenPaystub && (
        <StandardActionButton
          isDark={isDark}
          onClick={() => {
            onClose();
            onOpenPaystub();
          }}
          icon={<Wallet className="w-4 h-4" />}
          iconBgClassName="bg-amber-400/10 text-amber-500"
          title="Thu nhập tạm tính"
          subtitle="Xem bảng kê ca làm & thưởng"
        />
      )}

      {appContext === 'general' && !isCv && onOpenDailyCalls && (
        <StandardActionButton
          isDark={isDark}
          onClick={() => {
            onClose();
            onOpenDailyCalls();
          }}
          icon={<Phone className="w-4 h-4" />}
          iconBgClassName="bg-emerald-500/15 text-emerald-500"
          title="Cuộc gọi hôm nay"
          subtitle="Nhật ký cuộc gọi tổng đài trong ngày"
          trailing={
            <span className="inline-flex items-center gap-1.5">
              {dailyCallsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                  {dailyCallsCount} cuộc
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </span>
          }
        />
      )}

      {appContext === 'general' && !isCv && onOpenTelesalesDashboard && (
        <StandardActionButton
          isDark={isDark}
          onClick={() => {
            onClose();
            onOpenTelesalesDashboard();
          }}
          icon={<BarChart3 className="w-4 h-4" />}
          iconBgClassName="bg-amber-500/15 text-amber-500"
          title="KPI Đội Telesales"
          subtitle="Hiệu suất gọi & chuyển đổi"
        />
      )}

      {/* Shared Core: Đổi ảnh đại diện (AI Coach) */}
      <StandardActionButton
        isDark={isDark}
        onClick={onOpenAvatarCrop}
        icon={<Camera className="w-4 h-4" />}
        iconBgClassName="bg-amber-500/15 text-amber-500"
        title="Đổi ảnh đại diện"
        subtitle="Cập nhật & chấm điểm chân dung chuẩn Wings"
        trailing={
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25 shrink-0">
            <Sparkles className="w-2.5 h-2.5" /> AI Coach
          </span>
        }
      />

      {/* Shared Core: Báo lỗi / Góp ý */}
      {!isCv && (
        <StandardActionButton
          isDark={isDark}
          dataUserMenuBugReport={true}
          onClick={() => {
            onClose();
            openBugReport(undefined, { preferHistoryIfPending: true });
          }}
          icon={<MessageSquareWarning className="w-4 h-4" />}
          iconBgClassName="bg-amber-500/15 text-amber-500"
          title="Báo lỗi / Góp ý"
          subtitle="Gửi phản hồi & theo dõi tiến độ xử lý"
          trailing={
            <span className="inline-flex items-center gap-1.5">
              {bugAttentionCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/25">
                  {bugAttentionCount > 99 ? '99+' : bugAttentionCount} mới
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </span>
          }
        />
      )}

      {/* Shared Core: Đăng xuất tài khoản */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer border border-rose-500/20 text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-rose-500">Đăng xuất tài khoản (Logout)</div>
            <div className="text-[10.5px] text-neutral-400">Thoát phiên làm việc & về màn hình Đăng nhập</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-rose-400/50 group-hover:text-rose-500 transition-colors" />
      </button>
    </div>
  );
};
