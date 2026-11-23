import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCustomerList } from '../useCustomerList';
import { apiClient } from '../../../../../lib/api-client';

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    customers: {
      list: vi.fn(),
      getStats: vi.fn(),
    },
  },
}));

describe('useCustomerList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.customers.list).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 },
    } as never);
    vi.mocked(apiClient.customers.getStats).mockResolvedValue({
      total: 0,
      comboLive: 0,
      comboDead: 0,
      single: 0,
      notComboLive: 0,
      comboElsa: 0,
      hsd30: 0,
      lsd1: 0,
    } as never);
  });

  it('forwards all server-side filter params including isForeign to both list and stats APIs', async () => {
    const optionsRef = {
      current: { onSuccess: vi.fn(), onError: vi.fn(), onInfo: vi.fn(), onWarning: vi.fn() },
    };

    const filterParams = {
      activeTab: 'NOT_COMBO_LIVE',
      searchQuery: '0901',
      showTrash: false,
      sortField: 'totalSpent_desc',
      isForeign: 'foreign',
      dobMonth: 5,
      ageMin: 25,
      ageMax: 35,
      callStatuses: 'BUSY,NOT_CALLED',
      campaignId: '12',
      campaignFilterMode: 'NOT_IN',
      promoUsed: 'all',
      referralUsed: 'all',
      assignedStaffId: 'all',
    };

    renderHook(() =>
      useCustomerList(filterParams, null, optionsRef, { id: 1, role: 'admin', displayName: 'Admin' } as never)
    );

    await waitFor(() => {
      expect(apiClient.customers.list).toHaveBeenCalledTimes(1);
      expect(apiClient.customers.getStats).toHaveBeenCalledTimes(1);
    });

    expect(apiClient.customers.list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: '1',
        limit: '20',
        sort: 'totalSpent_desc',
        bucket: 'NOT_COMBO_LIVE',
        search: '0901',
        isForeign: 'foreign',
        dobMonth: '5',
        ageMin: '25',
        ageMax: '35',
        callStatuses: 'BUSY,NOT_CALLED',
        campaignId: '12',
        campaignFilterMode: 'NOT_IN',
      }),
      expect.any(Object)
    );

    expect(apiClient.customers.getStats).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '0901',
        isForeign: 'foreign',
        dobMonth: '5',
        ageMin: '25',
        ageMax: '35',
        callStatuses: 'BUSY,NOT_CALLED',
        campaignId: '12',
        campaignFilterMode: 'NOT_IN',
      }),
      expect.any(Object)
    );
  });

  it('resets currentPage to 1 and re-queries the backend when filterParams change on page > 1', async () => {
    const optionsRef = {
      current: { onSuccess: vi.fn(), onError: vi.fn(), onInfo: vi.fn(), onWarning: vi.fn() },
    };

    const initialFilters = {
      activeTab: 'ALL',
      searchQuery: '',
      showTrash: false,
      sortField: 'id_desc',
      promoUsed: 'all',
      referralUsed: 'all',
      assignedStaffId: 'all',
    };

    const { result, rerender } = renderHook(
      ({ filters }) =>
        useCustomerList(filters, null, optionsRef, { id: 1, role: 'admin', displayName: 'Admin' } as never),
      { initialProps: { filters: initialFilters } }
    );

    await waitFor(() => {
      expect(apiClient.customers.list).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.setCurrentPage(3);
    });

    await waitFor(() => {
      expect(apiClient.customers.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: '3' }),
        expect.any(Object)
      );
    });

    rerender({
      filters: {
        ...initialFilters,
        isForeign: 'foreign',
      } as typeof initialFilters & { isForeign: string },
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
      expect(apiClient.customers.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: '1', isForeign: 'foreign' }),
        expect.any(Object)
      );
    });
  });
});
