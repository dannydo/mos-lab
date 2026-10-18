'use client';

import { Alert, Typography } from 'antd';
import type { BugReportDetail, InboxImplementationModelTier } from '@mos-lab/shared';
import { SectionCard } from '../../../../components/ui';
import { formatDate } from '../bug-report-presenters';

const { Text } = Typography;

export const MODEL_TIER_LABELS: Record<InboxImplementationModelTier, string> = {
  flash: '⚡ Flash — Gemini 3.8 Flash (Tiết kiệm token)',
  pro: '🧠 Argon High — Gemini 4 Pro (Task phức tạp)',
  flash_lite: '🪶 Flash Lite — Gemini 3.1 Flash Lite (Siêu nhẹ)',
};

type BugReportImplementationStatusCardsProps = {
  implementation: BugReportDetail['implementation'];
};

export function BugReportImplementationStatusCards({ implementation }: BugReportImplementationStatusCardsProps) {
  if (!implementation) return null;

  return (
    <>
      {implementation.ideHandoff ? (
        <SectionCard
          title={
            implementation.executionOwner === 'AG'
              ? 'Handoff Antigravity (AG)'
              : implementation.executionOwner === 'AUTO'
                ? 'Handoff Tự Động (AG / Codex)'
                : 'Handoff Codex IDE'
          }
        >
          <Alert
            type="info"
            showIcon
            message={
              implementation.ideHandoff.taskId
                ? `${
                    implementation.executionOwner === 'AG'
                      ? 'Antigravity'
                      : implementation.executionOwner === 'IDE'
                        ? 'Codex IDE'
                        : 'Worker'
                  } đang thực thi code & kiểm thử`
                : implementation.ideHandoff.phase === 'IDE_PROVISIONING_PENDING'
                  ? implementation.executionOwner === 'AUTO'
                    ? 'Đang chờ Worker (Antigravity hoặc Codex) nhận task'
                    : `Chờ ${implementation.executionOwner === 'AG' ? 'Antigravity' : 'Codex IDE'} tạo task`
                  : implementation.ideHandoff.phase === 'IDE_PROVISIONING_LEASED'
                    ? `${
                        implementation.executionOwner === 'AG'
                          ? 'Antigravity'
                          : implementation.executionOwner === 'IDE'
                            ? 'Codex IDE'
                            : 'Worker'
                      } đang tạo task`
                    : `Đang chờ ${
                        implementation.executionOwner === 'AG'
                          ? 'Antigravity'
                          : implementation.executionOwner === 'IDE'
                            ? 'Codex IDE'
                            : 'Worker (AG / Codex)'
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
                    <Text code>{MODEL_TIER_LABELS[implementation.modelTier]}</Text>
                  </div>
                ) : null}
                {implementation.ideHandoff.taskId ? (
                  <div>
                    <Text strong>
                      {implementation.executionOwner === 'AG'
                        ? 'Task Antigravity: '
                        : implementation.executionOwner === 'IDE'
                          ? 'Task Codex IDE: '
                          : 'Task Worker: '}
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
