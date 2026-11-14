import mysql from 'mysql2/promise';
import {
  calculateIosItemizedPromotionDiscounts,
  IosCartProductItem,
  IosPromotionOption,
  IosPromotionTargetScope,
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
  orders: Array<{
    promotion_id?: unknown;
    os_promotion_id?: unknown;
    product_promotion_map?: Record<number, number>;
  }>,
  overrides: Record<string, Record<string, SafeAny>>
): number[] {
  const ids = new Set<number>();
  const addId = (raw: unknown) => {
    const pid = Number(raw || 0);
    if (pid > 0) ids.add(pid);
  };
  for (const row of orders) {
    addId(row.promotion_id);
    addId(row.os_promotion_id);
    if (row.product_promotion_map) {
      for (const pid of Object.values(row.product_promotion_map)) {
        addId(pid);
      }
    }
  }
  for (const ovr of Object.values(overrides)) {
    addId(ovr?.promotionId);
    addId(ovr?.billing?.promotionId);
    addId(ovr?.servicePromotionId);
    addId(ovr?.servicePromotion?.promotionId);
    addId(ovr?.comboPromotionId);
    addId(ovr?.comboPromotion?.promotionId);
    addId(ovr?.underComboPromotionId);
    addId(ovr?.underComboPromotion?.promotionId);
    if (Array.isArray(ovr?.cartProducts)) {
      for (const item of ovr.cartProducts) {
        addId(item?.promotionId);
        addId(item?.appliedPromotion?.promotionId);
      }
    }
  }
  return Array.from(ids);
}

function resolveSinglePromoSlot(
  hasExplicit: boolean,
  explicitId: unknown,
  explicitObj: IosPromotionOption | null | undefined,
  fallbackLegacyId: unknown,
  promotionsById?: Map<number, IosPromotionOption>
): { promotionId: number | null; appliedPromotion: IosPromotionOption | null } {
  const rawId = hasExplicit ? explicitId : fallbackLegacyId;
  const promotionId = rawId && Number(rawId) > 0 ? Number(rawId) : null;
  if (!promotionId) {
    return { promotionId: null, appliedPromotion: null };
  }
  const fromMap = promotionsById?.get(promotionId) ?? null;
  const appliedPromotion =
    fromMap ?? (explicitObj && Number(explicitObj.promotionId) === promotionId ? explicitObj : null);
  return { promotionId, appliedPromotion };
}

export function resolveItemizedBookingPromotions(
  override: Record<string, SafeAny>,
  legacyOrderPromotionId: unknown,
  legacyServicePromotionId: unknown,
  legacyProductPromotionMap: Record<number, number> | undefined,
  cartProducts: import('@mos-lab/shared').IosCartProductItem[],
  promotionsById?: Map<number, IosPromotionOption>
): {
  promotionId: number | null;
  appliedPromotion: IosPromotionOption | null;
  servicePromotionId: number | null;
  servicePromotion: IosPromotionOption | null;
  comboPromotionId: number | null;
  comboPromotion: IosPromotionOption | null;
  underComboPromotionId: number | null;
  underComboPromotion: IosPromotionOption | null;
  cartProducts: import('@mos-lab/shared').IosCartProductItem[];
} {
  const hasServiceOverride = override.servicePromotionId !== undefined || override.servicePromotion !== undefined;
  const hasComboOverride = override.comboPromotionId !== undefined || override.comboPromotion !== undefined;
  const hasUnderComboOverride =
    override.underComboPromotionId !== undefined || override.underComboPromotion !== undefined;
  const hasProductPromoOverride = cartProducts.some(
    (p) => p.promotionId !== undefined || p.appliedPromotion !== undefined
  );
  const hasAnyItemizedOverride =
    hasServiceOverride || hasComboOverride || hasUnderComboOverride || hasProductPromoOverride;

  const { promotionId: legacyOrderPromoId, appliedPromotion: legacyOrderPromo } = resolveBookingPromotion(
    override,
    legacyOrderPromotionId,
    promotionsById
  );

  const serviceResolved = resolveSinglePromoSlot(
    hasServiceOverride,
    override.servicePromotionId ?? override.servicePromotion?.promotionId,
    override.servicePromotion,
    hasAnyItemizedOverride ? null : legacyServicePromotionId,
    promotionsById
  );

  const hydratedCartProducts = cartProducts.map((item) => {
    const hasExplicitItem = item.promotionId !== undefined || item.appliedPromotion !== undefined;
    const legacyPid =
      !hasAnyItemizedOverride && legacyProductPromotionMap ? legacyProductPromotionMap[Number(item.productId)] : null;
    const resolved = resolveSinglePromoSlot(
      hasExplicitItem,
      item.promotionId ?? item.appliedPromotion?.promotionId,
      item.appliedPromotion ?? null,
      legacyPid,
      promotionsById
    );
    return {
      ...item,
      promotionId: resolved.promotionId,
      appliedPromotion: resolved.appliedPromotion,
    };
  });

  // Preserve bill-level promotion ONLY as legacy fallback when neither itemized overrides nor DB line promos exist
  const hasDbLinePromo = Boolean(serviceResolved.promotionId || hydratedCartProducts.some((p) => p.promotionId));
  const fallbackLegacyPromo = !hasAnyItemizedOverride && !hasDbLinePromo ? legacyOrderPromo : null;
  const fallbackLegacyPromoId = !hasAnyItemizedOverride && !hasDbLinePromo ? legacyOrderPromoId : null;

  return {
    promotionId: fallbackLegacyPromoId,
    appliedPromotion: fallbackLegacyPromo,
    servicePromotionId: serviceResolved.promotionId,
    servicePromotion: serviceResolved.appliedPromotion,
    comboPromotionId: null,
    comboPromotion: null,
    underComboPromotionId: null,
    underComboPromotion: null,
    cartProducts: hydratedCartProducts,
  };
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

export function applyTargetedPromotionToOverride(
  current: Record<string, SafeAny>,
  body: Record<string, SafeAny>,
  requestedPromotionId: number | null,
  resolvedPromotion: IosPromotionOption | null
): Record<string, SafeAny> {
  const targetScope = body.targetScope as IosPromotionTargetScope | undefined;
  if (targetScope === 'service') {
    return {
      ...current,
      servicePromotionId: requestedPromotionId,
      servicePromotion: resolvedPromotion,
      billing: { ...(current.billing || {}), ...(body.billing || {}) },
    };
  }
  if (targetScope === 'product') {
    const baseCart: IosCartProductItem[] = Array.isArray(body.cartProducts)
      ? body.cartProducts
      : Array.isArray(current.cartProducts)
        ? current.cartProducts
        : [];
    const targetIndex =
      body.productIndex !== undefined && Number.isFinite(Number(body.productIndex)) ? Number(body.productIndex) : -1;
    const targetProductId = body.productId !== undefined && Number(body.productId) > 0 ? Number(body.productId) : null;
    const updatedCart = baseCart.map((item, idx) => {
      const matched =
        targetIndex >= 0
          ? idx === targetIndex
          : targetProductId !== null
            ? Number(item.productId) === targetProductId
            : false;
      return matched ? { ...item, promotionId: requestedPromotionId, appliedPromotion: resolvedPromotion } : item;
    });
    return {
      ...current,
      cartProducts: updatedCart,
      billing: { ...(current.billing || {}), ...(body.billing || {}) },
    };
  }

  const creditLocked = Boolean(resolvedPromotion && resolvedPromotion.isCreditAllowed === false);
  return {
    ...current,
    promotionId: requestedPromotionId,
    appliedPromotion: resolvedPromotion,
    billing: {
      ...(current.billing || {}),
      ...(body.billing || {}),
      promotionId: requestedPromotionId,
      promotionName: resolvedPromotion?.name,
      ...(creditLocked ? { diamondUsed: 0, diamondDiscountAmount: 0 } : {}),
    },
  };
}

export function resolveCheckoutOverridePromotions(
  current: Record<string, SafeAny>,
  body: Record<string, SafeAny>
): {
  promotionId: number | null;
  appliedPromotion: IosPromotionOption | null;
  servicePromotionId: number | null;
  servicePromotion: IosPromotionOption | null;
  comboPromotionId: number | null;
  comboPromotion: IosPromotionOption | null;
  underComboPromotionId: number | null;
  underComboPromotion: IosPromotionOption | null;
  cartProducts: IosCartProductItem[] | undefined;
  legacyCreditLocked: boolean;
} {
  const resolveId = (b: unknown, c: unknown): number | null => {
    const v = b !== undefined ? b : c;
    return v && Number(v) > 0 ? Number(v) : null;
  };
  const resolveObj = (id: number | null, b: unknown, c: unknown): IosPromotionOption | null =>
    !id
      ? null
      : b !== undefined
        ? ((b as IosPromotionOption | null) ?? null)
        : ((c as IosPromotionOption | null) ?? null);

  const promotionId = resolveId(body.promotionId, current.promotionId);
  const appliedPromotion = resolveObj(promotionId, body.appliedPromotion, current.appliedPromotion);
  const servicePromotionId = resolveId(body.servicePromotionId, current.servicePromotionId);
  const servicePromotion = resolveObj(servicePromotionId, body.servicePromotion, current.servicePromotion);
  const cartProducts = body.cartProducts !== undefined ? body.cartProducts : current.cartProducts;
  const hasAnyItemPromo = Boolean(
    servicePromotion || (Array.isArray(cartProducts) && cartProducts.some((p) => p?.appliedPromotion))
  );
  const legacyCreditLocked = Boolean(
    !hasAnyItemPromo && appliedPromotion && appliedPromotion.isCreditAllowed === false
  );

  return {
    promotionId,
    appliedPromotion,
    servicePromotionId,
    servicePromotion,
    comboPromotionId: null,
    comboPromotion: null,
    underComboPromotionId: null,
    underComboPromotion: null,
    cartProducts,
    legacyCreditLocked,
  };
}

export function resolveLegacyPromotionDiscountsAndCredits(params: {
  effectiveServiceTotal: number;
  upgradePrice: number;
  upperComboPrice: number;
  underComboPrice: number;
  comboTotal: number;
  productTotal: number;
  cartProducts: IosCartProductItem[];
  servicePromotion?: IosPromotionOption | null;
  comboPromotion?: IosPromotionOption | null;
  underComboPromotion?: IosPromotionOption | null;
  appliedPromotion?: IosPromotionOption | null;
  effectivePromotionId: number | null;
  billing?: SafeAny;
  rawDiamondCredits: number;
}) {
  const {
    effectiveServiceTotal,
    upgradePrice,
    upperComboPrice,
    underComboPrice,
    productTotal,
    cartProducts,
    servicePromotion = null,
    appliedPromotion = null,
    effectivePromotionId,
    billing,
    rawDiamondCredits,
  } = params;

  const hasAnyItemizedPromoObj = Boolean(servicePromotion || cartProducts.some((p) => p.appliedPromotion));
  const hasAnyPromoObj = hasAnyItemizedPromoObj || Boolean(appliedPromotion);

  const itemizedPromo = calculateIosItemizedPromotionDiscounts({
    serviceAmount: effectiveServiceTotal,
    upgradeAmount: upgradePrice,
    servicePromotion,
    comboAmount: upperComboPrice,
    underComboAmount: underComboPrice,
    products: cartProducts.map((p) => ({
      productId: Number(p.productId),
      amount: Number(p.price || 0) * Number(p.quantity || 1),
      promotion: p.appliedPromotion ?? undefined,
    })),
    fallbackOrderPromotion: appliedPromotion,
    vatRate: 0.08,
  });

  let serviceDiscount = hasAnyPromoObj
    ? itemizedPromo.serviceDiscount
    : Math.max(0, Math.round(Number(billing?.serviceDiscountAmount ?? 0)));
  // Không giảm giá cho gói Combo nối mi
  const comboDiscount = 0;
  let productDiscount = hasAnyPromoObj
    ? itemizedPromo.totalProductDiscount
    : Math.max(0, Math.round(Number(billing?.productDiscountAmount ?? 0)));
  const orderDiscountTotal = hasAnyPromoObj
    ? itemizedPromo.totalDiscount
    : Math.max(0, Math.round(Number(billing?.promotionDiscountAmount ?? serviceDiscount + productDiscount)));

  if (effectivePromotionId && !hasAnyPromoObj && orderDiscountTotal > 0 && serviceDiscount + productDiscount === 0) {
    if (effectiveServiceTotal > 0) serviceDiscount = Math.min(effectiveServiceTotal, orderDiscountTotal);
    else if (productTotal > 0) productDiscount = Math.min(productTotal, orderDiscountTotal);
  }

  const maxEligibleCredits = itemizedPromo.isFullCreditLocked
    ? 0
    : itemizedPromo.hasAnyCreditRestrictedItem
      ? Math.floor(itemizedPromo.creditEligiblePayableWithVat / 1000)
      : rawDiamondCredits;
  const diamondCredits = Math.max(0, Math.min(rawDiamondCredits, maxEligibleCredits));

  return {
    hasAnyItemizedPromoObj,
    hasAnyPromoObj,
    itemizedPromo,
    serviceDiscount,
    comboDiscount,
    productDiscount,
    orderDiscountTotal,
    diamondCredits,
  };
}
