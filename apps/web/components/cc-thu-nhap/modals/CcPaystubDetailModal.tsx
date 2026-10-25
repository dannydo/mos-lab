'use client';

import React from 'react';
import { Modal, Tag, Button, Space, Typography, Popconfirm } from 'antd';
import {
  WalletOutlined,
  PrinterOutlined,
  DollarOutlined,
  TrophyOutlined,
  GiftOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CcPaystubRecord } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';

const { Text } = Typography;

export interface CcPaystubDetailModalProps {
  open: boolean;
  onCancel: () => void;
  selectedRecord: CcPaystubRecord | null;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  onOpenAllowanceModal: () => void;
  onDeleteAllowance: (allowanceId: number | string) => void;
  formatHoursToHoursMinutes?: (hrs: number, compact?: boolean) => string;
}

export default function CcPaystubDetailModal({
  open,
  onCancel,
  selectedRecord,
  dateRange,
  onOpenAllowanceModal,
  onDeleteAllowance,
  formatHoursToHoursMinutes = (hrs, compact) => (compact ? hrs + 'h' : hrs + ' giờ'),
}: CcPaystubDetailModalProps) {
  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-8 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <WalletOutlined className="text-amber-500 text-lg" />
            <span className="font-bold text-base">Phiếu Lương Live Chi Tiết - {selectedRecord?.displayName}</span>
          </div>
          <Space>
            <Tag color="purple" className="font-mono text-xs font-semibold px-2 py-0.5">
              KỲ: {dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY')}
            </Tag>
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
              className="text-xs"
            >
              In phiếu
            </Button>
          </Space>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <div key="modal-footer" className="flex items-center justify-between w-full px-2 py-1">
          <Text type="secondary" className="text-xs italic">
            💡 Cấu trúc chi tiết đối chiếu chuẩn 100% Wings mOS
          </Text>
          <Button
            key="close-paystub"
            type="primary"
            onClick={onCancel}
            className="bg-amber-500 hover:bg-amber-400 border-amber-500 text-black font-semibold"
          >
            Đóng Phiếu Lương
          </Button>
        </div>,
      ]}
      width={780}
    >
      {selectedRecord && (
        <div className="space-y-4 pt-2 text-slate-800 dark:text-slate-200">
          {/* Staff Profile Header Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                  PAYSLIP • MONTH {dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY')}
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">NICKNAME:</span>{' '}
                    <strong className="text-sm font-semibold">{selectedRecord.displayName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">HỌ TÊN:</span>{' '}
                    <strong className="text-sm font-semibold">
                      {selectedRecord.fullName || selectedRecord.displayName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">CHỨC VỤ:</span>{' '}
                    <Tag color="purple" className="font-semibold text-xs ml-1">
                      Tư Vấn Viên (CC)
                    </Tag>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">BỘ PHẬN/ PHÒNG BAN:</span>{' '}
                    <Tag color="blue" className="font-semibold text-xs ml-1">
                      {selectedRecord.store}
                    </Tag>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">NGÀY NGHỈ PHÉP CÒN LẠI:</span>{' '}
                    <strong className="text-amber-600 dark:text-amber-400 font-bold tabular-nums ml-1">
                      {selectedRecord.dayOffAvailable ?? 26}
                    </strong>{' '}
                    ngày
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Mã NV: #{selectedRecord.consultantId}</div>
                <Tag color="green" className="mt-1">
                  Active
                </Tag>
              </div>
            </div>
          </div>

          {/* 5-group Wings Payslip Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="py-2 px-2 text-center w-10 border-r border-slate-200 dark:border-slate-700">STT</th>
                  <th className="py-2 px-3 text-left border-r border-slate-200 dark:border-slate-700">Nội dung</th>
                  <th className="py-2 px-3 text-left border-r border-slate-200 dark:border-slate-700">
                    Công thức / Diễn giải
                  </th>
                  <th className="py-2 px-3 text-right w-36">Thành tiền / Giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {/* GROUP 1: LƯƠNG THEO THỜI GIAN & CA LÀM VIỆC */}
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                  <td
                    colSpan={4}
                    className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                  >
                    🕒 I. Lương theo thời gian & Ca làm việc
                  </td>
                </tr>

                {/* (1) Giờ chuẩn */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    1
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                    Giờ làm việc chuẩn trong tháng
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    {selectedRecord.expectedWorkDays || 26} ngày x 8h/ngày
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                    {selectedRecord.expectedWorkHours || 208}
                  </td>
                </tr>

                {/* (2) Giờ thực tế */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    2
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                    Giờ làm việc thực tế
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                    {formatHoursToHoursMinutes(selectedRecord.totalWorkHours)}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    {Number(selectedRecord.totalWorkHours || 0).toFixed(1)}
                  </td>
                </tr>

                {/* (3) Đơn giá giờ */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    3
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Đơn giá giờ</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    —
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                    {(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ
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
                    {Math.round(selectedRecord.hourlyWage).toLocaleString('vi-VN')}đ
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
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                    {selectedRecord.weeklyOffDays || 4}
                  </td>
                </tr>

                {/* (6) Off tháng (phép năm là 12 ngày) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    6
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                    Off tháng (phép năm là 12 ngày)
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    Nghỉ phép tháng được duyệt
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                    {selectedRecord.offMonthDays || 0}
                  </td>
                </tr>

                {/* 6.1 Cộng tiền ngày nghỉ phép */}
                <tr
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${selectedRecord.offMonthWage && selectedRecord.offMonthWage > 0 ? 'bg-emerald-500/10 dark:bg-emerald-950/20' : ''}`}
                >
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium pl-6 text-emerald-800 dark:text-emerald-300">
                    ↳ Cộng tiền ngày nghỉ phép
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-[11px]">
                    {selectedRecord.offMonthLeaveDetails && selectedRecord.offMonthLeaveDetails.length > 0
                      ? selectedRecord.offMonthLeaveDetails
                          .map(
                            (d) =>
                              `Ngày ${dayjs(d.date).format('DD/MM')} (ca ${d.shiftHours || 9}h x ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ)${d.note ? `: ${d.note}` : ''}`
                          )
                          .join('; ')
                      : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    +{Math.round(selectedRecord.offMonthWage || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (7) Lương / Nghỉ lễ x1 */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    7
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                    {(selectedRecord.holidayWorkedDays || 0) > 0 &&
                    (!selectedRecord.holidayPaidLeaveDays || selectedRecord.holidayPaidLeaveDays === 0)
                      ? 'Lương ngày lễ x1 (Đi làm ngày lễ)'
                      : (selectedRecord.holidayWorkedDays || 0) > 0 && (selectedRecord.holidayPaidLeaveDays || 0) > 0
                        ? `Lương & Nghỉ lễ x1 (${selectedRecord.holidayPaidLeaveDays} ngày nghỉ + ${selectedRecord.holidayWorkedDays} ngày làm)`
                        : 'Nghỉ lễ x1 (Không đi làm vẫn có tiền)'}
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    {(selectedRecord.holidayWorkedHours || 0) > 0 || (selectedRecord.holidayPaidLeaveHours || 0) > 0
                      ? `${selectedRecord.holidayWorkedHours || 0} giờ đi làm + ${selectedRecord.holidayPaidLeaveHours || 0} giờ nghỉ lễ (1x giờ làm đã tính trong Lương giờ)`
                      : '—'}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    +
                    {Math.round(
                      selectedRecord.holidayPaidLeavePay ||
                        selectedRecord.holidayPayrollAddition ||
                        selectedRecord.holidayBasePay ||
                        0
                    ).toLocaleString('vi-VN')}
                    đ
                  </td>
                </tr>

                {/* (8) Tổng lương thời gian & ngày nghỉ tiêu chuẩn */}
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-y-2 border-slate-300 dark:border-slate-700">
                  <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-300">
                    8
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                    Tổng lương thời gian & Ngày nghỉ tiêu chuẩn
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-normal">
                    (8) = (4) Lương giờ + (6.1) Phép năm + (7) Nghỉ lễ x1
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200 text-sm">
                    +
                    {Math.round(
                      selectedRecord.hourlyWage +
                        (selectedRecord.offMonthWage || 0) +
                        (selectedRecord.holidayPaidLeavePay || selectedRecord.holidayPayrollAddition || 0)
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
                    ⚡ II. Thưởng & Phụ cấp theo thời gian (Bonus thời gian)
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
                    {(selectedRecord.offDaysWorked || 0) > 0
                      ? `${formatHoursToHoursMinutes(selectedRecord.offDaysWorkHours || 0)} x ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ x 1 (Đã ăn 1x ở Mục 4, thêm 1x ở đây)`
                      : '0h làm ngày off tuần (Nghỉ tuần theo lịch)'}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {(selectedRecord.offDaysWorked || 0) > 0 || (selectedRecord.offDaysWorkWage || 0) > 0
                      ? `+${Math.round(selectedRecord.offDaysWorkWage || 0).toLocaleString('vi-VN')}đ`
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
                    {selectedRecord.holidayWorkedHours && selectedRecord.holidayWorkedHours > 0
                      ? `Đi làm ngày nào cộng ngày đó: ${selectedRecord.holidayWorkedDays || 2} ngày đi làm (${selectedRecord.holidayWorkedHours}h làm x ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ x 3 = +${Math.round(selectedRecord.holidayPremiumPay || 0).toLocaleString('vi-VN')}đ - HR đi riêng)`
                      : '0h làm việc ngày lễ (Không đi làm không có tiền)'}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                    {selectedRecord.holidayPremiumPay && selectedRecord.holidayPremiumPay > 0
                      ? `+${Math.round(selectedRecord.holidayPremiumPay).toLocaleString('vi-VN')}đ (Đi riêng)`
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
                    +
                    {Math.round(
                      (selectedRecord.offDaysWorkWage || 0) + (selectedRecord.holidayPremiumPay || 0)
                    ).toLocaleString('vi-VN')}
                    đ
                  </td>
                </tr>

                {/* GROUP 3: THƯỞNG HIỆU SUẤT TƯ VẤN, BÁN HÀNG & TIPS */}
                <tr className="bg-purple-500/10 dark:bg-purple-950/25 border-y border-purple-500/30">
                  <td
                    colSpan={4}
                    className="py-2 px-3 text-left font-bold text-purple-800 dark:text-purple-200 uppercase tracking-wider text-[11px]"
                  >
                    ⭐ III. Thưởng hiệu suất tư vấn, Bán hàng & Tips
                  </td>
                </tr>

                {/* (12) Lượt check-in ca */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    12
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lượt check-in xoay ca</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    {selectedRecord.checkinCount || 0} lượt check-in phục vụ
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                    {selectedRecord.checkinCount || 0}
                  </td>
                </tr>

                {/* (13) Thưởng CC Xoay (Được nhận) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                    13
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                    Thưởng CC Xoay (Được nhận)
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-[11px] font-normal">
                    {(selectedRecord.ccXoayHoldBonus || 0) > 0
                      ? `Thưởng gốc ${formatVND(selectedRecord.rawCcXoayBonus || 0)}đ từ ${selectedRecord.checkinCount} lượt; cap 150% Daily Bonus, on hold ${formatVND(selectedRecord.ccXoayHoldBonus || 0)}đ`
                      : `Bóc tách ${selectedRecord.checkinCount} lượt check-in`}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    +{Math.round(selectedRecord.ccXoayBonus).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (14) Thưởng Bán Combo & Sản Phẩm */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-emerald-500/5 dark:bg-emerald-950/10">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-mono">
                    14
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-emerald-700 dark:text-emerald-300">
                    Thưởng Bán Combo & Sản Phẩm
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 text-[11px] font-normal">
                    {selectedRecord.comboCount || 0} combo + {selectedRecord.productCount || 0} sản phẩm
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    +{Math.round(selectedRecord.comboProductBonus || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (15) Thưởng CC Tip (20% Tip Share) */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                    15
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                    Thưởng CC Tip (20% Tip Share)
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 text-[11px]">
                    Thực nhận 20% tip từ {selectedRecord.tippedVisitsCount || 0} lượt khách cho (ngưỡng &ge; 20k)
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                    +{Math.round(selectedRecord.ccTipBonus || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (16) Thưởng CT Kim Cương */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400 font-mono">
                    16
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                    Thưởng CT Kim Cương (Giới thiệu KH)
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    Giới thiệu {selectedRecord.diamondCount || 0} khách hàng mới
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                    +{Math.round(selectedRecord.diamondBonus || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (17) Thưởng Nóng Minigame & Points */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    17
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                    Thưởng Nóng Minigame & Points
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    Vượt mốc minigame tuần & vòng quay
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                    +{Math.round(selectedRecord.minigameBonus || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* GROUP 4: PHỤ CẤP & CÔNG LÀM VIỆC */}
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                  <td
                    colSpan={4}
                    className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                  >
                    🛵 IV. Phụ cấp & Công làm việc
                  </td>
                </tr>

                {/* (18) Ngày làm việc thực tế trong tháng */}
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
                    {selectedRecord.activeDays || 0} / {selectedRecord.expectedWorkDays || 26}
                  </td>
                </tr>

                {/* (19) Phụ cấp gửi xe */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                    19
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp gửi xe</td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                    {selectedRecord.parkingCalculation ||
                      `200.000đ / ${selectedRecord.expectedWorkDays || 26} * ${selectedRecord.activeDays || 0}`}
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    +{Math.round(selectedRecord.parkingAllowance || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (20) Phụ cấp khác: Mỗi phụ cấp hiển thị 1 dòng riêng */}
                {selectedRecord.otherAllowancesDetails && selectedRecord.otherAllowancesDetails.length > 0 ? (
                  selectedRecord.otherAllowancesDetails.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px]">
                        20.{idx + 1}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                        {item.description || 'Phụ cấp khác'}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {item.source === 'mos' ? (
                              <Tag color="cyan" className="text-[10px] mr-1">
                                mOS
                              </Tag>
                            ) : (
                              <Tag color="default" className="text-[10px] mr-1">
                                Legacy
                              </Tag>
                            )}
                            {item.note
                              ? item.note
                              : item.createdAt
                                ? `Tạo ngày ${dayjs(item.createdAt).format('DD/MM/YYYY')}`
                                : 'Khoản điều chỉnh'}
                          </span>
                          {item.source === 'mos' && item.id ? (
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
                                icon={<DeleteOutlined className="text-xs" />}
                                className="h-5 px-1 text-slate-400 hover:text-rose-500"
                              />
                            </Popconfirm>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className={`py-1.5 px-3 text-right tabular-nums font-semibold ${
                          item.amount < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
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
                      20
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp khác</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      Chưa có khoản phụ cấp nào trong tháng này
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-slate-400">0đ</td>
                  </tr>
                )}
                {/* Nút thêm phụ cấp khác tại mOS */}
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
                  <td colSpan={4} className="py-1.5 px-3 text-right">
                    <Button
                      type="dashed"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={onOpenAllowanceModal}
                      className="text-xs text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:text-purple-500"
                    >
                      + Thêm phụ cấp khác tại mOS
                    </Button>
                  </td>
                </tr>

                {/* Phạt trừ thưởng nếu có */}
                {selectedRecord.penalties && selectedRecord.penalties > 0 ? (
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-rose-600 dark:text-rose-400">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono">
                      !
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phạt trừ thưởng</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px]">—</td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      -{Math.round(selectedRecord.penalties).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ) : null}

                {/* GROUP 5: TỔNG THU NHẬP & THỰC LÃNH */}
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                  <td
                    colSpan={4}
                    className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                  >
                    💰 V. Tổng thu nhập & Thực lãnh (Net)
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
                    Lương thời gian + Thưởng thời gian (off tuần) + Thưởng CC (Xoay, Combo/SP, Tips, Kim Cương) + Gửi xe
                    + Phụ cấp khác
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-700 dark:text-blue-300 text-sm">
                    {Math.round(selectedRecord.totalIncome).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* (21) BHXH */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-rose-500/5 dark:bg-rose-950/10">
                  <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-mono">
                    21
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-300 font-bold">
                    Khấu trừ BHXH (10.5% NLĐ)
                  </td>
                  <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-[11px] font-normal">
                    Khấu trừ người lao động đóng (10.5%)
                  </td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                    -{Math.round(selectedRecord.socialSecurityAmount || 0).toLocaleString('vi-VN')}đ
                  </td>
                </tr>

                {/* Chi tiết Wings đóng */}
                {selectedRecord.socialSecurityAmount && selectedRecord.socialSecurityAmount > 0 ? (
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
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employer?.totalAmount || 1161000
                        ).toLocaleString('vi-VN')}
                        đ
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                      <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">
                        BHXH (17.5%)
                      </td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                      <td className="py-0.5 px-3 text-right tabular-nums">
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employer?.socialAmount || 945000
                        ).toLocaleString('vi-VN')}
                        đ
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                      <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHYT (3%)</td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                      <td className="py-0.5 px-3 text-right tabular-nums">
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employer?.healthAmount || 162000
                        ).toLocaleString('vi-VN')}
                        đ
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                      <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHTN (1%)</td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                      <td className="py-0.5 px-3 text-right tabular-nums">
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employer?.unemploymentAmount || 54000
                        ).toLocaleString('vi-VN')}
                        đ
                      </td>
                    </tr>

                    {/* Nhân sự đóng */}
                    <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
                      <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400"></td>
                      <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-rose-700 dark:text-rose-300 font-medium">
                        ↳ {selectedRecord.displayName} (NLĐ đóng 10.5%)
                      </td>
                      <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-500/80 text-[10px]">
                        Trừ trực tiếp vào lương
                      </td>
                      <td className="py-1 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                        -{Math.round(selectedRecord.socialSecurityAmount || 567000).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                      <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHXH (8%)</td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                      <td className="py-0.5 px-3 text-right tabular-nums">
                        -
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employee?.socialAmount || 432000
                        ).toLocaleString('vi-VN')}
                        đ
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                      <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHYT (1.5%)</td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                      <td className="py-0.5 px-3 text-right tabular-nums">
                        -
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employee?.healthAmount || 81000
                        ).toLocaleString('vi-VN')}
                        đ
                      </td>
                    </tr>
                    <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                      <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHTN (1%)</td>
                      <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                      <td className="py-0.5 px-3 text-right tabular-nums">
                        -
                        {Math.round(
                          selectedRecord.socialSecurityBreakdown?.employee?.unemploymentAmount || 54000
                        ).toLocaleString('vi-VN')}
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
                    {Math.round(
                      selectedRecord.netIncome ??
                        selectedRecord.totalIncome - (selectedRecord.socialSecurityAmount || 0)
                    ).toLocaleString('vi-VN')}
                    đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Motivational Message Card */}
          <div className="p-3 bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-transparent border border-purple-300/40 dark:border-purple-800/30 rounded-lg text-center text-xs font-medium text-purple-800 dark:text-purple-300">
            🌟{' '}
            {selectedRecord.congratulationMessage ||
              'Chúc mừng bạn đã hoàn thành xuất sắc ca làm việc! Tiếp tục bùng nổ doanh số và chăm sóc khách hàng chu đáo nhé! 🌟'}{' '}
            💼
          </div>

          {/* Company Legal Information Footer */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
              <span>CÔNG TY TNHH WINGS LASHES</span>
              <span>Tax Number: 0313891996 • Hotline: 1800 8154</span>
            </div>
            <div>• Chi nhánh 1: 159 - 159A Đề Thám, P. Cô Giang, Q. 1, TP. Hồ Chí Minh</div>
            <div>• Chi nhánh 2: L5-08, 09 Estella Place, 88 Song Hành, P. An Phú, TP. Thủ Đức, TP. Hồ Chí Minh</div>
          </div>
        </div>
      )}
    </Modal>
  );
}
