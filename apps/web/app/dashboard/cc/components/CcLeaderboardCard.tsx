'use client';

import { useMemo } from 'react';
import { Card, Table, theme } from 'antd';
import { TrophyOutlined, FilterOutlined } from '@ant-design/icons';
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { Dayjs } from 'dayjs';
import { CcLeaderboardEntry, themeTokens } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { AppIcon } from '~/components/ui';
import { useResponsiveTier, useViewportSize } from '~/hooks/useResponsiveTier';
import { buildCcLeaderboardColumns } from './cc-leaderboard/cc-leaderboard-columns';
import { CcLeaderboardMobileList } from './cc-leaderboard/CcLeaderboardMobileList';
import {
  computeCapSummary,
  computeElapsedRatioPercent,
  computeMaxBarValue,
} from './cc-leaderboard/cc-leaderboard-utils';

interface CcLeaderboardCardProps {
  leaderboard: CcLeaderboardEntry[];
  loading?: boolean;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
  dateRange?: [Dayjs, Dayjs];
  comparisonMode?: 'month' | 'week' | 'day';
}

export default function CcLeaderboardCard({
  leaderboard,
  loading,
  selectedConsultant,
  onSelectConsultant,
  dateRange,
  comparisonMode = 'month',
}: CcLeaderboardCardProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const tier = useResponsiveTier();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const { mobileLandscapeMaxWidth, mobileLandscapeMaxHeight } = themeTokens.responsive.breakpoints;
  const isPhoneLandscape =
    viewportWidth > viewportHeight &&
    viewportWidth <= mobileLandscapeMaxWidth &&
    viewportHeight <= mobileLandscapeMaxHeight;
  // Portrait phones use scan-friendly cards. A rotated phone has enough width
  // for the denser, chart-bearing table and should retain that operational view.
  const showMobileCards = tier === 'mobile' && !isPhoneLandscape;

  const isMonthMode = comparisonMode === 'month';
  const isDayMode = comparisonMode === 'day';

  const elapsedRatioPercent = useMemo(
    () => computeElapsedRatioPercent(dateRange, comparisonMode),
    [dateRange, comparisonMode]
  );

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  // Max bar reference for proportional widths
  const maxBarValue = useMemo(() => computeMaxBarValue(leaderboard), [leaderboard]);

  const columns = buildCcLeaderboardColumns({
    selectedConsultant,
    isMonthMode,
    isDayMode,
    isPastPeriod,
    ratio,
    maxBarValue,
  });

  // Summary counts
  const capSummary = useMemo(() => computeCapSummary(leaderboard), [leaderboard]);

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
              <span
                className="inline-flex items-center gap-1 font-semibold text-rose-500"
                aria-label={`${capSummary.hardcapped} CC đã đạt trần thưởng`}
              >
                <AppIcon icon={CircleX} size={12} />
                <span className="tabular-nums">{capSummary.hardcapped}</span>
              </span>
            )}
            {capSummary.warning > 0 && (
              <span
                className="inline-flex items-center gap-1 font-semibold text-amber-500"
                aria-label={`${capSummary.warning} CC sắp chạm trần thưởng`}
              >
                <AppIcon icon={TriangleAlert} size={12} />
                <span className="tabular-nums">{capSummary.warning}</span>
              </span>
            )}
            {capSummary.normal > 0 && (
              <span
                className="inline-flex items-center gap-1 font-semibold text-emerald-500"
                aria-label={`${capSummary.normal} CC đang trong ngưỡng an toàn`}
              >
                <AppIcon icon={CircleCheck} size={12} />
                <span className="tabular-nums">{capSummary.normal}</span>
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
      styles={{
        body: { padding: 0 },
        header: showMobileCards ? { minHeight: 44, paddingInline: 10 } : undefined,
        title: showMobileCards ? { paddingBlock: 10 } : undefined,
      }}
      className="full-bleed-card shadow-sm rounded-xl cc-xoay-leaderboard-card"
    >
      {/* Minimal legend bar */}
      <div
        className={showMobileCards ? 'hidden' : 'flex items-center justify-end gap-3 px-4 py-1.5 border-b text-[10px]'}
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

      {showMobileCards ? (
        <CcLeaderboardMobileList
          leaderboard={leaderboard}
          loading={loading}
          selectedConsultant={selectedConsultant}
          onSelectConsultant={onSelectConsultant}
          isDayMode={isDayMode}
          isMonthMode={isMonthMode}
          isPastPeriod={isPastPeriod}
          ratio={ratio}
        />
      ) : (
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
      )}
    </Card>
  );
}
