'use client';

import React from 'react';
import { Collapse, Button, Modal, Empty } from 'antd';
import {
  DesktopOutlined,
  CheckOutlined,
  CloseOutlined,
  MinusOutlined,
  SaveOutlined,
  CameraOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';
import {
  GroupedArea,
  ItemStatusMap,
  InspectionStats,
  renderSeverityDot,
  formatReqWithoutArea,
} from '../types/qa-shop.types';
import { ItemNoteInput } from './ItemNoteInput';

interface QaMobileFocusOverlayProps {
  isMobileFocusMode: boolean;
  onCloseMobileFocusMode: () => void;
  selectedBranch: string;
  selectedShift: string;
  auditorName: string;
  inspectionStats: InspectionStats;
  hasRecordedInspectionResult: boolean;
  inspectionProgressLabel: string;
  activeTemplate: SafeAny | null;
  groupedAreas: GroupedArea[];
  itemStatuses: ItemStatusMap;
  setItemStatuses: React.Dispatch<React.SetStateAction<ItemStatusMap>>;
  itemNotesRef: React.MutableRefObject<Record<string, string>>;
  onSaveAudit: () => void;
  isSavingAudit: boolean;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => void;
}

export const QaMobileFocusOverlay: React.FC<QaMobileFocusOverlayProps> = ({
  isMobileFocusMode,
  onCloseMobileFocusMode,
  selectedBranch,
  selectedShift,
  auditorName,
  inspectionStats,
  hasRecordedInspectionResult,
  inspectionProgressLabel,
  activeTemplate,
  groupedAreas,
  itemStatuses,
  setItemStatuses,
  itemNotesRef,
  onSaveAudit,
  isSavingAudit,
  onFileInputChange,
}) => {
  if (!isMobileFocusMode) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* 1. Mobile Fixed Top Header Bar */}
      <div className="p-2 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
          <div className="leading-tight truncate">
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wide block truncate">
              {selectedBranch} · Ca {selectedShift}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              Auditor: {auditorName || 'Chưa chọn'} · Tổng {inspectionStats.total} tiêu chí
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums border"
            style={{
              color: !hasRecordedInspectionResult
                ? '#94a3b8'
                : inspectionStats.passRate >= 90
                  ? '#34d399'
                  : inspectionStats.passRate >= 80
                    ? '#fbbf24'
                    : '#f87171',
              borderColor: !hasRecordedInspectionResult
                ? 'rgba(148,163,184,0.3)'
                : inspectionStats.passRate >= 90
                  ? 'rgba(52,211,153,0.3)'
                  : inspectionStats.passRate >= 80
                    ? 'rgba(251,191,36,0.3)'
                    : 'rgba(248,113,113,0.3)',
              backgroundColor: 'rgba(15,23,42,0.8)',
            }}
          >
            {inspectionProgressLabel}
          </span>
          <Button
            size="small"
            icon={<DesktopOutlined />}
            onClick={onCloseMobileFocusMode}
            aria-label="Mở bảng điều khiển QA"
            title="Mở bảng điều khiển QA"
            className="text-xs font-semibold bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 shrink-0"
          />
        </div>
      </div>

      {/* 2. Mobile Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-1 py-1.5 space-y-2">
        {/* Informative Sub-header Banner */}
        <div className="p-1.5 px-2 rounded-lg bg-purple-950/40 border border-purple-800/60 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-purple-300 block">📋 Bảng Kiểm Tra Từng Phần</span>
            <span className="text-[11px] text-purple-400">
              {activeTemplate?.branchName || selectedBranch} · {inspectionStats.passed + inspectionStats.failed}/
              {inspectionStats.total} Tiêu chí đã chọn
            </span>
          </div>
          <div className="flex items-center gap-1 tabular-nums font-bold text-xs">
            <span className="text-emerald-400">{inspectionStats.passed} Đạt</span> ·{' '}
            <span className="text-rose-400">{inspectionStats.failed} Lỗi</span>
          </div>
        </div>

        {/* Accordion List for Core Store Areas */}
        {groupedAreas && groupedAreas.length > 0 ? (
          <Collapse
            defaultActiveKey={groupedAreas.map((a: GroupedArea) => a.id)}
            ghost
            className="space-y-1.5"
            items={groupedAreas.map((area: GroupedArea) => {
              let areaPassed = 0;
              let areaFailed = 0;

              area.subSections.forEach((sec: SafeAny) => {
                (sec.items || []).forEach((i: SafeAny) => {
                  const res = itemStatuses[i.id]?.result;
                  if (res === 'PASS') areaPassed++;
                  else if (res === 'FAIL') areaFailed++;
                });
              });

              const titleMatch = area.title.match(/^([^(]+)(?:\(([^)]+)\))?/);
              const mainAreaTitle = titleMatch ? titleMatch[1].trim() : area.title;
              const subAreaTitle = titleMatch && titleMatch[2] ? titleMatch[2].trim() : '';

              return {
                key: area.id,
                label: (
                  <div className="flex items-start justify-between py-0.5 w-full pr-1 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-100 leading-snug">{mainAreaTitle}</div>
                      {subAreaTitle && (
                        <div className="text-[11px] font-normal text-slate-400 leading-tight pt-0.5 line-clamp-1">
                          ({subAreaTitle})
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs shrink-0 pt-0.5">
                      <span className="text-emerald-400 font-semibold tabular-nums px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/60">
                        {areaPassed} Đạt
                      </span>
                      {areaFailed > 0 && (
                        <span className="text-rose-400 font-bold tabular-nums bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                          {areaFailed} Lỗi
                        </span>
                      )}
                    </div>
                  </div>
                ),
                children: (
                  <div className="space-y-1.5 pt-0.5">
                    {area.subSections.map((sec: SafeAny, secIdx: number) => {
                      const secItems = sec.items || [];
                      return (
                        <div key={sec.id || `m-sec-${secIdx}`} className="space-y-1">
                          <div className="text-xs font-bold text-purple-400 uppercase tracking-wide px-0.5 flex items-center justify-between">
                            <span>{sec.title}</span>
                            <span className="text-slate-500 font-normal">({secItems.length} tiêu chí)</span>
                          </div>

                          {secItems.map((itm: SafeAny) => {
                            const currentSt = itemStatuses[itm.id] || { result: undefined, note: '', photoUrl: '' };
                            const isFail = currentSt.result === 'FAIL';
                            const isPass = currentSt.result === 'PASS';
                            const isNa = currentSt.result === 'NA';

                            return (
                              <div
                                key={`m-itm-${itm.id}`}
                                className={`p-1.5 px-2 rounded-md border transition-all ${
                                  isFail
                                    ? 'bg-rose-950/40 border-rose-800/90 shadow-sm'
                                    : isPass
                                      ? 'bg-slate-900/90 border-emerald-900/60'
                                      : 'bg-slate-900/60 border-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2.5">
                                  {/* Left Side: Title on Line 1, Severity Dot + Metadata on Line 2 */}
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <div className="font-semibold text-xs text-slate-100 leading-snug break-words">
                                      {itm.title}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400 pt-0.5">
                                      {renderSeverityDot(itm.severity)}
                                      {itm.unitQty && itm.unitQty > 1 && (
                                        <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/60 tabular-nums">
                                          SL: {itm.unitQty}
                                        </span>
                                      )}
                                      {itm.standardRequirement && (
                                        <span className="line-clamp-1 text-slate-400">
                                          {formatReqWithoutArea(itm.standardRequirement)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Side: Compact 32px Icon-only Button Group */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemStatuses((prev) => ({
                                          ...prev,
                                          [itm.id]: { ...prev[itm.id], result: 'PASS' },
                                        }))
                                      }
                                      aria-label="Đạt"
                                      className={`w-10 h-10 rounded-md border font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                                        isPass
                                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      <CheckOutlined className="text-xs" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemStatuses((prev) => ({
                                          ...prev,
                                          [itm.id]: { ...prev[itm.id], result: 'FAIL' },
                                        }))
                                      }
                                      aria-label="Lỗi"
                                      className={`w-10 h-10 rounded-md border font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                                        isFail
                                          ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      <CloseOutlined className="text-xs" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemStatuses((prev) => ({
                                          ...prev,
                                          [itm.id]: { ...prev[itm.id], result: 'NA' },
                                        }))
                                      }
                                      aria-label="N/A"
                                      className={`h-10 min-w-10 px-2 rounded-md border font-bold text-xs flex items-center justify-center transition-all active:scale-95 ${
                                        isNa
                                          ? 'bg-slate-700 text-slate-100 border-slate-600 shadow-sm'
                                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      <MinusOutlined className="text-xs" />
                                    </button>
                                  </div>
                                </div>

                                {/* Failure details if FAIL */}
                                {isFail && (
                                  <div className="space-y-2.5 pt-2 mt-2 border-t border-rose-900/40">
                                    <ItemNoteInput
                                      itemId={itm.id}
                                      initialValue={currentSt.note || ''}
                                      notesRef={itemNotesRef}
                                      placeholder="Ghi chú lỗi chi tiết..."
                                      className="text-xs bg-slate-950 text-white border-rose-900/60 rounded-md focus:border-rose-500"
                                    />

                                    {/* Native Hidden Camera Input */}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      id={`mobile-camera-input-${itm.id}`}
                                      style={{ display: 'none' }}
                                      onChange={(e) => onFileInputChange(e, itm.id)}
                                    />

                                    {/* Native Hidden File Gallery Input */}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      id={`mobile-file-input-${itm.id}`}
                                      style={{ display: 'none' }}
                                      onChange={(e) => onFileInputChange(e, itm.id)}
                                    />

                                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                                      <div className="flex items-center gap-2 w-full">
                                        <label
                                          htmlFor={`mobile-camera-input-${itm.id}`}
                                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                                        >
                                          <CameraOutlined />
                                          <span>Chụp Ảnh</span>
                                        </label>

                                        <label
                                          htmlFor={`mobile-file-input-${itm.id}`}
                                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                                        >
                                          <CloudUploadOutlined />
                                          <span>Tải Ảnh Từ Máy</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* Thumbnail Image Preview */}
                                    {currentSt.photoUrl && (
                                      <div className="flex items-center gap-1.5 bg-emerald-950/60 p-1 px-1.5 rounded border border-emerald-800/80">
                                        <img
                                          src={currentSt.photoUrl}
                                          alt="Bằng chứng vi phạm"
                                          className="w-8 h-8 rounded object-cover border border-emerald-500 cursor-pointer active:scale-95 transition-transform"
                                          onClick={() => {
                                            Modal.info({
                                              title: `Bằng chứng vi phạm: ${itm.title}`,
                                              width: 500,
                                              content: (
                                                <div className="pt-2 text-center">
                                                  <img
                                                    src={currentSt.photoUrl}
                                                    alt="Bằng chứng"
                                                    className="max-h-[400px] mx-auto rounded border"
                                                  />
                                                </div>
                                              ),
                                            });
                                          }}
                                        />
                                        <span className="text-[10px] text-emerald-400 font-bold">✓ Đã đính ảnh</span>
                                        <Button
                                          size="small"
                                          type="text"
                                          danger
                                          icon={<CloseOutlined className="text-[10px]" />}
                                          onClick={() => {
                                            setItemStatuses((prev) => ({
                                              ...prev,
                                              [itm.id]: { ...prev[itm.id], photoUrl: undefined },
                                            }));
                                          }}
                                          className="w-5 h-5 flex items-center justify-center p-0 text-rose-400"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ),
              };
            })}
          />
        ) : (
          <Empty description="Chưa có dữ liệu tiêu chuẩn kiểm tra cho chi nhánh này." />
        )}
      </div>

      {/* 3. Mobile Sticky Bottom Action Bar */}
      <div className="p-1.5 px-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0 shadow-lg">
        <Button
          type="primary"
          size="large"
          icon={<SaveOutlined />}
          onClick={onSaveAudit}
          loading={isSavingAudit}
          disabled={isSavingAudit}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm h-12 rounded-xl"
        >
          {`Lưu Biên Bản (${inspectionProgressLabel})`}
        </Button>

        <Button
          size="large"
          icon={<DesktopOutlined />}
          onClick={onCloseMobileFocusMode}
          aria-label="Mở bảng điều khiển QA"
          title="Mở bảng điều khiển QA"
          className="bg-slate-800 text-slate-200 border-slate-700 font-semibold text-xs h-12 w-12 flex items-center justify-center p-0 rounded-xl shrink-0"
        />
      </div>
    </div>
  );
};
