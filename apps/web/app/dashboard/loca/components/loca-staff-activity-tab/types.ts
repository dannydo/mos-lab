import type dayjs from 'dayjs';
import type { LocaStaffActivityLogItem, LocaStaffActivityStats, Staff } from '@mos-lab/shared';

export type LocaActivityViewMode = 'month' | 'week' | 'day';

export interface LocaStaffActivityTabProps {
  staffList: Staff[];
  selectedStaffId: string;
  onSelectStaff: (staffId: string) => void;
  viewMode: LocaActivityViewMode;
  onViewModeChange: (mode: LocaActivityViewMode) => void;
  referenceDate: dayjs.Dayjs;
  onNavigateDate: (direction: number) => void;
  onReferenceDateChange: (date: dayjs.Dayjs) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  actionTypeFilter: string;
  onActionTypeChange: (val: string) => void;
  selectedTouchpointKey?: string;
  onTouchpointKeyChange?: (key: string) => void;
  stats: LocaStaffActivityStats | null;
  logs: LocaStaffActivityLogItem[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenCustomerDetail: (customerId: number) => void;
}

export interface TouchpointChipConfig {
  key: string;
  label: string;
  textColorClass: string;
}

export interface SelectOptionItem {
  value: string;
  label: string;
}
