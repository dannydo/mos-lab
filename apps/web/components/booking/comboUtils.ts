export const hasActiveLowerLashCombo = (balances: SafeAny[]) => {
  return balances.some((cb) => {
    const isCountActive = (cb.normalCount || 0) + (cb.retainCount || 0) > 0;
    const isExpired = cb.dateExpired ? new Date(cb.dateExpired) < new Date() : false;
    const name = (cb.serviceName || '').toLowerCase();
    const isLower =
      name.includes('mi dưới') || name.includes('dưới') || name.includes('lower') || name.includes('under');
    return isCountActive && !isExpired && isLower;
  });
};

export const hasActiveUpperLashCombo = (balances: SafeAny[]) => {
  return balances.some((cb) => {
    const isCountActive = (cb.normalCount || 0) + (cb.retainCount || 0) > 0;
    const isExpired = cb.dateExpired ? new Date(cb.dateExpired) < new Date() : false;
    const name = (cb.serviceName || '').toLowerCase();
    const isUpper =
      name.includes('trên') ||
      name.includes('volume') ||
      name.includes('classic') ||
      name.includes('lashes') ||
      name.includes('katun') ||
      name.includes('mi ');
    const isLower =
      name.includes('mi dưới') || name.includes('dưới') || name.includes('lower') || name.includes('under');
    return isCountActive && !isExpired && isUpper && !isLower;
  });
};

export const checkAndAppendLowerLashNote = (note: string, balances: SafeAny[]) => {
  if (hasActiveLowerLashCombo(balances) && hasActiveUpperLashCombo(balances)) {
    const suffix = '(Có gói mi dưới)';
    if (!note.includes('mi dưới') && !note.includes('mi duoi')) {
      return note ? `${note.trim()} ${suffix}` : suffix;
    }
  }
  return note;
};

export const getCalculatedPrice = (selectedService: SafeAny, selectedPromotion: SafeAny) => {
  if (!selectedService) return { original: 0, discount: 0, final: 0 };
  const original = selectedService.price || 0;
  let discount = 0;
  if (selectedPromotion) {
    if (selectedPromotion.discountPercentage > 0) {
      discount = Math.round((original * selectedPromotion.discountPercentage) / 100);
    } else if (selectedPromotion.discountAmount > 0) {
      discount = selectedPromotion.discountAmount;
    }
  }
  return {
    original,
    discount,
    final: Math.max(0, original - discount),
  };
};
