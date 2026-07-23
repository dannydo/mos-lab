'use client';

import React from 'react';
import { Space, Badge, Avatar, Typography, Tag, Switch, Tooltip, Popconfirm, Button } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  KeyOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Staff, Role } from '@mos-lab/shared';

const { Text } = Typography;

interface StaffColumnsOptions {
  roles: Role[];
  token: SafeAny;
  handleToggleActive: (record: Staff, checked: boolean) => void;
  handleImpersonate: (id: number, name: string) => void;
  openStaffDetails: (record: Staff) => void;
  openStaffModal: (record: Staff) => void;
  handleDeleteStaff: (id: number) => void;
  currentUser: SafeAny;
  onRoleClick?: (roleKey: string) => void;
}

export const getStaffColumns = ({
  roles,
  token,
  handleToggleActive,
  handleImpersonate,
  openStaffDetails,
  openStaffModal,
  handleDeleteStaff,
  currentUser,
  onRoleClick,
}: StaffColumnsOptions) => {
  const columns = [
    {
      title: 'Nhân viên',
      key: 'name',
      render: (_: SafeAny, record: Staff) => {
        const initials = record.displayName
          ? record.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : '??';
        const isOnline = !!(record.lastActiveAt && dayjs().diff(dayjs(record.lastActiveAt), 'minute') < 5);
        return (
          <Space>
            <Badge dot={isOnline} status="success" offset={[-2, 28]}>
              <Avatar
                src={record.avatarUrl || undefined}
                icon={!record.avatarUrl ? <UserOutlined /> : undefined}
                style={{
                  backgroundColor: token.colorPrimary,
                  color: '#000',
                  fontWeight: '600',
                }}
              >
                {initials}
              </Avatar>
            </Badge>
            <div>
              <Text style={{ fontWeight: 600, display: 'block', color: token.colorText }}>{record.displayName}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.username}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (roleKey: string) => {
        const matched = roles.find((r) => r.key === roleKey);
        return (
          <Tag
            color={matched?.color || 'default'}
            style={{ fontWeight: '500', borderRadius: '4px', cursor: onRoleClick ? 'pointer' : 'default' }}
            onClick={() => onRoleClick?.(roleKey)}
          >
            {matched?.name || roleKey}
          </Tag>
        );
      },
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: SafeAny, record: Staff) => (
        <div style={{ fontSize: '13px' }}>
          {record.phone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneOutlined style={{ color: '#888' }} />
              <Text>{record.phone}</Text>
            </div>
          ) : null}
          {record.email ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: record.phone ? '4px' : '0' }}>
              <MailOutlined style={{ color: '#888' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.email}
              </Text>
            </div>
          ) : record.phone ? null : (
            <Text type="secondary" italic style={{ fontSize: '12px' }}>
              Chưa cập nhật
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Ngày vào làm',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date: string, record: Staff) =>
        date ? (
          <div>
            <Text style={{ display: 'block', color: token.colorText, fontSize: '13px', fontWeight: '500' }}>
              {dayjs(date).format('DD/MM/YYYY')}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px', display: 'block', fontVariantNumeric: 'tabular-nums' }}>
              {(() => {
                const offset = record.seniorityOffset || 0;
                const start = dayjs(date);
                const now = dayjs();
                const totalMonths = now.diff(start, 'month') + offset;
                if (totalMonths <= 0) {
                  const diffDays = now.diff(start, 'day');
                  return `${diffDays} ngày`;
                }
                const years = Math.floor(totalMonths / 12);
                const months = totalMonths % 12;
                return years > 0 ? `${years} năm ${months} th` : `${months} tháng`;
              })()}
            </Text>
          </div>
        ) : (
          <Text type="secondary" italic style={{ fontSize: '12px' }}>
            Chưa thiết lập
          </Text>
        ),
    },
    {
      title: 'Đăng nhập cuối',
      key: 'lastLogin',
      render: (_: SafeAny, record: Staff) => {
        if (!record.lastLoginAt) {
          return (
            <Text type="secondary" italic style={{ fontSize: '12px' }}>
              Chưa đăng nhập
            </Text>
          );
        }

        const lastLogin = dayjs(record.lastLoginAt);
        const now = dayjs();

        let lastLoginStr = '';
        if (lastLogin.isSame(now, 'day')) {
          lastLoginStr = `Hôm nay ${lastLogin.format('HH:mm')}`;
        } else if (lastLogin.isSame(now.subtract(1, 'day'), 'day')) {
          lastLoginStr = `Hôm qua ${lastLogin.format('HH:mm')}`;
        } else {
          lastLoginStr = lastLogin.format('DD/MM/YYYY HH:mm');
        }

        return <Text style={{ fontSize: '13px', fontWeight: '500', color: token.colorText }}>{lastLoginStr}</Text>;
      },
    },
    {
      title: 'Lần cuối online',
      key: 'lastActive',
      render: (_: SafeAny, record: Staff) => {
        if (!record.lastActiveAt) {
          return (
            <Text type="secondary" italic style={{ fontSize: '12px' }}>
              Chưa hoạt động
            </Text>
          );
        }

        const lastActive = dayjs(record.lastActiveAt);
        const now = dayjs();
        const diffMin = now.diff(lastActive, 'minute');
        const isOnline = diffMin < 5;

        if (isOnline) {
          return (
            <Tag color="success" style={{ fontSize: '12px', fontWeight: '500', borderRadius: '4px' }}>
              Đang online
            </Tag>
          );
        }

        let activeStatusText = '';
        if (diffMin < 60) {
          activeStatusText = `${diffMin} phút trước`;
        } else {
          const diffHr = now.diff(lastActive, 'hour');
          if (diffHr < 24) {
            activeStatusText = `${diffHr} giờ trước`;
          } else {
            const diffDay = now.diff(lastActive, 'day');
            activeStatusText = `${diffDay} ngày trước`;
          }
        }

        return <Text style={{ fontSize: '13px', color: token.colorTextDescription }}>{activeStatusText}</Text>;
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_: SafeAny, record: Staff) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
          <Switch checked={record.isActive} onChange={(checked) => handleToggleActive(record, checked)} size="small" />
          <Badge status={record.isActive ? 'success' : 'default'} text={record.isActive ? 'Active' : 'Locked'} />
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      render: (_: SafeAny, record: Staff) => {
        const isAdmin = currentUser?.role === 'admin';
        const isTargetAdmin = record.role === 'admin';
        const canImpersonate = isAdmin && !isTargetAdmin && record.isActive;

        return (
          <Space size="middle">
            {!record.isActive && (
              <Tooltip title={`Mở khóa tài khoản ${record.displayName}`}>
                <Button
                  type="text"
                  icon={<UnlockOutlined style={{ color: '#10b981', fontSize: '16px' }} />}
                  onClick={() => handleToggleActive(record, true)}
                />
              </Tooltip>
            )}
            {canImpersonate && (
              <Tooltip title={`Đăng nhập dưới quyền ${record.displayName}`}>
                <Button
                  type="text"
                  icon={<KeyOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleImpersonate(record.id, record.displayName)}
                />
              </Tooltip>
            )}
            <Tooltip title="Xem thông tin chi tiết">
              <Button
                type="text"
                icon={<EyeOutlined style={{ color: '#D4A84B' }} />}
                onClick={() => openStaffDetails(record)}
              />
            </Tooltip>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: '#1890ff' }} />}
                onClick={() => openStaffModal(record)}
              />
            </Tooltip>
            <Tooltip title="Xóa nhân viên">
              <Popconfirm
                title="Xóa nhân viên"
                description={`Bạn có chắc chắn muốn xóa nhân viên "${record.displayName}"?`}
                onConfirm={() => handleDeleteStaff(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  if (currentUser?.role === 'admin') {
    columns.splice(4, 0, {
      title: 'Lương & Đãi ngộ',
      key: 'salary',
      render: (_: SafeAny, record: Staff) => (
        <div style={{ fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Cứng:{' '}
            </Text>
            <Text className="tabular-nums" style={{ fontWeight: 500, color: token.colorText }}>
              {record.baseSalary !== undefined && record.baseSalary !== null
                ? `${Math.round(record.baseSalary).toLocaleString('vi-VN')} đ`
                : '—'}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Giờ:{' '}
            </Text>
            <Text className="tabular-nums" style={{ fontWeight: 500, color: token.colorText }}>
              {record.hourlyWage !== undefined && record.hourlyWage !== null
                ? `${Math.round(record.hourlyWage).toLocaleString('vi-VN')} đ/h`
                : '—'}
            </Text>
          </div>
        </div>
      ),
    });
  }

  return columns;
};

interface RoleColumnsOptions {
  themeMode: 'light' | 'dark';
  openRoleModal: (record: Role) => void;
  handleDeleteRole: (key: string) => void;
}

export const getRoleColumns = ({ themeMode, openRoleModal, handleDeleteRole }: RoleColumnsOptions) => {
  return [
    {
      title: 'Vai trò',
      key: 'role',
      render: (_: SafeAny, record: Role) => (
        <Space>
          <Tag color={record.color} style={{ fontWeight: '600', padding: '4px 8px', borderRadius: '4px' }}>
            {record.name}
          </Tag>
          {record.isSystem && (
            <Tooltip title="Vai trò mặc định của hệ thống, không thể xóa">
              <Badge status="processing" text="Hệ thống" style={{ fontSize: '11px', color: '#888' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Mã (Key)',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => (
        <code
          style={{
            fontSize: '12px',
            background: themeMode === 'dark' ? '#222' : '#f5f5f5',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {key}
        </code>
      ),
    },
    {
      title: 'Quyền hạn (Permissions)',
      key: 'permissions',
      render: (_: SafeAny, record: Role) => (
        <Space wrap size={[4, 8]}>
          {record.viewKPI && (
            <Tag color="blue" bordered={false}>
              Xem KPI cá nhân
            </Tag>
          )}
          {record.viewTeamKPI && (
            <Tag color="purple" bordered={false}>
              Xem KPI nhóm
            </Tag>
          )}
          {record.manageStaff && (
            <Tag color="red" bordered={false}>
              Quản lý nhân sự
            </Tag>
          )}
          {!record.viewKPI && !record.viewTeamKPI && !record.manageStaff && (
            <Text type="secondary" italic style={{ fontSize: '12px' }}>
              Không có quyền đặc biệt
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) =>
        desc || (
          <Text type="secondary" italic style={{ fontSize: '12px' }}>
            Không có mô tả
          </Text>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: SafeAny, record: Role) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa vai trò & quyền">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => openRoleModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.isSystem ? 'Không thể xóa vai trò mặc định của hệ thống' : 'Xóa vai trò'}>
            <Popconfirm
              title="Xóa vai trò"
              description={`Bạn có chắc chắn muốn xóa vai trò "${record.name}"?`}
              onConfirm={() => handleDeleteRole(record.key)}
              disabled={record.isSystem}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger disabled={record.isSystem} icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];
};
