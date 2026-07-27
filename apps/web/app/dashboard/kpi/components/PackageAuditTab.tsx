'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Modal,
  Form,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Avatar,
} from 'antd';
import {
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { apiClient } from '../../../../lib/api-client';
import {
  PackageAuditListParams,
  PackageAuditRecord,
  PackageAuditReviewStatus,
  PackageAuditSummary,
  SafeAny,
} from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const { RangePicker } = DatePicker;

const AVATAR_COLORS = ['#1890ff', '#722ed1', '#fa8c16', '#52c41a', '#eb2f96', '#13c2c2', '#faad14', '#2f54eb'];

const getAvatarColor = (userId: number) => {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
};

export const PackageAuditTab: React.FC = () => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [records, setRecords] = useState<PackageAuditRecord[]>([]);
  const [summary, setSummary] = useState<PackageAuditSummary>({
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    revokedCount: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<PackageAuditReviewStatus | 'ALL'>('ALL');
  const [searchText, setSearchText] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // Revoke Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<PackageAuditRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const handleOpenCustomerDetail = (userId: number) => {
    setSelectedCustomerId(userId);
    setCustomerDrawerOpen(true);
  };

  const fetchAudits = useCallback(async () => {
    setLoading(true);
    try {
      const params: PackageAuditListParams = {
        status: statusFilter,
        search: searchText || undefined,
        dateFrom: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        dateTo: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
      };

      const res = await apiClient.kpi.getPackageAudits(params);
      setRecords(res.data || []);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: SafeAny) {
      console.error('Failed to fetch package audits:', err);
      message.error(err?.response?.data?.message || 'Không thể tải danh sách kiểm toán gói.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchText, dateRange]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleApprove = async (record: PackageAuditRecord) => {
    try {
      const res = await apiClient.kpi.reviewPackageAudit({
        transactionId: record.id,
        action: 'APPROVE',
      });
      message.success(res.message || 'Đã phê duyệt lượt cộng thủ công.');
      fetchAudits();
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.message || 'Phê duyệt thất bại.');
    }
  };

  const handleOpenRevokeModal = (record: PackageAuditRecord) => {
    setSelectedRecord(record);
    setRevokeReason('');
    setRevokeModalOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const res = await apiClient.kpi.reviewPackageAudit({
        transactionId: selectedRecord.id,
        action: 'REVOKE',
        reviewNote: revokeReason || 'Quản lý Thu hồi lượt cộng thủ công',
      });
      message.success(res.message || 'Đã thu hồi lượt cộng thủ công.');
      setRevokeModalOpen(false);
      fetchAudits();
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.message || 'Thu hồi thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusTag = (status: PackageAuditReviewStatus) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Chờ kiểm duyệt
          </Tag>
        );
      case 'APPROVED':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Đã duyệt
          </Tag>
        );
      case 'REVOKED':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Đã thu hồi
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'dateCreated',
      key: 'dateCreated',
      render: (text: string) => (text ? dayjs(text).format('DD/MM/YYYY HH:mm') : 'N/A'),
      width: 140,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: SafeAny, r: PackageAuditRecord) => (
        <div
          onClick={() => handleOpenCustomerDetail(r.userId)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          className="group"
        >
          <Avatar
            size={32}
            src={r.customerAvatar || undefined}
            style={{
              backgroundColor: getAvatarColor(r.userId),
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {r.customerName ? r.customerName.charAt(0).toUpperCase() : 'K'}
          </Avatar>
          <div>
            <div
              style={{ fontWeight: 600, color: themeMode === 'dark' ? '#60a5fa' : '#1890ff' }}
              className="group-hover:underline"
            >
              {r.customerName}
            </div>
            {r.customerPhone && (
              <div style={{ fontSize: '11px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                {r.customerPhone}
              </div>
            )}
          </div>
        </div>
      ),
      width: 190,
    },
    {
      title: 'Gói Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
      width: 160,
    },
    {
      title: 'Số lượt cộng thủ công',
      key: 'added',
      render: (_: SafeAny, r: PackageAuditRecord) => (
        <div>
          {r.normalCountAdded > 0 && <Tag color="blue">+{r.normalCountAdded} Nối mới</Tag>}
          {r.retainCountAdded > 0 && <Tag color="orange">+{r.retainCountAdded} Dặm mi</Tag>}
        </div>
      ),
      width: 160,
    },
    {
      title: 'Nhân viên CS cộng',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (text: string) => <span style={{ color: '#1890ff', fontWeight: 500 }}>{text}</span>,
      width: 140,
    },
    {
      title: 'Ghi chú / Lý do CS',
      dataIndex: 'note',
      key: 'note',
      render: (text: string) => (
        <span style={{ fontStyle: 'italic', fontSize: '12px' }}>{text || 'Không có ghi chú'}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      render: (status: PackageAuditReviewStatus, r: PackageAuditRecord) => (
        <div>
          {renderStatusTag(status)}
          {r.reviewedByStaffName && (
            <div style={{ fontSize: '10.5px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b', marginTop: '2px' }}>
              bởi {r.reviewedByStaffName}
            </div>
          )}
        </div>
      ),
      width: 140,
    },
    {
      title: 'Thao tác Kiểm toán',
      key: 'actions',
      render: (_: SafeAny, r: PackageAuditRecord) => {
        if (r.reviewStatus === 'REVOKED') {
          return <span style={{ fontSize: '11px', color: '#ff4d4f' }}>Đã thu hồi số dư</span>;
        }

        return (
          <Space size={8}>
            {r.reviewStatus !== 'APPROVED' && (
              <Popconfirm
                title="Phê duyệt lượt cộng thủ công này?"
                onConfirm={() => handleApprove(r)}
                okText="Đồng ý Duyệt"
                cancelText="Hủy"
              >
                <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />}>
                  Duyệt
                </Button>
              </Popconfirm>
            )}

            <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleOpenRevokeModal(r)}>
              Thu hồi (Revoke)
            </Button>
          </Space>
        );
      },
      width: 190,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Metrics Header */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}>
            <Statistic
              title="Tổng lượt cộng thủ công"
              value={summary.totalCount}
              prefix={<SafetyOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}>
            <Statistic
              title="Chờ Kiểm duyệt"
              value={summary.pendingCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}>
            <Statistic
              title="Đã Phê duyệt"
              value={summary.approvedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }}>
            <Statistic
              title="Đã Thu hồi (Revoked)"
              value={summary.revokedCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filter Bar */}
      <Card
        size="small"
        style={{
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
        }}
      >
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
            />

            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: 160 }}
              options={[
                { label: 'Tất cả trạng thái', value: 'ALL' },
                { label: 'Chờ kiểm duyệt', value: 'PENDING_REVIEW' },
                { label: 'Đã phê duyệt', value: 'APPROVED' },
                { label: 'Đã thu hồi', value: 'REVOKED' },
              ]}
            />

            <Input
              placeholder="Tìm tên KH / SĐT / Ghi chú..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchAudits}
              style={{ width: 220 }}
              allowClear
            />

            <Button type="primary" icon={<SearchOutlined />} onClick={fetchAudits}>
              Tìm kiếm
            </Button>
          </Space>

          <Button icon={<ReloadOutlined />} onClick={fetchAudits} loading={loading}>
            Làm mới
          </Button>
        </Space>
      </Card>

      {/* Audit Data Table */}
      <Card
        size="small"
        style={{
          backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          borderColor: themeMode === 'dark' ? '#334155' : '#e5e7eb',
        }}
      >
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} giao dịch`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          size="middle"
          locale={{ emptyText: 'Không có giao dịch cộng gói thủ công nào trong kỳ.' }}
        />
      </Card>

      {/* Revoke Reason Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4f' }}>
            <ExclamationCircleOutlined />
            <span>Thu hồi (Revoke) Lượt Cộng Gói Thủ Công</span>
          </div>
        }
        open={revokeModalOpen}
        onCancel={() => setRevokeModalOpen(false)}
        onOk={handleConfirmRevoke}
        confirmLoading={submitting}
        okText="Xác nhận Thu hồi"
        okButtonProps={{ danger: true }}
        cancelText="Hủy bỏ"
      >
        {selectedRecord && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                background: themeMode === 'dark' ? '#0f172a' : '#fffbe6',
                padding: 12,
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              <div>
                Khách hàng: <strong>{selectedRecord.customerName}</strong> ({selectedRecord.customerPhone})
              </div>
              <div>
                Gói dịch vụ: <strong>{selectedRecord.serviceName}</strong>
              </div>
              <div>
                Lượt cộng:{' '}
                <strong>
                  +{selectedRecord.normalCountAdded} Nối mới, +{selectedRecord.retainCountAdded} Dặm mi
                </strong>
              </div>
              <div>
                Nhân viên cộng: <strong>{selectedRecord.staffName}</strong> (
                {dayjs(selectedRecord.dateCreated).format('DD/MM/YYYY HH:mm')})
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Lý do Thu hồi (Bắt buộc):</div>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do thu hồi lượt cộng (Ví dụ: CS tự ý cộng không được duyệt, thông đồng với khách...)"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
        )}
      </Modal>
      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        open={customerDrawerOpen}
        customerId={selectedCustomerId}
        onClose={() => setCustomerDrawerOpen(false)}
      />
    </div>
  );
};

export default PackageAuditTab;
