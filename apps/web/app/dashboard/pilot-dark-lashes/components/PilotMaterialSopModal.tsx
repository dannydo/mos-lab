'use client';

import React from 'react';
import { Button, Tabs } from 'antd';
import { Award, Layers, Save, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import type {
  MaterialSopTabKey,
  PilotMaterialSopModalProps,
} from './pilot-material-sop-modal/pilot-material-sop-helpers';
import { usePilotMaterialSop } from './pilot-material-sop-modal/usePilotMaterialSop';
import {
  PilotMaterialSopModalTitle,
  PilotMaterialSopStatsBanner,
} from './pilot-material-sop-modal/PilotMaterialSopHeader';
import { SolutionNormsTab } from './pilot-material-sop-modal/SolutionNormsTab';
import { GlueRodStandardsTab } from './pilot-material-sop-modal/GlueRodStandardsTab';
import { SanitizationProceduresTab } from './pilot-material-sop-modal/SanitizationProceduresTab';
import { DraftReviewTab } from './pilot-material-sop-modal/DraftReviewTab';
import { PilotMaterialSopSubModals } from './pilot-material-sop-modal/PilotMaterialSopSubModals';

export type { PilotMaterialSopModalProps };

export function PilotMaterialSopModal({ open, onClose }: PilotMaterialSopModalProps) {
  const {
    loading,
    saving,
    reviewing,
    activeTab,
    setActiveTab,
    doc,
    normEditModalOpen,
    setNormEditModalOpen,
    editingNorm,
    normForm,
    glueRodModalOpen,
    setGlueRodModalOpen,
    editingGlueRod,
    glueRodForm,
    sanitModalOpen,
    setSanitModalOpen,
    editingSanit,
    sanitForm,
    endorseModalOpen,
    setEndorseModalOpen,
    endorseForm,
    handleSaveDraft,
    handleOpenEditNorm,
    handleOpenAddNorm,
    handleSaveNorm,
    handleDeleteNorm,
    handleOpenEditGlueRod,
    handleOpenAddGlueRod,
    handleSaveGlueRod,
    handleDeleteGlueRod,
    handleOpenEditSanit,
    handleOpenAddSanit,
    handleSaveSanit,
    handleDeleteSanit,
    handleOpenEndorse,
    handleConfirmEndorse,
  } = usePilotMaterialSop(open);

  return (
    <>
      <AdaptiveModal
        intent="detail"
        open={open}
        onCancel={onClose}
        width={1040}
        footer={[
          <Button key="close" onClick={onClose} className="rounded-xl">
            Đóng
          </Button>,
          <Button
            key="save"
            icon={<AppIcon icon={Save} size="sm" />}
            loading={saving}
            onClick={handleSaveDraft}
            className="rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          >
            Lưu dự thảo
          </Button>,
          doc?.overallStatus !== 'REVIEWED_BY_EXPERT' && (
            <Button
              key="endorse"
              type="primary"
              icon={<AppIcon icon={UserCheck} size="sm" />}
              onClick={handleOpenEndorse}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-sm"
            >
              Cô Giang Đàm Thẩm Định
            </Button>
          ),
        ]}
        title={<PilotMaterialSopModalTitle doc={doc} />}
      >
        <div className="space-y-4 pt-1">
          <PilotMaterialSopStatsBanner doc={doc} />

          {/* Navigation Tabs 3 Phần + Bản Dự Thảo */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as MaterialSopTabKey)}
            className="sop-material-tabs"
            items={[
              {
                key: 'solutions',
                label: (
                  <span
                    className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                    data-testid="sop-tab-solutions"
                  >
                    <AppIcon icon={Sparkles} size={15} />
                    <span>Phần 1 – Định Mức Thuốc &amp; Dung Dịch</span>
                  </span>
                ),
                children: (
                  <SolutionNormsTab
                    solutionNorms={doc?.solutionNorms || []}
                    loading={loading}
                    onAdd={handleOpenAddNorm}
                    onEdit={handleOpenEditNorm}
                    onDelete={handleDeleteNorm}
                  />
                ),
              },
              {
                key: 'glue-rods',
                label: (
                  <span
                    className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                    data-testid="sop-tab-glue-rods"
                  >
                    <AppIcon icon={Layers} size={15} />
                    <span>Phần 2 – Quy Chuẩn Keo &amp; Trục Silicon</span>
                  </span>
                ),
                children: (
                  <GlueRodStandardsTab
                    items={doc?.glueRodStandards || []}
                    onAdd={handleOpenAddGlueRod}
                    onEdit={handleOpenEditGlueRod}
                    onDelete={handleDeleteGlueRod}
                  />
                ),
              },
              {
                key: 'sanitization',
                label: (
                  <span
                    className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                    data-testid="sop-tab-sanitization"
                  >
                    <AppIcon icon={ShieldCheck} size={15} />
                    <span>Phần 3 – Khử Khuẩn &amp; Vệ Sinh Dụng Cụ</span>
                  </span>
                ),
                children: (
                  <SanitizationProceduresTab
                    procedures={doc?.sanitizationProcedures || []}
                    onAdd={handleOpenAddSanit}
                    onEdit={handleOpenEditSanit}
                    onDelete={handleDeleteSanit}
                  />
                ),
              },
              {
                key: 'draft',
                label: (
                  <span
                    className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm"
                    data-testid="sop-tab-draft"
                  >
                    <AppIcon icon={Award} size={15} />
                    <span>Bản Dự Thảo Trình CEO &amp; Thẩm Định</span>
                  </span>
                ),
                children: <DraftReviewTab doc={doc} onOpenEndorse={handleOpenEndorse} />,
              },
            ]}
          />
        </div>
      </AdaptiveModal>

      <PilotMaterialSopSubModals
        normEditModalOpen={normEditModalOpen}
        editingNorm={editingNorm}
        normForm={normForm}
        onCloseNormModal={() => setNormEditModalOpen(false)}
        onSaveNorm={handleSaveNorm}
        glueRodModalOpen={glueRodModalOpen}
        editingGlueRod={editingGlueRod}
        glueRodForm={glueRodForm}
        onCloseGlueRodModal={() => setGlueRodModalOpen(false)}
        onSaveGlueRod={handleSaveGlueRod}
        sanitModalOpen={sanitModalOpen}
        editingSanit={editingSanit}
        sanitForm={sanitForm}
        onCloseSanitModal={() => setSanitModalOpen(false)}
        onSaveSanit={handleSaveSanit}
        endorseModalOpen={endorseModalOpen}
        endorseForm={endorseForm}
        reviewing={reviewing}
        onCloseEndorseModal={() => setEndorseModalOpen(false)}
        onConfirmEndorse={handleConfirmEndorse}
      />
    </>
  );
}

export default PilotMaterialSopModal;
