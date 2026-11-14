import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canAccessIosConsultationApp,
  resolveLockedIosRoleForUser,
  hasCompleteNaturalLashAttributes,
  hasCompleteNaturalLashSet,
  validateNaturalLashConsultationSave,
  calculateCvComboTierBonus,
  calculateDualComboTierBonus,
  calculateCvSerumTierBonus,
  resolveEffectiveServiceTotal,
  calculateActorTipBreakdown,
  filterBookingsForCvlScope,
  resolveCustomerBookingTab,
  resolveServicingSubStatus,
  isDoneBookingPendingCheckout,
  sortDoneBookingsWithCheckoutFirst,
  type IosBookingItem,
} from '@mos-lab/shared';
import { getBookingCompletionInfo, getDoneBookingSummary } from '../components/screens/incoming/incomingBookingHelpers';

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

    it('enforces CVL customer privacy: own customers + head slot (all sharing same time) + late INCOMING with next slot', () => {
      const myStaffId = 46272;
      const now0845 = new Date('2026-11-13T08:45:00+07:00');
      const bookings: IosBookingItem[] = [
        makeBooking({
          id: 1,
          isUnassignedQueue: true,
          assignedStaffId: 0,
          status: 'INCOMING',
          timeSlot: '09:00 - 10:30',
        }),
        makeBooking({
          id: 2,
          isUnassignedQueue: true,
          assignedStaffId: 0,
          status: 'INCOMING',
          timeSlot: '09:30 - 11:00',
        }),
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

      const scoped = filterBookingsForCvlScope(bookings, myStaffId, { isToday: true, now: now0845 });
      expect(scoped.map((b) => b.id)).toEqual([1, 3, 5]);
      expect(scoped.find((b) => b.id === 1)?.isNextQueueCustomer).toBe(true);
      expect(scoped.find((b) => b.id === 3)?.bookingAccessTag).toBe('MY_BOOKED_CUSTOMER');

      // 2+ unassigned customers at the same head start time (11:00) -> show all in that slot
      const sameSlot = [
        makeBooking({ id: 11, timeSlot: '11:00 - 12:30' }),
        makeBooking({ id: 12, timeSlot: '11:00 - 12:00' }),
        makeBooking({ id: 13, timeSlot: '11:30 - 13:00' }),
      ];
      expect(
        filterBookingsForCvlScope(sameSlot, myStaffId, {
          isToday: true,
          now: new Date('2026-11-13T10:45:00+07:00'),
        }).map((b) => b.id)
      ).toEqual([11, 12]);

      // Late unassigned INCOMING customer(s) + next upcoming slot -> show both late and next slot
      const lateAndNext = [
        makeBooking({ id: 21, timeSlot: '10:30 - 12:00' }),
        makeBooking({ id: 22, timeSlot: '11:00 - 12:30' }),
        makeBooking({ id: 23, timeSlot: '11:00 - 12:30' }),
        makeBooking({ id: 24, timeSlot: '11:30 - 13:00' }),
      ];
      expect(
        filterBookingsForCvlScope(lateAndNext, myStaffId, {
          isToday: true,
          now: new Date('2026-11-13T10:45:00+07:00'),
        }).map((b) => b.id)
      ).toEqual([21, 22, 23]);

      // Non-today view (e.g. tomorrow) -> 10:30 is not considered late
      expect(
        filterBookingsForCvlScope(lateAndNext, myStaffId, {
          isToday: false,
          now: new Date('2026-11-13T10:45:00+07:00'),
        }).map((b) => b.id)
      ).toEqual([21]);
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

      // Returning client (Lần 10, CHƯA ĐO) must ALSO be gated until all 7/7 natural lash attributes are measured (OPS-003 v1.2.0)
      const unmeasuredReturningBooking = makeBooking({
        id: 339319,
        customerName: 'Hà',
        customerVisits: 10,
        attributes: {
          style: 'Doll',
          curl: 'C',
          length: '10-12 mm',
          thickness: '0.05 mm',
        },
      });
      expect(hasCompleteNaturalLashSet(unmeasuredReturningBooking)).toBe(false);
      expect(
        validateNaturalLashConsultationSave({
          customerVisits: 10,
          existingAttributes: unmeasuredReturningBooking.attributes,
          incomingAttributes: { style: 'Doll' } as Record<string, string>,
        }).valid
      ).toBe(false);

      const measuredReturningBooking = makeBooking({
        ...unmeasuredReturningBooking,
        attributes: {
          ...unmeasuredReturningBooking.attributes!,
          ...complete7,
        },
      });
      expect(hasCompleteNaturalLashSet(measuredReturningBooking)).toBe(true);
      expect(
        validateNaturalLashConsultationSave({
          customerVisits: 10,
          existingAttributes: measuredReturningBooking.attributes,
          incomingAttributes: {},
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

      const lightLashing = resolveServicingSubStatus(
        {
          status: 'SERVICING',
          progress: { elapsedSeconds: 300, timerRunning: true, currentStep: 9 },
        },
        'light'
      );
      expect(lightLashing.colorClass).toContain('text-amber-800');
      expect(lightLashing.colorClass).toContain('bg-amber-50');
    });

    it('pins CheckOut / pending counter settlement bookings on top of DONE tab and tracks pending status', () => {
      const completedFirst = makeBooking({
        id: 7001,
        status: 'DONE',
        orderState: 'Completed',
        timeSlot: '08:30 - 10:00',
        billing: {
          subtotal: 550000,
          serviceTotal: 550000,
          productTotal: 0,
          paymentMethod: 'VIETQR',
          tipAmount: 50000,
          tipCvShare: 35000,
          tipCcShare: 10000,
          grandTotal: 600000,
          settlementStatus: 'SETTLED_COMPLETED',
        },
      });
      const pendingCheckoutSecond = makeBooking({
        id: 7002,
        status: 'DONE',
        orderState: 'CheckOut',
        timeSlot: '10:30 - 12:00',
        billing: {
          subtotal: 660000,
          serviceTotal: 660000,
          productTotal: 0,
          paymentMethod: 'CASH',
          tipAmount: 50000,
          tipCvShare: 35000,
          tipCcShare: 10000,
          grandTotal: 660000,
          settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
        },
      });
      const historicalNewUnclosed = makeBooking({
        id: 7003,
        status: 'DONE',
        orderState: 'New',
        timeSlot: '09:00 - 10:30',
      });

      expect(isDoneBookingPendingCheckout(pendingCheckoutSecond)).toBe(true);
      expect(isDoneBookingPendingCheckout(completedFirst)).toBe(false);
      expect(isDoneBookingPendingCheckout(historicalNewUnclosed)).toBe(false);

      const sorted = sortDoneBookingsWithCheckoutFirst([completedFirst, pendingCheckoutSecond, historicalNewUnclosed]);
      expect(sorted.map((b) => b.id)).toEqual([7002, 7001, 7003]);

      expect(getDoneBookingSummary(pendingCheckoutSecond).isPendingCheckout).toBe(true);
      expect(getDoneBookingSummary(completedFirst).isPendingCheckout).toBe(false);

      const completionLight = getBookingCompletionInfo(
        makeBooking({
          status: 'SERVICING',
          timeSlot: '10:00 - 11:30',
          serviceDuration: 90,
          progress: { elapsedSeconds: 3000, timerRunning: true, currentStep: 9 },
        }),
        new Date(2026, 10, 14, 11, 0, 0),
        false
      );
      expect(completionLight.shortCountdownText).toBe('còn 40p');
      expect(completionLight.colorClass).toContain('text-emerald-700');
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

    it('calculates dual-combo tier bonuses by summing both packages first (<2M = 50K, +50K per next 1M) and sums both combos in Done card summary', () => {
      const dual = calculateDualComboTierBonus(4190000, 780000);
      expect(dual.combinedPrice).toBe(4970000);
      expect(dual.upperBonus).toBe(200000);
      expect(dual.underBonus).toBe(0);
      expect(dual.totalBonus).toBe(200000);

      // Linh (08/11/2026): 4.579.200 + 4.212.000 = 8.791.200 -> 400.000đ
      expect(calculateDualComboTierBonus(4579200, 4212000).totalBonus).toBe(400000);
      // Đoan (12/11/2026): 2.304.400 + 1.684.800 = 3.989.200 -> 150.000đ
      expect(calculateDualComboTierBonus(2304400, 1684800).totalBonus).toBe(150000);

      const customRulesDual = calculateDualComboTierBonus(4190000, 780000, {
        comboUnder2mBonus: 60000,
        comboStepPerMillionBonus: 60000,
      });
      // 4.970.000đ (4M-<5M): 60.000 + 3 * 60.000 = 240.000đ
      expect(customRulesDual.totalBonus).toBe(240000);

      const doneSummary = getDoneBookingSummary(
        makeBooking({
          id: 140282,
          status: 'DONE',
          cvRotationPoints: 64,
          selectedCombo: {
            id: '7+3-hyperlight-770',
            name: 'Combo 7 tặng 3',
            price: 4190000,
            bonus: 200000,
            sessions: 10,
            todaySingleServiceWaived: true,
          },
          selectedUnderCombo: {
            id: '2+1-under-390',
            name: 'Combo 2 tặng 1 Mi Dưới',
            price: 780000,
            bonus: 50000,
            sessions: 3,
            todaySingleServiceWaived: true,
          },
          billing: {
            subtotal: 4970000,
            vatAmount: 397600,
            serviceTotal: 0,
            comboTotal: 4970000,
            productTotal: 0,
            paymentMethod: 'CASH',
            tipAmount: 100000,
            tipCvShare: 90000,
            tipCcShare: 0,
            grandTotal: 5467600,
            settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
          },
        })
      );

      expect(doneSummary.soldComboPrice).toBe(4970000);
      expect(doneSummary.cvPoints).toBe(64);
      expect(doneSummary.tipAmount).toBe(100000);
      expect(doneSummary.settlementStatus).toBe('PENDING_COUNTER_SETTLEMENT');
    });

    it('computes canonical CV rotation points dynamically when cvRotationPoints is undefined (never falls back to 41)', () => {
      const card1Retain = getDoneBookingSummary(
        makeBooking({
          id: 339337,
          status: 'DONE',
          serviceName: 'Dặm HyperLight 340K',
          serviceType: 'Normal',
          servicePrice: 0,
          attributes: {
            material: 'HyperLight',
            volume: '3X',
            count: '50 fan',
            style: 'Natural',
            curl: 'C',
            length: '10-12 mm',
            thickness: '0.07 mm',
          },
        })
      );
      expect(card1Retain.cvPoints).toBe(21);

      const card2Retain = getDoneBookingSummary(
        makeBooking({
          id: 339415,
          status: 'DONE',
          serviceName: 'Hyperlight 770 Refill',
          serviceType: 'Retain',
          servicePrice: 0,
          attributes: {
            material: 'HyperLight',
            volume: '4X',
            count: '70 fan',
            style: 'Natural',
            curl: 'C',
            length: '10-12 mm',
            thickness: '0.07 mm',
          },
        })
      );
      expect(card2Retain.cvPoints).toBe(28);

      const card3PaidRefillPrice = getDoneBookingSummary(
        makeBooking({
          id: 339389,
          status: 'DONE',
          serviceName: 'HyperLight 4X 770',
          serviceType: 'Normal',
          servicePrice: 470000,
          attributes: {
            material: 'HyperLight',
            volume: '4X',
            count: '70 fan',
            style: 'Natural',
            curl: 'C',
            length: '10-12 mm',
            thickness: '0.07 mm',
          },
        })
      );
      expect(card3PaidRefillPrice.cvPoints).toBe(28);

      const card4UltraDoll = getDoneBookingSummary(
        makeBooking({
          id: 338985,
          status: 'DONE',
          serviceName: 'Ultralight 550',
          serviceType: 'Normal',
          servicePrice: 416000,
          attributes: {
            material: 'UltraLight',
            volume: '3D',
            count: '60 fan',
            style: 'Doll',
            curl: 'C',
            length: '10-12 mm',
            thickness: '0.07 mm',
          },
        })
      );
      expect(card4UltraDoll.cvPoints).toBe(38);
    });
  });
});
