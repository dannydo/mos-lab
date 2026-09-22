export type BkGameType = 'INDIVIDUAL' | 'TEAM';

export type BkGameMetricType = 'BOOKINGS' | 'CALLS' | 'PICKUPS' | 'DONE' | 'COMPOSITE';

export type BkGameStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type BkGameWinnerCriteria = 'TOP_1' | 'TOP_3' | 'REACH_TARGET' | 'HIGHEST_SCORE';

export type BkGameParticipantStatus = 'ACTIVE' | 'WON' | 'LOST' | 'DISQUALIFIED';

export interface BkGameParticipant {
  id: number;
  gameId: number;
  staffId: number;
  staffName: string;
  avatar?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  betAmount: number;
  score: number;
  rank?: number | null;
  rewardAmount: number;
  penaltyNote?: string | null;
  status: BkGameParticipantStatus;
  targetProgressPercent?: number;
}

export interface BkGameTeam {
  id: number;
  gameId: number;
  teamName: string;
  color?: string | null;
  score: number;
  rank?: number | null;
  participants?: BkGameParticipant[];
}

export interface BkGame {
  id: number;
  title: string;
  description?: string | null;
  gameType: BkGameType;
  metricType: BkGameMetricType;
  targetScore?: number | null;
  startDate: string;
  endDate: string;
  status: BkGameStatus;
  entryFee: number;
  rewardPool: number;
  rewardDescription?: string | null;
  penaltyDescription?: string | null;
  winnerCriteria: BkGameWinnerCriteria;
  announcedResults?: string | null;
  createdByStaffId: number;
  createdAt: string;
  updatedAt: string;
  participants?: BkGameParticipant[];
  teams?: BkGameTeam[];
}

export interface BkGameCreateInput {
  title: string;
  description?: string;
  gameType: BkGameType;
  metricType: BkGameMetricType;
  targetScore?: number;
  startDate: string;
  endDate: string;
  entryFee?: number;
  rewardPool?: number;
  rewardDescription?: string;
  penaltyDescription?: string;
  winnerCriteria?: BkGameWinnerCriteria;
  participantIds?: number[];
  teams?: { teamName: string; color?: string; staffIds: number[] }[];
}

export interface BkGameFinalizeInput {
  winners?: { participantId?: number; teamId?: number; rank: number; rewardAmount: number }[];
  penalties?: { participantId?: number; teamId?: number; penaltyNote: string }[];
  notes?: string;
}

export interface BkGameListResponse {
  games: BkGame[];
  total: number;
}

export interface BkGameDetailResponse {
  game: BkGame;
  leaderboard: BkGameParticipant[];
  teams?: BkGameTeam[];
  stats: {
    totalParticipants: number;
    totalTeams: number;
    totalScore: number;
    leaderScore: number;
    timeRemainingSeconds: number;
    isExpired: boolean;
  };
}
