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

function ThemeProbe() {
  const { themeId, themeMode, setCoreThemeId, toggleTheme, availableCoreThemes, saveCustomTheme, canManageThemes } =
    useTheme();

  return (
    <div>
      <output data-testid="theme-id">{themeId}</output>
      <output data-testid="theme-mode">{themeMode}</output>
      <output data-testid="theme-count">{availableCoreThemes.length}</output>
      <output data-testid="can-manage-themes">{String(canManageThemes)}</output>
      <button type="button" onClick={() => setCoreThemeId('ivory')}>
        Set Ivory
      </button>
      <button type="button" onClick={() => setCoreThemeId('midnight')}>
        Set Midnight
      </button>
      <button type="button" onClick={toggleTheme}>
        Toggle Mode
      </button>
      <button
        type="button"
        onClick={() =>
          saveCustomTheme({
            id: 'my-custom',
            label: 'My Custom Theme',
            base: 'light',
            colors: {
              primary: '#ff0055',
              bgLayout: '#fdf0f5',
              bgContainer: '#ffffff',
              borderColor: '#ffccd8',
              textPrimary: '#330011',
              textSecondary: '#661122',
            },
          })
        }
      >
        Save Custom
      </button>
    </div>
  );
}

describe('ThemeProvider multi-theme engine', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeBase;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('provides built-in themes including Warm Ivory and Midnight', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(Number(screen.getByTestId('theme-count').textContent)).toBeGreaterThanOrEqual(5);
    expect(screen.getByTestId('theme-id')).toHaveTextContent('mos');
  });

  it('switches to Warm Ivory, updates dataset and sets light base', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set Ivory' }));

    expect(screen.getByTestId('theme-id')).toHaveTextContent('ivory');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('ivory');
      expect(document.documentElement.dataset.themeBase).toBe('light');
      expect(document.documentElement.style.getPropertyValue('--background')).toBe('#f6f3ee');
      expect(document.documentElement.style.getPropertyValue('--color-gold')).toBe('#9e6e24');
    });
  });

  it('switches to Midnight Royal, updates dataset and sets dark base', async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set Midnight' }));

    expect(screen.getByTestId('theme-id')).toHaveTextContent('midnight');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('midnight');
      expect(document.documentElement.dataset.themeBase).toBe('dark');
      expect(document.documentElement.style.getPropertyValue('--background')).toBe('#070a13');
      expect(document.documentElement.style.getPropertyValue('--color-gold')).toBe('#38bdf8');
    });
  });

  it('allows admins to create and dynamically apply a custom theme', async () => {
    render(
      <ThemeProvider defaultIsAdmin={true}>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('can-manage-themes')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Save Custom' }));

    expect(screen.getByTestId('theme-id')).toHaveTextContent('my-custom');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('my-custom');
      expect(document.documentElement.style.getPropertyValue('--color-gold')).toBe('#ff0055');
    });
  });

  it('restricts non-admin users from creating themes while still allowing theme switching', async () => {
    render(
      <ThemeProvider defaultIsAdmin={false}>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('can-manage-themes')).toHaveTextContent('false');

    // Attempting to save custom theme should be blocked
    fireEvent.click(screen.getByRole('button', { name: 'Save Custom' }));
    expect(screen.getByTestId('theme-id')).toHaveTextContent('mos'); // Stays on default theme

    // But non-admin can freely switch to built-in themes
    fireEvent.click(screen.getByRole('button', { name: 'Set Midnight' }));
    expect(screen.getByTestId('theme-id')).toHaveTextContent('midnight');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
  });
});
