'use client';

import React, { useMemo } from 'react';
import { ClipboardList, AlertCircle } from 'lucide-react';
import type { TelesaleTvEventLog } from '@mos-lab/shared';
import { AdaptiveModal, DataTable } from '../../../../components/ui';
import { useTheme } from '../../../../context/ThemeContext';
import { TvJournalFiltersBar } from './telesale-tv-journal-modal/TvJournalFiltersBar';
import { TvJournalHeader } from './telesale-tv-journal-modal/TvJournalHeader';
import { TvJournalOverviewCards } from './telesale-tv-journal-modal/TvJournalOverviewCards';
import { createTvJournalColumns } from './telesale-tv-journal-modal/tvJournalColumns';
import type { TelesaleTvJournalModalProps } from './telesale-tv-journal-modal/tvJournalTypes';
import { useTelesaleTvJournal } from './telesale-tv-journal-modal/useTelesaleTvJournal';

export type {
  TelesaleTvJournalModalProps,
  TelesaleTvJournalStaffOption,
  TvJournalFilters,
  TvJournalStatusFilter,
  TvJournalTypeFilter,
} from './telesale-tv-journal-modal/tvJournalTypes';

export const TelesaleTvJournalModal: React.FC<TelesaleTvJournalModalProps> = ({
  open,
  onClose,
  staffList = [],
  zIndex = 100005,
  initialDate,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const {
    selectedDate,
    setSelectedDate,
    loading,
    journalData,
    staffFilter,
    setStaffFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    fetchJournal,
    filteredEvents,
    latestTimeFormatted,
  } = useTelesaleTvJournal({ open, initialDate });

  const columns = useMemo(() => createTvJournalColumns({ isDark }), [isDark]);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1080}
      centered
      zIndex={zIndex}
      className="tv-journal-modal"
      title={null}
      destroyOnHidden
      intent="detail"
    >
      <div
        className={`-m-6 p-6 rounded-2xl border flex flex-col gap-5 select-none font-sans transition-colors ${
          isDark ? 'bg-zinc-950 text-zinc-100 border-zinc-800' : 'bg-white text-slate-800 border-slate-200'
        }`}
      >
        <TvJournalHeader
          isDark={isDark}
          loading={loading}
          onRefresh={() => fetchJournal(selectedDate)}
          onClose={onClose}
        />

        <TvJournalOverviewCards isDark={isDark} journalData={journalData} latestTimeFormatted={latestTimeFormatted} />

        <TvJournalFiltersBar
          isDark={isDark}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          staffFilter={staffFilter}
          onStaffFilterChange={setStaffFilter}
          staffList={staffList}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* MAIN EVENTS TABLE */}
        <div
          className={`rounded-xl border overflow-hidden transition-colors ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
          }`}
        >
          <DataTable<TelesaleTvEventLog>
            dataSource={filteredEvents}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              className: `!m-3 ${isDark ? '!text-zinc-400' : '!text-slate-600'}`,
            }}
            locale={{
              emptyText: (
                <div className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  <ClipboardList className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`} />
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Không có Live Event nào phù hợp với bộ lọc
                  </p>
                </div>
              ),
            }}
            size="middle"
            className="tv-journal-table"
          />
        </div>

        {/* FOOTER INVARIANT NOTE */}
        <div
          className={`flex items-center justify-between text-[11px] border-t pt-3 ${
            isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-500'
          }`}
        >
          <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            <AlertCircle className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
            Nhật ký giám sát: Không tự động phát lại loa hoặc hiệu ứng khi xem báo cáo
          </span>
          <span className={`font-mono tabular-nums ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            Hiển thị {filteredEvents.length} / {journalData?.totalEvents ?? 0} sự kiện
          </span>
        </div>
      </div>
    </AdaptiveModal>
  );
};
