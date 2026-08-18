import axios from 'axios';
import type { FastifyInstance } from 'fastify';
import { buildAcademyLeadSearchText, normalizeAcademyPhone } from './academy-sales.service.js';

const SYNC_LOCK = 'mos-lab:academy-pancake-sync';
const DEFAULT_SYNC_INTERVAL_MINUTES = 60;
const MIN_SYNC_INTERVAL_MINUTES = 15;

type PancakeLead = {
  pancakeId: string;
  facebookPsid: string | null;
  pageId: string | null;
  name: string;
  phone: string | null;
  source: string;
  facebookChatLink: string | null;
  sourceNote: string | null;
  sourceCreatedAt: Date | null;
};

export interface PancakeSyncReport {
  enabled: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

export class PancakeSyncConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PancakeSyncConfigurationError';
  }
}

export interface PancakeSyncConfiguration {
  automaticSyncEnabled: boolean;
  cookie: string | null;
  facebookPageIds: string[];
  intervalMs: number;
  jwt: string | null;
  posShopId: string | null;
  tiktokPageIds: string[];
}

function parseDate(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isFinite(date.getTime()) ? date : null;
}

function asText(value: unknown) {
  return String(value || '').trim();
}

function buildChatLink(pageId: string | null, conversationId: string | null) {
  if (!pageId || !conversationId) return null;
  const id = conversationId.includes('_') ? conversationId : `${pageId}_${conversationId}`;
  return `https://pancake.vn/${pageId}?c_id=${id}`;
}

function pageIdsFromEnv(value: string | undefined) {
  return String(value || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseIntervalMinutes(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_SYNC_INTERVAL_MINUTES) return DEFAULT_SYNC_INTERVAL_MINUTES;
  return parsed;
}

export function getPancakeSyncConfiguration(env: NodeJS.ProcessEnv = process.env): PancakeSyncConfiguration {
  const intervalMinutes = parseIntervalMinutes(env.ACADEMY_PANCAKE_SYNC_INTERVAL_MINUTES);
  return {
    automaticSyncEnabled:
      String(env.ACADEMY_PANCAKE_SYNC_ENABLED || '')
        .trim()
        .toLowerCase() === 'true',
    cookie: env.PANCAKE_COOKIE?.trim() || null,
    facebookPageIds: pageIdsFromEnv(env.ACADEMY_PANCAKE_FACEBOOK_PAGE_IDS),
    intervalMs: intervalMinutes * 60 * 1000,
    jwt: env.PANCAKE_JWT?.trim() || null,
    posShopId: env.ACADEMY_PANCAKE_POS_SHOP_ID?.trim() || null,
    tiktokPageIds: pageIdsFromEnv(env.ACADEMY_PANCAKE_TIKTOK_PAGE_IDS),
  };
}

export function pancakeConfigurationError(config: PancakeSyncConfiguration) {
  const missing: string[] = [];
  if (!config.jwt) missing.push('PANCAKE_JWT');
  if (!config.posShopId) missing.push('ACADEMY_PANCAKE_POS_SHOP_ID');
  if (config.facebookPageIds.length === 0) missing.push('ACADEMY_PANCAKE_FACEBOOK_PAGE_IDS');
  if (config.tiktokPageIds.length === 0) missing.push('ACADEMY_PANCAKE_TIKTOK_PAGE_IDS');
  return missing.length ? `Thiếu cấu hình Pancake Academy: ${missing.join(', ')}.` : null;
}

export class PancakeAcademySyncService {
  static isConfigured() {
    return pancakeConfigurationError(getPancakeSyncConfiguration()) === null;
  }

  private static headers(config: PancakeSyncConfiguration) {
    if (!config.jwt) throw new PancakeSyncConfigurationError('Thiếu PANCAKE_JWT trên server.');
    return {
      Authorization: `Bearer ${config.jwt}`,
      Accept: 'application/json',
      Origin: 'https://pancake.vn',
      Referer: 'https://pancake.vn/',
      'User-Agent': 'mos-lab Academy sync',
      ...(config.cookie ? { Cookie: config.cookie } : {}),
    };
  }

  static async sync(fastify: FastifyInstance): Promise<PancakeSyncReport> {
    const config = getPancakeSyncConfiguration();
    const configurationError = pancakeConfigurationError(config);
    if (configurationError) throw new PancakeSyncConfigurationError(configurationError);
    const report: PancakeSyncReport = { enabled: true, created: 0, updated: 0, skipped: 0, errors: 0 };

    const lockRows = await fastify.prisma.crm.$queryRawUnsafe<Array<{ acquired: number }>>(
      'SELECT GET_LOCK(?, 0) AS acquired',
      SYNC_LOCK
    );
    if (!lockRows[0]?.acquired) {
      report.skipped += 1;
      return report;
    }
    try {
      const rows = await this.fetchAcademyLeads(config);
      for (const row of rows) {
        try {
          const result = await this.upsertLead(fastify, row);
          report[result] += 1;
        } catch (error) {
          report.errors += 1;
          fastify.log.warn(error, `Pancake Academy sync skipped ${row.pancakeId}`);
        }
      }
      return report;
    } finally {
      await fastify.prisma.crm.$queryRawUnsafe('SELECT RELEASE_LOCK(?)', SYNC_LOCK).catch(() => undefined);
    }
  }

  private static async fetchAcademyLeads(config: PancakeSyncConfiguration): Promise<PancakeLead[]> {
    const [customers, conversations] = await Promise.all([
      this.fetchPosCustomers(config),
      this.fetchInboxConversations(config),
    ]);
    const rows = [...customers, ...conversations];
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = row.facebookPsid || row.pancakeId || normalizeAcademyPhone(row.phone) || row.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private static async fetchPosCustomers(config: PancakeSyncConfiguration): Promise<PancakeLead[]> {
    const rows: PancakeLead[] = [];
    for (let page = 1; ; page += 1) {
      const response = await axios.get(`https://pos.pancake.vn/api/v1/shops/${config.posShopId}/customers`, {
        params: { page, limit: 50 },
        headers: this.headers(config),
        timeout: 30000,
      });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      for (const customer of data) {
        const phoneNumbers = Array.isArray(customer.phone_numbers) ? customer.phone_numbers : [];
        const pancakeId = asText(customer.id);
        if (!pancakeId) continue;
        const psid = asText(customer.psid || customer.fb_id) || null;
        const pageId = asText(customer.page_id || customer.shop_customer?.page_id) || null;
        rows.push({
          pancakeId,
          facebookPsid: psid,
          pageId,
          name: asText(customer.name) || 'Không rõ tên',
          phone: phoneNumbers[0] ? String(phoneNumbers[0]) : null,
          source: 'Pancake Academy',
          facebookChatLink: buildChatLink(pageId, psid),
          sourceNote: 'Khách từ Pancake Academy POS.',
          sourceCreatedAt: parseDate(customer.shop_customer?.inserted_at),
        });
      }
      const totalPages = Number(response.data?.total_pages || 1);
      if (!data.length || page >= totalPages) return rows;
    }
  }

  private static async fetchInboxConversations(config: PancakeSyncConfiguration): Promise<PancakeLead[]> {
    if (!config.jwt) return [];
    const rows: PancakeLead[] = [];
    const inboxes = [
      ...config.facebookPageIds.map((pageId) => ({
        pageId,
        source: 'Pancake Academy Facebook',
      })),
      ...config.tiktokPageIds.map((pageId) => ({
        pageId,
        source: 'Pancake Academy TikTok',
      })),
    ];
    for (const { pageId, source } of inboxes) {
      let offset = 0;
      const seenPageIds = new Set<string>();
      for (;;) {
        const response = await axios.get(`https://pancake.vn/api/v1/pages/${pageId}/conversations`, {
          params: { access_token: config.jwt, current_count: offset },
          headers: this.headers(config),
          timeout: 30000,
        });
        const conversations = Array.isArray(response.data?.conversations) ? response.data.conversations : [];
        const unseen = conversations.filter((item: { id?: unknown }) => {
          const id = asText(item.id);
          if (!id || seenPageIds.has(id)) return false;
          seenPageIds.add(id);
          return true;
        });
        if (!unseen.length) break;
        for (const conversation of unseen) {
          const id = asText(conversation.id);
          const customer = Array.isArray(conversation.customers) ? conversation.customers[0] : null;
          const phoneEntry = Array.isArray(conversation.recent_phone_numbers)
            ? conversation.recent_phone_numbers.find((item: unknown) => Boolean(item))
            : null;
          const phone =
            typeof phoneEntry === 'object'
              ? asText((phoneEntry as { phone_number?: unknown }).phone_number)
              : asText(phoneEntry);
          const psid =
            asText(conversation.from_psid || conversation.psid || conversation.fb_id || id.split('_').pop()) || null;
          rows.push({
            pancakeId: id,
            facebookPsid: psid,
            pageId,
            name: asText(customer?.name || conversation.from?.name) || 'Không rõ tên',
            phone: phone || null,
            source,
            facebookChatLink: buildChatLink(pageId, id),
            sourceNote: asText(conversation.snippet).slice(0, 500) || 'Khách nhắn tin quan tâm qua Pancake Academy.',
            sourceCreatedAt: parseDate(conversation.updated_at),
          });
        }
        offset += conversations.length;
        if (conversations.length < 20) break;
      }
    }
    return rows;
  }

  private static async upsertLead(
    fastify: FastifyInstance,
    row: PancakeLead
  ): Promise<'created' | 'updated' | 'skipped'> {
    const phoneNormalized = normalizeAcademyPhone(row.phone);
    const find = (where: Record<string, unknown>) => fastify.prisma.crm.crmAcademyLead.findFirst({ where });
    const existing =
      (await find({ pancakeId: row.pancakeId })) ||
      (await find({ externalKey: `pancake:${row.pancakeId}` })) ||
      (row.facebookPsid ? await find({ facebookPsid: row.facebookPsid }) : null) ||
      (phoneNormalized ? await find({ phoneNormalized }) : null);
    const sourceData = {
      sourceSystem: 'PANCAKE',
      source: row.source,
      pancakeId: row.pancakeId,
      facebookPsid: row.facebookPsid,
      pageId: row.pageId,
      facebookChatLink: row.facebookChatLink,
      name: row.name,
      phone: row.phone,
      phoneNormalized,
      sourceCreatedAt: row.sourceCreatedAt,
    };
    if (existing) {
      await fastify.prisma.crm.crmAcademyLead.update({
        where: { id: existing.id },
        data: {
          ...sourceData,
          searchText: buildAcademyLeadSearchText({
            name: row.name,
            phone: row.phone,
            email: existing.email,
            source: row.source,
            course: existing.course,
            goal: existing.goal,
            note: existing.note,
          }),
        },
      });
      return 'updated';
    }
    await fastify.prisma.crm.crmAcademyLead.create({
      data: {
        ...sourceData,
        searchText: buildAcademyLeadSearchText({
          name: row.name,
          phone: row.phone,
          source: row.source,
          note: row.sourceNote,
        }),
        externalKey: `pancake:${row.pancakeId}`,
        note: row.sourceNote,
        status: 'NEW',
        activities: {
          create: {
            activityType: 'IMPORT',
            content: 'Đồng bộ lead mới từ Pancake Academy.',
            metadata: JSON.stringify({ pancakeId: row.pancakeId, pageId: row.pageId }),
            occurredAt: row.sourceCreatedAt || new Date(),
          },
        },
      },
    });
    return 'created';
  }
}

export function startPancakeAcademySync(fastify: FastifyInstance) {
  const config = getPancakeSyncConfiguration();
  const configurationError = pancakeConfigurationError(config);
  if (configurationError) {
    fastify.log.info(`Pancake Academy sync disabled: ${configurationError}`);
    return;
  }
  if (!config.automaticSyncEnabled) {
    fastify.log.info('Pancake Academy scheduler disabled: set ACADEMY_PANCAKE_SYNC_ENABLED=true to activate it.');
    return;
  }
  const run = async () => {
    try {
      const result = await PancakeAcademySyncService.sync(fastify);
      fastify.log.info(result, 'Pancake Academy sync completed.');
    } catch (error) {
      fastify.log.error(error, 'Pancake Academy sync failed.');
    }
  };
  const initialTimer = setTimeout(run, 10000);
  initialTimer.unref();
  const interval = setInterval(run, config.intervalMs);
  interval.unref();
  fastify.addHook('onClose', async () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
  });
  fastify.log.info({ intervalMinutes: config.intervalMs / 60 / 1000 }, 'Pancake Academy scheduler enabled.');
}
