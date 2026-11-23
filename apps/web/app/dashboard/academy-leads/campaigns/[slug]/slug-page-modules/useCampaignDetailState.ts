'use client';

import React from 'react';
import { message } from 'antd';
import type {
  AcademyCampaign,
  AcademyCampaignLead,
  AcademyCampaignStats,
  AcademyCampaignTouchpoint,
  AcademyCourse,
  AcademyStaffOption,
  AcademyTalentInstructor,
  UpdateAcademyCampaignRequest,
  UpsertAcademyCourseRequest,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { AcademyCampaignFormPayload } from '../../components/AcademyCampaignFormDrawer';
import type { AcademyTalentCourseConfigurationInput } from '../../../components/academy-talent-workshop.types';
import { readAcademyUserRole } from '../../components/academy-campaign-utils';
import {
  type CampaignLeadQuery,
  DEFAULT_QUERY,
  DEFAULT_STATS,
  persistLeadQuery,
  readLeadQuery,
} from '../academy-campaign-detail.helpers';

export type CampaignTouchpointContext = {
  lead: AcademyCampaignLead;
  touchpoint: AcademyCampaignTouchpoint;
};

type UseCampaignDetailStateOptions = {
  slug: string;
  academyAllowed: boolean;
  canManage: boolean;
  onSlugChanged: (nextSlug: string) => void;
};

function readApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

export function useCampaignDetailState({
  slug,
  academyAllowed,
  canManage,
  onSlugChanged,
}: UseCampaignDetailStateOptions) {
  const [role, setRole] = React.useState('');
  const [hydrated, setHydrated] = React.useState(false);
  const [campaign, setCampaign] = React.useState<AcademyCampaign | null>(null);
  const [stats, setStats] = React.useState<AcademyCampaignStats>(DEFAULT_STATS);
  const [memberships, setMemberships] = React.useState<AcademyCampaignLead[]>([]);
  const [total, setTotal] = React.useState(0);
  const [staff, setStaff] = React.useState<AcademyStaffOption[]>([]);
  const [courses, setCourses] = React.useState<AcademyCourse[]>([]);
  const [talentInstructors, setTalentInstructors] = React.useState<AcademyTalentInstructor[]>([]);
  const [query, setQuery] = React.useState<CampaignLeadQuery>(DEFAULT_QUERY);
  const [loadingCampaign, setLoadingCampaign] = React.useState(true);
  const [loadingLeads, setLoadingLeads] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = React.useState(false);
  const [touchpointContext, setTouchpointContext] = React.useState<CampaignTouchpointContext | null>(null);
  const [touchpointSubmitting, setTouchpointSubmitting] = React.useState(false);
  const campaignRequestVersionRef = React.useRef(0);
  const leadRequestVersionRef = React.useRef(0);
  const deferredSearch = React.useDeferredValue(query.search);

  React.useEffect(() => {
    setRole(readAcademyUserRole());
  }, []);

  React.useEffect(() => {
    if (!slug) return;
    setQuery(readLeadQuery(slug));
    setHydrated(true);
  }, [slug]);

  React.useEffect(() => {
    if (!hydrated || !slug) return;
    persistLeadQuery(slug, query);
  }, [hydrated, query, slug]);

  const canConfigure = canManage;
  const canManageMembership = canConfigure || role === 'ls';
  // Mirrors the Academy API: DRAFT/SCHEDULED campaigns may capture early real
  // conversations, while paused and closed campaigns are intentionally read-only.
  const isTouchpointWritable = Boolean(campaign && ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(campaign.status));

  const loadCampaign = React.useCallback(async () => {
    if (!hydrated || !slug || !academyAllowed) return;
    const version = ++campaignRequestVersionRef.current;
    setLoadingCampaign(true);
    try {
      const [nextCampaign, nextStaff, nextCourses, nextTalentInstructors] = await Promise.all([
        apiClient.academySales.campaigns.getBySlug(slug),
        apiClient.academySales.listStaff(),
        apiClient.academySales.listCourses(),
        apiClient.academySales.listTalentInstructors(),
      ]);
      if (version !== campaignRequestVersionRef.current) return;
      setCampaign(nextCampaign);
      setStaff(nextStaff);
      setCourses(nextCourses);
      setTalentInstructors(nextTalentInstructors.data);
      setError(null);
    } catch (loadError) {
      if (version !== campaignRequestVersionRef.current) return;
      setCampaign(null);
      setError(readApiErrorMessage(loadError, 'Không thể tải chiến dịch Academy.'));
    } finally {
      if (version === campaignRequestVersionRef.current) setLoadingCampaign(false);
    }
  }, [academyAllowed, hydrated, slug]);

  const loadOperationalData = React.useCallback(async () => {
    if (!campaign || !hydrated) return;
    const version = ++leadRequestVersionRef.current;
    setLoadingLeads(true);
    try {
      const [leadResponse, nextStats] = await Promise.all([
        apiClient.academySales.campaigns.listLeads(campaign.id, {
          page: query.page,
          limit: query.pageSize,
          search: deferredSearch || undefined,
          status: query.status,
          ownerStaffId: query.ownerStaffId,
        }),
        apiClient.academySales.campaigns.getStats(campaign.id),
      ]);
      if (version !== leadRequestVersionRef.current) return;
      setMemberships(leadResponse.data);
      setTotal(leadResponse.total);
      setStats(nextStats);
      setError(null);
    } catch (loadError) {
      if (version !== leadRequestVersionRef.current) return;
      setError(readApiErrorMessage(loadError, 'Không thể tải tệp lead của chiến dịch.'));
    } finally {
      if (version === leadRequestVersionRef.current) setLoadingLeads(false);
    }
  }, [campaign, deferredSearch, hydrated, query.ownerStaffId, query.page, query.pageSize, query.status]);

  React.useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  React.useEffect(() => {
    void loadOperationalData();
  }, [loadOperationalData]);

  const refresh = React.useCallback(async () => {
    await loadCampaign();
    await loadOperationalData();
  }, [loadCampaign, loadOperationalData]);

  const saveTalentCourseConfiguration = React.useCallback(async (input: AcademyTalentCourseConfigurationInput[]) => {
    await Promise.all(
      input.map(({ id, values }) =>
        id
          ? apiClient.academySales.updateCourse(id, values as UpsertAcademyCourseRequest)
          : apiClient.academySales.createCourse(values as UpsertAcademyCourseRequest)
      )
    );
    const nextCourses = await apiClient.academySales.listCourses();
    setCourses(nextCourses);
    return nextCourses;
  }, []);

  const patchQuery = React.useCallback((patch: Partial<CampaignLeadQuery>, resetPage = false) => {
    setQuery((previous) => ({ ...previous, ...patch, page: resetPage ? 1 : (patch.page ?? previous.page) }));
  }, []);

  const openTouchpoint = React.useCallback((lead: AcademyCampaignLead, touchpoint: AcademyCampaignTouchpoint) => {
    setTouchpointContext({ lead, touchpoint });
  }, []);

  const updateTouchpoint = React.useCallback(
    async (payload: Parameters<typeof apiClient.academySales.campaigns.toggleTouchpoint>[3]) => {
      if (!campaign || !touchpointContext) return;
      setTouchpointSubmitting(true);
      try {
        const result = await apiClient.academySales.campaigns.toggleTouchpoint(
          campaign.id,
          touchpointContext.lead.leadId,
          touchpointContext.touchpoint.id,
          payload
        );
        message.success(result.message || 'Đã cập nhật điểm chạm.');
        setTouchpointContext(null);
        await loadOperationalData();
      } catch (submitError) {
        message.error(readApiErrorMessage(submitError, 'Không thể cập nhật điểm chạm.'));
      } finally {
        setTouchpointSubmitting(false);
      }
    },
    [campaign, loadOperationalData, touchpointContext]
  );

  const addLeads = React.useCallback(
    async (leadIds: number[]) => {
      if (!campaign || !leadIds.length) return;
      try {
        const result = await apiClient.academySales.campaigns.addLeads(campaign.id, { leadIds });
        message.success(`Đã thêm ${result.length.toLocaleString('vi-VN')} lead vào tệp chiến dịch.`);
        setLeadPickerOpen(false);
        await refresh();
      } catch (submitError) {
        message.error(readApiErrorMessage(submitError, 'Không thể thêm lead vào tệp chiến dịch.'));
      }
    },
    [campaign, refresh]
  );

  const removeLead = React.useCallback(
    async (membership: AcademyCampaignLead) => {
      if (!campaign) return;
      try {
        const result = await apiClient.academySales.campaigns.removeLead(campaign.id, membership.leadId);
        message.success(result.message || 'Đã gỡ lead khỏi tệp chiến dịch.');
        await refresh();
      } catch (submitError) {
        message.error(readApiErrorMessage(submitError, 'Không thể gỡ lead khỏi chiến dịch.'));
      }
    },
    [campaign, refresh]
  );

  const submitConfiguration = React.useCallback(
    async (payload: AcademyCampaignFormPayload) => {
      if (!campaign) return;
      setFormSubmitting(true);
      try {
        const result = await apiClient.academySales.campaigns.update(
          campaign.id,
          payload as UpdateAcademyCampaignRequest
        );
        message.success(result.message || 'Đã lưu cấu hình chiến dịch.');
        window.dispatchEvent(new Event('academy-campaign-sidebar-updated'));
        setFormOpen(false);
        if (result.data?.slug && result.data.slug !== campaign.slug) {
          onSlugChanged(result.data.slug);
          return;
        }
        await refresh();
      } catch (submitError) {
        message.error(readApiErrorMessage(submitError, 'Không thể lưu cấu hình chiến dịch.'));
      } finally {
        setFormSubmitting(false);
      }
    },
    [campaign, onSlugChanged, refresh]
  );

  const updateLifecycle = React.useCallback(
    async (status: 'ACTIVE' | 'PAUSED') => {
      if (!campaign) return;
      try {
        const result = await apiClient.academySales.campaigns.setStatus(campaign.id, status);
        message.success(
          result.message || (status === 'ACTIVE' ? 'Đã kích hoạt chiến dịch.' : 'Đã tạm dừng chiến dịch.')
        );
        await refresh();
      } catch (submitError) {
        message.error(readApiErrorMessage(submitError, 'Không thể cập nhật trạng thái chiến dịch.'));
      }
    },
    [campaign, refresh]
  );

  return {
    role,
    hydrated,
    campaign,
    stats,
    memberships,
    total,
    staff,
    courses,
    talentInstructors,
    query,
    loadingCampaign,
    loadingLeads,
    error,
    canConfigure,
    canManageMembership,
    isTouchpointWritable,
    formOpen,
    setFormOpen,
    formSubmitting,
    leadPickerOpen,
    setLeadPickerOpen,
    touchpointContext,
    setTouchpointContext,
    touchpointSubmitting,
    loadOperationalData,
    refresh,
    saveTalentCourseConfiguration,
    patchQuery,
    openTouchpoint,
    updateTouchpoint,
    addLeads,
    removeLead,
    submitConfiguration,
    updateLifecycle,
  };
}
