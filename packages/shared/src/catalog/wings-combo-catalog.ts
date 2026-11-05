import { calculateComboBonus } from '../types/career-progression.js';

export type WingsComboCategoryId =
  | 'Classic_Volume'
  | 'FlawlessMink'
  | 'HyperLight_2X'
  | 'HyperLight_3X'
  | 'HyperLight_4X'
  | 'HyperLight_5X'
  | 'IvyLight_3L'
  | 'IvyLight_4L'
  | 'IvyLight_5L'
  | 'UltraLight_3D'
  | 'UltraLight_4D'
  | 'UltraLight_5D'
  | 'VVIP';

export type WingsComboPackageKind = 'mixed_new_refill' | 'new_only' | 'vvip_pass';

export interface WingsComboCardImage {
  id: string;
  image: string;
  type: 'header' | 'card' | string;
  preview: string;
  previewSrcset?: string;
}

export interface WingsComboUnitPrice {
  volume: number | 'under';
  newPrice: number;
  refillPrice: number;
  serviceKey?: string;
  label?: string;
  isUnderLash?: boolean;
}

export interface WingsComboRulePrice {
  volume: number | 'under';
  newPrice: number;
  refillPrice: number;
  retailTotal: number;
  comboPrice: number;
  serviceKey?: string;
  label?: string;
  isUnderLash?: boolean;
}

export interface WingsComboRule {
  name: string;
  content: string;
  validityMonths: number;
  discountPct: number;
  note?: string;
  isWelcomePackage: boolean;
  packageKind: WingsComboPackageKind | string;
  comboNewCount: number;
  comboRefillCount: number;
  bonusNewCount: number;
  bonusRefillCount: number;
  totalPaidSessions: number;
  totalBonusSessions: number;
  totalSessions: number;
  imageId?: number;
  cardImageUrl: string;
  cardPreviewUrl: string;
  special?: string;
  fixedPrice?: number;
  prices: WingsComboRulePrice[];
}

export interface WingsComboCategory {
  id: WingsComboCategoryId;
  name: string;
  theme: string;
  segment: string;
  images: WingsComboCardImage[];
  unitPrices: WingsComboUnitPrice[];
  rules: WingsComboRule[];
}

export interface VolumeFiberMetadata {
  skuCode: number | 'under';
  countPerEye: number;
  totalFibers: number;
  unitWord: 'trụ' | 'fan' | 'sợi';
  specLabel: string;
  fanLabel: string;
  shortLabel: string;
  detailLabel: string;
  badge?: 'BEST SELLER' | 'MOST POPULAR';
}

export interface WelcomeComboEligibilityResult {
  eligible: boolean;
  isFirstDayService: boolean;
  visitCount: number;
  reason: string;
  badgeText: string;
}

export interface MatchedComboPackageOption {
  id: string;
  categoryId: WingsComboCategoryId;
  categoryName: string;
  ruleName: string;
  displayName: string;
  shortRuleLabel: string;
  volume: number | 'under';
  volumeMeta: VolumeFiberMetadata;
  packageKind: WingsComboPackageKind | string;
  isWelcomePackage: boolean;
  isLocked: boolean;
  lockReason?: string;
  validityMonths: number;
  discountPct: number;
  comboNewCount: number;
  comboRefillCount: number;
  bonusNewCount: number;
  bonusRefillCount: number;
  totalPaidSessions: number;
  totalBonusSessions: number;
  totalSessions: number;
  newUnitPrice: number;
  refillUnitPrice: number;
  retailTotal: number;
  comboPrice: number;
  comboPriceWithVat: number;
  savingsAmount: number;
  avgPerSessionPrice: number;
  cvBonus: number;
  cardImageUrl: string;
  cardPreviewUrl: string;
  readableContent: string;
  specialNote?: string;
  theme?: string;
  allVolumePrices?: WingsComboRulePrice[];
}

export interface ComboPurchaseAccountingBreakdown {
  mode: 'BUY_NEW_COMBO';
  packageId: string;
  packageName: string;
  categoryId: WingsComboCategoryId;
  categoryName: string;
  ruleName: string;
  volume: number | 'under';
  comboPrice: number;
  comboPriceWithVat: number;
  retailTotal: number;
  savingsAmount: number;
  /** Khi mua gói mới tại Checkout: trừ luôn buổi đầu tiên vào gói, khách KHÔNG phải trả tiền lẻ buổi hôm nay */
  todaySingleServiceWaived: boolean;
  todaySingleServiceOriginalPrice: number;
  todayServiceChargeToCustomer: number;
  /** Kế toán doanh thu thực hiện vs doanh thu chờ phân bổ (Deferred Revenue) */
  recognizedRevenueToday: number;
  deferredRevenueBalance: number;
  avgPerSessionPrice: number;
  /** Số lượt trong ví gói (Tách bạch Lượt Mua vs Lượt Tặng 0đ theo chuẩn FIFO) */
  initialWallet: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalSessions: number;
  };
  deductedToday: {
    sessionType: 'PAID_NEW' | 'VVIP_PASS';
    count: 1;
    recognizedValue: number;
  };
  remainingWalletAfterToday: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalPaidRemaining: number;
    totalBonusRemaining: number;
    totalRemaining: number;
  };
  cvComboBonus: number;
  accountingSummaryNote: string;
}

export interface ComboRedemptionAccountingBreakdown {
  mode: 'REDEEM_EXISTING_COMBO';
  comboName: string;
  categoryId: WingsComboCategoryId;
  baseVolume: number | 'under';
  targetVolume: number | 'under';
  requestedServiceType: 'Normal' | 'Retain';
  isWithin25DayCycle: boolean;
  /** Loại lượt bị trừ trong ví: ưu tiên trừ Lượt Mua (PAID) trước, hết lượt mua mới trừ Lượt Tặng (BONUS 0đ) */
  deductedBucket: 'PAID_NEW' | 'PAID_REFILL' | 'BONUS_NEW' | 'BONUS_REFILL' | 'CONVERTED_REFILL_TO_NEW';
  /** Phụ thu tự động nếu ví chỉ còn lượt Refill mà khách làm Nối Mới (hoặc quá hạn 25 ngày) */
  typeConversionSurcharge: number;
  /** Phụ thu tự động nếu khách nâng cấp số sợi (Up-size Volume) hoặc đổi lên dòng mi cao hơn */
  upgradeVolumeSurcharge: number;
  /** Tổng tiền khách cần trả thêm hôm nay (0đ nếu đúng gói & còn lượt phù hợp) */
  totalCustomerPayToday: number;
  totalCustomerPayTodayWithVat: number;
  /** Doanh thu ghi nhận cho ca làm hôm nay (Lượt Mua = đơn giá gốc + phụ thu; Lượt Tặng = 0đ + phụ thu) */
  recognizedRevenueToday: number;
  walletBefore: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalRemaining: number;
  };
  walletAfter: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalRemaining: number;
  };
  explanation: string;
}

export const WINGS_COMBO_CATEGORIES: WingsComboCategory[] = [
  {
    id: 'Classic_Volume',
    name: 'Classic & Volume 2D',
    theme: 'blue',
    segment: 'Entry-level (giá thấp nhất)',
    images: [
      {
        id: '65',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/65.391b9bfc7cf130777375.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/65.391b9bfc7cf130777375.webp',
      },
      {
        id: '66',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/66.ba705c46575aaffcd1cb.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/66-480.4fc8ea0c5cadd8c43560.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/66-480.4fc8ea0c5cadd8c43560.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/66-800.79e620a1badc387a4a72.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/66-1200.b1f73eda7b377bcdd1ee.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/66-1600.ed761f24e762684ef07f.webp 1600w',
      },
      {
        id: '67',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/67.c38fcaa062a9f883d21f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/67.c38fcaa062a9f883d21f.webp',
      },
      {
        id: '68',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/68.277ca8d25befe2ec80b6.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/68-480.10293188486ebe547d80.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/68-480.10293188486ebe547d80.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/68-800.bb105d37b325cf202ed1.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/68-1200.7f7449ceac6076390020.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/68-1600.dfc3d716c2139923cc74.webp 1600w',
      },
      {
        id: '69',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/69.d123d4e26cdc7bdbcb19.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/69.d123d4e26cdc7bdbcb19.webp',
      },
      {
        id: '70',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/70.fd0509b8fdd79a3d271c.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/70-480.b1fa54030a1ed6cfb378.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/70-480.b1fa54030a1ed6cfb378.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/70-800.0a806df72da7ac4dd74c.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/70-1200.bf3b366e8419bb6b9840.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/70-1600.f0435bfc3ff9b730544e.webp 1600w',
      },
      {
        id: '71',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/71.4614cb01a84ff128221e.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/71.4614cb01a84ff128221e.webp',
      },
      {
        id: '72',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/72.3127c66723d8a5e04a97.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/72-480.edbe8693cc6b990fb131.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/72-480.edbe8693cc6b990fb131.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/72-800.4c3fc776a0164fb8e62a.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/72-1200.4bf7e8a7beec442b6a77.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/72-1600.cf9a5bfb6f5f88b145ff.webp 1600w',
      },
      {
        id: '73',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/73.1f18986f9085e57f6e2f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/73.1f18986f9085e57f6e2f.webp',
      },
    ],
    unitPrices: [
      {
        volume: 390,
        newPrice: 390000,
        refillPrice: 250000,
        isUnderLash: false,
      },
      {
        volume: 440,
        newPrice: 440000,
        refillPrice: 280000,
        isUnderLash: false,
      },
      {
        volume: 550,
        newPrice: 550000,
        refillPrice: 340000,
        isUnderLash: false,
      },
      {
        volume: 660,
        newPrice: 660000,
        refillPrice: 390000,
        isUnderLash: false,
      },
      {
        volume: 880,
        newPrice: 880000,
        refillPrice: 530000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 39,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 66,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/66.ba705c46575aaffcd1cb.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/66-480.4fc8ea0c5cadd8c43560.webp',
        prices: [
          {
            volume: 390,
            newPrice: 390000,
            refillPrice: 250000,
            retailTotal: 890000,
            comboPrice: 640000,
            isUnderLash: false,
          },
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 1000000,
            comboPrice: 720000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1230000,
            comboPrice: 890000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 1440000,
            comboPrice: 1050000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 1940000,
            comboPrice: 1410000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 68,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/68.277ca8d25befe2ec80b6.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/68-480.10293188486ebe547d80.webp',
        prices: [
          {
            volume: 390,
            newPrice: 390000,
            refillPrice: 250000,
            retailTotal: 1390000,
            comboPrice: 1140000,
            isUnderLash: false,
          },
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 1560000,
            comboPrice: 1280000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1910000,
            comboPrice: 1570000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 2220000,
            comboPrice: 1830000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 3000000,
            comboPrice: 2470000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 70,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/70.fd0509b8fdd79a3d271c.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/70-480.b1fa54030a1ed6cfb378.webp',
        prices: [
          {
            volume: 390,
            newPrice: 390000,
            refillPrice: 250000,
            retailTotal: 3060000,
            comboPrice: 2170000,
            isUnderLash: false,
          },
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 3440000,
            comboPrice: 2440000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 4240000,
            comboPrice: 3010000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 4980000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 6700000,
            comboPrice: 4760000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 72,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/72.3127c66723d8a5e04a97.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/72-480.edbe8693cc6b990fb131.webp',
        prices: [
          {
            volume: 390,
            newPrice: 390000,
            refillPrice: 250000,
            retailTotal: 4980000,
            comboPrice: 3060000,
            isUnderLash: false,
          },
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 5600000,
            comboPrice: 3440000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 6910000,
            comboPrice: 4240000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 8130000,
            comboPrice: 4980000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 10930000,
            comboPrice: 6700000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'FlawlessMink',
    name: 'Flawless Mink',
    theme: 'black-gold',
    segment: 'Premium',
    images: [
      {
        id: '49',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/49.3a973144efb0d5d77c7e.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/49.3a973144efb0d5d77c7e.webp',
      },
      {
        id: '50',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/50.aa770c24f7706491217f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/50-480.f5a75852074cd564c3be.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/50-480.f5a75852074cd564c3be.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/50-800.67e3686bf47a97a596ff.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/50-1200.466f57f5ea3ec83f432e.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/50-1600.5840f254f73c26485fde.webp 1600w',
      },
      {
        id: '51',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/51.d3c292c5cdd86d60d47c.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/51.d3c292c5cdd86d60d47c.webp',
      },
      {
        id: '52',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/52.677c2da9970a3fa6d54d.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/52-480.d46e031a9b02357d27cf.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/52-480.d46e031a9b02357d27cf.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/52-800.7a663e05d4336f54c62b.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/52-1200.40a49444260358390123.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/52-1600.7c9f0c9af2e77c8cb371.webp 1600w',
      },
      {
        id: '53',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/53.b51053195449432877a2.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/53.b51053195449432877a2.webp',
      },
      {
        id: '54',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/54.91367c81e620d479e559.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/54-480.b4131b5f2ee2f043fc49.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/54-480.b4131b5f2ee2f043fc49.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/54-800.149ef19357b3f2b71bcc.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/54-1200.22d74d2f26f15858877e.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/54-1600.e2cc3a7629081bf48432.webp 1600w',
      },
      {
        id: '55',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/55.ae467a25c795815a778d.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/55.ae467a25c795815a778d.webp',
      },
      {
        id: '56',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/56.ff6ffe287ab7fec1c8bc.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/56-480.1291a290a6d64051b583.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/56-480.1291a290a6d64051b583.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/56-800.dc2f26a58c38d357bdba.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/56-1200.5bfde30e3da25429d48e.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/56-1600.611623b9d9be24bfa15f.webp 1600w',
      },
      {
        id: '57',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/57.56257bb71d1d2954b8cf.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/57.56257bb71d1d2954b8cf.webp',
      },
      {
        id: '58',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/58.6fa86ab7530241cc2005.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/58.6fa86ab7530241cc2005.webp',
      },
      {
        id: '59',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/59.ecba254659076aacaf92.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/59-480.3b8f09ad7b08a04d3ed9.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/59-480.3b8f09ad7b08a04d3ed9.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/59-800.48bc2f6495000e41d1a8.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/59-1200.89d8836212f10a3e22fa.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/59-1600.61542c06c6b677089b31.webp 1600w',
      },
      {
        id: '60',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/60.760cb247185d777c53fa.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/60.760cb247185d777c53fa.webp',
      },
      {
        id: '61',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/61.e5243a90cccbe2f9dcaa.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/61-480.0e3f3ba79d36c8f4e9ff.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/61-480.0e3f3ba79d36c8f4e9ff.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/61-800.25b2686e50624f41a98f.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/61-1200.c0e924facb0f551eea1f.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/61-1600.83e47f4fc75f206e8176.webp 1600w',
      },
      {
        id: '62',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/62.9bb7502be98a9ef19215.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/62.9bb7502be98a9ef19215.webp',
      },
      {
        id: '63',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/63.b87ba7db501efe93db2f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/63-480.868d2b1e16292538d12e.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/63-480.868d2b1e16292538d12e.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/63-800.d49de1563f3649ab8c0b.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/63-1200.c9379f9350125cb7c743.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/63-1600.ca6982856ce11eee18de.webp 1600w',
      },
      {
        id: '64',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/64.8111c7b2bb7119beaeee.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/64.8111c7b2bb7119beaeee.webp',
      },
    ],
    unitPrices: [
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 880,
        newPrice: 880000,
        refillPrice: 530000,
        isUnderLash: false,
      },
      {
        volume: 1110,
        newPrice: 1110000,
        refillPrice: 680000,
        isUnderLash: false,
      },
      {
        volume: 1440,
        newPrice: 1440000,
        refillPrice: 860000,
        isUnderLash: false,
      },
      {
        volume: 1770,
        newPrice: 1770000,
        refillPrice: 1090000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 2 New, Bonus 1 New',
        validityMonths: 4,
        discountPct: 50,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'new_only',
        comboNewCount: 2,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 50,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/50.aa770c24f7706491217f.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/50-480.f5a75852074cd564c3be.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2310000,
            comboPrice: 1540000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 2640000,
            comboPrice: 1760000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 3330000,
            comboPrice: 2220000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 4320000,
            comboPrice: 2880000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 5310000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 4 New, Bonus 1 New',
        validityMonths: 7,
        discountPct: 25,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 4,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 52,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/52.677c2da9970a3fa6d54d.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/52-480.d46e031a9b02357d27cf.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 3850000,
            comboPrice: 3080000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 4400000,
            comboPrice: 3520000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 5550000,
            comboPrice: 4440000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 7200000,
            comboPrice: 5760000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 8850000,
            comboPrice: 7080000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 2',
        content: 'Combo 4 New, Bonus 2 New',
        validityMonths: 5,
        discountPct: 50,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 4,
        comboRefillCount: 0,
        bonusNewCount: 2,
        bonusRefillCount: 0,
        totalPaidSessions: 4,
        totalBonusSessions: 2,
        totalSessions: 6,
        imageId: 59,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/59.ecba254659076aacaf92.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/59-480.3b8f09ad7b08a04d3ed9.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 4620000,
            comboPrice: 3080000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 5280000,
            comboPrice: 3520000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 6660000,
            comboPrice: 4440000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 8640000,
            comboPrice: 5760000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 10620000,
            comboPrice: 7080000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 2340000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 7 New, Bonus 3 New',
        validityMonths: 15,
        discountPct: 43,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 7,
        comboRefillCount: 0,
        bonusNewCount: 3,
        bonusRefillCount: 0,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 54,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/54.91367c81e620d479e559.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/54-480.b4131b5f2ee2f043fc49.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 7700000,
            comboPrice: 5390000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 8800000,
            comboPrice: 6160000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 11100000,
            comboPrice: 7770000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 14400000,
            comboPrice: 10080000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 17700000,
            comboPrice: 12390000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 6',
        content: 'Combo 7 New, Bonus 6 New',
        validityMonths: 10,
        discountPct: 86,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 7,
        comboRefillCount: 0,
        bonusNewCount: 6,
        bonusRefillCount: 0,
        totalPaidSessions: 7,
        totalBonusSessions: 6,
        totalSessions: 13,
        imageId: 61,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/61.e5243a90cccbe2f9dcaa.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/61-480.0e3f3ba79d36c8f4e9ff.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 10010000,
            comboPrice: 5390000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 11440000,
            comboPrice: 6160000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 14430000,
            comboPrice: 7770000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 18720000,
            comboPrice: 10080000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 23010000,
            comboPrice: 12390000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 5070000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 10 New, Bonus 6 New',
        validityMonths: 24,
        discountPct: 60,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 10,
        comboRefillCount: 0,
        bonusNewCount: 6,
        bonusRefillCount: 0,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 56,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/56.ff6ffe287ab7fec1c8bc.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/56-480.1291a290a6d64051b583.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 12320000,
            comboPrice: 7700000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 14080000,
            comboPrice: 8800000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 17760000,
            comboPrice: 11100000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 23040000,
            comboPrice: 14400000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 28320000,
            comboPrice: 17700000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 10',
        content: 'Combo 10 New, Bonus 10 New',
        validityMonths: 16,
        discountPct: 100,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 10,
        comboRefillCount: 0,
        bonusNewCount: 10,
        bonusRefillCount: 0,
        totalPaidSessions: 10,
        totalBonusSessions: 10,
        totalSessions: 20,
        imageId: 63,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/63.b87ba7db501efe93db2f.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/63-480.868d2b1e16292538d12e.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 15400000,
            comboPrice: 7700000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 17600000,
            comboPrice: 8800000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 22200000,
            comboPrice: 11100000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 28800000,
            comboPrice: 14400000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 35400000,
            comboPrice: 17700000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 7800000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'HyperLight_2X',
    name: 'HyperLight 2X',
    theme: 'purple',
    segment: 'Mid-High',
    images: [
      {
        id: '74',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
      },
      {
        id: '81',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/81.06ab98f147439fb58012.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/81-480.936692e810b46623478a.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/81-480.936692e810b46623478a.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/81-800.18768f3b55656e1f89dc.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/81-1200.b939ab6b52b35e4299ff.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/81-1600.b4b727a9e8b68caff066.webp 1600w',
      },
      {
        id: '82',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/82.4864559248c43ea2c836.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/82.4864559248c43ea2c836.webp',
      },
      {
        id: '83',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
      },
      {
        id: '90',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/90.3bc5101ba1670da19f49.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/90-480.6da9729051231eff8240.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/90-480.6da9729051231eff8240.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/90-800.4344f4da966566ecd001.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/90-1200.2fcc9b09e590ddf1b5fc.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/90-1600.33953f104d23c3c2e55e.webp 1600w',
      },
      {
        id: '91',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/91.24bcfd42ce2ff853e274.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/91.24bcfd42ce2ff853e274.webp',
      },
      {
        id: '92',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
      },
      {
        id: '99',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/99.48dd729f01448b103448.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/99-480.025c37546cee8c843495.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/99-480.025c37546cee8c843495.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/99-800.2f6b86428b5085b7eb37.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/99-1200.318669f898e3e2d36b73.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/99-1600.9325c7682fe91c457c8c.webp 1600w',
      },
      {
        id: '100',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/100.829dbd51ea25e4852d07.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/100.829dbd51ea25e4852d07.webp',
      },
      {
        id: '101',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
      },
      {
        id: '108',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/108.531d3387bdbb7f074ad3.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/108-480.3df4d9d5a2c95601c70b.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/108-480.3df4d9d5a2c95601c70b.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/108-800.48cfb1a6db8fc8713ab9.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/108-1200.3f248bbc6ae973bbe9ef.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/108-1600.c59d428a35df6f2680a7.webp 1600w',
      },
      {
        id: '109',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/109.b2132b504ec603da7c47.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/109.b2132b504ec603da7c47.webp',
      },
    ],
    unitPrices: [
      {
        volume: 440,
        newPrice: 440000,
        refillPrice: 280000,
        isUnderLash: false,
      },
      {
        volume: 550,
        newPrice: 550000,
        refillPrice: 340000,
        isUnderLash: false,
      },
      {
        volume: 660,
        newPrice: 660000,
        refillPrice: 390000,
        isUnderLash: false,
      },
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 1110,
        newPrice: 1110000,
        refillPrice: 680000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 108,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/108.531d3387bdbb7f074ad3.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/108-480.3df4d9d5a2c95601c70b.webp',
        prices: [
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 1000000,
            comboPrice: 720000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1230000,
            comboPrice: 890000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 1440000,
            comboPrice: 1050000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 2470000,
            comboPrice: 1790000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 99,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/99.48dd729f01448b103448.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/99-480.025c37546cee8c843495.webp',
        prices: [
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 1560000,
            comboPrice: 1280000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1910000,
            comboPrice: 1570000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 2220000,
            comboPrice: 1830000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 3830000,
            comboPrice: 3150000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 90,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/90.3bc5101ba1670da19f49.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/90-480.6da9729051231eff8240.webp',
        prices: [
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 3440000,
            comboPrice: 2440000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 4240000,
            comboPrice: 3010000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 4980000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 8520000,
            comboPrice: 6050000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 81,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/81.06ab98f147439fb58012.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/81-480.936692e810b46623478a.webp',
        prices: [
          {
            volume: 440,
            newPrice: 440000,
            refillPrice: 280000,
            retailTotal: 5600000,
            comboPrice: 3440000,
            isUnderLash: false,
          },
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 6910000,
            comboPrice: 4240000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 8130000,
            comboPrice: 4980000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 13890000,
            comboPrice: 8520000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'HyperLight_3X',
    name: 'HyperLight 3X',
    theme: 'purple',
    segment: 'Mid-High',
    images: [
      {
        id: '74',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
      },
      {
        id: '79',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/79.db8754eb57ad33489447.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/79-480.1ef7363c502c19800be0.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/79-480.1ef7363c502c19800be0.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/79-800.a322cbe1ab7137e1b711.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/79-1200.f2be4a3748e14d0a4750.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/79-1600.8976299249b9b1e453e4.webp 1600w',
      },
      {
        id: '80',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/80.f63fa57c461b0b041d39.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/80.f63fa57c461b0b041d39.webp',
      },
      {
        id: '83',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
      },
      {
        id: '88',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/88.67af629c14bb1a8c229b.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/88-480.c4a2bf2d25c95539cfc1.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/88-480.c4a2bf2d25c95539cfc1.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/88-800.c07873b099a4134818bf.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/88-1200.590d441a892b99d12d3d.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/88-1600.d98a946739a71610bd8f.webp 1600w',
      },
      {
        id: '89',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/89.133591ea7ccf8bb96dd1.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/89.133591ea7ccf8bb96dd1.webp',
      },
      {
        id: '92',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
      },
      {
        id: '97',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/97.c0c2dca1c9723a127223.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/97-480.22a1f3f2e1690df779ac.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/97-480.22a1f3f2e1690df779ac.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/97-800.2dacaa1bd77cf5b56a6d.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/97-1200.2719de15997413fb27c5.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/97-1600.471b667201309fe9d641.webp 1600w',
      },
      {
        id: '98',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/98.7ffcb938868a748e3097.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/98.7ffcb938868a748e3097.webp',
      },
      {
        id: '101',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
      },
      {
        id: '106',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/106.2cf9ac5a9de1c6f9d7d7.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/106-480.515679893abebf3689dc.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/106-480.515679893abebf3689dc.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/106-800.6a03fb675712240e5370.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/106-1200.1fb67b0e8a7b1d958c75.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/106-1600.e0ae39ec5e9ee142dd88.webp 1600w',
      },
      {
        id: '107',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/107.33ba24d6a22eff146d80.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/107.33ba24d6a22eff146d80.webp',
      },
    ],
    unitPrices: [
      {
        volume: 550,
        newPrice: 550000,
        refillPrice: 340000,
        isUnderLash: false,
      },
      {
        volume: 660,
        newPrice: 660000,
        refillPrice: 390000,
        isUnderLash: false,
      },
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 880,
        newPrice: 880000,
        refillPrice: 530000,
        isUnderLash: false,
      },
      {
        volume: 1220,
        newPrice: 1220000,
        refillPrice: 740000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 106,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/106.2cf9ac5a9de1c6f9d7d7.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/106-480.515679893abebf3689dc.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1230000,
            comboPrice: 890000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 1440000,
            comboPrice: 1050000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 1940000,
            comboPrice: 1410000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 2700000,
            comboPrice: 1960000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 97,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/97.c0c2dca1c9723a127223.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/97-480.22a1f3f2e1690df779ac.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1910000,
            comboPrice: 1570000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 2220000,
            comboPrice: 1830000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 3000000,
            comboPrice: 2470000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 4180000,
            comboPrice: 3440000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 88,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/88.67af629c14bb1a8c229b.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/88-480.c4a2bf2d25c95539cfc1.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 4240000,
            comboPrice: 3010000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 4980000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 6700000,
            comboPrice: 4760000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 9320000,
            comboPrice: 6620000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 79,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/79.db8754eb57ad33489447.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/79-480.1ef7363c502c19800be0.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 6910000,
            comboPrice: 4240000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 8130000,
            comboPrice: 4980000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 10930000,
            comboPrice: 6700000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 15200000,
            comboPrice: 9320000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'HyperLight_4X',
    name: 'HyperLight 4X',
    theme: 'purple',
    segment: 'Mid-High',
    images: [
      {
        id: '74',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
      },
      {
        id: '77',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/77.9bac24748501266e12f0.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/77-480.55a1364c19a9a339b110.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/77-480.55a1364c19a9a339b110.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/77-800.bc6c5d0196f5cca88173.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/77-1200.0485f92151dc630baa1c.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/77-1600.678b10ff2bc21b960f52.webp 1600w',
      },
      {
        id: '78',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/78.94cb94b78064d5144a88.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/78.94cb94b78064d5144a88.webp',
      },
      {
        id: '83',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
      },
      {
        id: '86',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/86.ba9744e322007ccf9df8.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/86-480.d91af5f04da352696fd0.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/86-480.d91af5f04da352696fd0.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/86-800.de4d4ca2ea851efb0f99.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/86-1200.4111595f86ba91313ae0.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/86-1600.d033b013b7bffd39a6e7.webp 1600w',
      },
      {
        id: '87',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/87.dcd6d44aebd4ec6f092f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/87.dcd6d44aebd4ec6f092f.webp',
      },
      {
        id: '92',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
      },
      {
        id: '95',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/95.638633510fe70dbab85e.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/95-480.37dd4e9f09098b02796d.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/95-480.37dd4e9f09098b02796d.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/95-800.220e6fbcc8e410d0b5af.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/95-1200.afee3fd0038a89b61dd9.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/95-1600.139f20bb8ba305a63b5f.webp 1600w',
      },
      {
        id: '96',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/96.9d04ecb8a238f79ca22f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/96.9d04ecb8a238f79ca22f.webp',
      },
      {
        id: '101',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
      },
      {
        id: '104',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/104.95c253b4fb213a00589f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/104-480.3d3917259be7dea511d1.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/104-480.3d3917259be7dea511d1.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/104-800.9ea608933de72623a9bd.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/104-1200.f42f9323c2d2ddc1a6a3.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/104-1600.0dc323c6a384623cec5c.webp 1600w',
      },
      {
        id: '105',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/105.d974864472ec32330d68.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/105.d974864472ec32330d68.webp',
      },
    ],
    unitPrices: [
      {
        volume: 660,
        newPrice: 660000,
        refillPrice: 390000,
        isUnderLash: false,
      },
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 880,
        newPrice: 880000,
        refillPrice: 530000,
        isUnderLash: false,
      },
      {
        volume: 990,
        newPrice: 990000,
        refillPrice: 590000,
        isUnderLash: false,
      },
      {
        volume: 1330,
        newPrice: 1330000,
        refillPrice: 810000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 104,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/104.95c253b4fb213a00589f.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/104-480.3d3917259be7dea511d1.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 1440000,
            comboPrice: 1050000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 1940000,
            comboPrice: 1410000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 2170000,
            comboPrice: 1580000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 2950000,
            comboPrice: 2140000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 95,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/95.638633510fe70dbab85e.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/95-480.37dd4e9f09098b02796d.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 2220000,
            comboPrice: 1830000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 3000000,
            comboPrice: 2470000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 3350000,
            comboPrice: 2760000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 4570000,
            comboPrice: 3760000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 86,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/86.ba9744e322007ccf9df8.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/86-480.d91af5f04da352696fd0.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 4980000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 6700000,
            comboPrice: 4760000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 7500000,
            comboPrice: 5330000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 10180000,
            comboPrice: 7230000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 77,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/77.9bac24748501266e12f0.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/77-480.55a1364c19a9a339b110.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 8130000,
            comboPrice: 4980000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 10930000,
            comboPrice: 6700000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 12240000,
            comboPrice: 7500000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 16600000,
            comboPrice: 10180000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'HyperLight_5X',
    name: 'HyperLight 5X',
    theme: 'purple',
    segment: 'Mid-High',
    images: [
      {
        id: '74',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/74.3b769db77a316e268107.webp',
      },
      {
        id: '75',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/75.642864fa3f3b65ee07e8.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/75-480.2cd63d17a2526560ad63.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/75-480.2cd63d17a2526560ad63.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/75-800.13c6877f59cdebeb1495.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/75-1200.c4cfe933eab22d42669d.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/75-1600.a5c5cce4ad626e8567e2.webp 1600w',
      },
      {
        id: '76',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/76.8e73cc294b846306ccfc.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/76.8e73cc294b846306ccfc.webp',
      },
      {
        id: '83',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/83.0c41ac912bee0521067b.webp',
      },
      {
        id: '84',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/84.abe882f351af1fc95de7.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/84-480.8ef92a2557c8f9d1d26e.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/84-480.8ef92a2557c8f9d1d26e.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/84-800.b63216c90a8efed2c41a.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/84-1200.ddd8f91ef44427174eed.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/84-1600.27f0ecfd638e5a47b360.webp 1600w',
      },
      {
        id: '85',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/85.ac5f6206b2a528ae2d94.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/85.ac5f6206b2a528ae2d94.webp',
      },
      {
        id: '92',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/92.f595b743612fa3cc0241.webp',
      },
      {
        id: '93',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/93.de069ff76ad8d531fcc1.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/93-480.ba287358b1f32c3c50f8.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/93-480.ba287358b1f32c3c50f8.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/93-800.3a815ca116398d4db28d.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/93-1200.923ce4090fd248012b5a.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/93-1600.7646c496e24eed4d6ccc.webp 1600w',
      },
      {
        id: '94',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/94.fc911d7b0a7d8a894f55.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/94.fc911d7b0a7d8a894f55.webp',
      },
      {
        id: '101',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/101.277dbf906016fd740f23.webp',
      },
      {
        id: '102',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/102.b374d423690a92145804.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/102-480.e1f13a765f56d98e3245.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/102-480.e1f13a765f56d98e3245.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/102-800.4b58fb27bbf120bdf0b4.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/102-1200.93cfc2fc215af9edbd12.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/102-1600.29861d8ffb51d02b7a93.webp 1600w',
      },
      {
        id: '103',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/103.3d3efeb333879f129742.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/103.3d3efeb333879f129742.webp',
      },
    ],
    unitPrices: [
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 990,
        newPrice: 990000,
        refillPrice: 590000,
        isUnderLash: false,
      },
      {
        volume: 1220,
        newPrice: 1220000,
        refillPrice: 740000,
        isUnderLash: false,
      },
      {
        volume: 1440,
        newPrice: 1440000,
        refillPrice: 860000,
        isUnderLash: false,
      },
      {
        volume: 1770,
        newPrice: 1770000,
        refillPrice: 1090000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 102,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/102.b374d423690a92145804.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/102-480.e1f13a765f56d98e3245.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 2170000,
            comboPrice: 1580000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 2700000,
            comboPrice: 1960000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 3160000,
            comboPrice: 2300000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 3950000,
            comboPrice: 2860000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 93,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/93.de069ff76ad8d531fcc1.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/93-480.ba287358b1f32c3c50f8.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 3350000,
            comboPrice: 2760000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 4180000,
            comboPrice: 3440000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 4880000,
            comboPrice: 4020000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 6130000,
            comboPrice: 5040000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 84,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/84.abe882f351af1fc95de7.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/84-480.8ef92a2557c8f9d1d26e.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 7500000,
            comboPrice: 5330000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 9320000,
            comboPrice: 6620000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 10920000,
            comboPrice: 7760000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 13620000,
            comboPrice: 9670000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 75,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/75.642864fa3f3b65ee07e8.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/75-480.2cd63d17a2526560ad63.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 12240000,
            comboPrice: 7500000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 15200000,
            comboPrice: 9320000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 17820000,
            comboPrice: 10920000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 22200000,
            comboPrice: 13620000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'IvyLight_3L',
    name: 'IvyLight 3L',
    theme: 'green',
    segment: 'Mid-range',
    images: [
      {
        id: '4',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/4.7f3f9a9309af3b658aa4.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/4.7f3f9a9309af3b658aa4.webp',
      },
      {
        id: '5',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/5.4d7c337f129cbf50169f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/5-480.41bb16bfadcec320ae99.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/5-480.41bb16bfadcec320ae99.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/5-800.89bd8ca6281916239314.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/5-1200.10c33b74fcae7c5ba8f3.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/5-1600.61b4bf7bf332c79fa362.webp 1600w',
      },
      {
        id: '9',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/9.926c08866fbe80033c68.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/9-480.4f1303175937bd5cd655.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/9-480.4f1303175937bd5cd655.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/9-800.785ad71068edbeea915f.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/9-1200.20655fcf71e28b4d3c73.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/9-1600.4911d46862c79c26f719.webp 1600w',
      },
      {
        id: '10',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/10.8a2a0ac67107cd8be697.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/10.8a2a0ac67107cd8be697.webp',
      },
      {
        id: '11',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/11.e80e09c6a233b0eb97b1.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/11-480.18898a43dde8b9bb6336.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/11-480.18898a43dde8b9bb6336.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/11-800.557972e4d7da7cb3c49d.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/11-1200.2c1577c6004c3b4bae4a.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/11-1600.4d301990983a02feca04.webp 1600w',
      },
      {
        id: '12',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/12.e4f2027659c58c1e2861.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/12.e4f2027659c58c1e2861.webp',
      },
      {
        id: '13',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/13.13aab6f85a3715409f47.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/13-480.16c1e9f157431ccb7172.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/13-480.16c1e9f157431ccb7172.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/13-800.600857c374e5706e6b22.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/13-1200.fe8bc1870ec727b16945.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/13-1600.4f392503d43ca5a9c3c7.webp 1600w',
      },
      {
        id: '14',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/14.269c3f06289fbe1e0ced.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/14.269c3f06289fbe1e0ced.webp',
      },
    ],
    unitPrices: [
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 880,
        newPrice: 880000,
        refillPrice: 530000,
        isUnderLash: false,
      },
      {
        volume: 990,
        newPrice: 990000,
        refillPrice: 590000,
        isUnderLash: false,
      },
      {
        volume: 1330,
        newPrice: 1330000,
        refillPrice: 810000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 2 New, Bonus 1 New',
        validityMonths: 5,
        discountPct: 50,
        note: 'Welcome - New Client Only',
        isWelcomePackage: true,
        packageKind: 'new_only',
        comboNewCount: 2,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 5,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/5.4d7c337f129cbf50169f.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/5-480.41bb16bfadcec320ae99.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2310000,
            comboPrice: 1540000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 2640000,
            comboPrice: 1760000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 2970000,
            comboPrice: 1980000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 3990000,
            comboPrice: 2660000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 4 New, Bonus 1 New',
        validityMonths: 9,
        discountPct: 25,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 4,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 9,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/9.926c08866fbe80033c68.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/9-480.4f1303175937bd5cd655.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 3850000,
            comboPrice: 3080000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 4400000,
            comboPrice: 3520000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 4950000,
            comboPrice: 3960000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 6650000,
            comboPrice: 5320000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 7 New, Bonus 3 New',
        validityMonths: 15,
        discountPct: 43,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 7,
        comboRefillCount: 0,
        bonusNewCount: 3,
        bonusRefillCount: 0,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 11,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/11.e80e09c6a233b0eb97b1.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/11-480.18898a43dde8b9bb6336.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 7700000,
            comboPrice: 5390000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 8800000,
            comboPrice: 6160000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 9900000,
            comboPrice: 6930000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 13300000,
            comboPrice: 9310000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 10 New, Bonus 6 New',
        validityMonths: 24,
        discountPct: 60,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 10,
        comboRefillCount: 0,
        bonusNewCount: 6,
        bonusRefillCount: 0,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 13,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/13.13aab6f85a3715409f47.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/13-480.16c1e9f157431ccb7172.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 12320000,
            comboPrice: 7700000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 14080000,
            comboPrice: 8800000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 15840000,
            comboPrice: 9900000,
            isUnderLash: false,
          },
          {
            volume: 1330,
            newPrice: 1330000,
            refillPrice: 810000,
            retailTotal: 21280000,
            comboPrice: 13300000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'IvyLight_4L',
    name: 'IvyLight 4L',
    theme: 'green',
    segment: 'Mid-range',
    images: [
      {
        id: '15',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/15.4acd3b7fab378e25ed3e.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/15.4acd3b7fab378e25ed3e.webp',
      },
      {
        id: '16',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/16.4d4affb6b2e2929225cf.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/16-480.a941dc3c0a8ebe54f801.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/16-480.a941dc3c0a8ebe54f801.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/16-800.42c96cec9c53a06092e2.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/16-1200.4a8206dd1b458ab8f569.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/16-1600.31e6415e95cccc157064.webp 1600w',
      },
      {
        id: '17',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/17.74c9f1fd80eaee0953a9.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/17.74c9f1fd80eaee0953a9.webp',
      },
      {
        id: '18',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/18.ba0732c3908abedeb687.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/18-480.83eb4df80671136832fe.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/18-480.83eb4df80671136832fe.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/18-800.0b5ee0e32b594bee58f4.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/18-1200.53ad145c58048fb2ac26.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/18-1600.509b1e022d5812fbb494.webp 1600w',
      },
      {
        id: '19',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/19.01bd318e2d901f75d0cc.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/19.01bd318e2d901f75d0cc.webp',
      },
      {
        id: '20',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/20.68633917d07c099a0d2a.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/20-480.d55086ddb7025a96c3d3.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/20-480.d55086ddb7025a96c3d3.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/20-800.7bef89aec9fd84e61fb4.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/20-1200.cf89de142d13465f2659.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/20-1600.0517720a9b76e0039c2d.webp 1600w',
      },
      {
        id: '21',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/21.d8e55cbf62ab6138a1b3.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/21.d8e55cbf62ab6138a1b3.webp',
      },
      {
        id: '22',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/22.c4482786c3633659e3bf.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/22-480.bc99c87c76787b82d039.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/22-480.bc99c87c76787b82d039.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/22-800.bd8a6d9d29053a1806ef.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/22-1200.9de492c570419dee0673.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/22-1600.42bc38789174ef8e3451.webp 1600w',
      },
      {
        id: '23',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/23.222329dd3a02fde40bf9.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/23.222329dd3a02fde40bf9.webp',
      },
    ],
    unitPrices: [
      {
        volume: 990,
        newPrice: 990000,
        refillPrice: 590000,
        isUnderLash: false,
      },
      {
        volume: 1220,
        newPrice: 1220000,
        refillPrice: 740000,
        isUnderLash: false,
      },
      {
        volume: 1440,
        newPrice: 1440000,
        refillPrice: 860000,
        isUnderLash: false,
      },
      {
        volume: 1770,
        newPrice: 1770000,
        refillPrice: 1090000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 2 New, Bonus 1 New',
        validityMonths: 5,
        discountPct: 50,
        note: 'Welcome - New Client Only',
        isWelcomePackage: true,
        packageKind: 'new_only',
        comboNewCount: 2,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 16,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/16.4d4affb6b2e2929225cf.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/16-480.a941dc3c0a8ebe54f801.webp',
        prices: [
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 2970000,
            comboPrice: 1980000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 3660000,
            comboPrice: 2440000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 4320000,
            comboPrice: 2880000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 5310000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 4 New, Bonus 1 New',
        validityMonths: 9,
        discountPct: 25,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 4,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 18,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/18.ba0732c3908abedeb687.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/18-480.83eb4df80671136832fe.webp',
        prices: [
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 4950000,
            comboPrice: 3960000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 6100000,
            comboPrice: 4880000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 7200000,
            comboPrice: 5760000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 8850000,
            comboPrice: 7080000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 7 New, Bonus 3 New',
        validityMonths: 15,
        discountPct: 43,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 7,
        comboRefillCount: 0,
        bonusNewCount: 3,
        bonusRefillCount: 0,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 20,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/20.68633917d07c099a0d2a.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/20-480.d55086ddb7025a96c3d3.webp',
        prices: [
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 9900000,
            comboPrice: 6930000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 12200000,
            comboPrice: 8540000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 14400000,
            comboPrice: 10080000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 17700000,
            comboPrice: 12390000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 10 New, Bonus 6 New',
        validityMonths: 24,
        discountPct: 60,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 10,
        comboRefillCount: 0,
        bonusNewCount: 6,
        bonusRefillCount: 0,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 22,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/22.c4482786c3633659e3bf.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/22-480.bc99c87c76787b82d039.webp',
        prices: [
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 15840000,
            comboPrice: 9900000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 19520000,
            comboPrice: 12200000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 23040000,
            comboPrice: 14400000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 28320000,
            comboPrice: 17700000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'IvyLight_5L',
    name: 'IvyLight 5L',
    theme: 'green',
    segment: 'Mid-range',
    images: [
      {
        id: '24',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/24.39e94f1f3998d86920e1.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/24.39e94f1f3998d86920e1.webp',
      },
      {
        id: '25',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/25.ab4ff2d0fbde154cfc83.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/25-480.295a1e5312af6806fd8b.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/25-480.295a1e5312af6806fd8b.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/25-800.357f2bede63ee39d9c90.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/25-1200.28d9cfeaf14e2aa7df38.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/25-1600.a82f787ad7393f5a8188.webp 1600w',
      },
      {
        id: '26',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/26.fa4e6cb5725648e1cca7.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/26.fa4e6cb5725648e1cca7.webp',
      },
      {
        id: '27',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/27.2cd5c8fa4f4c3ebaa5ac.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/27-480.3ebdd9c89d149a3ad744.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/27-480.3ebdd9c89d149a3ad744.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/27-800.01cbab73cef3d02a4ef8.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/27-1200.f474defc405307aad49c.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/27-1600.8e8872cb8906c3b31d06.webp 1600w',
      },
      {
        id: '28',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/28.162293e6bbcad31353d5.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/28.162293e6bbcad31353d5.webp',
      },
      {
        id: '29',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/29.b1ec73bc60415e4b7e67.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/29-480.0b89bd6a82a134b230f7.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/29-480.0b89bd6a82a134b230f7.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/29-800.c276d5239ef11e76bedb.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/29-1200.3aa86ae809bb53ecd856.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/29-1600.9923cac9f1f603c2db2a.webp 1600w',
      },
      {
        id: '30',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/30.133a250f1cd02267c61a.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/30.133a250f1cd02267c61a.webp',
      },
      {
        id: '31',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/31.ce20554f68da4c16fc1a.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/31-480.3cca2e6b3ef3f8de97b1.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/31-480.3cca2e6b3ef3f8de97b1.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/31-800.eb65d8f0676c50181b71.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/31-1200.fb5fc26af4a8db6cff1c.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/31-1600.d1880b3b7555e868b052.webp 1600w',
      },
      {
        id: '32',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/32.fcea75212770dbb8ce4c.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/32.fcea75212770dbb8ce4c.webp',
      },
    ],
    unitPrices: [
      {
        volume: 1110,
        newPrice: 1110000,
        refillPrice: 680000,
        isUnderLash: false,
      },
      {
        volume: 1440,
        newPrice: 1440000,
        refillPrice: 860000,
        isUnderLash: false,
      },
      {
        volume: 1770,
        newPrice: 1770000,
        refillPrice: 1090000,
        isUnderLash: false,
      },
      {
        volume: 2110,
        newPrice: 2110000,
        refillPrice: 1290000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 2 New, Bonus 1 New',
        validityMonths: 5,
        discountPct: 50,
        note: 'Welcome - New Client Only',
        isWelcomePackage: true,
        packageKind: 'new_only',
        comboNewCount: 2,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 25,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/25.ab4ff2d0fbde154cfc83.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/25-480.295a1e5312af6806fd8b.webp',
        prices: [
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 3330000,
            comboPrice: 2220000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 4320000,
            comboPrice: 2880000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 5310000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 2110,
            newPrice: 2110000,
            refillPrice: 1290000,
            retailTotal: 6330000,
            comboPrice: 4220000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 4 New, Bonus 1 New',
        validityMonths: 9,
        discountPct: 25,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 4,
        comboRefillCount: 0,
        bonusNewCount: 1,
        bonusRefillCount: 0,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 27,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/27.2cd5c8fa4f4c3ebaa5ac.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/27-480.3ebdd9c89d149a3ad744.webp',
        prices: [
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 5550000,
            comboPrice: 4440000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 7200000,
            comboPrice: 5760000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 8850000,
            comboPrice: 7080000,
            isUnderLash: false,
          },
          {
            volume: 2110,
            newPrice: 2110000,
            refillPrice: 1290000,
            retailTotal: 10550000,
            comboPrice: 8440000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 7 New, Bonus 3 New',
        validityMonths: 15,
        discountPct: 43,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 7,
        comboRefillCount: 0,
        bonusNewCount: 3,
        bonusRefillCount: 0,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 29,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/29.b1ec73bc60415e4b7e67.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/29-480.0b89bd6a82a134b230f7.webp',
        prices: [
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 11100000,
            comboPrice: 7770000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 14400000,
            comboPrice: 10080000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 17700000,
            comboPrice: 12390000,
            isUnderLash: false,
          },
          {
            volume: 2110,
            newPrice: 2110000,
            refillPrice: 1290000,
            retailTotal: 21100000,
            comboPrice: 14770000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 10 New, Bonus 6 New',
        validityMonths: 24,
        discountPct: 60,
        isWelcomePackage: false,
        packageKind: 'new_only',
        comboNewCount: 10,
        comboRefillCount: 0,
        bonusNewCount: 6,
        bonusRefillCount: 0,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 31,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/31.ce20554f68da4c16fc1a.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/31-480.3cca2e6b3ef3f8de97b1.webp',
        prices: [
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 17760000,
            comboPrice: 11100000,
            isUnderLash: false,
          },
          {
            volume: 1440,
            newPrice: 1440000,
            refillPrice: 860000,
            retailTotal: 23040000,
            comboPrice: 14400000,
            isUnderLash: false,
          },
          {
            volume: 1770,
            newPrice: 1770000,
            refillPrice: 1090000,
            retailTotal: 28320000,
            comboPrice: 17700000,
            isUnderLash: false,
          },
          {
            volume: 2110,
            newPrice: 2110000,
            refillPrice: 1290000,
            retailTotal: 33760000,
            comboPrice: 21100000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'UltraLight_3D',
    name: 'UltraLight 3D',
    theme: 'red',
    segment: 'Mid-High',
    images: [
      {
        id: '110',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/110.4ad3b96f1d8dd89cd30c.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/110.4ad3b96f1d8dd89cd30c.webp',
      },
      {
        id: '115',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/115.600dfff2888d214971f0.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/115-480.e3ffd44dc384bd807f79.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/115-480.e3ffd44dc384bd807f79.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/115-800.3eaff33fd9717b347649.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/115-1200.51d7f869b2803dc3bf35.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/115-1600.c57d912af6a9b8149a61.webp 1600w',
      },
      {
        id: '116',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/116.020616a61f815addb9b4.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/116.020616a61f815addb9b4.webp',
      },
      {
        id: '117',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/117.e4c4550e315a3e2a185c.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/117.e4c4550e315a3e2a185c.webp',
      },
      {
        id: '122',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/122.590860093b20a3f24e1b.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/122-480.f854bd21276dda4b6a0c.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/122-480.f854bd21276dda4b6a0c.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/122-800.939f238e6d11912b93c8.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/122-1200.84fc9ec93acc062ae585.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/122-1600.0e178f917ae883ef6573.webp 1600w',
      },
      {
        id: '123',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/123.aaae14ba7ed8e50ddd55.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/123.aaae14ba7ed8e50ddd55.webp',
      },
      {
        id: '124',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/124.a6200acabbc63c772b72.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/124.a6200acabbc63c772b72.webp',
      },
      {
        id: '129',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/129.a76ba53023d9ef5cf642.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/129-480.3ee2ae8a9b4a4cdb5dd2.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/129-480.3ee2ae8a9b4a4cdb5dd2.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/129-800.a0e1489c8d1a612a4bb2.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/129-1200.d24e484e1ecf8ca8f16c.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/129-1600.f9a4783350785762d962.webp 1600w',
      },
      {
        id: '130',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/130.57ff99ced4737e72b501.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/130.57ff99ced4737e72b501.webp',
      },
      {
        id: '131',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/131.04850ecd709e45958cd3.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/131.04850ecd709e45958cd3.webp',
      },
      {
        id: '136',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/136.eaa54bbf37ab6d9ab57a.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/136-480.168719a05312f73555a6.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/136-480.168719a05312f73555a6.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/136-800.552998b995fdbce33115.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/136-1200.8daac7d6c5f5dc0b42bd.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/136-1600.8f467113a54a981e8343.webp 1600w',
      },
      {
        id: '137',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/137.d23707ef64e844c0e201.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/137.d23707ef64e844c0e201.webp',
      },
    ],
    unitPrices: [
      {
        volume: 550,
        newPrice: 550000,
        refillPrice: 340000,
        isUnderLash: false,
      },
      {
        volume: 660,
        newPrice: 660000,
        refillPrice: 390000,
        isUnderLash: false,
      },
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 990,
        newPrice: 990000,
        refillPrice: 590000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 136,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/136.eaa54bbf37ab6d9ab57a.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/136-480.168719a05312f73555a6.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1230000,
            comboPrice: 890000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 1440000,
            comboPrice: 1050000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 2170000,
            comboPrice: 1580000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 129,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/129.a76ba53023d9ef5cf642.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/129-480.3ee2ae8a9b4a4cdb5dd2.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 1910000,
            comboPrice: 1570000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 2220000,
            comboPrice: 1830000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 3350000,
            comboPrice: 2760000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 122,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/122.590860093b20a3f24e1b.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/122-480.f854bd21276dda4b6a0c.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 4240000,
            comboPrice: 3010000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 4980000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 7500000,
            comboPrice: 5330000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 115,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/115.600dfff2888d214971f0.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/115-480.e3ffd44dc384bd807f79.webp',
        prices: [
          {
            volume: 550,
            newPrice: 550000,
            refillPrice: 340000,
            retailTotal: 6910000,
            comboPrice: 4240000,
            isUnderLash: false,
          },
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 8130000,
            comboPrice: 4980000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 12240000,
            comboPrice: 7500000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'UltraLight_4D',
    name: 'UltraLight 4D',
    theme: 'red',
    segment: 'Mid-High',
    images: [
      {
        id: '110',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/110.4ad3b96f1d8dd89cd30c.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/110.4ad3b96f1d8dd89cd30c.webp',
      },
      {
        id: '113',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/113.bee4364e4605abd21326.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/113-480.0d937e4ff5e7cbcf6740.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/113-480.0d937e4ff5e7cbcf6740.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/113-800.5b4fee8f47524bb424ed.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/113-1200.56151c83e949c7f67723.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/113-1600.09d399f26a8dab2b8fc2.webp 1600w',
      },
      {
        id: '114',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/114.45370a833c36c3350ccc.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/114.45370a833c36c3350ccc.webp',
      },
      {
        id: '117',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/117.e4c4550e315a3e2a185c.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/117.e4c4550e315a3e2a185c.webp',
      },
      {
        id: '120',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/120.62b34aad1d2fe03fdb06.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/120-480.2be2d9035a8af0babf85.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/120-480.2be2d9035a8af0babf85.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/120-800.8a10fc514488c42b3174.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/120-1200.9ea57e58ba4052e985aa.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/120-1600.342d972d10f4203977e5.webp 1600w',
      },
      {
        id: '121',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/121.35aa477a7e1c4b5139ac.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/121.35aa477a7e1c4b5139ac.webp',
      },
      {
        id: '124',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/124.a6200acabbc63c772b72.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/124.a6200acabbc63c772b72.webp',
      },
      {
        id: '127',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/127.6888e4c6e9d273dc05f7.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/127-480.66d604784e4d639ae7ad.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/127-480.66d604784e4d639ae7ad.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/127-800.1c386ecd1382cc397066.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/127-1200.ab988a268c86fe2e9196.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/127-1600.d49d07db128b452358c0.webp 1600w',
      },
      {
        id: '128',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/128.fb331a7099ca596d48d6.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/128.fb331a7099ca596d48d6.webp',
      },
      {
        id: '131',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/131.04850ecd709e45958cd3.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/131.04850ecd709e45958cd3.webp',
      },
      {
        id: '134',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/134.6bd597d9cbd442ed0343.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/134-480.9c3193afd4c8e2313f79.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/134-480.9c3193afd4c8e2313f79.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/134-800.7abba06244194db72f53.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/134-1200.63935eb47a174a2871c3.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/134-1600.9a5b702a79c82e74b554.webp 1600w',
      },
      {
        id: '135',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/135.474edb479718a4bae760.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/135.474edb479718a4bae760.webp',
      },
    ],
    unitPrices: [
      {
        volume: 660,
        newPrice: 660000,
        refillPrice: 390000,
        isUnderLash: false,
      },
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 880,
        newPrice: 880000,
        refillPrice: 530000,
        isUnderLash: false,
      },
      {
        volume: 1110,
        newPrice: 1110000,
        refillPrice: 680000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 134,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/134.6bd597d9cbd442ed0343.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/134-480.9c3193afd4c8e2313f79.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 1440000,
            comboPrice: 1050000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 1940000,
            comboPrice: 1410000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 2470000,
            comboPrice: 1790000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 127,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/127.6888e4c6e9d273dc05f7.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/127-480.66d604784e4d639ae7ad.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 2220000,
            comboPrice: 1830000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 3000000,
            comboPrice: 2470000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 3830000,
            comboPrice: 3150000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 120,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/120.62b34aad1d2fe03fdb06.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/120-480.2be2d9035a8af0babf85.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 4980000,
            comboPrice: 3540000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 6700000,
            comboPrice: 4760000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 8520000,
            comboPrice: 6050000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 113,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/113.bee4364e4605abd21326.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/113-480.0d937e4ff5e7cbcf6740.webp',
        prices: [
          {
            volume: 660,
            newPrice: 660000,
            refillPrice: 390000,
            retailTotal: 8130000,
            comboPrice: 4980000,
            isUnderLash: false,
          },
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 880,
            newPrice: 880000,
            refillPrice: 530000,
            retailTotal: 10930000,
            comboPrice: 6700000,
            isUnderLash: false,
          },
          {
            volume: 1110,
            newPrice: 1110000,
            refillPrice: 680000,
            retailTotal: 13890000,
            comboPrice: 8520000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
    id: 'UltraLight_5D',
    name: 'UltraLight 5D',
    theme: 'red',
    segment: 'Mid-High',
    images: [
      {
        id: '110',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/110.4ad3b96f1d8dd89cd30c.webp',
        type: 'header',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/110.4ad3b96f1d8dd89cd30c.webp',
      },
      {
        id: '111',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/111.2e7c7298c0d76d24b778.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/111-480.87ee8c1480b5adbd9fb0.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/111-480.87ee8c1480b5adbd9fb0.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/111-800.2824ff29ef101ed7ad5d.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/111-1200.62b0eef45290458b2577.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/111-1600.babd95b9ee31fb03887d.webp 1600w',
      },
      {
        id: '112',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/112.6d3d7190c367292cf2c5.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/112.6d3d7190c367292cf2c5.webp',
      },
      {
        id: '117',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/117.e4c4550e315a3e2a185c.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/117.e4c4550e315a3e2a185c.webp',
      },
      {
        id: '118',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/118.9b99d65103c1be017340.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/118-480.d4c1ed05eaa171a6ba6e.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/118-480.d4c1ed05eaa171a6ba6e.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/118-800.b0171aeb2da18aaa43ee.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/118-1200.a829bb88c103270ea80e.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/118-1600.4803ba1ed5f06a653a00.webp 1600w',
      },
      {
        id: '119',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/119.7a300fa39decd03e33ac.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/119.7a300fa39decd03e33ac.webp',
      },
      {
        id: '124',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/124.a6200acabbc63c772b72.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/124.a6200acabbc63c772b72.webp',
      },
      {
        id: '125',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/125.8657a9fcc8bcc76c9c5d.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/125-480.868f2801d4496c303485.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/125-480.868f2801d4496c303485.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/125-800.2c89ddff87126b0124ea.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/125-1200.95f061e8c5dccc8757be.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/125-1600.3d84231c5ea5955a3f72.webp 1600w',
      },
      {
        id: '126',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/126.6e8540d84bfa38f032bf.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/126.6e8540d84bfa38f032bf.webp',
      },
      {
        id: '131',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/131.04850ecd709e45958cd3.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/131.04850ecd709e45958cd3.webp',
      },
      {
        id: '132',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/132.063065e10fb78704f947.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/132-480.98318a4d903158b72ab7.webp',
        previewSrcset:
          'https://wings-combo-service-landing-page.vercel.app/assets/132-480.98318a4d903158b72ab7.webp 480w, https://wings-combo-service-landing-page.vercel.app/assets/132-800.76b3710c307e34cf0ba6.webp 800w, https://wings-combo-service-landing-page.vercel.app/assets/132-1200.120a2358016ef64b8d6d.webp 1200w, https://wings-combo-service-landing-page.vercel.app/assets/132-1600.d88a7f36709d984b96ec.webp 1600w',
      },
      {
        id: '133',
        image: 'https://wings-combo-service-landing-page.vercel.app/assets/133.c7ace08dc8dd5f124d6f.webp',
        type: 'card',
        preview: 'https://wings-combo-service-landing-page.vercel.app/assets/133.c7ace08dc8dd5f124d6f.webp',
      },
    ],
    unitPrices: [
      {
        volume: 770,
        newPrice: 770000,
        refillPrice: 470000,
        isUnderLash: false,
      },
      {
        volume: 990,
        newPrice: 990000,
        refillPrice: 590000,
        isUnderLash: false,
      },
      {
        volume: 1220,
        newPrice: 1220000,
        refillPrice: 740000,
        isUnderLash: false,
      },
      {
        volume: 1550,
        newPrice: 1550000,
        refillPrice: 960000,
        isUnderLash: false,
      },
      {
        volume: 'under',
        newPrice: 390000,
        refillPrice: 0,
        serviceKey: 'under_390',
        label: 'Mi dưới 390',
        isUnderLash: true,
      },
    ],
    rules: [
      {
        name: '2 tặng 1',
        content: 'Combo 1 New 1 Refill, Bonus 1 Refill',
        validityMonths: 3,
        discountPct: 38,
        note: 'Welcome',
        isWelcomePackage: true,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 1,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 2,
        totalBonusSessions: 1,
        totalSessions: 3,
        imageId: 132,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/132.063065e10fb78704f947.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/132-480.98318a4d903158b72ab7.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 1710000,
            comboPrice: 1240000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 2170000,
            comboPrice: 1580000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 2700000,
            comboPrice: 1960000,
            isUnderLash: false,
          },
          {
            volume: 1550,
            newPrice: 1550000,
            refillPrice: 960000,
            retailTotal: 3470000,
            comboPrice: 2510000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1170000,
            comboPrice: 780000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '4 tặng 1',
        content: 'Combo 1 New 3 Refill, Bonus 1 Refill',
        validityMonths: 5,
        discountPct: 22,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 1,
        comboRefillCount: 3,
        bonusNewCount: 0,
        bonusRefillCount: 1,
        totalPaidSessions: 4,
        totalBonusSessions: 1,
        totalSessions: 5,
        imageId: 125,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/125.8657a9fcc8bcc76c9c5d.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/125-480.868f2801d4496c303485.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 2650000,
            comboPrice: 2180000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 3350000,
            comboPrice: 2760000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 4180000,
            comboPrice: 3440000,
            isUnderLash: false,
          },
          {
            volume: 1550,
            newPrice: 1550000,
            refillPrice: 960000,
            retailTotal: 5390000,
            comboPrice: 4430000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 1950000,
            comboPrice: 1560000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '7 tặng 3',
        content: 'Combo 3 New 4 Refill, Bonus 1 New 2 Refill',
        validityMonths: 9,
        discountPct: 41,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 3,
        comboRefillCount: 4,
        bonusNewCount: 1,
        bonusRefillCount: 2,
        totalPaidSessions: 7,
        totalBonusSessions: 3,
        totalSessions: 10,
        imageId: 118,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/118.9b99d65103c1be017340.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/118-480.d4c1ed05eaa171a6ba6e.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 5900000,
            comboPrice: 4190000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 7500000,
            comboPrice: 5330000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 9320000,
            comboPrice: 6620000,
            isUnderLash: false,
          },
          {
            volume: 1550,
            newPrice: 1550000,
            refillPrice: 960000,
            retailTotal: 11960000,
            comboPrice: 8490000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 3900000,
            comboPrice: 2730000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
      {
        name: '10 tặng 6',
        content: 'Combo 4 New 6 Refill, Bonus 3 New 3 Refill',
        validityMonths: 15,
        discountPct: 63,
        isWelcomePackage: false,
        packageKind: 'mixed_new_refill',
        comboNewCount: 4,
        comboRefillCount: 6,
        bonusNewCount: 3,
        bonusRefillCount: 3,
        totalPaidSessions: 10,
        totalBonusSessions: 6,
        totalSessions: 16,
        imageId: 111,
        cardImageUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/111.2e7c7298c0d76d24b778.webp',
        cardPreviewUrl: 'https://wings-combo-service-landing-page.vercel.app/assets/111-480.87ee8c1480b5adbd9fb0.webp',
        prices: [
          {
            volume: 770,
            newPrice: 770000,
            refillPrice: 470000,
            retailTotal: 9620000,
            comboPrice: 5900000,
            isUnderLash: false,
          },
          {
            volume: 990,
            newPrice: 990000,
            refillPrice: 590000,
            retailTotal: 12240000,
            comboPrice: 7500000,
            isUnderLash: false,
          },
          {
            volume: 1220,
            newPrice: 1220000,
            refillPrice: 740000,
            retailTotal: 15200000,
            comboPrice: 9320000,
            isUnderLash: false,
          },
          {
            volume: 1550,
            newPrice: 1550000,
            refillPrice: 960000,
            retailTotal: 19490000,
            comboPrice: 11960000,
            isUnderLash: false,
          },
          {
            volume: 'under',
            newPrice: 390000,
            refillPrice: 0,
            retailTotal: 6240000,
            comboPrice: 3900000,
            serviceKey: 'under_390',
            label: 'Mi dưới 390',
            isUnderLash: true,
          },
        ],
      },
    ],
  },
  {
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
  },
];

const VOLUME_FIBER_MAP: Record<
  string,
  Record<string, { countPerEye: number; totalFibers: number; fanLabel: string; badge?: 'BEST SELLER' | 'MOST POPULAR' }>
> = {
  Classic_Volume: {
    '390': { countPerEye: 60, totalFibers: 120, fanLabel: '1D/2D · 60 sợi/mắt (120-200 sợi)' },
    '440': { countPerEye: 70, totalFibers: 140, fanLabel: '1D/2D · 70 sợi/mắt (140-240 sợi)' },
    '550': { countPerEye: 90, totalFibers: 180, fanLabel: '1D/2D · 80-90 sợi/mắt (180-320 sợi)', badge: 'BEST SELLER' },
    '660': { countPerEye: 110, totalFibers: 220, fanLabel: '1D/2D · 100-110 sợi/mắt (220-400 sợi)' },
    '880': { countPerEye: 130, totalFibers: 260, fanLabel: '1D/2D · 120-130 sợi/mắt (260-480 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  FlawlessMink: {
    '770': { countPerEye: 60, totalFibers: 120, fanLabel: '1D · 60 sợi/mắt (120 sợi)' },
    '880': { countPerEye: 70, totalFibers: 140, fanLabel: '1D · 70 sợi/mắt (140 sợi)', badge: 'MOST POPULAR' },
    '1110': { countPerEye: 90, totalFibers: 180, fanLabel: '1D · 90 sợi/mắt (180 sợi)', badge: 'BEST SELLER' },
    '1440': { countPerEye: 110, totalFibers: 220, fanLabel: '1D · 110 sợi/mắt (220 sợi)' },
    '1770': { countPerEye: 130, totalFibers: 260, fanLabel: '1D · 130 sợi/mắt (260 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_2X: {
    '440': { countPerEye: 50, totalFibers: 200, fanLabel: '2X · 50 trụ/mắt (Trụ 2 sợi · 200 sợi)' },
    '550': { countPerEye: 70, totalFibers: 280, fanLabel: '2X · 70 trụ/mắt (Trụ 2 sợi · 280 sợi)' },
    '660': {
      countPerEye: 90,
      totalFibers: 360,
      fanLabel: '2X · 90 trụ/mắt (Trụ 2 sợi · 360 sợi)',
      badge: 'BEST SELLER',
    },
    '770': { countPerEye: 110, totalFibers: 440, fanLabel: '2X · 110 trụ/mắt (Trụ 2 sợi · 440 sợi)' },
    '1110': { countPerEye: 130, totalFibers: 520, fanLabel: '2X · 130 trụ/mắt (Trụ 2 sợi · 520 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_3X: {
    '550': { countPerEye: 50, totalFibers: 300, fanLabel: '3X · 50 trụ/mắt (Trụ 3 sợi · 300 sợi)' },
    '660': { countPerEye: 70, totalFibers: 420, fanLabel: '3X · 70 trụ/mắt (Trụ 3 sợi · 420 sợi)' },
    '770': {
      countPerEye: 90,
      totalFibers: 540,
      fanLabel: '3X · 90 trụ/mắt (Trụ 3 sợi · 540 sợi)',
      badge: 'BEST SELLER',
    },
    '880': { countPerEye: 110, totalFibers: 660, fanLabel: '3X · 110 trụ/mắt (Trụ 3 sợi · 660 sợi)' },
    '1220': { countPerEye: 130, totalFibers: 780, fanLabel: '3X · 130 trụ/mắt (Trụ 3 sợi · 780 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_4X: {
    '660': { countPerEye: 50, totalFibers: 400, fanLabel: '4X · 50 trụ/mắt (Trụ 4 sợi · 400 sợi)' },
    '770': {
      countPerEye: 70,
      totalFibers: 560,
      fanLabel: '4X · 70 trụ/mắt (Trụ 4 sợi · 560 sợi)',
      badge: 'BEST SELLER',
    },
    '880': {
      countPerEye: 90,
      totalFibers: 720,
      fanLabel: '4X · 90 trụ/mắt (Trụ 4 sợi · 720 sợi)',
      badge: 'BEST SELLER',
    },
    '990': { countPerEye: 110, totalFibers: 880, fanLabel: '4X · 110 trụ/mắt (Trụ 4 sợi · 880 sợi)' },
    '1330': { countPerEye: 130, totalFibers: 1040, fanLabel: '4X · 130 trụ/mắt (Trụ 4 sợi · 1040 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  HyperLight_5X: {
    '770': { countPerEye: 50, totalFibers: 500, fanLabel: '5X · 50 trụ/mắt (Trụ 5 sợi · 500 sợi)' },
    '990': {
      countPerEye: 70,
      totalFibers: 700,
      fanLabel: '5X · 70 trụ/mắt (Trụ 5 sợi · 700 sợi)',
      badge: 'MOST POPULAR',
    },
    '1220': { countPerEye: 90, totalFibers: 900, fanLabel: '5X · 90 trụ/mắt (Trụ 5 sợi · 900 sợi)' },
    '1440': { countPerEye: 110, totalFibers: 1100, fanLabel: '5X · 110 trụ/mắt (Trụ 5 sợi · 1100 sợi)' },
    '1770': { countPerEye: 130, totalFibers: 1300, fanLabel: '5X · 130 trụ/mắt (Trụ 5 sợi · 1300 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  IvyLight_3L: {
    '770': { countPerEye: 70, totalFibers: 420, fanLabel: '3ℓ · 70 trụ/mắt (Trụ 3 sợi dẹp · 420 sợi)' },
    '880': {
      countPerEye: 90,
      totalFibers: 540,
      fanLabel: '3ℓ · 90 trụ/mắt (Trụ 3 sợi dẹp · 540 sợi)',
      badge: 'BEST SELLER',
    },
    '990': { countPerEye: 110, totalFibers: 660, fanLabel: '3ℓ · 110 trụ/mắt (Trụ 3 sợi dẹp · 660 sợi)' },
    '1330': { countPerEye: 130, totalFibers: 780, fanLabel: '3ℓ · 130 trụ/mắt (Trụ 3 sợi dẹp · 780 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  IvyLight_4L: {
    '990': { countPerEye: 70, totalFibers: 560, fanLabel: '4ℓ · 70 trụ/mắt (Trụ 4 sợi dẹp · 560 sợi)' },
    '1220': {
      countPerEye: 90,
      totalFibers: 720,
      fanLabel: '4ℓ · 90 trụ/mắt (Trụ 4 sợi dẹp · 720 sợi)',
      badge: 'BEST SELLER',
    },
    '1440': { countPerEye: 110, totalFibers: 880, fanLabel: '4ℓ · 110 trụ/mắt (Trụ 4 sợi dẹp · 880 sợi)' },
    '1770': { countPerEye: 130, totalFibers: 1040, fanLabel: '4ℓ · 130 trụ/mắt (Trụ 4 sợi dẹp · 1040 sợi)' },
    under: { countPerEye: 35, totalFibers: 70, fanLabel: 'Mi dưới · 70 sợi 2 mắt' },
  },
  IvyLight_5L: {
    '1110': {
      countPerEye: 70,
      totalFibers: 700,
      fanLabel: '5ℓ · 70 trụ/mắt (Trụ 5 sợi dẹp · 700 sợi)',
      badge: 'MOST POPULAR',
    },
    '1440': { countPerEye: 90, totalFibers: 900, fanLabel: '5ℓ · 90 trụ/mắt (Trụ 5 sợi dẹp · 900 sợi)' },
    '1770': { countPerEye: 110, totalFibers: 1100, fanLabel: '5ℓ · 110 trụ/mắt (Trụ 5 sợi dẹp · 1100 sợi)' },
    '2110': { countPerEye: 130, totalFibers: 1300, fanLabel: '5ℓ · 130 trụ/mắt (Trụ 5 sợi dẹp · 1300 sợi)' },
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
    '660': { countPerEye: 60, totalFibers: 480, fanLabel: '4D · 60 fan/mắt (Fan 4 sợi · 480 sợi)' },
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
      badge: 'BEST SELLER',
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

export function getWingsComboCategory(categoryId: WingsComboCategoryId | string): WingsComboCategory {
  return (
    WINGS_COMBO_CATEGORIES.find((c) => c.id === categoryId) ||
    WINGS_COMBO_CATEGORIES.find((c) => c.id === 'FlawlessMink') ||
    WINGS_COMBO_CATEGORIES[0]
  );
}

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

  const specLabel =
    categoryId === 'HyperLight_2X'
      ? 'Trụ 2 sợi'
      : categoryId === 'HyperLight_3X'
        ? 'Trụ 3 sợi'
        : categoryId === 'HyperLight_4X'
          ? 'Trụ 4 sợi'
          : categoryId === 'HyperLight_5X'
            ? 'Trụ 5 sợi'
            : categoryId === 'UltraLight_3D'
              ? 'Fan 3 sợi (3D)'
              : categoryId === 'UltraLight_4D'
                ? 'Fan 4 sợi (4D)'
                : categoryId === 'UltraLight_5D'
                  ? 'Fan 5 sợi (5D)'
                  : categoryId === 'IvyLight_3L'
                    ? 'Trụ 3 sợi dẹp (3ℓ)'
                    : categoryId === 'IvyLight_4L'
                      ? 'Trụ 4 sợi dẹp (4ℓ)'
                      : categoryId === 'IvyLight_5L'
                        ? 'Trụ 5 sợi dẹp (5ℓ)'
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

export function formatReadableComboContent(
  rule: Pick<WingsComboRule, 'comboNewCount' | 'comboRefillCount' | 'bonusNewCount' | 'bonusRefillCount' | 'content'>
): string {
  const paidParts: string[] = [];
  if (rule.comboNewCount > 0) paidParts.push(`${rule.comboNewCount} Nối mới (New)`);
  if (rule.comboRefillCount > 0) paidParts.push(`${rule.comboRefillCount} Dặm (Refill)`);

  const bonusParts: string[] = [];
  if (rule.bonusNewCount > 0) bonusParts.push(`${rule.bonusNewCount} Nối mới (0đ)`);
  if (rule.bonusRefillCount > 0) bonusParts.push(`${rule.bonusRefillCount} Dặm (0đ)`);

  if (paidParts.length > 0 || bonusParts.length > 0) {
    return [
      paidParts.length ? `Mua ${paidParts.join(' + ')}` : '',
      bonusParts.length ? `Tặng ${bonusParts.join(' + ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return rule.content || 'Gói 20 lần VIP dùng chung bạn bè & người thân';
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
  const combinedText = [
    input?.material || '',
    input?.serviceName || '',
    input?.comboName || '',
    input?.serviceKey || '',
  ]
    .join(' ')
    .toLowerCase();

  const volText = String(input?.volume || '').toLowerCase();
  const countNum = parseInt(String(input?.count || '').replace(/\D+/g, ''), 10) || 0;

  let categoryId: WingsComboCategoryId = 'FlawlessMink';

  if (combinedText.includes('vvip')) {
    categoryId = 'VVIP';
  } else if (combinedText.includes('flawless') || (combinedText.includes('mink') && !combinedText.includes('under'))) {
    categoryId = 'FlawlessMink';
  } else if (
    combinedText.includes('hyperlight') ||
    combinedText.includes('hyper light') ||
    combinedText.includes('hyper_light')
  ) {
    if (volText.includes('2x') || combinedText.includes('2x')) categoryId = 'HyperLight_2X';
    else if (volText.includes('3x') || combinedText.includes('3x')) categoryId = 'HyperLight_3X';
    else if (volText.includes('5x') || combinedText.includes('5x')) categoryId = 'HyperLight_5X';
    else categoryId = 'HyperLight_4X';
  } else if (
    combinedText.includes('ivylight') ||
    combinedText.includes('ivy light') ||
    combinedText.includes('ivy_light')
  ) {
    if (
      volText.includes('3l') ||
      volText.includes('3ℓ') ||
      combinedText.includes('3l') ||
      combinedText.includes('3ℓ')
    ) {
      categoryId = 'IvyLight_3L';
    } else if (
      volText.includes('5l') ||
      volText.includes('5ℓ') ||
      combinedText.includes('5l') ||
      combinedText.includes('5ℓ')
    ) {
      categoryId = 'IvyLight_5L';
    } else {
      categoryId = 'IvyLight_4L';
    }
  } else if (
    combinedText.includes('ultralight') ||
    combinedText.includes('ultra light') ||
    combinedText.includes('ultra_light')
  ) {
    if (volText.includes('3d') || combinedText.includes('3d')) categoryId = 'UltraLight_3D';
    else if (volText.includes('5d') || combinedText.includes('5d')) categoryId = 'UltraLight_5D';
    else categoryId = 'UltraLight_4D';
  } else if (combinedText.includes('classic') || combinedText.includes('volume') || combinedText.includes('2d')) {
    categoryId = 'Classic_Volume';
  }

  const category = getWingsComboCategory(categoryId);
  const availableVolumes = category.unitPrices
    .filter((u) => !u.isUnderLash && typeof u.volume === 'number')
    .map((u) => Number(u.volume));

  if (combinedText.includes('under') || combinedText.includes('mi dưới') || volText.includes('dưới')) {
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

/**
 * Lấy danh sách tất cả các gói Combo đúng chuẩn cho (categoryId, volume)
 * kèm kiểm tra khóa tự động gói Welcome (2 tặng 1) nếu qua ngày đầu tiên.
 */
export function getComboPackagesForCategoryAndVolume(params: {
  categoryId: WingsComboCategoryId | string;
  volume: number | 'under';
  welcomeEligibility?: WelcomeComboEligibilityResult;
  includeVvipPass?: boolean;
}): MatchedComboPackageOption[] {
  const category = getWingsComboCategory(params.categoryId);
  const eligibility = params.welcomeEligibility ?? checkWelcomeComboEligibility({ customerVisits: 1 });
  const results: MatchedComboPackageOption[] = [];

  for (const rule of category.rules) {
    if (category.id === 'VVIP' || rule.name === 'VVIP Pass') {
      const comboPrice = rule.fixedPrice || 23900000;
      const totalSessions = rule.totalSessions || 20;
      const retailTotal = 35400000;
      results.push({
        id: `VVIP:VVIP_Pass:all`,
        categoryId: 'VVIP',
        categoryName: 'VVIP Pass',
        ruleName: rule.name,
        displayName: `Gói VVIP Pass (20 Lần · 36 Tháng)`,
        shortRuleLabel: '20 Lần VIP',
        volume: params.volume,
        volumeMeta: getVolumeFiberMeta('VVIP', params.volume),
        packageKind: 'vvip_pass',
        isWelcomePackage: false,
        isLocked: false,
        validityMonths: rule.validityMonths || 36,
        discountPct: 48,
        comboNewCount: 20,
        comboRefillCount: 0,
        bonusNewCount: 0,
        bonusRefillCount: 0,
        totalPaidSessions: 20,
        totalBonusSessions: 0,
        totalSessions,
        newUnitPrice: Math.round(comboPrice / totalSessions),
        refillUnitPrice: Math.round(comboPrice / totalSessions),
        retailTotal,
        comboPrice,
        comboPriceWithVat: Math.round(comboPrice * 1.08),
        savingsAmount: retailTotal - comboPrice,
        avgPerSessionPrice: Math.round(comboPrice / totalSessions),
        cvBonus: calculateComboBonus(comboPrice),
        cardImageUrl: rule.cardImageUrl,
        cardPreviewUrl: rule.cardPreviewUrl,
        readableContent: rule.special || '20 lần nối mi cao cấp · Dùng chung cho bạn bè & người thân',
        specialNote: rule.special,
        theme: category.theme,
        allVolumePrices: rule.prices,
      });
      continue;
    }

    const priceRow =
      rule.prices.find((p) =>
        params.volume === 'under' ? p.isUnderLash || p.volume === 'under' : Number(p.volume) === Number(params.volume)
      ) || rule.prices[0];

    if (!priceRow) continue;

    const volMeta = getVolumeFiberMeta(category.id, priceRow.isUnderLash ? 'under' : priceRow.volume);
    const isWelcome = rule.isWelcomePackage;
    const isLocked = isWelcome && !eligibility.eligible;
    const comboPrice = priceRow.comboPrice;
    const retailTotal = priceRow.retailTotal || comboPrice;
    const totalSessions = rule.totalSessions || 3;

    const ruleSlug = rule.name.replace(/\s+/g, '_');
    const volSlug = priceRow.isUnderLash ? 'under_390' : String(priceRow.volume);

    results.push({
      id: `${category.id}:${ruleSlug}:${volSlug}`,
      categoryId: category.id,
      categoryName: category.name,
      ruleName: rule.name,
      displayName: priceRow.isUnderLash
        ? `Combo ${rule.name} · Mi Dưới 390 (${totalSessions} lần)`
        : `Combo ${rule.name} · ${category.name} ${priceRow.volume} (${totalSessions} lần)`,
      shortRuleLabel: isWelcome ? `${rule.name} (Welcome)` : rule.name,
      volume: priceRow.isUnderLash ? 'under' : Number(priceRow.volume),
      volumeMeta: volMeta,
      packageKind: rule.packageKind,
      isWelcomePackage: isWelcome,
      isLocked,
      lockReason: isLocked ? eligibility.reason : undefined,
      validityMonths: rule.validityMonths,
      discountPct: rule.discountPct,
      comboNewCount: rule.comboNewCount,
      comboRefillCount: rule.comboRefillCount,
      bonusNewCount: rule.bonusNewCount,
      bonusRefillCount: rule.bonusRefillCount,
      totalPaidSessions: rule.totalPaidSessions,
      totalBonusSessions: rule.totalBonusSessions,
      totalSessions,
      newUnitPrice: priceRow.newPrice,
      refillUnitPrice: priceRow.refillPrice || priceRow.newPrice,
      retailTotal,
      comboPrice,
      comboPriceWithVat: Math.round(comboPrice * 1.08),
      savingsAmount: Math.max(0, retailTotal - comboPrice),
      avgPerSessionPrice: Math.round(comboPrice / totalSessions),
      cvBonus: calculateComboBonus(comboPrice),
      cardImageUrl: rule.cardImageUrl,
      cardPreviewUrl: rule.cardPreviewUrl,
      readableContent: formatReadableComboContent(rule),
      theme: category.theme,
      allVolumePrices: rule.prices,
    });
  }

  if (params.includeVvipPass && category.id !== 'VVIP') {
    const vvipCat = getWingsComboCategory('VVIP');
    const vvipRule = vvipCat.rules[0];
    if (vvipRule) {
      const comboPrice = vvipRule.fixedPrice || 23900000;
      results.push({
        id: 'VVIP:VVIP_Pass:all',
        categoryId: 'VVIP',
        categoryName: 'VVIP Pass',
        ruleName: 'VVIP Pass',
        displayName: 'Gói VVIP Pass · 20 Lần (Dùng chung người thân)',
        shortRuleLabel: 'VVIP Pass (20 lần)',
        volume: params.volume,
        volumeMeta: getVolumeFiberMeta('VVIP', params.volume),
        packageKind: 'vvip_pass',
        isWelcomePackage: false,
        isLocked: false,
        validityMonths: 36,
        discountPct: 48,
        comboNewCount: 20,
        comboRefillCount: 0,
        bonusNewCount: 0,
        bonusRefillCount: 0,
        totalPaidSessions: 20,
        totalBonusSessions: 0,
        totalSessions: 20,
        newUnitPrice: Math.round(comboPrice / 20),
        refillUnitPrice: Math.round(comboPrice / 20),
        retailTotal: 35400000,
        comboPrice,
        comboPriceWithVat: Math.round(comboPrice * 1.08),
        savingsAmount: 35400000 - comboPrice,
        avgPerSessionPrice: Math.round(comboPrice / 20),
        cvBonus: calculateComboBonus(comboPrice),
        cardImageUrl: vvipRule.cardImageUrl,
        cardPreviewUrl: vvipRule.cardPreviewUrl,
        readableContent: '20 lần nối mi cao cấp · Hạn dùng 36 tháng · Chia sẻ cùng bạn bè & người thân',
        specialNote: vvipRule.special,
        theme: vvipCat.theme,
        allVolumePrices: vvipRule.prices,
      });
    }
  }

  return results;
}

/**
 * Tính toán hạch toán kế toán & trừ ví gói tức thì khi khách MUA GÓI COMBO MỚI tại Checkout:
 * - Buổi làm mi hôm nay được trừ ngay làm buổi đầu tiên (1 Paid New) của gói mới mua.
 * - Khách hàng chỉ thanh toán đúng giá gói Combo (không bị cộng dồn tiền lẻ buổi hôm nay).
 * - Tách bạch Lượt Mua (Paid) và Lượt Tặng (Bonus 0đ) còn lại trong ví.
 */
export function calculateComboPurchaseAccounting(
  pkg: MatchedComboPackageOption,
  todaySingleServiceOriginalPrice?: number
): ComboPurchaseAccountingBreakdown {
  const singleOriginal = todaySingleServiceOriginalPrice ?? pkg.newUnitPrice;
  const recognizedToday =
    pkg.packageKind === 'vvip_pass'
      ? pkg.avgPerSessionPrice
      : Math.min(pkg.comboPrice, pkg.newUnitPrice || singleOriginal);
  const deferredRevenueBalance = Math.max(0, pkg.comboPrice - recognizedToday);

  const paidNewAfter = Math.max(0, pkg.comboNewCount - 1);
  const paidRefillAfter = pkg.comboRefillCount;
  const bonusNewAfter = pkg.bonusNewCount;
  const bonusRefillAfter = pkg.bonusRefillCount;
  const totalPaidRemaining = paidNewAfter + paidRefillAfter;
  const totalBonusRemaining = bonusNewAfter + bonusRefillAfter;
  const totalRemaining = totalPaidRemaining + totalBonusRemaining;

  return {
    mode: 'BUY_NEW_COMBO',
    packageId: pkg.id,
    packageName: pkg.displayName,
    categoryId: pkg.categoryId,
    categoryName: pkg.categoryName,
    ruleName: pkg.ruleName,
    volume: pkg.volume,
    comboPrice: pkg.comboPrice,
    comboPriceWithVat: pkg.comboPriceWithVat,
    retailTotal: pkg.retailTotal,
    savingsAmount: pkg.savingsAmount,
    todaySingleServiceWaived: true,
    todaySingleServiceOriginalPrice: singleOriginal,
    todayServiceChargeToCustomer: 0,
    recognizedRevenueToday: recognizedToday,
    deferredRevenueBalance,
    avgPerSessionPrice: pkg.avgPerSessionPrice,
    initialWallet: {
      paidNew: pkg.comboNewCount,
      paidRefill: pkg.comboRefillCount,
      bonusNew: pkg.bonusNewCount,
      bonusRefill: pkg.bonusRefillCount,
      totalSessions: pkg.totalSessions,
    },
    deductedToday: {
      sessionType: pkg.packageKind === 'vvip_pass' ? 'VVIP_PASS' : 'PAID_NEW',
      count: 1,
      recognizedValue: recognizedToday,
    },
    remainingWalletAfterToday: {
      paidNew: paidNewAfter,
      paidRefill: paidRefillAfter,
      bonusNew: bonusNewAfter,
      bonusRefill: bonusRefillAfter,
      totalPaidRemaining,
      totalBonusRemaining,
      totalRemaining,
    },
    cvComboBonus: pkg.cvBonus,
    accountingSummaryNote: `Đã trừ buổi hôm nay vào lượt 1 của gói (${pkg.ruleName}). Miễn thu lẻ ${singleOriginal.toLocaleString('vi-VN')}đ. Còn lại ${totalRemaining}/${pkg.totalSessions} lần trong ví (${totalPaidRemaining} lượt mua + ${totalBonusRemaining} lượt tặng 0đ).`,
  };
}

/**
 * Tính toán trừ ví gói & phụ thu tự động khi khách ĐANG CÓ GÓI COMBO (REDEEM_EXISTING_COMBO):
 * - Ưu tiên trừ Lượt Mua (Paid) trước, hết Lượt Mua mới trừ sang Lượt Tặng (Bonus 0đ) theo FIFO.
 * - Nếu ví chỉ còn lượt Dặm (Refill) mà khách làm Nối Mới (hoặc quá hạn 25 ngày):
 *   tự động trừ 1 lượt Refill trong gói + thu phần chênh lệch (New Price - Refill Price).
 * - Nếu khách nâng cấp số sợi (Up-size Volume) hoặc đổi lên dòng mi cao hơn:
 *   tự động cộng phần chênh lệch đơn giá (Target Unit Price - Base Package Unit Price).
 */
export function calculateComboRedemptionAccounting(params: {
  comboName: string;
  baseCategoryId: WingsComboCategoryId | string;
  baseVolume: number | 'under';
  targetCategoryId?: WingsComboCategoryId | string;
  targetVolume?: number | 'under';
  requestedServiceType: 'Normal' | 'Retain';
  daysSinceLastVisit?: number | null;
  paidNewRemaining: number;
  paidRefillRemaining: number;
  bonusNewRemaining: number;
  bonusRefillRemaining: number;
}): ComboRedemptionAccountingBreakdown {
  const baseCat = getWingsComboCategory(params.baseCategoryId);
  const targetCat = getWingsComboCategory(params.targetCategoryId || params.baseCategoryId);
  const baseVol = params.baseVolume;
  const targetVol = params.targetVolume ?? params.baseVolume;

  const baseUnit = baseCat.unitPrices.find((u) =>
    baseVol === 'under' ? u.isUnderLash || u.volume === 'under' : Number(u.volume) === Number(baseVol)
  ) ||
    baseCat.unitPrices[0] || { newPrice: 770000, refillPrice: 470000 };

  const targetUnit =
    targetCat.unitPrices.find((u) =>
      targetVol === 'under' ? u.isUnderLash || u.volume === 'under' : Number(u.volume) === Number(targetVol)
    ) || baseUnit;

  const isWithin25DayCycle = params.daysSinceLastVisit == null ? true : params.daysSinceLastVisit <= 25;
  const effectiveServiceType: 'Normal' | 'Retain' =
    params.requestedServiceType === 'Retain' && isWithin25DayCycle ? 'Retain' : 'Normal';

  let paidNew = Math.max(0, params.paidNewRemaining);
  let paidRefill = Math.max(0, params.paidRefillRemaining);
  let bonusNew = Math.max(0, params.bonusNewRemaining);
  let bonusRefill = Math.max(0, params.bonusRefillRemaining);

  const walletBefore = {
    paidNew,
    paidRefill,
    bonusNew,
    bonusRefill,
    totalRemaining: paidNew + paidRefill + bonusNew + bonusRefill,
  };

  let deductedBucket: ComboRedemptionAccountingBreakdown['deductedBucket'] = 'PAID_NEW';
  let typeConversionSurcharge = 0;
  let baseRecognizedValue = 0;

  if (effectiveServiceType === 'Retain') {
    if (paidRefill > 0) {
      paidRefill -= 1;
      deductedBucket = 'PAID_REFILL';
      baseRecognizedValue = baseUnit.refillPrice || baseUnit.newPrice;
    } else if (bonusRefill > 0) {
      bonusRefill -= 1;
      deductedBucket = 'BONUS_REFILL';
      baseRecognizedValue = 0; // Lượt tặng ghi nhận 0đ
    } else if (paidNew > 0) {
      paidNew -= 1;
      deductedBucket = 'PAID_NEW';
      baseRecognizedValue = baseUnit.newPrice;
    } else if (bonusNew > 0) {
      bonusNew -= 1;
      deductedBucket = 'BONUS_NEW';
      baseRecognizedValue = 0;
    }
  } else {
    // Khách làm Nối Mới (Normal) hoặc quá 25 ngày
    if (paidNew > 0) {
      paidNew -= 1;
      deductedBucket = 'PAID_NEW';
      baseRecognizedValue = baseUnit.newPrice;
    } else if (bonusNew > 0) {
      bonusNew -= 1;
      deductedBucket = 'BONUS_NEW';
      baseRecognizedValue = 0; // Lượt tặng ghi nhận 0đ
    } else if (paidRefill > 0 || bonusRefill > 0) {
      // Ví gói hết lượt New, chỉ còn lượt Refill -> Trừ 1 lượt Refill + Phụ thu chênh lệch (New - Refill)
      if (paidRefill > 0) {
        paidRefill -= 1;
        baseRecognizedValue = baseUnit.refillPrice || 0;
      } else {
        bonusRefill -= 1;
        baseRecognizedValue = 0;
      }
      deductedBucket = 'CONVERTED_REFILL_TO_NEW';
      typeConversionSurcharge = Math.max(0, baseUnit.newPrice - (baseUnit.refillPrice || baseUnit.newPrice));
    }
  }

  // Tính phụ thu nâng cấp số sợi / đổi dòng mi cao hơn (nếu có)
  const baseComparisonPrice =
    effectiveServiceType === 'Retain' ? baseUnit.refillPrice || baseUnit.newPrice : baseUnit.newPrice;
  const targetComparisonPrice =
    effectiveServiceType === 'Retain' ? targetUnit.refillPrice || targetUnit.newPrice : targetUnit.newPrice;

  const upgradeVolumeSurcharge = Math.max(0, targetComparisonPrice - baseComparisonPrice);
  const totalCustomerPayToday = typeConversionSurcharge + upgradeVolumeSurcharge;
  const totalCustomerPayTodayWithVat = Math.round(totalCustomerPayToday * 1.08);
  const recognizedRevenueToday = baseRecognizedValue + totalCustomerPayToday;

  const walletAfter = {
    paidNew,
    paidRefill,
    bonusNew,
    bonusRefill,
    totalRemaining: paidNew + paidRefill + bonusNew + bonusRefill,
  };

  const explainParts: string[] = [];
  if (deductedBucket === 'PAID_NEW') {
    explainParts.push(`Trừ 1 lượt Nối mới (Lượt mua: hạch toán ${baseRecognizedValue.toLocaleString('vi-VN')}đ)`);
  } else if (deductedBucket === 'PAID_REFILL') {
    explainParts.push(`Trừ 1 lượt Dặm Refill (Lượt mua: hạch toán ${baseRecognizedValue.toLocaleString('vi-VN')}đ)`);
  } else if (deductedBucket === 'BONUS_NEW') {
    explainParts.push('Trừ 1 lượt Nối mới Tặng kèm (Bonus 0đ)');
  } else if (deductedBucket === 'BONUS_REFILL') {
    explainParts.push('Trừ 1 lượt Dặm Tặng kèm (Bonus 0đ)');
  } else if (deductedBucket === 'CONVERTED_REFILL_TO_NEW') {
    explainParts.push(
      `Ví hết lượt New, quy đổi trừ 1 lượt Refill + phụ thu chênh lệch Nối mới +${typeConversionSurcharge.toLocaleString('vi-VN')}đ`
    );
  }

  if (upgradeVolumeSurcharge > 0) {
    explainParts.push(
      `Phụ thu nâng cấp (${targetCat.name} ${targetVol}): +${upgradeVolumeSurcharge.toLocaleString('vi-VN')}đ`
    );
  }

  return {
    mode: 'REDEEM_EXISTING_COMBO',
    comboName: params.comboName,
    categoryId: baseCat.id,
    baseVolume: baseVol,
    targetVolume: targetVol,
    requestedServiceType: effectiveServiceType,
    isWithin25DayCycle,
    deductedBucket,
    typeConversionSurcharge,
    upgradeVolumeSurcharge,
    totalCustomerPayToday,
    totalCustomerPayTodayWithVat,
    recognizedRevenueToday,
    walletBefore,
    walletAfter,
    explanation: explainParts.join(' · '),
  };
}

/**
 * Tạo nội dung báo giá tư vấn chuẩn Zalo / Messenger / SMS để gửi khách hàng
 */
export function formatComboConsultationQuote(pkg: MatchedComboPackageOption, includeVat: boolean = false): string {
  const finalPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;
  const lines = [
    `💎 BÁO GIÁ GÓI COMBO WINGS LASHES`,
    `• Dòng mi: ${pkg.categoryName} (${pkg.volumeMeta.detailLabel})`,
    `• Gói ưu đãi: ${pkg.ruleName} — Tổng ${pkg.totalSessions} lần (${pkg.readableContent})`,
    `• Thời hạn sử dụng: ${pkg.validityMonths} tháng (Chu kỳ bảo dưỡng 25 ngày)`,
    `• Giá lẻ tổng ${pkg.totalSessions} lần: ${pkg.retailTotal.toLocaleString('vi-VN')}đ`,
    `• Giá Combo ưu đãi (${includeVat ? 'Đã gồm 8% VAT' : 'Chưa VAT'}): ${finalPrice.toLocaleString('vi-VN')}đ (Tiết kiệm ${pkg.savingsAmount.toLocaleString('vi-VN')}đ · Ưu đãi +${pkg.discountPct}%)`,
    `• Chi phí bình quân: chỉ ~${pkg.avgPerSessionPrice.toLocaleString('vi-VN')}đ/lần`,
  ];
  if (pkg.isWelcomePackage) {
    lines.push(`• Lưu ý: Gói Welcome (2 tặng 1) áp dụng đặc quyền duy nhất trong ngày đầu tiên sử dụng dịch vụ.`);
  }
  lines.push(
    `👉 Khi đăng ký gói hôm nay, buổi làm mi hôm nay được trừ luôn vào buổi đầu tiên của gói (không tính tiền lẻ buổi hôm nay)!`
  );
  return lines.join('\n');
}

export interface LashFamilySibling {
  categoryId: WingsComboCategoryId;
  levelKey: string;
  levelLabel: string;
  shortLabel: string;
  unitWord: 'trụ' | 'fan' | 'sợi';
  fibersPerUnit: number;
  fiberDensityLabel: string;
}

export interface LashFamilyInfo {
  familyKey: 'HyperLight' | 'IvyLight' | 'UltraLight' | 'Classic_Flawless' | 'VVIP';
  familyName: string;
  siblings: LashFamilySibling[];
}

export function getLashFamilyInfo(categoryId: WingsComboCategoryId | string): LashFamilyInfo {
  if (categoryId.startsWith('HyperLight')) {
    return {
      familyKey: 'HyperLight',
      familyName: 'Dòng HyperLight (Trụ siêu nhẹ)',
      siblings: [
        {
          categoryId: 'HyperLight_2X',
          levelKey: '2X',
          levelLabel: '2X · Trụ 2 sợi',
          shortLabel: '2X',
          unitWord: 'trụ',
          fibersPerUnit: 2,
          fiberDensityLabel: '2 sợi/trụ',
        },
        {
          categoryId: 'HyperLight_3X',
          levelKey: '3X',
          levelLabel: '3X · Trụ 3 sợi',
          shortLabel: '3X',
          unitWord: 'trụ',
          fibersPerUnit: 3,
          fiberDensityLabel: '3 sợi/trụ',
        },
        {
          categoryId: 'HyperLight_4X',
          levelKey: '4X',
          levelLabel: '4X · Trụ 4 sợi',
          shortLabel: '4X',
          unitWord: 'trụ',
          fibersPerUnit: 4,
          fiberDensityLabel: '4 sợi/trụ',
        },
        {
          categoryId: 'HyperLight_5X',
          levelKey: '5X',
          levelLabel: '5X · Trụ 5 sợi',
          shortLabel: '5X',
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
          levelLabel: '3ℓ · Trụ 3 sợi dẹp',
          shortLabel: '3ℓ',
          unitWord: 'trụ',
          fibersPerUnit: 3,
          fiberDensityLabel: '3 sợi/trụ',
        },
        {
          categoryId: 'IvyLight_4L',
          levelKey: '4L',
          levelLabel: '4ℓ · Trụ 4 sợi dẹp',
          shortLabel: '4ℓ',
          unitWord: 'trụ',
          fibersPerUnit: 4,
          fiberDensityLabel: '4 sợi/trụ',
        },
        {
          categoryId: 'IvyLight_5L',
          levelKey: '5L',
          levelLabel: '5ℓ · Trụ 5 sợi dẹp',
          shortLabel: '5ℓ',
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

  if (categoryId === 'Classic_Volume' || categoryId === 'FlawlessMink') {
    return {
      familyKey: 'Classic_Flawless',
      familyName: 'Dòng Classic & Flawless Mink',
      siblings: [
        {
          categoryId: 'FlawlessMink',
          levelKey: 'FlawlessMink',
          levelLabel: 'Flawless Mink 1:1',
          shortLabel: 'Flawless Mink',
          unitWord: 'sợi',
          fibersPerUnit: 1,
          fiberDensityLabel: 'Sợi đơn 1:1',
        },
        {
          categoryId: 'Classic_Volume',
          levelKey: 'Classic_Volume',
          levelLabel: 'Classic & Volume 2D',
          shortLabel: 'Classic 2D',
          unitWord: 'sợi',
          fibersPerUnit: 2,
          fiberDensityLabel: '2 sợi/fan 2D',
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
  return getComboPackagesForCategoryAndVolume({
    categoryId: 'Classic_Volume',
    volume: 'under',
    welcomeEligibility,
    includeVvipPass: false,
  });
}
