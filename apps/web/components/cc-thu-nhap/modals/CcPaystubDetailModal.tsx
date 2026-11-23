'use client';

import React from 'react';
import { Button, Typography } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import { PaystubAllowancesSection } from './cc-paystub-detail-modal/PaystubAllowancesSection';
import { PaystubFooterNotice } from './cc-paystub-detail-modal/PaystubFooterNotice';
import { PaystubModalHeader } from './cc-paystub-detail-modal/PaystubModalHeader';
import { PaystubPerformanceBonusSection } from './cc-paystub-detail-modal/PaystubPerformanceBonusSection';
import { PaystubProfileCard } from './cc-paystub-detail-modal/PaystubProfileCard';
import { PaystubTimeBonusSection } from './cc-paystub-detail-modal/PaystubTimeBonusSection';
import { PaystubTimeSalarySection } from './cc-paystub-detail-modal/PaystubTimeSalarySection';
import { PaystubTotalsSection } from './cc-paystub-detail-modal/PaystubTotalsSection';
import { defaultFormatHoursToHoursMinutes, formatPaystubPeriod } from './cc-paystub-detail-modal/paystubHelpers';
import type { CcPaystubDetailModalProps } from './cc-paystub-detail-modal/types';

export type { CcPaystubDetailModalProps } from './cc-paystub-detail-modal/types';

const { Text } = Typography;

export default function CcPaystubDetailModal({
  open,
  onCancel,
  selectedRecord,
  dateRange,
  onOpenAllowanceModal,
  onDeleteAllowance,
  formatHoursToHoursMinutes = defaultFormatHoursToHoursMinutes,
}: CcPaystubDetailModalProps) {
  const periodLabel = formatPaystubPeriod(dateRange);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <AdaptiveModal
      intent="detail"
      title={
        <PaystubModalHeader displayName={selectedRecord?.displayName} periodLabel={periodLabel} onPrint={handlePrint} />
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
          <PaystubProfileCard record={selectedRecord} periodLabel={periodLabel} />

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
                <PaystubTimeSalarySection
                  record={selectedRecord}
                  formatHoursToHoursMinutes={formatHoursToHoursMinutes}
                />
                <PaystubTimeBonusSection
                  record={selectedRecord}
                  formatHoursToHoursMinutes={formatHoursToHoursMinutes}
                />
                <PaystubPerformanceBonusSection record={selectedRecord} />
                <PaystubAllowancesSection
                  record={selectedRecord}
                  onOpenAllowanceModal={onOpenAllowanceModal}
                  onDeleteAllowance={onDeleteAllowance}
                />
                <PaystubTotalsSection record={selectedRecord} />
              </tbody>
            </table>
          </div>

          <PaystubFooterNotice congratulationMessage={selectedRecord.congratulationMessage} />
        </div>
      )}
    </AdaptiveModal>
  );
}
