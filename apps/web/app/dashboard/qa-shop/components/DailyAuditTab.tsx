'use client';

import React from 'react';
import { AuditChecklistSectionList } from './daily-audit-tab/AuditChecklistSectionList';
import { ComplianceScoreCard } from './daily-audit-tab/ComplianceScoreCard';
import { DailyAuditFooter } from './daily-audit-tab/DailyAuditFooter';
import { DailyAuditToolbarCard } from './daily-audit-tab/DailyAuditToolbarCard';
import type { DailyAuditTabProps } from './daily-audit-tab/types';
import { useDailyAuditState } from './daily-audit-tab/useDailyAuditState';

export { ItemStatusToggle } from './daily-audit-tab/ItemStatusToggle';
export type { ItemStatusToggleProps } from './daily-audit-tab/ItemStatusToggle';
export { SeverityDotIndicator } from './daily-audit-tab/SeverityDotIndicator';
export type { SeverityDotIndicatorProps } from './daily-audit-tab/SeverityDotIndicator';
export type { DailyAuditTabProps } from './daily-audit-tab/types';

export const DailyAuditTab: React.FC<DailyAuditTabProps> = ({ themeMode, onOpenImportDrawer, onAuditSubmitted }) => {
  const {
    selectedBranch,
    setSelectedBranch,
    template,
    loadingTemplate,
    submitting,
    shift,
    setShift,
    auditDate,
    setAuditDate,
    auditorName,
    setAuditorName,
    generalNotes,
    setGeneralNotes,
    activeAccordionKeys,
    setActiveAccordionKeys,
    itemStates,
    stats,
    handleItemResultChange,
    handleItemNoteChange,
    handleItemPhotoChange,
    handleItemSeverityChange,
    handleToggleExpandAll,
    handleSubmitAudit,
  } = useDailyAuditState({ onAuditSubmitted });

  const allSectionsExpanded = activeAccordionKeys.length === (template?.sections.length || 0);

  return (
    <div className="space-y-4 pb-24">
      <DailyAuditToolbarCard
        themeMode={themeMode}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        templateCode={template?.code}
        auditDate={auditDate}
        onAuditDateChange={setAuditDate}
        shift={shift}
        onShiftChange={setShift}
        auditorName={auditorName}
        onAuditorNameChange={setAuditorName}
        onOpenImportDrawer={onOpenImportDrawer}
      />

      <ComplianceScoreCard
        themeMode={themeMode}
        stats={stats}
        allSectionsExpanded={allSectionsExpanded}
        onToggleExpandAll={handleToggleExpandAll}
      />

      <AuditChecklistSectionList
        themeMode={themeMode}
        loadingTemplate={loadingTemplate}
        template={template}
        activeAccordionKeys={activeAccordionKeys}
        onAccordionChange={setActiveAccordionKeys}
        itemStates={itemStates}
        onItemResultChange={handleItemResultChange}
        onItemNoteChange={handleItemNoteChange}
        onItemPhotoChange={handleItemPhotoChange}
        onItemSeverityChange={handleItemSeverityChange}
      />

      <DailyAuditFooter
        themeMode={themeMode}
        generalNotes={generalNotes}
        onGeneralNotesChange={setGeneralNotes}
        stats={stats}
        submitting={submitting}
        onSubmitAudit={handleSubmitAudit}
      />
    </div>
  );
};
