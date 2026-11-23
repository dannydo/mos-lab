'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { CheckCircle2, Plus, Save, Trash2, UserRoundPlus, X } from 'lucide-react';
import type { Team, TeamStaffOption } from '@mos-lab/shared';
import { AppIcon, IconButton, SearchField, SectionCard, StatePanel, StatusTag } from '~/components/ui';
import { ROLE_FILTERS, StaffIdentity, type RoleFilter } from '../teams-page.helpers';
import styles from '../teams.module.css';

export interface TeamMemberEditorGridProps {
  currentTeam: Team;
  availablePoolOptions: TeamStaffOption[];
  activeMembers: TeamStaffOption[];
  selectedStaffIds: Set<number>;
  poolSearchText: string;
  activeSearchText: string;
  roleFilter: RoleFilter;
  saving: boolean;
  onPoolSearchChange: (value: string) => void;
  onActiveSearchChange: (value: string) => void;
  onRoleFilterChange: (role: RoleFilter) => void;
  onAddStaff: (staffId: number) => void;
  onRemoveStaff: (staffId: number) => void;
  onAddAllFiltered: () => void;
  onClearAllActive: () => void;
  onSaveMembers: () => void;
}

export function TeamMemberEditorGrid({
  currentTeam,
  availablePoolOptions,
  activeMembers,
  selectedStaffIds,
  poolSearchText,
  activeSearchText,
  roleFilter,
  saving,
  onPoolSearchChange,
  onActiveSearchChange,
  onRoleFilterChange,
  onAddStaff,
  onRemoveStaff,
  onAddAllFiltered,
  onClearAllActive,
  onSaveMembers,
}: TeamMemberEditorGridProps) {
  return (
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
              <Button type="link" icon={<AppIcon icon={Plus} size="sm" />} onClick={onAddAllFiltered}>
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
              onChange={(event) => onPoolSearchChange(event.target.value)}
              placeholder="Tìm nhân sự không dấu…"
            />
            <div className={styles.roleFilters} role="group" aria-label="Lọc nhân sự theo vai trò">
              {ROLE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  data-active={roleFilter === filter.value || undefined}
                  onClick={() => onRoleFilterChange(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.staffList}>
            {availablePoolOptions.length === 0 ? (
              <StatePanel kind="empty" title="Không tìm thấy nhân sự phù hợp" surface={false} minHeight={220} />
            ) : (
              availablePoolOptions.map((staff) => {
                const active = selectedStaffIds.has(staff.staffId);
                return (
                  <div key={staff.staffId} className={styles.staffRow} data-selected={active || undefined}>
                    <StaffIdentity staff={staff} active={active} />
                    {active ? (
                      <StatusTag status="success" icon={<AppIcon icon={CheckCircle2} size="sm" />} label="Đã chọn" />
                    ) : (
                      <Button
                        type="text"
                        icon={<AppIcon icon={Plus} size="sm" />}
                        onClick={() => onAddStaff(staff.staffId)}
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
              <Button type="link" danger icon={<AppIcon icon={Trash2} size="sm" />} onClick={onClearAllActive}>
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
              onChange={(event) => onActiveSearchChange(event.target.value)}
              placeholder="Tìm trong danh sách đã chọn…"
            />
          </div>

          <div className={styles.staffList}>
            {activeMembers.length === 0 ? (
              <StatePanel
                kind="empty"
                title={selectedStaffIds.size === 0 ? 'Chưa có nhân sự trong đội' : 'Không tìm thấy nhân sự phù hợp'}
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
                      onClick={() => onRemoveStaff(staff.staffId)}
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
          Các thành viên đã chọn sẽ được áp dụng cho báo cáo và leaderboard của đội <strong>{currentTeam.name}</strong>{' '}
          sau khi lưu.
        </p>
        <Button
          type="primary"
          size="large"
          icon={<AppIcon icon={Save} size="action" />}
          onClick={onSaveMembers}
          loading={saving}
        >
          Lưu cấu hình ({selectedStaffIds.size})
        </Button>
      </footer>
    </>
  );
}
