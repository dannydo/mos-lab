'use client';

import React, { useState } from 'react';
import {
  Drawer,
  Tag,
  Button,
  Typography,
  Timeline,
  Input,
  Form,
  message,
  Space,
  Checkbox,
  Avatar,
  Select,
  Modal,
  DatePicker,
} from 'antd';
import { apiClient } from '../../../../lib/api-client';
import { UserOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface TicketDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  ticketId: number | null;
  ticket?: any;
  onSuccess?: () => void;
}

export default function TicketDetailDrawer({ open, onClose, ticketId, ticket, onSuccess }: TicketDetailDrawerProps) {
  const [commentForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [isResolving, setIsResolving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [changingAssignee, setChangingAssignee] = useState(false);

  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [activeSubtask, setActiveSubtask] = useState<any | null>(null);
  const [subtaskForm] = Form.useForm();
  const [resolvingSubtask, setResolvingSubtask] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleForm] = Form.useForm();
  const [scheduling, setScheduling] = useState(false);

  const handleScheduleInspectionSubmit = async (values: any) => {
    if (!activeSubtask?.id) return;
    setScheduling(true);
    try {
      await apiClient.cs.scheduleSubtaskInspection(activeSubtask.id, {
        inspectionStoreName: values.inspectionStoreName,
        inspectionAppointmentDate: values.inspectionAppointmentDate
          ? values.inspectionAppointmentDate.toISOString()
          : new Date().toISOString(),
        note: values.note,
      });
      message.success(`Đã đặt lịch hẹn khách đến Store ${values.inspectionStoreName}!`);
      setScheduleModalOpen(false);
      scheduleForm.resetFields();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error scheduling shop inspection:', err);
      message.error(err?.response?.data?.message || 'Không thể đặt lịch hẹn đến Shop');
    } finally {
      setScheduling(false);
    }
  };

  const handleResolveSubtaskSubmit = async (values: any) => {
    if (!activeSubtask?.id) return;
    setResolvingSubtask(true);
    try {
      await apiClient.cs.resolveSubtask(activeSubtask.id, {
        actionPlan: values.actionPlan,
        resolutionNote: values.resolutionNote,
        warrantyType: values.warrantyType,
        replacementTechnicianId: values.replacementTechnicianId ? Number(values.replacementTechnicianId) : undefined,
        warrantyAppointmentDate: values.warrantyAppointmentDate
          ? values.warrantyAppointmentDate.toISOString()
          : undefined,
        inspectionResultNote: values.inspectionResultNote,
      });
      message.success(`Đã nộp giải pháp nội bộ cho bộ phận ${activeSubtask.department} thành công!`);
      setSubtaskModalOpen(false);
      subtaskForm.resetFields();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error resolving subtask:', err);
      message.error(err?.response?.data?.message || 'Lỗi khi nộp giải pháp');
    } finally {
      setResolvingSubtask(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      apiClient.customers
        .getStaff()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res as any)?.data || [];
          setStaffList(list);
        })
        .catch(console.error);
    }
  }, [open]);

  const [localTicket, setLocalTicket] = useState<any>(ticket || null);

  React.useEffect(() => {
    setLocalTicket(ticket || null);
  }, [ticket]);

  const activeTicket = localTicket ||
    ticket || {
      id: ticketId,
      ticketCode: ticketId ? `TK-${String(ticketId).padStart(4, '0')}` : '',
      customerName: 'Khách hàng',
      customerPhone: '',
      type: 'COMPLAINT',
      priority: 'MEDIUM',
      status: 'OPEN',
      department: 'CSKH',
      createdAt: new Date().toISOString(),
      slaDueDate: new Date().toISOString(),
      assignedCsStaffName: '',
      description: '',
      comments: [],
    };

  const getPriorityTag = (prio: string) => {
    switch (prio) {
      case 'URGENT':
        return <Tag color="red">Khẩn cấp</Tag>;
      case 'HIGH':
        return <Tag color="orange">Cao</Tag>;
      case 'MEDIUM':
        return <Tag color="blue">Trung bình</Tag>;
      case 'LOW':
        return <Tag color="default">Thấp</Tag>;
      default:
        return <Tag>{prio}</Tag>;
    }
  };

  const handleAddComment = async (values: any) => {
    if (!ticketId && !activeTicket.id) {
      message.error('Không tìm thấy thông tin Ticket');
      return;
    }
    const targetId = activeTicket.id || ticketId;

    setSubmitting(true);
    try {
      await apiClient.cs.addTicketComment(targetId, {
        content: values.content,
        isInternal: values.isInternal || false,
      });
      message.success('Đã thêm trao đổi');
      commentForm.resetFields();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error adding ticket comment:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi thêm trao đổi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (values: any) => {
    if (!ticketId && !activeTicket.id) {
      message.error('Không tìm thấy thông tin Ticket');
      return;
    }
    const targetId = activeTicket.id || ticketId;

    setSubmitting(true);
    try {
      await apiClient.cs.resolveTicket(targetId, {
        resolutionNote: values.resolutionNote,
        actionPlan: values.actionPlan,
      });
      message.success('Đã giải quyết Ticket');
      setIsResolving(false);
      resolveForm.resetFields();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error resolving ticket:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi đóng Ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssigneeChange = async (newStaffId: number) => {
    if (!activeTicket.id) return;
    setChangingAssignee(true);
    try {
      const staffIdNum = Number(newStaffId);
      const selectedStaff = staffList.find((s) => Number(s.id) === staffIdNum);
      const staffName = selectedStaff?.displayName || selectedStaff?.name || `NV #${staffIdNum}`;

      await apiClient.cs.updateTicket(activeTicket.id, {
        assignedCsStaffId: staffIdNum,
      });

      const newComment = {
        id: Date.now(),
        ticketId: activeTicket.id,
        staffId: staffIdNum,
        staffName,
        content: `🔄 Đã chuyển giao Ticket cho nhân sự phụ trách mới: ${staffName}`,
        isInternal: true,
        createdAt: new Date().toISOString(),
      };

      await apiClient.cs.addTicketComment(activeTicket.id, {
        content: newComment.content,
        isInternal: true,
      });

      setLocalTicket((prev: any) => ({
        ...(prev || activeTicket),
        assignedCsStaffId: staffIdNum,
        assignedCsStaffName: staffName,
        comments: [...((prev || activeTicket).comments || []), newComment],
      }));

      message.success(`Đã chuyển giao Ticket cho ${staffName}`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Error changing ticket assignee:', err);
      message.error(err?.response?.data?.message || 'Không thể đổi người phụ trách');
    } finally {
      setChangingAssignee(false);
    }
  };

  const commentsList = activeTicket.comments || [];

  const normalizeText = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <span>Chi tiết Ticket {activeTicket.ticketCode || activeTicket.code}</span>
          {getPriorityTag(activeTicket.priority)}
        </div>
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        {/* Customer Info */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Avatar icon={<UserOutlined />} />
            <div>
              <div className="font-semibold text-lg">{activeTicket.customerName || 'Khách hàng'}</div>
              <div className="text-sm text-slate-500">{activeTicket.customerPhone || activeTicket.phone || '-'}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <Text type="secondary">Bộ phận:</Text>{' '}
              <Tag color="cyan" className="ml-1 font-medium">
                {activeTicket.department || '-'}
              </Tag>
            </div>
            <div className="flex items-center gap-1">
              <Text type="secondary" className="shrink-0">
                Phụ trách:
              </Text>
              <Select
                showSearch
                size="small"
                value={activeTicket.assignedCsStaffId ? Number(activeTicket.assignedCsStaffId) : undefined}
                placeholder="Chọn người phụ trách"
                style={{ width: 170 }}
                loading={changingAssignee}
                onChange={handleAssigneeChange}
                filterOption={(input, option) => {
                  const staff = staffList.find((s: any) => Number(s.id) === Number(option?.value));
                  if (!staff) return false;
                  const name = staff.displayName || staff.name || '';
                  const role = staff.role || '';
                  return normalizeText(`${name} ${role} ${staff.id}`).includes(normalizeText(input));
                }}
                options={staffList.map((s) => ({
                  value: Number(s.id),
                  label: s.displayName || s.name || `NV #${s.id}`,
                }))}
              />
            </div>
            <div>
              <Text type="secondary">Ngày tạo:</Text>{' '}
              {activeTicket.createdAt ? dayjs(activeTicket.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
            </div>
            <div>
              <Text type="secondary">Hạn SLA:</Text>{' '}
              <span className="text-red-500 font-medium">
                {activeTicket.slaDueDate || activeTicket.slaTime
                  ? dayjs(activeTicket.slaDueDate || activeTicket.slaTime).format('DD/MM/YYYY HH:mm')
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <Title level={5}>Nội dung</Title>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
            {activeTicket.description || 'Không có nội dung mô tả.'}
          </div>
        </div>

        {/* Sub-tasks Section */}
        {activeTicket.subtasks && activeTicket.subtasks.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📋 Phụ Trách & Giải Pháp Nội Bộ</span>
                <Tag color={activeTicket.completedSubtasksCount === activeTicket.totalSubtasksCount ? 'green' : 'blue'}>
                  {activeTicket.completedSubtasksCount || 0}/{activeTicket.totalSubtasksCount || 0} Hoàn thành
                </Tag>
              </div>
            </div>

            <div className="space-y-3">
              {activeTicket.subtasks.map((st: any) => {
                const isDone = st.status === 'RESOLVED';
                return (
                  <div
                    key={st.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Tag
                          color={
                            st.department === 'CV'
                              ? 'purple'
                              : st.department === 'CC'
                                ? 'cyan'
                                : st.department === 'BK'
                                  ? 'blue'
                                  : 'orange'
                          }
                          className="font-bold border-0"
                        >
                          {st.department}
                        </Tag>
                        <span className="text-xs text-slate-400">
                          Phụ trách: {st.assignedStaffName || 'Trưởng bộ phận'}
                        </span>
                      </div>
                      {isDone ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          Đã nộp giải pháp
                        </Tag>
                      ) : (
                        <Tag icon={<ClockCircleOutlined />} color="warning">
                          Chờ giải pháp
                        </Tag>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-2 space-y-1.5">
                      <div>{st.issueSummary}</div>

                      {/* Technical Issue Tags */}
                      {st.technicalIssueTags && st.technicalIssueTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 my-1">
                          {st.technicalIssueTags.map((tag: string) => {
                            const labelMap: Record<string, string> = {
                              EYE_STINGING: '👁️ Cay mắt/Đỏ',
                              FAST_SHEDDING: '⚡ Rụng mi nhanh',
                              EYELID_POKING: '📌 Cộm/Đâm mí',
                              GLUE_CLUMPING: '💧 Bết keo',
                              WRONG_STYLE: '📐 Sai dáng mi',
                              SERVICE_PAINFUL_TOO_LONG: '⌛ Thô bạo/Lâu',
                            };
                            return (
                              <Tag key={tag} color="volcano" className="text-[11px] font-medium border-0">
                                {labelMap[tag] || tag}
                              </Tag>
                            );
                          })}
                        </div>
                      )}

                      {/* 3-Day Warranty Badge & Inspection Appointment Status */}
                      {st.department === 'CV' && (
                        <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                          {st.isWithin3DayWarranty ? (
                            <Tag color="gold" className="font-semibold border-amber-400">
                              🛡️ Bảo Hành 3 Ngày (Kiểu Úc 0đ)
                            </Tag>
                          ) : (
                            <Tag color="default" className="text-slate-400">
                              ⚠️ Quá Hạn Bảo Hành 3 Ngày
                            </Tag>
                          )}
                          {st.inspectionAppointmentDate && (
                            <Tag color="cyan" className="font-medium">
                              📅 Hẹn đến Shop: {dayjs(st.inspectionAppointmentDate).format('DD/MM HH:mm')} (
                              {st.inspectionStoreName || 'Store'})
                            </Tag>
                          )}
                          {st.previousTechnicianName && (
                            <span className="text-slate-500">
                              KTV ca cũ:{' '}
                              <strong className="text-amber-600 dark:text-amber-400">
                                {st.previousTechnicianName}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isDone ? (
                      <div className="text-xs bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                        {st.inspectionResultNote && (
                          <div>
                            <strong className="text-emerald-800 dark:text-emerald-300">
                              🔍 Kết quả soi mi tại Shop:
                            </strong>{' '}
                            {st.inspectionResultNote}
                          </div>
                        )}
                        <div>
                          <strong className="text-emerald-800 dark:text-emerald-300">Hành động khắc phục:</strong>{' '}
                          {st.actionPlan}
                        </div>
                        {st.warrantyType && (
                          <div className="text-emerald-700 dark:text-emerald-400">
                            <strong>Phương án bảo hành:</strong>{' '}
                            {st.warrantyType === 'LOG_FREE'
                              ? '📋 Log (Tháo mi / Kiểm tra mi 0đ)'
                              : st.warrantyType === 'FIX_25M_FREE'
                                ? '🛠️ Fix (Sửa mi <=25p 0đ)'
                                : st.warrantyType === 'ADJUST_FREE'
                                  ? '📐 Adjust (Chỉnh dáng 0đ - Phạt CC)'
                                  : st.warrantyType === 'REPLACE_FULL_FREE'
                                    ? '🔄 Replace (Nối mới 100% 0đ)'
                                    : st.warrantyType}
                          </div>
                        )}
                        {st.replacementTechnicianName && (
                          <div>
                            <strong className="text-emerald-800 dark:text-emerald-300">KTV làm lại:</strong>{' '}
                            {st.replacementTechnicianName}
                          </div>
                        )}
                        {st.warrantyAppointmentDate && (
                          <div>
                            <strong className="text-emerald-800 dark:text-emerald-300">Hẹn bảo hành:</strong>{' '}
                            {dayjs(st.warrantyAppointmentDate).format('DD/MM/YYYY HH:mm')}
                          </div>
                        )}
                        {st.resolutionNote && (
                          <div>
                            <strong className="text-emerald-800 dark:text-emerald-300">Ghi chú:</strong>{' '}
                            {st.resolutionNote}
                          </div>
                        )}
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 pt-1">
                          Nộp bởi {st.resolvedByStaffName || 'Trưởng bộ phận'} lúc{' '}
                          {st.resolvedAt ? dayjs(st.resolvedAt).format('DD/MM HH:mm') : ''}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {st.department === 'CV' && (
                          <Button
                            size="small"
                            type="default"
                            icon={<ClockCircleOutlined />}
                            className="text-xs text-sky-600 dark:text-sky-400 border-sky-300 hover:border-sky-500"
                            onClick={() => {
                              setActiveSubtask(st);
                              scheduleForm.resetFields();
                              if (st.inspectionStoreName || st.inspectionAppointmentDate) {
                                scheduleForm.setFieldsValue({
                                  inspectionStoreName: st.inspectionStoreName || 'Store Đề Thám (Quận 1)',
                                  inspectionAppointmentDate: st.inspectionAppointmentDate
                                    ? dayjs(st.inspectionAppointmentDate)
                                    : dayjs().add(2, 'hour'),
                                });
                              } else {
                                scheduleForm.setFieldsValue({
                                  inspectionStoreName: 'Store Đề Thám (Quận 1)',
                                  inspectionAppointmentDate: dayjs().add(2, 'hour'),
                                });
                              }
                              setScheduleModalOpen(true);
                            }}
                          >
                            📅{' '}
                            {st.status === 'APPOINTMENT_SCHEDULED'
                              ? 'Sửa Lịch Hẹn Đón Khách'
                              : 'GĐ1: Đặt Lịch Hẹn Đến Shop 0đ'}
                          </Button>
                        )}
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          className="text-xs bg-emerald-600 hover:bg-emerald-700 border-none"
                          onClick={() => {
                            setActiveSubtask(st);
                            subtaskForm.resetFields();
                            if (st.department === 'CV') {
                              subtaskForm.setFieldsValue({
                                warrantyType: st.isWithin3DayWarranty ? 'FIX_25M_FREE' : 'FIX_25M_FREE',
                                inspectionResultNote: st.inspectionResultNote || '',
                              });
                            }
                            setSubtaskModalOpen(true);
                          }}
                        >
                          {st.department === 'CV'
                            ? '🔍 GĐ2: Soi Mi Tại Shop & Chốt Bảo Hành'
                            : `Nộp Giải Pháp Bộ Phận ${st.department}`}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <Title level={5}>Lịch sử trao đổi</Title>
          {commentsList.length > 0 ? (
            <Timeline
              items={commentsList.map((c: any, index: number) => {
                const isInternal = c.isInternal ?? c.internal ?? false;
                const author = c.userName || c.user || c.staffName || 'Hệ thống';
                const created = c.createdAt || c.time;
                return {
                  key: c.id || index,
                  color: isInternal ? 'gray' : 'blue',
                  children: (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{author}</span>
                        <span className="text-xs text-slate-400">
                          {created ? dayjs(created).format('DD/MM HH:mm') : ''}
                        </span>
                        {isInternal && (
                          <Tag color="default" className="ml-2 border-dashed">
                            Nội bộ
                          </Tag>
                        )}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{c.content}</div>
                    </div>
                  ),
                };
              })}
            />
          ) : (
            <div className="text-slate-400 text-sm italic">Chưa có bình luận/trao đổi nào</div>
          )}
        </div>

        {/* Action Area */}
        {activeTicket.status !== 'CLOSED' && activeTicket.status !== 'RESOLVED' && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {!isResolving ? (
              <Form form={commentForm} onFinish={handleAddComment} layout="vertical">
                <Form.Item name="content" rules={[{ required: true, message: 'Nhập nội dung trao đổi' }]}>
                  <TextArea rows={3} placeholder="Nhập trao đổi mới..." />
                </Form.Item>
                <div className="flex justify-between items-center">
                  <Form.Item name="isInternal" valuePropName="checked" noStyle>
                    <Checkbox>Ghi chú nội bộ</Checkbox>
                  </Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      Gửi
                    </Button>
                    <Button danger onClick={() => setIsResolving(true)}>
                      Đóng Ticket
                    </Button>
                  </Space>
                </div>
              </Form>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                <Title level={5} className="!text-amber-700 dark:!text-amber-500 mb-4">
                  Hoàn tất xử lý Ticket
                </Title>
                <Form form={resolveForm} onFinish={handleResolve} layout="vertical">
                  <Form.Item
                    name="actionPlan"
                    label="Hướng giải quyết"
                    rules={[{ required: true, message: 'Vui lòng nhập hướng giải quyết' }]}
                  >
                    <TextArea rows={2} placeholder="Mô tả hướng xử lý..." />
                  </Form.Item>
                  <Form.Item
                    name="resolutionNote"
                    label="Ghi chú kết quả"
                    rules={[{ required: true, message: 'Vui lòng nhập ghi chú kết quả' }]}
                  >
                    <TextArea rows={2} placeholder="Ghi chú kết quả sau khi xử lý..." />
                  </Form.Item>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setIsResolving(false)}>Hủy</Button>
                    <Button type="primary" danger htmlType="submit" loading={submitting}>
                      Xác nhận Đóng
                    </Button>
                  </div>
                </Form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Stage 1: CSKH Đặt Lịch Hẹn Khách Đến Shop Soi Mi */}
      <Modal
        title="📅 Giai Đoạn 1: CSKH Đặt Lịch Hẹn Đón Khách Đến Shop Soi Mi 0đ"
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form form={scheduleForm} layout="vertical" onFinish={handleScheduleInspectionSubmit} className="mt-4">
          <div className="text-xs text-slate-500 mb-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
            📌 Vấn đề: <strong>{activeSubtask?.issueSummary}</strong>
          </div>

          <Form.Item
            name="inspectionStoreName"
            label="Chi Nhánh Store Hẹn Khách Đến"
            rules={[{ required: true, message: 'Vui lòng chọn chi nhánh store' }]}
          >
            <Select
              options={[
                { label: '🏪 Store Đề Thám (Quận 1)', value: 'Store Đề Thám (Quận 1)' },
                { label: '🏪 Store Phan Xóm Lầu - PXL (Phú Nhuận)', value: 'Store Phan Xóm Lầu (PXL)' },
                { label: '🏪 Store Nguyễn Trãi (Quận 5)', value: 'Store Nguyễn Trãi (Quận 5)' },
                { label: '🏪 Store Thảo Điền (Quận 2)', value: 'Store Thảo Điền (Quận 2)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="inspectionAppointmentDate"
            label="Thời Gian Hẹn Đón Khách Đến Shop"
            rules={[{ required: true, message: 'Vui lòng chọn ngày giờ hẹn' }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder="Chọn ngày giờ hẹn đón khách"
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú dặn dò tiếp đón (Không bắt buộc)">
            <TextArea rows={2} placeholder="Nhập ghi chú cho Lễ Tân / Trưởng Tiệm tiếp đón..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button onClick={() => setScheduleModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={scheduling}>
              Xác Nhận Đặt Lịch Hẹn Đón Khách
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Stage 2: Trưởng KTV Soi Mi Tại Shop & Chốt Bảo Hành */}
      <Modal
        title={`🔍 Giai Đoạn 2: Soi Mi Tại Shop & Chốt Bảo Hành — Bộ Phận ${activeSubtask?.department || ''}`}
        open={subtaskModalOpen}
        onCancel={() => setSubtaskModalOpen(false)}
        footer={null}
        destroyOnClose
        width={550}
      >
        <Form form={subtaskForm} layout="vertical" onFinish={handleResolveSubtaskSubmit} className="mt-4">
          <div className="text-xs text-slate-500 mb-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1">
            <div>
              📌 Vấn đề: <strong>{activeSubtask?.issueSummary}</strong>
            </div>
            {activeSubtask?.department === 'CV' && activeSubtask?.previousTechnicianName && (
              <div className="text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ KTV ca cũ: {activeSubtask.previousTechnicianName}
              </div>
            )}
          </div>

          {/* FAL Warranty Options for CV department */}
          {activeSubtask?.department === 'CV' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-4 space-y-3">
              <Form.Item
                name="inspectionResultNote"
                label={
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    🔍 Kết Quả Soi Mi Trực Tiếp Tại Shop
                  </span>
                }
                rules={[{ required: true, message: 'Vui lòng nhập kết quả soi mi trực tiếp' }]}
                className="!mb-2"
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
                className="!mb-1"
              >
                <Select
                  allowClear
                  placeholder="Tự động chốt theo dịch vụ thực tế (hoặc chọn trước nếu có)"
                  options={[
                    {
                      label: '🛠️ FIX (Sửa mi <= 25p 0đ) — Phạt KTV cũ, KTV mới có Banana <=25p',
                      value: 'FIX_25M_FREE',
                    },
                    { label: '📐 ADJUST (Chỉnh dáng 0đ) — Phạt CC cũ, KHÔNG phạt KTV (CV)', value: 'ADJUST_FREE' },
                    {
                      label: '📋 LOG (Tháo mi / Kiểm tra mi 0đ) — KTV mới có Banana, KHÔNG phạt ca cũ',
                      value: 'LOG_FREE',
                    },
                    { label: '🔄 REPLACE (Nối lại bộ mới 100% 0đ) — Phạt KTV cũ', value: 'REPLACE_FULL_FREE' },
                  ]}
                />
              </Form.Item>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 italic">
                💡 <strong>Hệ thống Legacy tự động chốt:</strong> Quy tắc thưởng/phạt (Fix, Adjust, Log, Replace) sẽ
                được hệ thống Legacy tự động tính toán dựa trên loại dịch vụ thực tế tạo trên đơn hàng tại Tiệm.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Form.Item name="replacementTechnicianId" label="KTV Mới Thay Thế (Tay nghề cao)" className="!mb-0">
                  <Select
                    showSearch
                    placeholder="Chọn KTV làm lại tại tiệm"
                    allowClear
                    filterOption={(input, option) => {
                      const staff = staffList.find((s: any) => Number(s.id) === Number(option?.value));
                      if (!staff) return false;
                      const name = staff.displayName || staff.name || '';
                      return normalizeText(name).includes(normalizeText(input));
                    }}
                    options={staffList
                      .filter((s: any) => Number(s.id) !== Number(activeSubtask?.previousTechnicianId))
                      .map((s: any) => ({
                        value: Number(s.id),
                        label: `${s.displayName || s.name} (${s.role || 'KTV'})`,
                      }))}
                  />
                </Form.Item>

                <Form.Item name="warrantyAppointmentDate" label="Hẹn Bảo Hành Làm Lại" className="!mb-0">
                  <DatePicker
                    showTime
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder="Chọn ngày giờ làm mi"
                  />
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
            <Button onClick={() => setSubtaskModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={resolvingSubtask}>
              Nộp Giải Pháp & Đóng Subtask
            </Button>
          </div>
        </Form>
      </Modal>
    </Drawer>
  );
}
