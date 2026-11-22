export const ACTIVE_TAB_STORAGE_KEY = 'mos_customers_active_tab';

/** Resolves initial customer tab from query parameter or persisted localStorage value. */
export function readInitialActiveTab(tabParam?: string | null): string {
  if (tabParam) return tabParam;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return stored || 'ALL';
  }
  return 'ALL';
}

/** Parses optional batchId query parameter into a valid integer identifier. */
export function parseInitialBatchId(batchIdParam?: string | null): number | undefined {
  if (batchIdParam) {
    const parsed = parseInt(batchIdParam, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

/** Persists active customer tab preference in browser localStorage when available. */
export function persistActiveTab(tab: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  }
}

/** Synchronizes activeTab and selectedBatchId with URL query params via replaceState for F5 persistence. */
export function syncFilterUrlParams(activeTab: string, selectedBatchId?: number): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  let changed = false;

  if (activeTab && activeTab !== 'ALL') {
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      changed = true;
    }
  } else if (params.has('tab')) {
    params.delete('tab');
    changed = true;
  }

  if (selectedBatchId && activeTab === 'ALLOCATION') {
    if (params.get('batchId') !== String(selectedBatchId)) {
      params.set('batchId', String(selectedBatchId));
      changed = true;
    }
  } else if (params.has('batchId')) {
    params.delete('batchId');
    changed = true;
  }

  if (changed) {
    const queryStr = params.toString();
    const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }
}

/** Resets stored customer tab to ALL and removes tab/batchId parameters from the browser URL. */
export function clearBatchAndTabUrlParams(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, 'ALL');
    const params = new URLSearchParams(window.location.search);
    params.delete('batchId');
    params.delete('tab');
    const queryStr = params.toString();
    const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }
}
