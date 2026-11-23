'use client';

import React from 'react';
import { Button, Col, Form, Input, Row, Select, Tooltip } from 'antd';
import { AlertCircle, Wand2 } from 'lucide-react';
import { AppIcon } from '~/components/ui';

export interface FundBasicInfoTabProps {
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplySuggestedCode: () => void;
  onManualCodeChange: () => void;
}

export function FundBasicInfoTab({ onNameChange, onApplySuggestedCode, onManualCodeChange }: FundBasicInfoTabProps) {
  return (
    <div className="space-y-4 py-2">
      <Row gutter={16}>
        <Col xs={24} md={14}>
          <Form.Item
            label={<span className="font-semibold text-slate-800 dark:text-slate-200">Tên quỹ</span>}
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên quỹ hoạt động' }]}
          >
            <Input
              placeholder="Ví dụ: Quỹ Nạp Card Telesale, Quỹ Marketing Sự Kiện..."
              size="large"
              onChange={onNameChange}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={10}>
          <Form.Item
            label={
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Mã quỹ (duy nhất)</span>
                <Tooltip title="Tự động tạo mã chuẩn từ Tên quỹ">
                  <Button
                    type="link"
                    size="small"
                    icon={<AppIcon icon={Wand2} size="sm" />}
                    className="p-0 text-emerald-600 dark:text-emerald-400 font-normal"
                    onClick={onApplySuggestedCode}
                  >
                    Gợi ý mã
                  </Button>
                </Tooltip>
              </div>
            }
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã định danh quỹ' },
              {
                pattern: /^[A-Z0-9_-]+$/,
                message: 'Mã quỹ chỉ được chứa chữ hoa, số, dấu gạch dưới hoặc gạch nối',
              },
            ]}
          >
            <Input
              placeholder="Ví dụ: FUND_TELESALE"
              size="large"
              className="font-mono uppercase font-semibold"
              onChange={onManualCodeChange}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={<span className="font-semibold text-slate-800 dark:text-slate-200">Mục đích sử dụng</span>}
        name="description"
      >
        <Input.TextArea
          rows={3}
          placeholder="Mô tả phạm vi sử dụng, đối tượng thụ hưởng và quy định chi tiêu của quỹ..."
        />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label={<span className="font-semibold text-slate-800 dark:text-slate-200">Trạng thái khởi tạo</span>}
            name="status"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          >
            <Select size="large">
              <Select.Option value="DRAFT">📝 Bản nháp (DRAFT) – Khuyến nghị</Select.Option>
              <Select.Option value="ACTIVE">🟢 Đang hoạt động (ACTIVE)</Select.Option>
              <Select.Option value="FROZEN">⏸️ Tạm ngưng (FROZEN)</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <AppIcon icon={AlertCircle} size="sm" className="text-amber-500" />
          <span>Quy tắc khởi tạo mOS Fund Master</span>
        </div>
        <div>
          Mặc định quỹ được tạo ở trạng thái <strong>DRAFT</strong> với số dư ban đầu <strong>0đ</strong>. Quỹ ở trạng
          thái DRAFT chưa cho phép chi tiêu cho đến khi Admin kích hoạt và cấp vốn qua quy trình giải ngân.
        </div>
      </div>
    </div>
  );
}
