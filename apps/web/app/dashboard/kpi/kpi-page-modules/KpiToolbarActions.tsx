'use client';

import React from 'react';
import { Button, Radio, Select, Tooltip } from 'antd';
import { Settings } from 'lucide-react';
import type { LeaderboardEntry } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import type { KpiRole } from './kpi-page.utils';

export interface KpiToolbarActionsProps {
  selectedRole: KpiRole;
  onRoleChange: (role: KpiRole) => void;
  selectedStaffId: string;
  onStaffChange: (staffId: string) => void;
  leaderboard: LeaderboardEntry[];
  onOpenConfig: () => void;
}

export function KpiToolbarActions({
  selectedRole,
  onRoleChange,
  selectedStaffId,
  onStaffChange,
  leaderboard,
  onOpenConfig,
}: KpiToolbarActionsProps) {
  return (
    <>
      <Radio.Group
        value={selectedRole}
        onChange={(event) => onRoleChange(event.target.value)}
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="telesales">Online Consultant</Radio.Button>
        <Radio.Button value="oc">Client Consultant</Radio.Button>
      </Radio.Group>
      <Select
        value={selectedStaffId}
        onChange={onStaffChange}
        className="w-[170px]"
        options={[
          {
            value: 'ALL',
            label: selectedRole === 'oc' ? 'Tất cả Client Consultant' : 'Tất cả Online Consultant',
          },
          ...leaderboard.map((staff) => ({
            value: staff.staffId.toString(),
            label: staff.displayName,
          })),
        ]}
        placeholder="Chọn nhân viên"
      />
      {selectedRole === 'telesales' && (
        <Tooltip title="Cấu hình lương Booker">
          <Button
            aria-label="Cấu hình lương Booker"
            icon={<AppIcon icon={Settings} size="action" />}
            onClick={onOpenConfig}
            className="table-toolbar-settings-trigger !border-amber-500 !text-amber-500 hover:!border-amber-400 hover:!text-amber-400"
          />
        </Tooltip>
      )}
    </>
  );
}
