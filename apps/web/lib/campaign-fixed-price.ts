import type { CustomerServiceFilterCategory, CustomerServiceFilterOption } from '@mos-lab/shared';

export interface FixedFinalPriceServiceOption {
  id: number;
  name: string;
  price: number;
}

export interface FixedFinalPriceServiceCategory {
  key: string;
  label: string;
  serviceIds: number[];
  minimumPrice: number;
}

export interface FixedFinalPriceScopeSummary {
  services: FixedFinalPriceServiceOption[];
  invalidServiceIds: number[];
  invalidCategoryKeys: string[];
  minimumListedPrice: number | null;
}

export const normalizeEligibleServiceIds = (value: unknown): number[] =>
  Array.from(
    new Set((Array.isArray(value) ? value : []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))
  );

export const normalizeEligibleServiceCategoryKeys = (value: unknown): string[] =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((key) =>
          String(key || '')
            .trim()
            .toLowerCase()
        )
        .filter((key) => /^[a-z0-9-]+$/.test(key))
    )
  );

export const splitFixedFinalPriceSelection = (
  value: unknown
): {
  eligibleServiceIds: number[];
  eligibleServiceCategoryKeys: string[];
} => {
  const values = Array.isArray(value) ? value : [];
  return {
    eligibleServiceIds: normalizeEligibleServiceIds(values.filter((item) => !String(item).startsWith('category:'))),
    eligibleServiceCategoryKeys: normalizeEligibleServiceCategoryKeys(
      values
        .filter((item) => String(item).startsWith('category:'))
        .map((item) => String(item).slice('category:'.length))
    ),
  };
};

export const getFixedFinalPriceScopeSummary = (
  eligibleServiceIds: number[],
  eligibleServiceCategoryKeys: string[],
  availableServices: FixedFinalPriceServiceOption[],
  availableCategories: FixedFinalPriceServiceCategory[]
): FixedFinalPriceScopeSummary => {
  const selectedServices = availableServices.filter((service) => eligibleServiceIds.includes(service.id));
  const categoriesByKey = new Map(availableCategories.map((category) => [category.key, category]));
  const invalidCategoryKeys = eligibleServiceCategoryKeys.filter((key) => !categoriesByKey.has(key));
  const selectedCategoryServices = eligibleServiceCategoryKeys.flatMap((key) => {
    const category = categoriesByKey.get(key);
    if (!category) return [];
    return availableServices.filter((service) => category.serviceIds.includes(service.id));
  });
  const services = Array.from(
    new Map([...selectedServices, ...selectedCategoryServices].map((service) => [service.id, service])).values()
  );
  return {
    services,
    invalidServiceIds: eligibleServiceIds.filter((id) => !selectedServices.some((service) => service.id === id)),
    invalidCategoryKeys,
    minimumListedPrice: services.length > 0 ? Math.min(...services.map((service) => service.price)) : null,
  };
};

export const validateFixedFinalPricePromotion = (
  type: string,
  value: number,
  eligibleServiceIds: number[],
  eligibleServiceCategoryKeys: string[],
  availableServices: FixedFinalPriceServiceOption[],
  availableCategories: FixedFinalPriceServiceCategory[]
): void => {
  if (type !== 'FIXED_FINAL_PRICE') return;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Giá đồng nhất phải là số tiền VND nguyên lớn hơn 0.');
  }
  const scope = getFixedFinalPriceScopeSummary(
    eligibleServiceIds,
    eligibleServiceCategoryKeys,
    availableServices,
    availableCategories
  );
  if (scope.invalidServiceIds.length > 0) {
    throw new Error('Danh sách dịch vụ đồng giá chứa dịch vụ không hợp lệ hoặc đã ngừng hoạt động.');
  }
  if (scope.invalidCategoryKeys.length > 0) {
    throw new Error('Thể loại dịch vụ đồng giá không hợp lệ hoặc đã ngừng hoạt động.');
  }
  if (scope.services.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một dịch vụ lẻ nối mi hoặc thể loại dịch vụ cho giá đồng nhất.');
  }
  if (scope.minimumListedPrice !== null && value > scope.minimumListedPrice) {
    throw new Error(
      `Giá đồng nhất ${value.toLocaleString('vi-VN')}đ vượt mức tối đa ${scope.minimumListedPrice.toLocaleString('vi-VN')}đ của phạm vi đã chọn.`
    );
  }
};

/**
 * Matches the server-side eligibility guard for a NYC fixed-final-price
 * campaign promotion. The backend remains authoritative at save time.
 */
export const getFixedFinalPriceServiceOptions = (
  services: CustomerServiceFilterOption[]
): FixedFinalPriceServiceOption[] =>
  services
    .filter(
      (service) =>
        service.serviceType === 'Normal' &&
        ['Lashes', 'LashesTop', 'LashesUnder'].includes(service.serviceGroup || '') &&
        Number(service.singlePrice || 0) > 0
    )
    .map((service) => ({
      id: service.id,
      name: service.name,
      price: Math.round(Number(service.singlePrice || 0)),
    }));

export const getFixedFinalPriceServiceCategories = (
  categories: CustomerServiceFilterCategory[],
  eligibleServices: FixedFinalPriceServiceOption[]
): FixedFinalPriceServiceCategory[] => {
  const eligibleServiceIds = new Set(eligibleServices.map((service) => service.id));
  return categories
    .map((category) => ({
      key: category.key,
      label: category.label,
      serviceIds: category.serviceIds.filter((serviceId) => eligibleServiceIds.has(serviceId)),
      minimumPrice: Math.min(
        ...eligibleServices
          .filter((service) => category.serviceIds.includes(service.id))
          .map((service) => service.price)
      ),
    }))
    .filter((category) => category.serviceIds.length > 0);
};
