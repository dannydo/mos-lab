'use client';

import React from 'react';
import { Button, Card, Checkbox, Col, Input, Row, Select, Space, Typography } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import type { CreateFundRoleInput } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { removeVietnameseTones } from '~/lib/utils/search';
import { AVAILABLE_PERMISSIONS } from './fundFormConstants';
import type { StaffSelectOption } from './types';

const { Text } = Typography;

export interface FundRolesTabProps {
  roles: CreateFundRoleInput[];
  staffOptions: StaffSelectOption[];
  loadingStaff: boolean;
  onResetStandardRoles: () => void;
  onAddRole: () => void;
  onRemoveRole: (index: number) => void;
  onUpdateRole: (index: number, patch: Partial<CreateFundRoleInput>) => void;
}

export function FundRolesTab({
  roles,
  staffOptions,
  loadingStaff,
  onResetStandardRoles,
  onAddRole,
  onRemoveRole,
  onUpdateRole,
}: FundRolesTabProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div>
          <Text className="font-bold text-slate-800 dark:text-slate-200">Cấu hình vai trò & Gán quyền linh hoạt</Text>
          <div className="text-xs text-slate-500">
            Được phép tạo thêm vai trò không giới hạn và gán nhân sự từ danh sách CRM staff.
          </div>
        </div>
        <Space>
          <Button size="small" onClick={onResetStandardRoles}>
            Mẫu chuẩn
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<AppIcon icon={Plus} size="sm" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            onClick={onAddRole}
          >
            Thêm vai trò
          </Button>
        </Space>
      </div>

      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {roles.map((role, idx) => (
          <Card
            key={idx}
            size="small"
            className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            title={
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span>{role.roleName || `Vai trò #${idx + 1}`}</span>
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {role.roleKey}
                  </span>
                </span>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<AppIcon icon={Trash2} size="sm" />}
                  onClick={() => onRemoveRole(idx)}
                  disabled={roles.length <= 1}
                />
              </div>
            }
          >
            <div className="space-y-3">
              <Row gutter={12}>
                <Col xs={24} sm={14}>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tên vai trò hiển thị:
                  </div>
                  <Input
                    value={role.roleName}
                    placeholder="Ví dụ: Thủ Quỹ, Kế Toán Giải Ngân..."
                    size="middle"
                    onChange={(e) => onUpdateRole(idx, { roleName: e.target.value })}
                  />
                </Col>
                <Col xs={24} sm={10}>
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mã vai trò (Key):</div>
                  <Input
                    value={role.roleKey}
                    placeholder="HOLDER, DISBURSER..."
                    size="middle"
                    className="font-mono uppercase"
                    onChange={(e) =>
                      onUpdateRole(idx, {
                        roleKey: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      })
                    }
                  />
                </Col>
              </Row>

              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phân quyền hạn thao tác:
                </div>
                <Checkbox.Group
                  options={AVAILABLE_PERMISSIONS}
                  value={role.permissions}
                  onChange={(checkedValues) => onUpdateRole(idx, { permissions: checkedValues as string[] })}
                  className="grid grid-cols-2 gap-2 text-xs"
                />
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nhân sự đảm nhiệm vai trò này (từ CRM Staff):
                </div>
                <Select
                  mode="multiple"
                  placeholder="Chọn nhân sự phụ trách vai trò này..."
                  className="w-full"
                  value={role.assignedStaffIds}
                  options={staffOptions}
                  loading={loadingStaff}
                  filterOption={(input, option) =>
                    removeVietnameseTones((option?.label as string) || '')
                      .toLowerCase()
                      .includes(removeVietnameseTones(input).toLowerCase())
                  }
                  onChange={(selectedValues) => onUpdateRole(idx, { assignedStaffIds: selectedValues as number[] })}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
