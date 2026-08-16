'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, message, Tooltip } from 'antd';
import {
  Boxes,
  CheckCircle2,
  Gem,
  Headphones,
  Info,
  PhoneCall,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { removeVietnameseTones, type Team, type TeamStaffOption } from '@mos-lab/shared';
import {
  AppIcon,
  DataSection,
  FeaturePage,
  IconButton,
  SearchField,
  SectionCard,
  StatePanel,
  StatusTag,
  type StatusType,
} from '~/components/ui';
import { apiClient } from '../../../../lib/api-client';
import styles from './teams.module.css';

type RoleFilter = 'ALL' | 'CC' | 'CV' | 'BK' | 'OTHER';

const ROLE_FILTERS: ReadonlyArray<{ label: string; value: RoleFilter }> = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'CC', value: 'CC' },
  { label: 'KTV/CV', value: 'CV' },
  { label: 'Booker', value: 'BK' },
  { label: 'Khác', value: 'OTHER' },
];

function teamStatus(code: string): StatusType {
  if (code === 'CC') return 'processing';
  if (code === 'CV') return 'success';
  if (code === 'BK') return 'warning';
  if (code.includes('TELESALES')) return 'orange';
  if (code.includes('CS')) return 'cyan';
  if (code.includes('CONTROL')) return 'purple';
  return 'default';
}

function teamIcon(code: string): LucideIcon {
  if (code === 'CC') return Gem;
  if (code === 'CV') return Scissors;
  if (code === 'BK') return PhoneCall;
  if (code.includes('TELESALES')) return Headphones;
  if (code.includes('CS')) return UserRoundPlus;
  if (code.includes('CONTROL')) return ShieldCheck;
  if (code.includes('OTHER')) return Boxes;
  return Users;
}

function staffInitial(staff: TeamStaffOption) {
  return staff.displayName.trim().charAt(0).toUpperCase() || '?';
}

function StaffIdentity({ staff, active = false }: { staff: TeamStaffOption; active?: boolean }) {
  return (
    <div className={styles.staffIdentity}>
      <span className={`${styles.staffAvatar} ${active ? styles.staffAvatarActive : ''}`} aria-hidden>
        {staffInitial(staff)}
      </span>
      <span className={styles.staffText}>
        <strong>{staff.displayName}</strong>
        <span className={styles.staffMeta}>
          <span className="tabular-nums">#{staff.staffId}</span>
          {staff.username && <span>@{staff.username}</span>}
          {staff.role && <span>{staff.role}</span>}
        </span>
      </span>
    </div>
  );
}

function TeamsContent() {
  const searchParams = useSearchParams();
  const initialSelectedCode = searchParams.get('selected') || 'CC';

  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [teamsError, setTeamsError] = useState<string>();
  const [detailError, setDetailError] = useState<string>();

  const [teams, setTeams] = useState<Team[]>([]);
  const rootTeams = useMemo(() => teams.filter((team) => !team.parentTeamId), [teams]);
  const [selectedCode, setSelectedCode] = useState(initialSelectedCode);

  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [staffOptions, setStaffOptions] = useState<TeamStaffOption[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());

  const [poolSearchText, setPoolSearchText] = useState('');
  const [activeSearchText, setActiveSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  const isAutoGroup = Boolean(currentTeam && (currentTeam.code === 'BK_OTHER' || currentTeam.code.endsWith('_OTHER')));

  const definedTeamStaffIds = useMemo(() => {
    const staffIds = new Set<number>();
    teams.forEach((root) => {
      if (root.activeStaffIds && !root.code.endsWith('_OTHER') && root.code !== currentTeam?.code) {
        root.activeStaffIds.forEach((staffId) => staffIds.add(staffId));
      }
      root.children?.forEach((child) => {
        if (child.activeStaffIds && !child.code.endsWith('_OTHER') && child.code !== currentTeam?.code) {
          child.activeStaffIds.forEach((staffId) => staffIds.add(staffId));
        }
      });
    });
    return staffIds;
  }, [currentTeam?.code, teams]);

  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    setTeamsError(undefined);
    try {
      const response = await apiClient.teams.list();
      setTeams(response.teams || []);
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
        previous.map((team) => {
          if (team.code === code) return { ...team, memberCount: activeStaffIds.size };
          if (!team.children) return team;
          return {
            ...team,
            children: team.children.map((child) =>
              child.code === code ? { ...child, memberCount: activeStaffIds.size } : child
            ),
          };
        })
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

  const handleRefresh = () => {
    void fetchTeams();
    if (selectedCode) void fetchTeamDetail(selectedCode);
  };

  const renderTeam = (team: Team, child = false) => {
    const active = selectedCode === team.code;
    const memberCount = team.memberCount ?? 0;
    return (
      <button
        key={team.code}
        type="button"
        className={styles.teamItem}
        data-active={active || undefined}
        data-child={child || undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => setSelectedCode(team.code)}
      >
        <span className={styles.teamItemIcon} aria-hidden>
          <AppIcon icon={teamIcon(team.code)} size="sm" />
        </span>
        <span className={styles.teamItemCopy}>
          <span className={styles.teamItemTitle}>
            <strong>{team.name}</strong>
            <StatusTag status={teamStatus(team.code)} label={team.code} bordered={false} className={styles.teamCode} />
          </span>
          <span className={styles.teamItemDescription}>{team.description || 'Chưa có mô tả đội nhóm.'}</span>
        </span>
        <span className={styles.memberCount} aria-label={`${memberCount} nhân sự`}>
          {memberCount}
        </span>
      </button>
    );
  };

  const activeCount = isAutoGroup ? autoGroupStaffOptions.length : selectedStaffIds.size;

  return (
    <FeaturePage
      title="Cấu hình Đội Nhóm"
      subtitle="Quản lý nhân sự thuộc đội CC, CV, BK và các nhóm trực thuộc; các thay đổi chỉ áp dụng sau khi lưu."
      icon={<AppIcon icon={UsersRound} size="lg" />}
      tag={<StatusTag status="default" label="Quản trị" />}
      headerActions={
        <IconButton
          label="Làm mới dữ liệu đội nhóm"
          icon={RefreshCw}
          onClick={handleRefresh}
          loading={loadingTeams || loadingDetail}
        />
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
          state={loadingTeams ? 'loading' : teamsError ? 'error' : rootTeams.length === 0 ? 'empty' : undefined}
          stateTitle={teamsError || (rootTeams.length === 0 ? 'Chưa có đội nhóm' : 'Đang tải đội nhóm')}
          stateDescription={teamsError ? 'Hãy thử làm mới lại danh sách.' : undefined}
          stateExtra={teamsError ? <Button onClick={() => void fetchTeams()}>Thử lại</Button> : undefined}
          stateMinHeight={360}
        >
          <nav className={styles.teamTree} aria-label="Danh sách đội nhóm">
            {rootTeams.map((root) => (
              <div key={root.code} className={styles.teamBranch}>
                {renderTeam(root)}
                {root.children && root.children.length > 0 && (
                  <div className={styles.teamChildren}>{root.children.map((child) => renderTeam(child, true))}</div>
                )}
              </div>
            ))}
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
                <StatusTag
                  status={isAutoGroup ? 'warning' : 'success'}
                  icon={<AppIcon icon={Users} size="sm" />}
                  label={`${activeCount} / ${staffOptions.length} nhân sự`}
                  className={styles.teamSummaryCount}
                />
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
                        <strong>{definedTeamStaffIds.size}</strong> nhân sự đã thuộc Telesales, CS, Control hoặc các đội
                        khác.
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
                              <div key={staff.staffId} className={styles.staffRow} data-selected={active || undefined}>
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
  );
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<StatePanel kind="loading" title="Đang tải cấu hình đội nhóm" minHeight={360} />}>
      <TeamsContent />
    </Suspense>
  );
}
