'use client';

import React from 'react';
import { Button, Tag, Space, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined, CloseOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';

interface CvHeaderToolbarProps {
  currentDate: Dayjs;
  onDateChange: (newDate: Dayjs) => void;
  onClose: () => void;
  ktvCount: number;
  offCount: number;
}

export const CvHeaderToolbar: React.FC<CvHeaderToolbarProps> = React.memo(
  ({ currentDate, onDateChange, onClose, ktvCount, offCount }) => {
    const weekdayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const formattedDayTitle = `${weekdayNames[currentDate.day()]}, ${currentDate.format('DD/MM/YYYY')}`;

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
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarOutlined className="text-emerald-500" />
              <span>Lịch CV — {formattedDayTitle}</span>
            </span>
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
          <Tooltip title={`Có ${ktvCount} chuyên viên đi làm trong ca này`} placement="bottom">
            <Tag
              color="emerald"
              className="m-0 text-[11px] font-bold py-0.5 px-2 rounded-full cursor-help tabular-nums"
              aria-label={`${ktvCount} Chuyên viên đi làm`}
            >
              🟢 {ktvCount} Đi làm
            </Tag>
          </Tooltip>
          {offCount > 0 && (
            <Tooltip title={`Có ${offCount} chuyên viên xin nghỉ/OFF trong ngày`} placement="bottom">
              <Tag
                color="rose"
                className="m-0 text-[11px] font-bold py-0.5 px-2 rounded-full cursor-help tabular-nums"
                aria-label={`${offCount} Chuyên viên OFF`}
              >
                🔴 {offCount} OFF
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
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold ml-1 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            />
          </Tooltip>
        </div>
      </div>
    );
  }
);

CvHeaderToolbar.displayName = 'CvHeaderToolbar';
