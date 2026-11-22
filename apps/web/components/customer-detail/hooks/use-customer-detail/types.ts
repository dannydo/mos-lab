export interface UseCustomerDetailProps {
  open: boolean;
  customerId: number | null;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  onUpdate?: () => void;
  editForm: SafeAny;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export interface CustomerTabDataEntry {
  items: SafeAny[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  loading: boolean;
}

export type CustomerTabDataMap = Record<string, CustomerTabDataEntry>;

export interface CustomerCounts {
  bookingCount: number;
  noteCount: number;
  callCount: number;
  timelineCount: number;
}

export type ResizeDirection = 'left' | 'right';

export interface DragStartInfo {
  x: number;
  width: number;
  direction: ResizeDirection;
}

export interface ComboDisplayInfo {
  displayName: string;
  totalNew: number;
  totalRefill: number;
  total: number | null;
}
