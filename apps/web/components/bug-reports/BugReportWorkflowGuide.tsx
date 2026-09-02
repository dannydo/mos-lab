'use client';

import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  MessageSquareMore,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Button, Tabs, Typography } from 'antd';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, StatusTag, type StatusType } from '../ui';
import styles from './BugReportWorkflowGuide.module.css';

const { Text } = Typography;

export const BUG_REPORT_WORKFLOW_VISIBILITY_EVENT = 'mos:bug-report-workflow-visibility';

interface WorkflowStatus {
  label: string;
  tone: StatusType;
}

interface WorkflowStep {
  title: string;
  role: string;
  roleTone: StatusType;
  description: string;
  icon: LucideIcon;
  statuses: WorkflowStatus[];
  conditional?: string;
}

const BUG_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Gửi báo lỗi',
    role: 'Người báo',
    roleTone: 'purple',
    description: 'Mô tả vấn đề bằng một câu và đính kèm ảnh nếu có.',
    icon: Bug,
    statuses: [{ label: 'AI Agent · Làm rõ yêu cầu', tone: 'processing' }],
  },
  {
    title: 'Đọc & đối chiếu',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent kiểm tra context, ảnh, repository và biz logic trước khi kết luận ticket đã đủ rõ.',
    icon: ScanSearch,
    statuses: [
      { label: 'Người báo · Bổ sung thông tin', tone: 'purple' },
      { label: 'Danny · Quyết định', tone: 'gold' },
    ],
  },
  {
    title: 'Quyết định & xếp ưu tiên',
    role: 'Danny',
    roleTone: 'gold',
    description: 'Chốt kết quả đúng, phạm vi, priority P0–P3 và quyết định duyệt, từ chối hoặc đánh dấu trùng.',
    icon: ShieldCheck,
    statuses: [
      { label: 'AI Agent · Bắt đầu triển khai', tone: 'processing' },
      { label: 'Hoàn tất · Không triển khai', tone: 'default' },
    ],
  },
  {
    title: 'Sửa & kiểm thử',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent nhận bundle, cập nhật tiến độ, sửa trong phạm vi đã duyệt và kiểm thử hồi quy.',
    icon: Wrench,
    statuses: [
      { label: 'AI Agent · Tiếp tục triển khai', tone: 'cyan' },
      { label: 'Người báo · Nghiệm thu', tone: 'success' },
    ],
  },
  {
    title: 'Nghiệm thu hoặc reopen',
    role: 'Người báo',
    roleTone: 'success',
    description: 'Đúng thì xác nhận đóng; chưa đúng thì mô tả điểm còn lỗi để ticket quay lại đúng Agent xử lý tiếp.',
    icon: CheckCircle2,
    statuses: [
      { label: 'Hoàn tất', tone: 'success' },
      { label: 'AI Agent · Xử lý phản hồi reopen', tone: 'orange' },
    ],
  },
];

const FEATURE_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Gửi nhu cầu',
    role: 'Người yêu cầu',
    roleTone: 'purple',
    description: 'Nói công việc bạn muốn mOS hỗ trợ, lý do cần và ai sẽ sử dụng.',
    icon: Lightbulb,
    statuses: [{ label: 'AI Agent · Làm rõ yêu cầu', tone: 'processing' }],
  },
  {
    title: 'Làm rõ yêu cầu',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent đối chiếu repository và làm rõ vấn đề, phạm vi, người dùng cùng kết quả được xem là đạt.',
    icon: MessageSquareMore,
    statuses: [
      { label: 'Người yêu cầu · Bổ sung thông tin', tone: 'purple' },
      { label: 'Danny · Quyết định', tone: 'gold' },
    ],
  },
  {
    title: 'Quyết định sản phẩm',
    role: 'Danny',
    roleTone: 'gold',
    description: 'Danny xem giá trị, phạm vi và ưu tiên rồi quyết định có đưa vào hàng triển khai hay không.',
    icon: ShieldCheck,
    statuses: [
      { label: 'AI Agent · Bắt đầu triển khai', tone: 'processing' },
      { label: 'Hoàn tất · Không triển khai', tone: 'default' },
    ],
  },
  {
    title: 'Triển khai & kiểm thử',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent nhận bundle, cập nhật tiến độ và chỉ triển khai phạm vi đã được Danny duyệt.',
    icon: Wrench,
    statuses: [
      { label: 'AI Agent · Tiếp tục triển khai', tone: 'cyan' },
      { label: 'Người yêu cầu · Nghiệm thu', tone: 'success' },
    ],
  },
  {
    title: 'Nghiệm thu hoặc yêu cầu chỉnh',
    role: 'Người yêu cầu',
    roleTone: 'success',
    description: 'Đúng thì xác nhận đóng; chưa đạt thì nêu rõ điểm cần chỉnh để ticket quay lại Agent.',
    icon: CheckCircle2,
    statuses: [
      { label: 'Hoàn tất', tone: 'success' },
      { label: 'AI Agent · Xử lý phản hồi reopen', tone: 'orange' },
    ],
  },
];

function WorkflowTimeline({ steps, label }: { steps: WorkflowStep[]; label: string }) {
  return (
    <ol className={`m-0 list-none p-0 ${styles.workflowTimeline}`} aria-label={label}>
      {steps.map((step, index) => (
        <li key={step.title} className={styles.workflowStep}>
          <div className={styles.stepRail} aria-hidden="true">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${styles.stepIcon}`}>
              <AppIcon icon={step.icon} size="sm" />
            </span>
            {index < steps.length - 1 ? <span className={styles.timelineConnector} /> : null}
          </div>

          <div className={`min-w-0 rounded-xl border p-3.5 ${styles.stepCard}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Text strong className={`shrink-0 text-xs tabular-nums ${styles.stepNumber}`}>
                  Bước {index + 1}
                </Text>
                <Text strong>{step.title}</Text>
                {step.conditional ? <StatusTag status="warning" label={step.conditional} /> : null}
              </div>
              <StatusTag status={step.roleTone} label={step.role} />
            </div>

            <Text type="secondary" className="mt-2 block text-sm leading-5">
              {step.description}
            </Text>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Trạng thái tương ứng">
              {step.statuses.map((status) => (
                <StatusTag key={status.label} status={status.tone} label={status.label} />
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BugReportWorkflowGuide() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <Text type="secondary">
          Mỗi ticket chỉ có một người cần hành động tiếp; hoàn tất bước hiện tại sẽ tự bàn giao sang người kế tiếp.
        </Text>
        <Text type="secondary" className="shrink-0 text-xs tabular-nums">
          Tiến độ tự cập nhật mỗi 15 giây
        </Text>
      </div>

      <Tabs
        defaultActiveKey="feature"
        items={[
          {
            key: 'feature',
            label: 'Yêu cầu chức năng',
            children: <WorkflowTimeline steps={FEATURE_WORKFLOW_STEPS} label="Quy trình yêu cầu chức năng" />,
          },
          {
            key: 'bug',
            label: 'Báo lỗi',
            children: <WorkflowTimeline steps={BUG_WORKFLOW_STEPS} label="Quy trình xử lý báo lỗi" />,
          },
        ]}
      />

      <div
        className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between ${styles.safetyRule}`}
      >
        <div className="flex items-start gap-2">
          <AppIcon icon={ShieldCheck} size="sm" className="mt-0.5 shrink-0" />
          <Text>
            <strong>Nguyên tắc an toàn:</strong> Agent chỉ sửa sau khi yêu cầu đủ rõ và Danny đã duyệt. Admin chỉ đóng
            ngoại lệ khi có bằng chứng hoặc lý do được lưu trong audit.
          </Text>
        </div>
        <Text type="secondary" className="shrink-0 tabular-nums">
          Theo dõi owner và hành động thật tại cột <strong>Bước tiếp theo</strong>
        </Text>
      </div>
    </div>
  );
}

interface BugReportWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  zIndex?: number;
}

export function BugReportWorkflowModal({ open, onClose, zIndex }: BugReportWorkflowModalProps) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, {
        detail: { open },
      })
    );

    return () => {
      if (open) {
        window.dispatchEvent(
          new CustomEvent(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, {
            detail: { open: false },
          })
        );
      }
    };
  }, [open]);

  return (
    <AdaptiveModal
      intent="form"
      title={
        <span className="inline-flex items-center gap-2">
          <AppIcon icon={RefreshCw} size="sm" />
          Workflow xử lý yêu cầu
        </span>
      }
      open={open}
      onCancel={onClose}
      zIndex={zIndex}
      destroyOnHidden
      footer={
        <AdaptiveOverlayFooter className="!static !m-0 !border-t-0 !p-0">
          <Button type="primary" onClick={onClose}>
            Đã hiểu
          </Button>
        </AdaptiveOverlayFooter>
      }
    >
      <BugReportWorkflowGuide />
    </AdaptiveModal>
  );
}

export default BugReportWorkflowModal;
