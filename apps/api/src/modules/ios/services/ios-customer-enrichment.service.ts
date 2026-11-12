import mysql from 'mysql2/promise';
import { formatComboName, IosBookingItem, LashHistoryItem } from '@mos-lab/shared';

export interface LastVisitSpecSummary {
  serviceKey?: string;
  material?: string;
  style?: string;
  volume?: string;
  count?: string;
  color?: string;
}

export interface IosCustomerEnrichmentContext {
  comboBalanceMap: Map<number, NonNullable<IosBookingItem['comboLiveStatus']>>;
  underMinkComboMap: Map<number, NonNullable<IosBookingItem['underMinkComboStatus']>>;
  diamondBalanceMap: Map<number, number>;
  lashHistoryMap: Map<number, LashHistoryItem[]>;
  lastVisitSpecsMap: Map<number, LastVisitSpecSummary>;
}

export function createEmptyCustomerEnrichmentContext(): IosCustomerEnrichmentContext {
  return {
    comboBalanceMap: new Map(),
    underMinkComboMap: new Map(),
    diamondBalanceMap: new Map(),
    lashHistoryMap: new Map(),
    lastVisitSpecsMap: new Map(),
  };
}

export async function fetchCustomerEnrichmentContext(
  pool: mysql.Pool,
  customerIds: number[]
): Promise<IosCustomerEnrichmentContext> {
  const ctx = createEmptyCustomerEnrichmentContext();
  if (customerIds.length === 0) {
    return ctx;
  }

  try {
    const placeholders = customerIds.map(() => '?').join(',');

    const historyPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         o.user_id,
         os.id AS os_id,
         DATE_FORMAT(o.booking_date_start, '%d/%m/%Y') AS visit_date,
         s.service_key,
         COALESCE(sl.service_name, s.service_key, 'Nối mi') AS service_name,
         COALESCE(up.full_name, 'Chuyên Viên') AS staff_name
       FROM \`order\` o
       JOIN order_service os ON os.order_id = o.id
       LEFT JOIN service s ON s.id = os.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       LEFT JOIN user_profile up ON up.user_id = os.assigned_staff_id
       WHERE o.user_id IN (${placeholders})
         AND o.order_state = 'Completed'
       ORDER BY o.booking_date_start DESC, os.id ASC
       LIMIT 800`,
      customerIds
    );

    const balancePromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         usb.id,
         usb.user_id,
         (usb.normal_count + usb.retain_count) AS remaining_sessions,
         usb.normal_count AS normal_remaining,
         usb.retain_count AS retain_remaining,
         COALESCE(sl.service_name, s.service_key, 'Gói Combo Mi') AS combo_name,
         s.service_key AS service_key,
         sp.service_price_package_key AS package_key,
         sp.retain_last_day_required AS retain_days_limit
       FROM user_service_balance usb
       LEFT JOIN service s ON s.id = usb.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       LEFT JOIN service_price sp ON sp.id = usb.service_price_id
       WHERE usb.user_id IN (${placeholders})
         AND (usb.normal_count > 0 OR usb.retain_count > 0)
         AND (usb.service_group IS NULL OR usb.service_group != 'LashesUnder')
         AND (s.service_type IS NULL OR s.service_type != 'LashesUnder')
         AND (s.service_key IS NULL OR s.service_key NOT LIKE '%under%')
       ORDER BY usb.id DESC`,
      customerIds
    );

    const underBalancePromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         usb.user_id,
         SUM(usb.normal_count + usb.retain_count) AS remaining_sessions,
         SUM(usb.normal_count) AS normal_remaining,
         SUM(usb.retain_count) AS retain_remaining,
         MAX(COALESCE(sl.service_name, s.service_key, 'Under Mink 390')) AS combo_name,
         MAX(sp.service_price_package_key) AS package_key
       FROM user_service_balance usb
       LEFT JOIN service s ON s.id = usb.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       LEFT JOIN service_price sp ON sp.id = usb.service_price_id
       WHERE usb.user_id IN (${placeholders})
         AND (usb.normal_count > 0 OR usb.retain_count > 0)
         AND (usb.service_group = 'LashesUnder' OR s.service_type = 'LashesUnder' OR s.service_key LIKE '%under%')
       GROUP BY usb.user_id`,
      customerIds
    );

    const diamondPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT user_id, amount FROM user_balance WHERE user_id IN (${placeholders}) AND currency_id = 3`,
      customerIds
    );

    const [[historyRows], [balanceRows], [underBalanceRows], [diamondRows]] = await Promise.all([
      historyPromise,
      balancePromise,
      underBalancePromise,
      diamondPromise,
    ]);

    for (const dr of diamondRows) {
      ctx.diamondBalanceMap.set(Number(dr.user_id), Number(dr.amount || 0));
    }

    const latestUpperOsIds: number[] = [];
    const osToUserMap = new Map<number, { userId: number; serviceKey: string }>();
    for (const hr of historyRows) {
      const uid = Number(hr.user_id);
      const list = ctx.lashHistoryMap.get(uid) || [];
      const svcName = String(hr.service_name || 'Nối mi');
      const svcKey = String(hr.service_key || '');
      if (list.length < 3) {
        list.push({
          date: String(hr.visit_date || ''),
          serviceName: svcName,
          staffName: String(hr.staff_name || 'Chuyên Viên'),
        });
        ctx.lashHistoryMap.set(uid, list);
      }

      const isUnder =
        svcKey.toLowerCase().includes('under') ||
        svcKey.toLowerCase().includes('flawless.mink-390') ||
        svcName.toLowerCase().includes('under') ||
        svcName.toLowerCase().includes('mi dưới');
      if (!isUnder && !ctx.lastVisitSpecsMap.has(uid) && hr.os_id) {
        const osId = Number(hr.os_id);
        const svcLower = svcKey.toLowerCase();
        let mat = 'Flawless Mink';
        if (svcLower.includes('hyperlight')) mat = 'HyperLight';
        else if (svcLower.includes('ivylight')) mat = 'Ivylight';
        else if (svcLower.includes('classic')) mat = 'New Classic';
        else if (svcLower.includes('volume')) mat = 'Volume';
        else if (svcLower.includes('ultralight')) mat = 'UltraLight';
        ctx.lastVisitSpecsMap.set(uid, { serviceKey: svcKey, material: mat });
        latestUpperOsIds.push(osId);
        osToUserMap.set(osId, { userId: uid, serviceKey: svcKey });
      }
    }

    if (latestUpperOsIds.length > 0) {
      const osPlaceholders = latestUpperOsIds.map(() => '?').join(',');
      const [bonusAttrRows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT
           sb.order_service_id,
           sbr.type,
           COALESCE(ao.attribute_option_key, sbr.value_required, '') AS opt_key
         FROM staff_bonus sb
         JOIN staff_bonus_rule sbr ON sbr.id = sb.staff_bonus_rule_id
         LEFT JOIN attribute_option ao ON sbr.value_required REGEXP '^[0-9]+$' AND ao.id = CAST(sbr.value_required AS UNSIGNED)
         WHERE sb.order_service_id IN (${osPlaceholders})
           AND sb.bonus_type = 'BonusPoint'`,
        latestUpperOsIds
      );

      for (const bar of bonusAttrRows) {
        const osId = Number(bar.order_service_id);
        const info = osToUserMap.get(osId);
        if (!info) continue;
        const current = ctx.lastVisitSpecsMap.get(info.userId) || { serviceKey: info.serviceKey };
        const t = String(bar.type || '');
        const k = String(bar.opt_key || '').toLowerCase();
        const svcLower = info.serviceKey.toLowerCase();

        if (t === 'OrderServiceAttributeLashes' && /^\d+$/.test(k)) {
          const unit =
            svcLower.includes('mink') || svcLower.includes('classic') || svcLower.includes('ivy') ? 'sợi' : 'fan';
          current.count = `${k} ${unit}`;
        } else if (t === 'OrderServiceAttributeFan' && k) {
          const numMatch = k.match(/\d+/);
          const dNum = numMatch ? numMatch[0] : '';
          if (svcLower.includes('hyperlight')) {
            current.volume = dNum === '1' || dNum === '2' ? '2X' : `${dNum}X`;
          } else if (svcLower.includes('ivylight')) {
            current.volume = `${dNum || '4'}L`;
          } else if (svcLower.includes('ultralight')) {
            current.volume = `${dNum || '4'}D`;
          }
        } else if (t === 'OrderServiceAttributeDesign' && k) {
          if (k === 'doll') current.style = 'Doll';
          else if (k === 'wing') current.style = 'Wing';
          else if (k === 'kim-k') current.style = 'Katun';
          else if (k === 'natural') current.style = 'Natural';
        } else if (t === 'OrderServiceAttributeColor' && k) {
          if (k === 'brown' || k === 'purple' || k === 'blue') {
            current.color = 'Nâu Tự Nhiên (Choco Brown)';
          } else if (k === 'black') {
            current.color = 'Đen Tuyền (Jet Black)';
          }
        }
        ctx.lastVisitSpecsMap.set(info.userId, current);
      }
    }

    const groupedByUser = new Map<number, mysql.RowDataPacket[]>();
    for (const br of balanceRows) {
      const uid = Number(br.user_id);
      const arr = groupedByUser.get(uid) || [];
      arr.push(br);
      groupedByUser.set(uid, arr);
    }

    for (const [uid, userRows] of groupedByUser.entries()) {
      const lastVisitSvcKey = (ctx.lastVisitSpecsMap.get(uid)?.serviceKey || '').replace(/-refill$/i, '');
      const primaryRow =
        (lastVisitSvcKey &&
          userRows.find((r) => String(r.service_key || '').replace(/-refill$/i, '') === lastVisitSvcKey)) ||
        userRows[0];
      const rem = Number(primaryRow.remaining_sessions) || 0;
      if (rem > 0) {
        const rawServiceName = String(primaryRow.combo_name || 'Gói Combo Mi');
        const pkgKey = String(primaryRow.package_key || '').trim();
        const displayComboName = formatComboName(rawServiceName, pkgKey);
        ctx.comboBalanceMap.set(uid, {
          isComboLive: true,
          remainingSessions: rem,
          normalRemaining: Number(primaryRow.normal_remaining) || 0,
          retainRemaining: Number(primaryRow.retain_remaining) || 0,
          comboName: displayComboName,
          serviceKey: primaryRow.service_key ? String(primaryRow.service_key) : undefined,
          packageKey: pkgKey || undefined,
          retainDaysLimit: Number(primaryRow.retain_days_limit) || 25,
          upsellOpportunity: false,
        });
      }
    }

    for (const ubr of underBalanceRows) {
      const uid = Number(ubr.user_id);
      const rem = Number(ubr.remaining_sessions) || 0;
      if (rem > 0) {
        const pkgKey = String(ubr.package_key || '').trim();
        const rawName = String(ubr.combo_name || 'Under Mink 390');
        ctx.underMinkComboMap.set(uid, {
          hasUnderCombo: true,
          remainingSessions: rem,
          normalRemaining: Number(ubr.normal_remaining) || 0,
          retainRemaining: Number(ubr.retain_remaining) || 0,
          comboName: formatComboName(rawName, pkgKey),
          packageKey: pkgKey || undefined,
        });
      }
    }
  } catch {
    // Non-blocking enrichment fallback to empty maps
  }

  return ctx;
}
