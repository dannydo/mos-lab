'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FundStatus } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';

export interface FundStatusBadgeProps {
  status: FundStatus;
  isLowBalance?: boolean;
}

export function FundStatusBadge({ status, isLowBalance }: FundStatusBadgeProps) {
  if (isLowBalance) {
    return <StatusTag status="warning" label="SẮP HẾT HẠN MỨC" icon={<AppIcon icon={AlertTriangle} size="sm" />} />;
  }

  switch (status) {
    case 'DRAFT':
      return <StatusTag status="default" label="📝 BẢN NHÁP (DRAFT)" />;
    case 'ACTIVE':
      return <StatusTag status="success" label="🟢 ĐANG HOẠT ĐỘNG" />;
    case 'FROZEN':
      return <StatusTag status="warning" label="⏸️ TẠM NGƯNG" />;
    case 'CLOSED':
      return <StatusTag status="default" label="🔒 ĐÃ ĐÓNG" />;
    default:
      return <StatusTag status="default" label={status} />;
  }
}
