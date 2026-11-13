import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../../context/ThemeContext';
import { MobileThemeSheet } from '../MobileThemeSheet';

vi.mock('../../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'mobile',
}));

describe('MobileThemeSheet & MobileThemeSelectorBlock', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeBase;
    delete document.documentElement.dataset.themePreference;
  });

  it('does not render dialog when closed', () => {
    render(
      <ThemeProvider>
        <MobileThemeSheet open={false} onClose={vi.fn()} />
      </ThemeProvider>
    );

    expect(screen.queryByRole('dialog', { name: /Chọn giao diện & tông màu/i })).toBeNull();
  });

  it('switches between Nền Sáng, Nền Tối, Tự động and Core Theme palettes when open', async () => {
    const onClose = vi.fn();
    render(
      <ThemeProvider>
        <MobileThemeSheet open={true} onClose={onClose} />
      </ThemeProvider>
    );

    expect(screen.getByRole('dialog', { name: /Chọn giao diện & tông màu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Nền Sáng/i }));
    await waitFor(() => {
      expect(document.documentElement.dataset.themeBase).toBe('light');
      expect(document.documentElement.dataset.themePreference).toBe('light');
    });

    fireEvent.click(screen.getByRole('button', { name: /Nền Tối/i }));
    await waitFor(() => {
      expect(document.documentElement.dataset.themeBase).toBe('dark');
      expect(document.documentElement.dataset.themePreference).toBe('dark');
    });

    fireEvent.click(screen.getByRole('button', { name: /Tự động/i }));
    await waitFor(() => {
      expect(document.documentElement.dataset.themePreference).toBe('auto');
    });

    const ivoryBtn = screen.getByText(/Warm Ivory/i).closest('button');
    expect(ivoryBtn).not.toBeNull();
    fireEvent.click(ivoryBtn!);
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('ivory');
    });

    fireEvent.click(screen.getByRole('button', { name: /Đóng bảng chọn giao diện/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
