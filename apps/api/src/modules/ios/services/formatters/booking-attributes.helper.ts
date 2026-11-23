import {
  hasCompleteNaturalLashAttributes,
  IosBookingItem,
  matchComboCategoryAndVolumeFromBooking,
  NaturalLashConsultationAttributes,
} from '@mos-lab/shared';
import type { LastVisitSpecSummary, RawIosOrderSnapshot } from '../ios-bookings-sql.service.js';

export function stripNewLashLabel(value: string): string {
  return value
    .replace(
      /\b(?:New\s+)+(?=(?:Classic|Volume|Flawless|Hyper(?:light)?|Ultra(?:light)?|Ivy(?:light)?|Mink|Under)\b)/gi,
      ''
    )
    .trim();
}

export function normalizeLashMaterialLabel(value?: string): string | undefined {
  if (!value) return value;
  const cleaned = stripNewLashLabel(value);
  return /^Classic$/i.test(cleaned) ? 'Classic 1D' : cleaned;
}

export function buildCanonicalServiceNameFromSpecs(specs?: LastVisitSpecSummary, visits = 0): string {
  if (!specs?.material) {
    return visits > 1 ? 'HyperLight 4X 770' : 'Chưa chọn mẫu mi (Tư vấn)';
  }
  const matched = matchComboCategoryAndVolumeFromBooking({
    material: specs.material,
    volume: specs.volume,
    count: specs.count,
    serviceKey: specs.serviceKey,
  });
  const sku = typeof matched.volume === 'number' ? matched.volume : 770;
  switch (matched.categoryId) {
    case 'Classic_1D':
    case 'Classic_Volume':
      return `Classic 1D ${sku}`;
    case 'Volume_2D':
      return `Volume 2D ${sku}`;
    case 'Volume_3D':
      return `Volume 3D ${sku}`;
    case 'FlawlessMink':
      return `Flawless Mink ${sku}`;
    case 'HyperLight_2X':
    case 'HyperLight_3X':
    case 'HyperLight_4X':
    case 'HyperLight_5X':
      return `HyperLight ${matched.categoryId.split('_')[1]} ${sku}`;
    case 'IvyLight_3L':
    case 'IvyLight_4L':
    case 'IvyLight_5L':
      return `Ivylight ${matched.categoryId.split('_')[1]} ${sku}`;
    case 'UltraLight_3D':
    case 'UltraLight_4D':
    case 'UltraLight_5D':
      return `UltraLight ${matched.categoryId.split('_')[1]} ${sku}`;
    default:
      return visits > 1 ? `HyperLight 4X ${sku}` : 'Chưa chọn mẫu mi (Tư vấn)';
  }
}

export function hydrateSavedNaturalLashAttributes(
  attrs: IosBookingItem['attributes'],
  savedProfile?: NaturalLashConsultationAttributes
): IosBookingItem['attributes'] {
  if (!attrs || !savedProfile) return attrs;
  if (attrs.isNewClientDiagnosticDone === false) return attrs;
  if (hasCompleteNaturalLashAttributes(attrs)) return attrs;
  return {
    ...savedProfile,
    ...attrs,
    naturalLashLength: attrs.naturalLashLength || savedProfile.naturalLashLength,
    naturalLashThickness: attrs.naturalLashThickness || savedProfile.naturalLashThickness,
    naturalLashCount: attrs.naturalLashCount || savedProfile.naturalLashCount,
    naturalLashDensity: attrs.naturalLashDensity || savedProfile.naturalLashDensity,
    lashTrail: attrs.lashTrail || savedProfile.lashTrail,
    eyeShape: attrs.eyeShape || savedProfile.eyeShape,
    lashHealth: attrs.lashHealth || savedProfile.lashHealth,
    medicalProblem: attrs.medicalProblem || savedProfile.medicalProblem,
    isNewClientDiagnosticDone: true,
  };
}

/**
 * Chuẩn hóa giá dịch vụ niêm yết gốc (gross) trước khuyến mãi để tránh giảm trùng 2 lần (double-discount)
 * và tránh dò sai size gói Combo khi `order.total_price` đã bị trừ sẵn mã 50% từ lúc đặt lịch.
 */
export function resolveCanonicalBookedServicePrice(
  r: Pick<
    RawIosOrderSnapshot,
    | 'os_service_price'
    | 'os_discount_amount'
    | 'catalog_single_price'
    | 'total_price'
    | 'is_temporary'
    | 'promotion_id'
    | 'os_promotion_id'
  >,
  overrideServicePrice?: unknown
): number {
  const explicitOverride = Number(overrideServicePrice);
  if (Number.isFinite(explicitOverride) && explicitOverride > 0) return explicitOverride;
  const osGross = Number(r.os_service_price);
  if (Number.isFinite(osGross) && osGross > 0) return osGross;
  const catalogSingle = Number(r.catalog_single_price);
  if (Number(r.is_temporary) !== 1 && Number.isFinite(catalogSingle) && catalogSingle > 0) {
    return catalogSingle;
  }
  const totalPrice = Number(r.total_price) || 0;
  const osDiscount = Number(r.os_discount_amount) || 0;
  const hasLegacyPromo = Boolean(
    (r.promotion_id && Number(r.promotion_id) > 0) || (r.os_promotion_id && Number(r.os_promotion_id) > 0)
  );
  if (hasLegacyPromo && osDiscount > 0 && totalPrice >= 0 && totalPrice + osDiscount > 0) {
    return totalPrice + osDiscount;
  }
  return totalPrice > 0 ? totalPrice : 550000;
}

export function buildDefaultLiveOrderAttributes(params: {
  isFirstVisitClient: boolean;
  savedProfile?: NaturalLashConsultationAttributes;
  isRawOrderPlaceholder: boolean;
  lastSpecs?: {
    material?: string;
    volume?: string;
    count?: string;
    style?: string;
    color?: string;
    serviceKey?: string;
  };
  actualSpecs?: {
    volume?: string;
    count?: string;
    style?: string;
    color?: string;
    hasUnderMink?: boolean;
    underMinkServiceType?: 'Normal' | 'Retain';
  };
  effectiveServiceName: string;
  serviceKey?: string | null;
  servicePrice: number;
  note?: string;
  normalizeLashMaterialLabel: (value?: string) => string | undefined;
}): IosBookingItem['attributes'] {
  const {
    isFirstVisitClient,
    savedProfile,
    isRawOrderPlaceholder,
    lastSpecs,
    actualSpecs,
    effectiveServiceName,
    serviceKey,
    servicePrice,
    note,
    normalizeLashMaterialLabel: normalizeMaterial,
  } = params;

  const matchedSpec = matchComboCategoryAndVolumeFromBooking({
    material: isRawOrderPlaceholder ? lastSpecs?.material : undefined,
    volume: actualSpecs?.volume || (isRawOrderPlaceholder ? lastSpecs?.volume : undefined),
    count: actualSpecs?.count || (isRawOrderPlaceholder ? lastSpecs?.count : undefined),
    serviceName: effectiveServiceName,
    serviceKey: !isRawOrderPlaceholder ? serviceKey || undefined : lastSpecs?.serviceKey,
    servicePrice: !isRawOrderPlaceholder ? servicePrice : undefined,
  });
  const catId = matchedSpec.categoryId;
  const defaultMat =
    catId === 'Classic_1D' || catId === 'Classic_Volume'
      ? 'Classic 1D'
      : catId === 'Volume_2D' || catId === 'Volume_3D'
        ? 'Volume'
        : catId.startsWith('HyperLight')
          ? 'HyperLight'
          : catId.startsWith('IvyLight')
            ? 'Ivylight'
            : catId.startsWith('UltraLight')
              ? 'UltraLight'
              : 'Flawless Mink';
  const defaultVol =
    defaultMat === 'Classic 1D' || defaultMat === 'Flawless Mink'
      ? '1D'
      : catId === 'Volume_3D'
        ? '3D'
        : catId === 'Volume_2D'
          ? '2D'
          : catId.includes('_')
            ? catId.split('_')[1]
            : '4X';
  const unit =
    defaultMat === 'Classic 1D' || defaultMat === 'Flawless Mink' ? 'sợi' : defaultMat === 'Ivylight' ? 'nhịp' : 'fan';
  const fallbackCountPerEye =
    defaultMat === 'Classic 1D' || defaultMat === 'Ivylight'
      ? 90
      : defaultMat === 'Flawless Mink'
        ? 60
        : defaultMat === 'UltraLight' || defaultMat === 'Volume'
          ? 80
          : 70;
  const resolvedCountPerEye =
    matchedSpec.volume !== 'under' && matchedSpec.volumeMeta?.countPerEye
      ? matchedSpec.volumeMeta.countPerEye
      : fallbackCountPerEye;
  const defaultCount = `${resolvedCountPerEye} ${unit}`;
  const normalizedLastMaterial = normalizeMaterial(lastSpecs?.material);
  const canInheritLastSpecs = isRawOrderPlaceholder || normalizedLastMaterial === defaultMat;

  return {
    material: canInheritLastSpecs ? normalizedLastMaterial || defaultMat : defaultMat,
    style: actualSpecs?.style || lastSpecs?.style || 'Natural',
    volume: actualSpecs?.volume || (canInheritLastSpecs ? lastSpecs?.volume || defaultVol : defaultVol),
    count: actualSpecs?.count || (canInheritLastSpecs ? lastSpecs?.count || defaultCount : defaultCount),
    color: actualSpecs?.color || lastSpecs?.color,
    hasUnderMink: actualSpecs?.hasUnderMink,
    underMinkServiceType: actualSpecs?.underMinkServiceType,
    curl: 'C',
    length: '10-12 mm',
    thickness: defaultMat === 'Flawless Mink' ? '0.07 mm' : '0.10 mm',
    isNewClientDiagnosticDone: savedProfile ? true : isFirstVisitClient ? false : undefined,
    notes: note || '',
  };
}
