export interface TelesaleTvJournalStaffOption {
  legacyStaffId: number;
  name: string;
}

export interface TelesaleTvJournalModalProps {
  open: boolean;
  onClose: () => void;
  staffList?: TelesaleTvJournalStaffOption[];
  zIndex?: number;
  initialDate?: string;
}

export type TvJournalTypeFilter = 'ALL' | 'BOOK' | 'DONE' | 'MILESTONE';
export type TvJournalStatusFilter = 'ALL' | 'SUCCESS' | 'ERROR';

export interface TvJournalFilters {
  staffFilter: string;
  typeFilter: TvJournalTypeFilter;
  statusFilter: TvJournalStatusFilter;
}
