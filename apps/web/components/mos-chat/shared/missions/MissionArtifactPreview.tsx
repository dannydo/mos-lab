'use client';

import React from 'react';
import type { MosChatMissionArtifactPreview, MosChatMissionSummary } from '@mos-lab/shared';

export interface MissionArtifactPreviewProps {
  mission: MosChatMissionSummary;
  isDark: boolean;
  compact?: boolean;
}

export const MissionArtifactPreview: React.FC<MissionArtifactPreviewProps> = ({ mission, isDark, compact = false }) => {
  const artifact: MosChatMissionArtifactPreview | null | undefined = mission.artifactPreview;
  const track = artifact?.track || mission.executionTrack || 'CODE_ENGINEERING';

  const trackBadgeConfig =
    track === 'PROCESS_CANON'
      ? {
          icon: '📖',
          label: artifact?.trackLabel || 'Quy trình & Kinh Thánh mOS',
          bg: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
          border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fde68a',
          color: isDark ? '#fbbf24' : '#b45309',
        }
      : track === 'DATA_DECISION'
        ? {
            icon: '📊',
            label: artifact?.trackLabel || 'Xử lý Dữ liệu & Ra Quyết Định',
            bg: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5',
            border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#a7f3d0',
            color: isDark ? '#34d399' : '#047857',
          }
        : {
            icon: '⚙️',
            label: artifact?.trackLabel || 'Kỹ thuật & Mã nguồn',
            bg: isDark ? 'rgba(139, 92, 246, 0.14)' : '#f5f3ff',
            border: isDark ? 'rgba(139, 92, 246, 0.35)' : '#ddd6fe',
            color: isDark ? '#c4b5fd' : '#6d28d9',
          };

  const changedFilesCount =
    artifact?.codeReceipt?.changedFilesCount ?? mission.superAdminActions?.changedFilesCount ?? 0;
  const diffStat = artifact?.codeReceipt?.diffStat ?? mission.superAdminActions?.diffStat ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          className="inline-flex items-center justify-center leading-none tabular-nums"
          style={{
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 700,
            background: trackBadgeConfig.bg,
            border: `1px solid ${trackBadgeConfig.border}`,
            color: trackBadgeConfig.color,
            gap: 4,
          }}
        >
          <span>{trackBadgeConfig.icon}</span>
          <span>{trackBadgeConfig.label}</span>
        </span>

        {track === 'CODE_ENGINEERING' && changedFilesCount > 0 && (
          <span
            className="inline-flex items-center justify-center leading-none tabular-nums"
            style={{
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              background: isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`,
              color: isDark ? '#93c5fd' : '#1d4ed8',
            }}
          >
            📁 {changedFilesCount} tệp thay đổi
          </span>
        )}

        {track === 'DATA_DECISION' && artifact?.dataDryRun && (
          <span
            className="inline-flex items-center justify-center leading-none tabular-nums"
            style={{
              padding: '3px 8px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              background: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ecfdf5',
              border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}`,
              color: isDark ? '#6ee7b7' : '#047857',
            }}
          >
            🛡️ Dry-Run Safe · Rollback Ready
          </span>
        )}
      </div>

      {!compact && track === 'CODE_ENGINEERING' && diffStat && (
        <div
          className="tabular-nums"
          style={{
            fontSize: 11,
            padding: '5px 8px',
            borderRadius: 6,
            background: isDark ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc',
            border: `1px solid ${isDark ? '#27272a' : '#e2e8f0'}`,
            color: isDark ? '#a1a1aa' : '#475569',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
          }}
        >
          {diffStat}
        </div>
      )}

      {!compact && track === 'PROCESS_CANON' && artifact?.processDiff && (
        <div
          style={{
            fontSize: 11,
            padding: '6px 8px',
            borderRadius: 6,
            background: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a'}`,
            color: isDark ? '#fde68a' : '#92400e',
          }}
        >
          <div>
            <strong>Bản thảo Quy trình:</strong> {artifact.processDiff.afterSummary}
          </div>
        </div>
      )}

      {!compact && track === 'DATA_DECISION' && artifact?.dataDryRun && (
        <div
          className="tabular-nums"
          style={{
            fontSize: 11,
            padding: '6px 8px',
            borderRadius: 6,
            background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0'}`,
            color: isDark ? '#a7f3d0' : '#065f46',
          }}
        >
          <div>
            <strong>Mô phỏng Dữ liệu (Dry-Run):</strong> {artifact.dataDryRun.impactSummary} (
            {artifact.dataDryRun.affectedRows ?? 1} bản ghi)
          </div>
        </div>
      )}
    </div>
  );
};
