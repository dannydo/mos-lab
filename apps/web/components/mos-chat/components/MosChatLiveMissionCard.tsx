'use client';

import React, { useMemo, useState } from 'react';
import { Tooltip, type GlobalToken } from 'antd';
import { Check, CheckCircle2, ExternalLink, Loader2, MessageSquareReply, RefreshCw, Rocket } from 'lucide-react';
import {
  isAdminOrSuperAdminRole,
  type MosChatConversation,
  type MosChatMessage,
  type MosChatMissionActionType,
  type MosChatMissionSummary,
} from '@mos-lab/shared';
import { safeStorage } from '../../../lib/safe-storage';
import { MosChatSharedMissionDetailModal } from './MosChatSharedMissionDetailModal';

export interface MosChatLiveMissionCardProps {
  mission: MosChatMissionSummary;
  msg?: MosChatMessage | null;
  mode?: 'thread' | 'inline' | 'task' | 'embedded';
  isDark: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  activeConversation: MosChatConversation | null | undefined;
  isStrictDannySuperAdmin: boolean;
  missionReopenInputOpenByReportId: Record<string, boolean>;
  setMissionReopenInputOpenByReportId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  missionReopenFeedbackByReportId: Record<string, string>;
  setMissionReopenFeedbackByReportId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  missionActionLoadingKey: string | null;
  handleMissionInlineAction: (
    mission: MosChatMissionSummary,
    action: MosChatMissionActionType,
    feedback?: string
  ) => Promise<void> | void;
  selectConversation: (convId: string) => void;
  handleOpenThread: (msgId: string, convId?: string, opts?: { autoFocus?: boolean }) => void;
}

export const MosChatLiveMissionCard: React.FC<MosChatLiveMissionCardProps> = ({
  mission,
  msg,
  mode = 'inline',
  isDark,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  borderStrong,
  activeConversation,
  isStrictDannySuperAdmin,
  missionReopenInputOpenByReportId,
  setMissionReopenInputOpenByReportId,
  missionReopenFeedbackByReportId,
  setMissionReopenFeedbackByReportId,
  missionActionLoadingKey,
  handleMissionInlineAction,
  selectConversation,
  handleOpenThread,
}) => {
  const stageColors: Record<
    MosChatMissionSummary['stage'],
    { accent: string; bg: string; border: string; badgeBg: string }
  > = {
    RECEIVED: {
      accent: '#60a5fa',
      bg: isDark ? 'rgba(30, 58, 138, 0.18)' : 'rgba(239, 246, 255, 0.92)',
      border: 'rgba(59, 130, 246, 0.38)',
      badgeBg: 'rgba(59, 130, 246, 0.16)',
    },
    NEEDS_INFO: {
      accent: '#f59e0b',
      bg: isDark ? 'rgba(120, 53, 15, 0.2)' : 'rgba(255, 251, 235, 0.95)',
      border: 'rgba(245, 158, 11, 0.45)',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
    },
    BUILDING: {
      accent: '#a78bfa',
      bg: isDark ? 'rgba(76, 29, 149, 0.18)' : 'rgba(245, 243, 255, 0.95)',
      border: 'rgba(139, 92, 246, 0.4)',
      badgeBg: 'rgba(139, 92, 246, 0.16)',
    },
    AWAITING_RELEASE: {
      accent: '#d4a84b',
      bg: isDark ? 'rgba(120, 83, 15, 0.2)' : 'rgba(254, 249, 195, 0.45)',
      border: 'rgba(212, 168, 75, 0.5)',
      badgeBg: 'rgba(212, 168, 75, 0.2)',
    },
    READY_FOR_REVIEW: {
      accent: '#10b981',
      bg: isDark ? 'rgba(6, 78, 59, 0.22)' : 'rgba(236, 253, 245, 0.95)',
      border: 'rgba(16, 185, 129, 0.48)',
      badgeBg: 'rgba(16, 185, 129, 0.18)',
    },
    COMPLETED: {
      accent: '#10b981',
      bg: isDark ? 'rgba(6, 78, 59, 0.14)' : 'rgba(240, 253, 244, 0.85)',
      border: 'rgba(16, 185, 129, 0.35)',
      badgeBg: 'rgba(16, 185, 129, 0.14)',
    },
    NOT_PROCEEDING: {
      accent: '#94a3b8',
      bg: isDark ? 'rgba(30, 41, 59, 0.28)' : 'rgba(248, 250, 252, 0.92)',
      border: 'rgba(148, 163, 184, 0.4)',
      badgeBg: 'rgba(148, 163, 184, 0.16)',
    },
  };

  const [previewOpen, setPreviewOpen] = useState(false);
  const canOpenBugReportsInbox = useMemo(() => {
    if (isStrictDannySuperAdmin) return true;
    try {
      const raw = safeStorage.getItem('mos_user');
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { role?: string };
      return isAdminOrSuperAdminRole(parsed.role);
    } catch {
      return false;
    }
  }, [isStrictDannySuperAdmin]);

  const palette = stageColors[mission.stage] || stageColors.RECEIVED;
  const steps = [
    { idx: 1, label: '1. Tiếp nhận' },
    { idx: 2, label: '2. Đang xử lý' },
    { idx: 3, label: '3. Nghiệm thu' },
    { idx: 4, label: '4. Hoàn tất' },
  ];
  const isReopenOpen = Boolean(missionReopenInputOpenByReportId[mission.reportId]);
  const reopenText = missionReopenFeedbackByReportId[mission.reportId] || '';
  const canApproveImplementation = Boolean(mission.superAdminActions?.canApproveImplementation);
  const canRequestUpgradeOrRework =
    mission.canReporterAccept || Boolean(mission.reporterActions?.canAcceptOrReopen) || mission.stage === 'COMPLETED';

  return (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className={`rounded-xl ${mode === 'embedded' ? 'p-2 mt-1' : 'p-2.5'} text-left space-y-2 transition-all ${
        mode === 'inline' ? 'mt-1.5 w-full max-w-[88%]' : 'w-full'
      }`}
      style={{
        background: mode === 'embedded' ? (isDark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.6)') : palette.bg,
        border: `1px solid ${palette.border}`,
        borderLeft: `3.5px solid ${palette.accent}`,
      }}
    >
      {/* Top Header Row: Mission Code + Stage Pill + Link to mOS Mission */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span
            className="inline-flex items-center justify-center leading-none gap-1 px-2 py-1 rounded-md text-[10.5px] font-extrabold tracking-tight"
            style={{
              background: 'rgba(212, 168, 75, 0.2)',
              color: '#d4a84b',
              border: '1px solid rgba(212, 168, 75, 0.4)',
            }}
          >
            <Rocket size={11} />
            <span>mOS MISSION · #{mission.missionKey}</span>
          </span>
          <span
            className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-bold"
            style={{ background: palette.badgeBg, color: palette.accent }}
          >
            {mission.stageLabel}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {mode !== 'thread' && mode !== 'embedded' && msg && (
            <Tooltip title="Mở luồng trao đổi & theo dõi tiến độ mOS Mission">
              <button
                type="button"
                onClick={() => {
                  if (mission.conversationId && mission.conversationId !== activeConversation?.id) {
                    selectConversation(mission.conversationId);
                  }
                  handleOpenThread(msg.id);
                }}
                className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold cursor-pointer hover:opacity-90"
                style={{
                  background: surfaceRaised,
                  border: `1px solid ${borderColor}`,
                  color: token.colorText,
                }}
              >
                <MessageSquareReply size={11} className="text-amber-400" />
                <span>Luồng</span>
              </button>
            </Tooltip>
          )}
          <Tooltip title="Mở xem chi tiết yêu cầu">
            <a
              href={`/dashboard/bug-reports?reportId=${mission.reportId}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!canOpenBugReportsInbox) {
                  e.preventDefault();
                  setPreviewOpen(true);
                }
              }}
              className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[10.5px] font-bold no-underline hover:opacity-90"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: '#d4a84b',
              }}
            >
              <span>Mở xem · {mission.missionCode}</span>
              <ExternalLink size={10} />
            </a>
          </Tooltip>
        </div>
      </div>

      {/* Mission Title (omitted in embedded mode) */}
      {mode !== 'embedded' && (
        <div className="text-[12.5px] font-extrabold leading-snug" style={{ color: token.colorText }}>
          {mission.title}
        </div>
      )}

      {/* 4-Step Human Progress Bar */}
      <div className="grid grid-cols-4 gap-1 pt-0.5">
        {steps.map((s) => {
          const active = mission.stepIndex >= s.idx;
          const current = mission.stepIndex === s.idx;
          return (
            <div key={s.idx} className="space-y-1">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  background: active ? palette.accent : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.12)',
                  boxShadow: current ? `0 0 8px ${palette.accent}` : 'none',
                }}
              />
              <div
                className="text-[9.5px] font-bold truncate tabular-nums"
                style={{ color: active ? palette.accent : token.colorTextSecondary, opacity: active ? 1 : 0.65 }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plain Human Language Explanation for Staff & Super Admin */}
      <div
        className="text-[11.5px] leading-relaxed rounded-lg px-2.5 py-1.5"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.78)',
          border: `1px solid ${borderColor}`,
          color: token.colorText,
        }}
      >
        {mission.humanStatusSummary}
      </div>

      {/* Super Admin Inline Gate Controls (Gate 1 Implementation, Gate 2 Commit & Gate 3 Deploy) */}
      {isStrictDannySuperAdmin &&
        (canApproveImplementation || mission.canSuperAdminApproveCommit || mission.canSuperAdminApproveDeploy) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {canApproveImplementation && (
              <button
                type="button"
                disabled={missionActionLoadingKey === `${mission.reportId}:APPROVE_IMPLEMENTATION`}
                onClick={() => void handleMissionInlineAction(mission, 'APPROVE_IMPLEMENTATION')}
                className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}
              >
                {missionActionLoadingKey === `${mission.reportId}:APPROVE_IMPLEMENTATION` ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Rocket size={13} />
                )}
                <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
              </button>
            )}

            {mission.canSuperAdminApproveCommit && (
              <button
                type="button"
                disabled={missionActionLoadingKey === `${mission.reportId}:APPROVE_COMMIT`}
                onClick={() => void handleMissionInlineAction(mission, 'APPROVE_COMMIT')}
                className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                style={{ background: '#d4a84b', color: '#000' }}
              >
                {missionActionLoadingKey === `${mission.reportId}:APPROVE_COMMIT` ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                <span>✅ Duyệt Commit (Cổng 2)</span>
              </button>
            )}

            {mission.canSuperAdminApproveDeploy && (
              <button
                type="button"
                disabled={missionActionLoadingKey === `${mission.reportId}:APPROVE_DEPLOY`}
                onClick={() => void handleMissionInlineAction(mission, 'APPROVE_DEPLOY')}
                className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                style={{ background: '#10b981', color: '#000' }}
              >
                {missionActionLoadingKey === `${mission.reportId}:APPROVE_DEPLOY` ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Rocket size={13} />
                )}
                <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
              </button>
            )}
          </div>
        )}

      {/* Reporter / Staff & Super Admin Inline Acceptance & Subthread Upgrade Controls */}
      {canRequestUpgradeOrRework && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {mission.canReporterAccept && (
              <button
                type="button"
                disabled={missionActionLoadingKey === `${mission.reportId}:REPORTER_ACCEPT`}
                onClick={() => void handleMissionInlineAction(mission, 'REPORTER_ACCEPT')}
                className="h-7 px-3 rounded-lg text-[11.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                style={{ background: '#10b981', color: '#000' }}
              >
                {missionActionLoadingKey === `${mission.reportId}:REPORTER_ACCEPT` ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} strokeWidth={3} />
                )}
                <span>✅ Đã đúng ý (Hoàn tất)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setMissionReopenInputOpenByReportId((prev) => ({
                  ...prev,
                  [mission.reportId]: !prev[mission.reportId],
                }))
              }
              className="h-7 px-2.5 rounded-lg text-[11.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderStrong}`,
                color: mission.stage === 'COMPLETED' ? '#a78bfa' : '#f59e0b',
              }}
            >
              <RefreshCw size={12} />
              <span>{mission.stage === 'COMPLETED' ? '✨ Nâng cấp / Chỉnh thêm' : '🔄 Cần chỉnh thêm'}</span>
            </button>
          </div>

          {isReopenOpen && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={reopenText}
                onChange={(e) =>
                  setMissionReopenFeedbackByReportId((prev) => ({
                    ...prev,
                    [mission.reportId]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && reopenText.trim()) {
                    e.preventDefault();
                    void handleMissionInlineAction(mission, 'REPORTER_REOPEN', reopenText.trim());
                  }
                }}
                placeholder={
                  mission.stage === 'COMPLETED'
                    ? 'Nhập nội dung cần nâng cấp tiếp trong luồng này (chờ anh Danny duyệt Cổng 1 mOS Mission)...'
                    : 'Nhập điểm cần điều chỉnh thêm (VD: Thêm cột tổng số buổi còn lại)...'
                }
                className="flex-1 h-7 px-2.5 rounded-lg text-[11.5px] outline-none"
                style={{
                  background: surfaceBg,
                  border: `1px solid ${borderStrong}`,
                  color: token.colorText,
                }}
              />
              <button
                type="button"
                disabled={!reopenText.trim() || missionActionLoadingKey === `${mission.reportId}:REPORTER_REOPEN`}
                onClick={() => void handleMissionInlineAction(mission, 'REPORTER_REOPEN', reopenText.trim())}
                className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer disabled:opacity-50 shrink-0"
                style={{
                  background: mission.stage === 'COMPLETED' ? '#8b5cf6' : '#f59e0b',
                  color: mission.stage === 'COMPLETED' ? '#fff' : '#000',
                }}
              >
                Gửi đề xuất
              </button>
            </div>
          )}
        </div>
      )}
      {previewOpen && (
        <MosChatSharedMissionDetailModal
          open={previewOpen}
          reportId={mission.reportId}
          fallbackMission={mission}
          isDark={isDark}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};
