import type { Dayjs } from 'dayjs';

export interface TicketStaffMember {
  id: number;
  displayName?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export interface TicketCommentItem {
  id?: number;
  ticketId?: number;
  staffId?: number;
  staffName?: string;
  userName?: string;
  user?: string;
  content: string;
  isInternal?: boolean;
  internal?: boolean;
  createdAt?: string;
  time?: string;
}

export interface TicketSubtaskItem {
  id: number;
  ticketId?: number;
  department: string;
  assignedStaffId?: number | null;
  assignedStaffName?: string | null;
  status: string;
  issueSummary?: string | null;
  resolutionNote?: string | null;
  actionPlan?: string | null;
  technicalIssueTags?: string[];
  warrantyType?: string;
  isWithin3DayWarranty?: boolean;
  previousTechnicianId?: number | null;
  previousTechnicianName?: string | null;
  replacementTechnicianId?: number | null;
  replacementTechnicianName?: string | null;
  warrantyAppointmentDate?: string | null;
  nextFalOrderServiceId?: number | null;
  inspectionStoreName?: string | null;
  inspectionAppointmentDate?: string | null;
  inspectionResultNote?: string | null;
  resolvedAt?: string | null;
  resolvedByStaffId?: number | null;
  resolvedByStaffName?: string | null;
  createdAt?: string;
}

export interface TicketDetailRecord {
  id?: number | null;
  ticketCode?: string;
  code?: string;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  type?: string;
  priority?: string;
  status?: string;
  department?: string;
  createdAt?: string;
  slaDueDate?: string;
  slaTime?: string;
  assignedCsStaffId?: number | null;
  assignedCsStaffName?: string;
  description?: string;
  comments?: TicketCommentItem[];
  subtasks?: TicketSubtaskItem[];
  completedSubtasksCount?: number;
  totalSubtasksCount?: number;
}

export interface TicketDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  ticketId: number | null;
  ticket?: TicketDetailRecord | null;
  onSuccess?: () => void;
}

export interface CommentFormValues {
  content: string;
  isInternal?: boolean;
}

export interface ResolveTicketFormValues {
  actionPlan: string;
  resolutionNote: string;
}

export interface ScheduleInspectionFormValues {
  inspectionStoreName: string;
  inspectionAppointmentDate?: Dayjs | null;
  note?: string;
}

export interface ResolveSubtaskFormValues {
  actionPlan: string;
  resolutionNote?: string;
  warrantyType?: string;
  replacementTechnicianId?: number | string;
  warrantyAppointmentDate?: Dayjs | null;
  inspectionResultNote?: string;
}
