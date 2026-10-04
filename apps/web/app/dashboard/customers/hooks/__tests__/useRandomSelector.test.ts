import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRandomSelector } from '../useRandomSelector';
import { apiClient } from '../../../../../lib/api-client';

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    customers: {
      getRandomIds: vi.fn(),
    },
  },
}));

describe('useRandomSelector', () => {
  it('forwards campaignId and campaignFilterMode to getRandomIds when filtered', async () => {
    const getRandomIdsMock = vi.mocked(apiClient.customers.getRandomIds);
    getRandomIdsMock.mockResolvedValueOnce({ ids: [101, 102], batchId: 'batch_test' } as never);

    const onSelected = vi.fn();
    const optionsRef = {
      current: {
        onSuccess: vi.fn(),
        onError: vi.fn(),
        onWarning: vi.fn(),
      },
    };

    const filterParams = {
      activeTab: 'ALL',
      campaignId: '31',
      campaignFilterMode: 'NOT_IN',
      searchQuery: 'Lan',
      isForeign: 'foreign',
      dobMonth: '10',
      birthdayPreset: 'this_month',
      ageMin: 20,
      ageMax: 40,
    };

    const { result } = renderHook(() =>
      useRandomSelector(filterParams, optionsRef as never, onSelected)
    );

    act(() => {
      result.current.setRandomCount(500);
    });

    await act(async () => {
      await result.current.handleRandomSelect();
    });

    expect(getRandomIdsMock).toHaveBeenCalledTimes(1);
    const calledParams = getRandomIdsMock.mock.calls[0][0];

    expect(calledParams).toMatchObject({
      limit: '500',
      campaignId: '31',
      campaignFilterMode: 'NOT_IN',
      search: 'Lan',
      isForeign: 'foreign',
      dobMonth: '10',
      birthdayPreset: 'this_month',
      ageMin: '20',
      ageMax: '40',
      excludeAssigned: 'true',
    });

    expect(onSelected).toHaveBeenCalledWith([101, 102]);
    expect(result.current.randomSelectedIds).toEqual([101, 102]);
    expect(result.current.randomBatchId).toBe('batch_test');
  });
});
