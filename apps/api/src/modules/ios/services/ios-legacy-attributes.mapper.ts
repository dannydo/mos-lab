import type { SafeAny } from '@mos-lab/shared';

export type LegacyAttributeOptionEntry = {
  attribute_option_id: string;
  attribute_option_value: string;
};

export type LegacyServiceAttributeMap = Record<string, LegacyAttributeOptionEntry[]>;

export function buildUpperLashAttributeMap(params: {
  attributes?: SafeAny;
  serviceName?: string;
  selectedCombo?: SafeAny;
}): LegacyServiceAttributeMap {
  const attrs = params.attributes || {};
  const upperServiceTitle = String(params.serviceName || '').split(
    /\+\s*(?:mi\s*dưới|(?:new\s+|retain\s+|dặm\s+)?(?:flawless\s+)?under\b)/i
  )[0];
  const upperTextHint = `${upperServiceTitle} ${params.selectedCombo?.id || ''} ${params.selectedCombo?.name || ''}`;

  const rawCurl = String(attrs.curl || 'C')
    .trim()
    .toUpperCase();
  const curlMap: Record<string, LegacyAttributeOptionEntry> = {
    J: { attribute_option_id: '44', attribute_option_value: 'j' },
    B: { attribute_option_id: '45', attribute_option_value: 'b' },
    C: { attribute_option_id: '46', attribute_option_value: 'c' },
    D: { attribute_option_id: '47', attribute_option_value: 'd' },
    L: { attribute_option_id: '48', attribute_option_value: 'l' },
  };
  const curlEntry = curlMap[rawCurl] || curlMap.C;

  // /ios-app lưu dáng mi tại attributes.style ('Natural' | 'Doll' | 'Wing' | 'Kim K' ...), đồng thời tương thích attributes.design
  const rawDesign = String(attrs.style || attrs.design || 'Natural')
    .trim()
    .toLowerCase();
  let designEntry: LegacyAttributeOptionEntry = { attribute_option_id: '49', attribute_option_value: 'natural' };
  if (rawDesign.includes('doll') || rawDesign.includes('búp bê')) {
    designEntry = { attribute_option_id: '102', attribute_option_value: 'doll' };
  } else if (rawDesign.includes('wing') || rawDesign.includes('cat') || rawDesign.includes('fox')) {
    designEntry = { attribute_option_id: '50', attribute_option_value: 'wing' };
  } else if (
    rawDesign.includes('kim') ||
    rawDesign.includes('katun') ||
    rawDesign.includes('anime') ||
    rawDesign.includes('wispy') ||
    rawDesign.includes('wet') ||
    rawDesign.includes('thai') ||
    rawDesign.includes('thiết kế')
  ) {
    designEntry = { attribute_option_id: '101', attribute_option_value: 'kim-k' };
  }

  const rawLengthTokens: string[] =
    Array.isArray(attrs.lengths) && attrs.lengths.length > 0
      ? attrs.lengths.map((n: SafeAny) => String(n))
      : String(attrs.length || '10 - 12mm').match(/\d+/g) || ['10', '12'];
  const parsedLengths: number[] = Array.from(
    new Set<number>(
      rawLengthTokens.map((n: string) => Number(n)).filter((n: number) => Number.isFinite(n) && n >= 6 && n <= 17)
    )
  );
  const effectiveLengths = parsedLengths.length > 0 ? parsedLengths : [10, 12];
  const lengthEntries: LegacyAttributeOptionEntry[] = effectiveLengths.map((len) => ({
    attribute_option_id: String(45 + len),
    attribute_option_value: String(len),
  }));

  // /ios-app lưu số lượng tại attributes.count ('70 fan' | '90 sợi' | '110 trụ'), đồng thời hỗ trợ attributes.lashCount
  const attrCountMatch = String(attrs.count ?? attrs.lashCount ?? '').match(/\d+/);
  const fanMatch = upperTextHint.match(/\((\d{2,3})\s*(?:fan|trụ|sợi|nhịp)\)/i);
  const rawCount = Number(attrCountMatch?.[0] || fanMatch?.[1] || 70);
  const clampedCount = rawCount <= 20 ? 20 : Math.min(230, Math.max(30, Math.round(rawCount / 10) * 10));
  const countOptionId = clampedCount === 20 ? 210 : 60 + clampedCount / 10;
  const lashCountEntry: LegacyAttributeOptionEntry = {
    attribute_option_id: String(countOptionId),
    attribute_option_value: String(clampedCount),
  };

  // Chuẩn hóa Fan theo staff_bonus_rule:
  // - Classic 1D / Flawless Mink -> 1D (id=84, 0 pts)
  // - Volume 2D -> 2D (id=85, 0 pts)
  // - HyperLight/UltraLight 2X hoặc 3D/3X/3L -> 3D (id=86, +1 pt)
  // - 4D/4X/4L -> 4D (id=87, +2 pts)
  // - 5D/5X/5L -> 5D (id=88, +3 pts)
  const matHint = `${attrs.material || ''} ${upperTextHint}`.toLowerCase();
  const volHint = `${attrs.volume || ''} ${upperTextHint}`;
  const isLightOrIvy = matHint.includes('hyper') || matHint.includes('ultra') || matHint.includes('ivy');
  let volDigit = 4;
  if (!isLightOrIvy && (matHint.includes('classic') || matHint.includes('flawless') || matHint.includes('mink'))) {
    volDigit = 1;
  } else if (!isLightOrIvy && matHint.includes('volume')) {
    volDigit = 2;
  } else if (/5\s*[xdlℓ𝓵𝓛]/iu.test(volHint)) {
    volDigit = 5;
  } else if (/4\s*[xdlℓ𝓵𝓛]/iu.test(volHint)) {
    volDigit = 4;
  } else if (/3\s*[xdlℓ𝓵𝓛]/iu.test(volHint) || /\b2\s*x\b/i.test(volHint)) {
    volDigit = 3;
  } else if (/\b2\s*d\b/i.test(volHint)) {
    volDigit = 2;
  } else if (/\b1\s*d\b/i.test(volHint)) {
    volDigit = 1;
  }
  const volumeEntry: LegacyAttributeOptionEntry = {
    attribute_option_id: String(83 + volDigit),
    attribute_option_value: `${volDigit}d`,
  };

  const rawColor = String(attrs.color || 'Black').toLowerCase();
  let colorEntry: LegacyAttributeOptionEntry = { attribute_option_id: '34', attribute_option_value: 'black' };
  if (rawColor.includes('brown') || rawColor.includes('nâu')) {
    colorEntry = { attribute_option_id: '35', attribute_option_value: 'brown' };
  } else if (rawColor.includes('blue') || rawColor.includes('xanh')) {
    colorEntry = { attribute_option_id: '89', attribute_option_value: 'blue' };
  } else if (rawColor.includes('purple') || rawColor.includes('tím')) {
    colorEntry = { attribute_option_id: '90', attribute_option_value: 'purple' };
  } else if (
    rawColor &&
    rawColor !== 'black' &&
    !rawColor.includes('đen') &&
    (rawColor.includes('color') ||
      rawColor.includes('màu') ||
      rawColor.includes('highlight') ||
      rawColor.includes('ombre'))
  ) {
    colorEntry = { attribute_option_id: '35', attribute_option_value: 'brown' };
  }

  const normalizedThick = String(attrs.thickness || (volDigit >= 3 ? '0.05' : '0.07'))
    .replace(/\s*mm/gi, '')
    .trim();
  const thickMap: Record<string, LegacyAttributeOptionEntry> = {
    '0.05': { attribute_option_id: '91', attribute_option_value: '0.05' },
    '0.07': { attribute_option_id: '92', attribute_option_value: '0.07' },
    '0.10': { attribute_option_id: '93', attribute_option_value: '0.10' },
    '0.1': { attribute_option_id: '93', attribute_option_value: '0.10' },
    '0.12': { attribute_option_id: '94', attribute_option_value: '0.12' },
    '0.15': { attribute_option_id: '95', attribute_option_value: '0.15' },
  };
  const thicknessEntry = thickMap[normalizedThick] || thickMap['0.07'];

  return {
    '9': [curlEntry],
    '10': [designEntry],
    '11': lengthEntries,
    '12': [lashCountEntry],
    '13': [volumeEntry],
    '14': [colorEntry],
    '15': [thicknessEntry],
  };
}

/**
 * Chuẩn hóa thông số Mi Dưới (Under Mink id=127/128) theo đúng quy chuẩn WingsLashes order.php:
 * - Khóa cứng Design=natural (49 -> 0 pts), Lashes=20 (210 -> +17 pts), Fan=1D (84 -> 0 pts), Color=black (34 -> 0 pts)
 * - Kết hợp Class (+5 pts) + Type (Normal +7 / Retain +0) = +29 pts (Mới) hoặc +22 pts (Dặm).
 */
export function buildUnderLashAttributeMap(attributes?: SafeAny): LegacyServiceAttributeMap {
  const attrs = attributes || {};
  const rawUnderCurl = String(attrs.underMinkCurl || 'B')
    .trim()
    .toUpperCase();
  const underCurlMap: Record<string, LegacyAttributeOptionEntry> = {
    J: { attribute_option_id: '44', attribute_option_value: 'j' },
    B: { attribute_option_id: '45', attribute_option_value: 'b' },
    C: { attribute_option_id: '46', attribute_option_value: 'c' },
  };
  const underCurl = underCurlMap[rawUnderCurl] || underCurlMap.B;

  const underLenMatch = String(attrs.underMinkLength || '6').match(/\d+/);
  const underLenNum = underLenMatch ? Math.min(8, Math.max(6, Number(underLenMatch[0]))) : 6;
  const underLenEntry: LegacyAttributeOptionEntry = {
    attribute_option_id: String(45 + underLenNum),
    attribute_option_value: String(underLenNum),
  };

  const normalizedUnderThick = String(attrs.underMinkThickness || '0.07')
    .replace(/\s*mm/gi, '')
    .trim();
  const underThickMap: Record<string, LegacyAttributeOptionEntry> = {
    '0.05': { attribute_option_id: '91', attribute_option_value: '0.05' },
    '0.07': { attribute_option_id: '92', attribute_option_value: '0.07' },
    '0.10': { attribute_option_id: '93', attribute_option_value: '0.10' },
    '0.1': { attribute_option_id: '93', attribute_option_value: '0.10' },
  };
  const underThickEntry = underThickMap[normalizedUnderThick] || underThickMap['0.07'];

  return {
    '9': [underCurl],
    '10': [{ attribute_option_id: '49', attribute_option_value: 'natural' }],
    '11': [underLenEntry],
    '12': [{ attribute_option_id: '210', attribute_option_value: '20' }],
    '13': [{ attribute_option_id: '84', attribute_option_value: '1D' }],
    '14': [{ attribute_option_id: '34', attribute_option_value: 'black' }],
    '15': [underThickEntry],
  };
}
