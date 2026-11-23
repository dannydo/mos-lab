import type { ParsedGoogleWorkspaceLink } from '@mos-lab/shared';

export interface MosChatGoogleWorkspaceCardProps {
  link: ParsedGoogleWorkspaceLink;
  conversationId?: string;
  messageId?: string;
  isDark: boolean;
  isMe?: boolean;
  compact?: boolean;
}

export interface MosChatGoogleWorkspaceCardListProps {
  text?: string | null;
  conversationId?: string;
  messageId?: string;
  isDark: boolean;
  isMe?: boolean;
  compact?: boolean;
}

export interface WorkspacePreviewGridRow {
  rowNumber: number;
  cells: string[];
}

export interface WorkspacePreviewGrid {
  colStart: number;
  colHeaders: string[];
  rows: WorkspacePreviewGridRow[];
}

export interface WorkspaceCardTheme {
  cardContainerClass: string;
  headerBarClass: string;
  iconWrapperClass: string;
  primaryButtonClass: string;
  headingChipClass: string;
}
