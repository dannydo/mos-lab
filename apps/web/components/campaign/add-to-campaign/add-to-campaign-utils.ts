import type { AddCampaignCustomersResponse, AddCustomerDetail } from '@mos-lab/shared';

export type AddToCampaignStatusFilter = 'ALL' | 'ADDED' | 'SKIPPED';

export interface SkippedCampaignGroup {
  id: number;
  name: string;
  items: AddCustomerDetail[];
}

export function groupSkippedCustomersByCampaign(
  details: AddCustomerDetail[],
  selectedCampaignId: number | null
): SkippedCampaignGroup[] {
  const map = new Map<number, SkippedCampaignGroup>();
  details.forEach((d) => {
    if (d.status === 'SKIPPED' && d.currentCampaignId && d.currentCampaignId !== selectedCampaignId) {
      const existing = map.get(d.currentCampaignId);
      if (existing) {
        existing.items.push(d);
      } else {
        map.set(d.currentCampaignId, {
          id: d.currentCampaignId,
          name: d.currentCampaignName || `Chiến dịch #${d.currentCampaignId}`,
          items: [d],
        });
      }
    }
  });
  return Array.from(map.values());
}

export function filterAddCustomerDetails(
  details: AddCustomerDetail[],
  statusFilter: AddToCampaignStatusFilter,
  searchQuery: string
): AddCustomerDetail[] {
  return details.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) {
      return false;
    }
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      const matchName = d.customerName.toLowerCase().includes(query);
      const matchPhone = d.customerPhone ? d.customerPhone.includes(query) : false;
      const matchId = String(d.legacyUserId).includes(query);
      return matchName || matchPhone || matchId;
    }
    return true;
  });
}

export function markCustomersTransferredInResult(
  prev: AddCampaignCustomersResponse | null,
  transferredIds: number[],
  forceAllAdded = false
): AddCampaignCustomersResponse | null {
  if (!prev) return null;
  const updatedDetails = prev.details.map((d) =>
    transferredIds.includes(d.legacyUserId) ? { ...d, status: 'ADDED' as const, reason: undefined } : d
  );
  if (forceAllAdded) {
    return {
      ...prev,
      addedCount: prev.details.length,
      skippedCount: 0,
      details: updatedDetails,
    };
  }
  const addedCount = updatedDetails.filter((d) => d.status === 'ADDED').length;
  const skippedCount = updatedDetails.filter((d) => d.status === 'SKIPPED').length;
  return {
    ...prev,
    addedCount,
    skippedCount,
    details: updatedDetails,
  };
}
