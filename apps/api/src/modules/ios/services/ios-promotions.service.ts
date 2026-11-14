import mysql from 'mysql2/promise';
import {
  IosPromotionOption,
  isAdminOrSuperAdminRole,
  normalizePromotionApplyTarget,
  resolveLockedIosRoleForUser,
  SafeAny,
} from '@mos-lab/shared';
import { IosAuthContext } from './ios-auth.service.js';

export interface RawPromotionRow extends mysql.RowDataPacket {
  id: number;
  promotion_key: string | null;
  promotion_type: string | null;
  promotion_apply: string | null;
  service_group: string | null;
  discount_percentage: number | string | null;
  discount_amount: number | string | null;
  exactly_amount: number | string | null;
  is_old_user_disabled: number | boolean | null;
  is_approval_required: number | boolean | null;
  is_public: number | boolean | null;
  is_system: number | boolean | null;
  is_credit_allowed: number | boolean | null;
  is_disabled: number | boolean | null;
  date_expired: string | Date | null;
  position: number | null;
  promotion_name: string | null;
  promotion_short_name: string | null;
}

export function mapRawPromotionRow(row: RawPromotionRow): IosPromotionOption {
  const name = String(row.promotion_name || row.promotion_key || `Promo #${row.id}`).trim();
  const shortName = String(row.promotion_short_name || name).trim();
  let dateExpired: string | null = null;
  if (row.date_expired instanceof Date) {
    dateExpired = Number.isNaN(row.date_expired.getTime()) ? null : row.date_expired.toISOString();
  } else if (row.date_expired) {
    dateExpired = String(row.date_expired);
  }

  return {
    promotionId: Number(row.id),
    promotionKey: String(row.promotion_key || '').trim(),
    promotionType: String(row.promotion_type || 'normal').trim(),
    promotionApply: normalizePromotionApplyTarget(row.promotion_apply),
    serviceGroup: row.service_group ? String(row.service_group).trim() : null,
    name,
    shortName,
    discountPercentage: Number(row.discount_percentage || 0),
    discountAmount: Number(row.discount_amount || 0),
    exactlyAmount: Number(row.exactly_amount || 0),
    isOldUserDisabled: Number(row.is_old_user_disabled || 0) === 1,
    isApprovalRequired: Number(row.is_approval_required || 0) === 1,
    isPublic: Number(row.is_public || 0) === 1,
    isSystem: Number(row.is_system || 0) === 1,
    isCreditAllowed: Number(row.is_credit_allowed ?? 1) === 1,
    dateExpired,
    position: Number(row.position || 0),
  };
}

export function resolveCanViewGlobalPromotions(authUser: IosAuthContext, requestedRole?: string): boolean {
  const isAdmin = authUser.careerTier === 'ADMIN' || isAdminOrSuperAdminRole(authUser.role || '');
  if (isAdmin) {
    const req = String(requestedRole || '')
      .trim()
      .toUpperCase();
    return req !== 'CVL' && req !== 'CVLL';
  }
  const effectiveRole = resolveLockedIosRoleForUser(authUser.careerTier || authUser.role, requestedRole);
  return effectiveRole === 'CC';
}

export async function fetchIosPromotionsForActor(
  pool: mysql.Pool,
  options: {
    canViewGlobalPromotions: boolean;
    keyword?: string;
  }
): Promise<IosPromotionOption[]> {
  const conditions: string[] = ['p.is_disabled = 0', '(p.date_expired IS NULL OR p.date_expired >= NOW())'];
  const params: SafeAny[] = [];

  if (!options.canViewGlobalPromotions) {
    conditions.push('p.is_public = 1');
    conditions.push('p.is_system = 0');
  }

  const trimmedKeyword = String(options.keyword || '')
    .trim()
    .toLowerCase();
  if (trimmedKeyword) {
    const likePattern = `%${trimmedKeyword}%`;
    conditions.push(
      "(LOWER(COALESCE(pl.promotion_name, '')) LIKE ? OR LOWER(COALESCE(pl.promotion_short_name, '')) LIKE ? OR LOWER(COALESCE(p.promotion_key, '')) LIKE ?)"
    );
    params.push(likePattern, likePattern, likePattern);
  }

  const sql = `
    SELECT
      p.id,
      p.promotion_key,
      p.promotion_type,
      p.promotion_apply,
      p.service_group,
      p.discount_percentage,
      p.discount_amount,
      p.exactly_amount,
      p.is_old_user_disabled,
      p.is_approval_required,
      p.is_public,
      p.is_system,
      p.is_credit_allowed,
      p.is_disabled,
      p.date_expired,
      p.position,
      COALESCE(NULLIF(TRIM(pl.promotion_name), ''), p.promotion_key) AS promotion_name,
      COALESCE(NULLIF(TRIM(pl.promotion_short_name), ''), NULLIF(TRIM(pl.promotion_name), ''), p.promotion_key) AS promotion_short_name
    FROM promotion p
    LEFT JOIN promotion_language pl ON pl.promotion_id = p.id AND pl.language_id = 1
    WHERE ${conditions.join(' AND ')}
    ORDER BY COALESCE(p.position, 999999) ASC, p.id DESC
  `;

  const [rows] = await pool.query<RawPromotionRow[]>(sql, params);
  return rows.map(mapRawPromotionRow);
}

export async function fetchPromotionsByIds(
  pool: mysql.Pool,
  promotionIds: number[]
): Promise<Map<number, IosPromotionOption>> {
  const result = new Map<number, IosPromotionOption>();
  const uniqueIds = Array.from(
    new Set(promotionIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))
  );
  if (uniqueIds.length === 0) return result;

  try {
    const placeholders = uniqueIds.map(() => '?').join(',');
    const sql = `
      SELECT
        p.id,
        p.promotion_key,
        p.promotion_type,
        p.promotion_apply,
        p.service_group,
        p.discount_percentage,
        p.discount_amount,
        p.exactly_amount,
        p.is_old_user_disabled,
        p.is_approval_required,
        p.is_public,
        p.is_system,
        p.is_credit_allowed,
        p.is_disabled,
        p.date_expired,
        p.position,
        COALESCE(NULLIF(TRIM(pl.promotion_name), ''), p.promotion_key) AS promotion_name,
        COALESCE(NULLIF(TRIM(pl.promotion_short_name), ''), NULLIF(TRIM(pl.promotion_name), ''), p.promotion_key) AS promotion_short_name
      FROM promotion p
      LEFT JOIN promotion_language pl ON pl.promotion_id = p.id AND pl.language_id = 1
      WHERE p.id IN (${placeholders})
    `;
    const [rows] = await pool.query<RawPromotionRow[]>(sql, uniqueIds);
    for (const row of rows) {
      const mapped = mapRawPromotionRow(row);
      result.set(mapped.promotionId, mapped);
    }
  } catch {
    // Graceful fallback if legacy table unavailable in mock/test runs
  }

  return result;
}

export function collectPromotionIdsFromSources(
  orders: Array<{ promotion_id?: unknown }>,
  overrides: Record<string, Record<string, SafeAny>>
): number[] {
  const ids = new Set<number>();
  for (const row of orders) {
    const pid = Number(row.promotion_id || 0);
    if (pid > 0) ids.add(pid);
  }
  for (const ovr of Object.values(overrides)) {
    const pid = Number(ovr?.promotionId || ovr?.billing?.promotionId || 0);
    if (pid > 0) ids.add(pid);
  }
  return Array.from(ids);
}

export function resolveBookingPromotion(
  override: Record<string, SafeAny>,
  legacyPromotionId: unknown,
  promotionsById?: Map<number, IosPromotionOption>
): { promotionId: number | null; appliedPromotion: IosPromotionOption | null } {
  const hasExplicitOverride = override.promotionId !== undefined || override.billing?.promotionId !== undefined;
  const rawId = hasExplicitOverride
    ? override.promotionId !== undefined
      ? override.promotionId
      : override.billing?.promotionId
    : legacyPromotionId;
  const promotionId = rawId && Number(rawId) > 0 ? Number(rawId) : null;
  if (!promotionId) {
    return { promotionId: null, appliedPromotion: null };
  }
  const overridePromo = override.appliedPromotion as IosPromotionOption | null | undefined;
  const fromMap = promotionsById?.get(promotionId) ?? null;
  const appliedPromotion =
    fromMap ?? (overridePromo && Number(overridePromo.promotionId) === promotionId ? overridePromo : null);
  return { promotionId, appliedPromotion };
}
