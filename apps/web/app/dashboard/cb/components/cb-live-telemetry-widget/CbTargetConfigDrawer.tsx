'use client';

import React from 'react';
import { Form, InputNumber, type FormInstance } from 'antd';
import type { CbTargetConfig } from '@mos-lab/shared';
import { AdaptiveDrawer } from '~/components/ui';
import type { CbStoreScope } from './cb-live-telemetry-types';

interface CbTargetConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  form: FormInstance<Partial<CbTargetConfig>>;
  saving: boolean;
  onFinish: (values: Partial<CbTargetConfig>) => void;
  selectedMonth: string;
  storeScope: CbStoreScope;
  daysInMonth: number;
}

const formatThousands = (value: number | string | undefined): string =>
  value === undefined || value === null ? '' : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const parseThousands = (displayValue: string | undefined): string => (displayValue ?? '').replace(/\$\s?|(,*)/g, '');

export function CbTargetConfigDrawer({
  open,
  onClose,
  form,
  saving,
  onFinish,
  selectedMonth,
  storeScope,
  daysInMonth,
}: CbTargetConfigDrawerProps) {
  return (
    <AdaptiveDrawer
      title={
        <div>
          <div className="text-base font-bold text-slate-200">MỤC TIÊU THÁNG {selectedMonth}</div>
          <div className="text-xs text-slate-400 font-normal">
            Phạm vi: {storeScope === 'DE_THAM_ESTELLA' ? 'Đề Thám + Estella' : storeScope}
          </div>
        </div>
      }
      open={open}
      onClose={onClose}
      width={420}
      closable={{ placement: 'end' }}
      className="dark-theme"
    >
      <Form<Partial<CbTargetConfig>> form={form} layout="vertical" onFinish={onFinish} className="space-y-4">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed">
          Mục tiêu được lưu trực tiếp vào cơ sở dữ liệu hệ thống. Tháng {selectedMonth} có {daysInMonth} ngày.
        </div>

        <Form.Item
          label="Mục tiêu Doanh số gói chưa VAT (đ)"
          name="comboSalesTarget"
          rules={[{ required: true, message: 'Vui lòng nhập mục tiêu gói' }]}
        >
          <InputNumber className="w-full" formatter={formatThousands} parser={parseThousands} />
        </Form.Item>

        <Form.Item
          label="Mục tiêu Doanh số sản phẩm chưa VAT (đ)"
          name="productSalesTarget"
          rules={[{ required: true, message: 'Vui lòng nhập mục tiêu sản phẩm' }]}
        >
          <InputNumber className="w-full" formatter={formatThousands} parser={parseThousands} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="Done Vòng Xanh (Lượt)" name="greenFunnelDoneTarget">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Tỷ lệ chốt VX (%)" name="greenFunnelConversionTarget">
            <InputNumber className="w-full" min={0} max={100} step={0.1} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="Done dùng gói (Mốc)" name="packageUsageDoneTarget">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Doanh số mua tiếp (đ)" name="repeatComboSalesTarget">
            <InputNumber className="w-full" formatter={formatThousands} parser={parseThousands} />
          </Form.Item>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-800 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition-colors shadow-lg"
          >
            {saving ? 'Đang lưu...' : 'Lưu mục tiêu'}
          </button>
        </div>
      </Form>
    </AdaptiveDrawer>
  );
}
