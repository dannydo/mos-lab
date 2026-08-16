/**
 * Product QA viewports for the mos-lab responsive programme.
 *
 * These are deterministic screenshot presets, not CSS breakpoint values.
 * The iPhone 12 portrait viewport is the minimum supported product viewport.
 */
export const RESPONSIVE_VIEWPORTS = [
  {
    id: 'iphone-12-portrait',
    label: 'iPhone 12 portrait',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'iphone-12-landscape',
    label: 'iPhone 12 landscape',
    width: 844,
    height: 390,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'ipad-portrait',
    label: 'iPad portrait',
    width: 768,
    height: 1024,
    isMobile: false,
    hasTouch: true,
  },
  {
    id: 'ipad-landscape',
    label: 'iPad landscape',
    width: 1024,
    height: 768,
    isMobile: false,
    hasTouch: true,
  },
  {
    id: 'desktop',
    label: 'Desktop',
    width: 1440,
    height: 900,
    isMobile: false,
    hasTouch: false,
  },
  {
    id: 'fhd',
    label: 'FHD',
    width: 1920,
    height: 1080,
    isMobile: false,
    hasTouch: false,
  },
  {
    id: '4k',
    label: '4K UHD',
    width: 3840,
    height: 2160,
    isMobile: false,
    hasTouch: false,
  },
];

/**
 * WCAG Reflow stress presets are intentionally opt-in. They are not product
 * breakpoints and must not silently expand the primary screenshot matrix.
 */
export const RESPONSIVE_ACCESSIBILITY_VIEWPORTS = [
  {
    id: 'reflow-320',
    label: 'WCAG Reflow 320 CSS px',
    width: 320,
    height: 720,
    isMobile: true,
    hasTouch: true,
    isAccessibilityStress: true,
  },
];

export const RESPONSIVE_THEMES = ['dark', 'light'];
