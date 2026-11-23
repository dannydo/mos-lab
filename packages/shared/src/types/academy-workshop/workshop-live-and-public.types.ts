import type { AcademyTalentInstructor } from '../academy-talent-assessment.js';
import type { AcademyWorkshopDesignItem, AcademyWorkshopDesignItemImage } from '../academy-workshop-designs.js';
import type {
  AcademyInstructorBonusStatus,
  AcademyWorkshopAgendaItem,
  AcademyWorkshopAgendaKind,
  AcademyWorkshopAttendanceStatus,
  AcademyWorkshopDetail,
  AcademyWorkshopEquipmentPackage,
  AcademyWorkshopEquipmentPackageImage,
  AcademyWorkshopMenuCategory,
  AcademyWorkshopMenuItem,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
  AcademyWorkshopRewardStatus,
  AcademyWorkshopStaffRef,
} from './workshop-entities.types.js';

export interface AcademyWorkshopGameLeaderboardEntry {
  rank: number;
  participantId: number;
  name: string;
  avatarUrl: string | null;
  score: number;
  responseTimeMs: number;
  correctAnswers: number;
  rewardLabels: string[];
}

export interface AcademyWorkshopTalentLeaderboardEntry {
  rank: number;
  participantId: number;
  name: string;
  avatarUrl: string | null;
  qualified: boolean;
  strands5Min: number;
  totalErrors: number;
  eyeScore: number;
  handScore: number;
  rankLabel: string;
  rewardLabel: string;
  scholarshipPercent: number;
  sampleRewardPercent: number;
  kitRewardPercent: number;
  completedAt: string;
}

export interface AcademyWorkshopReward {
  id: number;
  workshopId: number;
  participantId: number;
  quizId: number | null;
  questionId: number | null;
  sourceType: 'QUESTION' | 'PODIUM' | 'MANUAL';
  sourceKey: string;
  label: string;
  quantity: number;
  status: AcademyWorkshopRewardStatus;
  promisedAt: string;
  fulfilledAt: string | null;
  fulfilledBy: AcademyWorkshopStaffRef | null;
  note: string | null;
}

export interface AcademyInstructorBonus {
  id: number;
  workshopId: number;
  participantId: number;
  assessmentId: number;
  courseId: number;
  courseName: string;
  instructor: AcademyTalentInstructor;
  amountVnd: number;
  status: AcademyInstructorBonusStatus;
  earnedAt: string;
  paidAt: string | null;
  paidBy: AcademyWorkshopStaffRef | null;
  note: string | null;
}

export interface AcademyWorkshopLiveState {
  serverNow: string;
  workshop: Pick<
    AcademyWorkshopDetail,
    'id' | 'name' | 'slug' | 'startsAt' | 'endsAt' | 'location' | 'status' | 'sharedJoinUrl'
  >;
  participantCount: number;
  connectedParticipantCount: number;
  showJoinQrOnDisplay: boolean;
  activeAgendaItem: AcademyWorkshopAgendaItem | null;
  agenda: AcademyWorkshopAgendaItem[];
  activeQuiz: AcademyWorkshopQuiz | null;
  activeQuestion: AcademyWorkshopQuizQuestion | null;
  gameLeaderboard: AcademyWorkshopGameLeaderboardEntry[];
  talentLeaderboard: AcademyWorkshopTalentLeaderboardEntry[];
}

export interface AcademyWorkshopPublicSession {
  token: string;
  expiresAt: string;
  participant: {
    id: number;
    lead: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
    checkedInAt: string | null;
    gameScore: number;
  };
  workshop: Pick<AcademyWorkshopDetail, 'id' | 'name' | 'slug' | 'startsAt' | 'endsAt' | 'location' | 'status'>;
}

export interface AcademyWorkshopSharedJoinParticipant {
  id: number;
  name: string;
  avatarUrl: string | null;
  requiresPhone: boolean;
}

export interface AcademyWorkshopSharedJoinInfo {
  workshop: Pick<AcademyWorkshopDetail, 'id' | 'name' | 'slug' | 'startsAt' | 'endsAt' | 'location' | 'status'>;
  participants: AcademyWorkshopSharedJoinParticipant[];
}

export type AcademyWorkshopPublicPhase = 'REGISTRATION' | 'CHECKIN' | 'LIVE' | 'COMPLETED' | 'CLOSED';

export interface AcademyWorkshopPublicRegistrationInfo {
  phase: AcademyWorkshopPublicPhase;
  canRegister: boolean;
  /** Whether the public Zalo OAuth flow has server-side credentials configured. */
  zaloAuthAvailable: boolean;
  workshop: {
    name: string;
    slug: string;
    description: string | null;
    heroImageUrl: string | null;
    startsAt: string;
    endsAt: string;
    /** Effective meal-selection cutoff, with workshop start as the fallback. */
    menuSelectionDeadline: string;
    /** Effective equipment-selection cutoff, with workshop start as the fallback. */
    equipmentSelectionDeadline: string;
    /** Effective lash-design-selection cutoff, with workshop start as the fallback. */
    designSelectionDeadline: string;
    location: string;
    capacity: number;
    remainingSeats: number;
    feeVnd: number;
    publishedAt?: string | null;
    scheduledPublishAt?: string | null;
    equipment: {
      required: boolean;
      packages: Array<
        Pick<
          AcademyWorkshopEquipmentPackage,
          'id' | 'name' | 'description' | 'includedItems' | 'priceVnd' | 'isIncludedInFee'
        > & {
          effectivePriceVnd: number;
          images: Array<Pick<AcademyWorkshopEquipmentPackageImage, 'id' | 'imageUrl' | 'altText'>>;
        }
      >;
    };
    design: {
      required: boolean;
      items: Array<
        Pick<AcademyWorkshopDesignItem, 'id' | 'name' | 'description' | 'difficultyLevel' | 'priceVnd'> & {
          images: Array<Pick<AcademyWorkshopDesignItemImage, 'id' | 'imageUrl' | 'altText'>>;
        }
      >;
    };
    menu: {
      required: boolean;
      categories: Array<{
        category: AcademyWorkshopMenuCategory;
        label: string;
        items: Array<Pick<AcademyWorkshopMenuItem, 'id' | 'name' | 'description' | 'imageUrl'>>;
      }>;
    };
    agenda: Array<{
      id: number;
      title: string;
      description: string | null;
      kind: AcademyWorkshopAgendaKind;
      plannedDurationSeconds: number;
      sortOrder: number;
      /** Show the participant's practical-kit selection at this exact agenda item. */
      equipmentSelectionEnabled: boolean;
      /** Show the participant's lash design selection at this exact agenda item. */
      designSelectionEnabled: boolean;
      /** Show the participant's meal selection at this exact agenda item. */
      menuSelectionEnabled: boolean;
    }>;
    /** Available only from check-in onward; never reveal the roster itself. */
    joinUrl: string | null;
  };
}

export interface RegisterAcademyWorkshopRequest {
  name: string;
  phone: string;
  email?: string | null;
  goal?: string | null;
  referrer?: string | null;
  menuSelections?: AcademyWorkshopMenuSelectionInput[];
  equipmentPackageId?: number;
  designItemId?: number;
}

export interface AcademyWorkshopMenuSelectionInput {
  category: AcademyWorkshopMenuCategory;
  menuItemId: number;
}

/**
 * A Google ID credential identifies the learner; phone is still collected so
 * Academy can confirm attendance and send practical event instructions.
 */
export interface RegisterAcademyWorkshopWithGoogleRequest {
  credential: string;
  phone: string;
  goal?: string | null;
  referrer?: string | null;
  menuSelections?: AcademyWorkshopMenuSelectionInput[];
  equipmentPackageId?: number;
  designItemId?: number;
}

/** Verifies a Google identity before checking whether it already joined a workshop. */
export interface FindAcademyWorkshopRegistrationWithGoogleRequest {
  credential: string;
}

/** A short-lived ticket is issued only after the server completes Zalo OAuth. */
export interface RegisterAcademyWorkshopWithZaloRequest {
  ticket: string;
  phone: string;
  email?: string | null;
  goal?: string | null;
  referrer?: string | null;
  menuSelections?: AcademyWorkshopMenuSelectionInput[];
  equipmentPackageId?: number;
  designItemId?: number;
}

/** Verifies the short-lived Zalo ticket before checking an existing registration. */
export interface FindAcademyWorkshopRegistrationWithZaloRequest {
  ticket: string;
}

export interface RegisterAcademyWorkshopResponse {
  participantId: number;
  attendanceStatus: AcademyWorkshopAttendanceStatus;
  alreadyRegistered: boolean;
  message: string;
}

export type AcademyWorkshopRealtimeEvent =
  | { type: 'STATE_SNAPSHOT'; data: AcademyWorkshopLiveState }
  | { type: 'LOBBY_UPDATED'; data: { participantCount: number; connectedParticipantCount: number } }
  | { type: 'AGENDA_UPDATED'; data: AcademyWorkshopAgendaItem | null }
  | { type: 'QUESTION_OPENED'; data: AcademyWorkshopQuizQuestion }
  | { type: 'QUESTION_CLOSED'; data: { questionId: number } }
  | { type: 'QUESTION_REVEALED'; data: AcademyWorkshopQuizQuestion }
  | { type: 'LEADERBOARD_UPDATED'; data: AcademyWorkshopGameLeaderboardEntry[] }
  | { type: 'GAME_ENDED'; data: AcademyWorkshopGameLeaderboardEntry[] }
  | { type: 'ERROR'; data: { code: string; message: string } };
