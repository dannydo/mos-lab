'use client';

import React from 'react';
import { Modal, Tag, Spin, Row, Col, Card, Statistic, Table } from 'antd';
import { TrophyOutlined, CalendarOutlined } from '@ant-design/icons';
import { CcPaystubRecord, SafeAny } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';

export interface CcXoayDetailModalProps {
  open: boolean;
  onCancel: () => void;
  record: CcPaystubRecord | null;
  loading: boolean;
  summary: {
    totalCheckins: number;
    totalPoints: number;
    totalBonus: number;
  };
  logs: SafeAny[];
  isDark?: boolean;
}

export default function CcXoayDetailModal({
  open,
  onCancel,
  record,
  loading,
  summary,
  logs,
  isDark,
}: CcXoayDetailModalProps) {
  if (!record) return null;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={1000}
      style={{ top: 30 }}
      title={
        <div className="flex items-center gap-2 pr-6 select-none">
          <TrophyOutlined className="text-purple-500 text-xl" />
          <span className="font-bold text-lg">Báo Cáo Chi Tiết Ca Check-in Xoay - CC: {record.displayName}</span>
          <Tag color={record.store === 'PXL' ? 'blue' : 'purple'}>CN: {record.store}</Tag>
        </div>
      }
      footer={null}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <Row gutter={[12, 12]} className="my-4">
            <Col span={8}>
              <Card size="small" variant="outlined">
                <Statistic
                  title="∑ Lượt Check-in"
                  value={summary.totalCheckins}
                  suffix="lượt"
                  valueStyle={{
                    fontSize: '15px',
                    color: isDark ? '#c084fc' : '#722ed1',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  prefix={<CalendarOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" variant="outlined">
                <Statistic
                  title="∑ Điểm Tích Lũy"
                  value={summary.totalPoints}
                  suffix="pts"
                  valueStyle={{
                    fontSize: '15px',
                    color: isDark ? '#60a5fa' : '#1890ff',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" variant="outlined" style={{ borderColor: isDark ? '#c084fc' : '#722ed1' }}>
                <Statistic
                  title="∑ Thưởng CC Xoay"
                  value={summary.totalBonus}
                  suffix="đ"
                  precision={0}
                  valueStyle={{
                    fontSize: '15px',
                    color: isDark ? '#c084fc' : '#722ed1',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 'bold',
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Table
            dataSource={logs}
            rowKey={(r) => `${r.serviceId || r.checkin}-${r.consultantId || ''}`}
            bordered
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            size="small"
            className="antd-custom-table"
            columns={[
              {
                title: 'Check-in Time',
                dataIndex: 'checkin',
                key: 'checkin',
                width: 140,
                render: (val: string) => <span className="tabular-nums font-mono text-xs">{val}</span>,
              },
              {
                title: 'Khách Hàng',
                dataIndex: 'clientName',
                key: 'clientName',
                width: 150,
                render: (val: string) => (
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{val || 'Khách Vãng Lai'}</span>
                ),
              },
              {
                title: 'Dịch Vụ',
                dataIndex: 'serviceName',
                key: 'serviceName',
                render: (val: string) => (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{val}</span>
                ),
              },
              {
                title: 'Level CC',
                dataIndex: 'consultantLevel',
                key: 'consultantLevel',
                width: 90,
                align: 'center' as const,
                render: (val: number) => (
                  <Tag color="gold" className="font-bold">
                    Lv.{val || 1}
                  </Tag>
                ),
              },
              {
                title: 'Điểm (+pts)',
                dataIndex: 'consultantPoints',
                key: 'consultantPoints',
                width: 100,
                align: 'right' as const,
                render: (val: number) => (
                  <span className="tabular-nums font-semibold text-blue-500">+{val || 0} pts</span>
                ),
              },
              {
                title: 'Thưởng CC Xoay',
                dataIndex: 'consultantBonus',
                key: 'consultantBonus',
                width: 140,
                align: 'right' as const,
                render: (val: number) => (
                  <span className="tabular-nums whitespace-nowrap font-bold text-purple-600 dark:text-purple-400">
                    +{formatVND(val)}
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
