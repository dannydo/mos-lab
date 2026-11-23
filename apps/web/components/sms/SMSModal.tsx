'use client';

import React from 'react';
import { AdaptiveModal } from '~/components/ui';
import { useTheme } from '~/context/ThemeContext';
import { SmsEditorPane } from './smsmodal/SmsEditorPane';
import { SmsHistoryPane } from './smsmodal/SmsHistoryPane';
import { SmsModalHeader } from './smsmodal/SmsModalHeader';
import { SmsResizeHandles } from './smsmodal/SmsResizeHandles';
import { SmsSaveTemplateModal } from './smsmodal/SmsSaveTemplateModal';
import type { SMSModalProps } from './smsmodal/smsModalTypes';
import { useSmsModalResize } from './smsmodal/useSmsModalResize';
import { useSmsModalState } from './smsmodal/useSmsModalState';

export type { SMSModalProps } from './smsmodal/smsModalTypes';

export const SMSModal: React.FC<SMSModalProps> = ({
  open,
  visible,
  onClose,
  customer,
  planId,
  onSuccess,
  themeMode: propThemeMode,
}) => {
  const isModalOpen = open ?? visible ?? false;
  const { themeMode: contextThemeMode } = useTheme();
  const themeMode = propThemeMode || contextThemeMode;
  const isDark = themeMode === 'dark';

  const { modalWidth, isDragging, handleDragStart, handleWidthChange } = useSmsModalResize(isModalOpen);

  const {
    isAdmin,
    history,
    loadingHistory,
    templates,
    loadingTemplates,
    selectedTemplateId,
    selectedPhone,
    setSelectedPhone,
    messageBody,
    setMessageBody,
    sending,
    livePreview,
    segmentMetrics,
    saveTemplateVisible,
    setSaveTemplateVisible,
    newTemplateTitle,
    setNewTemplateTitle,
    newTemplateCategory,
    setNewTemplateCategory,
    savingTemplate,
    reloadHistory,
    handleTemplateChange,
    handleInsertTag,
    handleSendSms,
    handleSaveTemplateSubmit,
    handleCopyLivePreview,
  } = useSmsModalState({
    isModalOpen,
    customer,
    planId,
    onClose,
    onSuccess,
  });

  return (
    <AdaptiveModal
      open={isModalOpen}
      onCancel={onClose}
      width={modalWidth}
      intent="data"
      title={
        <SmsModalHeader
          customerName={customer?.name}
          modalWidth={modalWidth}
          isDark={isDark}
          onWidthChange={handleWidthChange}
        />
      }
      footer={null}
      destroyOnHidden
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      styles={{
        content: {
          backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)',
          color: isDark ? 'rgb(245, 245, 245)' : 'rgb(20, 20, 20)',
          borderRadius: '12px',
          position: 'relative',
          transition: isDragging ? 'none' : 'width 0.2s ease',
        },
        header: {
          backgroundColor: isDark ? 'rgb(20, 20, 20)' : 'rgb(255, 255, 255)',
          color: isDark ? 'rgb(245, 245, 245)' : 'rgb(20, 20, 20)',
          borderBottom: `1px solid ${isDark ? 'rgb(38, 38, 38)' : 'rgb(240, 240, 240)'}`,
        },
      }}
    >
      <SmsResizeHandles isDark={isDark} onDragStart={handleDragStart} />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        <SmsHistoryPane history={history} loadingHistory={loadingHistory} isDark={isDark} onReload={reloadHistory} />

        <SmsEditorPane
          isDark={isDark}
          isAdmin={isAdmin}
          selectedPhone={selectedPhone}
          onChangePhone={setSelectedPhone}
          templates={templates}
          loadingTemplates={loadingTemplates}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={handleTemplateChange}
          onInsertTag={handleInsertTag}
          messageBody={messageBody}
          onChangeMessageBody={setMessageBody}
          livePreview={livePreview}
          segmentMetrics={segmentMetrics}
          sending={sending}
          onCopyLivePreview={handleCopyLivePreview}
          onOpenSaveTemplate={() => setSaveTemplateVisible(true)}
          onClose={onClose}
          onSendSms={handleSendSms}
        />
      </div>

      <SmsSaveTemplateModal
        open={saveTemplateVisible}
        isDark={isDark}
        title={newTemplateTitle}
        category={newTemplateCategory}
        messageBody={messageBody}
        saving={savingTemplate}
        onChangeTitle={setNewTemplateTitle}
        onChangeCategory={setNewTemplateCategory}
        onSubmit={handleSaveTemplateSubmit}
        onClose={() => setSaveTemplateVisible(false)}
      />
    </AdaptiveModal>
  );
};
