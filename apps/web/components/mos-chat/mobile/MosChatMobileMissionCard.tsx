'use client';

import React from 'react';
import { Check, CheckCircle2, ExternalLink, Loader2, Rocket, RotateCcw } from 'lucide-react';
import type { MosChatMissionActionType, MosChatMissionSummary } from '@mos-lab/shared';

export interface MosChatMobileMissionCardProps {
  mission: MosChatMissionSummary;
  isDark: boolean;
  isStrictDannySuperAdmin: boolean;
  canApproveImplementation: boolean;
  canSuperAdminApproveCommit: boolean;
  canSuperAdminApproveDeploy: boolean;
  canReporterAccept: boolean;
  canRequestUpgradeOrRework: boolean;
  actionLoading: string | null;
  isReopenOpen: boolean;
  setIsReopenOpen: React.Dispatch<React.SetStateAction<boolean>>;
  reopenFeedback: string;
  setReopenFeedback: React.Dispatch<React.SetStateAction<string>>;
  handleExecuteMissionAction: (action: MosChatMissionActionType, feedback?: string) => Promise<void>;
}

export const MosChatMobileMissionCard: React.FC<MosChatMobileMissionCardProps> = ({
  mission,
  isDark,
  isStrictDannySuperAdmin,
  canApproveImplementation,
  canSuperAdminApproveCommit,
  canSuperAdminApproveDeploy,
  canReporterAccept,
  canRequestUpgradeOrRework,
  actionLoading,
  isReopenOpen,
  setIsReopenOpen,
  reopenFeedback,
  setReopenFeedback,
  handleExecuteMissionAction,
}) => {
  return (
    <div
      className={`my-2 p-3 rounded-2xl border space-y-2.5 shadow-sm ${
        isDark ? 'bg-purple-950/30 border-purple-800/50' : 'bg-purple-500/10 border-purple-500/30'
      }`}
    >
      {/* Mission header, badge, external link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Rocket className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <span className={`text-xs font-black truncate ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
            mOS Mission #{mission.missionKey || `MSN-${mission.reportId}`}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 border border-purple-500/30 shrink-0 ${
              isDark ? 'text-purple-300' : 'text-purple-800'
            }`}
          >
            {mission.requestType || 'FEATURE'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border border-purple-400/30 ${
              isDark ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-500/20 text-purple-800'
            }`}
          >
            {mission.stageLabel || mission.humanBadge || mission.status}
          </span>
          <a
            href={`/dashboard/bug-reports?reportId=${mission.reportId}`}
            target="_blank"
            rel="noreferrer"
            className={`p-1 rounded border border-purple-500/30 active:scale-95 transition-transform cursor-pointer ${
              isDark
                ? 'text-purple-300 hover:text-white bg-purple-900/40'
                : 'text-purple-700 hover:text-purple-900 bg-purple-500/15'
            }`}
            aria-label="Xem chi tiết trên mOS Mission"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Title */}
      <p className="text-xs font-bold text-[var(--mos-text)] line-clamp-2 leading-snug">{mission.title}</p>

      {/* 4-Step Progress Bar */}
      <div className="grid grid-cols-4 gap-1 pt-0.5">
        {[
          { idx: 1, label: '1. Tiếp nhận' },
          { idx: 2, label: '2. Đang xử lý' },
          { idx: 3, label: '3. Nghiệm thu' },
          { idx: 4, label: '4. Hoàn tất' },
        ].map((s) => {
          const active = (mission.stepIndex || 1) >= s.idx;
          const current = (mission.stepIndex || 1) === s.idx;
          return (
            <div key={s.idx} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all ${active ? 'bg-purple-500' : 'bg-[var(--mos-surface-muted)]'} ${
                  current ? 'ring-2 ring-purple-400/60 shadow-sm shadow-purple-500/50' : ''
                }`}
              />
              <div
                className={`text-[9.5px] truncate font-medium ${
                  active
                    ? isDark
                      ? 'text-purple-300 font-bold'
                      : 'text-purple-700 font-bold'
                    : 'text-[var(--mos-text-muted)]'
                }`}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Human Explanation Box */}
      <div className="p-2.5 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-[11px] text-[var(--mos-text)] leading-relaxed">
        {mission.humanStatusSummary ||
          mission.humanSummary ||
          'Nhiệm vụ đang được triển khai trên hệ thống mOS Mission.'}
      </div>

      {/* Super Admin Inline Gate Controls (Cổng 1, Cổng 2, Cổng 3) */}
      {isStrictDannySuperAdmin && (
        <div className="space-y-2 pt-1">
          {canApproveImplementation && (
            <button
              type="button"
              disabled={actionLoading === 'APPROVE_IMPLEMENTATION'}
              onClick={() => void handleExecuteMissionAction('APPROVE_IMPLEMENTATION')}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'APPROVE_IMPLEMENTATION' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
            </button>
          )}

          {canSuperAdminApproveCommit && (
            <button
              type="button"
              disabled={actionLoading === 'APPROVE_COMMIT'}
              onClick={() => void handleExecuteMissionAction('APPROVE_COMMIT')}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'APPROVE_COMMIT' ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              )}
              <span>✅ Duyệt Commit (Cổng 2)</span>
            </button>
          )}

          {canSuperAdminApproveDeploy && (
            <button
              type="button"
              disabled={actionLoading === 'APPROVE_DEPLOY'}
              onClick={() => void handleExecuteMissionAction('APPROVE_DEPLOY')}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'APPROVE_DEPLOY' ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Rocket className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              )}
              <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
            </button>
          )}
        </div>
      )}

      {/* Reporter & Staff Acceptance & Rework Controls */}
      {canReporterAccept && (
        <button
          type="button"
          disabled={actionLoading === 'REPORTER_ACCEPT'}
          onClick={() => void handleExecuteMissionAction('REPORTER_ACCEPT')}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
        >
          {actionLoading === 'REPORTER_ACCEPT' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4 stroke-[3]" />
          )}
          <span>🎉 Đã đúng ý (Nghiệm thu hoàn tất)</span>
        </button>
      )}

      {canRequestUpgradeOrRework && (
        <div className="pt-1">
          {!isReopenOpen ? (
            <button
              type="button"
              onClick={() => setIsReopenOpen(true)}
              className={`w-full py-1.5 px-3 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>🔄 Yêu cầu chỉnh sửa thêm / Nâng cấp tiếp</span>
            </button>
          ) : (
            <div className="space-y-2 p-2.5 rounded-xl bg-[var(--mos-surface)] border border-[var(--mos-surface-border)]">
              <label className="text-[11px] font-semibold text-[var(--mos-text)] block">
                Nội dung cần chỉnh thêm hoặc nâng cấp:
              </label>
              <textarea
                rows={2}
                value={reopenFeedback}
                onChange={(e) => setReopenFeedback(e.target.value)}
                placeholder="Nhập nội dung cần điều chỉnh thêm..."
                className="w-full p-2 bg-[var(--background)] border border-[var(--mos-surface-border)] rounded-lg text-xs text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] focus:outline-none focus:border-[var(--mos-accent)]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReopenOpen(false);
                    setReopenFeedback('');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!reopenFeedback.trim() || actionLoading === 'REPORTER_REOPEN'}
                  onClick={() => void handleExecuteMissionAction('REPORTER_REOPEN', reopenFeedback.trim())}
                  className="px-3 py-1 rounded-lg bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] text-xs font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {actionLoading === 'REPORTER_REOPEN' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Gửi yêu cầu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
