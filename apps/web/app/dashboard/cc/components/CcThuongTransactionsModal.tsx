'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  Table,
  Tag,
  Typography,
  theme,
  Space,
  Button,
  Spin,
  Statistic,
  Card,
  Row,
  Col,
  Tooltip,
  Switch,
} from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  GiftOutlined,
  UserOutlined,
  CalendarOutlined,
  ColumnWidthOutlined,
  FullscreenOutlined,
  CompressOutlined,
  RiseOutlined,
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
  includeVat?: boolean;
}

export default function CcThuongTransactionsModal({
  open,
  onClose,
  date,
  consultantId,
  consultantName,
  includeVat: propsIncludeVat = true,
}: CcThuongTransactionsModalProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<DailySalesBonusTransaction[]>([]);
  const [tierRate, setTierRate] = useState<number | null>(null);
  const [includeVat, setIncludeVat] = useState<boolean>(propsIncludeVat);
  const [onlyHasRevenue, setOnlyHasRevenue] = useState<boolean>(false);

  useEffect(() => {
    if (typeof propsIncludeVat === 'boolean') {
      setIncludeVat(propsIncludeVat);
    }
  }, [propsIncludeVat]);

  // Persistent Modal Width state (Default: 900px) & Revenue Filter state
  const [modalWidth, setModalWidth] = useState<number>(900);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 900 });

  // Load saved width & revenue filter from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cc_thuong_tx_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 600 && parsed <= 1800) {
          setModalWidth(parsed);
        }
      }
      const savedRevFilter = localStorage.getItem('cc_thuong_only_has_revenue');
      if (savedRevFilter !== null) {
        setOnlyHasRevenue(savedRevFilter === 'true');
      }
    }
  }, []);

  const handleToggleOnlyHasRevenue = (checked: boolean) => {
    setOnlyHasRevenue(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_thuong_only_has_revenue', checked.toString());
    }
  };

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
      const res = (await apiClient.gamification.getDailySalesBonusTransactions({
        date,
        consultantId,
      })) as SafeAny;
      if (res && res.data) {
        setTransactions(res.data);
        if (typeof res.matchedTierRate === 'number' && res.matchedTierRate > 0) {
          setTierRate(res.matchedTierRate);
        }
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

  const getItemValue = (item: DailySalesBonusTransaction) => {
    if (includeVat) {
      return item.gross_value ?? item.payment_value ?? 0;
    }
    return item.net_value ?? item.payment_value ?? 0;
  };

  const getItemNetValue = (item: DailySalesBonusTransaction) => {
    return item.net_value ?? item.payment_value ?? 0;
  };

  const totalValue = transactions.reduce((acc, curr) => acc + getItemValue(curr), 0);
  const eligibleSales = transactions.reduce(
    (acc, curr) => acc + (curr.item_type !== 'Service' ? getItemNetValue(curr) : 0),
    0
  );

  const getFallbackTierRate = (sales: number) => {
    if (sales >= 30000000) return 3.0;
    if (sales >= 25000000) return 2.5;
    if (sales >= 20000000) return 2.0;
    if (sales >= 15000000) return 2.0;
    if (sales >= 10000000) return 1.5;
    if (sales >= 5000000) return 1.0;
    return 0.5;
  };
  const activeTierRate = tierRate && tierRate > 0 ? tierRate : getFallbackTierRate(eligibleSales);

  const getRecordedBonus = (record: DailySalesBonusTransaction) => {
    if (record.item_type === 'Service') return 0;
    const netVal = getItemNetValue(record);
    return Math.round((netVal * activeTierRate) / 100);
  };

  const totalRecordedBonus = transactions.reduce((acc, curr) => acc + getRecordedBonus(curr), 0);

  const displayTransactions = transactions.filter((tx) => {
    if (!onlyHasRevenue) return true;
    return getItemValue(tx) > 0;
  });

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
      width: 150,
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
      width: 90,
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
      render: (val: string, record: DailySalesBonusTransaction) => {
        const isEligible = record.item_type !== 'Service';
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag
              color={record.item_type === 'Combo' ? 'blue' : record.item_type === 'Product' ? 'purple' : 'default'}
              className={`font-semibold m-0 ${!isEligible ? 'opacity-60' : ''}`}
            >
              {record.item_type}
            </Tag>
            <span className={isEligible ? 'font-semibold text-slate-200' : 'text-slate-400 font-normal'}>{val}</span>
            {isEligible ? (
              <Tag color="green" className="m-0 text-[10px] font-medium border-green-500/30">
                ✓ Tính thưởng
              </Tag>
            ) : (
              <Tag className="m-0 text-[10px] text-slate-500 bg-slate-800/40 border-slate-700/50">Dịch vụ (0%)</Tag>
            )}
            {record.debt_amount && record.debt_amount > 0 ? (
              <Tooltip
                title={`Đơn hàng có nợ: ${record.debt_amount.toLocaleString('vi-VN')} đ (Giá gốc: ${(record.gross_value || 0).toLocaleString('vi-VN')} đ - Nợ: ${record.debt_amount.toLocaleString('vi-VN')} đ = Thực thu: ${(record.net_value || 0).toLocaleString('vi-VN')} đ)`}
              >
                <Tag color="volcano" className="m-0 text-[10px] font-bold border-rose-500/30 tabular-nums">
                  ⚠️ Nợ: {record.debt_amount.toLocaleString('vi-VN')} đ
                </Tag>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Tư Vấn Viên (CC IN / OUT)',
      key: 'cc_split',
      width: 170,
      render: (_: unknown, record: DailySalesBonusTransaction) => {
        const isSplit = record.is_split;
        const ccIn = record.cc_in_name || 'CC IN';
        const ccOut = record.cc_out_name || 'CC OUT';

        if (isSplit) {
          return (
            <Tooltip
              title={`Đơn hàng có CC In (${ccIn}) khác CC Out (${ccOut}). Doanh số được chia đôi 50/50 cho cả 2 CC.`}
            >
              <div className="flex flex-col gap-0.5">
                <Tag color="blue" className="m-0 text-[10px] font-bold w-fit py-0 px-1 border-blue-500/30">
                  ⚡ 50/50 Split
                </Tag>
                <div className="text-[11px] text-slate-300 font-medium truncate max-w-[150px]">
                  <span className="text-amber-400 font-semibold">IN:</span> {ccIn}
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                  <span className="text-purple-400 font-semibold">OUT:</span> {ccOut}
                </div>
              </div>
            </Tooltip>
          );
        }

        return (
          <div className="flex flex-col gap-0.5">
            <Tag
              color="default"
              className="m-0 text-[10px] text-slate-400 bg-slate-800/60 border-slate-700/60 w-fit py-0 px-1"
            >
              100% CC
            </Tag>
            <div className="text-xs text-slate-300 font-medium truncate max-w-[150px]">
              {ccIn || ccOut || consultantName || 'Tư vấn viên'}
            </div>
          </div>
        );
      },
    },
    {
      title: includeVat ? 'Giá Trị (Có VAT)' : 'Giá Trị (Chưa VAT)',
      dataIndex: 'payment_value',
      key: 'payment_value',
      align: 'right' as const,
      width: 160,
      render: (_: number, record: DailySalesBonusTransaction) => {
        const displayVal = getItemValue(record);
        const fullVal = record.full_order_value
          ? includeVat
            ? record.full_order_value
            : Math.round(record.full_order_value / 1.08)
          : displayVal;

        if (record.is_split && fullVal > displayVal) {
          return (
            <Tooltip
              title={`Doanh số 50% được ghi nhận: ${displayVal.toLocaleString('vi-VN')} đ (Tổng đơn gốc 100%: ${fullVal.toLocaleString('vi-VN')} đ)`}
            >
              <div className="flex flex-col items-end">
                <span className="tabular-nums font-bold text-sky-400 text-sm">
                  {Math.round(displayVal || 0).toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[10px] text-slate-400 font-normal tabular-nums">
                  50% of {fullVal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </Tooltip>
          );
        }

        return (
          <span
            className={`tabular-nums font-semibold ${
              record.item_type !== 'Service' ? 'text-sky-400' : 'text-gray-400 dark:text-gray-400 opacity-75'
            }`}
          >
            {Math.round(displayVal || 0).toLocaleString('vi-VN')} đ
          </span>
        );
      },
    },
    {
      title: 'Thưởng Ghi Nhận',
      key: 'bonus_amount',
      align: 'right' as const,
      width: 140,
      render: (_: number, record: DailySalesBonusTransaction) => {
        const bonus = getRecordedBonus(record);
        const displayVal = getItemValue(record);
        if (record.item_type !== 'Service' && bonus > 0) {
          return (
            <Tooltip
              title={`Được cộng ${activeTierRate}% thưởng trên giá trị ghi nhận ${displayVal.toLocaleString('vi-VN')} đ (${includeVat ? 'Có VAT' : 'Chưa VAT'})`}
            >
              <span className="tabular-nums font-bold text-emerald-400 text-sm">
                +{bonus.toLocaleString('vi-VN')} đ
              </span>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Dịch vụ thường không được tính thưởng Daily Bonus">
            <span className="tabular-nums text-slate-500 text-xs italic">0 đ</span>
          </Tooltip>
        );
      },
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

          {/* HEADER CONTROLS: VAT TOGGLE + REVENUE FILTER + MINIMALIST ICON BUTTONS */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/60 shadow-sm">
              <Text className="text-xs text-amber-400 font-semibold select-none">VAT 8%</Text>
              <Switch checked={includeVat} onChange={setIncludeVat} size="small" />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/60 shadow-sm">
              <Text className="text-xs text-emerald-400 font-semibold select-none">Đơn &gt; 0đ</Text>
              <Switch checked={onlyHasRevenue} onChange={handleToggleOnlyHasRevenue} size="small" />
            </div>
            <Space wrap size={4}>
              <Tooltip title="Kích thước Vừa (900px)">
                <Button
                  size="small"
                  type={modalWidth === 900 ? 'primary' : 'default'}
                  icon={<CompressOutlined />}
                  onClick={() => updateModalWidth(900)}
                  style={
                    modalWidth === 900 ? { background: '#D4A84B', borderColor: '#D4A84B', color: '#000' } : undefined
                  }
                />
              </Tooltip>
              <Tooltip title="Kích thước Rộng (1200px)">
                <Button
                  size="small"
                  type={modalWidth === 1200 ? 'primary' : 'default'}
                  icon={<ColumnWidthOutlined />}
                  onClick={() => updateModalWidth(1200)}
                  style={
                    modalWidth === 1200 ? { background: '#D4A84B', borderColor: '#D4A84B', color: '#000' } : undefined
                  }
                />
              </Tooltip>
              <Tooltip title="Kích thước Tối đa (1450px)">
                <Button
                  size="small"
                  type={modalWidth === 1450 ? 'primary' : 'default'}
                  icon={<FullscreenOutlined />}
                  onClick={() => updateModalWidth(1450)}
                  style={
                    modalWidth === 1450 ? { background: '#D4A84B', borderColor: '#D4A84B', color: '#000' } : undefined
                  }
                />
              </Tooltip>
            </Space>
          </div>
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
      <Row gutter={[12, 12]} className="mb-4">
        <Col xs={12} sm={5}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="∑ Giao Dịch"
              value={onlyHasRevenue ? `${displayTransactions.length} / ${transactions.length}` : transactions.length}
              suffix="đơn"
              valueStyle={{ fontSize: '16px', fontVariantNumeric: 'tabular-nums' }}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={5}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="∑ Doanh Số Phát Sinh"
              value={totalValue}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '16px', color: '#8c8c8c', fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={5}>
          <Card size="small" variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#52c41a' }}>
            <Statistic
              title="Doanh Số Tính Thưởng"
              value={eligibleSales}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '16px', color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined className="text-emerald-500" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small" variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#faad14' }}>
            <Statistic
              title="Bậc Thưởng (%)"
              value={activeTierRate}
              suffix="%"
              precision={1}
              valueStyle={{ fontSize: '16px', color: '#d4a84b', fontVariantNumeric: 'tabular-nums' }}
              prefix={<RiseOutlined className="text-amber-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={5}>
          <Card size="small" variant="outlined" style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}>
            <Statistic
              title={
                <div className="flex items-center justify-between">
                  <span>∑ Thưởng</span>
                  <Tag color="gold" className="m-0 text-[10px] font-bold">
                    Bậc {activeTierRate}%
                  </Tag>
                </div>
              }
              value={totalRecordedBonus}
              suffix="đ"
              precision={0}
              valueStyle={{ fontSize: '16px', color: '#e6a23c', fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined className="text-amber-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={displayTransactions}
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
