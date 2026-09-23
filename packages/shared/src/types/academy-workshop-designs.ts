import type { ActionResponse, PageQuery, PageResponse } from './api.js';

export const ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LEVELS = ['BASIC', 'ADVANCED', 'MASTER'] as const;
export type AcademyWorkshopDesignDifficultyLevel = (typeof ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LEVELS)[number];

export const ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_LABELS: Record<AcademyWorkshopDesignDifficultyLevel, string> = {
  BASIC: 'Cơ bản (⭐)',
  ADVANCED: 'Nâng cao (⭐⭐)',
  MASTER: 'Chuyên sâu (⭐⭐⭐)',
};

export const ACADEMY_WORKSHOP_DESIGN_DIFFICULTY_STARS: Record<AcademyWorkshopDesignDifficultyLevel, number> = {
  BASIC: 1,
  ADVANCED: 2,
  MASTER: 3,
};

/** Configurable lash design option for a workshop. Prices are whole VND (default 0). */
export interface AcademyWorkshopDesignItem {
  id: number;
  workshopId: number;
  name: string;
  description: string | null;
  difficultyLevel: AcademyWorkshopDesignDifficultyLevel;
  priceVnd: number;
  sortOrder: number;
  isAvailable: boolean;
  images: AcademyWorkshopDesignItemImage[];
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopDesignItemImage {
  id: number;
  designItemId: number;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A reusable set of lash design options that can be copied into a workshop. */
export interface AcademyWorkshopDesignTemplate {
  id: number;
  title: string;
  description: string | null;
  items: AcademyWorkshopDesignTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopDesignTemplateItem {
  id: number;
  templateId: number;
  name: string;
  description: string | null;
  difficultyLevel: AcademyWorkshopDesignDifficultyLevel;
  priceVnd: number;
  sortOrder: number;
  isAvailable: boolean;
  images: AcademyWorkshopDesignTemplateItemImage[];
}

export interface AcademyWorkshopDesignTemplateItemImage {
  id: number;
  templateItemId: number;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
}

/** Immutable lash design and price snapshot selected during registration or in roster. */
export interface AcademyWorkshopParticipantDesignSelection {
  id: number;
  participantId: number;
  designItemId: number | null;
  designName: string;
  difficultyLevel: AcademyWorkshopDesignDifficultyLevel;
  priceVnd: number;
  selectedAt: string;
}

export interface CreateAcademyWorkshopDesignItemRequest {
  name: string;
  description?: string | null;
  difficultyLevel?: AcademyWorkshopDesignDifficultyLevel;
  priceVnd?: number;
  isAvailable?: boolean;
}

export type UpdateAcademyWorkshopDesignItemRequest = Partial<CreateAcademyWorkshopDesignItemRequest>;

export interface CreateAcademyWorkshopDesignItemImageRequest {
  imageUrl: string;
  altText?: string | null;
}

export type UpdateAcademyWorkshopDesignItemImageRequest = Partial<CreateAcademyWorkshopDesignItemImageRequest>;

export interface UpsertAcademyWorkshopDesignTemplateItemRequest {
  name: string;
  description?: string | null;
  difficultyLevel?: AcademyWorkshopDesignDifficultyLevel;
  priceVnd?: number;
  isAvailable?: boolean;
  images?: CreateAcademyWorkshopDesignItemImageRequest[];
}

export interface CreateAcademyWorkshopDesignTemplateRequest {
  title: string;
  description?: string | null;
  items: UpsertAcademyWorkshopDesignTemplateItemRequest[];
}

export interface SaveAcademyWorkshopDesignTemplateRequest {
  title: string;
  description?: string | null;
}

export interface UpdateAcademyWorkshopDesignTemplateRequest extends SaveAcademyWorkshopDesignTemplateRequest {
  items: UpsertAcademyWorkshopDesignTemplateItemRequest[];
}

export interface ListAcademyWorkshopDesignTemplatesParams extends PageQuery {
  search?: string;
}

export type ListAcademyWorkshopDesignTemplatesResponse = PageResponse<AcademyWorkshopDesignTemplate>;
export type AcademyWorkshopDesignTemplateActionResponse = ActionResponse<AcademyWorkshopDesignTemplate>;
export type AcademyWorkshopDesignItemActionResponse = ActionResponse<AcademyWorkshopDesignItem>;
