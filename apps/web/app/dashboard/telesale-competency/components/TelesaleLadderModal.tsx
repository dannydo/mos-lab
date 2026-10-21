'use client';

import React from 'react';
import { Divider, Alert } from 'antd';
import { Trophy } from 'lucide-react';
import { TelesaleTier, TELESALE_TIER_CONFIG } from '@mos-lab/shared';
import { AdaptiveModal, StatusTag, StatusType } from '../../../../components/ui';

interface TelesaleLadderModalProps {
  open: boolean;
  onClose: () => void;
}

export const TelesaleLadderModal: React.FC<TelesaleLadderModalProps> = ({ open, onClose }) => {
  return (
    <AdaptiveModal
      title={
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-slate-900 dark:text-zinc-100">
            Quy Chuẩn Khung Năng Lực & Thăng Giáng Bậc (Telesale / Booking)
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={750}
    >
      <div className="space-y-4 py-2 text-xs md:text-sm">
        <Alert
          message="Nguyên tắc Thăng / Giáng Bậc Tự Động (Rule Engine):"
          description="Đủ thâm niên tối thiểu và đạt điểm chuẩn N tháng liên tiếp để thăng bậc (N=2 với Fresher -> Junior, N=3 với các bậc còn lại). Không đạt điểm chuẩn cấp bậc hiện tại trong 2 tháng liên tiếp sẽ tự động đưa vào danh sách cảnh báo giáng bậc."
          type="info"
          showIcon
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {(Object.keys(TELESALE_TIER_CONFIG) as TelesaleTier[]).map((tierKey) => {
            const tier = TELESALE_TIER_CONFIG[tierKey];
            const statusType: StatusType =
              tierKey === 'SENIOR'
                ? 'purple'
                : tierKey === 'MID_LEVEL'
                ? 'gold'
                : tierKey === 'JUNIOR'
                ? 'cyan'
                : 'default';

            return (
              <div
                key={tierKey}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">{tier.label}</span>
                  <StatusTag status={statusType} label={tier.shortLabel} />
                </div>
                <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-0.5">
                  <div>
                    • Thâm niên tối thiểu: <strong className="tabular-nums">{tier.minTenureMonths} tháng</strong>
                  </div>
                  <div>
                    • Điểm chuẩn yêu cầu:{' '}
                    <strong className="tabular-nums">{tier.passingScore} điểm / 100đ</strong>
                  </div>
                  <div>
                    • Số tháng liên tiếp để thăng bậc:{' '}
                    <strong className="tabular-nums">{tier.consecutiveMonthsRequired} tháng</strong>
                  </div>
                  <div>
                    • Trượt 2 tháng liên tiếp: <strong>Cảnh báo giáng bậc</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 italic">{tier.description}</p>
              </div>
            );
          })}
        </div>

        <Divider className="my-2 border-slate-200 dark:border-zinc-800" />

        <div>
          <h4 className="font-semibold text-slate-900 dark:text-zinc-100 mb-1">
            Cấu Trúc Trọng Số 4 Trụ Cột Đánh Giá:
          </h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-zinc-400">
            <li>
              <strong>Trụ cột A (40%)</strong>: Hiệu suất công việc (KPI Book & Done, Khách mới Done, Doanh thu, Tỷ lệ chuyển đổi, Năng suất gọi) — Tự động tính.
            </li>
            <li>
              <strong>Trụ cột B (25%)</strong>: 9 Kỹ năng nghiệp vụ chuẩn KN01 -&gt; KN09 — Quản lý chấm theo thang 1 - 5 sao.
            </li>
            <li>
              <strong>Trụ cột C (20%)</strong>: Chất lượng công việc (Lỗi hồ sơ CRM, vi phạm quy trình gọi, kiểm toán cuộc gọi).
            </li>
            <li>
              <strong>Trụ cột D (15%)</strong>: Kỷ luật &amp; Thái độ (Chấm công, vi phạm nội quy, bắt buộc có link minh chứng khi trừ điểm).
            </li>
          </ul>
        </div>
      </div>
    </AdaptiveModal>
  );
};
