export type IosServicingRound = 'UPPER' | 'UNDER';

export interface IosServicingRoundSplit {
  totalMinutes: number;
  upperMinutes: number;
  underMinutes: number;
}

export function isPureUnderLashServiceName(serviceName?: string | null): boolean {
  const lower = String(serviceName || '').toLowerCase();
  return (lower.includes('mi dưới') || lower.includes('under mink') || lower.includes('under lash')) && !lower.includes('+');
}

export function bookingRequiresUnderLashRound(
  booking?: { serviceName?: string | null; attributes?: { hasUnderMink?: boolean } | null } | null
): boolean {
  if (!booking?.attributes?.hasUnderMink) return false;
  return !isPureUnderLashServiceName(booking.serviceName);
}

export function isServicingCompletedOrBeyond(
  booking?: {
    status?: string;
    orderState?: string;
    billing?: { completedAt?: string } | null;
  } | null
): boolean {
  if (!booking) return false;
  if (booking.status === 'DONE' || Boolean(booking.billing?.completedAt)) {
    return true;
  }
  const normalizedState = String(booking.orderState || '').trim();
  return (
    normalizedState === 'Service Completed' ||
    normalizedState === 'ServiceCompleted' ||
    normalizedState === 'Check-out' ||
    normalizedState === 'CheckOut' ||
    normalizedState === 'Completed'
  );
}

export function resolveActiveServicingRound(
  booking?: {
    status?: string;
    orderState?: string;
    serviceName?: string | null;
    billing?: { completedAt?: string } | null;
    attributes?: { hasUnderMink?: boolean } | null;
    progress?: {
      activeServiceRound?: IosServicingRound;
      upperCompleted?: boolean;
      underBeforePhotoUrl?: string;
      underCleanedPhotoUrl?: string;
      underAfterPhotoUrl?: string;
      underStartedAt?: string;
    } | null;
  } | null
): IosServicingRound {
  if (!bookingRequiresUnderLashRound(booking)) {
    return 'UPPER';
  }
  const progress = booking?.progress;
  if (isServicingCompletedOrBeyond(booking)) {
    return progress?.activeServiceRound === 'UNDER' || Boolean(progress?.underAfterPhotoUrl) ? 'UNDER' : 'UPPER';
  }
  if (
    progress?.activeServiceRound === 'UNDER' ||
    progress?.upperCompleted === true ||
    Boolean(
      progress?.underStartedAt ||
      progress?.underBeforePhotoUrl ||
      progress?.underCleanedPhotoUrl ||
      progress?.underAfterPhotoUrl
    )
  ) {
    return 'UNDER';
  }
  return 'UPPER';
}

export function splitUpperAndUnderTargetDuration(
  totalCommittedMinutes: number,
  hasUnderMink?: boolean,
  underMinkServiceType?: 'Normal' | 'Retain'
): IosServicingRoundSplit {
  const total = Math.max(20, Math.round(Number(totalCommittedMinutes) || 60));
  if (!hasUnderMink) {
    return { totalMinutes: total, upperMinutes: total, underMinutes: 0 };
  }
  const stdUnder = underMinkServiceType === 'Retain' ? 20 : 25;
  if (total >= stdUnder + 25) {
    return {
      totalMinutes: total,
      upperMinutes: total - stdUnder,
      underMinutes: stdUnder,
    };
  }
  const rawUnder = Math.max(15, Math.round(total * 0.3));
  const upperMinutes = Math.max(15, total - rawUnder);
  const underMinutes = total >= 30 ? total - upperMinutes : rawUnder;
  return {
    totalMinutes: total,
    upperMinutes,
    underMinutes,
  };
}

export function buildLegacyServiceProgressImageUrl(
  progressId: number,
  filename: string,
  extension: string,
  version: 'original' | 'thumbnail' = 'original',
  cdnBase: string = 'https://cdn.wingslashes.com'
): string {
  const safeId = Math.abs(Math.trunc(Number(progressId) || 0));
  const folder = safeId % 1000;
  const cleanFilename = String(filename || '').trim();
  const cleanExt =
    String(extension || 'jpg')
      .replace(/^\.+/, '')
      .toLowerCase() || 'jpg';
  const normalizedBase = String(cdnBase || 'https://cdn.wingslashes.com').replace(/\/+$/, '');
  return `${normalizedBase}/uploads/order/service-progress/${folder}/${version}/${cleanFilename}.${cleanExt}`;
}

export interface AddUnderLashRoundInput {
  currentServiceName?: string | null;
  currentServicePrice?: number | null;
  currentUpgradePrice?: number | null;
  currentServiceDuration?: number | null;
  currentCvRotationPoints?: number | null;
  alreadyHasUnderMink?: boolean;
  previousUnderMinkServiceType?: 'Normal' | 'Retain';
  isComboLive?: boolean;
  hasUnderMinkCombo?: boolean;
  underMinkServiceType: 'Normal' | 'Retain';
  underMinkCurl: 'B' | 'C';
  underMinkLength: string;
  underMinkCount: string;
  upperTargetDurationMinutes?: number | null;
  totalCommittedMinutes?: number | null;
}

export interface AddUnderLashRoundResult {
  serviceName: string;
  servicePrice: number;
  upgradePrice: number;
  underServiceCharge: number;
  underListPrice: number;
  upperTargetDurationMinutes: number;
  underTargetDurationMinutes: number;
  totalDurationMinutes: number;
  underCvPoints: number;
  cvRotationPoints?: number;
  underAttributes: {
    hasUnderMink: true;
    underMinkServiceType: 'Normal' | 'Retain';
    underMinkCurl: 'B' | 'C';
    underMinkThickness: string;
    underMinkLength: string;
    underMinkCount: string;
  };
}

export function stripUnderMinkServiceSuffix(serviceName?: string | null): string {
  return String(serviceName || '')
    .replace(/\s*\+\s*(?:mi\s*dưới(?:\s*\([^)]*\))?|(?:new\s+|retain\s+|dặm\s+)?(?:flawless\s+)?under\b[^+]*)/gi, '')
    .trim();
}

export function buildAddUnderLashRoundFields(input: AddUnderLashRoundInput): AddUnderLashRoundResult {
  const isRetain = input.underMinkServiceType === 'Retain';
  const underListPrice = isRetain ? 250_000 : 390_000;
  const underServiceCharge = input.hasUnderMinkCombo ? 0 : underListPrice;
  const baseUpperName = stripUnderMinkServiceSuffix(input.currentServiceName) || 'Dịch vụ Mi Trên';
  const underSuffix = input.hasUnderMinkCombo
    ? `Trừ Gói Mi Dưới (${isRetain ? 'Dặm' : 'Mới'} · 0đ)`
    : isRetain
      ? 'Dặm 250K'
      : 'Mới 390K';
  const serviceName = `${baseUpperName} + Mi Dưới (${underSuffix})`;

  const rawServicePrice = Math.max(0, Math.round(Number(input.currentServicePrice || 0)));
  const rawNameLower = String(input.currentServiceName || '').toLowerCase();
  const prevPaidUnder =
    input.alreadyHasUnderMink && !rawNameLower.includes('trừ gói mi dưới')
      ? input.previousUnderMinkServiceType === 'Retain' || rawNameLower.includes('dặm 250k')
        ? 250_000
        : 390_000
      : 0;
  const upperBasePrice =
    prevPaidUnder > 0 && rawServicePrice > prevPaidUnder ? rawServicePrice - prevPaidUnder : rawServicePrice;
  const servicePrice = upperBasePrice + underServiceCharge;

  const rawUpgradePrice = Math.max(0, Math.round(Number(input.currentUpgradePrice || 0)));
  const baseUpperUpgrade =
    input.isComboLive && prevPaidUnder > 0 && rawUpgradePrice >= prevPaidUnder
      ? rawUpgradePrice - prevPaidUnder
      : rawUpgradePrice;
  const upgradePrice = input.isComboLive ? baseUpperUpgrade + underServiceCharge : rawUpgradePrice;

  const upperTargetDurationMinutes = Math.max(
    25,
    Math.round(Number(input.upperTargetDurationMinutes || input.totalCommittedMinutes || input.currentServiceDuration || 60))
  );
  const underTargetDurationMinutes = isRetain ? 20 : 25;
  const totalDurationMinutes = upperTargetDurationMinutes + underTargetDurationMinutes;

  const underCvPoints = 5 + (isRetain ? 0 : 7) + 17;
  const prevUnderCvPoints = input.alreadyHasUnderMink
    ? 5 + (input.previousUnderMinkServiceType === 'Retain' ? 0 : 7) + 17
    : 0;
  const cvRotationPoints =
    typeof input.currentCvRotationPoints === 'number' && input.currentCvRotationPoints > 0
      ? Math.max(0, Math.round(input.currentCvRotationPoints - prevUnderCvPoints + underCvPoints))
      : undefined;

  return {
    serviceName,
    servicePrice,
    upgradePrice,
    underServiceCharge,
    underListPrice,
    upperTargetDurationMinutes,
    underTargetDurationMinutes,
    totalDurationMinutes,
    underCvPoints,
    ...(cvRotationPoints !== undefined ? { cvRotationPoints } : {}),
    underAttributes: {
      hasUnderMink: true,
      underMinkServiceType: input.underMinkServiceType,
      underMinkCurl: input.underMinkCurl,
      underMinkThickness: '0.10 mm',
      underMinkLength: input.underMinkLength,
      underMinkCount: input.underMinkCount,
    },
  };
}
