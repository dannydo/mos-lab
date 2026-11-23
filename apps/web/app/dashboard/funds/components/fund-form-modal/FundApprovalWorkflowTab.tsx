'use client';

import React from 'react';
import { Button, Card, Col, Input, InputNumber, Row, Select, Switch, Typography } from 'antd';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import type { CreateFundRoleInput, FundApprovalStepConfig } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { formatCurrencyInput, parseCurrencyInput } from './fundFormHelpers';
import type { StaffSelectOption } from './types';

const { Text } = Typography;

export interface FundApprovalWorkflowTabProps {
  approvalEnabled: boolean;
  approvalSteps: FundApprovalStepConfig[];
  roles: CreateFundRoleInput[];
  staffOptions: StaffSelectOption[];
  onApprovalEnabledChange: (enabled: boolean) => void;
  onAddApprovalStep: () => void;
  onRemoveApprovalStep: (index: number) => void;
  onUpdateApprovalStep: (index: number, patch: Partial<FundApprovalStepConfig>) => void;
}

export function FundApprovalWorkflowTab({
  approvalEnabled,
  approvalSteps,
  roles,
  staffOptions,
  onApprovalEnabledChange,
  onAddApprovalStep,
  onRemoveApprovalStep,
  onUpdateApprovalStep,
}: FundApprovalWorkflowTabProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <AppIcon icon={CheckCircle2} size="sm" className="text-emerald-500" />
            <span>Quy trình phê duyệt đề xuất chi/bổ sung quỹ</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Cấu hình số cấp duyệt (1 cấp, nhiều cấp), thứ tự duyệt và điều kiện hạn mức.
          </div>
        </div>
        <Switch
          checked={approvalEnabled}
          onChange={onApprovalEnabledChange}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      </div>

      {approvalEnabled && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Các cấp phê duyệt tuần tự ({approvalSteps.length} cấp)
            </Text>
            <Button type="dashed" size="small" icon={<AppIcon icon={Plus} size="sm" />} onClick={onAddApprovalStep}>
              Thêm cấp duyệt
            </Button>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {approvalSteps.map((step, idx) => (
              <Card
                key={idx}
                size="small"
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">
                        Cấp {step.level}
                      </span>
                      <span>{step.name}</span>
                    </span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<AppIcon icon={Trash2} size="sm" />}
                      onClick={() => onRemoveApprovalStep(idx)}
                      disabled={approvalSteps.length <= 1}
                    />
                  </div>
                }
              >
                <div className="space-y-3">
                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tên bước duyệt:</div>
                      <Input
                        value={step.name}
                        size="middle"
                        onChange={(e) => onUpdateApprovalStep(idx, { name: e.target.value })}
                      />
                    </Col>
                    <Col xs={24} sm={10}>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nhóm vai trò phê duyệt:
                      </div>
                      <Select
                        className="w-full"
                        value={step.approverRoleKey}
                        onChange={(val) => onUpdateApprovalStep(idx, { approverRoleKey: val })}
                        options={roles.map((r) => ({
                          label: `${r.roleName} (${r.roleKey})`,
                          value: r.roleKey,
                        }))}
                      />
                    </Col>
                  </Row>

                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Hoặc chỉ định nhân sự phê duyệt cụ thể:
                      </div>
                      <Select
                        mode="multiple"
                        placeholder="Mặc định duyệt theo vai trò (hoặc chọn cụ thể)"
                        className="w-full"
                        value={step.approverStaffIds}
                        options={staffOptions}
                        onChange={(vals) => onUpdateApprovalStep(idx, { approverStaffIds: vals })}
                      />
                    </Col>
                    <Col xs={24} sm={10}>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Điều kiện: Số tiền đề xuất từ
                      </div>
                      <InputNumber
                        className="w-full tabular-nums"
                        min={0}
                        step={500000}
                        value={step.requiredAmountAbove || 0}
                        formatter={formatCurrencyInput}
                        parser={parseCurrencyInput}
                        addonAfter="đ"
                        onChange={(val) => onUpdateApprovalStep(idx, { requiredAmountAbove: Number(val || 0) })}
                      />
                    </Col>
                  </Row>

                  <div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Ghi chú quy trình:
                    </div>
                    <Input
                      value={step.note || ''}
                      placeholder="Mô tả tiêu chuẩn xét duyệt của cấp này..."
                      onChange={(e) => onUpdateApprovalStep(idx, { note: e.target.value })}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
