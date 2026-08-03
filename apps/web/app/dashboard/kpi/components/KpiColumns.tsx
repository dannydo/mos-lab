'use client';

import React from 'react';
import { Space, Typography, Progress } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { LeaderboardEntry } from '@mos-lab/shared';

import { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface KpiColumnsOptions {
  selectedRole: 'telesales' | 'oc';
  token: SafeAny;
  handleShowAppointments: (staffId: number, displayName: string) => void;
  getPercent: (value: number, total: number) => number;
}

export const getLeaderboardColumns = ({
  selectedRole,
  token,
  handleShowAppointments,
  getPercent,
}: KpiColumnsOptions): ColumnsType<LeaderboardEntry> => {
  return selectedRole === 'oc'
    ? [
        {
          title: 'Client Consultant',
          key: 'name',
          render: (record: LeaderboardEntry) => (
            <Space>
              <UserOutlined style={{ color: '#722ED1' }} />
              <span style={{ fontWeight: '600', color: token.colorText }}>{record.displayName}</span>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ({record.username})
              </Text>
            </Space>
          ),
        },
        {
          title: 'Số lần check-in',
          dataIndex: 'totalCheckin',
          key: 'totalCheckin',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalCheckin - b.totalCheckin,
          render: (val: number) => <span style={{ fontWeight: '600', color: token.colorText }}>{val}</span>,
        },
        {
          title: 'Tổng số phút trễ',
          key: 'checkinLateMin',
          render: (record: LeaderboardEntry) => {
            const mins = record.salary?.checkinLateMin || 0;
            return (
              <span style={{ color: mins < 0 ? '#FF4D4F' : token.colorText }}>
                {mins < 0 ? `${Math.abs(mins)} phút` : 'Đúng giờ'}
              </span>
            );
          },
        },
        {
          title: 'Lương cứng',
          key: 'baseSalary',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.baseSalary || 0) - (b.salary?.baseSalary || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.baseSalary || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng doanh số',
          key: 'salesReward',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.salesReward || 0) - (b.salary?.salesReward || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.salesReward || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng phục vụ',
          key: 'servicingReward',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.servicingReward || 0) - (b.salary?.servicingReward || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.servicingReward || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng tăng trưởng',
          key: 'growthReward',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.growthReward || 0) - (b.salary?.growthReward || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.growthReward || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng phục vụ CH',
          key: 'storeServicingReward',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.storeServicingReward || 0) - (b.salary?.storeServicingReward || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.storeServicingReward || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thu nhập Client Consultant',
          key: 'totalEarnings',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalEarnings - b.totalEarnings,
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums" style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px' }}>
              {(record.totalEarnings || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
      ]
    : [
        {
          title: 'Online Consultant (Booker)',
          key: 'name',
          render: (record: LeaderboardEntry) => (
            <Space>
              <UserOutlined style={{ color: token.colorPrimary }} />
              <span
                style={{
                  fontWeight: '600',
                  color: token.colorPrimary,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => handleShowAppointments(record.staffId, record.displayName)}
              >
                {record.displayName}
              </span>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ({record.username})
              </Text>
            </Space>
          ),
        },
        {
          title: 'Kế hoạch',
          dataIndex: 'totalPlanned',
          key: 'totalPlanned',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalPlanned - b.totalPlanned,
        },
        {
          title: 'Đã gọi',
          key: 'totalCalled',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalCalled - b.totalCalled,
          render: (record: LeaderboardEntry) => (
            <span>
              {record.totalCalled}{' '}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ({getPercent(record.totalCalled, record.totalPlanned)}%)
              </Text>
            </span>
          ),
        },
        {
          title: 'Đặt lịch (Booked)',
          key: 'bookingRate',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalBooked - b.totalBooked,
          render: (record: LeaderboardEntry) => (
            <span>
              <b style={{ color: token.colorPrimary }}>{record.totalBooked}</b>
              <Progress
                percent={record.bookingRate}
                size="small"
                strokeColor={token.colorPrimary}
                style={{ width: '80px', marginLeft: '8px' }}
              />
            </span>
          ),
        },
        {
          title: 'Đến tiệm (Checkin)',
          key: 'checkinRate',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalCheckin - b.totalCheckin,
          render: (record: LeaderboardEntry) => (
            <span>
              <b style={{ color: '#722ED1' }}>{record.totalCheckin}</b>
              <Progress
                percent={record.checkinRate}
                size="small"
                strokeColor="#722ED1"
                style={{ width: '80px', marginLeft: '8px' }}
              />
            </span>
          ),
        },
        {
          title: 'Lương cứng',
          key: 'baseSalary',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.baseSalary || 0) - (b.salary?.baseSalary || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.baseSalary || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng check-in',
          key: 'clientBonus',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.clientBonus || 0) - (b.salary?.clientBonus || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.clientBonus || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng mốc DONE',
          key: 'doneBonus',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.doneBonus || 0) - (b.salary?.doneBonus || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.doneBonus || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng/Phạt lỡ',
          key: 'missedBonus',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) =>
            (a.salary?.missedBonus || 0) - (b.salary?.missedBonus || 0),
          render: (record: LeaderboardEntry) => {
            const val = record.salary?.missedBonus || 0;
            return (
              <span className="tabular-nums" style={{ color: val < 0 ? '#FF4D4F' : token.colorText }}>
                {val >= 0 ? '+' : ''}
                {val.toLocaleString('vi-VN')} đ
              </span>
            );
          },
        },
        {
          title: 'Thưởng tips (7%)',
          key: 'tipBonus',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.tipBonus || 0) - (b.salary?.tipBonus || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.tipBonus || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thưởng doanh thu',
          key: 'revBonus',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => (a.salary?.revBonus || 0) - (b.salary?.revBonus || 0),
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums">{(record.salary?.revBonus || 0).toLocaleString('vi-VN')} đ</span>
          ),
        },
        {
          title: 'Thu nhập Online Consultant',
          key: 'totalEarnings',
          align: 'right',
          sorter: (a: LeaderboardEntry, b: LeaderboardEntry) => a.totalEarnings - b.totalEarnings,
          render: (record: LeaderboardEntry) => (
            <span className="tabular-nums" style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px' }}>
              {(record.totalEarnings || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
      ];
};
