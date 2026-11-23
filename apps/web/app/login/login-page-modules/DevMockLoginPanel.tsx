'use client';

import React from 'react';
import { Button, Input } from 'antd';
import { ArrowLeft, Crown, KeyRound, Loader2, Lock, Search, Zap } from 'lucide-react';
import {
  type DevStaff,
  getUsersForRoleCategory,
  isSuperAdminDevStaff,
  ROLE_CATEGORIES,
  type RoleCategory,
} from './loginConstants';
import { LoginRoleCategoryIcon, RoleCategoryDisplayLabel } from './LoginRoleCategoryIcon';

export interface DevMockLoginPanelProps {
  loading: boolean;
  showMockOptions: boolean;
  onOpenMockOptions: () => void;
  onCloseMockOptions: () => void;
  loadingStaffs: boolean;
  devStaffs: DevStaff[];
  selectedCategory: RoleCategory | undefined;
  selectedCategoryTotalCount: number;
  filteredCategoryUsers: DevStaff[];
  staffSearchText: string;
  onStaffSearchTextChange: (value: string) => void;
  mockEmail: string;
  onMockEmailChange: (value: string) => void;
  onRoleCategoryClick: (category: RoleCategory) => void;
  onBackToCategories: () => void;
  onUserSelect: (staff: DevStaff) => void;
  onCustomInputSubmit: () => void;
}

export function DevMockLoginPanel({
  loading,
  showMockOptions,
  onOpenMockOptions,
  onCloseMockOptions,
  loadingStaffs,
  devStaffs,
  selectedCategory,
  selectedCategoryTotalCount,
  filteredCategoryUsers,
  staffSearchText,
  onStaffSearchTextChange,
  mockEmail,
  onMockEmailChange,
  onRoleCategoryClick,
  onBackToCategories,
  onUserSelect,
  onCustomInputSubmit,
}: DevMockLoginPanelProps) {
  if (!showMockOptions) {
    return (
      <Button
        type="default"
        icon={<KeyRound className="h-4 w-4 shrink-0" />}
        onClick={onOpenMockOptions}
        block
        className="h-10 font-medium bg-slate-100 dark:bg-slate-900 border-[var(--mos-surface-border)] text-[var(--mos-accent)]"
      >
        Mock Login Options (Dev Mode)
      </Button>
    );
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/90 p-3 rounded-lg border border-[var(--mos-surface-border)] box-border overflow-hidden">
      <div className="text-[var(--mos-text-muted)] text-[11px] mb-2 text-center font-bold tracking-wider">
        MOCK LOGIN (LOCAL DEV ONLY)
      </div>

      {loadingStaffs ? (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--mos-accent)]" />
          <span className="text-xs text-[var(--mos-text-muted)]">Đang tải danh sách nhân sự...</span>
        </div>
      ) : !selectedCategory ? (
        <div className="w-full box-border">
          <div className="text-[11px] text-[var(--mos-text-muted)] mb-1.5 text-center">
            Chọn vai trò để đăng nhập hoặc xem danh sách users:
          </div>
          <div className="grid grid-cols-2 gap-1.5 w-full box-border">
            {ROLE_CATEGORIES.map((category) => {
              const count = getUsersForRoleCategory(devStaffs, category).length;
              if (count === 0) return null;
              const isSuper = category.key === 'super_admin';
              return (
                <Button
                  key={category.key}
                  size="middle"
                  onClick={() => onRoleCategoryClick(category)}
                  loading={loading}
                  className={`h-9 w-full min-w-0 px-2 box-border bg-[var(--mos-bg-container)] ${
                    isSuper
                      ? 'border-[var(--mos-accent)] text-[var(--mos-accent)] font-semibold'
                      : 'border-[var(--mos-border-secondary)] text-[var(--mos-text)] font-normal'
                  }`}
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <LoginRoleCategoryIcon categoryKey={category.key} className="h-3 w-3 shrink-0" />
                      <RoleCategoryDisplayLabel category={category} className="truncate text-[11px]" />
                    </span>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-lg leading-none font-semibold tabular-nums ${
                        isSuper
                          ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)]'
                          : 'bg-slate-200 dark:bg-slate-800 text-[var(--mos-text-secondary)]'
                      }`}
                    >
                      {count}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Button
              type="link"
              size="small"
              icon={<ArrowLeft className="h-3 w-3" />}
              onClick={onBackToCategories}
              className="p-0 h-auto text-[var(--mos-accent)] text-[11px]"
            >
              Đổi vai trò
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--mos-text)] tabular-nums">
              <LoginRoleCategoryIcon categoryKey={selectedCategory.key} className="h-3.5 w-3.5 shrink-0" />
              <RoleCategoryDisplayLabel category={selectedCategory} />
              <span>({filteredCategoryUsers.length})</span>
            </span>
          </div>

          {selectedCategoryTotalCount > 4 && (
            <Input
              size="small"
              prefix={<Search className="h-3.5 w-3.5 text-[var(--mos-text-muted)]" />}
              placeholder="Tìm tên hoặc username..."
              value={staffSearchText}
              onChange={(event) => onStaffSearchTextChange(event.target.value)}
              className="mb-2"
              allowClear
            />
          )}

          <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {filteredCategoryUsers.map((staff) => {
              const isSuper = isSuperAdminDevStaff(staff);
              return (
                <Button
                  key={staff.id}
                  size="middle"
                  onClick={() => onUserSelect(staff)}
                  loading={loading}
                  className={`h-auto min-h-[38px] w-full px-2.5 py-1.5 text-left box-border bg-[var(--mos-bg-container)] ${
                    isSuper ? 'border-[var(--mos-accent)]' : 'border-[var(--mos-border-secondary)]'
                  }`}
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-2">
                    <span className="flex flex-col overflow-hidden min-w-0 text-left">
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--mos-text)] text-xs truncate">
                        {isSuper && <Crown className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
                        <span className="truncate">{staff.displayName}</span>
                      </span>
                      <span className="text-[11px] text-[var(--mos-text-muted)] truncate">@{staff.username}</span>
                    </span>
                    {isSuper ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold leading-none">
                        <Lock className="h-2.5 w-2.5 shrink-0" />
                        <span>Mật khẩu</span>
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400 font-medium leading-none">
                        <Zap className="h-2.5 w-2.5 shrink-0" />
                        <span>1-Click</span>
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-2.5">
        <Input
          size="middle"
          placeholder="Custom username/email..."
          value={mockEmail}
          onChange={(event) => onMockEmailChange(event.target.value)}
          className="bg-[var(--mos-bg-container)] border-[var(--mos-border-secondary)] text-[var(--mos-text)]"
          onPressEnter={onCustomInputSubmit}
        />
        <Button size="middle" type="primary" onClick={onCustomInputSubmit} loading={loading} className="font-semibold">
          Go
        </Button>
      </div>
      <div className="text-center mt-1.5">
        <Button
          type="link"
          size="small"
          onClick={onCloseMockOptions}
          className="text-[var(--mos-text-muted)] p-0 h-auto text-[11px]"
        >
          Ẩn tùy chọn
        </Button>
      </div>
    </div>
  );
}
