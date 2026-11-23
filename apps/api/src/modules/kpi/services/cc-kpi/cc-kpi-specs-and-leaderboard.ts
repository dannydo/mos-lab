import { CC_GAMIFICATION_SYSTEM_CONFIG, SafeAny, calculateWheelBonusCap } from '@mos-lab/shared';

interface BuildCcLeaderboardInput {
  selectedRecords: SafeAny[];
  monthlyRecords: SafeAny[];
  selectedDailySales: SafeAny[];
  monthlyDailySales: SafeAny[];
}

interface CcLeaderboardAccumulator {
  consultantId: number;
  displayName: string;
  avatar: string | null;
  stores: Set<string>;
  orderIds: Set<number>;
  serviceIds: Set<number>;
  totalConsultantBonus: number;
}

export function buildCcLeaderboard({
  selectedRecords,
  monthlyRecords,
  selectedDailySales,
  monthlyDailySales,
}: BuildCcLeaderboardInput): SafeAny[] {
  const selectedByStaff = new Map<number, CcLeaderboardAccumulator>();

  for (const record of selectedRecords) {
    const consultantId = Number(record.consultantId);
    if (!consultantId) continue;

    const current = selectedByStaff.get(consultantId) || {
      consultantId,
      displayName: String(record.consultantName || `CC ${consultantId}`),
      avatar: record.avatar ? String(record.avatar) : null,
      stores: new Set<string>(),
      orderIds: new Set<number>(),
      serviceIds: new Set<number>(),
      totalConsultantBonus: 0,
    };

    if (record.store) current.stores.add(String(record.store));
    if (Number(record.orderId) > 0) current.orderIds.add(Number(record.orderId));
    if (Number(record.serviceId) > 0) current.serviceIds.add(Number(record.serviceId));
    current.totalConsultantBonus += Number(record.consultantBonus) || 0;
    selectedByStaff.set(consultantId, current);
  }

  const monthlyByStaff = new Map<number, { totalWheelBonus: number; latestPoints: number; latestKey: string }>();
  for (const record of monthlyRecords) {
    const consultantId = Number(record.consultantId);
    if (!consultantId) continue;

    const current = monthlyByStaff.get(consultantId) || {
      totalWheelBonus: 0,
      latestPoints: 0,
      latestKey: '',
    };
    current.totalWheelBonus += Number(record.consultantBonus) || 0;

    const chronologicalKey = `${String(record.checkin || '')}_${String(record.serviceId || '').padStart(12, '0')}`;
    if (chronologicalKey >= current.latestKey) {
      current.latestKey = chronologicalKey;
      current.latestPoints = Math.round((Number(record.pointsAccu) || 0) * 10) / 10;
    }
    monthlyByStaff.set(consultantId, current);
  }

  const selectedSalesByStaff = new Map<number, { comboRevenue: number; comboCount: number }>();
  for (const row of selectedDailySales) {
    const consultantId = Number(row.user_id);
    if (!consultantId) continue;
    const current = selectedSalesByStaff.get(consultantId) || { comboRevenue: 0, comboCount: 0 };
    current.comboRevenue += Math.round(Number(row.combo_sales) || 0);
    current.comboCount += Number(row.combo_count) || 0;
    selectedSalesByStaff.set(consultantId, current);
  }

  const monthlyDailyBonusByStaff = new Map<number, number>();
  for (const row of monthlyDailySales) {
    const consultantId = Number(row.user_id);
    if (!consultantId) continue;
    monthlyDailyBonusByStaff.set(
      consultantId,
      (monthlyDailyBonusByStaff.get(consultantId) || 0) + Math.round(Number(row.daily_bonus) || 0)
    );
  }

  const leaderboard = Array.from(selectedByStaff.values()).map((selected) => {
    const monthly = monthlyByStaff.get(selected.consultantId) || {
      totalWheelBonus: selected.totalConsultantBonus,
      latestPoints: 0,
    };
    const selectedSales = selectedSalesByStaff.get(selected.consultantId) || { comboRevenue: 0, comboCount: 0 };
    const monthlyDailyBonus = monthlyDailyBonusByStaff.get(selected.consultantId) || 0;
    const capResult = calculateWheelBonusCap(monthlyDailyBonus, monthly.totalWheelBonus);
    const totalPointsAccu = monthly.latestPoints;
    const totalCheckins = selected.orderIds.size;

    return {
      rank: 0,
      consultantId: selected.consultantId,
      displayName: selected.displayName,
      avatar: selected.avatar,
      store: selected.stores.size === 1 ? Array.from(selected.stores)[0] : 'MOS-LAB',
      totalCheckins,
      totalServices: selected.serviceIds.size,
      comboRevenue: selectedSales.comboRevenue,
      comboCount: selectedSales.comboCount,
      totalPointsAccu,
      level: Math.floor(Math.max(0, totalPointsAccu) / CC_GAMIFICATION_SYSTEM_CONFIG.POINTS_PER_LEVEL) + 1,
      totalConsultantBonus: Math.round(selected.totalConsultantBonus),
      targetCompletionRate: Math.min(100, Math.round((totalCheckins / 200) * 100)),
      monthlyDailyBonus: capResult.monthlyDailyBonus,
      monthlyWheelBonus: capResult.rawWheelBonus,
      maxWheelBonusAllowed: capResult.maxWheelBonusAllowed,
      wheelCapPercent: capResult.wheelCapPercent,
      capStatus: capResult.capStatus,
    };
  });

  leaderboard.sort(
    (a, b) =>
      b.totalPointsAccu - a.totalPointsAccu ||
      b.totalConsultantBonus - a.totalConsultantBonus ||
      b.totalCheckins - a.totalCheckins ||
      a.displayName.localeCompare(b.displayName, 'vi') ||
      a.consultantId - b.consultantId
  );
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return leaderboard;
}

export function parseServiceSpecs(
  serviceName: string,
  serviceKey?: string,
  durationMinute?: number,
  rawServiceType?: string,
  realAttrMap?: Map<number, number>,
  cvBenchmarkList: SafeAny[] = [],
  serviceId?: number
) {
  const sLower = (serviceName || '').toLowerCase();
  const kLower = (serviceKey || '').toLowerCase();
  const combined = `${kLower} ${sLower}`;

  let className = 'classic-440';
  let classPts = 0;
  if (combined.includes('flawless-1110') || combined.includes('flawless 1110')) {
    className = 'flawless-1110';
    classPts = 5;
  } else if (combined.includes('flawless-880') || combined.includes('flawless 880')) {
    className = 'flawless-880';
    classPts = 5;
  } else if (combined.includes('flawless-770') || combined.includes('flawless 770')) {
    className = 'flawless-770';
    classPts = 5;
  } else if (combined.includes('flawless-390') || combined.includes('flawless 390')) {
    className = 'flawless-390';
    classPts = 5;
  } else if (combined.includes('hyperlight-990') || combined.includes('hyperlight 990')) {
    className = 'hyperlight-990';
    classPts = 4;
  } else if (combined.includes('classic-440') || combined.includes('classic 440')) {
    className = 'classic-440';
    classPts = 0;
  }

  let fan = '3D';
  let fanPts = 1;
  if (combined.includes('5d')) {
    fan = '5D';
    fanPts = 3;
  } else if (combined.includes('4d')) {
    fan = '4D';
    fanPts = 2;
  } else if (combined.includes('3d')) {
    fan = '3D';
    fanPts = 1;
  }

  let serviceType: 'Refill' | 'Retain' | 'New Set';
  let typePts: number;
  if (
    combined.includes('refill') ||
    combined.includes('dặm') ||
    combined.includes('dam') ||
    rawServiceType === 'Retain'
  ) {
    serviceType = 'Refill';
    typePts = 0;
  } else {
    serviceType = 'New Set';
    typePts = 1;
  }

  // Determine Lash Style for benchmark lookup
  let lashStyle = 'Classic';
  if (combined.includes('ivylight')) lashStyle = 'Ivylight';
  else if (combined.includes('flawless')) lashStyle = 'Flawless';
  else if (combined.includes('mink')) lashStyle = 'Mink';
  else if (combined.includes('hyperlight')) lashStyle = 'Hyperlight';
  else if (combined.includes('ultralight') || combined.includes('ultra light')) lashStyle = 'Ultralight';
  else if (combined.includes('volume')) lashStyle = 'Volume 3D';
  else if (combined.includes('under')) lashStyle = 'Under Mink';

  // Resolve real lash count from Single Source of Truth
  let lashCount = 100;
  let resolvedFromRealData = false;

  // Source 1: Real DB item_attribute_value
  if (serviceId && realAttrMap && realAttrMap.has(serviceId)) {
    lashCount = realAttrMap.get(serviceId)!;
    resolvedFromRealData = true;
  }
  // Source 2: CV Xoay Speed Model Benchmarks matching
  else if (cvBenchmarkList && cvBenchmarkList.length > 0 && durationMinute && durationMinute > 0) {
    const normType = rawServiceType === 'Retain' || serviceType === 'Refill' ? 'Retain' : 'Normal';
    const matchedBm = cvBenchmarkList.find(
      (b: SafeAny) =>
        (b.lashStyle === lashStyle ||
          (b.lashStyle === 'Mink' && lashStyle === 'Flawless') ||
          (b.lashStyle === 'Volume 3D' && lashStyle === 'Volume')) &&
        b.serviceType === normType &&
        b.lashCount !== null &&
        Math.abs(b.benchmarkMinutes - durationMinute) <= 5
    );
    if (matchedBm && matchedBm.lashCount) {
      lashCount = matchedBm.lashCount;
      resolvedFromRealData = true;
    }
  }

  // Source 3: Explicit name regex ("100 sợi")
  if (!resolvedFromRealData) {
    const countMatch = combined.match(/(\d+)\s*(sợi|soi|lashes)/);
    if (countMatch) {
      lashCount = parseInt(countMatch[1], 10);
    }
  }

  let lashPts = 0;
  if (lashCount >= 160) lashPts = 3;
  else if (lashCount >= 140) lashPts = 2;
  else if (lashCount >= 120) lashPts = 1;

  let design = 'Tự nhiên';
  let designPts = 0;
  if (combined.includes('mắt mèo') || combined.includes('cat eye')) {
    design = 'Mắt Mèo';
    designPts = 1;
  } else if (combined.includes('búp bê') || combined.includes('doll eye')) {
    design = 'Búp Bê';
    designPts = 1;
  }

  let color = 'Đen';
  let colorPts = 0;
  if (combined.includes('màu') || combined.includes('nâu') || combined.includes('omber')) {
    color = 'Nâu / Thiết kế';
    colorPts = 1;
  }

  return {
    className,
    classPts,
    fan,
    fanPts,
    serviceType,
    typePts,
    lashCount,
    lashPts,
    design,
    designPts,
    color,
    colorPts,
  };
}
