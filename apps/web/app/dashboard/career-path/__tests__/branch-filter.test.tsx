import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CareerStaffSummary } from '@mos-lab/shared';
import {
  buildCareerBranchOptions,
  matchesCareerBranchFilter,
  matchesCareerRoleFilter,
  FALLBACK_CAREER_PROGRESSION_CONFIG,
} from '../career-path.constants';
import { StaffCareerSelector } from '../components/StaffCareerSelector';
import { MobileStaffCareerSheet } from '../components/MobileStaffCareerSheet';

const MOCK_STAFF: CareerStaffSummary[] = [
  {
    id: 1,
    displayName: 'Khanh Cao',
    username: 'cnhk.024',
    role: 'cvl',
    careerRole: 'CV_PLUS',
    ordersCount: 408,
    fixRate: 0,
    totalTip: 5000000,
    tipRatioAboveShop: 0.1,
    staffTipRate: 0.508,
    shopTipRate: 0.45,
    selfComboRate: 0.224,
    happinessIndex: 0.62,
    bananaCount: 22,
    bananaBalance: 1058,
    qaAuditsCount: 0,
    storeId: 6,
    branchName: 'Đề Thám',
    branchCode: 'DT',
  },
  {
    id: 2,
    displayName: 'HânEmBé',
    username: 'vuduong12996',
    role: 'technician',
    careerRole: 'CV',
    ordersCount: 380,
    fixRate: 0,
    totalTip: 4200000,
    tipRatioAboveShop: 0.05,
    staffTipRate: 0.487,
    shopTipRate: 0.44,
    selfComboRate: 0.051,
    happinessIndex: 0.72,
    bananaCount: 24,
    bananaBalance: 600,
    qaAuditsCount: 0,
    storeId: 16,
    branchName: 'Estella Place',
    branchCode: 'EP',
  },
  {
    id: 3,
    displayName: 'Cẩm Tiên',
    username: 'camtienmishi2309',
    role: 'technician',
    careerRole: 'CV',
    ordersCount: 378,
    fixRate: 0,
    totalTip: 3900000,
    tipRatioAboveShop: -0.02,
    staffTipRate: 0.378,
    shopTipRate: 0.44,
    selfComboRate: 0.083,
    happinessIndex: 0.71,
    bananaCount: 30,
    bananaBalance: 500,
    qaAuditsCount: 0,
    storeId: 16,
    branchName: 'Estella Place',
    branchCode: 'EP',
  },
  {
    id: 4,
    displayName: 'Ánh Tuyết',
    username: 'user3832',
    role: 'technician',
    careerRole: 'KTV',
    ordersCount: 298,
    fixRate: 0,
    totalTip: 3200000,
    tipRatioAboveShop: 0.12,
    staffTipRate: 0.56,
    shopTipRate: 0.45,
    selfComboRate: 0.16,
    happinessIndex: 0.71,
    bananaCount: 17,
    bananaBalance: 200,
    qaAuditsCount: 0,
    storeId: 6,
    branchName: 'Đề Thám',
    branchCode: 'DT',
  },
];

describe('Career Path Branch Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('career-path.constants helpers', () => {
    it('builds branch options in priority order with role-scoped counts', () => {
      const allOptions = buildCareerBranchOptions(MOCK_STAFF, 'ALL');
      expect(allOptions).toEqual([
        { key: 'ALL', label: 'Tất cả chi nhánh', count: 4 },
        { key: 'Đề Thám', label: 'Đề Thám', count: 2 },
        { key: 'Estella Place', label: 'Estella Place', count: 2 },
      ]);

      const cvOptions = buildCareerBranchOptions(MOCK_STAFF, 'CV');
      expect(cvOptions).toEqual([
        { key: 'ALL', label: 'Tất cả chi nhánh', count: 2 },
        { key: 'Đề Thám', label: 'Đề Thám', count: 0 },
        { key: 'Estella Place', label: 'Estella Place', count: 2 },
      ]);
    });

    it('matches role and branch filters accurately', () => {
      expect(matchesCareerRoleFilter(MOCK_STAFF[0], 'CV_PLUS')).toBe(true);
      expect(matchesCareerRoleFilter(MOCK_STAFF[0], 'CV')).toBe(false);
      expect(matchesCareerBranchFilter(MOCK_STAFF[0], 'Đề Thám')).toBe(true);
      expect(matchesCareerBranchFilter(MOCK_STAFF[0], 'Estella Place')).toBe(false);
      expect(matchesCareerBranchFilter(MOCK_STAFF[0], 'ALL')).toBe(true);
    });
  });

  describe('StaffCareerSelector', () => {
    it('filters staff by branch in table mode and combines with role filter', () => {
      render(
        <StaffCareerSelector
          staffList={MOCK_STAFF}
          selectedStaffId={1}
          onSelectStaff={vi.fn()}
          onSyncProd={vi.fn().mockResolvedValue(undefined)}
          syncing={false}
          selectorMode="table"
          config={FALLBACK_CAREER_PROGRESSION_CONFIG}
        />
      );

      expect(screen.getByText('4 CV')).toBeInTheDocument();
      expect(screen.getByTestId('branch-filter-ALL')).toBeInTheDocument();
      expect(screen.getByTestId('branch-filter-Đề Thám')).toBeInTheDocument();
      expect(screen.getByTestId('branch-filter-Estella Place')).toBeInTheDocument();

      // Filter to Estella Place -> only 2 staff (HânEmBé, Cẩm Tiên)
      fireEvent.click(screen.getByTestId('branch-filter-Estella Place'));
      expect(screen.getByText('2 CV')).toBeInTheDocument();
      expect(screen.getByText('HânEmBé')).toBeInTheDocument();
      expect(screen.getByText('Cẩm Tiên')).toBeInTheDocument();
      expect(screen.queryByText('Ánh Tuyết')).not.toBeInTheDocument();

      // Filter to Đề Thám -> 2 staff (Khanh Cao, Ánh Tuyết)
      fireEvent.click(screen.getByTestId('branch-filter-Đề Thám'));
      expect(screen.getByText('2 CV')).toBeInTheDocument();
      expect(screen.getByText('Ánh Tuyết')).toBeInTheDocument();
      expect(screen.queryByText('HânEmBé')).not.toBeInTheDocument();

      // Combine with KTV role filter -> only 1 staff (Ánh Tuyết)
      fireEvent.click(screen.getByRole('button', { name: 'KTV' }));
      expect(screen.getByText('1 CV')).toBeInTheDocument();
      expect(screen.getByText('Ánh Tuyết')).toBeInTheDocument();
    });

    it('renders and filters by branch in cards and ultra_compact modes', () => {
      const { rerender } = render(
        <StaffCareerSelector
          staffList={MOCK_STAFF}
          selectedStaffId={1}
          onSelectStaff={vi.fn()}
          onSyncProd={vi.fn().mockResolvedValue(undefined)}
          syncing={false}
          selectorMode="cards"
          config={FALLBACK_CAREER_PROGRESSION_CONFIG}
        />
      );

      fireEvent.click(screen.getByTestId('branch-filter-Estella Place'));
      expect(screen.getByText('2 CV')).toBeInTheDocument();
      expect(screen.getByText('HânEmBé')).toBeInTheDocument();

      rerender(
        <StaffCareerSelector
          staffList={MOCK_STAFF}
          selectedStaffId={1}
          onSelectStaff={vi.fn()}
          onSyncProd={vi.fn().mockResolvedValue(undefined)}
          syncing={false}
          selectorMode="ultra_compact"
          config={FALLBACK_CAREER_PROGRESSION_CONFIG}
        />
      );

      fireEvent.click(screen.getByTestId('branch-filter-Đề Thám'));
      expect(screen.getByText('2 CV')).toBeInTheDocument();
      expect(screen.getByText('Ánh Tuyết')).toBeInTheDocument();
      expect(screen.queryByText('HânEmBé')).not.toBeInTheDocument();
    });
  });

  describe('MobileStaffCareerSheet', () => {
    it('filters staff by branch on mobile sheet', () => {
      render(
        <MobileStaffCareerSheet
          staffList={MOCK_STAFF}
          selectedStaffId={1}
          onSelectStaff={vi.fn()}
          onClose={vi.fn()}
          config={FALLBACK_CAREER_PROGRESSION_CONFIG}
        />
      );

      expect(screen.getByText('Khanh Cao')).toBeInTheDocument();
      expect(screen.getByText('HânEmBé')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('mobile-branch-filter-Estella Place'));
      expect(screen.getByText('HânEmBé')).toBeInTheDocument();
      expect(screen.getByText('Cẩm Tiên')).toBeInTheDocument();
      expect(screen.queryByText('Khanh Cao')).not.toBeInTheDocument();
      expect(screen.queryByText('Ánh Tuyết')).not.toBeInTheDocument();
    });
  });
});
