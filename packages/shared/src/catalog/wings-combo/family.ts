import type {
  LashFamilyInfo,
  MatchedComboPackageOption,
  SavedComboSeed,
  WelcomeComboEligibilityResult,
  WingsComboCategoryId,
} from './types.js';
import { getWingsComboCategory } from './data/index.js';
import { getComboPackagesForCategoryAndVolume } from './accounting.js';

export function getLashFamilyInfo(categoryId: WingsComboCategoryId | string): LashFamilyInfo {
  if (categoryId.startsWith('HyperLight')) {
    return {
      familyKey: 'HyperLight',
      familyName: 'Dòng HyperLight (Trụ siêu nhẹ)',
      siblings: [
        {
          categoryId: 'HyperLight_2X',
          levelKey: '2X',
          levelLabel: '2𝑿 · Trụ 2 sợi',
          shortLabel: '2𝑿',
          unitWord: 'trụ',
          fibersPerUnit: 2,
          fiberDensityLabel: '2 sợi/trụ',
        },
        {
          categoryId: 'HyperLight_3X',
          levelKey: '3X',
          levelLabel: '3𝑿 · Trụ 3 sợi',
          shortLabel: '3𝑿',
          unitWord: 'trụ',
          fibersPerUnit: 3,
          fiberDensityLabel: '3 sợi/trụ',
        },
        {
          categoryId: 'HyperLight_4X',
          levelKey: '4X',
          levelLabel: '4𝑿 · Trụ 4 sợi',
          shortLabel: '4𝑿',
          unitWord: 'trụ',
          fibersPerUnit: 4,
          fiberDensityLabel: '4 sợi/trụ',
        },
        {
          categoryId: 'HyperLight_5X',
          levelKey: '5X',
          levelLabel: '5𝑿 · Trụ 5 sợi',
          shortLabel: '5𝑿',
          unitWord: 'trụ',
          fibersPerUnit: 5,
          fiberDensityLabel: '5 sợi/trụ',
        },
      ],
    };
  }

  if (categoryId.startsWith('IvyLight')) {
    return {
      familyKey: 'IvyLight',
      familyName: 'Dòng IvyLight (Sợi dẹp cao cấp)',
      siblings: [
        {
          categoryId: 'IvyLight_3L',
          levelKey: '3L',
          levelLabel: '3𝓵 · Trụ 3 sợi dẹp',
          shortLabel: '3𝓵',
          unitWord: 'trụ',
          fibersPerUnit: 3,
          fiberDensityLabel: '3 sợi/trụ',
        },
        {
          categoryId: 'IvyLight_4L',
          levelKey: '4L',
          levelLabel: '4𝓵 · Trụ 4 sợi dẹp',
          shortLabel: '4𝓵',
          unitWord: 'trụ',
          fibersPerUnit: 4,
          fiberDensityLabel: '4 sợi/trụ',
        },
        {
          categoryId: 'IvyLight_5L',
          levelKey: '5L',
          levelLabel: '5𝓵 · Trụ 5 sợi dẹp',
          shortLabel: '5𝓵',
          unitWord: 'trụ',
          fibersPerUnit: 5,
          fiberDensityLabel: '5 sợi/trụ',
        },
      ],
    };
  }

  if (categoryId.startsWith('UltraLight')) {
    return {
      familyKey: 'UltraLight',
      familyName: 'Dòng UltraLight (Fan xòe bồng bềnh)',
      siblings: [
        {
          categoryId: 'UltraLight_3D',
          levelKey: '3D',
          levelLabel: '3D · Fan 3 sợi',
          shortLabel: '3D',
          unitWord: 'fan',
          fibersPerUnit: 3,
          fiberDensityLabel: '3 sợi/fan',
        },
        {
          categoryId: 'UltraLight_4D',
          levelKey: '4D',
          levelLabel: '4D · Fan 4 sợi',
          shortLabel: '4D',
          unitWord: 'fan',
          fibersPerUnit: 4,
          fiberDensityLabel: '4 sợi/fan',
        },
        {
          categoryId: 'UltraLight_5D',
          levelKey: '5D',
          levelLabel: '5D · Fan 5 sợi',
          shortLabel: '5D',
          unitWord: 'fan',
          fibersPerUnit: 5,
          fiberDensityLabel: '5 sợi/fan',
        },
      ],
    };
  }

  if (categoryId === 'Classic_1D' || categoryId === 'Classic_Volume') {
    return {
      familyKey: 'Classic',
      familyName: 'Dòng Classic 1D (Mi Lụa)',
      siblings: [
        {
          categoryId: 'Classic_1D',
          levelKey: '1D',
          levelLabel: 'Classic 1D · Mi Lụa Sợi Đơn',
          shortLabel: '1D',
          unitWord: 'sợi',
          fibersPerUnit: 1,
          fiberDensityLabel: 'Sợi đơn 1:1',
        },
      ],
    };
  }

  if (categoryId === 'Volume_2D' || categoryId === 'Volume_3D') {
    return {
      familyKey: 'Volume',
      familyName: 'Dòng Volume 2D-3D (Mi Lụa)',
      siblings: [
        {
          categoryId: 'Volume_2D',
          levelKey: '2D',
          levelLabel: 'Volume 2D · Fan 2 sợi (0.07-0.10mm)',
          shortLabel: '2D',
          unitWord: 'fan',
          fibersPerUnit: 2,
          fiberDensityLabel: 'Fan 2 sợi 2D',
        },
        {
          categoryId: 'Volume_3D',
          levelKey: '3D',
          levelLabel: 'Volume 3D · Fan 3 sợi (0.07-0.10mm)',
          shortLabel: '3D',
          unitWord: 'fan',
          fibersPerUnit: 3,
          fiberDensityLabel: 'Fan 3 sợi 3D',
        },
      ],
    };
  }

  if (categoryId === 'FlawlessMink') {
    return {
      familyKey: 'Mink',
      familyName: 'Dòng Flawless Mink 𝓜 (100% Lông Chồn Thật)',
      siblings: [
        {
          categoryId: 'FlawlessMink',
          levelKey: 'FlawlessMink',
          levelLabel: 'Flawless Mink 𝓜 · Lông Chồn Thật Luxury',
          shortLabel: 'Mink 𝓜',
          unitWord: 'sợi',
          fibersPerUnit: 1,
          fiberDensityLabel: 'Sợi đơn 1:1 Lông chồn thật',
        },
      ],
    };
  }

  return {
    familyKey: 'VVIP',
    familyName: 'Gói Thẻ VVIP Pass Toàn Năng',
    siblings: [
      {
        categoryId: 'VVIP',
        levelKey: 'VVIP',
        levelLabel: 'VVIP Pass · 20 Lần',
        shortLabel: 'VVIP Pass',
        unitWord: 'sợi',
        fibersPerUnit: 1,
        fiberDensityLabel: 'Tự chọn dòng mi',
      },
    ],
  };
}

export function resolveValidVolumeForCategory(
  targetCategoryId: WingsComboCategoryId | string,
  preferredVolume: number | 'under'
): number | 'under' {
  const cat = getWingsComboCategory(targetCategoryId);
  if (cat.id === 'VVIP') return preferredVolume;

  // If preferred is under
  if (preferredVolume === 'under') {
    const hasUnder = cat.unitPrices.some((u) => u.isUnderLash || u.volume === 'under');
    if (hasUnder) return 'under';
    const firstNum = cat.unitPrices.find((u) => !u.isUnderLash && typeof u.volume === 'number');
    return firstNum ? Number(firstNum.volume) : 550;
  }

  // Exact match
  const exact = cat.unitPrices.find((u) => !u.isUnderLash && Number(u.volume) === Number(preferredVolume));
  if (exact) return Number(exact.volume);

  // Closest numeric volume
  const numPrices = cat.unitPrices
    .filter((u) => !u.isUnderLash && typeof u.volume === 'number')
    .map((u) => Number(u.volume));
  if (numPrices.length > 0) {
    numPrices.sort((a, b) => Math.abs(a - Number(preferredVolume)) - Math.abs(b - Number(preferredVolume)));
    return numPrices[0];
  }

  return 550;
}

export function getUnderLashComboPackages(
  welcomeEligibility?: WelcomeComboEligibilityResult
): MatchedComboPackageOption[] {
  const pkgs = getComboPackagesForCategoryAndVolume({
    categoryId: 'FlawlessMink',
    volume: 'under',
    welcomeEligibility,
    includeVvipPass: false,
  });
  // Chuẩn hóa 4 tier tiêu chuẩn Wings (2+1, 4+1, 7+3, 10+6)
  const standardRuleNames = ['2 tặng 1', '4 tặng 1', '7 tặng 3', '10 tặng 6'];
  return pkgs.filter((p) => standardRuleNames.includes(p.ruleName));
}

export function resolveMatchedUpperComboFromSaved(
  savedCombo?: SavedComboSeed | null,
  welcomeEligibility?: WelcomeComboEligibilityResult,
  fallbackSpec?: { categoryId: WingsComboCategoryId | string; volume: number | 'under' }
): MatchedComboPackageOption | null {
  if (!savedCombo || (!savedCombo.id && !savedCombo.ruleName && !savedCombo.name)) {
    return null;
  }

  const rawId = String(savedCombo.id || '').trim();
  const idParts = rawId ? rawId.split(':') : [];
  const catFromId = idParts[0] || '';
  const ruleSlugFromId = idParts[1] ? idParts[1].replace(/_/g, ' ') : '';
  const volPartFromId = idParts[2] || '';

  const parsedVolFromId: number | 'under' | undefined =
    volPartFromId === 'under_390' || volPartFromId === 'under'
      ? 'under'
      : Number.isFinite(Number(volPartFromId)) && Number(volPartFromId) > 0
        ? Number(volPartFromId)
        : undefined;

  const targetCategoryId = savedCombo.categoryId || catFromId || fallbackSpec?.categoryId || 'FlawlessMink';
  const rawVolume = savedCombo.volume ?? parsedVolFromId ?? fallbackSpec?.volume ?? 770;
  const resolvedCategory = getWingsComboCategory(targetCategoryId);
  const resolvedVolume =
    resolvedCategory.id === 'VVIP'
      ? typeof fallbackSpec?.volume === 'number'
        ? fallbackSpec.volume
        : 770
      : resolveValidVolumeForCategory(resolvedCategory.id, rawVolume);

  const packages = getComboPackagesForCategoryAndVolume({
    categoryId: resolvedCategory.id,
    volume: resolvedVolume,
    welcomeEligibility,
    includeVvipPass: true,
  });

  if (rawId) {
    const exactUnlocked = packages.find((p) => p.id === rawId && !p.isLocked);
    if (exactUnlocked) return exactUnlocked;
  }

  const desiredRule = String(savedCombo.ruleName || ruleSlugFromId || '')
    .trim()
    .toLowerCase();
  if (desiredRule) {
    const byRule = packages.find((p) => !p.isLocked && p.ruleName.toLowerCase() === desiredRule);
    if (byRule) return byRule;
  }

  if (savedCombo.price && Number(savedCombo.price) > 0) {
    const byPrice = packages.find((p) => !p.isLocked && p.comboPrice === Number(savedCombo.price));
    if (byPrice) return byPrice;
  }

  return null;
}

export function resolveMatchedUnderComboFromSaved(
  savedUnderCombo?: SavedComboSeed | null,
  welcomeEligibility?: WelcomeComboEligibilityResult
): MatchedComboPackageOption | null {
  if (!savedUnderCombo || (!savedUnderCombo.id && !savedUnderCombo.ruleName && !savedUnderCombo.name)) {
    return null;
  }

  const packages = getUnderLashComboPackages(welcomeEligibility);
  const rawId = String(savedUnderCombo.id || '').trim();
  const idParts = rawId ? rawId.split(':') : [];
  const ruleSlugFromId = idParts[1] ? idParts[1].replace(/_/g, ' ') : '';

  if (rawId) {
    const exact = packages.find((p) => p.id === rawId && !p.isLocked);
    if (exact) return exact;
  }

  const desiredRule = String(savedUnderCombo.ruleName || ruleSlugFromId || '')
    .trim()
    .toLowerCase();
  if (desiredRule) {
    const byRule = packages.find((p) => !p.isLocked && p.ruleName.toLowerCase() === desiredRule);
    if (byRule) return byRule;
  }

  if (savedUnderCombo.price && Number(savedUnderCombo.price) > 0) {
    const byPrice = packages.find((p) => !p.isLocked && p.comboPrice === Number(savedUnderCombo.price));
    if (byPrice) return byPrice;
  }

  return null;
}
