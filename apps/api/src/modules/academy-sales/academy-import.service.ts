import axios from 'axios';
import type { FastifyInstance } from 'fastify';
import { type AcademyImportReport, type SafeAny, removeVietnameseTones } from '@mos-lab/shared';
import {
  buildAcademyLeadSearchText,
  normalizeAcademyPhone,
  normalizeLegacyAcademyStatus,
} from './academy-sales.service.js';

const SOURCE_SYSTEM = 'LEGACY_PORTAL';
const COURSE_LABELS: Record<string, string> = {
  combo: 'Combo đào tạo trọn gói',
  basic: 'Signature Dark Lash Foundation',
  advanced: 'Dark Lash Elite Artistry',
  fan: 'International Volume & Mega Lash',
  design: 'Dark Lash Design & Styling',
};

type ImportOptions = { dryRun?: boolean };

function emptyReport(dryRun: boolean): AcademyImportReport {
  return {
    dryRun,
    leads: { created: 0, updated: 0, skipped: 0, ambiguous: 0 },
    activities: { created: 0, skipped: 0 },
    followUps: { created: 0, skipped: 0 },
    playbooks: { created: 0, updated: 0 },
    courses: { created: 0, updated: 0 },
    ownerEmailsUnmatched: [],
    excludedLeadIds: [],
  };
}

function parseDate(value: unknown): Date | null {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T00:00:00+07:00`);
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function parseSchedule(row: SafeAny): Date | null {
  const date = row.schedule_date || row.schedule;
  const time = row.schedule_time || row.scheduleTime;
  if (!date) return null;
  if (time && /^\d{2}:\d{2}/.test(String(time))) return parseDate(`${date}T${String(time).slice(0, 5)}:00+07:00`);
  return parseDate(date);
}

function isAcademyLead(row: SafeAny) {
  const source = String(row.source || '').toLowerCase();
  if (source.includes('lashes')) return false;
  return (
    source.includes('academy') || Boolean(String(row.course || '').trim()) || Boolean(String(row.goal || '').trim())
  );
}

function isAcademyPlaybook(row: SafeAny) {
  const searchable = removeVietnameseTones(
    [row.title, row.category, row.description, row.content].filter(Boolean).join(' ')
  );
  return /academy|khoa hoc|dao tao|hoc vien|workshop|khao sat tay nghe|talent discovery|hoc phi/.test(searchable);
}

function asArray(value: unknown): SafeAny[] {
  return Array.isArray(value) ? (value as SafeAny[]) : [];
}

function safeJson(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as SafeAny;
    } catch {
      return null;
    }
  }
  return value as SafeAny;
}

export class AcademyImportService {
  private static async findExistingLead(
    fastify: FastifyInstance,
    row: SafeAny,
    normalizedPhone: string | null,
    legacyId: string
  ) {
    const find = (where: SafeAny) => fastify.prisma.crm.crmAcademyLead.findFirst({ where });
    if (row.pancake_id) {
      const match = await find({ pancakeId: String(row.pancake_id) });
      if (match) return match;
    }
    if (row.facebook_psid) {
      const match = await find({ facebookPsid: String(row.facebook_psid) });
      if (match) return match;
    }
    if (normalizedPhone) {
      const match = await find({ phoneNormalized: normalizedPhone });
      if (match) return match;
    }
    return find({ legacyPortalId: legacyId });
  }

  private static get config() {
    const url = process.env.ACADEMY_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.ACADEMY_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('Thiếu ACADEMY_SUPABASE_URL hoặc ACADEMY_SUPABASE_SERVICE_KEY trên server.');
    }
    return { url: url.replace(/\/$/, ''), key };
  }

  private static async fetchAll(table: string, query: string) {
    const { url, key } = this.config;
    const rows: SafeAny[] = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const response = await axios.get<SafeAny[]>(
        `${url}/rest/v1/${table}?${query}&limit=${pageSize}&offset=${offset}`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          timeout: 30000,
        }
      );
      const page = Array.isArray(response.data) ? response.data : [];
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }

  static async run(fastify: FastifyInstance, options: ImportOptions = {}): Promise<AcademyImportReport> {
    const dryRun = options.dryRun !== false;
    const report = emptyReport(dryRun);
    const [legacyLeads, legacyTasks, configRows, staff] = await Promise.all([
      this.fetchAll('leads', 'select=*'),
      this.fetchAll('lead_actions', 'select=*'),
      this.fetchAll('system_configs', 'select=*'),
      fastify.prisma.crm.crmStaff.findMany({
        select: { id: true, email: true, username: true },
        where: { isActive: true },
      }),
    ]);
    const staffByIdentity = new Map<string, number>();
    for (const item of staff) {
      for (const value of [item.email, item.username]) {
        const normalized = String(value || '')
          .trim()
          .toLowerCase();
        if (normalized) staffByIdentity.set(normalized, item.id);
      }
    }
    const ownerEmailsUnmatched = new Set<string>();
    const importedLeadIdByLegacyId = new Map<string, number>();
    const eligibleLegacyLeadIds = new Set<string>();

    for (const row of legacyLeads) {
      const legacyId = String(row.id || '').trim();
      if (!legacyId || !isAcademyLead(row)) {
        if (legacyId) report.excludedLeadIds.push(legacyId);
        continue;
      }
      eligibleLegacyLeadIds.add(legacyId);
      const name = String(row.name || '').trim() || 'Không rõ tên';
      const normalizedPhone = normalizeAcademyPhone(row.phone);
      const ownerEmail =
        String(row.assigned_to || row.assigned_staff || '')
          .trim()
          .toLowerCase() || null;
      const ownerStaffId = ownerEmail ? staffByIdentity.get(ownerEmail) : undefined;
      if (ownerEmail && !ownerStaffId) ownerEmailsUnmatched.add(ownerEmail);
      const existing = await this.findExistingLead(fastify, row, normalizedPhone, legacyId);
      if (existing) {
        importedLeadIdByLegacyId.set(legacyId, existing.id);
        report.leads.updated += 1;
        if (dryRun) this.countLegacyActivities(row, report);
        else await this.importLegacyActivities(fastify, existing.id, row, report);
        continue;
      }
      report.leads.created += 1;
      if (dryRun) {
        this.countLegacyActivities(row, report);
        continue;
      }
      const sourceCreatedAt = parseDate(row.created_at);
      const lead = await fastify.prisma.crm.crmAcademyLead.create({
        data: {
          legacyPortalId: legacyId,
          externalKey: `portal:${legacyId}`,
          sourceSystem: SOURCE_SYSTEM,
          source: String(row.source || 'Manual Import').trim() || 'Manual Import',
          pancakeId: row.pancake_id ? String(row.pancake_id) : null,
          facebookPsid: row.facebook_psid ? String(row.facebook_psid) : null,
          pageId: row.page_id ? String(row.page_id) : null,
          facebookChatLink: row.facebook_chat_link ? String(row.facebook_chat_link) : null,
          avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
          name,
          phone: row.phone ? String(row.phone) : null,
          phoneNormalized: normalizedPhone,
          searchText: buildAcademyLeadSearchText({
            name,
            phone: row.phone,
            email: row.email,
            source: row.source,
            course: row.course,
            goal: row.goal,
            note: row.notes,
          }),
          email: row.email ? String(row.email) : null,
          status: normalizeLegacyAcademyStatus(row.status),
          course: row.course ? String(row.course) : null,
          goal: row.goal ? String(row.goal) : null,
          flightDate: parseDate(row.flight_date || row.flight),
          scheduledAt: parseSchedule(row),
          revenueVnd: Math.max(0, Math.round(Number(row.revenue) || 0)),
          isHot: Boolean(row.is_hot),
          hotMarkedAt: parseDate(row.hot_marked_at) || (row.is_hot ? sourceCreatedAt : null),
          lastContactAt: parseDate(row.updated_at),
          note: row.notes ? String(row.notes) : null,
          ownerStaffId: ownerStaffId || null,
          legacyOwnerEmail: ownerStaffId ? null : ownerEmail,
          sourceCreatedAt,
          createdAt: sourceCreatedAt || new Date(),
          activities: {
            create: {
              activityType: 'IMPORT',
              content: 'Nhập lead từ Ads Portal cũ.',
              metadata: JSON.stringify({ legacyPortalId: legacyId }),
              occurredAt: sourceCreatedAt || new Date(),
            },
          },
        },
      });
      importedLeadIdByLegacyId.set(legacyId, lead.id);
      await this.importLegacyActivities(fastify, lead.id, row, report);
    }

    if (dryRun) {
      for (const row of legacyTasks) {
        if (eligibleLegacyLeadIds.has(String(row.lead_id || ''))) report.followUps.created += 1;
        else report.followUps.skipped += 1;
      }
    } else {
      for (const row of legacyTasks) {
        const legacyTaskId = String(row.id || '').trim();
        const leadId = importedLeadIdByLegacyId.get(String(row.lead_id || ''));
        if (!legacyTaskId || !leadId) {
          report.followUps.skipped += 1;
          continue;
        }
        const existing = await fastify.prisma.crm.crmAcademyFollowUpTask.findUnique({
          where: { legacyPortalId: legacyTaskId },
        });
        if (existing) {
          report.followUps.skipped += 1;
          continue;
        }
        await fastify.prisma.crm.crmAcademyFollowUpTask.create({
          data: {
            legacyPortalId: legacyTaskId,
            leadId,
            content: String(row.action_text || '').trim() || 'Follow-up từ portal cũ',
            dueAt: row.due_date ? parseDate(`${row.due_date}T${row.due_time || '00:00'}:00+07:00`) : null,
            status: String(row.status || '').toLowerCase() === 'done' ? 'DONE' : 'PENDING',
            pancakeLink: row.pancake_link ? String(row.pancake_link) : null,
            completedAt:
              String(row.status || '').toLowerCase() === 'done' ? parseDate(row.updated_at) || new Date() : null,
            createdAt: parseDate(row.created_at) || new Date(),
          },
        });
        report.followUps.created += 1;
      }
    }

    await this.importContent(fastify, configRows, report, dryRun);
    report.ownerEmailsUnmatched = Array.from(ownerEmailsUnmatched).sort();
    return report;
  }

  private static async importLegacyActivities(
    fastify: FastifyInstance,
    leadId: number,
    row: SafeAny,
    report: AcademyImportReport
  ) {
    const activities = this.legacyActivities(row);
    for (const activity of activities) {
      if (!activity.content) {
        report.activities.skipped += 1;
        continue;
      }
      const existing = await fastify.prisma.crm.crmAcademyLeadActivity.findFirst({
        where: { leadId, activityType: activity.type, content: activity.content, occurredAt: activity.occurredAt },
      });
      if (existing) {
        report.activities.skipped += 1;
        continue;
      }
      await fastify.prisma.crm.crmAcademyLeadActivity.create({
        data: { leadId, activityType: activity.type, content: activity.content, occurredAt: activity.occurredAt },
      });
      report.activities.created += 1;
    }
  }

  private static legacyActivities(row: SafeAny) {
    return [
      ...asArray(safeJson(row.follow_ups)).map((item) => ({
        type: 'NOTE',
        content: String(item.text || '').trim(),
        occurredAt: parseDate(item.date) || parseDate(row.created_at) || new Date(),
      })),
      ...asArray(safeJson(row.schedule_history)).map((item) => ({
        type:
          String(item.status || '').toLowerCase() === 'no_show' || String(item.status || '').toLowerCase() === 'noshow'
            ? 'NO_SHOW'
            : 'SCHEDULED',
        content: String(item.status || '')
          .toLowerCase()
          .includes('no')
          ? 'Không đến lịch test.'
          : 'Lịch sử lịch test.',
        occurredAt: parseDate(item.date) || new Date(),
      })),
    ];
  }

  private static countLegacyActivities(row: SafeAny, report: AcademyImportReport) {
    for (const activity of this.legacyActivities(row)) {
      if (activity.content) report.activities.created += 1;
      else report.activities.skipped += 1;
    }
  }

  private static async importContent(
    fastify: FastifyInstance,
    configRows: SafeAny[],
    report: AcademyImportReport,
    dryRun: boolean
  ) {
    const configByKey = new Map(configRows.map((row) => [String(row.key), safeJson(row.value)]));
    const playbooks = asArray(configByKey.get('wings_sales_playbooks'));
    const legacyPlaybooks = playbooks.map((playbook, index) => ({
      playbook,
      legacyPortalId: String(playbook.id || `playbook-${index}`),
      isAcademy: isAcademyPlaybook(playbook),
    }));
    const academyPlaybooks = legacyPlaybooks.filter((item) => item.isAcademy);
    const excludedLegacyPlaybookIds = legacyPlaybooks
      .filter((item) => !item.isAcademy)
      .map((item) => item.legacyPortalId);

    if (!dryRun && excludedLegacyPlaybookIds.length > 0) {
      await fastify.prisma.crm.crmAcademyPlaybook.deleteMany({
        where: { legacyPortalId: { in: excludedLegacyPlaybookIds } },
      });
    }

    for (const [index, item] of academyPlaybooks.entries()) {
      const { playbook, legacyPortalId } = item;
      const existing = await fastify.prisma.crm.crmAcademyPlaybook.findUnique({ where: { legacyPortalId } });
      if (existing) {
        report.playbooks.updated += 1;
        continue;
      }
      report.playbooks.created += 1;
      if (!dryRun) {
        await fastify.prisma.crm.crmAcademyPlaybook.create({
          data: {
            legacyPortalId,
            title: String(playbook.title || 'Playbook không tên'),
            category: String(playbook.category || 'Khác'),
            description: playbook.description ? String(playbook.description) : null,
            content: String(playbook.content || ''),
            sortOrder: index,
          },
        });
      }
    }

    const courseConfig = configByKey.get('wings_course_prices') || {};
    const basePrices = courseConfig.coursePrices || {};
    const promoPrices = courseConfig.promoPrices || courseConfig.coursePromoPrices || {};
    const kits = courseConfig.courseKits || {};
    for (const [index, code] of Object.keys(COURSE_LABELS).entries()) {
      const existing = await fastify.prisma.crm.crmAcademyCourse.findUnique({ where: { code } });
      if (existing) {
        report.courses.updated += 1;
        continue;
      }
      report.courses.created += 1;
      if (!dryRun) {
        const kit = kits[code] || {};
        await fastify.prisma.crm.crmAcademyCourse.create({
          data: {
            code,
            name: COURSE_LABELS[code],
            listPriceVnd: Math.round(Number(basePrices[code]) || 0),
            promoPriceVnd: Math.round(Number(promoPrices[code]) || 0),
            kitName: kit.name ? String(kit.name) : null,
            kitUrl: kit.link ? String(kit.link) : null,
            sortOrder: index,
          },
        });
      }
    }
  }
}
