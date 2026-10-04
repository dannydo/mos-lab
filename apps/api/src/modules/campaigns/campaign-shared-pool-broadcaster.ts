export interface SharedPoolBroadcastEvent {
  type:
    | 'CONNECTED'
    | 'CUSTOMER_CLAIMED'
    | 'CUSTOMER_RELEASED'
    | 'CUSTOMERS_RELEASED'
    | 'CUSTOMER_STATUS_UPDATED'
    | 'BATCH_ADVANCED'
    | 'POOL_PAUSED'
    | 'POOL_RESUMED'
    | 'OVERVIEW_UPDATED';
  campaignId?: number;
  customerId?: number;
  customerIds?: number[];
  legacyUserId?: number;
  claimedByStaffId?: number | null;
  claimedByStaffName?: string | null;
  claimExpiresAt?: string | null;
  poolStatus?: string;
  currentBatchNumber?: number;
  reason?: string;
  timestamp?: string;
}

export class SharedPoolBroadcaster {
  private static socketsByCampaign = new Map<number, Set<any>>();

  static register(campaignId: number, socket: any): void {
    if (!this.socketsByCampaign.has(campaignId)) {
      this.socketsByCampaign.set(campaignId, new Set());
    }
    this.socketsByCampaign.get(campaignId)!.add(socket);
  }

  static unregister(campaignId: number, socket: any): void {
    const set = this.socketsByCampaign.get(campaignId);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        this.socketsByCampaign.delete(campaignId);
      }
    }
  }

  static broadcast(campaignId: number, event: SharedPoolBroadcastEvent): void {
    const set = this.socketsByCampaign.get(campaignId);
    if (!set || set.size === 0) return;
    const payload = JSON.stringify({
      ...event,
      campaignId,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    for (const socket of set) {
      try {
        if (socket.readyState === 1 /* OPEN */) {
          socket.send(payload);
        }
      } catch {
        set.delete(socket);
      }
    }
  }

  static getActiveSubscriberCount(campaignId: number): number {
    return this.socketsByCampaign.get(campaignId)?.size || 0;
  }
}
