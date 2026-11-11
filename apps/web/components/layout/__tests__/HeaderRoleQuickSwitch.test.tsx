import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeaderRoleQuickSwitch from '../HeaderRoleQuickSwitch';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useResponsiveTier to return 'desktop'
vi.mock('../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'desktop',
}));

describe('HeaderRoleQuickSwitch', () => {
  it('does not render duplicate "Tư vấn KH" button for CVL on desktop header', () => {
    render(<HeaderRoleQuickSwitch userRole="cv_plus" variant="header-icon" />);

    // 1. Should render the HeaderIconButton for customer-consultation
    const consultIconBtn = document.querySelector('[data-header-action="customer-consultation"]');
    expect(consultIconBtn).not.toBeNull();

    // 2. Should NOT render any quick-link button with text "Tư vấn KH"
    const consultQuickLink = document.querySelector('[data-header-quick-link="consult"]');
    expect(consultQuickLink).toBeNull();
    expect(screen.queryByText('Tư vấn KH')).toBeNull();

    // 3. Should render "Thu nhập" and "Lộ trình" buttons
    expect(screen.getByText('Thu nhập')).toBeDefined();
    expect(screen.getByText('Lộ trình')).toBeDefined();
  });

  it('renders "Thu nhập" and "Lộ trình" for CVLL without duplicate "Tư vấn KH"', () => {
    render(<HeaderRoleQuickSwitch userRole="cv_plus_plus" variant="header-icon" />);

    expect(document.querySelector('[data-header-quick-link="consult"]')).toBeNull();
    expect(screen.queryByText('Tư vấn KH')).toBeNull();
    expect(screen.getByText('Thu nhập')).toBeDefined();
    expect(screen.getByText('Lộ trình')).toBeDefined();
  });
});
