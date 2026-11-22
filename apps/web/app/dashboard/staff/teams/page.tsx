'use client';

import React, { Suspense } from 'react';
import { Button } from 'antd';
import { Plus, RefreshCw, UsersRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AppIcon, FeaturePage, IconButton, StatePanel, StatusTag } from '~/components/ui';
import styles from './teams.module.css';
import { TeamDeleteModal } from './teams-page-modules/TeamDeleteModal';
import { TeamDetailPanel } from './teams-page-modules/TeamDetailPanel';
import { TeamEditorDrawer } from './teams-page-modules/TeamEditorDrawer';
import { TeamsDirectoryPanel } from './teams-page-modules/TeamsDirectoryPanel';
import { useTeamsPageState } from './teams-page-modules/useTeamsPageState';

function TeamsContent() {
  const searchParams = useSearchParams();
  const initialSelectedCode = searchParams.get('selected') || 'CC';
  const state = useTeamsPageState(initialSelectedCode);

  return (
    <>
      <FeaturePage
        title="Cấu trúc Phòng ban & Đội nhóm"
        subtitle="Department xác định phạm vi vận hành; Team có thể lồng nhiều cấp để quản lý nhân sự, báo cáo và quyền truy cập."
        icon={<AppIcon icon={UsersRound} size="lg" />}
        tag={<StatusTag status="default" label="Quản trị" />}
        headerActions={
          <div className={styles.headerActions}>
            <Button type="primary" icon={<AppIcon icon={Plus} size="sm" />} onClick={() => state.openTeamEditor()}>
              Tạo team
            </Button>
            <IconButton
              label="Làm mới dữ liệu đội nhóm"
              icon={RefreshCw}
              onClick={state.handleRefresh}
              loading={state.loadingTeams || state.loadingDetail}
            />
          </div>
        }
        className={styles.page}
        contentClassName={styles.pageContent}
      >
        <div className={styles.layout}>
          <TeamsDirectoryPanel
            loadingTeams={state.loadingTeams}
            teamsError={state.teamsError}
            teams={state.teams}
            departments={state.departments}
            rootTeams={state.rootTeams}
            selectedCode={state.selectedCode}
            onSelectTeam={state.setSelectedCode}
            onRetryFetch={() => void state.fetchTeams()}
          />

          <TeamDetailPanel
            loadingDetail={state.loadingDetail}
            detailError={state.detailError}
            selectedCode={state.selectedCode}
            currentTeam={state.currentTeam}
            isAutoGroup={state.isAutoGroup}
            activeCount={state.activeCount}
            staffTotalCount={state.staffOptions.length}
            definedTeamStaffCount={state.definedTeamStaffIds.size}
            availablePoolOptions={state.availablePoolOptions}
            activeMembers={state.activeMembers}
            selectedStaffIds={state.selectedStaffIds}
            poolSearchText={state.poolSearchText}
            activeSearchText={state.activeSearchText}
            roleFilter={state.roleFilter}
            saving={state.saving}
            onRetryDetail={(code) => void state.fetchTeamDetail(code)}
            onCreateChildTeam={(parent) => state.openTeamEditor(undefined, parent)}
            onEditTeam={(team) => state.openTeamEditor(team)}
            onRequestDeleteTeam={state.setTeamPendingDelete}
            onPoolSearchChange={state.setPoolSearchText}
            onActiveSearchChange={state.setActiveSearchText}
            onRoleFilterChange={state.setRoleFilter}
            onAddStaff={state.handleAddStaff}
            onRemoveStaff={state.handleRemoveStaff}
            onAddAllFiltered={state.handleAddAllFiltered}
            onClearAllActive={state.handleClearAllActive}
            onSaveMembers={() => void state.handleSaveMembers()}
          />
        </div>
      </FeaturePage>

      <TeamEditorDrawer
        teamEditor={state.teamEditor}
        teamForm={state.teamForm}
        savingTeam={state.savingTeam}
        allTeams={state.allTeams}
        parentOptions={state.parentOptions}
        departmentOptions={state.departmentOptions}
        onClose={state.closeTeamEditor}
        onSubmit={(values) => void state.handleSaveTeam(values)}
      />

      <TeamDeleteModal
        teamPendingDelete={state.teamPendingDelete}
        savingTeam={state.savingTeam}
        onConfirmDelete={() => void state.handleDeleteTeam()}
        onCancel={() => state.setTeamPendingDelete(null)}
      />
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
