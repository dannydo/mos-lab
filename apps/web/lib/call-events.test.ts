import { describe, expect, it, vi } from 'vitest';
import { CALL_LOG_SAVED_EVENT, notifyCallLogSaved, toCallCustomerId } from './call-events';

describe('call log events', () => {
  it('emits call log saved, data updated, and customer updated events with details', () => {
    const callLogHandler = vi.fn();
    const dataHandler = vi.fn();
    const customerHandler = vi.fn();

    window.addEventListener(CALL_LOG_SAVED_EVENT, callLogHandler);
    window.addEventListener('mos-data-updated', dataHandler);
    window.addEventListener('mos-customer-updated', customerHandler);

    const callDetail = {
      customerId: 12345,
      callLog: {
        id: 99,
        createdAt: '2026-09-23T11:00:00.000Z',
        durationSec: 45,
        callResult: 'ANSWERED',
        note: 'Khách hẹn tuần sau làm mi',
      },
    };

    notifyCallLogSaved(callDetail);

    expect(callLogHandler).toHaveBeenCalledOnce();
    expect((callLogHandler.mock.calls[0][0] as CustomEvent).detail).toEqual(callDetail);

    expect(dataHandler).toHaveBeenCalledOnce();
    expect((dataHandler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      type: 'call-log',
      customerId: 12345,
      callLog: callDetail.callLog,
    });

    expect(customerHandler).toHaveBeenCalledOnce();
    expect((customerHandler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      customerId: 12345,
    });

    window.removeEventListener(CALL_LOG_SAVED_EVENT, callLogHandler);
    window.removeEventListener('mos-data-updated', dataHandler);
    window.removeEventListener('mos-customer-updated', customerHandler);
  });

  it('validates customer IDs properly', () => {
    expect(toCallCustomerId('456')).toBe(456);
    expect(toCallCustomerId(100)).toBe(100);
    expect(toCallCustomerId(0)).toBeNull();
    expect(toCallCustomerId(-5)).toBeNull();
    expect(toCallCustomerId('invalid')).toBeNull();
  });
});
