'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type {
  SocialPostLeaderboardResponse,
  SocialPostListResponse,
  SocialPostPlatformFilter,
  SocialPostReviewStatus,
} from '@mos-lab/shared';
import type { ReportPeriodMode } from '~/components/ui';
import { apiClient } from '~/lib/api-client';
import { formatReportPeriodLabel, rewardRuleDescription } from '../components/PostHubPresentation';
import {
  API_PERIOD_BY_REPORT_MODE,
  DEFAULT_POST_HUB_ANCHOR_DATE,
  EMPTY_POST_HUB_SUMMARY,
  readPostHubPreferences,
  type WorkflowStage,
  writePostHubPreferences,
} from './postHubPageConstants';

dayjs.extend(isoWeek);

/**
 * Manages Post Hub period navigation, persisted filters, pagination, and concurrent stage fetches.
 */
export function usePostHubDataAndFilters() {
  const [activeStage, setActiveStage] = useState<WorkflowStage>(0);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs(DEFAULT_POST_HUB_ANCHOR_DATE));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SocialPostReviewStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [dataAuthorStaffId, setDataAuthorStaffId] = useState<number | undefined>();
  const [dataSourcePlatform, setDataSourcePlatform] = useState<'ALL' | SocialPostPlatformFilter>('ALL');
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

  const requestIdRef = useRef(0);
  const didApplyInitialFiltersRef = useRef(false);
  const didApplyInitialDataFiltersRef = useRef(false);
  const didApplyInitialApprovalAuthorFilterRef = useRef(false);

  const navigateReportPeriod = useCallback(
    (direction: -1 | 1) => {
      setSelectedDate((current) => current.add(direction, reportPeriodMode));
    },
    [reportPeriodMode]
  );

  useEffect(() => {
    const prefs = readPostHubPreferences();
    if (prefs.page !== undefined) setPage(prefs.page);
    if (prefs.pageSize !== undefined) setPageSize(prefs.pageSize);
    if (prefs.approvalPage !== undefined) setApprovalPage(prefs.approvalPage);
    if (prefs.approvalPageSize !== undefined) setApprovalPageSize(prefs.approvalPageSize);
    if (prefs.selectedDate !== undefined) setSelectedDate(prefs.selectedDate);
    if (prefs.activeStage !== undefined) setActiveStage(prefs.activeStage);
    if (prefs.query !== undefined) setQuery(prefs.query);
    if (prefs.dataAuthorStaffId !== undefined) setDataAuthorStaffId(prefs.dataAuthorStaffId);
    if (prefs.dataSourcePlatform !== undefined) setDataSourcePlatform(prefs.dataSourcePlatform);
    if (prefs.approvalAuthorStaffId !== undefined) setApprovalAuthorStaffId(prefs.approvalAuthorStaffId);
    if (prefs.statusFilter !== undefined) setStatusFilter(prefs.statusFilter);
    if (prefs.reportPeriodMode !== undefined) setReportPeriodMode(prefs.reportPeriodMode);
    setPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) return;
    writePostHubPreferences({
      page,
      pageSize,
      approvalPage,
      approvalPageSize,
      selectedDate,
      activeStage,
      reportPeriodMode,
      query,
      statusFilter,
      dataAuthorStaffId,
      dataSourcePlatform,
      approvalAuthorStaffId,
    });
  }, [
    activeStage,
    approvalAuthorStaffId,
    approvalPage,
    approvalPageSize,
    dataAuthorStaffId,
    dataSourcePlatform,
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
          sourcePlatform: dataSourcePlatform === 'ALL' ? undefined : dataSourcePlatform,
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
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setLoadError(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu Post Hub');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [
    approvalAuthorStaffId,
    approvalPage,
    approvalPageSize,
    dataAuthorStaffId,
    dataSourcePlatform,
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
    if (!didApplyInitialDataFiltersRef.current) {
      didApplyInitialDataFiltersRef.current = true;
      return;
    }
    setPage(1);
  }, [dataAuthorStaffId, dataSourcePlatform, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    if (!didApplyInitialApprovalAuthorFilterRef.current) {
      didApplyInitialApprovalAuthorFilterRef.current = true;
      return;
    }
    setApprovalPage(1);
  }, [approvalAuthorStaffId, preferencesHydrated]);

  const applyCreatedSubmissionFocus = useCallback((postedAt: Dayjs) => {
    setActiveStage(0);
    setPage(1);
    setApprovalPage(1);
    setSelectedDate(postedAt);
  }, []);

  const data = response?.data || [];
  const dataAuthorOptions = response?.authorOptions || [];
  const approvalLedger = approvalLedgerResponse?.data || [];
  const approvalAuthorOptions = approvalLedgerResponse?.authorOptions || [];
  const summary = dashboardResponse?.summary || EMPTY_POST_HUB_SUMMARY;
  const leaderboard = leaderboardResponse?.data || [];
  const rewardConfig =
    leaderboardResponse?.rewardConfig || dashboardResponse?.rewardConfig || response?.rewardConfig || null;
  const rewardRule = rewardRuleDescription(rewardConfig);
  const approvalSummary = approvalLedgerResponse?.summary || EMPTY_POST_HUB_SUMMARY;
  const reportPeriodLabel = formatReportPeriodLabel(reportPeriodMode, selectedDate);
  const leaderboardPeriod =
    leaderboardResponse?.dateFrom && leaderboardResponse?.dateTo
      ? `${dayjs(leaderboardResponse.dateFrom).format('DD/MM/YYYY')} – ${dayjs(leaderboardResponse.dateTo).format('DD/MM/YYYY')}`
      : reportPeriodLabel;

  return {
    activeStage,
    setActiveStage,
    selectedDate,
    setSelectedDate,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    dataAuthorStaffId,
    setDataAuthorStaffId,
    dataSourcePlatform,
    setDataSourcePlatform,
    approvalPage,
    setApprovalPage,
    approvalPageSize,
    setApprovalPageSize,
    approvalAuthorStaffId,
    setApprovalAuthorStaffId,
    reportPeriodMode,
    setReportPeriodMode,
    navigateReportPeriod,
    fetchPostHub,
    applyCreatedSubmissionFocus,
    response,
    approvalLedgerResponse,
    loading,
    loadError,
    data,
    dataAuthorOptions,
    approvalLedger,
    approvalAuthorOptions,
    summary,
    leaderboard,
    rewardConfig,
    rewardRule,
    approvalSummary,
    reportPeriodLabel,
    leaderboardPeriod,
  };
}
