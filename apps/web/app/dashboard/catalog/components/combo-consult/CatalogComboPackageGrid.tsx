'use client';

import { Alert, Button, Card, Col, Row } from 'antd';
import { Check, Copy, Scale } from 'lucide-react';
import { calculateComboPurchaseAccounting, type MatchedComboPackageOption } from '@mos-lab/shared';
import { WingsComboCard } from '../../../../ios-app/components/ui-kit/WingsComboCard';

interface CatalogComboPackageGridProps {
  packages: MatchedComboPackageOption[];
  compareIds: string[];
  activeSimPkgId?: string;
  copiedId: string | null;
  includeVat: boolean;
  isDark: boolean;
  onSelectSimPkg: (pkgId: string) => void;
  onToggleCompare: (pkgId: string) => void;
  onCopyQuote: (pkg: MatchedComboPackageOption) => void;
  onZoomCard: (card: { title: string; imageUrl: string }) => void;
}

export function CatalogComboPackageGrid({
  packages,
  compareIds,
  activeSimPkgId,
  copiedId,
  includeVat,
  isDark,
  onSelectSimPkg,
  onToggleCompare,
  onCopyQuote,
  onZoomCard,
}: CatalogComboPackageGridProps) {
  return (
    <Row gutter={[12, 12]}>
      {packages.map((pkg) => {
        const isCompared = compareIds.includes(pkg.id);
        const isSimSelected = activeSimPkgId === pkg.id;
        const acc = calculateComboPurchaseAccounting(pkg);

        return (
          <Col xs={24} md={12} xl={8} key={pkg.id}>
            <Card
              size="small"
              hoverable={!pkg.isLocked}
              className={`rounded-2xl h-full ${pkg.isLocked ? 'opacity-75' : ''} ${
                isSimSelected ? 'border-2 border-amber-500' : ''
              }`}
            >
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2.5">
                  {/* Luxury Membership Card Design */}
                  <WingsComboCard
                    pkg={pkg}
                    selected={isSimSelected}
                    includeVat={includeVat}
                    compact
                    onSelect={() => {
                      if (!pkg.isLocked) onSelectSimPkg(pkg.id);
                    }}
                    onZoomOriginalCard={
                      pkg.cardImageUrl || pkg.cardPreviewUrl
                        ? () =>
                            onZoomCard({
                              title: pkg.displayName,
                              imageUrl: pkg.cardImageUrl || pkg.cardPreviewUrl,
                            })
                        : undefined
                    }
                  />

                  {/* Accounting Summary Box */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs space-y-1 tabular-nums ${
                      isDark ? 'bg-neutral-800/50 border-neutral-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Hạch toán khi mua tại Checkout:</span>
                      <span className="text-emerald-600">Trừ luôn buổi 1 hôm nay (0đ lẻ)</span>
                    </div>
                    <div className="flex justify-between text-neutral-500">
                      <span>• Số dư ví còn sau hôm nay:</span>
                      <strong>
                        {acc.remainingWalletAfterToday.totalRemaining}/{pkg.totalSessions} lần (
                        {acc.remainingWalletAfterToday.totalPaidRemaining} Mua +{' '}
                        {acc.remainingWalletAfterToday.totalBonusRemaining} Tặng 0đ)
                      </strong>
                    </div>
                    <div className="flex justify-between text-neutral-500">
                      <span>• Doanh thu thực hiện hôm nay / Giữ ví:</span>
                      <strong>
                        {acc.recognizedRevenueToday.toLocaleString('vi-VN')}đ /{' '}
                        {acc.deferredRevenueBalance.toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                  </div>

                  {pkg.isLocked && pkg.lockReason && <Alert type="warning" showIcon message={pkg.lockReason} />}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="small"
                    type={isCompared ? 'primary' : 'default'}
                    icon={<Scale className="w-3.5 h-3.5" />}
                    onClick={() => onToggleCompare(pkg.id)}
                  >
                    {isCompared ? 'Đang so sánh' : 'So sánh'}
                  </Button>
                  <Button
                    size="small"
                    icon={copiedId === pkg.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    onClick={() => void onCopyQuote(pkg)}
                  >
                    {copiedId === pkg.id ? 'Đã copy' : 'Copy báo giá Zalo'}
                  </Button>
                  <Button
                    size="small"
                    type={isSimSelected ? 'primary' : 'dashed'}
                    disabled={pkg.isLocked}
                    className="flex-1"
                    onClick={() => onSelectSimPkg(pkg.id)}
                  >
                    Mô phỏng kế toán
                  </Button>
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
