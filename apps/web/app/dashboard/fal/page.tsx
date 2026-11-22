'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Alert, Card } from 'antd';
import { DataTable } from '~/components/ui';
import { FalRulesModal } from './components/FalRulesModal';
import { FalControlTowerHeader } from './fal-page-modules/FalControlTowerHeader';
import { FalExplanationModal } from './fal-page-modules/FalExplanationModal';
import { FalTraceDrawer } from './fal-page-modules/FalTraceDrawer';
import { FAL_PAGE_SIZE_OPTIONS, type FalCase } from './fal-page-modules/falPageTypes';
import { buildFalTableColumns, FAL_COLUMN_PRIORITY, FalMobileRecordCard } from './fal-page-modules/falTableColumns';
import { useFalControlTowerPage } from './fal-page-modules/useFalControlTowerPage';
import styles from './fal.module.css';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });

export default function FalControlTowerPage() {
  const {
    data,
    loading,
    rule,
    dateRangeMode,
    selectedDate,
    page,
    pageSize,
    total,
    selected,
    customerDrawerOpen,
    setCustomerDrawerOpen,
    selectedCustomerId,
    explanationOpen,
    setExplanationOpen,
    traceOpen,
    setTraceOpen,
    rulesOpen,
    setRulesOpen,
    traceDrawerWidth,
    isTraceResizing,
    startTraceResize,
    form,
    load,
    moveDate,
    changeDateMode,
    handleDateValueChange,
    handleRuleChange,
    handlePaginationChange,
    openCustomerDetail,
    openTraceDrawer,
    openExplanationModal,
    submitExplanation,
    approve,
  } = useFalControlTowerPage();

  const columns = useMemo(
    () =>
      buildFalTableColumns({
        page,
        pageSize,
        onOpenCustomerDetail: openCustomerDetail,
        onOpenTrace: openTraceDrawer,
        onApproveLog: approve,
        onOpenExplanation: openExplanationModal,
      }),
    [approve, openCustomerDetail, openExplanationModal, openTraceDrawer, page, pageSize]
  );

  return (
    <div className={`responsive-page responsive-workspace fal-page ${styles.page}`}>
      <FalControlTowerHeader
        dateRangeMode={dateRangeMode}
        selectedDate={selectedDate}
        rule={rule}
        onModeChange={changeDateMode}
        onMoveDate={moveDate}
        onDateValueChange={handleDateValueChange}
        onRuleChange={handleRuleChange}
        onOpenRules={() => setRulesOpen(true)}
        onRefresh={() => load()}
      />

      <Alert
        type="warning"
        showIcon
        message="Tua CV chạy ngay theo tổng phút: 1–25 phút về tua đầu, >25 phút về tua cuối. Riêng Log vẫn cần duyệt giải trình trước khi chốt điểm hoặc thưởng."
      />

      <Card title={`FAL từ Wings (${total.toLocaleString('vi-VN')} ca)`}>
        <DataTable<FalCase>
          rowKey="orderServiceId"
          size="small"
          className="compact-table fal-control-table"
          loading={loading}
          dataSource={data}
          scroll={{ x: 1420 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: FAL_PAGE_SIZE_OPTIONS,
            showTotal: (value) => `Tổng ${value.toLocaleString('vi-VN')} ca`,
            onChange: handlePaginationChange,
          }}
          columns={columns}
          columnPriority={FAL_COLUMN_PRIORITY}
          stickyPrimaryColumn
          mobileRenderer={(record) => (
            <FalMobileRecordCard
              record={record}
              onOpenCustomerDetail={openCustomerDetail}
              onOpenTrace={openTraceDrawer}
            />
          )}
        />
      </Card>

      <FalTraceDrawer
        open={traceOpen}
        width={traceDrawerWidth}
        isResizing={isTraceResizing}
        selected={selected}
        onClose={() => setTraceOpen(false)}
        onStartResize={startTraceResize}
      />

      <CustomerDetailDrawer
        open={customerDrawerOpen}
        customerId={selectedCustomerId}
        onClose={() => setCustomerDrawerOpen(false)}
      />

      <FalRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <FalExplanationModal
        open={explanationOpen}
        selected={selected}
        form={form}
        onClose={() => setExplanationOpen(false)}
        onSubmit={submitExplanation}
      />
    </div>
  );
}
