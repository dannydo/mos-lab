export type NewDmDeptFilter = 'ALL' | 'CV' | 'CC' | 'TELESALES' | 'ADMIN';

export interface MosChatMobileInboxProps {
  onOpenSearchSheet?: (initialQuery?: string) => void;
  newDmModalOpen?: boolean;
  onNewDmModalOpenChange?: (open: boolean) => void;
}

export interface InboxFilterChip {
  id: 'all' | 'unread' | 'spaces';
  label: string;
}

export interface DeptFilterChip {
  id: NewDmDeptFilter;
  label: string;
}
