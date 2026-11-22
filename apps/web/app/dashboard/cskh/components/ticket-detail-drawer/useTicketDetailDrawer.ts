'use client';

import { useEffect, useState } from 'react';
import { Form, message } from 'antd';
import { apiClient } from '~/lib/api-client';
import { buildActiveTicket, getResolveSubtaskInitialValues, getScheduleModalInitialValues } from './helpers';
import type {
  CommentFormValues,
  ResolveSubtaskFormValues,
  ResolveTicketFormValues,
  ScheduleInspectionFormValues,
  TicketCommentItem,
  TicketDetailDrawerProps,
  TicketDetailRecord,
  TicketStaffMember,
  TicketSubtaskItem,
} from './types';

function extractErrorMessage(err: unknown, fallback: string): string {
  const responseMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMsg || fallback;
}

export function useTicketDetailDrawer({ open, onClose, ticketId, ticket, onSuccess }: TicketDetailDrawerProps) {
  const [commentForm] = Form.useForm<CommentFormValues>();
  const [resolveForm] = Form.useForm<ResolveTicketFormValues>();
  const [subtaskForm] = Form.useForm<ResolveSubtaskFormValues>();
  const [scheduleForm] = Form.useForm<ScheduleInspectionFormValues>();

  const [isResolving, setIsResolving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<TicketStaffMember[]>([]);
  const [changingAssignee, setChangingAssignee] = useState(false);

  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [activeSubtask, setActiveSubtask] = useState<TicketSubtaskItem | null>(null);
  const [resolvingSubtask, setResolvingSubtask] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const [localTicket, setLocalTicket] = useState<TicketDetailRecord | null>(ticket || null);

  useEffect(() => {
    if (open) {
      apiClient.customers
        .getStaff()
        .then((res) => {
          const list = Array.isArray(res) ? res : (res as { data?: TicketStaffMember[] })?.data || [];
          setStaffList(list as TicketStaffMember[]);
        })
        .catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    setLocalTicket(ticket || null);
  }, [ticket]);

  const activeTicket = buildActiveTicket(localTicket, ticket, ticketId);
  const commentsList: TicketCommentItem[] = activeTicket.comments || [];

  const handleScheduleInspectionSubmit = async (values: ScheduleInspectionFormValues) => {
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
    } catch (err: unknown) {
      console.error('Error scheduling shop inspection:', err);
      message.error(extractErrorMessage(err, 'Không thể đặt lịch hẹn đến Shop'));
    } finally {
      setScheduling(false);
    }
  };

  const handleResolveSubtaskSubmit = async (values: ResolveSubtaskFormValues) => {
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
    } catch (err: unknown) {
      console.error('Error resolving subtask:', err);
      message.error(extractErrorMessage(err, 'Lỗi khi nộp giải pháp'));
    } finally {
      setResolvingSubtask(false);
    }
  };

  const handleAddComment = async (values: CommentFormValues) => {
    const targetId = activeTicket.id || ticketId;
    if (!targetId) {
      message.error('Không tìm thấy thông tin Ticket');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.cs.addTicketComment(targetId, {
        content: values.content,
        isInternal: values.isInternal || false,
      });
      message.success('Đã thêm trao đổi');
      commentForm.resetFields();
      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      console.error('Error adding ticket comment:', error);
      message.error(extractErrorMessage(error, 'Có lỗi xảy ra khi thêm trao đổi'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (values: ResolveTicketFormValues) => {
    const targetId = activeTicket.id || ticketId;
    if (!targetId) {
      message.error('Không tìm thấy thông tin Ticket');
      return;
    }

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
    } catch (error: unknown) {
      console.error('Error resolving ticket:', error);
      message.error(extractErrorMessage(error, 'Có lỗi xảy ra khi đóng Ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssigneeChange = async (newStaffId: number) => {
    const targetTicketId = activeTicket.id;
    if (!targetTicketId) return;
    setChangingAssignee(true);
    try {
      const staffIdNum = Number(newStaffId);
      const selectedStaff = staffList.find((s) => Number(s.id) === staffIdNum);
      const staffName = selectedStaff?.displayName || selectedStaff?.name || `NV #${staffIdNum}`;

      await apiClient.cs.updateTicket(targetTicketId, {
        assignedCsStaffId: staffIdNum,
      });

      const newComment: TicketCommentItem = {
        id: Date.now(),
        ticketId: targetTicketId,
        staffId: staffIdNum,
        staffName,
        content: `🔄 Đã chuyển giao Ticket cho nhân sự phụ trách mới: ${staffName}`,
        isInternal: true,
        createdAt: new Date().toISOString(),
      };

      await apiClient.cs.addTicketComment(targetTicketId, {
        content: newComment.content,
        isInternal: true,
      });

      setLocalTicket((prev) => {
        const base = prev || activeTicket;
        return {
          ...base,
          assignedCsStaffId: staffIdNum,
          assignedCsStaffName: staffName,
          comments: [...(base.comments || []), newComment],
        };
      });

      message.success(`Đã chuyển giao Ticket cho ${staffName}`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      console.error('Error changing ticket assignee:', err);
      message.error(extractErrorMessage(err, 'Không thể đổi người phụ trách'));
    } finally {
      setChangingAssignee(false);
    }
  };

  const openScheduleModal = (subtask: TicketSubtaskItem) => {
    setActiveSubtask(subtask);
    scheduleForm.resetFields();
    scheduleForm.setFieldsValue(getScheduleModalInitialValues(subtask));
    setScheduleModalOpen(true);
  };

  const openSubtaskModal = (subtask: TicketSubtaskItem) => {
    setActiveSubtask(subtask);
    subtaskForm.resetFields();
    const initialValues = getResolveSubtaskInitialValues(subtask);
    if (initialValues) {
      subtaskForm.setFieldsValue(initialValues);
    }
    setSubtaskModalOpen(true);
  };

  return {
    commentForm,
    resolveForm,
    subtaskForm,
    scheduleForm,
    isResolving,
    setIsResolving,
    submitting,
    staffList,
    changingAssignee,
    subtaskModalOpen,
    setSubtaskModalOpen,
    activeSubtask,
    resolvingSubtask,
    scheduleModalOpen,
    setScheduleModalOpen,
    scheduling,
    activeTicket,
    commentsList,
    handleScheduleInspectionSubmit,
    handleResolveSubtaskSubmit,
    handleAddComment,
    handleResolve,
    handleAssigneeChange,
    openScheduleModal,
    openSubtaskModal,
  };
}
