export type IosServicingRound = 'UPPER' | 'UNDER';

export interface IosServicingRoundSplit {
  totalMinutes: number;
  upperMinutes: number;
  underMinutes: number;
}

export function bookingRequiresUnderLashRound(
  booking?: { attributes?: { hasUnderMink?: boolean } | null } | null
): boolean {
  return Boolean(booking?.attributes?.hasUnderMink);
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
