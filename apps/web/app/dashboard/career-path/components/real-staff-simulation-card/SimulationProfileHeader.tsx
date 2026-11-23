'use client';

import React from 'react';
import { Avatar, Popconfirm, Tooltip } from 'antd';
import { ArrowDownCircle, ArrowRight, ChevronRight, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import type { StaffCareerStatus } from '@mos-lab/shared';
import { formatCareerRoleName } from '../../career-path.constants';
import { WingRoleLabel } from '../IslandGameIcon';
import { SimulationStatusBadge } from './SimulationStatusAndIcons';
import { type FinancialSimulationSummary, type QuestMetricsSummary, formatVnd } from './simulationTypesAndHelpers';

interface SimulationProfileHeaderProps {
  status: StaffCareerStatus;
  questMetrics: QuestMetricsSummary;
  financialSummary: FinancialSimulationSummary;
  loadingAction?: boolean;
  onExpandStaffSelector?: () => void;
  onSwitchSpecialist?: () => void;
  onSetRole?: (newRole: 'CV' | 'CV_PLUS' | 'CV_PLUS_PLUS') => void;
  onDemote?: () => void;
}

export const SimulationProfileHeader: React.FC<SimulationProfileHeaderProps> = ({
  status,
  questMetrics,
  financialSummary,
  loadingAction,
  onExpandStaffSelector,
  onSwitchSpecialist,
  onSetRole,
  onDemote,
}) => {
  const { passedQuestsCount, xpPercent, hasFailedQa, isQaPassed, isOrdersPassed, isFixPassed, isTipPassed } =
    questMetrics;
  const { isComboTargetHit, totalSimulatedGain, effectiveTipGain } = financialSummary;

  return (
    <>
      {/* MOBILE PROMINENT ROUTE & BENEFIT BAR (< md): Combines larger route, gain & badges */}
      <div className="md:hidden flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-200/80 dark:border-slate-800 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-base sm:text-lg font-black tracking-tight">
            <span className="text-slate-900 dark:text-white inline-flex items-center">
              <WingRoleLabel text={formatCareerRoleName(status.currentRole, true)} iconSize={15} />
            </span>
            <span className="text-pink-500 font-black text-sm sm:text-base">➔</span>
            <span className="text-rose-500 dark:text-rose-400 font-black inline-flex items-center">
              <WingRoleLabel text={formatCareerRoleName(status.targetRole, true)} iconSize={15} />
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums tracking-tight">
            (+{isComboTargetHit ? formatVnd(totalSimulatedGain) : formatVnd(effectiveTipGain)}/thg)
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            {passedQuestsCount}/6 ải ({xpPercent}%)
          </span>
        </div>
      </div>

      {/* DESKTOP TOP BANNER (>= md): Staff Profile & Simulation Controls */}
      <div className="hidden md:flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap sm:flex-nowrap">
        {/* Left Side: Avatar + Staff Name + Status Tag + Journey Route */}
        <div className="flex items-center gap-3.5 min-w-0">
          {onExpandStaffSelector && (
            <Tooltip title="Mở rộng danh sách Chuyên Viên (⮞)">
              <button
                type="button"
                onClick={onExpandStaffSelector}
                className="w-8 h-8 rounded-xl border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
          <Avatar
            src={status.avatarUrl || undefined}
            size={48}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 border-2 border-white dark:border-slate-800"
          >
            {status.staffName.slice(0, 1).toUpperCase()}
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 m-0 truncate">
                {status.staffName}
              </h2>
              {status.metrics?.branchName && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    status.metrics.branchCode === 'EP'
                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30'
                      : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{status.metrics.branchName}</span>
                </span>
              )}
              <SimulationStatusBadge
                hasFailedQa={hasFailedQa}
                isQaPassed={isQaPassed}
                isOrdersPassed={isOrdersPassed}
                isFixPassed={isFixPassed}
                isTipPassed={isTipPassed}
                careerStatus={status.status}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span>Ải hiện tại:</span>
                <strong className="text-slate-700 dark:text-slate-200 font-bold inline-flex items-center">
                  <WingRoleLabel text={formatCareerRoleName(status.currentRole)} />
                </strong>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mx-0.5" />
              <span className="inline-flex items-center gap-1">
                <span>Ải tiếp theo:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center">
                  <WingRoleLabel text={formatCareerRoleName(status.targetRole)} />
                </strong>
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums ml-1">
                (+{isComboTargetHit ? formatVnd(totalSimulatedGain) : formatVnd(effectiveTipGain)}/thg)
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Operational Scope Badge - CVL (Đang triển khai) */}
        <div className="flex items-center gap-1.5 p-1 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 dark:bg-slate-800/90 rounded-xl border border-amber-500/30 shrink-0 self-start md:self-auto">
          <span className="inline-flex items-center gap-1 font-black text-xs py-1 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
            <WingRoleLabel text="CVL" />
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5">
            🔥 Đang triển khai
          </span>
          <span className="text-[9px] text-slate-400 font-normal hidden lg:inline-flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
            <WingRoleLabel text="CVLL" />
            <span>đang nghiên cứu</span>
          </span>
        </div>
      </div>

      {/* DESKTOP Sub-bar: Quest Milestone & Quick Actions Toolbar (>= md) */}
      <div className="hidden md:flex items-center justify-between gap-3 pt-3.5 mt-0 flex-wrap sm:flex-nowrap">
        {/* Left: Quest Milestone Progress Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Tiêu chí đạt chuẩn:{' '}
            <strong className="text-slate-700 dark:text-slate-200 font-bold tabular-nums">
              {passedQuestsCount}/6 ải
            </strong>{' '}
            <span className="tabular-nums">({xpPercent}%)</span>
          </span>
        </div>

        {/* Right: Action Buttons Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
          {onSwitchSpecialist && status.status !== 'SPECIALIST_PATH' && (
            <button
              type="button"
              onClick={onSwitchSpecialist}
              disabled={loadingAction}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              Nhánh Master Tech
            </button>
          )}

          {/* Manual Quick Override Promotion / Demotion */}
          {status.currentRole === 'KTV' && onSetRole && (
            <Popconfirm
              title="Đưa nhân sự này lên CV?"
              description={`Xác nhận thăng cấp cho ${status.staffName} lên CV (khi được FM / Đàn Chị bảo trợ & đạt sát hạch).`}
              okText="Lên CV"
              cancelText="Hủy"
              onConfirm={() => onSetRole('CV')}
            >
              <button
                type="button"
                disabled={loadingAction}
                className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/50 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lên CV</span>
              </button>
            </Popconfirm>
          )}

          {status.currentRole === 'CV' && onSetRole && (
            <Popconfirm
              title={
                <span className="inline-flex items-center gap-1">
                  <span>Đưa nhân sự này lên</span>
                  <WingRoleLabel text="CVL" />
                  <span>?</span>
                </span>
              }
              description={
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span>Thăng cấp thủ công cho {status.staffName} lên</span>
                  <WingRoleLabel text="CVL" />
                  <span>ngay lập tức.</span>
                </span>
              }
              okText={
                <span className="inline-flex items-center gap-1">
                  <span>Lên</span>
                  <WingRoleLabel text="CVL" />
                </span>
              }
              cancelText="Hủy"
              onConfirm={() => onSetRole('CV_PLUS')}
            >
              <button
                type="button"
                disabled={loadingAction}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="inline-flex items-center gap-1">
                  <span>Lên</span>
                  <WingRoleLabel text="CVL" />
                </span>
              </button>
            </Popconfirm>
          )}

          {status.currentRole === 'CV_PLUS' && (
            <>
              {onSetRole && (
                <Popconfirm
                  title={
                    <span className="inline-flex items-center gap-1">
                      <span>Đưa nhân sự này lên</span>
                      <WingRoleLabel text="CVLL" />
                      <span>?</span>
                    </span>
                  }
                  description={
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      <span>Thăng cấp thủ công cho {status.staffName} lên</span>
                      <WingRoleLabel text="CVLL" />
                      <span>ngay lập tức.</span>
                    </span>
                  }
                  okText={
                    <span className="inline-flex items-center gap-1">
                      <span>Lên</span>
                      <WingRoleLabel text="CVLL" />
                    </span>
                  }
                  cancelText="Hủy"
                  onConfirm={() => onSetRole('CV_PLUS_PLUS')}
                >
                  <button
                    type="button"
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="inline-flex items-center gap-1">
                      <span>Lên</span>
                      <WingRoleLabel text="CVLL" />
                    </span>
                  </button>
                </Popconfirm>
              )}
              {onDemote && (
                <Popconfirm
                  title="Hạ cấp nhân sự về CV?"
                  description={`Chuyển cấp bậc của ${status.staffName} về CV.`}
                  okText="Hạ về CV"
                  cancelText="Hủy"
                  okType="danger"
                  onConfirm={onDemote}
                >
                  <button
                    type="button"
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>🔻 Hạ về CV</span>
                  </button>
                </Popconfirm>
              )}
            </>
          )}

          {status.currentRole === 'CV_PLUS_PLUS' && onDemote && (
            <Popconfirm
              title={
                <span className="inline-flex items-center gap-1">
                  <span>Hạ cấp nhân sự về</span>
                  <WingRoleLabel text="CVL" />
                  <span>?</span>
                </span>
              }
              description={
                <span className="inline-flex items-center gap-1 flex-wrap">
                  <span>Chuyển cấp bậc của {status.staffName} về</span>
                  <WingRoleLabel text="CVL" />
                  <span>.</span>
                </span>
              }
              okText={
                <span className="inline-flex items-center gap-1">
                  <span>Hạ về</span>
                  <WingRoleLabel text="CVL" />
                </span>
              }
              cancelText="Hủy"
              okType="danger"
              onConfirm={onDemote}
            >
              <button
                type="button"
                disabled={loadingAction}
                className="px-3 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span className="inline-flex items-center gap-1">
                  <span>🔻 Hạ về</span>
                  <WingRoleLabel text="CVL" />
                </span>
              </button>
            </Popconfirm>
          )}
        </div>
      </div>
    </>
  );
};
