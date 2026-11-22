'use client';

import React from 'react';
import { Tooltip } from 'antd';
import type { QaSeverity } from '@mos-lab/shared';
import { getSeverityDisplayConfig } from './dailyAuditUtils';

export interface SeverityDotIndicatorProps {
  severity?: QaSeverity | 'MID' | string;
}

export const SeverityDotIndicator: React.FC<SeverityDotIndicatorProps> = ({ severity = 'MEDIUM' }) => {
  const { dotClass, label, displayCode } = getSeverityDisplayConfig(severity);

  return (
    <Tooltip title={`Mức độ ưu tiên: ${label}`}>
      <span className="inline-flex items-center gap-1.5 text-xs select-none">
        <span className={`w-2 h-2 rounded-full inline-block ${dotClass}`} aria-hidden="true" />
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          {displayCode}
        </span>
      </span>
    </Tooltip>
  );
};
