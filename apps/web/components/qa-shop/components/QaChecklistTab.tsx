'use client';

import React from 'react';
import { Collapse, Button, Tooltip, Typography, InputNumber, Popconfirm, Modal, Empty } from 'antd';
import {
  BuildOutlined,
  CheckOutlined,
  CloseOutlined,
  MinusOutlined,
  EditOutlined,
  DeleteOutlined,
  CameraOutlined,
  CloudUploadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';
import { GroupedArea, ItemStatusMap, renderSeverityDot } from '../types/qa-shop.types';
import { ItemNoteInput } from './ItemNoteInput';
import styles from '../qa-shop.module.css';

const { Title, Text } = Typography;

interface QaChecklistTabProps {
  activeTemplate: SafeAny | null;
  selectedBranch: string;
  groupedAreas: GroupedArea[];
  itemStatuses: ItemStatusMap;
  setItemStatuses: React.Dispatch<React.SetStateAction<ItemStatusMap>>;
  itemNotesRef: React.MutableRefObject<Record<string, string>>;
  requireAllPhotos: boolean;
  isEditMode: boolean;
  onOpenItemModal: (item?: SafeAny, sectionId?: string) => void;
  onDeleteItem: (itemId: string) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => void;
}

export const QaChecklistTab: React.FC<QaChecklistTabProps> = ({
  activeTemplate,
  selectedBranch,
  groupedAreas,
  itemStatuses,
  setItemStatuses,
  itemNotesRef,
  requireAllPhotos,
  isEditMode,
  onOpenItemModal,
  onDeleteItem,
  onFileInputChange,
}) => {
  return (
    <div className="space-y-4 py-2">
      <div className={`${styles.checklistHeading} flex items-center justify-between`}>
        <div>
          <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
            {(activeTemplate?.title || `Bộ Tiêu Chuẩn Kiểm Tra Chi Nhánh ${selectedBranch}`)
              .replace(/\s*-?\s*Daily Shop Inspection Standard.*$/gi, '')
              .replace(/\s*\(Google Sheet Synced\)/gi, '')}
          </Title>
          <Text className="text-xs text-slate-600 dark:text-slate-400">
            {(
              activeTemplate?.description ||
              'Bộ tiêu chuẩn kiểm tra chất lượng vệ sinh & vận hành cửa hàng chuẩn nội bộ'
            ).replace(
              /Mẫu tiêu chí kiểm tra cửa hàng đồng bộ từ Google Sheet tab [A-Za-z0-9_\.]+/gi,
              'Bộ tiêu chuẩn kiểm tra chất lượng vệ sinh & vận hành cửa hàng chuẩn nội bộ'
            )}
          </Text>
        </div>
        <span
          className={`${styles.checklistCount} text-xs text-slate-600 dark:text-slate-400 font-medium tabular-nums`}
        >
          {activeTemplate?.sections?.length || 0} Nhóm Khu Vực
        </span>
      </div>

      {groupedAreas && groupedAreas.length > 0 ? (
        <Collapse
          defaultActiveKey={['area-lobby', 'area-lashroom']}
          ghost
          className="antd-minimal-collapse"
          items={groupedAreas.map((area: GroupedArea) => {
            let areaPassed = 0;
            let areaFailed = 0;
            let areaNa = 0;

            area.subSections.forEach((sec: SafeAny) => {
              (sec.items || []).forEach((i: SafeAny) => {
                const res = itemStatuses[i.id]?.result;
                if (res === 'PASS') areaPassed++;
                else if (res === 'FAIL') areaFailed++;
                else if (res === 'NA') areaNa++;
              });
            });

            const areaFailedPercent = area.totalItems > 0 ? Math.round((areaFailed / area.totalItems) * 100) : 0;
            const areaTitle = area.title.split('(')[0].trim();
            const areaDescription = area.title.match(/\((.*)\)/)?.[1]?.trim();

            return {
              key: area.id,
              label: (
                <div className={`${styles.areaHeading} flex items-center justify-between w-full pr-2`}>
                  <div className={styles.areaLabel}>
                    <span className={styles.areaTitle}>{areaTitle}</span>
                    {areaDescription && <span className={styles.areaDescription}>{areaDescription}</span>}
                    <span className={`${styles.areaMeta} tabular-nums`}>
                      {area.subSections.length} nhóm nhỏ · {area.totalItems} tiêu chí
                    </span>
                  </div>
                  <div className={`${styles.areaStats} flex items-center gap-2 text-xs`}>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums border border-emerald-500/20">
                      {areaPassed} Đạt
                    </span>
                    {areaFailed > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold tabular-nums border border-rose-500/20 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        {areaFailed} Không đạt ({areaFailedPercent}%)
                      </span>
                    )}
                    {areaNa > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 tabular-nums border border-slate-500/20">
                        {areaNa} N/A
                      </span>
                    )}
                  </div>
                </div>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  {area.subSections.map((sec: SafeAny, secIdx: number) => {
                    const secItems = sec.items || [];
                    const secPassed = secItems.filter((i: SafeAny) => itemStatuses[i.id]?.result === 'PASS').length;
                    const secFailed = secItems.filter((i: SafeAny) => itemStatuses[i.id]?.result === 'FAIL').length;
                    const secNa = secItems.filter((i: SafeAny) => itemStatuses[i.id]?.result === 'NA').length;
                    const secFailedPercent = secItems.length > 0 ? Math.round((secFailed / secItems.length) * 100) : 0;

                    return (
                      <div key={sec.id || `sec-${secIdx}`} className="space-y-2">
                        {/* Sub-section Header */}
                        <div
                          className={`${styles.subsectionHeader} flex items-center justify-between px-2.5 py-1 bg-slate-100/70 dark:bg-slate-800/50 rounded-md border border-slate-200/60 dark:border-slate-800/60`}
                        >
                          <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                            <BuildOutlined className="text-purple-500 text-xs" />
                            {sec.title}
                            <span className="text-slate-600 dark:text-slate-400 font-normal text-[11px] lowercase">
                              ({secItems.length} tiêu chí)
                            </span>
                          </span>
                          <div className={`${styles.subsectionMeta} flex items-center gap-1.5 text-[11px]`}>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                              {secPassed} Đạt
                            </span>
                            {secFailed > 0 && (
                              <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                                · {secFailed} Lỗi ({secFailedPercent}%)
                              </span>
                            )}
                            {secNa > 0 && <span className="text-slate-400 tabular-nums">· {secNa} N/A</span>}
                            {isEditMode && (
                              <Button
                                size="small"
                                type="text"
                                icon={<PlusOutlined className="text-xs text-blue-600 dark:text-blue-400" />}
                                onClick={() => onOpenItemModal(undefined, sec.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-1.5 py-0 h-6 font-medium ml-1.5 rounded"
                              >
                                Thêm
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Checklist Item Cards */}
                        <div className="space-y-2 pl-1">
                          {secItems.map((itm: SafeAny) => {
                            const currentSt = itemStatuses[itm.id] || {
                              result: undefined,
                              note: '',
                              photoUrl: '',
                            };
                            const isFail = currentSt.result === 'FAIL';
                            const isPass = currentSt.result === 'PASS';
                            const isNa = currentSt.result === 'NA';

                            let rawTitle = (itm.title || '').replace(/\s*\[[A-Z0-9_\s]+\]\s*$/gi, '').trim();
                            let subject = rawTitle;
                            let detailRequirement = '';

                            if (rawTitle.includes(' - ')) {
                              const parts = rawTitle.split(' - ');
                              subject = parts[0].trim();
                              detailRequirement = parts.slice(1).join(' - ').trim();
                            } else if (rawTitle.includes(' – ')) {
                              const parts = rawTitle.split(' – ');
                              subject = parts[0].trim();
                              detailRequirement = parts.slice(1).join(' – ').trim();
                            }

                            let totalQty = 1;
                            let unitQty = '';
                            if (itm.standardRequirement) {
                              const match = itm.standardRequirement.match(/Đơn vị:\s*([0-9]+)/i);
                              if (match && match[1]) {
                                totalQty = parseInt(match[1], 10) || 1;
                                if (match[1] !== '1') {
                                  unitQty = `SL: ${match[1]}`;
                                }
                              }
                            }

                            const area = itm.area ? itm.area.trim() : '';

                            return (
                              <div
                                key={itm.id}
                                className={`${styles.checklistItem} py-2 px-3 rounded-lg border transition-all duration-150 ${
                                  isFail
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
                                    : 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                {/* Line 1: Header Row (Subject & Badges + Pure Icon-Only Buttons) */}
                                <div
                                  className={`${styles.checklistItemHeader} flex items-center justify-between gap-2`}
                                >
                                  <div className={`${styles.itemTitleGroup} flex items-center gap-2 flex-wrap min-w-0`}>
                                    {renderSeverityDot(itm.severity)}
                                    <Text className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                      {subject}
                                    </Text>
                                    {unitQty && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tabular-nums shrink-0">
                                        {unitQty}
                                      </span>
                                    )}
                                    {area && (
                                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wide shrink-0">
                                        [{area}]
                                      </span>
                                    )}
                                  </div>

                                  {/* Minimal Vector Pure Icon-Only Toggle Bar */}
                                  <div
                                    role="group"
                                    aria-label={`Đánh giá tiêu chuẩn: ${itm.title}`}
                                    className={`${styles.statusToggle} flex items-center gap-1 shrink-0`}
                                  >
                                    <Tooltip title="Đạt quy chuẩn (PASS)">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setItemStatuses((prev) => ({
                                            ...prev,
                                            [itm.id]: { ...prev[itm.id], result: 'PASS' },
                                          }))
                                        }
                                        aria-label={`Đánh giá Đạt cho tiêu chí ${itm.title}`}
                                        aria-pressed={isPass}
                                        className={`w-8 h-8 rounded-md border transition-all duration-150 flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
                                          isPass
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-400 shadow-xs'
                                            : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-emerald-500 hover:border-emerald-300'
                                        }`}
                                      >
                                        <CheckOutlined className="text-xs" />
                                        <span className="sr-only">Đạt</span>
                                      </button>
                                    </Tooltip>

                                    <Tooltip title="Không đạt (FAIL)">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const curQty = currentSt.failedQty ?? totalQty;
                                          const curPct =
                                            currentSt.failedPercent ?? Math.round((curQty / totalQty) * 100);
                                          setItemStatuses((prev) => ({
                                            ...prev,
                                            [itm.id]: {
                                              ...prev[itm.id],
                                              result: 'FAIL',
                                              failedQty: curQty,
                                              failedPercent: curPct,
                                            },
                                          }));
                                        }}
                                        aria-label={`Đánh giá Không đạt cho tiêu chí ${itm.title}`}
                                        aria-pressed={isFail}
                                        className={`w-8 h-8 rounded-md border transition-all duration-150 flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${
                                          isFail
                                            ? 'bg-rose-50 text-rose-600 border-rose-400 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-400 shadow-xs'
                                            : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-rose-500 hover:border-rose-300'
                                        }`}
                                      >
                                        <CloseOutlined className="text-xs" />
                                        <span className="sr-only">Không đạt</span>
                                      </button>
                                    </Tooltip>

                                    <Tooltip title="Không áp dụng (N/A)">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setItemStatuses((prev) => ({
                                            ...prev,
                                            [itm.id]: { ...prev[itm.id], result: 'NA' },
                                          }))
                                        }
                                        aria-label={`Bỏ qua tiêu chí ${itm.title}`}
                                        aria-pressed={isNa}
                                        className={`w-8 h-8 rounded-md border transition-all duration-150 flex items-center justify-center text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
                                          isNa
                                            ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shadow-xs'
                                            : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600 hover:border-slate-300'
                                        }`}
                                      >
                                        <MinusOutlined className="text-xs" />
                                        <span className="sr-only">N/A</span>
                                      </button>
                                    </Tooltip>

                                    {isEditMode && (
                                      <>
                                        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
                                        <Tooltip title="Chỉnh sửa tiêu chí này">
                                          <button
                                            type="button"
                                            onClick={() => onOpenItemModal(itm, sec.id)}
                                            aria-label={`Chỉnh sửa tiêu chí ${itm.title}`}
                                            className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex items-center justify-center text-xs"
                                          >
                                            <EditOutlined className="text-xs" />
                                          </button>
                                        </Tooltip>

                                        <Popconfirm
                                          title="Xóa tiêu chí kiểm tra?"
                                          description="Bạn có chắc chắn muốn xóa tiêu chí này khỏi bộ quy chuẩn?"
                                          onConfirm={() => onDeleteItem(itm.id)}
                                          okText="Xóa"
                                          cancelText="Hủy"
                                          okButtonProps={{ danger: true, size: 'small' }}
                                          cancelButtonProps={{ size: 'small' }}
                                        >
                                          <Tooltip title="Xóa tiêu chí này">
                                            <button
                                              type="button"
                                              aria-label={`Xóa tiêu chí ${itm.title}`}
                                              className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-center text-xs"
                                            >
                                              <DeleteOutlined className="text-xs" />
                                            </button>
                                          </Tooltip>
                                        </Popconfirm>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Line 2: Requirement Detail */}
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 pl-3.5 leading-snug">
                                  {detailRequirement ||
                                    itm.standardRequirement ||
                                    'Kiểm tra vệ sinh và quy chuẩn hoạt động.'}
                                </div>

                                {/* Line 3: Inline Expandable Sub-panel for Failed or Mandatory Photo Items */}
                                {(isFail || requireAllPhotos) && (
                                  <div className="mt-2.5 pt-2.5 border-t border-rose-200/80 dark:border-rose-900/60 transition-all duration-200 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                      {/* Failed Quantity & % Badge */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                          SL vi phạm:
                                        </span>
                                        <InputNumber
                                          min={1}
                                          max={totalQty}
                                          value={currentSt.failedQty ?? totalQty}
                                          onChange={(val) => {
                                            const qty = Math.min(Math.max(val || 1, 1), totalQty);
                                            const pct = Math.round((qty / totalQty) * 100);
                                            setItemStatuses((prev) => ({
                                              ...prev,
                                              [itm.id]: {
                                                ...prev[itm.id],
                                                result: 'FAIL',
                                                failedQty: qty,
                                                failedPercent: pct,
                                              },
                                            }));
                                          }}
                                          size="small"
                                          className="w-20 tabular-nums font-bold border-rose-300 dark:border-rose-800"
                                        />
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                                          / tổng {totalQty}
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold tabular-nums border border-rose-500/20">
                                          {currentSt.failedPercent ??
                                            Math.round(((currentSt.failedQty ?? totalQty) / totalQty) * 100)}
                                          % vi phạm
                                        </span>
                                      </div>

                                      {/* Photo Proof Action Bar (Camera & Upload & Preview) */}
                                      <div className="flex flex-wrap items-center gap-2">
                                        {/* Native Hidden Camera Input */}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          capture="environment"
                                          style={{ display: 'none' }}
                                          id={`camera-input-${itm.id}`}
                                          onChange={(e) => onFileInputChange(e, itm.id)}
                                        />

                                        {/* Native Hidden File Gallery Input */}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          style={{ display: 'none' }}
                                          id={`file-input-${itm.id}`}
                                          onChange={(e) => onFileInputChange(e, itm.id)}
                                        />

                                        <label
                                          htmlFor={`camera-input-${itm.id}`}
                                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 text-xs font-semibold cursor-pointer active:scale-95 transition-transform"
                                          title="Mở trực tiếp Máy ảnh thiết bị để chụp hình"
                                        >
                                          <CameraOutlined />
                                          <span>Chụp Ảnh</span>
                                        </label>

                                        <label
                                          htmlFor={`file-input-${itm.id}`}
                                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 text-xs font-medium cursor-pointer active:scale-95 transition-transform"
                                          title="Mở Thư viện ảnh chọn hình từ máy"
                                        >
                                          <CloudUploadOutlined />
                                          <span>Tải Ảnh Từ Máy</span>
                                        </label>
                                      </div>

                                      {/* Image Thumbnail Preview & Delete Button */}
                                      {currentSt.photoUrl && (
                                        <div className="flex items-center gap-1.5 p-1 bg-rose-500/10 rounded-md border border-rose-500/20">
                                          <img
                                            src={currentSt.photoUrl}
                                            alt="Bằng chứng vi phạm"
                                            className="w-7 h-7 rounded object-cover border border-rose-400 cursor-pointer hover:scale-105 transition-transform"
                                            onClick={() => {
                                              Modal.info({
                                                title: `Bằng chứng vi phạm: ${subject}`,
                                                width: 600,
                                                content: (
                                                  <div className="pt-2 text-center">
                                                    <img
                                                      src={currentSt.photoUrl}
                                                      alt="Preview"
                                                      className="max-h-[450px] mx-auto rounded border"
                                                    />
                                                  </div>
                                                ),
                                              });
                                            }}
                                          />
                                          <Tooltip title="Xóa ảnh bằng chứng này">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setItemStatuses((prev) => ({
                                                  ...prev,
                                                  [itm.id]: { ...prev[itm.id], photoUrl: '' },
                                                }))
                                              }
                                              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 p-0.5"
                                            >
                                              <DeleteOutlined className="text-xs" />
                                            </button>
                                          </Tooltip>
                                        </div>
                                      )}
                                    </div>

                                    {/* Violation Note Input */}
                                    <div>
                                      <ItemNoteInput
                                        itemId={itm.id}
                                        initialValue={currentSt.note || ''}
                                        notesRef={itemNotesRef}
                                        placeholder="Ghi chú chi tiết lý do vi phạm (ví dụ: Cửa kính dính nhiều vết tay mờ ở lề dưới)..."
                                        className="border-rose-200 dark:border-rose-900/60 dark:bg-slate-900/80 text-xs text-slate-800 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ),
            };
          })}
        />
      ) : (
        <Empty description="Đang tải danh mục tiêu chí kiểm tra..." />
      )}
    </div>
  );
};
