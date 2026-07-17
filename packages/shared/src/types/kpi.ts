export interface StaffKPI {
  id: number;
  staffId: number;
  kpiDate: string; // YYYY-MM-DD
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalRenewed: number;

  // Joined relation fields
  staffName?: string;
}

export interface KPISummary {
  totalPlanned: number;
  totalCalled: number;
  totalAnswered: number;
  totalBooked: number;
  totalRenewed: number;
  conversionRate: number; // conversion from answered/called to booked/renewed
}
