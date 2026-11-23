'use client';

import React from 'react';
import { Button, Form, Input, Select, Typography } from 'antd';
import { Filter, Plus, Trash2 } from 'lucide-react';
import type { BkGameType } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { BkStaffSelectOption } from './BkStaffSelectOption';
import {
  matchesStaffFilterOption,
  type ParticipantFieldName,
  type RoleFilterOptionEntry,
  type StaffProfileOption,
  type StaffSelectOptionItem,
} from './bkGameCreateUtils';

interface BkGameParticipantsSectionProps {
  gameType: BkGameType;
  staffLoading: boolean;
  allStaffList: StaffProfileOption[];
  filteredStaffList: StaffProfileOption[];
  selectedRoleFilter: string;
  onRoleFilterChange: (value: string) => void;
  roleFilterOptions: RoleFilterOptionEntry[];
  selectedParticipantIds: number[];
  selectedTeam1Ids: number[];
  selectedTeam2Ids: number[];
  participantOptions: StaffSelectOptionItem[];
  team1Options: StaffSelectOptionItem[];
  team2Options: StaffSelectOptionItem[];
  onAddAllFiltered: (field?: ParticipantFieldName) => void;
  onClearField: (field?: ParticipantFieldName) => void;
}

/** Renders the role/department staff filter and participant/team-battle member selectors. */
export function BkGameParticipantsSection({
  gameType,
  staffLoading,
  allStaffList,
  filteredStaffList,
  selectedRoleFilter,
  onRoleFilterChange,
  roleFilterOptions,
  selectedParticipantIds,
  selectedTeam1Ids,
  selectedTeam2Ids,
  participantOptions,
  team1Options,
  team2Options,
  onAddAllFiltered,
  onClearField,
}: BkGameParticipantsSectionProps) {
  return (
    <>
      {/* Bộ lọc vai trò & bộ phận */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <AppIcon icon={Filter} size="sm" className="text-emerald-600" />
            <span>1. Bộ lọc Vai trò / Bộ phận</span>
          </div>
          {(gameType === 'INDIVIDUAL' || gameType === 'TEAM_KPI') && (
            <div className="flex items-center gap-1.5 text-xs">
              <Button
                size="small"
                type="text"
                icon={<AppIcon icon={Plus} size="sm" />}
                className="!text-emerald-600 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/30 !px-2 !py-0 !h-6 tabular-nums"
                onClick={() => onAddAllFiltered('participantIds')}
                disabled={filteredStaffList.length === 0}
              >
                + Thêm tất cả ({filteredStaffList.length})
              </Button>
              <Button
                size="small"
                type="text"
                icon={<AppIcon icon={Trash2} size="sm" />}
                className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-950/30 !px-2 !py-0 !h-6"
                onClick={() => onClearField('participantIds')}
                disabled={selectedParticipantIds.length === 0}
              >
                Xóa hết
              </Button>
            </div>
          )}
        </div>

        <Select
          value={selectedRoleFilter}
          onChange={onRoleFilterChange}
          options={roleFilterOptions}
          loading={staffLoading}
          className="w-full"
          placeholder="Chọn bộ phận hoặc vai trò để lọc danh sách nhân viên"
        />
      </div>

      {gameType === 'INDIVIDUAL' || gameType === 'TEAM_KPI' ? (
        <Form.Item
          name="participantIds"
          label={
            <div className="flex items-center justify-between w-full">
              <span className="font-medium tabular-nums">
                {gameType === 'TEAM_KPI' ? '2. Thành viên Team Booking tham gia' : '2. Danh sách nhân viên tham gia'} (
                {selectedParticipantIds.length})
              </span>
              <span className="text-xs text-slate-400 font-normal tabular-nums">
                Hiển thị {filteredStaffList.length} / {allStaffList.length} nhân sự
              </span>
            </div>
          }
          rules={[{ required: true, message: 'Chọn ít nhất một thành viên' }]}
        >
          <Select
            mode="multiple"
            placeholder="Tìm kiếm và chọn nhân viên thi đấu..."
            options={participantOptions}
            optionRender={(opt) => <BkStaffSelectOption option={opt.data as StaffSelectOptionItem} />}
            filterOption={matchesStaffFilterOption}
            size="large"
            className="w-full"
            loading={staffLoading}
            maxTagCount="responsive"
          />
        </Form.Item>
      ) : (
        <div className="space-y-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Typography.Text strong className="text-sm">
            Chia 2 đội thi đấu đối kháng (Team Battle)
          </Typography.Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
              <Form.Item
                name="team1Name"
                label={<span className="font-medium text-blue-600 dark:text-blue-400">Tên Đội 1</span>}
                rules={[{ required: true }]}
              >
                <Input placeholder="Team Sói Bạc" />
              </Form.Item>
              <Form.Item
                name="team1Members"
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="tabular-nums">Thành viên Đội 1 ({selectedTeam1Ids.length})</span>
                    <Button
                      size="small"
                      type="link"
                      className="!p-0 !h-auto !text-xs !text-blue-600 tabular-nums"
                      onClick={() => onAddAllFiltered('team1Members')}
                      disabled={filteredStaffList.length === 0}
                    >
                      + Thêm nhóm ({filteredStaffList.length})
                    </Button>
                  </div>
                }
                rules={[{ required: true, message: 'Chọn thành viên Đội 1' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn thành viên"
                  options={team1Options}
                  optionRender={(opt) => <BkStaffSelectOption option={opt.data as StaffSelectOptionItem} />}
                  filterOption={matchesStaffFilterOption}
                  className="w-full"
                  maxTagCount="responsive"
                />
              </Form.Item>
            </div>

            <div className="p-3 rounded border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20">
              <Form.Item
                name="team2Name"
                label={<span className="font-medium text-red-600 dark:text-red-400">Tên Đội 2</span>}
                rules={[{ required: true }]}
              >
                <Input placeholder="Team Đại Bàng" />
              </Form.Item>
              <Form.Item
                name="team2Members"
                label={
                  <div className="flex items-center justify-between w-full">
                    <span className="tabular-nums">Thành viên Đội 2 ({selectedTeam2Ids.length})</span>
                    <Button
                      size="small"
                      type="link"
                      className="!p-0 !h-auto !text-xs !text-red-600 tabular-nums"
                      onClick={() => onAddAllFiltered('team2Members')}
                      disabled={filteredStaffList.length === 0}
                    >
                      + Thêm nhóm ({filteredStaffList.length})
                    </Button>
                  </div>
                }
                rules={[{ required: true, message: 'Chọn thành viên Đội 2' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn thành viên"
                  options={team2Options}
                  optionRender={(opt) => <BkStaffSelectOption option={opt.data as StaffSelectOptionItem} />}
                  filterOption={matchesStaffFilterOption}
                  className="w-full"
                  maxTagCount="responsive"
                />
              </Form.Item>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
