import mysql from 'mysql2/promise';
import { IosCartProductItem, SafeAny } from '@mos-lab/shared';

export interface LegacyCatalogServiceMatch {
  serviceId: number;
  serviceGroup: string;
  singlePriceId: number;
  singlePriceAmount: number;
  balancePriceId: number;
  staffSurveySetId: number;
  customerSurveySetId: number;
}

export interface LegacyCatalogComboMatch {
  serviceId: number;
  servicePriceId: number;
  comboPriceAmount: number;
}

export interface LegacyCatalogProductMatch {
  productId: number;
  inventoryWarehouseItemId: number;
  firstInventoryWarehouseOrderItemId: number;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
}

export type LegacySurveyAnswerPayload = Record<
  string,
  Array<{
    survey_answer_id: string;
    survey_answer: string;
  }>
>;

export interface LegacyOrderCatalogSnapshot {
  orderExists: boolean;
  orderId: number;
  customerUserId: number;
  clientStoreId: number;
  currentOrderState: string;
  bookingDateStart?: string;
  promotionId?: number | null;
  userUrlId?: number | null;
  existingOrderServiceIds: number[];
  upperService: LegacyCatalogServiceMatch;
  underService?: LegacyCatalogServiceMatch;
  upperCombo?: LegacyCatalogComboMatch;
  underCombo?: LegacyCatalogComboMatch;
  products: LegacyCatalogProductMatch[];
  staffFiveStarSurveyAnswers: LegacySurveyAnswerPayload;
  customerHappySurveyAnswers: LegacySurveyAnswerPayload;
}

export interface ResolveLegacyCatalogParams {
  orderId: number;
  serviceName?: string;
  servicePrice?: number;
  serviceType?: string;
  attributes?: SafeAny;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  selectedCombo?: SafeAny;
  selectedUnderCombo?: SafeAny;
  cartProducts?: IosCartProductItem[];
}

export function inferComboTotalSessions(comboSelection: SafeAny): number {
  const direct = Number(comboSelection?.sessions || 0);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.round(direct);
  }
  const label = `${comboSelection?.id || ''} ${comboSelection?.name || ''}`;
  const match = label.match(/(\d+)\s*(?:\+|tặng|tang)\s*(\d+)/i);
  if (match) {
    return Number(match[1]) + Number(match[2]);
  }
  const vipMatch = label.match(/vip\s*(\d+)/i);
  if (vipMatch) {
    return Number(vipMatch[1]);
  }
  return 0;
}

/**
 * Suy luận danh sách service_key chuẩn của Legacy DB từ tên hiển thị tư vấn trên /ios-app.
 * Xử lý trường hợp đơn đặt lịch Zalo/Online khởi tạo với service_id = 1 ('Any Service')
 * và sau khi tư vấn trên /ios-app đổi thành 'New HyperLight 770K (70 fan) + Mi Dưới (Mới 390K)'.
 */
export function inferLegacyUpperServiceKeyCandidates(params: {
  serviceName?: string;
  servicePrice?: number;
  serviceType?: string;
  attributes?: SafeAny;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  selectedCombo?: SafeAny;
}): {
  upperDisplayName: string;
  prefix: 'new' | 'retain';
  isRetain: boolean;
  lineSlug: string | null;
  ivyLevel: '3L' | '4L' | '5L' | null;
  candidateKeys: string[];
} {
  const rawName = String(params.serviceName || '').trim();
  const upperDisplayName = rawName
    .split(/\+\s*(?:mi\s*dưới|(?:new\s+|retain\s+|dặm\s+)?(?:flawless\s+)?under\b)/i)[0]
    .trim();
  const comboHint = `${params.selectedCombo?.id || ''} ${params.selectedCombo?.name || ''}`;
  const materialHint = `${params.attributes?.material || ''} ${upperDisplayName} ${comboHint}`.toLowerCase();

  const isRetain =
    String(params.serviceType || '').toLowerCase() === 'retain' ||
    /\b(dặm|dam|refill|retain)\b/i.test(upperDisplayName) ||
    /giá\s*dặm/i.test(upperDisplayName);
  const prefix: 'new' | 'retain' = isRetain ? 'retain' : 'new';

  let lineSlug: string | null = null;
  if (materialHint.includes('hyper')) lineSlug = 'hyperlight';
  else if (materialHint.includes('ultra')) lineSlug = 'ultralight';
  else if (materialHint.includes('ivy')) lineSlug = 'ivylight';
  else if (materialHint.includes('flawless') || materialHint.includes('mink')) lineSlug = 'flawless-mink';
  else if (materialHint.includes('volume') || materialHint.includes('2d')) lineSlug = 'volume';
  else if (materialHint.includes('classic') || materialHint.includes('1d')) lineSlug = 'classic';

  const volHint = `${params.attributes?.volume || ''} ${upperDisplayName} ${comboHint}`;
  let ivyLevel: '3L' | '4L' | '5L' | null = null;
  if (/5\s*[lℓ𝓵𝓛]/iu.test(volHint)) ivyLevel = '5L';
  else if (/3\s*[lℓ𝓵𝓛]/iu.test(volHint)) ivyLevel = '3L';
  else if (/4\s*[lℓ𝓵𝓛]/iu.test(volHint)) ivyLevel = '4L';

  const tiers = new Set<number>();
  const comboColonTier = String(params.selectedCombo?.id || '').match(/:(\d{3,4})$/);
  if (comboColonTier) {
    tiers.add(Number(comboColonTier[1]));
  }

  for (const source of [upperDisplayName, comboHint]) {
    const kMatch = source.match(/\b(\d{3,4})\s*k\b/i);
    if (kMatch) tiers.add(Number(kMatch[1]));
    const bareTierMatch = source.match(
      /\b(250|280|340|390|440|470|490|530|550|590|660|680|740|770|860|880|960|990|1090|1100|1110|1220|1330|1440|1550|1660|1770|1880|1990|2110)\b/
    );
    if (bareTierMatch) tiers.add(Number(bareTierMatch[1]));
  }

  const rawPrice = Math.round(Number(params.servicePrice || 0));
  if (rawPrice >= 100_000) {
    if (params.hasUnderMink) {
      const underAddon = params.underMinkServiceType === 'Retain' ? 250_000 : 390_000;
      if (rawPrice > underAddon) {
        tiers.add(Math.round((rawPrice - underAddon) / 1000));
      }
    }
    tiers.add(Math.round(rawPrice / 1000));
  }

  const candidateKeys: string[] = [];
  const pushUnique = (key: string) => {
    if (!candidateKeys.includes(key)) candidateKeys.push(key);
  };

  if (lineSlug) {
    const suffix = isRetain ? '-refill' : '';
    for (const tier of tiers) {
      if (tier <= 0) continue;
      if (lineSlug === 'flawless-mink') {
        pushUnique(`new-flawless.mink-${tier}${suffix}`);
        pushUnique(`mink-${tier}${suffix}`);
      } else if (lineSlug === 'ivylight') {
        // Trong management.service, Ivylight (id=201..212) luôn là Normal (không có hậu tố -refill)
        const levels: Array<'3L' | '4L' | '5L'> = ivyLevel ? [ivyLevel] : ['4L', '3L', '5L'];
        for (const lvl of levels) {
          pushUnique(`ivylight-${lvl}-${tier}`);
        }
      } else {
        pushUnique(`new-${lineSlug}-${tier}${suffix}`);
        pushUnique(`${lineSlug}-${tier}${suffix}`);
        if (isRetain) {
          pushUnique(`retain-${lineSlug}-${tier}`);
        }
      }
    }
  }

  return { upperDisplayName, prefix, isRetain, lineSlug, ivyLevel, candidateKeys };
}

async function resolveUpperServiceId(
  pool: mysql.Pool,
  existingServiceId: number,
  params: ResolveLegacyCatalogParams
): Promise<number> {
  const { upperDisplayName, isRetain, lineSlug, ivyLevel, candidateKeys } =
    inferLegacyUpperServiceKeyCandidates(params);

  if (upperDisplayName) {
    const [exactRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT s.id
       FROM service s
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id IN (1, 2)
       WHERE s.is_disabled = 0 AND s.is_temporary = 0 AND s.id > 1
         AND (sl.service_name = ? OR s.service_key = ?)
       ORDER BY s.position ASC, s.id DESC
       LIMIT 1`,
      [upperDisplayName, upperDisplayName.toLowerCase()]
    );
    if (exactRows.length > 0) {
      return Number(exactRows[0].id);
    }
  }

  if (candidateKeys.length > 0) {
    const placeholders = candidateKeys.map(() => '?').join(',');
    const [keyRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, service_key
       FROM service
       WHERE is_disabled = 0 AND is_temporary = 0 AND service_key IN (${placeholders})`,
      candidateKeys
    );
    if (keyRows.length > 0) {
      for (const key of candidateKeys) {
        const hit = keyRows.find((r) => String(r.service_key).toLowerCase() === key.toLowerCase());
        if (hit) return Number(hit.id);
      }
      return Number(keyRows[0].id);
    }
  }

  if (lineSlug) {
    const rawPrice = Math.round(Number(params.servicePrice || 770_000));
    const underAddon = params.hasUnderMink ? (params.underMinkServiceType === 'Retain' ? 250_000 : 390_000) : 0;
    const approxUpperPrice = rawPrice > underAddon ? rawPrice - underAddon : rawPrice;
    const expectedServiceType = lineSlug === 'ivylight' ? 'Normal' : isRetain ? 'Retain' : 'Normal';
    const targetCatalogPrice =
      lineSlug === 'ivylight' && isRetain ? Math.round(approxUpperPrice / 0.6) : approxUpperPrice;
    const keyPattern =
      lineSlug === 'flawless-mink'
        ? 'new-flawless.mink-%'
        : lineSlug === 'ivylight'
          ? `ivylight-${ivyLevel ? `${ivyLevel}-` : ''}%`
          : `new-${lineSlug}-%`;

    const [matchedRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT s.id
       FROM service s
       JOIN service_price sp ON sp.service_id = s.id AND sp.is_disabled = 0 AND sp.service_price_package_key = 'single'
       WHERE s.is_disabled = 0 AND s.is_temporary = 0 AND s.id > 1
         AND s.id NOT IN (31, 32, 127, 128)
         AND s.service_type = ?
         AND s.service_key LIKE ?
       ORDER BY ABS(sp.service_price - ?) ASC, s.id DESC
       LIMIT 1`,
      [expectedServiceType, keyPattern, targetCatalogPrice]
    );
    if (matchedRows.length > 0) {
      return Number(matchedRows[0].id);
    }
  }

  if (existingServiceId > 1) {
    return existingServiceId;
  }

  // Fallback an toàn cho ca đặt lịch online 'Any Service (id=1)' chưa khớp tên
  return 77;
}

async function resolveServiceMatch(
  pool: mysql.Pool,
  serviceId: number,
  fallbackPrice: number,
  defaultGroup: string = 'LashesTop'
): Promise<LegacyCatalogServiceMatch> {
  const [svcRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id,
            COALESCE(service_group, ?) AS serviceGroup,
            COALESCE(staff_survey_set_id, 0) AS staffSurveySetId,
            COALESCE(customer_survey_set_id, 0) AS customerSurveySetId
     FROM service
     WHERE id = ?
     LIMIT 1`,
    [defaultGroup, serviceId]
  );

  const [priceRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, service_price_package_key AS packageKey, service_price
     FROM service_price
     WHERE service_id = ?
       AND is_disabled = 0
       AND service_price_package_key IN ('single', 'balance')
     ORDER BY id ASC`,
    [serviceId]
  );

  const singleRow = priceRows.find((r) => String(r.packageKey).toLowerCase() === 'single') || priceRows[0];
  const balanceRow = priceRows.find((r) => String(r.packageKey).toLowerCase() === 'balance') || singleRow;

  return {
    serviceId,
    serviceGroup: String(svcRows?.[0]?.serviceGroup || defaultGroup),
    singlePriceId: Number(singleRow?.id || 0),
    singlePriceAmount: Number(singleRow?.service_price ?? fallbackPrice ?? 0),
    balancePriceId: Number(balanceRow?.id || singleRow?.id || 0),
    staffSurveySetId: Number(svcRows?.[0]?.staffSurveySetId || 0),
    customerSurveySetId: Number(svcRows?.[0]?.customerSurveySetId || 0),
  };
}

async function resolveComboPriceRow(
  pool: mysql.Pool,
  preferredServiceId: number,
  comboSelection: SafeAny
): Promise<LegacyCatalogComboMatch | undefined> {
  const targetPrice = Math.round(Number(comboSelection?.price || 0));
  if (targetPrice <= 0) return undefined;

  if (comboSelection?.servicePriceId && Number(comboSelection.servicePriceId) > 0) {
    return {
      serviceId: Number(comboSelection.serviceId || preferredServiceId),
      servicePriceId: Number(comboSelection.servicePriceId),
      comboPriceAmount: targetPrice,
    };
  }

  const expectedSessions = inferComboTotalSessions(comboSelection);
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, service_id, service_price
     FROM service_price
     WHERE is_disabled = 0
       AND service_price_type = 'Combo'
       AND service_price_package_key NOT IN ('single', 'balance')
       AND (service_id = ? OR ABS(service_price - ?) <= 5000)
     ORDER BY
       (service_id = ?) DESC,
       ABS(service_price - ?) ASC,
       (? > 0 AND (COALESCE(normal_count, 0) + COALESCE(retain_count, 0)) = ?) DESC,
       id ASC
     LIMIT 1`,
    [preferredServiceId, targetPrice, preferredServiceId, targetPrice, expectedSessions, expectedSessions]
  );

  if (!rows.length) return undefined;
  return {
    serviceId: Number(rows[0].service_id),
    servicePriceId: Number(rows[0].id),
    comboPriceAmount: Number(rows[0].service_price || targetPrice),
  };
}

export async function resolveLegacyOrderCatalogSnapshot(
  pool: mysql.Pool,
  params: ResolveLegacyCatalogParams
): Promise<LegacyOrderCatalogSnapshot> {
  const { orderId, servicePrice = 0, underMinkServiceType = 'Normal', selectedCombo, selectedUnderCombo } = params;

  const [orderRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, user_id, client_store_id, order_state, promotion_id, user_url_id,
            DATE_FORMAT(booking_date_start, '%Y-%m-%d %H:%i:%s') AS bookingDateStart
     FROM \`order\`
     WHERE id = ?
     LIMIT 1`,
    [orderId]
  );

  if (!orderRows.length) {
    return {
      orderExists: false,
      orderId,
      customerUserId: 0,
      clientStoreId: 6,
      currentOrderState: '',
      existingOrderServiceIds: [],
      upperService: {
        serviceId: 0,
        serviceGroup: 'LashesTop',
        singlePriceId: 0,
        singlePriceAmount: servicePrice,
        balancePriceId: 0,
        staffSurveySetId: 0,
        customerSurveySetId: 0,
      },
      products: [],
      staffFiveStarSurveyAnswers: {},
      customerHappySurveyAnswers: {},
    };
  }

  const orderRow = orderRows[0];
  const clientStoreId = Number(orderRow.client_store_id || 6);
  const [osRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id, service_id FROM order_service WHERE order_id = ? ORDER BY id ASC`,
    [orderId]
  );

  const existingUpperServiceId = Number(osRows?.[0]?.service_id || 0);
  const upperServiceId = await resolveUpperServiceId(pool, existingUpperServiceId, params);
  const upperService = await resolveServiceMatch(pool, upperServiceId, servicePrice, 'LashesTop');

  let underService: LegacyCatalogServiceMatch | undefined;
  if (params.hasUnderMink || selectedUnderCombo || osRows.length > 1) {
    let underServiceId = Number(osRows?.[1]?.service_id || 0);
    const targetUnderId = underMinkServiceType === 'Retain' ? 128 : 127;
    if (underServiceId <= 1 || underServiceId === 127 || underServiceId === 128) {
      const [underRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id FROM service WHERE id = ? OR service_key LIKE '%under%' ORDER BY (id = ?) DESC LIMIT 1`,
        [targetUnderId, targetUnderId]
      );
      underServiceId = Number(underRows?.[0]?.id || targetUnderId);
    }
    underService = await resolveServiceMatch(
      pool,
      underServiceId,
      underMinkServiceType === 'Retain' ? 250_000 : 390_000,
      'LashesUnder'
    );
  }

  const upperCombo = selectedCombo
    ? await resolveComboPriceRow(pool, upperService.serviceId, selectedCombo)
    : undefined;
  const underCombo =
    selectedUnderCombo && underService
      ? await resolveComboPriceRow(pool, underService.serviceId, selectedUnderCombo)
      : undefined;

  const products: LegacyCatalogProductMatch[] = [];
  for (const item of params.cartProducts || []) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const paidUnit = Math.max(0, Math.round(Number(item.price || 0)));
    const [prodRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT p.id AS productId,
              COALESCE(pp.product_price, 1100000) AS catalogPrice,
              iwi.id AS warehouseItemId,
              COALESCE(iwi.first_inventory_warehouse_order_item_id, 0) AS firstOrderItemId
       FROM product p
       LEFT JOIN product_language pl ON pl.product_id = p.id AND pl.language_id IN (1, 2)
       LEFT JOIN product_price pp ON pp.product_id = p.id
       LEFT JOIN inventory_warehouse iw ON iw.client_store_id = ? AND iw.is_disabled = 0
       LEFT JOIN inventory_warehouse_item iwi
         ON iwi.inventory_item_id = p.inventory_item_id
         AND iwi.inventory_warehouse_id = iw.id
         AND iwi.item_state = 'Available'
       WHERE p.is_disabled = 0
         AND (p.product_sku LIKE '%yeppeum%' OR pl.product_name LIKE '%Yeppeum%' OR pl.product_name LIKE ?)
       ORDER BY iwi.id ASC
       LIMIT 1`,
      [clientStoreId, `%${String(item.productName || 'Yeppeum').slice(0, 20)}%`]
    );
    if (prodRows.length > 0 && Number(prodRows[0].warehouseItemId) > 0) {
      const catalogUnit = Math.round(Number(prodRows[0].catalogPrice || paidUnit));
      const discountAmount = Math.max(0, (catalogUnit - paidUnit) * qty);
      products.push({
        productId: Number(prodRows[0].productId),
        inventoryWarehouseItemId: Number(prodRows[0].warehouseItemId),
        firstInventoryWarehouseOrderItemId: Number(prodRows[0].firstOrderItemId || 0),
        unitPrice: catalogUnit,
        quantity: qty,
        discountAmount,
      });
    }
  }

  const staffFiveStarSurveyAnswers: LegacySurveyAnswerPayload = {};
  if (upperService.staffSurveySetId > 0) {
    const [sRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT DISTINCT s.id AS surveyId, sa.id AS surveyAnswerId, sa.survey_answer_key AS answerKey
       FROM survey_set_group_survey ssgs
       JOIN survey s ON s.id = ssgs.survey_id AND s.is_disabled = 0
       JOIN survey_answer sa ON sa.survey_id = s.id AND sa.is_disabled = 0
       WHERE ssgs.survey_set_id = ?
         AND s.render_style = 'rating'
         AND sa.survey_answer_key = '5'`,
      [upperService.staffSurveySetId]
    );
    for (const row of sRows) {
      const surveyKey = String(row.surveyId);
      staffFiveStarSurveyAnswers[surveyKey] = [
        {
          survey_answer_id: String(row.surveyAnswerId),
          survey_answer: String(row.answerKey || '5'),
        },
      ];
    }
  }

  return {
    orderExists: true,
    orderId,
    customerUserId: Number(orderRow.user_id || 0),
    clientStoreId,
    currentOrderState: String(orderRow.order_state || ''),
    bookingDateStart: orderRow.bookingDateStart ? String(orderRow.bookingDateStart) : undefined,
    promotionId: orderRow.promotion_id ? Number(orderRow.promotion_id) : null,
    userUrlId: orderRow.user_url_id ? Number(orderRow.user_url_id) : null,
    existingOrderServiceIds: osRows.map((r) => Number(r.id)),
    upperService,
    underService,
    upperCombo,
    underCombo,
    products,
    staffFiveStarSurveyAnswers,
    customerHappySurveyAnswers: {},
  };
}
