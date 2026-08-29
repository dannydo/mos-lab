import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { CrmUiExperienceActivation, Prisma } from '../../generated/crm-client/index.js';
import {
  MARKETING_EXPERIENCE_MANIFESTS,
  SEASONAL_ACCENT_PRESETS,
  UI_EXPERIENCE_EVENT_TYPES,
  UI_EXPERIENCE_LIFECYCLES,
  UI_EXPERIENCE_SURFACES,
  findMarketingExperienceManifest,
  findSeasonalAccentPreset,
  type CreateUiExperienceRequest,
  type ReviseUiExperienceRequest,
  type UiExperienceActivation,
  type UiExperienceEventRequest,
  type UiExperienceLifecycle,
  type UiExperienceListResponse,
  type UiExperienceRuntimeState,
  type UiExperienceSurface,
  type UiExperienceWriteRequest,
} from '@mos-lab/shared';

type CrmClient = FastifyInstance['prisma']['crm'];
type TransactionClient = Prisma.TransactionClient;

export class UiExperienceError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'UiExperienceError';
  }
}

export interface UiExperienceActor {
  id: number;
}

interface NormalizedActivationInput {
  surface: UiExperienceSurface;
  routeScope: string;
  experienceKey: string | null;
  experienceVersion: string | null;
  accentPresetKey: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  trackingKey: string | null;
}

export function resolveUiExperienceRuntimeState(
  lifecycle: UiExperienceLifecycle,
  startsAt: Date | null,
  endsAt: Date | null,
  now = new Date()
): UiExperienceRuntimeState {
  if (lifecycle !== 'PUBLISHED') return lifecycle;
  if (startsAt && startsAt.getTime() > now.getTime()) return 'SCHEDULED';
  if (endsAt && endsAt.getTime() <= now.getTime()) return 'ENDED';
  return 'ACTIVE';
}

export function routeMatchesScope(route: string, routeScope: string): boolean {
  if (route === routeScope) return true;
  if (routeScope === '/') return route.startsWith('/');
  return route.startsWith(`${routeScope}/`);
}

export function activationIntervalsOverlap(
  first: { startsAt: Date | null; endsAt: Date | null },
  second: { startsAt: Date | null; endsAt: Date | null }
): boolean {
  const firstStart = first.startsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const firstEnd = first.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondStart = second.startsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const secondEnd = second.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function isAllowedMarketingCtaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'tel:';
  } catch {
    return false;
  }
}

function normalizeRoute(value: unknown, fieldLabel: string): string {
  const route = String(value || '').trim();
  if (!route.startsWith('/') || route.includes('?') || route.includes('#') || route.length > 255) {
    throw new UiExperienceError(`${fieldLabel} phải là pathname hợp lệ bắt đầu bằng "/".`);
  }
  return route.length > 1 ? route.replace(/\/+$/, '') : route;
}

function optionalText(value: unknown, maxLength: number): string | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new UiExperienceError(`Giá trị vượt quá ${maxLength} ký tự.`);
  return normalized;
}

function optionalDate(value: unknown, label: string): Date | null {
  if (value == null || value === '') return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new UiExperienceError(`${label} không hợp lệ.`);
  return parsed;
}

export function normalizeUiExperienceInput(payload: UiExperienceWriteRequest): NormalizedActivationInput {
  if (!UI_EXPERIENCE_SURFACES.includes(payload?.surface)) {
    throw new UiExperienceError('Surface UI không hợp lệ.');
  }

  const routeScope = normalizeRoute(payload.routeScope, 'Route scope');
  const startsAt = optionalDate(payload.startsAt, 'Thời điểm bắt đầu');
  const endsAt = optionalDate(payload.endsAt, 'Thời điểm kết thúc');
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new UiExperienceError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
  }

  const experienceKey = optionalText(payload.experienceKey, 80);
  const experienceVersion = optionalText(payload.experienceVersion, 30);
  const accentPresetKey = optionalText(payload.accentPresetKey, 80);
  const ctaLabel = optionalText(payload.ctaLabel, 100);
  const ctaUrl = optionalText(payload.ctaUrl, 600);
  const trackingKey = optionalText(payload.trackingKey, 100);

  if (trackingKey && !/^[a-z0-9][a-z0-9._-]*$/i.test(trackingKey)) {
    throw new UiExperienceError('Tracking key chỉ được chứa chữ, số, dấu chấm, gạch ngang và gạch dưới.');
  }

  if (payload.surface === 'PUBLIC_LANDING') {
    const manifest = findMarketingExperienceManifest(experienceKey, experienceVersion);
    if (!manifest) throw new UiExperienceError('Landing manifest hoặc version chưa được deploy.', 422);
    if (routeScope !== `/campaigns/${manifest.slug}`) {
      throw new UiExperienceError(`Route của manifest này phải là /campaigns/${manifest.slug}.`);
    }
    if (!ctaLabel || !ctaUrl || !trackingKey) {
      throw new UiExperienceError('Landing public cần CTA label, CTA URL và tracking key.');
    }
    if (!isAllowedMarketingCtaUrl(ctaUrl)) {
      throw new UiExperienceError('CTA chỉ chấp nhận URL https: hoặc tel:.');
    }
  } else {
    if (!routeScope.startsWith('/dashboard')) {
      throw new UiExperienceError('Seasonal accent chỉ được áp dụng trong /dashboard.');
    }
    if (!findSeasonalAccentPreset(accentPresetKey)) {
      throw new UiExperienceError('Seasonal accent preset chưa được deploy.', 422);
    }
  }

  if (accentPresetKey && !findSeasonalAccentPreset(accentPresetKey)) {
    throw new UiExperienceError('Seasonal accent preset chưa được deploy.', 422);
  }

  return {
    surface: payload.surface,
    routeScope,
    experienceKey: payload.surface === 'PUBLIC_LANDING' ? experienceKey : null,
    experienceVersion: payload.surface === 'PUBLIC_LANDING' ? experienceVersion : null,
    accentPresetKey,
    startsAt,
    endsAt,
    ctaLabel: payload.surface === 'PUBLIC_LANDING' ? ctaLabel : null,
    ctaUrl: payload.surface === 'PUBLIC_LANDING' ? ctaUrl : null,
    trackingKey: payload.surface === 'PUBLIC_LANDING' ? trackingKey : null,
  };
}

function toDto(
  row: CrmUiExperienceActivation,
  now = new Date(),
  metrics?: { views: number; ctaClicks: number }
): UiExperienceActivation {
  return {
    id: row.id,
    seriesKey: row.seriesKey,
    revision: row.revision,
    supersedesId: row.supersedesId,
    surface: row.surface as UiExperienceSurface,
    routeScope: row.routeScope,
    experienceKey: row.experienceKey,
    experienceVersion: row.experienceVersion,
    accentPresetKey: row.accentPresetKey,
    lifecycle: row.lifecycle as UiExperienceLifecycle,
    runtimeState: resolveUiExperienceRuntimeState(
      row.lifecycle as UiExperienceLifecycle,
      row.startsAt,
      row.endsAt,
      now
    ),
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    trackingKey: row.trackingKey,
    createdByStaffId: row.createdByStaffId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(metrics ? { metrics } : {}),
  };
}

function serializeAudit(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? Number(item) : item));
}

async function appendAudit(
  prisma: TransactionClient,
  activation: CrmUiExperienceActivation,
  actorStaffId: number | null,
  action: string,
  before: unknown,
  after: unknown
) {
  await prisma.crmUiExperienceAudit.create({
    data: {
      activationId: activation.id,
      seriesKey: activation.seriesKey,
      action,
      actorStaffId,
      beforeJson: before == null ? null : serializeAudit(before),
      afterJson: after == null ? null : serializeAudit(after),
    },
  });
}

async function ensureNoScheduleConflict(
  prisma: CrmClient | TransactionClient,
  candidate: Pick<NormalizedActivationInput, 'surface' | 'routeScope' | 'startsAt' | 'endsAt'>,
  excludedSeriesKey?: string
) {
  const published = await prisma.crmUiExperienceActivation.findMany({
    where: {
      surface: candidate.surface,
      routeScope: candidate.routeScope,
      lifecycle: 'PUBLISHED',
      ...(excludedSeriesKey ? { seriesKey: { not: excludedSeriesKey } } : {}),
    },
  });
  if (published.some((row) => activationIntervalsOverlap(candidate, row))) {
    throw new UiExperienceError('Lịch kích hoạt bị trùng trên cùng surface và route.', 409);
  }
}

function currentRevisionOrThrow(rows: CrmUiExperienceActivation[], requestedId: number): CrmUiExperienceActivation {
  const current = rows.sort((a, b) => b.revision - a.revision)[0];
  if (!current || current.id !== requestedId) {
    throw new UiExperienceError('Chỉ revision mới nhất mới có thể được thay đổi.', 409);
  }
  return current;
}

export class UiExperienceService {
  static async list(fastify: FastifyInstance): Promise<UiExperienceListResponse> {
    const [rows, groupedMetrics, audits] = await Promise.all([
      fastify.prisma.crm.crmUiExperienceActivation.findMany({
        orderBy: [{ createdAt: 'desc' }, { revision: 'desc' }],
      }),
      fastify.prisma.crm.crmUiExperienceMetric.groupBy({
        by: ['activationId', 'eventType'],
        _sum: { eventCount: true },
      }),
      fastify.prisma.crm.crmUiExperienceAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    const metricsByActivation = new Map<number, { views: number; ctaClicks: number }>();
    groupedMetrics.forEach((metric) => {
      const current = metricsByActivation.get(metric.activationId) ?? { views: 0, ctaClicks: 0 };
      if (metric.eventType === 'VIEW') current.views = metric._sum.eventCount ?? 0;
      if (metric.eventType === 'CTA_CLICK') current.ctaClicks = metric._sum.eventCount ?? 0;
      metricsByActivation.set(metric.activationId, current);
    });
    const now = new Date();
    return {
      data: rows.map((row) => toDto(row, now, metricsByActivation.get(row.id) ?? { views: 0, ctaClicks: 0 })),
      audits: audits.map((audit) => ({
        id: audit.id,
        activationId: audit.activationId,
        seriesKey: audit.seriesKey,
        action: audit.action,
        actorStaffId: audit.actorStaffId,
        createdAt: audit.createdAt.toISOString(),
      })),
      manifests: [...MARKETING_EXPERIENCE_MANIFESTS],
      accentPresets: [...SEASONAL_ACCENT_PRESETS],
    };
  }

  static async create(
    fastify: FastifyInstance,
    actor: UiExperienceActor,
    payload: CreateUiExperienceRequest
  ): Promise<UiExperienceActivation> {
    const input = normalizeUiExperienceInput(payload);
    const lifecycle = payload.lifecycle ?? 'DRAFT';
    if (!['DRAFT', 'PUBLISHED'].includes(lifecycle)) throw new UiExperienceError('Lifecycle khởi tạo không hợp lệ.');

    const created = await fastify.prisma.crm.$transaction(async (tx) => {
      if (lifecycle === 'PUBLISHED') await ensureNoScheduleConflict(tx, input);
      const row = await tx.crmUiExperienceActivation.create({
        data: {
          ...input,
          seriesKey: randomUUID(),
          revision: 1,
          lifecycle,
          createdByStaffId: actor.id,
        },
      });
      await appendAudit(tx, row, actor.id, 'CREATE', null, row);
      return row;
    });
    return toDto(created);
  }

  static async revise(
    fastify: FastifyInstance,
    actor: UiExperienceActor,
    activationId: number,
    payload: ReviseUiExperienceRequest
  ): Promise<UiExperienceActivation> {
    const input = normalizeUiExperienceInput(payload);
    const created = await fastify.prisma.crm.$transaction(async (tx) => {
      const requested = await tx.crmUiExperienceActivation.findUnique({ where: { id: activationId } });
      if (!requested) throw new UiExperienceError('Không tìm thấy activation.', 404);
      const revisions = await tx.crmUiExperienceActivation.findMany({ where: { seriesKey: requested.seriesKey } });
      const current = currentRevisionOrThrow(revisions, activationId);
      await tx.crmUiExperienceActivation.update({ where: { id: current.id }, data: { lifecycle: 'ARCHIVED' } });
      const row = await tx.crmUiExperienceActivation.create({
        data: {
          ...input,
          seriesKey: current.seriesKey,
          revision: current.revision + 1,
          supersedesId: current.id,
          lifecycle: 'DRAFT',
          createdByStaffId: actor.id,
        },
      });
      await appendAudit(tx, row, actor.id, 'REVISE', current, row);
      return row;
    });
    return toDto(created);
  }

  static async setLifecycle(
    fastify: FastifyInstance,
    actor: UiExperienceActor,
    activationId: number,
    lifecycle: UiExperienceLifecycle
  ): Promise<UiExperienceActivation> {
    if (!UI_EXPERIENCE_LIFECYCLES.includes(lifecycle)) throw new UiExperienceError('Lifecycle không hợp lệ.');
    const updated = await fastify.prisma.crm.$transaction(async (tx) => {
      const requested = await tx.crmUiExperienceActivation.findUnique({ where: { id: activationId } });
      if (!requested) throw new UiExperienceError('Không tìm thấy activation.', 404);
      const revisions = await tx.crmUiExperienceActivation.findMany({ where: { seriesKey: requested.seriesKey } });
      const current = currentRevisionOrThrow(revisions, activationId);
      if (lifecycle === 'PUBLISHED') {
        await ensureNoScheduleConflict(
          tx,
          {
            surface: current.surface as UiExperienceSurface,
            routeScope: current.routeScope,
            startsAt: current.startsAt,
            endsAt: current.endsAt,
          },
          current.seriesKey
        );
      }
      const row = await tx.crmUiExperienceActivation.update({ where: { id: current.id }, data: { lifecycle } });
      await appendAudit(tx, row, actor.id, `SET_${lifecycle}`, current, row);
      return row;
    });
    return toDto(updated);
  }

  static async rollback(
    fastify: FastifyInstance,
    actor: UiExperienceActor,
    activationId: number,
    revisionId: number
  ): Promise<UiExperienceActivation> {
    const now = new Date();
    const created = await fastify.prisma.crm.$transaction(async (tx) => {
      const requested = await tx.crmUiExperienceActivation.findUnique({ where: { id: activationId } });
      if (!requested) throw new UiExperienceError('Không tìm thấy activation hiện tại.', 404);
      const revisions = await tx.crmUiExperienceActivation.findMany({ where: { seriesKey: requested.seriesKey } });
      const current = currentRevisionOrThrow(revisions, activationId);
      const target = revisions.find((revision) => revision.id === revisionId);
      if (!target || target.id === current.id) throw new UiExperienceError('Revision rollback không hợp lệ.');

      const input = normalizeUiExperienceInput({
        surface: target.surface as UiExperienceSurface,
        routeScope: target.routeScope,
        experienceKey: target.experienceKey,
        experienceVersion: target.experienceVersion,
        accentPresetKey: target.accentPresetKey,
        startsAt: now.toISOString(),
        endsAt: current.endsAt && current.endsAt > now ? current.endsAt.toISOString() : null,
        ctaLabel: target.ctaLabel,
        ctaUrl: target.ctaUrl,
        trackingKey: target.trackingKey,
      });
      await ensureNoScheduleConflict(tx, input, current.seriesKey);
      await tx.crmUiExperienceActivation.update({ where: { id: current.id }, data: { lifecycle: 'ARCHIVED' } });
      const row = await tx.crmUiExperienceActivation.create({
        data: {
          ...input,
          seriesKey: current.seriesKey,
          revision: current.revision + 1,
          supersedesId: current.id,
          lifecycle: 'PUBLISHED',
          createdByStaffId: actor.id,
        },
      });
      await appendAudit(tx, row, actor.id, 'ROLLBACK', current, { rollbackSource: target, result: row });
      return row;
    });
    return toDto(created);
  }

  static async getPreviewActivation(fastify: FastifyInstance, activationId: number) {
    const row = await fastify.prisma.crm.crmUiExperienceActivation.findUnique({ where: { id: activationId } });
    if (!row || row.lifecycle === 'ARCHIVED') throw new UiExperienceError('Draft preview không còn khả dụng.', 404);
    return row;
  }

  static async resolve(
    fastify: FastifyInstance,
    surface: UiExperienceSurface,
    route: string,
    previewActivationId?: number
  ) {
    if (!UI_EXPERIENCE_SURFACES.includes(surface)) throw new UiExperienceError('Surface UI không hợp lệ.');
    const normalizedRoute = normalizeRoute(route, 'Route');
    const now = new Date();

    let row: CrmUiExperienceActivation | null;
    if (previewActivationId) {
      const preview = await this.getPreviewActivation(fastify, previewActivationId);
      if (preview.surface !== surface || !routeMatchesScope(normalizedRoute, preview.routeScope)) {
        throw new UiExperienceError('Preview token không khớp surface hoặc route.', 403);
      }
      row = preview;
    } else {
      const candidates = await fastify.prisma.crm.crmUiExperienceActivation.findMany({
        where: { surface, lifecycle: 'PUBLISHED' },
        orderBy: [{ revision: 'desc' }, { createdAt: 'desc' }],
      });
      row =
        candidates
          .filter(
            (candidate) =>
              routeMatchesScope(normalizedRoute, candidate.routeScope) &&
              resolveUiExperienceRuntimeState('PUBLISHED', candidate.startsAt, candidate.endsAt, now) === 'ACTIVE'
          )
          .sort(
            (first, second) => second.routeScope.length - first.routeScope.length || second.revision - first.revision
          )[0] ?? null;
    }

    const dto = row ? toDto(row, now) : null;
    return {
      data: dto,
      manifest: row ? findMarketingExperienceManifest(row.experienceKey, row.experienceVersion) : null,
      accentPreset: row ? findSeasonalAccentPreset(row.accentPresetKey) : null,
    };
  }

  static async recordEvent(fastify: FastifyInstance, payload: UiExperienceEventRequest): Promise<void> {
    if (!Number.isInteger(payload?.activationId) || payload.activationId <= 0) {
      throw new UiExperienceError('Activation ID không hợp lệ.');
    }
    if (!UI_EXPERIENCE_EVENT_TYPES.includes(payload.eventType)) {
      throw new UiExperienceError('Event type không hợp lệ.');
    }
    const activation = await fastify.prisma.crm.crmUiExperienceActivation.findUnique({
      where: { id: payload.activationId },
    });
    if (
      !activation ||
      resolveUiExperienceRuntimeState(
        activation.lifecycle as UiExperienceLifecycle,
        activation.startsAt,
        activation.endsAt
      ) !== 'ACTIVE'
    ) {
      throw new UiExperienceError('Activation không hoạt động.', 404);
    }

    const ictDateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const metricDate = new Date(`${ictDateKey}T00:00:00.000Z`);
    await fastify.prisma.crm.crmUiExperienceMetric.upsert({
      where: {
        activationId_metricDate_eventType: {
          activationId: activation.id,
          metricDate,
          eventType: payload.eventType,
        },
      },
      update: { eventCount: { increment: 1 } },
      create: { activationId: activation.id, metricDate, eventType: payload.eventType, eventCount: 1 },
    });
  }
}
