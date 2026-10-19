'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, InputNumber } from 'antd';
import { WalletCards } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '../../../../../components/ui';
import type { CashAccount, CashAccountBalanceAdjustment } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';

interface AdjustBalanceModalProps {
  open: boolean;
  onCancel: () => void;
  accounts: CashAccount[];
  currentBalance?: number;
  onSuccess: () => void;
}

export function AdjustBalanceModal({
  open,
  onCancel,
  accounts,
  currentBalance,
  onSuccess,
}: AdjustBalanceModalProps) {
  const [form] = Form.useForm<{ newBalance: number }>();
  const [saving, setSaving] = useState<boolean>(false);

  const displayedCurrentBalance = useMemo(() => {
    if (typeof currentBalance === 'number') {
      return currentBalance;
    }
    return accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accounts, currentBalance]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        newBalance: displayedCurrentBalance,
      });
    }
  }, [open, displayedCurrentBalance, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const newBalance = Number(values.newBalance ?? 0);
      setSaving(true);

      if (accounts.length > 0) {
        const oldTotal = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        let remaining = newBalance;

        const items: CashAccountBalanceAdjustment[] = accounts.map((acc, index) => {
          if (index === accounts.length - 1) {
            return {
              id: acc.id,
              currentBalance: remaining,
              minSafetyThreshold: acc.minSafetyThreshold,
              notes: acc.notes || undefined,
            };
          }
          const share =
            oldTotal > 0 ? Math.round(((acc.currentBalance || 0) / oldTotal) * newBalance) : 0;
          remaining -= share;
          return {
            id: acc.id,
            currentBalance: share,
            minSafetyThreshold: acc.minSafetyThreshold,
            notes: acc.notes || undefined,
          };
        });

        await apiClient.cashFlow.batchUpdateBalances(items);
      }

      onSuccess();
      onCancel();
    } catch {
      // Form validation error
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal
      intent="form"
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={WalletCards} size="md" className="text-emerald-500" />
          <span>Cài đặt / Điều chỉnh số dư</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={460}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSave} className="space-y-4 pt-2">
        <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Số dư hiện tại
          </span>
          <span className="text-base font-bold text-neutral-800 dark:text-neutral-100 tabular-nums">
            {displayedCurrentBalance.toLocaleString('vi-VN')} VNĐ
          </span>
        </div>

        <Form.Item
          name="newBalance"
          label="Số dư mới (VNĐ)"
          rules={[{ required: true, message: 'Vui lòng nhập giá trị số dư mới' }]}
          className="!mb-0"
        >
          <InputNumber
            className="w-full"
            placeholder="Nhập giá trị số dư mới"
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as any}
            addonAfter="VNĐ"
          />
        </Form.Item>

        <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            className="bg-emerald-600 hover:bg-emerald-500 border-none"
          >
            Lưu
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
