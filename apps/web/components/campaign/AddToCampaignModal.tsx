'use client';

import type { Key } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { AddCampaignCustomersResponse, Campaign } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../../context/ThemeContext';
import {
  filterAddCustomerDetails,
  groupSkippedCustomersByCampaign,
  markCustomersTransferredInResult,
  type AddToCampaignStatusFilter,
} from './add-to-campaign/add-to-campaign-utils';
import { AddToCampaignResultModal } from './add-to-campaign/AddToCampaignResultModal';
import { AddToCampaignSelectModal } from './add-to-campaign/AddToCampaignSelectModal';

interface AddToCampaignModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCustomerIds: number[];
  customerName?: string;
  initialCampaignId?: number;
  onSuccess: () => void;
}

export function AddToCampaignModal({
  visible,
  onClose,
  selectedCustomerIds,
  customerName,
  initialCampaignId,
  onSuccess,
}: AddToCampaignModalProps) {
  const { themeMode } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [transferring, setTransferring] = useState<boolean>(false);
  const [resultData, setResultData] = useState<AddCampaignCustomersResponse | null>(null);

  // Result Summary View Controls (Search, Filter, Checkbox selection, Table Page Size)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<AddToCampaignStatusFilter>('ALL');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    if (visible) {
      fetchActiveCampaigns();
      setResultData(null);
      setSearchQuery('');
      setStatusFilter('ALL');
      setSelectedRowKeys([]);
    } else {
      setSelectedCampaignId(null);
      setResultData(null);
      setSearchQuery('');
      setStatusFilter('ALL');
      setSelectedRowKeys([]);
    }
  }, [visible]);

  const fetchActiveCampaigns = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.campaigns.list({ pageSize: 100 });
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      const selectable = list.filter((c: any) => !['COMPLETED', 'ENDED', 'ARCHIVED', 'DELETED'].includes(c.status));
      setCampaigns(selectable);
      if (initialCampaignId && selectable.some((c: any) => c.id === initialCampaignId)) {
        setSelectedCampaignId(initialCampaignId);
      } else if (selectable.length > 0) {
        setSelectedCampaignId(selectable[0].id);
      }
    } catch (err) {
      console.error('Fetch active campaigns error:', err);
      message.error('Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCampaignId) {
      message.warning('Vui lòng chọn 1 chiến dịch');
      return;
    }
    if (!selectedCustomerIds || selectedCustomerIds.length === 0) {
      message.warning('Không có khách hàng nào được chọn');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      const res = await apiClient.campaigns.addCustomers(selectedCampaignId, {
        customerIds: selectedCustomerIds,
      });

      if (res && res.details && res.details.length > 0 && res.skippedCount > 0) {
        // Show result summary report modal if there are skipped customers
        setResultData(res);
      } else {
        message.success(
          res?.message ||
            `Đã thêm ${res?.addedCount || selectedCustomerIds.length} khách hàng vào chiến dịch "${selectedCampaign?.name}"!`
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Add customers to campaign error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thêm khách hàng vào chiến dịch';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  const handleTransferSingle = async (userId: number) => {
    if (!selectedCampaignId) return;
    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds: [userId],
        reason: `Chuyển trực tiếp sang chiến dịch "${selectedCampaign?.name}"`,
      });
      message.success(`Đã chuyển khách hàng sang chiến dịch "${selectedCampaign?.name}" thành công!`);

      setResultData((prev) => markCustomersTransferredInResult(prev, [userId]));
      setSelectedRowKeys((prev) => prev.filter((k) => k !== userId));
    } catch (err: any) {
      console.error('Transfer customer error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển chiến dịch');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferGroup = async (groupCampaignName: string, customerIds: number[]) => {
    if (!selectedCampaignId || customerIds.length === 0) return;
    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds,
        reason: `Chuyển nhóm ${customerIds.length} KH từ "${groupCampaignName}" sang "${selectedCampaign?.name}"`,
      });
      message.success(`Đã chuyển nhóm ${customerIds.length} KH từ chiến dịch "${groupCampaignName}" thành công!`);

      setResultData((prev) => markCustomersTransferredInResult(prev, customerIds));
      setSelectedRowKeys((prev) => prev.filter((k) => !customerIds.includes(Number(k))));
    } catch (err: any) {
      console.error('Transfer group error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển nhóm chiến dịch');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferSelectedCheckboxes = async () => {
    if (!selectedCampaignId || selectedRowKeys.length === 0 || !resultData) return;
    const targetIds = selectedRowKeys.map((k) => Number(k));
    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds: targetIds,
        reason: `Chuyển ${targetIds.length} KH chọn lọc sang chiến dịch "${selectedCampaign?.name}"`,
      });
      message.success(
        `Đã chuyển ${targetIds.length} khách hàng đã chọn sang chiến dịch "${selectedCampaign?.name}" thành công!`
      );

      setResultData((prev) => markCustomersTransferredInResult(prev, targetIds));
      setSelectedRowKeys([]);
    } catch (err: any) {
      console.error('Transfer selected checkboxes error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển khách hàng đã chọn');
    } finally {
      setTransferring(false);
    }
  };

  const handleTransferAll = async () => {
    if (!selectedCampaignId || !resultData) return;
    const skippedIds = resultData.details
      .filter((d) => d.status === 'SKIPPED' && d.currentCampaignId && d.currentCampaignId !== selectedCampaignId)
      .map((d) => d.legacyUserId);

    if (skippedIds.length === 0) return;

    setTransferring(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      await apiClient.campaigns.transferCustomers(selectedCampaignId, {
        customerIds: skippedIds,
        reason: `Chuyển hàng loạt sang chiến dịch "${selectedCampaign?.name}"`,
      });
      message.success(
        `Đã chuyển ${skippedIds.length} khách hàng sang chiến dịch "${selectedCampaign?.name}" thành công!`
      );

      setResultData((prev) => markCustomersTransferredInResult(prev, skippedIds, true));
      setSelectedRowKeys([]);
    } catch (err: any) {
      console.error('Transfer all error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển tất cả chiến dịch');
    } finally {
      setTransferring(false);
    }
  };

  // Group skipped customers by existing campaign
  const campaignGroups = useMemo(() => {
    if (!resultData) return [];
    return groupSkippedCustomersByCampaign(resultData.details, selectedCampaignId);
  }, [resultData, selectedCampaignId]);

  // Filter details based on search and statusFilter
  const filteredDetails = useMemo(() => {
    if (!resultData) return [];
    return filterAddCustomerDetails(resultData.details, statusFilter, searchQuery);
  }, [resultData, statusFilter, searchQuery]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Render Result Summary View when resultData is present
  if (resultData) {
    return (
      <AddToCampaignResultModal
        visible={visible}
        onDone={handleDone}
        resultData={resultData}
        campaignGroups={campaignGroups}
        filteredDetails={filteredDetails}
        selectedCampaignId={selectedCampaignId}
        statusFilter={statusFilter}
        onChangeStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        selectedRowKeys={selectedRowKeys}
        onChangeSelectedRowKeys={setSelectedRowKeys}
        pageSize={pageSize}
        onChangePageSize={setPageSize}
        transferring={transferring}
        onTransferSingle={handleTransferSingle}
        onTransferGroup={handleTransferGroup}
        onTransferSelectedCheckboxes={handleTransferSelectedCheckboxes}
        onTransferAll={handleTransferAll}
        themeMode={themeMode}
      />
    );
  }

  return (
    <AddToCampaignSelectModal
      visible={visible}
      onClose={onClose}
      customerName={customerName}
      selectedCustomerCount={selectedCustomerIds.length}
      campaigns={campaigns}
      selectedCampaignId={selectedCampaignId}
      onChangeSelectedCampaignId={setSelectedCampaignId}
      selectedCampaign={selectedCampaign}
      loading={loading}
      submitting={submitting}
      onConfirm={handleConfirm}
      themeMode={themeMode}
    />
  );
}
