'use client';

import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bug, CheckCircle2, Lightbulb, MessageSquareMore, RefreshCw } from 'lucide-react';
import { Alert, Button, Tabs, Typography } from 'antd';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, StatusTag, type StatusType } from '../ui';
import styles from './BugReportWorkflowGuide.module.css';

const { Text } = Typography;

export const BUG_REPORT_WORKFLOW_VISIBILITY_EVENT = 'mos:bug-report-workflow-visibility';

interface WorkflowStep {
  title: string;
  role: string;
  roleTone: StatusType;
  description: string;
  icon: LucideIcon;
}

const BUG_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Nói cho mOS biết chuyện gì xảy ra',
    role: 'Người báo',
    roleTone: 'purple',
    description: 'Mô tả bằng cách bạn thường nói và thêm ảnh nếu có. Bạn không cần biết thuật ngữ kỹ thuật.',
    icon: Bug,
  },
  {
    title: 'Trả lời mOS nếu được hỏi',
    role: 'mOS',
    roleTone: 'cyan',
    description: 'mOS chỉ hỏi một câu ngắn khi cần thêm thông tin. Nếu không có câu hỏi, bạn không cần làm gì.',
    icon: MessageSquareMore,
  },
  {
    title: 'Kiểm tra kết quả',
    role: 'Người báo',
    roleTone: 'success',
    description: 'mOS sẽ mời bạn kiểm tra. Chỉ chọn “Đã đúng” hoặc nói rõ điểm nào vẫn chưa đúng.',
    icon: CheckCircle2,
  },
];

const FEATURE_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Nói cho mOS biết bạn muốn cải thiện gì',
    role: 'Người yêu cầu',
    roleTone: 'purple',
    description: 'Nói về công việc bạn muốn làm tốt hơn. Bạn không cần viết đặc tả kỹ thuật.',
    icon: Lightbulb,
  },
  {
    title: 'Trả lời mOS nếu được hỏi',
    role: 'mOS',
    roleTone: 'cyan',
    description: 'mOS chỉ hỏi một câu ngắn khi cần làm rõ. Nếu không có câu hỏi, bạn không cần làm gì.',
    icon: MessageSquareMore,
  },
  {
    title: 'Kiểm tra kết quả',
    role: 'Người yêu cầu',
    roleTone: 'success',
    description: 'mOS sẽ mời bạn kiểm tra. Chỉ chọn “Đã đúng” hoặc nói rõ điểm nào vẫn chưa đúng.',
    icon: CheckCircle2,
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
              </div>
              <StatusTag status={step.roleTone} label={step.role} />
            </div>

            <Text type="secondary" className="mt-2 block text-sm leading-5">
              {step.description}
            </Text>
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
        <Text type="secondary">Bạn chỉ cần báo điều bạn thấy, trả lời khi mOS hỏi và kiểm tra kết quả.</Text>
      </div>

      <Tabs
        defaultActiveKey="feature"
        items={[
          {
            key: 'feature',
            label: 'Thêm chức năng mới',
            children: <WorkflowTimeline steps={FEATURE_WORKFLOW_STEPS} label="Quy trình yêu cầu chức năng" />,
          },
          {
            key: 'bug',
            label: 'Báo lỗi',
            children: <WorkflowTimeline steps={BUG_WORKFLOW_STEPS} label="Quy trình xử lý báo lỗi" />,
          },
        ]}
      />

      <Alert
        type="info"
        showIcon
        message="mOS xử lý các bước còn lại giúp bạn"
        description="Bạn chỉ cần chờ thông báo nếu mOS cần thêm thông tin hoặc đã có kết quả để bạn kiểm tra."
      />
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
          Sau khi bạn gửi yêu cầu
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
