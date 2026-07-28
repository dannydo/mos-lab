'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Table, Button, message, Typography, Divider, Space, theme, Spin, Alert } from 'antd';
import { SettingOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { DailySalesBonusConfig, DailySalesBonusConfigTier } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';

const { Text, Title } = Typography;

interface CcThuongConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function CcThuongConfigModal({ open, onClose, onSaveSuccess }: CcThuongConfigModalProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<DailySalesBonusConfigTier[]>([]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.gamification.getDailySalesBonusConfig();
      if (res) {
        form.setFieldsValue({
          combo_unit_bonus: res.combo_unit_bonus ?? 200000,
          product_unit_bonus: res.product_unit_bonus ?? 50000,
        });
        setTiers(res.tiers || []);
      }
    } catch (err) {
      message.error('Không thể tải cấu hình thưởng CC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const handleTierChange = (index: number, field: keyof DailySalesBonusConfigTier, val: number) => {
    setTiers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload: DailySalesBonusConfig = {
        combo_unit_bonus: values.combo_unit_bonus,
        product_unit_bonus: values.product_unit_bonus,
        tiers: tiers.map((t, idx) => ({
          ...t,
          position: idx + 1,
        })),
      };

      const res = await apiClient.gamification.saveDailySalesBonusConfig(payload);
      if (res.success) {
        message.success(res.message || 'Đã lưu cấu hình thưởng CC và đồng bộ DB thành công!');
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        message.error(res.message || 'Lỗi khi lưu cấu hình.');
      }
    } catch (err) {
      message.error('Vui lòng kiểm tra lại các trường thông tin.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Tier / Cấp',
      dataIndex: 'position',
      key: 'position',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, __: unknown, index: number) => (
        <span className="font-bold text-amber-500 tabular-nums">Tier {index + 1}</span>
      ),
    },
    {
      title: 'Doanh Số Tối Thiểu (đ)',
      dataIndex: 'value_required_min',
      key: 'value_required_min',
      render: (val: number, record: DailySalesBonusConfigTier, index: number) => (
        <InputNumber
          value={val}
          min={0}
          step={1000000}
          formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
          parser={(v) => (v ? (Number(v.replace(/,/g, '')) as unknown as 0) : 0)}
          onChange={(newVal) => handleTierChange(index, 'value_required_min', newVal || 0)}
          className="w-full tabular-nums"
          addonAfter="đ"
        />
      ),
    },
    {
      title: 'Doanh Số Tối Đa (đ)',
      dataIndex: 'value_required_max',
      key: 'value_required_max',
      render: (val: number, record: DailySalesBonusConfigTier, index: number) => (
        <InputNumber
          value={val}
          min={0}
          step={1000000}
          formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
          parser={(v) => (v ? (Number(v.replace(/,/g, '')) as unknown as 0) : 0)}
          onChange={(newVal) => handleTierChange(index, 'value_required_max', newVal || 0)}
          className="w-full tabular-nums"
          placeholder="0 = Không giới hạn"
          addonAfter="đ"
        />
      ),
    },
    {
      title: 'Tỷ Lệ Thưởng (%)',
      dataIndex: 'reward_amount',
      key: 'reward_amount',
      width: 140,
      render: (val: number, record: DailySalesBonusConfigTier, index: number) => (
        <InputNumber
          value={val}
          min={0}
          max={100}
          step={0.1}
          precision={1}
          onChange={(newVal) => handleTierChange(index, 'reward_amount', newVal || 0)}
          className="w-full tabular-nums text-emerald-500 font-bold"
          addonAfter="%"
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined className="text-amber-500" />
          <span className="font-bold text-lg" style={{ color: token.colorText }}>
            Cấu Hình Thưởng CC (Combo & SP)
          </span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={780}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button key="refresh" icon={<ReloadOutlined />} onClick={fetchConfig} loading={loading}>
          Làm mới
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: '600' }}
        >
          Lưu & Đồng bộ DB
        </Button>,
      ]}
      style={{ top: 30 }}
    >
      <Spin spinning={loading}>
        <Alert
          message="Đồng bộ trực tiếp Bảng Quy Tắc Dữ Liệu Lương DB"
          description="Các chỉnh sửa Tier % Doanh số ngày bên dưới sẽ được tự động đồng bộ vào bảng DB management.staff_payroll_level_rule."
          type="info"
          showIcon
          className="mb-4"
        />

        <Form form={form} layout="vertical">
          <Title level={5} style={{ color: token.colorText, marginTop: 0 }}>
            1. Thưởng Cố Định Theo Đơn Vị Sản Phẩm / Combo
          </Title>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Form.Item
              name="combo_unit_bonus"
              label="Thưởng Đơn Vị Combo (VNĐ / Combo)"
              rules={[{ required: true, message: 'Nhập thưởng đơn vị Combo' }]}
            >
              <InputNumber
                min={0}
                step={10000}
                formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
                parser={(v) => (v ? (Number(v.replace(/,/g, '')) as unknown as 0) : 0)}
                className="w-full tabular-nums font-semibold text-blue-500"
                addonAfter="đ"
              />
            </Form.Item>

            <Form.Item
              name="product_unit_bonus"
              label="Thưởng Đơn Vị Sản Phẩm (VNĐ / SP)"
              rules={[{ required: true, message: 'Nhập thưởng đơn vị Sản Phẩm' }]}
            >
              <InputNumber
                min={0}
                step={5000}
                formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
                parser={(v) => (v ? (Number(v.replace(/,/g, '')) as unknown as 0) : 0)}
                className="w-full tabular-nums font-semibold text-purple-500"
                addonAfter="đ"
              />
            </Form.Item>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <Title level={5} style={{ color: token.colorText }}>
            2. Cấu Hình 6 Tiers % Doanh Số Ngày (Bảng Rules)
          </Title>
          <Table
            dataSource={tiers}
            columns={columns}
            rowKey="position"
            pagination={false}
            size="small"
            bordered
            className="antd-custom-table"
          />
        </Form>
      </Spin>
    </Modal>
  );
}
