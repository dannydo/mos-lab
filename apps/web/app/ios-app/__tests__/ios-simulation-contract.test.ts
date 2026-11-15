import { describe, it, expect, beforeEach } from 'vitest';
import {
  IOS_SIM_BOOKING_ID_MIN,
  isIosSyntheticSimBookingId,
  filterBookingsForCvlScope,
  MOS_BIBLE_COMMANDMENTS,
  type IosBookingItem,
} from '@mos-lab/shared';
import {
  setOfflineSyncSimulationNamespace,
  isOfflineSyncSimulationNamespace,
  getActiveServicingBookingId,
  setActiveServicingBookingId,
  getActiveServicingStep,
  setActiveServicingStep,
  saveLocalProgressSnapshot,
  getLocalProgressSnapshot,
  clearLocalProgressSnapshot,
  enqueueOfflineAction,
  getPendingActions,
} from '../state/offlineSync';
import { buildSimBookingMetaPayload } from '../state/useIosSimulationMode';
import { getClientTrainingSamplePhoto } from '../components/simulation/IosSimulationWorkspaceBar';

describe('mOS iOS App — Simulation Sandbox & Dual Booking Contract', () => {
  beforeEach(() => {
    setOfflineSyncSimulationNamespace(false);
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('registers OPS-004 Simulation Training Sandbox in Kinh Thánh mOS', () => {
    const ops004 = MOS_BIBLE_COMMANDMENTS.find((r) => r.id === 'OPS-004');
    expect(ops004).toBeDefined();
    expect(ops004?.routeScopes).toContain('/ios-app');
    expect(ops004?.status).toBe('ACTIVE');
  });

  it('recognizes synthetic simulation booking IDs >= 900,000,000', () => {
    expect(IOS_SIM_BOOKING_ID_MIN).toBe(900_000_000);
    expect(isIosSyntheticSimBookingId(771121)).toBe(false);
    expect(isIosSyntheticSimBookingId(900_000_001)).toBe(true);
    expect(isIosSyntheticSimBookingId('900000042')).toBe(true);
  });

  it('isolates live vs simulation IndexedDB/localStorage keys cleanly', () => {
    setOfflineSyncSimulationNamespace(false);
    expect(isOfflineSyncSimulationNamespace()).toBe(false);
    setActiveServicingBookingId(771121);
    setActiveServicingStep(8);
    saveLocalProgressSnapshot(771121, { beforePhotoUrl: 'https://live.example/before.jpg', currentStep: 8 });

    // Switch into simulation namespace and mutate same booking ID #771121
    setOfflineSyncSimulationNamespace(true);
    expect(isOfflineSyncSimulationNamespace()).toBe(true);
    expect(getActiveServicingBookingId()).toBeNull();
    setActiveServicingBookingId(771121);
    setActiveServicingStep(12);
    saveLocalProgressSnapshot(771121, { beforePhotoUrl: 'data:image/jpeg;base64,SIM', currentStep: 12 });

    expect(getActiveServicingBookingId()).toBe(771121);
    expect(getActiveServicingStep()).toBe(12);
    expect(getLocalProgressSnapshot(771121)?.beforePhotoUrl).toBe('data:image/jpeg;base64,SIM');

    // Clear inside simulation
    clearLocalProgressSnapshot(771121);
    expect(getLocalProgressSnapshot(771121)).toBeNull();

    // Live namespace must remain completely intact!
    setOfflineSyncSimulationNamespace(false);
    expect(getActiveServicingBookingId()).toBe(771121);
    expect(getActiveServicingStep()).toBe(8);
    expect(getLocalProgressSnapshot(771121)?.beforePhotoUrl).toBe('https://live.example/before.jpg');
  });

  it('never enqueues simulation actions into offline sync queue', () => {
    setOfflineSyncSimulationNamespace(true);
    enqueueOfflineAction('CONSULTATION_SAVE', 771121, { status: 'SERVICING' });
    setOfflineSyncSimulationNamespace(false);
    enqueueOfflineAction('SIM_REVERT_CONSULTATION', 771121, {});
    enqueueOfflineAction('CHECK_IN', 771121, { simulationMode: true });
    expect(getPendingActions()).toHaveLength(0);
  });

  it('builds compact meta payload and sample training photo URIs', () => {
    const sampleBooking: IosBookingItem = {
      id: 771121,
      orderNumber: 'BK-771121',
      customerName: 'Ngọc Phạm',
      customerPhone: '0933...207',
      customerId: 50021,
      customerVisits: 21,
      customerNote: '7/11 c book',
      timeSlot: '11:00 (90m)',
      serviceName: 'Classic 1D',
      servicePrice: 550000,
      serviceDuration: 90,
      assignedStaffId: 46272,
      assignedStaffTier: 'CVL',
      status: 'INCOMING',
      cvRotationPoints: 3,
      comboLiveStatus: {
        isComboLive: true,
        remainingSessions: 4,
        comboName: 'Combo Classic 1D',
        upsellOpportunity: false,
      },
      underMinkComboStatus: {
        hasUnderCombo: false,
        remainingSessions: 0,
        normalRemaining: 0,
        retainRemaining: 0,
        comboName: '',
      },
    };

    const meta = buildSimBookingMetaPayload(sampleBooking);
    expect(meta?.customerId).toBe(50021);
    expect(meta?.customerName).toBe('Ngọc Phạm');
    expect(meta?.isComboLive).toBe(true);

    const beforeUri = getClientTrainingSamplePhoto('before');
    const cleanedUri = getClientTrainingSamplePhoto('cleaned');
    const afterUri = getClientTrainingSamplePhoto('after');
    expect(beforeUri.startsWith('data:image/')).toBe(true);
    expect(cleanedUri.startsWith('data:image/')).toBe(true);
    expect(afterUri.startsWith('data:image/')).toBe(true);

    const scoped = filterBookingsForCvlScope([sampleBooking], 46272, { isToday: true });
    expect(scoped).toHaveLength(1);
  });
});
