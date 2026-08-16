'use client';

import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Table, Button, message, Typography, Divider, Space, Spin, Alert } from 'antd';
import { RefreshCw, Save, Settings } from 'lucide-react';
import { DailySalesBonusConfig, DailySalesBonusConfigTier } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon, EntityForm, EntityFormDrawer, EntityFormField } from '../../../../components/ui';

import { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface CcThuongConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function CcThuongConfigModal({ open, onClose, onSaveSuccess }: CcThuongConfigModalProps) {
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
          combo_unit_bonus: res.combo_unit_bonus ?? 0,
          product_unit_bonus: res.product_unit_bonus ?? 0,
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

  const columns: ColumnsType<DailySalesBonusConfigTier> = [
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
      align: 'right',
      render: (val: number, record: DailySalesBonusConfigTier, index: number) => (
        <InputNumber
          value={val}
          aria-label={`Tier ${index + 1}: Doanh số tối thiểu (VNĐ)`}
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
      align: 'right',
      render: (val: number, record: DailySalesBonusConfigTier, index: number) => (
        <InputNumber
          value={val}
          aria-label={`Tier ${index + 1}: Doanh số tối đa (VNĐ)`}
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
      align: 'right',
      width: 140,
      render: (val: number, record: DailySalesBonusConfigTier, index: number) => (
        <InputNumber
          value={val}
          aria-label={`Tier ${index + 1}: Tỷ lệ thưởng (%)`}
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
    <EntityFormDrawer
      title={
        <Space>
          <AppIcon icon={Settings} size="action" className="text-amber-500" />
          <span className="font-bold text-lg">Cấu Hình Thưởng CC (Combo & SP)</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={780}
      className="cc-bonus-config-drawer"
      footer={
        <Space wrap>
          <Button onClick={onClose}>Hủy</Button>
          <Button icon={<AppIcon icon={RefreshCw} size="disclosure" />} onClick={fetchConfig} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<AppIcon icon={Save} size="disclosure" />} loading={saving} onClick={handleSave}>
            Lưu & Đồng bộ DB
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Alert
          message="Đồng bộ trực tiếp Bảng Quy Tắc Dữ Liệu Lương DB"
          description="Các chỉnh sửa Tier % Doanh số ngày bên dưới sẽ được tự động đồng bộ vào bảng DB management.staff_payroll_level_rule."
          type="info"
          showIcon
          className="mb-4"
        />

        <Title level={5} style={{ marginTop: 0 }}>
          1. Thưởng Cố Định Theo Đơn Vị Sản Phẩm / Combo
        </Title>
        <EntityForm form={form} columns={2} className="mb-4">
          <EntityFormField
            name="combo_unit_bonus"
            label="Thưởng Đơn Vị Combo (VNĐ / Combo)"
            rules={[{ required: true, message: 'Nhập thưởng đơn vị Combo' }]}
          >
            <InputNumber
              aria-label="Thưởng đơn vị Combo (VNĐ mỗi Combo)"
              min={0}
              step={10000}
              formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
              parser={(v) => (v ? (Number(v.replace(/,/g, '')) as unknown as 0) : 0)}
              className="w-full tabular-nums font-semibold text-blue-500"
              addonAfter="đ"
            />
          </EntityFormField>

          <EntityFormField
            name="product_unit_bonus"
            label="Thưởng Đơn Vị Sản Phẩm (VNĐ / SP)"
            rules={[{ required: true, message: 'Nhập thưởng đơn vị Sản Phẩm' }]}
          >
            <InputNumber
              aria-label="Thưởng đơn vị Sản phẩm (VNĐ mỗi sản phẩm)"
              min={0}
              step={5000}
              formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
              parser={(v) => (v ? (Number(v.replace(/,/g, '')) as unknown as 0) : 0)}
              className="w-full tabular-nums font-semibold text-purple-500"
              addonAfter="đ"
            />
          </EntityFormField>
        </EntityForm>

        <Divider style={{ margin: '16px 0' }} />

        <Title level={5}>2. Cấu Hình 6 Tiers % Doanh Số Ngày (Bảng Rules)</Title>
        <Table
          dataSource={tiers}
          columns={columns}
          rowKey="position"
          pagination={false}
          size="small"
          bordered
          className="antd-custom-table"
        />
      </Spin>
    </EntityFormDrawer>
  );
}
