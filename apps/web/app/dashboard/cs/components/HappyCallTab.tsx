'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, DatePicker, Select, Space, Tooltip, Input, theme, message, Avatar } from 'antd';
import {
  PhoneOutlined,
  FormOutlined,
  MessageOutlined,
  DisconnectOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';
import SurveyModal from './SurveyModal';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

const { RangePicker } = DatePicker;

interface HappyCallTabProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function HappyCallTab({ dateFrom, dateTo }: HappyCallTabProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Synchronously initialize pagination with saved pageSize from localStorage
  const [pagination, setPagination] = useState(() => {
    let pageSize = 20;
    if (typeof window !== 'undefined') {
      const savedPageSize = localStorage.getItem('cs-happycall-pagesize');
      if (savedPageSize) {
        pageSize = parseInt(savedPageSize, 10) || 20;
      }
    }
    return { current: 1, pageSize };
  });

  const [filters, setFilters] = useState({
    status: 'ALL',
    search: '',
  });

  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        dateFrom,
        dateTo,
      };
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const res = await apiClient.cs.listHappyCalls(params);
      if (res && res.data) {
        setData(res.data);
        setTotal(res.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching happy calls:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi tải danh sách gọi chăm sóc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, filters, dateFrom, dateTo]);

  const handleGenerateDaily = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.cs.generateHappyCalls();
      message.success(`Đã tạo thành công ${res?.created || 0} nhiệm vụ gọi chăm sóc từ đơn hoàn thành hôm qua!`);
      setPagination((prev) => ({ ...prev, current: 1 }));
      fetchData();
    } catch (error: any) {
      console.error('Error generating happy calls:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi tạo nhiệm vụ gọi chăm sóc');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await apiClient.cs.updateHappyCallStatus(id, status);
      message.success('Cập nhật trạng thái thành công');
      fetchData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      message.error(error?.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cs-happycall-pagesize', newPagination.pageSize.toString());
    }
  };

  const openCustomerDetail = (customerId: number) => {
    if (customerId) {
      setSelectedCustomerId(customerId);
      setCustomerDrawerOpen(true);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      PENDING: { color: 'blue', label: 'Chờ gọi' },
      COMPLETED: { color: 'green', label: 'Đã gọi' },
      NO_ANSWER: { color: 'orange', label: 'Không nghe máy' },
      MESSAGED: { color: 'cyan', label: 'Đã nhắn tin' },
      UNREACHABLE: { color: 'red', label: 'Không liên lạc được' },
    };
    const config = statusConfig[status] || { color: 'default', label: status };
    return <Tag color={config.color}>{config.label}</Tag>;
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 55,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums text-xs text-slate-400 font-semibold">
          {(pagination.current - 1) * pagination.pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string, record: any) => {
        const name = text || 'Khách hàng';
        const initial = name.trim().charAt(0).toUpperCase();
        const avatarUrl = record.customerAvatar || record.avatar;
        return (
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => openCustomerDetail(record.customerId)}
          >
            <Avatar
              src={avatarUrl || undefined}
              className="bg-sky-600 text-white font-bold flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform"
              size={36}
            >
              {!avatarUrl && (initial || <UserOutlined />)}
            </Avatar>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-500 transition-colors underline-offset-2 group-hover:underline">
                {name}
              </div>
              <div className="text-xs text-slate-400 tabular-nums">{record.customerPhone || record.phone || '-'}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (text: string, record: any) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">{text || record.service || '-'}</span>
      ),
    },
    {
      title: 'BK',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (text: string, record: any) => (
        <span className="text-slate-600 dark:text-slate-300">{text || record.bk || '-'}</span>
      ),
    },
    {
      title: 'CC',
      dataIndex: 'ccOutName',
      key: 'ccOutName',
      render: (text: string, record: any) => (
        <span className="text-slate-600 dark:text-slate-300">{text || record.ccInName || record.cc || '-'}</span>
      ),
    },
    {
      title: 'CV',
      dataIndex: 'technicianName',
      key: 'technicianName',
      render: (text: string, record: any) => (
        <span className="text-slate-600 dark:text-slate-300">{text || record.ktv || '-'}</span>
      ),
    },
    {
      title: 'Ngày checkout',
      dataIndex: 'checkoutDate',
      key: 'checkoutDate',
      render: (date: string) => (
        <span className="tabular-nums text-xs text-slate-500">
          {date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: 'NV CSKH',
      dataIndex: 'assignedCsStaffName',
      key: 'assignedCsStaffName',
      render: (text: string) => <span className="font-medium text-sky-600 dark:text-sky-400">{text || '-'}</span>,
    },
    {
      title: 'Lần thử',
      dataIndex: 'attemptCount',
      key: 'attemptCount',
      render: (count: number) => <span className="tabular-nums font-medium">{count ?? 0}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Đã gọi - Không nghe máy">
            <Button
              type="text"
              size="small"
              icon={<PhoneOutlined className="text-amber-500" />}
              onClick={() => handleUpdateStatus(record.id, 'NO_ANSWER')}
            />
          </Tooltip>

          <Tooltip title="Nhập kết quả khảo sát">
            <Button
              type="primary"
              size="small"
              icon={<FormOutlined />}
              onClick={() => {
                setSelectedTaskId(record.id);
                setSurveyModalOpen(true);
              }}
            >
              Khảo sát
            </Button>
          </Tooltip>

          <Tooltip title="Đánh dấu đã nhắn tin">
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined className="text-cyan-500" />}
              onClick={() => handleUpdateStatus(record.id, 'MESSAGED')}
            />
          </Tooltip>

          <Tooltip title="Không liên lạc được">
            <Button
              type="text"
              size="small"
              danger
              icon={<DisconnectOutlined />}
              onClick={() => handleUpdateStatus(record.id, 'UNREACHABLE')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Controls / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <Space wrap>
          <Input
            placeholder="Tìm theo tên/SĐT..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: 220 }}
            allowClear
          />

          <Select
            value={filters.status}
            onChange={(val) => {
              setFilters((prev) => ({ ...prev, status: val }));
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'PENDING', label: 'Chờ gọi' },
              { value: 'COMPLETED', label: 'Đã gọi' },
              { value: 'NO_ANSWER', label: 'Không nghe máy' },
              { value: 'MESSAGED', label: 'Đã nhắn tin' },
              { value: 'UNREACHABLE', label: 'Không liên lạc được' },
            ]}
          />

          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
        </Space>

        <Button
          type="primary"
          icon={<ReloadOutlined />}
          loading={generating}
          onClick={handleGenerateDaily}
          className="bg-gradient-to-r from-amber-500 to-orange-600 border-none hover:from-amber-600 hover:to-orange-700 text-white font-medium"
        >
          Tạo nhiệm vụ hôm nay
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Tổng số ${total} bản ghi`,
        }}
        onChange={handleTableChange}
        className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs"
      />

      {/* Survey Modal */}
      {selectedTaskId && (
        <SurveyModal
          open={surveyModalOpen}
          onClose={() => {
            setSurveyModalOpen(false);
            fetchData();
          }}
          taskId={selectedTaskId}
        />
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomerId && (
        <CustomerDetailDrawer
          open={customerDrawerOpen}
          onClose={() => setCustomerDrawerOpen(false)}
          customerId={selectedCustomerId}
        />
      )}
    </div>
  );
}
