'use client';

import React from 'react';
import { Avatar } from 'antd';
import { getStaffDepartmentTagClass, type StaffProfileOption } from './bkGameCreateUtils';

interface BkStaffSelectOptionProps {
  option: {
    label: string;
    staff?: StaffProfileOption;
  };
}

/** Renders a staff option row with avatar, name, and department/team badge inside multi-select dropdowns. */
export function BkStaffSelectOption({ option }: BkStaffSelectOptionProps) {
  const s = option.staff;
  const tagBgClass = getStaffDepartmentTagClass(s?.departmentCode);

  return (
    <div className="flex items-center justify-between py-1 w-full gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {s?.avatarUrl ? (
          <Avatar src={s.avatarUrl} size={22} className="flex-shrink-0" />
        ) : (
          <Avatar size={22} className="!bg-emerald-600 !text-white flex-shrink-0 text-xs leading-none">
            {(s?.displayName || option.label || 'U').slice(0, 1).toUpperCase()}
          </Avatar>
        )}
        <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">{option.label}</span>
      </div>
      <span
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-medium border leading-none flex-shrink-0 ${tagBgClass}`}
      >
        {s?.teamName || s?.roleName || 'Nhân viên'}
      </span>
    </div>
  );
}
