'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, message } from 'antd';
import type { FormInstance } from 'antd';
import { Sparkles } from 'lucide-react';
import type { CreatePilotMaterialRequest, PilotMaterial, PilotSession, PilotSessionStep } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { EntityFormDrawer } from '../../../../components/ui/EntityFormDrawer';
import { apiClient } from '../../../../lib/api-client';
import { PilotStepTimer } from './PilotStepTimer';
import { PilotQuickMaterialModal } from './pilot-session/PilotQuickMaterialModal';
import { PilotSessionConsumablesSection } from './pilot-session/PilotSessionConsumablesSection';
import {
  computeLiveConsumablesCost,
  computeLiveSessionEconomics,
  formatPilotVND,
} from './pilot-session/pilot-session-utils';

interface PilotSessionDrawerProps {
  open: boolean;
  isEditing: boolean;
  form: FormInstance;
  session?: PilotSession | null;
  materialsCatalog: PilotMaterial[];
  onRefreshMaterials?: () => void;
  onClose: () => void;
  onSubmit: () => void;
  onSessionUpdated?: (updated: PilotSession) => void;
}

export function PilotSessionDrawer({
  open,
  isEditing,
  form,
  session,
  materialsCatalog,
  onRefreshMaterials,
  onClose,
  onSubmit,
  onSessionUpdated,
}: PilotSessionDrawerProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [deducting, setDeducting] = useState(false);
  const [quickForm] = Form.useForm();

  const handleDeductStock = async () => {
    if (!session?.id) return;
    try {
      setDeducting(true);
      const res = await apiClient.pilot.deductStock(session.id);
      message.success(`Đã trừ kho tồn thành công (${res.deductedCount} vật tư)!`);
      if (session) {
        onSessionUpdated?.({ ...session, isStockDeducted: true });
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi trừ kho vật tư.');
    } finally {
      setDeducting(false);
    }
  };

  const watchQuickPrice = Form.useWatch('purchasePrice', quickForm) ?? 0;
  const watchQuickVolume = Form.useWatch('volume', quickForm) ?? 1;
  const quickCostPerUnit = watchQuickVolume > 0 ? Math.round(watchQuickPrice / watchQuickVolume) : 0;

  const [sessionSteps, setSessionSteps] = useState<PilotSessionStep[]>(session?.steps || []);

  useEffect(() => {
    if (session?.id) {
      if (session.steps && session.steps.length > 0) {
        setSessionSteps(session.steps);
      } else {
        apiClient.pilot
          .getSessionSteps(session.id)
          .then((res) => {
            if (res && res.length > 0) {
              setSessionSteps(res);
              onSessionUpdated?.({ ...session, steps: res });
            }
          })
          .catch(() => {});
      }
    } else {
      setSessionSteps([]);
    }
  }, [session?.id]);

  const handleStepsChange = (newSteps: PilotSessionStep[]) => {
    setSessionSteps(newSteps);
    let totalSec = 0;
    for (const s of newSteps) {
      if (s.durationSeconds && s.durationSeconds > 0) totalSec += s.durationSeconds;
    }
    if (session) {
      onSessionUpdated?.({
        ...session,
        steps: newSteps,
        totalTechnicalDurationSeconds: totalSec > 0 ? totalSec : null,
      });
    }
  };

  const handleSaveQuickMaterial = async () => {
    try {
      setQuickSubmitting(true);
      const values = await quickForm.validateFields();
      const created = await apiClient.pilot.createMaterial(values as CreatePilotMaterialRequest);
      message.success(`Đã thêm vật tư "${created.name}" vào danh mục và chọn cho ca này!`);
      quickForm.resetFields();
      setQuickAddOpen(false);
      if (onRefreshMaterials) {
        onRefreshMaterials();
      }
      const current = form.getFieldValue('materials') || [];
      form.setFieldValue('materials', [...current, { materialId: created.id, usageAmount: 1 }]);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi tạo vật tư mới.');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const formRevenue = Form.useWatch('revenue', form) ?? 990000;
  const formMaterialCost = Form.useWatch('materialCost', form) ?? 0;
  const formTechnicianCost = Form.useWatch('technicianCost', form) ?? 0;
  const formCommissionAmount = Form.useWatch('commissionAmount', form) ?? 0;
  const formPromoAmount = Form.useWatch('promoAmount', form) ?? 0;
  const formRefundAmount = Form.useWatch('refundAmount', form) ?? 0;
  const watchedMaterials = Form.useWatch('materials', form) as
    Array<{ materialId?: number; usageAmount?: number }> | undefined;
  const formMaterials = useMemo(() => watchedMaterials || [], [watchedMaterials]);

  const catalogMap = useMemo(() => {
    const map = new Map<number, PilotMaterial>();
    materialsCatalog.forEach((m) => map.set(m.id, m));
    return map;
  }, [materialsCatalog]);

  const liveConsumablesCost = useMemo(
    () => computeLiveConsumablesCost(formMaterials, catalogMap),
    [formMaterials, catalogMap]
  );

  // Keep materialCost synced with liveConsumablesCost when materials list is used
  useEffect(() => {
    if (formMaterials && formMaterials.length > 0) {
      form.setFieldValue('materialCost', liveConsumablesCost);
    }
  }, [formMaterials, liveConsumablesCost, form]);

  const { liveTotalCost, liveContribution, liveMarginPct } = computeLiveSessionEconomics({
    hasMaterials: Boolean(formMaterials && formMaterials.length > 0),
    liveConsumablesCost,
    formMaterialCost,
    formTechnicianCost,
    formCommissionAmount,
    formPromoAmount,
    formRefundAmount,
    formRevenue,
  });

  return (
    <>
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
              1. Thông tin khách hàng &amp; ca làm
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

              <Form.Item name="technicianName" label="Chuyên Viên phụ trách" className="!mb-2">
                <Select
                  placeholder="Chọn CV"
                  className="rounded-lg"
                  options={[
                    { label: 'Cô Đẫm (Lead Technical)', value: 'Cô Đẫm' },
                    { label: 'CV Wings Đề Thám', value: 'CV Wings Đề Thám' },
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

          <PilotSessionConsumablesSection
            form={form}
            quickForm={quickForm}
            session={session}
            materialsCatalog={materialsCatalog}
            catalogMap={catalogMap}
            formMaterials={formMaterials}
            liveConsumablesCost={liveConsumablesCost}
            deducting={deducting}
            onDeductStock={handleDeductStock}
            onOpenQuickAdd={() => setQuickAddOpen(true)}
          />

          {/* Phase: Technical Steps Timer History (SOP) */}
          {session && session.id && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Theo Dõi Thời Gian Kỹ Thuật (SOP Timer)
              </div>
              <PilotStepTimer
                sessionId={session.id}
                steps={sessionSteps}
                onStepsChange={handleStepsChange}
                readOnly={false}
              />
            </div>
          )}

          {/* Phase 3: Direct Costs & Unit Economics */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              3. Chi phí trực tiếp &amp; Unit Economics
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

              <Form.Item name="technicianCost" label="Chi phí CV (đ)" className="!mb-2">
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
                  Tổng chi phí trực tiếp: <strong className="tabular-nums">{formatPilotVND(liveTotalCost)}</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">
                  Contribution Margin dự kiến:
                </span>
                <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatPilotVND(liveContribution)} ({liveMarginPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Phase 4: Follow-up & Satisfaction */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              4. Chăm sóc 24h–72h &amp; Đánh giá (CSAT)
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

      <PilotQuickMaterialModal
        open={quickAddOpen}
        quickForm={quickForm}
        quickSubmitting={quickSubmitting}
        quickCostPerUnit={quickCostPerUnit}
        onCancel={() => setQuickAddOpen(false)}
        onOk={handleSaveQuickMaterial}
      />
    </>
  );
}
