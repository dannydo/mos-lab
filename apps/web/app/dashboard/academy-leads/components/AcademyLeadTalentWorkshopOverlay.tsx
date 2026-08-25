'use client';

import React from 'react';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import AcademyTalentWorkshopDrawer from './AcademyTalentWorkshopDrawer';

type TalentDrawerProps = React.ComponentProps<typeof AcademyTalentWorkshopDrawer>;

export interface AcademyLeadTalentWorkshopOverlayProps extends Omit<
  TalentDrawerProps,
  'canEditLadder' | 'canManageCourses' | 'canConfirmPayment'
> {
  role: string;
}

export default function AcademyLeadTalentWorkshopOverlay({ role, ...props }: AcademyLeadTalentWorkshopOverlayProps) {
  const canManage = isAdminOrSuperAdminRole(role);
  return (
    <AcademyTalentWorkshopDrawer
      {...props}
      canEditLadder={canManage}
      canManageCourses={canManage}
      canConfirmPayment={canManage || role === 'manager'}
    />
  );
}
