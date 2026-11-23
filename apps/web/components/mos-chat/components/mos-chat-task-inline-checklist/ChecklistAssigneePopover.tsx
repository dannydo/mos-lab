'use client';

import React from 'react';
import { Check, UserPlus } from 'lucide-react';
import { Input, Popover, Tooltip } from 'antd';
import type { MosChatTaskChecklistItem } from '@mos-lab/shared';
import { getStaffAvatarBgClass, getStaffInitials } from './checklistHelpers';
import type { ChecklistStaffOption } from './checklistTypes';

export interface ChecklistAssigneePopoverProps {
  item: MosChatTaskChecklistItem;
  effectiveAssigneeName: string | null;
  avatarUrl: string | null;
  availableStaff: ChecklistStaffOption[];
  staffSearch: string;
  onChangeStaffSearch: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAssignee: (staff: ChecklistStaffOption | null) => void;
}

export const ChecklistAssigneePopover: React.FC<ChecklistAssigneePopoverProps> = ({
  item,
  effectiveAssigneeName,
  avatarUrl,
  availableStaff,
  staffSearch,
  onChangeStaffSearch,
  isOpen,
  onOpenChange,
  onSelectAssignee,
}) => {
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={isOpen}
      onOpenChange={onOpenChange}
      content={
        <div className="w-52 p-1 space-y-1.5 text-xs">
          <div className="font-bold text-slate-700 dark:text-slate-200 px-1 py-0.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span>Giao mục việc cho</span>
            {effectiveAssigneeName && (
              <button
                type="button"
                onClick={() => onSelectAssignee(null)}
                className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
              >
                Bỏ gán
              </button>
            )}
          </div>
          <Input
            size="small"
            placeholder="Tìm nhân sự..."
            value={staffSearch}
            onChange={(e) => onChangeStaffSearch(e.target.value)}
            className="text-[11px]"
          />
          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {availableStaff.map((st) => {
              const isSelected =
                effectiveAssigneeName &&
                st.displayName.trim().toLowerCase() === effectiveAssigneeName.trim().toLowerCase();
              return (
                <button
                  key={`${st.id}-${st.displayName}`}
                  type="button"
                  onClick={() => onSelectAssignee(st)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-500/15 text-amber-500 font-bold' : 'hover:bg-slate-500/10'
                  }`}
                >
                  {st.avatarUrl ? (
                    <img
                      src={st.avatarUrl}
                      alt={st.displayName}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span
                      className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${getStaffAvatarBgClass(
                        st.displayName
                      )}`}
                    >
                      {getStaffInitials(st.displayName)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[11px]">{st.displayName}</div>
                    {st.role && <div className="truncate text-[9.5px] text-slate-400">{st.role}</div>}
                  </div>
                  {isSelected && <Check size={11} className="text-amber-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      {effectiveAssigneeName ? (
        <Tooltip title={`Phụ trách: ${effectiveAssigneeName} · Bấm để đổi người`}>
          <button
            type="button"
            aria-label={`Giao người phụ trách mục ${item.title}`}
            className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[8.5px] font-extrabold text-white shrink-0 cursor-pointer ring-1 ring-white/20 hover:ring-amber-400 transition-all overflow-hidden ${getStaffAvatarBgClass(
              effectiveAssigneeName
            )}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={effectiveAssigneeName} className="w-full h-full object-cover" />
            ) : (
              getStaffInitials(effectiveAssigneeName)
            )}
          </button>
        </Tooltip>
      ) : (
        <Tooltip title="Gán người phụ trách">
          <button
            type="button"
            aria-label={`Giao người phụ trách mục ${item.title}`}
            className="w-5 h-5 rounded-full border border-dashed border-slate-400/60 hover:border-amber-400 inline-flex items-center justify-center text-slate-400 hover:text-amber-400 cursor-pointer transition-all shrink-0"
          >
            <UserPlus size={9} />
          </button>
        </Tooltip>
      )}
    </Popover>
  );
};
