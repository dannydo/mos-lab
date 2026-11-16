'use client';

import React from 'react';
import type { IosSimulationMenteeOption } from '@mos-lab/shared';
import { ActiveActorProfile, IosUserRole, IosBranchConfig } from '../../state/useIosAppState';
import { UnifiedProfileSheet } from '../../../../components/profile/UnifiedProfileSheet';

interface IosProfileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actor: ActiveActorProfile;
  role: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange?: (role: IosUserRole) => void;
  onOpenPaystub?: () => void;
  onOpenChat?: () => void;
  onOpenCareer?: () => void;
  onLogout?: () => void;
  currentBranch?: IosBranchConfig;
  selectedStoreId?: number;
  onSelectBranch?: (storeId: number) => void;
  availableBranches?: IosBranchConfig[];
  isAdmin?: boolean;
  isSimulationMode?: boolean;
  onToggleSimulationMode?: () => void;
  menteesList?: IosSimulationMenteeOption[];
  selectedMenteeStaffId?: number;
  onSelectMentee?: (staffId: number | undefined) => void;
  onOpenCreateBooking?: () => void;
}

export function IosProfileMenuSheet({
  isOpen,
  onClose,
  actor,
  role,
  canSwitchRole = false,
  onRoleChange,
  onOpenPaystub,
  onLogout,
  currentBranch,
  selectedStoreId = 6,
  onSelectBranch,
  availableBranches = [],
  isAdmin = false,
  isSimulationMode = false,
  onToggleSimulationMode,
  menteesList = [],
  selectedMenteeStaffId,
  onSelectMentee,
  onOpenCreateBooking,
}: IosProfileMenuSheetProps) {
  return (
    <UnifiedProfileSheet
      open={isOpen}
      onClose={onClose}
      appContext="ios"
      actor={actor}
      iosRole={role}
      canSwitchRole={canSwitchRole}
      onRoleChange={onRoleChange}
      onOpenPaystub={onOpenPaystub}
      onLogout={onLogout}
      currentBranch={currentBranch}
      selectedStoreId={selectedStoreId}
      onSelectBranch={onSelectBranch}
      availableBranches={availableBranches}
      isAdmin={isAdmin}
      isSimulationMode={isSimulationMode}
      onToggleSimulationMode={onToggleSimulationMode}
      menteesList={menteesList}
      selectedMenteeStaffId={selectedMenteeStaffId}
      onSelectMentee={onSelectMentee}
      onOpenCreateBooking={onOpenCreateBooking}
    />
  );
}
