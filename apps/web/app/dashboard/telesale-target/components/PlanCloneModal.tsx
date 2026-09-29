'use client';

import React, { useState, useEffect } from 'react';
import { Form, DatePicker, Checkbox, Typography, Button, message, Alert, Select } from 'antd';
import { Copy, Calendar, AlertCircle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal } from '../../../../components/ui';

const { Text } = Typography;

interface PlanCloneModalProps {
  open: boolean;
  onClose: () => void;
  currentMonth: string;
  availableMonths: string[];
  overview: TelesaleTargetOverview | null;
  onSuccess: (newMonth: string) => void;
}

export const PlanCloneModal: React.FC<PlanCloneModalProps> = ({
  open,
  onClose,
  currentMonth,
  availableMonths,
  overview,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedSourceMonth, setSelectedSourceMonth] = useState<string>(currentMonth);
  const [selectedTargetMonth, setSelectedTargetMonth] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedSourceMonth(currentMonth);

      // Default target month to next month
      const currentDayjs = dayjs(`${currentMonth}-01`);
      const nextMonthDayjs = currentDayjs.isValid() ? currentDayjs.add(1, 'month') : dayjs().add(1, 'month');
      const defaultTarget = nextMonthDayjs.format('YYYY-MM');

      setSelectedTargetMonth(defaultTarget);
      form.setFieldsValue({
        sourceMonth: currentMonth,
        targetMonthDate: nextMonthDayjs,
        overwrite: false,
      });
    }
  }, [open, currentMonth, form]);

  const handleTargetDateChange = (date: Dayjs | null) => {
    if (date && date.isValid()) {
      setSelectedTargetMonth(date.format('YYYY-MM'));
    } else {
      setSelectedTargetMonth('');
    }
  };

  const isTargetAlreadyConfigured = availableMonths.includes(selectedTargetMonth);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const targetDate = values.targetMonthDate as Dayjs;

      if (!targetDate || !targetDate.isValid()) {
        message.error('Vui lòng chọn tháng mục tiêu hợp lệ');
        return;
      }

      const targetMonthStr = targetDate.format('YYYY-MM');
      const sourceMonthStr = values.sourceMonth || currentMonth;

      if (sourceMonthStr === targetMonthStr) {
        message.error('Tháng mục tiêu không được trùng với tháng nguồn');
        return;
      }

      setSubmitting(true);
      await apiClient.telesaleTarget.cloneConfig({
        sourceMonth: sourceMonthStr,
        targetMonth: targetMonthStr,
        overwrite: Boolean(values.overwrite),
      });

      message.success(`Sao chép kế hoạch sang Tháng ${targetMonthStr} thành công!`);
      onClose();
      onSuccess(targetMonthStr);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Không thể sao chép kế hoạch mục tiêu';
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2.5 text-zinc-100">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Copy className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Sao Chép Kế Hoạch Telesales</div>
            <div className="text-[11px] text-zinc-400 font-normal">
              Nhân bản toàn bộ chỉ tiêu KPI Team, Pacing, Booker và 4 Phân khúc Phễu sang tháng mới
            </div>
          </div>
        </div>
      }
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose} className="rounded-xl border-zinc-700 text-zinc-300">
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          onClick={handleSubmit}
          icon={<Copy className="w-3.5 h-3.5" />}
          className="rounded-xl border-0 bg-amber-500 font-semibold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
        >
          Tiến hành Sao chép
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="mt-2 space-y-4">
        {/* Source -> Target Month Flow Card */}
        <div className="rounded-2xl border border-amber-500/30 bg-zinc-900/60 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Source Month */}
            <Form.Item
              name="sourceMonth"
              label={<span className="text-xs font-semibold text-zinc-300">Tháng nguồn (Dữ liệu gốc)</span>}
              className="!mb-0"
            >
              <Select
                value={selectedSourceMonth}
                onChange={(val) => setSelectedSourceMonth(val)}
                className="w-full"
                options={availableMonths.map((m) => ({
                  value: m,
                  label: `Tháng ${m.split('-')[1]}/${m.split('-')[0]} ${m === '2026-10' ? '(Chuẩn)' : ''}`,
                }))}
              />
            </Form.Item>

            {/* Target Month */}
            <Form.Item
              name="targetMonthDate"
              label={<span className="text-xs font-semibold text-amber-300">Tháng đích (Cần áp dụng)</span>}
              rules={[{ required: true, message: 'Vui lòng chọn tháng cần clone' }]}
              className="!mb-0"
            >
              <DatePicker
                picker="month"
                format="MM/YYYY"
                placeholder="Chọn tháng..."
                onChange={handleTargetDateChange}
                className="w-full !rounded-xl !bg-zinc-950 !border-amber-500/40 !text-zinc-100"
              />
            </Form.Item>
          </div>

          {/* Quick Direction Badge */}
          <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
              {selectedSourceMonth}
            </span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/40 font-bold">
              {selectedTargetMonth || 'Chọn tháng'}
            </span>
          </div>
        </div>

        {/* Existing Month Warning & Overwrite Option */}
        {isTargetAlreadyConfigured && (
          <Alert
            type="warning"
            showIcon
            icon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
            message={<span className="text-xs font-bold text-amber-300">Tháng này đã có kế hoạch trước đó!</span>}
            description={
              <div className="text-xs text-zinc-300 mt-1">
                Kế hoạch của Tháng <span className="font-mono font-bold text-amber-300">{selectedTargetMonth}</span> đã
                tồn tại. Nếu bạn muốn sao chép đè số liệu mới, vui lòng tích chọn ô xác nhận ghi đè bên dưới.
              </div>
            }
            className="!border-amber-500/40 !bg-amber-950/30 !rounded-2xl"
          />
        )}

        <Form.Item name="overwrite" valuePropName="checked" className="!mb-1">
          <Checkbox className="text-xs text-zinc-300">
            Xác nhận ghi đè nếu tháng mục tiêu đã có cấu hình kế hoạch từ trước
          </Checkbox>
        </Form.Item>

        {/* Plan Preview Summary Box */}
        {overview && (
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-2.5">
            <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Nội Dung Kế Hoạch Sẽ Được Nhân Bản
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800">
                <span className="text-zinc-500 block text-[11px]">Chỉ tiêu Team Tháng</span>
                <span className="font-mono font-bold text-zinc-100 text-sm">
                  {overview.teamMonth.doneTarget} Done / {overview.teamMonth.bookTarget} Book
                </span>
              </div>

              <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800">
                <span className="text-zinc-500 block text-[11px]">Chỉ tiêu Ngày</span>
                <span className="font-mono font-bold text-zinc-100 text-sm">
                  {overview.teamDaily.doneTarget} Done / {overview.dailyAction.callTargetPerStaff} Cuộc gọi
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/80 rounded-xl p-2.5 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <div>
                <strong className="text-zinc-300">Nhân sự ({overview.staffTargets.length} bạn):</strong>{' '}
                {overview.staffTargets.map((s) => `${s.name} (${s.doneTarget})`).join(', ')}
              </div>
              <div>
                <strong className="text-zinc-300">4 Phân khúc Phễu:</strong>{' '}
                {overview.pipelineStages.map((st) => `${st.label} (${st.doneTarget})`).join(' • ')}
              </div>
            </div>
          </div>
        )}
      </Form>
    </AdaptiveModal>
  );
};
