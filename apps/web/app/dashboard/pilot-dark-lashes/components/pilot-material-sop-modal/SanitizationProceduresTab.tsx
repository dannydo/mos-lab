'use client';

import React from 'react';
import { Button, Card, Popconfirm } from 'antd';
import { AlertTriangle, CheckCircle2, Edit2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { PilotSanitizationItem } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';

interface SanitizationProceduresTabProps {
  procedures: PilotSanitizationItem[];
  onAdd: () => void;
  onEdit: (item: PilotSanitizationItem) => void;
  onDelete: (id: string) => void;
}

export function SanitizationProceduresTab({ procedures, onAdd, onEdit, onDelete }: SanitizationProceduresTabProps) {
  return (
    <div className="space-y-3.5 pt-2">
      <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300 flex-wrap">
        <div className="flex items-center gap-2">
          <AppIcon icon={ShieldCheck} size={16} className="text-purple-600 shrink-0" />
          <span>
            Phân loại rõ ràng 2 nhóm: <strong>Dụng cụ tái sử dụng (REUSABLE)</strong> (ngâm cồn 70°, sấy tiệt trùng UV,
            bảo quản kín) và <strong>Vật tư dùng 1 lần (DISPOSABLE)</strong> (hủy ngay sau ca).
          </span>
        </div>
        <Button
          type="primary"
          size="small"
          icon={<AppIcon icon={Plus} size="sm" />}
          onClick={onAdd}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shrink-0 shadow-sm"
        >
          Thêm quy trình khử khuẩn
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {procedures.map((proc) => {
          const isReusable = proc.classification === 'REUSABLE';
          return (
            <Card
              key={proc.id}
              variant="outlined"
              className={`rounded-2xl border ${
                isReusable
                  ? 'border-teal-500/20 bg-gradient-to-br from-teal-50/10 via-transparent to-transparent'
                  : 'border-rose-500/20 bg-gradient-to-br from-rose-50/10 via-transparent to-transparent'
              } hover:shadow-md transition-all flex flex-col justify-between`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-1 border ${
                        isReusable
                          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {isReusable ? '♻️ Dụng cụ tái sử dụng' : '🚫 Vật tư dùng 1 lần (Hủy sau ca)'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 m-0">{proc.toolName}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="text"
                      size="small"
                      icon={<AppIcon icon={Edit2} size="sm" />}
                      onClick={() => onEdit(proc)}
                    />
                    <Popconfirm
                      title="Xóa quy trình này?"
                      onConfirm={() => onDelete(proc.id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="text" size="small" danger icon={<AppIcon icon={Trash2} size="sm" />} />
                    </Popconfirm>
                  </div>
                </div>

                {/* Quy trình chi tiết */}
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                    🧪 Quy trình khử khuẩn &amp; bảo quản:
                  </span>
                  <div className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11.5px]">
                    {proc.procedure}
                  </div>
                </div>

                {/* Điểm kiểm soát an toàn */}
                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-500/20 text-xs space-y-0.5 text-rose-900 dark:text-rose-200">
                  <span className="font-semibold flex items-center gap-1">
                    <AppIcon icon={AlertTriangle} size={13} className="text-rose-600" />
                    <span>Điểm kiểm soát an toàn (CSAP):</span>
                  </span>
                  <p className="m-0 text-[11.5px] leading-snug">{proc.criticalSafetyPoint}</p>
                </div>

                {/* Checklist thực hiện */}
                {proc.checklistSteps && proc.checklistSteps.length > 0 && (
                  <div className="text-xs space-y-1 pt-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300 block">
                      📋 Checklist từng ca:
                    </span>
                    <ul className="m-0 p-0 list-none space-y-1">
                      {proc.checklistSteps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-400"
                        >
                          <AppIcon icon={CheckCircle2} size={13} className="text-emerald-500 shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{isReusable ? 'Chu kỳ: Sau mỗi ca làm' : 'Chu kỳ: Hủy bỏ 100%'}</span>
                {proc.status === 'VERIFIED' ? (
                  <StatusTag status="success" label="Đã thẩm định" />
                ) : (
                  <StatusTag status="warning" label="Chờ thẩm định" />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
