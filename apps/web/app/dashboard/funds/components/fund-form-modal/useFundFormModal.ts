'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type {
  CreateFundRoleInput,
  Fund,
  FundApprovalStepConfig,
  Staff,
  ToleranceMode,
  UpdateFundRequest,
} from '@mos-lab/shared';
import apiClient from '~/lib/api-client';
import { createDefaultApprovalSteps, createDefaultStandardRoles } from './fundFormConstants';
import {
  buildCreateFundPayload,
  buildFundFormInitialValues,
  generateSuggestedFundCode,
  mapFundRolesToInputs,
  resolveInitialApprovalConfig,
} from './fundFormHelpers';
import type { FundFormValues, StaffSelectOption } from './types';

interface UseFundFormModalOptions {
  open: boolean;
  onSuccess: (savedFund: Fund) => void;
  initialFund?: Fund | null;
}

export function useFundFormModal({ open, onSuccess, initialFund }: UseFundFormModalOptions) {
  const [form] = Form.useForm<FundFormValues>();
  const [activeTab, setActiveTab] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // Dynamic roles state
  const [roles, setRoles] = useState<CreateFundRoleInput[]>(createDefaultStandardRoles);

  // Approval config state
  const [approvalEnabled, setApprovalEnabled] = useState(true);
  const [approvalSteps, setApprovalSteps] = useState<FundApprovalStepConfig[]>(createDefaultApprovalSteps);

  // Track if user manually touched fund code
  const [isManualCode, setIsManualCode] = useState(false);
  const [toleranceMode, setToleranceMode] = useState<ToleranceMode>('STRICT');

  const isEditMode = Boolean(initialFund);

  // Load staff options from crmStaff
  useEffect(() => {
    let isMounted = true;
    async function fetchStaff() {
      if (!open) return;
      try {
        setLoadingStaff(true);
        const data = await apiClient.staff.list();
        if (isMounted && Array.isArray(data)) {
          setStaffList(data);
        }
      } catch (err) {
        console.error('Failed to load staff list for fund roles:', err);
      } finally {
        if (isMounted) setLoadingStaff(false);
      }
    }
    fetchStaff();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Populate form on open / initialFund change
  useEffect(() => {
    if (!open) return;

    setActiveTab('1');
    if (initialFund) {
      setIsManualCode(true);
      setToleranceMode(initialFund.toleranceMode || 'STRICT');
      form.setFieldsValue(buildFundFormInitialValues(initialFund));
      setRoles(mapFundRolesToInputs(initialFund));
      const initialApproval = resolveInitialApprovalConfig(initialFund);
      setApprovalEnabled(initialApproval.enabled);
      setApprovalSteps(initialApproval.steps);
    } else {
      // Reset to new creation defaults
      setIsManualCode(false);
      setToleranceMode('STRICT');
      form.resetFields();
      form.setFieldsValue(buildFundFormInitialValues(null));
      setRoles(createDefaultStandardRoles());
      setApprovalEnabled(true);
      setApprovalSteps(createDefaultApprovalSteps());
    }
  }, [open, initialFund, form]);

  // Handle auto code suggestion
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isManualCode && !isEditMode) {
      const suggested = generateSuggestedFundCode(val);
      form.setFieldValue('code', suggested);
    }
  };

  const handleApplySuggestedCode = () => {
    const currentName = form.getFieldValue('name') || '';
    const suggested = generateSuggestedFundCode(currentName);
    form.setFieldValue('code', suggested);
    setIsManualCode(false);
    message.success('Đã áp dụng mã quỹ tự động gợi ý!');
  };

  const handleManualCodeChange = () => {
    setIsManualCode(true);
  };

  // Staff options formatted for multi-select
  const staffOptions = useMemo<StaffSelectOption[]>(() => {
    return staffList.map((s) => ({
      label: `${s.displayName || s.username} ${s.role ? `(${s.role})` : ''}`,
      value: s.id,
    }));
  }, [staffList]);

  // Roles manipulation
  const handleAddRole = () => {
    const newIdx = roles.length + 1;
    setRoles([
      ...roles,
      {
        roleKey: `ROLE_${newIdx}`,
        roleName: `Vai trò mới #${newIdx}`,
        permissions: ['VIEW'],
        assignedStaffIds: [],
      },
    ]);
  };

  const handleRemoveRole = (index: number) => {
    if (roles.length <= 1) {
      message.warning('Quỹ cần tối thiểu ít nhất 1 vai trò phân quyền.');
      return;
    }
    setRoles(roles.filter((_, idx) => idx !== index));
  };

  const handleUpdateRole = (index: number, patch: Partial<CreateFundRoleInput>) => {
    const updated = [...roles];
    updated[index] = { ...updated[index], ...patch };
    setRoles(updated);
  };

  const handleResetStandardRoles = () => {
    setRoles(createDefaultStandardRoles());
    message.info('Đã khôi phục bộ 3 vai trò mẫu chuẩn (Thủ Quỹ, Kế Toán Chi, Quản Lý Quỹ).');
  };

  // Approval step manipulation
  const handleAddApprovalStep = () => {
    const nextLevel = approvalSteps.length + 1;
    setApprovalSteps([
      ...approvalSteps,
      {
        level: nextLevel,
        name: `Cấp ${nextLevel} – Phê duyệt bổ sung`,
        approverRoleKey: roles[0]?.roleKey || 'APPROVER',
        approverStaffIds: [],
        requiredAmountAbove: nextLevel === 2 ? 1000000 : 0,
        note: `Phê duyệt cấp độ ${nextLevel}`,
      },
    ]);
  };

  const handleRemoveApprovalStep = (index: number) => {
    if (approvalSteps.length <= 1) {
      message.warning('Quy trình cần tối thiểu ít nhất 1 cấp phê duyệt.');
      return;
    }
    const filtered = approvalSteps.filter((_, idx) => idx !== index);
    const reIndexed = filtered.map((step, idx) => ({
      ...step,
      level: idx + 1,
      name: step.name.startsWith('Cấp ')
        ? `Cấp ${idx + 1} – ${step.name.split('–')[1]?.trim() || 'Phê duyệt'}`
        : step.name,
    }));
    setApprovalSteps(reIndexed);
  };

  const handleUpdateApprovalStep = (index: number, patch: Partial<FundApprovalStepConfig>) => {
    const updated = [...approvalSteps];
    updated[index] = { ...updated[index], ...patch };
    setApprovalSteps(updated);
  };

  // Submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = buildCreateFundPayload(values, roles, approvalEnabled, approvalSteps);

      let resultFund: Fund;
      if (isEditMode && initialFund) {
        const updatePayload: UpdateFundRequest = { ...payload };
        const res = await apiClient.funds.update(initialFund.id, updatePayload);
        if (!res.success || !res.data) {
          throw new Error('Cập nhật quỹ không thành công.');
        }
        resultFund = res.data;
        message.success(`Đã cập nhật cấu hình Quỹ "${resultFund.name}" thành công!`);
      } else {
        const res = await apiClient.funds.create(payload);
        if (!res.success || !res.data) {
          throw new Error('Khởi tạo quỹ không thành công.');
        }
        resultFund = res.data;
        message.success(`Đã khởi tạo Quỹ mới "${resultFund.name}" (${resultFund.code}) thành công!`);
      }

      onSuccess(resultFund);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Submit fund error:', error);
      message.error(error.message || 'Lỗi lưu thông tin Quỹ hoạt động.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevTab = () => {
    const current = Number(activeTab);
    if (current > 1) setActiveTab(String(current - 1));
  };

  const handleNextTab = () => {
    const current = Number(activeTab);
    if (current < 4) setActiveTab(String(current + 1));
  };

  return {
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
  };
}
