'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, Popconfirm, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowDown, ArrowUp, CheckCircle, Edit2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type {
  CreatePilotAssessmentCriterionRequest,
  PilotAssessmentCriterion,
  UpdatePilotAssessmentCriterionRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { AdaptiveModal } from '../../../../components/ui/AdaptiveOverlay';
import { DataTable } from '../../../../components/ui/DataTable';

const { TextArea } = Input;

interface PilotCriteriaModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function PilotCriteriaModal({ open, onClose, onRefresh }: PilotCriteriaModalProps) {
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState<PilotAssessmentCriterion[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<PilotAssessmentCriterion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCriteria = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.listAssessmentCriteria({ pilotCode: 'DARK_LASHES' });
      setCriteria(res || []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tải danh sách tiêu chí đánh giá.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCriteria();
    }
  }, [open, fetchCriteria]);

  const handleOpenAdd = () => {
    setEditingCriterion(null);
    form.resetFields();
    setFormModalOpen(true);
  };

  const handleOpenEdit = (criterion: PilotAssessmentCriterion) => {
    setEditingCriterion(criterion);
    form.resetFields();
    form.setFieldsValue({
      name: criterion.name,
      description: criterion.description,
    });
    setFormModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.pilot.deleteAssessmentCriterion(id);
      message.success('Đã xóa tiêu chí khỏi danh mục.');
      fetchCriteria();
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể xóa tiêu chí.');
    }
  };

  const handleMove = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= criteria.length) return;

    const newCriteria = [...criteria];
    const [moved] = newCriteria.splice(currentIndex, 1);
    newCriteria.splice(targetIndex, 0, moved);

    try {
      setLoading(true);
      const updated = await apiClient.pilot.reorderAssessmentCriteria({
        pilotCode: 'DARK_LASHES',
        criteriaIds: newCriteria.map((c) => c.id),
      });
      setCriteria(updated);
      message.success('Đã cập nhật thứ tự tiêu chí đánh giá!');
      onRefresh?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể đổi thứ tự tiêu chí.');
      fetchCriteria();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingCriterion) {
        const updateData: UpdatePilotAssessmentCriterionRequest = {
          name: values.name,
          description: values.description,
        };
        await apiClient.pilot.updateAssessmentCriterion(editingCriterion.id, updateData);
        message.success('Đã cập nhật tiêu chí đánh giá thành công!');
      } else {
        const createData: CreatePilotAssessmentCriterionRequest = {
          pilotCode: 'DARK_LASHES',
          name: values.name,
          description: values.description,
        };
        await apiClient.pilot.createAssessmentCriterion(createData);
        message.success('Đã thêm tiêu chí mới vào quy trình!');
      }

      setFormModalOpen(false);
      fetchCriteria();
      onRefresh?.();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Đã có lỗi xảy ra khi lưu tiêu chí.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<PilotAssessmentCriterion> = [
    {
      title: 'STT',
      key: 'order',
      width: 70,
      align: 'center',
      render: (_, __, index) => (
        <span className="inline-flex items-center justify-center leading-none w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs tabular-nums">
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Tiêu chí đánh giá điều kiện mi',
      key: 'name',
      render: (_, r) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
            <AppIcon icon={CheckCircle} size="sm" className="text-teal-600 dark:text-teal-400" />
            <span>{r.name}</span>
          </div>
          {r.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Thứ tự',
      key: 'reorder',
      width: 100,
      align: 'center',
      render: (_, __, index) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            size="small"
            type="text"
            disabled={index === 0 || loading}
            icon={<AppIcon icon={ArrowUp} size="sm" />}
            onClick={() => handleMove(index, 'up')}
            className="w-7 h-7 flex items-center justify-center p-0 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          />
          <Button
            size="small"
            type="text"
            disabled={index === criteria.length - 1 || loading}
            icon={<AppIcon icon={ArrowDown} size="sm" />}
            onClick={() => handleMove(index, 'down')}
            className="w-7 h-7 flex items-center justify-center p-0 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          />
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          <Tooltip title="Chỉnh sửa tiêu chí">
            <Button
              size="small"
              type="text"
              icon={<AppIcon icon={Edit2} size="sm" />}
              onClick={() => handleOpenEdit(r)}
              className="text-slate-500 hover:text-teal-600 w-7 h-7 flex items-center justify-center p-0"
            />
          </Tooltip>
          <Popconfirm
            title="Xóa tiêu chí này?"
            description="Bạn có chắc chắn muốn xóa tiêu chí này khỏi danh sách đánh giá?"
            onConfirm={() => handleDelete(r.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa tiêu chí">
              <Button
                size="small"
                type="text"
                danger
                icon={<AppIcon icon={Trash2} size="sm" />}
                className="w-7 h-7 flex items-center justify-center p-0"
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
        open={open}
        onCancel={onClose}
        width={720}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <AppIcon icon={Sparkles} size="sm" />
            </span>
            <div>
              <div className="font-bold text-base text-slate-800 dark:text-slate-100">
                Tiêu Chí Tư Vấn & Đánh Giá Điều Kiện Mi
              </div>
              <div className="text-xs text-slate-400 font-normal">
                Cô Đẫm (Lead Technical) quản lý danh sách tiêu chí kiểm tra mi của khách ngay sau Check-in
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-xs text-teal-800 dark:text-teal-300">
            <div className="flex items-center gap-2">
              <AppIcon icon={CheckCircle} size="sm" className="text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Quy trình Tư vấn & Đánh giá gồm 5 tiêu chí chuẩn. Cô Đẫm có thể thêm, sửa, xóa hoặc đổi thứ tự tùy theo
                chuyên môn uốn mi.
              </span>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<AppIcon icon={Plus} size="sm" />}
              onClick={handleOpenAdd}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shrink-0 flex items-center gap-1 shadow-sm"
            >
              Thêm tiêu chí
            </Button>
          </div>

          <DataTable
            loading={loading}
            dataSource={criteria}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            className="border rounded-xl border-slate-200 dark:border-slate-800 overflow-hidden"
          />

          <div className="flex justify-end pt-2">
            <Button onClick={onClose} className="rounded-xl">
              Đóng
            </Button>
          </div>
        </div>
      </AdaptiveModal>

      {/* Modal Add/Edit */}
      <AdaptiveModal
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        width={480}
        title={
          <div className="font-bold text-base text-slate-800 dark:text-slate-100">
            {editingCriterion ? 'Sửa tiêu chí đánh giá' : 'Thêm tiêu chí đánh giá mới'}
          </div>
        }
        onOk={handleSubmit}
        okText={editingCriterion ? 'Lưu thay đổi' : 'Thêm mới'}
        confirmLoading={submitting}
        okButtonProps={{ className: 'bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl' }}
        cancelButtonProps={{ className: 'rounded-xl' }}
      >
        <Form form={form} layout="vertical" className="pt-2">
          <Form.Item
            name="name"
            label={<span className="font-semibold text-xs">Tên tiêu chí đánh giá</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên tiêu chí.' }]}
          >
            <Input placeholder="Ví dụ: Độ dài mi, Độ dày sợi mi, v.v." className="rounded-lg h-9" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="font-semibold text-xs">Mô tả / Hướng dẫn kiểm tra (tùy chọn)</span>}
          >
            <TextArea
              rows={3}
              placeholder="Hướng dẫn KTV cách kiểm tra và tiêu chuẩn đánh giá..."
              className="rounded-lg"
            />
          </Form.Item>
        </Form>
      </AdaptiveModal>
    </>
  );
}
