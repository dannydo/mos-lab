'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tag, Button, Select, Modal, Form, Input, Image, Space, message, Alert, Divider } from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CameraOutlined,
  ReloadOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { QaActionTicket, QaTicketStatus, QaSeverity } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

interface ActionTicketsTabProps {
  themeMode: string;
}

export const ActionTicketsTab: React.FC<ActionTicketsTabProps> = ({ themeMode }) => {
  const [tickets, setTickets] = useState<QaActionTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [tPage, setTPage] = useState(1);
  const [tPageSize, setTPageSize] = useState(10);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal Resolve state
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<QaActionTicket | null>(null);
  const [form] = Form.useForm();
  const [resolving, setResolving] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.qaShop.getTickets({
        branchCode: branchFilter,
        status: statusFilter,
      });
      setTickets(res || []);
    } catch (err) {
      console.error('Fetch tickets error:', err);
      message.error('Lỗi khi tải danh sách Ticket Sự Cố');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, statusFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleOpenResolveModal = (ticket: QaActionTicket) => {
    setSelectedTicket(ticket);
    form.setFieldsValue({
      status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED',
      resolutionNotes: ticket.resolutionNotes || '',
      resolutionPhotoUrl: ticket.resolutionPhotoUrls?.[0] || '',
    });
    setResolveModalOpen(true);
  };

  const handleFinishResolve = async (values: {
    status: QaTicketStatus;
    resolutionNotes: string;
    resolutionPhotoUrl?: string;
  }) => {
    if (!selectedTicket) return;
    try {
      setResolving(true);
      await apiClient.qaShop.updateTicket(selectedTicket.id, {
        status: values.status,
        resolutionNotes: values.resolutionNotes,
        resolutionPhotoUrls: values.resolutionPhotoUrl ? [values.resolutionPhotoUrl] : [],
      });
      message.success(`Đã cập nhật Ticket ${selectedTicket.ticketCode} thành công!`);
      setResolveModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      console.error('Update ticket error:', err);
      message.error(err.message || 'Lỗi khi cập nhật ticket');
    } finally {
      setResolving(false);
    }
  };

  const getSeverityTag = (severity: QaSeverity | string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <Tag color="red" className="font-bold text-[10px]">
            🔴 CỰC KỲ NGHIÊM TRỌNG
          </Tag>
        );
      case 'HIGH':
        return (
          <Tag color="volcano" className="font-bold text-[10px]">
            🟠 NGHIÊM TRỌNG
          </Tag>
        );
      case 'MEDIUM':
      case 'MID':
        return (
          <Tag color="gold" className="font-bold text-[10px]">
            🟡 TRUNG BÌNH
          </Tag>
        );
      default:
        return (
          <Tag color="blue" className="text-[10px]">
            🟢 NHẸ
          </Tag>
        );
    }
  };

  const getStatusTag = (status: QaTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <Tag color="error" className="font-bold">
            Mới - Chưa sửa
          </Tag>
        );
      case 'IN_PROGRESS':
        return (
          <Tag color="processing" className="font-bold">
            Đang Khắc Phục
          </Tag>
        );
      case 'RESOLVED':
        return (
          <Tag color="warning" className="font-bold">
            Đã Sửa - Chờ QA Duyệt
          </Tag>
        );
      case 'VERIFIED':
        return (
          <Tag color="success" className="font-bold">
            QA Đã Nghiệm Thu
          </Tag>
        );
    }
  };

  const columns = [
    {
      title: 'Mã Ticket / Ngày',
      dataIndex: 'ticketCode',
      key: 'ticketCode',
      render: (code: string, record: QaActionTicket) => (
        <div>
          <div className="font-bold text-xs font-mono text-rose-600 dark:text-rose-400 tabular-nums">{code}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Audit: <span className="font-mono tabular-nums">{record.auditCode}</span>
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 tabular-nums">
            Hạn: {dayjs(record.dueDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Chi Nhánh & Phân Khu',
      key: 'branch',
      render: (_: any, record: QaActionTicket) => (
        <div>
          <Tag color="purple">{record.branchCode}</Tag>
          <div className="font-bold text-xs mt-1 text-slate-800 dark:text-slate-200">{record.itemTitle}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">{record.sectionTitle}</div>
        </div>
      ),
    },
    {
      title: 'Mức Độ / Lý Do Vi Phạm',
      key: 'severity',
      render: (_: any, record: QaActionTicket) => (
        <div className="space-y-1 max-w-xs">
          <div>{getSeverityTag(record.severity)}</div>
          <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{record.issueNotes}</div>
          {record.proofPhotoUrls && record.proofPhotoUrls.length > 0 && (
            <div className="pt-1">
              <Image
                src={record.proofPhotoUrls[0]}
                alt="Proof"
                width={36}
                height={36}
                className="rounded object-cover border"
              />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Nhân Sự Phụ Trách',
      dataIndex: 'assignedToStaffName',
      key: 'assignedToStaffName',
      render: (name: string) => (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <UserOutlined className="mr-1 text-slate-400" />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: QaTicketStatus) => getStatusTag(st),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_: any, record: QaActionTicket) => (
        <Button
          type="primary"
          ghost
          size="small"
          onClick={() => handleOpenResolveModal(record)}
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        >
          Cập nhật tiến độ
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* FILTER BAR */}
      <Card
        className={`shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chi nhánh:</span>
              <Select
                value={branchFilter}
                onChange={setBranchFilter}
                className="w-40"
                options={[
                  { value: 'ALL', label: 'Tất cả chi nhánh' },
                  { value: 'DT', label: 'Đề Thám (DT)' },
                  { value: 'EP', label: 'Estella Place (EP)' },
                  { value: 'Q7', label: 'Quận 7 (Q7)' },
                  { value: 'TB', label: 'Tân Bình (TB)' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Trạng thái:</span>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-44"
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'OPEN', label: 'Mới - Chưa sửa' },
                  { value: 'IN_PROGRESS', label: 'Đang khắc phục' },
                  { value: 'RESOLVED', label: 'Đã sửa (Chờ QA duyệt)' },
                  { value: 'VERIFIED', label: 'QA Đã nghiệm thu' },
                ]}
              />
            </div>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTickets}
            loading={loading}
            className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          >
            Làm mới
          </Button>
        </div>
      </Card>

      {/* TICKET LIST TABLE */}
      <Card
        className={`shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={tickets}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: tPage,
            pageSize: tPageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => (
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Hiển thị {range[0]}-{range[1]} / tổng {total} phiếu lỗi
              </span>
            ),
            onChange: (p, s) => {
              setTPage(p);
              if (s && s !== tPageSize) {
                setTPageSize(s);
                setTPage(1);
              }
            },
          }}
          className="antd-custom-table"
        />
      </Card>

      {/* RESOLVE / UPDATE TICKET MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-emerald-500" />
            <span>Cập Nhật Tiến Độ Sửa Lỗi Ticket {selectedTicket?.ticketCode}</span>
          </div>
        }
        open={resolveModalOpen}
        onCancel={() => setResolveModalOpen(false)}
        footer={null}
        getContainer={() => document.body}
      >
        {selectedTicket && (
          <Form form={form} layout="vertical" onFinish={handleFinishResolve} className="mt-4">
            <Alert
              type="info"
              showIcon
              message={selectedTicket.itemTitle}
              description={`Yêu cầu tiêu chuẩn: ${selectedTicket.standardRequirement}`}
              className="mb-4 text-xs"
            />

            <Form.Item
              name="status"
              label="Trạng thái cập nhật"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}>
                <Select.Option value="IN_PROGRESS">🟡 Đang khắc phục tại shop</Select.Option>
                <Select.Option value="RESOLVED">🟢 Đã sửa xong (Báo QA nghiệm thu)</Select.Option>
                <Select.Option value="VERIFIED">✅ QA Đã Nghiệm Thu Đạt Chuẩn</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="resolutionNotes"
              label="Ghi chú kết quả khắc phục"
              rules={[{ required: true, message: 'Vui lòng nhập ghi chú khắc phục' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Mô tả công việc đã thực hiện để khắc phục sự cố này..."
                className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
              />
            </Form.Item>

            <Form.Item name="resolutionPhotoUrl" label="Ảnh minh chứng đã sửa thành công (URL)">
              <Input
                prefix={<CameraOutlined className="text-slate-400" />}
                placeholder="Dán link ảnh sau khi đã vệ sinh/sửa chữa..."
                className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
              />
            </Form.Item>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setResolveModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={resolving}
                icon={<CheckCircleOutlined />}
                className="focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                Lưu Cập Nhật Ticket
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};
