import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IosBranchSelectorSheet } from '../IosBranchSelectorSheet';
import { IOS_AVAILABLE_BRANCHES, resolveActorProfile } from '../../../state/useIosAppState';

describe('IosBranchSelectorSheet', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <IosBranchSelectorSheet
        isOpen={false}
        onClose={vi.fn()}
        selectedStoreId={6}
        onSelectBranch={vi.fn()}
        availableBranches={IOS_AVAILABLE_BRANCHES}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders available branches and handles selection', () => {
    const handleSelectBranch = vi.fn();
    const handleClose = vi.fn();

    render(
      <IosBranchSelectorSheet
        isOpen={true}
        onClose={handleClose}
        selectedStoreId={6}
        onSelectBranch={handleSelectBranch}
        availableBranches={IOS_AVAILABLE_BRANCHES}
      />
    );

    // Verify branch options are displayed
    expect(screen.getByText('Chi nhánh Đề Thám')).toBeDefined();
    expect(screen.getByText('Chi nhánh Estella Place')).toBeDefined();
    expect(screen.getByText('DT')).toBeDefined();
    expect(screen.getByText('EP')).toBeDefined();

    // Active branch has 'Đang xem' badge
    expect(screen.getByText('Đang xem')).toBeDefined();

    // Click on Estella Place branch
    fireEvent.click(screen.getByText('Chi nhánh Estella Place'));

    expect(handleSelectBranch).toHaveBeenCalledWith(16);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking close or cancel button', () => {
    const handleClose = vi.fn();

    render(
      <IosBranchSelectorSheet
        isOpen={true}
        onClose={handleClose}
        selectedStoreId={6}
        onSelectBranch={vi.fn()}
        availableBranches={IOS_AVAILABLE_BRANCHES}
      />
    );

    fireEvent.click(screen.getByText('Đóng'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('verifies technician and CC profiles (Khanh Cao CVL, Tuyết Nhi CV, Yến Vy CC) anchor to their assigned branches', () => {
    // 1. Khanh Cao as CVL -> Đề Thám (6)
    const khanhCaoActor = resolveActorProfile('CVL', {
      displayName: 'Khanh Cao',
      legacyStaffId: 13783,
      role: 'cv_plus',
    });
    expect(khanhCaoActor.storeId).toBe(6);
    expect(khanhCaoActor.branchCode).toBe('DT');
    expect(khanhCaoActor.branchName).toBe('Chi nhánh Đề Thám');

    // 2. Tuyết Nhi is regular CV (role lt), NOT CVLL -> Đề Thám (6)
    const tuyetNhiActor = resolveActorProfile('CV', {
      displayName: 'Tuyết Nhi ❤️',
      legacyStaffId: 25337,
      role: 'lt',
      clientStoreId: 6,
    });
    expect(tuyetNhiActor.tier).toBe('CV');
    expect(tuyetNhiActor.storeId).toBe(6);
    expect(tuyetNhiActor.branchCode).toBe('DT');
    expect(tuyetNhiActor.branchName).toBe('Chi nhánh Đề Thám');

    // 3. Yến Vy as CC at Estella Place -> Estella (16)
    const yenVyActor = resolveActorProfile('CC', {
      displayName: 'Yến Vy',
      legacyStaffId: 48026,
      role: 'cc',
      clientStoreId: 16,
    });
    expect(yenVyActor.tier).toBe('CC');
    expect(yenVyActor.staffId).toBe(48026);
    expect(yenVyActor.storeId).toBe(16);
    expect(yenVyActor.branchCode).toBe('EP');
    expect(yenVyActor.branchName).toBe('Chi nhánh Estella Place');
  });
});
