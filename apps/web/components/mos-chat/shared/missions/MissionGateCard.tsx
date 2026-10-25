'use client';

import React, { useState } from 'react';
import type { MosChatMissionActionType, MosChatMissionSummary } from '@mos-lab/shared';
import { MissionArtifactPreview } from './MissionArtifactPreview';

export interface MissionGateCardProps {
  mission: MosChatMissionSummary;
  isDark: boolean;
  isSuperAdmin?: boolean;
  canReporterAct?: boolean;
  loadingActionKey?: string | null;
  compact?: boolean;
  onExecuteAction?: (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    note?: string
  ) => void | Promise<unknown>;
  onOpenMissionPortal?: (reportId: number) => void;
}

const UNIVERSAL_STEP_LABELS = [
  { index: 1, label: '1. Tiếp nhận' },
  { index: 2, label: '2. Thực thi & Duyệt' },
  { index: 3, label: '3. Lên sóng' },
  { index: 4, label: '4. Nghiệm thu' },
] as const;

export const MissionGateCard: React.FC<MissionGateCardProps> = ({
  mission,
  isDark,
  isSuperAdmin = false,
  canReporterAct = false,
  loadingActionKey = null,
  compact = false,
  onExecuteAction,
  onOpenMissionPortal,
}) => {
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenFeedback, setReopenFeedback] = useState('');

  const gate1Label = mission.artifactPreview?.gate1Label || '🚀 Duyệt Phương Án · Cổng 1 (mOS Mission)';
  const gate2Label = mission.artifactPreview?.gate2Label || '✅ Duyệt Commit · Cổng 2';
  const gate3Label = mission.artifactPreview?.gate3Label || '🚀 Duyệt Deploy · Cổng 3';

  const canApproveGate1 = Boolean(isSuperAdmin && mission.superAdminActions?.canApproveImplementation);
  const canApproveGate2 = Boolean(
    isSuperAdmin && (mission.superAdminActions?.canApproveCommit || mission.canSuperAdminApproveCommit)
  );
  const canApproveGate3 = Boolean(
    isSuperAdmin && (mission.superAdminActions?.canApproveDeploy || mission.canSuperAdminApproveDeploy)
  );
  const canAcceptOrReopen = Boolean(
    canReporterAct ||
    isSuperAdmin ||
    mission.reporterActions?.canAcceptOrReopen ||
    mission.canReporterAccept ||
    mission.stage === 'READY_FOR_REVIEW' ||
    mission.stage === 'COMPLETED'
  );

  const isLoading = (action: MosChatMissionActionType) =>
    loadingActionKey === `${mission.reportId}:${action}` || loadingActionKey === action;

  return (
    <div
      data-testid={`mission-gate-card-${mission.reportId}`}
      style={{
        marginTop: compact ? 6 : 8,
        padding: compact ? '8px 10px' : '10px 12px',
        borderRadius: 10,
        background: isDark ? 'rgba(139, 92, 246, 0.08)' : '#faf5ff',
        border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.28)' : '#e9d5ff'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 6 : 8,
      }}
    >
      {/* Top Row: Mission Code, Stage Badge, and Portal Link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            className="inline-flex items-center justify-center leading-none tabular-nums"
            style={{
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 800,
              background: isDark ? '#7c3aed' : '#6d28d9',
              color: '#ffffff',
            }}
          >
            🚀 {mission.missionCode || `MSN-${mission.reportId}`}
          </span>

          <span
            className="inline-flex items-center justify-center leading-none"
            style={{
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.14)' : '#d8b4fe'}`,
              color: isDark ? '#e9d5ff' : '#581c87',
            }}
          >
            {mission.humanBadge}
          </span>
        </div>

        {onOpenMissionPortal && (
          <button
            type="button"
            onClick={() => onOpenMissionPortal(mission.reportId)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              fontSize: 11,
              fontWeight: 600,
              color: isDark ? '#c4b5fd' : '#7c3aed',
              cursor: 'pointer',
            }}
          >
            Mở mOS Mission ↗
          </button>
        )}
      </div>

      {/* Universal Track & Artifact Preview */}
      <MissionArtifactPreview mission={mission} isDark={isDark} compact={compact} />

      {/* 4-Step Progress Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 4,
        }}
      >
        {UNIVERSAL_STEP_LABELS.map((step) => {
          const active = mission.stepIndex >= step.index;
          const isCurrent = mission.stepIndex === step.index;
          return (
            <div
              key={step.index}
              className="tabular-nums"
              style={{
                padding: '4px 6px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: isCurrent ? 700 : 600,
                textAlign: 'center',
                background: active
                  ? isDark
                    ? 'rgba(139, 92, 246, 0.25)'
                    : '#ede9fe'
                  : isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : '#f3f4f6',
                color: active ? (isDark ? '#ddd6fe' : '#5b21b6') : isDark ? '#71717a' : '#9ca3af',
                border: isCurrent ? `1px solid ${isDark ? '#a78bfa' : '#8b5cf6'}` : '1px solid transparent',
              }}
            >
              {step.label}
            </div>
          );
        })}
      </div>

      {/* Human Status Summary */}
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.45,
          color: isDark ? '#e4e4e7' : '#3f3f46',
        }}
      >
        {mission.humanSummary}
      </div>

      {/* Action Buttons: Super Admin 3 Gates + Reporter Acceptance / Reopen */}
      {onExecuteAction && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {canApproveGate1 && (
            <button
              type="button"
              disabled={Boolean(loadingActionKey)}
              onClick={() => onExecuteAction(mission, 'APPROVE_IMPLEMENTATION')}
              className="inline-flex items-center justify-center leading-none"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 700,
                background: '#7c3aed',
                color: '#ffffff',
                border: 'none',
                cursor: loadingActionKey ? 'wait' : 'pointer',
              }}
            >
              {isLoading('APPROVE_IMPLEMENTATION') ? 'Đang duyệt Cổng 1...' : gate1Label}
            </button>
          )}

          {canApproveGate2 && (
            <button
              type="button"
              disabled={Boolean(loadingActionKey)}
              onClick={() => onExecuteAction(mission, 'APPROVE_COMMIT')}
              className="inline-flex items-center justify-center leading-none"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 700,
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                cursor: loadingActionKey ? 'wait' : 'pointer',
              }}
            >
              {isLoading('APPROVE_COMMIT') ? 'Đang tạo Commit...' : gate2Label}
            </button>
          )}

          {canApproveGate3 && (
            <button
              type="button"
              disabled={Boolean(loadingActionKey)}
              onClick={() => onExecuteAction(mission, 'APPROVE_DEPLOY')}
              className="inline-flex items-center justify-center leading-none"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 700,
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                cursor: loadingActionKey ? 'wait' : 'pointer',
              }}
            >
              {isLoading('APPROVE_DEPLOY') ? 'Đang triển khai...' : gate3Label}
            </button>
          )}

          {canAcceptOrReopen && mission.stage === 'READY_FOR_REVIEW' && (
            <button
              type="button"
              disabled={Boolean(loadingActionKey)}
              onClick={() => onExecuteAction(mission, 'ACCEPT_RESULT')}
              className="inline-flex items-center justify-center leading-none"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 700,
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                cursor: loadingActionKey ? 'wait' : 'pointer',
              }}
            >
              {isLoading('ACCEPT_RESULT') ? 'Đang xác nhận...' : '✅ Xác nhận hoạt động tốt'}
            </button>
          )}

          {canAcceptOrReopen && (mission.stage === 'READY_FOR_REVIEW' || mission.stage === 'COMPLETED') && (
            <button
              type="button"
              disabled={Boolean(loadingActionKey)}
              onClick={() => setReopenOpen((prev) => !prev)}
              className="inline-flex items-center justify-center leading-none"
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                fontSize: 11.5,
                fontWeight: 600,
                background: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb',
                color: isDark ? '#fbbf24' : '#b45309',
                border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.35)' : '#fcd34d'}`,
                cursor: 'pointer',
              }}
            >
              🔄 Cần chỉnh thêm / Nâng cấp tiếp
            </button>
          )}
        </div>
      )}

      {/* Inline Reopen / Upgrade Input */}
      {reopenOpen && onExecuteAction && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 4,
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            value={reopenFeedback}
            onChange={(e) => setReopenFeedback(e.target.value)}
            placeholder="Nhập nội dung cần chỉnh thêm hoặc nâng cấp..."
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              background: isDark ? '#18181b' : '#ffffff',
              color: isDark ? '#f4f4f5' : '#18181b',
              border: `1px solid ${isDark ? '#3f3f46' : '#d4d4d8'}`,
            }}
          />
          <button
            type="button"
            disabled={!reopenFeedback.trim() || Boolean(loadingActionKey)}
            onClick={async () => {
              const text = reopenFeedback.trim();
              if (!text) return;
              await onExecuteAction(mission, 'REQUEST_REWORK', text);
              setReopenFeedback('');
              setReopenOpen(false);
            }}
            className="inline-flex items-center justify-center leading-none"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 700,
              background: '#f59e0b',
              color: '#ffffff',
              border: 'none',
              cursor: !reopenFeedback.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Gửi đề xuất
          </button>
        </div>
      )}
    </div>
  );
};
