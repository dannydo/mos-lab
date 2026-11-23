import type {
  AcademyWorkshopDesignDifficultyLevel,
  AcademyWorkshopDesignItem,
  AcademyWorkshopDesignItemImage,
  CreateAcademyWorkshopDesignItemImageRequest,
  CreateAcademyWorkshopDesignItemRequest,
} from '@mos-lab/shared';

export type DesignFormValues = CreateAcademyWorkshopDesignItemRequest;
export type ImageFormValues = CreateAcademyWorkshopDesignItemImageRequest;

export function difficultyMeta(level: AcademyWorkshopDesignDifficultyLevel) {
  switch (level) {
    case 'BASIC':
      return { label: 'Cơ bản', stars: 1, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'ADVANCED':
      return { label: 'Nâng cao', stars: 2, className: 'text-sky-600 bg-sky-50 border-sky-200' };
    case 'MASTER':
      return { label: 'Chuyên sâu', stars: 3, className: 'text-purple-600 bg-purple-50 border-purple-200' };
    default:
      return { label: 'Cơ bản', stars: 1, className: 'text-gray-600 bg-gray-50 border-gray-200' };
  }
}

export function designFormValues(item?: AcademyWorkshopDesignItem): DesignFormValues {
  return {
    name: item?.name || '',
    description: item?.description || null,
    difficultyLevel: item?.difficultyLevel || 'BASIC',
    priceVnd: item?.priceVnd ?? 0,
    isAvailable: item?.isAvailable ?? true,
  };
}

export function designRequest(values: DesignFormValues): CreateAcademyWorkshopDesignItemRequest {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    difficultyLevel: values.difficultyLevel || 'BASIC',
    priceVnd: Math.max(0, Math.round(Number(values.priceVnd) || 0)),
    isAvailable: Boolean(values.isAvailable),
  };
}

export function sortDesigns(items: AcademyWorkshopDesignItem[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export function formatVnd(value: number) {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('vi-VN')} đ`;
}

export function imageFormValues(item?: AcademyWorkshopDesignItemImage): ImageFormValues {
  return { imageUrl: item?.imageUrl || '', altText: item?.altText || null };
}

export function imageRequest(values: ImageFormValues): CreateAcademyWorkshopDesignItemImageRequest {
  return { imageUrl: values.imageUrl.trim(), altText: values.altText?.trim() || null };
}

export function sortImages(images: AcademyWorkshopDesignItemImage[]) {
  return [...images].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}
