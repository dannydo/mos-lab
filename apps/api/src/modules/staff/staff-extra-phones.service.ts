import type { FastifyInstance } from 'fastify';

export const STAFF_EXTRA_PHONES_CONFIG_KEY = 'mos_staff_extra_phones_v1';

/**
 * Normalizes a string list or delimited phone string into unique dialable numbers (>= 8 digits),
 * deduplicating by digit sequence while preserving original display formatting order.
 */
export function normalizePhoneList(input: unknown): string[] {
  const rawItems: unknown[] = Array.isArray(input) ? input : typeof input === 'string' ? input.split(/[,;\n]+/) : [];

  const seenDigits = new Set<string>();
  const result: string[] = [];

  for (const item of rawItems) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 8 || seenDigits.has(digitsOnly)) continue;
    seenDigits.add(digitsOnly);
    result.push(trimmed);
  }

  return result;
}

export function mergeStaffPhones(primaryPhone?: string | null, extraPhones?: string[] | null): string[] {
  return normalizePhoneList([primaryPhone, ...(Array.isArray(extraPhones) ? extraPhones : [])]);
}

export async function loadStaffExtraPhonesMap(fastify: FastifyInstance): Promise<Record<string, string[]>> {
  try {
    const record = await fastify.prisma?.crm?.crmConfig?.findUnique?.({
      where: { key: STAFF_EXTRA_PHONES_CONFIG_KEY },
      select: { value: true },
    });
    if (!record?.value) return {};
    const parsed = JSON.parse(record.value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const normalized = normalizePhoneList(v);
      if (normalized.length > 0) {
        out[k] = normalized;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveStaffExtraPhonesForStaff(
  fastify: FastifyInstance,
  staffId: number,
  extraPhones: unknown,
  primaryPhone?: string | null
): Promise<string[]> {
  const currentMap = await loadStaffExtraPhonesMap(fastify);
  const primaryDigits = typeof primaryPhone === 'string' ? primaryPhone.replace(/[^0-9]/g, '') : '';
  const cleanedExtras = normalizePhoneList(extraPhones).filter((p) => {
    const digits = p.replace(/[^0-9]/g, '');
    return !primaryDigits || digits !== primaryDigits;
  });

  if (cleanedExtras.length > 0) {
    currentMap[String(staffId)] = cleanedExtras;
  } else {
    delete currentMap[String(staffId)];
  }

  const serialized = JSON.stringify(currentMap);
  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: STAFF_EXTRA_PHONES_CONFIG_KEY },
    create: { key: STAFF_EXTRA_PHONES_CONFIG_KEY, value: serialized },
    update: { value: serialized },
  });

  return cleanedExtras;
}
