import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canAccessIosConsultationApp,
  resolveLockedIosRoleForUser,
  hasCompleteNaturalLashAttributes,
  hasCompleteNaturalLashSet,
  validateNaturalLashConsultationSave,
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
  filterBookingsForCvlScope,
  resolveCustomerBookingTab,
  resolveServicingSubStatus,
  type IosBookingItem,
} from '@mos-lab/shared';

function makeBooking(overrides: Partial<IosBookingItem> = {}): IosBookingItem {
  return {
    id: 5001,
    orderNumber: 'BK-5001',
    customerName: 'Chị Thanh Hà',
    customerPhone: '0909.111.222',
    customerId: 77001,
    customerVisits: 1,
    customerNote: '',
    timeSlot: '09:00 - 10:30',
    serviceName: 'New Hyperlight 550',
    servicePrice: 550000,
    serviceDuration: 90,
    status: 'INCOMING',
    isUnassignedQueue: true,
    assignedStaffId: 0,
    ...overrides,
  };
}

describe('mOS iOS App — AI-Agent Architectural & Business Contract Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  describe('1. Zero-Trust Access & Role Lock (Kinh Thánh mOS UI-010)', () => {
    it('allows only CVL, CVLL, CC, and Admin/Super Admin into /ios-app', () => {
      expect(canAccessIosConsultationApp('cvl')).toBe(true);
      expect(canAccessIosConsultationApp('cvll')).toBe(true);
      expect(canAccessIosConsultationApp('cc')).toBe(true);
      expect(canAccessIosConsultationApp('admin')).toBe(true);
      expect(canAccessIosConsultationApp('super_admin')).toBe(true);

      expect(canAccessIosConsultationApp('cv')).toBe(false);
      expect(canAccessIosConsultationApp('telesales')).toBe(false);
      expect(canAccessIosConsultationApp('manager')).toBe(false);
      expect(canAccessIosConsultationApp('cs')).toBe(false);
    });

    it('locks non-admin accounts to their own role even if URL ?role= attempts privilege escalation', () => {
      expect(resolveLockedIosRoleForUser('cvl', 'CVLL')).toBe('CVL');
      expect(resolveLockedIosRoleForUser('cvl', 'CC')).toBe('CVL');
      expect(resolveLockedIosRoleForUser('cvll', 'STORE')).toBe('CVLL');
      expect(resolveLockedIosRoleForUser('cc', 'CVL')).toBe('CC');
      expect(resolveLockedIosRoleForUser('admin', 'CC')).toBe('CC');
      expect(resolveLockedIosRoleForUser('super_admin', 'CVLL')).toBe('CVLL');
    });

    it('enforces CVL customer privacy: only 1 head-of-queue unassigned customer + own assigned/checked-in/out customers', () => {
      const myStaffId = 46272;
      const bookings: IosBookingItem[] = [
        makeBooking({ id: 1, isUnassignedQueue: true, assignedStaffId: 0, status: 'INCOMING' }),
        makeBooking({ id: 2, isUnassignedQueue: true, assignedStaffId: 0, status: 'INCOMING' }),
        makeBooking({ id: 3, isUnassignedQueue: false, assignedStaffId: myStaffId, status: 'INCOMING' }),
        makeBooking({ id: 4, isUnassignedQueue: false, assignedStaffId: 99999, status: 'INCOMING' }),
        makeBooking({
          id: 5,
          isUnassignedQueue: false,
          assignedStaffId: 99999,
          checkOutStaffId: myStaffId,
          status: 'DONE',
        }),
      ];

      const scoped = filterBookingsForCvlScope(bookings, myStaffId);
      expect(scoped.map((b) => b.id)).toEqual([1, 3, 5]);
      expect(scoped.find((b) => b.id === 1)?.isNextQueueCustomer).toBe(true);
      expect(scoped.find((b) => b.id === 3)?.bookingAccessTag).toBe('MY_BOOKED_CUSTOMER');
    });
  });

  describe('2. Mandatory 7/7 Natural Lash Diagnostic Gate (Kinh Thánh mOS OPS-003)', () => {
    const complete7 = {
      naturalLashLength: '8 - 10 mm',
      naturalLashThickness: '0.07 - 0.10 mm',
      naturalLashCount: '90 - 110',
      lashTrail: 'Thẳng đều',
      eyeShape: 'almond',
      lashHealth: 'Khỏe tự nhiên',
      medicalProblem: 'Không kích ứng',
      isNewClientDiagnosticDone: true,
    };

    it('blocks consultation save & task start for new clients until all 7/7 natural lash attributes are measured', () => {
      const unmeasuredNewBooking = makeBooking({
        customerVisits: 1,
        attributes: {
          style: 'Natural',
          curl: 'C',
          length: '10-12 mm',
          thickness: '0.07 mm',
          isNewClientDiagnosticDone: false,
        },
      });

      expect(hasCompleteNaturalLashSet(unmeasuredNewBooking)).toBe(false);
      expect(
        validateNaturalLashConsultationSave({
          customerVisits: 1,
          existingAttributes: unmeasuredNewBooking.attributes,
          incomingAttributes: { ...complete7, lashHealth: '' },
        }).valid
      ).toBe(false);

      const measuredNewBooking = makeBooking({
        customerVisits: 1,
        attributes: {
          style: 'Natural',
          curl: 'C',
          length: '10-12 mm',
          thickness: '0.07 mm',
          ...complete7,
        },
      });
      expect(hasCompleteNaturalLashAttributes(complete7)).toBe(true);
      expect(hasCompleteNaturalLashSet(measuredNewBooking)).toBe(true);
      expect(
        validateNaturalLashConsultationSave({
          customerVisits: 1,
          existingAttributes: unmeasuredNewBooking.attributes,
          incomingAttributes: complete7,
        }).valid
      ).toBe(true);
    });
  });

  describe('3. 15-Step Workflow Tab & Sub-Status Routing Invariants', () => {
    it('routes each booking into a single deterministic tab (INCOMING -> SERVICING -> DONE / CANCEL)', () => {
      expect(resolveCustomerBookingTab(makeBooking({ status: 'INCOMING' }))).toBe('INCOMING');
      expect(resolveCustomerBookingTab(makeBooking({ status: 'CHECKED_IN' }))).toBe('SERVICING');
      expect(
        resolveCustomerBookingTab(
          makeBooking({
            status: 'INCOMING',
            progress: { elapsedSeconds: 120, timerRunning: true, currentStep: 9 },
          })
        )
      ).toBe('SERVICING');
      expect(
        resolveCustomerBookingTab(
          makeBooking({
            status: 'SERVICING',
            billing: {
              subtotal: 550000,
              serviceTotal: 550000,
              productTotal: 0,
              paymentMethod: 'VIETQR',
              tipAmount: 50000,
              tipCvShare: 35000,
              tipCcShare: 10000,
              grandTotal: 644000,
              completedAt: '2026-11-12T08:00:00.000Z',
            },
          })
        )
      ).toBe('DONE');
      expect(resolveCustomerBookingTab(makeBooking({ status: 'CANCELLED' }))).toBe('CANCEL');
    });

    it('maps servicing steps (3..15) accurately to sub-status badges and resume target steps', () => {
      expect(
        resolveServicingSubStatus({
          status: 'CHECKED_IN',
          progress: { elapsedSeconds: 0, timerRunning: false, currentStep: 3 },
        })
      ).toMatchObject({
        key: 'CHECKIN',
        targetStep: 3,
      });
      expect(
        resolveServicingSubStatus({
          status: 'SERVICING',
          progress: { elapsedSeconds: 0, timerRunning: false, currentStep: 8 },
        })
      ).toMatchObject({
        key: 'CLEANING',
        targetStep: 8,
      });
      expect(
        resolveServicingSubStatus({
          status: 'SERVICING',
          progress: { elapsedSeconds: 300, timerRunning: true, currentStep: 9 },
        })
      ).toMatchObject({
        key: 'LASHING',
        targetStep: 9,
      });
      expect(
        resolveServicingSubStatus({
          status: 'SERVICING',
          progress: { elapsedSeconds: 2400, timerRunning: false, currentStep: 11 },
        })
      ).toMatchObject({
        key: 'SURVEY',
        targetStep: 10,
      });
      expect(
        resolveServicingSubStatus({
          status: 'SERVICING',
          progress: { elapsedSeconds: 2400, timerRunning: false, currentStep: 13 },
        })
      ).toMatchObject({
        key: 'CHECKOUT',
        targetStep: 12,
      });
    });
  });

  describe('4. Shared Billing, Combo Bonus, Serum Bonus & 70/10/10 Tip Split Math', () => {
    it('computes CVL combo & serum tier bonuses identically across frontend and backend', () => {
      expect(calculateCvComboTierBonus(0)).toBe(0);
      expect(calculateCvComboTierBonus(1800000)).toBe(50000);
      expect(calculateCvComboTierBonus(3500000)).toBe(150000);
      expect(calculateCvComboTierBonus(4500000)).toBe(200000);

      expect(calculateCvSerumTierBonus(1100000, 2)).toBe(200000);
      expect(calculateCvSerumTierBonus(770000, 1)).toBe(50000);
      expect(calculateCvSerumTierBonus(550000, 3)).toBe(30000);
    });

    it('prioritizes comboRedemption.totalCustomerPayToday and splits 90% tip when CVL performs full self-service', () => {
      expect(
        resolveEffectiveServiceTotal({
          servicePrice: 770000,
          upgradePrice: 150000,
          isComboLive: true,
          comboRedemption: { totalCustomerPayToday: 150000 },
          selectedCombo: { todaySingleServiceWaived: true },
        })
      ).toBe(150000);

      const tip = calculateActorTipBreakdown(
        {
          assignedStaffId: 46272,
          assignedStaffName: 'Thảo Ly',
          checkInStaffId: 46272,
          checkOutStaffId: 46272,
        },
        { staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' },
        100000
      );
      expect(tip.actorEarnedPercent).toBe(90);
      expect(tip.actorEarnedAmount).toBe(90000);
      expect(tip.fundShareAmount).toBe(10000);
    });
  });
});
