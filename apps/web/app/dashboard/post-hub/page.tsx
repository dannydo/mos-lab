'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Steps,
  Typography,
  message,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ChartNoAxesCombined, CircleCheck, Link, Plus, RefreshCw, Send, Settings } from 'lucide-react';
import {
  type CreateSocialPostSubmissionDto,
  type ReviewSocialPostDto,
  type SocialPostApprovalRewardPreview,
  type SocialPostLeaderboardEntry,
  type SocialPostLeaderboardPeriod,
  type SocialPostLeaderboardResponse,
  type SocialPostListResponse,
  type SocialPostPosterDailyReward,
  type SocialPostPosterDailyRewardResponse,
  type SocialPostReviewStatus,
  type SocialPostRewardConfig,
  type SocialPostSubmission,
} from '@mos-lab/shared';
import {
  AppIcon,
  DataSection,
  DataTable,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  FeaturePage,
  ReportPeriodNavigator,
  SearchField,
  StatusTag,
  type ReportPeriodMode,
} from '~/components/ui';
import { apiClient } from '~/lib/api-client';
import { PostHubApprovalStage } from './components/PostHubApprovalStage';
import { PostHubDataStage } from './components/PostHubDataStage';
import { PostHubLeaderboardStage } from './components/PostHubLeaderboardStage';
import {
  displaySheetDate,
  formatReportPeriodLabel,
  PostHubOriginTag,
  REVIEW_STATUS_META,
  rewardRuleDescription,
} from './components/PostHubPresentation';

dayjs.extend(isoWeek);

const { Text } = Typography;

const QUICK_REVIEW_STATUSES: SocialPostReviewStatus[] = ['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'PENDING'];

type WorkflowStage = 0 | 1 | 2;
const API_PERIOD_BY_REPORT_MODE: Record<ReportPeriodMode, SocialPostLeaderboardPeriod> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
};

type ReviewFormValues = ReviewSocialPostDto;
type RewardConfigFormValues = SocialPostRewardConfig;
type CreateSubmissionFormValues = Omit<CreateSocialPostSubmissionDto, 'postedAt'> & { postedAt: Dayjs };

const NATIVE_CHANNEL_OPTIONS = [
  { value: 'Đăng trên hội nhóm', label: 'Facebook · Đăng trên hội nhóm' },
  { value: 'Đăng trên trang cá nhân', label: 'Facebook · Đăng trên trang cá nhân' },
  { value: 'Comment bài viết', label: 'Facebook · Comment bài viết' },
  { value: 'Facebook Reel', label: 'Facebook · Reel' },
  { value: 'Facebook Story', label: 'Facebook · Story' },
  { value: 'Video TikTok', label: 'TikTok · Video' },
];

export default function PostHubPage() {
  const { token } = theme.useToken();
  const [activeStage, setActiveStage] = useState<WorkflowStage>(0);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs('2026-08-17'));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SocialPostReviewStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dataAuthorStaffId, setDataAuthorStaffId] = useState<number | undefined>();
  const [approvalPage, setApprovalPage] = useState(1);
  const [approvalPageSize, setApprovalPageSize] = useState(20);
  const [approvalAuthorStaffId, setApprovalAuthorStaffId] = useState<number | undefined>();
  const [reportPeriodMode, setReportPeriodMode] = useState<ReportPeriodMode>('week');
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [response, setResponse] = useState<SocialPostListResponse | null>(null);
  const [dashboardResponse, setDashboardResponse] = useState<SocialPostListResponse | null>(null);
  const [approvalLedgerResponse, setApprovalLedgerResponse] = useState<SocialPostListResponse | null>(null);
  const [leaderboardResponse, setLeaderboardResponse] = useState<SocialPostLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<SocialPostSubmission | null>(null);
  const [rewardPreview, setRewardPreview] = useState<SocialPostApprovalRewardPreview | null>(null);
  const [rewardPreviewLoading, setRewardPreviewLoading] = useState(false);
  const [rewardPreviewError, setRewardPreviewError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [isRewardConfigOpen, setIsRewardConfigOpen] = useState(false);
  const [savingRewardConfig, setSavingRewardConfig] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<SocialPostLeaderboardEntry | null>(null);
  const [posterDailyResponse, setPosterDailyResponse] = useState<SocialPostPosterDailyRewardResponse | null>(null);
  const [posterDailyLoading, setPosterDailyLoading] = useState(false);
  const [posterDailyError, setPosterDailyError] = useState<string | null>(null);
  const [isPosterDailyOpen, setIsPosterDailyOpen] = useState(false);
  const [reviewForm] = Form.useForm<ReviewFormValues>();
  const [createForm] = Form.useForm<CreateSubmissionFormValues>();
  const [rewardConfigForm] = Form.useForm<RewardConfigFormValues>();
  const watchedReviewStatus = Form.useWatch('reviewStatus', reviewForm);
  const selectedReviewStatus = (watchedReviewStatus ||
    selectedSubmission?.reviewStatus ||
    'PENDING') as SocialPostReviewStatus;
  const requestIdRef = useRef(0);
  const rewardPreviewRequestIdRef = useRef(0);
  const posterDailyRequestIdRef = useRef(0);
  const didApplyInitialFiltersRef = useRef(false);
  const didApplyInitialDataAuthorFilterRef = useRef(false);
  const didApplyInitialApprovalAuthorFilterRef = useRef(false);

  const navigateReportPeriod = useCallback(
    (direction: -1 | 1) => {
      setSelectedDate((current) => current.add(direction, reportPeriodMode));
    },
    [reportPeriodMode]
  );

  useEffect(() => {
    const savedPage = Number(window.localStorage.getItem('post_hub_data_page'));
    const savedPageSize = Number(window.localStorage.getItem('post_hub_data_page_size'));
    const savedApprovalPage = Number(window.localStorage.getItem('post_hub_approve_page'));
    const savedApprovalPageSize = Number(window.localStorage.getItem('post_hub_approve_page_size'));
    const savedDate = window.localStorage.getItem('post_hub_selected_date');
    const savedStage = Number(window.localStorage.getItem('post_hub_active_stage'));
    const savedReportPeriodMode = window.localStorage.getItem('post_hub_report_period_mode');
    const savedQuery = window.localStorage.getItem('post_hub_search_query');
    const savedStatusFilter = window.localStorage.getItem('post_hub_status_filter');
    const savedDataAuthorStaffId = Number(window.localStorage.getItem('post_hub_data_author_staff_id'));
    const savedApprovalAuthorStaffId = Number(window.localStorage.getItem('post_hub_approve_author_staff_id'));
    const legacyLeaderboardRangeMode = window.localStorage.getItem('post_hub_leaderboard_range_mode');
    if (savedPage > 0) setPage(savedPage);
    if ([10, 20, 50, 100].includes(savedPageSize)) setPageSize(savedPageSize);
    if (savedApprovalPage > 0) setApprovalPage(savedApprovalPage);
    if ([10, 20, 50, 100].includes(savedApprovalPageSize)) setApprovalPageSize(savedApprovalPageSize);
    if (savedDate && dayjs(savedDate).isValid()) setSelectedDate(dayjs(savedDate));
    if ([0, 1, 2].includes(savedStage)) setActiveStage(savedStage as WorkflowStage);
    if (savedQuery !== null) setQuery(savedQuery);
    if (Number.isInteger(savedDataAuthorStaffId) && savedDataAuthorStaffId > 0) {
      setDataAuthorStaffId(savedDataAuthorStaffId);
    }
    if (Number.isInteger(savedApprovalAuthorStaffId) && savedApprovalAuthorStaffId > 0) {
      setApprovalAuthorStaffId(savedApprovalAuthorStaffId);
    }
    if (
      savedStatusFilter === 'ALL' ||
      (savedStatusFilter && Object.prototype.hasOwnProperty.call(REVIEW_STATUS_META, savedStatusFilter))
    ) {
      setStatusFilter(savedStatusFilter as 'ALL' | SocialPostReviewStatus);
    }
    if (savedReportPeriodMode === 'day' || savedReportPeriodMode === 'week' || savedReportPeriodMode === 'month') {
      setReportPeriodMode(savedReportPeriodMode);
    } else if (
      legacyLeaderboardRangeMode === 'DAY' ||
      legacyLeaderboardRangeMode === 'WEEK' ||
      legacyLeaderboardRangeMode === 'MONTH'
    ) {
      setReportPeriodMode(legacyLeaderboardRangeMode.toLowerCase() as ReportPeriodMode);
    }
    setPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) return;
    window.localStorage.setItem('post_hub_data_page', String(page));
    window.localStorage.setItem('post_hub_data_page_size', String(pageSize));
    window.localStorage.setItem('post_hub_approve_page', String(approvalPage));
    window.localStorage.setItem('post_hub_approve_page_size', String(approvalPageSize));
    window.localStorage.setItem('post_hub_selected_date', selectedDate.format('YYYY-MM-DD'));
    window.localStorage.setItem('post_hub_active_stage', String(activeStage));
    window.localStorage.setItem('post_hub_report_period_mode', reportPeriodMode);
    window.localStorage.setItem('post_hub_search_query', query);
    window.localStorage.setItem('post_hub_status_filter', statusFilter);
    if (dataAuthorStaffId) {
      window.localStorage.setItem('post_hub_data_author_staff_id', String(dataAuthorStaffId));
    } else {
      window.localStorage.removeItem('post_hub_data_author_staff_id');
    }
    if (approvalAuthorStaffId) {
      window.localStorage.setItem('post_hub_approve_author_staff_id', String(approvalAuthorStaffId));
    } else {
      window.localStorage.removeItem('post_hub_approve_author_staff_id');
    }
  }, [
    activeStage,
    approvalAuthorStaffId,
    approvalPage,
    approvalPageSize,
    dataAuthorStaffId,
    page,
    pageSize,
    preferencesHydrated,
    query,
    reportPeriodMode,
    selectedDate,
    statusFilter,
  ]);

  const fetchPostHub = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    try {
      const periodParams = {
        anchorDate: selectedDate.format('YYYY-MM-DD'),
        period: API_PERIOD_BY_REPORT_MODE[reportPeriodMode],
      };
      const [tableData, dailyData, approvalLedgerData, campaignLeaderboard] = await Promise.all([
        apiClient.postHub.list({
          ...periodParams,
          reviewStatus: statusFilter === 'ALL' ? undefined : statusFilter,
          authorStaffId: dataAuthorStaffId,
          search: query.trim() || undefined,
          page,
          limit: pageSize,
        }),
        apiClient.postHub.list({ ...periodParams, page: 1, limit: 100 }),
        apiClient.postHub.list({
          ...periodParams,
          approveLedger: true,
          authorStaffId: approvalAuthorStaffId,
          page: approvalPage,
          limit: approvalPageSize,
        }),
        apiClient.postHub.getLeaderboard(periodParams),
      ]);
      if (requestId !== requestIdRef.current) return;
      setResponse(tableData);
      setDashboardResponse(dailyData);
      setApprovalLedgerResponse(approvalLedgerData);
      setLeaderboardResponse(campaignLeaderboard);
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(error?.response?.data?.message || error?.message || 'Không thể tải dữ liệu Post Hub');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [
    approvalAuthorStaffId,
    approvalPage,
    approvalPageSize,
    dataAuthorStaffId,
    page,
    pageSize,
    query,
    reportPeriodMode,
    selectedDate,
    statusFilter,
  ]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    fetchPostHub();
  }, [fetchPostHub, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    if (!didApplyInitialFiltersRef.current) {
      didApplyInitialFiltersRef.current = true;
      return;
    }
    setPage(1);
    setApprovalPage(1);
  }, [preferencesHydrated, query, reportPeriodMode, selectedDate, statusFilter]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    if (!didApplyInitialDataAuthorFilterRef.current) {
      didApplyInitialDataAuthorFilterRef.current = true;
      return;
    }
    setPage(1);
  }, [dataAuthorStaffId, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    if (!didApplyInitialApprovalAuthorFilterRef.current) {
      didApplyInitialApprovalAuthorFilterRef.current = true;
      return;
    }
    setApprovalPage(1);
  }, [approvalAuthorStaffId, preferencesHydrated]);

  useEffect(() => {
    if (!selectedSubmission) {
      setRewardPreview(null);
      setRewardPreviewError(null);
      return;
    }
    reviewForm.setFieldsValue({
      reviewStatus: selectedSubmission.reviewStatus,
      reviewerComment: selectedSubmission.reviewerComment,
    });
    const requestId = rewardPreviewRequestIdRef.current + 1;
    rewardPreviewRequestIdRef.current = requestId;
    setRewardPreviewLoading(true);
    setRewardPreview(null);
    setRewardPreviewError(null);
    apiClient.postHub
      .getRewardPreview(selectedSubmission.id)
      .then((preview) => {
        if (requestId === rewardPreviewRequestIdRef.current) setRewardPreview(preview);
      })
      .catch((error: any) => {
        if (requestId === rewardPreviewRequestIdRef.current) {
          setRewardPreview(null);
          setRewardPreviewError(error?.response?.data?.message || 'Không thể tính thưởng dự kiến cho bài này.');
        }
      })
      .finally(() => {
        if (requestId === rewardPreviewRequestIdRef.current) setRewardPreviewLoading(false);
      });
  }, [reviewForm, selectedSubmission]);

  useEffect(() => {
    if (!selectedPoster) {
      setPosterDailyResponse(null);
      setPosterDailyError(null);
      return;
    }

    const requestId = posterDailyRequestIdRef.current + 1;
    posterDailyRequestIdRef.current = requestId;
    setPosterDailyLoading(true);
    setPosterDailyResponse(null);
    setPosterDailyError(null);
    apiClient.postHub
      .getPosterDailyRewards(selectedPoster.staffId, {
        anchorDate: selectedDate.format('YYYY-MM-DD'),
        period: API_PERIOD_BY_REPORT_MODE[reportPeriodMode],
      })
      .then((detail) => {
        if (requestId === posterDailyRequestIdRef.current) setPosterDailyResponse(detail);
      })
      .catch((error: any) => {
        if (requestId === posterDailyRequestIdRef.current) {
          setPosterDailyError(error?.response?.data?.message || 'Không thể tải điểm Daily của poster.');
        }
      })
      .finally(() => {
        if (requestId === posterDailyRequestIdRef.current) setPosterDailyLoading(false);
      });
  }, [reportPeriodMode, selectedDate, selectedPoster]);

  const data = response?.data || [];
  const dataAuthorOptions = response?.authorOptions || [];
  const approvalLedger = approvalLedgerResponse?.data || [];
  const approvalAuthorOptions = approvalLedgerResponse?.authorOptions || [];
  const summary = dashboardResponse?.summary || {
    submitted: 0,
    approved: 0,
    approvedVideo: 0,
    approvedRecruitment: 0,
    needsReview: 0,
    rejected: 0,
  };
  const leaderboard = leaderboardResponse?.data || [];
  const rewardConfig =
    leaderboardResponse?.rewardConfig || dashboardResponse?.rewardConfig || response?.rewardConfig || null;
  const rewardRule = rewardRuleDescription(rewardConfig);
  const approvalSummary = approvalLedgerResponse?.summary || {
    submitted: 0,
    approved: 0,
    approvedVideo: 0,
    approvedRecruitment: 0,
    needsReview: 0,
    rejected: 0,
  };
  const reportPeriodLabel = formatReportPeriodLabel(reportPeriodMode, selectedDate);
  const leaderboardPeriod =
    leaderboardResponse?.dateFrom && leaderboardResponse?.dateTo
      ? `${dayjs(leaderboardResponse.dateFrom).format('DD/MM/YYYY')} – ${dayjs(leaderboardResponse.dateTo).format('DD/MM/YYYY')}`
      : reportPeriodLabel;

  const openReview = (submission: SocialPostSubmission) => {
    setSelectedSubmission(submission);
    setIsReviewOpen(true);
  };

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      contentType: 'RECRUITMENT_POST',
      channel: 'Đăng trên hội nhóm',
      postedAt: dayjs(),
    });
    setIsCreateOpen(true);
  };

  const openPosterDaily = (poster: SocialPostLeaderboardEntry) => {
    setSelectedPoster(poster);
    setIsPosterDailyOpen(true);
  };

  const closePosterDaily = () => {
    setIsPosterDailyOpen(false);
    setSelectedPoster(null);
  };

  const openRewardConfig = () => {
    if (!rewardConfig) {
      message.warning('Cấu hình thưởng đang được tải. Vui lòng thử lại sau ít giây.');
      return;
    }
    rewardConfigForm.setFieldsValue(rewardConfig);
    setIsRewardConfigOpen(true);
  };

  const submitReview = async (values: ReviewFormValues) => {
    if (!selectedSubmission) return;
    setSavingReview(true);
    try {
      await apiClient.postHub.review(selectedSubmission.id, values);
      setIsReviewOpen(false);
      message.success('Đã lưu quyết định và tính lại Daily theo ngày bài đăng gốc. Bạn vẫn ở đúng mục đang duyệt.');
      await fetchPostHub();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu quyết định duyệt');
    } finally {
      setSavingReview(false);
    }
  };

  const submitCreate = async (values: CreateSubmissionFormValues) => {
    setSavingCreate(true);
    try {
      const result = await apiClient.postHub.create({
        ...values,
        postedAt: values.postedAt.toISOString(),
      });
      setIsCreateOpen(false);
      setActiveStage(0);
      setPage(1);
      setApprovalPage(1);
      setSelectedDate(values.postedAt);
      message.success(result.message);
      await fetchPostHub();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể ghi nhận bài đăng trong mOS');
    } finally {
      setSavingCreate(false);
    }
  };

  const submitRewardConfig = async (values: RewardConfigFormValues) => {
    setSavingRewardConfig(true);
    try {
      await apiClient.postHub.updateRewardConfig(values);
      setIsRewardConfigOpen(false);
      message.success('Đã lưu cấu hình. Daily được tính lại theo quy tắc mới.');
      await fetchPostHub();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu cấu hình thưởng');
    } finally {
      setSavingRewardConfig(false);
    }
  };

  const posterDailyColumns: ColumnsType<SocialPostPosterDailyReward> = [
    {
      title: 'Ngày đăng (ICT)',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (date: string) => <span className="font-medium tabular-nums">{dayjs(date).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Đã đăng',
      dataIndex: 'submittedCount',
      key: 'submittedCount',
      width: 90,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Video ✅',
      dataIndex: 'approvedVideoCount',
      key: 'approvedVideoCount',
      width: 100,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Bài khác ✅',
      dataIndex: 'approvedRecruitmentCount',
      key: 'approvedRecruitmentCount',
      width: 115,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Cần xem lại',
      dataIndex: 'needsReviewCount',
      key: 'needsReviewCount',
      width: 120,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: '🍌 ngày',
      dataIndex: 'bananaPoints',
      key: 'bananaPoints',
      width: 110,
      align: 'right',
      render: (value: number | null) =>
        value === null ? (
          <StatusTag status="orange" label="Cần cấu hình" />
        ) : (
          <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
            {value}
          </span>
        ),
    },
  ];

  return (
    <FeaturePage
      title="Post Hub chiến dịch"
      subtitle="Vận hành trực tiếp trong mOS: nộp link, duyệt chất lượng và tính thưởng theo ngày đăng gốc."
      icon={<AppIcon icon={Send} />}
      tag={<StatusTag status="success" label="mOS native" />}
      headerActions={
        <>
          <Button type="primary" icon={<AppIcon icon={Plus} />} onClick={openCreate}>
            Thêm bài đăng
          </Button>
          <Button icon={<AppIcon icon={Settings} />} disabled={!rewardConfig} onClick={openRewardConfig}>
            Cấu hình thưởng
          </Button>
          <Button icon={<AppIcon icon={RefreshCw} />} loading={loading} onClick={fetchPostHub}>
            Làm mới
          </Button>
        </>
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tài khoản mOS, nội dung, link hoặc mã nguồn…"
            aria-label="Tìm bài đăng"
            style={{ minWidth: 280 }}
          />
        ),
        filters: (
          <Space wrap>
            <ReportPeriodNavigator
              mode={reportPeriodMode}
              value={selectedDate}
              label={reportPeriodLabel}
              onModeChange={setReportPeriodMode}
              onPrevious={() => navigateReportPeriod(-1)}
              onNext={() => navigateReportPeriod(1)}
              onValueChange={setSelectedDate}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
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
        activeFilterCount: statusFilter === 'ALL' ? 0 : 1,
      }}
    >
      <div className="flex flex-col gap-5">
        <Alert
          type="success"
          showIcon
          message="Post Hub vận hành trực tiếp trong mOS"
          description={`Kỳ báo cáo: ${reportPeriodLabel} (ICT). Mọi bài mới được nộp bằng tài khoản mOS; 1.DATA, 2.APPROVE và Leaderboard đều lọc theo Ngày đăng gốc. Dữ liệu Sheet trước đây chỉ được giữ làm lịch sử.`}
        />

        {loadError && (
          <Alert
            type="error"
            showIcon
            message="Không tải được Post Hub"
            description={loadError}
            action={
              <Button size="small" onClick={fetchPostHub}>
                Thử lại
              </Button>
            }
          />
        )}

        <DataSection title="Luồng chiến dịch" bodyPadding="18px 20px">
          <Steps
            current={activeStage}
            onChange={(next) => setActiveStage(next as WorkflowStage)}
            responsive
            items={[
              { title: '1. DATA', description: `${summary.submitted} bài trong kỳ`, icon: <AppIcon icon={Send} /> },
              {
                title: '2. APPROVE',
                description: `${approvalLedgerResponse?.total ?? 0} kết quả duyệt trong kỳ`,
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

        {activeStage === 0 && (
          <PostHubDataStage
            summary={summary}
            reportPeriodLabel={reportPeriodLabel}
            response={response}
            data={data}
            authorOptions={dataAuthorOptions}
            selectedAuthorStaffId={dataAuthorStaffId}
            page={page}
            pageSize={pageSize}
            loading={loading}
            token={token}
            onAuthorChange={setDataAuthorStaffId}
            onPaginationChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
            onOpenReview={openReview}
          />
        )}

        {activeStage === 1 && (
          <PostHubApprovalStage
            summary={approvalSummary}
            reportPeriodLabel={reportPeriodLabel}
            response={approvalLedgerResponse}
            ledger={approvalLedger}
            authorOptions={approvalAuthorOptions}
            selectedAuthorStaffId={approvalAuthorStaffId}
            page={approvalPage}
            pageSize={approvalPageSize}
            loading={loading}
            token={token}
            onAuthorChange={setApprovalAuthorStaffId}
            onPaginationChange={(nextPage, nextPageSize) => {
              setApprovalPage(nextPage);
              setApprovalPageSize(nextPageSize);
            }}
            onOpenReview={openReview}
          />
        )}

        {activeStage === 2 && (
          <PostHubLeaderboardStage
            leaderboard={leaderboard}
            leaderboardPeriod={leaderboardPeriod}
            rewardRule={rewardRule}
            loading={loading}
            token={token}
            onOpenPosterDaily={openPosterDaily}
          />
        )}
      </div>

      <EntityFormDrawer
        open={isPosterDailyOpen}
        onClose={closePosterDaily}
        title={`Điểm Daily — ${selectedPoster?.member || 'Poster'}`}
        footer={<Button onClick={closePosterDaily}>Đóng</Button>}
      >
        <div className="flex flex-col gap-5">
          {posterDailyLoading && <Alert type="info" showIcon message="Đang tải ledger điểm Daily của poster…" />}
          {posterDailyError && (
            <Alert type="error" showIcon message="Không thể tải điểm Daily" description={posterDailyError} />
          )}
          {posterDailyResponse && (
            <>
              <Descriptions
                bordered
                size="small"
                column={1}
                items={[
                  {
                    key: 'total',
                    label: `Tổng 🍌 ${
                      posterDailyResponse.dateFrom && posterDailyResponse.dateTo
                        ? `${dayjs(posterDailyResponse.dateFrom).format('DD/MM/YYYY')} – ${dayjs(posterDailyResponse.dateTo).format('DD/MM/YYYY')}`
                        : reportPeriodLabel
                    }`,
                    children:
                      posterDailyResponse.totalBananaPoints === null ? (
                        <StatusTag status="orange" label="Có ngày cần cấu hình" />
                      ) : (
                        <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
                          {posterDailyResponse.totalBananaPoints} 🍌
                        </span>
                      ),
                  },
                  {
                    key: 'days',
                    label: 'Ngày có bài đăng trong kỳ',
                    children: <span className="tabular-nums">{posterDailyResponse.daily.length}</span>,
                  },
                  {
                    key: 'unresolved',
                    label: 'Ngày chờ cấu hình',
                    children: <span className="tabular-nums">{posterDailyResponse.unresolvedDayCount}</span>,
                  },
                  {
                    key: 'rule',
                    label: 'Quy tắc',
                    children: <Text type="secondary">{rewardRuleDescription(posterDailyResponse.rewardConfig)}</Text>,
                  },
                ]}
              />
              <DataSection
                title="Ledger điểm theo ngày đăng (ICT)"
                extra={<StatusTag status="gold" label="Daily Bonus" />}
              >
                <DataTable
                  rowKey="date"
                  columns={posterDailyColumns}
                  dataSource={posterDailyResponse.daily}
                  pagination={false}
                  stickyPrimaryColumn
                  columnPriority={{
                    date: 'primary',
                    submittedCount: 'secondary',
                    approvedVideoCount: 'secondary',
                    approvedRecruitmentCount: 'secondary',
                    needsReviewCount: 'tertiary',
                    bananaPoints: 'primary',
                  }}
                  mobileRecordKey={(record) => record.date}
                  mobileRenderer={(record) => (
                    <div className="rounded-xl border p-3" style={{ borderColor: token.colorBorderSecondary }}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold tabular-nums">{dayjs(record.date).format('DD/MM/YYYY')}</span>
                        {record.bananaPoints === null ? (
                          <StatusTag status="orange" label="Cần cấu hình" />
                        ) : (
                          <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
                            {record.bananaPoints} 🍌
                          </span>
                        )}
                      </div>
                      <Text type="secondary" className="mt-1 block text-xs">
                        {record.submittedCount} bài đăng · {record.approvedVideoCount} video ✅ ·{' '}
                        {record.approvedRecruitmentCount} bài khác ✅ · {record.needsReviewCount} cần xem lại
                      </Text>
                    </div>
                  )}
                />
              </DataSection>
            </>
          )}
        </div>
      </EntityFormDrawer>

      <EntityFormDrawer
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nộp bài đăng mOS"
        footer={
          <Space>
            <Button onClick={() => setIsCreateOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={savingCreate}
              icon={<AppIcon icon={Send} />}
              onClick={() => createForm.submit()}
            >
              Gửi duyệt
            </Button>
          </Space>
        }
      >
        <div className="flex flex-col gap-5">
          <Alert
            type="info"
            showIcon
            message="Bài đăng được ghi nhận cho chính tài khoản mOS của bạn"
            description="Chọn đúng ngày, giờ đăng (ICT). Bài sẽ vào hàng chờ; chỉ Hợp lệ mới được tính thưởng Daily."
          />
          <EntityForm form={createForm} onFinish={submitCreate} columns={1}>
            <EntityFormField
              fullWidth
              label="Link bài đăng"
              name="sourceUrl"
              rules={[
                { required: true, message: 'Nhập link Facebook hoặc TikTok' },
                { type: 'url', message: 'Link bài đăng chưa hợp lệ' },
              ]}
            >
              <Input placeholder="https://www.facebook.com/... hoặc https://www.tiktok.com/..." autoComplete="url" />
            </EntityFormField>
            <EntityFormField
              fullWidth
              label="Nơi đăng"
              name="channel"
              rules={[{ required: true, message: 'Chọn nơi đăng' }]}
            >
              <Select options={NATIVE_CHANNEL_OPTIONS} aria-label="Chọn nơi đăng" />
            </EntityFormField>
            <EntityFormField
              fullWidth
              label="Loại bài để tính thưởng"
              name="contentType"
              rules={[{ required: true, message: 'Chọn loại bài' }]}
            >
              <Select
                aria-label="Chọn loại bài đăng"
                options={[
                  { value: 'RECRUITMENT_POST', label: 'Bài khác · tính theo hệ số bài khác' },
                  { value: 'VIDEO', label: 'Video · tính theo hệ số Video' },
                ]}
              />
            </EntityFormField>
            <EntityFormField
              fullWidth
              label="Ngày, giờ đăng (ICT)"
              name="postedAt"
              rules={[{ required: true, message: 'Chọn ngày giờ đăng' }]}
            >
              <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" allowClear={false} />
            </EntityFormField>
          </EntityForm>
        </div>
      </EntityFormDrawer>

      <EntityFormDrawer
        open={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        title="Duyệt bài đăng"
        footer={
          <Space>
            <Button onClick={() => setIsReviewOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={savingReview}
              icon={<AppIcon icon={CircleCheck} />}
              onClick={() => reviewForm.submit()}
            >
              Lưu quyết định
            </Button>
          </Space>
        }
      >
        {selectedSubmission && (
          <div className="flex flex-col gap-5">
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'id',
                  label: 'Mã bài đăng',
                  children: <span className="tabular-nums">#{selectedSubmission.sourceRecordId}</span>,
                },
                {
                  key: 'origin',
                  label: 'Nguồn dữ liệu',
                  children: <PostHubOriginTag origin={selectedSubmission.origin} />,
                },
                {
                  key: 'author',
                  label: 'Người đăng / mOS',
                  children: `${selectedSubmission.author} · mOS #${selectedSubmission.staffId}`,
                },
                {
                  key: 'platform',
                  label: 'Kênh đăng',
                  children: `${selectedSubmission.source.platformLabel} · ${selectedSubmission.source.placementLabel}`,
                },
                {
                  key: 'destination',
                  label: 'Nơi đăng',
                  children: (
                    <>
                      {selectedSubmission.source.destinationLabel}
                      {selectedSubmission.source.placement === 'GROUP' &&
                        !selectedSubmission.source.destinationIdentified && (
                          <Text type="secondary" className="ml-1 text-xs">
                            (nguồn chưa có tên nhóm)
                          </Text>
                        )}
                    </>
                  ),
                },
                { key: 'channel', label: 'Khai báo lúc nộp', children: selectedSubmission.channel },
                {
                  key: 'posted',
                  label: 'Ngày đăng gốc (ICT)',
                  children: <span className="tabular-nums">{displaySheetDate(selectedSubmission.postedAt)}</span>,
                },
                {
                  key: 'reviewed',
                  label: 'Duyệt lúc (ICT)',
                  children: <span className="tabular-nums">{displaySheetDate(selectedSubmission.reviewedAt)}</span>,
                },
                { key: 'reviewer', label: 'Người duyệt', children: selectedSubmission.reviewerName || '—' },
                {
                  key: 'source',
                  label: 'Nguồn',
                  children: selectedSubmission.sourceUrl ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<AppIcon icon={Link} />}
                      href={selectedSubmission.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở link bài đăng
                    </Button>
                  ) : (
                    <Text type="secondary">Nguồn chưa có link</Text>
                  ),
                },
              ]}
            />
            {rewardPreviewLoading && (
              <Alert type="info" showIcon message="Đang tính thưởng Daily theo cấu hình hiện hành…" />
            )}
            {rewardPreviewError && (
              <Alert type="error" showIcon message="Không thể tải thưởng dự kiến" description={rewardPreviewError} />
            )}
            {rewardPreview && selectedReviewStatus === 'APPROVED' && (
              <Alert
                type={rewardPreview.projectedDailyPoints === null ? 'warning' : 'success'}
                showIcon
                message={
                  rewardPreview.projectedDailyPoints === null
                    ? 'Duyệt bài này cần cấu hình mức thưởng hỗn hợp'
                    : `Duyệt Hợp lệ: ${rewardPreview.contentLabel} · tổng Daily dự kiến ${rewardPreview.projectedDailyPoints} 🍌`
                }
                description={
                  <div className="flex flex-col gap-1">
                    <span>
                      Ngày ghi nhận:{' '}
                      <strong className="tabular-nums">{dayjs(rewardPreview.date).format('DD/MM/YYYY')} (ICT)</strong>.
                      Bài này được đếm là <strong>{rewardPreview.contentLabel}</strong>; hệ số cơ bản{' '}
                      <strong>{rewardPreview.basePoints} 🍌/bài</strong>.
                    </span>
                    <span>
                      Sau khi duyệt:{' '}
                      <strong className="tabular-nums">{rewardPreview.projectedApprovedVideoCount}</strong> Video ✅ ·{' '}
                      <strong className="tabular-nums">{rewardPreview.projectedApprovedRecruitmentCount}</strong> Bài
                      khác ✅.{' '}
                      {rewardPreview.isAlreadyApproved
                        ? 'Bài này đã ở trạng thái Hợp lệ.'
                        : 'Tổng 🍌 cuối ngày áp dụng cap theo cấu hình thưởng hiện hành.'}
                    </span>
                  </div>
                }
              />
            )}
            {rewardPreview && selectedReviewStatus !== 'APPROVED' && (
              <Alert
                type={selectedReviewStatus === 'REJECTED' ? 'error' : 'info'}
                showIcon
                message={`${REVIEW_STATUS_META[selectedReviewStatus].label}: chưa ghi nhận thưởng Daily`}
                description={
                  selectedReviewStatus === 'NEEDS_REVIEW'
                    ? 'Bài cần được kiểm tra lại; chỉ lựa chọn Hợp lệ mới đưa bài vào tổng 🍌 của ngày đăng gốc.'
                    : selectedReviewStatus === 'REJECTED'
                      ? 'Bài không hợp lệ nên không tính 🍌. Có thể đổi sang Hợp lệ khi đã xác minh xong.'
                      : 'Bài vẫn ở hàng chờ; chọn Hợp lệ để xem tổng 🍌 Daily dự kiến trước khi lưu.'
                }
              />
            )}
            <EntityForm form={reviewForm} onFinish={submitReview} columns={1}>
              <Form.Item name="reviewStatus" hidden rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <EntityFormField fullWidth label="Kết quả duyệt nhanh">
                <Space wrap size={[8, 8]}>
                  {QUICK_REVIEW_STATUSES.map((status) => {
                    const meta = REVIEW_STATUS_META[status];
                    const isSelected = selectedReviewStatus === status;
                    return (
                      <Button
                        key={status}
                        type={isSelected ? 'primary' : 'default'}
                        danger={status === 'REJECTED'}
                        icon={<AppIcon icon={meta.icon} />}
                        aria-pressed={isSelected}
                        onClick={() => reviewForm.setFieldValue('reviewStatus', status)}
                      >
                        {status === 'APPROVED' ? 'Hợp lệ +🍌' : meta.label}
                      </Button>
                    );
                  })}
                </Space>
              </EntityFormField>
              <EntityFormField fullWidth label="Ghi chú" name="reviewerComment">
                <Input.TextArea rows={4} placeholder="Ghi chú cho người đăng…" />
              </EntityFormField>
            </EntityForm>
          </div>
        )}
      </EntityFormDrawer>

      <EntityFormDrawer
        open={isRewardConfigOpen}
        onClose={() => setIsRewardConfigOpen(false)}
        title="Cấu hình thưởng đăng bài"
        footer={
          <Space>
            <Button onClick={() => setIsRewardConfigOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={savingRewardConfig}
              icon={<AppIcon icon={CircleCheck} />}
              onClick={() => rewardConfigForm.submit()}
            >
              Lưu cấu hình
            </Button>
          </Space>
        }
      >
        <div className="flex flex-col gap-5">
          <Alert
            type="info"
            showIcon
            message="Áp dụng theo thứ tự: cap Video → cap Bài khác → tính hệ số → mức hỗn hợp vượt ngưỡng"
            description="Để trống mức hỗn hợp vượt ngưỡng sẽ giữ trạng thái chưa xác định để quản lý tự cấu hình. Chỉ Admin hoặc Quản lý chiến dịch mới có thể lưu."
          />
          <EntityForm form={rewardConfigForm} onFinish={submitRewardConfig} columns={2}>
            <EntityFormField label="🍌 mỗi Video hợp lệ" name="videoPoints" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="🍌 mỗi Bài khác hợp lệ" name="recruitmentPoints" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="Cap Video khi số lượng >" name="videoCapThreshold" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="🍌 cap Video" name="videoCapPoints" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField
              label="Cap Bài khác khi số lượng >"
              name="recruitmentCapThreshold"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="🍌 cap Bài khác" name="recruitmentCapPoints" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="Tổng tối đa tính theo hệ số" name="mixedEligibleTotal" rules={[{ required: true }]}>
              <InputNumber min={0} max={100000} precision={0} className="w-full" />
            </EntityFormField>
            <EntityFormField label="🍌 khi tổng hỗn hợp vượt ngưỡng" name="mixedOverflowPoints">
              <InputNumber
                min={0}
                max={100000}
                precision={0}
                placeholder="Để trống = cần cấu hình"
                className="w-full"
              />
            </EntityFormField>
          </EntityForm>
        </div>
      </EntityFormDrawer>
    </FeaturePage>
  );
}
