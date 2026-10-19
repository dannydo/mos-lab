'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button, Form, Input, InputNumber, Select, Tabs, Alert, Segmented } from 'antd';
import { Landmark, WalletCards, ShieldCheck, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '../../../../../components/ui';
import type { CashAccount, CashAccountBalanceAdjustment } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';

interface AdjustBalanceModalProps {
  open: boolean;
  onCancel: () => void;
  accounts: CashAccount[];
  initialSelectedAccountId?: number | null;
  onSuccess: () => void;
}

export function AdjustBalanceModal({
  open,
  onCancel,
  accounts,
  initialSelectedAccountId,
  onSuccess,
}: AdjustBalanceModalProps) {
  const [activeMode, setActiveMode] = useState<'all' | 'single'>('all');
  const [singleForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Lưu trạng thái số dư tạm thời của batch mode để tính tổng thời gian thực
  const [batchBalances, setBatchBalances] = useState<Record<number, number>>({});
  const [batchSafetyThresholds, setBatchSafetyThresholds] = useState<Record<number, number>>({});

  // Reset form khi modal mở
  useEffect(() => {
    if (open && accounts.length > 0) {
      const initialBalances: Record<number, number> = {};
      const initialThresholds: Record<number, number> = {};
      const batchInitialValues: Record<string, any> = {};

      for (const acc of accounts) {
        initialBalances[acc.id] = acc.currentBalance;
        initialThresholds[acc.id] = acc.minSafetyThreshold;
        batchInitialValues[`balance_${acc.id}`] = acc.currentBalance;
        batchInitialValues[`threshold_${acc.id}`] = acc.minSafetyThreshold;
      }

      setBatchBalances(initialBalances);
      setBatchSafetyThresholds(initialThresholds);
      batchForm.setFieldsValue(batchInitialValues);

      const targetId = initialSelectedAccountId || accounts[0]?.id || null;
      setSelectedAccountId(targetId);

      const targetAcc = accounts.find((a) => a.id === targetId) || accounts[0];
      if (targetAcc) {
        singleForm.setFieldsValue({
          accountId: targetAcc.id,
          currentBalance: targetAcc.currentBalance,
          minSafetyThreshold: targetAcc.minSafetyThreshold,
          notes: targetAcc.notes || '',
        });
      }
    }
  }, [open, accounts, initialSelectedAccountId, batchForm, singleForm]);

  // Cập nhật single form khi đổi tài khoản
  const handleSingleAccountChange = (accId: number) => {
    setSelectedAccountId(accId);
    const targetAcc = accounts.find((a) => a.id === accId);
    if (targetAcc) {
      singleForm.setFieldsValue({
        accountId: targetAcc.id,
        currentBalance: targetAcc.currentBalance,
        minSafetyThreshold: targetAcc.minSafetyThreshold,
        notes: targetAcc.notes || '',
      });
    }
  };

  // Tính tổng số dư cũ và mới cho banner live
  const totalOldBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  }, [accounts]);

  const totalNewBalance = useMemo(() => {
    if (activeMode === 'all') {
      return accounts.reduce((sum, a) => {
        const val = batchBalances[a.id];
        return sum + (typeof val === 'number' ? val : a.currentBalance);
      }, 0);
    } else {
      const currentEditingAcc = accounts.find((a) => a.id === selectedAccountId);
      const editingVal = singleForm.getFieldValue('currentBalance');
      const newEditingBal = typeof editingVal === 'number' ? editingVal : (currentEditingAcc?.currentBalance || 0);
      return accounts.reduce((sum, a) => {
        if (a.id === selectedAccountId) return sum + newEditingBal;
        return sum + (a.currentBalance || 0);
      }, 0);
    }
  }, [accounts, activeMode, batchBalances, selectedAccountId, singleForm]);

  const diffBalance = totalNewBalance - totalOldBalance;

  // Xử lý lưu đơn lẻ
  const handleSaveSingle = async () => {
    try {
      const values = await singleForm.validateFields();
      setSaving(true);
      await apiClient.cashFlow.updateAccount(values.accountId, {
        currentBalance: values.currentBalance,
        minSafetyThreshold: values.minSafetyThreshold,
        notes: values.notes,
      });
      onSuccess();
      onCancel();
    } catch {
      // Form validation error
    } finally {
      setSaving(false);
    }
  };

  // Xử lý lưu tất cả
  const handleSaveBatch = async () => {
    try {
      const values = await batchForm.validateFields();
      setSaving(true);

      const items: CashAccountBalanceAdjustment[] = accounts.map((acc) => ({
        id: acc.id,
        currentBalance: Number(values[`balance_${acc.id}`] ?? acc.currentBalance),
        minSafetyThreshold: Number(values[`threshold_${acc.id}`] ?? acc.minSafetyThreshold),
        notes: acc.notes || undefined,
      }));

      await apiClient.cashFlow.batchUpdateBalances(items);
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
          <span>Cài Đặt / Điều Chỉnh Số Dư Hiện Tại</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={720}
      footer={null}
      destroyOnHidden
    >
      <div className="space-y-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Chủ động nhập và cập nhật số dư tiền mặt và ngân hàng thực tế để đồng bộ chính xác dữ liệu dự báo dòng tiền trên Dashboard.
        </p>

        {/* Live Balance Summary Banner */}
        <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <span>TỔNG SỐ DƯ TOÀN HỆ THỐNG</span>
            <span className="text-[11px] font-normal text-neutral-400">Cập nhật theo thời gian thực</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-neutral-200 dark:border-neutral-800 text-xs">
            <div>
              <div className="text-neutral-400">Số dư hiện tại cũ:</div>
              <div className="text-sm font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">
                {totalOldBalance.toLocaleString('vi-VN')}đ
              </div>
            </div>

            <div>
              <div className="text-neutral-400">Số dư mới sau chỉnh:</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totalNewBalance.toLocaleString('vi-VN')}đ
              </div>
            </div>

            <div>
              <div className="text-neutral-400">Chênh lệch điều chỉnh:</div>
              <div
                className={`text-sm font-bold tabular-nums ${
                  diffBalance > 0
                    ? 'text-emerald-500'
                    : diffBalance < 0
                    ? 'text-rose-500'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {diffBalance > 0 ? '+' : ''}
                {diffBalance.toLocaleString('vi-VN')}đ
              </div>
            </div>
          </div>
        </div>

        {/* Chế độ điều chỉnh: Tất cả quỹ hoặc từng quỹ */}
        <div className="flex items-center justify-between pt-1">
          <Segmented
            value={activeMode}
            onChange={(val) => setActiveMode(val as 'all' | 'single')}
            options={[
              { label: 'Điều chỉnh tất cả quỹ tiền', value: 'all' },
              { label: 'Điều chỉnh theo từng quỹ', value: 'single' },
            ]}
          />
        </div>

        {/* Chế độ 1: Điều chỉnh tất cả quỹ */}
        {activeMode === 'all' && (
          <Form form={batchForm} layout="vertical" onFinish={handleSaveBatch}>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">
                        {acc.name}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {acc.accountType === 'CASH' ? 'Tiền mặt' : 'Ngân hàng'}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">[{acc.code}]</span>
                    </div>
                    {acc.accountNumber && (
                      <span className="text-xs text-neutral-400">
                        STK: {acc.accountNumber} ({acc.bankName || ''})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Form.Item
                      name={`balance_${acc.id}`}
                      label="Số dư thực tế hiện tại"
                      rules={[{ required: true, message: 'Nhập số dư' }]}
                      className="!mb-0"
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as any}
                        addonAfter="VNĐ"
                        onChange={(val) => {
                          setBatchBalances((prev) => ({
                            ...prev,
                            [acc.id]: typeof val === 'number' ? val : 0,
                          }));
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      name={`threshold_${acc.id}`}
                      label="Ngưỡng an toàn tối thiểu"
                      rules={[{ required: true, message: 'Nhập ngưỡng an toàn' }]}
                      className="!mb-0"
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as any}
                        addonAfter="VNĐ"
                        onChange={(val) => {
                          setBatchSafetyThresholds((prev) => ({
                            ...prev,
                            [acc.id]: typeof val === 'number' ? val : 0,
                          }));
                        }}
                      />
                    </Form.Item>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Button onClick={onCancel} disabled={saving}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<AppIcon icon={CheckCircle2} size="sm" />}
                className="bg-emerald-600 hover:bg-emerald-500 border-none"
              >
                Lưu tất cả số dư
              </Button>
            </div>
          </Form>
        )}

        {/* Chế độ 2: Điều chỉnh đơn lẻ */}
        {activeMode === 'single' && (
          <Form form={singleForm} layout="vertical" onFinish={handleSaveSingle}>
            <Form.Item
              name="accountId"
              label="Chọn tài khoản / Quỹ tiền cần điều chỉnh"
              rules={[{ required: true, message: 'Vui lòng chọn tài khoản' }]}
            >
              <Select
                onChange={handleSingleAccountChange}
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name} — ${acc.currentBalance.toLocaleString('vi-VN')}đ (${
                    acc.accountType === 'CASH' ? 'Tiền mặt' : 'Ngân hàng'
                  })`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="currentBalance"
              label="Số dư tiền thực tế hiện tại"
              rules={[{ required: true, message: 'Vui lòng nhập số dư hiện tại' }]}
              extra="Số dư thực tế được kiểm kê hoặc xác nhận từ sổ phụ ngân hàng."
            >
              <InputNumber
                className="w-full"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as any}
                addonAfter="VNĐ"
              />
            </Form.Item>

            <Form.Item
              name="minSafetyThreshold"
              label="Ngưỡng an toàn tối thiểu (Min Safety Threshold)"
              rules={[{ required: true, message: 'Vui lòng nhập ngưỡng an toàn' }]}
              extra="Khi số dư dự báo rơi xuống dưới mức này, hệ thống sẽ kích hoạt cảnh báo nguy cơ thiếu tiền."
            >
              <InputNumber
                className="w-full"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0) as any}
                addonAfter="VNĐ"
              />
            </Form.Item>

            <Form.Item name="notes" label="Ghi chú đối chiếu / lý do điều chỉnh">
              <Input.TextArea
                rows={2}
                placeholder="Ví dụ: Đối chiếu sao kê ngân hàng ngày hôm nay..."
              />
            </Form.Item>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Button onClick={onCancel} disabled={saving}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                icon={<AppIcon icon={CheckCircle2} size="sm" />}
                className="bg-emerald-600 hover:bg-emerald-500 border-none"
              >
                Lưu cập nhật số dư
              </Button>
            </div>
          </Form>
        )}
      </div>
    </AdaptiveModal>
  );
}
