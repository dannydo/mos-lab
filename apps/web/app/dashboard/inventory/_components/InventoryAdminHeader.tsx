'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Select } from 'antd';
import {
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Layers,
  Package,
  QrCode,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  UserCheck,
  Warehouse,
} from 'lucide-react';
import type { InventoryRolePreviewKey, InventoryStoreOptionDto } from '@mos-lab/shared';
import { AppIcon, PageHeader, StatusTag } from '../../../../components/ui';

const NAV_ITEMS = [
  { href: '/dashboard/inventory/items', label: 'Quản Lý Kho', icon: Package },
  { href: '/dashboard/inventory/orders', label: 'Phiếu Xuất / Nhập', icon: FileSpreadsheet },
  { href: '/dashboard/inventory/limits', label: 'Định Mức Tồn', icon: SlidersHorizontal },
  { href: '/dashboard/inventory/assign', label: 'Đang Giao NV', icon: UserCheck },
  { href: '/dashboard/inventory/assets', label: 'Tài Sản', icon: Layers },
  { href: '/dashboard/inventory/scan-logs', label: 'Quét Mã QR', icon: QrCode },
  { href: '/dashboard/inventory/catalog', label: 'Danh Mục SKU/Kho', icon: Database },
];

const ROLE_OPTIONS: Array<{ value: InventoryRolePreviewKey; label: string }> = [
  { value: 'admin', label: 'Admin (Full)' },
  { value: 'inventory-manager', label: 'Thủ Kho (Inv Manager)' },
  { value: 'branch-manager', label: 'Quản Lý CN (Branch Mgr)' },
  { value: 'client-consultant', label: 'Tư Vấn (CC · Ẩn Giá)' },
];

export interface InventoryAdminHeaderProps {
  previewRole: InventoryRolePreviewKey;
  previewStoreId: number | null;
  stores: InventoryStoreOptionDto[];
  permissionCount: number;
  onPreviewRoleChange: (role: InventoryRolePreviewKey) => void;
  onPreviewStoreChange: (storeId: number | null) => void;
  onOpenChecks?: () => void;
  canViewChecks?: boolean;
}

export function InventoryAdminHeader({
  previewRole,
  previewStoreId,
  stores,
  permissionCount,
  onPreviewRoleChange,
  onPreviewStoreChange,
  onOpenChecks,
  canViewChecks,
}: InventoryAdminHeaderProps) {
  const pathname = usePathname() || '';
  const showStoreScope = previewRole === 'branch-manager' || previewRole === 'client-consultant';

  return (
    <div className="space-y-3">
      <PageHeader
        title="Hệ Thống Kho & Vật Tư (1:1 Clone)"
        subtitle="Đồng bộ 32 phân quyền legacy, báo cáo tồn/luân chuyển & điều chỉnh vật lý trên DB cô lập"
        icon={<AppIcon icon={Warehouse} size="md" />}
        tag={<StatusTag status="processing" label={`${permissionCount} quyền hiệu lực`} />}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag status="cyan" label="DB: management_inventory_win" />
            {canViewChecks && onOpenChecks && (
              <Button icon={<AppIcon icon={ClipboardCheck} size="sm" />} onClick={onOpenChecks}>
                Phiếu Kiểm Kho
              </Button>
            )}
            <Link href="/ios-app?role=INVENTORY">
              <Button type="primary" icon={<AppIcon icon={Smartphone} size="sm" />}>
                Mở iOS Kho / Quét QR
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/70">
        <nav aria-label="Điều hướng phân hệ Kho" className="flex flex-wrap items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm dark:bg-sky-500'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <AppIcon icon={item.icon} size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <AppIcon icon={ShieldCheck} size={14} />
            Role Preview:
          </span>
          <Select
            size="small"
            className="w-48"
            value={previewRole}
            options={ROLE_OPTIONS}
            onChange={(val) => onPreviewRoleChange(val as InventoryRolePreviewKey)}
          />
          {showStoreScope && (
            <Select
              size="small"
              allowClear
              placeholder="Chọn chi nhánh preview"
              className="w-44"
              value={previewStoreId ?? undefined}
              options={stores.map((s) => ({ value: s.client_store_id, label: s.store_name }))}
              onChange={(val) => onPreviewStoreChange(val ? Number(val) : null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
