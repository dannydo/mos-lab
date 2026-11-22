'use client';

import React from 'react';
import { Button, Select, Space, Tooltip, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { Info, RefreshCw } from 'lucide-react';
import { AppIcon, ReportPeriodNavigator } from '~/components/ui';
import styles from '../fal.module.css';
import { formatFalPeriodLabel } from './falPageHelpers';
import { FAL_RULE_OPTIONS, type FalDateRangeMode } from './falPageTypes';

const { Title, Text } = Typography;

interface FalControlTowerHeaderProps {
  dateRangeMode: FalDateRangeMode;
  selectedDate: Dayjs;
  rule: string | undefined;
  onModeChange: (mode: FalDateRangeMode) => void;
  onMoveDate: (direction: -1 | 1) => void;
  onDateValueChange: (value: Dayjs) => void;
  onRuleChange: (value: string | undefined) => void;
  onOpenRules: () => void;
  onRefresh: () => void;
}

export function FalControlTowerHeader({
  dateRangeMode,
  selectedDate,
  rule,
  onModeChange,
  onMoveDate,
  onDateValueChange,
  onRuleChange,
  onOpenRules,
  onRefresh,
}: FalControlTowerHeaderProps) {
  return (
    <div className={`responsive-page-header ${styles.header}`}>
      <div className="responsive-page-header-main">
        <div className="responsive-page-header-title-row">
          <Title level={3} className="!mb-0">
            FAL Control Tower
          </Title>
        </div>
        <Text type="secondary" className="block">
          Danh sách Fix / Adjust / Log thực tế do CC chọn tại Wings. MOS không tạo FAL.
        </Text>
      </div>
      <div className="responsive-page-header-actions">
        <Space wrap size={8} className={styles.toolbar}>
          <ReportPeriodNavigator
            mode={dateRangeMode}
            value={selectedDate}
            label={formatFalPeriodLabel(dateRangeMode, selectedDate)}
            onModeChange={onModeChange}
            onPrevious={() => onMoveDate(-1)}
            onNext={() => onMoveDate(1)}
            onValueChange={onDateValueChange}
          />
          <Select
            value={rule}
            allowClear
            placeholder="Tất cả FAL"
            className={styles.ruleFilter}
            onChange={onRuleChange}
            options={FAL_RULE_OPTIONS.map((value) => ({ value }))}
          />
          <Tooltip title="Cách tính Fix / Adjust / Log">
            <Button
              aria-label="Giải thích business rules FAL"
              icon={<AppIcon icon={Info} size="action" />}
              onClick={onOpenRules}
            />
          </Tooltip>
          <Tooltip title="Làm mới dữ liệu FAL">
            <Button
              aria-label="Làm mới dữ liệu FAL"
              icon={<AppIcon icon={RefreshCw} size="action" />}
              onClick={onRefresh}
            />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
}
