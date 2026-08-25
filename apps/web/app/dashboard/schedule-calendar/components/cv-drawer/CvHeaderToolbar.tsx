'use client';

import React, { useState } from 'react';
import { Button, Tag, Space, Tooltip, Popover } from 'antd';
import { LeftOutlined, RightOutlined, CloseOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { CvDatePicker } from '../../../../../components/booking/CvDatePicker';
import { useTheme } from '../../../../../context/ThemeContext';

interface CvHeaderToolbarProps {
  currentDate: Dayjs;
  onDateChange: (newDate: Dayjs) => void;
  onClose: () => void;
  ktvCount: number;
  offCount: number;
}

export const CvHeaderToolbar: React.FC<CvHeaderToolbarProps> = React.memo(
  ({ currentDate, onDateChange, onClose, ktvCount, offCount }) => {
    const { themeMode } = useTheme();
    const [popoverOpen, setPopoverOpen] = useState(false);

    const weekdayLabel = currentDate.day() === 0 ? 'CN' : `T${currentDate.day() + 1}`;
    const formattedDayTitle = `${weekdayLabel}, ${currentDate.format('DD/MM/YYYY')}`;

    const datePickerContent = (
      <div style={{ width: 280, padding: '4px' }}>
        <CvDatePicker
          value={currentDate}
          onChange={(newDate) => {
            if (newDate) {
              onDateChange(newDate);
              setPopoverOpen(false);
            }
          }}
          themeMode={themeMode}
          showWarningAlert={false}
        />
      </div>
    );

    return (
      <div className="flex items-center justify-between gap-2 select-none" role="region" aria-label="Lịch CV Header">
        <div className="flex items-center gap-2">
          <Space size={4}>
            <Tooltip title="Ngày trước đó (Phím tắt: Left)" placement="bottom">
              <Button
                type="text"
                size="small"
                icon={<LeftOutlined className="text-xs" />}
                onClick={() => onDateChange(currentDate.subtract(1, 'day'))}
                aria-label="Ngày trước đó"
                className="hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              />
            </Tooltip>

            <Popover
              content={datePickerContent}
              trigger="click"
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              placement="bottomLeft"
            >
              <Tooltip title="Bấm để chọn ngày (Gạch ngang ngày off & Cảnh báo phép)" placement="bottom">
                <button
                  type="button"
                  className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded transition-colors cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <span>{formattedDayTitle}</span>
                </button>
              </Tooltip>
            </Popover>

            <Tooltip title="Ngày tiếp theo (Phím tắt: Right)" placement="bottom">
              <Button
                type="text"
                size="small"
                icon={<RightOutlined className="text-xs" />}
                onClick={() => onDateChange(currentDate.add(1, 'day'))}
                aria-label="Ngày tiếp theo"
                className="hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              />
            </Tooltip>
          </Space>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip title={`Có ${ktvCount} chuyên viên được xếp ca ngày này`} placement="bottom">
            <Tag
              color="emerald"
              className="m-0 text-[11px] font-bold py-0.5 px-2 rounded-full cursor-help tabular-nums inline-flex items-center"
              aria-label={`${ktvCount} Chuyên viên được xếp ca`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse mr-1.5" />
              <span>{ktvCount} Xếp ca</span>
            </Tag>
          </Tooltip>
          {offCount > 0 && (
            <Tooltip title={`Có ${offCount} chuyên viên xin nghỉ/OFF trong ngày`} placement="bottom">
              <Tag
                color="rose"
                className="m-0 text-[11px] font-bold py-0.5 px-2 rounded-full cursor-help tabular-nums inline-flex items-center"
                aria-label={`${offCount} Chuyên viên OFF`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 inline-block mr-1.5" />
                <span>{offCount} OFF</span>
              </Tag>
            </Tooltip>
          )}
          <Tooltip title="Đóng cửa sổ Lịch CV (Esc)" placement="bottom">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined className="text-xs" />}
              onClick={onClose}
              aria-label="Đóng Lịch CV"
              className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded"
            />
          </Tooltip>
        </div>
      </div>
    );
  }
);

CvHeaderToolbar.displayName = 'CvHeaderToolbar';
