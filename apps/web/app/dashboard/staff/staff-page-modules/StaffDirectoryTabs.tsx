'use client';

import React from 'react';
import { Badge, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { KeyRound, Lock, User } from 'lucide-react';
import type { Role, Staff } from '@mos-lab/shared';
import { AppIcon, DataTable } from '~/components/ui';
import { StaffDirectoryToolbar } from '../components/StaffDirectoryToolbar';
import { STAFF_PAGE_SIZE_OPTIONS } from './staffPageConstants';

export interface StaffDirectoryTabsProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  activeCount: number;
  lockedCount: number;
  roles: Role[];
  rolesLoading: boolean;
  staffList: Staff[];
  staffColumns: ColumnsType<Staff>;
  roleColumns: ColumnsType<Role>;
  loading: boolean;
  canManageStaff: boolean;
  selectedRowKeys: React.Key[];
  onSelectedRowKeysChange: (keys: React.Key[]) => void;
  currentPage: number;
  pageSize: number;
  onPaginationChange: (page: number, size: number) => void;
  searchQuery: string;
  filterRole: string;
  onSearchQueryChange: (value: string) => void;
  onFilterRoleChange: (value: string) => void;
  onClearFilters: () => void;
}

export function StaffDirectoryTabs({
  activeTab,
  onTabChange,
  activeCount,
  lockedCount,
  roles,
  rolesLoading,
  staffList,
  staffColumns,
  roleColumns,
  loading,
  canManageStaff,
  selectedRowKeys,
  onSelectedRowKeysChange,
  currentPage,
  pageSize,
  onPaginationChange,
  searchQuery,
  filterRole,
  onSearchQueryChange,
  onFilterRoleChange,
  onClearFilters,
}: StaffDirectoryTabsProps) {
  const renderDirectoryPanel = () => (
    <>
      <StaffDirectoryToolbar
        roles={roles}
        searchQuery={searchQuery}
        filterRole={filterRole}
        onSearchQueryChange={onSearchQueryChange}
        onFilterRoleChange={onFilterRoleChange}
        onClear={onClearFilters}
      />

      <DataTable<Staff>
        dataSource={staffList}
        columns={staffColumns}
        rowKey="id"
        loading={loading}
        rowSelection={
          canManageStaff
            ? {
                selectedRowKeys,
                onChange: onSelectedRowKeysChange,
              }
            : undefined
        }
        pagination={{
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: STAFF_PAGE_SIZE_OPTIONS,
          onChange: onPaginationChange,
        }}
        className="staff-directory-table"
      />
    </>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={onTabChange}
      items={[
        {
          key: 'staff-active',
          label: (
            <span className="flex items-center gap-2">
              <AppIcon icon={User} size={14} className="text-emerald-500" />
              <span>Danh sách nhân sự (Active)</span>
              <Badge
                count={activeCount}
                overflowCount={999}
                color="rgb(16 185 129)"
                classNames={{ indicator: 'tabular-nums' }}
              />
            </span>
          ),
          children: renderDirectoryPanel(),
        },
        {
          key: 'staff-locked',
          label: (
            <span className="flex items-center gap-2">
              <AppIcon icon={Lock} size={14} className="text-rose-500" />
              <span>Tài khoản đã khóa (Locked)</span>
              <Badge
                count={lockedCount}
                overflowCount={999}
                color="rgb(239 68 68)"
                classNames={{ indicator: 'tabular-nums' }}
              />
            </span>
          ),
          children: renderDirectoryPanel(),
        },
        {
          key: 'roles',
          label: (
            <span className="flex items-center gap-2">
              <AppIcon icon={KeyRound} size={14} />
              <span>Vai trò hệ thống &amp; Quyền</span>
            </span>
          ),
          children: (
            <DataTable<Role>
              dataSource={roles}
              columns={roleColumns}
              rowKey="key"
              loading={rolesLoading}
              pagination={false}
            />
          ),
        },
      ]}
    />
  );
}
