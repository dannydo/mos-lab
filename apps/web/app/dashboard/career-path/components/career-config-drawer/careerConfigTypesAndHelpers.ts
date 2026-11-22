import type { CareerProgressionConfig } from '@mos-lab/shared';
import { calculateComboBonus } from '../../career-path.constants';

export type CareerConfigTab = 'CV_TO_CV_PLUS' | 'CV_PLUS_TO_CV_PLUS_PLUS';

export type CvToCcConfig = CareerProgressionConfig['cvToCc'];
export type CvPlusToCvPlusPlusConfig = CareerProgressionConfig['cvPlusToCvPlusPlus'];

export interface CareerConfigSavePayload {
  cvToCc: CareerProgressionConfig['cvToCc'];
  cvToCvPlus: CareerProgressionConfig['cvToCvPlus'];
  cvPlusToCvPlusPlus: CareerProgressionConfig['cvPlusToCvPlusPlus'];
}

export interface CareerConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  config: CareerProgressionConfig;
  onConfigChange: (newConfig: CareerProgressionConfig) => void;
  onSave: (payload: CareerConfigSavePayload) => Promise<void>;
  saving: boolean;
  themeMode?: 'light' | 'dark';
  canEdit?: boolean;
}

export interface Stage1SalesSummary {
  combosPerMonth: number;
  serumsPerWeek: number;
  serumOrigBonus: number;
  sampleComboBonus: number;
  comboCommissionEstimated: number;
  serumCommissionWeekly: number;
  serumCommissionMonthly: number;
  totalSalesCommissionMonthly: number;
}

export interface Stage2SalesSummary {
  combosPerMonth: number;
  serumsPerWeek: number;
  crossTipRate: number;
  crossCvShareRate: number;
  crossOrdersPerMonth: number;
  crossCombosPerMonth: number;
  sampleComboBonus: number;
  comboComm: number;
  serumWeekly: number;
  serumMonthly: number;
  crossTipAmount: number;
  crossComboComm: number;
  crossCvSharedAmount: number;
  totalCrossConsult: number;
  totalSalesComm: number;
}

export const DEFAULT_CV_TO_CC_CONFIG: CvToCcConfig = {
  minOrders: 330,
  minConsecutiveMonths: 3,
  minTipRatioAboveShop: 0.05,
  maxFixRate: 0.015,
  minHappinessIndex: 0.7,
  minBananaCount: 20,
  maxDisciplinaryViolations: 0,
  minWeeklyQaAudits: 1,
  minQaAudits: 4,
  requireZeroFailedAudits: true,
  trialDurationDays: 30,
  minSelfComboRate: 0.21,
  allowSelfConsultTrial: true,
  expectedSerumsPerWeek: 1,
  expectedCombosPerMonth: 8,
  serumOriginalPriceBonus: 100000,
  serumDiscountedPriceBonus: 50000,
  serumDeepDiscountPriceBonus: 10000,
  serumFreePriceBonus: 1000,
  comboUnder2mBonus: 50000,
  comboStepPerMillionBonus: 50000,
};

export const DEFAULT_CV_PLUS_TO_CV_PLUS_PLUS_CONFIG: CvPlusToCvPlusPlusConfig = {
  minMonthsInCvPlus: 2,
  minOrders: 350,
  maxFixRate: 0.015,
  minTipRatioAboveShop: 0.15,
  minBananaCount: 25,
  minHappinessIndex: 0.8,
  crossConsultCommissionRate: 0.025,
  maxDisciplinaryViolations: 0,
  minWeeklyQaAudits: 1,
  minQaAudits: 4,
  requireZeroFailedAudits: true,
  trialDurationDays: 30,
  allowSelfConsultTrial: true,
  minSelfComboRate: 0.3,
  expectedSerumsPerWeek: 4,
  expectedCombosPerMonth: 10,
  serumOriginalPriceBonus: 100000,
  serumDiscountedPriceBonus: 50000,
  serumDeepDiscountPriceBonus: 10000,
  serumFreePriceBonus: 1000,
  comboUnder2mBonus: 50000,
  comboStepPerMillionBonus: 50000,
  crossConsultCvShareRate: 0.2,
};

export function resolveCvToCcConfig(config?: CareerProgressionConfig | null): CvToCcConfig {
  return config?.cvToCc || config?.cvToCvPlus || DEFAULT_CV_TO_CC_CONFIG;
}

export function resolveCvPlusToCvPlusPlusConfig(config?: CareerProgressionConfig | null): CvPlusToCvPlusPlusConfig {
  return config?.cvPlusToCvPlusPlus || DEFAULT_CV_PLUS_TO_CV_PLUS_PLUS_CONFIG;
}

export function formatVnd(num?: number | null): string {
  if (!num) return '0đ';
  return `${num.toLocaleString('vi-VN')}đ`;
}

export function formatThousandsInput(val?: string | number): string {
  return `${val ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parseThousandsInput(val?: string): number {
  return Number(val?.replace(/\$\s?|(,*)/g, '') || 0);
}

export function computeStage1SalesSummary(cvToCc: CvToCcConfig): Stage1SalesSummary {
  const combosPerMonth = cvToCc.expectedCombosPerMonth ?? 8;
  const serumsPerWeek = cvToCc.expectedSerumsPerWeek ?? 1;
  const serumOrigBonus = cvToCc.serumOriginalPriceBonus ?? 100000;
  const sampleComboBonus = calculateComboBonus(4500000, cvToCc);
  const comboCommissionEstimated = combosPerMonth * sampleComboBonus;
  const serumCommissionWeekly = serumsPerWeek * serumOrigBonus;
  const serumCommissionMonthly = serumCommissionWeekly * 4;
  const totalSalesCommissionMonthly = comboCommissionEstimated + serumCommissionMonthly;

  return {
    combosPerMonth,
    serumsPerWeek,
    serumOrigBonus,
    sampleComboBonus,
    comboCommissionEstimated,
    serumCommissionWeekly,
    serumCommissionMonthly,
    totalSalesCommissionMonthly,
  };
}

export function computeStage2SalesSummary(cvPlusToCvPlusPlus: CvPlusToCvPlusPlusConfig): Stage2SalesSummary {
  const combosPerMonth = cvPlusToCvPlusPlus.expectedCombosPerMonth ?? 10;
  const serumsPerWeek = cvPlusToCvPlusPlus.expectedSerumsPerWeek ?? 4;
  const crossTipRate = cvPlusToCvPlusPlus.crossConsultTipRate ?? 0.2;
  const crossCvShareRate = cvPlusToCvPlusPlus.crossConsultCvShareRate ?? 0.2;
  const crossOrdersPerMonth = cvPlusToCvPlusPlus.expectedCrossConsultOrdersPerMonth ?? 20;
  const crossCombosPerMonth = cvPlusToCvPlusPlus.expectedCrossConsultCombosPerMonth ?? 4;

  const sampleComboBonus = calculateComboBonus(4500000, cvPlusToCvPlusPlus);
  const comboComm = combosPerMonth * sampleComboBonus;
  const serumWeekly = serumsPerWeek * (cvPlusToCvPlusPlus.serumOriginalPriceBonus ?? 100000);
  const serumMonthly = serumWeekly * 4;
  const crossTipAmount = Math.round(crossOrdersPerMonth * 40000 * crossTipRate);
  const crossComboComm = Math.round(crossCombosPerMonth * sampleComboBonus);
  const crossCvSharedAmount = Math.round(crossComboComm * crossCvShareRate);
  const totalCrossConsult = crossTipAmount + crossComboComm;
  const totalSalesComm = comboComm + serumMonthly + totalCrossConsult;

  return {
    combosPerMonth,
    serumsPerWeek,
    crossTipRate,
    crossCvShareRate,
    crossOrdersPerMonth,
    crossCombosPerMonth,
    sampleComboBonus,
    comboComm,
    serumWeekly,
    serumMonthly,
    crossTipAmount,
    crossComboComm,
    crossCvSharedAmount,
    totalCrossConsult,
    totalSalesComm,
  };
}

export function patchStage1Config(
  config: CareerProgressionConfig,
  cvToCc: CvToCcConfig,
  patch: Partial<CvToCcConfig>
): CareerProgressionConfig {
  return {
    ...config,
    cvToCc: { ...cvToCc, ...patch },
    cvToCvPlus: { ...(config.cvToCvPlus || cvToCc), ...patch },
  };
}

export function patchStage2Config(
  config: CareerProgressionConfig,
  cvPlusToCvPlusPlus: CvPlusToCvPlusPlusConfig,
  patch: Partial<CvPlusToCvPlusPlusConfig>
): CareerProgressionConfig {
  return {
    ...config,
    cvPlusToCvPlusPlus: { ...cvPlusToCvPlusPlus, ...patch },
  };
}
