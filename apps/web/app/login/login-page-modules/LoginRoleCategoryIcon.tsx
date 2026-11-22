'use client';

import React from 'react';
import {
  BarChart3,
  Building2,
  Coffee,
  Crown,
  GraduationCap,
  MessageSquare,
  Phone,
  Shield,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge, FeatherSvg } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import type { RoleCategory, RoleCategoryKey } from './loginConstants';

const CATEGORY_ICON_MAP: Record<
  Exclude<RoleCategoryKey, 'cvl' | 'cvll'>,
  React.ComponentType<{ className?: string }>
> = {
  super_admin: Crown,
  admin: Shield,
  manager: BarChart3,
  telesales: Phone,
  cv: Sparkles,
  cc: Coffee,
  cs: MessageSquare,
  fm: Building2,
  executive: Star,
  teacher: GraduationCap,
  other: Wrench,
};

export function LoginRoleCategoryIcon({
  categoryKey,
  className = 'h-3.5 w-3.5 shrink-0',
}: {
  categoryKey: RoleCategoryKey;
  className?: string;
}) {
  if (categoryKey === 'cvl' || categoryKey === 'cvll') {
    return <FeatherSvg className={`${className} text-amber-600 dark:text-amber-400`} />;
  }
  const Icon = CATEGORY_ICON_MAP[categoryKey];
  return <Icon className={className} />;
}

export function RoleCategoryDisplayLabel({ category, className = '' }: { category: RoleCategory; className?: string }) {
  if (category.key === 'cvl') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <CvFeather1Badge className="text-[11px]" featherClass="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
        <span>(Tự Chủ)</span>
      </span>
    );
  }
  if (category.key === 'cvll') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <CvFeather2Badge className="text-[11px]" featherClass="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
        <span>(Cấp Cao)</span>
      </span>
    );
  }
  return <span className={className}>{category.label}</span>;
}
