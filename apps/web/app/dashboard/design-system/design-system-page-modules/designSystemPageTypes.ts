import type { StatusType } from '~/components/ui';
import type { themeTokens } from '@mos-lab/shared';

export interface ResponsiveDemoRecord {
  key: string;
  customer: string;
  status: string;
  nextAction: string;
}

export interface DesignSystemUser {
  role?: string | null;
  username?: string | null;
  email?: string | null;
  displayName?: string | null;
}

export interface CatalogAuditStats {
  totalCount: number;
  foundationCount: number;
  migratingCount: number;
  foundationPercent: number;
}

export interface CatalogCategoryBadgeInfo {
  status: StatusType;
  label: string;
}

export interface TokenSwatchSpec {
  key: 'primary' | 'info' | 'success' | 'error';
  title: string;
  className: string;
}

export interface BreakpointDisplaySpec {
  key: keyof typeof themeTokens.breakpoints;
  label: string;
  iconKey: 'phone' | 'ipad' | 'laptop' | 'desktop' | 'fourK';
  iconColorClass: string;
}

export interface DensityDisplaySpec {
  title: string;
  description: string;
}
