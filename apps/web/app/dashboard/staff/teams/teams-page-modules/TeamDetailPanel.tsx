'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { Team, TeamStaffOption } from '@mos-lab/shared';
import { AppIcon, DataSection, StatusTag } from '~/components/ui';
import { teamIcon, teamStatus, type RoleFilter } from '../teams-page.helpers';
import styles from '../teams.module.css';
import { TeamAutoGroupSection } from './TeamAutoGroupSection';
import { TeamMemberEditorGrid } from './TeamMemberEditorGrid';

export interface TeamDetailPanelProps {
  loadingDetail: boolean;
  detailError?: string;
  selectedCode: string;
  currentTeam: Team | null;
  isAutoGroup: boolean;
  activeCount: number;
  staffTotalCount: number;
  definedTeamStaffCount: number;
  availablePoolOptions: TeamStaffOption[];
  activeMembers: TeamStaffOption[];
  selectedStaffIds: Set<number>;
  poolSearchText: string;
  activeSearchText: string;
  roleFilter: RoleFilter;
  saving: boolean;
  onRetryDetail: (code: string) => void;
  onCreateChildTeam: (parent: Team) => void;
  onEditTeam: (team: Team) => void;
  onRequestDeleteTeam: (team: Team) => void;
  onPoolSearchChange: (value: string) => void;
  onActiveSearchChange: (value: string) => void;
  onRoleFilterChange: (role: RoleFilter) => void;
  onAddStaff: (staffId: number) => void;
  onRemoveStaff: (staffId: number) => void;
  onAddAllFiltered: () => void;
  onClearAllActive: () => void;
  onSaveMembers: () => void;
}

export function TeamDetailPanel({
  loadingDetail,
  detailError,
  selectedCode,
  currentTeam,
  isAutoGroup,
  activeCount,
  staffTotalCount,
  definedTeamStaffCount,
  availablePoolOptions,
  activeMembers,
  selectedStaffIds,
  poolSearchText,
  activeSearchText,
  roleFilter,
  saving,
  onRetryDetail,
  onCreateChildTeam,
  onEditTeam,
  onRequestDeleteTeam,
  onPoolSearchChange,
  onActiveSearchChange,
  onRoleFilterChange,
  onAddStaff,
  onRemoveStaff,
  onAddAllFiltered,
  onClearAllActive,
  onSaveMembers,
}: TeamDetailPanelProps) {
  return (
    <DataSection
      className={styles.detail}
      state={loadingDetail ? 'loading' : detailError ? 'error' : currentTeam ? undefined : 'empty'}
      stateTitle={detailError || (currentTeam ? undefined : 'Chọn một đội để cấu hình')}
      stateDescription={
        detailError ? 'Không thể tải dữ liệu đội hiện tại.' : 'Chọn đội từ danh sách bên trái để quản lý thành viên.'
      }
      stateExtra={
        detailError && selectedCode ? <Button onClick={() => onRetryDetail(selectedCode)}>Thử lại</Button> : undefined
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
                onClick={() => onCreateChildTeam(currentTeam)}
                disabled={!currentTeam.departmentId}
              >
                Tạo team con
              </Button>
              <Button icon={<AppIcon icon={Pencil} size="sm" />} onClick={() => onEditTeam(currentTeam)}>
                Sửa team
              </Button>
              <Tooltip title="Chỉ xóa team trống, không có thành viên hoặc team trực thuộc">
                <Button
                  danger
                  icon={<AppIcon icon={Trash2} size="sm" />}
                  onClick={() => onRequestDeleteTeam(currentTeam)}
                >
                  Xóa
                </Button>
              </Tooltip>
              <StatusTag
                status={isAutoGroup ? 'warning' : 'success'}
                icon={<AppIcon icon={Users} size="sm" />}
                label={`${activeCount} / ${staffTotalCount} nhân sự`}
                className={styles.teamSummaryCount}
              />
            </div>
          </header>

          {isAutoGroup ? (
            <TeamAutoGroupSection
              currentTeam={currentTeam}
              definedTeamStaffCount={definedTeamStaffCount}
              poolSearchText={poolSearchText}
              onPoolSearchChange={onPoolSearchChange}
              availablePoolOptions={availablePoolOptions}
            />
          ) : (
            <TeamMemberEditorGrid
              currentTeam={currentTeam}
              availablePoolOptions={availablePoolOptions}
              activeMembers={activeMembers}
              selectedStaffIds={selectedStaffIds}
              poolSearchText={poolSearchText}
              activeSearchText={activeSearchText}
              roleFilter={roleFilter}
              saving={saving}
              onPoolSearchChange={onPoolSearchChange}
              onActiveSearchChange={onActiveSearchChange}
              onRoleFilterChange={onRoleFilterChange}
              onAddStaff={onAddStaff}
              onRemoveStaff={onRemoveStaff}
              onAddAllFiltered={onAddAllFiltered}
              onClearAllActive={onClearAllActive}
              onSaveMembers={onSaveMembers}
            />
          )}
        </div>
      )}
    </DataSection>
  );
}
