import { BucketType } from './customer';

export type PlanStatus = 'PLANNED' | 'CALLED' | 'DONE';

export interface DailyPlan {
  id: number;
  legacyUserId: number;
  staffId: number;
  plannedDate: string; // YYYY-MM-DD
  bucket: BucketType;
  priority: number;
  status: PlanStatus;
  createdAt: string;

  // Joined relation fields for UI
  customerName?: string;
  customerPhone?: string;
}

export interface CreatePlanRequest {
  legacyUserId: number;
  plannedDate: string;
  bucket: BucketType;
  priority?: number;
}
