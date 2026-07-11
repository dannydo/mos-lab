export type BucketType = 'COMBO_LIVE' | 'COMBO_DEAD' | 'SINGLE';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  dob: string | null;
  lastVisit: string | null; // ISO Date String
  daysSinceLastVisit: number | null;
  totalSpent: number;
  totalVisits: number;
  bucket: BucketType;
  totalPromotionsUsed?: number;
  totalReferrals?: number;
  avatar?: string | null;
  
  // Specific combo info if available
  comboBalance?: {
    normalCount: number;
    retainCount: number;
    expiryDate: string | null;
  } | null;
  assignedStaff?: {
    id: number;
    displayName: string;
    username: string;
  } | null;
}

export interface CustomerStats {
  total: number;
  comboLive: number;
  comboDead: number;
  single: number;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  hasCall: boolean;
  callOutcome?: string | null;
  callResult?: string | null;
  note?: string | null;
  hasCheckin: boolean;
  orderId?: number | null;
}

export interface CustomerWeeklyProgress {
  customer: Customer;
  dailyActivities: DailyActivity[];
  isConfirmed: boolean;
  confirmTime?: string | null;
  planId?: number | null;
}
