'use client';

import React from 'react';
import { Button, Form } from 'antd';
import { Sparkles, Trophy } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { BkGameCoreFieldsSection } from './bk-game-create-modal/BkGameCoreFieldsSection';
import { BkGameFormatConfigSection } from './bk-game-create-modal/BkGameFormatConfigSection';
import { BkGameParticipantsSection } from './bk-game-create-modal/BkGameParticipantsSection';
import type { BkGameCreateModalProps, StaffProfileOption } from './bk-game-create-modal/bkGameCreateUtils';
import { useBkGameCreateForm } from './bk-game-create-modal/useBkGameCreateForm';

export type { BkGameCreateModalProps, StaffProfileOption };

export default function BkGameCreateModal({ open, onClose, onSuccess }: BkGameCreateModalProps) {
  const {
    form,
    loading,
    staffLoading,
    initialValues,
    gameType,
    watchedMetricType,
    teamKpiTimeWindowLabel,
    currentScoringRule,
    allStaffList,
    selectedRoleFilter,
    setSelectedRoleFilter,
    roleFilterOptions,
    filteredStaffList,
    selectedParticipantIds,
    selectedTeam1Ids,
    selectedTeam2Ids,
    participantOptions,
    team1Options,
    team2Options,
    doneBonusRules,
    setDoneBonusRules,
    teamBookingDoneBonusConfig,
    setTeamBookingDoneBonusConfig,
    handleGameTypeChange,
    handleAddAllFiltered,
    handleClearField,
    handleSubmit,
  } = useBkGameCreateForm({ open, onClose, onSuccess });

  return (
    <AdaptiveModal
      intent="form"
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Trophy} size="md" className="text-amber-500" />
          <span className="font-semibold text-base">Khởi Tạo Game BK Mới</span>
        </div>
      }
      footer={null}
      width={680}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={initialValues} className="mt-4">
        <BkGameCoreFieldsSection
          form={form}
          gameType={gameType}
          watchedMetricType={watchedMetricType}
          currentScoringRule={currentScoringRule}
          onGameTypeChange={handleGameTypeChange}
        />

        <BkGameFormatConfigSection
          gameType={gameType}
          teamKpiTimeWindowLabel={teamKpiTimeWindowLabel}
          doneBonusRules={doneBonusRules}
          onDoneBonusRulesChange={setDoneBonusRules}
          teamBookingDoneBonusConfig={teamBookingDoneBonusConfig}
          onTeamBookingDoneBonusConfigChange={setTeamBookingDoneBonusConfig}
        />

        <BkGameParticipantsSection
          gameType={gameType}
          staffLoading={staffLoading}
          allStaffList={allStaffList}
          filteredStaffList={filteredStaffList}
          selectedRoleFilter={selectedRoleFilter}
          onRoleFilterChange={setSelectedRoleFilter}
          roleFilterOptions={roleFilterOptions}
          selectedParticipantIds={selectedParticipantIds}
          selectedTeam1Ids={selectedTeam1Ids}
          selectedTeam2Ids={selectedTeam2Ids}
          participantOptions={participantOptions}
          team1Options={team1Options}
          team2Options={team2Options}
          onAddAllFiltered={handleAddAllFiltered}
          onClearField={handleClearField}
        />

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<AppIcon icon={Sparkles} size="sm" />}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            Khởi Tạo Game
          </Button>
        </div>
      </Form>
    </AdaptiveModal>
  );
}
