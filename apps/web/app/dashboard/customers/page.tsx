'use client';

import '../../suppress-warnings';
import React from 'react';
import {
  Tabs,
  Input,
  Button,
  Typography,
  Select,
  theme,
  Tooltip,
  Space,
  Modal,
  Checkbox,
  Spin,
  message,
  Tag,
} from 'antd';
import { SearchOutlined, CalendarOutlined, HistoryOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
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

const UndoReasonModal = dynamic(() => import('./components/UndoReasonModal').then((m) => m.UndoReasonModal), {
  ssr: false,
});
const RevokeAssignmentModal = dynamic(
  () => import('./components/RevokeAssignmentModal').then((m) => m.RevokeAssignmentModal),
  { ssr: false }
);
const AssignmentHistoryDrawer = dynamic(
  () => import('./components/AssignmentHistoryDrawer').then((m) => m.AssignmentHistoryDrawer),
  { ssr: false }
);

const { Title, Text } = Typography;

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
  const [modal, contextHolder] = Modal.useModal();
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
    searchQuery,
    sortField,
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
    assignedStaffId,
    refreshListAndStats,
    bookingWizardVisible,
    bookingInitialCustomer,
    modalVisible,
    selectedCustomer,
  } = data;

  const handleBookAppointment = React.useCallback(
    (cust: SafeAny) => {
      setModalVisible(false);
      setBookingInitialCustomer({
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        bucket: cust.bucket,
      });
      setBookingWizardVisible(true);
    },
    [setModalVisible, setBookingInitialCustomer, setBookingWizardVisible]
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
    let color = 'default';
    if (key === 'COMBO_LIVE') color = 'green';
    if (key === 'NOT_COMBO_LIVE') color = 'blue';
    if (key === 'COMBO_DEAD') color = 'red';
    if (key === 'SINGLE') color = 'gold';

    return (
      <Space>
        {baseLabel}
        <Badge
          count={count}
          overflowCount={99999}
          style={{
            backgroundColor:
              color === 'green'
                ? '#52C41A'
                : color === 'red'
                  ? '#FF4D4F'
                  : color === 'gold'
                    ? '#D4A84B'
                    : color === 'blue'
                      ? '#1677ff'
                      : '#888',
            color: color === 'gold' ? '#000' : '#fff',
          }}
        />
      </Space>
    );
  };

  // Badge component inside Tab label wrapper
  const Badge = ({
    count,
    style,
    overflowCount,
  }: {
    count: number;
    style?: React.CSSProperties;
    overflowCount?: number;
  }) => {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '20px',
          height: '20px',
          padding: '0 6px',
          fontSize: '12px',
          fontWeight: 'bold',
          borderRadius: '10px',
          ...style,
        }}
      >
        {count > (overflowCount || 99999) ? `${overflowCount}+` : count}
      </span>
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

  return (
    <div>
      {contextHolder}
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
      <div className="flex justify-between items-center mb-4" style={{ marginBottom: '16px' }}>
        <div>
          <Title level={3} style={{ color: token.colorPrimary, margin: 0, fontWeight: 700 }}>
            Danh Sách Khách Hàng
          </Title>
          <Text style={{ color: token.colorTextDescription, fontSize: '13px' }}>
            Quản lý phân loại & phân bổ data real-time
          </Text>
        </div>
        <Button
          type="primary"
          icon={<CalendarOutlined />}
          style={{
            backgroundColor: '#D4A84B',
            borderColor: '#D4A84B',
            height: '36px',
            borderRadius: '8px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(212, 168, 75, 0.3)',
          }}
          onClick={() => data.setBookingWizardVisible(true)}
        >
          Đặt lịch mới
        </Button>
      </div>

      {/* MINIMALIST CONTROL BAR */}
      <div
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          boxShadow: themeMode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}
        >
          {/* LEFT: SEARCH & ADVANCED FILTERS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', flex: 1, minWidth: 280 }}>
            <Input.Search
              placeholder="Tìm tên hoặc SĐT..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={data.handleSearch}
              style={{ maxWidth: 280 }}
            />

            <CustomerFilters
              themeMode={themeMode}
              token={token}
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
              assignedStaffId={data.assignedStaffId}
              setAssignedStaffId={data.setAssignedStaffId}
              assignedDaysMin={data.assignedDaysMin}
              setAssignedDaysMin={data.setAssignedDaysMin}
              assignedDaysMax={data.assignedDaysMax}
              setAssignedDaysMax={data.setAssignedDaysMax}
              retainedOnly={data.retainedOnly}
              setRetainedOnly={data.setRetainedOnly}
              setActiveFilterId={data.setActiveFilterId}
              staffList={data.staffList}
              saveFilterModalVisible={data.saveFilterModalVisible}
              setSaveFilterModalVisible={data.setSaveFilterModalVisible}
              newFilterName={data.newFilterName}
              setNewFilterName={data.setNewFilterName}
              handleSaveFilter={data.handleSaveFilter}
              PRESET_FILTERS={PRESET_FILTERS}
              onOpenRandomModal={() => data.setRandomModalVisible(true)}
            />
          </div>

          {/* RIGHT: RETAIN BADGE, ACTION ICONS & SORT */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <RetainDataButton
              mode="quota-badge"
              retainedOnly={data.retainedOnly}
              onToggleRetainedFilter={() => data.setRetainedOnly(!data.retainedOnly)}
            />

            {data.currentUser?.role === 'admin' && (
              <Tooltip title="Lịch sử phân bổ data">
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => data.setHistoryDrawerVisible(true)}
                  style={{ borderColor: '#D4A84B', color: '#D4A84B', borderRadius: '6px' }}
                />
              </Tooltip>
            )}

            {data.currentUser?.role === 'admin' && (
              <Tooltip title={data.showTrash ? 'Đang xem thùng rác (Bấm để xem tất cả)' : 'Xem thùng rác khách hàng'}>
                <Button
                  icon={<DeleteOutlined />}
                  danger={data.showTrash}
                  onClick={() => {
                    data.setShowTrash(!data.showTrash);
                    data.setCurrentPage(1);
                  }}
                  style={{
                    borderRadius: '6px',
                    borderColor: data.showTrash ? '#ff4d4f' : undefined,
                    background: data.showTrash ? (themeMode === 'dark' ? '#2c1515' : '#fff2f0') : undefined,
                  }}
                />
              </Tooltip>
            )}

            <Tooltip title="Cấu hình hiển thị cột">
              <Button
                icon={<SettingOutlined />}
                onClick={() => tableRef.current?.openConfig()}
                style={{ borderRadius: '6px' }}
              />
            </Tooltip>

            <Select
              defaultValue="id_desc"
              style={{ width: 170 }}
              onChange={(val) => {
                data.setSortField(val);
                data.setCurrentPage(1);
              }}
              options={[
                { value: 'id_desc', label: 'Mới nhất' },
                { value: 'name_asc', label: 'Tên A -> Z' },
                { value: 'daysSinceLastVisit_desc', label: 'Chưa ghé lâu nhất' },
                { value: 'daysSinceLastVisit_asc', label: 'Chưa ghé gần đây' },
                { value: 'totalSpent_desc', label: 'Chi tiêu giảm dần' },
              ]}
            />
          </div>
        </div>
      </div>

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
        durationDays={data.durationDays}
        setDurationDays={data.setDurationDays}
        staffList={data.staffList}
        assigning={data.assigning}
        unassigning={data.unassigning}
        handleAssignCustomers={data.handleAssignCustomers}
        handleUnassignCustomers={data.handleUnassignCustomers}
        onRefresh={data.refreshListAndStats}
        randomBatchId={data.randomBatchId}
      />

      <Tabs
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
                    style={{ backgroundColor: '#FA8C16', color: '#fff' }}
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
        />
      )}

      {data.randomSelectedIds && data.randomSelectedIds.length > 0 && (
        <div
          style={{
            background: themeMode === 'dark' ? '#2b2111' : '#FFFBE6',
            border: `1px solid ${themeMode === 'dark' ? '#5c3e16' : '#FFE58F'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: themeMode === 'dark' ? '#d48806' : '#D46B08' }}>
            Đang hiển thị <strong>{data.randomSelectedIds.length}</strong> khách hàng chưa phân bổ được chọn ngẫu nhiên.
          </span>
          <Button
            type="link"
            size="small"
            onClick={() => {
              data.setRandomSelectedIds(null);
              data.setSelectedRowKeys([]);
            }}
            style={{ color: '#D4A84B', padding: 0, fontWeight: 'bold' }}
          >
            Hủy chế độ ngẫu nhiên (Xem tất cả)
          </Button>
        </div>
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
      />

      {/* RANDOM SELECTOR MODAL */}
      <Modal
        title={
          <span style={{ color: '#D4A84B', fontSize: '18px', fontWeight: 'bold' }}>Chọn Ngẫu Nhiên Khách Hàng</span>
        }
        open={data.randomModalVisible}
        onCancel={() => data.setRandomModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => data.setRandomModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={data.randomLoading}
            onClick={data.handleRandomSelect}
            style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
          >
            Chọn
          </Button>,
        ]}
      >
        <div style={{ margin: '16px 0' }}>
          <p style={{ color: token.colorTextDescription, marginBottom: '16px' }}>
            Hệ thống sẽ tự động tìm kiếm và chọn ngẫu nhiên các khách hàng thỏa mãn bộ lọc hiện tại của anh/chị.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: token.colorText, fontWeight: 500 }}>Số lượng khách hàng:</span>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="Nhập số..."
                  value={data.randomCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      data.setRandomCount('');
                    } else {
                      const num = parseInt(val, 10);
                      data.setRandomCount(isNaN(num) ? '' : num);
                    }
                  }}
                  style={{ width: '110px', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: token.colorTextDescription }}>Preset chọn nhanh:</span>
                {[10, 20, 50, 100, 200].map((preset) => (
                  <Tag.CheckableTag
                    key={preset}
                    checked={data.randomCount === preset}
                    onChange={() => data.setRandomCount(preset)}
                    style={{
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      border: `1px solid ${
                        data.randomCount === preset ? '#D4A84B' : themeMode === 'dark' ? '#434343' : '#d9d9d9'
                      }`,
                      background: data.randomCount === preset ? '#D4A84B' : 'transparent',
                      color: data.randomCount === preset ? '#000' : token.colorText,
                      fontWeight: data.randomCount === preset ? 600 : 400,
                    }}
                  >
                    {preset} KH
                  </Tag.CheckableTag>
                ))}
              </div>
            </div>
            <div>
              <Checkbox
                checked={data.excludeAssigned}
                onChange={(e) => data.setExcludeAssigned(e.target.checked)}
                style={{ color: token.colorText }}
              >
                Chỉ chọn khách hàng chưa được phân bổ Booker
              </Checkbox>
            </div>
            <div>
              <Checkbox
                checked={data.excludeFutureBooking}
                onChange={(e) => data.setExcludeFutureBooking(e.target.checked)}
                style={{ color: token.colorText }}
              >
                Bỏ khách hàng đã có lịch book tương lai
              </Checkbox>
            </div>
          </div>
        </div>
      </Modal>

      {/* CUSTOMER DETAIL DRAWER */}
      <CustomerDetailDrawer
        open={data.modalVisible}
        customerId={data.selectedCustomer?.id || null}
        onClose={() => data.setModalVisible(false)}
        onBookAppointment={handleBookAppointment}
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
        applyFilterFromJson={data.applyFilterFromJson}
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

      <style jsx global>{`
        /* Custom styles for Ant Design Table under Dark & Light Mode */
        .dark-theme .antd-custom-table .ant-table {
          background: #111827 !important;
          color: #cbd5e1 !important;
        }
        .light-theme .antd-custom-table .ant-table {
          background: #ffffff !important;
          color: #0f172a !important;
        }
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #1e293b !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .light-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #9e7118 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1f2937 !important;
        }
        .light-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-row:hover > td {
          background: #1e293b !important;
        }
        .light-theme .antd-custom-table .ant-table-row:hover > td {
          background: #f1f5f9 !important;
        }

        /* Row highlighting - Light Theme */
        .light-theme .row-missed-light > td {
          background-color: #fff1f0 !important;
        }
        .light-theme .row-booked-future-light > td {
          background-color: #f6ffed !important;
        }
        .light-theme .row-hope-light > td {
          background-color: #fffbe6 !important;
        }
        .light-theme .row-missed-light:hover > td {
          background-color: #ffe8e6 !important;
        }
        .light-theme .row-booked-future-light:hover > td {
          background-color: #ebfcdd !important;
        }
        .light-theme .row-hope-light:hover > td {
          background-color: #fffac6 !important;
        }

        /* Row highlighting - Dark Theme */
        .dark-theme .row-missed-dark > td {
          background-color: #2a1215 !important;
        }
        .dark-theme .row-booked-future-dark > td {
          background-color: #162c1b !important;
        }
        .dark-theme .row-hope-dark > td {
          background-color: #2b2111 !important;
        }
        .dark-theme .row-missed-dark:hover > td {
          background-color: #381b1e !important;
        }
        .dark-theme .row-booked-future-dark:hover > td {
          background-color: #1e3a24 !important;
        }
        .dark-theme .row-hope-dark:hover > td {
          background-color: #382c16 !important;
        }

        /* Gold highlights for both light/dark */
        .antd-custom-table .ant-pagination-item-active {
          border-color: #d4a84b !important;
        }
        .antd-custom-table .ant-pagination-item-active a {
          color: #d4a84b !important;
        }

        /* Compact line height & padding */
        .antd-custom-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          line-height: 1.25 !important;
        }
        .antd-custom-table .ant-table-thead > tr > th {
          padding: 8px 8px !important;
          line-height: 1.25 !important;
        }
      `}</style>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <React.Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Spin size="large" />
        </div>
      }
    >
      <CustomersPageContent />
    </React.Suspense>
  );
}
