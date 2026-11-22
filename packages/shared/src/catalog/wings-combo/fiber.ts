import type { VolumeFiberMetadata, WingsComboCategoryId } from './types.js';

export const VOLUME_FIBER_MAP: Record<
  string,
  Record<string, { countPerEye: number; totalFibers: number; fanLabel: string; badge?: 'BEST SELLER' | 'MOST POPULAR' }>
> = {
  Classic_Volume: {
    '390': { countPerEye: 60, totalFibers: 120, fanLabel: '1D · 60 sợi/mắt (Mi lụa)' },
    '440': { countPerEye: 70, totalFibers: 140, fanLabel: '1D · 70 sợi/mắt (Mi lụa)' },
    '550': { countPerEye: 90, totalFibers: 180, fanLabel: '1D · 90 sợi/mắt (Mi lụa)', badge: 'BEST SELLER' },
    '660': { countPerEye: 110, totalFibers: 220, fanLabel: '1D · 110 sợi/mắt (Mi lụa)' },
    '880': { countPerEye: 130, totalFibers: 260, fanLabel: '1D · 130 sợi/mắt (Mi lụa)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  Classic_1D: {
    '390': { countPerEye: 60, totalFibers: 120, fanLabel: '1D · 60 sợi/mắt (Mi lụa)' },
    '440': { countPerEye: 70, totalFibers: 140, fanLabel: '1D · 70 sợi/mắt (Mi lụa)' },
    '550': { countPerEye: 90, totalFibers: 180, fanLabel: '1D · 90 sợi/mắt (Mi lụa)', badge: 'BEST SELLER' },
    '660': { countPerEye: 110, totalFibers: 220, fanLabel: '1D · 110 sợi/mắt (Mi lụa)' },
    '880': { countPerEye: 130, totalFibers: 260, fanLabel: '1D · 130 sợi/mắt (Mi lụa)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  Volume_2D: {
    '550': { countPerEye: 70, totalFibers: 280, fanLabel: '2D · 70 fan/mắt (140 sợi · 0.07-0.10mm)' },
    '660': {
      countPerEye: 90,
      totalFibers: 360,
      fanLabel: '2D · 90 fan/mắt (180 sợi · 0.07-0.10mm)',
      badge: 'BEST SELLER',
    },
    '770': { countPerEye: 110, totalFibers: 440, fanLabel: '2D · 110 fan/mắt (220 sợi · 0.07-0.10mm)' },
    '880': { countPerEye: 130, totalFibers: 520, fanLabel: '2D · 130 fan/mắt (260 sợi · 0.07-0.10mm)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  Volume_3D: {
    '660': { countPerEye: 70, totalFibers: 420, fanLabel: '3D · 70 fan/mắt (210 sợi · 0.07-0.10mm)' },
    '770': {
      countPerEye: 90,
      totalFibers: 540,
      fanLabel: '3D · 90 fan/mắt (270 sợi · 0.07-0.10mm)',
      badge: 'BEST SELLER',
    },
    '880': { countPerEye: 110, totalFibers: 660, fanLabel: '3D · 110 fan/mắt (330 sợi · 0.07-0.10mm)' },
    '1110': { countPerEye: 130, totalFibers: 780, fanLabel: '3D · 130 fan/mắt (390 sợi · 0.07-0.10mm)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  FlawlessMink: {
    '770': { countPerEye: 60, totalFibers: 120, fanLabel: '1D · 60 sợi/mắt (100% Lông chồn thật)' },
    '880': {
      countPerEye: 70,
      totalFibers: 140,
      fanLabel: '1D · 70 sợi/mắt (100% Lông chồn thật)',
      badge: 'MOST POPULAR',
    },
    '1110': {
      countPerEye: 90,
      totalFibers: 180,
      fanLabel: '1D · 90 sợi/mắt (100% Lông chồn thật)',
      badge: 'BEST SELLER',
    },
    '1440': { countPerEye: 110, totalFibers: 220, fanLabel: '1D · 110 sợi/mắt (100% Lông chồn thật)' },
    '1770': { countPerEye: 130, totalFibers: 260, fanLabel: '1D · 130 sợi/mắt (100% Lông chồn thật)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_2X: {
    '440': { countPerEye: 50, totalFibers: 200, fanLabel: '2𝑿 · 50 trụ/mắt (Trụ 2 sợi · 200 sợi)' },
    '550': { countPerEye: 70, totalFibers: 280, fanLabel: '2𝑿 · 70 trụ/mắt (Trụ 2 sợi · 280 sợi)' },
    '660': {
      countPerEye: 90,
      totalFibers: 360,
      fanLabel: '2𝑿 · 90 trụ/mắt (Trụ 2 sợi · 360 sợi)',
      badge: 'BEST SELLER',
    },
    '770': { countPerEye: 110, totalFibers: 440, fanLabel: '2𝑿 · 110 trụ/mắt (Trụ 2 sợi · 440 sợi)' },
    '1110': { countPerEye: 130, totalFibers: 520, fanLabel: '2𝑿 · 130 trụ/mắt (Trụ 2 sợi · 520 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_3X: {
    '550': { countPerEye: 50, totalFibers: 300, fanLabel: '3𝑿 · 50 trụ/mắt (Trụ 3 sợi · 300 sợi)' },
    '660': { countPerEye: 70, totalFibers: 420, fanLabel: '3𝑿 · 70 trụ/mắt (Trụ 3 sợi · 420 sợi)' },
    '770': {
      countPerEye: 90,
      totalFibers: 540,
      fanLabel: '3𝑿 · 90 trụ/mắt (Trụ 3 sợi · 540 sợi)',
      badge: 'BEST SELLER',
    },
    '880': { countPerEye: 110, totalFibers: 660, fanLabel: '3𝑿 · 110 trụ/mắt (Trụ 3 sợi · 660 sợi)' },
    '1220': { countPerEye: 130, totalFibers: 780, fanLabel: '3𝑿 · 130 trụ/mắt (Trụ 3 sợi · 780 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_4X: {
    '660': { countPerEye: 50, totalFibers: 400, fanLabel: '4𝑿 · 50 trụ/mắt (Trụ 4 sợi · 400 sợi)' },
    '770': {
      countPerEye: 70,
      totalFibers: 560,
      fanLabel: '4𝑿 · 70 trụ/mắt (Trụ 4 sợi · 560 sợi)',
      badge: 'BEST SELLER',
    },
    '880': {
      countPerEye: 90,
      totalFibers: 720,
      fanLabel: '4𝑿 · 90 trụ/mắt (Trụ 4 sợi · 720 sợi)',
      badge: 'MOST POPULAR',
    },
    '990': { countPerEye: 110, totalFibers: 880, fanLabel: '4𝑿 · 110 trụ/mắt (Trụ 4 sợi · 880 sợi)' },
    '1330': { countPerEye: 130, totalFibers: 1040, fanLabel: '4𝑿 · 130 trụ/mắt (Trụ 4 sợi · 1040 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_5X: {
    '770': { countPerEye: 50, totalFibers: 500, fanLabel: '5𝑿 · 50 trụ/mắt (Trụ 5 sợi · 500 sợi)' },
    '990': {
      countPerEye: 70,
      totalFibers: 700,
      fanLabel: '5𝑿 · 70 trụ/mắt (Trụ 5 sợi · 700 sợi)',
      badge: 'MOST POPULAR',
    },
    '1220': { countPerEye: 90, totalFibers: 900, fanLabel: '5𝑿 · 90 trụ/mắt (Trụ 5 sợi · 900 sợi)' },
    '1440': { countPerEye: 110, totalFibers: 1100, fanLabel: '5𝑿 · 110 trụ/mắt (Trụ 5 sợi · 1100 sợi)' },
    '1770': { countPerEye: 130, totalFibers: 1300, fanLabel: '5𝑿 · 130 trụ/mắt (Trụ 5 sợi · 1300 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  IvyLight_3L: {
    '770': { countPerEye: 70, totalFibers: 420, fanLabel: '3𝓵 · 70 trụ/mắt (Trụ 3 sợi dẹp · 420 sợi)' },
    '880': {
      countPerEye: 90,
      totalFibers: 540,
      fanLabel: '3𝓵 · 90 trụ/mắt (Trụ 3 sợi dẹp · 540 sợi)',
      badge: 'BEST SELLER',
    },
    '990': { countPerEye: 110, totalFibers: 660, fanLabel: '3𝓵 · 110 trụ/mắt (Trụ 3 sợi dẹp · 660 sợi)' },
    '1330': { countPerEye: 130, totalFibers: 780, fanLabel: '3𝓵 · 130 trụ/mắt (Trụ 3 sợi dẹp · 780 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  IvyLight_4L: {
    '990': {
      countPerEye: 70,
      totalFibers: 560,
      fanLabel: '4𝓵 · 70 trụ/mắt (Trụ 4 sợi dẹp · 560 sợi)',
      badge: 'MOST POPULAR',
    },
    '1220': {
      countPerEye: 90,
      totalFibers: 720,
      fanLabel: '4𝓵 · 90 trụ/mắt (Trụ 4 sợi dẹp · 720 sợi)',
      badge: 'BEST SELLER',
    },
    '1440': { countPerEye: 110, totalFibers: 880, fanLabel: '4𝓵 · 110 trụ/mắt (Trụ 4 sợi dẹp · 880 sợi)' },
    '1770': { countPerEye: 130, totalFibers: 1040, fanLabel: '4𝓵 · 130 trụ/mắt (Trụ 4 sợi dẹp · 1040 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  IvyLight_5L: {
    '1110': {
      countPerEye: 70,
      totalFibers: 700,
      fanLabel: '5𝓵 · 70 trụ/mắt (Trụ 5 sợi dẹp · 700 sợi)',
      badge: 'MOST POPULAR',
    },
    '1440': { countPerEye: 90, totalFibers: 900, fanLabel: '5𝓵 · 90 trụ/mắt (Trụ 5 sợi dẹp · 900 sợi)' },
    '1770': { countPerEye: 110, totalFibers: 1100, fanLabel: '5𝓵 · 110 trụ/mắt (Trụ 5 sợi dẹp · 1100 sợi)' },
    '2110': { countPerEye: 130, totalFibers: 1300, fanLabel: '5𝓵 · 130 trụ/mắt (Trụ 5 sợi dẹp · 1300 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  UltraLight_3D: {
    '550': { countPerEye: 60, totalFibers: 360, fanLabel: '3D · 60 fan/mắt (Fan 3 sợi · 360 sợi)' },
    '660': {
      countPerEye: 80,
      totalFibers: 480,
      fanLabel: '3D · 80 fan/mắt (Fan 3 sợi · 480 sợi)',
      badge: 'BEST SELLER',
    },
    '770': { countPerEye: 100, totalFibers: 600, fanLabel: '3D · 100 fan/mắt (Fan 3 sợi · 600 sợi)' },
    '990': { countPerEye: 120, totalFibers: 720, fanLabel: '3D · 120 fan/mắt (Fan 3 sợi · 720 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  UltraLight_4D: {
    '660': {
      countPerEye: 60,
      totalFibers: 480,
      fanLabel: '4D · 60 fan/mắt (Fan 4 sợi · 480 sợi)',
      badge: 'MOST POPULAR',
    },
    '770': {
      countPerEye: 80,
      totalFibers: 640,
      fanLabel: '4D · 80 fan/mắt (Fan 4 sợi · 640 sợi)',
      badge: 'BEST SELLER',
    },
    '880': {
      countPerEye: 100,
      totalFibers: 800,
      fanLabel: '4D · 100 fan/mắt (Fan 4 sợi · 800 sợi)',
    },
    '1110': { countPerEye: 120, totalFibers: 960, fanLabel: '4D · 120 fan/mắt (Fan 4 sợi · 960 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  UltraLight_5D: {
    '770': {
      countPerEye: 60,
      totalFibers: 600,
      fanLabel: '5D · 60 fan/mắt (Fan 5 sợi · 600 sợi)',
      badge: 'MOST POPULAR',
    },
    '990': { countPerEye: 80, totalFibers: 800, fanLabel: '5D · 80 fan/mắt (Fan 5 sợi · 800 sợi)' },
    '1220': { countPerEye: 100, totalFibers: 1000, fanLabel: '5D · 100 fan/mắt (Fan 5 sợi · 1000 sợi)' },
    '1550': { countPerEye: 120, totalFibers: 1200, fanLabel: '5D · 120 fan/mắt (Fan 5 sợi · 1200 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
};

export function getVolumeFiberMeta(
  categoryId: WingsComboCategoryId | string,
  volume: number | 'under' | string
): VolumeFiberMetadata {
  if (volume === 'under' || String(volume).toLowerCase().includes('under')) {
    return {
      skuCode: 'under',
      countPerEye: 35,
      totalFibers: 70,
      unitWord: 'sợi',
      specLabel: 'Mi dưới 1:1',
      fanLabel: 'Mi dưới · 70 sợi 2 mắt',
      shortLabel: 'Mi dưới 390 (35 sợi/mắt)',
      detailLabel: 'Mi dưới 390 (70 sợi 2 mắt)',
    };
  }
  const volKey = String(volume);
  const catMap = VOLUME_FIBER_MAP[categoryId] || {};
  const meta = catMap[volKey];
  const skuNum = Number(volume) || 770;

  const unitWord: VolumeFiberMetadata['unitWord'] =
    categoryId.startsWith('HyperLight') || categoryId.startsWith('IvyLight')
      ? 'trụ'
      : categoryId.startsWith('UltraLight')
        ? 'fan'
        : 'sợi';

  const levelCode =
    categoryId === 'HyperLight_2X'
      ? '2𝑿'
      : categoryId === 'HyperLight_3X'
        ? '3𝑿'
        : categoryId === 'HyperLight_4X'
          ? '4𝑿'
          : categoryId === 'HyperLight_5X'
            ? '5𝑿'
            : categoryId === 'UltraLight_3D'
              ? '3D'
              : categoryId === 'UltraLight_4D'
                ? '4D'
                : categoryId === 'UltraLight_5D'
                  ? '5D'
                  : categoryId === 'IvyLight_3L'
                    ? '3𝓵'
                    : categoryId === 'IvyLight_4L'
                      ? '4𝓵'
                      : categoryId === 'IvyLight_5L'
                        ? '5𝓵'
                        : undefined;

  const specLabel =
    categoryId === 'HyperLight_2X'
      ? 'Trụ 2 sợi (2𝑿)'
      : categoryId === 'HyperLight_3X'
        ? 'Trụ 3 sợi (3𝑿)'
        : categoryId === 'HyperLight_4X'
          ? 'Trụ 4 sợi (4𝑿)'
          : categoryId === 'HyperLight_5X'
            ? 'Trụ 5 sợi (5𝑿)'
            : categoryId === 'UltraLight_3D'
              ? 'Fan 3 sợi (3D)'
              : categoryId === 'UltraLight_4D'
                ? 'Fan 4 sợi (4D)'
                : categoryId === 'UltraLight_5D'
                  ? 'Fan 5 sợi (5D)'
                  : categoryId === 'IvyLight_3L'
                    ? 'Trụ 3 sợi dẹp (3𝓵)'
                    : categoryId === 'IvyLight_4L'
                      ? 'Trụ 4 sợi dẹp (4𝓵)'
                      : categoryId === 'IvyLight_5L'
                        ? 'Trụ 5 sợi dẹp (5𝓵)'
                        : 'Sợi đơn 1:1';

  if (meta) {
    return {
      skuCode: skuNum,
      countPerEye: meta.countPerEye,
      totalFibers: meta.totalFibers,
      unitWord,
      specLabel,
      fanLabel: meta.fanLabel,
      shortLabel: `Mã ${skuNum} (${meta.countPerEye} ${unitWord}/mắt · ${specLabel})`,
      detailLabel: `Mã ${skuNum} · ${meta.countPerEye} ${unitWord}/mắt (${specLabel} · ${meta.totalFibers} sợi 2 mắt)`,
      levelCode,
      badge: meta.badge,
    };
  }
  return {
    skuCode: skuNum,
    countPerEye: 90,
    totalFibers: 180,
    unitWord,
    specLabel,
    fanLabel: `Mã ${skuNum}`,
    shortLabel: `Mã ${skuNum} (90 ${unitWord}/mắt)`,
    detailLabel: `Mã dịch vụ ${skuNum}`,
  };
}
