'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { Dayjs } from 'dayjs';
import {
  BK_GAME_SCORING_RULES,
  type BkGameDoneBonusRule,
  type BkGameMetricType,
  type BkGameTeamBookingDoneBonusConfig,
  type BkGameType,
  type Staff,
  type TeamListResponse,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  buildCreateGamePayload,
  buildRoleFilterOptions,
  buildSelectableStaffOptions,
  buildStaffProfileList,
  filterStaffByRole,
  getInitialGameCreateValues,
  type BkGameCreateFormValues,
  type BkGameCreateModalProps,
  type ParticipantFieldName,
  type StaffProfileOption,
} from './bkGameCreateUtils';

/** Manages state, staff/team loading, dynamic filter options, and submission for BkGameCreateModal. */
export function useBkGameCreateForm({ open, onClose, onSuccess }: BkGameCreateModalProps) {
  const [form] = Form.useForm<BkGameCreateFormValues>();
  const [loading, setLoading] = useState(false);
  const [gameType, setGameType] = useState<BkGameType>('INDIVIDUAL');
  const [allStaffList, setAllStaffList] = useState<StaffProfileOption[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [staffLoading, setStaffLoading] = useState(false);
  const [doneBonusRules, setDoneBonusRules] = useState<BkGameDoneBonusRule[]>([]);
  const [teamBookingDoneBonusConfig, setTeamBookingDoneBonusConfig] = useState<BkGameTeamBookingDoneBonusConfig | null>(
    null
  );

  const initialValues = useMemo(() => getInitialGameCreateValues(), []);

  const watchedMetricType = (Form.useWatch('metricType', form) || 'BOOKINGS') as BkGameMetricType;
  const watchedTeamKpiTimeWindow = Form.useWatch('teamKpiTimeWindow', form) as [Dayjs, Dayjs] | undefined;
  const watchedParticipantIds = Form.useWatch('participantIds', form);
  const watchedTeam1Ids = Form.useWatch('team1Members', form);
  const watchedTeam2Ids = Form.useWatch('team2Members', form);

  const selectedParticipantIds = useMemo(() => watchedParticipantIds || [], [watchedParticipantIds]);
  const selectedTeam1Ids = useMemo(() => watchedTeam1Ids || [], [watchedTeam1Ids]);
  const selectedTeam2Ids = useMemo(() => watchedTeam2Ids || [], [watchedTeam2Ids]);

  const teamKpiTimeWindowLabel =
    watchedTeamKpiTimeWindow?.[0] && watchedTeamKpiTimeWindow?.[1]
      ? `${watchedTeamKpiTimeWindow[0].format('HH:mm')}–${watchedTeamKpiTimeWindow[1].format('HH:mm')}`
      : '08:00–17:00';
  const currentScoringRule = BK_GAME_SCORING_RULES[watchedMetricType] || BK_GAME_SCORING_RULES.BOOKINGS;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchStaff = async () => {
      setStaffLoading(true);
      try {
        const [configRes, staffRes, teamsRes, rolesRes] = await Promise.all([
          apiClient.bk.getConfig().catch(() => null),
          apiClient.staff.list({ isActive: true }).catch(() => [] as Staff[]),
          apiClient.teams.list().catch(() => null as TeamListResponse | null),
          apiClient.roles.list().catch(() => [] as Array<{ key: string; name: string }>),
        ]);

        if (cancelled) return;

        const staffList = buildStaffProfileList({ configRes, staffRes, teamsRes, rolesRes });
        setAllStaffList(staffList);

        const defaultSelected = staffList.filter((s) => s.isDefaultBk).map((s) => s.staffId);
        const currentParticipants = form.getFieldValue('participantIds');
        if (!currentParticipants || currentParticipants.length === 0) {
          form.setFieldsValue({
            participantIds: defaultSelected.length > 0 ? defaultSelected : staffList.slice(0, 5).map((s) => s.staffId),
          });
        }
      } catch {
        // Fallback safely
      } finally {
        if (!cancelled) {
          setStaffLoading(false);
        }
      }
    };
    void fetchStaff();
    return () => {
      cancelled = true;
    };
  }, [open, form]);

  const roleFilterOptions = useMemo(() => buildRoleFilterOptions(allStaffList), [allStaffList]);

  const filteredStaffList = useMemo(
    () => filterStaffByRole(allStaffList, selectedRoleFilter),
    [allStaffList, selectedRoleFilter]
  );

  const participantOptions = useMemo(
    () => buildSelectableStaffOptions(allStaffList, filteredStaffList, selectedParticipantIds),
    [allStaffList, filteredStaffList, selectedParticipantIds]
  );

  const team1Options = useMemo(
    () => buildSelectableStaffOptions(allStaffList, filteredStaffList, selectedTeam1Ids),
    [allStaffList, filteredStaffList, selectedTeam1Ids]
  );

  const team2Options = useMemo(
    () => buildSelectableStaffOptions(allStaffList, filteredStaffList, selectedTeam2Ids),
    [allStaffList, filteredStaffList, selectedTeam2Ids]
  );

  const handleGameTypeChange = (nextGameType: BkGameType) => {
    setGameType(nextGameType);
    form.setFieldValue('gameType', nextGameType);
  };

  const handleAddAllFiltered = (field: ParticipantFieldName = 'participantIds') => {
    const current = (form.getFieldValue(field) as number[] | undefined) || [];
    const newIds = filteredStaffList.map((s) => s.staffId);
    const merged = Array.from(new Set([...current, ...newIds]));
    form.setFieldValue(field, merged);
  };

  const handleClearField = (field: ParticipantFieldName = 'participantIds') => {
    form.setFieldValue(field, []);
  };

  const handleSubmit = async (values: BkGameCreateFormValues) => {
    setLoading(true);
    try {
      const payload = buildCreateGamePayload(values, doneBonusRules, teamBookingDoneBonusConfig);
      const res = await apiClient.bk.createGame(payload);
      message.success('Khởi tạo Game BK thành công!');
      onSuccess(res.game);
      onClose();
      form.resetFields();
      setDoneBonusRules([]);
      setTeamBookingDoneBonusConfig(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo game. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    staffLoading,
    initialValues,
    gameType,
    watchedMetricType,
    teamKpiTimeWindowLabel,
    currentScoringRule,
    allStaffList,
    selectedRoleFilter,
    setSelectedRoleFilter,
    roleFilterOptions,
    filteredStaffList,
    selectedParticipantIds,
    selectedTeam1Ids,
    selectedTeam2Ids,
    participantOptions,
    team1Options,
    team2Options,
    doneBonusRules,
    setDoneBonusRules,
    teamBookingDoneBonusConfig,
    setTeamBookingDoneBonusConfig,
    handleGameTypeChange,
    handleAddAllFiltered,
    handleClearField,
    handleSubmit,
  };
}
