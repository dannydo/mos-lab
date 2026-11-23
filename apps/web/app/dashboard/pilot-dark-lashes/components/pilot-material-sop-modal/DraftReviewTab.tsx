'use client';

import React from 'react';
import { Button } from 'antd';
import { AlertTriangle, Check, UserCheck } from 'lucide-react';
import type { PilotMaterialSopDocument } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { DEFAULT_EXPERT_REVIEWER, formatVND } from './pilot-material-sop-helpers';

interface DraftReviewTabProps {
  doc: PilotMaterialSopDocument | null;
  onOpenEndorse: () => void;
}

export function DraftReviewTab({ doc, onOpenEndorse }: DraftReviewTabProps) {
  return (
    <div className="space-y-4 pt-2">
      {/* Official Scale Proposal Sheet */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="text-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
            Hệ Thống mOS · Wings Beauty Studio
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 m-0">
            BẢN DỰ THẢO ĐỊNH MỨC &amp; KIỂM SOÁT VẬT TƯ TIÊU HAO (HẠNG MỤC 3)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
            Hồ sơ chuẩn hóa quy trình vận hành SOP, giáo trình đào tạo Chuyên Viên Kỹ Thuật và cơ cấu chi phí vật tư
            phục vụ phê duyệt Scale dịch vụ Uốn Mi Bóng Tối
          </p>
        </div>

        {/* Thông tin hồ sơ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block">Dịch vụ:</span>
            <strong className="text-slate-800 dark:text-slate-200">Uốn Mi Bóng Tối (Dark Lashes)</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Người lập hồ sơ:</span>
            <strong className="text-slate-800 dark:text-slate-200">
              {doc?.projectOwner || 'Danny Do'} (Project Owner)
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Xác nhận chuyên môn:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
              {doc?.expertReviewer || DEFAULT_EXPERT_REVIEWER}
            </strong>
          </div>
        </div>

        {/* Tóm tắt bảng định mức chi phí */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 m-0">
            1. Tổng hợp Định mức Chi phí Vật tư / 1 Ca Dịch Vụ
          </h4>
          <div className="overflow-x-auto border rounded-xl border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  <th className="p-2.5">Tên vật tư / Dung dịch</th>
                  <th className="p-2.5 text-center">Định lượng đề xuất</th>
                  <th className="p-2.5 text-right">Đơn giá</th>
                  <th className="p-2.5 text-right">Chi phí / Ca</th>
                  <th className="p-2.5 text-center">Trạng thái thẩm định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(doc?.solutionNorms || []).map((norm) => (
                  <tr key={norm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2.5 font-medium">{norm.materialName}</td>
                    <td className="p-2.5 text-center tabular-nums">
                      {norm.standardDosagePerSession} {norm.unit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums text-slate-500">
                      {formatVND(norm.costPerUnit)}/{norm.unit}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      {formatVND(norm.costPerSession)}
                    </td>
                    <td className="p-2.5 text-center">
                      {norm.status === 'VERIFIED' ? (
                        <StatusTag status="success" label="Đã thẩm định" />
                      ) : (
                        <StatusTag status="warning" label="Chờ thẩm định" />
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-slate-100">
                  <td colSpan={3} className="p-2.5 text-right uppercase text-[11px]">
                    Tổng chi phí thuốc uốn &amp; dung dịch chuẩn / ca:
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-base text-emerald-600 dark:text-emerald-400">
                    {formatVND(doc?.summary.totalNormCostPerSession || 0)}
                  </td>
                  <td className="p-2.5 text-center">
                    {doc?.summary.pendingReviewCount === 0 ? (
                      <StatusTag status="success" label="100% Hoàn tất" />
                    ) : (
                      <StatusTag status="warning" label="Còn chờ duyệt" />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Khối Thẩm định & Ký xác nhận chuyên môn */}
        <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <AppIcon icon={UserCheck} size={18} className="text-purple-600" />
              <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200 m-0">
                Xác Nhận Thẩm Định Chuyên Môn – Cô Giang Đàm
              </h4>
            </div>

            {doc?.overallStatus === 'REVIEWED_BY_EXPERT' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                <AppIcon icon={Check} size={14} /> ĐÃ HOÀN TẤT THẨM ĐỊNH CHUYÊN MÔN
              </span>
            ) : (
              <Button
                type="primary"
                icon={<AppIcon icon={UserCheck} size="sm" />}
                onClick={onOpenEndorse}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm"
              >
                Cô Giang Đàm Xác Nhận Thẩm Định
              </Button>
            )}
          </div>

          <p className="text-xs text-purple-900 dark:text-purple-300 leading-relaxed m-0">
            {doc?.approvalNote ||
              'Bản dự thảo đang chờ Cô Giang Đàm thẩm định các thông số kỹ thuật, định lượng hóa chất và quy trình vệ sinh an toàn y tế.'}
          </p>

          {doc?.reviewedAt && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Thời gian xác nhận: <strong>{new Date(doc.reviewedAt).toLocaleString('vi-VN')}</strong>
            </div>
          )}
        </div>

        {/* Quy định cấm tự động ban hành */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AppIcon icon={AlertTriangle} size={18} className="text-amber-600 shrink-0" />
          <span>
            <strong>Nguyên tắc bất biến:</strong> Tài liệu Hạng mục 3 chỉ có giá trị ban hành khi được CEO phê duyệt
            chính thức Scale. Tuyệt đối không tự động ban hành SOP hoặc áp đặt định mức lên hệ thống vận hành khi chưa
            có quyết định từ Ban Giám Đốc.
          </span>
        </div>
      </div>
    </div>
  );
}
