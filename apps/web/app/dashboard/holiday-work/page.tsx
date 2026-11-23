'use client';

import { Button, Space } from 'antd';
import { Calendar, Plus } from 'lucide-react';
import { AppIcon, FeaturePage, StatePanel } from '~/components/ui';
import { HolidayCalendarSection } from './components/HolidayCalendarSection';
import { HolidayWorkDrawer } from './components/HolidayWorkDrawer';
import { buildHolidayWorkToolbar, HolidayWorkHeaderTag } from './holiday-work-page-modules/HolidayWorkToolbar';
import { HolidayWorkWorkspaceSection } from './holiday-work-page-modules/HolidayWorkWorkspaceSection';
import { useHolidayWorkPage } from './holiday-work-page-modules/useHolidayWorkPage';

export default function HolidayWorkPage() {
  const {
    messageContext,
    form,
    holiday,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    drawerMode,
    editingRoster,
    editingLedger,
    confirmAction,
    setConfirmAction,
    executeConfirmAction,
    workspace,
    canManage,
    canNominate,
    activePeriod,
    canAccessWorkspace,
    candidateOptions,
    performanceStaffOptions,
    adjustmentByLedger,
    coverageRows,
    candidateRows,
    rosterRows,
    ledgerRows,
    eventRows,
    unresolvedExceptionCount,
    pagination,
    openPeriod,
    openCoverage,
    openRoster,
    openEvent,
    openAdjustment,
    closeDrawer,
    submitDrawer,
  } = useHolidayWorkPage();

  if (holiday.loading) return <StatePanel kind="loading" title="Đang tải hệ thống ngày lễ…" minHeight={520} />;

  return (
    <>
      {messageContext}
      <FeaturePage
        title="Lịch nghỉ lễ & đi làm ngày lễ"
        subtitle="Nhân sự xem lịch để chủ động kế hoạch; Manager và Admin quản lý roster, chấm công và lương lễ."
        icon={<AppIcon icon={Calendar} size="md" />}
        tag={
          <HolidayWorkHeaderTag
            canAccessWorkspace={canAccessWorkspace}
            activePeriod={activePeriod}
            calendar={holiday.calendar}
          />
        }
        headerActions={
          canManage ? (
            <Button type="primary" icon={<AppIcon icon={Plus} size="sm" />} onClick={openPeriod}>
              Tạo kỳ lễ
            </Button>
          ) : null
        }
        toolbar={
          canAccessWorkspace
            ? buildHolidayWorkToolbar({
                activePeriodId: holiday.activePeriodId,
                periods: holiday.periods,
                search,
                workspaceLoading: holiday.workspaceLoading,
                onSelectPeriod: (value) => void holiday.selectPeriod(value),
                onSearchChange: setSearch,
                onRefresh: () => void holiday.refreshWorkspace(),
              })
            : undefined
        }
      >
        <Space direction="vertical" size={20} className="w-full">
          <HolidayCalendarSection
            data={holiday.calendar}
            loading={holiday.loading}
            error={holiday.calendarError}
            onRetry={() => void holiday.reload()}
          />
          {canAccessWorkspace ? (
            <HolidayWorkWorkspaceSection
              activePeriod={activePeriod}
              error={holiday.error}
              workspace={workspace}
              workspaceLoading={holiday.workspaceLoading}
              submitting={holiday.submitting}
              canManage={canManage}
              canNominate={canNominate}
              activeTab={activeTab}
              coverageRows={coverageRows}
              candidateRows={candidateRows}
              rosterRows={rosterRows}
              ledgerRows={ledgerRows}
              eventRows={eventRows}
              adjustmentByLedger={adjustmentByLedger}
              unresolvedExceptionCount={unresolvedExceptionCount}
              confirmAction={confirmAction}
              pagination={pagination}
              onTabChange={setActiveTab}
              onReload={() => void holiday.reload()}
              onOpenPeriod={openPeriod}
              onOpenCoverage={openCoverage}
              onOpenRoster={openRoster}
              onOpenEvent={openEvent}
              onOpenAdjustment={openAdjustment}
              onGenerateCandidates={() => void holiday.generateCandidates()}
              onRecalculatePayroll={() => void holiday.recalculatePayroll()}
              onVerifyEvent={(eventId) => void holiday.reviewEvent(eventId, 'VERIFIED')}
              onConfirmActionChange={setConfirmAction}
              onExecuteConfirmAction={executeConfirmAction}
            />
          ) : null}
        </Space>
      </FeaturePage>

      <HolidayWorkDrawer
        form={form}
        mode={drawerMode}
        canManage={canManage}
        branches={holiday.branches}
        candidateOptions={candidateOptions}
        staffOptions={performanceStaffOptions}
        editingRoster={editingRoster}
        editingLedger={editingLedger}
        adjustmentTotal={editingLedger ? adjustmentByLedger.get(editingLedger.id) || 0 : 0}
        submitting={holiday.submitting}
        onClose={closeDrawer}
        onSubmit={submitDrawer}
      />
    </>
  );
}
