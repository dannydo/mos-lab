'use client';

import React from 'react';
import { Alert, Button, Collapse, DatePicker, Input, InputNumber, Progress, Radio, Select, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { RefreshCw, WalletCards } from 'lucide-react';
import type {
  AcademyTalentPaymentManagementRow,
  AcademyTalentPaymentManagementStatus,
  AcademyTalentPaymentManagementSummary,
  AcademyTalentPaymentMethod,
  AcademyTalentPaymentTrace,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useAcademyAccess } from '../components/AcademyAccessGate';
import { formatVND } from '../../../../lib/format-utils';
import {
  AdaptiveModal,
  AppIcon,
  DataSection,
  DataTable,
  FeaturePage,
  IconText,
  SearchField,
  StatePanel,
  StatusTag,
  TableIndexHeader,
} from '../../../../components/ui';
import AcademyTalentFollowUpPaymentSlip, {
  type AcademyTalentFollowUpPaymentSlipSnapshot,
} from '../components/AcademyTalentFollowUpPaymentSlip';
import styles from '../components/AcademyTalentWorkshop.module.css';
import {
  currentRole,
  dateLabel,
  DEPOSIT_PRESET_VND,
  mobilePaymentCard,
  MONTH_STORAGE_KEY,
  PAGE_SIZE_OPTIONS,
  PAGE_SIZE_STORAGE_KEY,
  PAGE_STORAGE_KEY,
  PaymentSummaryMetrics,
  paymentMethodLabel,
  paymentProgressPercent,
  paymentStatusMeta,
  persistedMonth,
  persistedNumber,
  persistedStatus,
  STATUS_OPTIONS,
  STATUS_STORAGE_KEY,
  traceActorName,
} from './payment-management.helpers';

export default function AcademyPaymentManagementPage() {
  const { canAccess: academyAllowed, canManage } = useAcademyAccess();
  const [role, setRole] = React.useState('');
  const [month, setMonth] = React.useState<Dayjs>(persistedMonth);
  const [status, setStatus] = React.useState<AcademyTalentPaymentManagementStatus>(persistedStatus);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [page, setPage] = React.useState(() => persistedNumber(PAGE_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = React.useState(() => persistedNumber(PAGE_SIZE_STORAGE_KEY, 20, [10, 20, 50, 100]));
  const [rows, setRows] = React.useState<AcademyTalentPaymentManagementRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<AcademyTalentPaymentManagementSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AcademyTalentPaymentManagementRow | null>(null);
  const [trace, setTrace] = React.useState<AcademyTalentPaymentTrace | null>(null);
  const [traceLoading, setTraceLoading] = React.useState(false);
  const [traceError, setTraceError] = React.useState<string | null>(null);
  const [collecting, setCollecting] = React.useState<AcademyTalentPaymentManagementRow | null>(null);
  const [collectionAmountVnd, setCollectionAmountVnd] = React.useState<number | null>(null);
  const [collectionMethod, setCollectionMethod] = React.useState<AcademyTalentPaymentMethod>('BANK_TRANSFER');
  const [collectionReference, setCollectionReference] = React.useState('');
  const [collectionNote, setCollectionNote] = React.useState('');
  const [paymentSlipOpen, setPaymentSlipOpen] = React.useState(false);
  const [savingCollection, setSavingCollection] = React.useState(false);
  const requestVersionRef = React.useRef(0);
  const traceRequestVersionRef = React.useRef(0);

  React.useEffect(() => setRole(currentRole()), []);

  React.useEffect(() => {
    window.localStorage.setItem(PAGE_STORAGE_KEY, String(page));
  }, [page]);
  React.useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);
  React.useEffect(() => {
    window.localStorage.setItem(STATUS_STORAGE_KEY, status);
  }, [status]);
  React.useEffect(() => {
    window.localStorage.setItem(MONTH_STORAGE_KEY, month.format('YYYY-MM'));
  }, [month]);

  const load = React.useCallback(async () => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.academySales.listTalentPaymentManagement({
        page,
        limit: pageSize,
        month: month.format('YYYY-MM'),
        status,
        search: deferredSearch.trim() || undefined,
      });
      if (version !== requestVersionRef.current) return;
      setRows(response.data);
      setTotal(response.total);
      setSummary(response.summary || null);
    } catch (nextError: any) {
      if (version !== requestVersionRef.current) return;
      setRows([]);
      setTotal(0);
      setSummary(null);
      setError(nextError?.response?.data?.message || 'Không thể tải quản lý thu học phí Academy.');
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, [deferredSearch, month, page, pageSize, status]);

  React.useEffect(() => {
    if (academyAllowed) void load();
  }, [academyAllowed, load]);

  React.useEffect(() => {
    const assessmentId = detail?.assessmentId;
    if (!assessmentId) {
      setTrace(null);
      setTraceError(null);
      setTraceLoading(false);
      return;
    }
    const version = ++traceRequestVersionRef.current;
    setTrace(null);
    setTraceError(null);
    setTraceLoading(true);
    void apiClient.academySales
      .getTalentPaymentTrace(assessmentId)
      .then((response) => {
        if (version === traceRequestVersionRef.current) setTrace(response.data);
      })
      .catch((nextError: any) => {
        if (version === traceRequestVersionRef.current) {
          setTraceError(nextError?.response?.data?.message || 'Không thể tải dấu vết phiếu học phí.');
        }
      })
      .finally(() => {
        if (version === traceRequestVersionRef.current) setTraceLoading(false);
      });
  }, [detail?.assessmentId]);

  const updateStatus = React.useCallback((nextStatus: AcademyTalentPaymentManagementStatus) => {
    setStatus(nextStatus);
    setPage(1);
  }, []);
  const updateSearch = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const updateMonth = React.useCallback((value: Dayjs | null) => {
    setMonth((value || dayjs()).startOf('month'));
    setPage(1);
  }, []);
  const openCollection = React.useCallback((row: AcademyTalentPaymentManagementRow) => {
    if (row.paymentStatus === 'PAID' || row.remainingVnd <= 0) {
      message.info('Phiếu này đã thu đủ học phí.');
      return;
    }
    const firstDeposit =
      row.totalPaidVnd === 0 && row.paymentMode === 'DEPOSIT'
        ? Math.min(row.remainingVnd, row.requiredDepositVnd)
        : row.remainingVnd;
    setCollectionAmountVnd(Math.max(0, Math.round(firstDeposit)) || null);
    setCollectionMethod('BANK_TRANSFER');
    setCollectionReference('');
    setCollectionNote('');
    setCollecting(row);
  }, []);

  const closeCollection = React.useCallback(() => {
    if (savingCollection) return;
    setCollecting(null);
    setPaymentSlipOpen(false);
  }, [savingCollection]);

  const requestedAmountVnd = React.useMemo(() => Math.round(Number(collectionAmountVnd) || 0), [collectionAmountVnd]);
  const paymentSlipSnapshot = React.useMemo<AcademyTalentFollowUpPaymentSlipSnapshot | null>(() => {
    if (!collecting) return null;
    return {
      invoiceNumber: collecting.invoiceNumber,
      requestSequence: collecting.paymentCount + 1,
      totalPaidVnd: collecting.totalPaidVnd,
      remainingVnd: collecting.remainingVnd,
      selectedItems: collecting.courseLabel ? [collecting.courseLabel] : [],
    };
  }, [collecting]);

  const openPaymentSlipPreview = React.useCallback(() => {
    if (!collecting) return;
    if (requestedAmountVnd <= 0) {
      message.warning('Nhập số tiền cần lập phiếu.');
      return;
    }
    if (requestedAmountVnd > collecting.remainingVnd) {
      message.warning(`Số tiền trên phiếu không được vượt quá phần còn lại ${formatVND(collecting.remainingVnd)}.`);
      return;
    }
    setPaymentSlipOpen(true);
  }, [collecting, requestedAmountVnd]);

  const printPaymentSlip = React.useCallback(() => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }, []);

  const confirmCollection = React.useCallback(async () => {
    if (!collecting) return;
    const amountVnd = requestedAmountVnd;
    if (amountVnd <= 0) {
      message.warning('Nhập số tiền thực tế đã nhận.');
      return;
    }
    if (amountVnd > collecting.remainingVnd) {
      message.warning(`Số tiền không được vượt quá phần còn lại ${formatVND(collecting.remainingVnd)}.`);
      return;
    }
    setSavingCollection(true);
    try {
      const response = await apiClient.academySales.recordTalentAssessmentPayment(collecting.assessmentId, {
        amountVnd,
        method: collectionMethod,
        reference: collectionReference.trim() || null,
        note: collectionNote.trim() || null,
      });
      message.success(response.message || 'Đã xác nhận khoản thu học phí.');
      setPaymentSlipOpen(false);
      setCollecting(null);
      setDetail(null);
      await load();
    } catch (nextError: any) {
      message.error(nextError?.response?.data?.message || 'Không thể xác nhận khoản thu.');
    } finally {
      setSavingCollection(false);
    }
  }, [collecting, collectionMethod, collectionNote, collectionReference, load, requestedAmountVnd]);

  const columns = React.useMemo<ColumnsType<AcademyTalentPaymentManagementRow>>(
    () => [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 54,
        align: 'center',
        render: (_value, _row, index) => (
          <span className="tabular-nums font-medium">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      {
        key: 'learner',
        title: 'Học viên',
        width: 210,
        render: (_value, row) => (
          <div>
            <strong>{row.lead.name}</strong>
            <div className="text-xs opacity-60">{row.lead.phone || 'Chưa có SĐT'}</div>
          </div>
        ),
      },
      {
        key: 'invoice',
        title: 'Phiếu / khóa học',
        width: 300,
        render: (_value, row) => (
          <div>
            <strong className="text-xs">{row.invoiceNumber}</strong>
            <div className="mt-1 text-xs opacity-70">{row.courseLabel}</div>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng thái thu',
        width: 166,
        render: (_value, row) => {
          const value = paymentStatusMeta(row.paymentStatus);
          return <StatusTag status={value.tone} label={value.label} />;
        },
      },
      {
        key: 'tuition',
        title: 'Học phí',
        width: 132,
        align: 'right',
        render: (_value, row) => <span className="tabular-nums">{formatVND(row.tuitionVnd)}</span>,
      },
      {
        key: 'received',
        title: 'Đã nhận',
        width: 132,
        align: 'right',
        render: (_value, row) => (
          <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatVND(row.totalPaidVnd)}</strong>
        ),
      },
      {
        key: 'remaining',
        title: 'Còn follow-up',
        width: 142,
        align: 'right',
        render: (_value, row) => (
          <strong className="tabular-nums">{row.paymentStatus === 'PAID' ? '—' : formatVND(row.remainingVnd)}</strong>
        ),
      },
      {
        key: 'latest',
        title: 'Thu gần nhất',
        width: 180,
        render: (_value, row) =>
          row.latestPayment ? (
            <div>
              <div className="text-xs">
                {paymentMethodLabel(row.latestPayment.method)} · {dateLabel(row.latestPayment.receivedAt)}
              </div>
              <div className="mt-1 text-xs opacity-60">{row.latestPayment.reference || 'Chưa có mã giao dịch'}</div>
            </div>
          ) : (
            <span className="text-xs opacity-60">Chưa xác nhận tiền</span>
          ),
      },
      {
        key: 'actions',
        title: canManage ? 'Thu tiền' : 'Chi tiết',
        width: 164,
        render: (_value, row) => (
          <Space size={2}>
            {canManage && row.paymentStatus !== 'PAID' && (
              <Button type="primary" size="small" onClick={() => openCollection(row)}>
                Thu tiền
              </Button>
            )}
            <Button type="link" size="small" onClick={() => setDetail(row)}>
              Chi tiết
            </Button>
          </Space>
        ),
      },
    ],
    [canManage, openCollection, page, pageSize]
  );

  if (!role) return <StatePanel kind="loading" title="Đang xác thực quyền thu học phí Academy…" />;
  if (!academyAllowed)
    return (
      <StatePanel
        kind="error"
        title="Bạn không có quyền truy cập thu học phí Academy"
        description="Khu vực này chỉ dành cho Admin hoặc thành viên đang hoạt động của Department Academy."
      />
    );

  return (
    <FeaturePage
      title="Quản lý cọc & thu học phí"
      subtitle="Cọc cần follow-up, khoản đã đối soát và doanh thu Academy. Phiếu in hoặc QR chưa được xác nhận không được tính là doanh thu."
      icon={<AppIcon icon={WalletCards} size="md" />}
      tag={<StatusTag status="purple" label="Academy" />}
      headerActions={
        <Button aria-label="Làm mới quản lý thu học phí" loading={loading} onClick={() => void load()}>
          <IconText icon={loading ? undefined : <AppIcon icon={RefreshCw} size="action" />}>Làm mới</IconText>
        </Button>
      }
      toolbar={{
        primary: (
          <SearchField
            behavior="filter"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Tìm học viên, SĐT, mã phiếu hoặc khóa học không dấu…"
            allowClear
          />
        ),
        filters: (
          <Space wrap>
            <DatePicker
              picker="month"
              allowClear={false}
              value={month}
              onChange={updateMonth}
              aria-label="Tháng ghi nhận thu học phí"
            />
            <Select
              aria-label="Lọc trạng thái thu học phí"
              value={status}
              onChange={updateStatus}
              options={STATUS_OPTIONS}
              style={{ minWidth: 190 }}
            />
          </Space>
        ),
        filterTitle: 'Bộ lọc thu học phí',
        activeFilterCount: status === 'FOLLOW_UP' ? 1 : status === 'ALL' ? 0 : 1,
      }}
    >
      <PaymentSummaryMetrics loading={loading} monthLabel={month.format('MM/YYYY')} summary={summary} />

      <DataSection
        title="Hàng đợi thu học phí"
        extra={<span className="tabular-nums text-xs opacity-70">{total.toLocaleString('vi-VN')} phiếu</span>}
        state={loading ? 'loading' : error ? 'error' : rows.length === 0 ? 'empty' : undefined}
        stateTitle={error || (status === 'FOLLOW_UP' ? 'Không còn cọc cần follow-up' : 'Chưa có phiếu học phí phù hợp')}
        stateDescription={error ? 'Hãy thử làm mới dữ liệu.' : 'Chỉ phiếu đã in mới xuất hiện tại đây.'}
        stateExtra={error ? <Button onClick={() => void load()}>Thử lại</Button> : undefined}
      >
        <DataTable
          rowKey="assessmentId"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 1480 }}
          stickyPrimaryColumn
          columnPriority={{
            stt: 'secondary',
            learner: 'primary',
            invoice: 'primary',
            status: 'primary',
            tuition: 'secondary',
            received: 'primary',
            remaining: 'primary',
            latest: 'secondary',
            actions: 'primary',
          }}
          mobileRenderer={(row) => mobilePaymentCard(row, (nextRow) => setDetail(nextRow))}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              if (nextPageSize !== pageSize) setPageSize(nextPageSize);
            },
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count, range) => `Hiển thị ${range[0]}-${range[1]} / ${count.toLocaleString('vi-VN')}`,
          }}
        />
      </DataSection>

      <AdaptiveModal
        open={Boolean(detail)}
        title={
          detail ? (
            <div className="min-w-0">
              <div className="truncate">Thu học phí · {detail.lead.name}</div>
              <div className="mt-0.5 truncate text-xs font-normal opacity-60">
                {detail.invoiceNumber} · {detail.courseLabel}
              </div>
            </div>
          ) : (
            'Chi tiết thu học phí'
          )
        }
        onCancel={() => setDetail(null)}
        footer={
          <Space wrap>
            <Button onClick={() => setDetail(null)}>Đóng</Button>
            {detail && detail.paymentStatus !== 'PAID' && (
              <Button type="primary" onClick={() => openCollection(detail)}>
                Thu thêm {formatVND(detail.remainingVnd)}
              </Button>
            )}
          </Space>
        }
        intent="detail"
      >
        {detail && (
          <div className="grid gap-5">
            <section className="grid gap-4 rounded-xl border border-inherit p-4" aria-label="Tình trạng thu học phí">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>Tình trạng thu học phí</strong>
                    <StatusTag
                      status={paymentStatusMeta(detail.paymentStatus).tone}
                      label={paymentStatusMeta(detail.paymentStatus).label}
                    />
                  </div>
                  <p className="mt-1 text-sm opacity-70">
                    Đã xác nhận {formatVND(detail.totalPaidVnd)} trên tổng học phí {formatVND(detail.tuitionVnd)}.
                  </p>
                </div>
                {detail.paymentStatus !== 'PAID' ? (
                  <span className="rounded-lg border border-inherit px-3 py-2 text-right text-sm">
                    <span className="block text-xs opacity-60">Việc cần làm</span>
                    <strong className="mt-0.5 block tabular-nums">Thu thêm {formatVND(detail.remainingVnd)}</strong>
                  </span>
                ) : (
                  <span className="rounded-lg border border-inherit px-3 py-2 text-right text-sm">
                    <span className="block text-xs opacity-60">Trạng thái</span>
                    <strong className="mt-0.5 block">Đã hoàn tất</strong>
                  </span>
                )}
              </div>

              <Progress
                percent={paymentProgressPercent(detail.totalPaidVnd, detail.tuitionVnd)}
                strokeColor="var(--ant-color-primary)"
                trailColor="var(--ant-color-fill-tertiary)"
                format={(percent) => `${percent || 0}% đã thu`}
              />

              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(152px, 1fr))' }}>
                <div className="rounded-lg border border-inherit p-3">
                  <span className="text-xs opacity-60">Tổng học phí</span>
                  <strong className="mt-1 block tabular-nums">{formatVND(detail.tuitionVnd)}</strong>
                </div>
                <div className="rounded-lg border border-inherit p-3">
                  <span className="text-xs opacity-60">Đã xác nhận</span>
                  <strong className="mt-1 block tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatVND(detail.totalPaidVnd)}
                  </strong>
                </div>
                <div className="rounded-lg border border-inherit p-3">
                  <span className="text-xs opacity-60">Còn phải thu</span>
                  <strong className="mt-1 block tabular-nums">{formatVND(detail.remainingVnd)}</strong>
                </div>
              </div>
            </section>

            <section aria-label="Lịch sử các khoản đã xác nhận">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>Khoản thu đã xác nhận</strong>
                  <p className="mt-0.5 text-xs opacity-70">
                    Chỉ các khoản đã đối soát mới được ghi nhận vào doanh thu Academy.
                  </p>
                </div>
                <span className="tabular-nums text-xs opacity-60">{detail.payments.length} lần thu</span>
              </div>
              {detail.payments.length ? (
                <div className="grid gap-2">
                  {detail.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-inherit p-3"
                    >
                      <div>
                        <strong className="tabular-nums">{formatVND(payment.amountVnd)}</strong>
                        <div className="mt-1 text-xs opacity-70">
                          {paymentMethodLabel(payment.method)} · {payment.reference || 'Chưa có mã giao dịch'}
                        </div>
                      </div>
                      <div className="text-right text-xs opacity-70">
                        <time dateTime={payment.receivedAt}>{dateLabel(payment.receivedAt)}</time>
                        <br />
                        {payment.confirmedBy?.displayName || 'Hệ thống'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-inherit p-3 text-sm opacity-70">
                  Chưa có khoản tiền nào được xác nhận. Phiếu yêu cầu thanh toán hoặc QR chưa tạo doanh thu.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-inherit p-3" aria-label="Dấu vết đối soát">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>Dấu vết đối soát</strong>
                  <p className="mt-0.5 text-xs opacity-70">
                    Mở khi cần kiểm tra ưu đãi, người tham gia và lịch sử bất biến.
                  </p>
                </div>
                {trace && (
                  <StatusTag
                    status={trace.reviewFlags.length ? 'warning' : 'success'}
                    label={
                      trace.reviewFlags.length ? `${trace.reviewFlags.length} tín hiệu cần kiểm tra` : 'Đủ dấu vết'
                    }
                  />
                )}
              </div>
              {traceLoading && <p className="text-sm opacity-70">Đang tải dấu vết phiếu học phí…</p>}
              {traceError && <Alert type="error" showIcon message="Không tải được dấu vết" description={traceError} />}
              {trace && (
                <Collapse
                  bordered={false}
                  size="small"
                  items={[
                    {
                      key: 'profile-and-promotion',
                      label: 'Hồ sơ học viên, phiếu & ưu đãi',
                      children: (
                        <div
                          className="grid gap-3 text-sm"
                          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
                        >
                          <div className="rounded-lg border border-inherit p-3">
                            <span className="text-xs opacity-60">Học viên / nguồn</span>
                            <strong className="mt-1 block">{trace.learner.name}</strong>
                            <span className="block text-xs opacity-70">
                              {[trace.learner.phone, trace.learner.email, trace.learner.source]
                                .filter(Boolean)
                                .join(' · ') || 'Chưa có thông tin nguồn'}
                            </span>
                          </div>
                          <div className="rounded-lg border border-inherit p-3">
                            <span className="text-xs opacity-60">Ưu đãi đã chốt</span>
                            <strong className="mt-1 block tabular-nums">
                              {trace.promotion.scholarshipPercent}% · {formatVND(trace.promotion.scholarshipVnd)}
                            </strong>
                            <span className="block text-xs opacity-70">
                              {trace.promotion.tierLabel || 'Không có học bổng'} · Giá cuối{' '}
                              {formatVND(trace.promotion.finalPriceVnd)}
                            </span>
                          </div>
                          <div className="rounded-lg border border-inherit p-3">
                            <span className="text-xs opacity-60">Phiếu học phí</span>
                            <strong className="mt-1 block">{trace.invoice.documentNumber}</strong>
                            <span className="block text-xs opacity-70">
                              Phiên bản {trace.invoice.revision || 1} · {dateLabel(trace.invoice.issuedAt)}
                            </span>
                          </div>
                          {trace.promotion.policyAudit && (
                            <div className="rounded-lg border border-inherit p-3">
                              <span className="text-xs opacity-60">Chính sách ưu đãi</span>
                              <strong className="mt-1 block">Phiên bản #{trace.promotion.policyAudit.id}</strong>
                              <span className="block text-xs opacity-70">
                                {trace.promotion.policyAudit.changedBy?.displayName || 'Hệ thống'} ·{' '}
                                {dateLabel(trace.promotion.policyAudit.changedAt)}
                              </span>
                            </div>
                          )}
                          {trace.reviewFlags.length > 0 && (
                            <Alert
                              className="col-span-full"
                              type="warning"
                              showIcon
                              message="Tín hiệu nghiệp vụ cần kiểm tra"
                              description={
                                <ul className="m-0 pl-4">
                                  {trace.reviewFlags.map((flag) => (
                                    <li key={flag.code}>{flag.message}</li>
                                  ))}
                                </ul>
                              }
                            />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'people',
                      label: `Người liên quan (${trace.actors.length})`,
                      children: (
                        <div
                          className="grid gap-2"
                          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}
                        >
                          {trace.actors.map((actor) => (
                            <div
                              key={`${actor.role}-${actor.staff?.id || actor.recordedName}`}
                              className="flex items-center justify-between gap-3 rounded-md border border-inherit px-3 py-2 text-xs"
                            >
                              <span className="opacity-70">{actor.label}</span>
                              <strong className="text-right">{traceActorName(actor)}</strong>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                    {
                      key: 'timeline',
                      label: `Nhật ký bất biến (${trace.events.length})`,
                      children: trace.events.length ? (
                        <div className="grid gap-2">
                          {trace.events.map((event) => (
                            <div
                              key={event.id}
                              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-inherit px-3 py-2 text-xs"
                            >
                              <span>
                                <strong>{event.summary}</strong>
                                <span className="mt-0.5 block opacity-70">
                                  {event.actor?.displayName || 'Hệ thống'}
                                </span>
                              </span>
                              <time className="tabular-nums text-right opacity-70" dateTime={event.occurredAt}>
                                {dateLabel(event.occurredAt)}
                              </time>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs opacity-70">
                          Chưa có timeline lịch sử cho phiếu này; các lần thao tác tiếp theo sẽ được ghi nhận.
                        </p>
                      ),
                    },
                  ]}
                />
              )}
            </section>
          </div>
        )}
      </AdaptiveModal>

      <AdaptiveModal
        open={Boolean(collecting)}
        title={collecting ? `Xác nhận khoản thu · ${collecting.lead.name}` : 'Xác nhận khoản thu'}
        onCancel={closeCollection}
        footer={[
          <Button key="cancel" disabled={savingCollection} onClick={closeCollection}>
            Hủy
          </Button>,
          <Button key="payment-slip" disabled={savingCollection} onClick={openPaymentSlipPreview}>
            Lập phiếu thanh toán
          </Button>,
          <Button key="confirm" type="primary" loading={savingCollection} onClick={() => void confirmCollection()}>
            Xác nhận đã nhận tiền
          </Button>,
        ]}
        intent="detail"
      >
        {collecting && (
          <div className="grid gap-4">
            <Alert
              type="warning"
              showIcon
              message="Chỉ xác nhận sau khi đã đối soát thực tế"
              description="Thao tác này tạo khoản thu chính thức, cập nhật doanh thu Academy và không thể dùng phiếu/QR chưa thanh toán để thay thế."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Học phí phiếu</span>
                <strong className="mt-1 block tabular-nums">{formatVND(collecting.tuitionVnd)}</strong>
              </div>
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Đã nhận</span>
                <strong className="mt-1 block tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatVND(collecting.totalPaidVnd)}
                </strong>
              </div>
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Còn lại</span>
                <strong className="mt-1 block tabular-nums">{formatVND(collecting.remainingVnd)}</strong>
              </div>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Hình thức thu</span>
                <Radio.Group value={collectionMethod} onChange={(event) => setCollectionMethod(event.target.value)}>
                  <Radio value="BANK_TRANSFER">Chuyển khoản</Radio>
                  <Radio value="CASH">Tiền mặt</Radio>
                </Radio.Group>
              </label>
              <div className="grid gap-1 text-sm">
                <span className="font-medium">Chọn nhanh số tiền</span>
                <Space wrap>
                  <Button
                    size="small"
                    type={requestedAmountVnd === collecting.remainingVnd ? 'primary' : 'default'}
                    onClick={() => setCollectionAmountVnd(collecting.remainingVnd)}
                  >
                    Thu đủ · {formatVND(collecting.remainingVnd)}
                  </Button>
                  <Button
                    size="small"
                    type={requestedAmountVnd === DEPOSIT_PRESET_VND ? 'primary' : 'default'}
                    disabled={collecting.remainingVnd < DEPOSIT_PRESET_VND}
                    onClick={() => setCollectionAmountVnd(DEPOSIT_PRESET_VND)}
                  >
                    1.000.000 đ
                  </Button>
                </Space>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Số tiền đã nhận (VNĐ)</span>
                <InputNumber
                  className="w-full tabular-nums"
                  min={1}
                  max={collecting.remainingVnd}
                  precision={0}
                  value={collectionAmountVnd}
                  formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(value) => Number(value?.replace(/\D/g, '') || 0)}
                  onChange={(value) => setCollectionAmountVnd(typeof value === 'number' ? value : null)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">
                  {collectionMethod === 'BANK_TRANSFER'
                    ? 'Mã giao dịch / nội dung chuyển khoản'
                    : 'Số phiếu thu / người nộp'}
                </span>
                <Input
                  value={collectionReference}
                  maxLength={160}
                  onChange={(event) => setCollectionReference(event.target.value)}
                  placeholder={
                    collectionMethod === 'BANK_TRANSFER' ? 'Ví dụ: MBVCB.123456' : 'Ví dụ: PT-000123 / Nguyễn Thị A'
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Ghi chú đối soát</span>
                <Input.TextArea
                  value={collectionNote}
                  rows={3}
                  onChange={(event) => setCollectionNote(event.target.value)}
                  placeholder={
                    collectionMethod === 'BANK_TRANSFER'
                      ? 'Xác nhận theo sao kê ngân hàng'
                      : 'Xác nhận theo biên nhận tiền mặt'
                  }
                />
              </label>
            </div>
          </div>
        )}
      </AdaptiveModal>

      <AdaptiveModal
        className={styles.paymentSlipPreviewModal}
        destroyOnClose
        open={paymentSlipOpen && Boolean(collecting && paymentSlipSnapshot)}
        title="Xem trước phiếu yêu cầu thanh toán"
        onCancel={() => setPaymentSlipOpen(false)}
        intent="detail"
        footer={[
          <Button key="back" onClick={() => setPaymentSlipOpen(false)}>
            Quay lại xác nhận thu
          </Button>,
          <Button key="print" type="primary" onClick={printPaymentSlip}>
            In phiếu {collectionMethod === 'BANK_TRANSFER' ? 'chuyển khoản' : 'nộp tiền mặt'}
          </Button>,
        ]}
      >
        {collecting && paymentSlipSnapshot && (
          <div className={styles.paymentSlipPreviewSheet}>
            <AcademyTalentFollowUpPaymentSlip
              lead={collecting.lead}
              snapshot={paymentSlipSnapshot}
              amountVnd={requestedAmountVnd}
              method={collectionMethod}
              reference={collectionReference}
            />
          </div>
        )}
      </AdaptiveModal>

      {collecting && paymentSlipSnapshot && paymentSlipOpen && (
        <div className={styles.printOnly} aria-hidden="true">
          <AcademyTalentFollowUpPaymentSlip
            lead={collecting.lead}
            snapshot={paymentSlipSnapshot}
            amountVnd={requestedAmountVnd}
            method={collectionMethod}
            reference={collectionReference}
          />
        </div>
      )}
    </FeaturePage>
  );
}
