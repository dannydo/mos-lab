import type { FastifyInstance } from 'fastify';
import type { TelesaleTvQuoteItem, TelesaleTvQuotesConfig, TelesaleTvQuotesOverviewResponse } from '@mos-lab/shared';
import { CRM_CONFIG_CELEBRATION_QUOTES_KEY, getDefaultCelebrationQuotes } from './tv-default-quotes.js';
import { TV_CELEBRATION_PERSONAS } from './tv-personas.js';

let cachedQuotesConfig: TelesaleTvQuotesConfig | null = null;
let lastQuotesCacheTime = 0;

export function getCachedQuotesConfig(): TelesaleTvQuotesConfig | null {
  return cachedQuotesConfig;
}

export async function getCelebrationQuotesConfig(fastify: FastifyInstance): Promise<TelesaleTvQuotesConfig> {
  const now = Date.now();
  if (cachedQuotesConfig && now - lastQuotesCacheTime < 15000) {
    return cachedQuotesConfig;
  }

  try {
    const existing = await fastify.prisma.crm.crmConfig.findUnique({
      where: { key: CRM_CONFIG_CELEBRATION_QUOTES_KEY },
    });

    if (existing?.value) {
      const parsed = JSON.parse(existing.value) as TelesaleTvQuotesConfig;
      if (Array.isArray(parsed?.quotes) && parsed.quotes.length > 0) {
        cachedQuotesConfig = parsed;
        lastQuotesCacheTime = now;
        return parsed;
      }
    }
  } catch (e: unknown) {
    const errMsg = (e as { message?: unknown } | null)?.message || e;
    fastify.log.warn(`[getCelebrationQuotesConfig] DB read warning: ${errMsg}`);
  }

  // Auto-seed default library
  const defaultQuotes = getDefaultCelebrationQuotes();
  const config: TelesaleTvQuotesConfig = {
    quotes: defaultQuotes,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };

  try {
    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: CRM_CONFIG_CELEBRATION_QUOTES_KEY },
      create: {
        key: CRM_CONFIG_CELEBRATION_QUOTES_KEY,
        value: JSON.stringify(config),
      },
      update: {
        value: JSON.stringify(config),
      },
    });
  } catch (e: unknown) {
    const errMsg = (e as { message?: unknown } | null)?.message || e;
    fastify.log.error(`[getCelebrationQuotesConfig] Failed to upsert default quotes: ${errMsg}`);
  }

  cachedQuotesConfig = config;
  lastQuotesCacheTime = now;
  return config;
}

export async function saveCelebrationQuotesConfig(
  fastify: FastifyInstance,
  quotes: TelesaleTvQuoteItem[],
  updatedBy = 'user'
): Promise<TelesaleTvQuotesConfig> {
  const config: TelesaleTvQuotesConfig = {
    quotes,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await fastify.prisma.crm.crmConfig.upsert({
    where: { key: CRM_CONFIG_CELEBRATION_QUOTES_KEY },
    create: {
      key: CRM_CONFIG_CELEBRATION_QUOTES_KEY,
      value: JSON.stringify(config),
    },
    update: {
      value: JSON.stringify(config),
    },
  });

  cachedQuotesConfig = config;
  lastQuotesCacheTime = Date.now();
  return config;
}

export async function resetCelebrationQuotesConfig(
  fastify: FastifyInstance,
  personaKey?: string
): Promise<TelesaleTvQuotesConfig> {
  const defaults = getDefaultCelebrationQuotes();
  let nextQuotes: TelesaleTvQuoteItem[];

  if (personaKey && personaKey !== 'RANDOM_MULTI') {
    const currentConfig = await getCelebrationQuotesConfig(fastify);
    const otherQuotes = currentConfig.quotes.filter((q) => q.personaKey !== personaKey);
    const defaultForPersona = defaults.filter((q) => q.personaKey === personaKey);
    nextQuotes = [...otherQuotes, ...defaultForPersona];
  } else {
    nextQuotes = defaults;
  }

  return saveCelebrationQuotesConfig(fastify, nextQuotes, 'reset_to_default');
}

export async function getCelebrationQuotesOverview(
  fastify: FastifyInstance
): Promise<TelesaleTvQuotesOverviewResponse> {
  const config = await getCelebrationQuotesConfig(fastify);
  const personas = Object.values(TV_CELEBRATION_PERSONAS);

  const byPersona: Record<string, number> = {};
  const byEvent: Record<string, number> = {};
  let activeQuotes = 0;
  let customQuotes = 0;

  for (const q of config.quotes) {
    if (q.isActive) activeQuotes++;
    if (q.isCustom) customQuotes++;
    byPersona[q.personaKey] = (byPersona[q.personaKey] || 0) + 1;
    byEvent[q.eventType] = (byEvent[q.eventType] || 0) + 1;
  }

  return {
    quotes: config.quotes,
    personas,
    stats: {
      totalQuotes: config.quotes.length,
      activeQuotes,
      customQuotes,
      byPersona,
      byEvent,
    },
  };
}
