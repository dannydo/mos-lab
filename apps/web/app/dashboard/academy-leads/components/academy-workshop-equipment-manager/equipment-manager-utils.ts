import type {
  AcademyWorkshopEquipmentPackage,
  AcademyWorkshopEquipmentPackageImage,
  CreateAcademyWorkshopEquipmentPackageImageRequest,
  CreateAcademyWorkshopEquipmentPackageRequest,
} from '@mos-lab/shared';

export type EquipmentFormValues = Omit<CreateAcademyWorkshopEquipmentPackageRequest, 'includedItems'> & {
  includedItemsText: string;
};

export type ImageFormValues = CreateAcademyWorkshopEquipmentPackageImageRequest;

export interface EquipmentImageTarget {
  equipmentPackage: AcademyWorkshopEquipmentPackage;
  image: AcademyWorkshopEquipmentPackageImage | null;
}

export function equipmentFormValues(item?: AcademyWorkshopEquipmentPackage): EquipmentFormValues {
  return {
    name: item?.name || '',
    description: item?.description || null,
    includedItemsText: item?.includedItems.join('\n') || '',
    priceVnd: item?.priceVnd ?? 0,
    isAvailable: item?.isAvailable ?? true,
    isIncludedInFee: item?.isIncludedInFee ?? false,
  };
}

export function itemLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function equipmentRequest(values: EquipmentFormValues): CreateAcademyWorkshopEquipmentPackageRequest {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    includedItems: itemLines(values.includedItemsText),
    priceVnd: Math.max(0, Math.round(Number(values.priceVnd) || 0)),
    isAvailable: Boolean(values.isAvailable),
    isIncludedInFee: Boolean(values.isIncludedInFee),
  };
}

export function sortEquipment(items: AcademyWorkshopEquipmentPackage[]): AcademyWorkshopEquipmentPackage[] {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export function formatVnd(value: number): string {
  return `${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('vi-VN')} đ`;
}

export function imageFormValues(item?: AcademyWorkshopEquipmentPackageImage): ImageFormValues {
  return { imageUrl: item?.imageUrl || '', altText: item?.altText || null };
}

export function imageRequest(values: ImageFormValues): CreateAcademyWorkshopEquipmentPackageImageRequest {
  return { imageUrl: values.imageUrl.trim(), altText: values.altText?.trim() || null };
}

export function sortImages(images: AcademyWorkshopEquipmentPackageImage[]): AcademyWorkshopEquipmentPackageImage[] {
  return [...images].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
}

export function computePackageSurcharge(
  item: AcademyWorkshopEquipmentPackage,
  allPackages: AcademyWorkshopEquipmentPackage[]
) {
  const includedPackage = allPackages.find((pkg) => pkg.isIncludedInFee);
  const basePrice = includedPackage ? includedPackage.priceVnd : 0;
  const surcharge = includedPackage ? Math.max(0, item.priceVnd - basePrice) : item.priceVnd;
  return { includedPackage, basePrice, surcharge };
}
