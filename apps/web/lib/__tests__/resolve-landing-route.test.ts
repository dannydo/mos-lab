import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSidebarVisibility = vi.hoisted(() => vi.fn());

vi.mock('../api-client', () => ({
  apiClient: { menuAccess: { getSidebarVisibility } },
}));

import { resolveRoleLandingRoute } from '../resolve-landing-route';

describe('resolveRoleLandingRoute', () => {
  beforeEach(() => {
    getSidebarVisibility.mockReset();
  });

  it('skips the visibility request for admin, CV and CC roles', async () => {
    expect(await resolveRoleLandingRoute({ role: 'super_admin' })).toBe('/dashboard');
    expect(await resolveRoleLandingRoute({ role: 'cvl' })).toBe('/dashboard/cv');
    expect(await resolveRoleLandingRoute({ role: 'cc' })).toBe('/ios-app');
    expect(getSidebarVisibility).not.toHaveBeenCalled();
  });

  it('lands telesales on the personal target page when it is visible', async () => {
    getSidebarVisibility.mockResolvedValue({ data: { visibility: { 'telesale-target': true, today: true } } });
    expect(await resolveRoleLandingRoute({ role: 'telesales' })).toBe('/dashboard/telesale-target');
  });

  it('falls back to the first allowed menu entry when the landing page is hidden', async () => {
    getSidebarVisibility.mockResolvedValue({ data: { visibility: { 'cs-hub': false, today: true } } });
    expect(await resolveRoleLandingRoute({ role: 'cs' })).toBe('/dashboard/today');
  });

  it('uses mOS Chat when nothing is allowed and never the Operations Center', async () => {
    getSidebarVisibility.mockResolvedValue({ data: { visibility: { today: false } } });
    expect(await resolveRoleLandingRoute({ role: 'hr' })).toBe('/dashboard/chat');
    expect(await resolveRoleLandingRoute({ role: 'new_role' })).toBe('/dashboard/chat');
  });

  it('keeps the preferred route when the visibility request fails', async () => {
    getSidebarVisibility.mockRejectedValue(new Error('network'));
    expect(await resolveRoleLandingRoute({ role: 'qa_qc' })).toBe('/dashboard/qa-shop');
    expect(await resolveRoleLandingRoute({ role: 'accountant' })).toBe('/dashboard/finance/cash-flow');
  });
});
