import dayjs from 'dayjs';
import { removeVietnameseTones } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import {
  DEFAULT_INSPECTION_STORE,
  DEPARTMENT_STATUS_MAP,
  PRIORITY_STATUS_MAP,
  WARRANTY_TYPE_SUMMARY_LABELS,
} from './constants';
import type { TicketDetailRecord, TicketSubtaskItem } from './types';

export function normalizeTicketSearchText(value: string): string {
  return removeVietnameseTones(value);
}

export function buildActiveTicket(
  localTicket: TicketDetailRecord | null,
  ticket: TicketDetailRecord | null | undefined,
  ticketId: number | null
): TicketDetailRecord {
  if (localTicket) return localTicket;
  if (ticket) return ticket;

  const nowIso = new Date().toISOString();
  return {
    id: ticketId,
    ticketCode: ticketId ? `TK-${String(ticketId).padStart(4, '0')}` : '',
    customerName: 'Khách hàng',
    customerPhone: '',
    type: 'COMPLAINT',
    priority: 'MEDIUM',
    status: 'OPEN',
    department: 'CSKH',
    createdAt: nowIso,
    slaDueDate: nowIso,
    assignedCsStaffName: '',
    description: '',
    comments: [],
  };
}

export function getPriorityTagMeta(priority?: string): { status: StatusType; label: string } {
  if (priority && PRIORITY_STATUS_MAP[priority]) {
    return PRIORITY_STATUS_MAP[priority];
  }
  return { status: 'default', label: priority ?? '' };
}

export function getDepartmentTagStatus(department?: string): StatusType {
  if (department && DEPARTMENT_STATUS_MAP[department]) {
    return DEPARTMENT_STATUS_MAP[department];
  }
  return 'orange';
}

export function getWarrantyTypeSummaryLabel(warrantyType: string): string {
  return WARRANTY_TYPE_SUMMARY_LABELS[warrantyType] || warrantyType;
}

export function getScheduleModalInitialValues(subtask: TicketSubtaskItem) {
  return {
    inspectionStoreName: subtask.inspectionStoreName || DEFAULT_INSPECTION_STORE,
    inspectionAppointmentDate: subtask.inspectionAppointmentDate
      ? dayjs(subtask.inspectionAppointmentDate)
      : dayjs().add(2, 'hour'),
  };
}

export function getResolveSubtaskInitialValues(subtask: TicketSubtaskItem) {
  if (subtask.department !== 'CV') {
    return undefined;
  }
  return {
    warrantyType: 'FIX_25M_FREE',
    inspectionResultNote: subtask.inspectionResultNote || '',
  };
}
