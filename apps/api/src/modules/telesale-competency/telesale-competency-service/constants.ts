import { FastifyInstance } from 'fastify';

export const CONFIG_KEY = 'telesale_competency:global_config_v1';
export const VERSIONS_KEY = 'telesale_competency:versions_v2';
export const EVAL_KEY_PREFIX = 'telesale_competency:eval_v1:';
export const HISTORY_KEY_PREFIX = 'telesale_competency:history_v1:';
export const STAFF_TIER_KEY_PREFIX = 'telesale_competency:staff_tier_v1:';

export interface OperatorActor {
  id?: number;
  name?: string;
}

export async function readCrmConfigJsonSafe<T>(fastify: FastifyInstance | undefined, key: string): Promise<T | null> {
  try {
    if (fastify?.prisma?.crm?.crmConfig) {
      const record = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key },
      });
      if (record?.value) {
        return JSON.parse(record.value) as T;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function upsertCrmConfigJson(
  fastify: FastifyInstance | undefined,
  key: string,
  value: unknown
): Promise<void> {
  if (!fastify?.prisma?.crm?.crmConfig) {
    return;
  }
  const serialized = JSON.stringify(value);
  await fastify.prisma.crm.crmConfig.upsert({
    where: { key },
    create: {
      key,
      value: serialized,
    },
    update: {
      value: serialized,
      updatedAt: new Date(),
    },
  });
}
