'use client';

import React from 'react';
import { Briefcase, GraduationCap, Store, type LucideIcon } from 'lucide-react';
import type { BranchType } from '@mos-lab/shared';
import { AppIcon, StatusTag, type StatusType } from '~/components/ui';

interface StoreTypeBadgeDescriptor {
  status: StatusType;
  label: string;
  icon: LucideIcon;
}

const STORE_TYPE_BADGE_MAP: Record<BranchType, StoreTypeBadgeDescriptor> = {
  SALON: {
    status: 'cyan',
    label: 'Salon Làm Đẹp',
    icon: Store,
  },
  ACADEMY: {
    status: 'purple',
    label: 'Học Viện Đào Tạo',
    icon: GraduationCap,
  },
  OFFICE: {
    status: 'gold',
    label: 'Văn Phòng Vận Hành',
    icon: Briefcase,
  },
};

export function BranchStoreTypeBadge({ type }: { type: BranchType }) {
  const descriptor = STORE_TYPE_BADGE_MAP[type];
  if (!descriptor) {
    return <StatusTag status="default" label={type} />;
  }
  return (
    <StatusTag
      status={descriptor.status}
      label={descriptor.label}
      icon={<AppIcon icon={descriptor.icon} size="sm" />}
    />
  );
}

export function renderStoreTypeBadge(type: BranchType): React.ReactNode {
  return <BranchStoreTypeBadge type={type} />;
}
