import type {
  PilotGlueRodStandardItem,
  PilotMaterial,
  PilotSanitizationItem,
  PilotSolutionNormItem,
  SopItemReviewStatus,
  ToolSanitizationClassification,
} from '@mos-lab/shared';

export type MaterialSopTabKey = 'solutions' | 'glue-rods' | 'sanitization' | 'draft';

export interface PilotMaterialSopModalProps {
  open: boolean;
  onClose: () => void;
  materialsCatalog?: PilotMaterial[];
  onRefreshMaterials?: () => void;
}

export interface SolutionNormFormValues {
  materialId?: number | null;
  materialName: string;
  unit: string;
  costPerUnit: number;
  standardDosagePerSession: number;
  usageInstructions?: string;
  technicalNotes?: string;
  status?: SopItemReviewStatus;
}

export interface GlueRodFormValues {
  category: PilotGlueRodStandardItem['category'];
  materialRef?: string;
  title: string;
  selectionCriteria: string;
  standardOperation: string;
  commonMistakesToAvoid: string;
  technicalNotes?: string;
  illustrationImageUrl?: string | null;
  status?: SopItemReviewStatus;
}

export interface SanitizationFormValues {
  toolName: string;
  classification: ToolSanitizationClassification;
  procedure: string;
  criticalSafetyPoint: string;
  checklistStepsText?: string;
  status?: SopItemReviewStatus;
}

export interface EndorseFormValues {
  reviewerName: string;
  note: string;
}

export const DEFAULT_EXPERT_REVIEWER = 'Cô Giang Đàm';

export const DEFAULT_ENDORSE_NOTE =
  'Tôi đã rà soát và xác nhận toàn bộ định mức thuốc uốn, quy chuẩn keo/trục và checklist khử khuẩn đáp ứng tiêu chuẩn an toàn y tế và kỹ thuật uốn mi bóng tối.';

export const DEFAULT_SANITIZATION_CHECKLIST_TEXT =
  'Bước 1: Rửa xà phòng\nBước 2: Ngâm cồn 70° đủ 15p\nBước 3: Tiệt trùng UV\nBước 4: Bảo quản kín';

export const GLUE_ROD_CATEGORY_OPTIONS: { value: PilotGlueRodStandardItem['category']; label: string }[] = [
  { value: 'SILICON_ROD', label: 'Trục Silicon' },
  { value: 'GLUE', label: 'Keo & Sáp định hình' },
  { value: 'OTHER', label: 'Khác' },
];

export const SANITIZATION_CLASSIFICATION_OPTIONS: { value: ToolSanitizationClassification; label: string }[] = [
  { value: 'REUSABLE', label: '♻️ Tái sử dụng (Khử khuẩn nghiêm ngặt)' },
  { value: 'DISPOSABLE', label: '🚫 Dùng 1 lần (Hủy sau ca)' },
];

export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getGlueRodCategoryLabel(category: PilotGlueRodStandardItem['category']): string {
  if (category === 'SILICON_ROD') return 'Trục Silicon';
  if (category === 'GLUE') return 'Keo & Sáp Định Hình';
  return 'Quy chuẩn khác';
}

export function computeVerifiedPercentage(verifiedCount = 0, totalItemsCount = 0): number {
  if (!totalItemsCount) return 0;
  return Math.round((verifiedCount / totalItemsCount) * 100);
}

export function buildUpdatedSolutionNorms(
  norms: PilotSolutionNormItem[],
  editingNorm: PilotSolutionNormItem | null,
  values: SolutionNormFormValues
): PilotSolutionNormItem[] {
  const costPerUnit = Number(values.costPerUnit || 0);
  const standardDosage = Number(values.standardDosagePerSession || 0);
  const costPerSession = Math.round(costPerUnit * standardDosage);

  if (editingNorm) {
    return norms.map((n) =>
      n.id === editingNorm.id
        ? {
            ...n,
            ...values,
            status: values.status ?? n.status,
            costPerUnit,
            standardDosagePerSession: standardDosage,
            costPerSession,
          }
        : n
    );
  }

  const newNorm: PilotSolutionNormItem = {
    id: `norm-${Date.now()}`,
    materialId: values.materialId || null,
    materialName: values.materialName,
    unit: values.unit,
    costPerUnit,
    standardDosagePerSession: standardDosage,
    costPerSession,
    usageInstructions: values.usageInstructions || '',
    technicalNotes: values.technicalNotes || '',
    status: 'PENDING_REVIEW',
    verifiedBy: null,
    verifiedAt: null,
  };

  return [...norms, newNorm];
}

export function buildUpdatedGlueRodStandards(
  list: PilotGlueRodStandardItem[],
  editingGlueRod: PilotGlueRodStandardItem | null,
  values: GlueRodFormValues
): PilotGlueRodStandardItem[] {
  if (editingGlueRod) {
    return list.map((g) =>
      g.id === editingGlueRod.id
        ? {
            ...g,
            ...values,
            technicalNotes: values.technicalNotes ?? g.technicalNotes,
            status: values.status ?? g.status,
          }
        : g
    );
  }

  const newItem: PilotGlueRodStandardItem = {
    id: `std-${Date.now()}`,
    category: values.category,
    title: values.title,
    materialRef: values.materialRef || '',
    selectionCriteria: values.selectionCriteria || '',
    standardOperation: values.standardOperation || '',
    technicalNotes: values.technicalNotes || '',
    commonMistakesToAvoid: values.commonMistakesToAvoid || '',
    illustrationImageUrl: values.illustrationImageUrl || null,
    status: 'PENDING_REVIEW',
    verifiedBy: null,
    verifiedAt: null,
  };

  return [...list, newItem];
}

export function buildUpdatedSanitizationProcedures(
  list: PilotSanitizationItem[],
  editingSanit: PilotSanitizationItem | null,
  values: SanitizationFormValues
): PilotSanitizationItem[] {
  const checklistSteps = (values.checklistStepsText || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  if (editingSanit) {
    return list.map((p) =>
      p.id === editingSanit.id
        ? {
            ...p,
            toolName: values.toolName,
            classification: values.classification,
            procedure: values.procedure,
            criticalSafetyPoint: values.criticalSafetyPoint,
            checklistSteps,
          }
        : p
    );
  }

  const newItem: PilotSanitizationItem = {
    id: `sanit-${Date.now()}`,
    toolName: values.toolName,
    classification: values.classification,
    procedure: values.procedure || '',
    criticalSafetyPoint: values.criticalSafetyPoint || '',
    checklistSteps,
    status: 'PENDING_REVIEW',
    verifiedBy: null,
    verifiedAt: null,
  };

  return [...list, newItem];
}

export function isFormValidationError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'errorFields' in err;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return fallback;
}
