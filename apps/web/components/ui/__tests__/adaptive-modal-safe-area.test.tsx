import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AdaptiveModal, resolveAdaptiveModalConfig } from '../AdaptiveOverlay';
import * as responsiveHook from '../../../hooks/useResponsiveTier';

describe('AdaptiveModal Safe Area & PWA Mobile Support', () => {
  it('correctly computes safe-area padding and fullscreen modal styling for mobile form/data modals', () => {
    const config = resolveAdaptiveModalConfig({
      tier: 'mobile',
      intent: 'form',
    });

    expect(config.isMobile).toBe(true);
    expect(config.isFullscreenMobile).toBe(true);
    expect(config.className).toContain('adaptive-overlay-mobile-fullscreen');
    expect(config.width).toBe('calc(100vw - 16px)');
    expect(config.style?.height).toBe('100dvh');
    expect(config.style?.margin).toBe('0 auto');

    const contentStyles = config.styles?.content;
    expect(contentStyles?.paddingTop).toBe('max(16px, calc(env(safe-area-inset-top, 0px) + 8px))');
    expect(contentStyles?.paddingBottom).toBe('max(16px, calc(env(safe-area-inset-bottom, 0px) + 8px))');
    expect(contentStyles?.paddingLeft).toBe('max(16px, env(safe-area-inset-left, 0px))');
    expect(contentStyles?.paddingRight).toBe('max(16px, env(safe-area-inset-right, 0px))');
    expect(contentStyles?.display).toBe('flex');
    expect(contentStyles?.flexDirection).toBe('column');

    const headerStyles = config.styles?.header;
    expect(headerStyles?.paddingRight).toBe(48);

    const bodyStyles = config.styles?.body;
    expect(bodyStyles?.flex).toBe('1 1 auto');
    expect(bodyStyles?.overflowY).toBe('auto');
  });

  it('keeps confirmation modals non-fullscreen on mobile viewports', () => {
    const config = resolveAdaptiveModalConfig({
      tier: 'mobile',
      intent: 'confirm',
    });

    expect(config.isMobile).toBe(true);
    expect(config.isFullscreenMobile).toBe(false);
    expect(config.className).not.toContain('adaptive-overlay-mobile-fullscreen');
  });

  it('preserves desktop styling when responsive tier is desktop', () => {
    const config = resolveAdaptiveModalConfig({
      tier: 'desktop',
      intent: 'form',
    });

    expect(config.isMobile).toBe(false);
    expect(config.isFullscreenMobile).toBe(false);
    expect(config.className).not.toContain('adaptive-overlay-mobile-fullscreen');
    expect(config.width).toBe(720);
  });

  it('renders without runtime errors in DOM on mobile', () => {
    vi.spyOn(responsiveHook, 'useResponsiveTier').mockReturnValue('mobile');

    const { baseElement } = render(
      <AdaptiveModal
        open={true}
        intent="form"
        title="Phản hồi mOS"
      >
        <div>Modal Body Content</div>
      </AdaptiveModal>
    );

    const modal = baseElement.querySelector('.ant-modal');
    expect(modal).not.toBeNull();
    expect(modal?.classList.contains('adaptive-overlay')).toBe(true);
    expect(modal?.classList.contains('adaptive-overlay-mobile-fullscreen')).toBe(true);
  });
});
