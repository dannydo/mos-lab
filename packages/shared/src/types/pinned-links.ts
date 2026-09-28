export interface PinnedLinkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  isExternal?: boolean;
  sortOrder: number;
  createdAt?: string;
  menuKey?: string;
}

export interface UserPinnedLinksResponse {
  success: boolean;
  data: PinnedLinkItem[];
}
