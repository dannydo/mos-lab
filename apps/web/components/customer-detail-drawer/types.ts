export interface CustomerDetailDrawerProps {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  onUpdate?: () => void;
  zIndex?: number;
}

export interface CustomerDetailCurrentUser {
  role?: string;
  [key: string]: SafeAny;
}

export interface RescheduleAlertState {
  open: boolean;
  type: 'error' | 'warning';
  title: string;
  content: string;
}
