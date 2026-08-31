'use client';

import '../../suppress-warnings';
import React from 'react';
import { Tabs, Button, Select, Dropdown, theme, Space, Badge, message } from 'antd';
import { ArrowDownAZ, CalendarPlus, History, Settings2, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
import { useCustomerData } from './hooks/useCustomerData';
import CustomerFilters from './components/CustomerFilters';
import CustomerBulkActions from './components/CustomerBulkActions';
import CustomerTable from './components/CustomerTable';
import { RetainDataButton } from './components/RetainDataButton';
import AllocationBatchHeader from './components/AllocationBatchHeader';
import CustomerRandomSelectorModal from './components/CustomerRandomSelectorModal';
import {
  CollapsibleSearchField,
  ContentSurface,
  IconButton,
  ResourceListPage,
  StatePanel,
} from '../../../components/ui';
import { useResponsiveTier } from '../../../hooks/useResponsiveTier';
import { canManageCustomerAllocation } from '@mos-lab/shared';

const UndoReasonModal = dynamic(() => import('./components/UndoReasonModal').then((m) => m.UndoReasonModal), {
  ssr: false,
});
const RevokeAssignmentModal = dynamic(
  () => import('./components/RevokeAssignmentModal').then((m) => m.RevokeAssignmentModal),
  { ssr: false }
);
const SMSModal = dynamic(() => import('../../../components/sms/SMSModal').then((m) => m.SMSModal), { ssr: false });
const AssignmentHistoryDrawer = dynamic(
  () => import('./components/AssignmentHistoryDrawer').then((m) => m.AssignmentHistoryDrawer),
  { ssr: false }
);

const PRESET_FILTERS = [
  {
    id: 'preset_nyc_30',
    name: 'NYC 30 (0 - 30 ngày)',
    criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 0, daysSinceLastVisitMax: 30 },
  },
  {
    id: 'preset_nyc_60',
    name: 'NYC 60 (31 - 60 ngày)',
    criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 31, daysSinceLastVisitMax: 60 },
  },
  {
    id: 'preset_nyc_90',
    name: 'NYC 90 (61 - 90 ngày)',
    criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 61, daysSinceLastVisitMax: 90 },
  },
  {
    id: 'preset_nyc_180',
    name: 'NYC 180 (91 - 180 ngày)',
    criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 91, daysSinceLastVisitMax: 180 },
  },
  {
    id: 'preset_nyc_365',
    name: 'NYC 365 (181 - 365 ngày)',
    criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 181, daysSinceLastVisitMax: 365 },
  },
  {
    id: 'preset_nyc_365plus',
    name: 'NYC 365+ (> 365 ngày)',
    criteria: { bucket: 'NOT_COMBO_LIVE', daysSinceLastVisitMin: 366 },
  },
];

function CustomersPageContent() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';
  const tableRef = React.useRef<{ openConfig: () => void } | null>(null);

  const data = useCustomerData({
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
    onInfo: (msg) => message.info(msg),
    onWarning: (msg) => message.warning(msg),
  });

  const {
    setModalVisible,
    setBookingInitialCustomer,
    setBookingWizardVisible,
    pageSize,
    activeTab,
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    refreshListAndStats,
    selectedCustomer,
    setSelectedCustomer,
  } = data;

  const [smsModalVisible, setSmsModalVisible] = React.useState<boolean>(false);
  const handleOpenSmsModal = React.useCallback(
    (customer: SafeAny) => {
      setSelectedCustomer(customer);
      setSmsModalVisible(true);
    },
    [setSelectedCustomer]
  );

  const handleDeleteSuccess = React.useCallback(() => {
    setModalVisible(false);
    refreshListAndStats();
  }, [setModalVisible, refreshListAndStats]);

  const handleBookingWizardClose = React.useCallback(() => {
    setBookingWizardVisible(false);
    setBookingInitialCustomer(null);
  }, [setBookingWizardVisible, setBookingInitialCustomer]);

  const handleBookingWizardSuccess = React.useCallback(() => {
    refreshListAndStats();
  }, [refreshListAndStats]);

  const getTabLabel = (key: string, baseLabel: string, count: number) => {
    const colorByTab: Record<string, string> = {
      COMBO_LIVE: token.colorSuccess,
      NOT_COMBO_LIVE: token.colorInfo,
      COMBO_DEAD: token.colorError,
      SINGLE: token.colorPrimary,
    };

    return (
      <Space size={6}>
        {baseLabel}
        <Badge count={count} overflowCount={99999} color={colorByTab[key]} />
      </Space>
    );
  };

  const [undoModalState, setUndoModalState] = React.useState<{
    visible: boolean;
    batchId: string | null;
    customerCount?: number;
  }>({
    visible: false,
    batchId: null,
  });

  const [revokeBatchModalState, setRevokeBatchModalState] = React.useState<{
    visible: boolean;
    customerIds: number[];
    batchId?: string | null;
  }>({
    visible: false,
    customerIds: [],
    batchId: null,
  });

  const isManagerOrAdmin = canManageCustomerAllocation(data.currentUser?.role);
  const sortOptions = [
    { value: 'id_desc', label: 'Mới nhất' },
    { value: 'name_asc', label: 'Tên A → Z' },
    { value: 'daysSinceLastVisit_desc', label: 'Chưa ghé lâu nhất' },
    { value: 'daysSinceLastVisit_asc', label: 'Chưa ghé gần đây' },
    { value: 'totalSpent_desc', label: 'Chi tiêu giảm dần' },
  ];
  const activeSortLabel = sortOptions.find((option) => option.value === data.sortField)?.label ?? 'Sắp xếp';
  const handleSortChange = (value: string) => {
    data.setSortField(value);
    data.setCurrentPage(1);
  };

  return (
    <ResourceListPage
      className="customer-page"
      title="Danh Sách Khách Hàng"
      subtitle="Quản lý phân loại và phân bổ data real-time"
      headerActions={
        <IconButton
          label="Đặt lịch mới"
          icon={CalendarPlus}
          tone="primary"
          onClick={() => data.setBookingWizardVisible(true)}
        />
      }
      toolbar={{
        className: 'customer-toolbar',
        primary: (
          <>
            <CollapsibleSearchField
              placeholder="Tìm tên hoặc SĐT..."
              searchButtonLabel="Tìm khách hàng"
              expandButtonLabel="Mở tìm kiếm khách hàng"
              allowClear
              size="middle"
              onSearch={data.handleSearch}
              className="customer-search"
              expandedWidth={280}
            />

            <CustomerFilters
              themeMode={themeMode}
              currentUser={data.currentUser}
              hasActiveFilters={data.hasActiveFilters}
              clearFilters={data.clearFilters}
              applyFilter={data.applyFilter}
              savedFilters={data.savedFilters}
              handleDeleteFilter={data.handleDeleteFilter}
              filterDrawerVisible={data.filterDrawerVisible}
              setFilterDrawerVisible={data.setFilterDrawerVisible}
              daysSinceLastVisitMin={data.daysSinceLastVisitMin}
              setDaysSinceLastVisitMin={data.setDaysSinceLastVisitMin}
              daysSinceLastVisitMax={data.daysSinceLastVisitMax}
              setDaysSinceLastVisitMax={data.setDaysSinceLastVisitMax}
              totalSpentMin={data.totalSpentMin}
              setTotalSpentMin={data.setTotalSpentMin}
              totalSpentMax={data.totalSpentMax}
              setTotalSpentMax={data.setTotalSpentMax}
              totalVisitsMin={data.totalVisitsMin}
              setTotalVisitsMin={data.setTotalVisitsMin}
              totalVisitsMax={data.totalVisitsMax}
              setTotalVisitsMax={data.setTotalVisitsMax}
              serviceIds={data.serviceIds}
              setServiceIds={data.setServiceIds}
              serviceCategories={data.serviceCategories}
              setServiceCategories={data.setServiceCategories}
              serviceVisitCountMin={data.serviceVisitCountMin}
              setServiceVisitCountMin={data.setServiceVisitCountMin}
              serviceVisitCountMax={data.serviceVisitCountMax}
              setServiceVisitCountMax={data.setServiceVisitCountMax}
              serviceFilterOptions={data.serviceFilterOptions}
              serviceFilterCategories={data.serviceFilterCategories}
              serviceFilterOptionsLoading={data.serviceFilterOptionsLoading}
              promoUsed={data.promoUsed}
              setPromoUsed={data.setPromoUsed}
              promoCountMin={data.promoCountMin}
              setPromoCountMin={data.setPromoCountMin}
              promoCountMax={data.promoCountMax}
              setPromoCountMax={data.setPromoCountMax}
              referralUsed={data.referralUsed}
              setReferralUsed={data.setReferralUsed}
              referralCountMin={data.referralCountMin}
              setReferralCountMin={data.setReferralCountMin}
              referralCountMax={data.referralCountMax}
              setReferralCountMax={data.setReferralCountMax}
              callStatuses={data.callStatuses}
              setCallStatuses={data.setCallStatuses}
              lastCallDaysMin={data.lastCallDaysMin}
              setLastCallDaysMin={data.setLastCallDaysMin}
              lastCallDaysMax={data.lastCallDaysMax}
              setLastCallDaysMax={data.setLastCallDaysMax}
              assignedStaffId={data.assignedStaffId}
              setAssignedStaffId={data.setAssignedStaffId}
              assignedDaysMin={data.assignedDaysMin}
              setAssignedDaysMin={data.setAssignedDaysMin}
              assignedDaysMax={data.assignedDaysMax}
              setAssignedDaysMax={data.setAssignedDaysMax}
              retainedOnly={data.retainedOnly}
              setRetainedOnly={data.setRetainedOnly}
              dobMonth={data.dobMonth}
              setDobMonth={data.setDobMonth}
              birthdayPreset={data.birthdayPreset}
              setBirthdayPreset={data.setBirthdayPreset}
              ageMin={data.ageMin}
              setAgeMin={data.setAgeMin}
              ageMax={data.ageMax}
              setAgeMax={data.setAgeMax}
              setActiveFilterId={data.setActiveFilterId}
              staffList={data.staffList}
              saveFilterModalVisible={data.saveFilterModalVisible}
              setSaveFilterModalVisible={data.setSaveFilterModalVisible}
              newFilterName={data.newFilterName}
              setNewFilterName={data.setNewFilterName}
              handleSaveFilter={data.handleSaveFilter}
              PRESET_FILTERS={PRESET_FILTERS}
              onOpenRandomModal={isManagerOrAdmin ? () => data.setRandomModalVisible(true) : undefined}
            />
          </>
        ),
        actions: (
          <div className="customer-toolbar-action-cluster">
            <RetainDataButton
              mode="quota-badge"
              retainedOnly={data.retainedOnly}
              onToggleRetainedFilter={() => data.setRetainedOnly(!data.retainedOnly)}
            />

            <div
              className="customer-toolbar-action-cluster__tools"
              role="group"
              aria-label="Thao tác danh sách khách hàng"
            >
              {isManagerOrAdmin && (
                <IconButton
                  label="Lịch sử phân bổ data"
                  icon={History}
                  onClick={() => data.setHistoryDrawerVisible(true)}
                />
              )}

              {isManagerOrAdmin && (
                <IconButton
                  label={data.showTrash ? 'Đang xem thùng rác; bấm để xem tất cả' : 'Xem thùng rác khách hàng'}
                  icon={Trash2}
                  tone={data.showTrash ? 'danger' : 'default'}
                  onClick={() => {
                    data.setShowTrash(!data.showTrash);
                    data.setCurrentPage(1);
                  }}
                />
              )}

              <IconButton
                label="Cấu hình hiển thị cột"
                icon={Settings2}
                onClick={() => tableRef.current?.openConfig()}
              />
            </div>

            {isMobile ? (
              <Dropdown
                menu={{
                  items: sortOptions.map((option) => ({ key: option.value, label: option.label })),
                  onClick: ({ key }) => handleSortChange(String(key)),
                  selectable: true,
                  selectedKeys: [data.sortField],
                }}
                trigger={['click']}
              >
                <IconButton label={`Sắp xếp: ${activeSortLabel}`} icon={ArrowDownAZ} />
              </Dropdown>
            ) : (
              <Select
                value={data.sortField}
                className="customer-sort-control"
                style={{ width: 170 }}
                aria-label="Sắp xếp danh sách khách hàng"
                onChange={handleSortChange}
                options={sortOptions}
              />
            )}
          </div>
        ),
      }}
    >
      <UndoReasonModal
        visible={undoModalState.visible}
        batchId={undoModalState.batchId}
        customerCount={undoModalState.customerCount}
        onClose={() => setUndoModalState({ visible: false, batchId: null })}
        onSuccess={() => {
          data.fetchAssignmentHistory(data.historyPage);
          data.refreshListAndStats();
        }}
      />

      <RevokeAssignmentModal
        visible={revokeBatchModalState.visible}
        batchId={revokeBatchModalState.batchId}
        onClose={() => setRevokeBatchModalState({ visible: false, customerIds: [], batchId: null })}
        onSuccess={() => {
          data.fetchAssignmentHistory(data.historyPage);
          data.refreshListAndStats();
        }}
        customerIds={revokeBatchModalState.customerIds}
        staffList={data.staffList}
      />

      <CustomerBulkActions
        themeMode={themeMode}
        token={token}
        currentUser={data.currentUser}
        selectedRowKeys={data.selectedRowKeys}
        setSelectedRowKeys={data.setSelectedRowKeys}
        setAssignModalVisible={data.setAssignModalVisible}
        bulkDeleteLoading={data.bulkDeleteLoading}
        handleBulkDeleteCustomers={data.handleBulkDeleteCustomers}
        assignModalVisible={data.assignModalVisible}
        targetStaffId={data.targetStaffId}
        setTargetStaffId={data.setTargetStaffId}
        staffList={data.staffList}
        assigning={data.assigning}
        unassigning={data.unassigning}
        handleAssignCustomers={data.handleAssignCustomers}
        handleUnassignCustomers={data.handleUnassignCustomers}
        onRefresh={data.refreshListAndStats}
        randomBatchId={data.randomBatchId}
      />

      <Tabs
        className="customer-bucket-tabs"
        activeKey={data.activeTab}
        onChange={(key) => {
          data.setActiveTab(key);
          data.setCurrentPage(1);
          localStorage.setItem('mos_customers_active_tab', key);
        }}
        style={{ color: token.colorText }}
        items={[
          {
            key: 'ALL',
            label: getTabLabel('ALL', 'Tất cả', data.stats.total),
          },
          {
            key: 'COMBO_LIVE',
            label: getTabLabel('COMBO_LIVE', 'Combo Live', data.stats.comboLive),
          },
          {
            key: 'NOT_COMBO_LIVE',
            label: getTabLabel('NOT_COMBO_LIVE', 'Not Combo Live', data.stats.notComboLive),
          },
          {
            key: 'COMBO_DEAD',
            label: getTabLabel('COMBO_DEAD', 'Combo Dead', data.stats.comboDead),
          },
          {
            key: 'SINGLE',
            label: getTabLabel('SINGLE', 'Single', data.stats.single),
          },
          {
            key: 'ALLOCATION',
            label: (
              <Space>
                <span>⚡ Đợt phân bổ</span>
                {data.myBatches && data.myBatches.length > 0 && (
                  <Badge
                    count={
                      data.myBatches.find((b) => b.id === data.selectedBatchId)?.totalCount ||
                      data.myBatches[0].totalCount
                    }
                    overflowCount={99999}
                    color={token.colorWarning}
                  />
                )}
              </Space>
            ),
          },
        ]}
      />

      {data.activeTab === 'ALLOCATION' && (
        <AllocationBatchHeader
          themeMode={themeMode}
          token={token}
          batches={data.myBatches}
          loading={data.myBatchesLoading}
          selectedBatchId={data.selectedBatchId}
          onSelectBatch={(bId) => {
            data.setSelectedBatchId(bId);
            data.setCurrentPage(1);
          }}
          onRefresh={async () => {
            await Promise.all([data.fetchMyBatches(), data.refreshListAndStats()]);
          }}
          onExitBatch={data.exitBatchMode}
        />
      )}

      {data.randomSelectedIds && data.randomSelectedIds.length > 0 && (
        <ContentSurface
          className="mb-4"
          padding="12px 16px"
          style={{ background: token.colorWarningBg, borderColor: token.colorWarningBorder }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span style={{ color: token.colorWarning }}>
              Đang hiển thị <strong>{data.randomSelectedIds.length}</strong> khách hàng chưa phân bổ được chọn ngẫu
              nhiên.
            </span>
            <Button
              type="link"
              size="small"
              onClick={() => {
                data.setRandomSelectedIds(null);
                data.setSelectedRowKeys([]);
              }}
            >
              Hủy chế độ ngẫu nhiên (Xem tất cả)
            </Button>
          </div>
        </ContentSurface>
      )}

      <CustomerTable
        ref={tableRef}
        customers={data.customers}
        loading={data.loading}
        total={data.total}
        currentPage={data.currentPage}
        setCurrentPage={data.setCurrentPage}
        pageSize={data.pageSize}
        setPageSize={data.setPageSize}
        selectedRowKeys={data.selectedRowKeys}
        setSelectedRowKeys={data.setSelectedRowKeys}
        currentUser={data.currentUser}
        openDetailModal={data.openDetailModal}
        sentinelRef={data.sentinelRef}
        dailyPlanList={data.dailyPlanList}
        addingIds={data.addingIds}
        handleAddToPlan={data.handleAddToPlan}
        handleOpenSmsModal={handleOpenSmsModal}
      />

      <CustomerRandomSelectorModal
        open={data.randomModalVisible}
        loading={data.randomLoading}
        count={data.randomCount}
        setCount={data.setRandomCount}
        excludeAssigned={data.excludeAssigned}
        setExcludeAssigned={data.setExcludeAssigned}
        excludeUnconfirmedAllocation={data.excludeUnconfirmedAllocation}
        setExcludeUnconfirmedAllocation={data.setExcludeUnconfirmedAllocation}
        excludeFutureBooking={data.excludeFutureBooking}
        setExcludeFutureBooking={data.setExcludeFutureBooking}
        onCancel={() => data.setRandomModalVisible(false)}
        onSubmit={data.handleRandomSelect}
      />

      {/* CUSTOMER DETAIL DRAWER */}
      <CustomerDetailDrawer
        open={data.modalVisible}
        customerId={data.selectedCustomer?.id || null}
        onClose={() => data.setModalVisible(false)}
        onDeleteSuccess={handleDeleteSuccess}
        onUpdate={data.refreshListAndStats}
      />

      {/* BOOKING WIZARD DRAWER WITH SLOTS MATRIX */}
      <BookingWizardDrawer
        open={data.bookingWizardVisible}
        initialCustomer={data.bookingInitialCustomer}
        onClose={handleBookingWizardClose}
        onSuccess={handleBookingWizardSuccess}
      />

      {/* ALLOCATION HISTORY DRAWER */}
      <AssignmentHistoryDrawer
        themeMode={themeMode}
        token={token}
        open={data.historyDrawerVisible}
        onClose={() => data.setHistoryDrawerVisible(false)}
        historyLoading={data.historyLoading}
        historyData={data.historyData}
        historyTotal={data.historyTotal}
        historyPage={data.historyPage}
        expandedBatchId={data.expandedBatchId}
        batchDetailsLoading={data.batchDetailsLoading}
        batchDetails={data.batchDetails}
        undoingBatchId={data.undoingBatchId}
        revokingBatchId={data.revokingBatchId}
        fetchAssignmentHistory={data.fetchAssignmentHistory}
        fetchBatchDetails={data.fetchBatchDetails}
        setExpandedBatchId={data.setExpandedBatchId}
        setBatchDetails={data.setBatchDetails}
        applyFilterFromJson={(jsonStr, batchId) => data.applyFilterFromJson(jsonStr, batchId, data.setSelectedRowKeys)}
        onOpenUndoModal={(batchId, customerCount) => {
          setUndoModalState({
            visible: true,
            batchId,
            customerCount,
          });
        }}
        onOpenRevokeBatchModal={(batchId) => {
          data.handleOpenRevokeBatchModal(batchId, (customerIds) => {
            setRevokeBatchModalState({
              visible: true,
              customerIds,
              batchId,
            });
          });
        }}
        onOpenCustomerDetail={(customerId) => {
          data.openDetailModal({ id: customerId } as SafeAny);
        }}
      />

      {/* SMS MODAL */}
      <SMSModal open={smsModalVisible} onClose={() => setSmsModalVisible(false)} customer={data.selectedCustomer} />
    </ResourceListPage>
  );
}

export default function CustomersPage() {
  return (
    <React.Suspense fallback={<StatePanel kind="loading" title="Đang tải danh sách khách hàng" />}>
      <CustomersPageContent />
    </React.Suspense>
  );
}
