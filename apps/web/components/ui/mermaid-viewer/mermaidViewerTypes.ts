export type CommentCategory = 'training' | 'operations' | 'technical';

export interface NodeComment {
  id: string;
  author: string;
  role: string;
  category: CommentCategory;
  content: string;
  createdAt: string;
}

export interface SelectedMermaidNode {
  id: string;
  rawId: string;
  title: string;
}

export interface AvailableMermaidNode {
  id: string;
  title: string;
}

export interface PanPosition {
  x: number;
  y: number;
}

export interface MermaidViewerProps {
  chart: string;
  title?: string;
  height?: string | number;
  showToolbar?: boolean;
  diagramId?: string;
}
