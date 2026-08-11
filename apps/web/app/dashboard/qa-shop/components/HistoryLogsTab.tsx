'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Select,
  DatePicker,
  Drawer,
  Space,
  Badge,
  Image,
  Input,
  Tooltip,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  MinusCircleFilled,
  FileTextOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { QaDailyAudit, QaShopBranchCode } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

interface HistoryLogsTabProps {
  themeMode: string;
}

export const HistoryLogsTab: React.FC<HistoryLogsTabProps> = ({ themeMode }) => {
  const [audits, setAudits] = useState<QaDailyAudit[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  // Controlled Pagination & Persistence (Rule #24)
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_qa_history_page');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_qa_history_pagesize');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });

  // Selected Audit Detail Drawer
  const [selectedAudit, setSelectedAudit] = useState<QaDailyAudit | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.qaShop.getAudits({
        branchCode: branchFilter,
        dateFrom: dateRange[0]?.format('YYYY-MM-DD'),
        dateTo: dateRange[1]?.format('YYYY-MM-DD'),
      });
      setAudits(res || []);
    } catch (err) {
      console.error('Fetch audits error:', err);
      message.error('Lỗi khi tải lịch sử audit');
    } finally {
      setLoading(false);
    }
  }, [branchFilter, dateRange]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handlePageChange = (newPage: number, newSize?: number) => {
    setPage(newPage);
    if (newSize && newSize !== pageSize) {
      setPageSize(newSize);
      localStorage.setItem('mos_qa_history_pagesize', String(newSize));
    }
    localStorage.setItem('mos_qa_history_page', String(newPage));
  };

  const handleOpenDetail = (audit: QaDailyAudit) => {
    setSelectedAudit(audit);
    setDetailDrawerOpen(true);
  };

  const columns = [
    {
      title: 'Mã Audit / Ngày',
      dataIndex: 'auditCode',
      key: 'auditCode',
      render: (code: string, record: QaDailyAudit) => (
        <div>
          <div className="font-bold text-xs font-mono text-blue-600 dark:text-blue-400 tabular-nums">{code}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
            {dayjs(record.auditDate).format('DD/MM/YYYY')} • {record.shift}
          </div>
        </div>
      ),
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (name: string, record: QaDailyAudit) => (
        <div>
          <Tag color={record.branchCode === 'DT' ? 'blue' : record.branchCode === 'EP' ? 'purple' : 'default'}>
            {record.branchCode}
          </Tag>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{name}</span>
        </div>
      ),
    },
    {
      title: 'Nhân Sự QA',
      dataIndex: 'auditorName',
      key: 'auditorName',
      render: (name: string) => <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{name}</span>,
    },
    {
      title: 'Kết Quả Kiểm Tra',
      key: 'counts',
      render: (_: any, record: QaDailyAudit) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-600 font-bold flex items-center gap-1 tabular-nums">
            <CheckCircleFilled /> {record.passedCount}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-rose-600 font-bold flex items-center gap-1 tabular-nums">
            <CloseCircleFilled /> {record.failedCount}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 tabular-nums">
            <MinusCircleFilled /> {record.naCount}
          </span>
        </div>
      ),
    },
    {
      title: 'Tỷ Lệ Tuân Thủ',
      dataIndex: 'complianceRate',
      key: 'complianceRate',
      sorter: (a: QaDailyAudit, b: QaDailyAudit) => a.complianceRate - b.complianceRate,
      render: (rate: number, record: QaDailyAudit) => {
        let val = rate;
        if (val === undefined || val === null || val > 100) {
          if (record.maxScore && record.maxScore > 0) {
            val = Math.round((record.overallScore / record.maxScore) * 1000) / 10;
          } else {
            val = Math.min(100, Math.max(0, record.complianceRate || 95.0));
          }
        }
        val = Math.min(100, Math.max(0, val));
        const color = val >= 95 ? 'emerald' : val >= 85 ? 'blue' : 'rose';
        return (
          <div className="flex items-center gap-2">
            <span className={`tabular-nums font-black text-sm text-${color}-600 dark:text-${color}-400`}>
              {val.toFixed(1)}%
            </span>
            <Tag color={val >= 95 ? 'success' : val >= 85 ? 'processing' : 'error'} className="text-[10px]">
              {val >= 95 ? 'Xuất Sắc' : val >= 85 ? 'Đạt' : 'Cần Sửa'}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
          {st === 'COMPLETED' ? 'Hoàn Tất' : 'Nháp'}
        </Tag>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_: any, record: QaDailyAudit) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetail(record)}
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* FILTER BAR */}
      <Card
        className={`shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chi nhánh:</span>
              <Select
                value={branchFilter}
                onChange={(val) => {
                  setBranchFilter(val);
                  setPage(1);
                }}
                className="w-40"
                options={[
                  { value: 'ALL', label: 'Tất cả chi nhánh' },
                  { value: 'DT', label: 'Đề Thám (DT)' },
                  { value: 'EP', label: 'Estella Place (EP)' },
                  { value: 'Q7', label: 'Quận 7 (Q7)' },
                  { value: 'TB', label: 'Tân Bình (TB)' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Khoảng thời gian:</span>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates as any);
                  setPage(1);
                }}
                format="DD/MM/YYYY"
                className="w-64"
              />
            </div>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAudits}
            loading={loading}
            className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
          >
            Làm mới
          </Button>
        </div>
      </Card>

      {/* TABLE DATA */}
      <Card
        className={`shadow-sm border ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={audits}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: audits.length,
            onChange: handlePageChange,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => (
              <span className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                Hiển thị {range[0]}-{range[1]} trên tổng số {total} phiếu audit
              </span>
            ),
          }}
          className="antd-custom-table"
        />
      </Card>

      {/* AUDIT DETAIL DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-blue-500" />
            <span className="font-bold text-base">Chi Tiết Phiếu Audit {selectedAudit?.auditCode}</span>
          </div>
        }
        width={680}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        getContainer={() => document.body}
        styles={{
          header: {
            background: themeMode === 'dark' ? '#141414' : '#ffffff',
            borderBottom: `1px solid ${themeMode === 'dark' ? '#262626' : '#f0f0f0'}`,
          },
          body: {
            background: themeMode === 'dark' ? '#0a0a0a' : '#fafafa',
          },
        }}
      >
        {selectedAudit && (
          <div className="space-y-6">
            {/* OVERVIEW INFO */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Tag color="blue">{selectedAudit.branchCode}</Tag>
                  <span className="font-bold text-base">{selectedAudit.branchName}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Tỷ lệ tuân thủ</div>
                  <div className="tabular-nums text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {selectedAudit.complianceRate}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t pt-3 border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Ngày Audit:</span>{' '}
                  <span className="font-medium">{dayjs(selectedAudit.auditDate).format('DD/MM/YYYY')}</span>
                </div>
                <div>
                  <span className="text-slate-400">Ca kiểm tra:</span>{' '}
                  <span className="font-medium">{selectedAudit.shift}</span>
                </div>
                <div>
                  <span className="text-slate-400">Nhân sự QA:</span>{' '}
                  <span className="font-medium">{selectedAudit.auditorName}</span>
                </div>
              </div>

              {selectedAudit.notes && (
                <div className="text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  <span className="font-semibold text-slate-500">Nhận xét chung: </span>
                  {selectedAudit.notes}
                </div>
              )}
            </div>

            {/* AUDIT ITEMS RECORDED */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Danh sách chi tiết kết quả kiểm tra ({selectedAudit.items.length} tiêu chuẩn)
              </h4>

              {selectedAudit.items.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">Chưa có chi tiết dòng tiêu chuẩn nào</div>
              ) : (
                <div className="space-y-2">
                  {selectedAudit.items.map((itm) => (
                    <div
                      key={itm.itemId}
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        itm.result === 'FAIL'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold flex items-center gap-2">
                          <Tag color="blue" className="font-mono text-[10px] m-0">
                            {itm.itemCode}
                          </Tag>
                          <span>{itm.itemTitle}</span>
                        </div>
                        <div>
                          {itm.result === 'PASS' ? (
                            <Tag color="success" className="font-bold m-0 text-[10px]">
                              PASS (Đạt)
                            </Tag>
                          ) : itm.result === 'FAIL' ? (
                            <Tag color="error" className="font-bold m-0 text-[10px]">
                              FAIL (Khắc phục)
                            </Tag>
                          ) : (
                            <Tag color="default" className="m-0 text-[10px]">
                              N/A
                            </Tag>
                          )}
                        </div>
                      </div>

                      {itm.note && (
                        <div className="text-slate-600 dark:text-slate-300 text-[11px] bg-white/60 dark:bg-slate-800/40 p-2 rounded border border-rose-200/50">
                          <span className="font-semibold text-rose-600">Ghi chú vi phạm: </span>
                          {itm.note}
                        </div>
                      )}

                      {itm.photoUrls && itm.photoUrls.length > 0 && (
                        <div className="pt-1 flex items-center gap-2">
                          <span className="text-slate-400 text-[11px]">Ảnh minh chứng:</span>
                          {itm.photoUrls.map((url, idx) => (
                            <Image
                              key={idx}
                              src={url}
                              alt="Proof"
                              width={48}
                              height={48}
                              className="rounded object-cover border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
