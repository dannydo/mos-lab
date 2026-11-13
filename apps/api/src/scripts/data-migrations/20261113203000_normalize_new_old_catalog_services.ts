import mysql, { type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const SNAPSHOT_CONFIG_KEY = 'SERVICE_NEW_OLD_NORMALIZATION_SNAPSHOT_V1';

const OLD_ERA_LASH_SERVICE_IDS = [
  2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34,
  35,
] as const;

const NEW_LASH_LABEL_RE = /\b(?:New\s+)+(?=(?:Classic|Volume|Flawless|Hyper|Ultra|Ivy|Mink|Under)\b)/gi;

function stripNewLashText(value: string): string {
  return value
    .replace(NEW_LASH_LABEL_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeMaterialAttr(value: string): string {
  const stripped = stripNewLashText(value);
  if (stripped.toLowerCase() === 'classic') return 'Classic 1D';
  if (stripped.toLowerCase() === 'volume') return 'Volume 2D';
  return stripped;
}

function cleanOverrideRecord(rec: Record<string, unknown>): boolean {
  let changed = false;
  if (typeof rec.serviceName === 'string') {
    const cleaned = stripNewLashText(rec.serviceName);
    if (cleaned !== rec.serviceName) {
      rec.serviceName = cleaned;
      changed = true;
    }
  }
  if (rec.attributes && typeof rec.attributes === 'object') {
    const attrs = rec.attributes as Record<string, unknown>;
    if (typeof attrs.material === 'string') {
      const cleaned = normalizeMaterialAttr(attrs.material);
      if (cleaned !== attrs.material) {
        attrs.material = cleaned;
        changed = true;
      }
    }
  }
  for (const comboField of ['selectedCombo', 'selectedUnderCombo'] as const) {
    const combo = rec[comboField];
    if (combo && typeof combo === 'object') {
      const comboObj = combo as Record<string, unknown>;
      if (typeof comboObj.name === 'string') {
        const cleaned = stripNewLashText(comboObj.name);
        if (cleaned !== comboObj.name) {
          comboObj.name = cleaned;
          changed = true;
        }
      }
    }
  }
  return changed;
}

const migration: DataMigration = {
  id: '20261113203000_normalize_new_old_catalog_services',
  description:
    'Bỏ tiền tố New trên 74 dịch vụ hiện hành, gắn tiền tố OLD + đẩy position + khóa Combo mới trên 32 dịch vụ cũ, và disable an toàn các dịch vụ OLD không còn usage/combo',

  async preflight(connection: PoolConnection) {
    const legacyUrl = process.env.LEGACY_DATABASE_URL?.replace(/^['"]|['"]$/g, '');
    let legacyConn: mysql.Connection | null = null;
    try {
      if (legacyUrl) {
        legacyConn = await mysql.createConnection(legacyUrl);
      }
      const targetConn = legacyConn || connection;
      const [tables] = await targetConn.execute<RowDataPacket[]>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('service', 'service_language', 'service_price')`
      );
      if (tables.length < 3) {
        throw new Error('Missing legacy catalog tables (service, service_language, service_price).');
      }
    } finally {
      if (legacyConn) await legacyConn.end();
    }
  },

  async up(connection: PoolConnection) {
    const legacyUrl = process.env.LEGACY_DATABASE_URL?.replace(/^['"]|['"]$/g, '');
    let legacyConn: mysql.Connection | null = null;

    try {
      if (legacyUrl) {
        legacyConn = await mysql.createConnection(legacyUrl);
      }
      const targetConn = legacyConn || connection;

      // 1. Save pre-change rollback snapshot into crm_config (once only)
      const [existingSnapshot] = await connection.execute<RowDataPacket[]>(
        `SELECT \`key\` FROM crm_config WHERE \`key\` = ? LIMIT 1`,
        [SNAPSHOT_CONFIG_KEY]
      );

      if (existingSnapshot.length === 0) {
        const [serviceRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id, service_key, parent_service_id, position, is_disabled
           FROM service
           WHERE id BETWEEN 2 AND 128
           ORDER BY id ASC`
        );
        const [langRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id, service_id, language_id, service_name
           FROM service_language
           WHERE service_id BETWEEN 2 AND 128
           ORDER BY id ASC`
        );
        const [priceRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id, service_id, service_price_type, is_disabled
           FROM service_price
           WHERE service_id BETWEEN 2 AND 35
           ORDER BY id ASC`
        );

        await connection.execute(
          `INSERT INTO crm_config (\`key\`, \`value\`, \`updated_at\`)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE \`value\` = \`value\``,
          [
            SNAPSHOT_CONFIG_KEY,
            JSON.stringify({
              capturedAt: new Date().toISOString(),
              services: serviceRows,
              serviceLanguages: langRows,
              servicePrices: priceRows,
            }),
          ]
        );
      }

      // 2. Apply catalog normalization on legacy DB inside a transaction
      await targetConn.beginTransaction();
      try {
        // 2A. Strip leading "New " from current services (id >= 46)
        const [currentLangRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id, service_id, language_id, service_name
           FROM service_language
           WHERE service_id >= 46`
        );

        for (const row of currentLangRows) {
          const serviceId = Number(row.service_id);
          const rawName = String(row.service_name || '');
          let nextName = rawName.replace(/^(?:New\s+)+/i, '').trim();
          if (serviceId === 127 && nextName === 'Flawless Under Mink') {
            nextName = 'Flawless Under Mink 390';
          }
          if (nextName && nextName !== rawName) {
            await targetConn.execute(`UPDATE service_language SET service_name = ? WHERE id = ?`, [
              nextName,
              Number(row.id),
            ]);
          }
        }

        // 2B. Prefix "OLD ", push position, lock Combo sales, and disable safe unused pairs
        const oldPlaceholders = OLD_ERA_LASH_SERVICE_IDS.map(() => '?').join(',');
        const oldIdsParams = [...OLD_ERA_LASH_SERVICE_IDS];

        const [oldLangRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id, service_id, language_id, service_name
           FROM service_language
           WHERE service_id IN (${oldPlaceholders}) AND language_id IN (1, 2)`,
          oldIdsParams
        );

        for (const row of oldLangRows) {
          const rawName = String(row.service_name || '').trim();
          const baseName = rawName.replace(/^(?:OLD\s+|New\s+)+/i, '').trim();
          const nextName = baseName ? `OLD ${baseName}` : rawName;
          if (nextName && nextName !== rawName) {
            await targetConn.execute(`UPDATE service_language SET service_name = ? WHERE id = ?`, [
              nextName,
              Number(row.id),
            ]);
          }
        }

        await targetConn.execute(
          `UPDATE service
           SET position = 500 + id, date_updated = NOW()
           WHERE id IN (${oldPlaceholders})`,
          oldIdsParams
        );

        await targetConn.execute(
          `UPDATE service_price
           SET is_disabled = 1
           WHERE service_id IN (${oldPlaceholders})
             AND service_price_type = 'Combo'
             AND is_disabled = 0`,
          oldIdsParams
        );

        // Compute live safety metrics across the 32 old services before disabling
        const [usageRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT os.service_id, COUNT(*) AS cnt
           FROM order_service os
           JOIN \`order\` o ON o.id = os.order_id
           WHERE os.service_id IN (${oldPlaceholders})
             AND o.order_state NOT IN ('Cancelled', 'Missed')
             AND COALESCE(o.booking_date_start, o.date_created) >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           GROUP BY os.service_id`,
          oldIdsParams
        );
        const usage30dMap = new Map<number, number>(usageRows.map((r) => [Number(r.service_id), Number(r.cnt)]));

        const [futureRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT os.service_id, COUNT(*) AS cnt
           FROM order_service os
           JOIN \`order\` o ON o.id = os.order_id
           WHERE os.service_id IN (${oldPlaceholders})
             AND o.order_state NOT IN ('Cancelled', 'Completed', 'Missed')
             AND o.booking_date_start >= CURDATE()
           GROUP BY os.service_id`,
          oldIdsParams
        );
        const futureMap = new Map<number, number>(futureRows.map((r) => [Number(r.service_id), Number(r.cnt)]));

        const [comboRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT service_id, COUNT(*) AS cnt
           FROM user_service_balance
           WHERE service_id IN (${oldPlaceholders})
             AND is_disabled = 0
             AND (normal_count > 0 OR retain_count > 0)
             AND (date_expired IS NULL OR date_expired >= NOW())
           GROUP BY service_id`,
          oldIdsParams
        );
        const comboMap = new Map<number, number>(comboRows.map((r) => [Number(r.service_id), Number(r.cnt)]));

        const [oldServiceRows] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id, parent_service_id
           FROM service
           WHERE id IN (${oldPlaceholders})`,
          oldIdsParams
        );

        // Group each parent Normal service with its Refill children so a child is never disabled while parent has active combo/usage
        const oldIdSet = new Set<number>(OLD_ERA_LASH_SERVICE_IDS);
        const groups = new Map<number, number[]>();
        for (const r of oldServiceRows) {
          const id = Number(r.id);
          const parentId = r.parent_service_id ? Number(r.parent_service_id) : null;
          const rootId = parentId && oldIdSet.has(parentId) ? parentId : id;
          const members = groups.get(rootId) || [];
          members.push(id);
          groups.set(rootId, members);
        }

        const safeToDisableIds: number[] = [];
        const keepEnabledIds: number[] = [];

        for (const members of groups.values()) {
          const hasAnyActivityOrCombo = members.some(
            (id) => (usage30dMap.get(id) || 0) > 0 || (futureMap.get(id) || 0) > 0 || (comboMap.get(id) || 0) > 0
          );
          if (hasAnyActivityOrCombo) {
            keepEnabledIds.push(...members);
          } else {
            safeToDisableIds.push(...members);
          }
        }

        if (safeToDisableIds.length > 0) {
          const disablePh = safeToDisableIds.map(() => '?').join(',');
          await targetConn.execute(
            `UPDATE service SET is_disabled = 1, date_updated = NOW() WHERE id IN (${disablePh})`,
            safeToDisableIds
          );
        }
        if (keepEnabledIds.length > 0) {
          const keepPh = keepEnabledIds.map(() => '?').join(',');
          await targetConn.execute(
            `UPDATE service SET is_disabled = 0, date_updated = NOW() WHERE id IN (${keepPh})`,
            keepEnabledIds
          );
        }

        await targetConn.commit();
      } catch (err) {
        await targetConn.rollback();
        throw err;
      }

      // 3. Clean stale "New " strings in existing /ios-app crm_config booking overrides
      const [overrideRows] = await connection.execute<RowDataPacket[]>(
        `SELECT \`key\`, \`value\`
         FROM crm_config
         WHERE \`key\` LIKE 'IOS_BK_OVR:%' OR \`key\` = 'IOS_APP_LIVE_BOOKING_OVERRIDES'`
      );

      for (const row of overrideRows) {
        const key = String(row.key);
        const rawValue = String(row.value || '');
        if (!rawValue) continue;
        try {
          const parsed = JSON.parse(rawValue) as Record<string, unknown>;
          let changed = false;
          if (key === 'IOS_APP_LIVE_BOOKING_OVERRIDES') {
            for (const entry of Object.values(parsed)) {
              if (entry && typeof entry === 'object') {
                if (cleanOverrideRecord(entry as Record<string, unknown>)) {
                  changed = true;
                }
              }
            }
          } else if (parsed && typeof parsed === 'object') {
            changed = cleanOverrideRecord(parsed);
          }
          if (changed) {
            await connection.execute(`UPDATE crm_config SET \`value\` = ?, \`updated_at\` = NOW() WHERE \`key\` = ?`, [
              JSON.stringify(parsed),
              key,
            ]);
          }
        } catch {
          // Skip malformed JSON rows gracefully
        }
      }
    } finally {
      if (legacyConn) {
        await legacyConn.end();
      }
    }
  },
};

export default migration;
