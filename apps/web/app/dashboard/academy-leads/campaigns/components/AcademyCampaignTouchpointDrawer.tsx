'use client';

import React from 'react';
import { Button, DatePicker, Form, Input, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  type AcademyCampaignLead,
  type AcademyCampaignTouchpoint,
  type AcademyCampaignTouchpointOutcome,
  type ToggleAcademyCampaignTouchpointLogRequest,
} from '@mos-lab/shared';
import { EntityForm, EntityFormDrawer, EntityFormField, StatusTag } from '../../../../../components/ui';
import {
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS,
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_OPTIONS,
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_TONES,
} from './academy-campaign-utils';

type TouchpointFormValues = {
  status?: AcademyCampaignTouchpointOutcome;
  note?: string;
  callbackDueAt?: Dayjs | null;
};

export interface AcademyCampaignTouchpointDrawerProps {
  open: boolean;
  lead: AcademyCampaignLead | null;
  touchpoint: AcademyCampaignTouchpoint | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: ToggleAcademyCampaignTouchpointLogRequest) => void | Promise<void>;
}

/** One focused operational drawer prevents accidental state changes in the dense campaign table. */
export function AcademyCampaignTouchpointDrawer({
  open,
  lead,
  touchpoint,
  submitting = false,
  onClose,
  onSubmit,
}: AcademyCampaignTouchpointDrawerProps) {
  const [form] = Form.useForm<TouchpointFormValues>();
  const selectedLog = React.useMemo(
    () => lead?.touchpointLogs.find((item) => item.touchpointId === touchpoint?.id) || null,
    [lead, touchpoint?.id]
  );
  const selectedOutcome = Form.useWatch('status', form);

  React.useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      status: selectedLog?.status || undefined,
      note: selectedLog?.note || '',
      callbackDueAt: selectedLog?.callbackDueAt ? dayjs(selectedLog.callbackDueAt) : null,
    });
  }, [form, open, selectedLog]);

  const submit = React.useCallback(
    async (values: TouchpointFormValues) => {
      if (!values.status) return;
      await onSubmit({
        status: values.status,
        note: values.note?.trim() || null,
        callbackDueAt:
          values.status === 'CALLBACK' ? values.callbackDueAt?.format('YYYY-MM-DDTHH:mm:ss') || null : null,
      });
    },
    [onSubmit]
  );

  const clear = React.useCallback(async () => {
    await onSubmit({ status: null });
  }, [onSubmit]);

  const title = touchpoint && lead ? `${touchpoint.label} · ${lead.lead.name}` : 'Cập nhật điểm chạm';

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Space>
          {selectedLog?.status && (
            <Button danger onClick={() => void clear()} loading={submitting}>
              Xóa kết quả
            </Button>
          )}
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit" form="academy-campaign-touchpoint-form" loading={submitting}>
            Lưu điểm chạm
          </Button>
        </Space>
      }
    >
      <EntityForm<TouchpointFormValues>
        id="academy-campaign-touchpoint-form"
        form={form}
        columns={1}
        onFinish={(values) => void submit(values)}
      >
        <EntityFormField label="Kết quả hiện tại" fullWidth>
          {selectedLog?.status ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag
                status={ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_TONES[selectedLog.status]}
                label={ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS[selectedLog.status]}
              />
              {selectedLog.completedAt && (
                <span className="text-xs opacity-70">
                  {dayjs(selectedLog.completedAt).format('DD/MM/YYYY HH:mm')} ·{' '}
                  {selectedLog.completedBy?.displayName || 'Không rõ người thao tác'}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm opacity-70">Chưa ghi nhận kết quả.</span>
          )}
        </EntityFormField>
        <EntityFormField
          name="status"
          label="Kết quả điểm chạm"
          rules={[{ required: true, message: 'Chọn kết quả điểm chạm.' }]}
        >
          <Select
            options={ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_OPTIONS}
            placeholder="Chọn kết quả"
            optionRender={(option) => (
              <StatusTag
                status={ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_TONES[option.value as AcademyCampaignTouchpointOutcome]}
                label={String(option.label)}
              />
            )}
          />
        </EntityFormField>
        {selectedOutcome === 'CALLBACK' && (
          <EntityFormField
            name="callbackDueAt"
            label="Hạn gọi lại"
            rules={[{ required: true, message: 'Chọn thời gian gọi lại.' }]}
          >
            <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" className="w-full" />
          </EntityFormField>
        )}
        <EntityFormField name="note" label="Ghi chú thực hiện" fullWidth>
          <Input.TextArea
            rows={4}
            maxLength={5000}
            placeholder="Kết quả trao đổi, phản hồi của khách, hoặc lý do gọi lại…"
          />
        </EntityFormField>
        {selectedOutcome === 'CALLBACK' && (
          <EntityFormField label="Tự động tạo follow-up" fullWidth>
            <span className="text-sm opacity-70">
              Hệ thống sẽ tạo hoặc cập nhật follow-up Academy cho người phụ trách lead.
            </span>
          </EntityFormField>
        )}
      </EntityForm>
    </EntityFormDrawer>
  );
}

export default AcademyCampaignTouchpointDrawer;
