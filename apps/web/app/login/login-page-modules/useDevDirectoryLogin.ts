'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { message } from 'antd';
import { apiClient } from '~/lib/api-client';
import {
  type DevStaff,
  filterDevStaffs,
  getUsersForRoleCategory,
  isLocalDevLoginEnabled,
  isSuperAdminDevStaff,
  ROLE_CATEGORIES,
  type RoleCategory,
  type RoleCategoryKey,
} from './loginConstants';

export interface UseDevDirectoryLoginOptions {
  executeLogin: (username: string, password?: string) => Promise<void>;
}

export function useDevDirectoryLogin({ executeLogin }: UseDevDirectoryLoginOptions) {
  const [mockEmail, setMockEmail] = useState('danny.do@wingslashes.com');
  const [showMockOptions, setShowMockOptions] = useState(false);
  const [devStaffs, setDevStaffs] = useState<DevStaff[]>([]);
  const [loadingStaffs, setLoadingStaffs] = useState(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<RoleCategoryKey | null>(null);
  const [staffSearchText, setStaffSearchText] = useState('');
  const [superAdminTarget, setSuperAdminTarget] = useState<DevStaff | null>(null);
  const [superAdminPass, setSuperAdminPass] = useState('');

  useEffect(() => {
    if (showMockOptions && devStaffs.length === 0 && isLocalDevLoginEnabled) {
      setLoadingStaffs(true);
      apiClient.auth
        .getDevDirectory()
        .then((res) => {
          if (res?.staffs) {
            setDevStaffs(res.staffs);
          }
        })
        .catch((err) => {
          console.error('Failed to load dev staff directory:', err);
        })
        .finally(() => {
          setLoadingStaffs(false);
        });
    }
  }, [showMockOptions, devStaffs.length]);

  const handleUserSelect = useCallback(
    (targetUser: DevStaff) => {
      if (isSuperAdminDevStaff(targetUser)) {
        setSuperAdminTarget(targetUser);
        setSuperAdminPass('');
      } else {
        void executeLogin(targetUser.username);
      }
    },
    [executeLogin]
  );

  const handleRoleCategoryClick = useCallback(
    (category: RoleCategory) => {
      const users = getUsersForRoleCategory(devStaffs, category);
      if (users.length === 0) {
        message.info(`Chưa có tài khoản nào thuộc vai trò ${category.label}`);
        return;
      }
      if (users.length === 1) {
        handleUserSelect(users[0]);
        return;
      }
      setSelectedCategoryKey(category.key);
      setStaffSearchText('');
    },
    [devStaffs, handleUserSelect]
  );

  const handleCustomInputSubmit = useCallback(() => {
    const found = devStaffs.find((staff) => staff.username === mockEmail || staff.email === mockEmail);
    if (found) {
      handleUserSelect(found);
    } else {
      void executeLogin(mockEmail);
    }
  }, [devStaffs, mockEmail, handleUserSelect, executeLogin]);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategoryKey(null);
    setStaffSearchText('');
  }, []);

  const handleResetMockOptions = useCallback(() => {
    setShowMockOptions(false);
    setSelectedCategoryKey(null);
    setStaffSearchText('');
  }, []);

  const handleCloseSuperAdminModal = useCallback(() => {
    setSuperAdminTarget(null);
    setSuperAdminPass('');
  }, []);

  const handleConfirmSuperAdminLogin = useCallback(() => {
    if (superAdminTarget && superAdminPass) {
      void executeLogin(superAdminTarget.username, superAdminPass);
      setSuperAdminTarget(null);
      setSuperAdminPass('');
    }
  }, [superAdminTarget, superAdminPass, executeLogin]);

  const selectedCategory = useMemo(
    () => ROLE_CATEGORIES.find((category) => category.key === selectedCategoryKey),
    [selectedCategoryKey]
  );

  const selectedCategoryUsers = useMemo(
    () => (selectedCategory ? getUsersForRoleCategory(devStaffs, selectedCategory) : []),
    [selectedCategory, devStaffs]
  );

  const filteredCategoryUsers = useMemo(
    () => filterDevStaffs(selectedCategoryUsers, staffSearchText),
    [selectedCategoryUsers, staffSearchText]
  );

  return {
    mockEmail,
    setMockEmail,
    showMockOptions,
    setShowMockOptions,
    devStaffs,
    loadingStaffs,
    selectedCategory,
    selectedCategoryTotalCount: selectedCategoryUsers.length,
    filteredCategoryUsers,
    staffSearchText,
    setStaffSearchText,
    superAdminTarget,
    superAdminPass,
    setSuperAdminPass,
    handleRoleCategoryClick,
    handleUserSelect,
    handleCustomInputSubmit,
    handleBackToCategories,
    handleResetMockOptions,
    handleCloseSuperAdminModal,
    handleConfirmSuperAdminLogin,
  };
}
