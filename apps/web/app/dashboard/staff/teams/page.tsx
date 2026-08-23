'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Select, Space, Switch, message, Tooltip } from 'antd';
import {
  Building2,
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  UserRoundPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import {
  removeVietnameseTones,
  type Department,
  type Team,
  type TeamStaffOption,
  type UpsertTeamRequest,
} from '@mos-lab/shared';
import {
  AdaptiveModal,
  AppIcon,
  DataSection,
  EntityForm,
  EntityFormDrawer,
  EntityFormField,
  FeaturePage,
  IconButton,
  SearchField,
  SectionCard,
  StatePanel,
  StatusTag,
} from '~/components/ui';
import { apiClient } from '../../../../lib/api-client';
import styles from './teams.module.css';
import {
  flattenTeams,
  ROLE_FILTERS,
  type RoleFilter,
  StaffIdentity,
  type TeamFormValues,
  teamDescendantIds,
  teamIcon,
  teamStatus,
  updateTeamInTree,
} from './teams-page.helpers';

function TeamsContent() {
  const searchParams = useSearchParams();
  const initialSelectedCode = searchParams.get('selected') || 'CC';

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
  const [teamEditor, setTeamEditor] = useState<{ team?: Team; parent?: Team } | null>(null);
  const [teamPendingDelete, setTeamPendingDelete] = useState<Team | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamForm] = Form.useForm<TeamFormValues>();

  const isAutoGroup = Boolean(currentTeam && (currentTeam.code === 'BK_OTHER' || currentTeam.code.endsWith('_OTHER')));

  const definedTeamStaffIds = useMemo(() => {
    const staffIds = new Set<number>();
    allTeams.forEach((team) => {
      if (team.activeStaffIds && !team.code.endsWith('_OTHER') && team.code !== currentTeam?.code) {
        team.activeStaffIds.forEach((staffId) => staffIds.add(staffId));
      }
    });
    return staffIds;
  }, [allTeams, currentTeam?.code]);

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

  const availablePoolOptions = useMemo(() => {
    let options = isAutoGroup ? autoGroupStaffOptions : staffOptions;

    if (!isAutoGroup && roleFilter !== 'ALL') {
      options = options.filter((staff) => {
        const role = (staff.role || '').toUpperCase();
        if (roleFilter === 'CC') return role.includes('CC');
        if (roleFilter === 'CV') return role.includes('CV') || role.includes('KTV');
        if (roleFilter === 'BK') return role.includes('BK') || role.includes('BOOKER');
        return !role.includes('CC') && !role.includes('CV') && !role.includes('KTV') && !role.includes('BK');
      });
    }

    if (!poolSearchText.trim()) return options;
    const query = removeVietnameseTones(poolSearchText);
    return options.filter(
      (staff) =>
        removeVietnameseTones(staff.displayName).includes(query) ||
        (staff.username && removeVietnameseTones(staff.username).includes(query)) ||
        String(staff.staffId).includes(query)
    );
  }, [autoGroupStaffOptions, isAutoGroup, poolSearchText, roleFilter, staffOptions]);

  const activeMembers = useMemo(() => {
    const members = staffOptions.filter((staff) => selectedStaffIds.has(staff.staffId));
    if (!activeSearchText.trim()) return members;
    const query = removeVietnameseTones(activeSearchText);
    return members.filter(
      (staff) =>
        removeVietnameseTones(staff.displayName).includes(query) ||
        (staff.username && removeVietnameseTones(staff.username).includes(query)) ||
        String(staff.staffId).includes(query)
    );
  }, [activeSearchText, selectedStaffIds, staffOptions]);

  const handleAddStaff = (staffId: number) => {
    if (isAutoGroup) return;
    setSelectedStaffIds((previous) => new Set(previous).add(staffId));
  };

  const handleRemoveStaff = (staffId: number) => {
    if (isAutoGroup) return;
    setSelectedStaffIds((previous) => {
      const next = new Set(previous);
      next.delete(staffId);
      return next;
    });
  };

  const handleAddAllFiltered = () => {
    if (isAutoGroup) return;
    setSelectedStaffIds((previous) => {
      const next = new Set(previous);
      availablePoolOptions.forEach((staff) => next.add(staff.staffId));
      return next;
    });
    message.success(`Đã thêm ${availablePoolOptions.length} nhân sự vào đội.`);
  };

  const handleClearAllActive = () => {
    if (isAutoGroup) return;
    setSelectedStaffIds(new Set());
    message.info('Đã xóa tất cả nhân sự khỏi đội.');
  };

  const handleSaveMembers = async () => {
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
  };

  const openTeamEditor = (team?: Team, parent?: Team) => {
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
  };

  const closeTeamEditor = () => {
    teamForm.resetFields();
    setTeamEditor(null);
  };

  const handleSaveTeam = async (values: TeamFormValues) => {
    const editingTeam = teamEditor?.team;
    const parent = values.parentTeamId ? allTeams.find((team) => team.id === values.parentTeamId) : undefined;
    const payload: UpsertTeamRequest = {
      code: editingTeam?.code || values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      departmentId: parent?.departmentId || values.departmentId,
      parentTeamId: values.parentTeamId || null,
      sortOrder: values.sortOrder ?? 0,
      isActive: values.isActive ?? true,
    };

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
  };

  const handleDeleteTeam = async () => {
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
  };

  const handleRefresh = () => {
    void fetchTeams();
    if (selectedCode) void fetchTeamDetail(selectedCode);
  };

  const renderTeam = (team: Team, depth = 0): React.ReactNode => {
    const active = selectedCode === team.code;
    const memberCount = team.memberCount ?? 0;
    return (
      <div key={team.code} className={styles.teamBranch}>
        <button
          type="button"
          className={styles.teamItem}
          data-active={active || undefined}
          data-child={depth > 0 || undefined}
          aria-current={active ? 'page' : undefined}
          onClick={() => setSelectedCode(team.code)}
        >
          <span className={styles.teamItemIcon} aria-hidden>
            <AppIcon icon={teamIcon(team.code)} size="sm" />
          </span>
          <span className={styles.teamItemCopy}>
            <span className={styles.teamItemTitle}>
              <strong>{team.name}</strong>
              <StatusTag
                status={teamStatus(team.code)}
                label={team.code}
                bordered={false}
                className={styles.teamCode}
              />
            </span>
            <span className={styles.teamItemDescription}>{team.description || 'Chưa có mô tả đội nhóm.'}</span>
          </span>
          <span className={styles.memberCount} aria-label={`${memberCount} nhân sự`}>
            {memberCount}
          </span>
        </button>
        {team.children && team.children.length > 0 ? (
          <div className={styles.teamChildren}>{team.children.map((child) => renderTeam(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  const activeCount = isAutoGroup ? autoGroupStaffOptions.length : selectedStaffIds.size;
  const parentExclusionIds = (() => {
    if (!teamEditor?.team) return new Set<number>();
    return new Set([teamEditor.team.id, ...teamDescendantIds(teamEditor.team)]);
  })();
  const parentOptions = allTeams
    .filter((team) => team.isActive && !parentExclusionIds.has(team.id) && Boolean(team.departmentId))
    .map((team) => ({
      value: team.id,
      label: `${team.department?.name || 'Department'} · ${team.name} (${team.code})`,
    }));

  return (
    <>
      <FeaturePage
        title="Cấu trúc Phòng ban & Đội nhóm"
        subtitle="Department xác định phạm vi vận hành; Team có thể lồng nhiều cấp để quản lý nhân sự, báo cáo và quyền truy cập."
        icon={<AppIcon icon={UsersRound} size="lg" />}
        tag={<StatusTag status="default" label="Quản trị" />}
        headerActions={
          <div className={styles.headerActions}>
            <Button type="primary" icon={<AppIcon icon={Plus} size="sm" />} onClick={() => openTeamEditor()}>
              Tạo team
            </Button>
            <IconButton
              label="Làm mới dữ liệu đội nhóm"
              icon={RefreshCw}
              onClick={handleRefresh}
              loading={loadingTeams || loadingDetail}
            />
          </div>
        }
        className={styles.page}
        contentClassName={styles.pageContent}
      >
        <div className={styles.layout}>
          <DataSection
            title={
              <span className={styles.sectionTitle}>
                <AppIcon icon={Settings2} size="sm" />
                Danh sách đội nhóm
              </span>
            }
            className={styles.directory}
            state={loadingTeams ? 'loading' : teamsError ? 'error' : teams.length === 0 ? 'empty' : undefined}
            stateTitle={teamsError || (teams.length === 0 ? 'Chưa có đội nhóm' : 'Đang tải đội nhóm')}
            stateDescription={teamsError ? 'Hãy thử làm mới lại danh sách.' : undefined}
            stateExtra={teamsError ? <Button onClick={() => void fetchTeams()}>Thử lại</Button> : undefined}
            stateMinHeight={360}
          >
            <nav className={styles.teamTree} aria-label="Danh sách đội nhóm">
              {departments.map((department) => {
                const departmentRoots = rootTeams.filter((team) => team.departmentId === department.id);
                const departmentTeamCount = flattenTeams(departmentRoots).length;
                return (
                  <section key={department.id} className={styles.departmentGroup} aria-label={department.name}>
                    <header className={styles.departmentHeading}>
                      <span>
                        <AppIcon icon={Building2} size="sm" />
                        <strong>{department.name}</strong>
                        <StatusTag status="default" label={department.code} bordered={false} />
                      </span>
                      <span className={styles.departmentCount}>{departmentTeamCount}</span>
                    </header>
                    {departmentRoots.length > 0 ? (
                      departmentRoots.map((team) => renderTeam(team))
                    ) : (
                      <p className={styles.departmentEmpty}>
                        Chưa có team. Bạn có thể tạo team trực thuộc Department này.
                      </p>
                    )}
                  </section>
                );
              })}
              {rootTeams.filter((team) => !team.departmentId).length > 0 ? (
                <section className={styles.departmentGroup} aria-label="Team chưa gán Department">
                  <header className={styles.departmentHeading}>
                    <span>
                      <AppIcon icon={Info} size="sm" />
                      <strong>Chưa gán Department</strong>
                    </span>
                  </header>
                  {rootTeams.filter((team) => !team.departmentId).map((team) => renderTeam(team))}
                </section>
              ) : null}
            </nav>
          </DataSection>

          <DataSection
            className={styles.detail}
            state={loadingDetail ? 'loading' : detailError ? 'error' : currentTeam ? undefined : 'empty'}
            stateTitle={detailError || (currentTeam ? undefined : 'Chọn một đội để cấu hình')}
            stateDescription={
              detailError
                ? 'Không thể tải dữ liệu đội hiện tại.'
                : 'Chọn đội từ danh sách bên trái để quản lý thành viên.'
            }
            stateExtra={
              detailError && selectedCode ? (
                <Button onClick={() => void fetchTeamDetail(selectedCode)}>Thử lại</Button>
              ) : undefined
            }
            stateMinHeight={440}
          >
            {currentTeam && (
              <div className={styles.detailStack}>
                <header className={styles.teamSummary}>
                  <div className={styles.teamSummaryMain}>
                    <span className={styles.teamSummaryIcon} aria-hidden>
                      <AppIcon icon={teamIcon(currentTeam.code)} size="lg" />
                    </span>
                    <span>
                      <span className={styles.teamSummaryTitle}>
                        <strong>{currentTeam.name}</strong>
                        <StatusTag status={teamStatus(currentTeam.code)} label={currentTeam.code} />
                        {currentTeam.department ? (
                          <StatusTag status="cyan" label={currentTeam.department.name} />
                        ) : (
                          <StatusTag status="warning" label="Chưa gán Department" />
                        )}
                        {isAutoGroup ? <StatusTag status="warning" label="Nhóm tự động" /> : null}
                        {!isAutoGroup && currentTeam.parentTeamId ? (
                          <StatusTag status="purple" label="Nhóm trực thuộc" />
                        ) : null}
                      </span>
                      <span className={styles.teamSummaryDescription}>
                        {currentTeam.description || 'Chưa có mô tả cho đội nhóm này.'}
                      </span>
                    </span>
                  </div>
                  <div className={styles.detailActions}>
                    <Button
                      type="primary"
                      icon={<AppIcon icon={Plus} size="sm" />}
                      onClick={() => openTeamEditor(undefined, currentTeam)}
                      disabled={!currentTeam.departmentId}
                    >
                      Tạo team con
                    </Button>
                    <Button icon={<AppIcon icon={Pencil} size="sm" />} onClick={() => openTeamEditor(currentTeam)}>
                      Sửa team
                    </Button>
                    <Tooltip title="Chỉ xóa team trống, không có thành viên hoặc team trực thuộc">
                      <Button
                        danger
                        icon={<AppIcon icon={Trash2} size="sm" />}
                        onClick={() => setTeamPendingDelete(currentTeam)}
                      >
                        Xóa
                      </Button>
                    </Tooltip>
                    <StatusTag
                      status={isAutoGroup ? 'warning' : 'success'}
                      icon={<AppIcon icon={Users} size="sm" />}
                      label={`${activeCount} / ${staffOptions.length} nhân sự`}
                      className={styles.teamSummaryCount}
                    />
                  </div>
                </header>

                {isAutoGroup ? (
                  <div className={styles.autoStack}>
                    <Alert
                      type="warning"
                      showIcon={false}
                      message={
                        <span className={styles.autoNoticeTitle}>
                          <AppIcon icon={Info} size="sm" />
                          Nhóm tự động / Khác ({currentTeam.code})
                        </span>
                      }
                      description={
                        <span>
                          Hệ thống tự động gom nhân sự chưa thuộc đội cụ thể; hiện đang loại trừ{' '}
                          <strong>{definedTeamStaffIds.size}</strong> nhân sự đã thuộc Telesales, CS, Control hoặc các
                          đội khác.
                        </span>
                      }
                    />

                    <SectionCard
                      title={
                        <span className={styles.sectionTitle}>
                          <AppIcon icon={Users} size="sm" />
                          Nhân sự chưa phân nhóm
                        </span>
                      }
                      extra={<StatusTag status="warning" label={`${availablePoolOptions.length} nhân sự`} />}
                      className={styles.innerSection}
                      bodyPadding="var(--mos-density-padding)"
                    >
                      <SearchField
                        behavior="filter"
                        value={poolSearchText}
                        onChange={(event) => setPoolSearchText(event.target.value)}
                        placeholder="Tìm nhân sự không dấu…"
                      />
                      <div className={styles.staffList}>
                        {availablePoolOptions.length === 0 ? (
                          <StatePanel
                            kind="empty"
                            title="Không tìm thấy nhân sự phù hợp"
                            surface={false}
                            minHeight={180}
                          />
                        ) : (
                          availablePoolOptions.map((staff) => (
                            <div key={staff.staffId} className={styles.staffRow}>
                              <StaffIdentity staff={staff} />
                              <StatusTag status="default" label="Tự động" />
                            </div>
                          ))
                        )}
                      </div>
                    </SectionCard>
                  </div>
                ) : (
                  <>
                    <div className={styles.editorGrid}>
                      <SectionCard
                        title={
                          <span className={styles.sectionTitle}>
                            <AppIcon icon={UserRoundPlus} size="sm" />
                            Kho nhân sự
                            <StatusTag status="processing" label={String(availablePoolOptions.length)} />
                          </span>
                        }
                        extra={
                          availablePoolOptions.length > 0 ? (
                            <Button type="link" icon={<AppIcon icon={Plus} size="sm" />} onClick={handleAddAllFiltered}>
                              Thêm kết quả
                            </Button>
                          ) : null
                        }
                        className={styles.innerSection}
                        bodyPadding="var(--mos-density-padding)"
                      >
                        <div className={styles.panelControls}>
                          <SearchField
                            behavior="filter"
                            value={poolSearchText}
                            onChange={(event) => setPoolSearchText(event.target.value)}
                            placeholder="Tìm nhân sự không dấu…"
                          />
                          <div className={styles.roleFilters} role="group" aria-label="Lọc nhân sự theo vai trò">
                            {ROLE_FILTERS.map((filter) => (
                              <button
                                key={filter.value}
                                type="button"
                                data-active={roleFilter === filter.value || undefined}
                                onClick={() => setRoleFilter(filter.value)}
                              >
                                {filter.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className={styles.staffList}>
                          {availablePoolOptions.length === 0 ? (
                            <StatePanel
                              kind="empty"
                              title="Không tìm thấy nhân sự phù hợp"
                              surface={false}
                              minHeight={220}
                            />
                          ) : (
                            availablePoolOptions.map((staff) => {
                              const active = selectedStaffIds.has(staff.staffId);
                              return (
                                <div
                                  key={staff.staffId}
                                  className={styles.staffRow}
                                  data-selected={active || undefined}
                                >
                                  <StaffIdentity staff={staff} active={active} />
                                  {active ? (
                                    <StatusTag
                                      status="success"
                                      icon={<AppIcon icon={CheckCircle2} size="sm" />}
                                      label="Đã chọn"
                                    />
                                  ) : (
                                    <Button
                                      type="text"
                                      icon={<AppIcon icon={Plus} size="sm" />}
                                      onClick={() => handleAddStaff(staff.staffId)}
                                    >
                                      Thêm
                                    </Button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </SectionCard>

                      <SectionCard
                        title={
                          <span className={styles.sectionTitle}>
                            <AppIcon icon={CheckCircle2} size="sm" />
                            Thành viên đội
                            <StatusTag status="success" label={String(selectedStaffIds.size)} />
                          </span>
                        }
                        extra={
                          selectedStaffIds.size > 0 ? (
                            <Button
                              type="link"
                              danger
                              icon={<AppIcon icon={Trash2} size="sm" />}
                              onClick={handleClearAllActive}
                            >
                              Bỏ tất cả
                            </Button>
                          ) : null
                        }
                        className={styles.innerSection}
                        bodyPadding="var(--mos-density-padding)"
                      >
                        <div className={styles.panelControls}>
                          <SearchField
                            behavior="filter"
                            value={activeSearchText}
                            onChange={(event) => setActiveSearchText(event.target.value)}
                            placeholder="Tìm trong danh sách đã chọn…"
                          />
                        </div>

                        <div className={styles.staffList}>
                          {activeMembers.length === 0 ? (
                            <StatePanel
                              kind="empty"
                              title={
                                selectedStaffIds.size === 0
                                  ? 'Chưa có nhân sự trong đội'
                                  : 'Không tìm thấy nhân sự phù hợp'
                              }
                              surface={false}
                              minHeight={220}
                            />
                          ) : (
                            activeMembers.map((staff) => (
                              <div key={staff.staffId} className={styles.staffRow} data-selected>
                                <StaffIdentity staff={staff} active />
                                <Tooltip title="Bỏ khỏi đội">
                                  <IconButton
                                    label={`Bỏ ${staff.displayName} khỏi đội`}
                                    icon={X}
                                    danger
                                    tooltip={false}
                                    onClick={() => handleRemoveStaff(staff.staffId)}
                                  />
                                </Tooltip>
                              </div>
                            ))
                          )}
                        </div>
                      </SectionCard>
                    </div>

                    <footer className={styles.saveBar}>
                      <p>
                        Các thành viên đã chọn sẽ được áp dụng cho báo cáo và leaderboard của đội{' '}
                        <strong>{currentTeam.name}</strong> sau khi lưu.
                      </p>
                      <Button
                        type="primary"
                        size="large"
                        icon={<AppIcon icon={Save} size="action" />}
                        onClick={() => void handleSaveMembers()}
                        loading={saving}
                      >
                        Lưu cấu hình ({selectedStaffIds.size})
                      </Button>
                    </footer>
                  </>
                )}
              </div>
            )}
          </DataSection>
        </div>
      </FeaturePage>

      <EntityFormDrawer
        title={teamEditor?.team ? `Sửa team · ${teamEditor.team.name}` : 'Tạo team mới'}
        open={Boolean(teamEditor)}
        onClose={closeTeamEditor}
        destroyOnHidden
        footer={
          <Space wrap>
            <Button onClick={closeTeamEditor} disabled={savingTeam}>
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<AppIcon icon={Save} size="sm" />}
              loading={savingTeam}
              onClick={() => teamForm.submit()}
            >
              {teamEditor?.team ? 'Lưu thay đổi' : 'Tạo team'}
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          className={styles.editorNotice}
          message="Department là phạm vi vận hành; Team là đơn vị nhân sự"
          description="Team trực thuộc sẽ tự động kế thừa Department của team cha. Mã team là khóa tích hợp ổn định nên không đổi sau khi tạo."
        />
        <EntityForm<TeamFormValues> form={teamForm} columns={2} onFinish={handleSaveTeam}>
          <EntityFormField
            name="name"
            label="Tên team"
            rules={[{ required: true, whitespace: true, message: 'Nhập tên team.' }]}
          >
            <Input autoFocus placeholder="Ví dụ: Academy Admissions" maxLength={120} />
          </EntityFormField>

          <EntityFormField
            name="code"
            label="Mã team"
            rules={[
              { required: true, whitespace: true, message: 'Nhập mã team.' },
              { pattern: /^[A-Za-z][A-Za-z0-9_]{1,29}$/, message: 'Dùng chữ, số và dấu gạch dưới; bắt đầu bằng chữ.' },
            ]}
            extra={teamEditor?.team ? 'Mã team không thể thay đổi sau khi tạo.' : 'Ví dụ: ACADEMY_ADMISSIONS'}
          >
            <Input disabled={Boolean(teamEditor?.team)} placeholder="ACADEMY_ADMISSIONS" maxLength={30} />
          </EntityFormField>

          <EntityFormField name="parentTeamId" label="Team cha (không bắt buộc)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn để tạo team trực thuộc"
              options={parentOptions}
              onChange={(parentId) => {
                const parent = allTeams.find((team) => team.id === parentId);
                if (parent?.departmentId) teamForm.setFieldValue('departmentId', parent.departmentId);
              }}
            />
          </EntityFormField>

          <EntityFormField
            name="departmentId"
            label="Department"
            rules={[{ required: true, message: 'Chọn Department.' }]}
            extra="Team trực thuộc sẽ kế thừa Department từ team cha."
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn phạm vi vận hành"
              options={departments
                .filter((department) => department.isActive)
                .map((department) => ({ value: department.id, label: `${department.name} (${department.code})` }))}
            />
          </EntityFormField>

          <EntityFormField name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber min={0} precision={0} className="w-full tabular-nums" />
          </EntityFormField>

          <EntityFormField name="isActive" label="Đang hoạt động" valuePropName="checked">
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </EntityFormField>

          <EntityFormField name="description" label="Mô tả" fullWidth>
            <Input.TextArea rows={3} placeholder="Vai trò, phạm vi và quy ước vận hành của team…" maxLength={500} />
          </EntityFormField>
        </EntityForm>
      </EntityFormDrawer>

      <AdaptiveModal
        intent="confirm"
        open={Boolean(teamPendingDelete)}
        title="Xóa team?"
        okText="Xóa team"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: savingTeam }}
        onOk={() => void handleDeleteTeam()}
        onCancel={() => setTeamPendingDelete(null)}
      >
        <p>
          Bạn sắp xóa <strong>{teamPendingDelete?.name}</strong>. Chỉ team trống, không có thành viên và không có team
          trực thuộc mới xóa được; lịch sử nhân sự sẽ không bị xóa ngầm.
        </p>
      </AdaptiveModal>
    </>
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<StatePanel kind="loading" title="Đang tải cấu hình đội nhóm" minHeight={360} />}>
      <TeamsContent />
    </Suspense>
  );
}
