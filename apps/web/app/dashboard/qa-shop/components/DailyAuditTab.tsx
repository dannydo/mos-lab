'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Collapse,
  Button,
  Radio,
  Segmented,
  Tag,
  Input,
  Select,
  DatePicker,
  Progress,
  Badge,
  Tooltip,
  Space,
  message,
  Alert,
  Divider,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  MinusCircleFilled,
  ExpandOutlined,
  CompressOutlined,
  FileExcelOutlined,
  CameraOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  CheckOutlined,
  CloseOutlined,
  MinusOutlined,
  BuildOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { QaChecklistTemplate, QaAuditResult, QaSeverity, QaShopBranchCode } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

interface DailyAuditTabProps {
  themeMode: string;
  onOpenImportDrawer: () => void;
  onAuditSubmitted: () => void;
}

interface ItemResultState {
  result: QaAuditResult;
  note?: string;
  photoUrl?: string;
  severity?: QaSeverity;
}

export interface ItemStatusToggleProps {
  itemId: string;
  itemTitle: string;
  value: QaAuditResult;
  onChange: (itemId: string, newResult: QaAuditResult) => void;
}

export const ItemStatusToggle: React.FC<ItemStatusToggleProps> = ({ itemId, itemTitle, value, onChange }) => {
  const isPass = value === 'PASS';
  const isFail = value === 'FAIL';
  const isNa = value === 'NA';

  return (
    <div
      role="group"
      aria-label={`Đánh giá tiêu chuẩn: ${itemTitle}`}
      className="flex items-center gap-1 self-start sm:self-center shrink-0"
    >
      <Tooltip title="Đạt quy chuẩn (PASS)">
        <button
          type="button"
          onClick={() => onChange(itemId, 'PASS')}
          aria-label={`Đánh giá Đạt cho tiêu chí ${itemTitle}`}
          aria-pressed={isPass}
          className={`p-1.5 rounded-md border transition-all duration-150 flex items-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
            isPass
              ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400 shadow-xs'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-emerald-500 hover:border-emerald-200'
          }`}
        >
          <CheckOutlined className="text-xs" />
          <span className="sr-only sm:not-sr-only text-[11px]">Đạt</span>
        </button>
      </Tooltip>

      <Tooltip title="Không đạt (FAIL)">
        <button
          type="button"
          onClick={() => onChange(itemId, 'FAIL')}
          aria-label={`Đánh giá Không đạt cho tiêu chí ${itemTitle}`}
          aria-pressed={isFail}
          className={`p-1.5 rounded-md border transition-all duration-150 flex items-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${
            isFail
              ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400 shadow-xs'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-rose-500 hover:border-rose-200'
          }`}
        >
          <CloseOutlined className="text-xs" />
          <span className="sr-only sm:not-sr-only text-[11px]">Không đạt</span>
        </button>
      </Tooltip>

      <Tooltip title="Không áp dụng (N/A)">
        <button
          type="button"
          onClick={() => onChange(itemId, 'NA')}
          aria-label={`Bỏ qua tiêu chí ${itemTitle}`}
          aria-pressed={isNa}
          className={`p-1.5 rounded-md border transition-all duration-150 flex items-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
            isNa
              ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shadow-xs'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600 hover:border-slate-300'
          }`}
        >
          <MinusOutlined className="text-xs" />
          <span className="sr-only sm:not-sr-only text-[11px]">N/A</span>
        </button>
      </Tooltip>
    </div>
  );
};

export interface SeverityDotIndicatorProps {
  severity?: QaSeverity | 'MID' | string;
}

export const SeverityDotIndicator: React.FC<SeverityDotIndicatorProps> = ({ severity = 'MEDIUM' }) => {
  const normSev = severity === 'MID' ? 'MEDIUM' : severity;

  let dotClass = 'bg-slate-400';
  let label = 'Trung bình';
  let displayCode = 'MID';

  switch (normSev) {
    case 'CRITICAL':
      dotClass = 'bg-red-500 animate-pulse';
      label = 'Cực kỳ nghiêm trọng';
      displayCode = 'CRITICAL';
      break;
    case 'HIGH':
      dotClass = 'bg-orange-500';
      label = 'Nghiêm trọng';
      displayCode = 'HIGH';
      break;
    case 'MEDIUM':
      dotClass = 'bg-amber-400';
      label = 'Trung bình';
      displayCode = 'MID';
      break;
    case 'LOW':
      dotClass = 'bg-sky-400';
      label = 'Thấp';
      displayCode = 'LOW';
      break;
  }

  return (
    <Tooltip title={`Mức độ ưu tiên: ${label}`}>
      <span className="inline-flex items-center gap-1.5 text-xs select-none">
        <span className={`w-2 h-2 rounded-full inline-block ${dotClass}`} aria-hidden="true" />
        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          {displayCode}
        </span>
      </span>
    </Tooltip>
  );
};

export const DailyAuditTab: React.FC<DailyAuditTabProps> = ({ themeMode, onOpenImportDrawer, onAuditSubmitted }) => {
  const [selectedBranch, setSelectedBranch] = useState<QaShopBranchCode>('DT');
  const [template, setTemplate] = useState<QaChecklistTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [shift, setShift] = useState<'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày'>('Sáng');
  const [auditDate, setAuditDate] = useState<dayjs.Dayjs>(dayjs());
  const [auditorName, setAuditorName] = useState<string>('Nguyễn Thị Minh QA');
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Accordion active keys
  const [activeAccordionKeys, setActiveAccordionKeys] = useState<string[]>([]);

  // Item inspection states: Map<itemId, ItemResultState>
  const [itemStates, setItemStates] = useState<Record<string, ItemResultState>>({});

  // Fetch Template when branch changes
  const fetchTemplate = useCallback(async (branch: QaShopBranchCode) => {
    try {
      setLoadingTemplate(true);
      const res = await apiClient.qaShop.getTemplates({ branchCode: branch });
      if (res && res.length > 0) {
        setTemplate(res[0]);
        // Default expand all sections
        const allSecKeys = res[0].sections.map((s) => s.id);
        setActiveAccordionKeys(allSecKeys);

        // Pre-fill default item states to PASS
        const initStates: Record<string, ItemResultState> = {};
        res[0].sections.forEach((sec) => {
          sec.items.forEach((itm) => {
            initStates[itm.id] = { result: 'PASS' };
          });
        });
        setItemStates(initStates);
      } else {
        setTemplate(null);
      }
    } catch (err) {
      console.error('Fetch template error:', err);
      message.error('Không thể tải mẫu kiểm tra cho chi nhánh này');
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplate(selectedBranch);
  }, [selectedBranch, fetchTemplate]);

  // Handle Result Change (PASS / FAIL / NA)
  const handleItemResultChange = (itemId: string, newResult: QaAuditResult) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        result: newResult,
        severity: newResult === 'FAIL' ? prev[itemId]?.severity || 'MEDIUM' : undefined,
      },
    }));
  };

  // Handle Item Note Change
  const handleItemNoteChange = (itemId: string, noteText: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        note: noteText,
      },
    }));
  };

  // Handle Item Photo Change
  const handleItemPhotoChange = (itemId: string, photoUrl: string) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        photoUrl,
      },
    }));
  };

  // Handle Item Severity Change
  const handleItemSeverityChange = (itemId: string, severity: QaSeverity) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        severity,
      },
    }));
  };

  // Expand / Collapse All Accordions
  const handleToggleExpandAll = () => {
    if (!template) return;
    if (activeAccordionKeys.length === template.sections.length) {
      setActiveAccordionKeys([]);
    } else {
      setActiveAccordionKeys(template.sections.map((s) => s.id));
    }
  };

  // Calculate Realtime Compliance Stats
  const stats = useMemo(() => {
    if (!template) return { total: 0, passed: 0, failed: 0, na: 0, score: 0, maxScore: 0, rate: 100 };

    let total = 0;
    let passed = 0;
    let failed = 0;
    let na = 0;
    let score = 0;
    let maxScore = 0;

    template.sections.forEach((sec) => {
      sec.items.forEach((itm) => {
        total++;
        const st = itemStates[itm.id];
        const res = st?.result || 'PASS';
        const weight = itm.weight || 1;

        if (res === 'PASS') {
          passed++;
          score += weight;
          maxScore += weight;
        } else if (res === 'FAIL') {
          failed++;
          maxScore += weight;
        } else {
          na++;
        }
      });
    });

    const rate = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 100;

    return { total, passed, failed, na, score, maxScore, rate };
  }, [template, itemStates]);

  // Submit Audit Form
  const handleSubmitAudit = async () => {
    if (!template) return;

    // Check if any FAIL item is missing photo/note
    const failWithoutNoteOrPhoto: string[] = [];
    template.sections.forEach((sec) => {
      sec.items.forEach((itm) => {
        const st = itemStates[itm.id];
        if (st?.result === 'FAIL') {
          if (itm.requirePhotoOnFail && !st.photoUrl) {
            failWithoutNoteOrPhoto.push(`[${itm.code}] ${itm.title} (Yêu cầu có ảnh bằng chứng)`);
          }
        }
      });
    });

    if (failWithoutNoteOrPhoto.length > 0) {
      message.warning(`Vui lòng tải ảnh bằng chứng cho các mục Không Đạt: ${failWithoutNoteOrPhoto.join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);
      const itemsPayload = Object.entries(itemStates).map(([itemId, st]) => ({
        itemId,
        result: st.result,
        note: st.note,
        photoUrls: st.photoUrl ? [st.photoUrl] : [],
        severity: st.severity,
      }));

      const auditRes = await apiClient.qaShop.saveAudit({
        templateId: template.id,
        branchCode: selectedBranch,
        auditorId: 'usr-qa-current',
        auditorName,
        auditDate: auditDate.format('YYYY-MM-DD'),
        shift,
        notes: generalNotes,
        items: itemsPayload,
      });

      message.success(
        `Đã gửi thành công Báo Cáo Audit ${auditRes.auditCode}! Đạt ${auditRes.complianceRate}% điểm tuân thủ.`
      );
      onAuditSubmitted();
    } catch (err: any) {
      console.error('Submit audit error:', err);
      message.error(err.message || 'Lỗi khi gửi báo cáo audit');
    } finally {
      setSubmitting(false);
    }
  };

  const getComplianceGradeTag = (rate: number) => {
    if (rate >= 95)
      return (
        <Tag color="success" className="font-bold px-3 py-1 text-xs uppercase">
          A+ Xuất Sắc
        </Tag>
      );
    if (rate >= 85)
      return (
        <Tag color="processing" className="font-bold px-3 py-1 text-xs uppercase">
          B Đạt Chấp Nhận
        </Tag>
      );
    return (
      <Tag color="error" className="font-bold px-3 py-1 text-xs uppercase">
        C Cần Cải Thiện
      </Tag>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {/* TOP CONTROL TOOLBAR & BRANCH SELECTOR */}
      <Card
        className={`shadow-sm border transition-all ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShopOutlined className="text-amber-500 text-lg" />
              <span className="font-bold text-base tracking-tight">Phiếu Đi Kiểm Tra Shop Mỗi Ngày (Daily Audit)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Chọn chi nhánh & thực hiện đánh giá tiêu chuẩn phân khu theo bộ tiêu chuẩn hệ thống.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <span className="text-xs font-semibold px-2 text-slate-600 dark:text-slate-400">Chi Nhánh:</span>
              <Segmented
                value={selectedBranch}
                onChange={(val) => setSelectedBranch(val as QaShopBranchCode)}
                options={[
                  { label: 'Đề Thám (DT)', value: 'DT' },
                  { label: 'Estella Place (EP)', value: 'EP' },
                  { label: 'Quận 7 (Q7)', value: 'Q7' },
                  { label: 'Tân Bình (TB)', value: 'TB' },
                ]}
              />
            </div>

            <Button
              icon={<FileExcelOutlined className="text-emerald-500" />}
              onClick={onOpenImportDrawer}
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              Quản Lý Tiêu Chí
            </Button>
          </div>
        </div>

        <Divider className="my-3" />

        {/* AUDIT METADATA INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Mã Template Áp Dụng:</label>
            <Tag color="blue" className="w-full text-center py-1 font-mono text-xs">
              {template?.code || `${selectedBranch}.Reception.DAILY.check`}
            </Tag>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Ngày Audit:</label>
            <DatePicker
              value={auditDate}
              onChange={(d) => d && setAuditDate(d)}
              format="DD/MM/YYYY"
              className="w-full"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Ca Kiểm Tra:</label>
            <Select
              value={shift}
              onChange={setShift}
              className="w-full"
              options={[
                { value: 'Sáng', label: 'Ca Sáng (09:00 - 13:00)' },
                { value: 'Chiều', label: 'Ca Chiều (13:00 - 17:00)' },
                { value: 'Tối', label: 'Ca Tối (17:00 - 21:00)' },
                { value: 'Toàn ngày', label: 'Tổng Kết Cuối Ngày' },
              ]}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">Nhân Sự QA Audit:</label>
            <Input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} placeholder="Tên nhân sự QA" />
          </div>
        </div>
      </Card>

      {/* REALTIME COMPLIANCE SCORE HEADER GAUGE */}
      <Card
        className={`shadow-sm border transition-all ${
          themeMode === 'dark'
            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-slate-800'
            : 'bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white border-emerald-100'
        }`}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <Progress
                type="dashboard"
                percent={stats.rate}
                width={84}
                strokeColor={stats.rate >= 95 ? '#10b981' : stats.rate >= 85 ? '#3b82f6' : '#ef4444'}
                format={() => <span className="tabular-nums font-black text-sm">{stats.rate}%</span>}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-600 dark:text-slate-400">
                  Tỷ lệ Tuân thủ Tạm tính (Compliance Score)
                </span>
                {getComplianceGradeTag(stats.rate)}
              </div>
              <div className="text-lg font-black tracking-tight mt-1 flex items-baseline gap-2">
                <span className="tabular-nums text-2xl text-emerald-600 dark:text-emerald-400">{stats.score}</span>
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  / {stats.maxScore} điểm trọng số
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-3 md:pt-0 md:pl-6">
            <div className="text-center px-3">
              <div className="text-xs text-slate-600 dark:text-slate-400">Tổng mục</div>
              <div className="tabular-nums font-bold text-base mt-0.5">{stats.total}</div>
            </div>
            <div className="text-center px-3 border-l border-slate-200 dark:border-slate-800">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircleFilled /> Đạt (Pass)
              </div>
              <div className="tabular-nums font-bold text-emerald-600 text-base mt-0.5">{stats.passed}</div>
            </div>
            <div className="text-center px-3 border-l border-slate-200 dark:border-slate-800">
              <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <CloseCircleFilled /> Không đạt (Fail)
              </div>
              <div className="tabular-nums font-bold text-rose-600 text-base mt-0.5">{stats.failed}</div>
            </div>
            <div className="text-center px-3 border-l border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <MinusCircleFilled /> N/A
              </div>
              <div className="tabular-nums font-bold text-slate-500 dark:text-slate-400 text-base mt-0.5">
                {stats.na}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              type="text"
              size="small"
              icon={
                activeAccordionKeys.length === (template?.sections.length || 0) ? (
                  <CompressOutlined />
                ) : (
                  <ExpandOutlined />
                )
              }
              onClick={handleToggleExpandAll}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
            >
              {activeAccordionKeys.length === (template?.sections.length || 0)
                ? 'Thu hẹp tất cả phân khu'
                : 'Mở rộng tất cả phân khu'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ACCORDION CHECKLIST SECTIONS */}
      {loadingTemplate ? (
        <Card className="text-center py-12">
          <div className="text-slate-500 text-sm">Đang tải bộ tiêu chuẩn kiểm tra...</div>
        </Card>
      ) : !template ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa có mẫu kiểm tra cho chi nhánh này"
          description="Bấm 'Quản Lý Tiêu Chí' ở trên để nạp tiêu chuẩn mới."
        />
      ) : (
        <Collapse
          activeKey={activeAccordionKeys}
          onChange={(keys) => setActiveAccordionKeys(typeof keys === 'string' ? [keys] : keys)}
          className={`custom-qa-accordion border-0 bg-transparent space-y-3`}
          expandIconPosition="end"
        >
          {template.sections.map((sec) => {
            const secPassed = sec.items.filter((i) => itemStates[i.id]?.result === 'PASS').length;
            const secFailed = sec.items.filter((i) => itemStates[i.id]?.result === 'FAIL').length;

            return (
              <Collapse.Panel
                key={sec.id}
                header={
                  <div className="flex items-center justify-between w-full pr-4 select-none">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BuildOutlined className="text-purple-500 text-xs" aria-hidden="true" />
                        {sec.title}
                      </span>
                      <Tag color="default" className="text-[11px] rounded-full px-2 tabular-nums">
                        {sec.items.length} tiêu chuẩn
                      </Tag>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tag color="emerald" className="text-[11px] m-0 tabular-nums">
                        {secPassed}/{sec.items.length} Đạt
                      </Tag>
                      {secFailed > 0 && (
                        <Tag color="error" className="text-[11px] m-0 font-bold animate-pulse tabular-nums">
                          {secFailed} Không Đạt
                        </Tag>
                      )}
                    </div>
                  </div>
                }
                className={`border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden shadow-xs transition-all ${
                  themeMode === 'dark' ? 'bg-slate-900 border-slate-800/60' : 'bg-white border-slate-200/60'
                }`}
              >
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sec.items.map((itm) => {
                    const st = itemStates[itm.id] || { result: 'PASS' };
                    const isFail = st.result === 'FAIL';

                    return (
                      <div
                        key={itm.id}
                        className={`p-4 transition-colors ${
                          isFail
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {/* ITEM HEADER & VECTOR TOGGLE RESULT SELECTOR */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag color="blue" className="font-mono font-semibold text-[11px] m-0">
                                {itm.code}
                              </Tag>
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{itm.title}</span>
                              <SeverityDotIndicator severity={itm.isCritical ? 'CRITICAL' : 'MEDIUM'} />
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums font-medium">
                                Trọng số: {itm.weight}đ
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {itm.standardRequirement}
                            </p>
                          </div>

                          {/* VECTOR TOGGLE BUTTONS */}
                          <ItemStatusToggle
                            itemId={itm.id}
                            itemTitle={itm.title}
                            value={st.result}
                            onChange={(itemId, newRes) => handleItemResultChange(itemId, newRes)}
                          />
                        </div>

                        {/* CONDITIONAL FAIL REMEDIATION DRAWER/BOX */}
                        {isFail && (
                          <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/60 space-y-3 animate-fadeIn">
                            <Alert
                              type="error"
                              showIcon
                              icon={<WarningOutlined />}
                              message={
                                <div className="flex items-center justify-between text-xs font-semibold">
                                  <span>Tự động phát hành Ticket Sự Cố cho Quản Lý Shop</span>
                                  <span className="text-[11px] text-rose-500 tabular-nums">Hạn khắc phục: 2 ngày</span>
                                </div>
                              }
                              className="py-1 px-3 text-xs"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                                  Lý do không đạt / Ghi chú vi phạm:
                                </label>
                                <Input.TextArea
                                  rows={2}
                                  value={st.note || ''}
                                  onChange={(e) => handleItemNoteChange(itm.id, e.target.value)}
                                  placeholder="Mô tả chi tiết vi phạm tại cửa hàng..."
                                  className="text-xs border-rose-200 dark:border-rose-900/60 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                                  Mức độ nghiêm trọng:
                                </label>
                                <Select
                                  value={st.severity || 'MEDIUM'}
                                  onChange={(val) => handleItemSeverityChange(itm.id, val as QaSeverity)}
                                  className="w-full text-xs"
                                  options={[
                                    { value: 'LOW', label: '🟢 Nhẹ (Low)' },
                                    { value: 'MEDIUM', label: '🟡 Trung bình (Medium)' },
                                    { value: 'HIGH', label: '🟠 Nghiêm trọng (High)' },
                                    { value: 'CRITICAL', label: '🔴 Cực kỳ nghiêm trọng (Critical)' },
                                  ]}
                                />

                                <div className="mt-2">
                                  <label className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                                    Ảnh bằng chứng {itm.requirePhotoOnFail && <span className="text-rose-500">*</span>}:
                                  </label>
                                  <Input
                                    size="small"
                                    prefix={<CameraOutlined className="text-slate-400" />}
                                    value={st.photoUrl || ''}
                                    onChange={(e) => handleItemPhotoChange(itm.id, e.target.value)}
                                    placeholder="Dán URL ảnh hoặc chụp bằng camera..."
                                    className="text-xs border-rose-200 dark:border-rose-900/60 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Collapse.Panel>
            );
          })}
        </Collapse>
      )}

      {/* GENERAL AUDIT NOTES CARD */}
      <Card
        className={`shadow-sm border border-slate-200/60 dark:border-slate-800/60 ${
          themeMode === 'dark' ? 'bg-slate-900 border-slate-800/60' : 'bg-white border-slate-200/60'
        }`}
        bodyStyle={{ padding: '16px' }}
      >
        <label className="font-bold text-sm block mb-1 text-slate-700 dark:text-slate-200">
          Ghi chú tổng kết chuyến đi Audit của QA:
        </label>
        <Input.TextArea
          rows={3}
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Nhập nhận xét chung về thái độ nhân sự, tình hình chi nhánh hoặc đề xuất cải tiến..."
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        />
      </Card>

      {/* STICKY FLOATING BOTTOM FOOTER */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md px-6 py-3 transition-all ${
          themeMode === 'dark'
            ? 'bg-slate-950/90 border-slate-800 text-white'
            : 'bg-white/90 border-slate-200 text-slate-800'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium">
                Tỷ lệ tuân thủ
              </div>
              <div className="tabular-nums text-xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.rate}%
              </div>
            </div>
            <Divider type="vertical" className="h-8" />
            <div className="hidden sm:block">
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Kết quả đánh giá</div>
              <div className="text-xs font-semibold flex items-center gap-2">
                <span className="text-emerald-600 font-bold tabular-nums">{stats.passed} Pass</span> •{' '}
                <span className="text-rose-600 font-bold tabular-nums">{stats.failed} Fail</span> •{' '}
                <span className="text-slate-600 dark:text-slate-400 tabular-nums">{stats.na} N/A</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmitAudit}
              className="bg-emerald-600 hover:bg-emerald-500 border-0 font-bold px-8 shadow-lg shadow-emerald-600/20 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Gửi Báo Cáo Audit Shop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
