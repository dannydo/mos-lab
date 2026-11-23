'use client';

import React from 'react';
import { Button, Checkbox, Popover, Slider } from 'antd';
import { TableSettingsTrigger } from '~/components/ui';
import {
  DEFAULT_APPOINTMENT_COLUMN_CONFIG,
  isColumnVisibleInTab,
  type AppointmentColumnConfigMap,
  type AppointmentTabKey,
} from './appointmentsPageConstants';

export interface AppointmentColumnSettingsPopoverProps {
  activeTab: AppointmentTabKey;
  columnConfig: AppointmentColumnConfigMap;
  onSaveColumnConfig: (nextConfig: AppointmentColumnConfigMap) => void;
}

export function AppointmentColumnSettingsPopover({
  activeTab,
  columnConfig,
  onSaveColumnConfig,
}: AppointmentColumnSettingsPopoverProps) {
  return (
    <Popover
      title={
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold">Cấu hình hiển thị cột</span>
          <Button
            type="link"
            size="small"
            onClick={() => onSaveColumnConfig(DEFAULT_APPOINTMENT_COLUMN_CONFIG)}
            className="px-0"
          >
            Khôi phục
          </Button>
        </div>
      }
      trigger="click"
      placement="bottomRight"
      content={
        <div className="custom-scrollbar w-[300px] max-h-[400px] overflow-y-auto">
          {Object.entries(columnConfig)
            .filter(([key]) => isColumnVisibleInTab(key, activeTab))
            .map(([key, config]) => (
              <div key={key} className="mb-3">
                <div className="flex items-center justify-between">
                  <Checkbox
                    checked={config.visible}
                    onChange={(event) => {
                      onSaveColumnConfig({
                        ...columnConfig,
                        [key]: { ...config, visible: event.target.checked },
                      });
                    }}
                  >
                    <span className="font-medium">{config.label}</span>
                  </Checkbox>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{config.width}px</span>
                </div>
                {config.visible && (
                  <div className="pl-6 mt-1">
                    <Slider
                      min={80}
                      max={400}
                      step={10}
                      value={config.width}
                      onChange={(value) => {
                        onSaveColumnConfig({
                          ...columnConfig,
                          [key]: { ...config, width: value },
                        });
                      }}
                      tooltip={{ formatter: (value) => `${value}px` }}
                    />
                  </div>
                )}
              </div>
            ))}
        </div>
      }
    >
      <TableSettingsTrigger />
    </Popover>
  );
}
