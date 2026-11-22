'use client';

import React from 'react';
import { Alert } from 'antd';
import { Info, Users } from 'lucide-react';
import type { Team, TeamStaffOption } from '@mos-lab/shared';
import { AppIcon, SearchField, SectionCard, StatePanel, StatusTag } from '~/components/ui';
import { StaffIdentity } from '../teams-page.helpers';
import styles from '../teams.module.css';

export interface TeamAutoGroupSectionProps {
  currentTeam: Team;
  definedTeamStaffCount: number;
  poolSearchText: string;
  onPoolSearchChange: (value: string) => void;
  availablePoolOptions: TeamStaffOption[];
}

export function TeamAutoGroupSection({
  currentTeam,
  definedTeamStaffCount,
  poolSearchText,
  onPoolSearchChange,
  availablePoolOptions,
}: TeamAutoGroupSectionProps) {
  return (
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
            <strong>{definedTeamStaffCount}</strong> nhân sự đã thuộc Telesales, CS, Control hoặc các đội khác.
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
          onChange={(event) => onPoolSearchChange(event.target.value)}
          placeholder="Tìm nhân sự không dấu…"
        />
        <div className={styles.staffList}>
          {availablePoolOptions.length === 0 ? (
            <StatePanel kind="empty" title="Không tìm thấy nhân sự phù hợp" surface={false} minHeight={180} />
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
  );
}
