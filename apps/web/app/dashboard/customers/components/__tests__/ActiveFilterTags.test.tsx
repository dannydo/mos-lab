import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActiveFilterTags from '../filters/ActiveFilterTags';

describe('ActiveFilterTags Campaign Filter', () => {
  const dummyCampaigns = [
    { id: 10, name: 'Chiến dịch Mùa Hè 2026' },
    { id: 20, name: 'Chiến dịch Tri Ân VIP' },
  ];

  it('renders campaign tag with "Thuộc" when mode is IN', () => {
    const onClearFilter = vi.fn();
    render(
      <ActiveFilterTags
        hasActiveFilters={true}
        filterParams={{
          campaignId: 10,
          campaignFilterMode: 'IN',
        }}
        campaignList={dummyCampaigns}
        onClearFilter={onClearFilter}
      />
    );

    const tag = screen.getByText(/Chiến dịch: Chiến dịch Mùa Hè 2026 \(Thuộc\)/i);
    expect(tag).toBeDefined();
  });

  it('renders campaign tag with "Chưa từng thuộc" when mode is NOT_IN', () => {
    const onClearFilter = vi.fn();
    render(
      <ActiveFilterTags
        hasActiveFilters={true}
        filterParams={{
          campaignId: 20,
          campaignFilterMode: 'NOT_IN',
        }}
        campaignList={dummyCampaigns}
        onClearFilter={onClearFilter}
      />
    );

    const tag = screen.getByText(/Chiến dịch: Chiến dịch Tri Ân VIP \(Chưa từng thuộc\)/i);
    expect(tag).toBeDefined();
  });

  it('calls onClearFilter with "campaignId" when close button is clicked', () => {
    const onClearFilter = vi.fn();
    const { container } = render(
      <ActiveFilterTags
        hasActiveFilters={true}
        filterParams={{
          campaignId: 10,
          campaignFilterMode: 'IN',
        }}
        campaignList={dummyCampaigns}
        onClearFilter={onClearFilter}
      />
    );

    const tagText = screen.getByText(/Chiến dịch: Chiến dịch Mùa Hè 2026/i);
    const tag = tagText.closest('.ant-tag');
    const closeBtn = tag?.querySelector('.ant-tag-close-icon');
    expect(closeBtn).toBeDefined();
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClearFilter).toHaveBeenCalledWith('campaignId');
    }
  });
});
