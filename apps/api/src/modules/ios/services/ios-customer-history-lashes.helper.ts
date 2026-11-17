import type mysql from 'mysql2/promise';
import {
  buildLegacyServiceProgressImageUrl,
  IosBookingAttributes,
  IosBookingProgress,
  IosCustomerHistoryLashSpec,
  LashHistoryPhoto,
} from '@mos-lab/shared';
import { BookingOverrideRecord, defaultIosOverrideRepo } from './ios-overrides.service.js';
import { isUnderMinkServiceRow } from './ios-progress-hydration.helper.js';

export interface OverrideBatchReader {
  loadBookingOverridesBatch(bookingIds: number[]): Promise<Record<string, BookingOverrideRecord>>;
}

export interface OrderHistoryLashHydration {
  photos?: LashHistoryPhoto[];
  underPhotos?: LashHistoryPhoto[];
  underServiceName?: string | null;
  lashSpecs?: IosCustomerHistoryLashSpec[];
}

function isUsablePhotoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return Boolean(trimmed) && !trimmed.startsWith('DECLINED:');
}

function buildStagePhotos(urls: { before?: unknown; cleaned?: unknown; after?: unknown }): LashHistoryPhoto[] {
  const photos: LashHistoryPhoto[] = [];
  if (isUsablePhotoUrl(urls.before)) {
    photos.push({ type: 'before', label: '1. Before · Mắt mộc', url: urls.before });
  }
  if (isUsablePhotoUrl(urls.cleaned)) {
    photos.push({ type: 'cleaned', label: '2. Cleaning · Vệ sinh', url: urls.cleaned });
  }
  if (isUsablePhotoUrl(urls.after)) {
    photos.push({ type: 'after', label: '3. After · Hoàn thiện', url: urls.after });
  }
  return photos;
}

function buildSpecFromAttrRows(
  rows: mysql.RowDataPacket[],
  serviceRow: mysql.RowDataPacket,
  allOrderServices: mysql.RowDataPacket[],
  retainCounts?: { left?: number; right?: number }
): IosCustomerHistoryLashSpec | null {
  const serviceId = Number(serviceRow.service_id || 0);
  const gKey = String(serviceRow.attribute_group_key || '').trim();
  const styles: string[] = [];
  const curls: string[] = [];
  const thicknesses: string[] = [];
  const lengths: string[] = [];
  const counts: string[] = [];
  const fans: string[] = [];
  const colors: string[] = [];

  for (const a of rows) {
    if (a.itemGroupId && Number(a.itemGroupId) !== serviceId) {
      const siblings = allOrderServices.filter((s) => String(s.attribute_group_key || '').trim() === gKey);
      if (siblings.length > 1) continue;
    }
    const val = String(a.val || '').trim();
    if (!val) continue;
    const attrId = Number(a.attribute_id);
    if (attrId === 10 && !styles.includes(val)) styles.push(val);
    else if (attrId === 9 && !curls.includes(val)) curls.push(val);
    else if (attrId === 15 && !thicknesses.includes(val)) thicknesses.push(val);
    else if (attrId === 11 && !lengths.includes(val)) lengths.push(val);
    else if (attrId === 12 && !counts.includes(val)) counts.push(val);
    else if (attrId === 13 && !fans.includes(val)) fans.push(val);
    else if (attrId === 14 && !colors.includes(val)) colors.push(val);
  }

  lengths.sort((x, y) => {
    const nx = parseFloat(x);
    const ny = parseFloat(y);
    return !Number.isNaN(nx) && !Number.isNaN(ny) ? nx - ny : x.localeCompare(y);
  });

  const hasAnyAttr =
    styles.length > 0 ||
    curls.length > 0 ||
    thicknesses.length > 0 ||
    lengths.length > 0 ||
    counts.length > 0 ||
    fans.length > 0 ||
    colors.length > 0 ||
    retainCounts?.left !== undefined ||
    retainCounts?.right !== undefined;

  if (!hasAnyAttr) return null;

  return {
    serviceName: serviceRow.service_name ? String(serviceRow.service_name).trim() : undefined,
    isUnder: isUnderMinkServiceRow(serviceRow),
    style: styles.length > 0 ? styles.join(', ') : null,
    curl: curls.length > 0 ? curls.join(', ') : null,
    thickness: thicknesses.length > 0 ? thicknesses.join(', ') : null,
    length: lengths.length > 0 ? lengths.join(', ') : null,
    strandCount: counts.length > 0 ? counts.join(', ') : null,
    fan: fans.length > 0 ? fans.join(', ') : null,
    color: colors.length > 0 ? colors.join(', ') : null,
    retainLeft: retainCounts?.left ?? null,
    retainRight: retainCounts?.right ?? null,
  };
}

export async function fetchOrderLashPhotosAndSpecsBatch(
  pool: mysql.Pool,
  orderIds: number[],
  serviceRows: mysql.RowDataPacket[],
  overrideRepo: OverrideBatchReader = defaultIosOverrideRepo
): Promise<Map<number, OrderHistoryLashHydration>> {
  const result = new Map<number, OrderHistoryLashHydration>();
  const uniqueOrderIds = Array.from(new Set(orderIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueOrderIds.length === 0) return result;

  const servicesByOrder = new Map<number, mysql.RowDataPacket[]>();
  const osIds: number[] = [];
  const groupKeysSet = new Set<string>();

  for (const sr of serviceRows) {
    const oid = Number(sr.order_id || 0);
    if (oid <= 0) continue;
    const list = servicesByOrder.get(oid) || [];
    list.push(sr);
    servicesByOrder.set(oid, list);
    const osId = Number(sr.os_id || 0);
    if (osId > 0) osIds.push(osId);
    const gKey = String(sr.attribute_group_key || '').trim();
    if (gKey) groupKeysSet.add(gKey);
  }

  const uniqueOsIds = Array.from(new Set(osIds));
  const uniqueGroupKeys = Array.from(groupKeysSet);

  const photosByOsId = new Map<number, { before?: string; cleaned?: string; after?: string }>();
  const retainByOsId = new Map<number, { left?: number; right?: number }>();
  const attrRowsByKey = new Map<string, mysql.RowDataPacket[]>();
  let overridesByOrder: Record<string, BookingOverrideRecord> = {};

  await Promise.all([
    uniqueOsIds.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT id, order_service_id, service_state, image_filename, image_extension
             FROM order_service_progress
             WHERE order_service_id IN (${uniqueOsIds.map(() => '?').join(',')})
               AND image_filename IS NOT NULL AND image_filename != ''
             ORDER BY id ASC`,
            uniqueOsIds
          )
          .then(([rows]) => {
            for (const r of rows) {
              const osId = Number(r.order_service_id || 0);
              if (osId <= 0) continue;
              const url = buildLegacyServiceProgressImageUrl(
                Number(r.id),
                String(r.image_filename),
                String(r.image_extension || 'jpg')
              );
              const state = String(r.service_state || '').trim();
              const bucket = photosByOsId.get(osId) || {};
              if (state === 'ServiceStart') bucket.before = url;
              else if (state === 'ServiceCleaned') bucket.cleaned = url;
              else if (state === 'ServiceEnd') bucket.after = url;
              photosByOsId.set(osId, bucket);
            }
          })
          .catch(() => {})
      : Promise.resolve(),
    uniqueOsIds.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT item_id, attribute_id, attribute_option_value
             FROM item_attribute_value
             WHERE item_id IN (${uniqueOsIds.map(() => '?').join(',')})
               AND type = 'service-retain-attribute'
               AND attribute_id IN (17, 18)
             ORDER BY id ASC`,
            uniqueOsIds
          )
          .then(([rows]) => {
            for (const r of rows) {
              const osId = Number(r.item_id || 0);
              const val = Number(r.attribute_option_value);
              if (osId <= 0 || !Number.isFinite(val)) continue;
              const entry = retainByOsId.get(osId) || {};
              if (Number(r.attribute_id) === 17) entry.left = val;
              else entry.right = val;
              retainByOsId.set(osId, entry);
            }
          })
          .catch(() => {})
      : Promise.resolve(),
    uniqueGroupKeys.length > 0
      ? pool
          .query<mysql.RowDataPacket[]>(
            `SELECT
               iav.group_key AS groupKey,
               iav.item_group_id AS itemGroupId,
               iav.attribute_id AS attribute_id,
               COALESCE(
                 NULLIF(aol2.attribute_option_value, ''),
                 NULLIF(aol1.attribute_option_value, ''),
                 NULLIF(iav.attribute_option_value, '')
               ) AS val
             FROM item_attribute_value iav
             LEFT JOIN attribute_option_language aol1 ON iav.attribute_option_id = aol1.attribute_option_id AND aol1.language_id = 1
             LEFT JOIN attribute_option_language aol2 ON iav.attribute_option_id = aol2.attribute_option_id AND aol2.language_id = 2
             WHERE iav.group_key IN (${uniqueGroupKeys.map(() => '?').join(',')})
               AND iav.attribute_id IN (9, 10, 11, 12, 13, 14, 15)
             ORDER BY iav.id ASC`,
            uniqueGroupKeys
          )
          .then(([rows]) => {
            for (const row of rows) {
              const gKey = String(row.groupKey || '').trim();
              if (!gKey) continue;
              const itemGId = row.itemGroupId ? String(row.itemGroupId) : '';
              const exactKey = `${gKey}_${itemGId}`;
              const exactList = attrRowsByKey.get(exactKey) || [];
              exactList.push(row);
              attrRowsByKey.set(exactKey, exactList);
              const fallbackKey = `${gKey}_`;
              const fbList = attrRowsByKey.get(fallbackKey) || [];
              fbList.push(row);
              attrRowsByKey.set(fallbackKey, fbList);
            }
          })
          .catch(() => {})
      : Promise.resolve(),
    overrideRepo
      .loadBookingOverridesBatch(uniqueOrderIds)
      .then((res) => {
        overridesByOrder = res || {};
      })
      .catch(() => {
        overridesByOrder = {};
      }),
  ]);

  for (const oid of uniqueOrderIds) {
    const orderSvcs = servicesByOrder.get(oid) || [];
    const underRow = orderSvcs.find((r) => isUnderMinkServiceRow(r));
    const upperRow = orderSvcs.find((r) => r !== underRow) || orderSvcs[0];
    const upperOsId = Number(upperRow?.os_id || 0);
    const underOsId = underRow ? Number(underRow.os_id || 0) : 0;

    const ovr = overridesByOrder[String(oid)];
    const ovrProg = ovr?.progress as Partial<IosBookingProgress> | undefined;
    const ovrAttrs = ovr?.attributes as Partial<IosBookingAttributes> | undefined;
    const upperLegacy = upperOsId > 0 ? photosByOsId.get(upperOsId) : undefined;
    const underLegacy = underOsId > 0 ? photosByOsId.get(underOsId) : undefined;

    const upperPhotos = buildStagePhotos({
      before: ovrProg?.beforePhotoUrl || upperLegacy?.before,
      cleaned: ovrProg?.cleanedPhotoUrl || upperLegacy?.cleaned,
      after: ovrProg?.afterPhotoUrl || upperLegacy?.after,
    });
    const underPhotos = buildStagePhotos({
      before: ovrProg?.underBeforePhotoUrl || underLegacy?.before,
      cleaned: ovrProg?.underCleanedPhotoUrl || underLegacy?.cleaned,
      after: ovrProg?.underAfterPhotoUrl || underLegacy?.after,
    });

    const lashSpecs: IosCustomerHistoryLashSpec[] = [];
    for (const sr of orderSvcs) {
      const gKey = String(sr.attribute_group_key || '').trim();
      const sId = Number(sr.service_id || 0);
      const osId = Number(sr.os_id || 0);
      const matchingRows =
        (gKey ? attrRowsByKey.get(`${gKey}_${sId}`) || attrRowsByKey.get(`${gKey}_`) : undefined) || [];
      const isUnder = isUnderMinkServiceRow(sr);
      const ovrRetain =
        isUnder && ovrProg
          ? {
              left: ovrProg.underRetainLashCountLeft ?? ovrProg.underRetainLashes?.left,
              right: ovrProg.underRetainLashCountRight ?? ovrProg.underRetainLashes?.right,
            }
          : !isUnder && ovrProg
            ? {
                left: ovrProg.retainLashCountLeft ?? ovrProg.retainLashes?.left,
                right: ovrProg.retainLashCountRight ?? ovrProg.retainLashes?.right,
              }
            : undefined;
      const legacyRetain = osId > 0 ? retainByOsId.get(osId) : undefined;
      const mergedRetain = {
        left: ovrRetain?.left ?? legacyRetain?.left,
        right: ovrRetain?.right ?? legacyRetain?.right,
      };
      const builtSpec = buildSpecFromAttrRows(matchingRows, sr, orderSvcs, mergedRetain);
      if (builtSpec) {
        lashSpecs.push(builtSpec);
      } else if (!isUnder && ovrAttrs && (ovrAttrs.style || ovrAttrs.curl || ovrAttrs.length || ovrAttrs.thickness)) {
        lashSpecs.push({
          serviceName:
            (ovr.serviceName as string | undefined) || (sr.service_name ? String(sr.service_name).trim() : undefined),
          isUnder: false,
          style: ovrAttrs.style || null,
          curl: ovrAttrs.curl || null,
          length: ovrAttrs.length || null,
          thickness: ovrAttrs.thickness || null,
          strandCount: ovrAttrs.count || null,
          fan: ovrAttrs.volume || null,
          color: ovrAttrs.color || null,
          retainLeft: mergedRetain.left ?? null,
          retainRight: mergedRetain.right ?? null,
        });
      }
    }

    if (
      lashSpecs.length === 0 &&
      ovrAttrs &&
      (ovrAttrs.style || ovrAttrs.curl || ovrAttrs.length || ovrAttrs.thickness)
    ) {
      lashSpecs.push({
        serviceName: (ovr?.serviceName as string | undefined) || undefined,
        isUnder: false,
        style: ovrAttrs.style || null,
        curl: ovrAttrs.curl || null,
        length: ovrAttrs.length || null,
        thickness: ovrAttrs.thickness || null,
        strandCount: ovrAttrs.count || null,
        fan: ovrAttrs.volume || null,
        color: ovrAttrs.color || null,
        retainLeft: ovrProg?.retainLashCountLeft ?? null,
        retainRight: ovrProg?.retainLashCountRight ?? null,
      });
    }

    const underServiceName = underRow?.service_name ? String(underRow.service_name).trim() : null;
    if (upperPhotos.length > 0 || underPhotos.length > 0 || lashSpecs.length > 0 || underServiceName) {
      result.set(oid, {
        ...(upperPhotos.length > 0 ? { photos: upperPhotos } : {}),
        ...(underPhotos.length > 0 ? { underPhotos } : {}),
        ...(underServiceName ? { underServiceName } : {}),
        ...(lashSpecs.length > 0 ? { lashSpecs } : {}),
      });
    }
  }

  return result;
}
