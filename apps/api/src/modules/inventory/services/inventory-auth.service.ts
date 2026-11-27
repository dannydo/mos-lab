import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { RowDataPacket } from 'mysql2/promise';
import {
  evaluateLegacyInventoryPermissions,
  INVENTORY_ROLE_PREVIEW_PRESETS,
  type InventoryPermissionAction,
  type InventoryRolePreviewKey,
  isAdminOrSuperAdminRole,
  SafeAny,
} from '@mos-lab/shared';
import { resolveIosAuth, type IosAuthContext } from '../../ios/services/ios-auth.service.js';
import { queryInventory, type InventoryDbConnection } from './inventory-db.js';

export interface InventoryAuthContext {
  auth: IosAuthContext;
  crmStaffId: number;
  actorLegacyUserId: number;
  effectiveUserId: number | null;
  effectiveGroupId: number | null;
  clientId: number;
  clientBusinessId: number;
  clientStoreId: number | null;
  allowedStoreIds: number[];
  isClientConsultant: boolean;
  previewRole: InventoryRolePreviewKey | null;
  previewStoreId: number | null;
  permissions: Record<InventoryPermissionAction, boolean>;
}

interface UserProfileRow extends RowDataPacket {
  client_id: number;
  client_business_id: number | null;
  client_store_id: number | null;
  user_group_id: number;
}

interface ItemClientStoreRow extends RowDataPacket {
  item_id: number;
}

interface WarehouseStoreRow extends RowDataPacket {
  id: number;
  client_store_id: number | null;
}

function parsePreviewRole(raw: unknown): InventoryRolePreviewKey | null {
  const val = String(raw || '').trim();
  if (val === 'admin' || val === 'inventory-manager' || val === 'branch-manager' || val === 'client-consultant') {
    return val;
  }
  return null;
}

function parseOptionalInt(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(raw);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export function extractInventoryPreviewOptions(request: FastifyRequest): {
  previewRole: InventoryRolePreviewKey | null;
  previewStoreId: number | null;
} {
  const q = (request.query || {}) as Record<string, unknown>;
  const b = ((request.body && typeof request.body === 'object' ? request.body : {}) || {}) as Record<string, unknown>;
  return {
    previewRole: parsePreviewRole(b.previewRole ?? q.previewRole),
    previewStoreId: parseOptionalInt(b.previewStoreId ?? q.previewStoreId),
  };
}

export async function resolveInventoryAuthContext(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<InventoryAuthContext | null> {
  const auth = await resolveIosAuth(fastify, request);
  if (!auth) {
    reply.status(401).send({
      success: false,
      error: 'Vui lòng đăng nhập để sử dụng Quản lý Kho.',
    });
    return null;
  }

  // UI-010 Zero-Trust Admin-Only Entry Lock (Danny & Bao Han test safely via Role Preview)
  if (!isAdminOrSuperAdminRole(auth.role)) {
    reply.status(403).send({
      success: false,
      error: 'Chức năng Kho đang ở chế độ Admin-Only kiểm thử.',
    });
    return null;
  }

  const actorLegacyUserId = Number(auth.legacyStaffId || 86);
  const crmStaffId = Number(auth.id || 1);
  const { previewRole, previewStoreId } = extractInventoryPreviewOptions(request);

  const profileRows = await queryInventory<UserProfileRow[]>(
    `SELECT client_id, client_business_id, client_store_id, user_group_id
     FROM user_profile
     WHERE user_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [actorLegacyUserId]
  );

  const profile = profileRows[0];
  const clientId = Number(profile?.client_id || 1);
  const clientBusinessId = Number(profile?.client_business_id || 1);
  // Since Wave 1 routes require mOS Admin / Super Admin via UI-010, default un-previewed admin
  // sessions to Legacy Admin group 7 so CRM super_admin dev actors are not downgraded by legacy group 4.
  let effectiveGroupId: number | null = isAdminOrSuperAdminRole(auth.role)
    ? 7
    : profile?.user_group_id
      ? Number(profile.user_group_id)
      : 7;
  let effectiveUserId: number | null = actorLegacyUserId;
  let clientStoreId: number | null = profile?.client_store_id ? Number(profile.client_store_id) : null;

  const storeClientRows = await queryInventory<ItemClientStoreRow[]>(
    `SELECT DISTINCT item_id
     FROM item_client
     WHERE user_id = ? AND type = 'Store'`,
    [actorLegacyUserId]
  );

  const storeSet = new Set<number>();
  for (const r of storeClientRows) {
    if (r.item_id) storeSet.add(Number(r.item_id));
  }
  if (clientStoreId) storeSet.add(clientStoreId);

  if (previewRole) {
    const preset = INVENTORY_ROLE_PREVIEW_PRESETS[previewRole];
    effectiveGroupId = preset.legacyGroupId;
    // Do not apply actor's personal user_id overrides when simulating a role preset
    effectiveUserId = null;

    if (preset.isStoreScoped) {
      const targetStore = previewStoreId ?? 6; // Default De Tham store_id=6 when previewing branch roles
      clientStoreId = targetStore;
      storeSet.clear();
      storeSet.add(targetStore);
    } else if (previewStoreId) {
      clientStoreId = previewStoreId;
    }
  } else if (previewStoreId) {
    clientStoreId = previewStoreId;
    storeSet.add(previewStoreId);
  }

  const permissions = evaluateLegacyInventoryPermissions(effectiveGroupId, effectiveUserId);

  return {
    auth,
    crmStaffId,
    actorLegacyUserId,
    effectiveUserId,
    effectiveGroupId,
    clientId,
    clientBusinessId,
    clientStoreId,
    allowedStoreIds: [...storeSet],
    isClientConsultant: effectiveGroupId === 5,
    previewRole,
    previewStoreId:
      previewStoreId ?? (previewRole && INVENTORY_ROLE_PREVIEW_PRESETS[previewRole].isStoreScoped ? 6 : null),
    permissions,
  };
}

/**
 * Supports EventSource SSE authentication where query `?token=...` may carry the JWT.
 */
export async function resolveInventorySseAuthContext(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<InventoryAuthContext | null> {
  const query = (request.query || {}) as SafeAny;
  if (!request.headers.authorization && query?.token) {
    request.headers.authorization = `Bearer ${String(query.token)}`;
  }
  return resolveInventoryAuthContext(fastify, request, reply);
}

export function hasInventoryPermission(ctx: InventoryAuthContext, action: InventoryPermissionAction): boolean {
  return Boolean(ctx.permissions[action]);
}

/**
 * Exact port of PHP `InventoryWarehouseItem::checkPermission($warehouseId, $key)`.
 */
export async function hasWarehousePermission(
  ctx: InventoryAuthContext,
  warehouseId: number,
  key: InventoryPermissionAction,
  conn?: InventoryDbConnection
): Promise<boolean> {
  const rows = await queryInventory<WarehouseStoreRow[]>(
    `SELECT id, client_store_id FROM inventory_warehouse WHERE id = ? LIMIT 1`,
    [warehouseId],
    conn
  );
  const warehouse = rows[0];
  if (!warehouse) return false;

  const globalKey = `${key}-global` as InventoryPermissionAction;
  const isCheckKey = key.startsWith('inventory-check');
  if (hasInventoryPermission(ctx, globalKey) || (isCheckKey && hasInventoryPermission(ctx, 'inventory-check-global'))) {
    return true;
  }

  const warehouseStoreId = warehouse.client_store_id != null ? Number(warehouse.client_store_id) : null;
  if (warehouseStoreId != null && ctx.allowedStoreIds.includes(warehouseStoreId) && hasInventoryPermission(ctx, key)) {
    return true;
  }

  return false;
}
