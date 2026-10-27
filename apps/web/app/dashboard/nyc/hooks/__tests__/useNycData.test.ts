import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNycData, DEFAULT_NYC_TAB_CONFIGS, TAB_KEYS } from '../useNycData';
import { apiClient } from '../../../../../lib/api-client';

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    nyc: {
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
    },
    customers: {
      getStaff: vi.fn(),
      getNycStats: vi.fn(),
      list: vi.fn(),
      assign: vi.fn(),
    },
    plans: {
      listToday: vi.fn(),
      create: vi.fn(),
    },
    kpi: {
      getSummary: vi.fn(),
    },
  },
}));

vi.mock('../../../../../context/OmiCallContext', () => ({
  useOmiCall: () => ({
    makeCall: vi.fn(),
  }),
}));

describe('useNycData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('exports valid DEFAULT_NYC_TAB_CONFIGS matching TAB_KEYS', () => {
    for (const tab of TAB_KEYS) {
      expect(DEFAULT_NYC_TAB_CONFIGS[tab.id]).toBeDefined();
      expect(Array.isArray(DEFAULT_NYC_TAB_CONFIGS[tab.id])).toBe(true);
      expect(DEFAULT_NYC_TAB_CONFIGS[tab.id].length).toBeGreaterThan(0);
    }
  });

  it('initializes with default configs and fetches customer list even if getConfig rejects', async () => {
    vi.mocked(apiClient.nyc.getConfig).mockRejectedValueOnce(new Error('403 Forbidden'));
    vi.mocked(apiClient.customers.getNycStats).mockResolvedValueOnce({
      tabs: { NYC_30: 10, NYC_60: 5 },
      touchpoints: { now: 2 },
    } as never);
    vi.mocked(apiClient.customers.list).mockResolvedValueOnce({
      data: [{ id: 1, name: 'Khách A' }],
      pagination: { total: 1, page: 1, limit: 20, pages: 1 },
    } as never);
    vi.mocked(apiClient.plans.listToday).mockResolvedValueOnce([] as never);
    vi.mocked(apiClient.kpi.getSummary).mockResolvedValueOnce({
      totalCalled: 0,
      totalPlanned: 0,
      totalBooked: 0,
    } as never);

    const { result } = renderHook(() => useNycData());

    await waitFor(() => {
      expect(result.current.customers).toHaveLength(1);
      expect(result.current.total).toBe(1);
    });

    expect(result.current.configs).toEqual(DEFAULT_NYC_TAB_CONFIGS);
  });

  it('sets assignedStaffId to "me" for telesales and booker roles', async () => {
    localStorage.setItem(
      'mos_user',
      JSON.stringify({ id: 22, role: 'telesales', displayName: 'Bích Phượng' })
    );

    vi.mocked(apiClient.nyc.getConfig).mockResolvedValueOnce(DEFAULT_NYC_TAB_CONFIGS as never);
    vi.mocked(apiClient.customers.getNycStats).mockResolvedValue({
      tabs: { NYC_30: 5 },
      touchpoints: {},
    } as never);
    vi.mocked(apiClient.customers.list).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    } as never);
    vi.mocked(apiClient.plans.listToday).mockResolvedValue([] as never);
    vi.mocked(apiClient.kpi.getSummary).mockResolvedValue({} as never);

    const { result } = renderHook(() => useNycData());

    await waitFor(() => {
      expect(result.current.assignedStaffId).toBe('me');
    });
  });
});
