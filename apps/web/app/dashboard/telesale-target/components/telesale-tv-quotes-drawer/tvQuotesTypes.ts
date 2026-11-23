import type { TelesaleTvPersonaKey, TelesaleTvQuoteEventType } from '@mos-lab/shared';

export interface TelesaleTvQuotesDrawerProps {
  open: boolean;
  onClose: () => void;
  zIndex?: number;
  getContainer?: string | HTMLElement | (() => HTMLElement) | false;
}

export interface TvQuoteEventConfig {
  label: string;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
}

export interface TvPersonaOption {
  key: TelesaleTvPersonaKey;
  label: string;
  icon: string;
  voice: string;
  rate: string;
  pitch: string;
}

export interface TvQuoteVariableTag {
  tag: string;
  label: string;
  desc: string;
}

export interface TvQuoteFormValues {
  personaKey: TelesaleTvPersonaKey;
  eventType: TelesaleTvQuoteEventType;
  template: string;
  isActive: boolean;
}

export interface TvTemplateSegment {
  text: string;
  isVariable: boolean;
}
