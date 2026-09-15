'use client';

import React from 'react';
import { Modal, Drawer, Button, Tag, Space, Divider } from 'antd';
import {
  SafetyCertificateOutlined,
  CloseOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';
import { renderSeverityDot, renderAuditStatusTag } from '../../types/qa-shop.types';

interface AuditReviewModalProps {
  open: boolean;
  selectedAudit: SafeAny | null;
  isMobileScreen: boolean;
  reviewFilterTab: 'ALL' | 'PASS' | 'FAIL' | 'NA' | 'PHOTO';
  setReviewFilterTab: (tab: 'ALL' | 'PASS' | 'FAIL' | 'NA' | 'PHOTO') => void;
  onPreviewPhoto: (url: string) => void;
  onClose: () => void;
}

export const AuditReviewModal: React.FC<AuditReviewModalProps> = ({
  open,
  selectedAudit,
  isMobileScreen,
  reviewFilterTab,
  setReviewFilterTab,
  onPreviewPhoto,
  onClose,
}) => {
  if (!selectedAudit) return null;

  // Filter items in review based on reviewFilterTab
  const allAuditItems: SafeAny[] = selectedAudit.items || [];
  const filteredItems = allAuditItems.filter((itm: SafeAny) => {
    if (reviewFilterTab === 'PASS') return itm.result === 'PASS';
    if (reviewFilterTab === 'FAIL') return itm.result === 'FAIL';
    if (reviewFilterTab === 'NA') return itm.result === 'NA';
    if (reviewFilterTab === 'PHOTO') return itm.photoUrls && itm.photoUrls.length > 0;
    return true;
  });

  const passedCount = allAuditItems.filter((i) => i.result === 'PASS').length;
  const failedCount = allAuditItems.filter((i) => i.result === 'FAIL').length;
  const naCount = allAuditItems.filter((i) => i.result === 'NA').length;
  const photoCount = allAuditItems.filter((i) => i.photoUrls && i.photoUrls.length > 0).length;

  if (isMobileScreen) {
    return (
      <Drawer
        title={null}
        placement="bottom"
        height="100%"
        open={open}
        onClose={onClose}
        closable={false}
        zIndex={10050}
        styles={{ body: { padding: 0, backgroundColor: '#020617', color: '#f8fafc' } }}
        destroyOnHidden
        getContainer={() => document.body}
      >
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
          {/* 1. Mobile Sticky Top Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 shadow-md">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold">
                <SafetyCertificateOutlined />
                <span className="truncate">{selectedAudit.branchName}</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate pt-0.5">
                {selectedAudit.auditDate} · Ca {selectedAudit.shift || 'Sáng'} · {selectedAudit.auditorName}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Điểm</div>
                <div className="text-lg font-extrabold tabular-nums text-emerald-400 leading-none">
                  {(selectedAudit.overallScore || 90).toFixed(1)}
                </div>
              </div>
              <Button
                size="small"
                type="text"
                icon={<CloseOutlined className="text-slate-400 text-base" />}
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center p-0 text-slate-300 hover:text-white"
              />
            </div>
          </div>

          {/* 2. Mobile Filter Pills */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setReviewFilterTab('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                reviewFilterTab === 'ALL'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tất cả ({allAuditItems.length})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilterTab('FAIL')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                reviewFilterTab === 'FAIL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
              }`}
            >
              Không đạt ({failedCount})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilterTab('PASS')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                reviewFilterTab === 'PASS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
              }`}
            >
              Đạt ({passedCount})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilterTab('NA')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                reviewFilterTab === 'NA'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              N/A ({naCount})
            </button>
            <button
              type="button"
              onClick={() => setReviewFilterTab('PHOTO')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                reviewFilterTab === 'PHOTO'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-blue-400 hover:bg-slate-700'
              }`}
            >
              Có ảnh ({photoCount})
            </button>
          </div>

          {/* 3. Mobile Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">Không có tiêu chí nào phù hợp với bộ lọc.</div>
            ) : (
              filteredItems.map((itm: SafeAny, idx: number) => {
                const isFail = itm.result === 'FAIL';
                const isPass = itm.result === 'PASS';
                const isNa = itm.result === 'NA';

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      isFail
                        ? 'bg-rose-950/40 border-rose-900/80 text-rose-100'
                        : isPass
                          ? 'bg-slate-900/70 border-slate-800/80 text-slate-200'
                          : 'bg-slate-900/40 border-slate-800/50 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold leading-snug line-clamp-2">
                          {itm.itemTitle || itm.title || itm.itemId}
                        </div>
                        {itm.secTitle && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">[{itm.secTitle}]</div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {isFail && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            KHÔNG ĐẠT
                          </span>
                        )}
                        {isPass && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ĐẠT
                          </span>
                        )}
                        {isNa && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/40">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>

                    {itm.note && (
                      <div className="mt-2 p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                        <span className="font-semibold text-rose-400">Ghi chú: </span>
                        {itm.note}
                      </div>
                    )}

                    {itm.photoUrls && itm.photoUrls.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 overflow-x-auto py-1">
                        {itm.photoUrls.map((url: string, pIdx: number) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => onPreviewPhoto(url)}
                            className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Mobile Bottom Action Bar */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <Button
              onClick={onClose}
              className="flex-1 bg-slate-800 text-slate-200 border-slate-700 font-semibold text-xs h-11 rounded-xl"
            >
              Đóng
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
              className="flex-1 bg-amber-600 hover:bg-amber-500 font-bold text-xs h-11 rounded-xl border-none"
            >
              In / Xuất PDF
            </Button>
          </div>
        </div>
      </Drawer>
    );
  }

  // Desktop Modal view
  return (
    <Modal
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <SafetyCertificateOutlined className="text-purple-600 dark:text-purple-400" />
            Chi Tiết Biên Bản Kiểm Tra {selectedAudit?.id || ''}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {selectedAudit.branchName} · Ngày {selectedAudit.auditDate} · Ca {selectedAudit.shift || 'Sáng'}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={980}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
          In / Xuất PDF
        </Button>,
      ]}
      destroyOnHidden
      zIndex={10050}
      getContainer={() => document.body}
    >
      <div className="space-y-4 py-2">
        {/* Summary Top Banner */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedAudit.branchName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Người kiểm tra:{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAudit.auditorName}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Thời gian: {selectedAudit.auditDate} (Ca {selectedAudit.shift || 'Sáng'})
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-slate-500 dark:text-slate-400">Trạng thái</div>
              <div className="mt-1">{renderAuditStatusTag(selectedAudit.status, selectedAudit)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Điểm đánh giá</div>
              <div className="text-2xl font-extrabold text-emerald-500 tabular-nums">
                {(selectedAudit.overallScore || 90).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Button
            size="small"
            type={reviewFilterTab === 'ALL' ? 'primary' : 'default'}
            onClick={() => setReviewFilterTab('ALL')}
          >
            Tất cả ({allAuditItems.length})
          </Button>
          <Button
            size="small"
            danger={reviewFilterTab === 'FAIL'}
            type={reviewFilterTab === 'FAIL' ? 'primary' : 'default'}
            onClick={() => setReviewFilterTab('FAIL')}
          >
            Không đạt ({failedCount})
          </Button>
          <Button
            size="small"
            type={reviewFilterTab === 'PASS' ? 'primary' : 'default'}
            onClick={() => setReviewFilterTab('PASS')}
          >
            Đạt ({passedCount})
          </Button>
          <Button
            size="small"
            type={reviewFilterTab === 'NA' ? 'primary' : 'default'}
            onClick={() => setReviewFilterTab('NA')}
          >
            N/A ({naCount})
          </Button>
          <Button
            size="small"
            type={reviewFilterTab === 'PHOTO' ? 'primary' : 'default'}
            icon={<PictureOutlined />}
            onClick={() => setReviewFilterTab('PHOTO')}
          >
            Có ảnh ({photoCount})
          </Button>
        </div>

        {/* Items List */}
        <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
          {filteredItems.map((itm: SafeAny, idx: number) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                itm.result === 'FAIL'
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {itm.itemTitle || itm.title || itm.itemId}
                </div>
                {itm.secTitle && <div className="text-[11px] text-slate-500">[{itm.secTitle}]</div>}
                {itm.note && <div className="text-xs text-rose-600 dark:text-rose-400 mt-1">Ghi chú: {itm.note}</div>}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                {itm.result === 'FAIL' && <Tag color="error">KHÔNG ĐẠT</Tag>}
                {itm.result === 'PASS' && <Tag color="success">ĐẠT</Tag>}
                {itm.result === 'NA' && <Tag color="default">N/A</Tag>}
                {itm.photoUrls && itm.photoUrls.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {itm.photoUrls.map((url: string, pIdx: number) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => onPreviewPhoto(url)}
                        className="w-10 h-10 rounded border border-slate-200 overflow-hidden hover:opacity-80"
                      >
                        <img src={url} alt="Bằng chứng" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
