import mysql from 'mysql2/promise';
import {
  buildLegacyServiceProgressImageUrl,
  IosBookingProgress,
  LashHistoryItem,
  LashHistoryPhoto,
} from '@mos-lab/shared';
import { defaultIosOverrideRepo } from './ios-overrides.service.js';

const UNDER_MINK_SERVICE_IDS = new Set([127, 128]);

export function isUnderMinkServiceRow(row: mysql.RowDataPacket): boolean {
  return (
    String(row.service_group || '').trim() === 'LashesUnder' || UNDER_MINK_SERVICE_IDS.has(Number(row.service_id || 0))
  );
}

function isUsableHistoryPhotoUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return Boolean(trimmed) && !trimmed.startsWith('DECLINED:');
}

function applyLegacyProgressRowToPhotos(
  row: mysql.RowDataPacket,
  target: Partial<IosBookingProgress>,
  isUnder: boolean
): void {
  const state = String(row.service_state || '').trim();
  if (row.image_filename) {
    const url = buildLegacyServiceProgressImageUrl(
      Number(row.id),
      String(row.image_filename),
      String(row.image_extension || 'jpg')
    );
    if (state === 'ServiceStart') {
      if (isUnder) target.underBeforePhotoUrl = url;
      else target.beforePhotoUrl = url;
    } else if (state === 'ServiceCleaned') {
      if (isUnder) target.underCleanedPhotoUrl = url;
      else target.cleanedPhotoUrl = url;
    } else if (state === 'ServiceEnd') {
      if (isUnder) target.underAfterPhotoUrl = url;
      else target.afterPhotoUrl = url;
    }
  }
  if (isUnder) target.lastLegacyUnderState = state;
  else target.lastLegacyUpperState = state;
  if (!isUnder && state === 'ServiceCompleted') target.upperCompleted = true;
}

export async function fetchLegacyProgressHydrationByOrderIds(
  pool: mysql.Pool,
  orderIds: number[]
): Promise<Map<number, Partial<IosBookingProgress>>> {
  const result = new Map<number, Partial<IosBookingProgress>>();
  const uniqueOrderIds = Array.from(new Set(orderIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueOrderIds.length === 0) return result;

  try {
    const placeholders = uniqueOrderIds.map(() => '?').join(',');
    const [osRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT id, order_id, service_id, service_group FROM order_service WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
      uniqueOrderIds
    );
    if (osRows.length === 0) return result;

    const osByOrder = new Map<number, mysql.RowDataPacket[]>();
    const osMetaMap = new Map<number, { orderId: number; isUnder: boolean }>();
    const allOsIds: number[] = [];

    for (const r of osRows) {
      const oid = Number(r.order_id);
      const list = osByOrder.get(oid) || [];
      list.push(r);
      osByOrder.set(oid, list);
    }

    for (const [oid, list] of osByOrder.entries()) {
      const underRow = list.find((r) => isUnderMinkServiceRow(r)) || (list.length >= 2 ? list[1] : undefined);
      const upperRow = list.find((r) => r !== underRow) || list[0];
      if (upperRow) {
        const id = Number(upperRow.id);
        allOsIds.push(id);
        osMetaMap.set(id, { orderId: oid, isUnder: false });
      }
      if (underRow && Number(underRow.id) !== Number(upperRow?.id)) {
        const id = Number(underRow.id);
        allOsIds.push(id);
        osMetaMap.set(id, { orderId: oid, isUnder: true });
      }
    }

    if (allOsIds.length === 0) return result;
    const osPlaceholders = allOsIds.map(() => '?').join(',');
    const [[progRows], [retainRows]] = await Promise.all([
      pool.query<mysql.RowDataPacket[]>(
        `SELECT id, order_service_id, service_state, image_filename, image_extension
         FROM order_service_progress
         WHERE order_service_id IN (${osPlaceholders})
         ORDER BY id ASC`,
        allOsIds
      ),
      pool.query<mysql.RowDataPacket[]>(
        `SELECT item_id, attribute_id, attribute_option_value
         FROM item_attribute_value
         WHERE item_id IN (${osPlaceholders})
           AND type = 'service-retain-attribute'
           AND attribute_id IN (17, 18)
         ORDER BY id ASC`,
        allOsIds
      ),
    ]);

    for (const pr of progRows) {
      const meta = osMetaMap.get(Number(pr.order_service_id));
      if (!meta) continue;
      const entry = result.get(meta.orderId) || {};
      applyLegacyProgressRowToPhotos(pr, entry, meta.isUnder);
      result.set(meta.orderId, entry);
    }

    for (const rr of retainRows) {
      const meta = osMetaMap.get(Number(rr.item_id));
      if (!meta) continue;
      const val = Number(rr.attribute_option_value);
      if (!Number.isFinite(val)) continue;
      const entry = result.get(meta.orderId) || {};
      const isLeft = Number(rr.attribute_id) === 17;
      if (meta.isUnder) {
        if (isLeft) entry.underRetainLashCountLeft = val;
        else entry.underRetainLashCountRight = val;
      } else {
        if (isLeft) entry.retainLashCountLeft = val;
        else entry.retainLashCountRight = val;
      }
      result.set(meta.orderId, entry);
    }

    for (const [oid, entry] of result.entries()) {
      const orderOsList = osByOrder.get(oid) || [];
      if (entry.upperCompleted && orderOsList.length >= 2 && entry.lastLegacyUnderState !== 'ServiceCompleted') {
        entry.activeServiceRound = 'UNDER';
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return result;
}

export function mergeHydratedBookingProgress(
  legacyProgress?: Partial<IosBookingProgress> | null,
  overrideProgress?: IosBookingProgress | null
): IosBookingProgress | undefined {
  if (!legacyProgress && !overrideProgress) return undefined;
  const legacy = legacyProgress || {};
  const override = overrideProgress || ({} as Partial<IosBookingProgress>);
  return {
    elapsedSeconds: 0,
    timerRunning: false,
    ...legacy,
    ...override,
    beforePhotoUrl: override.beforePhotoUrl || legacy.beforePhotoUrl,
    cleanedPhotoUrl: override.cleanedPhotoUrl || legacy.cleanedPhotoUrl,
    afterPhotoUrl: override.afterPhotoUrl || legacy.afterPhotoUrl,
    underBeforePhotoUrl: override.underBeforePhotoUrl || legacy.underBeforePhotoUrl,
    underCleanedPhotoUrl: override.underCleanedPhotoUrl || legacy.underCleanedPhotoUrl,
    underAfterPhotoUrl: override.underAfterPhotoUrl || legacy.underAfterPhotoUrl,
    upperCompleted: override.upperCompleted ?? legacy.upperCompleted,
    lastLegacyUpperState: override.lastLegacyUpperState || legacy.lastLegacyUpperState,
    lastLegacyUnderState: override.lastLegacyUnderState || legacy.lastLegacyUnderState,
    activeServiceRound: override.activeServiceRound || legacy.activeServiceRound,
  };
}

function buildThreePhotoList(urls: { before?: unknown; cleaned?: unknown; after?: unknown }): LashHistoryPhoto[] {
  const out: LashHistoryPhoto[] = [];
  if (isUsableHistoryPhotoUrl(urls.before)) {
    out.push({ type: 'before', label: 'Trước nối', url: urls.before });
  }
  if (isUsableHistoryPhotoUrl(urls.cleaned)) {
    out.push({ type: 'cleaned', label: 'Sau vệ sinh', url: urls.cleaned });
  }
  if (isUsableHistoryPhotoUrl(urls.after)) {
    out.push({ type: 'after', label: 'Hoàn thành', url: urls.after });
  }
  return out;
}

export async function attachLashHistoryProgressPhotos(
  pool: mysql.Pool,
  historyByUser: Map<number, LashHistoryItem[]>,
  historyMeta: Array<{ userId: number; itemIndex: number; orderId?: number; upperOsId?: number; underOsId?: number }>
): Promise<void> {
  if (historyMeta.length === 0) return;
  try {
    const osIds = Array.from(
      new Set(
        historyMeta
          .flatMap((m) => [m.upperOsId, m.underOsId])
          .filter((id): id is number => typeof id === 'number' && id > 0)
      )
    );
    const orderIds = Array.from(
      new Set(historyMeta.map((m) => m.orderId).filter((id): id is number => typeof id === 'number' && id > 0))
    );

    const photosByOsId = new Map<number, { before?: string; cleaned?: string; after?: string }>();
    if (osIds.length > 0) {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id, order_service_id, service_state, image_filename, image_extension
         FROM order_service_progress
         WHERE order_service_id IN (${osIds.map(() => '?').join(',')})
           AND image_filename IS NOT NULL AND image_filename != ''`,
        osIds
      );
      for (const r of rows) {
        const osId = Number(r.order_service_id);
        const state = String(r.service_state || '').trim();
        const url = buildLegacyServiceProgressImageUrl(
          Number(r.id),
          String(r.image_filename),
          String(r.image_extension || 'jpg')
        );
        const bucket = photosByOsId.get(osId) || {};
        if (state === 'ServiceStart') bucket.before = url;
        else if (state === 'ServiceCleaned') bucket.cleaned = url;
        else if (state === 'ServiceEnd') bucket.after = url;
        photosByOsId.set(osId, bucket);
      }
    }

    const overrides = orderIds.length > 0 ? await defaultIosOverrideRepo.loadBookingOverridesBatch(orderIds) : {};
    for (const meta of historyMeta) {
      const items = historyByUser.get(meta.userId);
      const item = items?.[meta.itemIndex];
      if (!item) continue;
      const ovrProg = meta.orderId
        ? (overrides[String(meta.orderId)]?.progress as IosBookingProgress | undefined)
        : undefined;
      const upperLegacy = meta.upperOsId ? photosByOsId.get(meta.upperOsId) : undefined;
      const underLegacy = meta.underOsId ? photosByOsId.get(meta.underOsId) : undefined;
      const upperPhotos = buildThreePhotoList({
        before: ovrProg?.beforePhotoUrl || upperLegacy?.before,
        cleaned: ovrProg?.cleanedPhotoUrl || upperLegacy?.cleaned,
        after: ovrProg?.afterPhotoUrl || upperLegacy?.after,
      });
      const underPhotos = buildThreePhotoList({
        before: ovrProg?.underBeforePhotoUrl || underLegacy?.before,
        cleaned: ovrProg?.underCleanedPhotoUrl || underLegacy?.cleaned,
        after: ovrProg?.underAfterPhotoUrl || underLegacy?.after,
      });
      if (upperPhotos.length > 0) item.photos = upperPhotos;
      if (underPhotos.length > 0) item.underPhotos = underPhotos;
    }
  } catch {
    // Non-blocking fallback
  }
}
