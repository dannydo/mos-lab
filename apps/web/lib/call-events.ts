'use client';

export interface CallLogEventDetail {
  customerId: number;
  callLog?: {
    id?: number;
    createdAt?: string;
    durationSec?: number | null;
    callResult?: string | null;
    note?: string | null;
  };
}

export const CALL_LOG_SAVED_EVENT = 'mos-call-log-saved';

export const toCallCustomerId = (value: unknown): number | null => {
  const customerId = Number(value);
  return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
};

export const notifyCallLogSaved = (detail: CallLogEventDetail) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(CALL_LOG_SAVED_EVENT, { detail }));
  window.dispatchEvent(
    new CustomEvent('mos-data-updated', {
      detail: { type: 'call-log', customerId: detail.customerId, callLog: detail.callLog },
    })
  );
  window.dispatchEvent(
    new CustomEvent('mos-customer-updated', {
      detail: { customerId: detail.customerId },
    })
  );
};
