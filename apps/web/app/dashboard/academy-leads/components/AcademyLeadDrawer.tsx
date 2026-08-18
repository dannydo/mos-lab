'use client';

import React from 'react';
import {
  Button,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type {
  AcademyLeadDetail,
  AcademyLeadStatus,
  AcademyStaffOption,
  CreateAcademyActivityRequest,
  CreateAcademyFollowUpRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { formatVND } from '../../../../lib/format-utils';
import { EntityForm, EntityFormDrawer, EntityFormField, StatePanel, StatusTag } from '../../../../components/ui';

const { Text, Paragraph } = Typography;

const STATUS_OPTIONS: Array<{ value: AcademyLeadStatus; label: string }> = [
  { value: 'NEW', label: 'Mới' },
  { value: 'WARM', label: 'Đang tư vấn' },
  { value: 'SCHEDULED', label: 'Đã hẹn test' },
  { value: 'TESTED', label: 'Đã test' },
  { value: 'WON', label: 'Đã chốt' },
  { value: 'LOST', label: 'Không phù hợp' },
];

const statusTone: Record<AcademyLeadStatus, React.ComponentProps<typeof StatusTag>['status']> = {
  NEW: 'default',
  WARM: 'warning',
  SCHEDULED: 'processing',
  TESTED: 'purple',
  WON: 'success',
  LOST: 'error',
};

type LeadFormValues = {
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  course?: string;
  goal?: string;
  scheduledAt?: dayjs.Dayjs;
  flightDate?: dayjs.Dayjs;
  ownerStaffId?: number | null;
  status?: AcademyLeadStatus;
  revenueVnd?: number;
  isHot?: boolean;
  note?: string;
};

type ActivityFormValues = { type: CreateAcademyActivityRequest['type']; content: string };
type FollowUpFormValues = {
  content: string;
  dueAt?: dayjs.Dayjs;
  assigneeStaffId?: number | null;
  pancakeLink?: string;
};

export interface AcademyLeadDrawerProps {
  open: boolean;
  leadId: number | null;
  staff: AcademyStaffOption[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function statusLabel(status: AcademyLeadStatus) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function taskDueLabel(value: string | null) {
  if (!value) return 'Chưa đặt hạn';
  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

export function AcademyLeadDrawer({ open, leadId, staff, onClose, onSaved }: AcademyLeadDrawerProps) {
  const [lead, setLead] = React.useState<AcademyLeadDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [addingActivity, setAddingActivity] = React.useState(false);
  const [addingFollowUp, setAddingFollowUp] = React.useState(false);
  const [form] = Form.useForm<LeadFormValues>();
  const [activityForm] = Form.useForm<ActivityFormValues>();
  const [followUpForm] = Form.useForm<FollowUpFormValues>();

  const loadLead = React.useCallback(async () => {
    if (!leadId) {
      setLead(null);
      form.resetFields();
      form.setFieldsValue({ status: 'NEW', isHot: false });
      return;
    }
    setLoading(true);
    try {
      const detail = await apiClient.academySales.getLead(leadId);
      setLead(detail);
      form.setFieldsValue({
        name: detail.name,
        phone: detail.phone ?? undefined,
        email: detail.email ?? undefined,
        source: detail.source,
        course: detail.course ?? undefined,
        goal: detail.goal ?? undefined,
        ownerStaffId: detail.owner?.id ?? null,
        status: detail.status,
        revenueVnd: detail.revenueVnd,
        isHot: detail.isHot,
        note: detail.note ?? undefined,
        scheduledAt: detail.scheduledAt ? dayjs(detail.scheduledAt) : undefined,
        flightDate: detail.flightDate ? dayjs(detail.flightDate) : undefined,
      });
    } catch {
      message.error('Không thể tải hồ sơ lead.');
    } finally {
      setLoading(false);
    }
  }, [form, leadId]);

  React.useEffect(() => {
    if (open) void loadLead();
  }, [loadLead, open]);

  const submitLead = async (values: LeadFormValues) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        scheduledAt: values.scheduledAt?.toISOString() || null,
        flightDate: values.flightDate?.format('YYYY-MM-DD') || null,
        revenueVnd: Math.round(Number(values.revenueVnd) || 0),
      };
      if (leadId) await apiClient.academySales.updateLead(leadId, payload);
      else await apiClient.academySales.createLead(payload);
      message.success(leadId ? 'Đã cập nhật lead.' : 'Đã tạo lead Academy.');
      await onSaved();
      if (leadId) await loadLead();
      else onClose();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể lưu lead.');
    } finally {
      setSaving(false);
    }
  };

  const submitActivity = async (values: ActivityFormValues) => {
    if (!leadId) return;
    setAddingActivity(true);
    try {
      await apiClient.academySales.addActivity(leadId, values);
      activityForm.resetFields();
      message.success('Đã ghi nhận hoạt động.');
      await loadLead();
      await onSaved();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể ghi nhận hoạt động.');
    } finally {
      setAddingActivity(false);
    }
  };

  const submitFollowUp = async (values: FollowUpFormValues) => {
    if (!leadId) return;
    setAddingFollowUp(true);
    try {
      const payload: CreateAcademyFollowUpRequest = {
        leadId,
        content: values.content,
        dueAt: values.dueAt?.toISOString() || null,
        assigneeStaffId: values.assigneeStaffId ?? null,
        pancakeLink: values.pancakeLink || null,
      };
      await apiClient.academySales.createFollowUp(payload);
      followUpForm.resetFields();
      message.success('Đã tạo task follow-up.');
      await loadLead();
      await onSaved();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không thể tạo task follow-up.');
    } finally {
      setAddingFollowUp(false);
    }
  };

  const completeTask = async (id: number) => {
    try {
      await apiClient.academySales.updateFollowUp(id, { status: 'DONE' });
      message.success('Đã hoàn thành follow-up.');
      await loadLead();
      await onSaved();
    } catch {
      message.error('Không thể cập nhật follow-up.');
    }
  };

  const title = leadId ? `Hồ sơ lead${lead ? ` · ${lead.name}` : ''}` : 'Tạo lead Academy';

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={title}
      width={760}
      footer={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            {leadId ? 'Lưu thay đổi' : 'Tạo lead'}
          </Button>
        </Space>
      }
    >
      {loading ? (
        <StatePanel kind="loading" surface={false} minHeight={340} />
      ) : (
        <Tabs
          items={[
            {
              key: 'profile',
              label: 'Hồ sơ & pipeline',
              children: (
                <EntityForm form={form} onFinish={submitLead} columns={2}>
                  <EntityFormField label="Tên lead" name="name" rules={[{ required: true, message: 'Nhập tên lead' }]}>
                    <Input autoFocus placeholder="Họ tên học viên tiềm năng" />
                  </EntityFormField>
                  <EntityFormField label="Số điện thoại" name="phone">
                    <Input inputMode="tel" placeholder="0xxx…" />
                  </EntityFormField>
                  <EntityFormField label="Nguồn" name="source">
                    <Input placeholder="Facebook, TikTok, POS…" />
                  </EntityFormField>
                  <EntityFormField label="Khóa học quan tâm" name="course">
                    <Input placeholder="Tên/mã khóa học" />
                  </EntityFormField>
                  <EntityFormField label="Trạng thái pipeline" name="status" rules={[{ required: true }]}>
                    <Select options={STATUS_OPTIONS} />
                  </EntityFormField>
                  <EntityFormField label="Người phụ trách" name="ownerStaffId">
                    <Select allowClear options={staff.map((item) => ({ value: item.id, label: item.displayName }))} />
                  </EntityFormField>
                  <EntityFormField label="Lịch test (ICT)" name="scheduledAt">
                    <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
                  </EntityFormField>
                  <EntityFormField label="Ngày bay dự kiến" name="flightDate">
                    <DatePicker format="DD/MM/YYYY" className="w-full" />
                  </EntityFormField>
                  <EntityFormField label="Doanh thu đã chốt (VNĐ)" name="revenueVnd">
                    <InputNumber
                      min={0}
                      step={100000}
                      className="w-full"
                      formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
                    />
                  </EntityFormField>
                  <EntityFormField label="Hot lead" name="isHot">
                    <Select
                      options={[
                        { value: false, label: 'Không' },
                        { value: true, label: 'Đánh dấu Hot' },
                      ]}
                    />
                  </EntityFormField>
                  <EntityFormField fullWidth label="Mục tiêu / ghi chú" name="goal">
                    <Input.TextArea rows={2} placeholder="Mục tiêu học, thời điểm phù hợp…" />
                  </EntityFormField>
                  <EntityFormField fullWidth label="Ghi chú nội bộ" name="note">
                    <Input.TextArea rows={3} placeholder="Thông tin tư vấn quan trọng" />
                  </EntityFormField>
                </EntityForm>
              ),
            },
            ...(leadId
              ? [
                  {
                    key: 'timeline',
                    label: `Hoạt động (${lead?.activities.length || 0})`,
                    children: (
                      <div className="flex flex-col gap-4">
                        <Form form={activityForm} layout="vertical" onFinish={submitActivity}>
                          <Space.Compact className="w-full">
                            <Form.Item name="type" initialValue="NOTE" noStyle>
                              <Select
                                style={{ width: 128 }}
                                options={[
                                  { value: 'NOTE', label: 'Ghi chú' },
                                  { value: 'CALL', label: 'Gọi điện' },
                                  { value: 'ZALO', label: 'Zalo' },
                                  { value: 'NO_SHOW', label: 'No-show' },
                                ]}
                              />
                            </Form.Item>
                            <Form.Item name="content" noStyle rules={[{ required: true, message: 'Nhập nội dung' }]}>
                              <Input
                                placeholder="Ghi nhận trao đổi với lead"
                                onPressEnter={() => activityForm.submit()}
                              />
                            </Form.Item>
                            <Button
                              type="primary"
                              loading={addingActivity}
                              icon={<PlusOutlined />}
                              onClick={() => activityForm.submit()}
                            >
                              Ghi
                            </Button>
                          </Space.Compact>
                        </Form>
                        <List
                          dataSource={lead?.activities || []}
                          locale={{ emptyText: 'Chưa có hoạt động.' }}
                          renderItem={(item) => (
                            <List.Item>
                              <List.Item.Meta
                                title={
                                  <Space size={6} wrap>
                                    <Tag>{item.type}</Tag>
                                    <Text>{item.actor?.displayName || 'Hệ thống'}</Text>
                                    <Text type="secondary">{dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm')}</Text>
                                  </Space>
                                }
                                description={item.content || '—'}
                              />
                            </List.Item>
                          )}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'tasks',
                    label: `Follow-up (${lead?.followUpTasks.filter((task) => task.status === 'PENDING').length || 0})`,
                    children: (
                      <div className="flex flex-col gap-4">
                        <Form form={followUpForm} layout="vertical" onFinish={submitFollowUp}>
                          <Form.Item
                            name="content"
                            label="Nội dung follow-up"
                            rules={[{ required: true, message: 'Nhập việc cần làm' }]}
                          >
                            <Input placeholder="Ví dụ: Gọi xác nhận lịch test" />
                          </Form.Item>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Form.Item name="dueAt" label="Hạn xử lý (ICT)">
                              <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
                            </Form.Item>
                            <Form.Item name="assigneeStaffId" label="Người thực hiện">
                              <Select
                                allowClear
                                options={staff.map((item) => ({ value: item.id, label: item.displayName }))}
                              />
                            </Form.Item>
                          </div>
                          <Form.Item name="pancakeLink" label="Link chat Pancake">
                            <Input placeholder="https://…" />
                          </Form.Item>
                          <Button
                            type="primary"
                            loading={addingFollowUp}
                            icon={<PlusOutlined />}
                            onClick={() => followUpForm.submit()}
                          >
                            Tạo follow-up
                          </Button>
                        </Form>
                        <Divider className="my-0" />
                        <List
                          dataSource={lead?.followUpTasks || []}
                          locale={{ emptyText: 'Chưa có follow-up task.' }}
                          renderItem={(item) => (
                            <List.Item
                              actions={
                                item.status === 'PENDING'
                                  ? [
                                      <Button
                                        key="done"
                                        type="link"
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => void completeTask(item.id)}
                                      >
                                        Hoàn thành
                                      </Button>,
                                    ]
                                  : []
                              }
                            >
                              <List.Item.Meta
                                title={
                                  <Space wrap>
                                    <Text delete={item.status === 'DONE'}>{item.content}</Text>
                                    <StatusTag
                                      status={item.status === 'DONE' ? 'success' : 'processing'}
                                      label={item.status === 'DONE' ? 'Xong' : 'Đang chờ'}
                                    />
                                  </Space>
                                }
                                description={`${taskDueLabel(item.dueAt)} · ${item.assignee?.displayName || 'Chưa giao'}`}
                              />
                            </List.Item>
                          )}
                        />
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}
      {lead && lead.status === 'WON' && (
        <Paragraph type="secondary" className="mt-2">
          Giá trị chốt: {formatVND(lead.revenueVnd)} · {statusLabel(lead.status)}
        </Paragraph>
      )}
    </EntityFormDrawer>
  );
}

export default AcademyLeadDrawer;
