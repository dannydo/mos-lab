'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Table, Tag, Typography, Space, Input, theme, Spin, Empty, Badge, Card, Tooltip } from 'antd';
import dynamic from 'next/dynamic';
import {
  SearchOutlined,
  UserOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CcDiamondEntry, CcDiamondDetailEntry, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../../components/CustomerDetailDrawer'), {
  ssr: false,
});

const { Text, Title } = Typography;

interface CcDiamondDetailModalProps {
  open: boolean;
  onClose: () => void;
  ccRecord: CcDiamondEntry | null;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
}

export default function CcDiamondDetailModal({ open, onClose, ccRecord, dateRange }: CcDiamondDetailModalProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<CcDiamondDetailEntry[]>([]);
  const [searchText, setSearchText] = useState('');

  // Customer Detail Side Slide Drawer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);

  const handleOpenCustomerDrawer = (id?: number) => {
    if (!id) return;
    setSelectedCustomerId(id);
    setCustomerDrawerOpen(true);
  };

  const fetchDetails = async () => {
    if (!ccRecord) return;
    setLoading(true);
    try {
      const month = dateRange ? dateRange[0].format('YYYY-MM') : dayjs().format('YYYY-MM');
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;

      const res = await apiClient.kpi.getCcDiamondDetails({
        ccId: ccRecord.ccId,
        month,
        date_from: dateFrom,
        date_to: dateTo,
      });

      if (res && res.data) {
        setDetailsData(res.data);
      } else {
        setDetailsData([]);
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết cặp giới thiệu KH:', err);
      setDetailsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && ccRecord) {
      fetchDetails();
    } else {
      setDetailsData([]);
      setSearchText('');
    }
  }, [open, ccRecord, dateRange]);

  const filteredDetails = detailsData.filter((item) => {
    if (!searchText) return true;
    const q = removeVietnameseTones(searchText);
    return (
      removeVietnameseTones(item.referrerName).includes(q) ||
      (item.referrerPhone && removeVietnameseTones(item.referrerPhone).includes(q)) ||
      removeVietnameseTones(item.newName).includes(q) ||
      (item.newPhone && removeVietnameseTones(item.newPhone).includes(q))
    );
  });

  const columns = [
    {
      title: '#',
      dataIndex: 'referralId',
      key: 'referralId',
      width: 55,
      align: 'center' as const,
      render: (val: number) => <Text className="tabular-nums text-slate-400 font-medium">{val}</Text>,
    },
    {
      title: 'Khách Hàng Giới Thiệu (Khách Cũ)',
      key: 'referrer',
      render: (_: unknown, record: CcDiamondDetailEntry) => (
        <div className="space-y-1">
          <Tooltip title={record.referrerUserId ? 'Nhấp để xem hồ sơ khách hàng' : ''}>
            <div
              className={`flex items-center gap-2 ${record.referrerUserId ? 'cursor-pointer group' : ''}`}
              onClick={() => handleOpenCustomerDrawer(record.referrerUserId)}
            >
              <UserOutlined className="text-blue-500 text-xs" />
              <Text className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 group-hover:underline transition-colors">
                {record.referrerName}
              </Text>
              {record.referrerUserId && (
                <IdcardOutlined className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </Tooltip>
          {record.referrerPhone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <PhoneOutlined className="text-[10px] opacity-70" />
              <span className="tabular-nums font-mono">{record.referrerPhone}</span>
            </div>
          )}
          <Tag color="blue" className="text-[10px] m-0 rounded-md">
            👤 CC vừa checkout
          </Tag>
        </div>
      ),
    },
    {
      title: '',
      key: 'arrow',
      width: 45,
      align: 'center' as const,
      render: () => <ArrowRightOutlined className="text-cyan-500 text-base font-bold animate-pulse" />,
    },
    {
      title: 'Khách Hàng Mới Được Giới Thiệu',
      key: 'newCustomer',
      render: (_: unknown, record: CcDiamondDetailEntry) => (
        <div className="space-y-1">
          <Tooltip title={record.newUserId ? 'Nhấp để xem hồ sơ khách hàng' : ''}>
            <div
              className={`flex items-center gap-2 ${record.newUserId ? 'cursor-pointer group' : ''}`}
              onClick={() => handleOpenCustomerDrawer(record.newUserId)}
            >
              <UserOutlined className="text-emerald-500 text-xs" />
              <Text className="font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-cyan-500 group-hover:underline transition-colors">
                {record.newName}
              </Text>
              {record.newUserId && (
                <IdcardOutlined className="text-xs text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </Tooltip>
          {record.newPhone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <PhoneOutlined className="text-[10px] opacity-70" />
              <span className="tabular-nums font-mono">{record.newPhone}</span>
            </div>
          )}
          <Tag color="cyan" className="text-[10px] m-0 rounded-md font-bold">
            💎 Khách Mới
          </Tag>
        </div>
      ),
    },
    {
      title: 'Ngày Đăng Ký',
      dataIndex: 'referralDate',
      key: 'referralDate',
      align: 'right' as const,
      width: 150,
      render: (val: string) => {
        if (!val) return '-';
        return (
          <div className="text-right space-y-0.5">
            <div className="tabular-nums font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-end gap-1">
              <CalendarOutlined className="text-[10px] text-slate-400" />
              {dayjs(val).format('DD/MM/YYYY')}
            </div>
            <div className="tabular-nums text-[11px] text-slate-400">{dayjs(val).format('HH:mm')}</div>
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 pr-6">
          <span className="text-xl">💎</span>
          <div>
            <Title level={4} className="m-0 text-slate-800 dark:text-slate-100">
              Danh Sách Khách Hàng Giới Thiệu — {ccRecord?.tenCc}
            </Title>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Chi tiết các cặp khách hàng cũ giới thiệu khách hàng mới quy gán cho CC này
            </Text>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={850}
      centered
      className="cc-diamond-detail-modal"
    >
      {ccRecord && (
        <div className="mt-4 space-y-4">
          {/* Top Status Header */}
          <Card
            size="small"
            className="border border-slate-200 dark:border-slate-800 rounded-xl"
            style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#f8fafc' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">∑ Khách Đã Tiếp</div>
                  <div className="tabular-nums text-base font-bold text-slate-800 dark:text-slate-200">
                    {ccRecord.tongKhach} khách
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Số Khách Giới Thiệu (💎)</div>
                  <div className="tabular-nums text-base font-bold text-cyan-600 dark:text-cyan-400">
                    {ccRecord.soKhachDiamond} khách
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Tỷ Lệ Giới Thiệu</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {ccRecord.datDieuKien ? (
                      <Tag color="success" className="tabular-nums font-bold m-0 px-2 py-0.5">
                        ✓ {ccRecord.tyLeGioiThieu}% (Đạt)
                      </Tag>
                    ) : (
                      <Tag color="error" className="tabular-nums font-bold m-0 px-2 py-0.5">
                        ⚠️ {ccRecord.tyLeGioiThieu}% (&lt;3%)
                      </Tag>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 text-right">Thưởng Thực Nhận</div>
                <div
                  className={`tabular-nums text-lg font-extrabold text-right ${
                    ccRecord.thuongDiamond > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {ccRecord.thuongDiamond > 0 ? `+${ccRecord.thuongDiamond.toLocaleString('vi-VN')} đ` : '0 đ'}
                </div>
              </div>
            </div>
          </Card>

          {/* Search Box */}
          <div className="flex items-center justify-between gap-4">
            <Input
              placeholder="Tìm kiếm theo tên KH hoặc SĐT..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-80 rounded-lg"
              allowClear
            />
            <Text className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Hiển thị {filteredDetails.length} / {detailsData.length} lượt giới thiệu
            </Text>
          </div>

          {/* Details Table */}
          <Table
            columns={columns}
            dataSource={filteredDetails}
            rowKey="referralId"
            loading={loading}
            pagination={filteredDetails.length > 10 ? { pageSize: 10, size: 'small', showSizeChanger: true } : false}
            className="antd-custom-table"
            locale={{
              emptyText: loading ? <Spin /> : <Empty description="Không tìm thấy lượt giới thiệu khách hàng nào" />,
            }}
          />
        </div>
      )}

      <CustomerDetailDrawer
        open={customerDrawerOpen}
        customerId={selectedCustomerId}
        onClose={() => setCustomerDrawerOpen(false)}
      />
    </Modal>
  );
}
