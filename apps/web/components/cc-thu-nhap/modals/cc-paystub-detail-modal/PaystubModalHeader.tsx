'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { Printer, Wallet } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';

export interface PaystubModalHeaderProps {
  displayName?: string;
  periodLabel: string;
  onPrint: () => void;
}

export function PaystubModalHeader({ displayName, periodLabel, onPrint }: PaystubModalHeaderProps) {
  return (
    <div className="flex items-center justify-between pr-8 border-b pb-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <AppIcon icon={Wallet} size={18} className="text-amber-500" />
        <span className="font-bold text-base">Phiếu Lương Live Chi Tiết - {displayName}</span>
      </div>
      <Space>
        <StatusTag
          status="purple"
          label={`KỲ: ${periodLabel}`}
          className="font-mono text-xs font-semibold px-2 py-0.5"
        />
        <Button size="small" icon={<AppIcon icon={Printer} size={14} />} onClick={onPrint} className="text-xs">
          In phiếu
        </Button>
      </Space>
    </div>
  );
}
