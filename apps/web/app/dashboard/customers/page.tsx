'use client';

import '../../suppress-warnings';
import React from 'react';
import {
  Tabs,
  Input,
  Button,
  Card,
  Space,
  Modal,
  Tag,
  Typography,
  Divider,
  Select,
  theme,
  Drawer,
  Spin,
  Checkbox,
  Table,
  message,
} from 'antd';
import { SearchOutlined, CalendarOutlined, HistoryOutlined, UndoOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
import { useCustomerData } from './hooks/useCustomerData';
import CustomerFilters from './components/CustomerFilters';
import CustomerBulkActions from './components/CustomerBulkActions';
import CustomerTable from './components/CustomerTable';
import { formatVND } from '../../../lib/format-utils';

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

export default function CustomersPage() {
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

  return (
    <div>
      {contextHolder}
      <div className="flex justify-between items-center mb-6" style={{ marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            Danh Sách Khách Hàng
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Xem danh sách khách hàng và quản lý phân loại buckets real-time
          </Text>
        </div>
        <Button
          type="primary"
          icon={<CalendarOutlined />}
          style={{
            backgroundColor: '#D4A84B',
            borderColor: '#D4A84B',
            height: '38px',
            borderRadius: '6px',
            fontWeight: 'bold',
          }}
          onClick={() => data.setBookingWizardVisible(true)}
        >
          Đặt lịch mới
        </Button>
      </div>

      <Card
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: '24px',
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <Input.Search
              placeholder="Tìm theo tên hoặc số điện thoại..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={data.handleSearch}
              style={{ maxWidth: 400 }}
            />

            <div className="flex items-center gap-2">
              {data.currentUser?.role === 'admin' && (
                <Checkbox
                  checked={data.showTrash}
                  onChange={(e) => {
                    data.setShowTrash(e.target.checked);
                    data.setCurrentPage(1);
                  }}
                  style={{ color: token.colorText, marginRight: '16px', fontWeight: 'bold' }}
                >
                  🗑️ Xem thùng rác
                </Checkbox>
              )}
              <Text style={{ color: token.colorTextDescription }}>Sắp xếp theo:</Text>
              <Select
                defaultValue="id_desc"
                style={{ width: 220 }}
                onChange={(val) => {
                  data.setSortField(val);
                  data.setCurrentPage(1);
                }}
                options={[
                  { value: 'id_desc', label: 'Khách hàng mới nhất' },
                  { value: 'name_asc', label: 'Tên A -> Z' },
                  { value: 'daysSinceLastVisit_desc', label: 'Lâu nhất chưa ghé tiệm' },
                  { value: 'daysSinceLastVisit_asc', label: 'Gần đây mới ghé tiệm' },
                  { value: 'totalSpent_desc', label: 'Tổng chi tiêu giảm dần' },
                ]}
              />
            </div>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          <div className="flex flex-wrap gap-4 items-center justify-between">
            <CustomerFilters
              themeMode={themeMode}
              token={token}
              currentUser={data.currentUser}
              openConfig={() => tableRef.current?.openConfig()}
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
              setActiveFilterId={data.setActiveFilterId}
              staffList={data.staffList}
              saveFilterModalVisible={data.saveFilterModalVisible}
              setSaveFilterModalVisible={data.setSaveFilterModalVisible}
              newFilterName={data.newFilterName}
              setNewFilterName={data.setNewFilterName}
              handleSaveFilter={data.handleSaveFilter}
              activeFilterId={data.activeFilterId}
              PRESET_FILTERS={PRESET_FILTERS}
            />
          </div>
        </div>
      </Card>

      <CustomerBulkActions
        themeMode={themeMode}
        token={token}
        currentUser={data.currentUser}
        selectedRowKeys={data.selectedRowKeys}
        setSelectedRowKeys={data.setSelectedRowKeys}
        setAssignModalVisible={data.setAssignModalVisible}
        setRandomModalVisible={data.setRandomModalVisible}
        setHistoryDrawerVisible={data.setHistoryDrawerVisible}
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
        ]}
      />

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: token.colorText }}>Số lượng khách hàng:</span>
              <Input
                type="number"
                min={1}
                max={1000}
                value={data.randomCount}
                onChange={(e) => data.setRandomCount(Number(e.target.value) || 20)}
                style={{ width: '120px' }}
              />
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
      />

      {/* BOOKING WIZARD DRAWER WITH SLOTS MATRIX */}
      <BookingWizardDrawer
        open={data.bookingWizardVisible}
        initialCustomer={data.bookingInitialCustomer}
        onClose={handleBookingWizardClose}
        onSuccess={handleBookingWizardSuccess}
      />

      {/* ALLOCATION HISTORY DRAWER */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(212, 168, 75, 0.1)',
                color: '#D4A84B',
              }}
            >
              <HistoryOutlined style={{ fontSize: '15px' }} />
            </span>
            <span style={{ color: '#D4A84B', fontWeight: 'bold', fontSize: '16px' }}>Lịch Sử Phân Bổ</span>
          </div>
        }
        placement="right"
        onClose={() => {
          data.setHistoryDrawerVisible(false);
          data.setExpandedBatchId(null);
          data.setBatchDetails([]);
        }}
        open={data.historyDrawerVisible}
        width={650}
        styles={{
          header: {
            borderBottom: `1px solid ${themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
            padding: '16px 24px',
          },
          body: {
            padding: '20px 24px',
            background: themeMode === 'dark' ? '#141414' : '#fff',
          },
        }}
      >
        <Spin spinning={data.historyLoading && data.historyData.length === 0}>
          {data.historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: token.colorTextDescription }}>
              Không có dữ liệu phân bổ trước đây.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.historyData.map((batch) => {
                const isExpanded = data.expandedBatchId === batch.batchId;
                const formattedDate = new Date(batch.assignedAt).toLocaleString('vi-VN');
                const isUndone = batch.isUndone;

                return (
                  <Card
                    key={batch.batchId}
                    size="small"
                    style={{
                      background: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
                      border: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', color: token.colorText }}>
                            {batch.newStaffName ? `Phân bổ cho ${batch.newStaffName}` : 'Gỡ Booker'}
                          </span>
                          <Tag color={isUndone ? 'default' : batch.newStaffName ? 'blue' : 'warning'}>
                            {isUndone ? 'Đã hoàn tác' : batch.newStaffName ? 'Phân bổ' : 'Hủy phân bổ'}
                          </Tag>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '12px', color: token.colorTextDescription }}>
                          <span style={{ marginRight: '16px' }}>Thời gian: {formattedDate}</span>
                          <span>Người thực hiện: {batch.assignedBy}</span>
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '13px', color: token.colorText }}>
                          Số khách hàng:{' '}
                          <span style={{ fontWeight: 'bold', color: '#D4A84B' }}>{batch.customerCount}</span>
                        </div>
                      </div>

                      <Space>
                        <Button
                          size="small"
                          onClick={() => {
                            if (isExpanded) {
                              data.setExpandedBatchId(null);
                              data.setBatchDetails([]);
                            } else {
                              data.fetchBatchDetails(batch.batchId);
                            }
                          }}
                        >
                          {isExpanded ? 'Thu gọn' : 'Chi tiết'}
                        </Button>

                        {!isUndone && (
                          <Button
                            danger
                            size="small"
                            type="primary"
                            icon={<UndoOutlined />}
                            loading={data.undoingBatchId === batch.batchId}
                            onClick={() => {
                              modal.confirm({
                                title: 'Xác nhận hoàn tác',
                                content: `Bạn có chắc chắn muốn hoàn tác đợt phân bổ này không? Toàn bộ ${batch.customerCount} khách hàng trong đợt này sẽ được hoàn tác về Booker cũ (nếu Booker chưa được phân bổ mới).`,
                                okText: 'Đồng ý',
                                cancelText: 'Hủy',
                                okButtonProps: { danger: true },
                                onOk: () => data.handleUndoAssignment(batch.batchId),
                              });
                            }}
                          >
                            Hoàn tác
                          </Button>
                        )}
                      </Space>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '12px',
                          borderTop: `1px solid ${themeMode === 'dark' ? '#303030' : '#f0f0f0'}`,
                          paddingTop: '12px',
                        }}
                      >
                        <Spin spinning={data.batchDetailsLoading}>
                          <div className="antd-custom-table">
                            <Table
                              size="small"
                              pagination={false}
                              dataSource={data.batchDetails}
                              rowKey="id"
                              columns={[
                                {
                                  title: 'Họ và tên',
                                  dataIndex: 'fullName',
                                  key: 'fullName',
                                  render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
                                },
                                { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone' },
                                {
                                  title: 'Booker cũ',
                                  dataIndex: 'prevStaffName',
                                  key: 'prevStaffName',
                                  render: (text) => <Tag>{text}</Tag>,
                                },
                                {
                                  title: 'Booker mới',
                                  dataIndex: 'newStaffName',
                                  key: 'newStaffName',
                                  render: (text) => <Tag color="blue">{text}</Tag>,
                                },
                              ]}
                            />
                          </div>
                        </Spin>
                      </div>
                    )}
                  </Card>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', alignItems: 'center' }}>
                <Button
                  disabled={data.historyPage === 1 || data.historyLoading}
                  onClick={() => data.fetchAssignmentHistory(data.historyPage - 1)}
                  style={{ marginRight: '8px' }}
                >
                  Trang trước
                </Button>
                <span
                  style={{ display: 'flex', alignItems: 'center', margin: '0 8px', color: token.colorTextDescription }}
                >
                  Trang {data.historyPage} / {Math.ceil(data.historyTotal / 10) || 1}
                </span>
                <Button
                  disabled={data.historyPage >= Math.ceil(data.historyTotal / 10) || data.historyLoading}
                  onClick={() => data.fetchAssignmentHistory(data.historyPage + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          )}
        </Spin>
      </Drawer>

      <style jsx global>{`
        /* Custom styles for Ant Design Table under Dark Mode */
        .dark-theme .antd-custom-table .ant-table {
          background: #141414 !important;
          color: #ccc !important;
        }
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #1f1f1f !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #2a2a2a !important;
        }
        .dark-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1a1a1a !important;
        }
        .dark-theme .antd-custom-table .ant-table-row:hover > td {
          background: #1e1e1e !important;
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
