'use client';

import { Alert, Button, Space } from 'antd';
import { PackageCheck, Plus, Wrench } from 'lucide-react';
import type { AcademyWorkshopDetail, AcademyWorkshopParticipant } from '@mos-lab/shared';
import { AppIcon, DataSection, IconText, StatePanel } from '~/components/ui';
import AcademyWorkshopEquipmentPrepModal from './AcademyWorkshopEquipmentPrepModal';
import AcademyWorkshopEquipmentTemplateLibrary from './AcademyWorkshopEquipmentTemplateLibrary';
import AcademyWorkshopSectionTitle from './AcademyWorkshopSectionTitle';
import AcademyWorkshopSelectionDeadline from './AcademyWorkshopSelectionDeadline';
import AcademyWorkshopTemplateBar from './AcademyWorkshopTemplateBar';
import { EquipmentEditorDrawers } from './academy-workshop-equipment-manager/EquipmentEditorDrawers';
import { EquipmentPackageCard } from './academy-workshop-equipment-manager/EquipmentPackageCard';
import { sortEquipment } from './academy-workshop-equipment-manager/equipment-manager-utils';
import { useAcademyWorkshopEquipmentManager } from './academy-workshop-equipment-manager/useAcademyWorkshopEquipmentManager';

export type {
  EquipmentFormValues,
  EquipmentImageTarget,
  ImageFormValues,
} from './academy-workshop-equipment-manager/equipment-manager-utils';

export interface AcademyWorkshopEquipmentManagerProps {
  workshop: AcademyWorkshopDetail;
  participants?: AcademyWorkshopParticipant[];
  canEdit: boolean;
  onUpdated: (workshop: AcademyWorkshopDetail) => void;
}

export default function AcademyWorkshopEquipmentManager({
  workshop,
  participants,
  canEdit,
  onUpdated,
}: AcademyWorkshopEquipmentManagerProps) {
  const {
    form,
    imageForm,
    editingItem,
    imageTarget,
    editorOpen,
    imageEditorOpen,
    prepModalOpen,
    setPrepModalOpen,
    templateLibraryOpen,
    setTemplateLibraryOpen,
    templateSaveRequestId,
    templateId,
    setTemplateId,
    saving,
    templateSaving,
    templates,
    selectableTemplates,
    selectedTemplate,
    isCurrentTemplate,
    selectedTemplateItemCount,
    openCreate,
    openEdit,
    closeEditor,
    openCreateImage,
    openEditImage,
    closeImageEditor,
    setAsIncludedPackage,
    saveItem,
    deleteItem,
    saveImage,
    deleteImage,
    applyTemplate,
    saveAsNewTemplate,
    updateCurrentTemplate,
  } = useAcademyWorkshopEquipmentManager({ workshop, onUpdated });

  return (
    <>
      <DataSection
        title={<AcademyWorkshopSectionTitle icon={PackageCheck} title="Bộ dụng cụ thực hành" />}
        extra={
          <Space wrap>
            {participants ? (
              <Button onClick={() => setPrepModalOpen(true)}>
                <IconText icon={<AppIcon icon={Wrench} />}>Báo cáo Soạn kho</IconText>
              </Button>
            ) : null}
            {canEdit ? (
              <Button type="primary" loading={saving} onClick={openCreate}>
                <IconText icon={<AppIcon icon={Plus} />}>Thêm bộ dụng cụ</IconText>
              </Button>
            ) : null}
          </Space>
        }
      >
        <div className="space-y-4">
          <AcademyWorkshopTemplateBar
            title="Mẫu bộ dụng cụ"
            ariaLabel="Chọn mẫu bộ dụng cụ cho workshop"
            templates={selectableTemplates}
            selectedTemplateId={templateId}
            isCurrentTemplate={isCurrentTemplate}
            selectedTemplateTitle={selectedTemplate?.title}
            selectedTemplateDescription={selectedTemplate?.description}
            canEdit={canEdit}
            loading={templates.loading}
            saving={saving}
            templateSaving={templateSaving}
            error={templates.error}
            saveAsNewDisabled={!workshop.equipmentPackages.length}
            metadata={
              selectedTemplate ? (
                <>
                  <IconText icon={<AppIcon icon={PackageCheck} size="sm" />} tabular>
                    {selectedTemplate.packages.length} gói
                  </IconText>
                  <IconText icon={<AppIcon icon={Wrench} size="sm" />} tabular>
                    {selectedTemplateItemCount} dụng cụ
                  </IconText>
                </>
              ) : null
            }
            onSelectTemplate={setTemplateId}
            onOpenLibrary={() => setTemplateLibraryOpen(true)}
            onApplyTemplate={applyTemplate}
            onUpdateCurrentTemplate={updateCurrentTemplate}
            onSaveAsNewTemplate={saveAsNewTemplate}
          />
          <AcademyWorkshopSelectionDeadline
            workshop={workshop}
            canEdit={canEdit}
            onUpdated={onUpdated}
            selectionType="equipment"
          />
          <Alert
            type="info"
            showIcon
            message="Học viên chọn đúng một bộ dụng cụ khi đăng ký"
            description="Tên gói, danh sách dụng cụ và phụ thu được chốt cùng đơn đăng ký. Bạn có thể chỉnh sửa hoặc ẩn từng gói trước khi gửi link public."
          />
          {workshop.equipmentPackages.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {sortEquipment(workshop.equipmentPackages).map((item) => (
                <EquipmentPackageCard
                  key={item.id}
                  item={item}
                  allPackages={workshop.equipmentPackages}
                  canEdit={canEdit}
                  saving={saving}
                  onSetAsIncluded={setAsIncludedPackage}
                  onEdit={openEdit}
                  onDelete={deleteItem}
                  onCreateImage={openCreateImage}
                  onEditImage={openEditImage}
                  onDeleteImage={deleteImage}
                />
              ))}
            </div>
          ) : (
            <StatePanel
              kind="empty"
              surface={false}
              title="Chưa có bộ dụng cụ"
              description="Thêm các lựa chọn để học viên chọn một bộ trước phần thực hành có hướng dẫn."
              extra={canEdit ? <Button onClick={openCreate}>Thêm bộ đầu tiên</Button> : undefined}
            />
          )}
        </div>

        <EquipmentEditorDrawers
          workshopId={workshop.id}
          form={form}
          imageForm={imageForm}
          editorOpen={editorOpen}
          editingItem={editingItem}
          imageEditorOpen={imageEditorOpen}
          imageTarget={imageTarget}
          saving={saving}
          onSaveItem={saveItem}
          onCloseEditor={closeEditor}
          onSaveImage={saveImage}
          onCloseImageEditor={closeImageEditor}
        />
      </DataSection>
      <AcademyWorkshopEquipmentTemplateLibrary
        open={templateLibraryOpen}
        workshop={workshop}
        canEdit={canEdit}
        saveRequestId={templateSaveRequestId}
        onClose={() => setTemplateLibraryOpen(false)}
        onApplied={onUpdated}
      />
      <AcademyWorkshopEquipmentPrepModal
        open={prepModalOpen}
        onClose={() => setPrepModalOpen(false)}
        workshop={workshop}
        participants={participants || []}
      />
    </>
  );
}
