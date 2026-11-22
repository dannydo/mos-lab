'use client';

import React from 'react';
import { Col, Form, InputNumber, Radio, Row, Slider } from 'antd';
import type { FormInstance } from 'antd';
import type { ToleranceMode } from '@mos-lab/shared';
import { formatCurrencyInput, parseCurrencyInput } from './fundFormHelpers';
import type { FundFormValues } from './types';

export interface FundFinancialConfigTabProps {
  form: FormInstance<FundFormValues>;
  toleranceMode: ToleranceMode;
  onToleranceModeChange: (mode: ToleranceMode) => void;
}

export function FundFinancialConfigTab({ form, toleranceMode, onToleranceModeChange }: FundFinancialConfigTabProps) {
  const watchedThreshold = Form.useWatch('alertThresholdPercent', form);
  const displayThreshold = watchedThreshold ?? form.getFieldValue('alertThresholdPercent') ?? 80;

  return (
    <div className="space-y-4 py-2">
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={<span className="font-semibold text-slate-800 dark:text-slate-200">Hạn mức quỹ tối đa</span>}
            name="maxQuota"
            rules={[{ required: true, message: 'Vui lòng nhập hạn mức quỹ' }]}
            extra="Số tiền tối đa quỹ được phép giữ và phân bổ trong một chu kỳ."
          >
            <InputNumber
              className="w-full tabular-nums"
              size="large"
              min={10000}
              step={100000}
              formatter={formatCurrencyInput}
              parser={parseCurrencyInput}
              addonAfter="đ"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            label={<span className="font-semibold text-slate-800 dark:text-slate-200">Định mức chi / giao dịch</span>}
            name="unitQuota"
            rules={[{ required: true, message: 'Vui lòng nhập định mức mỗi giao dịch' }]}
            extra="Hạn mức tiêu chuẩn tối đa cho mỗi lần chi tiêu thông thường."
          >
            <InputNumber
              className="w-full tabular-nums"
              size="large"
              min={1000}
              step={10000}
              formatter={formatCurrencyInput}
              parser={parseCurrencyInput}
              addonAfter="đ"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Ngưỡng cảnh báo chi tiêu</span>
            <span className="text-xs text-slate-500 tabular-nums font-mono">{displayThreshold || 80}%</span>
          </div>
        }
        name="alertThresholdPercent"
        extra="Khi tỷ lệ giải ngân đạt đến ngưỡng này, hệ thống sẽ bật cảnh báo SẮP HẾT HẠN MỨC để đề xuất bổ sung quỹ kịp thời."
      >
        <Slider
          min={10}
          max={95}
          marks={{
            50: '50%',
            70: '70%',
            80: '80% (Chuẩn)',
            90: '90%',
          }}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={<span className="font-semibold text-slate-800 dark:text-slate-200">Chế độ kiểm soát giải ngân</span>}
            name="toleranceMode"
            rules={[{ required: true, message: 'Vui lòng chọn chế độ kiểm soát' }]}
          >
            <Radio.Group
              className="flex flex-col gap-2.5 mt-1"
              onChange={(e) => onToleranceModeChange(e.target.value as ToleranceMode)}
            >
              <Radio value="STRICT">
                <span className="font-medium text-slate-800 dark:text-slate-200">STRICT (Chính xác tuyệt đối)</span>
                <div className="text-xs text-slate-500">
                  Kế toán chỉ được giải ngân chính xác 100% số tiền đã phê duyệt.
                </div>
              </Radio>
              <Radio value="TOLERANCE_FIXED">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  TOLERANCE_FIXED (Dung sai tùy chỉnh)
                </span>
                <div className="text-xs text-slate-500">
                  Cho phép Kế toán giải ngân chênh lệch trong hạn mức dung sai cố định.
                </div>
              </Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        {toleranceMode === 'TOLERANCE_FIXED' && (
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <span className="font-semibold text-slate-800 dark:text-slate-200">Mức dung sai cho phép (±)</span>
              }
              name="toleranceAmount"
              rules={[{ required: true, message: 'Vui lòng nhập số tiền dung sai cho phép' }]}
              extra="Số tiền tối đa cho phép giải ngân lệch mà không cần tái phê duyệt."
            >
              <InputNumber
                className="w-full tabular-nums"
                size="large"
                min={0}
                step={10000}
                formatter={formatCurrencyInput}
                parser={parseCurrencyInput}
                addonAfter="đ"
              />
            </Form.Item>
          </Col>
        )}
      </Row>

      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
        🔒 <strong>Bảo toàn vốn</strong>: Khởi tạo quỹ mới hoàn toàn không tự động cấp vốn. Số dư ban đầu luôn được
        thiết lập cố định <strong>0đ</strong>.
      </div>
    </div>
  );
}
