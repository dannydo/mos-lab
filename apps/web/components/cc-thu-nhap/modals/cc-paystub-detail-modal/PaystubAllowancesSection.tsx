'use client';

import React from 'react';
import { Button, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { formatRoundedVnd, formatSignedRoundedVnd } from './paystubHelpers';

export interface PaystubAllowancesSectionProps {
  record: CcPaystubRecord;
  onOpenAllowanceModal: () => void;
  onDeleteAllowance: (allowanceId: number | string) => void;
}

export function PaystubAllowancesSection({
  record,
  onOpenAllowanceModal,
  onDeleteAllowance,
}: PaystubAllowancesSectionProps) {
  return (
    <>
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          🛵 IV. Phụ cấp & Công làm việc
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          18
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
          Ngày làm việc thực tế trong tháng
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Số ngày đi làm / Số ngày công chuẩn
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
          {record.activeDays || 0} / {record.expectedWorkDays || 26}
        </td>
      </tr>

      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          19
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp gửi xe</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.parkingCalculation || `200.000đ / ${record.expectedWorkDays || 26} * ${record.activeDays || 0}`}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          +{formatRoundedVnd(record.parkingAllowance)}
        </td>
      </tr>

      {record.otherAllowancesDetails && record.otherAllowancesDetails.length > 0 ? (
        record.otherAllowancesDetails.map((item, idx) => (
          <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px]">
              20.{idx + 1}
            </td>
            <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
              {item.description || 'Phụ cấp khác'}
            </td>
            <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  {item.source === 'mos' ? (
                    <StatusTag status="cyan" label="mOS" className="text-[10px]" />
                  ) : (
                    <StatusTag status="default" label="Legacy" className="text-[10px]" />
                  )}
                  <span>
                    {item.note
                      ? item.note
                      : item.createdAt
                        ? `Tạo ngày ${dayjs(item.createdAt).format('DD/MM/YYYY')}`
                        : 'Khoản điều chỉnh'}
                  </span>
                </span>
                {item.source === 'mos' && item.id ? (
                  <Popconfirm
                    title="Xoá phụ cấp này?"
                    description={`Bạn có chắc muốn xoá khoản "${item.description}" (${
                      item.amount >= 0 ? '+' : ''
                    }${item.amount.toLocaleString('vi-VN')}đ) không?`}
                    onConfirm={() => onDeleteAllowance(item.id!)}
                    okText="Xoá"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true, size: 'small' }}
                    cancelButtonProps={{ size: 'small' }}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      aria-label={`Xoá phụ cấp ${item.description || 'khác'}`}
                      icon={<AppIcon icon={Trash2} size={12} />}
                      className="h-5 px-1 text-slate-400 hover:text-rose-500"
                    />
                  </Popconfirm>
                ) : null}
              </div>
            </td>
            <td
              className={`py-1.5 px-3 text-right tabular-nums font-semibold ${
                item.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {formatSignedRoundedVnd(item.amount)}
            </td>
          </tr>
        ))
      ) : (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
          <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
            20
          </td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp khác</td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
            Chưa có khoản phụ cấp nào trong tháng này
          </td>
          <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-slate-400">0đ</td>
        </tr>
      )}

      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
        <td colSpan={4} className="py-1.5 px-3 text-right">
          <Button
            type="dashed"
            size="small"
            icon={<AppIcon icon={Plus} size={14} />}
            onClick={onOpenAllowanceModal}
            className="text-xs text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:text-purple-500"
          >
            + Thêm phụ cấp khác tại mOS
          </Button>
        </td>
      </tr>

      {record.penalties && record.penalties > 0 ? (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-rose-600 dark:text-rose-400">
          <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono">!</td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phạt trừ thưởng</td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px]">—</td>
          <td className="py-1.5 px-3 text-right tabular-nums font-semibold">-{formatRoundedVnd(record.penalties)}</td>
        </tr>
      ) : null}
    </>
  );
}
