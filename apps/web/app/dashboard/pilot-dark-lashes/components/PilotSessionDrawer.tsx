'use client';

import React, { useMemo, useEffect } from 'react';
import { Button, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import { Package, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { PilotMaterial } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { EntityFormDrawer } from '../../../../components/ui/EntityFormDrawer';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

interface PilotSessionDrawerProps {
  open: boolean;
  isEditing: boolean;
  form: FormInstance;
  materialsCatalog: PilotMaterial[];
  onClose: () => void;
  onSubmit: () => void;
}

export function PilotSessionDrawer({
  open,
  isEditing,
  form,
  materialsCatalog,
  onClose,
  onSubmit,
}: PilotSessionDrawerProps) {
  const formRevenue = Form.useWatch('revenue', form) ?? 990000;
  const formMaterialCost = Form.useWatch('materialCost', form) ?? 0;
  const formTechnicianCost = Form.useWatch('technicianCost', form) ?? 0;
  const formCommissionAmount = Form.useWatch('commissionAmount', form) ?? 0;
  const formPromoAmount = Form.useWatch('promoAmount', form) ?? 0;
  const formRefundAmount = Form.useWatch('refundAmount', form) ?? 0;
  const formMaterials: Array<{ materialId?: number; usageAmount?: number }> = Form.useWatch('materials', form) || [];

  const catalogMap = useMemo(() => {
    const map = new Map<number, PilotMaterial>();
    materialsCatalog.forEach((m) => map.set(m.id, m));
    return map;
  }, [materialsCatalog]);

  const liveConsumablesCost = useMemo(() => {
    if (!formMaterials || formMaterials.length === 0) return 0;
    return formMaterials.reduce((total, item) => {
      if (!item?.materialId || !item?.usageAmount || item.usageAmount <= 0) return total;
      const mat = catalogMap.get(item.materialId);
      if (!mat) return total;
      return total + Math.round(Number(mat.costPerUnit) * Number(item.usageAmount));
    }, 0);
  }, [formMaterials, catalogMap]);

  // Keep materialCost synced with liveConsumablesCost when materials list is used
  useEffect(() => {
    if (formMaterials && formMaterials.length > 0) {
      form.setFieldValue('materialCost', liveConsumablesCost);
    }
  }, [formMaterials, liveConsumablesCost, form]);

  const effectiveMaterialCost = formMaterials && formMaterials.length > 0 ? liveConsumablesCost : formMaterialCost || 0;

  const liveTotalCost =
    effectiveMaterialCost +
    (formTechnicianCost || 0) +
    (formCommissionAmount || 0) +
    (formPromoAmount || 0) +
    (formRefundAmount || 0);

  const liveContribution = (formRevenue || 0) - liveTotalCost;
  const liveMarginPct = formRevenue > 0 ? Math.round((liveContribution / formRevenue) * 100) : 0;

  return (
    <EntityFormDrawer
      title={
        <div className="flex items-center gap-2 text-base font-bold">
          <AppIcon icon={Sparkles} size="sm" className="text-emerald-500" />
          {isEditing ? 'Cập nhật Ca Dịch Vụ Pilot' : 'Thêm Mới Ca Dịch Vụ Pilot (Uốn Mi Bóng Tối)'}
        </div>
      }
      open={open}
      onClose={onClose}
      width={720}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSubmit}>
            {isEditing ? 'Lưu thay đổi' : 'Tạo ca làm'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="space-y-4">
        {/* Phase 1: Customer & Logistics */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            1. Thông tin khách hàng & ca làm
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="customerName"
              label="Tên khách hàng"
              rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
              className="!mb-2"
            >
              <Input placeholder="VD: Nguyễn Thị Mai" className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="customerPhone"
              label="Số điện thoại"
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
              className="!mb-2"
            >
              <Input placeholder="VD: 0901234567" className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="sessionDate"
              label="Ngày làm dịch vụ"
              rules={[{ required: true, message: 'Vui lòng chọn ngày làm' }]}
              className="!mb-2"
            >
              <Input type="date" className="rounded-lg" />
            </Form.Item>

            <Form.Item name="bookingTime" label="Giờ booking (HH:mm)" className="!mb-2">
              <Input placeholder="VD: 14:30" className="rounded-lg tabular-nums" />
            </Form.Item>

            <Form.Item name="technicianName" label="Kỹ thuật viên phụ trách" className="!mb-2">
              <Select
                placeholder="Chọn KTV"
                className="rounded-lg"
                options={[
                  { label: 'Cô Đẫm (Lead Technical)', value: 'Cô Đẫm' },
                  { label: 'KTV Wings Đề Thám', value: 'KTV Wings Đề Thám' },
                ]}
                allowClear
              />
            </Form.Item>

            <Form.Item name="bookingNote" label="Ghi chú booking" className="!mb-2 sm:col-span-2">
              <Input.TextArea
                rows={2}
                placeholder="VD: Khách muốn mi cong tự nhiên, mắt nhạy cảm..."
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item name="source" label="Nguồn khách" className="!mb-2">
              <Select
                placeholder="Chọn nguồn khách"
                options={[
                  { label: 'Facebook Ads', value: 'Facebook' },
                  { label: 'Walk-in (Khách vãng lai)', value: 'Walk-in' },
                  { label: 'Hotline / CSKH', value: 'Hotline' },
                  { label: 'Người quen / Giới thiệu', value: 'Referral' },
                ]}
                allowClear
              />
            </Form.Item>

            <Form.Item name="revenue" label="Doanh thu dịch vụ (đ)" className="!mb-2">
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0)}
                min={0}
              />
            </Form.Item>
          </div>
        </div>

        {/* Phase 2: Consumables Material Tracking */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AppIcon icon={Package} size="sm" className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                2. Theo dõi Vật tư Tiêu hao (Consumables)
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Tổng Consumables Cost / Done: </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatVND(liveConsumablesCost)}
              </span>
            </div>
          </div>

          <Form.List name="materials">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                {fields.map(({ key, name, ...restField }) => {
                  const currentItem = formMaterials[name];
                  const selectedMat = currentItem?.materialId ? catalogMap.get(currentItem.materialId) : null;
                  const usage = currentItem?.usageAmount || 0;
                  const rowCost = selectedMat ? Math.round(selectedMat.costPerUnit * usage) : 0;

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex-1">
                        <Form.Item
                          {...restField}
                          name={[name, 'materialId']}
                          rules={[{ required: true, message: 'Chọn vật tư' }]}
                          className="!mb-0"
                        >
                          <Select
                            placeholder="Chọn vật tư sử dụng"
                            className="w-full"
                            options={materialsCatalog
                              .filter((m) => m.isActive || m.id === currentItem?.materialId)
                              .map((m) => ({
                                value: m.id,
                                label: `${m.name} (${formatVND(m.costPerUnit)}/${m.unit})`,
                              }))}
                          />
                        </Form.Item>
                      </div>

                      <div className="w-32">
                        <Form.Item
                          {...restField}
                          name={[name, 'usageAmount']}
                          rules={[{ required: true, message: 'Lượng dùng' }]}
                          className="!mb-0"
                        >
                          <InputNumber
                            min={0.1}
                            step={selectedMat?.unit === 'cặp' || selectedMat?.unit === 'miếng' ? 1 : 0.5}
                            placeholder="Lượng"
                            addonAfter={selectedMat?.unit || 'đv'}
                            className="w-full tabular-nums"
                          />
                        </Form.Item>
                      </div>

                      <div className="w-32 text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">Cost tạm tính</span>
                        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {formatVND(rowCost)}
                        </span>
                      </div>

                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<AppIcon icon={Trash2} size="sm" />}
                        onClick={() => remove(name)}
                      />
                    </div>
                  );
                })}

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button
                    type="dashed"
                    onClick={() => add({ materialId: undefined, usageAmount: 1 })}
                    icon={<AppIcon icon={Plus} size="sm" />}
                    className="rounded-lg text-xs"
                  >
                    Thêm vật tư đã dùng
                  </Button>
                  {materialsCatalog.length > 0 && fields.length === 0 && (
                    <Button
                      type="default"
                      onClick={() => {
                        const standardPreset = materialsCatalog
                          .filter((m) => m.isActive)
                          .map((m) => ({
                            materialId: m.id,
                            usageAmount: 1,
                          }));
                        form.setFieldValue('materials', standardPreset);
                      }}
                      className="text-xs rounded-lg text-emerald-600 border-emerald-500/30"
                    >
                      Áp dụng định lượng chuẩn (1 ca)
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Form.List>
        </div>

        {/* Phase 3: Direct Costs & Unit Economics */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            3. Chi phí trực tiếp & Unit Economics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Form.Item
              name="materialCost"
              label="Vật tư tiêu hao (đ)"
              tooltip="Tự động tính từ danh sách vật tư bên trên hoặc nhập trực tiếp"
              className="!mb-2"
            >
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
                min={0}
              />
            </Form.Item>

            <Form.Item name="technicianCost" label="Chi phí KTV (đ)" className="!mb-2">
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
                min={0}
              />
            </Form.Item>

            <Form.Item name="commissionAmount" label="Commission / HH (đ)" className="!mb-2">
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
                min={0}
              />
            </Form.Item>

            <Form.Item name="promoAmount" label="Voucher / Giảm giá (đ)" className="!mb-2">
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
                min={0}
              />
            </Form.Item>

            <Form.Item name="refundAmount" label="Đền bù / Refund (đ)" className="!mb-2">
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
                min={0}
              />
            </Form.Item>
          </div>

          {/* Live Reactive Economics Preview */}
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Tổng chi phí trực tiếp: <strong className="tabular-nums">{formatVND(liveTotalCost)}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">
                Contribution Margin dự kiến:
              </span>
              <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatVND(liveContribution)} ({liveMarginPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Phase 4: Follow-up & Satisfaction */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            4. Chăm sóc 24h–72h & Đánh giá (CSAT)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="followUp24hStatus" label="Follow-up 24h" className="!mb-2">
              <Select
                options={[
                  { label: 'Chờ gọi (Pending)', value: 'PENDING' },
                  { label: 'Đã hoàn tất (Done)', value: 'DONE' },
                  { label: 'Bỏ qua (Skipped)', value: 'SKIPPED' },
                ]}
              />
            </Form.Item>

            <Form.Item name="followUp72hStatus" label="Follow-up 72h" className="!mb-2">
              <Select
                options={[
                  { label: 'Chờ gọi (Pending)', value: 'PENDING' },
                  { label: 'Đã hoàn tất (Done)', value: 'DONE' },
                  { label: 'Bỏ qua (Skipped)', value: 'SKIPPED' },
                ]}
              />
            </Form.Item>

            <Form.Item name="csatScore" label="Chấm điểm CSAT (1 - 5 sao)" className="!mb-2">
              <InputNumber min={1} max={5} className="w-full" placeholder="Nhập số sao (1-5)" />
            </Form.Item>

            <Form.Item name="issues" label="Vấn đề phát sinh (nếu có)" className="!mb-2">
              <Input placeholder="VD: Khách báo cay mắt nhẹ sau làm..." className="rounded-lg" />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Ghi chú thêm" className="!mb-0 mt-2">
            <Input.TextArea rows={2} placeholder="Nhận xét của khách, đề xuất kỹ thuật..." className="rounded-lg" />
          </Form.Item>
        </div>
      </Form>
    </EntityFormDrawer>
  );
}
