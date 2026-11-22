'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Form, message, type FormInstance } from 'antd';
import { useRouter } from 'next/navigation';
import type {
  Campaign,
  CampaignStatus,
  CustomerServiceFilterCategory,
  CustomerServiceFilterOption,
  Staff,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { getFixedFinalPriceServiceCategories, getFixedFinalPriceServiceOptions } from '~/lib/campaign-fixed-price';
import { normalizeCampaignAccessStaff } from '~/lib/campaign-form-options';
import type { CampaignDetailRecord, CampaignFormValues } from './campaignManagementTypes';
import {
  buildCampaignMutationPayloads,
  buildCreateCampaignInitialValues,
  extractCampaignApiError,
  filterCampaignsByQuery,
  isCampaignAdminUser,
  mapCampaignDetailsToFormValues,
  readCampaignVisibilityMap,
  readSidebarShowCustomCampaigns,
  readStoredCampaignUser,
  writeCampaignVisibilityMap,
  writeSidebarShowCustomCampaigns,
} from './campaignManagementUtils';

function applyCampaignFormValues(form: FormInstance<CampaignFormValues>, values: CampaignFormValues): void {
  const { dates, ...restValues } = values;
  form.resetFields();
  if (dates) {
    form.setFieldsValue({ ...restValues, dates });
    return;
  }
  form.setFieldsValue(restValues);
  if (dates === null) {
    form.setFieldValue('dates', null);
  }
}

export function useCampaignManagement() {
  const router = useRouter();
  const [form] = Form.useForm<CampaignFormValues>();
  const modalFormTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  const [showInSidebar, setShowInSidebar] = useState<boolean>(() => readSidebarShowCustomCampaigns());
  const [campaignVisibilityMap, setCampaignVisibilityMap] = useState<Record<string, boolean>>(() =>
    readCampaignVisibilityMap()
  );

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceFilterOptions, setServiceFilterOptions] = useState<CustomerServiceFilterOption[]>([]);
  const [serviceFilterCategories, setServiceFilterCategories] = useState<CustomerServiceFilterCategory[]>([]);
  const [campaignFormOptionsLoading, setCampaignFormOptionsLoading] = useState<boolean>(true);
  const [campaignFormOptionsError, setCampaignFormOptionsError] = useState<string | null>(null);

  const clearPendingModalTimer = useCallback(() => {
    if (modalFormTimerRef.current) {
      clearTimeout(modalFormTimerRef.current);
      modalFormTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingModalTimer, [clearPendingModalTimer]);

  useEffect(() => {
    let cancelled = false;
    const loadCampaignFormOptions = async () => {
      setCampaignFormOptionsLoading(true);
      setCampaignFormOptionsError(null);
      try {
        const [bookerRows, serviceResponse] = await Promise.all([
          apiClient.customers.getStaff({ role: 'booker' }),
          apiClient.customers.getServiceFilterOptions(),
        ]);
        let availableStaff = normalizeCampaignAccessStaff(bookerRows);
        if (availableStaff.length === 0) {
          availableStaff = normalizeCampaignAccessStaff(await apiClient.customers.getStaff());
        }
        if (!cancelled) {
          setStaffList(availableStaff);
          setServiceFilterOptions(serviceResponse.services || []);
          setServiceFilterCategories(serviceResponse.categories || []);
        }
      } catch (error) {
        console.error('Failed to load campaign form options:', error);
        if (!cancelled) {
          setCampaignFormOptionsError('Không thể tải danh sách thành viên hoặc dịch vụ. Hãy thử tải lại trang.');
        }
      } finally {
        if (!cancelled) setCampaignFormOptionsLoading(false);
      }
    };

    void loadCampaignFormOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const user = readStoredCampaignUser();
    setUserRole(user.role);
    setUserName(user.userName);
  }, []);

  const fixedFinalPriceServices = useMemo(
    () => getFixedFinalPriceServiceOptions(serviceFilterOptions),
    [serviceFilterOptions]
  );

  const fixedFinalPriceCategories = useMemo(
    () => getFixedFinalPriceServiceCategories(serviceFilterCategories, fixedFinalPriceServices),
    [serviceFilterCategories, fixedFinalPriceServices]
  );

  const isAdmin = useMemo(() => isCampaignAdminUser(userRole, userName), [userRole, userName]);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter as CampaignStatus } : undefined;
      const res = (await apiClient.campaigns.list(params)) as Campaign[] | { items?: Campaign[]; data?: Campaign[] };
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      setCampaigns(list);
    } catch (error) {
      console.error('Fetch campaigns error:', error);
      message.error('Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = useMemo(() => filterCampaignsByQuery(campaigns, searchQuery), [campaigns, searchQuery]);

  const handleToggleSidebar = useCallback((checked: boolean) => {
    setShowInSidebar(checked);
    writeSidebarShowCustomCampaigns(checked);
  }, []);

  const handleToggleCampaignSidebar = useCallback(
    (campaign: Campaign, checked: boolean) => {
      const updatedMap = {
        ...campaignVisibilityMap,
        [campaign.slug]: checked,
        [String(campaign.id)]: checked,
      };
      setCampaignVisibilityMap(updatedMap);
      writeCampaignVisibilityMap(updatedMap);
      message.success(`Đã ${checked ? 'hiển thị' : 'ẩn'} link chiến dịch "${campaign.name}" trên Sidebar`);
    },
    [campaignVisibilityMap]
  );

  const handleOpenCreate = useCallback(() => {
    clearPendingModalTimer();
    setEditingCampaign(null);
    setIsModalOpen(true);
    modalFormTimerRef.current = setTimeout(() => {
      applyCampaignFormValues(form, buildCreateCampaignInitialValues());
    }, 50);
  }, [clearPendingModalTimer, form]);

  const handleOpenEdit = useCallback(
    async (campaign: Campaign) => {
      clearPendingModalTimer();
      setEditingCampaign(campaign);
      setIsModalOpen(true);
      try {
        const details = (await apiClient.campaigns.getById(campaign.id)) as CampaignDetailRecord;
        const formValues = mapCampaignDetailsToFormValues(details, campaignVisibilityMap);
        modalFormTimerRef.current = setTimeout(() => {
          applyCampaignFormValues(form, formValues);
        }, 50);
      } catch (error) {
        console.error('Fetch campaign details error:', error);
        message.error('Không thể tải chi tiết chiến dịch để chỉnh sửa');
      }
    },
    [campaignVisibilityMap, clearPendingModalTimer, form]
  );

  const handleCloseModal = useCallback(() => {
    clearPendingModalTimer();
    setIsModalOpen(false);
  }, [clearPendingModalTimer]);

  const runCampaignAction = useCallback(
    async (logLabel: string, action: () => Promise<unknown>, successMessage: string, errorFallback: string) => {
      try {
        await action();
        message.success(successMessage);
        void fetchCampaigns();
      } catch (error) {
        console.error(`${logLabel} error:`, error);
        message.error(extractCampaignApiError(error, errorFallback));
      }
    },
    [fetchCampaigns]
  );

  const handleEndCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'End campaign',
        () => apiClient.campaigns.endCampaign(campaign.id),
        'Đã kết thúc chiến dịch thành công',
        'Không thể kết thúc chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleDeleteCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Delete campaign',
        () => apiClient.campaigns.delete(campaign.id),
        'Đã xóa chiến dịch thành công',
        'Không thể xóa chiến dịch'
      ),
    [runCampaignAction]
  );

  const handlePauseCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Pause campaign',
        () => apiClient.campaigns.pause(campaign.id),
        `Đã tạm dừng chiến dịch "${campaign.name}"`,
        'Không thể tạm dừng chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleResumeCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Resume campaign',
        () => apiClient.campaigns.resume(campaign.id),
        `Đã tiếp tục/kích hoạt chiến dịch "${campaign.name}"`,
        'Không thể kích hoạt chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleCompleteCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Complete campaign',
        () => apiClient.campaigns.complete(campaign.id),
        `Đã hoàn thành chốt sổ chiến dịch "${campaign.name}"`,
        'Không thể chốt sổ chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleArchiveCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Archive campaign',
        () => apiClient.campaigns.archive(campaign.id),
        `Đã lưu trữ chiến dịch "${campaign.name}"`,
        'Không thể lưu trữ chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleUnarchiveCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Unarchive campaign',
        () => apiClient.campaigns.unarchive(campaign.id),
        `Đã bỏ lưu trữ chiến dịch "${campaign.name}"`,
        'Không thể bỏ lưu trữ chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleReopenCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Reopen campaign',
        () => apiClient.campaigns.reopen(campaign.id),
        `Đã gia hạn & mở lại chiến dịch "${campaign.name}" 30 ngày`,
        'Không thể mở lại chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleRestoreCampaign = useCallback(
    (campaign: Campaign) =>
      runCampaignAction(
        'Restore campaign',
        () => apiClient.campaigns.restore(campaign.id),
        `Đã khôi phục chiến dịch "${campaign.name}" về trạng thái Đang hoạt động`,
        'Không thể khôi phục chiến dịch'
      ),
    [runCampaignAction]
  );

  const handleCloneCampaign = useCallback(
    async (campaign: Campaign) => {
      try {
        const cloned = (await apiClient.campaigns.clone(campaign.id)) as { name?: string } | null;
        message.success(`Đã nhân bản chiến dịch thành "${cloned?.name || 'Bản sao'}" (Nháp)`);
        void fetchCampaigns();
      } catch (error) {
        console.error('Clone campaign error:', error);
        message.error(extractCampaignApiError(error, 'Không thể nhân bản chiến dịch'));
      }
    },
    [fetchCampaigns]
  );

  const handleSubmit = useCallback(
    async (values: CampaignFormValues) => {
      setSubmitting(true);
      try {
        const { updateDto, createDto } = buildCampaignMutationPayloads(
          values,
          editingCampaign,
          fixedFinalPriceServices,
          fixedFinalPriceCategories
        );

        if (editingCampaign && updateDto) {
          await apiClient.campaigns.update(editingCampaign.id, updateDto);
          message.success('Đã cập nhật chiến dịch thành công');
        } else if (createDto) {
          await apiClient.campaigns.create(createDto);
          message.success('Tạo chiến dịch mới thành công');
        }

        if (values.showInSidebar !== undefined) {
          const targetSlug = editingCampaign ? editingCampaign.slug : values.slug;
          if (targetSlug) {
            const updatedMap: Record<string, boolean> = {
              ...campaignVisibilityMap,
              [targetSlug]: values.showInSidebar,
            };
            if (editingCampaign) {
              updatedMap[String(editingCampaign.id)] = values.showInSidebar;
            }
            setCampaignVisibilityMap(updatedMap);
            writeCampaignVisibilityMap(updatedMap);
          }
        }

        setIsModalOpen(false);
        void fetchCampaigns();
      } catch (error) {
        console.error('Submit campaign error:', error);
        message.error(extractCampaignApiError(error, 'Thao tác thất bại'));
      } finally {
        setSubmitting(false);
      }
    },
    [campaignVisibilityMap, editingCampaign, fetchCampaigns, fixedFinalPriceCategories, fixedFinalPriceServices]
  );

  const handleViewCampaign = useCallback(
    (campaign: Campaign) => {
      router.push(`/dashboard/nyc/campaigns/${campaign.slug}`);
    },
    [router]
  );

  return {
    form,
    loading,
    statusFilter,
    searchQuery,
    isAdmin,
    showInSidebar,
    campaignVisibilityMap,
    isModalOpen,
    editingCampaign,
    submitting,
    staffList,
    campaignFormOptionsLoading,
    campaignFormOptionsError,
    fixedFinalPriceServices,
    fixedFinalPriceCategories,
    filteredCampaigns,
    setStatusFilter,
    setSearchQuery,
    handleToggleSidebar,
    handleToggleCampaignSidebar,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleEndCampaign,
    handleDeleteCampaign,
    handlePauseCampaign,
    handleResumeCampaign,
    handleCompleteCampaign,
    handleArchiveCampaign,
    handleUnarchiveCampaign,
    handleReopenCampaign,
    handleCloneCampaign,
    handleRestoreCampaign,
    handleSubmit,
    handleViewCampaign,
  };
}
