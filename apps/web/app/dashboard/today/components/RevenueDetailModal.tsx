import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Row, Col, Card } from 'antd';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';

import { ColumnsType } from 'antd/es/table';

interface RevenueDetailModalProps {
  themeMode: 'light' | 'dark';
  token: any;
  open: boolean;
  onClose: () => void;
  context: { hour?: string; branchKey?: string; branchName?: string; type?: string } | null;
  dateFrom: string;
  dateTo: string;
  openCustomerDrawer: (record: any) => void;
}

const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN').format(Math.round(value || 0)) + ' đ';

export const RevenueDetailModal: React.FC<RevenueDetailModalProps> = ({
  themeMode,
  token,
  open,
  onClose,
  context,
  dateFrom,
  dateTo,
  openCustomerDrawer,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (open && context) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await (apiClient as any).dashboard.getRevenueDetail({
            dateFrom,
            dateTo,
            hour: context.hour,
            branchKey: context.branchKey,
          });
          setData(res);
        } catch (error) {
          console.error('Failed to fetch detail', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      setData(null);
    }
  }, [open, context, dateFrom, dateTo]);

  const transactions = data?.transactions || [];
  const summary = data?.summary || { totalRevenue: 0, comboRevenue: 0, singleRevenue: 0, productRevenue: 0, aov: 0 };

  const columns: ColumnsType<any> = [
    {
      title: 'Thời gian',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      render: (val: string) => (val ? dayjs(val).format('HH:mm DD/MM') : '-'),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string, record: any) => (
        <a onClick={() => openCustomerDrawer(record)}>{text || 'Khách vãng lai'}</a>
      ),
    },
    { title: 'Dịch vụ', dataIndex: 'serviceName', key: 'serviceName' },
    {
      title: 'Loại',
      dataIndex: 'serviceType',
      key: 'serviceType',
      render: (type: string) => {
        let color = 'default';
        if (type === 'combo') color = 'green';
        if (type === 'single') color = 'blue';
        if (type === 'product') color = 'orange';
        return <Tag color={color}>{type?.toUpperCase() || 'SINGLE'}</Tag>;
      },
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (val: number) => <span className="tabular-nums font-medium">{formatVnd(val)}</span>,
    },
    { title: 'CC In', dataIndex: 'ccInName', key: 'ccInName', render: (val: string) => val || '-' },
    { title: 'CC Out', dataIndex: 'ccOutName', key: 'ccOutName', render: (val: string) => val || '-' },
    { title: 'CV', dataIndex: 'cvName', key: 'cvName', render: (val: string) => val || '-' },
    {
      title: 'Trạng thái',
      dataIndex: 'orderState',
      key: 'orderState',
      render: (st: string) => <Tag color="success">{st || 'Completed'}</Tag>,
    },
  ];

  let title = 'Chi tiết doanh thu';
  if (context?.hour) title += ` (${context.hour})`;
  if (context?.branchName) title += ` | Chi nhánh ${context.branchName}`;

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={1100} className="tabular-nums">
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small" style={{ background: themeMode === 'dark' ? '#141414' : '#fafafa' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>Tổng Doanh Thu</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#10b981' }}>
              {formatVnd(summary.totalRevenue)}
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ background: themeMode === 'dark' ? '#141414' : '#fafafa' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>Combo</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatVnd(summary.comboRevenue)}</div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ background: themeMode === 'dark' ? '#141414' : '#fafafa' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>Lẻ (Single)</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatVnd(summary.singleRevenue)}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ background: themeMode === 'dark' ? '#141414' : '#fafafa' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>Sản phẩm</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatVnd(summary.productRevenue)}</div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ background: themeMode === 'dark' ? '#141414' : '#fafafa' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>AOV Trung Bình</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{formatVnd(summary.aov)}</div>
          </Card>
        </Col>
      </Row>
      <Table
        dataSource={transactions}
        columns={columns}
        rowKey="orderId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4}>
              <strong style={{ float: 'right' }}>Tổng cộng ({transactions.length} đơn):</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <strong style={{ color: '#10b981' }}>{formatVnd(summary.totalRevenue)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} colSpan={4}></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Modal>
  );
};
