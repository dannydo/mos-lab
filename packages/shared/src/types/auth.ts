export type UserRole = 'telesales' | 'manager' | 'admin' | 'oc' | 'cc' | 'ls';

export interface Staff {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  // HR System Extensions
  email?: string | null;
  phone?: string | null;
  joinedAt?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  legacyStaffId?: number | null;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
}

export interface LoginRequest {
  username?: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: Staff;
}

export interface AuthState {
  token: string | null;
  user: Staff | null;
}
