import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelesaleTvStaffContributionGrid } from './TelesaleTvStaffContributionGrid';
import { TelesaleStaffTarget } from '@mos-lab/shared';
import { calculateShiftPacing } from '../utils/tv-monitor-pacing';

describe('TelesaleTvStaffContributionGrid', () => {
  const mockStaffTargets: TelesaleStaffTarget[] = [
    {
      legacyStaffId: 50670,
      name: 'Bích Phượng',
      avatarUrl: 'https://avatar/phuong.jpg',
      doneTarget: 150,
      doneActual: 45,
      doneToday: 5,
      bookToday: 8,
      bookContributionPercent: 50,
      isTopBookToday: true,
      callTargetDaily: 83,
      callActualToday: 75,
      pickupActualToday: 24,
    },
    {
      legacyStaffId: 52648,
      name: 'Thuý Kiều',
      avatarUrl: null,
      doneTarget: 100,
      doneActual: 30,
      doneToday: 3,
      bookToday: 4,
      bookContributionPercent: 25,
      isTopBookToday: false,
      callTargetDaily: 83,
      callActualToday: 60,
      pickupActualToday: 18,
    },
    {
      legacyStaffId: 32268,
      name: 'Ngọc Điệp',
      avatarUrl: null,
      doneTarget: 100,
      doneActual: 25,
      doneToday: 2,
      bookToday: 4,
      bookContributionPercent: 25,
      isTopBookToday: false,
      callTargetDaily: 83,
      callActualToday: 55,
      pickupActualToday: 15,
    },
  ];

  it('renders all staff cards with names, Book today, Done today, and % contribution', () => {
    render(<TelesaleTvStaffContributionGrid staffTargets={mockStaffTargets} totalTeamBookToday={16} />);

    expect(screen.getByText(/ĐÓNG GÓP CÁ NHÂN HÔM NAY · TELESALES EXECUTIVES/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Nhân sự hoạt động/i)).toBeInTheDocument();

    // Staff names
    expect(screen.getByText('Bích Phượng')).toBeInTheDocument();
    expect(screen.getByText('Thuý Kiều')).toBeInTheDocument();
    expect(screen.getByText('Ngọc Điệp')).toBeInTheDocument();

    // Metrics
    expect(screen.getByText('8')).toBeInTheDocument(); // Phượng book
    expect(screen.getByText('5')).toBeInTheDocument(); // Phượng done
    expect(screen.getByText('50% Team')).toBeInTheDocument();

    // Top book badge
    expect(screen.getByText('TOP BOOK')).toBeInTheDocument();
  });

  it('ranks staff with higher check-in ahead when Book today is tied', () => {
    const tiedStaffTargets: TelesaleStaffTarget[] = [
      {
        legacyStaffId: 101,
        name: 'Tâm Nguyễn',
        avatarUrl: null,
        doneTarget: 100,
        doneActual: 20,
        doneToday: 0,
        checkinToday: 0,
        bookToday: 4,
        bookContributionPercent: 50,
        isTopBookToday: false,
        callTargetDaily: 83,
        callActualToday: 60,
        pickupActualToday: 20,
      },
      {
        legacyStaffId: 102,
        name: 'Ngọc Điệp',
        avatarUrl: null,
        doneTarget: 100,
        doneActual: 20,
        doneToday: 1,
        checkinToday: 1,
        bookToday: 4,
        bookContributionPercent: 50,
        isTopBookToday: true,
        callTargetDaily: 83,
        callActualToday: 65,
        pickupActualToday: 22,
      },
    ];

    render(<TelesaleTvStaffContributionGrid staffTargets={tiedStaffTargets} totalTeamBookToday={8} />);

    const cards = screen.getAllByTestId(/^tv-staff-card-/);
    expect(cards).toHaveLength(2);
    // Điệp (checkin: 1) must be rendered first before Tâm (checkin: 0)
    expect(cards[0]).toHaveAttribute('data-testid', 'tv-staff-card-102');
    expect(cards[1]).toHaveAttribute('data-testid', 'tv-staff-card-101');

    // Only card 102 (Điệp) has the TOP BOOK crown
    expect(cards[0]).toHaveTextContent('TOP BOOK');
    expect(cards[1]).not.toHaveTextContent('TOP BOOK');
  });

  it('displays staff daily booking target and pacing tier colors (xanh, vàng, đỏ)', () => {
    const tieredStaffTargets: TelesaleStaffTarget[] = [
      {
        legacyStaffId: 101,
        name: 'Ngọc Điệp',
        avatarUrl: null,
        doneTarget: 100,
        doneActual: 20,
        doneToday: 1,
        checkinToday: 1,
        bookToday: 7, // 7 >= 5 -> Vượt target (emerald)
        bookContributionPercent: 35,
        isTopBookToday: true,
        callTargetDaily: 83,
        callActualToday: 60,
        pickupActualToday: 20,
      },
      {
        legacyStaffId: 102,
        name: 'Vũ Huỳnh',
        avatarUrl: null,
        doneTarget: 100,
        doneActual: 20,
        doneToday: 0,
        checkinToday: 0,
        bookToday: 3, // rTime ~ 0.79 -> expected 4, gap -1 -> amber
        bookContributionPercent: 15,
        isTopBookToday: false,
        callTargetDaily: 83,
        callActualToday: 60,
        pickupActualToday: 20,
      },
      {
        legacyStaffId: 103,
        name: 'Bích Phượng',
        avatarUrl: null,
        doneTarget: 100,
        doneActual: 20,
        doneToday: 0,
        checkinToday: 0,
        bookToday: 2, // expected 4, gap -2 -> rose
        bookContributionPercent: 10,
        isTopBookToday: false,
        callTargetDaily: 83,
        callActualToday: 60,
        pickupActualToday: 20,
      },
    ];

    // Pacing at 15:20 (ca chiều, expected ~ 4 book for target 5)
    const mockPacing = calculateShiftPacing({ hour: 15, minute: 20 });

    render(
      <TelesaleTvStaffContributionGrid
        staffTargets={tieredStaffTargets}
        totalTeamBookToday={12}
        dailyBookTarget={15} // 15 target / 3 staff = 5 book / staff
        pacing={mockPacing}
      />
    );

    // Target indicator in Book header
    expect(screen.getAllByText('/5')).toHaveLength(3);

    // Badges
    expect(screen.getByText('+2 VƯỢT')).toBeInTheDocument();
    expect(screen.getByText('-1 BÁM NHỊP')).toBeInTheDocument();
    expect(screen.getByText('-2 CHẬM')).toBeInTheDocument();
  });

  it('handles empty staff targets gracefully', () => {
    const { container } = render(<TelesaleTvStaffContributionGrid staffTargets={[]} totalTeamBookToday={0} />);
    expect(container.firstChild).toBeNull();
  });
});
