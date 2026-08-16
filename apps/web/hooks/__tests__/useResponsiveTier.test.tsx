import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getResponsiveTier, resolveDensityProfile, themeTokens } from '@mos-lab/shared';
import { getViewportSize, useMediaQuery, useResponsiveTier, useViewportSize } from '../useResponsiveTier';

function setViewport(width: number, height = 900) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

describe('responsive tier contract', () => {
  it('keeps behaviour boundaries distinct from QA viewport presets', () => {
    expect(themeTokens.responsive.viewportPresets.iphone12.width).toBe(390);
    expect(getResponsiveTier(767)).toBe('mobile');
    expect(getResponsiveTier(768)).toBe('tablet');
    expect(getResponsiveTier(844, 390)).toBe('mobile');
    expect(getResponsiveTier(1024, 768)).toBe('tablet');
    expect(getResponsiveTier(1200)).toBe('desktop');
    expect(getResponsiveTier(1600)).toBe('fhd');
    expect(getResponsiveTier(2560)).toBe('wide');
    expect(getResponsiveTier(3200)).toBe('uhd');
  });

  it('keeps desktop density personal while a phone always uses the touch-safe compact profile', () => {
    expect(resolveDensityProfile('compact', 'uhd')).toBe('compact');
    expect(resolveDensityProfile('comfortable', 'desktop')).toBe('comfortable');
    expect(resolveDensityProfile('comfortable', 'mobile')).toBe('mobileCompact');
    expect(resolveDensityProfile('compact', getResponsiveTier(844, 390))).toBe('mobileCompact');
  });

  it('publishes viewport changes through the shared subscription', () => {
    setViewport(390, 844);
    const { result, unmount } = renderHook(() => useResponsiveTier());
    expect(result.current).toBe('mobile');

    act(() => setViewport(1440, 900));
    expect(result.current).toBe('desktop');

    unmount();
  });

  it('shares CSS-pixel viewport geometry without feature-level browser reads', () => {
    setViewport(390, 844);
    const { result, unmount } = renderHook(() => useViewportSize());
    expect(result.current).toEqual({ width: 390, height: 844 });

    act(() => setViewport(1024, 768));
    expect(result.current).toEqual({ width: 1024, height: 768 });
    expect(getViewportSize()).toEqual({ width: 1024, height: 768 });

    unmount();
  });

  it('uses media query listeners and removes them on cleanup', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const addEventListener = vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener)
    );
    const removeEventListener = vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener)
    );
    let matches = false;

    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches,
          media: '(min-width: 1200px)',
          onchange: null,
          addEventListener,
          removeEventListener,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList
    );

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1200px)'));
    expect(result.current).toBe(false);

    matches = true;
    act(() => listeners.forEach((listener) => listener(new Event('change') as MediaQueryListEvent)));
    expect(result.current).toBe(true);

    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });
});
