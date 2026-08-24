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
}

interface LashFamilyDefinition {
  key: string;
  label: string;
  namePrefixes: string[];
}

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
        s.service_group AS serviceGroup
      FROM service s
      LEFT JOIN service_language sl ON sl.service_id = s.id AND sl.language_id = 1
      WHERE s.is_disabled = 0
        AND s.is_temporary = 0
      GROUP BY s.id, s.service_key, s.service_type, s.service_group, s.position
      ORDER BY s.position ASC, name ASC, s.id ASC
    `);

    const services: CustomerServiceFilterOption[] = rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      serviceType: row.serviceType || null,
      serviceGroup: row.serviceGroup || null,
    }));

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
