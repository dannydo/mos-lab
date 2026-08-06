'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Form, Input, Avatar, Tag, message, Spin } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';

const { TextArea } = Input;

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateTicketModal({ open, onClose, onSuccess }: CreateTicketModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Search customers on user input
  const handleCustomerSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCustomerOptions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await apiClient.customers.list({ search: query.trim(), limit: 10 });
      if (res && res.data) {
        setCustomerOptions(res.data);
      }
    } catch (err) {
      console.error('Error searching customers:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectCustomer = (val: number, option: any) => {
    const cust = customerOptions.find((c: any) => c.id === val);
    if (cust) {
      setSelectedCustomer(cust);
    }
  };

  const handleSubmit = async (values: any) => {
    const customerId = values.customerId;

    if (!customerId) {
      message.error('Bắt buộc phải tìm và chọn Khách Hàng có sẵn trong hệ thống!');
      return;
    }

    setLoading(true);
    try {
      await apiClient.cs.createTicket({
        customerId,
        type: values.type,
        department: values.department,
        description: values.description,
        priority: values.priority,
      });

      message.success('Đã tạo Ticket xử lý thành công');
      form.resetFields();
      setSelectedCustomer(null);
      setCustomerOptions([]);
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      message.error(
        error?.response?.data?.message || 'Không thể tạo Ticket. Vui lòng kiểm tra lại thông tin khách hàng!'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Tạo Ticket Xử Lý"
      open={open}
      onCancel={() => {
        form.resetFields();
        setSelectedCustomer(null);
        setCustomerOptions([]);
        onClose();
      }}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
        <Form.Item
          name="customerId"
          label="Khách Hàng (Tìm theo Tên / SĐT / Mã KH)"
          rules={[{ required: true, message: 'Bắt buộc phải chọn Khách Hàng trong hệ thống' }]}
        >
          <Select
            showSearch
            placeholder="Nhập tên, số điện thoại hoặc mã KH để tìm..."
            defaultActiveFirstOption={false}
            suffixIcon={<SearchOutlined />}
            filterOption={false}
            onSearch={handleCustomerSearch}
            onChange={handleSelectCustomer}
            notFoundContent={searchLoading ? <Spin size="small" /> : 'Không tìm thấy khách hàng phù hợp'}
            options={customerOptions.map((c: any) => ({
              value: c.id,
              label: (
                <div className="flex items-center gap-2 py-1">
                  <Avatar src={c.avatar} icon={<UserOutlined />} size="small" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {c.name || c.fullName || 'Khách hàng'}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">({c.phone || 'Không SĐT'})</span>
                  </div>
                  <Tag color="blue" className="mr-0 text-xs">
                    #{c.id}
                  </Tag>
                </div>
              ),
            }))}
          />
        </Form.Item>

        {selectedCustomer && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
            <Avatar src={selectedCustomer.avatar} icon={<UserOutlined />} className="bg-emerald-500" />
            <div>
              <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                {selectedCustomer.name || selectedCustomer.fullName}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                SĐT: {selectedCustomer.phone || '-'} | Mã KH: #{selectedCustomer.id}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Form.Item name="type" label="Loại Ticket" rules={[{ required: true }]} initialValue="COMPLAINT">
            <Select
              options={[
                { value: 'TECHNICIAN_QUALITY', label: '✂️ Kỹ thuật / Chất lượng mi' },
                { value: 'STAFF_ATTITUDE', label: '😊 Thái độ phục vụ (CC/BK/Bảo vệ)' },
                { value: 'FACILITY_ISSUE', label: '🏢 Cơ sở vật chất / Giữ xe' },
                { value: 'PRICING_COMPLAINT', label: '💰 Giá cả / Gói combo' },
                { value: 'IMPROVEMENT_SUGGESTION', label: '💡 Góp ý cải thiện' },
                { value: 'COMPLAINT', label: '⚠️ Phàn nàn chung' },
                { value: 'REQUEST', label: '❓ Yêu cầu hỗ trợ' },
              ]}
            />
          </Form.Item>

          <Form.Item name="priority" label="Mức ưu tiên" rules={[{ required: true }]} initialValue="MEDIUM">
            <Select
              options={[
                { value: 'URGENT', label: '🔴 Khẩn cấp (SLA 4h)' },
                { value: 'HIGH', label: '🟠 Cao (SLA 8h)' },
                { value: 'MEDIUM', label: '🔵 Trung bình (SLA 24h)' },
                { value: 'LOW', label: '⚪ Thấp (SLA 48h)' },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="departments"
          label="Bộ phận tiếp nhận (Có thể chọn 1 hoặc nhiều bộ phận)"
          rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 bộ phận tiếp nhận' }]}
          initialValue={['CV']}
        >
          <Select
            mode="multiple"
            placeholder="Chọn các bộ phận dính phàn nàn..."
            options={[
              { value: 'CV', label: 'Chuyên viên (CV)' },
              { value: 'CC', label: 'Tư vấn viên (CC)' },
              { value: 'BK', label: 'Đặt lịch (Booker)' },
              { value: 'FACILITY', label: 'Cơ sở vật chất / Bảo vệ' },
              { value: 'CSKH', label: 'Phòng CSKH' },
              { value: 'OPERATIONS', label: 'Vận hành cửa hàng' },
              { value: 'MANAGEMENT', label: 'Ban quản lý' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Nội dung chi tiết"
          rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết vấn đề' }]}
        >
          <TextArea rows={4} placeholder="Mô tả chi tiết nguyên nhân, vấn đề và mong muốn của khách hàng..." />
        </Form.Item>

        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo Ticket
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
