'use client';

import { Button, Dropdown, Popconfirm, Radio, Space, Typography } from 'antd';
import type {
  BugPriority,
  BugReportDetail,
  BugReportPlanReviewCandidate,
  InboxImplementationModelTier,
  TriageBugReportRequest,
} from '@mos-lab/shared';
import { CheckCircle2, Clock, Gavel, HelpCircle, RefreshCw, Send } from 'lucide-react';
import { AppIcon } from '../../../../components/ui';
import { EXECUTION_OWNER_LABELS, MODEL_TIER_LABELS } from './BugReportImplementationStatusCards';
import styles from './BugReportDetailDrawer.module.css';

const { Text } = Typography;

export type BugReportDetailHeaderActionsProps = {
  detail: BugReportDetail;
  canTriage: boolean;
  isDeferred: boolean;
  saving: boolean;
  businessContext: string;
  approvalReceived: boolean;
  commitApprovalReceived: boolean;
  deployApprovalReceived: boolean;
  activeExecutionOwner: 'AG_WIN' | 'AUTO' | 'AG_MAC';
  onExecutionOwnerChange: (owner: 'AG_WIN' | 'AUTO' | 'AG_MAC') => void;
  activeModelTier: InboxImplementationModelTier;
  onModelTierChange: (tier: InboxImplementationModelTier) => void;
  onOpenDefer: () => void;
  onSaveTriage: (override: Partial<TriageBugReportRequest>) => void;
  onApproveCodeExecution: (owner: 'AG_WIN' | 'AUTO' | 'AG_MAC', tier: InboxImplementationModelTier) => void;
  onOpenPlanRevision: (plan: BugReportPlanReviewCandidate) => void;
  onRetryClarification: () => void;
  onAuthorizeBuildLockRecoveryRetry: () => void;
  onAuthorizeQualityGateRecoveryRetry: () => void;
  onAuthorizeSchemaRecoveryRetry: () => void;
  onAuthorizeWorkerRecoveryRetry: () => void;
  onOpenRetryConfirmation: () => void;
  onApproveCommit: () => void;
  onOpenChangesModal: () => void;
  onApproveDeploy: () => void;
  onOpenExceptionClose: () => void;
  onOpenShare?: () => void;
};

export function BugReportDetailHeaderActions({
  detail,
  canTriage,
  isDeferred,
  saving,
  businessContext,
  approvalReceived,
  commitApprovalReceived,
  deployApprovalReceived,
  activeExecutionOwner,
  onExecutionOwnerChange,
  activeModelTier,
  onModelTierChange,
  onOpenDefer,
  onSaveTriage,
  onApproveCodeExecution,
  onOpenPlanRevision,
  onRetryClarification,
  onAuthorizeBuildLockRecoveryRetry,
  onAuthorizeQualityGateRecoveryRetry,
  onAuthorizeSchemaRecoveryRetry,
  onAuthorizeWorkerRecoveryRetry,
  onOpenRetryConfirmation,
  onApproveCommit,
  onOpenChangesModal,
  onApproveDeploy,
  onOpenExceptionClose,
  onOpenShare,
}: BugReportDetailHeaderActionsProps) {
  const approvalItems = (['P0', 'P1', 'P2', 'P3'] as BugPriority[]).map((item) => ({
    key: item,
    label: `Duyệt triển khai ${item}`,
    onClick: () => onSaveTriage({ status: 'APPROVED', priority: item }),
  }));

  return (
    <Space wrap>
      {onOpenShare && (
        <Button icon={<AppIcon icon={Send} size="sm" />} onClick={onOpenShare}>
          Chia sẻ vào mOS Chat
        </Button>
      )}
      {canTriage && !isDeferred && ['NEW', 'APPROVED'].includes(detail.status) && (
        <Button loading={saving} icon={<AppIcon icon={Clock} size="sm" />} onClick={onOpenDefer}>
          Tạm hoãn
        </Button>
      )}
      {canTriage && isDeferred && (
        <Popconfirm
          classNames={{ root: styles.confirmationPopup }}
          title="Mở lại ticket này?"
          description="Ticket sẽ được chuyển về trạng thái Mới (NEW) để Agent và Danny tiếp tục xử lý."
          okText="Mở lại"
          cancelText="Để sau"
          onConfirm={() => onSaveTriage({ status: 'NEW', note: 'Mở lại ticket sau thời gian tạm hoãn' })}
        >
          <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
            Mở lại ticket
          </Button>
        </Popconfirm>
      )}
      {canTriage && detail.status === 'NEW' && (
        <Dropdown menu={{ items: approvalItems }} trigger={['click']}>
          <Button
            type="primary"
            loading={saving}
            disabled={
              detail.requestType === 'FEATURE'
                ? detail.clarification.status !== 'READY'
                : detail.clarification.status !== 'READY' && businessContext.trim().length < 10
            }
            title={
              detail.requestType === 'FEATURE'
                ? 'Agent phải xác nhận yêu cầu đã đủ rõ trước khi Danny duyệt triển khai'
                : 'Cần Agent xác nhận đủ rõ hoặc nhập biz logic/kết quả đúng trước khi duyệt triển khai'
            }
            icon={<AppIcon icon={Send} size="sm" />}
          >
            Duyệt triển khai
          </Button>
        </Dropdown>
      )}
      {canTriage &&
        detail.status === 'APPROVED' &&
        detail.agentProgress.stage === 'AWAITING_DANNY_IMPLEMENTATION_APPROVAL' &&
        (!detail.implementation ||
          !['PENDING', 'LEASED', 'RUNNING', 'AWAITING_COMMIT_REVIEW', 'AWAITING_DEPLOY_REVIEW'].includes(
            detail.implementation.status
          )) &&
        !approvalReceived &&
        detail.priority &&
        detail.clarification.status === 'READY' && (
          <Popconfirm
            classNames={{ root: styles.confirmationPopup }}
            title="Duyệt AI chạy code/test?"
            description={
              <div className="max-w-md space-y-2.5">
                <div>
                  AI chỉ làm trong worktree riêng; mặc định đẩy về Win AG (có thể chọn Auto-overflow hoặc Mac AG). Sau
                  đó ticket sẽ chờ Danny duyệt commit.
                </div>
                <div className="space-y-1.5 pt-1">
                  <Text strong className="block text-xs">
                    Chọn máy thực thi:
                  </Text>
                  <Radio.Group
                    value={activeExecutionOwner}
                    onChange={(e) => onExecutionOwnerChange(e.target.value as 'AG_WIN' | 'AUTO' | 'AG_MAC')}
                    className="flex flex-col gap-1.5"
                  >
                    <Radio value="AG_WIN" className="whitespace-nowrap">
                      {EXECUTION_OWNER_LABELS.AG_WIN}
                    </Radio>
                    <Radio value="AUTO" className="whitespace-nowrap">
                      {EXECUTION_OWNER_LABELS.AUTO}
                    </Radio>
                    <Radio value="AG_MAC" className="whitespace-nowrap">
                      {EXECUTION_OWNER_LABELS.AG_MAC}
                    </Radio>
                  </Radio.Group>
                </div>
                <div className="space-y-1.5 pt-1">
                  <Text strong className="block text-xs">
                    Chọn model Antigravity (khi tạo session mới):
                  </Text>
                  <Radio.Group
                    value={activeModelTier}
                    onChange={(e) => onModelTierChange(e.target.value as InboxImplementationModelTier)}
                    className="flex flex-col gap-1.5"
                  >
                    <Radio value="hydrogen" className="whitespace-nowrap">
                      {MODEL_TIER_LABELS.hydrogen}
                    </Radio>
                    <Radio value="orchestrator_neon" className="whitespace-nowrap">
                      {MODEL_TIER_LABELS.orchestrator_neon}
                    </Radio>
                    <Radio value="orchestrator_carbon" className="whitespace-nowrap">
                      {MODEL_TIER_LABELS.orchestrator_carbon}
                    </Radio>
                    <Radio value="orchestrator_argon" className="whitespace-nowrap">
                      {MODEL_TIER_LABELS.orchestrator_argon}
                    </Radio>
                    <Radio value="flash" className="whitespace-nowrap">
                      {MODEL_TIER_LABELS.flash}
                    </Radio>
                  </Radio.Group>
                </div>
              </div>
            }
            okText="Duyệt code/test"
            cancelText="Chưa duyệt"
            okButtonProps={{ loading: saving, disabled: saving || approvalReceived }}
            onConfirm={() => onApproveCodeExecution(activeExecutionOwner, activeModelTier)}
          >
            <Button
              type="primary"
              loading={saving}
              disabled={saving || approvalReceived}
              icon={<AppIcon icon={Gavel} size="sm" />}
            >
              Duyệt code/test
            </Button>
          </Popconfirm>
        )}
      {canTriage && approvalReceived && (
        <Button disabled type="dashed" icon={<AppIcon icon={RefreshCw} size="sm" className="animate-spin" />}>
          Đã duyệt · Đang xếp hàng code/test...
        </Button>
      )}
      {canTriage && detail.planReview && !approvalReceived && (
        <Button
          disabled={saving}
          icon={<AppIcon icon={RefreshCw} size="sm" />}
          onClick={() => onOpenPlanRevision(detail.planReview!)}
        >
          Yêu cầu sửa lại plan
        </Button>
      )}
      {canTriage && !approvalReceived && !['CLOSED', 'REJECTED', 'CANCELLED'].includes(detail.status) && (
        <Popconfirm
          classNames={{ root: styles.confirmationPopup }}
          title="Yêu cầu AG làm rõ lại ticket?"
          description="Ticket sẽ chuyển về PENDING_AGENT để Antigravity (AG) rà soát sâu mã nguồn và đặt câu hỏi cho người báo."
          okText="Làm rõ lại (AG)"
          cancelText="Hủy"
          okButtonProps={{ loading: saving }}
          onConfirm={onRetryClarification}
        >
          <Button disabled={saving} icon={<AppIcon icon={HelpCircle} size="sm" />}>
            Yêu cầu AG làm rõ
          </Button>
        </Popconfirm>
      )}
      {canTriage &&
        detail.agentProgress.stage === 'IMPLEMENTATION_FAILED' &&
        detail.priority &&
        detail.clarification.status === 'READY' &&
        (detail.implementation?.canAuthorizeBuildLockRecoveryRetry ? (
          <Popconfirm
            classNames={{ root: styles.confirmationPopup }}
            title="Cho phép một retry sau khi sửa lock build?"
            description="Đúng lỗi lock output Next đã được sửa và kiểm chứng. Hệ thống tạo đúng một worktree code/test mới; commit, push, merge, deploy và migration vẫn không tự chạy."
            okText="Cho phép retry"
            cancelText="Chưa cho phép"
            onConfirm={onAuthorizeBuildLockRecoveryRetry}
          >
            <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
              Cho phép retry sau khi sửa lock build
            </Button>
          </Popconfirm>
        ) : detail.implementation?.canAuthorizeQualityGateRecoveryRetry ? (
          <Popconfirm
            classNames={{ root: styles.confirmationPopup }}
            title="Cho phép một retry sau khi sửa cổng kiểm thử?"
            description="Cổng kiểm thử đã được sửa và xác minh. Hệ thống tạo đúng một worktree code/test mới; commit, push, merge, deploy và migration vẫn không tự chạy."
            okText="Cho phép retry"
            cancelText="Chưa cho phép"
            onConfirm={onAuthorizeQualityGateRecoveryRetry}
          >
            <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
              Cho phép retry sau khi sửa cổng kiểm thử
            </Button>
          </Popconfirm>
        ) : detail.implementation?.canAuthorizeSchemaRecoveryRetry ? (
          <Popconfirm
            classNames={{ root: styles.confirmationPopup }}
            title="Cho phép một retry sau khi đã sửa schema?"
            description="Chỉ áp dụng cho lỗi schema đã được chẩn đoán chỉ-đọc và xác minh. Hệ thống tạo worktree code/test mới, không commit, push, merge, deploy hay chạy migration. Quyền này chỉ dùng một lần cho lượt hiện tại."
            okText="Cho phép retry"
            cancelText="Chưa cho phép"
            onConfirm={onAuthorizeSchemaRecoveryRetry}
          >
            <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
              Cho phép retry sau khi sửa schema
            </Button>
          </Popconfirm>
        ) : detail.implementation?.canAuthorizeWorkerRecoveryRetry ? (
          <Popconfirm
            classNames={{ root: styles.confirmationPopup }}
            title="Cho phép một retry sau khi đã sửa Worker?"
            description="Chỉ áp dụng cho lỗi hạ tầng đã nhận diện sau hai retry thường. Hệ thống tạo worktree code/test mới, không commit, push, merge, deploy hay chạy migration. Quyền này chỉ dùng một lần cho lượt hiện tại."
            okText="Cho phép retry"
            cancelText="Chưa cho phép"
            onConfirm={onAuthorizeWorkerRecoveryRetry}
          >
            <Button type="primary" loading={saving} icon={<AppIcon icon={RefreshCw} size="sm" />}>
              Cho phép retry sau khi sửa Worker
            </Button>
          </Popconfirm>
        ) : detail.implementation?.canRetryImplementation ? (
          <Button
            type="primary"
            loading={saving}
            icon={<AppIcon icon={RefreshCw} size="sm" />}
            onClick={onOpenRetryConfirmation}
          >
            Tạo retry sạch
          </Button>
        ) : null)}
      {canTriage && (detail.agentProgress.stage === 'QUEUED_FOR_COMMIT' || commitApprovalReceived) && (
        <Button disabled type="dashed" icon={<AppIcon icon={RefreshCw} size="sm" className="animate-spin" />}>
          Đã duyệt commit · Chờ worker...
        </Button>
      )}
      {canTriage && detail.agentProgress.stage === 'AWAITING_DANNY_COMMIT_REVIEW' && !commitApprovalReceived && (
        <>
          <Popconfirm
            classNames={{ root: styles.confirmationPopup }}
            title="Duyệt commit bản đã review?"
            description="Worker Mac chỉ stage đúng các tệp đã ghi trong review, commit vào branch riêng rồi dừng. Không push, merge hay deploy."
            okText="Duyệt commit"
            cancelText="Chưa duyệt"
            okButtonProps={{ loading: saving, disabled: saving || commitApprovalReceived }}
            onConfirm={onApproveCommit}
          >
            <Button
              type="primary"
              loading={saving}
              disabled={saving || commitApprovalReceived}
              icon={<AppIcon icon={CheckCircle2} size="sm" />}
            >
              Duyệt commit
            </Button>
          </Popconfirm>
          {detail.implementation?.reviewCandidate && (
            <Button
              disabled={saving || commitApprovalReceived}
              icon={<AppIcon icon={RefreshCw} size="sm" />}
              onClick={onOpenChangesModal}
            >
              Yêu cầu sửa lại
            </Button>
          )}
        </>
      )}
      {canTriage && (detail.agentProgress.stage === 'QUEUED_FOR_DEPLOY' || deployApprovalReceived) && (
        <Button
          disabled
          className="!border-emerald-500 !text-emerald-600 dark:!text-emerald-400 !bg-emerald-50 dark:!bg-emerald-950/40 font-semibold cursor-default"
          icon={<AppIcon icon={CheckCircle2} size="sm" />}
        >
          Đã duyệt deploy · Đang triển khai...
        </Button>
      )}
      {canTriage && detail.agentProgress.stage === 'AWAITING_DANNY_DEPLOY_APPROVAL' && !deployApprovalReceived && (
        <Popconfirm
          classNames={{ root: styles.confirmationPopup }}
          title="Duyệt deploy commit đã review?"
          description="Worker Mac sẽ merge đúng commit vào main, push, chạy pipeline production và chỉ bàn giao khi release marker khớp."
          okText="Duyệt deploy"
          cancelText="Chưa duyệt"
          okButtonProps={{ loading: saving, disabled: saving || deployApprovalReceived }}
          onConfirm={onApproveDeploy}
        >
          <Button
            type="primary"
            loading={saving}
            disabled={saving || deployApprovalReceived}
            icon={<AppIcon icon={CheckCircle2} size="sm" />}
          >
            Duyệt deploy
          </Button>
        </Popconfirm>
      )}
      {canTriage &&
        ['APPROVED', 'IN_PROGRESS', 'FIXED'].includes(detail.status) &&
        detail.agentProgress.stage !== 'AWAITING_REPORTER_ACCEPTANCE' && (
          <Button loading={saving} icon={<AppIcon icon={CheckCircle2} size="sm" />} onClick={onOpenExceptionClose}>
            Đóng ngoại lệ
          </Button>
        )}
    </Space>
  );
}
