'use client';

import React from 'react';
import { Button, Card, Popconfirm, Select, Typography } from 'antd';
import { GitMerge } from 'lucide-react';
import { vietnameseSearchFilter, type Staff } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, StatusTag } from '~/components/ui';

const { Text, Paragraph } = Typography;

export interface MergeStaffModalProps {
  open: boolean;
  staffList: Staff[];
  selectedRowKeys: React.Key[];
  targetMergeStaffId: number | null;
  mergeSubmitting: boolean;
  onTargetMergeStaffChange: (staffId: number | null) => void;
  onCancel: () => void;
  onConfirmMerge: () => void | Promise<void>;
}

export function MergeStaffModal({
  open,
  staffList,
  selectedRowKeys,
  targetMergeStaffId,
  mergeSubmitting,
  onTargetMergeStaffChange,
  onCancel,
  onConfirmMerge,
}: MergeStaffModalProps) {
  const selectedStaff = staffList.filter((staff) => selectedRowKeys.includes(staff.id));
  const targetStaff = staffList.find((staff) => staff.id === targetMergeStaffId);
  const sourceStaffNames = selectedStaff
    .filter((staff) => staff.id !== targetMergeStaffId)
    .map((staff) => staff.displayName)
    .join(', ');

  return (
    <AdaptiveModal
      intent="confirm"
      title={
        <div className="flex items-center gap-2 text-violet-500">
          <AppIcon icon={GitMerge} size={20} />
          <span className="text-lg font-bold">Gộp Nhân Viên Trùng Lặp</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy bỏ
        </Button>,
        <Popconfirm
          key="confirm"
          title="Xác nhận gộp tài khoản nhân viên?"
          description="Tất cả lịch sử cuộc gọi, KPI và phân công khách hàng từ tài khoản phụ sẽ chuyển sang tài khoản chính. Các tài khoản phụ trùng lặp sẽ bị XÓA VĨNH VIỄN."
          onConfirm={onConfirmMerge}
          okText="Đồng ý Gộp"
          cancelText="Hủy"
          okButtonProps={{ danger: true, loading: mergeSubmitting }}
        >
          <Button
            type="primary"
            loading={mergeSubmitting}
            className="border-transparent bg-gradient-to-br from-violet-500 to-indigo-500 font-semibold text-white"
          >
            <span className="tabular-nums">Xác Nhận Gộp ({selectedRowKeys.length} tài khoản)</span>
          </Button>
        </Popconfirm>,
      ]}
      width={650}
    >
      <div className="mt-4">
        <Paragraph type="secondary">
          Bạn đang chọn <strong className="tabular-nums">{selectedRowKeys.length} nhân viên</strong> để gộp dữ liệu. Vui
          lòng chọn 1 nhân viên làm <strong className="text-violet-500">Tài khoản chính (Target)</strong> để giữ lại:
        </Paragraph>

        <Card size="small" className="mb-4 border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900">
          <Select
            className="w-full"
            placeholder="Chọn tài khoản chính giữ lại..."
            value={targetMergeStaffId}
            onChange={onTargetMergeStaffChange}
            showSearch
            filterOption={vietnameseSearchFilter}
            options={selectedStaff.map((staff) => ({
              value: staff.id,
              label: (
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <strong>{staff.displayName}</strong> ({staff.username})
                  </span>
                  <StatusTag status="purple" label={`ID: ${staff.id}`} className="tabular-nums" />
                </div>
              ),
            }))}
          />
        </Card>

        {targetMergeStaffId && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
            <Text className="mb-1.5 block font-bold text-emerald-500 tabular-nums">
              ✓ Tài khoản chính giữ lại: {targetStaff?.displayName} (ID: {targetMergeStaffId})
            </Text>
            <Text type="secondary" className="block text-[13px]">
              ✕ Tài khoản phụ bị gộp &amp; xóa: {sourceStaffNames}
            </Text>
          </div>
        )}
      </div>
    </AdaptiveModal>
  );
}
