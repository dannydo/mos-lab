'use client';

import React from 'react';
import { Alert, Button, Select, Space, Steps, theme } from 'antd';
import { ChartNoAxesCombined, CircleCheck, Plus, RefreshCw, Send, Settings } from 'lucide-react';
import {
  AppIcon,
  DataSection,
  FeaturePage,
  IconButton,
  ReportPeriodNavigator,
  SearchField,
  StatusTag,
} from '~/components/ui';
import AcademyAccessGate from '../academy-leads/components/AcademyAccessGate';
import { PostHubApprovalStage } from './components/PostHubApprovalStage';
import { PostHubDataStage } from './components/PostHubDataStage';
import { PostHubLeaderboardStage } from './components/PostHubLeaderboardStage';
import { PostHubPosterDailyDrawer } from './components/PostHubPosterDailyDrawer';
import { REVIEW_STATUS_META } from './components/PostHubPresentation';
import { PostHubReviewDrawer } from './components/PostHubReviewDrawer';
import { PostHubCreateDrawer } from './post-hub-page-modules/PostHubCreateDrawer';
import { PostHubRewardConfigDrawer } from './post-hub-page-modules/PostHubRewardConfigDrawer';
import type { WorkflowStage } from './post-hub-page-modules/postHubPageConstants';
import { usePostHubDataAndFilters } from './post-hub-page-modules/usePostHubDataAndFilters';
import { usePostHubDrawers } from './post-hub-page-modules/usePostHubDrawers';

function PostHubPageContent() {
  const { token } = theme.useToken();
  const dataState = usePostHubDataAndFilters();
  const drawers = usePostHubDrawers({
    selectedDate: dataState.selectedDate,
    reportPeriodMode: dataState.reportPeriodMode,
    rewardConfig: dataState.rewardConfig,
    fetchPostHub: dataState.fetchPostHub,
    onCreateSuccess: dataState.applyCreatedSubmissionFocus,
  });

  return (
    <FeaturePage
      title="Post Hub chiến dịch"
      subtitle="Vận hành trực tiếp trong mOS: nộp link, duyệt chất lượng và tính thưởng theo ngày đăng gốc."
      icon={<AppIcon icon={Send} />}
      tag={<StatusTag status="success" label="mOS native" />}
      headerActions={
        <Space size={6} align="center">
          <Button
            type="primary"
            className="post-hub-create-action"
            icon={
              <span aria-hidden className="post-hub-create-action__icon">
                <AppIcon icon={Plus} />
              </span>
            }
            onClick={drawers.openCreate}
          >
            Thêm bài đăng
          </Button>
          <IconButton
            label="Cấu hình thưởng"
            icon={Settings}
            disabled={!dataState.rewardConfig}
            onClick={drawers.openRewardConfig}
          />
          <IconButton
            label="Làm mới dữ liệu Post Hub"
            icon={RefreshCw}
            loading={dataState.loading}
            onClick={dataState.fetchPostHub}
          />
        </Space>
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={dataState.query}
            onChange={(event) => dataState.setQuery(event.target.value)}
            placeholder="Tìm tài khoản mOS, nội dung, link hoặc mã nguồn…"
            aria-label="Tìm bài đăng"
            style={{ minWidth: 280 }}
          />
        ),
        filters: (
          <Space wrap>
            <ReportPeriodNavigator
              mode={dataState.reportPeriodMode}
              value={dataState.selectedDate}
              label={dataState.reportPeriodLabel}
              onModeChange={dataState.setReportPeriodMode}
              onPrevious={() => dataState.navigateReportPeriod(-1)}
              onNext={() => dataState.navigateReportPeriod(1)}
              onValueChange={dataState.setSelectedDate}
            />
            <Select
              value={dataState.statusFilter}
              onChange={dataState.setStatusFilter}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                ...Object.entries(REVIEW_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
              ]}
              aria-label="Lọc theo trạng thái duyệt"
              style={{ width: 190 }}
            />
          </Space>
        ),
        filterTitle: 'Kỳ báo cáo và trạng thái',
        filterTriggerLabel: 'Lọc',
        activeFilterCount: dataState.statusFilter === 'ALL' ? 0 : 1,
      }}
    >
      <div className="flex flex-col gap-5">
        <Alert
          type="success"
          showIcon
          message="Post Hub vận hành trực tiếp trong mOS"
          description={`Kỳ báo cáo: ${dataState.reportPeriodLabel} (ICT). Mọi bài mới được nộp bằng tài khoản mOS; 1.DATA, 2.APPROVE và Leaderboard đều lọc theo Ngày đăng gốc. Dữ liệu Sheet trước đây chỉ được giữ làm lịch sử.`}
        />

        {dataState.loadError && (
          <Alert
            type="error"
            showIcon
            message="Không tải được Post Hub"
            description={dataState.loadError}
            action={
              <Button size="small" onClick={dataState.fetchPostHub}>
                Thử lại
              </Button>
            }
          />
        )}

        <DataSection title="Luồng chiến dịch" bodyPadding="18px 20px">
          <Steps
            current={dataState.activeStage}
            onChange={(next) => dataState.setActiveStage(next as WorkflowStage)}
            responsive
            items={[
              {
                title: '1. DATA',
                description: `${dataState.summary.submitted} bài trong kỳ`,
                icon: <AppIcon icon={Send} />,
              },
              {
                title: '2. APPROVE',
                description: `${dataState.approvalLedgerResponse?.total ?? 0} kết quả duyệt trong kỳ`,
                icon: <AppIcon icon={CircleCheck} />,
              },
              {
                title: 'LEADERBOARD',
                description: 'Xếp hạng & điểm Daily',
                icon: <AppIcon icon={ChartNoAxesCombined} />,
              },
            ]}
          />
        </DataSection>

        {dataState.activeStage === 0 && (
          <PostHubDataStage
            summary={dataState.summary}
            reportPeriodLabel={dataState.reportPeriodLabel}
            response={dataState.response}
            data={dataState.data}
            authorOptions={dataState.dataAuthorOptions}
            selectedAuthorStaffId={dataState.dataAuthorStaffId}
            selectedSourcePlatform={dataState.dataSourcePlatform}
            page={dataState.page}
            pageSize={dataState.pageSize}
            loading={dataState.loading}
            token={token}
            onAuthorChange={dataState.setDataAuthorStaffId}
            onSourcePlatformChange={dataState.setDataSourcePlatform}
            onPaginationChange={(nextPage, nextPageSize) => {
              dataState.setPage(nextPage);
              dataState.setPageSize(nextPageSize);
            }}
            onOpenReview={drawers.openReview}
          />
        )}

        {dataState.activeStage === 1 && (
          <PostHubApprovalStage
            summary={dataState.approvalSummary}
            reportPeriodLabel={dataState.reportPeriodLabel}
            response={dataState.approvalLedgerResponse}
            ledger={dataState.approvalLedger}
            authorOptions={dataState.approvalAuthorOptions}
            selectedAuthorStaffId={dataState.approvalAuthorStaffId}
            page={dataState.approvalPage}
            pageSize={dataState.approvalPageSize}
            loading={dataState.loading}
            token={token}
            onAuthorChange={dataState.setApprovalAuthorStaffId}
            onPaginationChange={(nextPage, nextPageSize) => {
              dataState.setApprovalPage(nextPage);
              dataState.setApprovalPageSize(nextPageSize);
            }}
            onOpenReview={drawers.openReview}
          />
        )}

        {dataState.activeStage === 2 && (
          <PostHubLeaderboardStage
            leaderboard={dataState.leaderboard}
            leaderboardPeriod={dataState.leaderboardPeriod}
            rewardRule={dataState.rewardRule}
            loading={dataState.loading}
            token={token}
            onOpenPosterDaily={drawers.openPosterDaily}
          />
        )}
      </div>

      <PostHubPosterDailyDrawer
        open={drawers.isPosterDailyOpen}
        poster={drawers.selectedPoster}
        response={drawers.posterDailyResponse}
        loading={drawers.posterDailyLoading}
        error={drawers.posterDailyError}
        reportPeriodLabel={dataState.reportPeriodLabel}
        onClose={drawers.closePosterDaily}
      />

      <PostHubCreateDrawer
        open={drawers.isCreateOpen}
        saving={drawers.savingCreate}
        form={drawers.createForm}
        onClose={drawers.closeCreate}
        onSubmit={drawers.submitCreate}
      />

      <PostHubReviewDrawer
        open={drawers.isReviewOpen}
        submission={drawers.selectedSubmission}
        form={drawers.reviewForm}
        rewardPreview={drawers.rewardPreview}
        rewardPreviewLoading={drawers.rewardPreviewLoading}
        rewardPreviewError={drawers.rewardPreviewError}
        saving={drawers.savingReview}
        onClose={drawers.closeReview}
        onSubmit={drawers.submitReview}
      />

      <PostHubRewardConfigDrawer
        open={drawers.isRewardConfigOpen}
        saving={drawers.savingRewardConfig}
        form={drawers.rewardConfigForm}
        onClose={drawers.closeRewardConfig}
        onSubmit={drawers.submitRewardConfig}
      />
    </FeaturePage>
  );
}

export default function PostHubPage() {
  return (
    <AcademyAccessGate>
      <PostHubPageContent />
    </AcademyAccessGate>
  );
}
