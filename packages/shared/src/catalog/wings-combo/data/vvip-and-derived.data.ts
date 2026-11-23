import type { WingsComboCategory } from '../types.js';
import { classicVolumeCategory } from './classic-volume.data.js';

export const vvipCategory: WingsComboCategory = {
  id: 'VVIP',
  name: 'VVIP Pass',
  theme: 'black-fire',
  segment: 'Ultra-Premium',
  images: [
    {
      id: '33',
      image: 'https://wings-combo-service-landing-page.vercel.app/assets/33.21eb2eac48bd60edf610.webp',
      type: 'header',
      preview: 'https://wings-combo-service-landing-page.vercel.app/assets/33.21eb2eac48bd60edf610.webp',
    },
    {
      id: '34',
      image: 'https://wings-combo-service-landing-page.vercel.app/assets/34.93cb31a5ffe3eba09bd8.webp',
      type: 'card',
      preview: 'https://wings-combo-service-landing-page.vercel.app/assets/34-480.b7706715aa7454c3c95d.webp',
      previewSrcset:
        'https://wings-combo-service-landing-page.vercel.app/assets/34-480.b7706715aa7454c3c95d.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/34-800.35510dc65be8dbe1b0d6.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/34-1200.1e6db1bd083bdf664c1c.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/34-1600.c640dd61b1be25525a1a.webp 1600w',
    },
    {
      id: '35',
      image: 'https://wings-combo-service-landing-page.vercel.app/assets/35.8795324684658ece5772.webp',
      type: 'card',
      preview: 'https://wings-combo-service-landing-page.vercel.app/assets/35.8795324684658ece5772.webp',
    },
    {
      id: '38',
      image: 'https://wings-combo-service-landing-page.vercel.app/assets/38.4bf55619c2ebcafc125b.webp',
      type: 'card',
      preview: 'https://wings-combo-service-landing-page.vercel.app/assets/38.4bf55619c2ebcafc125b.webp',
    },
    {
      id: '39',
      image: 'https://wings-combo-service-landing-page.vercel.app/assets/39.9b7b65967912f717fa30.webp',
      type: 'card',
      preview: 'https://wings-combo-service-landing-page.vercel.app/assets/39.9b7b65967912f717fa30.webp',
    },
  ],
  unitPrices: [],
  rules: [
    {
      name: 'VVIP Pass',
      content: '20 Sessions',
      validityMonths: 36,
      discountPct: 0,
      isWelcomePackage: false,
      packageKind: 'vvip_pass',
      comboNewCount: 0,
      comboRefillCount: 0,
      bonusNewCount: 0,
      bonusRefillCount: 0,
      totalPaidSessions: 20,
      totalBonusSessions: 0,
      totalSessions: 20,
      cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/34.93cb31a5ffe3eba09bd8.webp',
      cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/34-480.b7706715aa7454c3c95d.webp',
      special: 'Limited Edition, áp dụng cho bạn và người thân',
      fixedPrice: 23900000,
      prices: [],
    },
  ],
};

// Phân định chuẩn theo chất liệu: Classic 1D (Mi lụa đơn), Volume 2D & 3D (Fan 2-3D mi lụa 0.07-0.10mm)
export const classic1DCat: WingsComboCategory = {
  ...classicVolumeCategory,
  id: 'Classic_1D',
  name: 'Classic 1D',
  theme: 'blue',
  segment: 'Mi Lụa Sợi Đơn (1D)',
  unitPrices: classicVolumeCategory.unitPrices,
  rules: classicVolumeCategory.rules,
};

export const volume2DCat: WingsComboCategory = {
  ...classicVolumeCategory,
  id: 'Volume_2D',
  name: 'Volume 2D',
  theme: 'teal',
  segment: 'Mi Lụa Fan 2D (0.07-0.10mm)',
  unitPrices: [
    { volume: 550, newPrice: 550000, refillPrice: 340000, isUnderLash: false },
    { volume: 660, newPrice: 660000, refillPrice: 390000, isUnderLash: false },
    { volume: 770, newPrice: 770000, refillPrice: 470000, isUnderLash: false },
    { volume: 880, newPrice: 880000, refillPrice: 530000, isUnderLash: false },
    {
      volume: 'under',
      newPrice: 390000,
      refillPrice: 0,
      serviceKey: 'under_390',
      label: 'Mi dưới 390',
      isUnderLash: true,
    },
  ],
  rules: classicVolumeCategory.rules.map((r) => ({
    ...r,
    prices: r.prices.filter((p) => p.isUnderLash || [550, 660, 770, 880].includes(Number(p.volume))),
  })),
};

export const volume3DCat: WingsComboCategory = {
  ...classicVolumeCategory,
  id: 'Volume_3D',
  name: 'Volume 3D',
  theme: 'teal',
  segment: 'Mi Lụa Fan 3D (0.07-0.10mm)',
  unitPrices: [
    { volume: 660, newPrice: 660000, refillPrice: 390000, isUnderLash: false },
    { volume: 770, newPrice: 770000, refillPrice: 470000, isUnderLash: false },
    { volume: 880, newPrice: 880000, refillPrice: 530000, isUnderLash: false },
    { volume: 1110, newPrice: 1110000, refillPrice: 680000, isUnderLash: false },
    {
      volume: 'under',
      newPrice: 390000,
      refillPrice: 0,
      serviceKey: 'under_390',
      label: 'Mi dưới 390',
      isUnderLash: true,
    },
  ],
  rules: classicVolumeCategory.rules.map((r) => ({
    ...r,
    prices: r.prices.filter((p) => p.isUnderLash || [660, 770, 880, 1110].includes(Number(p.volume))),
  })),
};
