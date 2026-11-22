'use client';

import React from 'react';
import { Button } from 'antd';
import { RefreshCw, WalletCards } from 'lucide-react';
import { AppIcon, FeaturePage, IconText, SearchField, StatePanel, StatusTag } from '~/components/ui';
import { useAcademyAccess } from '../components/AcademyAccessGate';
import { PaymentSummaryMetrics } from './payment-management.helpers';
import { PaymentCollectionModals } from './payments-page-modules/PaymentCollectionModals';
import { PaymentDetailModal } from './payments-page-modules/PaymentDetailModal';
import { PaymentManagementFilters } from './payments-page-modules/PaymentManagementFilters';
import { PaymentQueueSection } from './payments-page-modules/PaymentQueueSection';
import { usePaymentCollection } from './payments-page-modules/usePaymentCollection';
import { usePaymentManagementData } from './payments-page-modules/usePaymentManagementData';

export default function AcademyPaymentManagementPage() {
  const { canAccess: academyAllowed, canManageRestricted } = useAcademyAccess();
  const data = usePaymentManagementData(academyAllowed);
  const { load, setDetail } = data;

  const handleCollected = React.useCallback(async () => {
    setDetail(null);
    await load();
  }, [load, setDetail]);

  const collection = usePaymentCollection(handleCollected);

  if (!academyAllowed) {
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập thu học phí Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của Department Academy."
      />
    );
  }

  return (
    <FeaturePage
      title="Quản lý cọc & thu học phí"
      subtitle="Cọc cần follow-up, khoản đã đối soát và doanh thu Academy. Phiếu in hoặc QR chưa được xác nhận không được tính là doanh thu."
      icon={<AppIcon icon={WalletCards} size="md" />}
      tag={<StatusTag status="purple" label="Academy" />}
      headerActions={
        <Button aria-label="Làm mới quản lý thu học phí" loading={data.loading} onClick={() => void load()}>
          <IconText icon={data.loading ? undefined : <AppIcon icon={RefreshCw} size="action" />}>Làm mới</IconText>
        </Button>
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={data.search}
            onChange={(event) => data.updateSearch(event.target.value)}
            placeholder="Tìm học viên, SĐT, mã phiếu hoặc khóa học không dấu…"
            allowClear
          />
        ),
        filters: (
          <PaymentManagementFilters
            month={data.month}
            status={data.status}
            onMonthChange={data.updateMonth}
            onStatusChange={data.updateStatus}
          />
        ),
        filterTitle: 'Bộ lọc thu học phí',
        activeFilterCount: data.status === 'FOLLOW_UP' ? 1 : data.status === 'ALL' ? 0 : 1,
      }}
    >
      <PaymentSummaryMetrics loading={data.loading} monthLabel={data.month.format('MM/YYYY')} summary={data.summary} />

      <PaymentQueueSection
        rows={data.rows}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        status={data.status}
        loading={data.loading}
        error={data.error}
        canManageRestricted={canManageRestricted}
        onRetry={() => void load()}
        onPageChange={data.handlePageChange}
        onCollect={collection.openCollection}
        onViewDetail={setDetail}
      />

      <PaymentDetailModal
        detail={data.detail}
        trace={data.trace}
        traceLoading={data.traceLoading}
        traceError={data.traceError}
        onClose={() => setDetail(null)}
        onCollect={collection.openCollection}
      />

      <PaymentCollectionModals
        collecting={collection.collecting}
        collectionAmountVnd={collection.collectionAmountVnd}
        onCollectionAmountChange={collection.setCollectionAmountVnd}
        collectionMethod={collection.collectionMethod}
        onCollectionMethodChange={collection.setCollectionMethod}
        collectionReference={collection.collectionReference}
        onCollectionReferenceChange={collection.setCollectionReference}
        collectionNote={collection.collectionNote}
        onCollectionNoteChange={collection.setCollectionNote}
        requestedAmountVnd={collection.requestedAmountVnd}
        paymentSlipOpen={collection.paymentSlipOpen}
        paymentSlipSnapshot={collection.paymentSlipSnapshot}
        savingCollection={collection.savingCollection}
        onCloseCollection={collection.closeCollection}
        onOpenPaymentSlipPreview={collection.openPaymentSlipPreview}
        onClosePaymentSlipPreview={() => collection.setPaymentSlipOpen(false)}
        onPrintPaymentSlip={collection.printPaymentSlip}
        onConfirmCollection={collection.confirmCollection}
      />
    </FeaturePage>
  );
}
