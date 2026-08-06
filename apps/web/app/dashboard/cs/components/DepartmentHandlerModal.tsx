'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, Form, Avatar, Spin, message, Typography } from 'antd';
import { UserOutlined, SettingOutlined } from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';

const { Text } = Typography;

interface DepartmentHandlerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEPARTMENTS = [
  { key: 'CV', label: '✂️ Chuyên viên (CV)', description: 'Chịu trách nhiệm cho phàn nàn tay nghề, chất lượng mi' },
  { key: 'CC', label: '😊 Tư vấn viên (CC)', description: 'Chịu trách nhiệm cho phàn nàn thái độ tư vấn, checkout' },
  { key: 'BK', label: '📞 Đặt lịch (Booker)', description: 'Chịu trách nhiệm cho phàn nàn thời gian chờ, tạo lịch' },
  {
    key: 'FACILITY',
    label: '🏢 Cơ sở vật chất & Bảo vệ',
    description: 'Chịu trách nhiệm về không gian, vệ sinh, giữ xe',
  },
  { key: 'CSKH', label: '🎧 Phòng CSKH', description: 'Trưởng phòng CSKH quản lý chung' },
  { key: 'OPERATIONS', label: '🛍️ Vận hành Cửa hàng', description: 'Quản lý vận hành chi nhánh' },
  { key: 'MANAGEMENT', label: '👑 Ban quản lý / Giám đốc', description: 'Giải quyết phàn nàn cấp cao, giá cả' },
];

export default function DepartmentHandlerModal({ open, onClose, onSuccess }: DepartmentHandlerModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, handlersRes] = await Promise.all([
        apiClient.customers.getStaff(),
        apiClient.cs.getDepartmentHandlers(),
      ]);

      const list = Array.isArray(staffRes) ? staffRes : (staffRes as any)?.data || [];
      setStaffList(list);

      if (handlersRes && handlersRes.data) {
        const parsedValue: Record<string, number> = {};
        Object.keys(handlersRes.data).forEach((k) => {
          const val = handlersRes.data[k];
          if (val != null && !isNaN(Number(val))) {
            parsedValue[k] = Number(val);
          }
        });
        form.setFieldsValue(parsedValue);
      }
    } catch (err) {
      console.error('Error loading department handlers data:', err);
      message.error('Lỗi khi tải cấu hình người phụ trách');
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      await apiClient.cs.updateDepartmentHandlers(values);
      message.success('Đã lưu cấu hình người phụ trách Ticket theo Bộ phận thành công');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error saving department handlers:', err);
      message.error(err?.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-lg">
          <SettingOutlined className="text-blue-500" />
          <span>Cấu Hình Phụ Trách Ticket Theo Bộ Phận</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
    >
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        📌 Khi phát sinh Ticket mới (tự động từ khảo sát $\le 3$ sao hoặc tạo thủ công), hệ thống sẽ{' '}
        <strong>tự động gán Ticket</strong> cho đúng Người Phụ Trách của Bộ phận đó.
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Spin size="large" tip="Đang tải danh sách nhân sự & cấu hình..." />
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {DEPARTMENTS.map((dept) => (
              <div
                key={dept.key}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{dept.label}</div>
                <div className="text-xs text-slate-400 mb-2">{dept.description}</div>
                <Form.Item name={dept.key} className="mb-0">
                  <Select
                    showSearch
                    placeholder="Nhập tên hoặc chọn nhân sự/quản lý phụ trách..."
                    allowClear
                    filterOption={(input, option) => {
                      const staff = staffList.find((s: any) => Number(s.id) === Number(option?.value));
                      if (!staff) return false;
                      const name = staff.displayName || staff.name || '';
                      const role = staff.role || '';
                      const searchStr = `${name} ${role} ${staff.id} ${staff.email || ''}`;
                      return normalizeText(searchStr).includes(normalizeText(input));
                    }}
                    options={staffList.map((s: any) => ({
                      value: Number(s.id),
                      label: (
                        <div className="flex items-center gap-2">
                          <Avatar src={s.avatarUrl} icon={<UserOutlined />} size="small" />
                          <span>{s.displayName || s.name || `NV #${s.id}`}</span>
                          {s.role && <span className="text-xs text-slate-400">({s.role.toUpperCase()})</span>}
                        </div>
                      ),
                    }))}
                  />
                </Form.Item>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button onClick={onClose}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu Cấu Hình
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
