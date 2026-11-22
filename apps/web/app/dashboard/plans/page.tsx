'use client';

import '../../suppress-warnings';
import React, { useMemo } from 'react';
import { Button } from 'antd';
import { Lightbulb } from 'lucide-react';
import { AppIcon, DataTable, PageHeader } from '~/components/ui';
import { useTheme } from '~/context/ThemeContext';
import { PlansSuggestionsDrawer } from './plans-page-modules/PlansSuggestionsDrawer';
import { PlansWeekToolbarCard } from './plans-page-modules/PlansWeekToolbarCard';
import { buildPlansColumns } from './plans-page-modules/plansColumns';
import { getPlanRowClassName } from './plans-page-modules/plansPageUtils';
import { usePlansPage } from './plans-page-modules/usePlansPage';

export default function PlansPage() {
  const { themeMode } = useTheme();
  const {
    loading,
    weeklyProgress,
    weekDays,
    weekRangeLabel,
    drawerVisible,
    suggests,
    suggestsLoading,
    handlePrevWeek,
    handleNextWeek,
    handleCurrentWeek,
    addToPlan,
    handleConfirmToggle,
    openCallLog,
    openSuggestionsDrawer,
    closeSuggestionsDrawer,
  } = usePlansPage();

  const columns = useMemo(
    () =>
      buildPlansColumns({
        weekDays,
        openCallLog,
        handleConfirmToggle,
      }),
    [weekDays, openCallLog, handleConfirmToggle]
  );

  return (
    <div className="responsive-page responsive-workspace plans-page">
      <PageHeader
        title={<span className="text-[var(--color-primary)]">Bảng Tiến Độ Cuộc Gọi Tuần</span>}
        subtitle="Theo dõi timeline checkin và lịch sử gọi điện trong tuần của Telesales"
        extra={
          <Button
            type="primary"
            icon={<AppIcon icon={Lightbulb} size={15} />}
            onClick={openSuggestionsDrawer}
            className="font-medium"
          >
            Gợi ý cuộc gọi &amp; Chiến dịch
          </Button>
        }
      />

      <PlansWeekToolbarCard
        weekRangeLabel={weekRangeLabel}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onCurrentWeek={handleCurrentWeek}
      />

      <DataTable
        dataSource={weeklyProgress}
        columns={columns}
        rowKey={(record) => record.customer.id.toString()}
        loading={loading}
        rowClassName={(record) => getPlanRowClassName(record.customer, themeMode)}
        pagination={false}
        scroll={{ x: 1000 }}
        className="antd-custom-table weekly-grid-table"
        stickyPrimaryColumn
      />

      <PlansSuggestionsDrawer
        open={drawerVisible}
        suggestsLoading={suggestsLoading}
        suggests={suggests}
        onClose={closeSuggestionsDrawer}
        onAddToPlan={addToPlan}
      />

      <style jsx global>{`
        /* Highlight today's column */
        .weekly-grid-table .bg-today-column {
          background: rgba(212, 168, 75, 0.04) !important;
          border-left: 1px dashed rgba(212, 168, 75, 0.2) !important;
          border-right: 1px dashed rgba(212, 168, 75, 0.2) !important;
        }

        /* Gold checkbox styling */
        .custom-gold-checkbox .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #d4a84b !important;
          border-color: #d4a84b !important;
        }
        .custom-gold-checkbox .ant-checkbox-checked::after {
          border-color: #d4a84b !important;
        }
        .dark-theme .custom-gold-checkbox .ant-checkbox-inner {
          background-color: #1f1f1f;
          border-color: #444;
        }
        .light-theme .custom-gold-checkbox .ant-checkbox-inner {
          background-color: #ffffff;
          border-color: #d9d9d9;
        }
        .custom-gold-checkbox .ant-checkbox-wrapper:hover .ant-checkbox-inner {
          border-color: #d4a84b !important;
        }

        /* Custom tabs inside drawer */
        .dark-theme .ant-drawer .ant-tabs-card .ant-tabs-tab {
          background: #1c1c1c !important;
          border-color: #2c2c2c !important;
          color: #888 !important;
        }
        .light-theme .ant-drawer .ant-tabs-card .ant-tabs-tab {
          background: #f5f5f5 !important;
          border-color: #e8e8e8 !important;
          color: #555 !important;
        }
        .ant-drawer .ant-tabs-card .ant-tabs-tab-active {
          background: #d4a84b !important;
          color: #000 !important;
        }

        /* Row highlighting - Light Theme */
        .light-theme .row-missed-light > td {
          background-color: #fff1f0 !important;
        }
        .light-theme .row-booked-future-light > td {
          background-color: #f6ffed !important;
        }
        .light-theme .row-hope-light > td {
          background-color: #fffbe6 !important;
        }
        .light-theme .row-missed-light:hover > td {
          background-color: #ffe8e6 !important;
        }
        .light-theme .row-booked-future-light:hover > td {
          background-color: #ebfcdd !important;
        }
        .light-theme .row-hope-light:hover > td {
          background-color: #fffac6 !important;
        }

        /* Row highlighting - Dark Theme */
        .dark-theme .row-missed-dark > td {
          background-color: #2a1215 !important;
        }
        .dark-theme .row-booked-future-dark > td {
          background-color: #162c1b !important;
        }
        .dark-theme .row-hope-dark > td {
          background-color: #2b2111 !important;
        }
        .dark-theme .row-missed-dark:hover > td {
          background-color: #381b1e !important;
        }
        .dark-theme .row-booked-future-dark:hover > td {
          background-color: #1e3a24 !important;
        }
        .dark-theme .row-hope-dark:hover > td {
          background-color: #382c16 !important;
        }
      `}</style>
    </div>
  );
}
