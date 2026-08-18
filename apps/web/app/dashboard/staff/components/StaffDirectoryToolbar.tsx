'use client';

import React from 'react';
import { Select } from 'antd';
import { X } from 'lucide-react';
import { type Role, vietnameseSearchFilter } from '@mos-lab/shared';
import { FeatureToolbar, IconButton, SearchField } from '~/components/ui';

interface StaffDirectoryToolbarProps {
  roles: Role[];
  searchQuery: string;
  filterRole: string;
  onSearchQueryChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onClear: () => void;
}

/** Shared toolbar for the active and locked staff directories. */
export function StaffDirectoryToolbar({
  roles,
  searchQuery,
  filterRole,
  onSearchQueryChange,
  onFilterRoleChange,
  onClear,
}: StaffDirectoryToolbarProps) {
  const hasActiveFilters = Boolean(searchQuery.trim()) || filterRole !== 'all';

  return (
    <FeatureToolbar
      className="staff-directory-toolbar"
      primary={
        <SearchField
          behavior="filter"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Tìm tên, email hoặc tên đăng nhập…"
          aria-label="Tìm nhân sự"
          allowClear
          style={{ maxWidth: '100%', width: 440 }}
        />
      }
      filters={
        <Select
          value={filterRole === 'all' ? undefined : filterRole}
          onChange={(value) => onFilterRoleChange(value || 'all')}
          options={[
            { value: 'all', label: 'Tất cả vai trò' },
            ...roles.map((role) => ({ value: role.key, label: role.name })),
          ]}
          placeholder="Lọc theo vai trò"
          aria-label="Lọc theo vai trò"
          allowClear
          showSearch
          filterOption={vietnameseSearchFilter}
          style={{ width: 240 }}
        />
      }
      actions={<IconButton label="Xóa bộ lọc nhân sự" icon={X} disabled={!hasActiveFilters} onClick={onClear} />}
      filterTitle="Lọc danh sách nhân sự"
      filterTriggerLabel="Lọc nhân sự"
      activeFilterCount={hasActiveFilters ? 1 : 0}
    />
  );
}

export default React.memo(StaffDirectoryToolbar);
