import type {
  VolumeFiberMetadata,
  WelcomeComboEligibilityResult,
  WingsComboCategory,
  WingsComboCategoryId,
  WingsComboRule,
} from './types.js';
import { getWingsComboCategory } from './data/index.js';
import { getVolumeFiberMeta, VOLUME_FIBER_MAP } from './fiber.js';

export function formatReadableComboContent(
  rule: Pick<WingsComboRule, 'comboNewCount' | 'comboRefillCount' | 'bonusNewCount' | 'bonusRefillCount' | 'content'>,
  bonusRetailValue?: number
): string {
  const paidParts: string[] = [];
  if (rule.comboNewCount > 0) paidParts.push(`${rule.comboNewCount} Nối mới`);
  if (rule.comboRefillCount > 0) paidParts.push(`${rule.comboRefillCount} Dặm`);

  const bonusParts: string[] = [];
  if (rule.bonusNewCount > 0) bonusParts.push(`${rule.bonusNewCount} Nối mới`);
  if (rule.bonusRefillCount > 0) bonusParts.push(`${rule.bonusRefillCount} Dặm`);

  if (paidParts.length > 0 || bonusParts.length > 0) {
    let bonusText = '';
    if (bonusParts.length > 0) {
      const valStr =
        bonusRetailValue && bonusRetailValue > 0 ? ` (Trị giá ${bonusRetailValue.toLocaleString('vi-VN')}đ)` : '';
      bonusText = `Tặng ${bonusParts.join(' + ')}${valStr}`;
    }
    return [paidParts.length ? `Mua ${paidParts.join(' + ')}` : '', bonusText].filter(Boolean).join(' · ');
  }
  return rule.content || 'Gói 20 lần VIP dùng chung bạn bè & người thân';
}

/**
 * Chuẩn hóa tên combo hiển thị theo quy chuẩn Kinh Thánh mOS:
 * Hàng 1: ❖ <Tên dòng mi> <Mức giá> <Tỷ lệ Mua+Tặng>
 * Ví dụ:
 * - "10+6-volume-550" + "Volume 550" -> "❖ Volume 550 10+6"
 * - "10+10-flawless-mink-990" + "Flawless Mink 990" -> "❖ Flawless Mink 990 10+10"
 * - "4+1-hyperlight-770" + "HyperLight 770" -> "❖ HyperLight 770 4+1"
 * - "7+3-flawless-mink-880" + "Flawless Mink 880" -> "❖ Flawless Mink 880 7+3"
 * - "7+3-ivylight-1220" + "Ivylight 4L 1220" -> "❖ Ivylight 1220 7+3"
 */
export function formatComboName(name?: string, packageKey?: string): string {
  if (!name && !packageKey) return '';
  const str = String(name || '').trim();

  // 1. Trích xuất tỷ lệ mua+tặng (10+6, 10+10, 7+3, 4+1, 5+2, 5 lần, ...) từ packageKey hoặc name
  const textToScan = `${packageKey || ''} ${str}`;
  const ratioMatch = textToScan.match(/\b(\d+\+\d+)\b/) || textToScan.match(/\b(\d+\s*lần)\b/i);
  const ratio = ratioMatch ? ratioMatch[1].replace(/\s+/g, ' ') : '';

  // 2. Chuẩn hóa tên dòng mi:
  let cleanName = str
    .replace(/^Combo\s+/i, '')
    .replace(/^❖\s*/i, '')
    // Bỏ phần slug database trong ngoặc đơn "(10+6-volume-550) · "
    .replace(/\([^)]*(\d+\+\d+|\d+\s*lần|volume|mink|hyper|ivy|classic|under)[^)]*\)\s*·?\s*/gi, '')
    // Bỏ thông số fan/sợi trong ngoặc ở cuối "(70 sợi)", "(4X · 70 fan)", "(90 nhịp)"
    .replace(/\s*\([^)]*\)$/, '')
    .trim();

  // Bỏ các từ đếm số buổi như "5 lần", "10 lần" hoặc "7+3" nếu đang dính trong cleanName
  cleanName = cleanName.replace(/\b\d+\s*lần\b/gi, '').trim();
  cleanName = cleanName.replace(/\b\d+\+\d+\b/g, '').trim();

  // Bỏ từ "New " hoặc "Gói " (kể cả lặp "New New Classic...") theo chuẩn danh mục mới: "Volume 550" -> "Volume 550"
  cleanName = cleanName
    .replace(/^(?:(?:New|Gói)\s+)+/i, '')
    .replace(
      /\b(?:New\s+)+(?=(?:Classic|Volume|Flawless|Hyper(?:light)?|Ultra(?:light)?|Ivy(?:light)?|Mink|Under)\b)/gi,
      ''
    )
    .trim();
  cleanName = cleanName.replace(/\s{2,}/g, ' ');

  // Ghép lại chuẩn: ❖ <Tên dòng mi> <Tỷ lệ>
  const finalTitle = [cleanName, ratio].filter(Boolean).join(' ');
  return finalTitle ? `❖ ${finalTitle}` : '❖ Gói Đang Active';
}

/**
 * Kiểm tra điều kiện mua gói Welcome (2 tặng 1):
 * Quy tắc bất biến: Chỉ áp dụng duy nhất trong ngày đầu tiên khách sử dụng dịch vụ tại Wings.
 * Qua ngày hôm sau (hoặc khách đã có lịch sử nối mi từ các ngày trước / customerVisits > 1) thì khóa gói 2 tặng 1.
 */
export function checkWelcomeComboEligibility(input?: {
  customerVisits?: number;
  lashHistoryDates?: string[];
  todayDateStr?: string;
}): WelcomeComboEligibilityResult {
  const visits = Number(input?.customerVisits ?? 1);
  const historyDates = (input?.lashHistoryDates || []).filter(Boolean);
  const todayStr = input?.todayDateStr || new Date().toISOString().slice(0, 10);

  // Kiểm tra xem có lịch sử ca làm nào trước ngày hôm nay không
  const hasPriorDayHistory = historyDates.some((d) => {
    const norm = String(d).slice(0, 10);
    return norm.length === 10 && norm !== todayStr && !d.toLowerCase().includes('hôm nay');
  });

  const isFirstDayService = visits <= 1 && !hasPriorDayHistory;

  if (isFirstDayService) {
    return {
      eligible: true,
      isFirstDayService: true,
      visitCount: Math.max(1, visits),
      reason: 'Khách mới sử dụng dịch vụ ngày đầu tiên tại Wings — đủ điều kiện mua gói 2 tặng 1 (Welcome).',
      badgeText: '🌟 Đủ điều kiện Gói Welcome (Ngày đầu tiên)',
    };
  }

  return {
    eligible: false,
    isFirstDayService: false,
    visitCount: Math.max(2, visits),
    reason: `Gói Welcome (2 tặng 1) chỉ được mua duy nhất trong ngày đầu tiên sử dụng dịch vụ. Khách đã qua ngày đầu tiên (Lần ghé thứ ${Math.max(2, visits)}).`,
    badgeText: '🔒 Khóa Gói Welcome (Đã qua ngày đầu tiên)',
  };
}

/**
 * Tự động nhận diện đúng dòng mi (Category ID) và mã số sợi (Volume SKU)
 * từ dịch vụ khách vừa làm hoặc thông số tư vấn trong ca.
 */
export function matchComboCategoryAndVolumeFromBooking(input?: {
  serviceName?: string;
  servicePrice?: number;
  material?: string;
  volume?: string;
  count?: string;
  comboName?: string;
  serviceKey?: string;
}): {
  categoryId: WingsComboCategoryId;
  category: WingsComboCategory;
  volume: number | 'under';
  volumeMeta: VolumeFiberMetadata;
} {
  const explicitMaterialText = String(input?.material || '')
    .trim()
    .toLowerCase();
  const combinedText = [explicitMaterialText, input?.serviceName || '', input?.comboName || '', input?.serviceKey || '']
    .join(' ')
    .toLowerCase();

  const volText = String(input?.volume || '').toLowerCase();
  const countNum = parseInt(String(input?.count || '').replace(/\D+/g, ''), 10) || 0;

  const detectCategoryFromText = (text: string, allowVolFallback: boolean): WingsComboCategoryId | null => {
    if (!text || text.includes('any')) return null;
    if (text.includes('vvip')) {
      return 'VVIP';
    }
    if (text.includes('flawless') || (text.includes('mink') && !text.includes('under'))) {
      return 'FlawlessMink';
    }
    if (text.includes('hyperlight') || text.includes('hyper light') || text.includes('hyper_light')) {
      if (
        volText.includes('2x') ||
        volText.includes('2𝒙') ||
        volText.includes('2𝑿') ||
        text.includes('2x') ||
        text.includes('2𝒙') ||
        text.includes('2𝑿')
      ) {
        return 'HyperLight_2X';
      }
      if (
        volText.includes('3x') ||
        volText.includes('3𝒙') ||
        volText.includes('3𝑿') ||
        text.includes('3x') ||
        text.includes('3𝒙') ||
        text.includes('3𝑿')
      ) {
        return 'HyperLight_3X';
      }
      if (
        volText.includes('5x') ||
        volText.includes('5𝒙') ||
        volText.includes('5𝑿') ||
        text.includes('5x') ||
        text.includes('5𝒙') ||
        text.includes('5𝑿')
      ) {
        return 'HyperLight_5X';
      }
      return 'HyperLight_4X';
    }
    if (text.includes('ivylight') || text.includes('ivy light') || text.includes('ivy_light')) {
      if (
        volText.includes('3l') ||
        volText.includes('3ℓ') ||
        volText.includes('3𝓵') ||
        volText.includes('3𝓛') ||
        text.includes('3l') ||
        text.includes('3ℓ') ||
        text.includes('3𝓵') ||
        text.includes('3𝓛')
      ) {
        return 'IvyLight_3L';
      }
      if (
        volText.includes('5l') ||
        volText.includes('5ℓ') ||
        volText.includes('5𝓵') ||
        volText.includes('5𝓛') ||
        text.includes('5l') ||
        text.includes('5ℓ') ||
        text.includes('5𝓵') ||
        text.includes('5𝓛')
      ) {
        return 'IvyLight_5L';
      }
      return 'IvyLight_4L';
    }
    if (text.includes('ultralight') || text.includes('ultra light') || text.includes('ultra_light')) {
      if (volText.includes('3d') || text.includes('3d')) return 'UltraLight_3D';
      if (volText.includes('5d') || text.includes('5d')) return 'UltraLight_5D';
      return 'UltraLight_4D';
    }
    if (text.includes('volume')) {
      if (volText.includes('3d') || text.includes('3d') || volText.includes('3 fan') || text.includes('3 fan')) {
        return 'Volume_3D';
      }
      return 'Volume_2D';
    }
    if (text.includes('classic') || text.includes('1d') || (allowVolFallback && volText.includes('1d'))) {
      return 'Classic_1D';
    }
    return null;
  };

  const fallbackTextWithoutAny = [input?.serviceName || '', input?.comboName || '', input?.serviceKey || '']
    .filter((s) => !String(s).toLowerCase().includes('any'))
    .join(' ')
    .toLowerCase();

  const categoryId: WingsComboCategoryId =
    detectCategoryFromText(explicitMaterialText, false) ||
    detectCategoryFromText(fallbackTextWithoutAny, true) ||
    'FlawlessMink';

  const combinedWithVol = `${combinedText} ${volText}`;
  const siblingCategoryIds: WingsComboCategoryId[] = (() => {
    if (categoryId.startsWith('HyperLight_') && !/(2x|3x|4x|5x|2𝒙|3𝒙|4𝒙|5𝒙|2𝑿|3𝑿|4𝑿|5𝑿)/.test(combinedWithVol)) {
      return ['HyperLight_3X', 'HyperLight_2X', 'HyperLight_4X', 'HyperLight_5X'];
    }
    if (categoryId.startsWith('UltraLight_') && !/(3d|4d|5d)/.test(combinedWithVol)) {
      return ['UltraLight_3D', 'UltraLight_4D', 'UltraLight_5D'];
    }
    if (categoryId.startsWith('IvyLight_') && !/(3l|4l|5l|3ℓ|4ℓ|5ℓ|3𝓵|4𝓵|5𝓵|3𝓛|4𝓛|5𝓛)/.test(combinedWithVol)) {
      return ['IvyLight_3L', 'IvyLight_4L', 'IvyLight_5L'];
    }
    if (categoryId.startsWith('Volume_') && !/(2d|3d|2 fan|3 fan)/.test(combinedWithVol)) {
      return ['Volume_2D', 'Volume_3D'];
    }
    return [];
  })();

  const category = getWingsComboCategory(categoryId);
  const availableVolumes = category.unitPrices
    .filter((u) => !u.isUnderLash && typeof u.volume === 'number')
    .map((u) => Number(u.volume));

  // Chỉ match volume là 'under' nếu dịch vụ THUẦN TÚY là Mi Dưới (ví dụ "Nối Mi Dưới", "Mi Dưới 390", "Dặm Mi Dưới").
  // Nếu dịch vụ là dịch vụ kép có mi trên (ví dụ "HyperLight 530K (90 fan) + Mi Dưới", "New Classic 440 + Mi Dưới"),
  // thì Combo chính (Section 1) BẮT BUỘC phải là Combo Mi Trên (HyperLight, Classic, IvyLight...),
  // còn gói Mi Dưới sẽ được chọn riêng ở Section 2B (Gói Combo Mi Dưới)!
  const hasUpperLashService =
    combinedText.includes('hyperlight') ||
    combinedText.includes('hyper light') ||
    combinedText.includes('hyper_light') ||
    combinedText.includes('ivylight') ||
    combinedText.includes('ivy light') ||
    combinedText.includes('ivy_light') ||
    combinedText.includes('ultralight') ||
    combinedText.includes('ultra light') ||
    combinedText.includes('ultra_light') ||
    combinedText.includes('classic') ||
    combinedText.includes('flawless') ||
    (combinedText.includes('volume') && !combinedText.includes('mi dưới thuần'));

  const isPureUnderLash =
    !hasUpperLashService &&
    (combinedText.includes('under') || combinedText.includes('mi dưới') || volText.includes('dưới'));

  if (isPureUnderLash) {
    return {
      categoryId,
      category,
      volume: 'under',
      volumeMeta: getVolumeFiberMeta(categoryId, 'under'),
    };
  }

  // 1. Khớp theo countPerEye nếu có
  const catFiberMap = VOLUME_FIBER_MAP[categoryId];
  if (countNum > 0 && catFiberMap) {
    for (const [skuStr, meta] of Object.entries(catFiberMap)) {
      if (skuStr !== 'under' && meta.countPerEye === countNum) {
        const matchedVol = Number(skuStr);
        if (availableVolumes.includes(matchedVol)) {
          return {
            categoryId,
            category,
            volume: matchedVol,
            volumeMeta: getVolumeFiberMeta(categoryId, matchedVol),
          };
        }
      }
    }
  }

  // 2. Khớp theo mã số trong tên dịch vụ (e.g. "New Flawless Mink 770", "New Hyperlight 880")
  const skuMatch = combinedText.match(/\b(390|440|550|660|770|880|990|1110|1220|1330|1440|1550|1770|2110)\b/);
  if (skuMatch) {
    const parsedSku = Number(skuMatch[1]);
    if (availableVolumes.includes(parsedSku)) {
      return {
        categoryId,
        category,
        volume: parsedSku,
        volumeMeta: getVolumeFiberMeta(categoryId, parsedSku),
      };
    }
    for (const sibId of siblingCategoryIds) {
      const sibCat = getWingsComboCategory(sibId);
      const hasVol = sibCat.unitPrices.some((u) => !u.isUnderLash && Number(u.volume) === parsedSku);
      if (hasVol) {
        return {
          categoryId: sibId,
          category: sibCat,
          volume: parsedSku,
          volumeMeta: getVolumeFiberMeta(sibId, parsedSku),
        };
      }
    }
  }

  // 3. Khớp theo servicePrice (newPrice hoặc refillPrice)
  const price = Number(input?.servicePrice) || 0;
  if (price > 0) {
    const exactUnit = category.unitPrices.find(
      (u) => !u.isUnderLash && (u.newPrice === price || u.refillPrice === price)
    );
    if (exactUnit && typeof exactUnit.volume === 'number') {
      return {
        categoryId,
        category,
        volume: exactUnit.volume,
        volumeMeta: getVolumeFiberMeta(categoryId, exactUnit.volume),
      };
    }
    for (const sibId of siblingCategoryIds) {
      const sibCat = getWingsComboCategory(sibId);
      const sibExact = sibCat.unitPrices.find(
        (u) => !u.isUnderLash && (u.newPrice === price || u.refillPrice === price)
      );
      if (sibExact && typeof sibExact.volume === 'number') {
        return {
          categoryId: sibId,
          category: sibCat,
          volume: sibExact.volume,
          volumeMeta: getVolumeFiberMeta(sibId, sibExact.volume),
        };
      }
    }
    // Tìm volume có newPrice gần nhất
    let closestVol = availableVolumes[0] || 770;
    let minDiff = Infinity;
    for (const u of category.unitPrices) {
      if (!u.isUnderLash && typeof u.volume === 'number') {
        const diff = Math.abs(u.newPrice - price);
        if (diff < minDiff) {
          minDiff = diff;
          closestVol = u.volume;
        }
      }
    }
    return {
      categoryId,
      category,
      volume: closestVol,
      volumeMeta: getVolumeFiberMeta(categoryId, closestVol),
    };
  }

  const defaultVol = availableVolumes[Math.min(1, availableVolumes.length - 1)] || 770;
  return {
    categoryId,
    category,
    volume: defaultVol,
    volumeMeta: getVolumeFiberMeta(categoryId, defaultVol),
  };
}
