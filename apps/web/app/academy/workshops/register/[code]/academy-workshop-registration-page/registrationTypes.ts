import type {
  AcademyWorkshopMenuCategory,
  AcademyWorkshopPublicRegistrationInfo,
  RegisterAcademyWorkshopRequest,
} from '@mos-lab/shared';

export const REGISTRATION_DRAFT_VERSION = 1;

export type RegistrationFormValues = Omit<RegisterAcademyWorkshopRequest, 'menuSelections'> & {
  menuSelections?: Partial<Record<AcademyWorkshopMenuCategory, number>>;
};

export type WorkshopRegistrationDraft = {
  version: typeof REGISTRATION_DRAFT_VERSION;
  name?: string;
  phone?: string;
  email?: string;
  goal?: string;
  referrer?: string;
  equipmentPackageId?: number;
  designItemId?: number;
  menuSelections?: Partial<Record<AcademyWorkshopMenuCategory, number>>;
};

export type WorkshopMenuSelectionSummary = {
  id: number;
  category: AcademyWorkshopMenuCategory;
  label: string;
  name: string;
  imageUrl: string | null;
};

export type SelectionSheetKind = 'equipment' | 'design' | 'menu';

export type WorkshopPublicDetail = AcademyWorkshopPublicRegistrationInfo['workshop'];
export type WorkshopEquipmentPackage = WorkshopPublicDetail['equipment']['packages'][number];
export type WorkshopDesignItem = WorkshopPublicDetail['design']['items'][number];
