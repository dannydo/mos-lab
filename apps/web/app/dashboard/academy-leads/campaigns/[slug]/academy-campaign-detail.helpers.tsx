import React from 'react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { Trophy } from 'lucide-react';
import type {
  AcademyCampaignLead,
  AcademyCampaignStats,
  AcademyCampaignTouchpoint,
  AcademyLeadStatus,
  AcademyTalentAssessment,
  UpdateAcademyTalentAssessmentRequest,
} from '@mos-lab/shared';
import { AppIcon, CustomerIdentityCell, StatusTag } from '../../../../../components/ui';
import type { AcademyTalentDraft, AcademyTalentLead } from '../../components/academy-talent-workshop.types';
import { toAcademyTalentWorkshopView } from '../../components/academy-talent-workshop.adapter';
import {
  ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS,
  getTouchpointOutcomeIcon,
} from '../components/academy-campaign-utils';
import styles from './AcademyCampaignDetailPage.module.css';

export type CampaignLeadQuery = {
  page: number;
  pageSize: number;
  search: string;
  status: AcademyLeadStatus | 'ALL';
  ownerStaffId: number | 'ALL' | 'UNASSIGNED';
};

export const DEFAULT_STATS: AcademyCampaignStats = {
  totalLeads: 0,
  touchedLeadCount: 0,
  touchpointLogCount: 0,
  scheduledCount: 0,
  testedCount: 0,
  wonCount: 0,
  wonRate: 0,
  revenueVnd: 0,
};

export const DEFAULT_QUERY: CampaignLeadQuery = {
  page: 1,
  pageSize: 20,
  search: '',
  status: 'ALL',
  ownerStaffId: 'ALL',
};

export const LEAD_STATUS_LABELS: Record<AcademyLeadStatus, string> = {
  NEW: 'Mới',
  WARM: 'Đang tư vấn',
  SCHEDULED: 'Đã hẹn test',
  TESTED: 'Đã test',
  WON: 'Đã chốt',
  LOST: 'Không phù hợp',
};

export const LEAD_STATUS_TONES: Record<AcademyLeadStatus, React.ComponentProps<typeof StatusTag>['status']> = {
  NEW: 'default',
  WARM: 'warning',
  SCHEDULED: 'processing',
  TESTED: 'purple',
  WON: 'success',
  LOST: 'error',
};

function queryStorageKey(slug: string) {
  return `academy-sales-campaign:${slug}:lead-query:v1`;
}

export function readLeadQuery(slug: string): CampaignLeadQuery {
  if (typeof window === 'undefined') return DEFAULT_QUERY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(queryStorageKey(slug)) || '{}') as Partial<CampaignLeadQuery>;
    const allowedStatuses = ['ALL', 'NEW', 'WARM', 'SCHEDULED', 'TESTED', 'WON', 'LOST'];
    return {
      page: Math.max(1, Number(parsed.page) || 1),
      pageSize: [10, 20, 50, 100].includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : 20,
      search: typeof parsed.search === 'string' ? parsed.search : '',
      status: allowedStatuses.includes(String(parsed.status)) ? (parsed.status as CampaignLeadQuery['status']) : 'ALL',
      ownerStaffId:
        parsed.ownerStaffId === 'ALL' ||
        parsed.ownerStaffId === 'UNASSIGNED' ||
        Number.isInteger(Number(parsed.ownerStaffId))
          ? (parsed.ownerStaffId as CampaignLeadQuery['ownerStaffId'])
          : 'ALL',
    };
  } catch {
    return DEFAULT_QUERY;
  }
}

export function persistLeadQuery(slug: string, query: CampaignLeadQuery) {
  window.localStorage.setItem(queryStorageKey(slug), JSON.stringify(query));
}

export function formatIctDateTime(value: string | null | undefined) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

export function campaignLeadMobileCard(
  membership: AcademyCampaignLead,
  onOpenTouchpoint: (membership: AcademyCampaignLead, touchpoint: AcademyCampaignTouchpoint) => void,
  onOpenTalent: (lead: AcademyTalentLead) => void,
  touchpoints: AcademyCampaignTouchpoint[],
  runnable: boolean
) {
  return (
    <div className={styles.mobileLeadCard}>
      <CustomerIdentityCell
        name={membership.lead.name}
        phone={membership.lead.phone}
        avatar={membership.lead.avatarUrl}
      />
      <div className="flex flex-wrap gap-1.5">
        <StatusTag
          status={LEAD_STATUS_TONES[membership.lead.status]}
          label={LEAD_STATUS_LABELS[membership.lead.status]}
        />
        <span className="text-xs opacity-70">{membership.lead.course || 'Chưa chọn khóa'}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          className={styles.mobileLeadAction}
          icon={<AppIcon icon={Trophy} />}
          onClick={() => void onOpenTalent(toAcademyTalentLead(membership.lead))}
        >
          Tố Chất
        </Button>
        {touchpoints.map((touchpoint) => {
          const log = membership.touchpointLogs.find((item) => item.touchpointId === touchpoint.id);
          return (
            <Button
              key={touchpoint.id}
              className={styles.mobileLeadAction}
              disabled={!runnable}
              icon={getTouchpointOutcomeIcon(log?.status)}
              onClick={() => onOpenTouchpoint(membership, touchpoint)}
            >
              {log?.status ? ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS[log.status] : touchpoint.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** The API authorizes and reloads the canonical lead before workshop writes. */
export function toAcademyTalentLead(lead: AcademyCampaignLead['lead']): AcademyTalentLead {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    avatarUrl: lead.avatarUrl,
    email: null,
    course: lead.course,
    owner: lead.owner,
  };
}

export function talentSessionNumber(assessment: AcademyTalentAssessment, sessions: AcademyTalentAssessment[]) {
  const ordered = [...sessions]
    .filter((item) => item.id !== assessment.id)
    .concat(assessment)
    .sort((left, right) => {
      const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return difference || left.id - right.id;
    });
  return Math.max(1, ordered.findIndex((item) => item.id === assessment.id) + 1);
}

export function talentWorkshopView(assessment: AcademyTalentAssessment, sessions: AcademyTalentAssessment[]) {
  return toAcademyTalentWorkshopView(assessment, talentSessionNumber(assessment, sessions));
}

export function talentAssessmentRequest(draft: AcademyTalentDraft): UpdateAcademyTalentAssessmentRequest {
  return {
    eyeScore: draft.eyeScore,
    handScore: draft.handScore,
    strands5Min: draft.strands5Min,
    errorSkin: draft.errors.skin,
    errorRoot: draft.errors.root,
    errorStickies: draft.errors.stickies,
    errorDirection: draft.errors.direction,
    selectedCourseIds: draft.selectedCourseIds,
    selectedSampleCourseIds: draft.selectedSampleCourseIds,
    selectedKitCourseIds: draft.selectedKitCourseIds,
    selectedInstructorIdsByCourse: draft.selectedInstructorIdsByCourse,
    paymentMode: draft.paymentMode,
    ...(draft.depositVnd === null ? {} : { depositVnd: draft.depositVnd }),
    notes: draft.note,
  };
}
