'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Bug,
  CheckCircle2,
  ChevronRight,
  MessageSquareMore,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Typography } from 'antd';
import { AppIcon, SectionCard, StatusTag, type StatusType } from '../../../../components/ui';
import styles from './BugInboxWorkflowGuide.module.css';

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

const WORKFLOW_STEPS: WorkflowStep[] = [
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

export function BugInboxWorkflowGuide() {
  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={RefreshCw} size="sm" />
          <span>Workflow sử dụng Bug Inbox</span>
        </div>
      }
      extra={
        <Text type="secondary" className="hidden text-xs tabular-nums sm:inline">
          6 bước · tiến độ tự cập nhật mỗi 15 giây
        </Text>
      }
    >
      <ol className={`m-0 list-none p-0 ${styles.workflowGrid}`} aria-label="Quy trình xử lý báo lỗi">
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step.title} className="relative min-w-0">
            <div className={`flex h-full min-h-40 flex-col rounded-xl border p-3 ${styles.stepCard}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styles.stepIcon}`}
                    aria-hidden="true"
                  >
                    <AppIcon icon={step.icon} size="sm" />
                  </span>
                  <Text strong className={`tabular-nums ${styles.stepNumber}`}>
                    {index + 1}
                  </Text>
                </div>
                <StatusTag status={step.roleTone} label={step.role} />
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Text strong>{step.title}</Text>
                {step.conditional ? <StatusTag status="warning" label={step.conditional} /> : null}
              </div>
              <Text type="secondary" className="mb-3 block text-xs leading-5">
                {step.description}
              </Text>
              <div className="mt-auto flex flex-wrap gap-1.5" aria-label="Trạng thái tương ứng">
                {step.statuses.map((status) => (
                  <StatusTag key={status.label} status={status.tone} label={status.label} />
                ))}
              </div>
            </div>

            {index < WORKFLOW_STEPS.length - 1 ? (
              <span
                className={`absolute top-1/2 -right-[18px] z-10 -translate-y-1/2 ${styles.connector}`}
                aria-hidden="true"
              >
                <AppIcon icon={ChevronRight} size="sm" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div
        className={`mt-3 flex flex-col gap-2 rounded-xl border px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between ${styles.safetyRule}`}
      >
        <div className="flex items-start gap-2">
          <AppIcon icon={ShieldCheck} size="sm" className="mt-0.5 shrink-0" />
          <Text>
            <strong>Nguyên tắc an toàn:</strong> Agent không sửa lỗi trước khi vấn đề đủ rõ và Danny đã duyệt priority.
          </Text>
        </div>
        <Text type="secondary" className="shrink-0 tabular-nums">
          Xem tình trạng thật tại cột <strong>AI Agent</strong>
        </Text>
      </div>
    </SectionCard>
  );
}
