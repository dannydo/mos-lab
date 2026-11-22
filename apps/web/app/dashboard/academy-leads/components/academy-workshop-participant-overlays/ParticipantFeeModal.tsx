'use client';

import { Button, Form, Input, InputNumber, Popconfirm, Select, type FormInstance } from 'antd';
import dayjs from 'dayjs';
import { CircleDollarSign, Trash2 } from 'lucide-react';
import type {
  AcademyWorkshopDetail,
  AcademyWorkshopParticipant,
  UpdateAcademyWorkshopParticipantPricingRequest,
} from '@mos-lab/shared';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, StatusTag } from '~/components/ui';
import { formatVndInput, parseVndInput } from '~/lib/format-utils';
import { WORKSHOP_FEE_LABELS } from '../AcademyWorkshopRoster';
import {
  getFeePaymentMethodLabel,
  resolveFeeStatusTone,
  resolveParticipantAppliedFeeVnd,
  type AcademyWorkshopFeeForm,
} from './participant-overlay-types';
import { ParticipantPricingSection } from './ParticipantPricingSection';

export interface ParticipantFeeModalProps {
  open: boolean;
  workshop: AcademyWorkshopDetail;
  selected: AcademyWorkshopParticipant | null;
  busy: boolean;
  feeForm: FormInstance<AcademyWorkshopFeeForm>;
  pricingPreset: string;
  customAppliedFee: number | null;
  customReason: string;
  pricingBusy: boolean;
  onSelectPreset: (presetId: string) => void;
  onCustomAppliedFeeChange: (value: number | null) => void;
  onCustomReasonChange: (value: string) => void;
  onApplyPricing: () => void;
  onUpdatePricing?: (pricing: UpdateAcademyWorkshopParticipantPricingRequest) => Promise<void>;
  onDeleteFeePayment?: (paymentId: number) => Promise<void>;
  onWaiveFee?: (waived: boolean, reason?: string) => Promise<void>;
  onCloseFee: () => void;
  onSaveFee: (values: AcademyWorkshopFeeForm) => void;
}

export function ParticipantFeeModal({
  open,
  workshop,
  selected,
  busy,
  feeForm,
  pricingPreset,
  customAppliedFee,
  customReason,
  pricingBusy,
  onSelectPreset,
  onCustomAppliedFeeChange,
  onCustomReasonChange,
  onApplyPricing,
  onUpdatePricing,
  onDeleteFeePayment,
  onWaiveFee,
  onCloseFee,
  onSaveFee,
}: ParticipantFeeModalProps) {
  return (
    <AdaptiveModal
      open={open}
      title={`Phí workshop · ${selected?.lead.name || ''}`}
      width={600}
      intent="confirm"
      footer={
        <AdaptiveOverlayFooter>
          <Button onClick={onCloseFee}>Đóng</Button>
          {workshop.feeVnd > 0 && (
            <Button
              type="primary"
              icon={<AppIcon icon={CircleDollarSign} />}
              loading={busy}
              onClick={() => feeForm.submit()}
            >
              Ghi nhận thanh toán
            </Button>
          )}
        </AdaptiveOverlayFooter>
      }
      onCancel={onCloseFee}
      destroyOnHidden
    >
      {selected && (
        <div className="space-y-4">
          <div className="rounded-xl border border-inherit bg-slate-50/50 p-3.5 dark:bg-slate-900/30">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Phí niêm yết</div>
                <div className="mt-0.5 font-semibold tabular-nums">{workshop.feeVnd.toLocaleString('vi-VN')} đ</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Học phí áp dụng</div>
                <div className="mt-0.5 font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {resolveParticipantAppliedFeeVnd(selected, workshop.feeVnd).toLocaleString('vi-VN')} đ
                </div>
                {(selected.appliedFeeVnd !== null || selected.discountVnd > 0) && (
                  <div
                    className="truncate text-[10px] text-emerald-600 dark:text-emerald-400"
                    title={selected.discountReason || ''}
                  >
                    {selected.discountReason || 'Có ưu đãi'}
                  </div>
                )}
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Đã đóng</div>
                <div className="mt-0.5 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {selected.feePaidVnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Còn thiếu</div>
                <div
                  className={`mt-0.5 font-semibold tabular-nums ${
                    selected.feeRemainingVnd <= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {selected.feeRemainingVnd.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-inherit/60 pt-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Trạng thái thanh toán:</span>
              <StatusTag
                status={resolveFeeStatusTone(selected.feeStatus)}
                label={WORKSHOP_FEE_LABELS[selected.feeStatus] || selected.feeStatus}
              />
            </div>

            {selected.feeWaivedAt && (
              <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                Đã miễn phí vào lúc {dayjs(selected.feeWaivedAt).format('DD/MM/YYYY HH:mm')}
                {selected.feeWaiverReason ? ` · Lý do: ${selected.feeWaiverReason}` : ''}
              </div>
            )}
          </div>

          {workshop.feeVnd > 0 && onUpdatePricing && (
            <ParticipantPricingSection
              workshopFeeVnd={workshop.feeVnd}
              discountReason={selected.discountReason}
              pricingPreset={pricingPreset}
              customAppliedFee={customAppliedFee}
              customReason={customReason}
              busy={busy}
              pricingBusy={pricingBusy}
              onSelectPreset={onSelectPreset}
              onCustomAppliedFeeChange={onCustomAppliedFeeChange}
              onCustomReasonChange={onCustomReasonChange}
              onApplyPricing={onApplyPricing}
            />
          )}

          {selected.feePayments && selected.feePayments.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lịch sử thanh toán ({selected.feePayments.length})
              </div>
              <div className="divide-y divide-inherit rounded-xl border border-inherit text-xs">
                {selected.feePayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{payment.amountVnd.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">
                          {getFeePaymentMethodLabel(payment.method)}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-60">
                        {dayjs(payment.receivedAt || payment.createdAt).format('DD/MM/YYYY HH:mm')}
                        {payment.reference ? ` · GD: ${payment.reference}` : ''}
                        {payment.confirmedBy ? ` · Duyệt: ${payment.confirmedBy.displayName}` : ''}
                        {payment.note ? ` · ${payment.note}` : ''}
                      </div>
                    </div>
                    {onDeleteFeePayment && (
                      <Popconfirm
                        title="Xóa bút toán thanh toán này?"
                        description="Thao tác này sẽ hoàn tác số tiền đã đóng và cập nhật lại trạng thái phí của học viên."
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true, loading: busy }}
                        onConfirm={() => onDeleteFeePayment(payment.id)}
                      >
                        <Button danger type="text" size="small" icon={<AppIcon icon={Trash2} />} />
                      </Popconfirm>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {workshop.feeVnd > 0 ? (
            <div className="rounded-xl border border-inherit p-3.5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ghi nhận thu tiền ngoài Link/QR
              </div>
              <Form
                form={feeForm}
                layout="vertical"
                size="small"
                onFinish={onSaveFee}
                initialValues={{ method: 'BANK_TRANSFER' }}
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Form.Item
                    name="amountVnd"
                    label="Số tiền thực thu"
                    rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
                  >
                    <InputNumber
                      min={1}
                      precision={0}
                      step={50000}
                      className="w-full"
                      placeholder="Số tiền thu ngoài"
                      formatter={formatVndInput}
                      parser={parseVndInput}
                    />
                  </Form.Item>
                  <Form.Item name="method" label="Phương thức thu">
                    <Select
                      options={[
                        { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngoài link/QR' },
                        { value: 'CASH', label: 'Tiền mặt' },
                      ]}
                    />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Form.Item name="reference" label="Mã tham chiếu / Mã GD ngân hàng">
                    <Input placeholder="VD: FT2409... hoặc bill chuyển khoản" />
                  </Form.Item>
                  <Form.Item name="note" label="Ghi chú">
                    <Input placeholder="Ghi chú thêm nếu có" />
                  </Form.Item>
                </div>
              </Form>
            </div>
          ) : (
            <div className="rounded-xl border border-inherit p-4 text-center">
              <StatusTag status="success" label="Miễn phí" />
              <div className="mt-2 font-semibold">Workshop đang được cấu hình miễn phí 0đ</div>
            </div>
          )}

          {onWaiveFee && workshop.feeVnd > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-inherit p-3 text-xs">
              <div>
                <div className="font-medium">Chính sách miễn phí workshop</div>
                <div className="opacity-60">Áp dụng cho khách mời đặc biệt, đối tác hoặc học viên diện tài trợ.</div>
              </div>
              {selected.feeStatus === 'WAIVED' ? (
                <Button size="small" loading={busy} onClick={() => onWaiveFee(false)}>
                  Hủy miễn phí
                </Button>
              ) : (
                <Button
                  size="small"
                  loading={busy}
                  onClick={() => onWaiveFee(true, 'Miễn phí theo chính sách ban tổ chức')}
                >
                  Miễn phí workshop
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </AdaptiveModal>
  );
}
