'use client';

import React from 'react';
import { Modal, Tag, Spin, Row, Col, Card, Statistic, Segmented, Input, Table, theme } from 'antd';
import { GiftOutlined, DollarOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { CcPaystubRecord, CcTipRecord, TipFilterType } from '@mos-lab/shared';
import { formatStoreCode, formatVND } from '~/lib/format-utils';

export interface CcTipDetailModalProps {
  open: boolean;
  onCancel: () => void;
  record: CcPaystubRecord | null;
  loading: boolean;
  summary: {
    totalCustomerTip: number;
    tippedCount: number;
    totalVisits: number;
    totalCcTipBonus: number;
    smallChangeCount: number;
    noTipCount: number;
  };
  filter: TipFilterType;
  setFilter: (val: TipFilterType) => void;
  search: string;
  setSearch: (val: string) => void;
  records: CcTipRecord[];
}

export default function CcTipDetailModal({
  open,
  onCancel,
  record,
  loading,
  summary,
  filter,
  setFilter,
  search,
  setSearch,
  records,
}: CcTipDetailModalProps) {
  const { token } = theme.useToken();

  if (!record) return null;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={1100}
      className="top-6"
      title={
        <div className="flex flex-wrap items-center gap-2 pr-6 select-none">
          <GiftOutlined className="text-amber-500 text-xl" />
          <span className="font-bold text-lg">Báo Cáo Chi Tiết Ca Tip (20%) - CC: {record.displayName}</span>
          <Tag color="gold" className="font-bold">
            20% Tip Share
          </Tag>
          {record.store && <Tag color="blue">CN: {formatStoreCode(record.store)}</Tag>}
        </div>
      }
      footer={null}
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Card size="small" variant="outlined" className="bg-sky-500/5 border-sky-500/20">
                <Statistic
                  title="∑ Khách Tip"
                  value={summary.totalCustomerTip}
                  suffix="đ"
                  precision={0}
                  valueStyle={{
                    fontSize: '16px',
                    color: token.colorInfo,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 'bold',
                  }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" variant="outlined" className="bg-emerald-500/5 border-emerald-500/20">
                <Statistic
                  title="Lượt Tip ≥ 20K"
                  value={summary.tippedCount}
                  suffix={`/ ${summary.totalVisits} lượt`}
                  valueStyle={{
                    fontSize: '16px',
                    color: token.colorSuccess,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 'bold',
                  }}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" variant="outlined" className="bg-amber-500/5 border-amber-500/30">
                <Statistic
                  title="∑ Thưởng CC Tip (20%)"
                  value={summary.totalCcTipBonus}
                  suffix="đ"
                  precision={0}
                  valueStyle={{
                    fontSize: '16px',
                    color: token.colorWarning,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 'bold',
                  }}
                  prefix={<GiftOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <Segmented<TipFilterType>
              value={filter}
              onChange={(val) => setFilter(val)}
              options={[
                { label: `Tất cả (${summary.totalVisits})`, value: 'ALL' },
                { label: `Có Tip ≥ 20K (${summary.tippedCount})`, value: 'TIPPED' },
                { label: `Tiền lẻ < 20K (${summary.smallChangeCount})`, value: 'SMALL_CHANGE' },
                { label: `Không Tip (${summary.noTipCount})`, value: 'NO_TIP' },
              ]}
              size="small"
            />

            <Input
              placeholder="Tìm khách hàng, dịch vụ, CC..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
              size="small"
              allowClear
            />
          </div>

          <Table
            dataSource={records}
            rowKey={(r, idx) => `${r.orderId || r.checkinTime}-${idx}`}
            bordered
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
            size="small"
            className="antd-custom-table"
            columns={[
              {
                title: 'Check-in Time',
                dataIndex: 'checkinTime',
                key: 'checkinTime',
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
                title: 'Chi Nhánh',
                dataIndex: 'store',
                key: 'store',
                width: 90,
                align: 'center' as const,
                render: (val: string) => <Tag color="blue">{formatStoreCode(val)}</Tag>,
              },
              {
                title: 'CC In / CC Out',
                key: 'ccInOut',
                width: 170,
                render: (_: unknown, record: CcTipRecord) => {
                  const ccIn = record.ccInName?.trim();
                  const ccOut = record.ccOutName?.trim();
                  if (ccIn && ccOut && ccIn === ccOut) {
                    return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ccIn}</span>;
                  }
                  return (
                    <div className="text-xs space-y-0.5">
                      {ccIn && <div className="text-emerald-600 dark:text-emerald-400">In: {ccIn}</div>}
                      {ccOut && <div className="text-amber-600 dark:text-amber-400">Out: {ccOut}</div>}
                    </div>
                  );
                },
              },
              {
                title: 'Khách Tip',
                dataIndex: 'totalCustomerTip',
                key: 'totalCustomerTip',
                width: 130,
                align: 'right' as const,
                render: (val: number, record: CcTipRecord) => (
                  <div className="flex flex-col items-end">
                    <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-400 text-xs">
                      {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
                    </span>
                    {record.tipStatus === 'Small Change' && (
                      <Tag color="orange" className="mr-0 text-[10px] scale-90 origin-right py-0 leading-tight">
                        Tiền lẻ &lt; 20K
                      </Tag>
                    )}
                    {record.tipStatus === 'Tipped' && (
                      <Tag color="green" className="mr-0 text-[10px] scale-90 origin-right py-0 leading-tight">
                        Tip ≥ 20K
                      </Tag>
                    )}
                  </div>
                ),
              },
              {
                title: '% CC Nhận',
                dataIndex: 'ccTipPercentage',
                key: 'ccTipPercentage',
                width: 95,
                align: 'center' as const,
                render: (val: number) => (
                  <Tag color={val > 0 ? 'gold' : 'default'} className="font-bold tabular-nums text-xs m-0">
                    {val}%
                  </Tag>
                ),
              },
              {
                title: 'Thưởng CC Tip',
                dataIndex: 'ccTipAmount',
                key: 'ccTipAmount',
                width: 130,
                align: 'right' as const,
                render: (val: number) => (
                  <span
                    className={`tabular-nums whitespace-nowrap font-bold text-xs ${
                      val > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {val > 0 ? `+${formatVND(val)}` : '0 đ'}
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
