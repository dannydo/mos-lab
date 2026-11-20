'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { Award, Calendar, CheckCircle2, Clock, FileText, Users } from 'lucide-react';
import type {
  BkGameTeamBookingDoneBonusDailyResult,
  BkGameTeamBookingDoneBonusStaffDay,
  BkGameTeamBookingDoneBonusSummary,
} from '@mos-lab/shared';
import { AppIcon, DataTable, StatusTag } from '~/components/ui';
import BkAvatar from './BkAvatar';

interface BkTeamBookingDoneBonusPanelProps {
  summary: BkGameTeamBookingDoneBonusSummary;
  onOpenDetailsDrawer: (staffId?: number | null, rewardDate?: string | null) => void;
  lastUpdatedAt?: Date | null;
}

export default function BkTeamBookingDoneBonusPanel({
  summary,
  onOpenDetailsDrawer,
  lastUpdatedAt,
}: BkTeamBookingDoneBonusPanelProps) {
  const defaultDayDate = useMemo(() => {
    const todayDay = summary.dailyResults.find((d) => d.isToday);
    if (todayDay) return todayDay.date;
    const nonFuture = summary.dailyResults.filter((d) => !d.isFuture);
    if (nonFuture.length > 0) return nonFuture[nonFuture.length - 1].date;
    return summary.dailyResults[0]?.date || '';
  }, [summary.dailyResults]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDayDate);

  useEffect(() => {
    if (!summary.dailyResults.some((d) => d.date === selectedDate)) {
      setSelectedDate(defaultDayDate);
    }
  }, [summary.dailyResults, selectedDate, defaultDayDate]);

  const selectedDay: BkGameTeamBookingDoneBonusDailyResult | undefined = useMemo(() => {
    return summary.dailyResults.find((d) => d.date === selectedDate) || summary.dailyResults[0];
  }, [summary.dailyResults, selectedDate]);

  const staffCumulativeMap = useMemo(() => {
    const map = new Map<number, { singleDoneCount: number; totalBonus: number }>();
    for (const s of summary.staffTotals) {
      map.set(s.staffId, { singleDoneCount: s.singleDoneCount, totalBonus: s.totalBonus });
    }
    return map;
  }, [summary.staffTotals]);

  const orderedHistoryDays = useMemo(() => {
    const nonFuture = [...summary.dailyResults.filter((d) => !d.isFuture)].reverse();
    const future = summary.dailyResults.filter((d) => d.isFuture);
    return [...nonFuture, ...future];
  }, [summary.dailyResults]);

  const sortedTiers = useMemo(() => {
    return [...summary.config.tiers].sort((a, b) => a.minBookings - b.minBookings);
  }, [summary.config.tiers]);

  const lowestMin = sortedTiers.length > 0 ? sortedTiers[0].minBookings : 0;

  return (
    <div
      data-testid="bk-team-booking-done-bonus-panel"
      className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-white/90 dark:bg-slate-900/70 backdrop-blur-sm p-5 shadow-sm space-y-4"
    >
      {/* Header + Action */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AppIcon icon={Award} size="md" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Typography.Title level={5} className="!mb-0 font-bold tracking-tight">
                Thưởng Done Khách Lẻ Theo Mốc Booking Team
              </Typography.Title>
              <StatusTag
                status="cyan"
                label={
                  summary.effectiveTimeWindow
                    ? `Khung giờ BK: ${summary.effectiveTimeWindow}`
                    : 'Theo khung giờ Game'
                }
              />
              {lastUpdatedAt && (
                <span
                  data-testid="team-booking-done-live-indicator"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 tabular-nums"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Live · {lastUpdatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
                </span>
              )}
            </div>
            <Typography.Text type="secondary" className="text-xs block mt-0.5">
              Chốt 1 mốc Booking Team/ngày · Thưởng trên mỗi Done khách lẻ hoàn thành cùng ngày (loại trừ khách Combo) · Độc lập lương BK &amp; quỹ Team KPI.
            </Typography.Text>
          </div>
        </div>

        <Button
          htmlType="button"
          size="small"
          icon={<AppIcon icon={FileText} size="sm" className="text-amber-500" />}
          onClick={() => onOpenDetailsDrawer(null, null)}
          className="font-medium text-xs"
        >
          Đối soát chi tiết ({summary.records.length} đơn)
        </Button>
      </div>

      {/* Tier Ladder Pills (Highlights active selected day's achieved tier) */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-1">
          Bảng mốc ({selectedDay?.isToday ? 'Hôm nay' : selectedDay?.dateLabel || ''}):
        </span>

        {lowestMin > 0 && (
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              selectedDay && selectedDay.matchedMinBookings === null
                ? 'border-slate-400 bg-slate-200/80 dark:bg-slate-700/80 text-slate-900 dark:text-white font-bold shadow-sm'
                : 'border-slate-200 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="tabular-nums">Dưới {lowestMin} BK:</span>
            <span className="tabular-nums">0đ/Done</span>
          </div>
        )}

        {sortedTiers.map((tier, idx) => {
          const next = sortedTiers[idx + 1];
          const label = next
            ? tier.minBookings === 0 && tier.bonusPerDone === 0
              ? `Dưới ${next.minBookings} BK`
              : `${tier.minBookings}–${next.minBookings - 1} BK`
            : `Từ ${tier.minBookings} BK`;
          const isMatched = selectedDay?.matchedMinBookings === tier.minBookings;

          return (
            <div
              key={tier.id}
              className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                isMatched
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold ring-1 ring-emerald-400/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isMatched && <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-500 shrink-0" />}
              <span className="tabular-nums">{label}:</span>
              <span className="tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                {tier.bonusPerDone.toLocaleString('vi-VN')}đ/Done
              </span>
            </div>
          );
        })}
      </div>

      {/* 4 Key KPI Summary Cards for Selected Day + Overall */}
      {selectedDay && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Booking Team ({selectedDay.isToday ? 'Hôm nay' : selectedDay.dateLabel})
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {selectedDay.teamBookings} Booking
            </div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              Mốc đạt: {selectedDay.tierLabel}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Mức Thưởng / Done Lẻ
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              {selectedDay.bonusPerDone.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedDay.isToday && summary.nextTierMinBookings !== null && summary.bookingsToNextTier !== null
                ? `Còn ${summary.bookingsToNextTier} BK lên mốc ${summary.nextTierMinBookings} (${(summary.nextTierBonusPerDone || 0).toLocaleString('vi-VN')}đ)`
                : selectedDay.matchedMinBookings !== null
                  ? 'Đã kích hoạt thưởng ngày'
                  : 'Chưa đạt mốc thưởng'}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400">
              Done Khách Lẻ ({selectedDay.isToday ? 'Hôm nay' : selectedDay.dateLabel})
            </div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
              {selectedDay.totalSingleDone} đơn
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {selectedDay.totalComboDoneExcluded > 0
                ? `Đã loại ${selectedDay.totalComboDoneExcluded} đơn Combo`
                : `Tổng cả giải: ${summary.totalSingleDone} Done lẻ`}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30">
            <div className="text-[11px] uppercase font-semibold text-emerald-700 dark:text-emerald-300">
              Tổng Thưởng Toàn Game
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              +{summary.totalBonus.toLocaleString('vi-VN')} đ
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 tabular-nums">
              Ngày chọn: +{selectedDay.totalDayBonus.toLocaleString('vi-VN')} đ
            </div>
          </div>
        </div>
      )}

      {/* Split View: Booker Daily + Personal Total Breakdown & Daily History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Booker Breakdown for Selected Day + Cumulative Personal Bonus */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Users} size="sm" className="text-blue-500" />
              <Typography.Text strong className="text-sm">
                Done Khách Lẻ &amp; Thưởng Từng Booker ({selectedDay?.dateLabel || ''})
              </Typography.Text>
            </div>
            {selectedDay && selectedDay.totalDayBonus > 0 && (
              <button
                type="button"
                onClick={() => onOpenDetailsDrawer(null, selectedDay.date)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Xem đơn ngày {selectedDay.date.slice(5).split('-').reverse().join('/')}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <DataTable
              size="small"
              pagination={false}
              scroll={{ y: 320 }}
              dataSource={selectedDay?.staffBreakdown || []}
              rowKey="staffId"
              locale={{
                emptyText: (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Chưa có dữ liệu Booker trong ngày này.
                  </div>
                ),
              }}
              columns={[
                {
                  title: 'Booker',
                  dataIndex: 'staffName',
                  key: 'staffName',
                  render: (name, record: BkGameTeamBookingDoneBonusStaffDay) => (
                    <div className="flex items-center gap-2 min-w-0">
                      <BkAvatar name={name} src={record.avatar} size={26} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {name}
                        </div>
                        {record.comboDoneExcludedCount > 0 && (
                          <Tooltip title="Đơn khách Combo không được tính vào thưởng Done khách lẻ">
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              Loại {record.comboDoneExcludedCount} Combo
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  title: 'Done lẻ (ngày)',
                  dataIndex: 'singleDoneCount',
                  key: 'singleDoneCount',
                  width: 110,
                  align: 'right',
                  render: (val: number) => (
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {val}
                    </span>
                  ),
                },
                {
                  title: 'Mức thưởng/Done',
                  dataIndex: 'bonusPerDone',
                  key: 'bonusPerDone',
                  width: 120,
                  align: 'right',
                  render: (val: number) => (
                    <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                      {val.toLocaleString('vi-VN')} đ
                    </span>
                  ),
                },
                {
                  title: 'Thưởng ngày',
                  dataIndex: 'totalBonus',
                  key: 'totalBonus',
                  width: 115,
                  align: 'right',
                  render: (val: number) => (
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </span>
                  ),
                },
                {
                  title: 'Tổng cả giải',
                  key: 'cumulativeBonus',
                  width: 125,
                  align: 'right',
                  render: (_: unknown, record: BkGameTeamBookingDoneBonusStaffDay) => {
                    const cum = staffCumulativeMap.get(record.staffId) || { singleDoneCount: 0, totalBonus: 0 };
                    return (
                      <button
                        type="button"
                        onClick={() => onOpenDetailsDrawer(record.staffId, null)}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer tabular-nums"
                        title={`Tổng ${cum.singleDoneCount} Done khách lẻ cả Game · Bấm xem đơn chi tiết`}
                      >
                        +{cum.totalBonus.toLocaleString('vi-VN')} đ
                      </button>
                    );
                  },
                },
              ]}
            />
          </div>
        </div>

        {/* Right: Daily History & Tier Outcomes */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AppIcon icon={Calendar} size="sm" className="text-amber-500" />
              <Typography.Text strong className="text-sm">
                Lịch Sử Kết Quả &amp; Thưởng Theo Ngày
              </Typography.Text>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <AppIcon icon={Clock} size="sm" />
              <span>Bấm ngày để xem Booker</span>
            </span>
          </div>

          <div className="max-h-[368px] overflow-y-auto space-y-2 pr-1">
            {orderedHistoryDays.map((day) => {
              const isSelected = selectedDay?.date === day.date;
              const isMatched = day.matchedMinBookings !== null && day.bonusPerDone > 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  data-testid={`team-booking-done-day-${day.date}`}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-1 ring-amber-400/40 shadow-sm'
                      : day.isFuture
                        ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20 opacity-65 hover:opacity-90'
                        : isMatched
                          ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/25 dark:bg-emerald-950/15 hover:border-emerald-300'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{day.dateLabel}</span>
                      {day.isToday && <StatusTag status="processing" label="Hôm nay" />}
                      {day.isFuture && <StatusTag status="default" label="Sắp tới" />}
                    </div>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        day.totalDayBonus > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day.totalDayBonus > 0 ? `+${day.totalDayBonus.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">
                        BK Team: <strong className="text-slate-900 dark:text-white">{day.teamBookings}</strong>
                      </span>
                      <span>·</span>
                      <StatusTag status={isMatched ? 'success' : 'default'} label={day.tierLabel} />
                    </div>
                    <div className="tabular-nums text-slate-500 dark:text-slate-400">
                      {day.totalSingleDone} Done lẻ × {day.bonusPerDone.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
