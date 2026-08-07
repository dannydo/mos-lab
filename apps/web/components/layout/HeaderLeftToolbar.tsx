'use client';

import React from 'react';
import { Button, Tooltip, Badge } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';

interface HeaderLeftToolbarProps {
  onOpenCvDrawer: () => void;
  workingCvCount?: number;
}

export const HeaderLeftToolbar: React.FC<HeaderLeftToolbarProps> = ({ onOpenCvDrawer, workingCvCount = 0 }) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div className="flex items-center gap-2 py-1">
      <Tooltip title="Lịch CV & Hàng Chờ Tua Real-time (Bấm để xem)" placement="bottomLeft">
        <Badge
          count={workingCvCount > 0 ? workingCvCount : 0}
          overflowCount={99}
          color={isDark ? '#10B981' : '#059669'}
          offset={[-4, 4]}
          style={{ fontWeight: 600 }}
        >
          <Button
            type="default"
            onClick={onOpenCvDrawer}
            icon={<ScheduleOutlined style={{ fontSize: '16px' }} />}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg font-medium transition-all duration-200"
            style={{
              background: isDark ? 'rgba(212, 168, 75, 0.12)' : '#FFFBE6',
              border: `1px solid ${isDark ? 'rgba(212, 168, 75, 0.35)' : '#FFE58F'}`,
              color: isDark ? '#F59E0B' : '#D97706',
              boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span className="hidden sm:inline-block text-xs font-semibold tracking-wide">Lịch CV & Tua</span>
          </Button>
        </Badge>
      </Tooltip>

      {/* Extensible Slot for future left-aligned header toolbar icons */}
    </div>
  );
};

export default HeaderLeftToolbar;
