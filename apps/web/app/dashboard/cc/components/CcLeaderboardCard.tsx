'use client';

import React, { useMemo } from 'react';
import { Card, Table, Tag, theme, Space, Tooltip } from 'antd';
import { TrophyOutlined, FilterOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { CcLeaderboardEntry, calculateWheelBonusCap } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import CcAvatar from './CcAvatar';

interface CcLeaderboardCardProps {
  leaderboard: CcLeaderboardEntry[];
  loading?: boolean;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
}

const fmtVnd = (v: number) => Math.round(v).toLocaleString('vi-VN');

export default function CcLeaderboardCard({
  leaderboard,
  loading,
  selectedConsultant,
  onSelectConsultant,
}: CcLeaderboardCardProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  // Max bar reference for proportional widths
  const maxBarValue = useMemo(() => {
    if (!leaderboard?.length) return 1;
    return Math.max(
      ...leaderboard.map((cc) => {
        const d = cc.monthlyDailyBonus || 0;
        const w = cc.monthlyWheelBonus || 0;
        const cap = calculateWheelBonusCap(d, w);
        return Math.max(cap.maxWheelBonusAllowed, cap.rawWheelBonus, cap.monthlyDailyBonus);
      }),
      1
    );
  }, [leaderboard]);

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 50,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '16px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '16px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '16px' }}>🥉</span>;
        return <span className="tabular-nums font-medium text-slate-500 text-[11px]">#{rank}</span>;
      },
    },
    {
      title: 'CC',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 160,
      render: (name: string, record: CcLeaderboardEntry) => {
        const isSelected = selectedConsultant === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={6}>
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={28} />
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span
                className={`font-semibold text-xs transition-colors ${
                  isSelected ? 'text-amber-400 underline underline-offset-2' : 'hover:text-amber-400'
                }`}
                style={{ color: isSelected ? undefined : token.colorText }}
              >
                {name}
              </span>
              {isSelected && <CheckCircleOutlined className="text-amber-400 text-[10px]" />}
            </div>
          </Space>
        );
      },
    },
    {
      title: (
        <Tooltip title="Level CC = ⌊Điểm / 100⌋ + 1. Reset mỗi đầu tháng.">
          <span className="cursor-help">Lv / Điểm</span>
        </Tooltip>
      ),
      key: 'levelAndPoints',
      align: 'center' as const,
      width: 100,
      render: (_: unknown, record: CcLeaderboardEntry) => {
        const lvl = record.level || Math.floor((record.totalPointsAccu || 0) / 100) + 1;
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="tabular-nums font-semibold text-[11px] text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-px rounded-full leading-tight">
              Lv.{lvl}
            </span>
            <span className="tabular-nums text-[10px] text-emerald-600 dark:text-emerald-400/80">
              {(record.totalPointsAccu || 0).toLocaleString('vi-VN')} pts
            </span>
          </div>
        );
      },
    },
    {
      title: (
        <Tooltip title="Lượt khách phục vụ / Lượt dịch vụ thực hiện">
          <span className="cursor-help">Khách / DV</span>
        </Tooltip>
      ),
      key: 'checkinAndServices',
      align: 'center' as const,
      width: 80,
      render: (_: unknown, record: CcLeaderboardEntry) => (
        <span className="tabular-nums text-xs">
          <span className="font-semibold" style={{ color: token.colorText }}>
            {record.totalCheckins}
          </span>
          <span className="text-slate-400 mx-0.5">/</span>
          <span className="text-slate-500 dark:text-slate-400">{record.totalServices || 0}</span>
        </span>
      ),
    },
    {
      title: (
        <Tooltip title="Tổng thưởng CC Xoay (Level × 65đ). Khi vượt 1.5× CC Daily Bonus, chỉ nhận mức trần.">
          <span className="cursor-help">CC Xoay</span>
        </Tooltip>
      ),
      dataIndex: 'totalConsultantBonus',
      key: 'totalConsultantBonus',
      align: 'right' as const,
      width: 130,
      render: (_val: number, record: CcLeaderboardEntry) => {
        const daily = record.monthlyDailyBonus || 0;
        const wheel = record.monthlyWheelBonus || 0;
        const cap = calculateWheelBonusCap(daily, wheel);
        const isHardcapped = cap.capStatus === 'HARDCAPPED';
        const effective = cap.effectiveWheelBonus;

        if (isHardcapped && cap.rawWheelBonus > cap.maxWheelBonusAllowed) {
          // Over cap: show raw amount crossed out + actual received amount
          return (
            <Tooltip
              title={
                <div className="text-xs">
                  <div className="text-rose-300 font-bold">⛔ Vượt trần 1.5×</div>
                  <div>Thưởng gốc: {fmtVnd(cap.rawWheelBonus)} đ</div>
                  <div className="text-emerald-300 font-bold">Chỉ nhận: {fmtVnd(effective)} đ</div>
                </div>
              }
            >
              <div className="flex flex-col items-end cursor-help">
                <span className="tabular-nums text-[10px] text-rose-400 line-through opacity-60">
                  {fmtVnd(cap.rawWheelBonus)} đ
                </span>
                <span className="tabular-nums font-bold text-xs text-rose-500">{fmtVnd(effective)} đ</span>
              </div>
            </Tooltip>
          );
        }

        return (
          <span className="tabular-nums font-bold text-xs text-amber-700 dark:text-amber-400">
            {fmtVnd(cap.rawWheelBonus || 0)} đ
          </span>
        );
      },
    },
    {
      title: (
        <Tooltip
          title={
            <div className="text-xs">
              <div className="font-bold mb-1">Tỷ lệ CC Xoay / CC Daily Bonus</div>
              <div>100% = CC Xoay bằng CC Daily Bonus</div>
              <div className="text-rose-300">150% = Trần tối đa (1.5×)</div>
            </div>
          }
        >
          <span className="cursor-help">Hardcap</span>
        </Tooltip>
      ),
      key: 'hardcapInline',
      width: 240,
      render: (_: unknown, record: CcLeaderboardEntry) => {
        const daily = record.monthlyDailyBonus || 0;
        const wheel = record.monthlyWheelBonus || 0;
        const cap = calculateWheelBonusCap(daily, wheel);

        const dailyBarW = maxBarValue > 0 ? (cap.monthlyDailyBonus / maxBarValue) * 100 : 0;
        const wheelBarW = maxBarValue > 0 ? (cap.rawWheelBonus / maxBarValue) * 100 : 0;
        const hardcapLinePos = maxBarValue > 0 ? (cap.maxWheelBonusAllowed / maxBarValue) * 100 : 0;

        const isHardcapped = cap.capStatus === 'HARDCAPPED';
        const isWarning = cap.capStatus === 'WARNING';
        const pct = cap.wheelCapPercent;
        const remaining = Math.max(0, cap.maxWheelBonusAllowed - cap.rawWheelBonus);

        return (
          <Tooltip
            placement="left"
            title={
              <div className="text-xs space-y-0.5">
                <div
                  className="font-bold"
                  style={{ color: isHardcapped ? '#ff4d4f' : isWarning ? '#faad14' : '#52c41a' }}
                >
                  {isHardcapped ? '⛔ Đạt trần 1.5×' : isWarning ? '⚠️ Sắp chạm trần' : '✅ An toàn'}
                </div>
                <div>
                  Daily Bonus: <strong>{fmtVnd(daily)} đ</strong>
                </div>
                <div>
                  Xoay Bonus: <strong>{fmtVnd(wheel)} đ</strong>
                </div>
                <div>
                  Trần 1.5×: <strong>{fmtVnd(cap.maxWheelBonusAllowed)} đ</strong>
                </div>
                {!isHardcapped && remaining > 0 && (
                  <div className="text-emerald-300">
                    Còn <strong>{fmtVnd(remaining)} đ</strong> trước trần
                  </div>
                )}
              </div>
            }
          >
            <div className="relative cursor-help" style={{ height: 28 }}>
              {/* Daily Bonus bar with label */}
              <div className="absolute top-0 left-0 h-[12px] flex items-center w-full">
                <Tooltip title="Daily Combo Sales Bonus" placement="top">
                  <span className="text-[9px] mr-1 cursor-help select-none" style={{ lineHeight: 1 }}>
                    🅒
                  </span>
                </Tooltip>
                <div className="flex-1 h-full relative">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${Math.max(dailyBarW, 0.5)}%`,
                      background: 'linear-gradient(90deg, #52c41a, #73d13d)',
                      minWidth: daily > 0 ? '2px' : '0',
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>

              {/* Xoay Bonus bar with label + % at tail */}
              <div className="absolute top-[14px] left-0 h-[12px] flex items-center w-full">
                <Tooltip title="Vòng Xoay Bonus" placement="bottom">
                  <span className="text-[9px] mr-1 cursor-help select-none" style={{ lineHeight: 1 }}>
                    🅧
                  </span>
                </Tooltip>
                <div className="flex-1 h-full flex items-center">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${Math.max(wheelBarW, 0.5)}%`,
                      background: isHardcapped
                        ? 'linear-gradient(90deg, #ff4d4f, #ff7875)'
                        : 'linear-gradient(90deg, #faad14, #ffc53d)',
                      minWidth: wheel > 0 ? '2px' : '0',
                      opacity: 0.85,
                    }}
                  />
                  <span
                    className={`ml-1 tabular-nums font-bold text-[9px] whitespace-nowrap ${
                      isHardcapped ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-emerald-500/80'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Hardcap 1.5x dashed line + label */}
              {cap.maxWheelBonusAllowed > 0 && (
                <div
                  className="absolute top-0 h-full"
                  style={{
                    left: `${Math.min(hardcapLinePos, 98)}%`,
                    zIndex: 10,
                  }}
                >
                  <div className="absolute top-0 h-full" style={{ borderLeft: '1.5px dashed #ff4d4f', opacity: 0.5 }} />
                  <span
                    className="absolute text-[7px] font-bold text-rose-500/70 whitespace-nowrap"
                    style={{ top: -10, left: -8 }}
                  >
                    150%
                  </span>
                </div>
              )}
            </div>
          </Tooltip>
        );
      },
    },
  ];

  // Summary counts
  const capSummary = useMemo(() => {
    let hardcapped = 0,
      warning = 0,
      normal = 0;
    leaderboard.forEach((cc) => {
      const s = calculateWheelBonusCap(cc.monthlyDailyBonus || 0, cc.monthlyWheelBonus || 0).capStatus;
      if (s === 'HARDCAPPED') hardcapped++;
      else if (s === 'WARNING') warning++;
      else normal++;
    });
    return { hardcapped, warning, normal };
  }, [leaderboard]);

  return (
    <Card
      title={
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500" />
            <span style={{ color: token.colorText }} className="font-bold text-sm">
              CC Leaderboard
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            {capSummary.hardcapped > 0 && (
              <span className="inline-flex items-center gap-0.5 text-rose-500 font-semibold">
                ⛔ {capSummary.hardcapped}
              </span>
            )}
            {capSummary.warning > 0 && (
              <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold">
                ⚠️ {capSummary.warning}
              </span>
            )}
            {capSummary.normal > 0 && (
              <span className="inline-flex items-center gap-0.5 text-emerald-500 font-semibold">
                ✅ {capSummary.normal}
              </span>
            )}
            <span className="text-slate-400 hidden lg:inline ml-2">
              <FilterOutlined className="mr-0.5" />
              Click CC để lọc
            </span>
          </div>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      styles={{ body: { padding: 0 } }}
      className="full-bleed-card shadow-sm rounded-xl"
    >
      {/* Minimal legend bar */}
      <div
        className="flex items-center justify-end gap-3 px-4 py-1.5 border-b text-[10px]"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
      >
        <span className="flex items-center gap-1 text-slate-400">
          <span className="text-[9px]">🅒</span> Daily Bonus
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="text-[9px]">🅧</span> Xoay Bonus
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <span className="inline-block w-3 h-0" style={{ borderTop: '1.5px dashed #ff4d4f' }} />
          Trần 150%
        </span>
      </div>

      <Table
        dataSource={leaderboard}
        columns={columns}
        rowKey="consultantId"
        size="small"
        pagination={false}
        loading={loading}
        scroll={{ x: 'max-content' }}
        className="antd-custom-table"
        locale={{ emptyText: 'Chưa có dữ liệu' }}
        onRow={(record) => ({
          onClick: () => onSelectConsultant?.(record.displayName),
          className: 'cursor-pointer hover:bg-amber-500/5 transition-colors',
          style: {
            background:
              selectedConsultant === record.displayName
                ? isDark
                  ? 'rgba(212,168,75,0.12)'
                  : 'rgba(212,168,75,0.06)'
                : undefined,
          },
        })}
      />
    </Card>
  );
}
