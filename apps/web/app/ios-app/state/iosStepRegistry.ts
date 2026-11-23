/**
 * Canonical named step registry for /ios-app so routes and screen transitions
 * never suffer from the +1 offset trap after Step 8 (Screen07bLashProgressCleaned).
 */
export const IOS_STEPS = {
  INCOMING: 1,
  CHECK_IN: 2,
  CONSULTATION: 3,
  STAFF_ASSIGN: 4,
  TRANSFER: 5,
  CV_RECEIVE: 6,
  LASH_BEFORE: 7,
  LASH_CLEANED: 8,
  LASH_TIMER: 9,
  LASH_AFTER: 10,
  CUSTOMER_SURVEY: 11,
  PRODUCT_UPSELL: 12,
  CHECKOUT: 13,
  CHECKOUT_TIP: 14,
  RECEIPT_DONE: 15,
} as const;

export type IosStepId = keyof typeof IOS_STEPS;
export type IosStepNumber = (typeof IOS_STEPS)[IosStepId];

export const IOS_STEP_NUMBER_TO_ID: Record<IosStepNumber, IosStepId> = {
  1: 'INCOMING',
  2: 'CHECK_IN',
  3: 'CONSULTATION',
  4: 'STAFF_ASSIGN',
  5: 'TRANSFER',
  6: 'CV_RECEIVE',
  7: 'LASH_BEFORE',
  8: 'LASH_CLEANED',
  9: 'LASH_TIMER',
  10: 'LASH_AFTER',
  11: 'CUSTOMER_SURVEY',
  12: 'PRODUCT_UPSELL',
  13: 'CHECKOUT',
  14: 'CHECKOUT_TIP',
  15: 'RECEIPT_DONE',
};

export function resolveIosStepId(step: number): IosStepId {
  return (IOS_STEP_NUMBER_TO_ID as Record<number, IosStepId | undefined>)[step] ?? 'INCOMING';
}
