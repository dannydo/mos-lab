'use client';

import React from 'react';
import { Row, Col, Button, Select, Radio, Tooltip, Typography, Progress } from 'antd';
import {
  SafetyCertificateOutlined,
  SaveOutlined,
  ReloadOutlined,
  TrophyOutlined,
  FileTextOutlined,
  AlertOutlined,
  MobileOutlined,
  SettingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ToolbarToggle } from '../../ui';
import { STORE_BRANCHES, InspectionStats, QaStaffMember } from '../types/qa-shop.types';
import { QaSoftAlertStrip } from './QaSoftAlertStrip';
import styles from '../qa-shop.module.css';

const { Title, Text, Paragraph } = Typography;

interface QaHeaderMetricsProps {
  isDark: boolean;
  analytics: SafeAny;
  auditsCount: number;
  openTicketsCount: number;
  isSavingAudit: boolean;
  onSaveAudit: () => void;
  onRefresh: () => void;
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
  selectedShift: 'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày';
  onSelectShift: (shift: 'Sáng' | 'Chiều' | 'Tối' | 'Toàn ngày') => void;
  auditorName: string;
  onSelectAuditor: (name: string) => void;
  qaStaffList: QaStaffMember[];
  isMobileFocusMode: boolean;
  onToggleMobileFocusMode: () => void;
  isMobileScreen: boolean;
  requireAllPhotos: boolean;
  onToggleRequireAllPhotos: (checked: boolean) => void;
  isEditMode: boolean;
  onToggleEditMode: (checked: boolean) => void;
  onOpenManageModal: () => void;
  onOpenAddItemModal: () => void;
  inspectionStats: InspectionStats;
  hasRecordedInspectionResult: boolean;
  inspectionProgressLabel: string;
}

export const QaHeaderMetrics: React.FC<QaHeaderMetricsProps> = ({
  isDark,
  analytics,
  auditsCount,
  openTicketsCount,
  isSavingAudit,
  onSaveAudit,
  onRefresh,
  selectedBranch,
  onSelectBranch,
  selectedShift,
  onSelectShift,
  auditorName,
  onSelectAuditor,
  qaStaffList,
  isMobileFocusMode,
  onToggleMobileFocusMode,
  isMobileScreen,
  requireAllPhotos,
  onToggleRequireAllPhotos,
  isEditMode,
  onToggleEditMode,
  onOpenManageModal,
  onOpenAddItemModal,
  inspectionStats,
  hasRecordedInspectionResult,
  inspectionProgressLabel,
}) => {
  return (
    <>
      {/* Minimalist Top Navigation Header */}
      <div
        className={`${styles.pageHeader} rounded-xl p-4 sm:p-5 border transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
        style={{
          background: isDark ? '#141414' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e2e8f0',
        }}
      >
        <div className={`${styles.headerContent} space-y-0.5`}>
          <div className="flex items-center gap-2">
            <SafetyCertificateOutlined className="text-xl text-purple-500" />
            <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
              QA & QC Shop Inspection
            </Title>
          </div>
          <Paragraph className="text-slate-600 dark:text-slate-400 text-xs mb-0">
            Bảng kiểm tra chất lượng cửa hàng phân chia theo từng phần (Quầy lễ tân, Sảnh đón, Toilet, Giường mi 1..N)
            hệ thống tiêu chuẩn nội bộ.
          </Paragraph>
        </div>

        <div className={styles.headerActions}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            style={{
              background: '#10b981',
              borderColor: 'transparent',
              borderRadius: '8px',
              color: '#052e16',
              fontWeight: 500,
            }}
            className="focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:outline-none"
            onClick={onSaveAudit}
            loading={isSavingAudit}
            disabled={isSavingAudit}
          >
            Lưu Biên Bản
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            style={{ borderRadius: '8px' }}
            className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 focus-visible:outline-none"
            aria-label="Tải lại dữ liệu"
          />
        </div>
      </div>

      {/* Flat Minimal Stat Cards */}
      <Row gutter={[12, 12]} className={styles.statsGrid}>
        <Col xs={24} sm={12} lg={6}>
          <div
            className={`${styles.statCard} p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none`}
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Điểm QA Trung Bình
                </span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums tracking-tight">
                  {analytics?.averageScore ? analytics.averageScore.toFixed(1) : '94.2'}{' '}
                  <span className="text-xs font-normal text-slate-500">/100</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
                <TrophyOutlined className="text-emerald-600 dark:text-emerald-400 text-base" />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className={`${styles.statCard} p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none`}
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Biên Bản Đã Kiểm Tra
                </span>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums tracking-tight">
                  {auditsCount || 28} <span className="text-xs font-normal text-slate-500">đợt</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center shrink-0">
                <FileTextOutlined className="text-blue-600 dark:text-blue-400 text-base" />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className={`${styles.statCard} p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none`}
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Tỷ Lệ Đạt Tuân Thủ
                </span>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5 tabular-nums tracking-tight">
                  {analytics?.complianceRate ? `${analytics.complianceRate}%` : '96.4%'}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center shrink-0">
                <SafetyCertificateOutlined className="text-purple-600 dark:text-purple-400 text-base" />
              </div>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div
            className={`${styles.statCard} p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-none`}
            style={{ background: isDark ? '#141414' : '#ffffff' }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Lỗi Vi Phạm Cần Xử Lý
                </span>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums tracking-tight">
                  {openTicketsCount || 3} <span className="text-xs font-normal text-slate-500">lỗi</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50 flex items-center justify-center shrink-0">
                <AlertOutlined className="text-rose-600 dark:text-rose-400 text-base" />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Interactive Inspection Control & Live Score Bar */}
      <div
        className={`${styles.controlsPanel} p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-all duration-200`}
        style={{ background: isDark ? '#141414' : '#ffffff' }}
      >
        <div className="space-y-3">
          <div className={styles.controlsLayout}>
            <div className={styles.primaryControls}>
              <div className={styles.controlGroup}>
                <Text className={`${styles.controlLabel} text-slate-600 dark:text-slate-400`}>Chi Nhánh Kiểm Tra:</Text>
                <Select
                  aria-label="Chi nhánh kiểm tra"
                  value={selectedBranch}
                  onChange={onSelectBranch}
                  className={styles.branchSelect}
                  style={{ width: 250 }}
                  options={STORE_BRANCHES.map((b) => ({
                    value: b.code,
                    label: b.name,
                  }))}
                />
              </div>

              <div className={styles.controlGroup}>
                <Text className={`${styles.controlLabel} text-slate-600 dark:text-slate-400`}>Ca Kiểm Tra:</Text>
                <Radio.Group value={selectedShift} onChange={(e) => onSelectShift(e.target.value)} buttonStyle="solid">
                  <Radio.Button value="Sáng">Sáng</Radio.Button>
                  <Radio.Button value="Chiều">Chiều</Radio.Button>
                  <Radio.Button value="Tối">Tối</Radio.Button>
                  <Radio.Button value="Toàn ngày">Cả Ngày</Radio.Button>
                </Radio.Group>
              </div>

              <div className={styles.controlGroup}>
                <Text className={`${styles.controlLabel} text-slate-600 dark:text-slate-400`}>Auditor (QA & QC):</Text>
                <Select
                  aria-label="Auditor kiểm tra"
                  value={auditorName}
                  onChange={onSelectAuditor}
                  className={styles.auditorSelect}
                  style={{ width: 220 }}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
                  options={qaStaffList.map((s) => ({
                    value: s.displayName,
                    label: s.role ? `${s.displayName} (${s.role})` : s.displayName,
                  }))}
                />
              </div>

              <div className={`${styles.controlGroup} ${styles.quickCheckGroup}`}>
                <Text className={`${styles.controlLabel} text-slate-600 dark:text-slate-400`}>Kiểm Tra Nhanh:</Text>
                <Tooltip title="Bật Chế độ Mobile tập trung (Full-screen Mobile Inspection Mode) ẩn Sidebar & Clutter">
                  <Button
                    icon={<MobileOutlined className="text-purple-500" />}
                    onClick={onToggleMobileFocusMode}
                    className={`${styles.mobileFocusButton} ${
                      isMobileFocusMode
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                    }`}
                  >
                    {isMobileFocusMode
                      ? 'Đang ở chế độ kiểm tra nhanh'
                      : isMobileScreen
                        ? 'Mở chế độ kiểm tra nhanh'
                        : 'Mobile Focus Mode'}
                  </Button>
                </Tooltip>
              </div>

              <div className={styles.controlGroup}>
                <Text className={`${styles.controlLabel} text-slate-600 dark:text-slate-400`}>Audit Đột Xuất:</Text>
                <ToolbarToggle
                  className={`${styles.toggleControl} ${
                    requireAllPhotos
                      ? 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'border-slate-200 bg-transparent text-slate-500 dark:border-slate-700'
                  }`}
                  label={requireAllPhotos ? 'Ép chụp ảnh 100%' : 'Chụp thường'}
                  aria-label="Bật hoặc tắt yêu cầu chụp ảnh 100%"
                  checked={requireAllPhotos}
                  onChange={onToggleRequireAllPhotos}
                />
              </div>

              <div className={styles.controlGroup}>
                <Text className={`${styles.controlLabel} text-slate-600 dark:text-slate-400`}>Chế Độ Chỉnh Sửa:</Text>
                <div className={styles.editControls}>
                  <ToolbarToggle
                    className={`${styles.toggleControl} ${isEditMode ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                    label={isEditMode ? 'Cho phép chỉnh sửa' : 'Chỉ xem'}
                    aria-label="Bật hoặc tắt chế độ chỉnh sửa"
                    checked={isEditMode}
                    onChange={onToggleEditMode}
                  />

                  {isEditMode && (
                    <>
                      <Button icon={<SettingOutlined />} onClick={onOpenManageModal} className="text-xs font-medium">
                        Bảng Quản Lý
                      </Button>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={onOpenAddItemModal}
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 border-none"
                      >
                        Thêm Mới
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.scoreSummary}>
              <span className={`${styles.scoreLabel} text-slate-600 dark:text-slate-400`}>Tỷ lệ đạt:</span>
              <span
                className={hasRecordedInspectionResult ? 'text-xl font-bold tabular-nums' : styles.pendingScoreValue}
                style={{
                  color: !hasRecordedInspectionResult
                    ? isDark
                      ? '#94a3b8'
                      : '#64748b'
                    : inspectionStats.passRate >= 90
                      ? '#10b981'
                      : inspectionStats.passRate >= 80
                        ? '#f59e0b'
                        : '#ef4444',
                }}
              >
                {inspectionProgressLabel}
              </span>
              <div className="flex gap-1.5 ml-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {inspectionStats.passed} Đạt
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 tabular-nums">
                  {inspectionStats.failed} Lỗi
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 tabular-nums">
                  {inspectionStats.na} N/A
                </span>
              </div>
            </div>
          </div>

          {hasRecordedInspectionResult ? (
            <Progress
              percent={inspectionStats.passRate}
              strokeColor={
                inspectionStats.passRate >= 90 ? '#10b981' : inspectionStats.passRate >= 80 ? '#f59e0b' : '#ef4444'
              }
              size="small"
              showInfo={false}
            />
          ) : (
            <div className={`${styles.pendingHint} text-xs text-slate-500 dark:text-slate-400`}>
              Chọn Đạt, Lỗi hoặc N/A để bắt đầu chấm.
            </div>
          )}

          {/* Soft Alert Strip for Failed Items */}
          <QaSoftAlertStrip inspectionStats={inspectionStats} />
        </div>
      </div>
    </>
  );
};
