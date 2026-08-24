import type { FastifyInstance } from 'fastify';
import type {
  CustomerServiceFilterCategory,
  CustomerServiceFilterOption,
  CustomerServiceFilterOptionsResponse,
} from '@mos-lab/shared';

interface ServiceCatalogRow {
  id: number;
  name: string;
  serviceKey: string;
  serviceType: string | null;
  serviceGroup: string | null;
  singlePrice: number | null;
}

interface LashFamilyDefinition {
  key: string;
  label: string;
  namePrefixes: string[];
}

const FIXED_FINAL_PRICE_SERVICE_GROUPS = new Set(['Lashes', 'LashesTop', 'LashesUnder']);

export interface FixedFinalPriceScope {
  /** IDs actually covered after direct selections and categories are expanded. */
  serviceIds: number[];
  /** Explicit IDs which are not active, single-price lash services. */
  invalidServiceIds: number[];
  /** Category keys not present in the current active catalog. */
  invalidCategoryKeys: string[];
  /** Existing categories that do not contain an eligible single lash service. */
  emptyCategoryKeys: string[];
}

const normalizePositiveServiceIds = (value: readonly number[] | null | undefined): number[] =>
  Array.from(new Set((value || []).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)));

export const normalizeFixedFinalPriceCategoryKeys = (value: readonly string[] | null | undefined): string[] =>
  Array.from(
    new Set(
      (value || [])
        .map((key) =>
          String(key || '')
            .trim()
            .toLowerCase()
        )
        .filter((key) => /^[a-z0-9-]+$/.test(key))
    )
  );

/**
 * Resolves a saved fixed-price scope from the exact catalog used by the All
 * Customers advanced filter. Persisted category keys stay dynamic: a new
 * eligible HyperLight variant becomes covered without editing the campaign.
 */
export const resolveFixedFinalPriceScope = (
  options: CustomerServiceFilterOptionsResponse,
  explicitServiceIds: readonly number[] | null | undefined,
  categoryKeys: readonly string[] | null | undefined
): FixedFinalPriceScope => {
  const eligibleServices = options.services.filter(
    (service) =>
      service.serviceType === 'Normal' &&
      FIXED_FINAL_PRICE_SERVICE_GROUPS.has(service.serviceGroup || '') &&
      Number(service.singlePrice || 0) > 0
  );
  const eligibleIds = new Set(eligibleServices.map((service) => service.id));
  const normalizedExplicitIds = normalizePositiveServiceIds(explicitServiceIds);
  const normalizedCategoryKeys = normalizeFixedFinalPriceCategoryKeys(categoryKeys);
  const categoriesByKey = new Map(options.categories.map((category) => [category.key.toLowerCase(), category]));

  const invalidServiceIds = normalizedExplicitIds.filter((id) => !eligibleIds.has(id));
  const serviceIds = new Set(normalizedExplicitIds.filter((id) => eligibleIds.has(id)));
  const invalidCategoryKeys: string[] = [];
  const emptyCategoryKeys: string[] = [];

  for (const key of normalizedCategoryKeys) {
    const category = categoriesByKey.get(key);
    if (!category) {
      invalidCategoryKeys.push(key);
      continue;
    }
    const categoryServiceIds = normalizePositiveServiceIds(category.serviceIds).filter((id) => eligibleIds.has(id));
    if (categoryServiceIds.length === 0) {
      emptyCategoryKeys.push(key);
      continue;
    }
    categoryServiceIds.forEach((id) => serviceIds.add(id));
  }

  return {
    serviceIds: Array.from(serviceIds),
    invalidServiceIds,
    invalidCategoryKeys,
    emptyCategoryKeys,
  };
};

/**
 * These are style families, not a second source of catalog data. The service
 * IDs in each response are always resolved from the active legacy catalog.
 */
const LASH_FAMILY_DEFINITIONS: readonly LashFamilyDefinition[] = [
  { key: 'classic', label: 'Classic (tất cả biến thể)', namePrefixes: ['classic', 'new classic'] },
  {
    key: 'ivylight',
    label: 'IvyLight (tất cả biến thể)',
    namePrefixes: ['ivylight', 'ivy light', 'new ivylight', 'new ivy light'],
  },
  {
    key: 'ultralight',
    label: 'UltraLight (tất cả biến thể)',
    namePrefixes: ['ultralight', 'ultra light', 'new ultralight', 'new ultra light'],
  },
  {
    key: 'hyperlight',
    label: 'HyperLight (tất cả biến thể)',
    namePrefixes: ['hyperlight', 'hyper light', 'new hyperlight', 'new hyper light'],
  },
  { key: 'volume', label: 'Volume (tất cả biến thể)', namePrefixes: ['volume', 'new volume'] },
  { key: 'mink', label: 'Mink (tất cả biến thể)', namePrefixes: ['mink'] },
  { key: 'under-mink', label: 'Under Mink (tất cả biến thể)', namePrefixes: ['under mink'] },
  {
    key: 'flawless-mink',
    label: 'Flawless Mink (tất cả biến thể)',
    namePrefixes: ['flawless mink', 'new flawless mink'],
  },
  {
    key: 'flawless-under-mink',
    label: 'Flawless Under Mink (tất cả biến thể)',
    namePrefixes: ['flawless under mink', 'new flawless under mink'],
  },
];

const normalizeCatalogName = (value: string | null | undefined): string =>
  String(value || '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/g, ' ');

const hasFamilyPrefix = (value: string, prefixes: readonly string[]): boolean =>
  prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix} `));

export class CustomerServiceFilterCatalogService {
  static async getOptions(fastify: FastifyInstance): Promise<CustomerServiceFilterOptionsResponse> {
    const rows = await fastify.prisma.legacy.$queryRawUnsafe<ServiceCatalogRow[]>(`
      SELECT
        s.id,
        COALESCE(MAX(sl.service_name), s.service_key) AS name,
        s.service_key AS serviceKey,
        s.service_type AS serviceType,
        s.service_group AS serviceGroup,
        MIN(CASE WHEN sp.service_price > 0 THEN sp.service_price END) AS singlePrice
      FROM service s
      LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
      LEFT JOIN service_price sp
        ON sp.service_id = s.id
        AND sp.currency_id = 2
        AND sp.service_price_package_key = 'single'
        AND sp.is_disabled = 0
      WHERE s.is_disabled = 0
        AND s.is_temporary = 0
      GROUP BY s.id, s.service_key, s.service_type, s.service_group, s.position
      ORDER BY s.position ASC, name ASC, s.id ASC
    `);

    const services: CustomerServiceFilterOption[] = rows.map((row) => {
      const singlePrice = Number(row.singlePrice);
      return {
        id: Number(row.id),
        name: String(row.name),
        serviceType: row.serviceType || null,
        serviceGroup: row.serviceGroup || null,
        singlePrice: Number.isFinite(singlePrice) && singlePrice > 0 ? Math.round(singlePrice) : null,
      };
    });

    const categories: CustomerServiceFilterCategory[] = LASH_FAMILY_DEFINITIONS.map((family) => {
      const serviceIds = rows
        .filter((row) => {
          const displayName = normalizeCatalogName(row.name);
          const catalogKey = normalizeCatalogName(row.serviceKey);
          return hasFamilyPrefix(displayName, family.namePrefixes) || hasFamilyPrefix(catalogKey, family.namePrefixes);
        })
        .map((row) => Number(row.id));

      return { key: family.key, label: family.label, serviceIds };
    }).filter((category) => category.serviceIds.length > 0);

    return { services, categories };
  }
}
