'use client';

import React from 'react';
import { Button, Form, Input, Select, type FormInstance } from 'antd';
import { ShieldAlert } from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import type { IncidentFormValues, IncidentReport } from './safety-risk-types';

const { TextArea } = Input;

interface SafetyIncidentModalsProps {
  isAddIncidentModalOpen: boolean;
  onCancelAddIncident: () => void;
  incidentForm: FormInstance<IncidentFormValues>;
  onCreateIncident: (values: IncidentFormValues) => void;
  sessions: PilotSession[];
  selectedIncidentDetail: IncidentReport | null;
  onCloseIncidentDetail: () => void;
}

export function SafetyIncidentModals({
  isAddIncidentModalOpen,
  onCancelAddIncident,
  incidentForm,
  onCreateIncident,
  sessions,
  selectedIncidentDetail,
  onCloseIncidentDetail,
}: SafetyIncidentModalsProps) {
  return (
    <>
      {/* MODAL 1: TẠO BIÊN BẢN SỰ CỐ MỚI */}
      <AdaptiveModal
        open={isAddIncidentModalOpen}
        onCancel={onCancelAddIncident}
        title={
          <div className="flex items-center gap-2 text-rose-600 font-bold">
            <AppIcon icon={ShieldAlert} size={18} />
            <span>Biểu Mẫu Ghi Nhận Sự Cố &amp; Kế Hoạch Chăm Sóc Bổ Sung</span>
          </div>
        }
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form form={incidentForm} layout="vertical" onFinish={onCreateIncident} className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="incidentTime"
              label="Thời gian phát sinh"
              rules={[{ required: true, message: 'Vui lòng nhập thời gian' }]}
            >
              <Input placeholder="VD: 27/10/2026 14:30" />
            </Form.Item>

            <Form.Item
              name="technicianName"
              label="Chuyên Viên Kỹ Thuật phụ trách"
              rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập KTV' }]}
            >
              <Input placeholder="Cô Đẫm (KTV)" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="customerName"
              label="Họ tên Khách hàng"
              rules={[{ required: true, message: 'Vui lòng nhập họ tên khách' }]}
            >
              <Input placeholder="VD: Chị Minh Anh" />
            </Form.Item>

            <Form.Item name="customerPhone" label="Số điện thoại khách">
              <Input placeholder="VD: 0987 654 321" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="incidentType"
              label="Phân loại sự cố"
              rules={[{ required: true, message: 'Vui lòng chọn loại sự cố' }]}
            >
              <Select
                options={[
                  { value: 'STINGING_MILD', label: 'Cấp 1 – Cay mắt & chảy nước mắt nhẹ' },
                  { value: 'IRRITATION_MODERATE', label: 'Cấp 2 – Kích ứng đỏ bờ mi / rát nhẹ' },
                  { value: 'ALLERGIC_SEVERE', label: 'Cấp 3 – Phản ứng dị ứng cấp (Chuyển y tế)' },
                  { value: 'TECHNICAL_OTHER', label: 'Sự cố kỹ thuật uốn mi khác' },
                ]}
              />
            </Form.Item>

            <Form.Item name="sessionId" label="Ca dịch vụ liên kết (Nếu có)">
              <Select
                allowClear
                placeholder="Chọn ca Pilot liên kết"
                options={[
                  ...sessions.map((s) => ({
                    value: s.id,
                    label: `Ca #${s.id} - ${s.customerName} (${s.sessionDate})`,
                  })),
                  { value: 999, label: 'Ca dịch vụ mới ngoài danh sách Pilot' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="Mô tả chi tiết tình trạng phát sinh"
            rules={[{ required: true, message: 'Vui lòng mô tả chi tiết biểu hiện của mắt' }]}
          >
            <TextArea
              rows={3}
              placeholder="VD: Khách có biểu hiện chớp mắt liên tục ở phút thứ 12 của bước ủ thuốc số 1, khóe mắt chảy nước mắt nhẹ..."
            />
          </Form.Item>

          <Form.Item
            name="immediateAction"
            label="Phương án xử lý tại chỗ đã thực hiện"
            rules={[{ required: true, message: 'Vui lòng nhập phương án xử lý đã áp dụng' }]}
          >
            <TextArea
              rows={2}
              placeholder="VD: Gạt sạch thuốc ở góc khóe mắt, dùng tăm bông khô thấm hút, nhỏ 2 giọt nước muối sinh lý NaCl 0.9% và bật quạt gió 30s..."
            />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="status" label="Trạng thái xử lý ban đầu">
              <Select
                options={[
                  { value: 'INVESTIGATING', label: 'Đang theo dõi tại chi nhánh' },
                  { value: 'STABILIZED', label: 'Đã ổn định sau khi sơ cứu' },
                  { value: 'TRANSFERRED_MEDICAL', label: 'Chuyển viện mắt chuyên khoa' },
                ]}
              />
            </Form.Item>

            <Form.Item name="followUp24h" label="Kế hoạch chăm sóc sau 24h">
              <Input placeholder="VD: Điện thoại hỏi thăm tình trạng mắt và độ cong mi" />
            </Form.Item>
          </div>

          <Form.Item name="compensationNote" label="Ghi chú bồi hoàn / voucher chăm sóc bổ sung">
            <Input placeholder="VD: Tặng lọ nước mắt nhân tạo và voucher dưỡng mi miễn phí" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={onCancelAddIncident}>Hủy bỏ</Button>
            <Button type="primary" danger htmlType="submit">
              Lưu Biên Bản Sự Cố
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* MODAL 5: XEM CHI TIẾT BIÊN BẢN SỰ CỐ */}
      <AdaptiveModal
        open={Boolean(selectedIncidentDetail)}
        onCancel={onCloseIncidentDetail}
        title={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              {selectedIncidentDetail?.code}
            </span>
            <span>Chi Tiết Biên Bản Sự Cố An Toàn Giác Mạc</span>
          </div>
        }
        footer={null}
        intent="detail"
      >
        {selectedIncidentDetail && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div>
                <span className="text-slate-500 block">Khách hàng:</span>
                <strong className="text-sm">{selectedIncidentDetail.customerName}</strong>
                <div className="text-slate-400 tabular-nums">{selectedIncidentDetail.customerPhone}</div>
              </div>
              <div>
                <span className="text-slate-500 block">Chuyên Viên Kỹ Thuật phụ trách:</span>
                <strong className="text-sm">{selectedIncidentDetail.technicianName}</strong>
                <div className="text-slate-400 tabular-nums">Thời gian: {selectedIncidentDetail.incidentTime}</div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Mô tả tình trạng:</span>
              <p className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 m-0 leading-relaxed">
                {selectedIncidentDetail.description}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Xử lý tại chỗ:</span>
              <p className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 m-0 leading-relaxed">
                {selectedIncidentDetail.immediateAction}
              </p>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">Lịch sử theo dõi sau sự cố:</span>
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                  <strong>24h:</strong> {selectedIncidentDetail.followUp24h?.condition || 'Chưa ghi nhận'}
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-800 dark:text-blue-300">
                  <strong>48h:</strong> {selectedIncidentDetail.followUp48h?.condition || 'Chưa ghi nhận'}
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-800 dark:text-purple-300">
                  <strong>72h:</strong> {selectedIncidentDetail.followUp72h?.condition || 'Chưa ghi nhận'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={onCloseIncidentDetail}>Đóng</Button>
            </div>
          </div>
        )}
      </AdaptiveModal>
    </>
  );
}
