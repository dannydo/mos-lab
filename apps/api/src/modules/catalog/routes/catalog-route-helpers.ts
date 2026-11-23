import { FastifyInstance } from 'fastify';
import { CATALOG_CURRENCY_SYSTEM_CONFIG } from '@mos-lab/shared';
import { parseLashSpecs } from '../services/lash-benchmark.service.js';

/*
 * Legacy catalog rows and Fastify request payloads are intentionally dynamic: the
 * legacy schema contains tenant-specific columns and this module performs guarded
 * catalog migrations inside typed Prisma transactions. Keep the boundary explicit
 * until the legacy DTOs are extracted into the shared package.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const CATALOG_DEFAULTS = {
  CLIENT_ID: 1,
  CLIENT_BUSINESS_ID: 1,
  DEFAULT_CURRENCY_ID: CATALOG_CURRENCY_SYSTEM_CONFIG.CURRENCY_ID_VND,
  DEFAULT_LANGUAGE_ID: CATALOG_CURRENCY_SYSTEM_CONFIG.LANGUAGE_ID_VIETNAMESE,
};

// Helper: Fetch real extension-lash-count attributes from legacy DB item_attribute_value
export async function fetchRealServiceLashCounts(
  legacyPrisma: any,
  serviceIds: number[]
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (!serviceIds || serviceIds.length === 0) return map;
  try {
    const rows = (await legacyPrisma.$queryRawUnsafe(`
      SELECT s.id as service_id, aol.attribute_option_value as count
      FROM service s
      JOIN item_attribute_value iav ON s.id = iav.item_id AND iav.type = 'service-attribute'
      JOIN attribute a ON iav.attribute_id = a.id AND a.attribute_key = 'extension-lash-count'
      JOIN attribute_option ao ON iav.attribute_option_id = ao.id
      JOIN attribute_option_language aol ON ao.id = aol.attribute_option_id
      WHERE s.id IN (${serviceIds.join(',')})
    `)) as Array<{ service_id: number; count: string }>;
    for (const r of rows) {
      const num = parseInt(r.count, 10);
      if (!isNaN(num) && num > 0) {
        map.set(Number(r.service_id), num);
      }
    }
  } catch {
    // Ignore if table missing or query error
  }
  return map;
}

export function mapComboDto(c: any, serviceObj?: any): any {
  let normalCount = c.normal_count || 0;
  let bonusNormalCount = c.bonus_normal_count || 0;

  // Intelligent legacy fallback: If bonus_normal_count is 0 and key matches X+Y (e.g. 7+3), auto-parse buy vs gift
  if (bonusNormalCount === 0 && c.service_price_package_key) {
    const match = c.service_price_package_key.match(/^(\d+)\+(\d+)/);
    if (match) {
      const buy = parseInt(match[1], 10);
      const bonus = parseInt(match[2], 10);
      if (normalCount === buy + bonus) {
        normalCount = buy;
        bonusNormalCount = bonus;
      }
    }
  }

  return {
    id: c.id,
    serviceId: c.service_id,
    currencyId: c.currency_id,
    servicePricePackageKey: c.service_price_package_key,
    servicePriceType: c.service_price_type,
    servicePrice: Math.round(c.service_price || 0),
    normalCount,
    bonusNormalCount,
    retainCount: c.retain_count || 0,
    bonusRetainCount: c.bonus_retain_count || 0,
    perNormalPrice: Math.round(c.per_normal_price || 0),
    perRetainPrice: Math.round(c.per_retain_price || 0),
    expiryAfterDay: c.expiry_after_day,
    position: c.position,
    isSameCount: Boolean(c.is_same_count),
    isNewUserDisabled: Boolean(c.is_old_user_disabled),
    isDisabled: Boolean(c.is_disabled),
    service: serviceObj || null,
  };
}

export function mapServiceDto(
  s: any,
  lang?: any,
  prices: any[] = [],
  realAttrMap?: Map<number, number>,
  cvBenchmarkList: any[] = []
): any {
  const isProduct =
    s.service_type === 'Product' || s.service_group === 'Product' || s.service_key === 'any-service-product';
  const { lashStyle, lashCount: parsedLashCount } = isProduct
    ? { lashStyle: null, lashCount: null }
    : parseLashSpecs(s.service_key, lang?.service_name || s.service_key);
  let lashCount = parsedLashCount;

  if (!isProduct) {
    // Source 1: Real DB item_attribute_value
    if (realAttrMap && realAttrMap.has(s.id)) {
      lashCount = realAttrMap.get(s.id)!;
    }
    // Source 2: CV Xoay Speed Model Benchmarks matching
    else if (cvBenchmarkList && cvBenchmarkList.length > 0 && !lashCount) {
      const normType = s.service_type === 'Retain' ? 'Retain' : 'Normal';
      const matchedBm = cvBenchmarkList.find(
        (b: any) =>
          (b.lashStyle === lashStyle ||
            (b.lashStyle === 'Mink' && lashStyle === 'Flawless') ||
            (b.lashStyle === 'Volume 3D' && lashStyle === 'Volume')) &&
          b.serviceType === normType &&
          b.lashCount !== null &&
          Math.abs(b.benchmarkMinutes - s.duration_minute) <= 5
      );
      if (matchedBm) {
        lashCount = matchedBm.lashCount;
      }
    }
  }

  return {
    id: s.id,
    clientId: s.client_id,
    clientBusinessId: s.client_business_id,
    parentServiceId: s.parent_service_id,
    serviceKey: s.service_key,
    serviceType: s.service_type,
    serviceGroup: s.service_group,
    durationMinute: s.duration_minute,
    durationMinuteStandard: s.duration_minute_standard,
    imageFilename: s.image_filename,
    imageExtension: s.image_extension,
    remindingIntervalDay: s.remind_interval_day,
    position: s.position,
    isTemporary: Boolean(s.is_temporary),
    isDisabled: Boolean(s.is_disabled),
    dateUpdated: s.date_updated,
    dateCreated: s.date_created,
    serviceName: lang?.service_name || s.service_key,
    serviceShortDescription: lang?.service_short_description,
    serviceDescription: lang?.service_description,
    lashStyle,
    lashCount,
    prices: prices.map((p) => mapComboDto(p)),
  };
}

export function mapProductDto(
  p: any,
  lang?: any,
  price?: any,
  stock?: { inStockCount: number; totalStockCount: number }
): any {
  const rawPrice = price?.product_price || 0;
  return {
    id: p.id,
    clientId: p.client_id,
    clientBusinessId: p.client_business_id,
    createdStaffId: p.created_staff_id,
    inventoryItemId: p.inventory_item_id,
    productSku: p.product_sku,
    position: p.position,
    isDisabled: Boolean(p.is_disabled),
    dateUpdated: p.date_updated,
    dateCreated: p.date_created,
    productName: lang?.product_name || p.product_sku,
    productShortDescription: lang?.product_short_description,
    productDescription: lang?.product_description,
    productPrice: Math.round(rawPrice),
    inStockCount: stock?.inStockCount || 0,
    totalStockCount: stock?.totalStockCount || 0,
  };
}

export async function checkServiceLiveCombos(fastify: FastifyInstance, serviceId: number) {
  const sql = `
    SELECT 
      usb.id as balanceId,
      usb.user_id as userId,
      COALESCE(NULLIF(up.full_name, ''), up.username, CONCAT('Khách #', usb.user_id)) as customerName,
      usb.normal_count as normalCount,
      usb.retain_count as retainCount,
      usb.date_expired as dateExpired,
      usb.next_normal_date_expired as nextNormalDateExpired,
      usb.next_retain_date_expired as nextRetainDateExpired,
      COALESCE(sl.service_name, s.service_key, 'Gói Combo') as serviceName,
      sp.service_price_package_key as packageKey,
      sp.service_price as packagePrice
    FROM user_service_balance usb
    JOIN service s ON usb.service_id = s.id
    LEFT JOIN user_profile up ON usb.user_id = up.user_id
    LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
    LEFT JOIN service_price sp ON usb.service_price_id = sp.id
    WHERE usb.service_id = ${Number(serviceId)}
      AND (sp.service_price_type = 'Combo' OR s.service_group = 'combo')
      AND (usb.normal_count > 0 OR usb.retain_count > 0)
      AND (
        usb.date_expired IS NULL 
        OR usb.date_expired >= NOW() 
        OR usb.next_normal_date_expired >= NOW() 
        OR usb.next_retain_date_expired >= NOW()
      )
  `;

  const rows = (await fastify.prisma.legacy.$queryRawUnsafe(sql)) as Record<string, unknown>[];

  const seenBalances = new Set<number>();
  const affectedCombosMap = new Map<
    string,
    {
      comboName: string;
      packagePrice: number;
      ownerCount: number;
      totalNormalBalance: number;
      totalRetainBalance: number;
    }
  >();

  let totalOwners = 0;
  let totalNormalBalance = 0;
  let totalRetainBalance = 0;

  (rows || []).forEach((r: Record<string, unknown>) => {
    const balanceId = Number(r.balanceId);
    if (seenBalances.has(balanceId)) return;
    seenBalances.add(balanceId);

    const normalCount = Math.max(0, Number(r.normalCount || 0));
    const retainCount = Math.max(0, Number(r.retainCount || 0));
    const packagePrice = Math.round(Number(r.packagePrice || 0));
    const comboName = String(r.packageKey || r.serviceName || 'Gói Combo');

    totalOwners++;
    totalNormalBalance += normalCount;
    totalRetainBalance += retainCount;

    const groupKey = `${comboName}_${packagePrice}`;
    if (!affectedCombosMap.has(groupKey)) {
      affectedCombosMap.set(groupKey, {
        comboName,
        packagePrice,
        ownerCount: 0,
        totalNormalBalance: 0,
        totalRetainBalance: 0,
      });
    }

    const item = affectedCombosMap.get(groupKey)!;
    item.ownerCount++;
    item.totalNormalBalance += normalCount;
    item.totalRetainBalance += retainCount;
  });

  return {
    serviceId,
    totalOwners,
    totalNormalBalance,
    totalRetainBalance,
    affectedCombos: Array.from(affectedCombosMap.values()),
  };
}
