import {
  BUG_REPORT_MAX_ATTACHMENTS,
  BUG_REPORT_MAX_ATTACHMENT_BYTES,
  type BugReportContext,
  type BugReportExpertDetails,
  type BugReportExpertImpact,
  type BugReportRequestType,
  type CreateBugReportAttachmentRequest,
  type FeatureRequestAudience,
  type MyBugReportItem,
} from '@mos-lab/shared';

export const MAX_ATTACHMENTS = BUG_REPORT_MAX_ATTACHMENTS ?? 10;
export const MAX_ATTACHMENT_BYTES = BUG_REPORT_MAX_ATTACHMENT_BYTES ?? 5 * 1024 * 1024;
export const EXPERT_DETAILS_PREFERENCE_KEY = 'mos_bug_report_expert_details_v1';

export const FEATURE_AUDIENCE_OPTIONS: Array<{ value: FeatureRequestAudience; label: string }> = [
  { value: 'SELF', label: 'Cá nhân tôi' },
  { value: 'TEAM', label: 'Đội / bộ phận của tôi' },
  { value: 'ALL_STAFF', label: 'Tất cả nhân viên' },
  { value: 'CUSTOMER', label: 'Khách hàng' },
];

export const EXPERT_IMPACT_OPTIONS: Array<{ value: BugReportExpertImpact; label: string }> = [
  { value: 'LOW', label: 'Thấp · có thể tiếp tục làm việc' },
  { value: 'MEDIUM', label: 'Trung bình · gây bất tiện' },
  { value: 'HIGH', label: 'Cao · chặn công việc' },
];

export type ReleaseMarker = { deployedAt: string | null; commitSha: string | null };

export function buildOptimisticBugReportItem(params: {
  id: number;
  key: string;
  requestType: BugReportRequestType;
  description: string;
  submissionContext: BugReportContext;
  attachments: CreateBugReportAttachmentRequest[];
  featureReason: string;
  featureAudience: FeatureRequestAudience;
  featureDesiredOutcome: string;
  expertDetails: BugReportExpertDetails;
}): MyBugReportItem {
  const {
    id,
    key,
    requestType,
    description,
    submissionContext,
    attachments,
    featureReason,
    featureAudience,
    featureDesiredOutcome,
    expertDetails,
  } = params;
  const nowIso = new Date().toISOString();

  return {
    id,
    key,
    requestType,
    title: description,
    description,
    status: 'NEW',
    priority: null,
    triageNote: null,
    sourcePath: submissionContext.path,
    overlay: submissionContext.overlays[0] || null,
    attachmentCount: attachments.length,
    commentCount: 0,
    clarification: {
      status: 'PENDING_AGENT',
      summary: null,
      clarifiedAt: null,
    },
    reopen: null,
    agentProgress: {
      stage: 'NOT_VIEWED',
      note: null,
      updatedAt: nowIso,
    },
    implementation: null,
    nextAction: {
      actor: 'AGENT',
      type: 'NONE',
      label: 'Chờ tiếp nhận',
      detail: 'mOS đang chuẩn bị tiếp nhận yêu cầu của bạn.',
      waitingSince: nowIso,
    },
    reporterExperience: {
      state: 'RECEIVED',
      label: 'Đã nhận yêu cầu',
      summary: 'mOS đang xem yêu cầu và thông tin bạn đã gửi.',
      nextAction: {
        label: 'Bạn chưa cần làm gì',
        detail: 'mOS sẽ báo bạn khi cần thêm thông tin hoặc có kết quả để kiểm tra.',
      },
      updates: [{ label: 'Đã nhận yêu cầu của bạn', occurredAt: nowIso }],
    },
    reporter: { id: 0, displayName: 'Tôi', role: 'CV', avatarUrl: null },
    approvedAt: null,
    timeline: {
      reportedAt: nowIso,
      approvedAt: null,
      startedAt: null,
      fixedAt: null,
      closedAt: null,
      updatedAt: nowIso,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
    resolution: null,
    evidenceAttachments: attachments.map((att, idx) => ({
      id: -1 - idx,
      commentId: null,
      fileName: att.fileName,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      createdAt: nowIso,
      deletedAt: null,
    })),
    comments: [],
    reviewUrl: `/dashboard?bugReview=${encodeURIComponent(key)}`,
    canReview: false,
    canReopenUnchanged: false,
    featureRequest:
      requestType === 'FEATURE'
        ? {
            reason: featureReason || description,
            audience: featureAudience,
            desiredOutcome: featureDesiredOutcome.trim() || null,
          }
        : null,
    expertDetails,
    planReview: null,
  };
}
