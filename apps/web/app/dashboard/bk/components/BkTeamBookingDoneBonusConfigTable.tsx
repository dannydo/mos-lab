'use client';

import React, { useMemo } from 'react';
import { Button, InputNumber, TimePicker, Tooltip, Typography, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Plus, Trash2, Sparkles, HelpCircle, Award, Clock } from 'lucide-react';
import type {
  BkGameTeamBookingDoneBonusConfig,
  BkGameTeamBookingDoneTier,
  BkGameType,
} from '@mos-lab/shared';
import { DEFAULT_BK_TEAM_BOOKING_DONE_TIERS } from '@mos-lab/shared';
import { AppIcon, DataTable, StatusTag } from '~/components/ui';

interface BkTeamBookingDoneBonusConfigTableProps {
  value?: BkGameTeamBookingDoneBonusConfig | null;
  onChange?: (config: BkGameTeamBookingDoneBonusConfig | null) => void;
  disabled?: boolean;
  gameType?: BkGameType;
  teamKpiTimeWindowLabel?: string | null;
}

function computeTierRangeLabels(tiers: BkGameTeamBookingDoneTier[]): Map<string, string> {
  const sorted = [...tiers].sort((a, b) => a.minBookings - b.minBookings);
  const labelMap = new Map<string, string>();
  sorted.forEach((tier, idx) => {
    const next = sorted[idx + 1];
    let label = `Từ ${tier.minBookings} Booking`;
    if (next) {
      if (next.minBookings <= tier.minBookings) {
        label = `Trùng mốc (${tier.minBookings})`;
      } else if (tier.minBookings === 0 && tier.bonusPerDone === 0) {
        label = `Dưới ${next.minBookings} Booking`;
      } else {
        label = `${tier.minBookings} – ${next.minBookings - 1} Booking`;
      }
    }
    labelMap.set(tier.id, label);
  });
  return labelMap;
}

export default function BkTeamBookingDoneBonusConfigTable({
  value,
  onChange,
  disabled = false,
  gameType,
  teamKpiTimeWindowLabel,
}: BkTeamBookingDoneBonusConfigTableProps) {
  const tiers = useMemo(() => value?.tiers || [], [value]);
  const rangeLabelMap = useMemo(() => computeTierRangeLabels(tiers), [tiers]);

  const lowestMinBookings = useMemo(() => {
    if (tiers.length === 0) return null;
    return Math.min(...tiers.map((t) => t.minBookings));
  }, [tiers]);

  const timeWindowStart = value?.timeWindowStart;
  const timeWindowEnd = value?.timeWindowEnd;
  const timeWindowValue: [Dayjs, Dayjs] | null = useMemo(() => {
    if (timeWindowStart && timeWindowEnd) {
      const s = dayjs(timeWindowStart, 'HH:mm');
      const e = dayjs(timeWindowEnd, 'HH:mm');
      if (s.isValid() && e.isValid()) return [s, e];
    }
    return null;
  }, [timeWindowStart, timeWindowEnd]);

  const emitChange = (
    nextTiers: BkGameTeamBookingDoneTier[],
    startOverride?: string | null,
    endOverride?: string | null
  ) => {
    if (nextTiers.length === 0) {
      onChange?.(null);
      return;
    }
    onChange?.({
      enabled: true,
      tiers: nextTiers,
      timeWindowStart: startOverride !== undefined ? startOverride : value?.timeWindowStart ?? null,
      timeWindowEnd: endOverride !== undefined ? endOverride : value?.timeWindowEnd ?? null,
    });
  };

  const handleUpdateTier = (index: number, patch: Partial<BkGameTeamBookingDoneTier>) => {
    const next = [...tiers];
    next[index] = { ...next[index], ...patch };
    emitChange(next);
  };

  const handleAddTier = () => {
    const maxExisting = tiers.length > 0 ? Math.max(...tiers.map((t) => t.minBookings)) : 20;
    const nextMin = tiers.length === 0 ? 30 : maxExisting + 10;
    const nextBonus = tiers.length === 0 ? 5000 : (tiers[tiers.length - 1]?.bonusPerDone || 5000) + 2000;
    const newTier: BkGameTeamBookingDoneTier = {
      id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      minBookings: nextMin,
      bonusPerDone: nextBonus,
    };
    emitChange([...tiers, newTier]);
  };

  const handleRemoveTier = (index: number) => {
    const next = tiers.filter((_, i) => i !== index);
    emitChange(next);
  };

  const handleApplyWingsBookingRacePreset = () => {
    const cloned = DEFAULT_BK_TEAM_BOOKING_DONE_TIERS.map((t) => ({ ...t }));
    emitChange(cloned);
  };

  const handleClearAll = () => {
    onChange?.(null);
  };

  const handleTimeWindowChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      emitChange(tiers, null, null);
      return;
    }
    emitChange(tiers, dates[0].format('HH:mm'), dates[1].format('HH:mm'));
  };

  return (
    <div
      data-testid="bk-team-booking-done-bonus-config"
      className="space-y-2.5 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/15"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AppIcon icon={Award} size="sm" className="text-amber-500" />
          <Typography.Text className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            Thưởng Done khách lẻ theo mốc Booking Team ({tiers.length} mốc)
          </Typography.Text>
          <Tooltip title="Toàn Team đạt mốc Booking hợp lệ trong ngày sẽ kích hoạt mức thưởng tương ứng cho mỗi đơn Done khách lẻ thực tế hoàn thành cùng ngày của từng Booker. Không tính Done khách Combo. Mỗi Done chỉ được thưởng 1 lần trong Game.">
            <span className="text-slate-400 hover:text-blue-500 cursor-pointer">
              <AppIcon icon={HelpCircle} size="sm" />
            </span>
          </Tooltip>
        </div>

        <Space size="small">
          <Button
            htmlType="button"
            size="small"
            icon={<AppIcon icon={Sparkles} size="sm" className="text-amber-500" />}
            onClick={handleApplyWingsBookingRacePreset}
            disabled={disabled}
            data-testid="apply-wings-booking-race-preset-btn"
            className="text-xs font-medium"
          >
            Áp dụng mẫu WINGS BOOKING RACE
          </Button>
          {tiers.length > 0 && (
            <Button
              htmlType="button"
              size="small"
              danger
              type="text"
              onClick={handleClearAll}
              disabled={disabled}
              className="text-xs"
            >
              Xóa tất cả
            </Button>
          )}
        </Space>
      </div>

      {tiers.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
              <AppIcon icon={Clock} size="sm" className="text-amber-500 shrink-0" />
              <span className="font-medium">Khung giờ tính Booking Team/ngày:</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {gameType === 'TEAM_KPI' && teamKpiTimeWindowLabel && !timeWindowValue
                  ? `Mặc định kế thừa Team KPI (${teamKpiTimeWindowLabel})`
                  : 'Để trống = theo thời gian Game'}
              </span>
            </div>
            <TimePicker.RangePicker
              size="small"
              format="HH:mm"
              value={timeWindowValue}
              onChange={handleTimeWindowChange}
              disabled={disabled}
              allowClear
              placeholder={['Từ giờ', 'Đến giờ']}
            />
          </div>

          {lowestMinBookings !== null && lowestMinBookings > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Mốc nền: <strong className="tabular-nums">Dưới {lowestMinBookings} Booking</strong> Team/ngày
              </span>
              <span className="font-semibold text-slate-500 dark:text-slate-400 tabular-nums">0 đ / Done</span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white/80 dark:bg-slate-900/50">
        <DataTable
          size="small"
          pagination={false}
          dataSource={tiers}
          rowKey={(record, index) => record.id || `tier-${index}`}
          locale={{
            emptyText: (
              <div className="py-5 text-center text-slate-400 text-xs">
                Chưa bật cơ chế thưởng Done khách lẻ theo mốc Booking Team. Bấm &quot;Thêm mốc Booking Team&quot; hoặc chọn &quot;Áp dụng mẫu WINGS BOOKING RACE&quot;.
              </div>
            ),
          }}
          columns={[
            {
              title: '#',
              width: 40,
              align: 'center',
              render: (_, __, index) => <span className="text-xs text-slate-400 tabular-nums">{index + 1}</span>,
            },
            {
              title: 'Mốc Booking Team/ngày (Từ ≥)',
              dataIndex: 'minBookings',
              width: 195,
              render: (val, _, index) => (
                <div className="flex items-center gap-1.5">
                  <InputNumber
                    size="small"
                    min={0}
                    step={5}
                    value={val}
                    disabled={disabled}
                    aria-label={`Mốc Booking Team tối thiểu dòng ${index + 1}`}
                    onChange={(nextVal) => handleUpdateTier(index, { minBookings: Math.max(0, Math.floor(Number(nextVal ?? 0))) })}
                    className="w-24 text-xs font-semibold tabular-nums"
                  />
                  <span className="text-xs text-slate-500">Booking</span>
                </div>
              ),
            },
            {
              title: 'Khoảng áp dụng',
              key: 'rangeLabel',
              render: (_, record) => {
                const rangeLabel = rangeLabelMap.get(record.id) || `Từ ${record.minBookings} Booking`;
                return <StatusTag status="gold" label={rangeLabel} />;
              },
            },
            {
              title: 'Thưởng / Done khách lẻ',
              dataIndex: 'bonusPerDone',
              width: 175,
              align: 'right',
              render: (val, _, index) => (
                <div className="flex items-center justify-end gap-1">
                  <InputNumber
                    size="small"
                    min={0}
                    step={1000}
                    value={val}
                    disabled={disabled}
                    aria-label={`Mức thưởng mỗi Done dòng ${index + 1}`}
                    formatter={(v) => (v !== undefined && v !== null ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                    parser={(v) => Number((v || '').replace(/,/g, ''))}
                    onChange={(nextVal) => handleUpdateTier(index, { bonusPerDone: Math.max(0, Math.round(Number(nextVal ?? 0))) })}
                    className="w-28 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums"
                  />
                  <span className="text-xs text-slate-500 font-medium">đ/Done</span>
                </div>
              ),
            },
            {
              title: '',
              width: 44,
              align: 'center',
              render: (_, __, index) => (
                <Button
                  htmlType="button"
                  size="small"
                  type="text"
                  danger
                  disabled={disabled}
                  aria-label={`Xóa mốc thưởng dòng ${index + 1}`}
                  icon={<AppIcon icon={Trash2} size="action" />}
                  onClick={() => handleRemoveTier(index)}
                  className="text-slate-400 hover:text-red-500"
                />
              ),
            },
          ]}
        />
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2 pt-0.5">
        <Button
          htmlType="button"
          size="small"
          type="dashed"
          icon={<AppIcon icon={Plus} size="sm" />}
          onClick={handleAddTier}
          disabled={disabled}
          className="text-xs font-medium"
        >
          Thêm mốc Booking Team
        </Button>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          💡 Độc lập với lương Telesales &amp; quỹ Team KPI · Không tính Done khách Combo.
        </span>
      </div>
    </div>
  );
}
