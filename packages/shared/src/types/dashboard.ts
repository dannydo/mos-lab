/**
 * Read-only operational snapshot returned by GET /api/dashboard/today.
 *
 * The response intentionally contains the source rows that the Today view
 * needs; consumers should not recreate order, attendance, or revenue rules.
 */
export type DashboardStaffShift = 'sáng' | 'chiều' | 'full' | 'off';
export type DashboardAttendance = 'none' | 'checked_in' | 'checked_out' | 'late';

export interface DashboardBooking {
  key: string;
  customerId?: number;
  customer?: string;
  phone?: string;
  booker?: string;
  status?: string;
  category?: string;
}

export interface DashboardConsultantSnapshot {
  id?: number;
  name: string;
  doing: string;
  clients: number;
  combos: number;
  revenue: number;
  revLe?: number;
  revCombo?: number;
  revProduct?: number;
  netRevenue?: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  shift: DashboardStaffShift;
  attendance: DashboardAttendance;
}

export interface DashboardTechnicianSnapshot {
  id?: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  doing: string;
  clients: number;
  bookedCount?: number;
  doneCount?: number;
  shift: DashboardStaffShift;
  attendance: DashboardAttendance;
  status: 'busy' | 'available';
  isOff?: boolean;
  offReason?: string;
  offType?: string;
}

export interface DashboardComingSnapshot {
  key: string;
  customerId?: number;
  time: string;
  customer?: string;
  phone?: string;
  cc?: string;
  cv?: string;
  service?: string;
  status?: string;
}

export interface DashboardBranchSnapshot {
  revLe: number;
  revCombo: number;
  revProduct: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  cc: DashboardConsultantSnapshot[];
  cv: DashboardTechnicianSnapshot[];
  coming: DashboardComingSnapshot[];
}

export interface DashboardTodayResponse {
  branchesData: Record<string, DashboardBranchSnapshot>;
  bookingsCombo: DashboardBooking[];
  bookingsOc: DashboardBooking[];
  bookingsOther: DashboardBooking[];
}
