'use client';

import { Alert, Typography } from 'antd';
import {
  getExecutionOwnerDisplayName,
  isAgExecutionOwner,
  type BugReportDetail,
  type InboxImplementationModelTier,
} from '@mos-lab/shared';
import { SectionCard } from '../../../../components/ui';
import { formatDate } from '../bug-report-presenters';

const { Text } = Typography;

export const EXECUTION_OWNER_LABELS: Record<'AG_WIN' | 'AUTO' | 'AG_MAC', string> = {
  AG_WIN: '🖥️ Win AG (Mặc định · Browser Remote)',
  AUTO: '🔀 Auto-overflow (Win AG → tràn sang Mac AG)',
  AG_MAC: '💻 Mac AG (Máy Mac chính)',
};

export const MODEL_TIER_LABELS: Record<InboxImplementationModelTier, string> = {
  hydrogen: '🚀 Hydrogen — Gemini 4 Hydrogen (Mặc định)',
  orchestrator_carbon: '🎼 Orchestrator (Carbon) — Đa tác nhân Carbon (Task lớn/phức tạp)',
  orchestrator_argon: '🧠 Orchestrator (Argon) — Đa tác nhân Argon (Suy luận sâu)',
  flash: '⚡ Flash 3.8 — Gemini 3.8 Flash (Nhanh · Tiết kiệm token)',
};

export function getModelTierLabel(tier: string | undefined): string | null {
  if (!tier) return null;
  if (tier in MODEL_TIER_LABELS) {
    return MODEL_TIER_LABELS[tier as InboxImplementationModelTier];
  }
  if (tier === 'pro') return MODEL_TIER_LABELS.orchestrator_argon;
  if (tier === 'flash_lite') return MODEL_TIER_LABELS.flash;
  return tier;
}

type BugReportImplementationStatusCardsProps = {
  implementation: BugReportDetail['implementation'];
};

export function BugReportImplementationStatusCards({ implementation }: BugReportImplementationStatusCardsProps) {
  if (!implementation) return null;

  const owner = implementation.executionOwner;
  const ownerDisplayName = getExecutionOwnerDisplayName(owner);
  const agOwned = isAgExecutionOwner(owner);

  return (
    <>
      {implementation.ideHandoff ? (
        <SectionCard
          title={
            agOwned
              ? `Handoff ${ownerDisplayName}`
              : owner === 'AUTO'
                ? 'Handoff Tự Động (Win AG → Mac AG)'
                : 'Handoff Codex IDE'
          }
        >
          <Alert
            type="info"
            showIcon
            message={
              implementation.ideHandoff.taskId
                ? `${agOwned ? ownerDisplayName : owner === 'IDE' ? 'Codex IDE' : 'Worker'} đang thực thi code & kiểm thử`
                : implementation.ideHandoff.phase === 'IDE_PROVISIONING_PENDING'
                  ? owner === 'AUTO'
                    ? 'Đang chờ Win AG (hoặc tràn sang Mac AG) nhận task'
                    : `Chờ ${agOwned ? ownerDisplayName : 'Codex IDE'} tạo task`
                  : implementation.ideHandoff.phase === 'IDE_PROVISIONING_LEASED'
                    ? `${agOwned ? ownerDisplayName : owner === 'IDE' ? 'Codex IDE' : 'Worker'} đang tạo task`
                    : `Đang chờ ${
                        agOwned ? ownerDisplayName : owner === 'IDE' ? 'Codex IDE' : 'Worker (Win/Mac AG)'
                      } nhận handoff`
            }
            description={
              <div className="space-y-1">
                <div>
                  <Text strong>Mã tham chiếu: </Text>
                  <Text code>{implementation.ideHandoff.reference}</Text>
                </div>
                {implementation.modelTier ? (
                  <div>
                    <Text strong>Model thực thi: </Text>
                    <Text code>{getModelTierLabel(implementation.modelTier)}</Text>
                  </div>
                ) : null}
                {implementation.ideHandoff.taskId ? (
                  <div>
                    <Text strong>
                      {agOwned ? `Task ${ownerDisplayName}: ` : owner === 'IDE' ? 'Task Codex IDE: ' : 'Task Worker: '}
                    </Text>
                    <Text code>{implementation.ideHandoff.taskId}</Text>
                  </div>
                ) : null}
                <Text type="secondary">
                  {implementation.ideHandoff.phase === 'IDE_PROVISIONING_PENDING'
                    ? 'Companion cục bộ đã opt-in sẽ tạo task/worktree. Chưa cấp nonce hay quyền code/test.'
                    : implementation.ideHandoff.phase === 'IDE_PROVISIONING_LEASED'
                      ? 'Companion cục bộ đang tạo task/worktree với request ID bền vững. Mất kết nối sẽ retry cùng request, không tạo task thứ hai.'
                      : implementation.ideHandoff.phase === 'IDE_COMMIT_HANDOFF'
                        ? 'Chỉ ghi đúng một commit từ candidate Danny đã duyệt. Không cấp lease, push, merge, deploy hoặc migration.'
                        : implementation.ideHandoff.taskId
                          ? 'Agent đang trực tiếp thực thi code & kiểm thử trong worktree riêng.'
                          : 'Chỉ code/test theo scope đã duyệt. Không cấp lease thực thi, commit, push, merge, deploy hoặc migration.'}
                </Text>
              </div>
            }
          />
        </SectionCard>
      ) : null}

      {implementation.deploymentLane ? (
        <SectionCard title="Lộ trình phát hành đề xuất">
          <Alert
            type="info"
            showIcon
            message={`${implementation.deploymentLane.lane} · chỉ quan sát`}
            description={
              <div className="space-y-1">
                <Text>{implementation.deploymentLane.reason}</Text>
                <div>
                  <Text type="secondary">Sẽ chạy: {implementation.deploymentLane.willRun.join(' · ')}</Text>
                </div>
                {implementation.deploymentLane.willSkip.length ? (
                  <div>
                    <Text type="secondary">Bỏ qua: {implementation.deploymentLane.willSkip.join(' · ')}</Text>
                  </div>
                ) : null}
              </div>
            }
          />
        </SectionCard>
      ) : null}

      {implementation.failure ? (
        <SectionCard title="Vì sao worker dừng">
          <Alert
            type="warning"
            showIcon
            message={implementation.failure.summary}
            description={
              <div className="space-y-1">
                {implementation.failure.command ? <Text code>{implementation.failure.command}</Text> : null}
                <div>
                  <Text type="secondary" className="tabular-nums">
                    {implementation.failure.code ? `${implementation.failure.code} · ` : ''}
                    Ghi nhận {formatDate(implementation.failure.occurredAt)}. Commit và deploy đã bị chặn.
                  </Text>
                </div>
              </div>
            }
          />
        </SectionCard>
      ) : null}
    </>
  );
}
