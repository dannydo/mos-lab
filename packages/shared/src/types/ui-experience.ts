export const UI_EXPERIENCE_SURFACES = ['PUBLIC_LANDING', 'DASHBOARD_ACCENT'] as const;
export type UiExperienceSurface = (typeof UI_EXPERIENCE_SURFACES)[number];

export const UI_EXPERIENCE_LIFECYCLES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const;
export type UiExperienceLifecycle = (typeof UI_EXPERIENCE_LIFECYCLES)[number];

export const UI_EXPERIENCE_RUNTIME_STATES = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'PAUSED', 'ARCHIVED'] as const;
export type UiExperienceRuntimeState = (typeof UI_EXPERIENCE_RUNTIME_STATES)[number];

export const UI_EXPERIENCE_EVENT_TYPES = ['VIEW', 'CTA_CLICK'] as const;
export type UiExperienceEventType = (typeof UI_EXPERIENCE_EVENT_TYPES)[number];

export type MarketingExperienceCapability = 'EXTERNAL_CTA';

export interface MarketingExperienceManifest {
  key: string;
  version: string;
  slug: string;
  label: string;
  functionalContractVersion: string;
  capabilities: MarketingExperienceCapability[];
  seo: {
    title: string;
    description: string;
  };
}

export interface SeasonalAccentModeTokens {
  accent: string;
  accentContrast: string;
  ambientStart: string;
  ambientEnd: string;
  headerGradient: string;
  sidebarGradient: string;
  border: string;
}

export interface SeasonalAccentPreset {
  key: string;
  label: string;
  description: string;
  supportedModes: Array<'light' | 'dark'>;
  modes: {
    light: SeasonalAccentModeTokens;
    dark: SeasonalAccentModeTokens;
  };
}

export const MARKETING_EXPERIENCE_MANIFESTS: readonly MarketingExperienceManifest[] = [
  {
    key: 'independence-day-2026',
    version: '1.0.0',
    slug: 'quoc-khanh-02-09-2026',
    label: 'Quốc khánh 02/09/2026',
    functionalContractVersion: '1.0.0',
    capabilities: ['EXTERNAL_CTA'],
    seo: {
      title: 'Rạng rỡ sắc Việt — Wings Lashes',
      description: 'Chào mừng Quốc khánh 02/09 cùng trải nghiệm làm đẹp được thiết kế riêng tại Wings Lashes.',
    },
  },
] as const;

export const SEASONAL_ACCENT_PRESETS: readonly SeasonalAccentPreset[] = [
  {
    key: 'independence-day-2026',
    label: 'Sắc Việt 02/09',
    description: 'Điểm nhấn đỏ son và vàng ấm dành cho shell; không thay đổi màu trạng thái nghiệp vụ.',
    supportedModes: ['light', 'dark'],
    modes: {
      light: {
        accent: '#b91c1c',
        accentContrast: '#ffffff',
        ambientStart: 'rgba(220, 38, 38, 0.10)',
        ambientEnd: 'rgba(234, 179, 8, 0.06)',
        headerGradient: 'linear-gradient(90deg, rgba(185, 28, 28, 0.10), rgba(234, 179, 8, 0.05))',
        sidebarGradient: 'linear-gradient(180deg, rgba(185, 28, 28, 0.08), transparent 42%)',
        border: 'rgba(185, 28, 28, 0.24)',
      },
      dark: {
        accent: '#facc15',
        accentContrast: '#450a0a',
        ambientStart: 'rgba(220, 38, 38, 0.16)',
        ambientEnd: 'rgba(250, 204, 21, 0.08)',
        headerGradient: 'linear-gradient(90deg, rgba(127, 29, 29, 0.28), rgba(113, 63, 18, 0.12))',
        sidebarGradient: 'linear-gradient(180deg, rgba(127, 29, 29, 0.24), transparent 46%)',
        border: 'rgba(250, 204, 21, 0.22)',
      },
    },
  },
] as const;

export function findMarketingExperienceManifest(
  key: string | null | undefined,
  version?: string | null
): MarketingExperienceManifest | null {
  return (
    MARKETING_EXPERIENCE_MANIFESTS.find(
      (manifest) => manifest.key === key && (version == null || manifest.version === version)
    ) ?? null
  );
}

export function findMarketingExperienceManifestBySlug(slug: string): MarketingExperienceManifest | null {
  return MARKETING_EXPERIENCE_MANIFESTS.find((manifest) => manifest.slug === slug) ?? null;
}

export function findSeasonalAccentPreset(key: string | null | undefined): SeasonalAccentPreset | null {
  return SEASONAL_ACCENT_PRESETS.find((preset) => preset.key === key) ?? null;
}

export interface UiExperienceMetrics {
  views: number;
  ctaClicks: number;
}

export interface UiExperienceAuditEntry {
  id: number;
  activationId: number;
  seriesKey: string;
  action: string;
  actorStaffId: number | null;
  createdAt: string;
}

export interface UiExperienceActivation {
  id: number;
  seriesKey: string;
  revision: number;
  supersedesId: number | null;
  surface: UiExperienceSurface;
  routeScope: string;
  experienceKey: string | null;
  experienceVersion: string | null;
  accentPresetKey: string | null;
  lifecycle: UiExperienceLifecycle;
  runtimeState: UiExperienceRuntimeState;
  startsAt: string | null;
  endsAt: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  trackingKey: string | null;
  createdByStaffId: number | null;
  createdAt: string;
  updatedAt: string;
  metrics?: UiExperienceMetrics;
}

export interface UiExperienceWriteRequest {
  surface: UiExperienceSurface;
  routeScope: string;
  experienceKey?: string | null;
  experienceVersion?: string | null;
  accentPresetKey?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  trackingKey?: string | null;
}

export interface CreateUiExperienceRequest extends UiExperienceWriteRequest {
  lifecycle?: Extract<UiExperienceLifecycle, 'DRAFT' | 'PUBLISHED'>;
}

export type ReviseUiExperienceRequest = UiExperienceWriteRequest;

export interface SetUiExperienceLifecycleRequest {
  lifecycle: UiExperienceLifecycle;
}

export interface RollbackUiExperienceRequest {
  revisionId: number;
}

export interface UiExperienceListResponse {
  data: UiExperienceActivation[];
  audits: UiExperienceAuditEntry[];
  manifests: MarketingExperienceManifest[];
  accentPresets: SeasonalAccentPreset[];
}

export interface UiExperienceResolveParams {
  surface: UiExperienceSurface;
  route: string;
  previewToken?: string;
}

export interface UiExperienceResolveResponse {
  data: UiExperienceActivation | null;
  manifest: MarketingExperienceManifest | null;
  accentPreset: SeasonalAccentPreset | null;
}

export interface UiExperiencePreviewTokenResponse {
  token: string;
  expiresAt: string;
}

export interface UiExperienceEventRequest {
  activationId: number;
  eventType: UiExperienceEventType;
}

export interface UiExperienceEventResponse {
  accepted: true;
}
