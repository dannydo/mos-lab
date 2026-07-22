'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Modal, Table, Tag, Typography, theme, Space, Button, Spin, Statistic, Card, Row, Col, Tooltip } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  GiftOutlined,
  UserOutlined,
  CalendarOutlined,
  ColumnWidthOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { DailySalesBonusTransaction } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

const { Text } = Typography;

interface CcThuongTransactionsModalProps {
  open: boolean;
  onClose: () => void;
  date?: string;
  consultantId?: string | number;
  consultantName?: string;
}

export default function CcThuongTransactionsModal({
  open,
  onClose,
  date,
  consultantId,
  consultantName,
}: CcThuongTransactionsModalProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<DailySalesBonusTransaction[]>([]);

  // Persistent Modal Width state (Default: 900px)
  const [modalWidth, setModalWidth] = useState<number>(900);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 900 });

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cc_thuong_tx_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 600 && parsed <= 1800) {
          setModalWidth(parsed);
        }
      }
    }
  }, []);

  const updateModalWidth = (newWidth: number) => {
    const clamped = Math.max(600, Math.min(1800, newWidth));
    setModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_thuong_tx_modal_width', clamped.toString());
    }
  };

  // Drag to resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      dragStartRef.current = { startX: e.clientX, startWidth: modalWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - dragStartRef.current.startX;
        // Since modal is centered, moving right by 1px expands width by 2px
        const newWidth = dragStartRef.current.startWidth + deltaX * 2;
        const clamped = Math.max(600, Math.min(1800, newWidth));
        setModalWidth(clamped);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const deltaX = upEvent.clientX - dragStartRef.current.startX;
        const finalWidth = Math.max(600, Math.min(1800, dragStartRef.current.startWidth + deltaX * 2));
        if (typeof window !== 'undefined') {
          localStorage.setItem('cc_thuong_tx_modal_width', finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  const fetchTransactions = async () => {
    if (!date || !consultantId) return;
    setLoading(true);
    try {
      const res = await apiClient.gamification.getDailySalesBonusTransactions({
        date,
        consultantId,
      });
      if (res && res.data) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách giao dịch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && date && consultantId) {
      fetchTransactions();
    }
  }, [open, date, consultantId]);

  const totalValue = transactions.reduce((acc, curr) => acc + (curr.payment_value || 0), 0);
  const totalRecordedBonus = transactions.reduce((acc, curr) => acc + (curr.recorded_bonus || 0), 0);

  const columns = [
    {
      title: 'Mã Đơn / Giờ',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 140,
      render: (val: number, record: DailySalesBonusTransaction) => (
        <div>
          <span className="font-mono font-bold text-blue-500 tabular-nums">#{val}</span>
          <div className="text-[11px] text-gray-400 tabular-nums">{record.order_time}</div>
        </div>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 160,
      render: (val: string) => (
        <Space size={4}>
          <UserOutlined className="text-gray-400 text-xs" />
          <span className="font-semibold text-sm">{val}</span>
        </Space>
      ),
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store_code',
      key: 'store_code',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'PXL' ? 'blue' : 'purple'} className="font-medium">
          {val}
        </Tag>
      ),
    },
    {
      title: 'Tên Dịch Vụ / Combo / SP',
      dataIndex: 'item_title',
      key: 'item_title',
      render: (val: string, record: DailySalesBonusTransaction) => (
        <div className="flex items-center gap-2">
          <Tag color={record.item_type === 'Combo' ? 'blue' : record.item_type === 'Product' ? 'purple' : 'green'}>
            {record.item_type}
          </Tag>
          <span className="font-medium">{val}</span>
        </div>
      ),
    },
    {
      title: 'Giá Trị Thanh Toán',
      dataIndex: 'payment_value',
      key: 'payment_value',
      align: 'right' as const,
      width: 150,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-200">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thưởng Ghi Nhận',
      dataIndex: 'recorded_bonus',
      key: 'recorded_bonus',
      align: 'right' as const,
      width: 150,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-500">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex flex-wrap justify-between items-center gap-2 pr-6">
          <div className="flex items-center gap-2">
            <ShoppingCartOutlined className="text-amber-500 text-lg" />
            <span className="font-bold text-lg" style={{ color: token.colorText }}>
              Chi Tiết Giao Dịch Trong Ngày ({date})
            </span>
            {consultantName && (
              <Tag color="gold" className="font-semibold ml-2">
                CC: {consultantName}
              </Tag>
            )}
          </div>

          {/* PRESET WIDTH QUICK SWITCHER */}
          <Space wrap className="text-xs">
            <Text type="secondary" className="text-[11px] hidden sm:inline">
              Kích thước:
            </Text>
            <Button
              size="small"
              type={modalWidth === 900 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(900)}
              style={modalWidth === 900 ? { background: '#D4A84B', borderColor: '#D4A84B', color: '#000' } : undefined}
            >
              Vừa (900px)
            </Button>
            <Button
              size="small"
              type={modalWidth === 1200 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(1200)}
              style={modalWidth === 1200 ? { background: '#D4A84B', borderColor: '#D4A84B', color: '#000' } : undefined}
            >
              Rộng (1200px)
            </Button>
            <Button
              size="small"
              type={modalWidth === 1450 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(1450)}
              style={modalWidth === 1450 ? { background: '#D4A84B', borderColor: '#D4A84B', color: '#000' } : undefined}
            >
              Tối đa (1450px)
            </Button>
          </Space>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={modalWidth}
      footer={[
        <div key="footer-wrapper" className="flex justify-between items-center">
          <Text type="secondary" className="text-xs">
            💡 Kéo mép phải để thay đổi kích thước ({modalWidth}px) - Tự động lưu khi F5
          </Text>
          <Button
            type="primary"
            onClick={onClose}
            style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
          >
            Đóng
          </Button>
        </div>,
      ]}
      style={{ top: 20 }}
      modalRender={(modalNode) => (
        <div className="relative group">
          {modalNode}
          {/* RIGHT RESIZE DRAG HANDLE */}
          <div
            onMouseDown={handleMouseDown}
            title="Kéo sang trái/phải để thay đổi chiều rộng Modal (Tự lưu kích thước)"
            className={`absolute top-0 right-0 bottom-0 w-3 cursor-col-resize z-50 flex items-center justify-center transition-colors rounded-r-lg ${
              isResizing ? 'bg-amber-500/40' : 'hover:bg-amber-500/30'
            }`}
            style={{ touchAction: 'none' }}
          >
            <div className="w-1 h-8 bg-amber-500/60 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}
    >
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} sm={8}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Đơn / Dịch Vụ"
              value={transactions.length}
              suffix="giao dịch"
              valueStyle={{ fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Tổng Doanh Số Phát Sinh"
              value={totalValue}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '18px', color: '#1890ff', fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}>
            <Statistic
              title="Tổng Thưởng Đã Ghi Nhận"
              value={totalRecordedBonus}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '18px', color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={transactions}
        columns={columns}
        rowKey="order_service_id"
        loading={loading}
        size="small"
        bordered
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        className="antd-custom-table"
        locale={{ emptyText: 'Không có giao dịch phát sinh trong ngày này' }}
      />
    </Modal>
  );
}
