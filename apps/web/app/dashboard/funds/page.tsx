'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Typography,
  Space,
  Input,
  Select,
  Row,
  Col,
  Progress,
  message,
  Tooltip,
} from 'antd';
import {
  Plus,
  Search,
  RotateCw,
  Eye,
  Settings2,
  WalletCards,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { Fund, FundStatus } from '@mos-lab/shared';
import apiClient from '~/lib/api-client';
import {
  AdaptiveModal,
  AppIcon,
  DataTable,
  StatePanel,
  StatusTag,
} from '~/components/ui';
import { removeVietnameseTones } from '~/lib/utils/search';

const { Title, Text, Paragraph } = Typography;

export default function FundsManagementPage() {
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadFunds = async () => {
    try {
      setLoading(true);
      const res = await apiClient.funds.list();
      if (res.success && Array.isArray(res.data)) {
        setFunds(res.data);
      } else {
        setFunds([]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Fetch funds error:', error);
      message.error(error.message || 'Không thể tải danh sách Quỹ hoạt động.');
      setFunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
  }, []);

  const handleOpenCreate = () => {
    setCreateModalOpen(true);
  };

  const filteredFunds = useMemo(() => {
    return funds.filter((fund) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && fund.status !== statusFilter) {
        return false;
      }

      // 2. Search Query (Name, Code, Description)
      if (searchQuery.trim()) {
        const queryNorm = removeVietnameseTones(searchQuery.toLowerCase().trim());
        const nameNorm = removeVietnameseTones((fund.name || '').toLowerCase());
        const codeNorm = removeVietnameseTones((fund.code || '').toLowerCase());
        const descNorm = removeVietnameseTones((fund.description || '').toLowerCase());
        return (
          nameNorm.includes(queryNorm) ||
          codeNorm.includes(queryNorm) ||
          descNorm.includes(queryNorm)
        );
      }

      return true;
    });
  }, [funds, statusFilter, searchQuery]);

  const renderStatusTag = (status: FundStatus, isLowBalance?: boolean) => {
    if (isLowBalance) {
      return (
        <StatusTag
          status="warning"
          label="SẮP HẾT HẠN MỨC"
          icon={<AppIcon icon={ShieldAlert} size="sm" />}
        />
      );
    }
    switch (status) {
      case 'ACTIVE':
        return <StatusTag status="success" label="🟢 ĐANG HOẠT ĐỘNG" />;
      case 'FROZEN':
        return <StatusTag status="warning" label="⏸️ TẠM NGƯNG" />;
      case 'CLOSED':
        return <StatusTag status="default" label="🔒 ĐÃ ĐÓNG" />;
      default:
        return <StatusTag status="default" label={status} />;
    }
  };

  const columns = [
    {
      title: 'Tên quỹ',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Fund) => (
        <div>
          <div className="font-bold text-base text-emerald-600 dark:text-emerald-400">
            {text}
          </div>
          {record.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {record.description}
            </div>
          )}
          {record.currentPeriod && (
            <div className="mt-1">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-medium">
                {record.currentPeriod.periodName}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Mã quỹ',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <span className="font-mono font-semibold tracking-wider text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {code}
        </span>
      ),
    },
    {
      title: 'Hạn mức',
      key: 'maxQuota',
      align: 'right' as const,
      render: (_: unknown, record: Fund) => (
        <div className="text-right">
          <div className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {Number(record.maxQuota || 0).toLocaleString('vi-VN')} đ
          </div>
          {record.unitQuota > 0 && (
            <div className="text-[11px] text-slate-500 tabular-nums">
              Định mức: {Number(record.unitQuota).toLocaleString('vi-VN')} đ
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Số dư hiện tại',
      key: 'currentBalance',
      align: 'right' as const,
      render: (_: unknown, record: Fund) => {
        const percent =
          record.maxQuota > 0 ? Math.round((record.currentBalance / record.maxQuota) * 100) : 0;
        return (
          <div className="text-right min-w-[140px]">
            <div className="font-bold tabular-nums text-base text-slate-900 dark:text-white">
              {Number(record.currentBalance || 0).toLocaleString('vi-VN')} đ
            </div>
            <div className="w-full flex items-center justify-end gap-2 mt-0.5">
              <div className="w-20">
                <Progress
                  percent={percent}
                  size="small"
                  showInfo={false}
                  status={record.isLowBalance ? 'exception' : percent < 20 ? 'exception' : 'success'}
                />
              </div>
              <span className="text-[11px] tabular-nums text-slate-500">{percent}%</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center' as const,
      render: (_: unknown, record: Fund) => renderStatusTag(record.status, record.isLowBalance),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center' as const,
      width: 120,
      render: (_: unknown, record: Fund) => (
        <Space size={6} align="center">
          <Tooltip title={`Xem chi tiết quỹ ${record.name}`}>
            <Button
              type="primary"
              size="small"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              icon={<AppIcon icon={Eye} size="sm" />}
              onClick={() => {
                message.info(`Chi tiết Quỹ "${record.name}" sẽ được mở rộng trong Bước 2.`);
              }}
            />
          </Tooltip>
          <Tooltip title="Cấu hình quỹ">
            <Button
              size="small"
              icon={<AppIcon icon={Settings2} size="sm" />}
              onClick={() => {
                message.info(`Cấu hình Quỹ "${record.name}" sẽ được hỗ trợ trong Bước 2.`);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title
            level={2}
            className="!m-0 !font-bold flex items-center gap-2.5 text-emerald-800 dark:text-emerald-400"
          >
            <AppIcon icon={WalletCards} size="lg" className="text-emerald-500" />
            <span>Quản Lý Quỹ Hoạt Động Nội Bộ</span>
          </Title>
          <Paragraph type="secondary" className="mt-1 mb-0 text-sm">
            Hệ thống phân bổ, định mức hạn mức và giám sát chi tiêu quỹ nội bộ doanh nghiệp (mOS Fund Master).
          </Paragraph>
        </div>

        <Space wrap size="middle">
          <Button
            icon={<AppIcon icon={RotateCw} size="sm" />}
            size="large"
            onClick={loadFunds}
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<AppIcon icon={Plus} size="sm" />}
            size="large"
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600 font-bold text-white"
            onClick={handleOpenCreate}
          >
            Tạo Quỹ Mới
          </Button>
        </Space>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Tìm kiếm quỹ (Tên quỹ, Mã quỹ, Mô tả)..."
              prefix={<AppIcon icon={Search} size="sm" className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              className="w-full"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: '🟢 Đang hoạt động (ACTIVE)' },
                { value: 'FROZEN', label: '⏸️ Tạm ngưng (FROZEN)' },
                { value: 'CLOSED', label: '🔒 Đã đóng (CLOSED)' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={6} className="text-right">
            <Text type="secondary" className="tabular-nums font-medium">
              Hiển thị <strong>{filteredFunds.length}</strong> quỹ
            </Text>
          </Col>
        </Row>
      </div>

      {/* Main Table or Empty State */}
      {!loading && funds.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/50">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-500 mb-1">
              <AppIcon icon={WalletCards} size={32} />
            </div>
            <div>
              <Title level={4} className="!m-0 !font-bold">
                Chưa có quỹ hoạt động nào
              </Title>
              <Paragraph type="secondary" className="mt-2 text-sm">
                Hiện tại chưa có quỹ hoạt động nội bộ nào được khởi tạo trong hệ thống. Vui lòng bấm &ldquo;Tạo Quỹ Mới&rdquo; để thiết lập quỹ đầu tiên.
              </Paragraph>
            </div>
            <Button
              type="primary"
              icon={<AppIcon icon={Plus} size="sm" />}
              size="large"
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600 font-bold text-white"
              onClick={handleOpenCreate}
            >
              Tạo Quỹ Mới
            </Button>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          dataSource={filteredFunds}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: (
              <StatePanel
                kind="empty"
                title="Không tìm thấy quỹ nào"
                description="Không tìm thấy quỹ hoạt động nào phù hợp với bộ lọc tìm kiếm hiện tại."
                surface={false}
              />
            ),
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng số: ${total} quỹ`,
          }}
          className="antd-custom-table"
          stickyPrimaryColumn
        />
      )}

      {/* Modal Placeholder for Create Fund (Step 2 Preview) */}
      <AdaptiveModal
        intent="form"
        title={
          <div className="flex items-center gap-2 font-bold text-lg">
            <AppIcon icon={Sparkles} size="sm" className="text-emerald-500" />
            <span>Thiết Lập Quỹ Hoạt Động Nội Bộ Mới</span>
          </div>
        }
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setCreateModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={560}
      >
        <div className="py-4 space-y-3">
          <Paragraph>
            Tính năng khởi tạo Quỹ Hoạt Động Mới (bao gồm thiết lập Mã Quỹ, Hạn Mức, Định Mức Chi Tiêu, Cấu Hình Dung Sai và Gán Vai Trò Thủ Quỹ/Phê Duyệt) đang được chuẩn bị triển khai trong <strong>Bước 2: Form Khởi Tạo & Quản Trị Quỹ Động</strong>.
          </Paragraph>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
            💡 <strong>Bước 1 hoàn tất</strong>: Cơ sở dữ liệu đã được làm sạch, không còn quỹ mẫu giả lập, Sidebar và giao diện Quản Lý Quỹ đã được tái cấu trúc đồng bộ theo chuẩn Quản Lý Chiến Dịch NYC.
          </div>
        </div>
      </AdaptiveModal>
    </div>
  );
}
