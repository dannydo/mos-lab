'use client';

import { useEffect, useState } from 'react';
import { Button, Select, Space, Tooltip, theme } from 'antd';
import type {
  BugPriority,
  BugReportClarificationFilter,
  BugReportRequestType,
  BugReportSummary,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole, isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import {
  CheckCircle2,
  Bot,
  CircleHelp,
  Gavel,
  Inbox,
  LoaderCircle,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { AppIcon, ResourceListPage, SearchField, STANDARD_PAGE_SIZE_OPTIONS } from '../../../components/ui';
import { safeStorage } from '../../../lib/safe-storage';
import { BugReportWorkflowModal } from '../../../components/bug-reports/BugReportWorkflowGuide';
import { BugReportNextActorFilter } from './components/BugReportNextActorFilter';
import {
  BugReportFilterEmptyState,
  bugReportFilterControlClassName,
  getActiveBugInboxFilterLabels,
} from './components/BugReportFilterEmptyState';
import { BugReportMobileCard } from './components/BugReportMobileCard';
import { useBugReportInboxColumns } from './components/useBugReportInboxColumns';
import { InboxWorkerLiveBar } from './components/BugReportWorkerActivity';
import { CLARIFICATION_FILTER_LABELS, STATUS_LABELS } from './bug-report-presenters';
import { useBugReports } from './hooks/useBugReports';
import { useRequestClassifierWorkerHealth } from './hooks/useRequestClassifierWorkerHealth';
import { ExperienceJournalDrawer } from './components/ExperienceJournalDrawer';
import { BugReportDetailDrawer } from './components/BugReportDetailDrawer';
import { apiClient } from '../../../lib/api-client';

export default function BugReportsPage() {
  const { token } = theme.useToken();
  const inbox = useBugReports();
  const workerHealth = useRequestClassifierWorkerHealth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [canTriage, setCanTriage] = useState(false);
  const [canOpenJournal, setCanOpenJournal] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(safeStorage.getItem('mos_user') || '{}') as {
        role?: string;
        username?: string | null;
        email?: string | null;
      };
      setCanTriage(isSuperAdminRole(user.role) && isCanonicalSuperAdminIdentity(user));
      setCanOpenJournal(isAdminOrSuperAdminRole(user.role));
    } catch {
      setCanTriage(false);
      setCanOpenJournal(false);
    }
  }, []);

  const columns = useBugReportInboxColumns(setSelectedId);

  const appliedFilterLabels = getActiveBugInboxFilterLabels(inbox.filters);
  const activeFilterCount = appliedFilterLabels.length;
  const isEmptyBecauseOfFilters = !inbox.loading && inbox.total === 0 && activeFilterCount > 0;
  const emptyInboxMessage = isEmptyBecauseOfFilters ? (
    <BugReportFilterEmptyState labels={appliedFilterLabels} onClear={inbox.clearFilters} />
  ) : (
    'Chưa có yêu cầu trong mOS Inbox.'
  );

  return (
    <>
      <ResourceListPage<BugReportSummary>
        title="mOS Inbox"
        subtitle="AI làm rõ với người yêu cầu; Danny quyết định cuối cùng trước khi lỗi hoặc chức năng được đưa vào hàng triển khai."
        icon={<AppIcon icon={MessageSquareWarning} size="lg" />}
        headerActions={
          <Space size={4}>
            {canOpenJournal ? (
              <Tooltip title="Nhật ký Experience & Reliability (nội bộ)">
                <Button
                  type="text"
                  aria-label="Mở Nhật ký Experience & Reliability"
                  icon={<AppIcon icon={ShieldAlert} size="sm" />}
                  onClick={() => setJournalOpen(true)}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="Xem workflow xử lý yêu cầu">
              <Button
                type="text"
                aria-label="Xem workflow xử lý yêu cầu"
                icon={<AppIcon icon={CircleHelp} size="sm" />}
                onClick={() => setWorkflowOpen(true)}
              />
            </Tooltip>
          </Space>
        }
        toolbar={{
          className: 'mos-inbox-toolbar',
          primary: (
            <SearchField
              behavior="filter"
              value={inbox.filters.search}
              onChange={(event) => inbox.setFilters({ search: event.target.value })}
              placeholder="Tìm mã, nội dung, nhân viên hoặc trang…"
              allowClear
              className={bugReportFilterControlClassName(Boolean(inbox.filters.search.trim()))}
              style={{ width: 'min(100%, 420px)' }}
            />
          ),
          filters: (
            <Space wrap>
              <Select
                value={inbox.filters.requestType}
                onChange={(value: BugReportRequestType | 'ALL') => inbox.setFilters({ requestType: value })}
                className={bugReportFilterControlClassName(inbox.filters.requestType !== 'ALL', 'min-w-[165px]')}
                aria-label="Lọc loại yêu cầu"
                options={[
                  { value: 'ALL', label: 'Mọi loại yêu cầu' },
                  { value: 'FEATURE', label: 'Yêu cầu chức năng' },
                  { value: 'BUG', label: 'Báo lỗi' },
                ]}
              />
              <BugReportNextActorFilter
                value={inbox.filters.nextActor}
                onChange={(nextActor) => inbox.setFilters({ nextActor })}
                className={bugReportFilterControlClassName(inbox.filters.nextActor !== 'ALL')}
              />
              <Select
                value={inbox.filters.status}
                onChange={(value) => inbox.setFilters({ status: value })}
                className={bugReportFilterControlClassName(inbox.filters.status !== 'ALL')}
                style={{ minWidth: 150 }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái' },
                  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <Select
                value={inbox.filters.priority}
                onChange={(value) => inbox.setFilters({ priority: value })}
                className={bugReportFilterControlClassName(inbox.filters.priority !== 'ALL')}
                style={{ minWidth: 130 }}
                options={[
                  { value: 'ALL', label: 'Mọi priority' },
                  ...(['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((value) => ({ value, label: value })),
                ]}
              />
              <Select
                value={inbox.filters.clarification}
                onChange={(value) => inbox.setFilters({ clarification: value })}
                className={bugReportFilterControlClassName(inbox.filters.clarification !== 'ALL')}
                style={{ minWidth: 170 }}
                options={(Object.entries(CLARIFICATION_FILTER_LABELS) as [BugReportClarificationFilter, string][]).map(
                  ([value, label]) => ({ value, label })
                )}
              />
            </Space>
          ),
          actions: (
            <Button
              aria-label="Tải lại mOS Inbox"
              icon={<AppIcon icon={RefreshCw} size="sm" />}
              loading={inbox.loading}
              onClick={() => void inbox.refresh()}
            >
              Tải lại
            </Button>
          ),
          activeFilterCount,
          filterTitle: 'Lọc mOS Inbox',
        }}
        metrics={{
          columns: 6,
          className: 'bug-report-metric-grid',
          items: [
            {
              key: 'open',
              title: 'Đang mở',
              value: inbox.summary.openCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Đang làm ${inbox.summary.inProgressCount} · Chờ nghiệm thu ${inbox.summary.fixedCount}`,
              icon: <AppIcon icon={Inbox} size="md" />,
              iconBgColor: token.colorInfoBg,
            },
            {
              key: 'reporter-action',
              title: 'Người báo cần làm',
              value: inbox.summary.reporterActionCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Bổ sung ${inbox.summary.reporterClarificationCount} · Nghiệm thu ${inbox.summary.reporterReviewCount}`,
              icon: <AppIcon icon={UserRound} size="md" />,
              iconBgColor: token.colorWarningBg,
            },
            {
              key: 'danny-action',
              title: 'Danny cần quyết định',
              value: inbox.summary.dannyActionCount,
              format: 'number',
              loading: inbox.loading,
              subValue: 'Ticket đã đủ rõ, chờ priority và quyết định',
              icon: <AppIcon icon={Gavel} size="md" />,
              iconBgColor: token.colorWarningBg,
            },
            {
              key: 'agent-action',
              title: 'Agent cần xử lý',
              value: inbox.summary.agentActionCount,
              format: 'number',
              loading: inbox.loading,
              subValue: `Làm rõ ${inbox.summary.agentClarificationCount} · Triển khai ${inbox.summary.agentDeliveryCount}`,
              icon: <AppIcon icon={Bot} size="md" />,
              iconBgColor: token.colorInfoBg,
            },
            {
              key: 'in-progress',
              title: 'Đang thực hiện',
              value: inbox.summary.inProgressCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={LoaderCircle} size="md" />,
              iconBgColor: token.colorPrimaryBg,
            },
            {
              key: 'closed',
              title: 'Đã hoàn tất',
              value: inbox.summary.closedCount,
              format: 'number',
              loading: inbox.loading,
              icon: <AppIcon icon={CheckCircle2} size="md" />,
              iconBgColor: token.colorSuccessBg,
            },
          ],
        }}
        tableSection={{
          title: `Danh sách · ${inbox.total.toLocaleString('vi-VN')} yêu cầu`,
          state: inbox.error ? 'error' : undefined,
          stateTitle: 'Không thể tải mOS Inbox',
          stateDescription: inbox.error,
          stateExtra: (
            <Button icon={<AppIcon icon={RefreshCw} size="sm" />} onClick={() => void inbox.refresh()}>
              Thử lại
            </Button>
          ),
        }}
        table={{
          rowKey: 'id',
          columns,
          dataSource: inbox.data,
          loading: inbox.loading,
          stickyPrimaryColumn: true,
          columnPriority: {
            ticket: 'primary',
            sourcePath: 'secondary',
            status: 'secondary',
            attachmentCount: 'tertiary',
            workerActivity: 'secondary',
            agentProgress: 'secondary',
            action: 'primary',
          },
          scroll: { x: 1220 },
          onRow: (row) => ({ onClick: () => setSelectedId(row.id), style: { cursor: 'pointer' } }),
          pagination: {
            current: inbox.pagination.page,
            pageSize: inbox.pagination.pageSize,
            total: inbox.total,
            showSizeChanger: true,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            showTotal: (total, range) => `${range[0]}–${range[1]} / ${total} yêu cầu`,
            onChange: (page, pageSize) => inbox.setPagination({ page, pageSize }),
          },
          mobileRecordKey: (row) => row.id,
          mobileEmptyDescription: emptyInboxMessage,
          mobileRenderer: (row) => <BugReportMobileCard report={row} onOpen={setSelectedId} />,
          locale: { emptyText: emptyInboxMessage },
        }}
      >
        <InboxWorkerLiveBar
          reports={inbox.data}
          liveWorker={inbox.summary.liveWorker}
          onOpen={setSelectedId}
          health={workerHealth.health}
          loading={workerHealth.loading}
          error={workerHealth.error}
          onRefresh={() => void workerHealth.refresh()}
        />
      </ResourceListPage>
      <BugReportWorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} />
      {canOpenJournal ? (
        <ExperienceJournalDrawer
          open={journalOpen}
          onClose={() => setJournalOpen(false)}
          list={() => apiClient.experienceJournal.list()}
          triage={(fingerprint, triageStatus) => apiClient.experienceJournal.triage(fingerprint, { triageStatus })}
        />
      ) : null}
      <BugReportDetailDrawer
        reportId={selectedId}
        liveVersion={inbox.data.find((row) => row.id === selectedId)?.updatedAt}
        requestImplementationChanges={inbox.requestImplementationChanges}
        onClose={() => setSelectedId(null)}
        getDetail={inbox.getDetail}
        triage={inbox.triage}
        approveImplementation={inbox.approveImplementation}
        approveImplementationCommit={inbox.approveImplementationCommit}
        approveImplementationDeploy={inbox.approveImplementationDeploy}
        retryImplementation={inbox.retryImplementation}
        authorizeWorkerRecoveryRetry={inbox.authorizeWorkerRecoveryRetry}
        authorizeSchemaRecoveryRetry={inbox.authorizeSchemaRecoveryRetry}
        authorizeQualityGateRecoveryRetry={inbox.authorizeQualityGateRecoveryRetry}
        authorizeBuildLockRecoveryRetry={inbox.authorizeBuildLockRecoveryRetry}
        confirmClose={inbox.confirmClose}
        comment={inbox.comment}
        canTriage={canTriage}
      />
    </>
  );
}
