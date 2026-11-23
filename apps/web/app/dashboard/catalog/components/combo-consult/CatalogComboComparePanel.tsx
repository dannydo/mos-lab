'use client';

import { Button, Card, Col, Row, Space } from 'antd';
import { Scale } from 'lucide-react';
import { calculateComboPurchaseAccounting, type MatchedComboPackageOption } from '@mos-lab/shared';

interface CatalogComboComparePanelProps {
  comparedPackages: MatchedComboPackageOption[];
  includeVat: boolean;
  isDark: boolean;
  onClearCompare: () => void;
  onToggleCompare: (pkgId: string) => void;
}

export function CatalogComboComparePanel({
  comparedPackages,
  includeVat,
  isDark,
  onClearCompare,
  onToggleCompare,
}: CatalogComboComparePanelProps) {
  if (comparedPackages.length === 0) return null;

  return (
    <Card
      size="small"
      className="rounded-2xl border-amber-500"
      title={
        <Space>
          <Scale className="w-4 h-4 text-amber-500" />
          <span>Bàn Cân So Sánh Trực Tiếp ({comparedPackages.length}/3 Gói Combo)</span>
        </Space>
      }
      extra={
        <Button size="small" type="link" danger onClick={onClearCompare}>
          Xóa tất cả so sánh
        </Button>
      }
    >
      <Row gutter={[12, 12]}>
        {comparedPackages.map((cp) => {
          const displayPrice = includeVat ? cp.comboPriceWithVat : cp.comboPrice;
          const acc = calculateComboPurchaseAccounting(cp);
          return (
            <Col xs={24} md={8} key={cp.id}>
              <div
                className={`p-3 rounded-xl border h-full flex flex-col justify-between space-y-2 ${
                  isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-sm">{cp.displayName}</span>
                    <Button size="small" type="text" onClick={() => onToggleCompare(cp.id)}>
                      ✕
                    </Button>
                  </div>
                  <div className="text-xs mt-0.5 text-neutral-500">
                    {cp.readableContent} · HSD {cp.validityMonths} tháng
                  </div>
                </div>
                <div className="space-y-1 text-xs pt-2 border-t border-neutral-200 dark:border-neutral-700 tabular-nums">
                  <div className="flex justify-between">
                    <span>Giá gói ({includeVat ? 'Gồm VAT' : 'Chưa VAT'}):</span>
                    <strong className="text-amber-600 text-sm">{displayPrice.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Giá lẻ tổng {cp.totalSessions} lần:</span>
                    <span className="line-through">{cp.retailTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiết kiệm cho khách:</span>
                    <strong className="text-emerald-600">
                      -{cp.savingsAmount.toLocaleString('vi-VN')} đ (+{cp.discountPct}%)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Đơn giá bình quân:</span>
                    <strong>~{cp.avgPerSessionPrice.toLocaleString('vi-VN')} đ/lần</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sau khi trừ buổi 1 hôm nay:</span>
                    <strong className="text-indigo-600">
                      Còn {acc.remainingWalletAfterToday.totalRemaining}/{cp.totalSessions} lần (
                      {acc.remainingWalletAfterToday.totalPaidRemaining} Mua +{' '}
                      {acc.remainingWalletAfterToday.totalBonusRemaining} Tặng 0đ)
                    </strong>
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}
