'use client';

import React from 'react';
import { Button } from 'antd';
import { CheckCircle2, Compass, Edit, Eye, MapPin, ShoppingBag, Users, XCircle } from 'lucide-react';
import type { CrmBranch } from '@mos-lab/shared';
import { AppIcon, StatePanel, StatusTag } from '~/components/ui';
import { getBranchDisplayAddress } from './branchesPageTypes';
import { BranchStoreTypeBadge } from './BranchStoreTypeBadge';
import { BranchToggleActiveAction } from './BranchToggleActiveAction';

interface BranchesGridViewProps {
  loading: boolean;
  branches: CrmBranch[];
  canManage: boolean;
  onOpenDetail: (branch: CrmBranch) => void;
  onOpenEdit: (branch: CrmBranch) => void;
  onToggleActive: (branch: CrmBranch) => void | Promise<void>;
}

interface BranchGridCardProps {
  branch: CrmBranch;
  canManage: boolean;
  onOpenDetail: (branch: CrmBranch) => void;
  onOpenEdit: (branch: CrmBranch) => void;
  onToggleActive: (branch: CrmBranch) => void | Promise<void>;
}

function BranchGridCard({ branch, canManage, onOpenDetail, onOpenEdit, onToggleActive }: BranchGridCardProps) {
  const displayAddress = getBranchDisplayAddress(branch, 'Chưa cập nhật địa chỉ');

  return (
    <div
      className={`group rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 ${
        !branch.isActive ? 'opacity-70' : ''
      }`}
    >
      {/* Top Bar */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center font-bold text-base text-emerald-600 dark:text-emerald-400">
              {branch.code}
            </div>
            <div>
              <div className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {branch.name}
              </div>
              {branch.nameEn && (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{branch.nameEn}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {branch.isActive ? (
              <StatusTag status="success" label="Hoạt động" icon={<AppIcon icon={CheckCircle2} size="sm" />} />
            ) : (
              <StatusTag status="default" label="Tạm ẩn" icon={<AppIcon icon={XCircle} size="sm" />} />
            )}
          </div>
        </div>

        <div className="mb-3">
          <BranchStoreTypeBadge type={branch.storeType} />
        </div>

        {/* Address & City */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <AppIcon icon={MapPin} size="sm" className="mt-0.5 text-slate-400 flex-shrink-0" />
            <span className="line-clamp-2 leading-relaxed">{displayAddress}</span>
          </div>

          {branch.addressMap && (
            <div className="pl-5">
              <a
                href={branch.addressMap}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                <AppIcon icon={Compass} size="sm" /> Mở bản đồ Google Maps
              </a>
            </div>
          )}

          {branch.notes && (
            <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs italic line-clamp-2">
              {branch.notes}
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <AppIcon icon={Users} size="sm" className="text-slate-400" />
          <span>
            Nhân sự:{' '}
            <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{branch.staffCount ?? 0}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AppIcon icon={ShoppingBag} size="sm" className="text-slate-400" />
          <span>
            Đơn hoàn tất:{' '}
            <strong className="text-slate-700 dark:text-slate-200 tabular-nums">
              {(branch.completedOrdersCount ?? 0).toLocaleString('vi-VN')}
            </strong>
          </span>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="p-3 px-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
        <Button
          type="link"
          size="small"
          icon={<AppIcon icon={Eye} size="sm" />}
          onClick={() => onOpenDetail(branch)}
          className="p-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-medium"
        >
          Chi tiết & Nhân sự
        </Button>

        {canManage && (
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              icon={<AppIcon icon={Edit} size="sm" />}
              onClick={() => onOpenEdit(branch)}
            >
              Sửa
            </Button>
            <BranchToggleActiveAction branch={branch} onToggleActive={onToggleActive} showLabel />
          </div>
        )}
      </div>
    </div>
  );
}

export function BranchesGridView({
  loading,
  branches,
  canManage,
  onOpenDetail,
  onOpenEdit,
  onToggleActive,
}: BranchesGridViewProps) {
  if (loading) {
    return <StatePanel kind="loading" title="Đang tải danh sách chi nhánh…" />;
  }

  if (branches.length === 0) {
    return (
      <StatePanel
        kind="empty"
        title="Không tìm thấy chi nhánh nào"
        description="Không có chi nhánh phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {branches.map((branch) => (
        <BranchGridCard
          key={branch.id}
          branch={branch}
          canManage={canManage}
          onOpenDetail={onOpenDetail}
          onOpenEdit={onOpenEdit}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
}
