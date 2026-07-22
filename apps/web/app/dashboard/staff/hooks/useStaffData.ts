'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { Staff, Role } from '@mos-lab/shared';

export interface UseStaffDataOptions {
  staffForm?: SafeAny; // Ant Design FormInstance
  roleForm?: SafeAny; // Ant Design FormInstance
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useStaffData(options?: UseStaffDataOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [activeTab, setActiveTab] = useState<string>('staff');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [legacyStaffList, setLegacyStaffList] = useState<
    { id: number; name: string; phone?: string | null; email?: string | null }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Staff Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  const handleSyncLegacyStaff = async () => {
    setSyncing(true);
    try {
      const res = await apiClient.staff.syncLegacy();
      optionsRef.current?.onSuccess?.(res.message || 'Đồng bộ nhân sự thành công');
      fetchStaff();
      fetchLegacyStaff();
    } catch (err) {
      console.error('Sync legacy staff error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi đồng bộ nhân sự');
    } finally {
      setSyncing(false);
    }
  };

  // Staff Add/Edit Modal state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Staff Detail Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Role Add/Edit Modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const staffForm = options?.staffForm;
  const roleForm = options?.roleForm;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_staff_pageSize');
      if (saved) {
        setPageSize(Number(saved));
      }
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    }
  }, []);

  const fetchLegacyStaff = useCallback(async () => {
    try {
      const data = await apiClient.staff.getLegacy();
      setLegacyStaffList(data as SafeAny[]);
    } catch (err) {
      console.error('Fetch legacy staff error:', err);
    }
  }, []);

  useEffect(() => {
    fetchLegacyStaff();
  }, [fetchLegacyStaff]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const data = await apiClient.roles.list();
      setRoles(data as Role[]);
    } catch (err) {
      console.error('Fetch roles error:', err);
      optionsRef.current?.onError?.('Không thể tải danh sách vai trò');
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params: SafeAny = {};
      if (searchQuery) params.search = searchQuery;
      if (filterRole !== 'all') params.role = filterRole;
      if (filterStatus !== 'all') params.isActive = filterStatus;

      const data = await apiClient.staff.list(params);
      setStaffList(data);
    } catch (err) {
      console.error('Fetch staff error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole, filterStatus]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab, fetchStaff]);

  const openStaffModal = (staff: Staff | null = null) => {
    setEditingStaff(staff);
    if (staff) {
      staffForm?.setFieldsValue({
        username: staff.username,
        displayName: staff.displayName,
        role: staff.role,
        isActive: staff.isActive,
        email: staff.email,
        phone: staff.phone,
        joinedAt: staff.joinedAt ? dayjs(staff.joinedAt) : null,
        birthDate: staff.birthDate ? dayjs(staff.birthDate) : null,
        gender: staff.gender,
        address: staff.address,
        emergencyContact: staff.emergencyContact,
        emergencyPhone: staff.emergencyPhone,
        notes: staff.notes,
        password: '',
        legacyStaffId: staff.legacyStaffId || null,
        omicallAutoInit:
          staff.omicallAutoInit === null || staff.omicallAutoInit === undefined ? 'inherit' : staff.omicallAutoInit,
        baseSalary: staff.baseSalary || null,
        hourlyWage: staff.hourlyWage || null,
        seniorityOffset:
          staff.seniorityOffset !== undefined && staff.seniorityOffset !== null ? staff.seniorityOffset : 0,
      });
    } else {
      staffForm?.resetFields();
      staffForm?.setFieldsValue({
        role: roles[0]?.key || 'telesales',
        isActive: true,
        gender: 'Other',
        legacyStaffId: null,
        omicallAutoInit: 'inherit',
        baseSalary: null,
        hourlyWage: null,
        seniorityOffset: 0,
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = async (values: SafeAny) => {
    setStaffSubmitting(true);
    try {
      const payload = {
        ...values,
        joinedAt: values.joinedAt ? values.joinedAt.format('YYYY-MM-DD') : null,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        omicallAutoInit:
          values.omicallAutoInit === 'inherit'
            ? null
            : values.omicallAutoInit === true || values.omicallAutoInit === 'true',
      };

      if (editingStaff && !payload.password) {
        delete payload.password;
      }

      if (editingStaff) {
        await apiClient.staff.update(editingStaff.id, payload);
        optionsRef.current?.onSuccess?.(`Cập nhật nhân viên ${payload.displayName} thành công`);
      } else {
        await apiClient.staff.create(payload);
        optionsRef.current?.onSuccess?.(`Tạo nhân viên ${payload.displayName} thành công`);
      }

      setIsStaffModalOpen(false);
      setEditingStaff(null);
      optionsRef.current?.staffForm?.resetFields();
      fetchStaff();
    } catch (err) {
      console.error('Save staff error:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại thông tin'
      );
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleToggleActive = async (staff: Staff, checked: boolean) => {
    try {
      await apiClient.staff.update(staff.id, { isActive: checked });
      optionsRef.current?.onSuccess?.(`Đã ${checked ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản ${staff.displayName}`);
      fetchStaff();
    } catch (err) {
      console.error('Toggle status error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    try {
      const res = await apiClient.staff.delete(id);
      optionsRef.current?.onSuccess?.((res as SafeAny).message || 'Xóa nhân viên thành công');
      fetchStaff();
    } catch (err) {
      console.error('Delete staff error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể xóa nhân viên');
    }
  };

  const handleImpersonate = async (userId: number, displayName: string) => {
    try {
      const res = await apiClient.auth.impersonate(userId);
      const { token, user } = res;

      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));

      optionsRef.current?.onSuccess?.(`Đang đăng nhập giả lập dưới quyền ${displayName}`);
      window.location.href = '/dashboard/customers';
    } catch (err) {
      console.error('Impersonate error:', err);
      const errMsg = (err as SafeAny).response?.data?.message || 'Đăng nhập giả lập thất bại';
      optionsRef.current?.onError?.(errMsg);
    }
  };

  const openStaffDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setIsDrawerOpen(true);
  };

  const openRoleModal = (role: Role | null = null) => {
    setEditingRole(role);
    if (role) {
      optionsRef.current?.roleForm?.setFieldsValue({
        key: role.key,
        name: role.name,
        color: role.color,
        viewKPI: role.viewKPI,
        viewTeamKPI: role.viewTeamKPI,
        manageStaff: role.manageStaff,
        omicallAutoInit: !!role.omicallAutoInit,
        description: role.description,
      });
    } else {
      optionsRef.current?.roleForm?.resetFields();
      optionsRef.current?.roleForm?.setFieldsValue({
        color: 'default',
        viewKPI: false,
        viewTeamKPI: false,
        manageStaff: false,
        omicallAutoInit: false,
      });
    }
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async (values: SafeAny) => {
    setRoleSubmitting(true);
    try {
      if (editingRole) {
        await apiClient.roles.update(editingRole.key, values);
        optionsRef.current?.onSuccess?.(`Cập nhật vai trò "${values.name}" thành công`);
      } else {
        await apiClient.roles.create(values);
        optionsRef.current?.onSuccess?.(`Tạo vai trò "${values.name}" thành công`);
      }
      setIsRoleModalOpen(false);
      setEditingRole(null);
      optionsRef.current?.roleForm?.resetFields();
      fetchRoles();
      fetchStaff();
    } catch (err) {
      console.error('Submit role error:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Không thể lưu vai trò. Vui lòng kiểm tra lại.'
      );
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async (key: string) => {
    try {
      const res = await apiClient.roles.delete(key);
      optionsRef.current?.onSuccess?.((res as SafeAny).message || 'Xóa vai trò thành công');
      fetchRoles();
    } catch (err) {
      console.error('Delete role error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể xóa vai trò này');
    }
  };

  return {
    activeTab,
    setActiveTab,
    staffList,
    currentUser,
    roles,
    loading,
    rolesLoading,
    legacyStaffList,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    isStaffModalOpen,
    setIsStaffModalOpen,
    editingStaff,
    staffSubmitting,
    isDrawerOpen,
    setIsDrawerOpen,
    selectedStaff,
    isRoleModalOpen,
    setIsRoleModalOpen,
    editingRole,
    roleSubmitting,
    // Methods
    fetchStaff,
    fetchRoles,
    openStaffModal,
    handleStaffSubmit,
    handleToggleActive,
    handleDeleteStaff,
    handleImpersonate,
    openStaffDetails,
    openRoleModal,
    handleRoleSubmit,
    handleDeleteRole,
    syncing,
    handleSyncLegacyStaff,
  };
}
