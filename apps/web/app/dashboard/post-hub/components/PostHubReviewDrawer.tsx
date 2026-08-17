'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Alert, Button, Descriptions, Form, Input, Space, Typography, type FormInstance } from 'antd';
import { CircleCheck, Link } from 'lucide-react';
import type {
  ReviewSocialPostDto,
  SocialPostApprovalRewardPreview,
  SocialPostReviewStatus,
  SocialPostSubmission,
} from '@mos-lab/shared';
import { AppIcon, EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';
import { displaySheetDate, PostHubOriginTag, REVIEW_STATUS_META } from './PostHubPresentation';

const { Text } = Typography;

const QUICK_REVIEW_STATUSES: SocialPostReviewStatus[] = ['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'PENDING'];

interface PostHubReviewDrawerProps {
  open: boolean;
  submission: SocialPostSubmission | null;
  form: FormInstance<ReviewSocialPostDto>;
  rewardPreview: SocialPostApprovalRewardPreview | null;
  rewardPreviewLoading: boolean;
  rewardPreviewError: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: ReviewSocialPostDto) => void | Promise<void>;
}

export function PostHubReviewDrawer({
  open,
  submission,
  form,
  rewardPreview,
  rewardPreviewLoading,
  rewardPreviewError,
  saving,
  onClose,
  onSubmit,
}: PostHubReviewDrawerProps) {
  const watchedReviewStatus = Form.useWatch('reviewStatus', form);
  const selectedReviewStatus = (watchedReviewStatus || submission?.reviewStatus || 'PENDING') as SocialPostReviewStatus;

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title="Duyệt bài đăng"
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={saving} icon={<AppIcon icon={CircleCheck} />} onClick={() => form.submit()}>
            Lưu quyết định
          </Button>
        </Space>
      }
    >
      {submission && (
        <div className="flex flex-col gap-5">
          <Descriptions
            bordered
            size="small"
            column={1}
            items={[
              {
                key: 'id',
                label: 'Mã bài đăng',
                children: <span className="tabular-nums">#{submission.sourceRecordId}</span>,
              },
              {
                key: 'origin',
                label: 'Nguồn dữ liệu',
                children: <PostHubOriginTag origin={submission.origin} />,
              },
              {
                key: 'author',
                label: 'Người đăng / mOS',
                children: `${submission.author} · mOS #${submission.staffId}`,
              },
              {
                key: 'platform',
                label: 'Kênh đăng',
                children: `${submission.source.platformLabel} · ${submission.source.placementLabel}`,
              },
              {
                key: 'destination',
                label: 'Nơi đăng',
                children: (
                  <>
                    {submission.source.destinationLabel}
                    {submission.source.placement === 'GROUP' && !submission.source.destinationIdentified && (
                      <Text type="secondary" className="ml-1 text-xs">
                        (nguồn chưa có tên nhóm)
                      </Text>
                    )}
                  </>
                ),
              },
              { key: 'channel', label: 'Khai báo lúc nộp', children: submission.channel },
              {
                key: 'posted',
                label: 'Ngày đăng gốc (ICT)',
                children: <span className="tabular-nums">{displaySheetDate(submission.postedAt)}</span>,
              },
              {
                key: 'reviewed',
                label: 'Duyệt lúc (ICT)',
                children: <span className="tabular-nums">{displaySheetDate(submission.reviewedAt)}</span>,
              },
              { key: 'reviewer', label: 'Người duyệt', children: submission.reviewerName || '—' },
              {
                key: 'source',
                label: 'Nguồn',
                children: submission.sourceUrl ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<AppIcon icon={Link} />}
                    href={submission.sourceUrl}
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
                    Sau khi duyệt: <strong className="tabular-nums">{rewardPreview.projectedApprovedVideoCount}</strong>{' '}
                    Video ✅ ·{' '}
                    <strong className="tabular-nums">{rewardPreview.projectedApprovedRecruitmentCount}</strong> Bài khác
                    ✅.{' '}
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
          <EntityForm form={form} onFinish={onSubmit} columns={1}>
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
                      onClick={() => form.setFieldValue('reviewStatus', status)}
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
  );
}
