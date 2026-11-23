'use client';

import React from 'react';
import { Avatar, Button, Popconfirm, Space, Switch, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, MapPin, Pencil, ShoppingBag, User, Users } from 'lucide-react';
import type { BranchStaffInfo, BranchType, CrmBranch } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { BRANCH_TYPE_BADGE_MAP } from './branchHelpers';

const { Text } = Typography;

interface BranchColumnHandlers {
  loading: boolean;
  onOpenDetail: (branch: CrmBranch, mode: 'edit' | 'view') => void;
  onToggleActive: (branch: CrmBranch) => void;
}

export function buildBranchColumns({
  loading,
  onOpenDetail,
  onToggleActive,
}: BranchColumnHandlers): ColumnsType<CrmBranch> {
  return [
    {
      title: 'Mã & Tên Chi Nhánh',
      key: 'name',
      width: 230,
      render: (_: unknown, record: CrmBranch) => (
        <Space direction="vertical" size={2}>
          <Space>
            <StatusTag status="processing" label={record.code} className="font-semibold tabular-nums" />
            <Text
              strong
              className={`text-base cursor-pointer hover:text-blue-500 ${
                !record.isActive ? 'line-through text-slate-400' : ''
              }`}
              onClick={() => onOpenDetail(record, 'view')}
            >
              {record.name}
            </Text>
          </Space>
          {record.nameEn && (
            <Text type="secondary" className="text-xs italic">
              (EN: {record.nameEn})
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Địa chỉ hiển thị Web / SMS',
      key: 'addresses',
      width: 240,
      render: (_: unknown, record: CrmBranch) => (
        <div className="space-y-1 text-xs">
          {record.addressWeb && (
            <div>
              <Text type="secondary">Web: </Text>
              <Text>{record.addressWeb}</Text>
            </div>
          )}
          {record.addressSms && (
            <div>
              <Text type="secondary">SMS: </Text>
              <StatusTag status="cyan" label={record.addressSms} className="font-mono text-[11px]" />
            </div>
          )}
          {!record.addressWeb && !record.addressSms && <Text type="secondary">-</Text>}
        </div>
      ),
    },
    {
      title: 'Tỉnh / Thành / Quận',
      dataIndex: 'addressCity',
      key: 'addressCity',
      width: 170,
      render: (val: string | null) =>
        val ? (
          <Space size={4} className="text-xs">
            <AppIcon icon={MapPin} size={13} className="text-rose-500 shrink-0" />
            <span>{val}</span>
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Loại chi nhánh',
      dataIndex: 'storeType',
      key: 'storeType',
      width: 160,
      render: (type: BranchType) => {
        const badge = BRANCH_TYPE_BADGE_MAP[type] ?? BRANCH_TYPE_BADGE_MAP.SALON;
        return (
          <StatusTag
            status={badge.status}
            label={badge.label}
            className="px-2.5 py-0.5 font-semibold text-xs whitespace-nowrap"
          />
        );
      },
    },
    {
      title: 'Nhân sự sở tại',
      key: 'staffCount',
      width: 130,
      align: 'center',
      render: (_: unknown, record: CrmBranch) => (
        <Tooltip title="Số lượng CV & CC làm việc sở tại chi nhánh này">
          <StatusTag
            status="purple"
            icon={<AppIcon icon={Users} size={13} />}
            label={(record.staffCount || 0).toLocaleString('vi-VN')}
            className="px-2.5 py-0.5 font-semibold text-sm tabular-nums"
          />
        </Tooltip>
      ),
    },
    {
      title: 'Khách hàng thuộc CN',
      key: 'customerCount',
      width: 145,
      align: 'center',
      render: (_: unknown, record: CrmBranch) => (
        <Tooltip title="Tổng số khách hàng đăng ký / thường ghé chi nhánh này">
          <StatusTag
            status="cyan"
            icon={<AppIcon icon={User} size={13} />}
            label={(record.customerCount || 0).toLocaleString('vi-VN')}
            className="px-2.5 py-0.5 font-semibold text-sm tabular-nums"
          />
        </Tooltip>
      ),
    },
    {
      title: 'Đơn hoàn tất',
      key: 'completedOrdersCount',
      width: 130,
      align: 'center',
      render: (_: unknown, record: CrmBranch) => (
        <Tooltip title="Tổng số đơn hàng đã hoàn tất tại chi nhánh">
          <StatusTag
            status="success"
            icon={<AppIcon icon={ShoppingBag} size={13} />}
            label={(record.completedOrdersCount || 0).toLocaleString('vi-VN')}
            className="px-2.5 py-0.5 font-semibold text-sm tabular-nums"
          />
        </Tooltip>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 120,
      align: 'center',
      render: (_: unknown, record: CrmBranch) => (
        <StatusTag
          status={record.isActive ? 'success' : 'default'}
          label={record.isActive ? 'Hoạt động' : 'Đã ẩn'}
          className="whitespace-nowrap"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'right',
      render: (_: unknown, record: CrmBranch) => (
        <Space size="middle">
          <Tooltip title="Xem chi tiết & danh sách nhân sự">
            <Button
              type="text"
              size="small"
              aria-label="Xem chi tiết chi nhánh"
              icon={<AppIcon icon={Eye} size="sm" className="text-blue-500" />}
              onClick={() => onOpenDetail(record, 'view')}
            />
          </Tooltip>

          <Tooltip title="Chỉnh sửa thông tin">
            <Button
              type="text"
              size="small"
              aria-label="Chỉnh sửa chi nhánh"
              icon={<AppIcon icon={Pencil} size="sm" className="text-amber-500" />}
              onClick={() => onOpenDetail(record, 'edit')}
            />
          </Tooltip>

          <Tooltip title={record.isActive ? 'Ngắt hoạt động chi nhánh' : 'Kích hoạt lại chi nhánh'}>
            <Popconfirm
              title={record.isActive ? 'Vô hiệu hóa chi nhánh này?' : 'Kích hoạt lại chi nhánh này?'}
              description={
                record.isActive
                  ? 'Chi nhánh bị ẩn sẽ không thể đặt lịch mới nhưng bảo toàn dữ liệu báo cáo cũ.'
                  : 'Chi nhánh sẽ xuất hiện trở lại trong danh sách đặt lịch.'
              }
              onConfirm={() => onToggleActive(record)}
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ danger: record.isActive }}
            >
              <Switch
                aria-label={record.isActive ? 'Ngắt hoạt động chi nhánh' : 'Kích hoạt lại chi nhánh'}
                size="small"
                checked={record.isActive}
                loading={loading}
                className={record.isActive ? 'bg-emerald-500' : ''}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];
}

export const BRANCH_STAFF_COLUMNS: ColumnsType<BranchStaffInfo> = [
  {
    title: 'Nhân viên',
    key: 'displayName',
    width: 200,
    render: (_: unknown, s: BranchStaffInfo) => (
      <Space>
        <Avatar src={s.avatarUrl} icon={<AppIcon icon={User} size={14} />} size="small" />
        <Text strong>{s.displayName}</Text>
      </Space>
    ),
  },
  {
    title: 'Vai trò',
    dataIndex: 'role',
    key: 'role',
    width: 140,
    render: (role: string) => <StatusTag status={role === 'Chuyên viên' ? 'purple' : 'processing'} label={role} />,
  },
  {
    title: 'Số điện thoại',
    dataIndex: 'phone',
    key: 'phone',
    width: 130,
    render: (phone: string | null) => <span className="tabular-nums whitespace-nowrap">{phone || '-'}</span>,
  },
  {
    title: 'Trạng thái',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 130,
    align: 'center',
    render: (active: boolean) => (
      <StatusTag
        status={active ? 'success' : 'default'}
        label={active ? 'Đang làm' : 'Đã nghỉ/khóa'}
        className="whitespace-nowrap"
      />
    ),
  },
];
