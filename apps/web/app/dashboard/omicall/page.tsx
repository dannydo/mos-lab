'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Input,
  Card,
  Space,
  Button,
  Tag,
  Typography,
  theme,
  Spin,
  Tooltip,
  Tabs,
  DatePicker,
  Select,
  Modal,
  Form,
  Popconfirm,
  message
} from 'antd';
import {
  SearchOutlined,
  AudioOutlined,
  EditOutlined,
  DeleteOutlined,
  SmileOutlined,
  ReloadOutlined,
  SettingOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';
import api from '../../../lib/api';
import { QAPlayerDrawer } from '../../../components/QAPlayerDrawer';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function OmicallLogsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  // Auth Context
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('logs');

  // Logs Table States
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filter States
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [happyFilter, setHappyFilter] = useState<string>('ALL');
  const [aiFilter, setAiFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [staffList, setStaffList] = useState<any[]>([]);

  // Config Tab States
  const [configs, setConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configForm] = Form.useForm();
  const [selectedStaffForConfig, setSelectedStaffForConfig] = useState<any>(null);
  const [submittingConfig, setSubmittingConfig] = useState(false);

  // QA Drawer States
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  // Load user details
  useEffect(() => {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');
    }
  }, []);

  // Fetch staff list for filters
  const fetchStaffList = useCallback(async () => {
    try {
      const res = await api.get('/staff');
      // Filter out only active telesales or all active staff
      setStaffList(res.data || []);
    } catch (err) {
      console.error('[OmicallLogsPage] Failed to fetch staff list:', err);
    }
  }, []);

  // Fetch Omicall call logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
        direction: 'outbound'
      };

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (happyFilter !== 'ALL') {
        params.happyCallStatus = happyFilter;
      }

      if (aiFilter !== 'ALL') {
        params.analysisStatus = aiFilter;
      }

      // If user is admin, allow filtering by selected staff. Otherwise, backend restricts to current user
      if (isAdmin && staffFilter !== 'ALL') {
        params.staffId = Number(staffFilter);
      }

      const res = await api.get('/omicall/logs', { params });
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('[OmicallLogsPage] Failed to fetch call logs:', err);
      message.error('Không thể tải lịch sử cuộc gọi OmiCall');
    } finally {
      setLoadingLogs(false);
    }
  }, [currentPage, pageSize, dateRange, statusFilter, happyFilter, aiFilter, staffFilter, isAdmin]);

  // Fetch extension mapping configurations
  const fetchConfigs = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingConfigs(true);
    try {
      const res = await api.get('/omicall/config');
      setConfigs(res.data || []);
    } catch (err) {
      console.error('[OmicallLogsPage] Failed to fetch extensions configurations:', err);
      message.error('Không thể tải cấu hình máy lẻ extension');
    } finally {
      setLoadingConfigs(false);
    }
  }, [isAdmin]);

  // Initial Fetches
  useEffect(() => {
    if (currentUser) {
      fetchLogs();
      if (isAdmin) {
        fetchStaffList();
        fetchConfigs();
      }
    }
  }, [currentUser, fetchLogs, fetchStaffList, fetchConfigs, isAdmin]);

  // Handle Tab Change
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'configs') {
      fetchConfigs();
    } else {
      fetchLogs();
    }
  };

  // Actions
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const handleCopyUuid = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
    message.success('Đã sao chép Call UUID vào clipboard!');
  };

  const openQADrawer = (id: number) => {
    setSelectedLogId(id);
    setQaDrawerOpen(true);
  };

  // Extension Config Actions
  const handleOpenConfigModal = (staff: any) => {
    setSelectedStaffForConfig(staff);
    configForm.setFieldsValue({
      extension: staff.extension || '',
      sipPassword: '',
      phoneNumber: staff.phoneNumber || ''
    });
    setConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      const values = await configForm.validateFields();
      setSubmittingConfig(true);
      
      const payload: any = {
        staffId: selectedStaffForConfig.staffId,
        extension: values.extension.trim(),
        phoneNumber: values.phoneNumber ? values.phoneNumber.trim() : null
      };

      if (values.sipPassword && values.sipPassword.trim()) {
        payload.sipPassword = values.sipPassword.trim();
      }
      
      await api.post('/omicall/config', payload);

      message.success(`Đã cập nhật máy lẻ cho ${selectedStaffForConfig.displayName}`);
      setConfigModalOpen(false);
      fetchConfigs();
    } catch (err: any) {
      console.error('[OmicallLogsPage] Failed to save extension config:', err);
      message.error(err.response?.data?.message || 'Lưu cấu hình máy lẻ thất bại');
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleDeleteConfig = async (staffId: number, displayName: string) => {
    try {
      await api.delete(`/omicall/config/${staffId}`);
      message.success(`Đã xóa cấu hình máy lẻ của ${displayName}`);
      fetchConfigs();
    } catch (err: any) {
      console.error('[OmicallLogsPage] Failed to delete extension config:', err);
      message.error(err.response?.data?.message || 'Xóa cấu hình máy lẻ thất bại');
    }
  };

  // Format Sec to Min:Sec
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Status Tags
  const renderCallStatus = (status: string) => {
    const colors: Record<string, string> = {
      ANSWER: 'success',
      NOANSWER: 'default',
      BUSY: 'warning',
      CANCEL: 'error'
    };
    return <Tag color={colors[status] || 'default'}>{status}</Tag>;
  };

  const renderAIStatus = (status: string) => {
    switch (status) {
      case 'DONE': return <Tag color="success">DONE</Tag>;
      case 'PROCESSING': return <Tag color="processing"><Spin size="small" style={{ marginRight: '6px' }} />PROCESSING</Tag>;
      case 'FAILED': return <Tag color="error">FAILED</Tag>;
      case 'WAITING_RECORDING': return <Tag color="orange">WAITING RECORDING</Tag>;
      default: return <Tag color="default">PENDING</Tag>;
    }
  };

  const renderHappyStatus = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Tag color="success" style={{ fontWeight: 'bold' }}>ĐỒNG Ý</Tag>;
      case 'REJECTED': return <Tag color="error" style={{ fontWeight: 'bold' }}>TỪ CHỐI</Tag>;
      case 'PENDING_APPROVAL': return <Tag color="warning" style={{ fontWeight: 'bold' }}>CHỜ DUYỆT</Tag>;
      default: return <Tag color="default">CHƯA XÉT</Tag>;
    }
  };

  // Table Columns config
  const logsColumns = [
    {
      title: 'Call UUID / Mã cuộc gọi',
      dataIndex: 'callUuid',
      key: 'callUuid',
      width: 220,
      render: (uuid: string) => (
        <Space>
          <Tooltip title={uuid}>
            <Text style={{ fontFamily: 'monospace', fontWeight: '500' }}>
              {uuid.slice(0, 8)}...{uuid.slice(-8)}
            </Text>
          </Tooltip>
          <Button 
            icon={<CopyOutlined />} 
            type="text" 
            size="small" 
            onClick={() => handleCopyUuid(uuid)}
            style={{ color: token.colorTextDescription }}
          />
        </Space>
      )
    },
    {
      title: 'Thời gian gọi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => <span>{new Date(val).toLocaleString('vi-VN')}</span>
    },
    {
      title: 'Nhân viên',
      dataIndex: ['staff', 'displayName'],
      key: 'staffName',
      render: (val: string, record: any) => <strong>{val || `Staff ID: ${record.staffId}`}</strong>
    },
    {
      title: 'Khách hàng',
      dataIndex: 'destinationNumber',
      key: 'destinationNumber',
      render: (val: string) => <span style={{ color: token.colorPrimary, fontWeight: '500' }}>{val}</span>
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (val: number) => <span>{formatDuration(val)}</span>
    },
    {
      title: 'Kết quả',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderCallStatus(status)
    },
    {
      title: 'Trạng thái AI',
      dataIndex: 'analysisStatus',
      key: 'analysisStatus',
      render: (status: string) => renderAIStatus(status)
    },
    {
      title: 'Tiếng cười (AI)',
      dataIndex: 'laughCount',
      key: 'laughCount',
      align: 'center' as const,
      render: (val: number) => (
        val > 0 ? (
          <Tag color="purple" style={{ fontWeight: 'bold' }}>
            <SmileOutlined /> {val}
          </Tag>
        ) : <span>0</span>
      )
    },
    {
      title: 'Happy Call',
      dataIndex: 'happyCallStatus',
      key: 'happyCallStatus',
      render: (status: string) => renderHappyStatus(status)
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => openQADrawer(record.id)}
          style={{
            background: '#D4A84B',
            borderColor: '#D4A84B',
            color: 'black',
            fontWeight: '500'
          }}
        >
          Chi tiết & QA
        </Button>
      )
    }
  ];

  const configsColumns = [
    {
      title: 'Nhân viên (CRM Staff)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (val: string, record: any) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{val}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.username}</Text>
        </div>
      )
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (val: string) => <Tag color={val === 'admin' ? 'red' : 'blue'}>{val.toUpperCase()}</Tag>
    },
    {
      title: 'Số máy lẻ (OmiCall Extension)',
      dataIndex: 'extension',
      key: 'extension',
      render: (val: string | null) => (
        val ? (
          <Tag color="success" style={{ fontSize: '14px', padding: '4px 8px', fontWeight: 'bold' }}>{val}</Tag>
        ) : (
          <Tag color="default" style={{ color: token.colorTextDescription }}>Chưa cấu hình</Tag>
        )
      )
    },
    {
      title: 'Caller ID / Hotline',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (val: string | null) => val || <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '13px' }}>Không có</Text>
    },
    {
      title: 'Mật khẩu SIP WebRTC',
      dataIndex: 'hasSipPassword',
      key: 'hasSipPassword',
      render: (val: boolean, record: any) => (
        record.extension ? (
          val ? (
            <Tag color="blue">● Đã cấu hình</Tag>
          ) : (
            <Tag color="warning">● Chưa cấu hình</Tag>
          )
        ) : <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 220,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenConfigModal(record)}
          >
            Cấu hình
          </Button>
          {record.extension && (
            <Popconfirm
              title={`Bạn có chắc chắn muốn gỡ máy lẻ của ${record.displayName}?`}
              onConfirm={() => handleDeleteConfig(record.staffId, record.displayName)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
              >
                Gỡ gán
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* HEADER SECTION */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            Lịch sử & Thẩm định OmiCall
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Quản lý chất lượng các cuộc gọi, phát hiện tiếng cười tự động bằng AI và phê duyệt Happy Call.
          </Text>
        </div>
      </div>

      <Card
        style={{
          background: token.colorBgContainer,
          borderColor: token.colorBorderSecondary,
          borderRadius: '12px'
        }}
        styles={{ body: { padding: '20px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'logs',
              label: (
                <span>
                  <AudioOutlined /> Lịch sử cuộc gọi OmiCall
                </span>
              ),
              children: (
                <div>
                  {/* FILTERS TOOLBAR */}
                  <div 
                    className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-lg"
                    style={{
                      background: themeMode === 'dark' ? '#1f1f1f' : '#f5f5f5',
                      border: `1px solid ${token.colorBorderSecondary}`
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <span style={{ fontSize: '12px', fontWeight: '500', color: token.colorTextSecondary }}>Khoảng thời gian:</span>
                      <RangePicker
                        value={dateRange}
                        onChange={(dates) => {
                          if (dates) setDateRange([dates[0]!, dates[1]!]);
                        }}
                        format="DD/MM/YYYY"
                        style={{ width: 260 }}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span style={{ fontSize: '12px', fontWeight: '500', color: token.colorTextSecondary }}>Kết quả cuộc gọi:</span>
                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 140 }}
                        options={[
                          { value: 'ALL', label: 'Tất cả kết quả' },
                          { value: 'ANSWER', label: 'ANSWER (Bắt máy)' },
                          { value: 'NOANSWER', label: 'NOANSWER (Lỡ)' },
                          { value: 'BUSY', label: 'BUSY (Bận)' },
                          { value: 'CANCEL', label: 'CANCEL (Hủy)' }
                        ]}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span style={{ fontSize: '12px', fontWeight: '500', color: token.colorTextSecondary }}>Trạng thái Happy Call:</span>
                      <Select
                        value={happyFilter}
                        onChange={setHappyFilter}
                        style={{ width: 150 }}
                        options={[
                          { value: 'ALL', label: 'Tất cả trạng thái' },
                          { value: 'APPROVED', label: 'Đồng ý' },
                          { value: 'REJECTED', label: 'Từ chối' },
                          { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
                          { value: 'NONE', label: 'Chưa xét' }
                        ]}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span style={{ fontSize: '12px', fontWeight: '500', color: token.colorTextSecondary }}>Trạng thái AI:</span>
                      <Select
                        value={aiFilter}
                        onChange={setAiFilter}
                        style={{ width: 150 }}
                        options={[
                          { value: 'ALL', label: 'Tất cả trạng thái' },
                          { value: 'PENDING', label: 'PENDING (Chờ)' },
                          { value: 'PROCESSING', label: 'PROCESSING (Đang chạy)' },
                          { value: 'DONE', label: 'DONE (Hoàn thành)' },
                          { value: 'FAILED', label: 'FAILED (Lỗi)' }
                        ]}
                      />
                    </div>

                    {isAdmin && (
                      <div className="flex flex-col gap-1">
                        <span style={{ fontSize: '12px', fontWeight: '500', color: token.colorTextSecondary }}>Nhân viên:</span>
                        <Select
                          value={staffFilter}
                          onChange={setStaffFilter}
                          style={{ width: 170 }}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={[
                            { value: 'ALL', label: 'Tất cả nhân viên' },
                            ...staffList.map(s => ({ value: s.id.toString(), label: s.displayName }))
                          ]}
                        />
                      </div>
                    )}

                    <div className="flex items-end h-full" style={{ marginTop: 'auto' }}>
                      <Space>
                        <Button
                          type="primary"
                          icon={<SearchOutlined />}
                          onClick={() => { setCurrentPage(1); fetchLogs(); }}
                          style={{ background: token.colorPrimary, borderColor: token.colorPrimary }}
                        >
                          Tìm kiếm
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={() => {
                            setDateRange([dayjs().subtract(30, 'day'), dayjs()]);
                            setStatusFilter('ALL');
                            setHappyFilter('ALL');
                            setAiFilter('ALL');
                            setStaffFilter('ALL');
                            setCurrentPage(1);
                          }}
                        >
                          Lọc lại
                        </Button>
                      </Space>
                    </div>
                  </div>

                  {/* DATA TABLE */}
                  <Table
                    columns={logsColumns}
                    dataSource={logs}
                    loading={loadingLogs}
                    rowKey="id"
                    pagination={{
                      current: currentPage,
                      pageSize: pageSize,
                      total: totalLogs,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50'],
                      onChange: handlePageChange,
                      locale: { items_per_page: '/ trang' }
                    }}
                    className="antd-custom-table"
                  />
                </div>
              )
            },
            ...(isAdmin
              ? [
                  {
                    key: 'configs',
                    label: (
                      <span>
                        <SettingOutlined /> Cấu hình Extension nhân viên
                      </span>
                    ),
                    children: (
                      <div>
                        <Paragraph style={{ color: token.colorTextSecondary, marginBottom: '20px' }}>
                          Mỗi Telesales / Booker cần được gán chính xác mã số máy lẻ (Extension) tương ứng trên hệ thống tổng đài OmiCall. Webhook OmiCall gửi dữ liệu cuộc gọi về hệ thống sẽ dựa trên mã máy lẻ này để gán KPI cuộc gọi và bản ghi AI phân tích chính xác cho từng nhân viên.
                        </Paragraph>

                        <Table
                          columns={configsColumns}
                          dataSource={configs}
                          loading={loadingConfigs}
                          rowKey="staffId"
                          pagination={false}
                          className="antd-custom-table"
                        />
                      </div>
                    )
                  }
                ]
              : [])
          ]}
        />
      </Card>

      {/* EXTENSION CONFIG MODAL */}
      <Modal
        title={selectedStaffForConfig ? `Gán máy lẻ OmiCall cho: ${selectedStaffForConfig.displayName}` : ''}
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        onOk={handleSaveConfig}
        confirmLoading={submittingConfig}
        okText="Ghi nhận"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={configForm} layout="vertical" style={{ marginTop: '20px' }}>
          <Form.Item
            name="extension"
            label="Mã máy lẻ (OmiCall Extension ID):"
            rules={[
              { required: true, message: 'Vui lòng nhập mã máy lẻ extension' },
              { pattern: /^[0-9]+$/, message: 'Mã máy lẻ phải là các chữ số' }
            ]}
          >
            <Input placeholder="Ví dụ: 101, 102, 103..." maxLength={10} />
          </Form.Item>
          
          <Form.Item
            name="sipPassword"
            label="Mật khẩu SIP WebRTC (SIP Password):"
            help="Chỉ điền khi muốn tạo mới hoặc cập nhật mật khẩu SIP thiết bị"
          >
            <Input.Password placeholder="Nhập mật khẩu máy nhánh WebRTC" />
          </Form.Item>
          
          <Form.Item
            name="phoneNumber"
            label="Số Hotline hiển thị (Outbound Caller ID):"
            rules={[
              { pattern: /^[0-9]+$/, message: 'Số điện thoại không hợp lệ' }
            ]}
          >
            <Input placeholder="Ví dụ: 02871012345" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>

      {/* AUDIO PLAYER & QA DETAILS DRAWER */}
      <QAPlayerDrawer
        open={qaDrawerOpen}
        omicallLogId={selectedLogId}
        onClose={() => setQaDrawerOpen(false)}
        onVerifySuccess={fetchLogs}
      />
    </div>
  );
}
