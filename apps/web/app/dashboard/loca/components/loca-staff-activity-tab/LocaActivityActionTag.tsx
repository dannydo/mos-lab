'use client';

import React from 'react';
import { Calendar, CheckCircle2, Headphones, Phone } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';

export interface LocaActivityActionTagProps {
  actionType: string;
}

export const LocaActivityActionTag: React.FC<LocaActivityActionTagProps> = ({ actionType }) => {
  switch (actionType) {
    case 'CALL':
      return (
        <StatusTag
          status="success"
          icon={<AppIcon icon={Phone} size={12} />}
          label="Cuộc gọi"
          className="font-medium"
        />
      );
    case 'TOUCHPOINT':
      return (
        <StatusTag
          status="processing"
          icon={<AppIcon icon={CheckCircle2} size={12} />}
          label="Điểm chạm"
          className="font-medium"
        />
      );
    case 'BOOKED':
      return (
        <StatusTag
          status="purple"
          icon={<AppIcon icon={Calendar} size={12} />}
          label="Đặt lịch"
          className="font-medium"
        />
      );
    default:
      return (
        <StatusTag
          status="default"
          icon={<AppIcon icon={Headphones} size={12} />}
          label="Tương tác"
          className="font-medium"
        />
      );
  }
};
