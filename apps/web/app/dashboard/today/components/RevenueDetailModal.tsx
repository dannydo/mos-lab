import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Row, Col, Card, Button, Space } from 'antd';
import { PlusCircle, Gift, ShoppingBag, RotateCcw } from 'lucide-react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { useTodaySandbox } from '../context/SandboxModeContext';

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
  const sandbox = useTodaySandbox();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (open && context) {
      if (sandbox.isSandbox) {
        const baseTransactions = [
          {
            orderId: 9001,
            checkinTime: dayjs().set('hour', 14).set('minute', 15).toISOString(),
            customerName: 'Chị Minh Anh',
            serviceName: 'Combo 10 Tặng 6 (Mi Thiết Kế VIP)',
            serviceType: 'combo',
            price: 2_500_000,
            ccInName: 'CC Thảo My',
            ccOutName: 'CC Thảo My',
            cvName: 'CV Lan Anh',
            orderState: 'Completed',
          },
          {
            orderId: 9002,
            checkinTime: dayjs().set('hour', 14).set('minute', 30).toISOString(),
            customerName: 'Chị Bích Ngọc',
            serviceName: 'Nối Mi Classic Thiết Kế (60p)',
            serviceType: 'single',
            price: 450_000,
            ccInName: 'CC Thảo My',
            ccOutName: 'CC Thảo My',
            cvName: 'CV Mai Phương',
            orderState: 'Completed',
          },
          {
            orderId: 9003,
            checkinTime: dayjs().set('hour', 14).set('minute', 45).toISOString(),
            customerName: 'Chị Hoàng Yến',
            serviceName: 'Uốn Mi Collagen Lash Lift',
            serviceType: 'single',
            price: 350_000,
            ccInName: 'CC Diệu Nhi',
            ccOutName: 'CC Diệu Nhi',
            cvName: 'CV Thu Thảo',
            orderState: 'Completed',
          },
          {
            orderId: 9004,
            checkinTime: dayjs().set('hour', 15).set('minute', 0).toISOString(),
            customerName: 'Chị Phương Uyên',
            serviceName: 'Dặm Mi Volume 5D',
            serviceType: 'single',
            price: 550_000,
            ccInName: 'CC Thảo My',
            ccOutName: 'CC Thảo My',
            cvName: 'CV Lan Anh',
            orderState: 'Completed',
          },
        ];

        const simComboRows = sandbox.simulatedCombos.map((item, idx) => ({
          orderId: 9100 + idx,
          checkinTime: dayjs().toISOString(),
          customerName: `${item.customerName} [Mô phỏng]`,
          serviceName: item.name,
          serviceType: 'combo',
          price: item.price,
          ccInName: item.ccName,
          ccOutName: item.ccName,
          cvName: item.cvName,
          orderState: 'Completed',
        }));

        const simProdRows = sandbox.simulatedProducts.map((p, idx) => ({
          orderId: 9200 + idx,
          checkinTime: dayjs().toISOString(),
          customerName: `${p.customerName} [Sản phẩm]`,
          serviceName: p.name,
          serviceType: 'product',
          price: p.price,
          ccInName: 'CC Thảo My',
          ccOutName: 'CC Thảo My',
          cvName: 'CV Lan Anh',
          orderState: 'Completed',
        }));

        const simGiftRows = sandbox.simulatedGifts.map((g, idx) => ({
          orderId: 9300 + idx,
          checkinTime: dayjs().toISOString(),
          customerName: `${g.customerName} [Quà tặng]`,
          serviceName: `${g.name} (Trị giá ${g.estimatedValue.toLocaleString('vi-VN')} đ)`,
          serviceType: 'gift',
          price: 0,
          ccInName: 'CC Thảo My',
          ccOutName: 'CC Thảo My',
          cvName: 'CV Lan Anh',
          orderState: 'Completed',
        }));

        const combinedTransactions = [
          ...simComboRows,
          ...simProdRows,
          ...simGiftRows,
          ...baseTransactions,
        ];

        const comboRevenue = combinedTransactions
          .filter((t) => t.serviceType === 'combo')
          .reduce((sum, t) => sum + t.price, 0);
        const singleRevenue = combinedTransactions
          .filter((t) => t.serviceType === 'single')
          .reduce((sum, t) => sum + t.price, 0);
        const productRevenue = combinedTransactions
          .filter((t) => t.serviceType === 'product')
          .reduce((sum, t) => sum + t.price, 0);
        const totalRevenue = comboRevenue + singleRevenue + productRevenue;
        const paidCount = combinedTransactions.filter((t) => t.price > 0).length || 1;
        const aov = Math.round(totalRevenue / paidCount);

        setData({
          transactions: combinedTransactions,
          summary: {
            totalRevenue,
            comboRevenue,
            singleRevenue,
            productRevenue,
            aov,
          },
        });
        setLoading(false);
        return;
      }

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
  }, [
    open,
    context,
    dateFrom,
    dateTo,
    sandbox.isSandbox,
    sandbox.mode,
    sandbox.simulatedCombos,
    sandbox.simulatedProducts,
    sandbox.simulatedGifts,
  ]);

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
        if (type === 'gift') return <Tag color="magenta">QUÀ TẶNG (0đ)</Tag>;
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
      {sandbox.isSandbox && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 mb-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag color="gold" className="font-semibold">
              💎 Giả Lập Bán Hàng & Chốt Gói (Sales Simulation)
            </Tag>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Bấm để thử nghiệm kịch bản chốt combo, quà tặng và tính toán lại AOV/Doanh thu ngay lập tức.
            </span>
          </div>
          <Space size={6} wrap>
            <Button
              size="small"
              type="primary"
              className="bg-amber-600 border-amber-600 hover:bg-amber-700"
              icon={<PlusCircle className="w-3.5 h-3.5 inline-block mr-1" />}
              onClick={() =>
                sandbox.simulateAddCombo({
                  name: 'Combo 10 Tặng 6 (Mi VIP)',
                  price: 2_500_000,
                })
              }
              aria-label="Giả lập chốt Combo 10 tặng 6"
            >
              + Chốt Combo 10 tặng 6
            </Button>
            <Button
              size="small"
              className="border-amber-500 text-amber-600 dark:text-amber-400 hover:text-amber-700"
              icon={<PlusCircle className="w-3.5 h-3.5 inline-block mr-1" />}
              onClick={() =>
                sandbox.simulateAddCombo({
                  name: 'Combo Mi Dưỡng 5 Buổi',
                  price: 1_250_000,
                })
              }
              aria-label="Giả lập chốt Combo Mi Dưỡng"
            >
              + Combo Mi Dưỡng
            </Button>
            <Button
              size="small"
              icon={<ShoppingBag className="w-3.5 h-3.5 inline-block mr-1" />}
              onClick={() =>
                sandbox.simulateAddProduct({
                  name: 'Serum Dưỡng Mi FKN',
                  price: 350_000,
                })
              }
              aria-label="Giả lập thêm Serum dưỡng mi"
            >
              + Thêm Serum Dưỡng
            </Button>
            <Button
              size="small"
              icon={<Gift className="w-3.5 h-3.5 inline-block mr-1" />}
              onClick={() =>
                sandbox.simulateAddGift({
                  name: 'Cọ chải mi pha lê & Gương',
                  estimatedValue: 120_000,
                })
              }
              aria-label="Giả lập tặng quà VIP"
            >
              + Tặng Quà VIP
            </Button>
            <Button
              size="small"
              icon={<RotateCcw className="w-3.5 h-3.5 inline-block mr-1" />}
              onClick={sandbox.resetSalesState}
              aria-label="Đặt lại kịch bản bán"
            >
              Đặt lại
            </Button>
          </Space>
        </div>
      )}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small" style={{ background: themeMode === 'dark' ? '#141414' : '#fafafa' }}>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>∑ Doanh Thu</div>
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
              <strong style={{ float: 'right' }}>Tổng cộng ({transactions.length} đơn):</strong>
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
