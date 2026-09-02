export const MOS_BIBLE_COMMANDMENT_STATUSES = ['ACTIVE', 'REVISED', 'RETIRED'] as const;
export type MosBibleCommandmentStatus = (typeof MOS_BIBLE_COMMANDMENT_STATUSES)[number];

export const MOS_BIBLE_BOOK_KEYS = [
  'GOVERNANCE',
  'BOOKING',
  'SERVICE',
  'REWARDS',
  'CUSTOMER',
  'PEOPLE',
  'CATALOG',
  'SYSTEM',
] as const;
export type MosBibleBookKey = (typeof MOS_BIBLE_BOOK_KEYS)[number];

export interface MosBibleBook {
  key: MosBibleBookKey;
  label: string;
  description: string;
}

export interface MosBibleSourceReference {
  label: string;
  /** Repository path, ticket key, commit or other auditable reference. */
  reference: string;
}

export interface MosBibleCommandment {
  id: string;
  book: MosBibleBookKey;
  title: string;
  summary: string;
  commandments: readonly string[];
  rationale: string;
  examples?: readonly string[];
  exceptions?: readonly string[];
  tags: readonly string[];
  /** Route prefixes where this commandment should be suggested contextually. */
  routeScopes: readonly string[];
  status: MosBibleCommandmentStatus;
  version: string;
  effectiveFrom: string;
  sources: readonly MosBibleSourceReference[];
}
