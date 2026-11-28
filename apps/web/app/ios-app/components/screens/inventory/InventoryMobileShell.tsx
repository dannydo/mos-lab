'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  INVENTORY_ROLE_PREVIEW_PRESETS,
  type InventoryPermissionsResponse,
  type InventoryRolePreviewKey,
  type InventoryWarehouseDto,
} from '@mos-lab/shared';
import { ClipboardCheck, QrCode, Settings, Shield } from 'lucide-react';
import { MosAppLauncher } from '../../../../../components/layout/MosAppLauncher';
import { apiClient } from '../../../../../lib/api-client';
import { InventoryScannerScreen } from './InventoryScannerScreen';
import { InventoryWarehouseCheckItemScreen } from './InventoryWarehouseCheckItemScreen';
import { InventoryWarehouseCheckScanScreen } from './InventoryWarehouseCheckScanScreen';
import { InventoryWarehouseItemHistoryScreen } from './InventoryWarehouseItemHistoryScreen';

interface InventoryMobileShellProps {
  isAdmin?: boolean;
  defaultStoreId?: number;
  onOpenSettings?: () => void;
}

type InventoryMobileView =
  | { name: 'check' }
  | { name: 'scanner' }
  | { name: 'check-items'; checkId: number; inventoryItemId: number; itemName: string }
  | {
      name: 'history';
      warehouseItemId: number;
      backCheckId: number;
      backInventoryItemId: number;
      backItemName: string;
    };

const PREVIEW_ROLE_OPTIONS: InventoryRolePreviewKey[] = [
  'admin',
  'inventory-manager',
  'branch-manager',
  'client-consultant',
];

export function InventoryMobileShell({
  isAdmin = true,
  defaultStoreId = 6,
  onOpenSettings,
}: InventoryMobileShellProps) {
  const [previewRole, setPreviewRole] = useState<InventoryRolePreviewKey>('admin');
  const [previewStoreId, setPreviewStoreId] = useState<number>(defaultStoreId === 16 ? 16 : 6);
  const [permState, setPermState] = useState<InventoryPermissionsResponse | null>(null);
  const [warehouses, setWarehouses] = useState<InventoryWarehouseDto[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(defaultStoreId === 16 ? 41 : 3);
  const [view, setView] = useState<InventoryMobileView>({ name: 'check' });
  const [refreshTick, setRefreshTick] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadContext = useCallback(async () => {
    setErrorMsg(null);
    try {
      const [permsRes, whRes] = await Promise.all([
        apiClient.inventory.getPermissions({
          previewRole,
          previewStoreId,
        }),
        apiClient.inventory.getWarehouses({
          isInternalWarehouse: true,
          previewRole,
          previewStoreId,
        }),
      ]);

      setPermState(permsRes);
      if (whRes.success && whRes.warehouses.length > 0) {
        setWarehouses(whRes.warehouses);
        // When switching preview store on BM / CC, default to that store's main internal warehouse
        setSelectedWarehouseId((prev) => {
          if (previewRole === 'branch-manager' || previewRole === 'client-consultant') {
            const match = whRes.warehouses.find((w) => w.client_store_id === previewStoreId);
            if (match) return match.inventory_warehouse_id;
          }
          if (!whRes.warehouses.some((w) => w.inventory_warehouse_id === prev)) {
            const deTham = whRes.warehouses.find((w) => w.inventory_warehouse_id === 3) || whRes.warehouses[0];
            return deTham.inventory_warehouse_id;
          }
          return prev;
        });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được cấu hình kho');
    }
  }, [previewRole, previewStoreId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const isStorePreview = previewRole === 'branch-manager' || previewRole === 'client-consultant';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black text-white">
      {/* Compact Top Ecosystem & Role Preview Bar */}
      <div className="bg-neutral-950 border-b border-neutral-800 px-2 py-1.5 flex items-center justify-between gap-2 shrink-0">
        <MosAppLauncher currentApp="ios" shape="circle" onOpenProfile={onOpenSettings} />

        {isAdmin ? (
          <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
            <Shield className="w-3.5 h-3.5 text-[#FFB400] shrink-0" />
            {PREVIEW_ROLE_OPTIONS.map((key) => {
              const active = previewRole === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreviewRole(key)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                    active ? 'bg-[#FFB400] text-black' : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {INVENTORY_ROLE_PREVIEW_PRESETS[key].shortLabel}
                </button>
              );
            })}
            {isStorePreview && (
              <select
                value={previewStoreId}
                onChange={(e) => setPreviewStoreId(Number(e.target.value))}
                className="bg-neutral-800 text-amber-300 text-[11px] font-semibold rounded px-1.5 py-0.5 border border-neutral-700"
              >
                <option value={6}>Đề Thám</option>
                <option value={16}>Estella</option>
              </select>
            )}
          </div>
        ) : (
          <div className="flex-1 min-w-0 text-[11px] font-bold text-[#FFB400] tracking-wide uppercase truncate">
            mOS Kho
          </div>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1 text-neutral-400 hover:text-[#FFB400] shrink-0 cursor-pointer"
            aria-label="Cài đặt / Đổi vai trò"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && <div className="px-3 py-2 bg-red-950 text-red-200 text-xs text-center shrink-0">{errorMsg}</div>}

      {/* Main Active Screen */}
      {!permState ? (
        <div className="flex-1 flex items-center justify-center bg-black text-[#FFB400] text-xs font-semibold">
          Đang kết nối Kho WingsLashes...
        </div>
      ) : view.name === 'scanner' ? (
        <InventoryScannerScreen
          permissions={permState.permissions}
          isClientConsultant={permState.actor.isClientConsultant}
          previewRole={previewRole}
          previewStoreId={previewStoreId}
          initialMode="inventory-check"
          onBack={() => setView({ name: 'check' })}
          onOpenCheckList={() => setView({ name: 'check' })}
          onScanMutated={() => setRefreshTick((t) => t + 1)}
        />
      ) : view.name === 'check-items' ? (
        <InventoryWarehouseCheckItemScreen
          checkId={view.checkId}
          inventoryItemId={view.inventoryItemId}
          itemName={view.itemName}
          previewRole={previewRole}
          previewStoreId={previewStoreId}
          onBack={() => setView({ name: 'check' })}
          onSelectWarehouseItem={(warehouseItemId) =>
            setView({
              name: 'history',
              warehouseItemId,
              backCheckId: view.checkId,
              backInventoryItemId: view.inventoryItemId,
              backItemName: view.itemName,
            })
          }
        />
      ) : view.name === 'history' ? (
        <InventoryWarehouseItemHistoryScreen
          warehouseItemId={view.warehouseItemId}
          permissions={permState.permissions}
          previewRole={previewRole}
          previewStoreId={previewStoreId}
          onBack={() =>
            setView({
              name: 'check-items',
              checkId: view.backCheckId,
              inventoryItemId: view.backInventoryItemId,
              itemName: view.backItemName,
            })
          }
        />
      ) : (
        <InventoryWarehouseCheckScanScreen
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          permissions={permState.permissions}
          isClientConsultant={permState.actor.isClientConsultant}
          previewRole={previewRole}
          previewStoreId={previewStoreId}
          refreshTick={refreshTick}
          onSelectWarehouse={(whId) => setSelectedWarehouseId(whId)}
          onOpenScanner={() => setView({ name: 'scanner' })}
          onBackToMenu={() => (onOpenSettings ? onOpenSettings() : setView({ name: 'scanner' }))}
          onSelectSku={(sku) => setView({ name: 'check-items', ...sku })}
        />
      )}

      {/* Bottom Legacy-Style Switch Bar (hidden in fullscreen scanner camera mode) */}
      {view.name !== 'scanner' && (
        <div className="h-[52px] bg-white border-t border-neutral-300 grid grid-cols-3 shrink-0">
          <button
            type="button"
            onClick={() => setView({ name: 'check' })}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              view.name === 'check' || view.name === 'check-items' || view.name === 'history'
                ? 'text-[#D99600]'
                : 'text-neutral-500'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Kiểm Kho</span>
          </button>

          <button
            type="button"
            onClick={() => setView({ name: 'scanner' })}
            className="flex flex-col items-center justify-center -mt-3 cursor-pointer"
          >
            <span className="w-11 h-11 rounded-full bg-black text-[#FFB400] border-2 border-[#FFB400] flex items-center justify-center shadow-lg">
              <QrCode className="w-5 h-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings?.()}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-neutral-500 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </div>
      )}
    </div>
  );
}
