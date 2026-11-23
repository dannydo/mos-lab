'use client';

import { Button, Space } from 'antd';
import dayjs from 'dayjs';
import { Printer, Wallet } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { AdaptiveModal, StatusTag } from '~/components/ui';
import { CvPaystubAllowanceAndNetRows } from './CvPaystubAllowanceAndNetRows';
import { CvPaystubSelfManagedSection } from './CvPaystubSelfManagedSection';
import { CvPaystubTimeAndBonusRows } from './CvPaystubTimeAndBonusRows';

interface CvPaystubDetailModalProps {
  open: boolean;
  onClose: () => void;
  selectedRecord: CvPaystubRecord | null;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  canManagePaystub: boolean;
  onOpenAllowanceModal: () => void;
  onDeleteAllowance: (allowanceId: number | string) => Promise<void>;
}

/** 28-item Wings Legacy payslip modal with staff profile, CVL self-managed perks, and printable layout. */
export function CvPaystubDetailModal({
  open,
  onClose,
  selectedRecord,
  dateRange,
  canManagePaystub,
  onOpenAllowanceModal,
  onDeleteAllowance,
}: CvPaystubDetailModalProps) {
  const periodLabel = dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY');

  return (
    <AdaptiveModal
      intent="detail"
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 pr-8 border-b pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Wallet className="w-[18px] h-[18px] text-amber-500 shrink-0" />
            <span className="font-bold text-base">Phiếu Lương Live Chi Tiết - {selectedRecord?.staffName}</span>
          </div>
          <Space>
            <StatusTag status="gold" label={`KỲ: ${periodLabel}`} className="font-mono text-xs px-2 py-0.5" />
            <Button
              size="small"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => {
                if (typeof window !== 'undefined') window.print();
              }}
              className="text-xs inline-flex items-center"
            >
              In phiếu
            </Button>
          </Space>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div className="flex items-center justify-between w-full px-2 py-1 gap-2">
          <span className="text-xs italic text-slate-500 dark:text-slate-400">
            💡 Cấu trúc đầy đủ 28 mục đối chiếu chuẩn 100% Wings Legacy
          </span>
          <Button
            type="primary"
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 border-amber-500 text-slate-950 font-semibold"
          >
            Đóng Phiếu Lương
          </Button>
        </div>
      }
      width={780}
    >
      {selectedRecord && (
        <div className="space-y-4 pt-2 text-slate-800 dark:text-slate-200">
          {/* Staff Profile Header Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                  PAYSLIP • MONTH {periodLabel}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">NICKNAME:</span>{' '}
                    <strong className="text-sm font-semibold">{selectedRecord.staffName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">HỌ TÊN:</span>{' '}
                    <strong className="text-sm font-semibold">
                      {selectedRecord.fullName || selectedRecord.staffName}
                    </strong>
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-slate-500 dark:text-slate-400">CHỨC VỤ:</span>
                    {selectedRecord.isCvPlus ? (
                      <StatusTag
                        status="gold"
                        label={
                          <span className="inline-flex items-center gap-1">
                            <span>Chuyên Viên Tự Chủ (</span>
                            <CvFeather1Badge featherClass="w-3 h-3 text-amber-500" />
                            <span>)</span>
                          </span>
                        }
                        className="text-xs border-amber-400"
                      />
                    ) : (
                      <StatusTag status="cyan" label="Chuyên Viên (CV)" className="text-xs" />
                    )}
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-slate-500 dark:text-slate-400">BỘ PHẬN/ PHÒNG BAN:</span>
                    <StatusTag status="processing" label={selectedRecord.store} className="text-xs" />
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
              <div className="text-right shrink-0">
                <div className="text-[11px] text-slate-400">Mã NV: #{selectedRecord.staffId}</div>
                <StatusTag status="success" label="Active" className="mt-1" />
              </div>
            </div>
          </div>

          {/* ĐÃI NGỘ CHUYÊN VIÊN TỰ CHỦ (CVL) */}
          {selectedRecord.isCvPlus && selectedRecord.cvPlusBreakdown && (
            <CvPaystubSelfManagedSection breakdown={selectedRecord.cvPlusBreakdown} />
          )}

          {/* 28-row Wings Legacy Payslip Table */}
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
                <CvPaystubTimeAndBonusRows record={selectedRecord} />
                <CvPaystubAllowanceAndNetRows
                  record={selectedRecord}
                  canManagePaystub={canManagePaystub}
                  onOpenAllowanceModal={onOpenAllowanceModal}
                  onDeleteAllowance={onDeleteAllowance}
                />
              </tbody>
            </table>
          </div>

          {/* Congratulation Message Card */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-800/30 rounded-lg text-center text-xs font-medium text-amber-800 dark:text-amber-300">
            🍗{' '}
            {selectedRecord.congratulationMessage ||
              'Chúc mừng bạn đã thành Đùi Gà ngon ngon. Tháng sau biến hình Thiên Thần nhé!'}{' '}
            👼
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
    </AdaptiveModal>
  );
}
