'use client';

import React from 'react';
import { Drawer, Timeline, Tag, Typography, Spin, Empty, Button } from 'antd';
import {
  HistoryOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  UnlockOutlined,
  LockOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CampaignSharedPoolLog } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';

const { Text } = Typography;

interface SharedPoolAuditDrawerProps {
  open: boolean;
  onClose: () => void;
  customer: any | null;
  logs: CampaignSharedPoolLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const SharedPoolAuditDrawer: React.FC<SharedPoolAuditDrawerProps> = ({
  open,
  onClose,
  customer,
  logs,
  loading,
  onRefresh,
}) => {
  const { themeMode } = useTheme();

  if (!customer) return null;

  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'CLAIM':
        return (
          <Tag color="orange" className="font-semibold inline-flex items-center gap-1">
            <LockOutlined /> CLAIM (GIỮ DATA)
          </Tag>
        );
      case 'RELEASE_MANUAL':
        return (
          <Tag color="cyan" className="font-semibold inline-flex items-center gap-1">
            <UnlockOutlined /> NHẢ DATA
          </Tag>
        );
      case 'RELEASE_MANAGER':
        return (
          <Tag color="red" className="font-semibold inline-flex items-center gap-1">
            <UnlockOutlined /> QUẢN LÝ THU HỒI
          </Tag>
        );
      case 'RELEASE_TIMEOUT':
        return (
          <Tag color="volcano" className="font-semibold inline-flex items-center gap-1">
            <ClockCircleOutlined /> HẾT HẠN TTL
          </Tag>
        );
      case 'STATUS_UPDATE':
      case 'CALL':
        return (
          <Tag color="purple" className="font-semibold inline-flex items-center gap-1">
            <PhoneOutlined /> BÁO CÁO GỌI
          </Tag>
        );
      case 'BOOK':
        return (
          <Tag color="green" className="font-semibold inline-flex items-center gap-1">
            <CheckCircleOutlined /> CHỐT BOOKING
          </Tag>
        );
      case 'RETURN_TO_POOL':
        return (
          <Tag color="blue" className="font-semibold inline-flex items-center gap-1">
            <ReloadOutlined /> VỀ LẠI POOL
          </Tag>
        );
      case 'EXCLUDE':
        return (
          <Tag color="default" className="font-semibold inline-flex items-center gap-1">
            <CloseCircleOutlined /> LOẠI KHỎI POOL
          </Tag>
        );
      default:
        return <Tag>{action}</Tag>;
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-purple-600 text-lg" />
            <span className="font-bold text-base">Lịch Sử Khai Thác & Chống Tranh Công</span>
          </div>
          <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            Làm mới
          </Button>
        </div>
      }
      open={open}
      onClose={onClose}
      width={520}
      destroyOnHidden
    >
      {/* Header Customer Info */}
      <div className="mb-5 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/60 dark:bg-purple-950/20">
        <div className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <UserOutlined className="text-purple-500" />
          <span>{customer.customerName || `Khách hàng #${customer.legacyUserId}`}</span>
        </div>
        <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5">
          {customer.customerPhone || 'Không có số điện thoại'}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-purple-200/40 text-xs text-gray-500">
          <span>
            Batch: <strong>#{customer.batchNumber || 1}</strong>
          </span>
          <span>·</span>
          <span>
            Trạng thái hiện tại:{' '}
            <Tag color="purple" className="m-0 font-semibold text-[11px]">
              {customer.poolStatus || 'AVAILABLE'}
            </Tag>
          </span>
        </div>
      </div>

      <div className="mb-3 text-xs text-gray-400 italic">
        * Tất cả hành động nhận khách, trả khách, cuộc gọi và đặt lịch đều được hệ thống ghi nhận bất biến theo thời gian thực để đảm bảo minh bạch quyền lợi cho từng telesales.
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Spin />
          <div className="text-xs text-gray-400 mt-2">Đang tải lịch sử tương tác...</div>
        </div>
      ) : logs.length === 0 ? (
        <Empty description="Chưa có lịch sử tương tác nào trong Shared Pool" className="py-8" />
      ) : (
        <Timeline
          className="mt-4"
          items={logs.map((log) => ({
            color:
              log.action === 'BOOK'
                ? 'green'
                : log.action === 'CLAIM'
                  ? 'orange'
                  : log.action === 'STATUS_UPDATE'
                    ? 'purple'
                    : 'blue',
            children: (
              <div className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-1.5">
                    {renderActionBadge(log.action)}
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-200">
                      {log.staffName || `NV #${log.staffId}`}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                    {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                  </span>
                </div>

                {log.note && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-1">
                    {log.note}
                  </div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Drawer>
  );
};
