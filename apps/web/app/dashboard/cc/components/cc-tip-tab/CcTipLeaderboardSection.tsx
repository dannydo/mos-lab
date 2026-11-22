'use client';

import React, { useMemo } from 'react';
import { Button, theme } from 'antd';
import { Trophy } from 'lucide-react';
import type { CcTipLeaderboardEntry } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard } from '~/components/ui';
import { CcTipLeaderboardMobileList } from './CcTipLeaderboardMobileList';
import { buildCcTipLeaderboardColumns } from './ccTipLeaderboardColumns';

interface CcTipLeaderboardSectionProps {
  leaderboard: CcTipLeaderboardEntry[];
  loading: boolean;
  isMobile: boolean;
  selectedCcName: string | null;
  onSelectConsultant: (consultantName: string) => void;
  onClearSelectedConsultant: () => void;
  isDayMode: boolean;
  isPastPeriod: boolean;
  ratio: number;
}

export function CcTipLeaderboardSection({
  leaderboard,
  loading,
  isMobile,
  selectedCcName,
  onSelectConsultant,
  onClearSelectedConsultant,
  isDayMode,
  isPastPeriod,
  ratio,
}: CcTipLeaderboardSectionProps) {
  const { token } = theme.useToken();

  const columns = useMemo(
    () =>
      buildCcTipLeaderboardColumns({
        selectedCcName,
        onSelectConsultant,
        isDayMode,
        isPastPeriod,
        ratio,
        colorSuccess: token.colorSuccess,
        colorInfo: token.colorInfo,
      }),
    [selectedCcName, onSelectConsultant, isDayMode, isPastPeriod, ratio, token.colorSuccess, token.colorInfo]
  );

  return (
    <SectionCard
      bodyPadding={0}
      className="full-bleed-card shadow-sm rounded-xl"
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Trophy} size={18} className="text-amber-500 shrink-0" />
          <span className="font-bold text-base">Bảng Xếp Hạng Báo Cáo CC Thưởng Tip - Tip Leaderboard</span>
        </div>
      }
      extra={
        selectedCcName ? (
          <Button type="dashed" size="small" onClick={onClearSelectedConsultant} className="text-xs font-medium">
            Bỏ lọc: {selectedCcName}
          </Button>
        ) : null
      }
    >
      {isMobile ? (
        <CcTipLeaderboardMobileList
          records={leaderboard}
          loading={loading}
          selectedCcName={selectedCcName}
          onSelectConsultant={onSelectConsultant}
        />
      ) : (
        <DataTable<CcTipLeaderboardEntry>
          columns={columns}
          dataSource={leaderboard}
          rowKey="consultantId"
          loading={loading}
          pagination={false}
          size="middle"
          scroll={{ x: 900 }}
          className="tabular-nums"
          onRow={(record) => ({
            onClick: () => onSelectConsultant(record.displayName),
          })}
          rowClassName={(record) =>
            selectedCcName === record.displayName
              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        />
      )}
    </SectionCard>
  );
}
