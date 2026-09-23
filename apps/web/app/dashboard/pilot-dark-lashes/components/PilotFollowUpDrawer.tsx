'use client';

import React from 'react';
import { Button, Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import { HeartHandshake } from 'lucide-react';
import dayjs from 'dayjs';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';
import { EntityFormDrawer } from '../../../../components/ui/EntityFormDrawer';

interface PilotFollowUpDrawerProps {
  open: boolean;
  session: PilotSession | null;
  form: FormInstance;
  onClose: () => void;
  onSubmit: () => void;
}

export function PilotFollowUpDrawer({ open, session, form, onClose, onSubmit }: PilotFollowUpDrawerProps) {
  return (
    <EntityFormDrawer
      title={
        <div className="flex items-center gap-2 text-base font-bold">
          <AppIcon icon={HeartHandshake} size="sm" className="text-emerald-500" />
          Chăm Sóc & Đánh Giá CSAT: {session?.customerName}
        </div>
      }
      open={open}
      onClose={onClose}
      width={500}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>Đóng</Button>
          <Button type="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSubmit}>
            Lưu chăm sóc
          </Button>
        </div>
      }
    >
      <div className="my-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
        <div>
          Khách hàng: <strong>{session?.customerName}</strong> ({session?.customerPhone})
        </div>
        <div>
          Ngày làm dịch vụ:{' '}
          <span className="tabular-nums font-medium">
            {session?.sessionDate ? dayjs(session.sessionDate).format('DD/MM/YYYY') : '--'}
          </span>
        </div>
        <div>
          Kỹ thuật viên: <strong>{session?.technicianName || 'Cô Đẫm'}</strong>
        </div>
      </div>

      <Form form={form} layout="vertical" className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="followUp24hStatus" label="Trạng thái 24h">
            <Select
              options={[
                { label: 'Chờ gọi (Pending)', value: 'PENDING' },
                { label: 'Đã hoàn tất (Done)', value: 'DONE' },
                { label: 'Bỏ qua (Skipped)', value: 'SKIPPED' },
              ]}
            />
          </Form.Item>

          <Form.Item name="followUp72hStatus" label="Trạng thái 72h">
            <Select
              options={[
                { label: 'Chờ gọi (Pending)', value: 'PENDING' },
                { label: 'Đã hoàn tất (Done)', value: 'DONE' },
                { label: 'Bỏ qua (Skipped)', value: 'SKIPPED' },
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item name="csatScore" label="Điểm hài lòng CSAT (1-5 sao)">
          <InputNumber min={1} max={5} className="w-full" placeholder="Nhập điểm sao (1 - 5)" />
        </Form.Item>

        <Form.Item name="issues" label="Vấn đề / Feedback từ khách hàng">
          <Input.TextArea
            rows={2}
            placeholder="VD: Độ cong mi giữ tốt, khách rất ưng form mi..."
            className="rounded-lg"
          />
        </Form.Item>

        <Form.Item name="notes" label="Ghi chú thêm">
          <Input placeholder="Ghi chú nội bộ cho ca này" className="rounded-lg" />
        </Form.Item>
      </Form>
    </EntityFormDrawer>
  );
}
