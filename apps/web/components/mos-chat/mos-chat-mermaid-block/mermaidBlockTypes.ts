export type MermaidViewMode = 'diagram' | 'code';

export interface SvgDimensions {
  width: number;
  height: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export interface MosChatMermaidBlockProps {
  code: string;
  isDark?: boolean;
}
