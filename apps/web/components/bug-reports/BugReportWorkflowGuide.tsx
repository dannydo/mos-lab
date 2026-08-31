'use client';

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
    statuses: [{ label: 'Agent chưa xem', tone: 'default' }],
  },
  {
    title: 'Đọc & đối chiếu',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent kiểm tra context, ảnh và biz logic trước khi quyết định sửa.',
    icon: ScanSearch,
    statuses: [
      { label: 'Đang phân tích', tone: 'processing' },
      { label: 'Đối chiếu biz logic', tone: 'orange' },
    ],
  },
  {
    title: 'Bổ sung thông tin',
    role: 'Người báo',
    roleTone: 'purple',
    description: 'Trả lời comment của Agent và upload thêm ảnh minh họa.',
    icon: MessageSquareMore,
    statuses: [
      { label: 'Chờ người báo', tone: 'purple' },
      { label: 'Người báo đã trả lời', tone: 'cyan' },
    ],
    conditional: 'Chỉ khi chưa rõ',
  },
  {
    title: 'Duyệt & xếp ưu tiên',
    role: 'Danny',
    roleTone: 'gold',
    description: 'Chốt kết quả đúng mong đợi và chọn priority P0–P3.',
    icon: ShieldCheck,
    statuses: [
      { label: 'Đã hiểu · chờ duyệt', tone: 'gold' },
      { label: 'Đã nhận · chờ sửa', tone: 'processing' },
    ],
  },
  {
    title: 'Sửa & kiểm thử',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent cập nhật tiến độ liên tục trong lúc sửa và kiểm thử.',
    icon: Wrench,
    statuses: [
      { label: 'Đang sửa', tone: 'cyan' },
      { label: 'Đang kiểm thử', tone: 'orange' },
    ],
  },
  {
    title: 'Xác nhận & đóng',
    role: 'Người báo / Admin',
    roleTone: 'success',
    description: 'Kiểm tra bản sửa; đúng thì xác nhận để đóng ticket.',
    icon: CheckCircle2,
    statuses: [
      { label: 'Đã sửa · chờ xác nhận', tone: 'success' },
      { label: 'Hoàn tất', tone: 'success' },
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
    statuses: [{ label: 'Đã tiếp nhận', tone: 'default' }],
  },
  {
    title: 'Làm rõ yêu cầu',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Agent làm rõ vấn đề, phạm vi, người dùng và kết quả được xem là đạt.',
    icon: MessageSquareMore,
    statuses: [
      { label: 'Đang phân tích', tone: 'processing' },
      { label: 'Chờ bạn trả lời', tone: 'purple' },
      { label: 'Đã đủ rõ', tone: 'success' },
    ],
  },
  {
    title: 'Quyết định sản phẩm',
    role: 'Danny',
    roleTone: 'gold',
    description: 'Danny xem giá trị, phạm vi và ưu tiên rồi quyết định có đưa vào hàng triển khai hay không.',
    icon: ShieldCheck,
    statuses: [
      { label: 'Chờ Danny duyệt', tone: 'gold' },
      { label: 'Đã duyệt triển khai', tone: 'processing' },
      { label: 'Không duyệt', tone: 'error' },
    ],
  },
  {
    title: 'Triển khai & kiểm thử',
    role: 'AI Agent',
    roleTone: 'cyan',
    description: 'Chỉ yêu cầu đã được Danny duyệt mới được đưa vào code và kiểm thử.',
    icon: Wrench,
    statuses: [
      { label: 'Đang triển khai', tone: 'cyan' },
      { label: 'Đang kiểm thử', tone: 'orange' },
    ],
  },
  {
    title: 'Nghiệm thu & hoàn tất',
    role: 'Người yêu cầu',
    roleTone: 'success',
    description: 'Người yêu cầu kiểm tra kết quả; chưa đạt thì phản hồi để Agent điều chỉnh tiếp.',
    icon: CheckCircle2,
    statuses: [
      { label: 'Chờ nghiệm thu', tone: 'success' },
      { label: 'Hoàn tất', tone: 'success' },
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
        <Text type="secondary">Mỗi loại yêu cầu có gate rõ ràng để bạn luôn biết ai đang làm gì.</Text>
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
            <strong>Nguyên tắc an toàn:</strong> Agent không sửa hoặc triển khai trước khi yêu cầu đủ rõ và Danny đã
            duyệt.
          </Text>
        </div>
        <Text type="secondary" className="shrink-0 tabular-nums">
          Theo dõi trạng thái thật tại mục <strong>AI Agent</strong>
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
