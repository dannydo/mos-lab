export interface RawOrderServiceMetaForBonus {
  osId: number;
  orderId: number;
  assignedStaffId?: number | null;
  serviceKey?: string | null;
  serviceName?: string | null;
  serviceType?: string | null;
  isTemporary?: number | null;
}

export interface RawOrderBonusRuleRow {
  order_service_id: number;
  user_id: number;
  bonus_amount: number;
  type: string;
  opt_key: string;
}

export interface ActualOrderLashSpecs {
  volume?: string;
  count?: string;
  style?: string;
  color?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
}

export interface OrderLedgerCvSummary {
  ledgerPoints: number;
  breakdownLabel?: string;
  actualSpecs: ActualOrderLashSpecs;
}

function isRetainLikeService(
  serviceType?: string | null,
  serviceName?: string | null,
  serviceKey?: string | null
): boolean {
  const combined = `${serviceType || ''} ${serviceName || ''} ${serviceKey || ''}`.toLowerCase();
  return combined.includes('retain') || combined.includes('dặm') || combined.includes('refill');
}

function isPlaceholderOrRemoveRow(meta: RawOrderServiceMetaForBonus): boolean {
  const key = String(meta.serviceKey || '').toLowerCase();
  const name = String(meta.serviceName || '').toLowerCase();
  return (
    Number(meta.isTemporary) === 1 ||
    key.includes('any') ||
    name.includes('any') ||
    key.includes('remove') ||
    name.includes('tháo')
  );
}

function isUnderMinkServiceRow(meta: RawOrderServiceMetaForBonus): boolean {
  const key = String(meta.serviceKey || '').toLowerCase();
  const name = String(meta.serviceName || '').toLowerCase();
  return key.includes('under') || name.includes('under') || name.includes('mi dưới');
}

function pickCanonicalUserBonusRows(
  userMap: Map<number, RawOrderBonusRuleRow[]>,
  assignedStaffId?: number | null
): RawOrderBonusRuleRow[] {
  const assignedId = Number(assignedStaffId || 0);
  if (assignedId > 0 && userMap.has(assignedId)) {
    return userMap.get(assignedId)!;
  }
  let bestUserId = -1;
  let bestSum = -Infinity;
  let bestRows: RawOrderBonusRuleRow[] = [];
  for (const [uid, rows] of userMap.entries()) {
    const sum = rows.reduce((acc, r) => acc + (Number(r.bonus_amount) || 0), 0);
    if (sum > bestSum || (sum === bestSum && uid > bestUserId)) {
      bestSum = sum;
      bestUserId = uid;
      bestRows = rows;
    }
  }
  return bestRows;
}

function extractSpecsFromBonusRows(rows: RawOrderBonusRuleRow[], svcLower: string): ActualOrderLashSpecs {
  const specs: ActualOrderLashSpecs = {};
  for (const row of rows) {
    const t = String(row.type || '');
    const k = String(row.opt_key || '')
      .trim()
      .toLowerCase();
    if (t === 'OrderServiceAttributeLashes' && /^\d+$/.test(k)) {
      const unit =
        svcLower.includes('mink') || svcLower.includes('classic') ? 'sợi' : svcLower.includes('ivy') ? 'nhịp' : 'fan';
      specs.count = `${k} ${unit}`;
    } else if (t === 'OrderServiceAttributeFan' && k) {
      const numMatch = k.match(/\d+/);
      const dNum = numMatch ? numMatch[0] : '';
      if (svcLower.includes('hyperlight')) {
        specs.volume = dNum === '1' || dNum === '2' ? '2X' : `${dNum || '4'}X`;
      } else if (svcLower.includes('ivylight')) {
        specs.volume = `${dNum || '4'}L`;
      } else if (svcLower.includes('ultralight') || svcLower.includes('volume')) {
        specs.volume = `${dNum || '4'}D`;
      } else {
        specs.volume = '1D';
      }
    } else if (t === 'OrderServiceAttributeDesign' && k) {
      if (k === 'doll') specs.style = 'Doll';
      else if (k === 'wing') specs.style = 'Wing';
      else if (k === 'kim-k') specs.style = 'Katun';
      else if (k === 'natural') specs.style = 'Natural';
    } else if (t === 'OrderServiceAttributeColor' && k) {
      if (k === 'brown' || k === 'purple' || k === 'blue') {
        specs.color = 'Nâu Tự Nhiên (Choco Brown)';
      } else if (k === 'black') {
        specs.color = 'Đen Tuyền (Jet Black)';
      }
    }
  }
  return specs;
}

export function summarizeOrderLedgerCvPoints(params: {
  orderServices: RawOrderServiceMetaForBonus[];
  bonusRows: RawOrderBonusRuleRow[];
}): Map<number, OrderLedgerCvSummary> {
  const bonusByOsAndUser = new Map<number, Map<number, RawOrderBonusRuleRow[]>>();
  for (const row of params.bonusRows) {
    const osId = Number(row.order_service_id);
    const uid = Number(row.user_id);
    if (osId <= 0 || uid <= 0) continue;
    let userMap = bonusByOsAndUser.get(osId);
    if (!userMap) {
      userMap = new Map<number, RawOrderBonusRuleRow[]>();
      bonusByOsAndUser.set(osId, userMap);
    }
    const existing = userMap.get(uid) || [];
    existing.push(row);
    userMap.set(uid, existing);
  }

  const osByOrderId = new Map<number, RawOrderServiceMetaForBonus[]>();
  for (const os of params.orderServices) {
    const oid = Number(os.orderId);
    if (oid <= 0 || isPlaceholderOrRemoveRow(os)) continue;
    const list = osByOrderId.get(oid) || [];
    list.push(os);
    osByOrderId.set(oid, list);
  }

  const result = new Map<number, OrderLedgerCvSummary>();
  for (const [orderId, osList] of osByOrderId.entries()) {
    let rawPointsSum = 0;
    let hasLedgerRows = false;
    let classPts = 0;
    let fanPts = 0;
    let typePts = 0;
    let lashPts = 0;
    let designPts = 0;
    let colorPts = 0;
    const actualSpecs: ActualOrderLashSpecs = {};

    for (const os of osList) {
      const isUnder = isUnderMinkServiceRow(os);
      if (isUnder) {
        actualSpecs.hasUnderMink = true;
        actualSpecs.underMinkServiceType = isRetainLikeService(os.serviceType, os.serviceName, os.serviceKey)
          ? 'Retain'
          : 'Normal';
      }

      const userMap = bonusByOsAndUser.get(Number(os.osId));
      if (!userMap || userMap.size === 0) continue;

      const chosenRows = pickCanonicalUserBonusRows(userMap, os.assignedStaffId);
      if (chosenRows.length === 0) continue;
      hasLedgerRows = true;

      for (const row of chosenRows) {
        const amt = Number(row.bonus_amount) || 0;
        rawPointsSum += amt;
        if (row.type === 'OrderServiceClass') classPts += amt;
        else if (row.type === 'OrderServiceAttributeFan') fanPts += amt;
        else if (row.type === 'OrderServiceType') typePts += amt;
        else if (row.type === 'OrderServiceAttributeLashes') lashPts += amt;
        else if (row.type === 'OrderServiceAttributeDesign') designPts += amt;
        else if (row.type === 'OrderServiceAttributeColor') colorPts += amt;
      }

      if (!isUnder) {
        const svcLower = `${os.serviceKey || ''} ${os.serviceName || ''}`.toLowerCase();
        const extracted = extractSpecsFromBonusRows(chosenRows, svcLower);
        if (extracted.volume) actualSpecs.volume = extracted.volume;
        if (extracted.count) actualSpecs.count = extracted.count;
        if (extracted.style) actualSpecs.style = extracted.style;
        if (extracted.color) actualSpecs.color = extracted.color;
      }
    }

    const ledgerPoints = hasLedgerRows ? Math.round(rawPointsSum) : 0;
    const colorSuffix = Math.round(colorPts) > 0 ? ` · Color +${Math.round(colorPts)}` : '';
    const breakdownLabel = hasLedgerRows
      ? `Class +${Math.round(classPts)} · Fan +${Math.round(fanPts)} · Type +${Math.round(typePts)} · Lash +${Math.round(lashPts)} · Design +${Math.round(designPts)}${colorSuffix}`
      : undefined;

    result.set(orderId, { ledgerPoints, breakdownLabel, actualSpecs });
  }

  return result;
}

type MaterialCode =
  'UNDER_MINK' | 'IVYLIGHT' | 'FLAWLESS_MINK' | 'HYPERLIGHT' | 'ULTRALIGHT' | 'NEW_VOLUME' | 'NEW_CLASSIC';

function resolveBackendMaterialCode(material?: string, serviceName?: string): MaterialCode {
  const matRaw = String(material || '')
    .trim()
    .toLowerCase();
  const svcRaw = String(serviceName || '')
    .trim()
    .toLowerCase();
  const s = matRaw || svcRaw;
  if (!s) return 'HYPERLIGHT';
  if (s.includes('under') || s.includes('mi dưới')) return 'UNDER_MINK';
  if (s.includes('ivy')) return 'IVYLIGHT';
  if (s.includes('mink') || s.includes('flawless')) return 'FLAWLESS_MINK';
  if (s.includes('hyper')) return 'HYPERLIGHT';
  if (s.includes('ultra')) return 'ULTRALIGHT';
  if (s.includes('volume')) return 'NEW_VOLUME';
  if (s.includes('classic')) return 'NEW_CLASSIC';
  return 'HYPERLIGHT';
}

export function computeCanonicalCvRotationPoints(params: {
  material?: string;
  volume?: string;
  count?: string;
  serviceType?: string;
  serviceName?: string;
  style?: string;
  color?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
}): { totalPoints: number; breakdownLabel: string } {
  const code = resolveBackendMaterialCode(params.material, params.serviceName);
  const classPts =
    code === 'IVYLIGHT' ? 20 : code === 'FLAWLESS_MINK' || code === 'UNDER_MINK' ? 5 : code === 'NEW_CLASSIC' ? 0 : 3;
  const alwaysFullSet = code === 'FLAWLESS_MINK' || code === 'IVYLIGHT';

  const v = String(params.volume || '')
    .toUpperCase()
    .trim();
  let fanPts = 0;
  if (code !== 'NEW_CLASSIC' && code !== 'UNDER_MINK') {
    if (v.includes('5')) fanPts = 3;
    else if (v.includes('4')) fanPts = 2;
    else if (v.includes('3') || v.includes('2X')) fanPts = 1;
  }

  const defaultCount =
    code === 'NEW_CLASSIC' || code === 'IVYLIGHT' ? 90 : code === 'ULTRALIGHT' || code === 'NEW_VOLUME' ? 80 : 70;
  const numMatch = String(params.count || '').match(/\d+/);
  const countNum = numMatch ? Number(numMatch[0]) : defaultCount;
  const lashPts =
    code === 'UNDER_MINK' || countNum <= 50
      ? 17
      : countNum <= 60
        ? 20
        : countNum <= 70
          ? 23
          : countNum <= 80
            ? 26
            : countNum <= 90
              ? 29
              : countNum <= 100
                ? 32
                : countNum <= 110
                  ? 35
                  : countNum <= 120
                    ? 38
                    : 41;

  const stLower = `${params.serviceType || ''} ${params.serviceName || ''}`.toLowerCase();
  const typePts =
    stLower.includes('fix') || stLower.includes('adjust')
      ? 15
      : alwaysFullSet
        ? 7
        : stLower.includes('retain') || stLower.includes('dặm') || stLower.includes('refill')
          ? 0
          : 7;

  const dLower = String(params.style || '').toLowerCase();
  const designPts =
    dLower.includes('doll') || dLower.includes('búp bê')
      ? 7
      : dLower.includes('wing')
        ? 6
        : dLower.includes('kim') ||
            dLower.includes('katun') ||
            dLower.includes('anime') ||
            dLower.includes('wispy') ||
            dLower.includes('wet') ||
            dLower.includes('thiết kế')
          ? 5
          : 0;

  const cLower = String(params.color || '').toLowerCase();
  const colorPts =
    cLower &&
    cLower !== 'black' &&
    !cLower.includes('đen tuyền') &&
    !cLower.includes('jet black') &&
    (cLower.includes('brown') ||
      cLower.includes('nâu') ||
      cLower.includes('blue') ||
      cLower.includes('xanh') ||
      cLower.includes('purple') ||
      cLower.includes('tím') ||
      cLower.includes('color') ||
      cLower.includes('màu') ||
      cLower.includes('highlight') ||
      cLower.includes('ombre'))
      ? 5
      : 0;

  const upperPts = classPts + fanPts + typePts + lashPts + designPts + colorPts;
  const upperLabel = `Class +${classPts} · Fan +${fanPts} · Type +${typePts} · Lash +${lashPts} · Design +${designPts}${colorPts > 0 ? ` · Color +${colorPts}` : ''}`;

  if (params.hasUnderMink && code !== 'UNDER_MINK') {
    const isUnderRetain = params.underMinkServiceType === 'Retain';
    const underTypePts = isUnderRetain ? 0 : 7;
    const underPts = 5 + underTypePts + 17;
    const totalPoints = upperPts + underPts;
    return {
      totalPoints,
      breakdownLabel: `Bộ 1 Mi Trên: +${upperPts}p (${upperLabel}) | Bộ 2 Mi Dưới (${isUnderRetain ? 'Dặm' : 'Mới'}): +${underPts}p (Class +5 · Type +${underTypePts} · Lash +17)`,
    };
  }

  return { totalPoints: upperPts, breakdownLabel: upperLabel };
}

export function resolveBookingCvRotationPointsBackend(b: {
  cvRotationPoints?: number;
  serviceName?: string;
  serviceType?: string;
  attributes?: {
    material?: string;
    volume?: string;
    count?: string;
    style?: string;
    color?: string;
    hasUnderMink?: boolean;
    underMinkServiceType?: 'Normal' | 'Retain';
  };
}): number {
  if (typeof b.cvRotationPoints === 'number' && Number.isFinite(b.cvRotationPoints) && b.cvRotationPoints > 0) {
    return Math.round(b.cvRotationPoints);
  }
  return computeCanonicalCvRotationPoints({
    material: b.attributes?.material,
    volume: b.attributes?.volume,
    count: b.attributes?.count,
    serviceType: b.serviceType,
    serviceName: b.serviceName,
    style: b.attributes?.style,
    color: b.attributes?.color,
    hasUnderMink: b.attributes?.hasUnderMink,
    underMinkServiceType: b.attributes?.underMinkServiceType,
  }).totalPoints;
}
