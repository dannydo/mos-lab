import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  type CareerStaffSummary,
  type StaffCareerStatus,
} from '@mos-lab/shared';
import { StaffCareerSelector } from '../components/StaffCareerSelector';
import { RealStaffSimulationCard } from '../components/RealStaffSimulationCard';
import { MobileStaffCareerSheet } from '../components/MobileStaffCareerSheet';

vi.mock('../../../../lib/api-client', () => ({
  apiClient: {
    career: {
      getCvPlusRewards: vi.fn().mockResolvedValue(null),
    },
  },
}));

const MOCK_STAFF_LIST: CareerStaffSummary[] = [
  {
    id: 35,
    displayName: 'HânEmBé',
    username: 'hanembe',
    role: 'lt',
    careerRole: 'CV',
    storeId: 16,
    branchName: 'Estella Place',
    branchCode: 'EP',
    ordersCount: 360,
    fixRate: 0,
    totalTip: 12_000_000,
    tipRatioAboveShop: 0.12,
    staffTipRate: 0.52,
    shopTipRate: 0.45,
    selfComboRate: 0.28,
    happinessIndex: 0.85,
    bananaCount: 24,
    bananaBalance: 120,
    qaAuditsCount: 4,
    servicesPerHour: 0.59,
    revenuePerHour: 231_481,
    actualWorkingHours: 207,
    totalCompletedServices: 123,
    fullSetCount: 87,
    comboRetainCount: 29,
    singleRetainCount: 7,
    serviceRevenue: 47_916_599,
    productivity: {
      totalCompletedServices: 123,
      fullSetCount: 87,
      comboRetainCount: 29,
      singleRetainCount: 7,
      actualWorkingHours: 207,
      servicesPerHour: 0.59,
      serviceRevenue: 47_916_599,
      revenuePerHour: 231_481,
      workingHoursSource: 'SHIFT',
    },
  },
  {
    id: 48,
    displayName: 'Phương Nhi',
    username: 'phuongnhi',
    role: 'lt',
    careerRole: 'CV',
    storeId: 6,
    branchName: 'Đề Thám',
    branchCode: 'DT',
    ordersCount: 310,
    fixRate: 0.01,
    totalTip: 9_500_000,
    tipRatioAboveShop: 0.06,
    staffTipRate: 0.48,
    shopTipRate: 0.45,
    selfComboRate: 0.22,
    happinessIndex: 0.78,
    bananaCount: 21,
    bananaBalance: 90,
    qaAuditsCount: 4,
    servicesPerHour: 0.41,
    revenuePerHour: 159_999,
    actualWorkingHours: 205,
    totalCompletedServices: 84,
    fullSetCount: 69,
    comboRetainCount: 10,
    singleRetainCount: 5,
    serviceRevenue: 32_799_726,
    productivity: {
      totalCompletedServices: 84,
      fullSetCount: 69,
      comboRetainCount: 10,
      singleRetainCount: 5,
      actualWorkingHours: 205,
      servicesPerHour: 0.41,
      serviceRevenue: 32_799_726,
      revenuePerHour: 159_999,
      workingHoursSource: 'SHIFT',
    },
  },
];

const MOCK_STATUS: StaffCareerStatus = {
  staffId: 35,
  staffName: 'HânEmBé',
  currentRole: 'CV',
  targetRole: 'CV_PLUS',
  status: 'IN_PROGRESS',
  period: 'last_30_days',
  targetOrders: 330,
  metrics: {
    ordersCount: 360,
    periodOrders: 123,
    fixCount: 0,
    fixRate: 0,
    totalTip: 12_000_000,
    tipRatioAboveShop: 0.12,
    staffTipRate: 0.52,
    shopTipRate: 0.45,
    storeId: 16,
    branchName: 'Estella Place',
    branchCode: 'EP',
    happinessIndex: 0.85,
    happyCount: 17,
    totalHi: 20,
    bananaCount: 24,
    bananaBalance: 120,
    selfComboCount: 15,
    selfComboRate: 0.28,
    monthsInRole: 6,
    servicesPerHour: 0.59,
    revenuePerHour: 231_481,
    actualWorkingHours: 207,
    totalCompletedServices: 123,
    serviceRevenue: 47_916_599,
    productivity: {
      totalCompletedServices: 123,
      fullSetCount: 87,
      comboRetainCount: 29,
      singleRetainCount: 7,
      actualWorkingHours: 207,
      servicesPerHour: 0.59,
      serviceRevenue: 47_916_599,
      revenuePerHour: 231_481,
      workingHoursSource: 'SHIFT',
    },
    qaAudit: {
      totalAudits: 4,
      requiredAudits: 4,
      passedAudits: 4,
      failedAudits: 0,
      weeklyAuditRate: 1,
      hasFailedAudit: false,
      isPassed: true,
      latestResult: 'PASSED',
    },
  },
  qualifiedQuests: {
    foundationCompleted: true,
    bossTrialCompleted: true,
    qaAuditCompleted: true,
    allPassed: true,
  },
  recommendedAction: 'PROMOTE',
};

describe('Career Path Branch Filter & Hourly Productivity (MOS-BUG-262)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('filters staff by branch (ALL, DE_THAM, ESTELLA) and renders SPH & Revenue/Hour columns in table mode', () => {
    const onSelectStaff = vi.fn();
    render(
      <StaffCareerSelector
        config={DEFAULT_CAREER_PROGRESSION_CONFIG}
        staffList={MOCK_STAFF_LIST}
        selectedStaffId={35}
        onSelectStaff={onSelectStaff}
        onSyncProd={vi.fn().mockResolvedValue(undefined)}
        syncing={false}
        selectorMode="table"
      />
    );

    expect(screen.getAllByText('HânEmBé').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phương Nhi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SPH').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DT/h').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.59/h').length).toBeGreaterThan(0);
    expect(screen.getAllByText('231K/h').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('branch-filter-Đề Thám'));
    expect(screen.getAllByText('Phương Nhi').length).toBeGreaterThan(0);
    expect(screen.queryByRole('cell', { name: /HânEmBé/i })).toBeNull();

    fireEvent.click(screen.getByTestId('branch-filter-Estella Place'));
    expect(screen.getAllByText('HânEmBé').length).toBeGreaterThan(0);
    expect(screen.queryByRole('cell', { name: /Phương Nhi/i })).toBeNull();

    fireEvent.click(screen.getByTestId('branch-filter-ALL'));
    expect(screen.getAllByText('HânEmBé').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phương Nhi').length).toBeGreaterThan(0);
  });

  it('renders branch filter and SPH/DT/h indicators in MobileStaffCareerSheet', () => {
    render(
      <MobileStaffCareerSheet
        config={DEFAULT_CAREER_PROGRESSION_CONFIG}
        staffList={MOCK_STAFF_LIST}
        selectedStaffId={35}
        onSelectStaff={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('SPH: 0.59 lượt/h')).toBeTruthy();
    expect(screen.getByText('SPH: 0.41 lượt/h')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Đề Thám/i }));
    expect(screen.getByText('Phương Nhi')).toBeTruthy();
    expect(screen.queryByText('HânEmBé')).toBeNull();
  });

  it('renders Hourly Productivity & Quality Guardrails widget in RealStaffSimulationCard', async () => {
    render(
      <RealStaffSimulationCard
        status={MOCK_STATUS}
        config={DEFAULT_CAREER_PROGRESSION_CONFIG}
        sliderOrders={360}
        setSliderOrders={vi.fn()}
        sliderCombo={28}
        setSliderCombo={vi.fn()}
      />
    );

    const widget = await screen.findByTestId('career-hourly-productivity-widget');
    expect(widget).toBeTruthy();
    expect(widget.textContent).toContain('0.59');
    expect(widget.textContent).toContain('231.481đ');
    expect(widget.textContent).toContain('87 Full set');
    expect(widget.textContent).toContain('29 Dặm Combo');
    expect(widget.textContent).toContain('7 Dặm lẻ');
    expect(widget.textContent).toContain('207');
    expect(widget.textContent).toContain('Chuẩn 0%');
    expect(widget.textContent).toContain('CSAT 85%');
    expect(widget.textContent).toContain('LoCa Combo: 28%');
  });
});
