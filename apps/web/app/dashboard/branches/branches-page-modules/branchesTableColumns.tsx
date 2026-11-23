'use client';

import React from 'react';
import { Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, Compass, Edit, Eye, MapPin, ShoppingBag, Users, XCircle } from 'lucide-react';
import type { BranchType, CrmBranch } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { getBranchDisplayAddress } from './branchesPageTypes';
import { BranchStoreTypeBadge } from './BranchStoreTypeBadge';
import { BranchToggleActiveAction } from './BranchToggleActiveAction';

interface BuildBranchesTableColumnsOptions {
  canManage: boolean;
  onOpenDetail: (branch: CrmBranch) => void;
  onOpenEdit: (branch: CrmBranch) => void;
  onToggleActive: (branch: CrmBranch) => void | Promise<void>;
}

export function buildBranchesTableColumns({
  canManage,
  onOpenDetail,
  onOpenEdit,
  onToggleActive,
}: BuildBranchesTableColumnsOptions): ColumnsType<CrmBranch> {
  return [
    {
      title: 'Mã & Tên Chi Nhánh',
      key: 'name',
      render: (_: unknown, record: CrmBranch) => (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex flex-col items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
            <span className="text-xs uppercase leading-none">{record.code.slice(0, 4)}</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{record.name}</span>
              {!record.isActive && <StatusTag status="default" label="Tạm ẩn" />}
            </div>
            {record.nameEn && <div className="text-xs text-slate-500 dark:text-slate-400 italic">{record.nameEn}</div>}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
              Code: <span className="font-semibold text-slate-600 dark:text-slate-300">{record.code}</span>
              {record.sortOrder !== undefined && ` · Thứ tự: ${record.sortOrder}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Loại hình',
      dataIndex: 'storeType',
      key: 'storeType',
      width: 170,
      render: (type: BranchType) => <BranchStoreTypeBadge type={type} />,
    },
    {
      title: 'Địa chỉ & Vị trí',
      key: 'address',
      render: (_: unknown, record: CrmBranch) => {
        const displayAddr = getBranchDisplayAddress(record, 'Chưa có địa chỉ');
        return (
          <div className="max-w-md text-sm">
            <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
              <AppIcon icon={MapPin} size="sm" className="mt-1 text-slate-400 flex-shrink-0" />
              <span className="line-clamp-2">{displayAddr}</span>
            </div>
            {record.addressMap && (
              <a
                href={record.addressMap}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-1"
              >
                <AppIcon icon={Compass} size="sm" /> Xem trên Google Maps
              </a>
            )}
          </div>
        );
      },
    },
    {
      title: 'Nhân sự',
      key: 'staffCount',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: CrmBranch) => (
        <Tooltip title="Nhân sự làm việc tại chi nhánh này">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium tabular-nums">
            <AppIcon icon={Users} size="sm" className="text-slate-400" />
            <span>{record.staffCount ?? 0}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'completedOrdersCount',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: CrmBranch) => (
        <Tooltip title="Tổng số đơn hàng đã hoàn tất tại chi nhánh">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium tabular-nums">
            <AppIcon icon={ShoppingBag} size="sm" className="text-slate-400" />
            <span>{(record.completedOrdersCount ?? 0).toLocaleString('vi-VN')}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 130,
      align: 'center' as const,
      render: (_: unknown, record: CrmBranch) =>
        record.isActive ? (
          <StatusTag status="success" label="Hoạt động" icon={<AppIcon icon={CheckCircle2} size="sm" />} />
        ) : (
          <StatusTag status="default" label="Tạm ngắt" icon={<AppIcon icon={XCircle} size="sm" />} />
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'right' as const,
      render: (_: unknown, record: CrmBranch) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết & nhân sự">
            <Button
              type="text"
              size="small"
              icon={<AppIcon icon={Eye} size="sm" />}
              onClick={() => onOpenDetail(record)}
            />
          </Tooltip>
          {canManage && (
            <>
              <Tooltip title="Chỉnh sửa chi nhánh">
                <Button
                  type="text"
                  size="small"
                  icon={<AppIcon icon={Edit} size="sm" />}
                  onClick={() => onOpenEdit(record)}
                />
              </Tooltip>
              <BranchToggleActiveAction
                branch={record}
                onToggleActive={onToggleActive}
                withTooltip
                deactivateDescription="Chi nhánh sẽ bị ẩn khỏi danh sách đặt lịch nhưng bảo lưu dữ liệu lịch sử."
                activateDescription="Chi nhánh sẽ hiển thị trở lại trong danh sách hoạt động."
              />
            </>
          )}
        </Space>
      ),
    },
  ];
}
