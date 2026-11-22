'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { Department, Team, TeamStaffOption } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { flattenTeams, updateTeamInTree, type RoleFilter, type TeamFormValues } from '../teams-page.helpers';
import {
  buildDepartmentOptions,
  buildParentTeamOptions,
  buildUpsertTeamPayload,
  collectDefinedTeamStaffIds,
  filterActiveMembers,
  filterAvailablePoolOptions,
  isAutoGroupTeam,
  type TeamEditorState,
} from './teamPageUtils';

export function useTeamsPageState(initialSelectedCode: string) {
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamsError, setTeamsError] = useState<string>();
  const [detailError, setDetailError] = useState<string>();

  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const rootTeams = useMemo(() => teams.filter((team) => !team.parentTeamId), [teams]);
  const allTeams = useMemo(() => flattenTeams(teams), [teams]);
  const [selectedCode, setSelectedCode] = useState(initialSelectedCode);

  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [staffOptions, setStaffOptions] = useState<TeamStaffOption[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());

  const [poolSearchText, setPoolSearchText] = useState('');
  const [activeSearchText, setActiveSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [teamEditor, setTeamEditor] = useState<TeamEditorState>(null);
  const [teamPendingDelete, setTeamPendingDelete] = useState<Team | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamForm] = Form.useForm<TeamFormValues>();

  const isAutoGroup = isAutoGroupTeam(currentTeam);

  const definedTeamStaffIds = useMemo(
    () => collectDefinedTeamStaffIds(allTeams, currentTeam?.code),
    [allTeams, currentTeam?.code]
  );

  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    setTeamsError(undefined);
    try {
      const response = await apiClient.teams.list();
      setTeams(response.teams || []);
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('Fetch teams error:', error);
      setTeamsError('Không thể tải danh sách đội nhóm.');
      message.error('Không thể tải danh sách đội nhóm.');
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const fetchTeamDetail = useCallback(async (code: string) => {
    setLoadingDetail(true);
    setDetailError(undefined);
    try {
      const response = await apiClient.teams.getByCode(code);
      const options = response.allStaffOptions || [];
      const activeStaffIds = new Set(options.filter((staff) => staff.isActive).map((staff) => staff.staffId));

      setCurrentTeam(response.team);
      setStaffOptions(options);
      setSelectedStaffIds(activeStaffIds);
      setTeams((previous) =>
        updateTeamInTree(previous, code, (team) => ({ ...team, memberCount: activeStaffIds.size }))
      );
    } catch (error) {
      console.error(`Fetch team ${code} detail error:`, error);
      setDetailError(`Không thể tải thông tin đội ${code}.`);
      message.error(`Không thể tải thông tin đội ${code}.`);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedCode) void fetchTeamDetail(selectedCode);
  }, [fetchTeamDetail, selectedCode]);

  const autoGroupStaffOptions = useMemo(
    () => staffOptions.filter((staff) => !definedTeamStaffIds.has(staff.staffId)),
    [definedTeamStaffIds, staffOptions]
  );

  const availablePoolOptions = useMemo(
    () =>
      filterAvailablePoolOptions({
        staffOptions,
        autoGroupStaffOptions,
        isAutoGroup,
        roleFilter,
        poolSearchText,
      }),
    [autoGroupStaffOptions, isAutoGroup, poolSearchText, roleFilter, staffOptions]
  );

  const activeMembers = useMemo(
    () =>
      filterActiveMembers({
        staffOptions,
        selectedStaffIds,
        activeSearchText,
      }),
    [activeSearchText, selectedStaffIds, staffOptions]
  );

  const handleAddStaff = useCallback(
    (staffId: number) => {
      if (isAutoGroup) return;
      setSelectedStaffIds((previous) => new Set(previous).add(staffId));
    },
    [isAutoGroup]
  );

  const handleRemoveStaff = useCallback(
    (staffId: number) => {
      if (isAutoGroup) return;
      setSelectedStaffIds((previous) => {
        const next = new Set(previous);
        next.delete(staffId);
        return next;
      });
    },
    [isAutoGroup]
  );

  const handleAddAllFiltered = useCallback(() => {
    if (isAutoGroup) return;
    setSelectedStaffIds((previous) => {
      const next = new Set(previous);
      availablePoolOptions.forEach((staff) => next.add(staff.staffId));
      return next;
    });
    message.success(`Đã thêm ${availablePoolOptions.length} nhân sự vào đội.`);
  }, [availablePoolOptions, isAutoGroup]);

  const handleClearAllActive = useCallback(() => {
    if (isAutoGroup) return;
    setSelectedStaffIds(new Set());
    message.info('Đã xóa tất cả nhân sự khỏi đội.');
  }, [isAutoGroup]);

  const handleSaveMembers = useCallback(async () => {
    if (!currentTeam || isAutoGroup) return;
    setSaving(true);
    try {
      await apiClient.teams.updateMembers(currentTeam.id, { activeStaffIds: Array.from(selectedStaffIds) });
      message.success(`Đã lưu danh sách thành viên đội ${currentTeam.name} thành công.`);
      await Promise.all([fetchTeams(), fetchTeamDetail(currentTeam.code)]);
    } catch (error) {
      console.error('Save team members error:', error);
      message.error('Không thể lưu danh sách thành viên.');
    } finally {
      setSaving(false);
    }
  }, [currentTeam, fetchTeamDetail, fetchTeams, isAutoGroup, selectedStaffIds]);

  const openTeamEditor = useCallback(
    (team?: Team, parent?: Team) => {
      const resolvedParent =
        parent || (team?.parentTeamId ? allTeams.find((candidate) => candidate.id === team.parentTeamId) : undefined);
      teamForm.setFieldsValue({
        code: team?.code || '',
        name: team?.name || '',
        description: team?.description || '',
        departmentId: resolvedParent?.departmentId || team?.departmentId || departments[0]?.id,
        parentTeamId: resolvedParent?.id,
        sortOrder: team?.sortOrder ?? 0,
        isActive: team?.isActive ?? true,
      });
      setTeamEditor({ team, parent: resolvedParent });
    },
    [allTeams, departments, teamForm]
  );

  const closeTeamEditor = useCallback(() => {
    teamForm.resetFields();
    setTeamEditor(null);
  }, [teamForm]);

  const handleSaveTeam = useCallback(
    async (values: TeamFormValues) => {
      const editingTeam = teamEditor?.team;
      const payload = buildUpsertTeamPayload(values, allTeams, editingTeam);

      setSavingTeam(true);
      try {
        const result = editingTeam
          ? await apiClient.teams.update(editingTeam.id, payload)
          : await apiClient.teams.create(payload);
        message.success(editingTeam ? `Đã cập nhật team ${result.team.name}.` : `Đã tạo team ${result.team.name}.`);
        closeTeamEditor();
        setSelectedCode(result.team.code);
        await Promise.all([fetchTeams(), fetchTeamDetail(result.team.code)]);
      } catch (error) {
        console.error('Save team definition error:', error);
        message.error('Không thể lưu cấu hình team. Vui lòng kiểm tra Department và team cha.');
      } finally {
        setSavingTeam(false);
      }
    },
    [allTeams, closeTeamEditor, fetchTeamDetail, fetchTeams, teamEditor?.team]
  );

  const handleDeleteTeam = useCallback(async () => {
    if (!teamPendingDelete) return;
    const deletingTeam = teamPendingDelete;
    setSavingTeam(true);
    try {
      await apiClient.teams.delete(deletingTeam.id);
      message.success(`Đã xóa team ${deletingTeam.name}.`);
      setTeamPendingDelete(null);
      const parent = deletingTeam.parentTeamId
        ? allTeams.find((team) => team.id === deletingTeam.parentTeamId)
        : undefined;
      setCurrentTeam(null);
      setSelectedCode(parent?.code || '');
      await fetchTeams();
      if (parent) await fetchTeamDetail(parent.code);
    } catch (error) {
      console.error('Delete team error:', error);
      message.error('Không thể xóa team. Team phải trống và không có team trực thuộc.');
    } finally {
      setSavingTeam(false);
    }
  }, [allTeams, fetchTeamDetail, fetchTeams, teamPendingDelete]);

  const handleRefresh = useCallback(() => {
    void fetchTeams();
    if (selectedCode) void fetchTeamDetail(selectedCode);
  }, [fetchTeamDetail, fetchTeams, selectedCode]);

  const activeCount = isAutoGroup ? autoGroupStaffOptions.length : selectedStaffIds.size;

  const parentOptions = useMemo(() => buildParentTeamOptions(allTeams, teamEditor?.team), [allTeams, teamEditor?.team]);

  const departmentOptions = useMemo(() => buildDepartmentOptions(departments), [departments]);

  return {
    loadingTeams,
    loadingDetail,
    saving,
    teamsError,
    detailError,
    teams,
    departments,
    rootTeams,
    allTeams,
    selectedCode,
    setSelectedCode,
    currentTeam,
    staffOptions,
    selectedStaffIds,
    poolSearchText,
    setPoolSearchText,
    activeSearchText,
    setActiveSearchText,
    roleFilter,
    setRoleFilter,
    teamEditor,
    teamPendingDelete,
    setTeamPendingDelete,
    savingTeam,
    teamForm,
    isAutoGroup,
    definedTeamStaffIds,
    availablePoolOptions,
    activeMembers,
    activeCount,
    parentOptions,
    departmentOptions,
    fetchTeams,
    fetchTeamDetail,
    handleRefresh,
    handleAddStaff,
    handleRemoveStaff,
    handleAddAllFiltered,
    handleClearAllActive,
    handleSaveMembers,
    openTeamEditor,
    closeTeamEditor,
    handleSaveTeam,
    handleDeleteTeam,
  };
}
