import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IosProfileMenuSheet } from '../IosProfileMenuSheet';
import { ActiveActorProfile } from '../../../state/useIosAppState';

const mockToggleTheme = vi.fn();
const mockSetCoreThemeId = vi.fn();

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeId: 'luxury-gold',
    coreThemeId: 'luxury-gold',
    themeMode: 'dark',
    toggleTheme: mockToggleTheme,
    availableCoreThemes: [
      {
        id: 'luxury-gold',
        label: 'Wings Luxury Gold',
        colors: { primary: '#FFB400' },
      },
      {
        id: 'emerald',
        label: 'Emerald City',
        colors: { primary: '#10B981' },
      },
      {
        id: 'classic-dark',
        label: 'Classic Dark',
        colors: { primary: '#3B82F6' },
      },
    ],
    setCoreThemeId: mockSetCoreThemeId,
  }),
}));

describe('IosProfileMenuSheet Theme & Mode Switching', () => {
  const defaultActor: ActiveActorProfile = {
    staffId: 889,
    name: 'Thảo Ly',
    tier: 'CVL',
    badgeLabel: 'CVL · Chuyên Viên Tự Chủ',
    storeId: 6,
    branchName: 'Chi nhánh Đề Thám',
  };

  it('renders theme mode buttons and switches light/dark mode', () => {
    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CVL" />);

    const lightBtn = screen.getByRole('button', { name: /Nền Sáng/i });
    const darkBtn = screen.getByRole('button', { name: /Nền Tối/i });

    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn).toBeInTheDocument();

    // Currently dark -> clicking light should toggle
    fireEvent.click(lightBtn);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);

    // Currently dark -> clicking dark should not trigger toggle since already dark
    fireEvent.click(darkBtn);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('renders available core themes and triggers theme change', () => {
    render(<IosProfileMenuSheet isOpen={true} onClose={vi.fn()} actor={defaultActor} role="CVL" />);

    expect(screen.getAllByText('Wings Luxury Gold').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Emerald City')).toBeInTheDocument();
    expect(screen.getByText('Classic Dark')).toBeInTheDocument();

    const emeraldBtn = screen.getByText('Emerald City').closest('button');
    expect(emeraldBtn).not.toBeNull();
    fireEvent.click(emeraldBtn!);
    expect(mockSetCoreThemeId).toHaveBeenCalledWith('emerald');
  });
});
