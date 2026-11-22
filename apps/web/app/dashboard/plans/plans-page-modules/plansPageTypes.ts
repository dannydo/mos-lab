import type { BucketType } from '@mos-lab/shared';

export interface SuggestedCustomer {
  id: number;
  name: string;
  phone: string;
  lastVisit?: string | null;
  daysSinceLastVisit: number | null;
  bucket?: BucketType;
  normalCount?: number | null;
  retainCount?: number | null;
  expiryDate?: string | null;
}

export type SuggestionCategoryKey =
  'happyCall' | 'single21d' | 'combo25d' | 'singleLost' | 'campaignComboT7' | 'campaignPromo2' | 'myCustomers';

export interface PlansSuggestionsState {
  happyCall: SuggestedCustomer[];
  single21d: SuggestedCustomer[];
  combo25d: SuggestedCustomer[];
  singleLost: SuggestedCustomer[];
  campaignComboT7: SuggestedCustomer[];
  campaignPromo2: SuggestedCustomer[];
  myCustomers?: SuggestedCustomer[];
}

export interface SuggestionGroupDefinition {
  key: SuggestionCategoryKey;
  title: string;
  tip: string;
}

export interface SuggestionTabDefinition {
  key: string;
  label: string;
  groups: SuggestionGroupDefinition[];
}

export type CustomerDelayStatus =
  | { kind: 'callback'; formattedDate: string }
  | { kind: 'booked'; formattedDate: string }
  | { kind: 'missed'; missedDays: number }
  | { kind: 'normal' };
