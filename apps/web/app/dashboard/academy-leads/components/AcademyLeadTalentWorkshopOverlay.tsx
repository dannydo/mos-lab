'use client';

import React from 'react';
import AcademyTalentWorkshopDrawer from './AcademyTalentWorkshopDrawer';

type TalentDrawerProps = React.ComponentProps<typeof AcademyTalentWorkshopDrawer>;

export interface AcademyLeadTalentWorkshopOverlayProps extends Omit<
  TalentDrawerProps,
  'canEditLadder' | 'canManageCourses' | 'canConfirmPayment'
> {
  canManage: boolean;
  canManageRestricted: boolean;
}

export default function AcademyLeadTalentWorkshopOverlay({
  canManage,
  canManageRestricted,
  ...props
}: AcademyLeadTalentWorkshopOverlayProps) {
  return (
    <AcademyTalentWorkshopDrawer
      {...props}
      canEditLadder={canManageRestricted}
      canManageCourses={canManage}
      canConfirmPayment={canManageRestricted}
    />
  );
}
