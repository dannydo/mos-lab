'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  InventoryPermissionAction,
  InventoryPermissionsResponse,
  InventoryRolePreviewKey,
  InventoryStoreOptionDto,
  InventoryWarehouseDto,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

const PREVIEW_ROLE_KEY = 'mos_inventory_admin_preview_role';
const PREVIEW_STORE_KEY = 'mos_inventory_admin_preview_store_id';

export function useInventoryAdminContext() {
  const [previewRole, setPreviewRoleState] = useState<InventoryRolePreviewKey>('admin');
  const [previewStoreId, setPreviewStoreIdState] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [permissions, setPermissions] = useState<InventoryPermissionsResponse | null>(null);
  const [warehouses, setWarehouses] = useState<InventoryWarehouseDto[]>([]);
  const [stores, setStores] = useState<InventoryStoreOptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedRole = localStorage.getItem(PREVIEW_ROLE_KEY) as InventoryRolePreviewKey | null;
      if (savedRole && ['admin', 'inventory-manager', 'branch-manager', 'client-consultant'].includes(savedRole)) {
        setPreviewRoleState(savedRole);
      }
      const savedStore = localStorage.getItem(PREVIEW_STORE_KEY);
      if (savedStore && Number(savedStore) > 0) {
        setPreviewStoreIdState(Number(savedStore));
      }
    } catch {
      // Ignore SSR/storage errors
    } finally {
      setHydrated(true);
    }
  }, []);

  const setPreviewRole = useCallback((next: InventoryRolePreviewKey) => {
    setPreviewRoleState(next);
    try {
      localStorage.setItem(PREVIEW_ROLE_KEY, next);
    } catch {
      // Ignore
    }
  }, []);

  const setPreviewStoreId = useCallback((next: number | null) => {
    setPreviewStoreIdState(next);
    try {
      if (next && next > 0) {
        localStorage.setItem(PREVIEW_STORE_KEY, String(next));
      } else {
        localStorage.removeItem(PREVIEW_STORE_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const refreshContext = useCallback(async () => {
    if (!hydrated) return;
    setLoading(true);
    setError(null);
    try {
      const params = { previewRole, previewStoreId };
      const [permRes, whRes, storeRes] = await Promise.all([
        apiClient.inventory.getPermissions(params),
        apiClient.inventory.getWarehouses({ includeDisabled: false, ...params }),
        apiClient.inventory.getStores(params),
      ]);
      setPermissions(permRes);
      setWarehouses(whRes.warehouses || []);
      setStores(storeRes.stores || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải cấu hình Kho';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [hydrated, previewRole, previewStoreId]);

  useEffect(() => {
    void refreshContext();
  }, [refreshContext]);

  const permissionCount = useMemo(
    () => Object.values(permissions?.permissions || {}).filter((allowed) => Boolean(allowed)).length,
    [permissions?.permissions]
  );

  const hasPermission = useCallback(
    (code: InventoryPermissionAction) => Boolean(permissions?.permissions?.[code]),
    [permissions?.permissions]
  );

  return {
    previewRole,
    previewStoreId,
    setPreviewRole,
    setPreviewStoreId,
    permissions,
    permissionCount,
    warehouses,
    stores,
    loading,
    error,
    hasPermission,
    refreshContext,
  };
}
