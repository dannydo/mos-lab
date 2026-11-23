'use client';

import { Alert, Button, Card, Form, Input, Popconfirm, Radio, Timeline, Typography, type FormInstance } from 'antd';
import {
  Activity,
  AlertTriangle,
  Bot,
  Bug,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  MousePointerClick,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  FrontendIssueAgAnalysis,
  FrontendIssueAgDispatchResponse,
  FrontendIssueRecord,
  FrontendIssueStatus,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon } from '../../../../components/ui';
import { BadgeTag, ISSUE_TYPE_CONFIG, STATUS_CONFIG } from './frontend-telemetry.shared';

const { Title } = Typography;

export function FrontendTelemetryIssueDetailDrawer({
  open,
  onClose,
  activeIssue,
  analyzingAg,
  agAnalysis,
  dispatchResult,
  dispatchingAg,
  convertingBug,
  updatingStatus,
  statusForm,
  onFetchAgAnalysis,
  onAgDispatch,
  onConvertToBugReport,
  onUpdateStatus,
}: {
  open: boolean;
  onClose: () => void;
  activeIssue: FrontendIssueRecord | null;
  analyzingAg: boolean;
  agAnalysis: FrontendIssueAgAnalysis | null;
  dispatchResult: FrontendIssueAgDispatchResponse | null;
  dispatchingAg: boolean;
  convertingBug: boolean;
  updatingStatus: boolean;
  statusForm: FormInstance;
  onFetchAgAnalysis: (issueId: number) => void;
  onAgDispatch: () => void;
  onConvertToBugReport: () => void;
  onUpdateStatus: (values: { status: FrontendIssueStatus; resolutionNotes: string }) => void;
}) {
  const breadcrumbs = activeIssue?.latestPayload?.breadcrumbs || [];

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      destroyOnHidden
      intent="data"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <span className="flex items-center gap-2">
            <AppIcon icon={PlayCircle} size="md" className="text-blue-500" />
            <span>Hộp đen Thao tác &amp; Chi tiết Sự cố</span>
          </span>
          {activeIssue ? (
            <BadgeTag color={STATUS_CONFIG[activeIssue.status]?.color || 'default'}>
              {STATUS_CONFIG[activeIssue.status]?.label}
            </BadgeTag>
          ) : null}
        </div>
      }
    >
      {activeIssue ? (
        <div className="space-y-6">
          {/* Overview Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-slate-500 font-mono">Định danh lỗi (Fingerprint)</div>
                <code className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-all">
                  {activeIssue.fingerprint}
                </code>
              </div>
              <BadgeTag color={ISSUE_TYPE_CONFIG[activeIssue.issueType]?.color || 'default'}>
                {ISSUE_TYPE_CONFIG[activeIssue.issueType]?.label}
              </BadgeTag>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium">Trang phát sinh</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono">{activeIssue.path}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium">Nội dung lỗi ghi nhận</div>
              <div className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                {activeIssue.message}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-500">Lần đầu xuất hiện: </span>
                <span className="tabular-nums font-medium">
                  {new Date(activeIssue.firstSeenAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Lần gần nhất: </span>
                <span className="tabular-nums font-medium">
                  {new Date(activeIssue.lastSeenAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          {/* Antigravity AI Auto-Analysis & 1-Click Dispatch Card */}
          <Card
            size="small"
            className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 shadow-sm"
            title={
              <div className="flex items-center justify-between w-full pr-2">
                <span className="text-sm font-semibold flex items-center gap-1.5 text-purple-900 dark:text-purple-200">
                  <AppIcon icon={Sparkles} size="sm" className="text-purple-600 dark:text-purple-400" />
                  <span>Antigravity AI — Phân tích Nguyên nhân &amp; Giải pháp</span>
                </span>
                {agAnalysis && (
                  <div className="flex items-center gap-1.5">
                    <BadgeTag
                      color={agAnalysis.severity === 'P0' ? 'red' : agAnalysis.severity === 'P1' ? 'orange' : 'blue'}
                    >
                      {agAnalysis.severity}
                    </BadgeTag>
                    <BadgeTag color="purple">{agAnalysis.category}</BadgeTag>
                  </div>
                )}
              </div>
            }
            extra={
              <Button
                type="text"
                size="small"
                icon={<AppIcon icon={RefreshCw} size="sm" />}
                loading={analyzingAg}
                onClick={() => activeIssue && onFetchAgAnalysis(activeIssue.id)}
                title="Phân tích lại bằng AG"
              />
            }
          >
            {analyzingAg ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
                <AppIcon icon={RefreshCw} size="md" className="animate-spin" />
                <div className="text-xs font-medium">
                  Antigravity đang phân tích hộp đen telemetry và đối chiếu codebase...
                </div>
              </div>
            ) : agAnalysis ? (
              <div className="space-y-4">
                <div className="bg-purple-50/60 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200/70 dark:border-purple-800/50 space-y-1.5">
                  <div className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <AppIcon icon={Bot} size="sm" className="text-purple-600 dark:text-purple-400" />
                    {agAnalysis.title}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {agAnalysis.rootCause}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <AppIcon icon={FileCode2} size="sm" /> Tệp mã nguồn liên quan trong codebase:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {agAnalysis.affectedFiles.map((f, i) => (
                      <code
                        key={i}
                        className="text-[11px] bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-mono"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                    <AppIcon icon={ShieldCheck} size="sm" /> Kế hoạch Khắc phục Kỹ thuật đề xuất:
                  </div>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    {agAnalysis.proposedFix.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold text-purple-600 dark:text-purple-400 tabular-nums">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span>Đánh giá rủi ro: </span>
                    <strong className="text-slate-700 dark:text-slate-300">{agAnalysis.riskAssessment}</strong>
                  </div>
                  <div>
                    <span>Ước tính thời gian: </span>
                    <strong className="text-slate-700 dark:text-slate-300">{agAnalysis.estimatedEffort}</strong>
                  </div>
                </div>

                {dispatchResult || activeIssue.resolutionNotes?.includes('BUG-') ? (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
                        <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-600 dark:text-emerald-400" />
                        <span>Đã duyệt &amp; Sẵn sàng cho Antigravity (AG)</span>
                      </div>
                      <BadgeTag color="success">AWAITING_IDE_HANDOFF</BadgeTag>
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">
                      Ticket{' '}
                      <strong>{dispatchResult?.key || activeIssue.resolutionNotes?.match(/BUG-\d+/)?.[0]}</strong> đã
                      được cấp quyền implementation. AG đang tự động nhận task và xử lý theo chu trình mOS Mission.
                    </div>
                    <div className="pt-1">
                      <Button
                        type="link"
                        size="small"
                        className="p-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1"
                        onClick={() => {
                          const key = dispatchResult?.key || activeIssue.resolutionNotes?.match(/BUG-\d+/)?.[0];
                          window.open(`/dashboard/bug-reports?search=${key || ''}`, '_blank');
                        }}
                      >
                        Mở Ticket trong mOS Mission <AppIcon icon={ExternalLink} size="sm" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500">
                      Bấm duyệt để AG tự động mở ticket mOS Mission, nhận handoff và giải quyết vấn đề.
                    </div>
                    <Popconfirm
                      title="Duyệt & Kích hoạt AG Xử lý Tự động?"
                      description="AG sẽ tự động tạo ticket trong mOS Mission, duyệt implementation và sẵn sàng nhận handoff để sửa code & chạy test."
                      onConfirm={onAgDispatch}
                      okText="Duyệt cho AG"
                      cancelText="Hủy"
                    >
                      <Button
                        type="primary"
                        icon={<AppIcon icon={Zap} size="sm" />}
                        loading={dispatchingAg}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-sm font-medium"
                      >
                        ⚡ Duyệt &amp; Giao AG Xử lý Tự động
                      </Button>
                    </Popconfirm>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-500">
                Chưa có phân tích cho sự cố này.{' '}
                <Button
                  type="link"
                  size="small"
                  onClick={() => activeIssue && onFetchAgAnalysis(activeIssue.id)}
                  className="p-0"
                >
                  Bấm để AG phân tích ngay
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Actions & Status Update */}
          <Card
            size="small"
            title={
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <AppIcon icon={CheckCircle2} size="sm" /> Xử lý &amp; Phân loại Sự cố
              </span>
            }
            extra={
              <Popconfirm
                title="Chuyển thành Bug Report chính thức?"
                description="Sự cố này sẽ được tạo thành một Ticket trong mOS Mission để AI Worker / Kỹ thuật viên triển khai bản vá."
                onConfirm={onConvertToBugReport}
                okText="Tạo Bug Report"
                cancelText="Hủy"
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<AppIcon icon={Bug} size="sm" />}
                  loading={convertingBug}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Chuyển sang mOS Mission
                </Button>
              </Popconfirm>
            }
          >
            <Form
              form={statusForm}
              layout="vertical"
              onFinish={onUpdateStatus}
              initialValues={{
                status: activeIssue.status,
                resolutionNotes: activeIssue.resolutionNotes || '',
              }}
            >
              <Form.Item name="status" label="Trạng thái xử lý" rules={[{ required: true }]}>
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="NEW">Mới</Radio.Button>
                  <Radio.Button value="INVESTIGATING">Đang điều tra</Radio.Button>
                  <Radio.Button value="RESOLVED" className="!text-emerald-600 font-medium">
                    Đã giải quyết
                  </Radio.Button>
                  <Radio.Button value="IGNORED">Bỏ qua</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="resolutionNotes"
                label="Ghi chú giải pháp (Ví dụ: Đã thêm debounce, đã tối ưu query DB, đã sửa CSS)"
              >
                <Input.TextArea rows={2} placeholder="Nhập tóm tắt cách xử lý để Danny và team cùng theo dõi..." />
              </Form.Item>

              <div className="flex justify-end">
                <Button type="primary" htmlType="submit" loading={updatingStatus}>
                  Lưu cập nhật
                </Button>
              </div>
            </Form>
          </Card>

          {/* Breadcrumbs Flight Recorder Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Title level={5} className="!mb-0 flex items-center gap-2">
                <AppIcon icon={Activity} size="sm" className="text-blue-500" />
                Hộp đen 25 thao tác gần nhất của người dùng
              </Title>
              <BadgeTag color="blue" className="tabular-nums">
                {breadcrumbs.length} sự kiện
              </BadgeTag>
            </div>

            {breadcrumbs.length === 0 ? (
              <Alert type="info" message="Không có bản ghi breadcrumbs chi tiết cho sự cố này." className="text-xs" />
            ) : (
              <div className="max-h-[380px] overflow-y-auto pr-2 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <Timeline
                  items={breadcrumbs.map((b, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    const timeStr = new Date(b.timestamp).toLocaleTimeString('vi-VN');

                    let dotColor = 'blue';
                    let iconEl = <AppIcon icon={MousePointerClick} size="sm" />;

                    if (b.category === 'network') {
                      dotColor = b.action === 'error' ? 'red' : 'green';
                      iconEl = <AppIcon icon={Zap} size="sm" />;
                    } else if (b.category === 'navigation') {
                      dotColor = 'purple';
                      iconEl = <AppIcon icon={ExternalLink} size="sm" />;
                    }

                    if (isLast) {
                      dotColor = 'red';
                      iconEl = <AppIcon icon={AlertTriangle} size="sm" />;
                    }

                    return {
                      color: dotColor,
                      dot: <span className="p-1 rounded-full bg-white dark:bg-slate-900 border">{iconEl}</span>,
                      children: (
                        <div className="text-xs space-y-0.5 pb-2">
                          <div className="flex items-center justify-between text-slate-400 tabular-nums">
                            <span className="font-semibold uppercase tracking-wider text-[10px]">
                              #{idx + 1} · {b.category} · {b.action}
                            </span>
                            <span>{timeStr}</span>
                          </div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {b.target ? (
                              <code className="text-blue-600 dark:text-blue-400 font-mono mr-1.5">{b.target}</code>
                            ) : null}
                            {b.path ? <span className="text-slate-500 font-mono text-[11px]">{b.path}</span> : null}
                          </div>
                          {b.metadata && Object.keys(b.metadata).length > 0 ? (
                            <div className="bg-white dark:bg-slate-950 p-1.5 rounded border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                              {JSON.stringify(b.metadata)}
                            </div>
                          ) : null}
                        </div>
                      ),
                    };
                  })}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </AdaptiveDrawer>
  );
}
