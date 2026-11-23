'use client';

import React from 'react';
import { AdaptiveDrawer } from '~/components/ui';
import { ResolveSubtaskModal } from './ticket-detail-drawer/ResolveSubtaskModal';
import { ScheduleInspectionModal } from './ticket-detail-drawer/ScheduleInspectionModal';
import { TicketActionSection } from './ticket-detail-drawer/TicketActionSection';
import { TicketCommentsTimeline } from './ticket-detail-drawer/TicketCommentsTimeline';
import { TicketCustomerCard } from './ticket-detail-drawer/TicketCustomerCard';
import { TicketPriorityTag } from './ticket-detail-drawer/TicketPriorityTag';
import { TicketSubtasksSection } from './ticket-detail-drawer/TicketSubtasksSection';
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
} from './ticket-detail-drawer/types';
import { useTicketDetailDrawer } from './ticket-detail-drawer/useTicketDetailDrawer';

export type {
  CommentFormValues,
  ResolveSubtaskFormValues,
  ResolveTicketFormValues,
  ScheduleInspectionFormValues,
  TicketCommentItem,
  TicketDetailDrawerProps,
  TicketDetailRecord,
  TicketStaffMember,
  TicketSubtaskItem,
};

export default function TicketDetailDrawer({ open, onClose, ticketId, ticket, onSuccess }: TicketDetailDrawerProps) {
  const {
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
  } = useTicketDetailDrawer({ open, onClose, ticketId, ticket, onSuccess });

  return (
    <AdaptiveDrawer
      title={
        <div className="flex items-center justify-between gap-2 pr-2">
          <span>Chi tiết Ticket {activeTicket.ticketCode || activeTicket.code}</span>
          <TicketPriorityTag priority={activeTicket.priority} />
        </div>
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      intent="detail"
    >
      <div className="flex flex-col gap-6">
        <TicketCustomerCard
          activeTicket={activeTicket}
          staffList={staffList}
          changingAssignee={changingAssignee}
          onAssigneeChange={handleAssigneeChange}
        />

        <TicketSubtasksSection
          activeTicket={activeTicket}
          onOpenScheduleModal={openScheduleModal}
          onOpenSubtaskModal={openSubtaskModal}
        />

        <TicketCommentsTimeline comments={commentsList} />

        <TicketActionSection
          status={activeTicket.status}
          isResolving={isResolving}
          submitting={submitting}
          commentForm={commentForm}
          resolveForm={resolveForm}
          onStartResolve={() => setIsResolving(true)}
          onCancelResolve={() => setIsResolving(false)}
          onAddComment={handleAddComment}
          onResolve={handleResolve}
        />
      </div>

      <ScheduleInspectionModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        form={scheduleForm}
        activeSubtask={activeSubtask}
        scheduling={scheduling}
        onSubmit={handleScheduleInspectionSubmit}
      />

      <ResolveSubtaskModal
        open={subtaskModalOpen}
        onClose={() => setSubtaskModalOpen(false)}
        form={subtaskForm}
        activeSubtask={activeSubtask}
        staffList={staffList}
        resolving={resolvingSubtask}
        onSubmit={handleResolveSubtaskSubmit}
      />
    </AdaptiveDrawer>
  );
}
