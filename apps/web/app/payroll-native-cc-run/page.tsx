'use client';

import { Alert, Card, Divider, Segmented, Space, Statistic, Tag, Typography } from 'antd';
import type { NativeCcPayrollLocalRunResponse } from '@mos-lab/shared';
import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api-client';

const { Title, Paragraph, Text } = Typography;

function formatHalfDong(amountHalfDong: number): string {
  const amount = amountHalfDong / 2;
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: amount % 1 ? 1 : 0 })} đ`;
}

function evidenceLabel(kind: NativeCcPayrollLocalRunResponse['evidence'][number]['kind']): string {
  if (kind === 'COMPLETED_SERVICE') return 'Dịch vụ đã hoàn thành';
  if (kind === 'DAILY_SALES_CLOSE') return 'Chốt doanh số ngày';
  return 'Cash tip';
}

function capSourceLabel(component: string): string {
  if (component === 'CC_XOAY_CASH') return 'Dịch vụ đã hoàn thành · ca local #001';
  if (component === 'CC_DAILY_BONUS') return 'Chốt doanh số ngày · 16/12';
  if (component === 'CC_XOAY_CAP_HOLD') return 'Phần Xoay vượt cap · policy tự tạo';
  if (component === 'CC_POLICY_FINALIZED') return 'Xác nhận policy đã chốt';
  return component;
}

export default function PayrollNativeCcRunPage() {
  const [run, setRun] = useState<NativeCcPayrollLocalRunResponse | null>(null);
  const [legacyComparison, setLegacyComparison] = useState<import('@mos-lab/shared').LegacyCcComparisonResponse | null>(
    null
  );
  const [parityReplay, setParityReplay] = useState<import('@mos-lab/shared').LegacyCcParityReplayResponse | null>(null);
  const [cohortAudit, setCohortAudit] = useState<import('@mos-lab/shared').LegacyCcCohortAuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'actual' | 'fixtures'>('actual');
  const pilotSubjects = cohortAudit?.cc.filter((subject) => subject.status === 'PASS') ?? [];

  useEffect(() => {
    void apiClient.safeDevNativeCcPayroll
      .run()
      .then(setRun)
      .catch(() => setError('Không thể chạy rehearsal local. Kiểm tra Safe Dev và database loopback rồi thử lại.'));
    void apiClient.safeDevLegacyCcComparison
      .run()
      .then(setLegacyComparison)
      .catch(() => setLegacyError('Chưa có connector Legacy chỉ-đọc trên runtime local này.'));
    void apiClient.safeDevLegacyCcParityReplay
      .run()
      .then(setParityReplay)
      .catch(() => {
        setLegacyError('Không thể hoàn tất replay parity local từ nguồn Legacy chỉ-đọc.');
      });
    void apiClient.safeDevLegacyCcCohortAudit
      .run()
      .then(setCohortAudit)
      .catch(() => {
        setLegacyError('Không thể hoàn tất audit cohort CC từ nguồn Legacy chỉ-đọc.');
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-10">
      <section className="mx-auto max-w-5xl">
        <Space direction="vertical" size={18} className="w-full">
          <div>
            <Tag color="blue">LOCAL-ONLY</Tag>
            <Title level={1} className="mb-2 mt-3!">
              CC Native Payroll Run
            </Title>
            <Paragraph className="max-w-3xl text-base">
              Rehearsal native: evidence mOS → ledger bất biến → settlement REVIEWING/LOCKED → export có hash. Bản đối
              chiếu Legacy, nếu có, chỉ được đọc riêng ở local; không tạo Adjustment và không post tiền.
            </Paragraph>
          </div>

          <Alert
            type="success"
            showIcon
            message="Dữ liệu thật và case kiểm thử được tách riêng"
            description="Dữ liệu thật là để đối chiếu từng tháng. Case A/B chỉ là fixture kỹ thuật, không tính vào bất kỳ tháng hay nhân sự nào."
          />

          <Segmented
            block
            onChange={(value) => setViewMode(value as 'actual' | 'fixtures')}
            options={[
              { label: 'Dữ liệu thật · Diễm Hương', value: 'actual' },
              { label: 'Case kiểm thử kỹ thuật', value: 'fixtures' },
            ]}
            value={viewMode}
          />

          {error ? <Alert type="error" showIcon message={error} /> : null}
          {!run && !error ? <Card loading title="Đang dựng local payroll run…" /> : null}

          {run ? (
            <>
              {viewMode === 'actual' && legacyComparison ? (
                <Card size="small" title={`Đối chiếu Legacy chỉ-đọc · ${legacyComparison.staff.displayName}`}>
                  <Space direction="vertical" size={10} className="w-full">
                    <Alert
                      type="warning"
                      showIcon
                      message="Dữ liệu thật để so logic, không phải settlement mOS"
                      description="Các khoản bên dưới chỉ được đọc từ Legacy để đối chiếu. Chúng không được ghi thành evidence mOS, không được khóa và không thể tạo payout."
                    />
                    <Text type="secondary">
                      Mỗi thẻ là một tháng riêng. Cash Tip dùng đúng khoản Legacy đã ghi có cho CC; tỷ lệ đã được áp
                      dụng ở từng dòng nên không nhân lần hai. Số tổng chỉ gồm CC Xoay sau cap, Daily Bonus và Cash Tip
                      — không phải tổng payslip.
                    </Text>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {legacyComparison.months.map((month) => (
                        <div className="rounded border border-amber-700/60 px-4 py-3" key={month.periodKey}>
                          <Space direction="vertical" size={8} className="w-full">
                            <Text strong>
                              Tháng {month.periodKey.slice(5)}/{month.periodKey.slice(0, 4)}
                            </Text>
                            <div className="grid grid-cols-2 gap-3">
                              <Statistic title="Xoay gốc" value={month.rawXoayVnd} suffix="đ" />
                              <Statistic title="Daily Bonus" value={month.dailyBonusVnd} suffix="đ" />
                              <Statistic title="Cap Xoay 150%" value={month.maxXoayAllowedVnd} suffix="đ" />
                              <Statistic title="HOLD Xoay" value={month.heldXoayVnd} suffix="đ" />
                              <Statistic title="Cash Tip đã ghi có" value={month.cashTipVnd} suffix="đ" />
                              <Statistic title="Tổng 3 khoản" value={month.componentTotalVnd} suffix="đ" />
                            </div>
                            <Text>
                              Xoay sau cap: {month.rawXoayVnd.toLocaleString('en-US')}đ −{' '}
                              {month.heldXoayVnd.toLocaleString('en-US')}đ ={' '}
                              {month.effectiveXoayVnd.toLocaleString('en-US')}đ.
                            </Text>
                            <Text>
                              Cash Tip: 10% một đầu ca = {month.cashTipBreakdown.handoff10Vnd.toLocaleString('en-US')}đ
                              ({month.cashTipBreakdown.handoff10Rows} dòng) · 20% cả check-in và check-out ={' '}
                              {month.cashTipBreakdown.fullFlow20Vnd.toLocaleString('en-US')}đ (
                              {month.cashTipBreakdown.fullFlow20Rows} dòng).
                            </Text>
                            <Text type={month.cashTipBreakdown.ruleMismatchRows === 0 ? 'success' : 'danger'}>
                              {month.cashTipBreakdown.ruleMismatchRows === 0
                                ? 'Không có dòng Cash Tip nào lệch quy tắc 10% / 20%.'
                                : `${month.cashTipBreakdown.ruleMismatchRows} dòng Cash Tip lệch quy tắc, trị giá ${month.cashTipBreakdown.ruleMismatchVnd.toLocaleString('en-US')}đ.`}
                            </Text>
                            <Text type="secondary">
                              Nguồn: {month.evidenceCounts.xoayLedgerRows} dòng Cash Xoay ·{' '}
                              {month.evidenceCounts.dailyCloses} ngày Daily Bonus · {month.evidenceCounts.cashTipRows}{' '}
                              dòng Cash Tip · tỷ lệ Legacy {month.cashTipPercentages.join('% / ')}% (đã nằm trong số ghi
                              có).
                            </Text>
                          </Space>
                        </div>
                      ))}
                    </div>
                    {parityReplay ? (
                      <div className="rounded border border-emerald-700/60 bg-emerald-950/30 px-4 py-3">
                        <Text strong>Replay parity cục bộ · ledger → settlement LOCKED → export</Text>
                        <br />
                        <Text type="secondary">
                          Đây là bản chạy kiểm chứng từ snapshot Legacy chỉ-đọc; không phải evidence mOS native và không
                          thể tạo payout.
                        </Text>
                        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                          {parityReplay.months.map((month) => (
                            <div className="rounded border border-emerald-800/80 px-3 py-2" key={month.sourcePeriodKey}>
                              <Text strong>
                                Tháng {month.sourcePeriodKey.slice(5)}/{month.sourcePeriodKey.slice(0, 4)}
                              </Text>
                              <br />
                              <Text type="success">
                                KHỚP tuyệt đối: Xoay {month.localLedger.rawXoayVnd.toLocaleString('en-US')}đ · Daily{' '}
                                {month.localLedger.dailyBonusVnd.toLocaleString('en-US')}đ · Tip{' '}
                                {month.localLedger.cashTipVnd.toLocaleString('en-US')}đ · HOLD{' '}
                                {month.localLedger.heldXoayVnd.toLocaleString('en-US')}đ · settlement{' '}
                                {month.localLedger.settlementReceivedVnd.toLocaleString('en-US')}đ.
                              </Text>
                              <br />
                              <Tag color="green">LOCKED local</Tag> <Tag color="blue">Export verified</Tag>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {cohortAudit ? (
                      <div className="rounded border border-sky-700/60 bg-sky-950/30 px-4 py-3">
                        <Text strong>Nhóm pilot đã xác nhận · audit CC tháng 8 và 9</Text>
                        <br />
                        <Text type="success">
                          Sẵn sàng pilot: {pilotSubjects.length} CC có đủ hai tháng nguồn và Cash Tip đúng rule. Các CC
                          khác có rule/nguồn khác được tách khỏi đợt này.
                        </Text>
                        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                          {pilotSubjects.map((subject) => (
                            <div className="rounded border border-sky-800/80 px-3 py-2" key={subject.displayName}>
                              <Tag color="green">PASS</Tag> <Text strong>{subject.displayName}</Text>
                              <br />
                              <Text type="secondary">
                                T8: {subject.months[0]?.cashTipRows || 0} tip rows · T9:{' '}
                                {subject.months[1]?.cashTipRows || 0} tip rows · lệch rule:{' '}
                                {subject.months.reduce((total, month) => total + month.ruleMismatchRows, 0)}.
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Space>
                </Card>
              ) : null}
              {viewMode === 'actual' && legacyError ? <Alert type="info" showIcon message={legacyError} /> : null}

              {viewMode === 'fixtures' ? (
                <Card size="small" title="Case A · Kỳ native CC đã chạy">
                  <Space direction="vertical" size={10} className="w-full">
                    <Text strong>
                      {run.normalExample.subjectLabel} · {run.period.label} · {run.period.status}
                    </Text>
                    <Text type="secondary">
                      {run.normalExample.explanation} Settlement v{run.period.version} đã khóa tại local và export hash
                      đã được xác minh.
                    </Text>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Statistic title="Tổng trước chốt" value={run.settlement.grossAmount} suffix="đ" />
                      <Statistic title="Thực nhận" value={run.settlement.receivedAmount} suffix="đ" />
                      <Statistic title="Hold" value={run.settlement.holdAmount} suffix="đ" />
                    </div>
                    <Space wrap>
                      {run.safeguards.map((safeguard) => (
                        <Tag color={safeguard === 'NO_PAYOUT' ? 'red' : 'green'} key={safeguard}>
                          {safeguard === 'MOS_ONLY_EVIDENCE'
                            ? 'Chỉ evidence mOS'
                            : safeguard === 'HALF_DONG_EXACT'
                              ? 'Chính xác nửa đồng'
                              : 'Không payout'}
                        </Tag>
                      ))}
                    </Space>
                  </Space>
                </Card>
              ) : null}

              {viewMode === 'fixtures' ? (
                <Card size="small" title="Case A · Evidence mOS bất biến">
                  <Space direction="vertical" size={8} className="w-full">
                    {run.evidence.map((evidence) => (
                      <div className="rounded border border-slate-700 px-3 py-2" key={evidence.sourceReference}>
                        <Text strong>{evidenceLabel(evidence.kind)}</Text>
                        <br />
                        <Text>{evidence.component}</Text>
                        <Text className="float-right">{formatHalfDong(evidence.amountHalfDong)}</Text>
                        <br />
                        <Text type="secondary">Nguồn mOS · {evidence.policyVersion || 'rule cố định'}</Text>
                      </div>
                    ))}
                  </Space>
                </Card>
              ) : null}

              {viewMode === 'fixtures' ? (
                <Card size="small" title="Case A · Ledger và chốt kỳ">
                  <Space direction="vertical" size={8} className="w-full">
                    {run.ledger.map((event) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded border border-slate-700 px-3 py-2"
                        key={event.sourceReference + event.component}
                      >
                        <Text>{event.component}</Text>
                        <Text strong>{formatHalfDong(event.amountHalfDong)}</Text>
                      </div>
                    ))}
                    <Divider className="my-1! border-slate-700" />
                    <Text type="secondary">
                      Không có nút sửa, regenerate, Adjustment hay post tiền trên màn này. Hết kỳ, sửa sai chỉ đi bằng
                      Adjustment của kỳ sau.
                    </Text>
                  </Space>
                </Card>
              ) : null}

              {viewMode === 'fixtures' ? (
                <Card size="small" title="Case B · Cap tháng: thấy rõ Evidence khác Ledger">
                  <Space direction="vertical" size={10} className="w-full">
                    <Alert
                      type="warning"
                      showIcon
                      message="Case B không phải Case A"
                      description={run.capExample.explanation}
                    />
                    <Text strong>{run.capExample.subjectLabel}</Text>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Statistic title="CC Xoay Cash gốc" value={run.capExample.rawXoayHalfDong / 2} suffix="đ" />
                      <Statistic title="CC Xoay sau cap" value={run.capExample.xoayCapHalfDong / 2} suffix="đ" />
                      <Statistic title="Daily Bonus tháng" value={run.capExample.dailyBonusHalfDong / 2} suffix="đ" />
                      <Statistic title="Settlement tháng" value={run.capExample.ledgerTotalHalfDong / 2} suffix="đ" />
                    </div>
                    <Text>
                      Nguồn CC Xoay: {run.capExample.rawXoayExplanation} Phép tính một: CC Xoay gốc{' '}
                      {formatHalfDong(run.capExample.rawXoayHalfDong)} − HOLD{' '}
                      {formatHalfDong(-run.capExample.capHoldHalfDong)} = CC Xoay sau cap{' '}
                      {formatHalfDong(run.capExample.xoayCapHalfDong)}. Phép tính hai: CC Xoay sau cap{' '}
                      {formatHalfDong(run.capExample.xoayCapHalfDong)} + Daily Bonus{' '}
                      {formatHalfDong(run.capExample.dailyBonusHalfDong)} = settlement LOCKED{' '}
                      {run.capExample.settlementReceivedAmount.toLocaleString('en-US')}đ.
                    </Text>
                    <Divider className="my-1! border-slate-700" />
                    <Text strong>Trace của kỳ cap riêng</Text>
                    <Alert
                      type="info"
                      showIcon
                      message="Rule áp dụng một lần khi chốt tháng: CC Xoay không vượt 150% Daily Bonus của cả kỳ"
                      description={`Tổng Daily Bonus tháng ${formatHalfDong(run.capExample.dailyBonusHalfDong)} × 150% = cap Xoay ${formatHalfDong(run.capExample.xoayCapHalfDong)}. Tổng Xoay tháng ${formatHalfDong(run.capExample.rawXoayHalfDong)} vượt cap ${formatHalfDong(-run.capExample.capHoldHalfDong)}, nên Ledger tạo đúng một HOLD khi finalize kỳ, thay vì sửa evidence.`}
                    />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded border border-slate-700 px-3 py-2">
                        <Text strong>1. Evidence gốc: nguồn và thời điểm</Text>
                        {run.capExample.evidence.map((evidence) => (
                          <div className="flex justify-between gap-3 py-1" key={evidence.sourceReference}>
                            <Text>{capSourceLabel(evidence.component)}</Text>
                            <Text>{formatHalfDong(evidence.amountHalfDong)}</Text>
                          </div>
                        ))}
                      </div>
                      <div className="rounded border border-slate-700 px-3 py-2">
                        <Text strong>2. Ledger: rule và tác động</Text>
                        {run.capExample.ledger.map((event) => (
                          <div
                            className="flex justify-between gap-3 py-1"
                            key={event.sourceReference + event.component}
                          >
                            <Text>{capSourceLabel(event.component)}</Text>
                            <Text>{formatHalfDong(event.amountHalfDong)}</Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Space>
                </Card>
              ) : null}
            </>
          ) : null}
        </Space>
      </section>
    </main>
  );
}
