'use client';

import React from 'react';
import { theme } from 'antd';
import { CalendarDays } from 'lucide-react';
import { HeaderActionIndicator } from '../ui/HeaderActionIndicator';
import { HeaderIconButton } from '../ui/HeaderIconButton';

interface HeaderLeftToolbarProps {
  onOpenCvDrawer: () => void;
  workingCvCount?: number;
}

export const HeaderLeftToolbar: React.FC<HeaderLeftToolbarProps> = ({ onOpenCvDrawer, workingCvCount = 0 }) => {
  const { token } = theme.useToken();
  const scheduleLabel =
    workingCvCount > 0
      ? `Lịch CV và hàng chờ tua real-time, ${workingCvCount} CV đang làm việc`
      : 'Lịch CV và hàng chờ tua real-time';

  return (
    <div className="dashboard-header-schedule-cluster">
      <HeaderActionIndicator variant="count" surface="accent" count={workingCvCount} color={token.colorSuccessActive}>
        <HeaderIconButton
          action="cv-schedule"
          label={scheduleLabel}
          icon={CalendarDays}
          tone="accent"
          onClick={onOpenCvDrawer}
        />
      </HeaderActionIndicator>
    </div>
  );
};

export default HeaderLeftToolbar;
