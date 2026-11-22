'use client';

import React from 'react';
import { Avatar, Popconfirm } from 'antd';
import { ArrowDownCircle, Sparkles } from 'lucide-react';
import type { CareerRole, CareerStaffSummary } from '@mos-lab/shared';
import { WingRoleLabel } from '../IslandGameIcon';
import { StaffRoleBadge } from './StaffCareerRoleControls';
import { getBananaBalance, getQaAuditsCount, getStaffComboPercent, getStaffTipPercent } from './staffCareerMetrics';

interface StaffCareerSelectedFooterProps {
  selectedStaff: CareerStaffSummary;
  lastSyncedAt?: string | null;
  actionLoading: boolean;
  onSetRole?: (staffId: number, newRole: CareerRole) => Promise<void>;
  onDemote?: (staffId: number, targetRole: CareerRole) => Promise<void>;
}

export const StaffCareerSelectedFooter: React.FC<StaffCareerSelectedFooterProps> = ({
  selectedStaff,
  lastSyncedAt,
  actionLoading,
  onSetRole,
  onDemote,
}) => (
  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-slate-500 dark:text-slate-400">Đang chọn:</span>
      <Avatar
        src={selectedStaff.avatarUrl || undefined}
        size={22}
        className="shrink-0 bg-gradient-to-tr from-rose-400 to-amber-300 text-white font-bold text-[10px]"
      >
        {selectedStaff.displayName.slice(0, 1).toUpperCase()}
      </Avatar>
      <span className="font-bold text-slate-800 dark:text-slate-100">{selectedStaff.displayName}</span>
      <StaffRoleBadge role={selectedStaff.careerRole} compact />
      {selectedStaff.branchName && (
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
          {selectedStaff.branchName}
        </span>
      )}
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        <strong>{selectedStaff.ordersCount}</strong> bộ mi (90 ngày qua)
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        Fix: <strong>{(selectedStaff.fixRate * 100).toFixed(1)}%</strong>
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        Tip: <strong>{getStaffTipPercent(selectedStaff)}%</strong>
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        QA: <strong>{getQaAuditsCount(selectedStaff)}/4</strong>
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        HI: <strong>{Math.round((selectedStaff.happinessIndex || 0.75) * 100)}%</strong>
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        Chuối yêu thương: <strong>{selectedStaff.bananaCount || 0} 🍌</strong>
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-slate-600 dark:text-slate-300">
        Combo: <strong>{getStaffComboPercent(selectedStaff)}%</strong>
      </span>
      <span className="text-slate-400">·</span>
      <span className="tabular-nums text-amber-600 dark:text-amber-400 font-bold">
        Ví: <strong>{getBananaBalance(selectedStaff).toLocaleString('vi-VN')} 🍌</strong>
      </span>
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      {selectedStaff.careerRole === 'KTV' && onSetRole && (
        <Popconfirm
          title="Đưa nhân sự này lên CV?"
          description={`Xác nhận thăng cấp cho ${selectedStaff.displayName} lên CV (khi được FM / Đàn Chị bảo trợ & hoàn thành sát hạch).`}
          okText="Lên CV"
          cancelText="Hủy"
          onConfirm={() => onSetRole(selectedStaff.id, 'CV')}
        >
          <button
            type="button"
            disabled={actionLoading}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lên CV</span>
          </button>
        </Popconfirm>
      )}

      {selectedStaff.careerRole === 'CV' && onSetRole && (
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
              <span>Xác nhận thăng cấp thủ công cho {selectedStaff.displayName} lên</span>
              <WingRoleLabel text="CVL" />
              <span>.</span>
            </span>
          }
          okText={
            <span className="inline-flex items-center gap-1">
              <span>Lên</span>
              <WingRoleLabel text="CVL" />
            </span>
          }
          cancelText="Hủy"
          onConfirm={() => onSetRole(selectedStaff.id, 'CV_PLUS')}
        >
          <button
            type="button"
            disabled={actionLoading}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="inline-flex items-center gap-1">
              <span>Lên</span>
              <WingRoleLabel text="CVL" />
            </span>
          </button>
        </Popconfirm>
      )}

      {selectedStaff.careerRole === 'CV_PLUS' && (
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
                  <span>Xác nhận thăng cấp thủ công cho {selectedStaff.displayName} lên</span>
                  <WingRoleLabel text="CVLL" />
                  <span>.</span>
                </span>
              }
              okText={
                <span className="inline-flex items-center gap-1">
                  <span>Lên</span>
                  <WingRoleLabel text="CVLL" />
                </span>
              }
              cancelText="Hủy"
              onConfirm={() => onSetRole(selectedStaff.id, 'CV_PLUS_PLUS')}
            >
              <button
                type="button"
                disabled={actionLoading}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 disabled:opacity-50"
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
              description={`Chuyển cấp bậc của ${selectedStaff.displayName} về CV.`}
              okText="Hạ về CV"
              cancelText="Hủy"
              okType="danger"
              onConfirm={() => onDemote(selectedStaff.id, 'CV')}
            >
              <button
                type="button"
                disabled={actionLoading}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>🔻 Hạ về CV</span>
              </button>
            </Popconfirm>
          )}
        </>
      )}

      {selectedStaff.careerRole === 'CV_PLUS_PLUS' && onDemote && (
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
              <span>Chuyển cấp bậc của {selectedStaff.displayName} về</span>
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
          onConfirm={() => onDemote(selectedStaff.id, 'CV_PLUS')}
        >
          <button
            type="button"
            disabled={actionLoading}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span className="inline-flex items-center gap-1">
              <span>🔻 Hạ về</span>
              <WingRoleLabel text="CVL" />
            </span>
          </button>
        </Popconfirm>
      )}

      {lastSyncedAt && (
        <div className="text-[10px] text-slate-400 tabular-nums ml-1">
          Đồng bộ lúc: {new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}
        </div>
      )}
    </div>
  </div>
);
