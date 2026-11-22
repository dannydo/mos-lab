'use client';

import React from 'react';
import { Button, DatePicker, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import { WARRANTY_TYPE_SELECT_OPTIONS } from './constants';
import { normalizeTicketSearchText } from './helpers';
import type { ResolveSubtaskFormValues, TicketStaffMember, TicketSubtaskItem } from './types';

const { TextArea } = Input;

export interface ResolveSubtaskModalProps {
  open: boolean;
  onClose: () => void;
  form: FormInstance<ResolveSubtaskFormValues>;
  activeSubtask: TicketSubtaskItem | null;
  staffList: TicketStaffMember[];
  resolving: boolean;
  onSubmit: (values: ResolveSubtaskFormValues) => void;
}

export function ResolveSubtaskModal({
  open,
  onClose,
  form,
  activeSubtask,
  staffList,
  resolving,
  onSubmit,
}: ResolveSubtaskModalProps) {
  const isCvDepartment = activeSubtask?.department === 'CV';

  return (
    <AdaptiveModal
      title={`🔍 Giai Đoạn 2: Soi Mi Tại Shop & Chốt Bảo Hành — Bộ Phận ${activeSubtask?.department || ''}`}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={550}
      intent="form"
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} className="mt-4">
        <div className="text-xs text-slate-600 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
          <div>
            📌 Vấn đề: <strong>{activeSubtask?.issueSummary}</strong>
          </div>
          {isCvDepartment && activeSubtask?.previousTechnicianName && (
            <div className="text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ CV ca cũ: {activeSubtask.previousTechnicianName}
            </div>
          )}
        </div>

        {isCvDepartment && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 space-y-3">
            <Form.Item
              name="inspectionResultNote"
              label={
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  🔍 Kết Quả Soi Mi Trực Tiếp Tại Shop
                </span>
              }
              rules={[{ required: true, message: 'Vui lòng nhập kết quả soi mi trực tiếp' }]}
              className="mb-2"
            >
              <TextArea
                rows={2}
                placeholder="Nhập kết quả soi mi thực tế (ví dụ: Chân mi bết keo ca cũ, rụng mi rải rác, cộm mí mắt...)"
              />
            </Form.Item>

            <Form.Item
              name="warrantyType"
              label={
                <span className="font-semibold text-sky-600 dark:text-sky-400">
                  🛡️ Phương Án Bảo Hành Dự Kiến (Tự Động Theo Kết Quả POS)
                </span>
              }
              className="mb-1"
            >
              <Select
                allowClear
                placeholder="Tự động chốt theo dịch vụ thực tế (hoặc chọn trước nếu có)"
                options={WARRANTY_TYPE_SELECT_OPTIONS}
              />
            </Form.Item>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 italic">
              💡 <strong>Hệ thống Legacy tự động chốt:</strong> Quy tắc thưởng/phạt (Fix, Adjust, Log, Replace) sẽ được
              hệ thống Legacy tự động tính toán dựa trên loại dịch vụ thực tế tạo trên đơn hàng tại Tiệm.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Form.Item name="replacementTechnicianId" label="CV Mới Thay Thế (Tay nghề cao)" className="mb-0">
                <Select
                  showSearch
                  placeholder="Chọn CV làm lại tại tiệm"
                  allowClear
                  filterOption={(input, option) => {
                    const staff = staffList.find((s) => Number(s.id) === Number(option?.value));
                    if (!staff) return false;
                    const name = staff.displayName || staff.name || '';
                    return normalizeTicketSearchText(name).includes(normalizeTicketSearchText(input));
                  }}
                  options={staffList
                    .filter((s) => Number(s.id) !== Number(activeSubtask?.previousTechnicianId))
                    .map((s) => ({
                      value: Number(s.id),
                      label: `${s.displayName || s.name || ''} (${s.role || 'CV'})`,
                    }))}
                />
              </Form.Item>

              <Form.Item name="warrantyAppointmentDate" label="Hẹn Bảo Hành Làm Lại" className="mb-0">
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" placeholder="Chọn ngày giờ làm mi" />
              </Form.Item>
            </div>
          </div>
        )}

        <Form.Item
          name="actionPlan"
          label="Hành động cải thiện / Giải pháp khắc phục"
          rules={[{ required: true, message: 'Vui lòng nhập hành động cải thiện' }]}
        >
          <TextArea rows={2} placeholder="Mô tả cụ thể hành động cải thiện bộ phận áp dụng..." />
        </Form.Item>
        <Form.Item name="resolutionNote" label="Ghi chú giải trình thêm (Không bắt buộc)">
          <TextArea rows={2} placeholder="Nhập thêm ghi chú nếu có..." />
        </Form.Item>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={resolving}>
            Nộp Giải Pháp & Đóng Subtask
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
