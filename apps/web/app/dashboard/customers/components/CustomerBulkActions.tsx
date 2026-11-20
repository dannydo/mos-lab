'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Space, Button, Typography, Popconfirm, Select, Dropdown } from 'antd';
import { TeamOutlined, DeleteOutlined, WarningOutlined, RocketOutlined, MoreOutlined } from '@ant-design/icons';
import { RevokeAssignmentModal } from './RevokeAssignmentModal';
import { RetainDataButton } from './RetainDataButton';
import { AddToCampaignModal } from '../../../../components/campaign/AddToCampaignModal';
import { canManageCustomerAllocation, SafeAny, Staff, vietnameseSearchFilter } from '@mos-lab/shared';
import CampaignPlusIcon from '../../../../components/icons/CampaignPlusIcon';
import { AdaptiveModal, ResponsiveFormField, ResponsiveFormGrid } from '../../../../components/ui';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';
import { apiClient } from '../../../../lib/api-client';
import {
  AllocationTeam,
  NO_TEAM_VALUE,
  filterStaff,
  flattenTeams,
  hasNoTeam,
  normalizeRole,
} from './allocationFilters';

const { Text } = Typography;

const ALLOCATION_ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  super_admin: 'Quản trị viên hệ thống',
  manager: 'Quản lý',
  oc: 'Online Consultant',
  cc: 'Client Consultant',
  ls: 'Leader Sales',
  telesales: 'Telesales Executive',
  booker: 'Booker / Telesales',
  technician: 'Chuyên Viên',
  cv: 'Chuyên Viên',
  qa: 'QA',
  qc: 'QC',
  qa_qc: 'QA / QC',
};

function roleLabel(role: string): string {
  const normalizedRole = role.trim().toLowerCase();
  return (
    ALLOCATION_ROLE_LABELS[normalizedRole] ||
    normalizedRole
      .split(/[_-]+/)
      .filter(Boolean)
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(' ')
  );
}

interface CustomerBulkActionsProps {
  themeMode: string;
  token: SafeAny;
  currentUser: SafeAny;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
  setAssignModalVisible: (visible: boolean) => void;
  bulkDeleteLoading: boolean;
  handleBulkDeleteCustomers: () => Promise<void>;
  assignModalVisible: boolean;
  targetStaffId: number | undefined;
  setTargetStaffId: (id: number | undefined) => void;
  staffList: Staff[];
  assigning: boolean;
  unassigning: boolean;
  handleAssignCustomers: (sourceTypeOverride?: unknown, randomBatchId?: string | null) => Promise<void>;
  handleUnassignCustomers: () => Promise<void>;
  onRefresh?: () => void;
  randomBatchId?: string | null;
  defaultCampaignId?: number;
}

const CustomerBulkActions = React.memo(function CustomerBulkActions({
  themeMode,
  token,
  currentUser,
  selectedRowKeys,
  setSelectedRowKeys,
  setAssignModalVisible,
  bulkDeleteLoading,
  handleBulkDeleteCustomers,
  assignModalVisible,
  targetStaffId,
  setTargetStaffId,
  staffList,
  assigning,
  unassigning,
  handleAssignCustomers,
  handleUnassignCustomers,
  onRefresh,
  randomBatchId,
  defaultCampaignId,
}: CustomerBulkActionsProps) {
  const [revokeModalVisible, setRevokeModalVisible] = useState(false);
  const [addToCampaignModalVisible, setAddToCampaignModalVisible] = useState(false);
  const [mobileDeleteConfirmVisible, setMobileDeleteConfirmVisible] = useState(false);
  const [targetRole, setTargetRole] = useState<string | undefined>(undefined);
  const [targetGroupId, setTargetGroupId] = useState<number | undefined>(undefined);
  const [allocationTeams, setAllocationTeams] = useState<AllocationTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';

  const selectedNumericIds = selectedRowKeys.map((k) => Number(k));

  const isManagerOrAdmin = canManageCustomerAllocation(currentUser?.role);
  const activeStaff = useMemo(
    () =>
      staffList
        .filter((staff) => staff.isActive !== false && Boolean(staff.role))
        .slice()
        .sort((left, right) => {
          const byRole = roleLabel(left.role).localeCompare(roleLabel(right.role), 'vi');
          return byRole || (left.displayName || left.username).localeCompare(right.displayName || right.username, 'vi');
        }),
    [staffList]
  );
  useEffect(() => {
    if (!assignModalVisible || teamsLoaded || !isManagerOrAdmin) return;
    let cancelled = false;
    setTeamsLoading(true);
    apiClient.teams
      .list()
      .then((response) => {
        if (!cancelled) setAllocationTeams(flattenTeams(response.teams || []));
      })
      .catch(() => {
        // Group filter degrades gracefully: role filter keeps working.
        if (!cancelled) setAllocationTeams([]);
      })
      .finally(() => {
        if (!cancelled) {
          setTeamsLoaded(true);
          setTeamsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [assignModalVisible, teamsLoaded, isManagerOrAdmin]);

  // Cascading options: role counts respect the chosen group and vice versa.
  const roleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    filterStaff(activeStaff, allocationTeams, undefined, targetGroupId).forEach((staff) => {
      const role = normalizeRole(staff.role);
      counts.set(role, (counts.get(role) || 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({
      value,
      label: `${roleLabel(value)} (${count})`,
    })).sort((left, right) => left.label.localeCompare(right.label, 'vi'));
  }, [activeStaff, allocationTeams, targetGroupId]);

  const groupOptions = useMemo(() => {
    const roleStaff = filterStaff(activeStaff, allocationTeams, targetRole, undefined);
    const byDepartment = new Map<string, Array<{ value: number; label: string }>>();
    allocationTeams.forEach((team) => {
      const count = filterStaff(roleStaff, allocationTeams, undefined, team.id).length;
      if (count === 0) return;
      const list = byDepartment.get(team.departmentName) || [];
      list.push({ value: team.id, label: `${team.name} (${count})` });
      byDepartment.set(team.departmentName, list);
    });
    const groups: Array<{ label: string; options: Array<{ value: number; label: string }> }> = Array.from(
      byDepartment,
      ([label, options]) => ({ label, options })
    );
    const noTeamCount = roleStaff.filter((staff) => hasNoTeam(staff, allocationTeams)).length;
    if (noTeamCount > 0) {
      groups.push({
        label: 'Khác',
        options: [{ value: NO_TEAM_VALUE, label: `Chưa thuộc nhóm nào (${noTeamCount})` }],
      });
    }
    return groups;
  }, [activeStaff, allocationTeams, targetRole]);

  const filteredStaff = useMemo(
    () => filterStaff(activeStaff, allocationTeams, targetRole, targetGroupId),
    [activeStaff, allocationTeams, targetRole, targetGroupId]
  );

  const staffDetailLabel = (staff: Staff): string => {
    const legacyId = staff.legacyStaffId == null ? undefined : Number(staff.legacyStaffId);
    const teamNames =
      legacyId == null
        ? []
        : allocationTeams.filter((team) => team.directLegacyStaffIds.has(legacyId)).map((team) => team.name);
    return [
      `${staff.displayName || staff.username} (ID: ${staff.id})`,
      roleLabel(staff.role),
      teamNames.length > 0 ? teamNames.join(', ') : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const handleRoleChange = (value: string | undefined) => {
    setTargetRole(value || undefined);
    const stillValid = filterStaff(activeStaff, allocationTeams, value || undefined, targetGroupId);
    if (targetGroupId != null && stillValid.length === 0) setTargetGroupId(undefined);
    if (targetStaffId != null && !stillValid.some((staff) => staff.id === targetStaffId)) {
      setTargetStaffId(undefined);
    }
  };

  const handleGroupChange = (value: number | undefined) => {
    const nextGroup = value ?? undefined;
    setTargetGroupId(nextGroup);
    const stillValid = filterStaff(activeStaff, allocationTeams, targetRole, nextGroup);
    if (targetRole && stillValid.length === 0) setTargetRole(undefined);
    if (targetStaffId != null && !stillValid.some((staff) => staff.id === targetStaffId)) {
      setTargetStaffId(undefined);
    }
  };

  if (selectedRowKeys.length === 0 || !isManagerOrAdmin) {
    return null;
  }

  return (
    <>
      <div
        className="customer-bulk-actions"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: themeMode === 'dark' ? '#1f1f1f' : '#e6f7ff',
          border: `1px solid ${themeMode === 'dark' ? '#303030' : '#91d5ff'}`,
          borderRadius: '8px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Space>
          <Text strong style={{ color: token.colorText }}>
            Đã chọn{' '}
            <span style={{ color: token.colorPrimary, fontSize: '16px' }} className="tabular-nums font-bold">
              {selectedRowKeys.length}
            </span>{' '}
            khách hàng
          </Text>
        </Space>
        {isMobile ? (
          <Space className="customer-bulk-actions-mobile" size={6}>
            <Button onClick={() => setSelectedRowKeys([])} style={{ borderRadius: '6px' }}>
              Hủy
            </Button>
            <RetainDataButton
              mode="bulk-compact"
              selectedRowKeys={selectedRowKeys}
              onSuccess={() => {
                setSelectedRowKeys([]);
                if (onRefresh) onRefresh();
              }}
            />
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => setAssignModalVisible(true)}
              style={{ borderRadius: '6px', fontWeight: 600 }}
            >
              Phân bổ data
            </Button>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'campaign',
                    icon: <CampaignPlusIcon fontSize={16} badgeBg="#047857" />,
                    label: 'Thêm vào chiến dịch',
                    onClick: () => setAddToCampaignModalVisible(true),
                  },
                  {
                    key: 'revoke',
                    danger: true,
                    icon: <WarningOutlined />,
                    label: 'Thu hồi data',
                    onClick: () => setRevokeModalVisible(true),
                  },
                  { type: 'divider' },
                  {
                    key: 'delete',
                    danger: true,
                    icon: <DeleteOutlined />,
                    label: 'Xóa hàng loạt',
                    onClick: () => setMobileDeleteConfirmVisible(true),
                  },
                ],
              }}
            >
              <Button aria-label="Thao tác khác" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        ) : (
          <Space flex-wrap="wrap">
            <Button onClick={() => setSelectedRowKeys([])} style={{ borderRadius: '6px' }}>
              Hủy chọn
            </Button>
            <RetainDataButton
              mode="bulk"
              selectedRowKeys={selectedRowKeys}
              onSuccess={() => {
                setSelectedRowKeys([]);
                if (onRefresh) onRefresh();
              }}
            />
            <Button
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => setAssignModalVisible(true)}
              style={{ borderRadius: '6px', fontWeight: 600 }}
            >
              Phân bổ data
            </Button>

            <Button
              type="primary"
              icon={<CampaignPlusIcon fontSize={16} badgeBg="#047857" />}
              onClick={() => setAddToCampaignModalVisible(true)}
              style={{
                background: '#10b981',
                borderColor: '#10b981',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Thêm vào chiến dịch
            </Button>

            {isManagerOrAdmin && (
              <Button
                danger
                icon={<WarningOutlined />}
                onClick={() => setRevokeModalVisible(true)}
                style={{ borderRadius: '6px', fontWeight: 600 }}
              >
                Thu hồi data
              </Button>
            )}

            {isManagerOrAdmin && (
              <Popconfirm
                title={`Anh/chị có chắc chắn muốn xóa ${selectedRowKeys.length} khách hàng đã chọn không?`}
                onConfirm={handleBulkDeleteCustomers}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: bulkDeleteLoading }}
              >
                <Button
                  danger
                  type="primary"
                  icon={<DeleteOutlined />}
                  loading={bulkDeleteLoading}
                  style={{ borderRadius: '6px', fontWeight: 600 }}
                >
                  Xóa hàng loạt
                </Button>
              </Popconfirm>
            )}
          </Space>
        )}
      </div>

      <RevokeAssignmentModal
        visible={revokeModalVisible}
        onClose={() => setRevokeModalVisible(false)}
        onSuccess={() => {
          setSelectedRowKeys([]);
          if (onRefresh) onRefresh();
        }}
        customerIds={selectedNumericIds}
        staffList={staffList}
        parentBatchId={randomBatchId}
      />

      <AddToCampaignModal
        visible={addToCampaignModalVisible}
        onClose={() => setAddToCampaignModalVisible(false)}
        selectedCustomerIds={selectedNumericIds}
        initialCampaignId={defaultCampaignId}
        onSuccess={() => {
          setSelectedRowKeys([]);
          if (onRefresh) onRefresh();
        }}
      />

      <AdaptiveModal
        intent="confirm"
        open={mobileDeleteConfirmVisible}
        title="Xóa khách hàng đã chọn?"
        onCancel={() => setMobileDeleteConfirmVisible(false)}
        onOk={async () => {
          await handleBulkDeleteCustomers();
          setMobileDeleteConfirmVisible(false);
        }}
        okText="Xóa"
        cancelText="Hủy"
        confirmLoading={bulkDeleteLoading}
        okButtonProps={{ danger: true }}
      >
        Bạn sắp xóa {selectedRowKeys.length} khách hàng đã chọn. Khách hàng sẽ được chuyển vào thùng rác.
      </AdaptiveModal>

      {/* MODAL PHÂN BỔ DATA */}
      <AdaptiveModal
        intent="form"
        className="customer-allocation-overlay"
        title={`Phân bổ ${selectedRowKeys.length} khách hàng`}
        open={assignModalVisible}
        onOk={() => handleAssignCustomers(undefined, randomBatchId)}
        onCancel={() => {
          setAssignModalVisible(false);
          setTargetRole(undefined);
          setTargetGroupId(undefined);
          setTargetStaffId(undefined);
        }}
        confirmLoading={assigning}
        okText="Xác nhận Phân bổ"
        cancelText="Hủy"
        okButtonProps={{
          disabled: !targetStaffId,
        }}
      >
        <div style={{ margin: '16px 0' }}>
          <ResponsiveFormGrid columns={2}>
            <ResponsiveFormField>
              <p className="mb-2">1. Chọn vai trò (tùy chọn):</p>
              <Select
                showSearch
                allowClear
                className="w-full"
                placeholder="Tất cả vai trò"
                value={targetRole}
                onChange={handleRoleChange}
                filterOption={vietnameseSearchFilter}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={roleOptions}
              />
            </ResponsiveFormField>
            <ResponsiveFormField>
              <p className="mb-2">2. Chọn nhóm (tùy chọn):</p>
              <Select
                showSearch
                allowClear
                className="w-full"
                placeholder="Tất cả nhóm"
                loading={teamsLoading}
                value={targetGroupId}
                onChange={handleGroupChange}
                filterOption={vietnameseSearchFilter}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={groupOptions}
              />
            </ResponsiveFormField>
            <ResponsiveFormField fullWidth>
              <p className="mb-2">
                3. Chọn nhân sự nhận phân bổ{' '}
                <Text type="secondary" className="tabular-nums">
                  ({filteredStaff.length} nhân sự)
                </Text>
                :
              </p>
              <Select
                showSearch
                className="w-full"
                placeholder="Tìm và chọn nhân sự..."
                value={targetStaffId}
                onChange={(value) => setTargetStaffId(value)}
                notFoundContent="Không có nhân sự phù hợp"
                filterOption={vietnameseSearchFilter}
                getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                options={filteredStaff.map((staff) => ({
                  value: staff.id,
                  label: staffDetailLabel(staff),
                }))}
              />
            </ResponsiveFormField>
          </ResponsiveFormGrid>

          <Alert
            className="mt-4"
            type="info"
            showIcon
            message="Assignment được giữ lâu dài"
            description="Sau khi nhân sự nhận phân bổ chấp nhận, data chỉ rời danh sách khi Quản lý chủ động thu hồi hoặc phân bổ lại."
          />
        </div>
      </AdaptiveModal>
    </>
  );
});

export default CustomerBulkActions;
