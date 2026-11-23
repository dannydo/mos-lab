'use client';

import { useMemo } from 'react';
import { Alert, Button, Space, Tooltip } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { Calendar, CircleDollarSign, ClipboardCheck, Lock, Plus, ShieldCheck, Users } from 'lucide-react';
import type {
  HolidayCandidateScore,
  HolidayPayrollLedgerEntry,
  HolidayPeriod,
  HolidayRosterEntry,
  HolidayWorkspaceResponse,
  StaffPerformanceEvent,
} from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, DataSection, MetricGrid, StatePanel } from '~/components/ui';
import { holidayCandidateColumns } from '../components/holidayCandidateColumns';
import { HolidayWorkspaceTabs } from '../components/HolidayWorkspaceTabs';
import type { HolidayBranchCoverageRow, HolidayWorkTabKey } from '../components/holidayWorkPresentation';
import type { HolidayConfirmAction } from './holidayWorkPageHelpers';
import {
  buildCoverageColumns,
  buildEventColumns,
  buildLedgerColumns,
  buildRosterColumns,
} from './holidayWorkWorkspaceColumns';

interface HolidayWorkWorkspaceSectionProps {
  activePeriod?: HolidayPeriod;
  error: string | null;
  workspace: HolidayWorkspaceResponse | null;
  workspaceLoading: boolean;
  submitting: boolean;
  canManage: boolean;
  canNominate: boolean;
  activeTab: HolidayWorkTabKey;
  coverageRows: HolidayBranchCoverageRow[];
  candidateRows: HolidayCandidateScore[];
  rosterRows: HolidayRosterEntry[];
  ledgerRows: HolidayPayrollLedgerEntry[];
  eventRows: StaffPerformanceEvent[];
  adjustmentByLedger: Map<number, number>;
  unresolvedExceptionCount: number;
  confirmAction: HolidayConfirmAction;
  pagination: (key: HolidayWorkTabKey, total: number) => TablePaginationConfig;
  onTabChange: (key: HolidayWorkTabKey) => void;
  onReload: () => void;
  onOpenPeriod: () => void;
  onOpenCoverage: (row?: HolidayBranchCoverageRow) => void;
  onOpenRoster: (row?: HolidayRosterEntry) => void;
  onOpenEvent: () => void;
  onOpenAdjustment: (row: HolidayPayrollLedgerEntry) => void;
  onGenerateCandidates: () => void;
  onRecalculatePayroll: () => void;
  onVerifyEvent: (eventId: number) => void;
  onConfirmActionChange: (action: HolidayConfirmAction) => void;
  onExecuteConfirmAction: () => Promise<void>;
}

export function HolidayWorkWorkspaceSection({
  activePeriod,
  error,
  workspace,
  workspaceLoading,
  submitting,
  canManage,
  canNominate,
  activeTab,
  coverageRows,
  candidateRows,
  rosterRows,
  ledgerRows,
  eventRows,
  adjustmentByLedger,
  unresolvedExceptionCount,
  confirmAction,
  pagination,
  onTabChange,
  onReload,
  onOpenPeriod,
  onOpenCoverage,
  onOpenRoster,
  onOpenEvent,
  onOpenAdjustment,
  onGenerateCandidates,
  onRecalculatePayroll,
  onVerifyEvent,
  onConfirmActionChange,
  onExecuteConfirmAction,
}: HolidayWorkWorkspaceSectionProps) {
  const coverageColumns = useMemo(
    () => buildCoverageColumns({ canManage, onEdit: onOpenCoverage }),
    [canManage, onOpenCoverage]
  );
  const rosterColumns = useMemo(
    () => buildRosterColumns({ canNominate, onEdit: onOpenRoster }),
    [canNominate, onOpenRoster]
  );
  const ledgerColumns = useMemo(
    () =>
      buildLedgerColumns({
        canAdjust: canManage && activePeriod?.status === 'PAYROLL_LOCKED',
        adjustmentByLedger,
        onAdjust: onOpenAdjustment,
      }),
    [canManage, activePeriod?.status, adjustmentByLedger, onOpenAdjustment]
  );
  const eventColumns = useMemo(
    () => buildEventColumns({ canManage, onVerify: onVerifyEvent }),
    [canManage, onVerifyEvent]
  );

  if (!activePeriod) {
    return (
      <StatePanel
        kind="empty"
        title="Chưa có kỳ lễ nội bộ"
        description="Admin tạo kỳ lễ để bắt đầu thiết lập nhu cầu và roster Wings."
        extra={
          canManage ? (
            <Button type="primary" onClick={onOpenPeriod}>
              Tạo kỳ lễ
            </Button>
          ) : null
        }
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        kind="error"
        title="Không thể tải workspace quản trị"
        description={error}
        extra={<Button onClick={onReload}>Thử lại</Button>}
      />
    );
  }

  const summary = activePeriod.summary;
  const metrics = [
    {
      key: 'coverage',
      title: 'Nhu cầu',
      value: summary?.coverageRequired || workspace?.coverage.reduce((sum, row) => sum + row.requiredCount, 0) || 0,
      icon: <AppIcon icon={Users} size="md" />,
    },
    {
      key: 'scheduled',
      title: 'Đã xếp đi làm',
      value: summary?.scheduled || workspace?.roster.filter((row) => row.status === 'SCHEDULED').length || 0,
      icon: <AppIcon icon={Calendar} size="md" />,
    },
    {
      key: 'exception',
      title: 'Ngoại lệ payroll',
      value: unresolvedExceptionCount,
      icon: <AppIcon icon={ShieldCheck} size="md" />,
    },
    {
      key: 'payroll',
      title: 'Cộng lương lễ',
      value:
        summary?.totalPayrollAddition ||
        workspace?.ledger.reduce((sum, row) => sum + row.payrollAdditionAmount, 0) ||
        0,
      format: 'vnd' as const,
      icon: <AppIcon icon={CircleDollarSign} size="md" />,
    },
  ];

  return (
    <Space direction="vertical" size={16} className="w-full">
      <Alert
        showIcon
        type="info"
        message="Chính sách đang áp dụng"
        description={`Đi làm có roster + chấm công: 1x thực tế + ${activePeriod.workPremiumMultiplier}x phụ cấp. Nghỉ lễ: ${activePeriod.paidLeaveMultiplier}x ca ${activePeriod.standardShiftHours} giờ. Lương tháng dùng đơn giá lương cứng ÷ ${activePeriod.monthlyStandardHours} giờ.`}
      />
      <MetricGrid items={metrics} columns={4} className="holiday-work-metric-grid" />
      <DataSection
        title="Workspace kỳ lễ"
        state={workspaceLoading ? 'loading' : undefined}
        extra={
          <Space wrap>
            {activeTab === 'coverage' && canManage ? (
              <Button icon={<AppIcon icon={Plus} size="sm" />} onClick={() => onOpenCoverage()}>
                Cấu hình chi nhánh
              </Button>
            ) : null}
            {activeTab === 'roster' && canNominate ? (
              <Button icon={<AppIcon icon={Plus} size="sm" />} onClick={() => onOpenRoster()}>
                Thêm roster
              </Button>
            ) : null}
            {activeTab === 'feedback' ? (
              <Button icon={<AppIcon icon={Plus} size="sm" />} onClick={onOpenEvent}>
                Ghi nhận sự kiện
              </Button>
            ) : null}
            {activeTab === 'candidates' && canNominate ? (
              <Button
                icon={<AppIcon icon={ClipboardCheck} size="sm" />}
                loading={submitting}
                onClick={onGenerateCandidates}
              >
                Chấm điểm
              </Button>
            ) : null}
            {activeTab === 'ledger' && canManage ? (
              <Button
                icon={<AppIcon icon={CircleDollarSign} size="sm" />}
                loading={submitting}
                onClick={onRecalculatePayroll}
              >
                Tính lại lương
              </Button>
            ) : null}
            {canManage && activePeriod.status === 'DRAFT' ? (
              <Tooltip
                title={
                  unresolvedExceptionCount > 0
                    ? `Còn ${unresolvedExceptionCount} ngoại lệ cần HR xử lý trước khi publish.`
                    : undefined
                }
              >
                <Button
                  type="primary"
                  disabled={unresolvedExceptionCount > 0}
                  onClick={() => onConfirmActionChange('publish')}
                >
                  Publish roster
                </Button>
              </Tooltip>
            ) : null}
            {canManage && activePeriod.status === 'PUBLISHED' ? (
              <Button danger icon={<AppIcon icon={Lock} size="sm" />} onClick={() => onConfirmActionChange('lock')}>
                Khóa lương
              </Button>
            ) : null}
          </Space>
        }
      >
        <HolidayWorkspaceTabs
          activeTab={activeTab}
          canManage={canManage}
          coverageRows={coverageRows}
          candidateRows={candidateRows}
          rosterRows={rosterRows}
          ledgerRows={ledgerRows}
          eventRows={eventRows}
          coverageColumns={coverageColumns}
          candidateColumns={holidayCandidateColumns}
          rosterColumns={rosterColumns}
          ledgerColumns={ledgerColumns}
          eventColumns={eventColumns}
          pagination={pagination}
          onTabChange={onTabChange}
        />
      </DataSection>

      <AdaptiveModal
        intent="confirm"
        open={Boolean(confirmAction)}
        title={confirmAction === 'publish' ? 'Publish roster?' : 'Khóa kỳ lương lễ?'}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={confirmAction === 'lock' ? { danger: true } : undefined}
        confirmLoading={submitting}
        onCancel={() => onConfirmActionChange(null)}
        onOk={() => void onExecuteConfirmAction()}
      >
        <p className="mb-0 text-sm">
          {confirmAction === 'publish'
            ? 'Hệ thống sẽ kiểm tra coverage và tất cả ngoại lệ tên trước khi publish.'
            : 'Mọi ngoại lệ phải được xử lý. Sau khi khóa, ledger không thể ghi đè.'}
        </p>
      </AdaptiveModal>
    </Space>
  );
}
