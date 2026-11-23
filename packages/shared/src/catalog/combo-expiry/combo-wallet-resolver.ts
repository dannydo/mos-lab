import {
  type ComboExpiryState,
  evaluateComboWalletStatus,
  getVietnamDateYmd,
  type IosCustomerComboWalletItem,
  normalizeComboDateYmd,
} from './combo-expiry-date-wallet.js';

export interface ResolveActiveBookingComboWalletsInput {
  comboWallets?: IosCustomerComboWalletItem[] | null;
  comboLiveStatus?: {
    balanceId?: number;
    isComboLive: boolean;
    remainingSessions: number;
    normalRemaining?: number;
    retainRemaining?: number;
    comboName: string;
    serviceKey?: string;
    packageKey?: string;
    retainDaysLimit?: number;
    upsellOpportunity?: boolean;
    dateExpired?: string | null;
    isExpired?: boolean;
    isFrozen?: boolean;
    isExpiringSoon?: boolean;
    daysRemaining?: number | null;
    avgDaysPerSession?: number | null;
    expiryState?: ComboExpiryState;
  } | null;
  underMinkComboStatus?: {
    balanceId?: number;
    hasUnderCombo: boolean;
    remainingSessions: number;
    normalRemaining: number;
    retainRemaining: number;
    comboName: string;
    packageKey?: string;
    dateExpired?: string | null;
    isExpired?: boolean;
    isFrozen?: boolean;
    isExpiringSoon?: boolean;
    daysRemaining?: number | null;
    avgDaysPerSession?: number | null;
    expiryState?: ComboExpiryState;
  } | null;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
  bookedServiceName?: string | null;
  lastVisitServiceKey?: string | null;
  todayYmd?: string;
}

export interface ResolveActiveBookingComboWalletsResult {
  allWallets: IosCustomerComboWalletItem[];
  upperWallets: IosCustomerComboWalletItem[];
  underWallets: IosCustomerComboWalletItem[];
  liveUpperWallets: IosCustomerComboWalletItem[];
  liveUnderWallets: IosCustomerComboWalletItem[];
  activeUpperWallet: IosCustomerComboWalletItem | null;
  activeUnderWallet: IosCustomerComboWalletItem | null;
  displayUpperWallet: IosCustomerComboWalletItem | null;
  displayUnderWallet: IosCustomerComboWalletItem | null;
  selectedUpperComboBalanceId: number | null;
  selectedUnderComboBalanceId: number | null;
  skipUpperCombo: boolean;
  skipUnderCombo: boolean;
  isRedeemingUpperToday: boolean;
  isRedeemingUnderToday: boolean;
  hasAnyLiveUpperWallet: boolean;
  hasAnyLiveUnderWallet: boolean;
  effectiveComboLiveStatus: NonNullable<ResolveActiveBookingComboWalletsInput['comboLiveStatus']> & {
    upsellOpportunity: boolean;
  };
  effectiveUnderMinkComboStatus: NonNullable<ResolveActiveBookingComboWalletsInput['underMinkComboStatus']> | undefined;
}

function isUnderWalletDescriptor(
  w: Pick<IosCustomerComboWalletItem, 'serviceGroup' | 'comboName' | 'serviceKey'>
): boolean {
  if (w.serviceGroup === 'under') return true;
  const combined = `${w.comboName || ''} ${w.serviceKey || ''}`.toLowerCase();
  return (
    combined.includes('under') ||
    combined.includes('mi dưới') ||
    combined.includes('flawless.mink-390') ||
    combined.includes('flawless-mink-390')
  );
}

function extractLashLineAndTier(rawText?: string | null): {
  line: string | null;
  tier: string | null;
  normalized: string;
} {
  const s = String(rawText || '')
    .toLowerCase()
    .replace(/-refill$/i, '')
    .trim();
  if (!s || s.includes('any')) {
    return { line: null, tier: null, normalized: '' };
  }
  let line: string | null = null;
  if (s.includes('hyper')) line = 'hyperlight';
  else if (s.includes('ultra')) line = 'ultralight';
  else if (s.includes('ivy')) line = 'ivylight';
  else if (s.includes('flawless') || s.includes('mink')) line = 'flawless-mink';
  else if (s.includes('volume') || s.includes('2d')) line = 'volume';
  else if (s.includes('classic') || s.includes('1d')) line = 'classic';
  else if (s.includes('under') || s.includes('mi dưới')) line = 'under';

  const tierMatch = s.match(/(?:^|\D)(\d{3,4})(?:\s*k)?(?:\D|$)/i);
  const tier = tierMatch ? tierMatch[1] : null;
  return { line, tier, normalized: s };
}

function sortWalletsFefo(wallets: IosCustomerComboWalletItem[]): IosCustomerComboWalletItem[] {
  return [...wallets].sort((a, b) => {
    if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
    // Live non-frozen wallets with earliest dateExpired first (FEFO)
    const aHasExpiry = !a.isFrozen && Boolean(a.dateExpired);
    const bHasExpiry = !b.isFrozen && Boolean(b.dateExpired);
    if (aHasExpiry !== bHasExpiry) return aHasExpiry ? -1 : 1;
    if (aHasExpiry && bHasExpiry && a.dateExpired !== b.dateExpired) {
      return String(a.dateExpired).localeCompare(String(b.dateExpired));
    }
    return Number(b.balanceId || 0) - Number(a.balanceId || 0);
  });
}

function pickSuggestedLiveWallet(params: {
  liveWallets: IosCustomerComboWalletItem[];
  bookedServiceName?: string | null;
  lastVisitServiceKey?: string | null;
}): IosCustomerComboWalletItem | null {
  const { liveWallets, bookedServiceName, lastVisitServiceKey } = params;
  if (liveWallets.length === 0) return null;

  const fefoSorted = sortWalletsFefo(liveWallets);
  const booked = extractLashLineAndTier(bookedServiceName);
  if (booked.line) {
    if (booked.tier) {
      const exactBooked = fefoSorted.find((w) => {
        const wt = extractLashLineAndTier(`${w.serviceKey || ''} ${w.comboName || ''}`);
        return wt.line === booked.line && wt.tier === booked.tier;
      });
      if (exactBooked) return exactBooked;
    }
    const lineBooked = fefoSorted.find((w) => {
      const wt = extractLashLineAndTier(`${w.serviceKey || ''} ${w.comboName || ''}`);
      return wt.line === booked.line;
    });
    if (lineBooked) return lineBooked;
  }

  const cleanLastKey = String(lastVisitServiceKey || '')
    .replace(/-refill$/i, '')
    .trim()
    .toLowerCase();
  if (cleanLastKey) {
    const exactLast = fefoSorted.find(
      (w) =>
        String(w.serviceKey || '')
          .replace(/-refill$/i, '')
          .trim()
          .toLowerCase() === cleanLastKey
    );
    if (exactLast) return exactLast;
    const lastTokens = extractLashLineAndTier(cleanLastKey);
    if (lastTokens.line) {
      const lineLast = fefoSorted.find((w) => {
        const wt = extractLashLineAndTier(`${w.serviceKey || ''} ${w.comboName || ''}`);
        return wt.line === lastTokens.line && (!lastTokens.tier || wt.tier === lastTokens.tier);
      });
      if (lineLast) return lineLast;
    }
  }

  return fefoSorted[0] || null;
}

/**
 * Resolves the active Mi Trên & Mi Dưới combo wallet selection for a booking across /ios-app & API settlement.
 * Supports multiple wallets per group, explicit "Không trừ gói / Đi lẻ lần này" skip flags, and smart FEFO defaults.
 */
export function resolveActiveBookingComboWallets(
  input: ResolveActiveBookingComboWalletsInput
): ResolveActiveBookingComboWalletsResult {
  const todayYmd = normalizeComboDateYmd(input.todayYmd) || getVietnamDateYmd();
  const hasExplicitWalletList = Array.isArray(input.comboWallets) && input.comboWallets.length > 0;
  const upperExplicitSplit =
    input.comboLiveStatus?.normalRemaining !== undefined || input.comboLiveStatus?.retainRemaining !== undefined;

  const upperWallets: IosCustomerComboWalletItem[] = [];
  const underWallets: IosCustomerComboWalletItem[] = [];
  const seenUpperIds = new Set<number>();
  const seenUnderIds = new Set<number>();

  if (hasExplicitWalletList) {
    for (const rawWallet of input.comboWallets!) {
      const normalizedGroup: 'upper' | 'under' = isUnderWalletDescriptor(rawWallet) ? 'under' : 'upper';
      const evalStatus = evaluateComboWalletStatus({
        normalRemaining: rawWallet.normalRemaining,
        retainRemaining: rawWallet.retainRemaining,
        remainingSessions: rawWallet.remainingSessions,
        dateExpired: rawWallet.isFrozen ? null : rawWallet.dateExpired,
        todayYmd,
      });
      const wallet: IosCustomerComboWalletItem = {
        ...rawWallet,
        serviceGroup: normalizedGroup,
        dateExpired: rawWallet.isFrozen ? null : (rawWallet.dateExpired ?? evalStatus.dateExpired),
        isFrozen: Boolean(rawWallet.isFrozen ?? evalStatus.isFrozen),
        isExpired: Boolean(rawWallet.isExpired ?? evalStatus.isExpired),
        isExpiringSoon: Boolean(rawWallet.isExpiringSoon ?? evalStatus.isExpiringSoon),
        daysRemaining: rawWallet.daysRemaining !== undefined ? rawWallet.daysRemaining : evalStatus.daysRemaining,
        avgDaysPerSession:
          rawWallet.avgDaysPerSession !== undefined ? rawWallet.avgDaysPerSession : evalStatus.avgDaysPerSession,
        expiryState: rawWallet.expiryState || evalStatus.expiryState,
      };
      if (wallet.remainingSessions <= 0) continue;
      const idNum = Number(wallet.balanceId || 0);
      if (normalizedGroup === 'under') {
        if (idNum > 0 && seenUnderIds.has(idNum)) continue;
        if (idNum > 0) seenUnderIds.add(idNum);
        underWallets.push(wallet);
      } else {
        if (idNum > 0 && seenUpperIds.has(idNum)) continue;
        if (idNum > 0) seenUpperIds.add(idNum);
        upperWallets.push(wallet);
      }
    }
  } else {
    const upper = input.comboLiveStatus;
    if (upper && (upper.remainingSessions > 0 || upper.isExpired || upper.isComboLive)) {
      const evalUpper = evaluateComboWalletStatus({
        normalRemaining: upper.normalRemaining,
        retainRemaining: upper.retainRemaining,
        remainingSessions: upper.remainingSessions,
        dateExpired: upper.isFrozen ? null : upper.dateExpired,
        todayYmd,
      });
      const fallbackNorm =
        upper.normalRemaining !== undefined
          ? Number(upper.normalRemaining)
          : Math.max(0, Math.floor(Number(upper.remainingSessions || 0) / 2));
      const fallbackRetain =
        upper.retainRemaining !== undefined
          ? Number(upper.retainRemaining)
          : Math.max(0, Number(upper.remainingSessions || 0) - fallbackNorm);
      upperWallets.push({
        balanceId: Number(upper.balanceId || 0),
        serviceGroup: 'upper',
        comboName: upper.comboName || 'Gói Combo Mi Trên',
        serviceKey: upper.serviceKey,
        packageKey: upper.packageKey,
        normalRemaining: fallbackNorm,
        retainRemaining: fallbackRetain,
        remainingSessions: Number(upper.remainingSessions || fallbackNorm + fallbackRetain),
        dateExpired: upper.isFrozen ? null : (upper.dateExpired ?? evalUpper.dateExpired),
        isFrozen: Boolean(upper.isFrozen ?? evalUpper.isFrozen),
        isExpired: Boolean(upper.isExpired ?? evalUpper.isExpired),
        isExpiringSoon: Boolean(upper.isExpiringSoon ?? evalUpper.isExpiringSoon),
        daysRemaining: upper.daysRemaining !== undefined ? upper.daysRemaining : evalUpper.daysRemaining,
        avgDaysPerSession:
          upper.avgDaysPerSession !== undefined ? upper.avgDaysPerSession : evalUpper.avgDaysPerSession,
        expiryState: upper.expiryState || evalUpper.expiryState,
        retainDaysLimit: upper.retainDaysLimit ?? 25,
      });
    }

    const under = input.underMinkComboStatus;
    if (under && (under.remainingSessions > 0 || under.isExpired || under.hasUnderCombo)) {
      const evalUnder = evaluateComboWalletStatus({
        normalRemaining: under.normalRemaining,
        retainRemaining: under.retainRemaining,
        remainingSessions: under.remainingSessions,
        dateExpired: under.isFrozen ? null : under.dateExpired,
        todayYmd,
      });
      underWallets.push({
        balanceId: Number(under.balanceId || 0),
        serviceGroup: 'under',
        comboName: under.comboName || 'Gói Combo Mi Dưới',
        normalRemaining: Number(under.normalRemaining || 0),
        retainRemaining: Number(under.retainRemaining || 0),
        remainingSessions: Number(under.remainingSessions || 0),
        dateExpired: under.isFrozen ? null : (under.dateExpired ?? evalUnder.dateExpired),
        isFrozen: Boolean(under.isFrozen ?? evalUnder.isFrozen),
        isExpired: Boolean(under.isExpired ?? evalUnder.isExpired),
        isExpiringSoon: Boolean(under.isExpiringSoon ?? evalUnder.isExpiringSoon),
        daysRemaining: under.daysRemaining !== undefined ? under.daysRemaining : evalUnder.daysRemaining,
        avgDaysPerSession:
          under.avgDaysPerSession !== undefined ? under.avgDaysPerSession : evalUnder.avgDaysPerSession,
        expiryState: under.expiryState || evalUnder.expiryState,
      });
    }
  }

  const sortedUpperWallets = sortWalletsFefo(upperWallets);
  const sortedUnderWallets = sortWalletsFefo(underWallets);
  const liveUpperWallets = sortedUpperWallets.filter((w) => !w.isExpired && w.remainingSessions > 0);
  const liveUnderWallets = sortedUnderWallets.filter((w) => !w.isExpired && w.remainingSessions > 0);

  const suggestedUpper = pickSuggestedLiveWallet({
    liveWallets: liveUpperWallets,
    bookedServiceName: input.bookedServiceName,
    lastVisitServiceKey: input.lastVisitServiceKey,
  });
  const suggestedUnder = pickSuggestedLiveWallet({
    liveWallets: liveUnderWallets,
    bookedServiceName: null,
    lastVisitServiceKey: null,
  });

  const skipUpperCombo = Boolean(input.skipUpperCombo);
  const skipUnderCombo = Boolean(input.skipUnderCombo);

  let activeUpperWallet: IosCustomerComboWalletItem | null;
  let displayUpperWallet: IosCustomerComboWalletItem | null;
  if (skipUpperCombo) {
    activeUpperWallet = null;
    displayUpperWallet = suggestedUpper || sortedUpperWallets[0] || null;
  } else if (input.selectedUpperComboBalanceId && Number(input.selectedUpperComboBalanceId) > 0) {
    const matched = sortedUpperWallets.find((w) => Number(w.balanceId) === Number(input.selectedUpperComboBalanceId));
    if (matched) {
      displayUpperWallet = matched;
      activeUpperWallet = !matched.isExpired && matched.remainingSessions > 0 ? matched : null;
    } else {
      activeUpperWallet = suggestedUpper;
      displayUpperWallet = suggestedUpper || sortedUpperWallets[0] || null;
    }
  } else {
    activeUpperWallet = suggestedUpper;
    displayUpperWallet = suggestedUpper || sortedUpperWallets[0] || null;
  }

  let activeUnderWallet: IosCustomerComboWalletItem | null;
  let displayUnderWallet: IosCustomerComboWalletItem | null;
  if (skipUnderCombo) {
    activeUnderWallet = null;
    displayUnderWallet = suggestedUnder || sortedUnderWallets[0] || null;
  } else if (input.selectedUnderComboBalanceId && Number(input.selectedUnderComboBalanceId) > 0) {
    const matched = sortedUnderWallets.find((w) => Number(w.balanceId) === Number(input.selectedUnderComboBalanceId));
    if (matched) {
      displayUnderWallet = matched;
      activeUnderWallet = !matched.isExpired && matched.remainingSessions > 0 ? matched : null;
    } else {
      activeUnderWallet = suggestedUnder;
      displayUnderWallet = suggestedUnder || sortedUnderWallets[0] || null;
    }
  } else {
    activeUnderWallet = suggestedUnder;
    displayUnderWallet = suggestedUnder || sortedUnderWallets[0] || null;
  }

  const isRedeemingUpperToday = Boolean(activeUpperWallet);
  const isRedeemingUnderToday = Boolean(activeUnderWallet);

  const effectiveComboLiveStatus: ResolveActiveBookingComboWalletsResult['effectiveComboLiveStatus'] = activeUpperWallet
    ? {
        balanceId: activeUpperWallet.balanceId > 0 ? activeUpperWallet.balanceId : input.comboLiveStatus?.balanceId,
        isComboLive: true,
        remainingSessions: activeUpperWallet.remainingSessions,
        normalRemaining: hasExplicitWalletList || upperExplicitSplit ? activeUpperWallet.normalRemaining : undefined,
        retainRemaining: hasExplicitWalletList || upperExplicitSplit ? activeUpperWallet.retainRemaining : undefined,
        comboName: activeUpperWallet.comboName,
        serviceKey: activeUpperWallet.serviceKey,
        packageKey: activeUpperWallet.packageKey,
        retainDaysLimit: activeUpperWallet.retainDaysLimit ?? 25,
        upsellOpportunity: activeUpperWallet.remainingSessions <= 2 || activeUpperWallet.isExpiringSoon,
        dateExpired: activeUpperWallet.dateExpired,
        isExpired: false,
        isFrozen: activeUpperWallet.isFrozen,
        isExpiringSoon: activeUpperWallet.isExpiringSoon,
        daysRemaining: activeUpperWallet.daysRemaining,
        avgDaysPerSession: activeUpperWallet.avgDaysPerSession,
        expiryState: activeUpperWallet.expiryState,
      }
    : displayUpperWallet && !skipUpperCombo
      ? {
          balanceId: displayUpperWallet.balanceId > 0 ? displayUpperWallet.balanceId : input.comboLiveStatus?.balanceId,
          isComboLive: false,
          remainingSessions: displayUpperWallet.remainingSessions,
          normalRemaining: hasExplicitWalletList || upperExplicitSplit ? displayUpperWallet.normalRemaining : undefined,
          retainRemaining: hasExplicitWalletList || upperExplicitSplit ? displayUpperWallet.retainRemaining : undefined,
          comboName: displayUpperWallet.comboName,
          serviceKey: displayUpperWallet.serviceKey,
          packageKey: displayUpperWallet.packageKey,
          retainDaysLimit: displayUpperWallet.retainDaysLimit ?? 25,
          upsellOpportunity: true,
          dateExpired: displayUpperWallet.dateExpired,
          isExpired: displayUpperWallet.isExpired,
          isFrozen: displayUpperWallet.isFrozen,
          isExpiringSoon: displayUpperWallet.isExpiringSoon,
          daysRemaining: displayUpperWallet.daysRemaining,
          avgDaysPerSession: displayUpperWallet.avgDaysPerSession,
          expiryState: displayUpperWallet.expiryState,
        }
      : {
          isComboLive: false,
          remainingSessions: 0,
          normalRemaining: 0,
          retainRemaining: 0,
          comboName: 'Chưa có gói ❖ Live',
          retainDaysLimit: 21,
          upsellOpportunity: true,
        };

  const effectiveUnderMinkComboStatus: ResolveActiveBookingComboWalletsResult['effectiveUnderMinkComboStatus'] =
    activeUnderWallet
      ? {
          balanceId:
            activeUnderWallet.balanceId > 0 ? activeUnderWallet.balanceId : input.underMinkComboStatus?.balanceId,
          hasUnderCombo: true,
          remainingSessions: activeUnderWallet.remainingSessions,
          normalRemaining: activeUnderWallet.normalRemaining,
          retainRemaining: activeUnderWallet.retainRemaining,
          comboName: activeUnderWallet.comboName,
          packageKey: activeUnderWallet.packageKey,
          dateExpired: activeUnderWallet.dateExpired,
          isExpired: false,
          isFrozen: activeUnderWallet.isFrozen,
          isExpiringSoon: activeUnderWallet.isExpiringSoon,
          daysRemaining: activeUnderWallet.daysRemaining,
          avgDaysPerSession: activeUnderWallet.avgDaysPerSession,
          expiryState: activeUnderWallet.expiryState,
        }
      : displayUnderWallet && !skipUnderCombo
        ? {
            balanceId:
              displayUnderWallet.balanceId > 0 ? displayUnderWallet.balanceId : input.underMinkComboStatus?.balanceId,
            hasUnderCombo: false,
            remainingSessions: displayUnderWallet.remainingSessions,
            normalRemaining: displayUnderWallet.normalRemaining,
            retainRemaining: displayUnderWallet.retainRemaining,
            comboName: displayUnderWallet.comboName,
            packageKey: displayUnderWallet.packageKey,
            dateExpired: displayUnderWallet.dateExpired,
            isExpired: displayUnderWallet.isExpired,
            isFrozen: displayUnderWallet.isFrozen,
            isExpiringSoon: displayUnderWallet.isExpiringSoon,
            daysRemaining: displayUnderWallet.daysRemaining,
            avgDaysPerSession: displayUnderWallet.avgDaysPerSession,
            expiryState: displayUnderWallet.expiryState,
          }
        : undefined;

  return {
    allWallets: [...sortedUpperWallets, ...sortedUnderWallets],
    upperWallets: sortedUpperWallets,
    underWallets: sortedUnderWallets,
    liveUpperWallets,
    liveUnderWallets,
    activeUpperWallet,
    activeUnderWallet,
    displayUpperWallet,
    displayUnderWallet,
    selectedUpperComboBalanceId: skipUpperCombo
      ? null
      : activeUpperWallet && activeUpperWallet.balanceId > 0
        ? activeUpperWallet.balanceId
        : null,
    selectedUnderComboBalanceId: skipUnderCombo
      ? null
      : activeUnderWallet && activeUnderWallet.balanceId > 0
        ? activeUnderWallet.balanceId
        : null,
    skipUpperCombo,
    skipUnderCombo,
    isRedeemingUpperToday,
    isRedeemingUnderToday,
    hasAnyLiveUpperWallet: liveUpperWallets.length > 0,
    hasAnyLiveUnderWallet: liveUnderWallets.length > 0,
    effectiveComboLiveStatus,
    effectiveUnderMinkComboStatus,
  };
}
