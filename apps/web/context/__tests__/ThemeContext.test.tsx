import React from 'react';
import { theme } from 'antd';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResponsiveTier } from '@mos-lab/shared';

let responsiveTier: ResponsiveTier = 'desktop';

vi.mock('../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => responsiveTier,
}));

import { DESKTOP_DENSITY_STORAGE_KEY, ThemeProvider, useTheme } from '../ThemeContext';

function DensityProbe() {
  const { desktopDensity, effectiveDensity, setDesktopDensity } = useTheme();

  return (
    <div>
      <output data-testid="desktop-density">{desktopDensity}</output>
      <output data-testid="effective-density">{effectiveDensity}</output>
      <button type="button" onClick={() => setDesktopDensity('compact')}>
        Compact
      </button>
      <button type="button" onClick={() => setDesktopDensity('comfortable')}>
        Comfortable
      </button>
    </div>
  );
}

function AntDensityProbe() {
  const { token } = theme.useToken();

  return (
    <div>
      <output data-testid="ant-control-height">{token.controlHeight}</output>
      <output data-testid="ant-font-size">{token.fontSize}</output>
    </div>
  );
}

function renderDensityProvider() {
  return render(
    <ThemeProvider>
      <DensityProbe />
      <AntDensityProbe />
    </ThemeProvider>
  );
}

describe('ThemeProvider display density', () => {
  beforeEach(() => {
    responsiveTier = 'desktop';
    window.localStorage.clear();
    delete document.documentElement.dataset.uiDensity;
    delete document.documentElement.dataset.desktopDensity;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to Standard and publishes the root density attributes', async () => {
    renderDensityProvider();

    expect(screen.getByTestId('desktop-density')).toHaveTextContent('standard');
    expect(screen.getByTestId('effective-density')).toHaveTextContent('standard');
    expect(screen.getByTestId('ant-control-height')).toHaveTextContent('36');
    expect(screen.getByTestId('ant-font-size')).toHaveTextContent('14');
    await waitFor(() => expect(document.documentElement.dataset.uiDensity).toBe('standard'));
    expect(document.documentElement.dataset.desktopDensity).toBe('standard');
  });

  it('falls back to Standard when persisted storage is invalid', () => {
    window.localStorage.setItem(DESKTOP_DENSITY_STORAGE_KEY, 'roomy');
    renderDensityProvider();

    expect(screen.getByTestId('desktop-density')).toHaveTextContent('standard');
  });

  it('persists a desktop preference and updates the shared root contract', async () => {
    renderDensityProvider();
    fireEvent.click(screen.getByRole('button', { name: 'Compact' }));

    expect(screen.getByTestId('desktop-density')).toHaveTextContent('compact');
    expect(screen.getByTestId('ant-control-height')).toHaveTextContent('32');
    expect(screen.getByTestId('ant-font-size')).toHaveTextContent('12');
    expect(window.localStorage.getItem(DESKTOP_DENSITY_STORAGE_KEY)).toBe('compact');
    await waitFor(() => expect(document.documentElement.dataset.uiDensity).toBe('compact'));
  });

  it('masks the saved desktop preference on mobile without overwriting it', async () => {
    window.localStorage.setItem(DESKTOP_DENSITY_STORAGE_KEY, 'comfortable');
    responsiveTier = 'mobile';
    const view = renderDensityProvider();

    expect(screen.getByTestId('desktop-density')).toHaveTextContent('comfortable');
    expect(screen.getByTestId('effective-density')).toHaveTextContent('mobileCompact');
    expect(screen.getByTestId('ant-control-height')).toHaveTextContent('44');
    expect(screen.getByTestId('ant-font-size')).toHaveTextContent('14');
    await waitFor(() => expect(document.documentElement.dataset.uiDensity).toBe('mobileCompact'));
    expect(window.localStorage.getItem(DESKTOP_DENSITY_STORAGE_KEY)).toBe('comfortable');

    responsiveTier = 'desktop';
    act(() =>
      view.rerender(
        <ThemeProvider>
          <DensityProbe />
        </ThemeProvider>
      )
    );

    expect(screen.getByTestId('effective-density')).toHaveTextContent('comfortable');
    await waitFor(() => expect(document.documentElement.dataset.uiDensity).toBe('comfortable'));
  });
});
