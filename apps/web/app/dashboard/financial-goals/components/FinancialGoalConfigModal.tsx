'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Form, InputNumber, Input, Typography, Alert, Row, Col, Divider, Button, message } from 'antd';
import { Target, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { FinancialGoalsConfigDto, FinancialGoalsOverview } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal } from '../../../../components/ui';

const { Text } = Typography;

interface FinancialGoalConfigModalProps {
  open: boolean;
  onClose: () => void;
  overview: FinancialGoalsOverview | null;
  onSuccess: () => void | Promise<void>;
}

export const FinancialGoalConfigModal: React.FC<FinancialGoalConfigModalProps> = ({
  open,
  onClose,
  overview,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const wasOpenRef = useRef(false);

  const [totalTarget, setTotalTarget] = useState<number>(850_000_000);
  const [componentSum, setComponentSum] = useState<number>(850_000_000);

  useEffect(() => {
    if (open && !wasOpenRef.current && overview) {
      wasOpenRef.current = true;
      const initialValues: FinancialGoalsConfigDto = {
        month: overview.month,
        totalRevenueTarget: overview.config.totalRevenueTarget || 850_000_000,
        comboRevenueTarget: overview.config.comboRevenueTarget || 550_000_000,
        retailRevenueTarget: overview.config.retailRevenueTarget || 250_000_000,
        productRevenueTarget: overview.config.productRevenueTarget || 50_000_000,
        note: overview.config.note || '',
      };
      form.setFieldsValue(initialValues);
      setTotalTarget(initialValues.totalRevenueTarget);
      setComponentSum(
        initialValues.comboRevenueTarget + initialValues.retailRevenueTarget + initialValues.productRevenueTarget
      );
    } else if (!open) {
      wasOpenRef.current = false;
    }
  }, [open, overview, form]);

  const handleValuesChange = (_: unknown, allValues: Partial<FinancialGoalsConfigDto>) => {
    const total = Number(allValues.totalRevenueTarget || 0);
    const combo = Number(allValues.comboRevenueTarget || 0);
    const retail = Number(allValues.retailRevenueTarget || 0);
    const product = Number(allValues.productRevenueTarget || 0);

    setTotalTarget(total);
    setComponentSum(combo + retail + product);
  };

  const isMatched = componentSum === totalTarget;
  const diff = componentSum - totalTarget;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload: FinancialGoalsConfigDto = {
        month: overview?.month || '2026-11',
        totalRevenueTarget: Number(values.totalRevenueTarget || 0),
        comboRevenueTarget: Number(values.comboRevenueTarget || 0),
        retailRevenueTarget: Number(values.retailRevenueTarget || 0),
        productRevenueTarget: Number(values.productRevenueTarget || 0),
        note: values.note ? String(values.note).trim() : undefined,
      };

      await apiClient.financialGoals.saveConfig(payload);
      message.success(`Đã lưu cấu hình Mục Tiêu Tài Chính tháng ${payload.month} thành công!`);
      onClose();
      await onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi lưu cấu hình';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const monthStr = overview?.month || '';

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          <span>Cài Đặt Mục Tiêu Tài Chính Tháng {monthStr}</span>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<Save className="w-4 h-4" />}
          loading={submitting}
          onClick={handleSubmit}
          className="bg-amber-600 hover:bg-amber-500"
        >
          Lưu Cấu Hình
        </Button>,
      ]}
      width={640}
    >
      <div className="py-2 space-y-4">
        {/* Balance Validation Alert */}
        {isMatched ? (
          <Alert
            message="Chỉ tiêu thành phần khớp 100% với Tổng doanh thu"
            description={
              <span className="font-mono text-xs">
                Combo ({componentSum > 0 ? ((Number(form.getFieldValue('comboRevenueTarget') || 0) / componentSum) * 100).toFixed(0) : 0}%) + Khách lẻ + Sản phẩm = {totalTarget.toLocaleString('vi-VN')}đ
              </span>
            }
            type="success"
            showIcon
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          />
        ) : (
          <Alert
            message="Tổng 3 chỉ tiêu thành phần chưa khớp với Tổng doanh thu mục tiêu"
            description={
              <span className="font-mono text-xs">
                Tổng 3 mục: <strong>{componentSum.toLocaleString('vi-VN')}đ</strong> • Mục tiêu tổng: <strong>{totalTarget.toLocaleString('vi-VN')}đ</strong> (Lệch: {diff > 0 ? `+${diff.toLocaleString('vi-VN')}đ` : `${diff.toLocaleString('vi-VN')}đ`})
              </span>
            }
            type="warning"
            showIcon
            icon={<AlertCircle className="w-4 h-4 text-amber-500" />}
          />
        )}

        <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
          {/* Main Target */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-4">
            <Form.Item
              name="totalRevenueTarget"
              label={
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> KPI CHÍNH: TỔNG DOANH THU MỤC TIÊU
                </span>
              }
              rules={[{ required: true, message: 'Vui lòng nhập tổng doanh thu mục tiêu' }]}
              className="mb-1"
            >
              <InputNumber<number>
                size="large"
                min={0}
                step={10_000_000}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' đ'}
                parser={(value) => Number(value?.replace(/đ|\s|,/g, '') || 0)}
                placeholder="850,000,000 đ"
                className="w-full font-mono font-bold text-base"
              />
            </Form.Item>
            <Text type="secondary" className="text-xs">
              Mục tiêu doanh thu toàn hệ thống trong kỳ đánh giá.
            </Text>
          </div>

          <Divider plain className="my-2">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-500">
              3 CHỈ TIÊU THÀNH PHẦN
            </span>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="comboRevenueTarget"
                label={<span className="font-semibold text-purple-600 dark:text-purple-400">Doanh Thu Combo</span>}
                rules={[{ required: true, message: 'Nhập mục tiêu Combo' }]}
              >
                <InputNumber<number>
                  min={0}
                  step={10_000_000}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' đ'}
                  parser={(value) => Number(value?.replace(/đ|\s|,/g, '') || 0)}
                  placeholder="550,000,000 đ"
                  className="w-full font-mono"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name="retailRevenueTarget"
                label={<span className="font-semibold text-emerald-600 dark:text-emerald-400">Doanh Thu Khách Lẻ</span>}
                rules={[{ required: true, message: 'Nhập mục tiêu Khách lẻ' }]}
              >
                <InputNumber<number>
                  min={0}
                  step={10_000_000}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' đ'}
                  parser={(value) => Number(value?.replace(/đ|\s|,/g, '') || 0)}
                  placeholder="250,000,000 đ"
                  className="w-full font-mono"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name="productRevenueTarget"
                label={<span className="font-semibold text-amber-600 dark:text-amber-400">Doanh Thu Sản Phẩm</span>}
                rules={[{ required: true, message: 'Nhập mục tiêu Sản phẩm' }]}
              >
                <InputNumber<number>
                  min={0}
                  step={5_000_000}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' đ'}
                  parser={(value) => Number(value?.replace(/đ|\s|,/g, '') || 0)}
                  placeholder="50,000,000 đ"
                  className="w-full font-mono"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="Ghi chú kế hoạch / Giao ước kỳ">
            <Input.TextArea
              rows={2}
              placeholder="VD: Tập trung đẩy gói Combo Uốn mi Đề Thám & Dưỡng mi cao cấp trong tháng 11..."
            />
          </Form.Item>
        </Form>
      </div>
    </AdaptiveModal>
  );
};
