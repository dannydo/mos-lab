'use client';

import Link from 'next/link';
import { Button, DatePicker, Dropdown, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Maximize2,
  Minimize2,
  RotateCw,
  Settings,
  Sparkles,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';

interface TelesaleTargetHeaderProps {
  isDark: boolean;
  selectedMonth: string;
  availableMonths: string[];
  teamName?: string;
  refreshing: boolean;
  isFullscreen: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (newMonth: string) => void;
  onOpenTeamSelectModal: () => void;
  onOpenCloneModal: () => void;
  onOpenConfigModal: () => void;
  onOpenQuotesDrawer: () => void;
  onRefresh: () => void;
  onOpenTvMode: () => void;
  onToggleFullscreen: () => void;
}

export function TelesaleTargetHeader({
  isDark,
  selectedMonth,
  availableMonths,
  teamName,
  refreshing,
  isFullscreen,
  onPrevMonth,
  onNextMonth,
  onMonthChange,
  onOpenTeamSelectModal,
  onOpenCloneModal,
  onOpenConfigModal,
  onOpenQuotesDrawer,
  onRefresh,
  onOpenTvMode,
  onToggleFullscreen,
}: TelesaleTargetHeaderProps) {
  const [yearStr, monthNumStr] = selectedMonth.split('-');

  return (
    <header
      className={`relative overflow-hidden rounded-2xl px-3.5 py-1.5 backdrop-blur-xl shrink-0 transition-all ${
        isDark
          ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/30 border border-amber-500/40 shadow-xl'
          : 'bg-white/95 border border-slate-200/90 shadow-sm'
      }`}
    >
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        {/* Brand & Titles */}
        <div className="flex items-center gap-3">
          {/* Wing Logo Emblem */}
          <div
            className={`w-8 h-8 rounded-xl p-0.5 shrink-0 flex items-center justify-center shadow-md ${
              isDark
                ? 'bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 shadow-amber-500/20'
                : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/10'
            }`}
          >
            <div
              className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                isDark ? 'bg-zinc-950' : 'bg-white'
              }`}
            >
              <span className={`text-[10px] font-black font-mono ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                W
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline ${
                isDark ? 'text-amber-400' : 'text-amber-800'
              }`}
            >
              WAR ROOM TELESALES
            </span>
            <span className={`hidden sm:inline ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>•</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono border ${
                isDark
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              REALTIME
            </span>
          </div>

          {/* Month Navigator Group */}
          <div
            className={`inline-flex items-center gap-0.5 rounded-xl p-0.5 shadow-inner border ${
              isDark ? 'bg-black/60 border-amber-500/40' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <Button
              type="text"
              size="small"
              icon={<ChevronLeft className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-slate-600'}`} />}
              onClick={onPrevMonth}
              className={`!rounded-lg !h-6 !w-6 !p-0 flex items-center justify-center ${
                isDark ? '!text-amber-400 hover:!bg-amber-500/20' : '!text-slate-600 hover:!bg-slate-200'
              }`}
              title="Tháng trước"
            />

            <Dropdown
              menu={{
                items: availableMonths.map((m) => ({
                  key: m,
                  label: (
                    <span
                      className={`font-mono text-xs flex items-center justify-between gap-4 ${
                        m === selectedMonth ? 'font-bold text-amber-500' : ''
                      }`}
                    >
                      <span>
                        Tháng {m.split('-')[1]}/{m.split('-')[0]}
                      </span>
                      {m === '2026-10' && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isDark ? 'text-zinc-400 bg-zinc-800' : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          Chuẩn
                        </span>
                      )}
                      {m === selectedMonth && <span className="text-amber-500 text-xs">●</span>}
                    </span>
                  ),
                  onClick: () => onMonthChange(m),
                })),
              }}
              trigger={['click']}
            >
              <button
                type="button"
                className={`px-2 py-0.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-700/20 hover:from-amber-500/30 hover:to-amber-700/30 text-amber-300 border-amber-500/30'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                }`}
              >
                <Calendar className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span>
                  T{monthNumStr}/{yearStr}
                </span>
                <span className={`text-[9px] ${isDark ? 'text-amber-400/80' : 'text-slate-400'}`}>▼</span>
              </button>
            </Dropdown>

            <Button
              type="text"
              size="small"
              icon={<ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-slate-600'}`} />}
              onClick={onNextMonth}
              className={`!rounded-lg !h-6 !w-6 !p-0 flex items-center justify-center ${
                isDark ? '!text-amber-400 hover:!bg-amber-500/20' : '!text-slate-600 hover:!bg-slate-200'
              }`}
              title="Tháng sau"
            />
          </div>

          {/* Calendar MonthPicker */}
          <DatePicker
            picker="month"
            format="MM/YYYY"
            value={dayjs(`${selectedMonth}-01`)}
            onChange={(d: Dayjs | null) => d && d.isValid() && onMonthChange(d.format('YYYY-MM'))}
            allowClear={false}
            className={`!h-6 !rounded-lg !text-[11px] font-mono w-24 text-center hidden md:inline-flex ${
              isDark
                ? '!bg-zinc-900/80 !border-zinc-700 hover:!border-amber-500/40 !text-zinc-200'
                : '!bg-white !border-slate-200 hover:!border-amber-400 !text-slate-700 shadow-2xs'
            }`}
            placeholder="Chọn tháng"
          />
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Quay về BK */}
          <Tooltip title="Quay về trang Quản lý BK">
            <Link href="/dashboard/bk">
              <button
                type="button"
                aria-label="Về BK"
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-2xs'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="sr-only">Về BK</span>
              </button>
            </Link>
          </Tooltip>

          {/* Khung Năng Lực Telesales */}
          <Tooltip title="Khung Năng Lực & Thăng/Giáng Bậc Telesales">
            <Link href="/dashboard/telesale-competency">
              <button
                type="button"
                aria-label="Khung Năng Lực"
                className={`h-7 px-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                    : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 shadow-2xs'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-semibold">Khung Năng Lực</span>
              </button>
            </Link>
          </Tooltip>

          {/* 2. Bộ chọn Đội nhóm (Team Selector) */}
          <Tooltip title="Chọn Đội nhóm áp dụng làm nguồn nhân sự cho War Room">
            <button
              type="button"
              aria-label={`Team: ${teamName || 'Telesales'}`}
              onClick={onOpenTeamSelectModal}
              className={`h-7 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-700 hover:text-amber-800 shadow-2xs'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                Team:{' '}
                <strong className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  {teamName || 'Telesales'}
                </strong>
              </span>
            </button>
          </Tooltip>

          <span className={`w-px h-4 shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          {/* 3. Sao chép chỉ tiêu */}
          <Tooltip title="Sao chép toàn bộ chỉ tiêu kế hoạch sang tháng mới">
            <button
              type="button"
              aria-label="Sao chép"
              onClick={onOpenCloneModal}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-400 hover:text-amber-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-600 hover:text-amber-800 shadow-2xs'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="sr-only">Sao chép</span>
            </button>
          </Tooltip>

          {/* 4. Cài đặt KPI */}
          <Tooltip title="Cài đặt chỉ tiêu Done của 4 nhóm khách hàng và KPI Team">
            <button
              type="button"
              aria-label="Cài đặt KPI"
              onClick={onOpenConfigModal}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-400 hover:text-amber-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-600 hover:text-amber-800 shadow-2xs'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="sr-only">Cài Đặt KPI</span>
            </button>
          </Tooltip>

          {/* Quản lý thông điệp cổ vũ TV */}
          <Tooltip title="Quản lý kho câu thoại cổ vũ & phát loa TV">
            <button
              type="button"
              aria-label="Thông điệp cổ vũ"
              onClick={onOpenQuotesDrawer}
              className={`h-7 px-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                  : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 shadow-2xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold hidden md:inline">Thông Điệp TV</span>
            </button>
          </Tooltip>

          {/* 5. Cập nhật số liệu tức thì (Refresh) */}
          <Tooltip title="Cập nhật số liệu tức thì">
            <button
              type="button"
              aria-label="Làm mới"
              onClick={onRefresh}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
              <span className="sr-only">Làm mới</span>
            </button>
          </Tooltip>

          <span className={`w-px h-4 shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          {/* 6. TV Monitor Hero Button */}
          <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
            <button
              type="button"
              aria-label="TV Monitor"
              onClick={onOpenTvMode}
              className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-400 text-amber-300 hover:text-amber-200 shadow-sm shadow-amber-500/10'
                  : 'border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 text-amber-800 hover:text-amber-900 shadow-2xs'
              }`}
            >
              <Tv className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="text-[11px] font-bold">TV Monitor</span>
            </button>
          </Tooltip>

          {/* 7. Toàn màn hình trình duyệt */}
          <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}>
            <button
              type="button"
              aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              onClick={onToggleFullscreen}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-2xs'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="sr-only">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
