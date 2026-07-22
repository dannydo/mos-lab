'use client';

import React from 'react';
import { Row, Col, Table, Space, Tag, Badge, Typography } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import { ShopCCData, ShopCVData } from '../hooks/useTodayData';
import { SectionCard, StatusTag } from '../../../../components/ui';

const { Text } = Typography;

interface TodayStaffAttendanceProps {
  themeMode?: 'light' | 'dark';
  token: SafeAny;
  ccList: ShopCCData[];
  cvList: ShopCVData[];
}

const TodayStaffAttendance = React.memo(function TodayStaffAttendance({
  token,
  ccList,
  cvList,
}: TodayStaffAttendanceProps) {
  const renderShiftAndAttendance = (
    shift: 'sáng' | 'chiều' | 'full' | 'off',
    attendance: 'none' | 'checked_in' | 'checked_out' | 'late'
  ) => {
    if (shift === 'off') {
      return (
        <span style={{ cursor: 'help' }}>
          <Space size={6}>
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#bfbfbf',
                verticalAlign: 'middle',
              }}
            />
            <span style={{ fontSize: '12px', color: '#bfbfbf', fontWeight: 500 }}>Off</span>
          </Space>
        </span>
      );
    }

    let shiftText = '';
    if (shift === 'sáng') shiftText = 'Sáng';
    else if (shift === 'chiều') shiftText = 'Chiều';
    else if (shift === 'full') shiftText = 'Full';

    let attText = '';
    let dotColor = '#bfbfbf';
    if (attendance === 'checked_in') {
      attText = 'Đã check-in';
      dotColor = '#52c41a'; // Green
    } else if (attendance === 'checked_out') {
      attText = 'Đã check-out';
      dotColor = '#8c8c8c'; // Gray
    } else if (attendance === 'late') {
      attText = 'Đi trễ';
      dotColor = '#ff4d4f'; // Red
    } else {
      attText = 'Chưa check-in';
      dotColor = '#faad14'; // Orange/Amber
    }

    return (
      <span style={{ cursor: 'help' }} title={attText}>
        <Space size={6}>
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: dotColor,
              verticalAlign: 'middle',
            }}
          />
          <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>{shiftText}</span>
        </Space>
      </span>
    );
  };

  return (
    <Row gutter={[24, 24]}>
      {/* CV list */}
      <Col xs={24} xl={12}>
        <SectionCard
          title={
            <Space>
              <UserOutlined style={{ color: '#D4A84B' }} />
              <span className="text-sm font-bold">
                [CV] Chuyên viên đang làm gì? Bao nhiêu khách?
              </span>
            </Space>
          }
          bodyPadding={0}
        >
          <Table
            dataSource={cvList}
            rowKey="name"
            rowClassName={(record) =>
              record.shift === 'off' || record.attendance === 'checked_out' ? 'opacity-40 pointer-events-none' : ''
            }
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Ca',
                key: 'shift_attendance',
                render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance),
              },
              {
                title: 'Tên CV',
                dataIndex: 'name',
                key: 'name',
                render: (t) => <strong>{t}</strong>,
              },
              {
                title: 'Chi nhánh',
                dataIndex: 'branchName',
                key: 'branchName',
                render: (b: string) => (
                  <StatusTag status="cyan" label={b} />
                ),
              },
              {
                title: 'Đang làm gì?',
                dataIndex: 'doing',
                key: 'doing',
                render: (doing, rec) => <Badge status={rec.status === 'busy' ? 'warning' : 'success'} text={doing} />,
              },
              {
                title: 'Khách hôm nay',
                dataIndex: 'clients',
                key: 'clients',
                align: 'center',
                render: (n) => <strong className="tabular-nums text-xs">{n} khách</strong>,
              },
            ]}
            className="antd-custom-table"
          />
        </SectionCard>
      </Col>

      {/* CC list */}
      <Col xs={24} xl={12}>
        <SectionCard
          title={
            <Space>
              <TeamOutlined style={{ color: '#D4A84B' }} />
              <span className="text-sm font-bold">
                [CC] Client Consultant đang làm gì? Bao nhiêu khách?
              </span>
            </Space>
          }
          bodyPadding={0}
        >
          <Table
            dataSource={ccList}
            rowKey="name"
            rowClassName={(record) =>
              record.shift === 'off' || record.attendance === 'checked_out' ? 'opacity-40 pointer-events-none' : ''
            }
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Ca',
                key: 'shift_attendance',
                render: (_, rec) => renderShiftAndAttendance(rec.shift, rec.attendance),
              },
              {
                title: 'Tên CC',
                dataIndex: 'name',
                key: 'name',
                render: (t) => <strong>{t}</strong>,
              },
              {
                title: 'Chi nhánh',
                dataIndex: 'branchName',
                key: 'branchName',
                render: (b: string) => (
                  <Tag color="cyan" style={{ fontWeight: 'bold' }}>
                    {b}
                  </Tag>
                ),
              },
              {
                title: 'Đang làm gì?',
                dataIndex: 'doing',
                key: 'doing',
                render: (doing) => <Text type="secondary">{doing}</Text>,
              },
              {
                title: 'Khách hôm nay',
                dataIndex: 'clients',
                key: 'clients',
                align: 'center',
                render: (n) => <strong>{n} khách</strong>,
              },
              {
                title: 'Combo bán được',
                dataIndex: 'combos',
                key: 'combos',
                align: 'center',
                render: (n) => <Tag color="success">{n} Combo</Tag>,
              },
              {
                title: '$ Combo',
                dataIndex: 'revCombo',
                key: 'revCombo',
                align: 'right',
                render: (r: number) => <span style={{ color: '#D4A84B' }}>{(r || 0).toLocaleString('vi-VN')} đ</span>,
              },
              {
                title: '$ Single',
                dataIndex: 'revLe',
                key: 'revLe',
                align: 'right',
                render: (r: number) => (
                  <span style={{ color: token.colorTextDescription }}>{(r || 0).toLocaleString('vi-VN')} đ</span>
                ),
              },
              {
                title: '$ Product',
                dataIndex: 'revProduct',
                key: 'revProduct',
                align: 'right',
                render: (r: number) => <span style={{ color: '#52c41a' }}>{(r || 0).toLocaleString('vi-VN')} đ</span>,
              },
              {
                title: 'Doanh số ngày',
                dataIndex: 'revenue',
                key: 'revenue',
                align: 'right',
                render: (r: number) => (
                  <strong style={{ color: '#1890ff' }}>{(r || 0).toLocaleString('vi-VN')} đ</strong>
                ),
              },
            ]}
            className="antd-custom-table"
          />
        </SectionCard>
      </Col>
    </Row>
  );
});

export default TodayStaffAttendance;
