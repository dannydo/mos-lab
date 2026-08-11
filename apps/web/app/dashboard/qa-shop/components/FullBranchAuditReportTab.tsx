'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Tag,
  Table,
  Tabs,
  Typography,
  Space,
  Progress,
  Tooltip,
  Modal,
  Badge,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  EyeOutlined,
  CameraOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface FullBranchAuditReportTabProps {
  selectedBranchCode: string;
  branches: Array<{ code: string; name: string }>;
  audits: any[];
  activeTemplate: any;
  itemStatuses: Record<string, any>;
  themeMode: 'light' | 'dark';
}

export const FullBranchAuditReportTab: React.FC<FullBranchAuditReportTabProps> = ({
  selectedBranchCode,
  branches,
  audits,
  activeTemplate,
  itemStatuses,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const [selectedAuditId, setSelectedAuditId] = useState<string>('latest');
  const [activeReportTab, setActiveReportTab] = useState<'FAILED' | 'PASSED' | 'NA' | 'ALL'>('FAILED');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeReportTab, selectedBranchCode, selectedAuditId]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Determine current audit dataset for the selected branch
  const currentBranchAudits = audits.filter((a) => a.branchCode === selectedBranchCode);
  const activeAuditRecord =
    selectedAuditId === 'latest'
      ? currentBranchAudits[0] || null
      : currentBranchAudits.find((a) => a.id === selectedAuditId) || null;

  // Extract items ONLY from saved audit snapshot (do NOT fallback to un-audited template)
  const sections = activeAuditRecord?.sectionsSnapshot || [];
  const snapshotMap = activeAuditRecord?.itemSnapshot || {};

  const allProcessedItems: any[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalNa = 0;

  sections.forEach((sec: any) => {
    (sec.items || []).forEach((itm: any) => {
      const statusData = snapshotMap[itm.id] || { result: 'PASS' };
      const res = statusData.result || 'PASS';

      if (res === 'PASS') totalPassed++;
      else if (res === 'FAIL') totalFailed++;
      else totalNa++;

      allProcessedItems.push({
        id: itm.id,
        sectionTitle: sec.title,
        title: itm.title,
        standardRequirement: itm.standardRequirement || 'Tuân thủ 100% tiêu chuẩn vệ sinh & phục vụ.',
        quantityReq: itm.quantityReq || 1,
        weight: itm.weight || 1,
        isCritical: itm.isCritical || false,
        result: res,
        violationCount: statusData.violationCount || 1,
        failPercentage: statusData.failPercentage || (res === 'FAIL' ? 100 : 0),
        note: statusData.note || (res === 'FAIL' ? 'Không đạt tiêu chuẩn kiểm tra' : ''),
        photoUrl: statusData.photoUrl || (statusData.photoUrls && statusData.photoUrls[0]) || '',
      });
    });
  });

  const totalItems = allProcessedItems.length || 1;
  const passRate = Math.round((totalPassed / totalItems) * 1000) / 10;

  const failedItems = allProcessedItems.filter((i) => i.result === 'FAIL');
  const passedItems = allProcessedItems.filter((i) => i.result === 'PASS');
  const naItems = allProcessedItems.filter((i) => i.result === 'NA');

  const displayedItems =
    activeReportTab === 'FAILED'
      ? failedItems
      : activeReportTab === 'PASSED'
        ? passedItems
        : activeReportTab === 'NA'
          ? naItems
          : allProcessedItems;

  const columns = [
    {
      title: 'Khu Vực & Tiêu Chi',
      key: 'title',
      render: (_: any, r: any) => (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Tag color="purple" className="text-[10px] uppercase font-semibold">
              {r.sectionTitle}
            </Tag>
            {r.isCritical && (
              <Tag color="error" className="text-[10px] font-bold">
                ⚠️ CRITICAL
              </Tag>
            )}
          </div>
          <Text className="font-semibold text-slate-800 dark:text-slate-100 text-xs block">{r.title}</Text>
          <Text className="text-[11px] text-slate-600 dark:text-slate-400 block">{r.standardRequirement}</Text>
        </div>
      ),
    },
    {
      title: 'Kết Quả',
      key: 'result',
      width: 130,
      render: (_: any, r: any) => {
        if (r.result === 'PASS') {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success" className="font-bold text-xs px-2 py-0.5">
              ĐẠT CHUẨN
            </Tag>
          );
        }
        if (r.result === 'FAIL') {
          return (
            <Tag icon={<CloseCircleOutlined />} color="error" className="font-bold text-xs px-2 py-0.5">
              KHÔNG ĐẠT ({r.failPercentage}%)
            </Tag>
          );
        }
        return (
          <Tag icon={<MinusCircleOutlined />} color="default" className="font-semibold text-xs px-2 py-0.5">
            N/A
          </Tag>
        );
      },
    },
    {
      title: 'Chi Tiết Lỗi / Ghi Chú',
      key: 'details',
      render: (_: any, r: any) => (
        <div className="space-y-1">
          {r.result === 'FAIL' && (
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              • SL Vi Phạm: <span className="font-bold tabular-nums">{r.violationCount}</span> / {r.quantityReq} (
              {r.failPercentage}%)
            </div>
          )}
          {r.note ? (
            <Text className="text-xs text-slate-600 dark:text-slate-300 italic block">&quot;{r.note}&quot;</Text>
          ) : (
            <Text className="text-xs text-slate-600 dark:text-slate-400">-</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Bằng Chứng 📷',
      key: 'photo',
      width: 110,
      align: 'center' as const,
      render: (_: any, r: any) =>
        r.photoUrl ? (
          <div className="flex justify-center">
            <img
              src={r.photoUrl}
              alt="Bằng chứng"
              className="w-12 h-12 rounded-lg object-cover border border-slate-300 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform shadow-sm"
              onClick={() => setPreviewImage(r.photoUrl)}
            />
          </div>
        ) : (
          <Text className="text-[11px] text-slate-600 dark:text-slate-400">Không có</Text>
        ),
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = ['Khu Vực', 'Tiêu Chí', 'Yêu Cầu', 'Kết Quả', 'SL Vi Phạm', '% Lỗi', 'Ghi Chú'];
    const rows = allProcessedItems.map((i) => [
      `"${i.sectionTitle}"`,
      `"${i.title}"`,
      `"${i.standardRequirement}"`,
      i.result,
      i.violationCount || 0,
      `${i.failPercentage}%`,
      `"${i.note || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Full_Audit_Report_${selectedBranchCode}_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (currentBranchAudits.length === 0) {
    const branchName = branches.find((b) => b.code === selectedBranchCode)?.name || selectedBranchCode;
    return (
      <div className="py-6">
        <Card
          className="shadow-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-center py-12"
          style={{ background: isDark ? '#141414' : '#ffffff' }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="space-y-2">
                <Text className="text-base font-bold text-slate-800 dark:text-slate-100 block">
                  Chi nhánh [{branchName}] chưa có dữ liệu kiểm tra audit nào
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 block max-w-md mx-auto">
                  Vui lòng chuyển sang tab{' '}
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    &quot;Bảng Kiểm Tra Từng Phần&quot;
                  </span>
                  , thực hiện đánh giá và bấm{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">&quot;Lưu Biên Bản&quot;</span>{' '}
                  để ghi nhận dữ liệu đợt kiểm tra đầu tiên.
                </Text>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Top Filter Bar */}
      <Card
        className="shadow-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl"
        style={{ background: isDark ? '#141414' : '#ffffff' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Text className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Chọn Đợt Audit / Biên Bản:
              </Text>
              <Select value={selectedAuditId} onChange={setSelectedAuditId} className="w-64" size="middle">
                <Select.Option value="latest">🌟 Biên Bản Mới Nhất (Vừa Audit)</Select.Option>
                {currentBranchAudits.map((a) => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.id} ({a.auditDate} - Ca {a.shift})
                  </Select.Option>
                ))}
              </Select>
            </div>
          </div>

          <Space size="small">
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              className="bg-purple-600 hover:bg-purple-500 font-semibold border-none text-xs"
            >
              In / Xuất PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportCsv}
              className="font-semibold text-xs border-slate-300 dark:border-slate-700"
            >
              Xuất Excel (.CSV)
            </Button>
          </Space>
        </div>
      </Card>

      {/* Header Info & Executive Summary Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="shadow-sm border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl"
            style={{ background: isDark ? 'rgba(6, 78, 59, 0.2)' : 'rgba(236, 253, 245, 0.8)' }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Tỷ Lệ Đạt Tuân Thủ
            </Text>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-300">
                {passRate}%
              </span>
              <Tag color="success" className="font-bold text-xs">
                {passRate >= 95 ? 'XUẤT SẮC' : passRate >= 85 ? 'ĐẠT' : 'CẦN CẢI THIỆN'}
              </Tag>
            </div>
            <Progress percent={passRate} showInfo={false} strokeColor="#10b981" size="small" className="mt-2" />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            className="shadow-sm border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl"
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              🟢 Tổng Số Mục PASSED (ĐẠT)
            </Text>
            <div className="text-3xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {totalPassed}{' '}
              <span className="text-xs font-normal text-slate-600 dark:text-slate-400">/ {totalItems}</span>
            </div>
            <Text className="text-[11px] text-slate-600 dark:text-slate-400 block mt-1">
              Tiêu chuẩn đạt 100% quy định
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            className="shadow-sm border border-rose-200/60 dark:border-rose-900/40 rounded-xl"
            style={{ background: isDark ? 'rgba(136, 19, 55, 0.2)' : 'rgba(255, 241, 242, 0.8)' }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
              🔴 Tổng Số Mục FAILED (LỖI)
            </Text>
            <div className="text-3xl font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
              {totalFailed}{' '}
              <span className="text-xs font-normal text-slate-600 dark:text-slate-400">/ {totalItems}</span>
            </div>
            <Text className="text-[11px] text-rose-600 dark:text-rose-400 block mt-1">Phát hiện vi phạm cần xử lý</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            className="shadow-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl"
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
              ⚪ Tổng Số Mục N/A (BỎ QUA)
            </Text>
            <div className="text-3xl font-extrabold tabular-nums text-slate-600 dark:text-slate-400">
              {totalNa} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">/ {totalItems}</span>
            </div>
            <Text className="text-[11px] text-slate-600 dark:text-slate-400 block mt-1">
              Không áp dụng ca kiểm tra này
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Main Full Audit Breakdown Table */}
      <Card
        className="shadow-sm border border-slate-200/80 dark:border-slate-800/80 rounded-xl"
        style={{ background: isDark ? '#141414' : '#ffffff' }}
        title={
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
              📋 BÁO CÁO CHI TIẾT 100% TIÊU CHÍ AUDIT CHI NHÁNH {selectedBranchCode}
            </span>
            <Text className="text-xs text-slate-600 dark:text-slate-400 font-normal">
              Auditor: <span className="font-semibold">{activeAuditRecord?.auditorName || 'Danny Do (QA Admin)'}</span>{' '}
              | Ca: <span className="font-semibold">{activeAuditRecord?.shift || 'Sáng'}</span>
            </Text>
          </div>
        }
      >
        <div className="mb-4">
          <Tabs
            activeKey={activeReportTab}
            onChange={(k) => setActiveReportTab(k as any)}
            type="card"
            items={[
              {
                key: 'FAILED',
                label: (
                  <span className="font-bold text-xs text-rose-600 flex items-center gap-1.5">
                    <CloseCircleOutlined /> 🔴 LỖI VI PHẠM FAILED ({failedItems.length})
                  </span>
                ),
              },
              {
                key: 'PASSED',
                label: (
                  <span className="font-bold text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircleOutlined /> 🟢 ĐẠT CHUẨN PASSED ({passedItems.length})
                  </span>
                ),
              },
              {
                key: 'NA',
                label: (
                  <span className="font-semibold text-xs text-slate-500 flex items-center gap-1.5">
                    <MinusCircleOutlined /> ⚪ KHÔNG ÁP DỤNG N/A ({naItems.length})
                  </span>
                ),
              },
              {
                key: 'ALL',
                label: (
                  <span className="font-semibold text-xs text-purple-600 flex items-center gap-1.5">
                    📋 TẤT CẢ TIÊU CHÍ ({allProcessedItems.length})
                  </span>
                ),
              },
            ]}
          />
        </div>

        <Table
          dataSource={displayedItems}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '20', '50', '100'],
            showTotal: (total, range) => (
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Hiển thị {range[0]}-{range[1]} / tổng {total} tiêu chí
              </span>
            ),
            onChange: (p, s) => {
              setCurrentPage(p);
              if (s && s !== pageSize) {
                setPageSize(s);
                setCurrentPage(1);
              }
            },
          }}
          className="antd-custom-table"
        />
      </Card>

      {/* Preview Proof Image Modal */}
      <Modal
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        width={650}
        title="📷 Bằng Chứng Ảnh Chụp Đợt Audit"
      >
        {previewImage && (
          <div className="text-center pt-2">
            <img
              src={previewImage}
              alt="Bằng chứng audit"
              className="max-h-[500px] mx-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-md"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
