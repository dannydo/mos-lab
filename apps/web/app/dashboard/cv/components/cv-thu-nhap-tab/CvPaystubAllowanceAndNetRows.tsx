'use client';

import { Button, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { Plus, Trash2 } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';

interface CvPaystubAllowanceAndNetRowsProps {
  record: CvPaystubRecord;
  canManagePaystub: boolean;
  onOpenAllowanceModal: () => void;
  onDeleteAllowance: (allowanceId: number | string) => Promise<void>;
}

/** Renders Groups IV and V (rows 16-19, allowances, penalties, BHXH breakdown, and net income) of the payslip table. */
export function CvPaystubAllowanceAndNetRows({
  record,
  canManagePaystub,
  onOpenAllowanceModal,
  onDeleteAllowance,
}: CvPaystubAllowanceAndNetRowsProps) {
  return (
    <>
      {/* GROUP 4: PHỤ CẤP & CÔNG LÀM VIỆC */}
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          🛵 IV. Phụ cấp &amp; Công làm việc
        </td>
      </tr>

      {/* (16) Ngày làm việc thực tế trong tháng */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          16
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

      {/* (17) Phụ cấp gửi xe */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          17
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp gửi xe</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.parkingCalculation || `200.000đ / ${record.expectedWorkDays || 26} * ${record.activeDays || 0}`}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          +{Math.round(record.parkingAllowance || 0).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (18) Phụ cấp khác: Mỗi phụ cấp hiển thị 1 dòng riêng */}
      {record.otherAllowancesDetails && record.otherAllowancesDetails.length > 0 ? (
        record.otherAllowancesDetails.map((item, idx) => (
          <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
            <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px]">
              18.{idx + 1}
            </td>
            <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
              {item.description || 'Phụ cấp khác'}
            </td>
            <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 flex-wrap">
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
                {canManagePaystub && item.source === 'mos' && item.id ? (
                  <Popconfirm
                    title="Xoá phụ cấp này?"
                    description={`Bạn có chắc muốn xoá khoản "${item.description}" (${item.amount >= 0 ? '+' : ''}${item.amount.toLocaleString('vi-VN')}đ) không?`}
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
                      icon={<Trash2 className="w-3 h-3" />}
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
              {item.amount < 0
                ? `-${Math.round(Math.abs(item.amount)).toLocaleString('vi-VN')}đ`
                : `+${Math.round(item.amount).toLocaleString('vi-VN')}đ`}
            </td>
          </tr>
        ))
      ) : (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
          <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
            18
          </td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp khác</td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
            Chưa có khoản phụ cấp nào trong tháng này
          </td>
          <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-slate-400">0đ</td>
        </tr>
      )}

      {/* Nút thêm phụ cấp khác tại mOS (chỉ hiển thị cho Admin / Super Admin) */}
      {canManagePaystub && (
        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
          <td colSpan={4} className="py-1.5 px-3 text-right">
            <Button
              type="dashed"
              size="small"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={onOpenAllowanceModal}
              className="text-xs text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 hover:text-sky-500 inline-flex items-center"
            >
              + Thêm phụ cấp khác tại mOS
            </Button>
          </td>
        </tr>
      )}

      {/* Phạt trừ thưởng nếu có */}
      {record.penalties && record.penalties > 0 ? (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-rose-600 dark:text-rose-400">
          <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono">!</td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phạt trừ thưởng</td>
          <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px]">—</td>
          <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
            -{Math.round(record.penalties).toLocaleString('vi-VN')}đ
          </td>
        </tr>
      ) : null}

      {/* GROUP 5: TỔNG THU NHẬP & THỰC LÃNH */}
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          💰 V. Tổng thu nhập &amp; Thực lãnh (Net)
        </td>
      </tr>

      {/* Tổng thu nhập thực tế trong tháng (Gross) */}
      <tr className="bg-blue-500/10 dark:bg-blue-950/20 font-bold border-y-2 border-blue-500/30">
        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-blue-700 dark:text-blue-400">
          ∑
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-900 dark:text-blue-200 font-bold">
          Tổng thu nhập thực tế trong tháng (Gross)
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 text-[11px] font-normal">
          Lương thời gian + Thưởng thời gian (off tuần) + Thưởng CV + Thâm niên + Tips + Gửi xe + Phụ cấp khác
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-700 dark:text-blue-300 text-sm">
          {Math.round(record.totalIncome).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (19) BHXH */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-rose-500/5 dark:bg-rose-950/10">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-mono">
          19
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-300 font-bold">
          Khấu trừ BHXH (10.5% NLĐ)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-[11px] font-normal">
          Khấu trừ người lao động đóng (10.5%)
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
          -{Math.round(record.socialSecurityAmount || 0).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* 16.1 Wings đóng & 16.2 Nhân sự đóng */}
      {record.socialSecurityAmount && record.socialSecurityAmount > 0 ? (
        <>
          <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
            <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400"></td>
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-slate-600 dark:text-slate-300 font-medium">
              ↳ Wings (Công ty đóng 21.5%)
            </td>
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400 text-[10px]">
              Lương cơ sở 5.400.000đ
            </td>
            <td className="py-1 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
              {Math.round(record.socialSecurityBreakdown?.employer?.totalAmount || 1161000).toLocaleString('vi-VN')}đ
            </td>
          </tr>
          <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
            <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHXH (17.5%)</td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
            <td className="py-0.5 px-3 text-right tabular-nums">
              {Math.round(record.socialSecurityBreakdown?.employer?.socialAmount || 945000).toLocaleString('vi-VN')}đ
            </td>
          </tr>
          <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
            <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHYT (3%)</td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
            <td className="py-0.5 px-3 text-right tabular-nums">
              {Math.round(record.socialSecurityBreakdown?.employer?.healthAmount || 162000).toLocaleString('vi-VN')}đ
            </td>
          </tr>
          <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
            <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHTN (1%)</td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
            <td className="py-0.5 px-3 text-right tabular-nums">
              {Math.round(record.socialSecurityBreakdown?.employer?.unemploymentAmount || 54000).toLocaleString(
                'vi-VN'
              )}
              đ
            </td>
          </tr>

          <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
            <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400"></td>
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-rose-700 dark:text-rose-300 font-medium">
              ↳ {record.staffName} (NLĐ đóng 10.5%)
            </td>
            <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-500/80 text-[10px]">
              Trừ trực tiếp vào lương
            </td>
            <td className="py-1 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
              -{Math.round(record.socialSecurityAmount || 567000).toLocaleString('vi-VN')}đ
            </td>
          </tr>
          <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
            <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHXH (8%)</td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
            <td className="py-0.5 px-3 text-right tabular-nums">
              -{Math.round(record.socialSecurityBreakdown?.employee?.socialAmount || 432000).toLocaleString('vi-VN')}đ
            </td>
          </tr>
          <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
            <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHYT (1.5%)</td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
            <td className="py-0.5 px-3 text-right tabular-nums">
              -{Math.round(record.socialSecurityBreakdown?.employee?.healthAmount || 81000).toLocaleString('vi-VN')}đ
            </td>
          </tr>
          <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
            <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHTN (1%)</td>
            <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
            <td className="py-0.5 px-3 text-right tabular-nums">
              -
              {Math.round(record.socialSecurityBreakdown?.employee?.unemploymentAmount || 54000).toLocaleString(
                'vi-VN'
              )}
              đ
            </td>
          </tr>
        </>
      ) : null}

      {/* LƯƠNG THỰC LÃNH (NET) */}
      <tr className="bg-emerald-500/15 dark:bg-emerald-950/30 font-extrabold border-y-2 border-emerald-500/40">
        <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-emerald-800 dark:text-emerald-300 text-base">
          💰
        </td>
        <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm uppercase tracking-wide">
          Lương thực lãnh trong tháng (Net)
        </td>
        <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-xs font-normal">
          Tổng thu nhập (Gross) - Khấu trừ BHXH (10.5%)
        </td>
        <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-lg">
          {Math.round(record.netIncome ?? record.totalIncome - (record.socialSecurityAmount || 0)).toLocaleString(
            'vi-VN'
          )}
          đ
        </td>
      </tr>

      {/* Đảm bảo thu nhập nếu có */}
      {record.guaranteedIncome && record.guaranteedIncome > 0 ? (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400">
          <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
          <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6">↳ Đảm bảo thu nhập</td>
          <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px]">—</td>
          <td className="py-1 px-3 text-right tabular-nums">
            {Math.round(record.guaranteedIncome).toLocaleString('vi-VN')}đ
          </td>
        </tr>
      ) : null}
    </>
  );
}
