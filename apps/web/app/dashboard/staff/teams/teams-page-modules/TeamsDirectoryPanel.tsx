'use client';

import React from 'react';
import { Button } from 'antd';
import { Building2, Info, Settings2 } from 'lucide-react';
import type { Department, Team } from '@mos-lab/shared';
import { AppIcon, DataSection, StatusTag } from '~/components/ui';
import { flattenTeams, teamIcon, teamStatus } from '../teams-page.helpers';
import styles from '../teams.module.css';

interface TeamBranchNodeProps {
  team: Team;
  depth?: number;
  selectedCode: string;
  onSelectTeam: (code: string) => void;
}

function TeamBranchNode({ team, depth = 0, selectedCode, onSelectTeam }: TeamBranchNodeProps) {
  const active = selectedCode === team.code;
  const memberCount = team.memberCount ?? 0;

  return (
    <div className={styles.teamBranch}>
      <button
        type="button"
        className={styles.teamItem}
        data-active={active || undefined}
        data-child={depth > 0 || undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => onSelectTeam(team.code)}
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
      {team.children && team.children.length > 0 ? (
        <div className={styles.teamChildren}>
          {team.children.map((child) => (
            <TeamBranchNode
              key={child.code}
              team={child}
              depth={depth + 1}
              selectedCode={selectedCode}
              onSelectTeam={onSelectTeam}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface TeamsDirectoryPanelProps {
  loadingTeams: boolean;
  teamsError?: string;
  teams: Team[];
  departments: Department[];
  rootTeams: Team[];
  selectedCode: string;
  onSelectTeam: (code: string) => void;
  onRetryFetch: () => void;
}

export function TeamsDirectoryPanel({
  loadingTeams,
  teamsError,
  teams,
  departments,
  rootTeams,
  selectedCode,
  onSelectTeam,
  onRetryFetch,
}: TeamsDirectoryPanelProps) {
  const unassignedRoots = rootTeams.filter((team) => !team.departmentId);

  return (
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
      stateExtra={teamsError ? <Button onClick={onRetryFetch}>Thử lại</Button> : undefined}
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
                departmentRoots.map((team) => (
                  <TeamBranchNode key={team.code} team={team} selectedCode={selectedCode} onSelectTeam={onSelectTeam} />
                ))
              ) : (
                <p className={styles.departmentEmpty}>Chưa có team. Bạn có thể tạo team trực thuộc Department này.</p>
              )}
            </section>
          );
        })}
        {unassignedRoots.length > 0 ? (
          <section className={styles.departmentGroup} aria-label="Team chưa gán Department">
            <header className={styles.departmentHeading}>
              <span>
                <AppIcon icon={Info} size="sm" />
                <strong>Chưa gán Department</strong>
              </span>
            </header>
            {unassignedRoots.map((team) => (
              <TeamBranchNode key={team.code} team={team} selectedCode={selectedCode} onSelectTeam={onSelectTeam} />
            ))}
          </section>
        ) : null}
      </nav>
    </DataSection>
  );
}
