'use client';

import { Button, Card, Col, Row } from 'antd';
import type { CashAccount } from '@mos-lab/shared';

export interface CashFlowAccountsTabProps {
  accounts: CashAccount[];
  onEditAccount: (account: CashAccount) => void;
}

export function CashFlowAccountsTab({ accounts, onEditAccount }: CashFlowAccountsTabProps) {
  return (
    <Row gutter={[16, 16]}>
      {accounts.map((acc) => (
        <Col key={acc.id} xs={24} sm={12} md={8} lg={6}>
          <Card
            bordered={false}
            className="shadow-sm border border-neutral-200 dark:border-neutral-800"
            actions={[
              <Button key="edit" type="link" onClick={() => onEditAccount(acc)}>
                Cập nhật số dư / Ngưỡng AT
              </Button>,
            ]}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                {acc.accountType === 'CASH' ? 'Tiền mặt' : 'Ngân hàng'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {acc.code}
              </span>
            </div>
            <div className="font-bold text-base text-neutral-800 dark:text-neutral-100">{acc.name}</div>
            {acc.accountNumber && (
              <div className="text-xs text-neutral-400 mt-0.5">
                STK: {acc.accountNumber} ({acc.bankName})
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-neutral-400">Số dư hiện tại:</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {acc.currentBalance.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Ngưỡng an toàn:</span>
                <span className="font-semibold text-emerald-500">
                  {acc.minSafetyThreshold.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
