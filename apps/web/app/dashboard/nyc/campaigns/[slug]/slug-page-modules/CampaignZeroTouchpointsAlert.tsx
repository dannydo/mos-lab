'use client';

import React from 'react';
import { Alert, Button } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { AppIcon } from '~/components/ui';

export interface CampaignZeroTouchpointsAlertProps {
  onConfigureTouchpoints: () => void;
}

export function CampaignZeroTouchpointsAlert({ onConfigureTouchpoints }: CampaignZeroTouchpointsAlertProps) {
  return (
    <Alert
      type="warning"
      showIcon
      icon={<AppIcon icon={AlertTriangle} size={18} className="text-amber-500" />}
      message={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              ⚠️ Chiến dịch này chưa được cấu hình mốc điểm chạm trong CSDL!
            </span>
            <p className="m-0 mt-0.5 text-xs text-slate-600 dark:text-slate-300">
              Vui lòng bấm nút dưới đây để cấu hình các mốc điểm chạm cho Booker/CSKH ghi nhận tiến trình chăm sóc.
            </p>
          </div>
          <Button
            type="primary"
            size="small"
            onClick={onConfigureTouchpoints}
            className="rounded-lg border-none bg-amber-500 text-xs font-semibold hover:bg-amber-600"
          >
            Cấu hình điểm chạm ngay
          </Button>
        </div>
      }
      className="mb-4 rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/40"
    />
  );
}
