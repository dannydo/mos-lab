'use client';

import React from 'react';
import { Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select, Switch, type SelectProps } from 'antd';
import { RefreshCw, Settings, User, Users, X } from 'lucide-react';
import { vietnameseSearchFilter, type Staff } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { CAMPAIGN_FORM_STATUS_OPTIONS, CAMPAIGN_OPERATION_MODE_OPTIONS } from './campaignManagementTypes';

const { RangePicker } = DatePicker;

export interface CampaignInfoTabProps {
  staffList: Staff[];
  campaignFormOptionsLoading: boolean;
  campaignFormOptionsError: string | null;
}

const renderStaffTag: SelectProps['tagRender'] = ({ label, closable, onClose }) => {
  const cleanLabel = typeof label === 'string' ? label.split('(')[0].trim() : label;
  return (
    <span className="mr-1 inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
      <AppIcon icon={User} size={12} className="text-blue-500" />
      <span>{cleanLabel}</span>
      {closable && (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => onClose(event)}
          aria-label="Bỏ chọn thành viên"
          className="ml-0.5 inline-flex items-center rounded p-0.5 text-blue-500 transition-colors hover:bg-blue-500/20"
        >
          <AppIcon icon={X} size={11} />
        </button>
      )}
    </span>
  );
};

export function CampaignInfoTab({
  staffList,
  campaignFormOptionsLoading,
  campaignFormOptionsError,
}: CampaignInfoTabProps) {
  return (
    <div className="space-y-4 pt-2">
      <Row gutter={16}>
        <Col xs={24} sm={14}>
          <Form.Item
            name="name"
            label="Tên chiến dịch"
            rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
          >
            <Input placeholder="VD: Chiến dịch NYC Tri ân Tháng 8" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={10}>
          <Form.Item name="slug" label="Slug (Đường dẫn)" tooltip="Tùy chọn. Nếu để trống hệ thống sẽ tự sinh từ tên.">
            <Input placeholder="VD: tri-an-thang-8" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={14}>
          <Form.Item name="dates" label="Thời gian diễn ra">
            <RangePicker className="w-full" format="DD/MM/YYYY" placeholder={['Ngày bắt đầu', 'Ngày kết thúc']} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={10}>
          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select options={[...CAMPAIGN_FORM_STATUS_OPTIONS]} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="description" label="Mô tả chiến dịch">
        <Input.TextArea rows={2} placeholder="Mô tả ngắn gọn về mục tiêu và quy định của chiến dịch..." />
      </Form.Item>

      <Form.Item
        name="showInSidebar"
        label="Hiển thị link ở Sidebar menu"
        valuePropName="checked"
        tooltip="Bật switch này để hiển thị đường dẫn của chiến dịch ở menu bên trái."
      >
        <Switch checkedChildren="Hiện" unCheckedChildren="Ẩn" className="[&.ant-switch-checked]:bg-emerald-500" />
      </Form.Item>

      <Form.Item
        name="assignedStaffIds"
        label={
          <span className="inline-flex items-center gap-1.5">
            <AppIcon icon={Users} size={14} className="text-blue-500" />
            <span>Thành viên được phép truy cập (Team Booker)</span>
          </span>
        }
        tooltip="Chọn các nhân sự thuộc Team Booker được phép xem và thao tác trên chiến dịch này. Nếu để trống, tất cả nhân sự đều xem được."
      >
        <Select
          mode="multiple"
          allowClear
          showSearch
          loading={campaignFormOptionsLoading}
          placeholder="Chừa trống = Công Khai (Tất cả nhân sự xem được)"
          filterOption={vietnameseSearchFilter}
          optionFilterProp="label"
          notFoundContent={
            campaignFormOptionsLoading
              ? 'Đang tải thành viên...'
              : campaignFormOptionsError || 'Không có nhân sự hoạt động'
          }
          className="w-full"
          tagRender={renderStaffTag}
          options={staffList.map((staff) => ({
            value: staff.id,
            label: `${staff.displayName || staff.username} (${staff.username})`,
          }))}
        />
      </Form.Item>

      <Divider className="my-3" />

      <Form.Item
        name="operationMode"
        label={
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <AppIcon icon={Users} size={15} className="text-purple-500" />
            <span>Chế độ khai thác Data</span>
          </span>
        }
        initialValue="PERSONAL"
        tooltip="Chế độ phân bổ và khai thác khách hàng của chiến dịch"
      >
        <Select options={[...CAMPAIGN_OPERATION_MODE_OPTIONS]} />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => prevValues.operationMode !== currentValues.operationMode}
      >
        {({ getFieldValue }) => {
          const isSharedPool = getFieldValue('operationMode') === 'SHARED_POOL';
          if (!isSharedPool) return null;

          return (
            <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 dark:border-purple-900/60 dark:bg-purple-950/20">
              <div className="flex items-center justify-between border-b border-purple-200 pb-1.5 dark:border-purple-900/40">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-purple-700 uppercase dark:text-purple-300">
                  <AppIcon icon={Settings} size={13} />
                  <span>Cấu hình Vận hành Teamwork / Shared Pool</span>
                </span>
                <StatusTag status="purple" label="Batch Active" />
              </div>

              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="sharedPoolBatchSize"
                    label="Số KH / Batch"
                    tooltip="Quy mô mỗi đợt mở data cho cả đội telesales cùng khai thác"
                    initialValue={100}
                    rules={[{ required: true, message: 'Nhập số KH/batch' }]}
                    className="mb-2"
                  >
                    <InputNumber min={10} max={2000} className="w-full tabular-nums" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="sharedPoolMaxClaims"
                    label="Giới hạn nhận / NV"
                    tooltip="Số lượng khách tối đa 1 nhân viên được giữ cùng lúc (chống găm giữ data)"
                    initialValue={1}
                    rules={[{ required: true, message: 'Nhập giới hạn' }]}
                    className="mb-2"
                  >
                    <InputNumber min={1} max={10} className="w-full tabular-nums" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="sharedPoolTtl"
                    label="Hạn giữ (phút)"
                    tooltip="Thời gian tối đa để nhân viên xử lý khách trước khi bị thu hồi về pool (TTL)"
                    initialValue={15}
                    rules={[{ required: true, message: 'Nhập số phút' }]}
                    className="mb-2"
                  >
                    <InputNumber min={5} max={180} className="w-full tabular-nums" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="sharedPoolCooldown"
                    label="Giãn cách gọi (phút)"
                    tooltip="Thời gian tối thiểu giữa 2 cuộc gọi tới cùng 1 khách hàng (chống spam)"
                    initialValue={60}
                    rules={[{ required: true, message: 'Nhập phút giãn cách' }]}
                    className="mb-2"
                  >
                    <InputNumber min={10} max={1440} className="w-full tabular-nums" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="sharedPoolWarningThreshold"
                    label="Cảnh báo sắp hết (%)"
                    tooltip="Hệ thống bật chuông cảnh báo vàng khi % data còn lại dưới ngưỡng này"
                    initialValue={30}
                    rules={[{ required: true, message: 'Nhập ngưỡng' }]}
                    className="mb-2"
                  >
                    <InputNumber min={5} max={50} className="w-full tabular-nums" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="sharedPoolCriticalThreshold"
                    label="Cảnh báo nguy cấp (%)"
                    tooltip="Hệ thống bật chuông báo động đỏ nguy cấp khi % data còn lại dưới ngưỡng này"
                    initialValue={10}
                    rules={[{ required: true, message: 'Nhập ngưỡng' }]}
                    className="mb-2"
                  >
                    <InputNumber min={1} max={25} className="w-full tabular-nums" />
                  </Form.Item>
                </Col>
              </Row>

              <div className="border-t border-purple-200 pt-1.5 dark:border-purple-900/40">
                <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <AppIcon icon={RefreshCw} size={13} />
                  <span>Chu kỳ quay lại Pool theo kết quả cuộc gọi (Recycle Rules)</span>
                </div>
                <Row gutter={12}>
                  <Col xs={12} sm={6}>
                    <Form.Item name="recycleThinking" label="Suy nghĩ (ngày)" initialValue={7} className="mb-0">
                      <InputNumber min={1} max={30} className="w-full tabular-nums" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="recycleNoAnswer" label="Không nghe (ngày)" initialValue={3} className="mb-0">
                      <InputNumber min={1} max={14} className="w-full tabular-nums" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="recycleBusy" label="Bận máy (ngày)" initialValue={3} className="mb-0">
                      <InputNumber min={1} max={14} className="w-full tabular-nums" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item name="recycleError" label="Lỗi cuộc gọi (ngày)" initialValue={3} className="mb-0">
                      <InputNumber min={1} max={14} className="w-full tabular-nums" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>
          );
        }}
      </Form.Item>
    </div>
  );
}
