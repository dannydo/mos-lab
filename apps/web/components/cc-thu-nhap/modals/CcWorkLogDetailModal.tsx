'use client';

import React from 'react';
import { Typography, Tag, Button, Row, Col, Card, Statistic, Space } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { CcPaystubRecord, CcWorkLogDetailRecord } from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter, DataTable } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';

const { Text } = Typography;

export interface CcWorkLogDetailModalProps {
  open: boolean;
  onCancel: () => void;
  record: CcPaystubRecord | null;
  modalWidth: number;
  updateModalWidth: (width: number) => void;
  isMobile: boolean;
  handleMouseDown?: (e: React.MouseEvent) => void;
  isResizing?: boolean;
  isDark?: boolean;
  workLogSummary: {
    totalWorkDays: number;
    totalWorkHours: number;
    hourlyRate: number;
    totalWage: number;
  };
  workLogs: CcWorkLogDetailRecord[];
  workLogLoading: boolean;
  workLogPage: number;
  setWorkLogPage: (page: number) => void;
  workLogPageSize: number;
  setWorkLogPageSize: (size: number) => void;
  formatHoursToHoursMinutes: (totalHours: number, compact?: boolean) => string;
}

export default function CcWorkLogDetailModal({
  open,
  onCancel,
  record,
  modalWidth,
  updateModalWidth,
  isMobile,
  handleMouseDown,
  isResizing,
  isDark,
  workLogSummary,
  workLogs,
  workLogLoading,
  workLogPage,
  setWorkLogPage,
  workLogPageSize,
  setWorkLogPageSize,
  formatHoursToHoursMinutes,
}: CcWorkLogDetailModalProps) {
  if (!record) return null;

  return (
    <AdaptiveModal
      open={open}
      onCancel={onCancel}
      intent="data"
      width={modalWidth}
      style={{ top: 30 }}
      className="cc-worklog-modal"
      title={
        <div className="cc-worklog-modal-title select-none">
          <div className="cc-worklog-modal-title-main">
            <ClockCircleOutlined className="text-blue-500 text-xl" />
            <span className="cc-worklog-modal-title-text">
              Báo Cáo Ca Làm Việc & Lương Giờ (IN/OUT) - CC: {record.displayName}
            </span>
            <Tag color={record.store === 'PXL' ? 'blue' : 'purple'}>CN: {record.store}</Tag>
          </div>

          <div className="cc-worklog-modal-size-controls" aria-label="Chọn kích thước báo cáo">
            <Text type="secondary" className="text-xs mr-1">
              Kích thước:
            </Text>
            <Button
              size="small"
              type={modalWidth === 800 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(800)}
              className="text-xs"
            >
              Vừa (800px)
            </Button>
            <Button
              size="small"
              type={modalWidth === 1100 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(1100)}
              className="text-xs"
            >
              Rộng (1100px)
            </Button>
            <Button
              size="small"
              type={modalWidth === 1400 ? 'primary' : 'default'}
              onClick={() => updateModalWidth(1400)}
              className="text-xs"
            >
              Tối đa (1400px)
            </Button>
          </div>
        </div>
      }
      footer={null}
    >
      <div className="cc-worklog-modal-content">
        {!isMobile && handleMouseDown && (
          <div
            onMouseDown={handleMouseDown}
            className={`cc-worklog-modal-resize-handle ${isResizing ? 'is-resizing' : ''}`}
            title="Kéo sang ngang để thay đổi chiều rộng Popup (Nhớ kích thước khi F5)"
          >
            <div />
          </div>
        )}

        <Row gutter={[12, 12]} className="cc-worklog-modal-summary">
          <Col xs={12} md={6}>
            <Card size="small" variant="outlined">
              <Statistic
                title="∑ Ngày Đi Làm"
                value={workLogSummary.totalWorkDays}
                suffix="ngày"
                valueStyle={{
                  fontSize: '15px',
                  color: isDark ? '#60a5fa' : '#1890ff',
                  fontVariantNumeric: 'tabular-nums',
                }}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" variant="outlined">
              <Statistic
                title="∑ Số Giờ Làm"
                value={formatHoursToHoursMinutes(workLogSummary.totalWorkHours)}
                valueStyle={{
                  fontSize: '15px',
                  color: isDark ? '#c084fc' : '#722ed1',
                  fontVariantNumeric: 'tabular-nums',
                }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" variant="outlined">
              <Statistic
                title="Đơn Giá Lương Giờ"
                value={workLogSummary.hourlyRate}
                suffix="đ/h"
                valueStyle={{
                  fontSize: '15px',
                  color: isDark ? '#4ade80' : '#52c41a',
                  fontVariantNumeric: 'tabular-nums',
                }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small" variant="outlined" style={{ borderColor: isDark ? '#60a5fa' : '#1890ff' }}>
              <Statistic
                title="∑ Lương Giờ Nhận"
                value={workLogSummary.totalWage}
                suffix="đ"
                precision={0}
                valueStyle={{
                  fontSize: '15px',
                  color: isDark ? '#60a5fa' : '#1890ff',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 'bold',
                }}
              />
            </Card>
          </Col>
        </Row>

        <div className="cc-worklog-modal-table">
          <DataTable
            dataSource={workLogs}
            rowKey={(r, idx) => `${r.work_date || ''}-${r.first_in || ''}-${idx}`}
            loading={workLogLoading}
            pagination={{
              current: workLogPage,
              pageSize: workLogPageSize,
              total: workLogs.length,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} ngày`,
              onChange: (page, pageSize) => {
                setWorkLogPage(page);
                if (pageSize !== workLogPageSize) {
                  setWorkLogPageSize(pageSize);
                  localStorage.setItem('cc_worklog_modal_page_size', String(pageSize));
                }
              },
            }}
            size="small"
            bordered
            className="cc-worklog-table"
            mobileEmptyDescription="Không có ca làm việc trong kỳ này"
            mobileRenderer={(item) => (
              <div className="cc-worklog-mobile-card">
                <div className="cc-worklog-mobile-card-head">
                  <span className="font-semibold tabular-nums">{item.work_date}</span>
                  <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatVND(item.daily_wage)}
                  </span>
                </div>
                <div className="cc-worklog-mobile-card-times">
                  <Tag color="green" className="tabular-nums font-mono font-semibold m-0">
                    <LoginOutlined /> {item.first_in}
                  </Tag>
                  <Tag color="volcano" className="tabular-nums font-mono font-semibold m-0">
                    <LogoutOutlined /> {item.last_out}
                  </Tag>
                </div>
                <div className="cc-worklog-mobile-card-meta">
                  <span>{item.service_count} lượt phục vụ</span>
                  <span className="tabular-nums font-semibold">{formatHoursToHoursMinutes(item.total_hours)}</span>
                </div>
              </div>
            )}
            columns={[
              {
                title: 'Ngày Làm Việc',
                dataIndex: 'work_date',
                key: 'work_date',
                width: 130,
                render: (val: string) => (
                  <Space size={4}>
                    <CalendarOutlined className="text-blue-500 text-xs" />
                    <span className="tabular-nums font-semibold">{val}</span>
                  </Space>
                ),
              },
              {
                title: 'Check-in Đầu (IN)',
                dataIndex: 'first_in',
                key: 'first_in',
                width: 140,
                align: 'center' as const,
                render: (val: string) => (
                  <Tag color="green" className="tabular-nums font-mono font-semibold">
                    <LoginOutlined className="mr-1" /> {val}
                  </Tag>
                ),
              },
              {
                title: 'Check-out Cuối (OUT)',
                dataIndex: 'last_out',
                key: 'last_out',
                width: 140,
                align: 'center' as const,
                render: (val: string) => (
                  <Tag color="volcano" className="tabular-nums font-mono font-semibold">
                    <LogoutOutlined className="mr-1" /> {val}
                  </Tag>
                ),
              },
              {
                title: 'Số Lượt Phục Vụ',
                dataIndex: 'service_count',
                key: 'service_count',
                align: 'right' as const,
                width: 130,
                render: (val: number) => (
                  <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{val} lượt</span>
                ),
              },
              {
                title: 'Số Giờ Tính Lương',
                dataIndex: 'total_hours',
                key: 'total_hours',
                align: 'right' as const,
                width: 140,
                render: (val: number) => (
                  <span className={`tabular-nums font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatHoursToHoursMinutes(val)}
                  </span>
                ),
              },
              {
                title: 'Lương Giờ Trong Ngày',
                dataIndex: 'daily_wage',
                key: 'daily_wage',
                align: 'right' as const,
                width: 150,
                render: (val: number) => (
                  <span
                    className={`tabular-nums whitespace-nowrap font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                  >
                    +{formatVND(val)}
                  </span>
                ),
              },
            ]}
          />
        </div>

        <AdaptiveOverlayFooter className="cc-worklog-modal-footer">
          <Text type="secondary" className="cc-worklog-modal-resize-hint text-xs italic">
            💡 Kéo mép phải để chỉnh rộng / hẹp ({modalWidth}px) — Tự động ghi nhớ khi F5
          </Text>
          <Button type="primary" onClick={onCancel}>
            Đóng Báo Cáo Ca Làm
          </Button>
        </AdaptiveOverlayFooter>
      </div>
    </AdaptiveModal>
  );
}
