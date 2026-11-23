'use client';

import dayjs from 'dayjs';
import type { CvPaystubRecord } from '@mos-lab/shared';
import { CvFeather1Badge, FeatherSvg } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { StatusTag } from '~/components/ui';
import { formatHoursToHoursMinutes } from './cvThuNhapUtils';

interface CvPaystubTimeAndBonusRowsProps {
  record: CvPaystubRecord;
}

/** Renders Groups I, II, and III (rows 1-15) of the 28-row Wings Legacy Payslip table. */
export function CvPaystubTimeAndBonusRows({ record }: CvPaystubTimeAndBonusRowsProps) {
  const seniorityMonths = record.seniorityMonths || 0;
  const seniorityYears = Math.floor(seniorityMonths / 12);
  const seniorityRemainingMonths = seniorityMonths % 12;
  const seniorityLabel =
    seniorityYears > 0 ? `${seniorityYears} năm ${seniorityRemainingMonths} th` : `${seniorityMonths} th`;

  return (
    <>
      {/* GROUP 1: LƯƠNG THEO THỜI GIAN & CA LÀM VIỆC */}
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          🕒 I. Lương theo thời gian &amp; Ca làm việc
        </td>
      </tr>

      {/* (1) Giờ chuẩn */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          1
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Giờ làm việc chuẩn trong tháng</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.expectedWorkDays || 26} ngày x 9h/ngày
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.expectedWorkHours || 234}</td>
      </tr>

      {/* (2) Giờ thực tế */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          2
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">Giờ làm việc thực tế</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-normal">
          {formatHoursToHoursMinutes(record.totalWorkHours)}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
          {Number(record.totalWorkHours || 0).toFixed(1)}
        </td>
      </tr>

      {/* (3) Đơn giá giờ */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          3
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
          <span>Đơn giá giờ</span>
          {record.isCvPlus && (
            <StatusTag
              status="gold"
              label={
                <span className="inline-flex items-center gap-1">
                  <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500" />
                  <span>(+2k/h)</span>
                </span>
              }
              className="text-[10px] ml-1.5 py-0 px-1 border-amber-400"
            />
          )}
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.isCvPlus ? 'Đơn giá giờ CV Tự Chủ (+2k/h)' : '—'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
          {record.hourlyRate.toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (4) Lương theo giờ làm */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          4
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lương theo giờ làm</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          (4) = (2) x (3)
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
          {Math.round(record.hourlyWage).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (5) Off tuần */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          5
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Off tuần theo lịch</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Nghỉ tuần theo lịch
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.weeklyOffDays || 4}</td>
      </tr>

      {/* (6) Off tháng (phép năm là 12 ngày) */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          6
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Off tháng (phép năm là 12 ngày)</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          Nghỉ phép tháng được duyệt
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.offMonthDays || 0}</td>
      </tr>

      {/* 6.1 Cộng tiền ngày nghỉ phép */}
      <tr
        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${record.offMonthWage && record.offMonthWage > 0 ? 'bg-emerald-500/10 dark:bg-emerald-950/20' : ''}`}
      >
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono"></td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium pl-6 text-emerald-800 dark:text-emerald-300">
          ↳ Cộng tiền ngày nghỉ phép
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-[11px]">
          {record.offMonthLeaveDetails && record.offMonthLeaveDetails.length > 0
            ? record.offMonthLeaveDetails
                .map(
                  (d) =>
                    `Ngày ${dayjs(d.date).format('DD/MM')} (ca ${d.shiftHours || 9}h x ${record.hourlyRate.toLocaleString('vi-VN')}đ)${d.note ? `: ${d.note}` : ''}`
                )
                .join('; ')
            : '—'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
          +{Math.round(record.offMonthWage || 0).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (7) Nghỉ lễ x1 (Không đi làm vẫn có tiền) */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          7
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          {(record.holidayWorkedDays || 0) > 0 && (!record.holidayPaidLeaveDays || record.holidayPaidLeaveDays === 0)
            ? 'Lương ngày lễ x1 (Đi làm ngày lễ)'
            : (record.holidayWorkedDays || 0) > 0 && (record.holidayPaidLeaveDays || 0) > 0
              ? `Lương & Nghỉ lễ x1 (${record.holidayPaidLeaveDays} ngày nghỉ + ${record.holidayWorkedDays} ngày làm)`
              : 'Nghỉ lễ x1 (Không đi làm vẫn có tiền)'}
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {(record.holidayWorkedDays || 0) > 0 && (!record.holidayPaidLeaveDays || record.holidayPaidLeaveDays === 0)
            ? `Đi làm ngày lễ 01/09 & 02/09: ${record.holidayWorkedDays} ngày (${record.holidayWorkedHours}h làm x ${record.hourlyRate.toLocaleString('vi-VN')}đ x 1)`
            : (record.holidayWorkedDays || 0) > 0 && (record.holidayPaidLeaveDays || 0) > 0
              ? `${record.holidayPaidLeaveDays} ngày nghỉ (+${Math.round(record.holidayPaidLeavePay || 0).toLocaleString('vi-VN')}đ) + ${record.holidayWorkedDays} ngày làm (${record.holidayWorkedHours}h làm x ${record.hourlyRate.toLocaleString('vi-VN')}đ x 1 = +${Math.round(record.holidayWorkedBasePay || 0).toLocaleString('vi-VN')}đ)`
              : (record.holidayPaidLeaveDays && record.holidayPaidLeaveDays > 0) ||
                  (record.holidayOffDays && record.holidayOffDays > 0) ||
                  (record.holidayPaidLeaveHours && record.holidayPaidLeaveHours > 0)
                ? `Nghỉ lễ 01/09 & 02/09: ${record.holidayPaidLeaveDays || record.holidayOffDays || 2} ngày (ca ${
                    record.holidayPaidLeaveHours && record.holidayPaidLeaveDays
                      ? Math.round(record.holidayPaidLeaveHours / record.holidayPaidLeaveDays)
                      : record.offMonthLeaveDetails?.[0]?.shiftHours ||
                        (record.expectedWorkHours && record.expectedWorkDays
                          ? Math.round(record.expectedWorkHours / record.expectedWorkDays)
                          : 9)
                  }h x ${record.hourlyRate.toLocaleString('vi-VN')}đ x 1)`
                : '—'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          {(record.holidayWorkedDays || 0) > 0 && (!record.holidayPaidLeaveDays || record.holidayPaidLeaveDays === 0)
            ? `+${Math.round(record.holidayWorkedBasePay || record.holidayBasePay || 0).toLocaleString('vi-VN')}đ`
            : (record.holidayWorkedDays || 0) > 0 && (record.holidayPaidLeaveDays || 0) > 0
              ? `+${Math.round(record.holidayBasePay || 0).toLocaleString('vi-VN')}đ`
              : (record.holidayPaidLeavePay || 0) > 0 ||
                  (record.holidayPay || 0) > 0 ||
                  (record.holidayBasePay || 0) > 0
                ? `+${Math.round(record.holidayPaidLeavePay || record.holidayPay || record.holidayBasePay || 0).toLocaleString('vi-VN')}đ`
                : '0đ'}
        </td>
      </tr>

      {/* (8) Tổng lương thời gian & ngày nghỉ tiêu chuẩn */}
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-y-2 border-slate-300 dark:border-slate-700">
        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-300">
          8
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
          Tổng lương thời gian &amp; Ngày nghỉ tiêu chuẩn
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-normal">
          (8) = (4) Lương giờ + (6.1) Phép năm + (7) Nghỉ lễ x1
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200 text-sm">
          +
          {Math.round(
            record.hourlyWage +
              (record.offMonthWage || 0) +
              (record.holidayPaidLeavePay || record.holidayPay || record.holidayBasePay || 0)
          ).toLocaleString('vi-VN')}
          đ
        </td>
      </tr>

      {/* GROUP 2: THƯỞNG & PHỤ CẤP THEO THỜI GIAN (BONUS THỜI GIAN) */}
      <tr className="bg-amber-500/10 dark:bg-amber-950/25 border-y border-amber-500/30">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider text-[11px]"
        >
          ⚡ II. Thưởng &amp; Phụ cấp theo thời gian (Bonus thời gian)
        </td>
      </tr>

      {/* (9) Thưởng đi làm ngày off tuần */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono font-semibold">
          9
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          Thưởng đi làm ngày off tuần (+1x = Tổng x2)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {(record.offDaysWorked || 0) > 0
            ? `${formatHoursToHoursMinutes(record.offDaysWorkHours || 0)} x ${record.hourlyRate.toLocaleString('vi-VN')}đ x 1 (Đã ăn 1x ở Mục 4, thêm 1x ở đây)`
            : '0h làm ngày off tuần (Nghỉ tuần theo lịch)'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          {(record.offDaysWorked || 0) > 0 || (record.offDaysWorkWage || 0) > 0
            ? `+${Math.round(record.offDaysWorkWage || 0).toLocaleString('vi-VN')}đ`
            : '0đ'}
        </td>
      </tr>

      {/* (10) Thưởng đi làm ngày lễ 2/9 */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono font-semibold">
          10
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
          Thưởng đi làm ngày Lễ 2/9 (x3 phụ cấp)
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-400">
          {record.holidayWorkedHours && record.holidayWorkedHours > 0
            ? `Đi làm ngày nào cộng ngày đó: ${record.holidayWorkedDays || 2} ngày đi làm (${record.holidayWorkedHours}h làm x ${record.hourlyRate.toLocaleString('vi-VN')}đ x 3 = +${Math.round(record.holidayPremiumPay || 0).toLocaleString('vi-VN')}đ - HR đi riêng)`
            : '0h làm việc ngày lễ (Không đi làm không có tiền)'}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
          {record.holidayPremiumPay && record.holidayPremiumPay > 0
            ? `+${Math.round(record.holidayPremiumPay).toLocaleString('vi-VN')}đ (Đi riêng)`
            : '0đ'}
        </td>
      </tr>

      {/* (11) Tổng Thưởng theo thời gian */}
      <tr className="bg-amber-500/15 dark:bg-amber-950/40 font-bold border-y-2 border-amber-500/30">
        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-300">
          11
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-900 dark:text-amber-200 font-bold">
          Tổng Thưởng theo thời gian
        </td>
        <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 text-[11px] font-normal">
          (11) = (9) Thưởng off tuần + (10) Thưởng ngày lễ
        </td>
        <td className="py-2 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-300 text-sm">
          +{Math.round((record.offDaysWorkWage || 0) + (record.holidayPremiumPay || 0)).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* GROUP 3: THƯỞNG DỊCH VỤ, THÂM NIÊN & TIPS */}
      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
        <td
          colSpan={4}
          className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
        >
          ⭐ III. Thưởng dịch vụ, Thâm niên &amp; Tips
        </td>
      </tr>

      {/* (12) Lượt khách phục vụ */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          12
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lượt khách phục vụ</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
          {record.serviceCount || 0} lượt hoàn thành
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{record.serviceCount || 0}</td>
      </tr>

      {/* (13) Thưởng Ca CV (Xoay) */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          13
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">Thưởng Ca CV (Xoay)</td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-[11px] font-normal">
          Hoa hồng dịch vụ kỹ thuật
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
          +{Math.round(record.cvXoayBonus).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (14) Thưởng Thâm Niên */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-amber-500/5 dark:bg-amber-950/10">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono">
          14
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-amber-700 dark:text-amber-300">
          Thưởng Thâm Niên
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 text-[11px] font-normal">
          {`${seniorityLabel} (+${record.seniorityBonusPercent || 0}%)`}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
          +{Math.round(record.seniorityBonus || 0).toLocaleString('vi-VN')}đ
        </td>
      </tr>

      {/* (15) Tips */}
      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
          15
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
          <span>Thưởng CV Tip</span>
          {record.isCvPlus && (
            <StatusTag
              status="gold"
              label={
                <span className="inline-flex items-center gap-1">
                  <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                  <span>90% (70% + 20%)</span>
                </span>
              }
              className="text-[10px] ml-1.5 py-0 px-1 border-amber-400"
            />
          )}
        </td>
        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 text-[11px]">
          {record.isCvPlus ? (
            <span className="inline-flex items-center gap-1 flex-wrap">
              <span>Thưởng Tip</span>
              <CvFeather1Badge featherClass="w-2.5 h-2.5 text-amber-500" />
              <span>(Giữ trọn 90% gồm 70% CV + 20% tự tư vấn)</span>
            </span>
          ) : (
            'Thưởng Tip CV (70% tiền tip khách)'
          )}
        </td>
        <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
          +{Math.round(record.cvTipBonus).toLocaleString('vi-VN')}đ
        </td>
      </tr>
    </>
  );
}
