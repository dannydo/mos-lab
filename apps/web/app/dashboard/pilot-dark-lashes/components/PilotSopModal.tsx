'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, InputNumber, Popconfirm, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowDown, ArrowUp, Clock, Edit2, ListOrdered, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { CreatePilotSopStepRequest, PilotSopStep, UpdatePilotSopStepRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui/AdaptiveOverlay';
import { DataTable } from '../../../../components/ui/DataTable';

const { TextArea } = Input;

interface PilotSopModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function PilotSopModal({ open, onClose, onRefresh }: PilotSopModalProps) {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<PilotSopStep[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<PilotSopStep | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form] = Form.useForm();

  const fetchSteps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.listSopSteps({ pilotCode: 'DARK_LASHES' });
      setSteps(res || []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tải danh sách bước kỹ thuật SOP.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSteps();
    }
  }, [open, fetchSteps]);

  const handleOpenAdd = () => {
    setEditingStep(null);
    form.resetFields();
    form.setFieldsValue({
      targetMinutes: 10,
    });
    setFormModalOpen(true);
  };

  const handleOpenEdit = (step: PilotSopStep) => {
    setEditingStep(step);
    form.resetFields();
    form.setFieldsValue({
      name: step.name,
      description: step.description,
      targetMinutes: step.targetMinutes || 10,
    });
    setFormModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.pilot.deleteSopStep(id);
      message.success('Đã xóa bước kỹ thuật khỏi danh mục.');
      fetchSteps();
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa bước kỹ thuật.');
    }
  };

  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const [moved] = newSteps.splice(currentIndex, 1);
    newSteps.splice(targetIndex, 0, moved);

    try {
      setLoading(true);
      const updated = await apiClient.pilot.reorderSopSteps({
        pilotCode: 'DARK_LASHES',
        stepIds: newSteps.map((s) => s.id),
      });
      setSteps(updated);
      message.success('Đã cập nhật thứ tự các bước kỹ thuật!');
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể đổi thứ tự bước.');
      fetchSteps();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      if (editingStep) {
        await apiClient.pilot.updateSopStep(editingStep.id, values as UpdatePilotSopStepRequest);
        message.success('Cập nhật bước kỹ thuật thành công!');
      } else {
        await apiClient.pilot.createSopStep({
          pilotCode: 'DARK_LASHES',
          ...(values as CreatePilotSopStepRequest),
        });
        message.success('Thêm mới bước kỹ thuật thành công!');
      }
      setFormModalOpen(false);
      fetchSteps();
      onRefresh?.();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Lỗi khi lưu bước kỹ thuật.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const defaults = await apiClient.pilot.seedDefaultSopSteps({ pilotCode: 'DARK_LASHES' });
      setSteps(defaults);
      message.success('Đã khôi phục quy trình SOP 7 bước tiêu chuẩn Uốn Mi Bóng Tối!');
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể khôi phục SOP mặc định.');
    } finally {
      setSeeding(false);
    }
  };

  const columns: ColumnsType<PilotSopStep> = [
    {
      title: 'Thứ tự',
      key: 'order',
      width: 110,
      align: 'center',
      render: (_, record, index) => (
        <div className="flex items-center justify-center gap-1">
          <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center tabular-nums">
            {index + 1}
          </span>
          <div className="flex flex-col">
            <Button
              type="text"
              size="small"
              className="h-5 w-5 p-0 flex items-center justify-center text-slate-400 hover:text-emerald-600 disabled:opacity-30"
              disabled={index === 0 || loading}
              onClick={() => handleMove(index, 'up')}
              icon={<AppIcon icon={ArrowUp} size="sm" />}
            />
            <Button
              type="text"
              size="small"
              className="h-5 w-5 p-0 flex items-center justify-center text-slate-400 hover:text-emerald-600 disabled:opacity-30"
              disabled={index === steps.length - 1 || loading}
              onClick={() => handleMove(index, 'down')}
              icon={<AppIcon icon={ArrowDown} size="sm" />}
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Tên bước kỹ thuật',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>{name}</span>
            {record.targetMinutes && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tabular-nums">
                <AppIcon icon={Clock} size="sm" />
                <span>{record.targetMinutes} phút</span>
              </span>
            )}
          </div>
          {record.description && (
            <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Chỉnh sửa bước">
            <Button
              type="text"
              size="small"
              className="text-slate-500 hover:text-emerald-600 dark:text-slate-400"
              icon={<AppIcon icon={Edit2} size="sm" />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa bước kỹ thuật"
            description="Bạn có chắc chắn muốn xóa bước này khỏi danh mục SOP?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa bước">
              <Button
                type="text"
                size="small"
                danger
                icon={<AppIcon icon={Trash2} size="sm" />}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdaptiveModal
        intent="form"
        title={
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <AppIcon icon={ListOrdered} size="md" />
            </span>
            <div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                Quy Trình Kỹ Thuật SOP (Uốn Mi Bóng Tối)
              </div>
              <div className="text-xs text-slate-400">
                Quản lý các bước tiêu chuẩn, sắp xếp thứ tự và thời gian bấm giờ cho từng ca dịch vụ
              </div>
            </div>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={720}
        footer={[
          <Button key="close" onClick={onClose}>
            Đóng
          </Button>,
        ]}
      >
        <div className="space-y-4 pt-2">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Tổng số bước kỹ thuật:</span>
              <strong className="text-slate-800 dark:text-slate-200 tabular-nums font-bold">
                {steps.length} bước
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <Popconfirm
                title="Khôi phục SOP 7 bước mặc định"
                description="Hệ thống sẽ thêm lại các bước SOP chuẩn (Kiểm tra, Làm mềm, Form, pH, Màu, Keratin, Hoàn thiện). Bạn có muốn tiếp tục?"
                onConfirm={handleSeedDefaults}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  icon={<AppIcon icon={RotateCcw} size="sm" />}
                  loading={seeding}
                >
                  Khôi phục mặc định
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                size="small"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={handleOpenAdd}
              >
                Thêm bước mới
              </Button>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            dataSource={steps}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
        </div>
      </AdaptiveModal>

      {/* Add / Edit Sub-modal */}
      <AdaptiveModal
        intent="form"
        title={editingStep ? 'Chỉnh Sửa Bước Kỹ Thuật' : 'Thêm Mới Bước Kỹ Thuật'}
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        onOk={handleSaveStep}
        confirmLoading={submitting}
        okText={editingStep ? 'Lưu thay đổi' : 'Thêm bước'}
        cancelText="Hủy"
        width={480}
      >
        <Form form={form} layout="vertical" className="pt-2">
          <Form.Item
            label="Tên bước kỹ thuật"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên bước kỹ thuật' }]}
          >
            <Input placeholder="Ví dụ: Kiểm tra & làm sạch mi, Làm mềm..." />
          </Form.Item>

          <Form.Item
            label="Thời gian dự kiến (phút)"
            name="targetMinutes"
            rules={[{ required: true, message: 'Vui lòng nhập số phút dự kiến' }]}
          >
            <InputNumber min={1} max={180} className="w-full" placeholder="10" />
          </Form.Item>

          <Form.Item label="Mô tả kỹ thuật / Lưu ý" name="description">
            <TextArea rows={3} placeholder="Mô tả thao tác kỹ thuật, lưu ý về độ dày sợi mi hoặc thời gian ủ thuốc..." />
          </Form.Item>
        </Form>
      </AdaptiveModal>
    </>
  );
}
