'use client';

import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Select, Space, Tooltip, Avatar, theme, message } from 'antd';
import dynamic from 'next/dynamic';
import TicketDetailDrawer from './TicketDetailDrawer';
import CreateTicketModal from './CreateTicketModal';
import DepartmentHandlerModal from './DepartmentHandlerModal';
import { SettingOutlined, SearchOutlined, PlusOutlined, AlertOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../../../context/ThemeContext';
import { apiClient } from '../../../../lib/api-client';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), { ssr: false });

interface TicketTabProps {
  dateFrom?: string;
  dateTo?: string;
}

export default function TicketTab({ dateFrom, dateTo }: TicketTabProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [handlerModalOpen, setHandlerModalOpen] = useState(false);

  // Customer Detail Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const handleRowClick = (record: any) => {
    setSelectedTicket(record);
    setDrawerOpen(true);
  };

  const [pagination, setPagination] = useState(() => {
    let pageSize = 20;
    if (typeof window !== 'undefined') {
      const savedPageSize = localStorage.getItem('cs-ticket-pagesize');
      if (savedPageSize) pageSize = parseInt(savedPageSize, 10) || 20;
    }
    return { current: 1, pageSize };
  });

  const [filters, setFilters] = useState({
    status: 'ALL',
    priority: 'ALL',
    department: 'ALL',
    type: 'ALL',
    search: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.cs.listTickets({
        page: pagination.current,
        pageSize: pagination.pageSize,
        status: filters.status === 'ALL' ? undefined : filters.status,
        priority: filters.priority === 'ALL' ? undefined : filters.priority,
        department: filters.department === 'ALL' ? undefined : filters.department,
        type: filters.type === 'ALL' ? undefined : filters.type,
        search: filters.search || undefined,
        dateFrom,
        dateTo,
      });

      if (res && res.success !== false) {
        setData(res.data || []);
        setTotal(res.total || 0);
      } else {
        message.error('Không thể tải danh sách Ticket');
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi tải danh sách Ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, filters, dateFrom, dateTo]);

  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cs-ticket-pagesize', newPagination.pageSize.toString());
    }
  };

  const getPriorityTag = (prio: string) => {
    switch (prio) {
      case 'URGENT':
        return <Tag color="red">Khẩn cấp</Tag>;
      case 'HIGH':
        return <Tag color="orange">Cao</Tag>;
      case 'MEDIUM':
        return <Tag color="blue">Trung bình</Tag>;
      case 'LOW':
        return <Tag color="default">Thấp</Tag>;
      default:
        return <Tag>{prio}</Tag>;
    }
  };

  const getStatusTag = (status: string, record?: any) => {
    const totalSub = record?.totalSubtasksCount || 0;
    const doneSub = record?.completedSubtasksCount || 0;

    switch (status) {
      case 'OPEN':
        if (totalSub > 0) {
          return (
            <Tag color="processing">
              Nội bộ ({doneSub}/{totalSub})
            </Tag>
          );
        }
        return <Tag color="blue">Mới</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="cyan">Đang xử lý</Tag>;
      case 'PENDING_RESPONSE':
        return (
          <Tag color="gold" className="font-semibold animate-pulse">
            Sẵn sàng gọi KH ({doneSub}/{totalSub})
          </Tag>
        );
      case 'RESOLVED':
        return <Tag color="green">Đã giải quyết</Tag>;
      case 'CLOSED':
        return <Tag color="default">Đóng</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums text-slate-400 font-medium">
          {(pagination.current - 1) * pagination.pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Mã Ticket',
      dataIndex: 'ticketCode',
      key: 'ticketCode',
      render: (text: string, record: any) => (
        <span className="font-semibold text-blue-500">{text || record.code || `TK-${record.id}`}</span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      className: 'font-medium',
      render: (text: string, record: any) => (
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={(e) => {
            if (record.customerId) {
              e.stopPropagation();
              setSelectedCustomerId(record.customerId);
              setCustomerDrawerOpen(true);
            }
          }}
        >
          <Avatar
            src={record.customerAvatar}
            icon={<UserOutlined />}
            className="shrink-0 bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold"
          />
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition-colors truncate">
              {text || 'Khách hàng'}
            </div>
            {record.customerPhone && <div className="text-xs text-slate-400 tabular-nums">{record.customerPhone}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) =>
        t === 'COMPLAINT' ? 'Phàn nàn' : t === 'REQUEST' ? 'Yêu cầu' : t === 'FEEDBACK' ? 'Góp ý' : t || '-',
    },
    {
      title: 'Bộ phận',
      dataIndex: 'department',
      key: 'department',
      render: (text: string, record: any) => {
        const depts: string[] =
          record.departments && record.departments.length > 0 ? record.departments : [text || 'CSKH'];
        return (
          <div className="flex flex-wrap gap-1">
            {depts.map((d: string) => {
              const color =
                d === 'CV'
                  ? 'purple'
                  : d === 'CC'
                    ? 'cyan'
                    : d === 'BK'
                      ? 'blue'
                      : d === 'FACILITY'
                        ? 'orange'
                        : 'magenta';
              return (
                <Tag key={d} color={color} className="font-semibold text-xs border-0">
                  {d}
                </Tag>
              );
            })}
          </div>
        );
      },
    },
    { title: 'Mức ưu tiên', dataIndex: 'priority', key: 'priority', render: getPriorityTag },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => getStatusTag(status, record),
    },
    {
      title: 'SLA',
      dataIndex: 'slaDueDate',
      key: 'slaDueDate',
      render: (dueDate: string, record: any) => {
        const isOverdue =
          record.isOverdue ||
          (dueDate && dayjs().isAfter(dayjs(dueDate)) && record.status !== 'RESOLVED' && record.status !== 'CLOSED');
        const formatted = dueDate ? dayjs(dueDate).format('DD/MM HH:mm') : record.sla || '-';
        return (
          <span className={isOverdue ? 'text-red-500 font-medium flex items-center gap-1' : ''}>
            {isOverdue && <AlertOutlined />} {formatted}
          </span>
        );
      },
    },
    {
      title: 'Phụ trách',
      dataIndex: 'assignedCsStaffName',
      key: 'assignedCsStaffName',
      render: (text: string, record: any) => text || record.assignee || '-',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <Space wrap>
          <Input
            placeholder="Tìm mã ticket, tên KH..."
            prefix={<SearchOutlined className="text-slate-400" />}
            style={{ width: 220 }}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            allowClear
          />
          <Select
            value={filters.status}
            onChange={(val) => setFilters({ ...filters, status: val })}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'Tất cả trạng thái' },
              { value: 'OPEN', label: 'Mới' },
              { value: 'IN_PROGRESS', label: 'Đang xử lý' },
              { value: 'RESOLVED', label: 'Đã giải quyết' },
              { value: 'CLOSED', label: 'Đóng' },
            ]}
          />
          <Select
            value={filters.priority}
            onChange={(val) => setFilters({ ...filters, priority: val })}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'Tất cả ưu tiên' },
              { value: 'URGENT', label: 'Khẩn cấp' },
              { value: 'HIGH', label: 'Cao' },
              { value: 'MEDIUM', label: 'Trung bình' },
              { value: 'LOW', label: 'Thấp' },
            ]}
          />
          <Select
            value={filters.department}
            onChange={(val) => setFilters({ ...filters, department: val })}
            style={{ width: 140 }}
            options={[
              { value: 'ALL', label: 'Tất cả bộ phận' },
              { value: 'CSKH', label: 'CSKH' },
              { value: 'OPERATIONS', label: 'Vận hành' },
              { value: 'TECH', label: 'Kỹ thuật' },
            ]}
          />
        </Space>
        <Space wrap>
          <Button icon={<SettingOutlined />} onClick={() => setHandlerModalOpen(true)}>
            Cấu hình Phụ trách
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: token.colorPrimary }}
            onClick={() => setCreateModalOpen(true)}
          >
            Tạo Ticket
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (t) => `Tổng số ${t} ticket`,
        }}
        onChange={handleTableChange}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors',
        })}
        className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
      />

      <TicketDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ticketId={selectedTicket?.id || null}
        ticket={selectedTicket}
        onSuccess={fetchData}
      />

      <CreateTicketModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setPagination((prev) => ({ ...prev, current: 1 }));
          fetchData();
        }}
      />

      <DepartmentHandlerModal
        open={handlerModalOpen}
        onClose={() => setHandlerModalOpen(false)}
        onSuccess={fetchData}
      />

      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={customerDrawerOpen}
        onClose={() => setCustomerDrawerOpen(false)}
      />
    </div>
  );
}
