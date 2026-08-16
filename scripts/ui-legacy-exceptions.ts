export interface LegacyUiException {
  path: string;
  reason: string;
  sunset: string;
  allowedAntdImports?: readonly string[];
  allowAntIcons?: boolean;
}

/**
 * Narrow, expiring exceptions for already-modified legacy screens. New raw UI
 * imports are rejected unless this manifest is intentionally reviewed.
 */
export const LEGACY_UI_EXCEPTIONS: readonly LegacyUiException[] = [
  {
    path: 'app/dashboard/cv/components/CvTipTab.tsx',
    reason: 'The historical Tip detail modal awaits EntityFormDrawer migration.',
    sunset: '2026-12-31',
    allowedAntdImports: ['Modal'],
  },
  {
    path: 'app/dashboard/layout.tsx',
    reason: 'The responsive navigation drawer is being consolidated into the dashboard shell adapter.',
    sunset: '2026-12-31',
    allowedAntdImports: ['Drawer'],
  },
  {
    path: 'app/dashboard/page.tsx',
    reason: 'The operational-home status and legacy icon set migrate with the dashboard-shell wave.',
    sunset: '2026-12-31',
    allowedAntdImports: ['Tag'],
    allowAntIcons: true,
  },
];
