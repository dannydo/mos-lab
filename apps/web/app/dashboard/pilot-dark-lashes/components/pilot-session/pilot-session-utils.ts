import type { PilotMaterial } from '@mos-lab/shared';

export function formatPilotVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export const QUICK_LASH_PRESETS = [
  { name: 'Thuốc số 1 (Perming Cream)', unit: 'ml', volume: 15, purchasePrice: 450000 },
  { name: 'Thuốc số 2 (Setting Cream)', unit: 'ml', volume: 15, purchasePrice: 450000 },
  { name: 'Cây chải mi kim loại', unit: 'cây', volume: 1, purchasePrice: 35000 },
  { name: 'Cây chải mi nhựa', unit: 'cây', volume: 1, purchasePrice: 3000 },
  { name: 'Keratin dưỡng mi', unit: 'ml', volume: 20, purchasePrice: 380000 },
  { name: 'Kềm PH (Kiểm tra độ pH)', unit: 'lần', volume: 50, purchasePrice: 50000 },
  { name: 'Eye Pad (Miếng dán mi dưới)', unit: 'cặp', volume: 1, purchasePrice: 6000 },
  { name: 'Giấy giữ mi con', unit: 'miếng', volume: 50, purchasePrice: 20000 },
  { name: 'Thuốc nhuộm mi (Lash Tint)', unit: 'ml', volume: 15, purchasePrice: 240000 },
  { name: 'Dụng cụ vệ sinh mi', unit: 'bộ', volume: 1, purchasePrice: 5000 },
];

export function computeLiveConsumablesCost(
  formMaterials: Array<{ materialId?: number; usageAmount?: number }>,
  catalogMap: Map<number, PilotMaterial>
): number {
  if (!formMaterials || formMaterials.length === 0) return 0;
  return formMaterials.reduce((total, item) => {
    if (!item?.materialId || !item?.usageAmount || item.usageAmount <= 0) return total;
    const mat = catalogMap.get(item.materialId);
    if (!mat) return total;
    return total + Math.round(Number(mat.costPerUnit) * Number(item.usageAmount));
  }, 0);
}

export function computeLiveSessionEconomics(params: {
  hasMaterials: boolean;
  liveConsumablesCost: number;
  formMaterialCost: number;
  formTechnicianCost: number;
  formCommissionAmount: number;
  formPromoAmount: number;
  formRefundAmount: number;
  formRevenue: number;
}) {
  const {
    hasMaterials,
    liveConsumablesCost,
    formMaterialCost,
    formTechnicianCost,
    formCommissionAmount,
    formPromoAmount,
    formRefundAmount,
    formRevenue,
  } = params;

  const effectiveMaterialCost = hasMaterials ? liveConsumablesCost : formMaterialCost || 0;
  const liveTotalCost =
    effectiveMaterialCost +
    (formTechnicianCost || 0) +
    (formCommissionAmount || 0) +
    (formPromoAmount || 0) +
    (formRefundAmount || 0);
  const liveContribution = (formRevenue || 0) - liveTotalCost;
  const liveMarginPct = formRevenue > 0 ? Math.round((liveContribution / formRevenue) * 100) : 0;

  return { effectiveMaterialCost, liveTotalCost, liveContribution, liveMarginPct };
}
