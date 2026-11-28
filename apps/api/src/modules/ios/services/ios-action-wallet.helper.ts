import { SafeAny } from '@mos-lab/shared';
import { BookingOverrideRecord } from './ios-overrides.service.js';

export const MUTATIVE_ACTIONS_AFTER_SETTLE = new Set([
  'CHECK_IN',
  'SELECT_COMBO_WALLET',
  'SAVE_CONSULTATION',
  'SAVE_CONSULTATION_DRAFT',
  'ASSIGN_STAFF',
  'START_TIMER',
  'FINISH_TIMER',
  'SAVE_PHOTO',
  'NEXT_SERVICE_ROUND',
  'ADD_UNDER_LASH_ROUND',
  'SAVE_SURVEY',
  'UPDATE_CART_PRODUCTS',
  'SAVE_PROMOTION',
  'SAVE_PRE_CHECKOUT_PAYMENT',
  'SAVE_TIP',
]);

export function extractComboWalletSelectionPatch(body: SafeAny, current: BookingOverrideRecord): BookingOverrideRecord {
  const hasUpperId = body?.selectedUpperComboBalanceId !== undefined;
  const hasUnderId = body?.selectedUnderComboBalanceId !== undefined;
  const hasSkipUpper = body?.skipUpperCombo !== undefined;
  const hasSkipUnder = body?.skipUnderCombo !== undefined;

  const selectedUpperComboBalanceId = hasUpperId
    ? body.selectedUpperComboBalanceId && Number(body.selectedUpperComboBalanceId) > 0
      ? Number(body.selectedUpperComboBalanceId)
      : null
    : current.selectedUpperComboBalanceId;
  const selectedUnderComboBalanceId = hasUnderId
    ? body.selectedUnderComboBalanceId && Number(body.selectedUnderComboBalanceId) > 0
      ? Number(body.selectedUnderComboBalanceId)
      : null
    : current.selectedUnderComboBalanceId;
  const skipUpperCombo = hasSkipUpper ? Boolean(body.skipUpperCombo) : current.skipUpperCombo;
  const skipUnderCombo = hasSkipUnder ? Boolean(body.skipUnderCombo) : current.skipUnderCombo;

  return {
    ...(selectedUpperComboBalanceId !== undefined ? { selectedUpperComboBalanceId } : {}),
    ...(selectedUnderComboBalanceId !== undefined ? { selectedUnderComboBalanceId } : {}),
    ...(skipUpperCombo !== undefined ? { skipUpperCombo } : {}),
    ...(skipUnderCombo !== undefined ? { skipUnderCombo } : {}),
  };
}

export function buildSelectComboWalletOverride(params: {
  current: BookingOverrideRecord;
  effectiveCustomerId: number;
  walletSelectionPatch: BookingOverrideRecord;
  body: SafeAny;
}): BookingOverrideRecord {
  const { current, effectiveCustomerId, walletSelectionPatch, body } = params;
  return {
    ...current,
    ...(effectiveCustomerId > 0 ? { customerId: effectiveCustomerId } : {}),
    ...walletSelectionPatch,
    ...(body.comboRedemption !== undefined ? { comboRedemption: body.comboRedemption } : {}),
    ...(body.selectedCombo !== undefined ? { selectedCombo: body.selectedCombo } : {}),
    ...(body.selectedUnderCombo !== undefined ? { selectedUnderCombo: body.selectedUnderCombo } : {}),
    ...(body.serviceName !== undefined ? { serviceName: body.serviceName } : {}),
    ...(body.servicePrice !== undefined ? { servicePrice: body.servicePrice } : {}),
    ...(body.serviceType !== undefined ? { serviceType: body.serviceType } : {}),
    ...(body.upgradePrice !== undefined ? { upgradePrice: body.upgradePrice } : {}),
    ...(body.hasUnderMinkCombo !== undefined ? { hasUnderMinkCombo: Boolean(body.hasUnderMinkCombo) } : {}),
    comboWalletUpdatedAt: new Date().toISOString(),
  };
}
