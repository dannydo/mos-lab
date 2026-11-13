import mysql from 'mysql2/promise';
import {
  evaluateComboWalletStatus,
  formatComboName,
  getVietnamDateYmd,
  IosBookingItem,
  IosCustomerComboWalletItem,
  LashHistoryItem,
  matchComboCategoryAndVolumeFromBooking,
} from '@mos-lab/shared';

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
  comboWalletsMap: Map<number, IosCustomerComboWalletItem[]>;
  diamondBalanceMap: Map<number, number>;
  lashHistoryMap: Map<number, LashHistoryItem[]>;
  lastVisitSpecsMap: Map<number, LastVisitSpecSummary>;
}

export function createEmptyCustomerEnrichmentContext(): IosCustomerEnrichmentContext {
  return {
    comboBalanceMap: new Map(),
    underMinkComboMap: new Map(),
    comboWalletsMap: new Map(),
    diamondBalanceMap: new Map(),
    lashHistoryMap: new Map(),
    lastVisitSpecsMap: new Map(),
  };
}

export interface RawComboBalanceRowInput {
  id?: number | null;
  user_id: number;
  remaining_sessions?: number | null;
  normal_remaining?: number | null;
  retain_remaining?: number | null;
  combo_name?: string | null;
  service_key?: string | null;
  package_key?: string | null;
  retain_days_limit?: number | null;
  expiry_after_day?: number | null;
  date_expired?: Date | string | null;
  note?: string | null;
}

export function buildWalletItemFromBalanceRow(
  row: RawComboBalanceRowInput,
  serviceGroup: 'upper' | 'under',
  todayYmd: string
): IosCustomerComboWalletItem | null {
  const normalRemaining = Math.max(0, Number(row.normal_remaining) || 0);
  const retainRemaining = Math.max(0, Number(row.retain_remaining) || 0);
  const remainingSessions =
    row.remaining_sessions !== undefined && row.remaining_sessions !== null
      ? Math.max(0, Number(row.remaining_sessions))
      : normalRemaining + retainRemaining;

  if (remainingSessions <= 0) return null;

  const pkgKey = String(row.package_key || '').trim();
  const fallbackName = serviceGroup === 'under' ? 'Under Mink 390' : 'Gói Combo Mi';
  const rawServiceName = String(row.combo_name || fallbackName);
  const comboName = formatComboName(rawServiceName, pkgKey);

  const status = evaluateComboWalletStatus({
    normalRemaining,
    retainRemaining,
    remainingSessions,
    dateExpired: row.date_expired,
    todayYmd,
  });

  return {
    balanceId: Number(row.id) || 0,
    serviceGroup,
    comboName,
    serviceKey: row.service_key ? String(row.service_key) : undefined,
    packageKey: pkgKey || undefined,
    normalRemaining,
    retainRemaining,
    remainingSessions,
    dateExpired: status.dateExpired,
    isFrozen: status.isFrozen,
    isExpired: status.isExpired,
    isExpiringSoon: status.isExpiringSoon,
    daysRemaining: status.daysRemaining,
    avgDaysPerSession: status.avgDaysPerSession,
    expiryState: status.expiryState,
    retainDaysLimit: Number(row.retain_days_limit) || 25,
    expiryAfterDay: row.expiry_after_day ? Number(row.expiry_after_day) : undefined,
    note: row.note ? String(row.note) : undefined,
  };
}

export function isUnderMinkComboDescriptor(comboName?: string | null, serviceKey?: string | null): boolean {
  const combined = `${comboName || ''} ${serviceKey || ''}`.toLowerCase();
  return (
    combined.includes('under') ||
    combined.includes('mi dưới') ||
    combined.includes('flawless.mink-390') ||
    combined.includes('flawless-mink-390')
  );
}

export function enrichCustomerComboMapsFromRows(params: {
  ctx: IosCustomerEnrichmentContext;
  upperRows: RawComboBalanceRowInput[];
  underRows: RawComboBalanceRowInput[];
  todayYmd?: string;
}): void {
  const { ctx, upperRows, underRows } = params;
  const todayYmd = params.todayYmd || getVietnamDateYmd();

  const normalizedUpperRows: RawComboBalanceRowInput[] = [];
  const normalizedUnderRows: RawComboBalanceRowInput[] = [...underRows];
  for (const row of upperRows) {
    if (isUnderMinkComboDescriptor(row.combo_name, row.service_key)) {
      normalizedUnderRows.push(row);
    } else {
      normalizedUpperRows.push(row);
    }
  }

  const upperWalletsByUser = new Map<number, IosCustomerComboWalletItem[]>();
  for (const row of normalizedUpperRows) {
    const uid = Number(row.user_id);
    if (!uid) continue;
    const wallet = buildWalletItemFromBalanceRow(row, 'upper', todayYmd);
    if (!wallet) continue;
    const list = upperWalletsByUser.get(uid) || [];
    list.push(wallet);
    upperWalletsByUser.set(uid, list);

    const allWallets = ctx.comboWalletsMap.get(uid) || [];
    allWallets.push(wallet);
    ctx.comboWalletsMap.set(uid, allWallets);
  }

  for (const [uid, wallets] of upperWalletsByUser.entries()) {
    const lastVisitSvcKey = (ctx.lastVisitSpecsMap.get(uid)?.serviceKey || '').replace(/-refill$/i, '');
    const liveWallets = wallets.filter((w) => !w.isExpired);
    const poolToPick = liveWallets.length > 0 ? liveWallets : wallets;

    const primary =
      (lastVisitSvcKey &&
        poolToPick.find((w) => String(w.serviceKey || '').replace(/-refill$/i, '') === lastVisitSvcKey)) ||
      poolToPick[0];

    if (!primary) continue;
    const isComboLive = !primary.isExpired && primary.remainingSessions > 0;
    const upsellOpportunity =
      !isComboLive || primary.remainingSessions <= 2 || primary.isExpiringSoon || primary.isExpired;

    ctx.comboBalanceMap.set(uid, {
      balanceId: primary.balanceId,
      isComboLive,
      remainingSessions: primary.remainingSessions,
      normalRemaining: primary.normalRemaining,
      retainRemaining: primary.retainRemaining,
      comboName: primary.comboName,
      serviceKey: primary.serviceKey,
      packageKey: primary.packageKey,
      retainDaysLimit: primary.retainDaysLimit ?? 25,
      upsellOpportunity,
      dateExpired: primary.dateExpired,
      isExpired: primary.isExpired,
      isFrozen: primary.isFrozen,
      isExpiringSoon: primary.isExpiringSoon,
      daysRemaining: primary.daysRemaining,
      avgDaysPerSession: primary.avgDaysPerSession,
      expiryState: primary.expiryState,
    });
  }

  const underWalletsByUser = new Map<number, IosCustomerComboWalletItem[]>();
  for (const row of normalizedUnderRows) {
    const uid = Number(row.user_id);
    if (!uid) continue;
    const wallet = buildWalletItemFromBalanceRow(row, 'under', todayYmd);
    if (!wallet) continue;
    const list = underWalletsByUser.get(uid) || [];
    list.push(wallet);
    underWalletsByUser.set(uid, list);

    const allWallets = ctx.comboWalletsMap.get(uid) || [];
    allWallets.push(wallet);
    ctx.comboWalletsMap.set(uid, allWallets);
  }

  for (const [uid, wallets] of underWalletsByUser.entries()) {
    const liveWallets = wallets.filter((w) => !w.isExpired);
    if (liveWallets.length > 0) {
      const primary = liveWallets[0];
      const totalNormal = liveWallets.reduce((sum, w) => sum + w.normalRemaining, 0);
      const totalRetain = liveWallets.reduce((sum, w) => sum + w.retainRemaining, 0);
      const totalRem = totalNormal + totalRetain;
      const anyFrozen = liveWallets.some((w) => w.isFrozen);
      const latestDate = anyFrozen
        ? null
        : liveWallets
            .map((w) => w.dateExpired)
            .filter((d): d is string => Boolean(d))
            .sort()
            .at(-1) || primary.dateExpired;
      const evaluated = evaluateComboWalletStatus({
        normalRemaining: totalNormal,
        retainRemaining: totalRetain,
        remainingSessions: totalRem,
        dateExpired: anyFrozen ? null : latestDate,
        todayYmd,
      });

      ctx.underMinkComboMap.set(uid, {
        balanceId: primary.balanceId,
        hasUnderCombo: evaluated.isComboLive,
        remainingSessions: totalRem,
        normalRemaining: totalNormal,
        retainRemaining: totalRetain,
        comboName: primary.comboName,
        packageKey: primary.packageKey,
        dateExpired: evaluated.dateExpired,
        isExpired: evaluated.isExpired,
        isFrozen: evaluated.isFrozen,
        isExpiringSoon: evaluated.isExpiringSoon,
        daysRemaining: evaluated.daysRemaining,
        avgDaysPerSession: evaluated.avgDaysPerSession,
        expiryState: evaluated.expiryState,
      });
    } else if (wallets.length > 0) {
      const expiredPrimary = wallets[0];
      const totalNormal = wallets.reduce((sum, w) => sum + w.normalRemaining, 0);
      const totalRetain = wallets.reduce((sum, w) => sum + w.retainRemaining, 0);
      ctx.underMinkComboMap.set(uid, {
        balanceId: expiredPrimary.balanceId,
        hasUnderCombo: false,
        remainingSessions: totalNormal + totalRetain,
        normalRemaining: totalNormal,
        retainRemaining: totalRetain,
        comboName: expiredPrimary.comboName,
        packageKey: expiredPrimary.packageKey,
        dateExpired: expiredPrimary.dateExpired,
        isExpired: true,
        isFrozen: false,
        isExpiringSoon: false,
        daysRemaining: expiredPrimary.daysRemaining,
        avgDaysPerSession: null,
        expiryState: 'EXPIRED',
      });
    }
  }
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
         h.user_id,
         h.os_id,
         h.visit_date,
         h.service_key,
         h.service_name,
         h.staff_name,
         h.ro_attr_volume
       FROM (
         SELECT
           o.user_id,
           os.id AS os_id,
           o.booking_date_start AS sort_dt,
           DATE_FORMAT(o.booking_date_start, '%d/%m/%Y') AS visit_date,
           s.service_key,
           COALESCE(sl.service_name, s.service_key, 'Nối mi') AS service_name,
           COALESCE(up.full_name, 'Chuyên Viên') AS staff_name,
           NULL AS ro_attr_volume
         FROM \`order\` o
         JOIN order_service os ON os.order_id = o.id
         LEFT JOIN service s ON s.id = os.service_id
         LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
         LEFT JOIN user_profile up ON up.user_id = os.assigned_staff_id
         WHERE o.user_id IN (${placeholders})
           AND o.order_state = 'Completed'
         UNION ALL
         SELECT
           ro.user_id,
           ros.order_service_id AS os_id,
           ro.booking_date_start AS sort_dt,
           DATE_FORMAT(ro.booking_date_start, '%d/%m/%Y') AS visit_date,
           s.service_key,
           COALESCE(sl.service_name, s.service_key, 'Nối mi') AS service_name,
           COALESCE(up.full_name, 'Chuyên Viên') AS staff_name,
           ros.attribute_volume AS ro_attr_volume
         FROM report_order ro
         JOIN report_order_service ros ON ros.order_id = ro.order_id
         LEFT JOIN service s ON s.id = ros.service_id
         LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
         LEFT JOIN user_profile up ON up.user_id = ros.assigned_staff_id
         WHERE ro.user_id IN (${placeholders})
           AND NOT EXISTS (
             SELECT 1 FROM \`order\` o2 WHERE o2.id = ro.order_id
           )
       ) h
       ORDER BY h.sort_dt DESC, h.os_id ASC
       LIMIT 800`,
      [...customerIds, ...customerIds]
    );

    const balancePromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         usb.id,
         usb.user_id,
         (usb.normal_count + usb.retain_count) AS remaining_sessions,
         usb.normal_count AS normal_remaining,
         usb.retain_count AS retain_remaining,
         usb.date_expired,
         usb.note,
         COALESCE(sl.service_name, s.service_key, 'Gói Combo Mi') AS combo_name,
         s.service_key AS service_key,
         sp.service_price_package_key AS package_key,
         sp.retain_last_day_required AS retain_days_limit,
         sp.expiry_after_day AS expiry_after_day
       FROM user_service_balance usb
       LEFT JOIN service s ON s.id = usb.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       LEFT JOIN service_price sp ON sp.id = usb.service_price_id
       WHERE usb.user_id IN (${placeholders})
         AND (usb.normal_count > 0 OR usb.retain_count > 0)
         AND (usb.service_group IS NULL OR usb.service_group != 'LashesUnder')
         AND (s.service_type IS NULL OR s.service_type != 'LashesUnder')
         AND (s.service_key IS NULL OR (s.service_key NOT LIKE '%under%' AND s.service_key NOT LIKE '%flawless.mink-390%'))
         AND (sl.service_name IS NULL OR (sl.service_name NOT LIKE '%under%' AND sl.service_name NOT LIKE '%mi dưới%'))
       ORDER BY
         (usb.date_expired IS NULL OR DATE(usb.date_expired) >= CURDATE()) DESC,
         usb.id DESC`,
      customerIds
    );

    const underBalancePromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         usb.id,
         usb.user_id,
         (usb.normal_count + usb.retain_count) AS remaining_sessions,
         usb.normal_count AS normal_remaining,
         usb.retain_count AS retain_remaining,
         usb.date_expired,
         usb.note,
         COALESCE(sl.service_name, s.service_key, 'Under Mink 390') AS combo_name,
         s.service_key AS service_key,
         sp.service_price_package_key AS package_key,
         sp.retain_last_day_required AS retain_days_limit,
         sp.expiry_after_day AS expiry_after_day
       FROM user_service_balance usb
       LEFT JOIN service s ON s.id = usb.service_id
       LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
       LEFT JOIN service_price sp ON sp.id = usb.service_price_id
       WHERE usb.user_id IN (${placeholders})
         AND (usb.normal_count > 0 OR usb.retain_count > 0)
         AND (
           usb.service_group = 'LashesUnder'
           OR s.service_type = 'LashesUnder'
           OR s.service_key LIKE '%under%'
           OR s.service_key LIKE '%flawless.mink-390%'
           OR sl.service_name LIKE '%under%'
           OR sl.service_name LIKE '%mi dưới%'
         )
       ORDER BY
         (usb.date_expired IS NULL OR DATE(usb.date_expired) >= CURDATE()) DESC,
         usb.id DESC`,
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
      const isAnyHistory = svcKey.toLowerCase().includes('any') || svcName.toLowerCase().includes('any');
      if (!isUnder && !isAnyHistory && !ctx.lastVisitSpecsMap.has(uid) && hr.os_id) {
        const osId = Number(hr.os_id);
        const combinedLower = `${svcKey} ${svcName}`.toLowerCase();
        let mat = 'Flawless Mink';
        if (combinedLower.includes('hyperlight') || combinedLower.includes('hyper light')) mat = 'HyperLight';
        else if (combinedLower.includes('ivylight') || combinedLower.includes('ivy light')) mat = 'Ivylight';
        else if (combinedLower.includes('classic')) mat = 'New Classic';
        else if (combinedLower.includes('volume')) mat = 'Volume';
        else if (combinedLower.includes('ultralight') || combinedLower.includes('ultra light')) mat = 'UltraLight';

        const inferred = matchComboCategoryAndVolumeFromBooking({
          material: mat,
          serviceName: svcName,
          serviceKey: svcKey,
        });
        const rawRoVol = String(hr.ro_attr_volume || '')
          .trim()
          .toUpperCase();
        const roVolNormalized = /^\d+[DXL]$/.test(rawRoVol) ? rawRoVol : undefined;
        const defaultVol =
          roVolNormalized ||
          (mat === 'New Classic' || mat === 'Flawless Mink'
            ? '1D'
            : mat === 'Volume'
              ? inferred.categoryId === 'Volume_3D'
                ? '3D'
                : '2D'
              : inferred.categoryId.includes('_')
                ? inferred.categoryId.split('_')[1]
                : undefined);
        const unit = mat === 'Flawless Mink' || mat === 'New Classic' ? 'sợi' : mat === 'Ivylight' ? 'nhịp' : 'fan';
        const defaultCount =
          inferred.volumeMeta?.countPerEye && inferred.volume !== 'under'
            ? `${inferred.volumeMeta.countPerEye} ${unit}`
            : undefined;

        ctx.lastVisitSpecsMap.set(uid, {
          serviceKey: svcKey,
          material: mat,
          volume: defaultVol,
          count: defaultCount,
        });
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

    enrichCustomerComboMapsFromRows({
      ctx,
      upperRows: balanceRows as unknown as RawComboBalanceRowInput[],
      underRows: underBalanceRows as unknown as RawComboBalanceRowInput[],
      todayYmd: getVietnamDateYmd(),
    });
  } catch {
    // Non-blocking enrichment fallback to empty maps
  }

  return ctx;
}
