'use client';

import { useEffect, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Form, message } from 'antd';
import type {
  SocialPostApprovalRewardPreview,
  SocialPostLeaderboardEntry,
  SocialPostPosterDailyRewardResponse,
  SocialPostRewardConfig,
  SocialPostSubmission,
} from '@mos-lab/shared';
import type { ReportPeriodMode } from '~/components/ui';
import { apiClient } from '~/lib/api-client';
import {
  API_PERIOD_BY_REPORT_MODE,
  type CreateSubmissionFormValues,
  type ReviewFormValues,
  type RewardConfigFormValues,
} from './postHubPageConstants';

interface UsePostHubDrawersParams {
  selectedDate: Dayjs;
  reportPeriodMode: ReportPeriodMode;
  rewardConfig: SocialPostRewardConfig | null;
  fetchPostHub: () => Promise<void>;
  onCreateSuccess: (postedAt: Dayjs) => void;
}

function getResponseErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { message?: string } } };
    if (err.response?.data?.message) return err.response.data.message;
  }
  return fallback;
}

/**
 * Manages Post Hub drawer visibility, form instances, preview queries, and mutations.
 */
export function usePostHubDrawers({
  selectedDate,
  reportPeriodMode,
  rewardConfig,
  fetchPostHub,
  onCreateSuccess,
}: UsePostHubDrawersParams) {
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

  const rewardPreviewRequestIdRef = useRef(0);
  const posterDailyRequestIdRef = useRef(0);

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
      .catch((error: unknown) => {
        if (requestId === rewardPreviewRequestIdRef.current) {
          setRewardPreview(null);
          setRewardPreviewError(getResponseErrorMessage(error, 'Không thể tính thưởng dự kiến cho bài này.'));
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
      .catch((error: unknown) => {
        if (requestId === posterDailyRequestIdRef.current) {
          setPosterDailyError(getResponseErrorMessage(error, 'Không thể tải điểm Daily của poster.'));
        }
      })
      .finally(() => {
        if (requestId === posterDailyRequestIdRef.current) setPosterDailyLoading(false);
      });
  }, [reportPeriodMode, selectedDate, selectedPoster]);

  const openReview = (submission: SocialPostSubmission) => {
    setSelectedSubmission(submission);
    setIsReviewOpen(true);
  };

  const closeReview = () => setIsReviewOpen(false);

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      contentType: 'RECRUITMENT_POST',
      channel: 'Đăng trên hội nhóm',
      postedAt: dayjs(),
    });
    setIsCreateOpen(true);
  };

  const closeCreate = () => setIsCreateOpen(false);

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

  const closeRewardConfig = () => setIsRewardConfigOpen(false);

  const submitReview = async (values: ReviewFormValues) => {
    if (!selectedSubmission) return;
    setSavingReview(true);
    try {
      await apiClient.postHub.review(selectedSubmission.id, values);
      setIsReviewOpen(false);
      message.success('Đã lưu quyết định và tính lại Daily theo ngày bài đăng gốc. Bạn vẫn ở đúng mục đang duyệt.');
      await fetchPostHub();
    } catch (error: unknown) {
      message.error(getResponseErrorMessage(error, 'Không thể lưu quyết định duyệt'));
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
      onCreateSuccess(values.postedAt);
      message.success(result.message);
      await fetchPostHub();
    } catch (error: unknown) {
      message.error(getResponseErrorMessage(error, 'Không thể ghi nhận bài đăng trong mOS'));
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
    } catch (error: unknown) {
      message.error(getResponseErrorMessage(error, 'Không thể lưu cấu hình thưởng'));
    } finally {
      setSavingRewardConfig(false);
    }
  };

  return {
    selectedSubmission,
    rewardPreview,
    rewardPreviewLoading,
    rewardPreviewError,
    isReviewOpen,
    savingReview,
    reviewForm,
    openReview,
    closeReview,
    submitReview,
    isCreateOpen,
    savingCreate,
    createForm,
    openCreate,
    closeCreate,
    submitCreate,
    isRewardConfigOpen,
    savingRewardConfig,
    rewardConfigForm,
    openRewardConfig,
    closeRewardConfig,
    submitRewardConfig,
    selectedPoster,
    posterDailyResponse,
    posterDailyLoading,
    posterDailyError,
    isPosterDailyOpen,
    openPosterDaily,
    closePosterDaily,
  };
}
