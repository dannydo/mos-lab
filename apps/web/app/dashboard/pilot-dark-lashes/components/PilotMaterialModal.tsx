'use client';

import React, { useState } from 'react';
import { Button, Form, Input, InputNumber, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Package, Plus, Trash2, Edit2, Sparkles } from 'lucide-react';
import type { CreatePilotMaterialRequest, PilotMaterial, UpdatePilotMaterialRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui/AdaptiveOverlay';
import { DataTable } from '../../../../components/ui/DataTable';
import { StatusTag } from '../../../../components/ui/StatusTag';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

interface PilotMaterialModalProps {
  open: boolean;
  onClose: () => void;
  materials: PilotMaterial[];
  onRefresh: () => void;
}

export function PilotMaterialModal({ open, onClose, materials, onRefresh }: PilotMaterialModalProps) {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<PilotMaterial | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form] = Form.useForm();

  // Watch fields for live preview of costPerUnit
  const watchPrice = Form.useWatch('purchasePrice', form) ?? 0;
  const watchVolume = Form.useWatch('volume', form) ?? 1;
  const liveCostPerUnit = watchVolume > 0 ? Math.round(watchPrice / watchVolume) : 0;

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    form.resetFields();
    form.setFieldsValue({
      unit: 'ml',
      volume: 1,
      purchasePrice: 0,
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (material: PilotMaterial) => {
    setEditingMaterial(material);
    form.resetFields();
    form.setFieldsValue({
      name: material.name,
      purchasePrice: material.purchasePrice,
      volume: material.volume,
      unit: material.unit,
    });
    setFormModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.pilot.deleteMaterial(id);
      message.success('Đã ẩn vật tư khỏi danh mục.');
      onRefresh();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa vật tư.');
    }
  };

  const handleSaveMaterial = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      if (editingMaterial) {
        await apiClient.pilot.updateMaterial(editingMaterial.id, values as UpdatePilotMaterialRequest);
        message.success('Cập nhật vật tư thành công!');
      } else {
        await apiClient.pilot.createMaterial(values as CreatePilotMaterialRequest);
        message.success('Thêm mới vật tư thành công!');
      }
      setFormModalOpen(false);
      onRefresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu vật tư.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      await apiClient.pilot.seedDefaultMaterials();
      message.success('Đã bổ sung đầy đủ danh mục vật tư tiêu chuẩn uốn mi!');
      onRefresh();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi đồng bộ vật tư chuẩn.');
    } finally {
      setSeeding(false);
    }
  };

  const LASH_LIFT_PRESETS = [
    { name: 'Thuốc số 1 (Perming Cream)', unit: 'ml', volume: 15, purchasePrice: 450000 },
    { name: 'Thuốc số 2 (Setting Cream)', unit: 'ml', volume: 15, purchasePrice: 450000 },
    { name: 'Cây chải mi kim loại', unit: 'cây', volume: 1, purchasePrice: 35000 },
    { name: 'Cây chải mi nhựa', unit: 'cây', volume: 1, purchasePrice: 3000 },
    { name: 'Keratin dưỡng mi', unit: 'ml', volume: 20, purchasePrice: 380000 },
    { name: 'Kềm PH (Kiểm tra độ pH)', unit: 'lần', volume: 50, purchasePrice: 50000 },
    { name: 'Eye Pad (Miếng dán mi dưới)', unit: 'cặp', volume: 1, purchasePrice: 6000 },
    { name: 'Giấy giữ mi con', unit: 'miếng', volume: 50, purchasePrice: 20000 },
    { name: 'Thuốc nhuộm mi (Lash Tint)', unit: 'ml', volume: 15, purchasePrice: 240000 },
    { name: 'Dụng cụ vệ sinh mi', unit: 'bộ', volume: 1, purchasePrice: 5000 },
  ];

  const QUICK_UNITS = ['ml', 'cây', 'cặp', 'miếng', 'bộ', 'g', 'lần', 'gói'];

  const columns: ColumnsType<PilotMaterial> = [
    {
      title: 'Tên vật tư',
      dataIndex: 'name',
      key: 'name',
      render: (val: string, r) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{val}</span>
          {!r.isActive && <StatusTag status="default" label="Đã dừng dùng" className="ml-2 text-[10px]" />}
        </div>
      ),
    },
    {
      title: 'Giá mua',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      align: 'right',
      render: (val: number) => <span className="tabular-nums font-medium">{formatVND(val)}</span>,
    },
    {
      title: 'Quy cách / Dung tích',
      key: 'volume',
      align: 'center',
      render: (_, r) => (
        <span className="tabular-nums">
          {r.volume} {r.unit}
        </span>
      ),
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'unit',
      key: 'unit',
      align: 'center',
      render: (val: string) => <StatusTag status="cyan" label={val} />,
    },
    {
      title: 'Cost / 1 Đơn vị',
      dataIndex: 'costPerUnit',
      key: 'costPerUnit',
      align: 'right',
      render: (val: number, r) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
            {formatVND(val)}
          </span>
          <span className="text-[10px] text-slate-400">/{r.unit}</span>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="text"
            size="small"
            icon={<AppIcon icon={Edit2} size="sm" />}
            onClick={() => handleOpenEdit(r)}
          />
          <Popconfirm
            title="Dừng sử dụng vật tư này?"
            description="Vật tư sẽ được ẩn khỏi danh sách chọn khi thêm ca mới."
            onConfirm={() => handleDelete(r.id)}
            okText="Dừng dùng"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdaptiveModal
        intent="detail"
        title={
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <AppIcon icon={Package} size="sm" className="text-emerald-500" />
              <span className="text-base font-bold">Danh mục Vật tư Tiêu hao (Uốn Mi Bóng Tối)</span>
            </div>
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={[
          <Button
            key="seed"
            loading={seeding}
            onClick={handleSeedDefaults}
            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            icon={<AppIcon icon={Sparkles} size="sm" />}
          >
            Bổ sung 10 vật tư chuẩn
          </Button>,
          <Button key="close" onClick={onClose}>
            Đóng
          </Button>,
          <Button
            key="add"
            type="primary"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            icon={<AppIcon icon={Plus} size="sm" />}
            onClick={handleOpenAdd}
          >
            Thêm vật tư mới
          </Button>,
        ]}
        width={800}
      >
        <div className="mb-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200">
          💡 <strong>Quy tắc tính tự động:</strong> Cost trên 1 đơn vị = <code>Giá mua / Quy cách dung tích</code>. Khi KTV ghi nhận lượng dùng trong ca làm, hệ thống sẽ nhân với Cost/đơn vị này để tính chi phí vật tư chính xác.
        </div>

        <DataTable<PilotMaterial>
          rowKey="id"
          columns={columns}
          dataSource={materials}
          pagination={false}
          size="middle"
          className="antd-custom-table"
        />
      </AdaptiveModal>

      {/* Modal Add/Edit Material */}
      <AdaptiveModal
        intent="form"
        title={editingMaterial ? 'Cập nhật Vật tư' : 'Thêm mới Vật tư Tiêu hao'}
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        onOk={handleSaveMaterial}
        confirmLoading={submitting}
        okText={editingMaterial ? 'Lưu thay đổi' : 'Thêm vào danh mục'}
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 text-white' }}
        width={480}
      >
        <Form form={form} layout="vertical" className="mt-3">
          {!editingMaterial && (
            <div className="mb-3">
              <span className="text-xs font-medium text-slate-500 block mb-1.5">Gợi ý nhanh vật tư uốn mi:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-lg">
                {LASH_LIFT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      form.setFieldsValue({
                        name: preset.name,
                        unit: preset.unit,
                        volume: preset.volume,
                        purchasePrice: preset.purchasePrice,
                      });
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition-colors"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Form.Item
            name="name"
            label="Tên vật tư"
            rules={[{ required: true, message: 'Vui lòng nhập tên vật tư' }]}
          >
            <Input placeholder="VD: Thuốc uốn số 1 (Perming Cream)" className="rounded-lg" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="purchasePrice"
              label="Giá mua trọn gói (đ)"
              rules={[{ required: true, message: 'Nhập giá mua' }]}
            >
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                min={0}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
              />
            </Form.Item>

            <Form.Item
              name="volume"
              label="Quy cách / Dung tích"
              rules={[{ required: true, message: 'Nhập dung tích' }]}
            >
              <InputNumber<number> className="w-full rounded-lg tabular-nums" min={0.01} step={1} />
            </Form.Item>
          </div>

          <Form.Item
            name="unit"
            label="Đơn vị tính"
            rules={[{ required: true, message: 'Nhập đơn vị tính' }]}
            extra={
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[10px] text-slate-400 mr-1 self-center">Chọn nhanh:</span>
                {QUICK_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => form.setFieldValue('unit', u)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-600 dark:text-slate-300"
                  >
                    {u}
                  </button>
                ))}
              </div>
            }
          >
            <Input placeholder="VD: ml, cây, cặp, miếng, bộ, g..." className="rounded-lg" />
          </Form.Item>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Cost tự động trên 1 đơn vị:</span>
            <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatVND(liveCostPerUnit)} / đơn vị
            </span>
          </div>
        </Form>
      </AdaptiveModal>
    </>
  );
}
