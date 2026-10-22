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
  /** Optional interactive component key for visual explainer / calculator */
  interactiveComponent?: string;
  sources: readonly MosBibleSourceReference[];
}

export type MosBibleProposalTier = 'DANNY_FINAL' | 'CORE_TEAM';

export type MosBibleProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MosBibleProposal {
  id: string;
  proposedByStaffId: number;
  proposedByName: string;
  proposedByRole: string;
  tier: MosBibleProposalTier;
  book: MosBibleBookKey;
  title: string;
  summary: string;
  commandments: readonly string[];
  rationale: string;
  examples?: readonly string[];
  tags: readonly string[];
  status: MosBibleProposalStatus;
  reviewedByStaffId?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MosBibleQuizOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface MosBibleQuizQuestion {
  id: string;
  commandmentId: string;
  title: string;
  scenario: string;
  options: readonly MosBibleQuizOption[];
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  culturalKey: 'Vui Vẻ' | 'Ân Cần' | 'Chân Thành' | 'Khoa Học';
  rewardPoints: number;
}

export interface MosBibleQuizSubmissionResult {
  questionId: string;
  selectedKey: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  culturalKey: 'Vui Vẻ' | 'Ân Cần' | 'Chân Thành' | 'Khoa Học';
  earnedPoints: number;
}

export interface MosBibleSpeedQuizProfile {
  staffId: number;
  date: string;
  attemptsToday: number;
  maxAttemptsPerDay: number;
  bananasToday: number;
  maxBananasPerDay: number;
  totalBananas: number;
  canPlayToday: boolean;
  streakBest: number;
}

export interface MosBibleSpeedQuizAnswerItem {
  questionId: string;
  selectedKey: 'A' | 'B' | 'C' | 'D';
  durationMs: number;
}

export interface MosBibleSpeedQuizSubmissionRequest {
  answers: MosBibleSpeedQuizAnswerItem[];
}

export interface MosBibleSpeedQuizResult {
  streak: number;
  correctCount: number;
  totalAnswered: number;
  bananasEarned: number;
  profile: MosBibleSpeedQuizProfile;
  message: string;
}
