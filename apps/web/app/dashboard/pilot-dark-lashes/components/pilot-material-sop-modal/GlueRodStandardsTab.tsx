'use client';

import React from 'react';
import { Button, Card, Popconfirm } from 'antd';
import { AlertTriangle, Edit2, Info, Plus, Trash2 } from 'lucide-react';
import type { PilotGlueRodStandardItem } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { getGlueRodCategoryLabel } from './pilot-material-sop-helpers';

interface GlueRodStandardsTabProps {
  items: PilotGlueRodStandardItem[];
  onAdd: () => void;
  onEdit: (item: PilotGlueRodStandardItem) => void;
  onDelete: (id: string) => void;
}

export function GlueRodStandardsTab({ items, onAdd, onEdit, onDelete }: GlueRodStandardsTabProps) {
  return (
    <div className="space-y-3.5 pt-2">
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 flex-wrap">
        <div className="flex items-center gap-2">
          <AppIcon icon={Info} size={16} className="text-blue-600 shrink-0" />
          <span>
            Hướng dẫn lựa chọn loại trục silicon và keo uốn phù hợp với từng dáng mắt, quy chuẩn thao tác căng mi và các
            lỗi kỹ thuật cần triệt tiêu.
          </span>
        </div>
        <Button
          type="primary"
          size="small"
          icon={<AppIcon icon={Plus} size="sm" />}
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 shadow-sm"
        >
          Thêm quy chuẩn mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((item) => (
          <Card
            key={item.id}
            variant="outlined"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {getGlueRodCategoryLabel(item.category)}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0">{item.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="text"
                    size="small"
                    icon={<AppIcon icon={Edit2} size="sm" />}
                    onClick={() => onEdit(item)}
                  />
                  <Popconfirm
                    title="Xóa quy chuẩn này?"
                    onConfirm={() => onDelete(item.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
                  </Popconfirm>
                </div>
              </div>

              {/* Section 1: Tiêu chí lựa chọn */}
              <div className="text-xs space-y-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300 block">🎯 Tiêu chí lựa chọn:</span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed m-0 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  {item.selectionCriteria}
                </p>
              </div>

              {/* Section 2: Tiêu chuẩn thao tác */}
              <div className="text-xs space-y-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                  📐 Tiêu chuẩn thao tác chuẩn:
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed m-0">{item.standardOperation}</p>
              </div>

              {/* Section 3: Lưu ý kỹ thuật & Lỗi cần tránh */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/20 text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <div className="font-semibold flex items-center gap-1">
                  <AppIcon icon={AlertTriangle} size={13} className="text-amber-600" />
                  <span>Lưu ý &amp; Lỗi cần tránh:</span>
                </div>
                <p className="m-0 leading-relaxed text-[11.5px]">{item.commonMistakesToAvoid}</p>
                {item.technicalNotes && (
                  <p className="m-0 leading-relaxed text-[11px] text-amber-700 dark:text-amber-300 italic pt-1 border-t border-amber-200/40">
                    Ghi chú: {item.technicalNotes}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">
                Vật tư: <strong>{item.materialRef || 'Chuẩn chung'}</strong>
              </span>
              {item.status === 'VERIFIED' ? (
                <StatusTag status="success" label="Đã thẩm định" />
              ) : (
                <StatusTag status="warning" label="Chờ thẩm định" />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
