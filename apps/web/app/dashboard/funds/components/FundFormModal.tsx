'use client';

import React from 'react';
import { Button, Form, Tabs } from 'antd';
import { FileText, ShieldCheck, Sliders, Sparkles, Users, WalletCards } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import { FundApprovalWorkflowTab } from './fund-form-modal/FundApprovalWorkflowTab';
import { FundBasicInfoTab } from './fund-form-modal/FundBasicInfoTab';
import { FundFinancialConfigTab } from './fund-form-modal/FundFinancialConfigTab';
import { FundRolesTab } from './fund-form-modal/FundRolesTab';
import { generateSuggestedFundCode } from './fund-form-modal/fundFormHelpers';
import type { FundFormModalProps } from './fund-form-modal/types';
import { useFundFormModal } from './fund-form-modal/useFundFormModal';

export { generateSuggestedFundCode };
export type { FundFormModalProps };

export default function FundFormModal({ open, onCancel, onSuccess, initialFund }: FundFormModalProps) {
  const {
    form,
    activeTab,
    setActiveTab,
    submitting,
    loadingStaff,
    staffOptions,
    roles,
    approvalEnabled,
    setApprovalEnabled,
    approvalSteps,
    toleranceMode,
    setToleranceMode,
    isEditMode,
    handleNameChange,
    handleApplySuggestedCode,
    handleManualCodeChange,
    handleAddRole,
    handleRemoveRole,
    handleUpdateRole,
    handleResetStandardRoles,
    handleAddApprovalStep,
    handleRemoveApprovalStep,
    handleUpdateApprovalStep,
    handleSubmit,
    handlePrevTab,
    handleNextTab,
  } = useFundFormModal({ open, onSuccess, initialFund });

  const tabItems = [
    {
      key: '1',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={FileText} size="sm" />
          <span>Tab 1 – Thông tin</span>
        </span>
      ),
      children: (
        <FundBasicInfoTab
          onNameChange={handleNameChange}
          onApplySuggestedCode={handleApplySuggestedCode}
          onManualCodeChange={handleManualCodeChange}
        />
      ),
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Sliders} size="sm" />
          <span>Tab 2 – Cấu hình tài chính</span>
        </span>
      ),
      children: (
        <FundFinancialConfigTab form={form} toleranceMode={toleranceMode} onToleranceModeChange={setToleranceMode} />
      ),
    },
    {
      key: '3',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Users} size="sm" />
          <span>Tab 3 – Vai trò & Nhân sự</span>
        </span>
      ),
      children: (
        <FundRolesTab
          roles={roles}
          staffOptions={staffOptions}
          loadingStaff={loadingStaff}
          onResetStandardRoles={handleResetStandardRoles}
          onAddRole={handleAddRole}
          onRemoveRole={handleRemoveRole}
          onUpdateRole={handleUpdateRole}
        />
      ),
    },
    {
      key: '4',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={ShieldCheck} size="sm" />
          <span>Tab 4 – Quy trình phê duyệt</span>
        </span>
      ),
      children: (
        <FundApprovalWorkflowTab
          approvalEnabled={approvalEnabled}
          approvalSteps={approvalSteps}
          roles={roles}
          staffOptions={staffOptions}
          onApprovalEnabledChange={setApprovalEnabled}
          onAddApprovalStep={handleAddApprovalStep}
          onRemoveApprovalStep={handleRemoveApprovalStep}
          onUpdateApprovalStep={handleUpdateApprovalStep}
        />
      ),
    },
  ];

  return (
    <AdaptiveModal
      intent="form"
      title={
        <div className="flex items-center gap-2 font-bold text-lg text-emerald-800 dark:text-emerald-400">
          <AppIcon icon={isEditMode ? WalletCards : Sparkles} size="sm" className="text-emerald-500" />
          <span>{isEditMode ? `Cấu Hình Quỹ: ${initialFund?.name}` : 'Thiết Lập Quỹ Hoạt Động Nội Bộ Mới'}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={780}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        activeTab !== '1' && (
          <Button key="prev" onClick={handlePrevTab}>
            Quay lại
          </Button>
        ),
        activeTab !== '4' && (
          <Button key="next" onClick={handleNextTab}>
            Tiếp theo
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white font-bold"
          loading={submitting}
          onClick={handleSubmit}
        >
          {isEditMode ? 'Lưu Cấu Hình Quỹ' : 'Khởi Tạo Quỹ'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="pt-1">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </AdaptiveModal>
  );
}
