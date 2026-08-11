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

const TodayStaffAttendance = React.memo(
  function TodayStaffAttendance({ token, ccList, cvList }: TodayStaffAttendanceProps) {
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

    const cvColumns = React.useMemo(
      () => [
        {
          title: 'STT',
          key: 'stt',
          width: 50,
          align: 'center' as const,
          render: (_: SafeAny, __: ShopCVData, idx: number) => (
            <span className="tabular-nums font-mono text-xs text-slate-400 font-semibold">#{idx + 1}</span>
          ),
        },
        {
          title: 'Ca',
          key: 'shift_attendance',
          render: (_: SafeAny, rec: ShopCVData) => renderShiftAndAttendance(rec.shift, rec.attendance),
        },
        {
          title: 'Tên CV',
          dataIndex: 'name',
          key: 'name',
          render: (t: string) => <strong>{t}</strong>,
        },
        {
          title: 'Chi nhánh',
          dataIndex: 'branchName',
          key: 'branchName',
          render: (b: string) => <StatusTag status="cyan" label={b || 'Đề Thám'} />,
        },
        {
          title: 'Đang làm gì?',
          dataIndex: 'doing',
          key: 'doing',
          render: (doing: string, rec: ShopCVData) => {
            if (rec.isOff || rec.shift === 'off') {
              const text = doing || rec.offReason || 'Nghỉ phép';
              const tagColor = text.includes('OFF Gấp') ? 'error' : text.includes('OFF Tuần') ? 'default' : 'volcano';
              return (
                <Tag color={tagColor} style={{ fontWeight: 500 }}>
                  {text}
                </Tag>
              );
            }
            if (rec.attendance === 'checked_out') {
              return <Tag color="default">{doing || 'Đã về'}</Tag>;
            }
            return <Badge status={rec.status === 'busy' ? 'warning' : 'success'} text={doing} />;
          },
        },
        {
          title: 'Khách hôm nay',
          dataIndex: 'clients',
          key: 'clients',
          align: 'center' as const,
          render: (_: number, rec: ShopCVData) => {
            const booked = rec.bookedCount ?? rec.clients ?? 0;
            const done = rec.doneCount ?? 0;
            if (rec.isOff || rec.shift === 'off') {
              return <span className="text-slate-400 text-xs font-mono">-</span>;
            }
            return (
              <span className="tabular-nums font-mono text-xs inline-flex items-center gap-1">
                <Tag color="success" style={{ margin: 0, padding: '0 4px', fontSize: '11px' }}>
                  {done} Done
                </Tag>
                <Tag color="processing" style={{ margin: 0, padding: '0 4px', fontSize: '11px' }}>
                  {booked} Book
                </Tag>
              </span>
            );
          },
        },
      ],
      []
    );

    const ccColumns = React.useMemo(
      () => [
        {
          title: 'STT',
          key: 'stt',
          width: 50,
          align: 'center' as const,
          render: (_: SafeAny, __: ShopCCData, idx: number) => (
            <span className="tabular-nums font-mono text-xs text-slate-400 font-semibold">#{idx + 1}</span>
          ),
        },
        {
          title: 'Ca',
          key: 'shift_attendance',
          render: (_: SafeAny, rec: ShopCCData) => renderShiftAndAttendance(rec.shift, rec.attendance),
        },
        {
          title: 'Tên CC',
          dataIndex: 'name',
          key: 'name',
          render: (t: string) => <strong>{t}</strong>,
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
          render: (doing: string) => <Text type="secondary">{doing}</Text>,
        },
        {
          title: 'Khách hôm nay',
          dataIndex: 'clients',
          key: 'clients',
          align: 'center' as const,
          render: (n: number) => <strong className="tabular-nums font-mono">{n} khách</strong>,
        },
        {
          title: 'Combo bán được',
          dataIndex: 'combos',
          key: 'combos',
          align: 'center' as const,
          render: (n: number) => (
            <Tag color="success" className="tabular-nums font-mono">
              {n} Combo
            </Tag>
          ),
        },
        {
          title: '$ Combo',
          dataIndex: 'revCombo',
          key: 'revCombo',
          align: 'right' as const,
          render: (r: number) => (
            <span className="tabular-nums font-mono" style={{ color: '#D4A84B' }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
        {
          title: '$ Single',
          dataIndex: 'revLe',
          key: 'revLe',
          align: 'right' as const,
          render: (r: number) => (
            <span className="tabular-nums font-mono" style={{ color: token.colorTextDescription }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
        {
          title: '$ Product',
          dataIndex: 'revProduct',
          key: 'revProduct',
          align: 'right' as const,
          render: (r: number) => (
            <span className="tabular-nums font-mono" style={{ color: '#52c41a' }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </span>
          ),
        },
        {
          title: 'Doanh số ngày',
          dataIndex: 'revenue',
          key: 'revenue',
          align: 'right' as const,
          render: (r: number) => (
            <strong className="tabular-nums font-mono" style={{ color: '#1890ff' }}>
              {(r || 0).toLocaleString('vi-VN')} đ
            </strong>
          ),
        },
      ],
      [token.colorTextDescription]
    );

    return (
      <Row gutter={[24, 24]}>
        {/* CV list */}
        <Col xs={24} xl={12}>
          <SectionCard
            title={
              <Space>
                <UserOutlined style={{ color: '#D4A84B' }} />
                <span className="text-sm font-bold">[CV] Chuyên viên đang làm gì? Bao nhiêu khách?</span>
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
              columns={cvColumns}
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
                <span className="text-sm font-bold">[CC] Client Consultant đang làm gì? Bao nhiêu khách?</span>
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
              columns={ccColumns}
              className="antd-custom-table"
            />
          </SectionCard>
        </Col>
      </Row>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.ccList === nextProps.ccList && prevProps.cvList === nextProps.cvList;
  }
);

export default TodayStaffAttendance;
