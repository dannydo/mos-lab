'use client';

import React from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Image,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Typography,
  Upload,
} from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import {
  Camera,
  Check,
  CircleDollarSign,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  QrCode,
  RotateCcw,
  Tag,
  Trash2,
  Trophy,
  UserPlus,
  UtensilsCrossed,
} from 'lucide-react';
import AcademyWorkshopParticipantSelectionsModal from './AcademyWorkshopParticipantSelectionsModal';
import { WorkshopImageGallery } from './AcademyWorkshopImageGallery';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  ACADEMY_WORKSHOP_PRICING_PRESETS,
  type AcademyLead,
  type AcademyWorkshopDetail,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopResourcesResponse,
  type UpdateAcademyWorkshopParticipantPricingRequest,
} from '@mos-lab/shared';
import {
  AdaptiveDrawer,
  AdaptiveModal,
  AdaptiveOverlayFooter,
  AppIcon,
  EntityForm,
  EntityFormField,
  StatusTag,
} from '../../../../components/ui';
import { formatVndInput, parseVndInput } from '../../../../lib/format-utils';
import { WORKSHOP_ATTENDANCE_LABELS, WORKSHOP_FEE_LABELS } from './AcademyWorkshopRoster';

export type AcademyWorkshopFeeForm = {
  amountVnd: number;
  method: 'BANK_TRANSFER' | 'CASH';
  reference?: string;
  note?: string;
};

export type AcademyWorkshopWalkInForm = {
  name: string;
  phone?: string;
  email?: string;
  primaryInstructorId?: number;
};

interface AcademyWorkshopParticipantOverlaysProps {
  workshop: AcademyWorkshopDetail;
  selected: AcademyWorkshopParticipant | null;
  resources: AcademyWorkshopResourcesResponse;
  busy: boolean;
  talentLoading: boolean;
  canManageRestricted: boolean;
  careDrawerOpen: boolean;
  qrDataUrl: string;
  qrTargetUrl: string;
  addOpen: boolean;
  addLeadIds: number[];
  leadSearch: string;
  leadLoading: boolean;
  leadError: string | null;
  availableLeadOptions: AcademyLead[];
  walkInOpen: boolean;
  feeOpen: boolean;
  walkInForm: FormInstance<AcademyWorkshopWalkInForm>;
  feeForm: FormInstance<AcademyWorkshopFeeForm>;
  onCloseCare: () => void;
  onReissueQr: () => void;
  onUpdateCare: (
    input: { infoSent?: boolean; attendanceStatus?: AcademyWorkshopParticipant['attendanceStatus'] },
    success: string
  ) => void;
  onCheckIn: (checkedIn: boolean) => void;
  onOpenFee: (participant?: AcademyWorkshopParticipant) => void;
  onDeleteFeePayment?: (paymentId: number) => Promise<void>;
  onWaiveFee?: (waived: boolean, reason?: string) => Promise<void>;
  onUpdatePricing?: (pricing: UpdateAcademyWorkshopParticipantPricingRequest) => Promise<void>;
  onAssignInstructor: (instructorId: number | null) => void;
  onSetPhotoConsent: (consent: boolean) => void;
  onUploadPhoto: (file: File) => void;
  onOpenTalent: () => void;
  onAddExisting: () => void;
  onAddLeadIdsChange: (leadIds: number[]) => void;
  onLeadSearchChange: (search: string) => void;
  onCloseAdd: () => void;
  onOpenWalkInFromAdd: () => void;
  onCloseWalkIn: () => void;
  onCreateWalkIn: (values: AcademyWorkshopWalkInForm) => void;
  onCloseFee: () => void;
  onSaveFee: (values: AcademyWorkshopFeeForm) => void;
  onOpenZaloScript?: (participant: AcademyWorkshopParticipant) => void;
  selectionsOpen?: boolean;
  selectionsParticipant?: AcademyWorkshopParticipant | null;
  onOpenSelections?: (participant: AcademyWorkshopParticipant) => void;
  onCloseSelections?: () => void;
  onSaveSelections?: (
    menuItemIds: number[],
    equipmentPackageId: number | null,
    designItemId?: number | null
  ) => Promise<void>;
}

export default function AcademyWorkshopParticipantOverlays({
  workshop,
  selected,
  resources = { staff: [], instructors: [] },
  busy,
  talentLoading,
  canManageRestricted,
  careDrawerOpen,
  qrDataUrl,
  qrTargetUrl,
  addOpen,
  addLeadIds = [],
  leadSearch,
  leadLoading,
  leadError,
  availableLeadOptions = [],
  walkInOpen,
  feeOpen,
  walkInForm,
  feeForm,
  onCloseCare,
  onReissueQr,
  onUpdateCare,
  onCheckIn,
  onOpenFee,
  onAssignInstructor,
  onSetPhotoConsent,
  onUploadPhoto,
  onOpenTalent,
  onAddExisting,
  onAddLeadIdsChange,
  onLeadSearchChange,
  onCloseAdd,
  onOpenWalkInFromAdd,
  onCloseWalkIn,
  onCreateWalkIn,
  onCloseFee,
  onSaveFee,
  onDeleteFeePayment,
  onWaiveFee,
  onUpdatePricing,
  onOpenZaloScript,
  selectionsOpen = false,
  selectionsParticipant = null,
  onOpenSelections,
  onCloseSelections,
  onSaveSelections,
}: AcademyWorkshopParticipantOverlaysProps) {
  const [pricingPreset, setPricingPreset] = React.useState<string>('full');
  const [customAppliedFee, setCustomAppliedFee] = React.useState<number | null>(null);
  const [customReason, setCustomReason] = React.useState<string>('');
  const [pricingBusy, setPricingBusy] = React.useState(false);

  React.useEffect(() => {
    if (!selected) return;
    if (selected.appliedFeeVnd === 1500000 || selected.discountReason?.includes('1.500')) {
      setPricingPreset('promo_1500');
      setCustomAppliedFee(null);
      setCustomReason('');
    } else if (
      selected.appliedFeeVnd === Math.round(workshop.feeVnd * 0.9) ||
      selected.discountReason?.includes('10%')
    ) {
      setPricingPreset('discount_10');
      setCustomAppliedFee(null);
      setCustomReason('');
    } else if (
      selected.appliedFeeVnd === Math.round(workshop.feeVnd * 0.5) ||
      selected.discountReason?.includes('50%')
    ) {
      setPricingPreset('discount_50');
      setCustomAppliedFee(null);
      setCustomReason('');
    } else if (selected.appliedFeeVnd !== null && selected.appliedFeeVnd !== undefined) {
      if (selected.appliedFeeVnd === workshop.feeVnd) {
        setPricingPreset('full');
        setCustomAppliedFee(null);
        setCustomReason('');
      } else {
        setPricingPreset('custom');
        setCustomAppliedFee(selected.appliedFeeVnd);
        setCustomReason(selected.discountReason || '');
      }
    } else if (selected.discountVnd > 0) {
      setPricingPreset('custom');
      setCustomAppliedFee(Math.max(0, workshop.feeVnd - selected.discountVnd));
      setCustomReason(selected.discountReason || '');
    } else {
      setPricingPreset('full');
      setCustomAppliedFee(null);
      setCustomReason('');
    }
  }, [selected?.id, selected?.appliedFeeVnd, selected?.discountVnd, selected?.discountReason, workshop.feeVnd]);

  const handleSelectPreset = (presetId: string) => {
    setPricingPreset(presetId);
    if (presetId === 'promo_1500') {
      setCustomAppliedFee(1500000);
      setCustomReason('Ưu đãi giữ chỗ sớm 1.500k');
    } else if (presetId === 'discount_10') {
      setCustomAppliedFee(Math.round(workshop.feeVnd * 0.9));
      setCustomReason('Ưu đãi 10%');
    } else if (presetId === 'discount_50') {
      setCustomAppliedFee(Math.round(workshop.feeVnd * 0.5));
      setCustomReason('Ưu đãi 50%');
    } else if (presetId === 'full') {
      setCustomAppliedFee(workshop.feeVnd);
      setCustomReason('Vé tiêu chuẩn (Full)');
    } else {
      setCustomAppliedFee(
        selected?.appliedFeeVnd ??
          (selected?.discountVnd ? Math.max(0, workshop.feeVnd - selected.discountVnd) : workshop.feeVnd)
      );
      setCustomReason(selected?.discountReason || '');
    }
  };

  const handleApplyPricing = async () => {
    if (!onUpdatePricing || !selected) return;
    setPricingBusy(true);
    try {
      let appliedFeeVnd: number | null = null;
      let discountVnd = 0;
      let discountReason: string | null = null;

      if (pricingPreset === 'full') {
        appliedFeeVnd = workshop.feeVnd;
        discountVnd = 0;
        discountReason = 'Vé tiêu chuẩn (Full)';
      } else if (pricingPreset === 'promo_1500') {
        appliedFeeVnd = 1500000;
        discountVnd = Math.max(0, workshop.feeVnd - 1500000);
        discountReason = 'Ưu đãi giữ chỗ sớm 1.500k';
      } else if (pricingPreset === 'discount_10') {
        appliedFeeVnd = Math.round(workshop.feeVnd * 0.9);
        discountVnd = workshop.feeVnd - appliedFeeVnd;
        discountReason = 'Ưu đãi 10%';
      } else if (pricingPreset === 'discount_50') {
        appliedFeeVnd = Math.round(workshop.feeVnd * 0.5);
        discountVnd = workshop.feeVnd - appliedFeeVnd;
        discountReason = 'Ưu đãi 50%';
      } else {
        appliedFeeVnd = customAppliedFee !== null ? Math.max(0, Math.round(customAppliedFee)) : workshop.feeVnd;
        discountVnd = Math.max(0, workshop.feeVnd - appliedFeeVnd);
        discountReason = customReason.trim() || 'Ưu đãi tùy chỉnh';
      }

      await onUpdatePricing({ appliedFeeVnd, discountVnd, discountReason });
    } finally {
      setPricingBusy(false);
    }
  };

  return (
    <>
      <AdaptiveDrawer
        open={careDrawerOpen && Boolean(selected)}
        title={selected?.lead?.name || 'Học viên'}
        width={620}
        onClose={onCloseCare}
        extra={
          <Button icon={<AppIcon icon={RotateCcw} />} loading={busy} onClick={onReissueQr}>
            Cấp lại QR
          </Button>
        }
      >
        {selected && (
          <div className="space-y-5">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Liên hệ">
                {selected?.lead?.phone || selected?.lead?.email || '—'}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <div className="flex items-center justify-between">
                    <span>Phí workshop</span>
                    {canManageRestricted && onOpenFee && (
                      <Button
                        size="small"
                        type="link"
                        className="!h-auto !p-0 text-xs text-blue-600 dark:text-blue-400"
                        onClick={() => onOpenFee(selected)}
                      >
                        Cập nhật / Thu phí
                      </Button>
                    )}
                  </div>
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="tabular-nums">
                    {selected.feePaidVnd.toLocaleString('vi-VN')} đ
                    {workshop.feeVnd > 0 ? ` / ${workshop.feeVnd.toLocaleString('vi-VN')} đ` : ''} ·{' '}
                    {WORKSHOP_FEE_LABELS[selected.feeStatus]}
                  </span>
                  {canManageRestricted && onOpenFee && (
                    <Button size="small" type="dashed" className="text-xs" onClick={() => onOpenFee(selected)}>
                      Sửa phí
                    </Button>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Check-in">
                {selected.checkedInAt ? dayjs(selected.checkedInAt).format('DD/MM HH:mm') : 'Chưa đến'}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <div className="flex items-center justify-between">
                    <span>Thực đơn</span>
                    {onOpenSelections && (
                      <Button
                        size="small"
                        type="link"
                        className="!h-auto !p-0 text-xs text-emerald-600 dark:text-emerald-400"
                        onClick={() => onOpenSelections(selected)}
                      >
                        Chọn / Đổi
                      </Button>
                    )}
                  </div>
                }
              >
                {((selected as any)?.menuSelections?.length ?? 0) > 0 ? (
                  <div className="space-y-1">
                    {(selected as any).menuSelections.map((selection: any) => (
                      <div key={selection.id} className="text-xs">
                        <span className="opacity-60">
                          {
                            ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[
                              selection.category as keyof typeof ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS
                            ]
                          }
                          :{' '}
                        </span>
                        <strong className="font-semibold">{selection.itemName}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <StatusTag status="default" label="Chưa chọn món" />
                    {onOpenSelections && (
                      <Button size="small" type="dashed" className="text-xs" onClick={() => onOpenSelections(selected)}>
                        Chọn món ngay
                      </Button>
                    )}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <div className="flex items-center justify-between">
                    <span>Cốp dụng cụ</span>
                    {onOpenSelections && (
                      <Button
                        size="small"
                        type="link"
                        className="!h-auto !p-0 text-xs text-indigo-600 dark:text-indigo-400"
                        onClick={() => onOpenSelections(selected)}
                      >
                        Chọn / Đổi
                      </Button>
                    )}
                  </div>
                }
              >
                {selected.equipmentSelection ? (
                  <div className="text-xs">
                    <strong className="font-semibold">{selected.equipmentSelection.packageName}</strong>
                    {selected.equipmentSelection.priceVnd > 0 && (
                      <span className="ml-2 opacity-65 tabular-nums">
                        (+{selected.equipmentSelection.priceVnd.toLocaleString('vi-VN')} đ)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <StatusTag status="default" label="Chưa chọn dụng cụ" />
                    {onOpenSelections && (
                      <Button size="small" type="dashed" className="text-xs" onClick={() => onOpenSelections(selected)}>
                        Chọn cốp đồ nghề
                      </Button>
                    )}
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tố Chất">
                {selected.talent
                  ? `${selected.talent.strands5Min} sợi / 5 phút · ${selected.talent.rankLabel}`
                  : 'Chưa test'}
              </Descriptions.Item>
            </Descriptions>

            <div className="rounded-xl border border-inherit p-4">
              <div className="mb-3 font-semibold">1. Chăm trước workshop</div>
              <Space wrap>
                {(selected as any)?.lead?.facebookChatLink ? (
                  <Button
                    href={(selected as any).lead.facebookChatLink}
                    target="_blank"
                    icon={<AppIcon icon={MessageCircle} />}
                  >
                    Mở Pancake/chat
                  </Button>
                ) : null}
                {onOpenZaloScript ? (
                  <Button icon={<AppIcon icon={MessageCircle} />} onClick={() => onOpenZaloScript(selected)}>
                    Kịch bản Zalo
                  </Button>
                ) : null}
                <Button
                  loading={busy}
                  type={selected.infoSentAt ? 'default' : 'primary'}
                  onClick={() => onUpdateCare({ infoSent: !selected.infoSentAt }, 'Đã ghi audit gửi thông tin.')}
                >
                  {selected.infoSentAt ? 'Hoàn tác đã gửi' : 'Ghi nhận đã gửi'}
                </Button>
                <Select
                  value={selected.attendanceStatus}
                  className="min-w-40"
                  options={Object.entries(WORKSHOP_ATTENDANCE_LABELS).map(([value, label]) => ({ value, label }))}
                  onChange={(attendanceStatus) => onUpdateCare({ attendanceStatus }, 'Đã cập nhật xác nhận tham dự.')}
                />
              </Space>
            </div>

            <div className="rounded-xl border border-inherit p-4">
              <div className="mb-3 font-semibold">2. Check-in, phí và giáo viên</div>
              <Space wrap>
                <Button
                  type={selected.checkedInAt ? 'default' : 'primary'}
                  icon={<AppIcon icon={Check} />}
                  loading={busy}
                  onClick={() => onCheckIn(!selected.checkedInAt)}
                >
                  {selected.checkedInAt ? 'Hoàn tác check-in' : 'Check-in'}
                </Button>
                {canManageRestricted && (
                  <Button icon={<AppIcon icon={CircleDollarSign} />} onClick={() => onOpenFee(selected)}>
                    {selected.feeStatus === 'PAID' ? 'Xem / Sửa phí' : 'Thu phí workshop'}
                  </Button>
                )}
                <Select
                  allowClear
                  placeholder="Phân giáo viên chính"
                  value={selected.primaryInstructor?.id}
                  className="min-w-52"
                  options={resources.instructors.map((item) => ({ value: item.id, label: item.displayName }))}
                  onChange={(instructorId) => onAssignInstructor(instructorId || null)}
                />
              </Space>
            </div>

            <div className="rounded-xl border border-inherit p-4">
              <div className="mb-3 font-semibold">3. Ảnh khoảnh khắc</div>
              <Space wrap>
                <Button
                  icon={<AppIcon icon={Camera} />}
                  type={selected.photoConsentAt ? 'default' : 'primary'}
                  onClick={() => onSetPhotoConsent(!selected.photoConsentAt)}
                >
                  {selected.photoConsentAt ? 'Thu hồi consent' : 'Ghi consent ảnh'}
                </Button>
                <Upload
                  showUploadList={false}
                  accept="image/jpeg,image/png,image/webp"
                  beforeUpload={(file) => {
                    onUploadPhoto(file as File);
                    return false;
                  }}
                  disabled={!selected.photoConsentAt || busy}
                >
                  <Button icon={<AppIcon icon={ImagePlus} />} disabled={!selected.photoConsentAt}>
                    Chụp / tải ảnh
                  </Button>
                </Upload>
              </Space>
              {((selected as any)?.photos?.length ?? 0) > 0 && (
                <WorkshopImageGallery>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(selected as any).photos.map((photo: any) =>
                      photo.signedUrl ? (
                        <Image
                          key={photo.id}
                          src={photo.signedUrl}
                          alt={photo.caption || selected?.lead?.name || 'Học viên'}
                          className="aspect-square rounded-lg object-cover"
                        />
                      ) : null
                    )}
                  </div>
                </WorkshopImageGallery>
              )}
            </div>

            <div className="rounded-xl border border-inherit p-4">
              <div className="mb-3 font-semibold">4. Tố Chất & QR game</div>
              <Space wrap>
                <Button
                  type={selected.talent ? 'default' : 'primary'}
                  icon={<AppIcon icon={Trophy} />}
                  loading={talentLoading}
                  onClick={onOpenTalent}
                >
                  {selected.talent ? 'Mở phiên Tố Chất' : 'Bắt đầu Tố Chất'}
                </Button>
                <Button icon={<AppIcon icon={QrCode} />} onClick={onReissueQr}>
                  Hiện QR
                </Button>
              </Space>
              {qrDataUrl && (
                <div className="mt-4 text-center">
                  <Image src={qrDataUrl} alt={`QR ${selected.lead.name}`} width={260} preview={false} />
                  {qrTargetUrl && (
                    <div className="mt-2 text-xs font-medium">
                      Mở qua: <span className="tabular-nums">{new URL(qrTargetUrl).host}</span>
                    </div>
                  )}
                  <div className="mt-1 text-xs opacity-60">QR một lần; cấp lại sẽ revoke session cũ.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </AdaptiveDrawer>

      <AdaptiveModal
        open={addOpen}
        title="Thêm học viên có sẵn"
        intent="confirm"
        footer={
          <AdaptiveOverlayFooter>
            <Button onClick={onCloseAdd}>Hủy</Button>
            <Button
              type="primary"
              icon={<AppIcon icon={UserPlus} />}
              disabled={!addLeadIds.length}
              loading={busy}
              onClick={onAddExisting}
            >
              {addLeadIds.length ? `Thêm ${addLeadIds.length} học viên` : 'Thêm vào workshop'}
            </Button>
          </AdaptiveOverlayFooter>
        }
        onCancel={onCloseAdd}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary" className="!mb-3 !text-sm">
          Tìm theo họ tên, số điện thoại hoặc email. Có thể chọn nhiều học viên cùng lúc.
        </Typography.Paragraph>
        <Select
          mode="multiple"
          showSearch
          autoFocus
          filterOption={false}
          className="w-full"
          placeholder="Gõ tên, SĐT hoặc email học viên…"
          value={addLeadIds}
          onChange={onAddLeadIdsChange}
          onSearch={onLeadSearchChange}
          loading={leadLoading}
          maxTagCount="responsive"
          notFoundContent={
            leadLoading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm opacity-70">
                <AppIcon icon={LoaderCircle} className="animate-spin" /> Đang tìm học viên…
              </div>
            ) : (
              leadError || (leadSearch ? 'Không tìm thấy học viên phù hợp.' : 'Chưa có học viên Academy có thể thêm.')
            )
          }
          options={availableLeadOptions.map((lead) => ({
            value: lead.id,
            label: `${lead.name} · ${lead.phone || lead.email || 'chưa có liên hệ'}`,
          }))}
        />
        {leadError ? <Alert className="mt-3" type="error" showIcon message={leadError} /> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-inherit px-3 py-2.5">
          <div className="min-w-0 text-sm">
            <strong>Chưa có học viên?</strong>
            <Typography.Text type="secondary" className="block !text-xs">
              Tạo mới và cấp QR ngay trong workshop.
            </Typography.Text>
          </div>
          <Button type="text" icon={<AppIcon icon={UserPlus} />} onClick={onOpenWalkInFromAdd}>
            Tạo học viên mới
          </Button>
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        open={walkInOpen}
        title="Tạo học viên walk-in"
        intent="confirm"
        footer={
          <AdaptiveOverlayFooter>
            <Button onClick={onCloseWalkIn}>Hủy</Button>
            <Button type="primary" icon={<AppIcon icon={QrCode} />} loading={busy} onClick={() => walkInForm.submit()}>
              Tạo & cấp QR
            </Button>
          </AdaptiveOverlayFooter>
        }
        onCancel={onCloseWalkIn}
        destroyOnHidden
      >
        <EntityForm form={walkInForm} columns={2} onFinish={onCreateWalkIn}>
          <EntityFormField
            name="name"
            label="Họ tên"
            fullWidth
            rules={[{ required: true, message: 'Nhập họ tên học viên.' }]}
          >
            <Input autoFocus placeholder="Họ và tên" />
          </EntityFormField>
          <EntityFormField name="phone" label="Số điện thoại">
            <Input inputMode="tel" placeholder="Số điện thoại" />
          </EntityFormField>
          <EntityFormField name="email" label="Email">
            <Input type="email" placeholder="Email" />
          </EntityFormField>
          <EntityFormField name="primaryInstructorId" label="Giáo viên chính" fullWidth>
            <Select
              allowClear
              placeholder="Chọn giáo viên (không bắt buộc)"
              options={resources.instructors.map((item) => ({ value: item.id, label: item.displayName }))}
            />
          </EntityFormField>
        </EntityForm>
      </AdaptiveModal>

      {canManageRestricted && (
        <AdaptiveModal
          open={feeOpen}
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
              {/* Thẻ tổng quan phí */}
              <div className="rounded-xl border border-inherit bg-slate-50/50 p-3.5 dark:bg-slate-900/30">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Phí niêm yết</div>
                    <div className="mt-0.5 font-semibold tabular-nums">{workshop.feeVnd.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Học phí áp dụng</div>
                    <div className="mt-0.5 font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {(selected.appliedFeeVnd !== null && selected.appliedFeeVnd !== undefined
                        ? selected.appliedFeeVnd
                        : Math.max(0, workshop.feeVnd - (selected.discountVnd || 0))
                      ).toLocaleString('vi-VN')}{' '}
                      đ
                    </div>
                    {(selected.appliedFeeVnd !== null || selected.discountVnd > 0) && (
                      <div
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate"
                        title={selected.discountReason || ''}
                      >
                        {selected.discountReason || 'Có ưu đãi'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Đã đóng</div>
                    <div className="mt-0.5 font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                      {selected.feePaidVnd.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Còn thiếu</div>
                    <div
                      className={`mt-0.5 font-semibold tabular-nums ${selected.feeRemainingVnd <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {selected.feeRemainingVnd.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-inherit/60 pt-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Trạng thái thanh toán:</span>
                  <StatusTag
                    status={
                      selected.feeStatus === 'PAID'
                        ? 'success'
                        : selected.feeStatus === 'WAIVED'
                          ? 'default'
                          : selected.feeStatus === 'PARTIAL'
                            ? 'warning'
                            : 'error'
                    }
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

              {/* Chính sách giá vé & Gói ưu đãi học viên */}
              {workshop.feeVnd > 0 && onUpdatePricing && (
                <div className="rounded-xl border border-inherit p-3.5 bg-indigo-50/30 dark:bg-indigo-950/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <AppIcon icon={Tag} className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Gói vé & Ưu đãi áp dụng</span>
                    </div>
                    {selected.discountReason && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                        {selected.discountReason}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {ACADEMY_WORKSHOP_PRICING_PRESETS.map((preset) => {
                        const isSelected = pricingPreset === preset.id;
                        let tierAmount = workshop.feeVnd;
                        if (preset.type === 'FIXED') tierAmount = preset.fixedAmountVnd || 0;
                        else if (preset.type === 'PERCENT')
                          tierAmount = Math.round(workshop.feeVnd * (1 - (preset.percent || 0) / 100));

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={busy || pricingBusy}
                            onClick={() => handleSelectPreset(preset.id)}
                            className={`flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 font-semibold ring-1 ring-indigo-500'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/70 dark:bg-slate-800/60'
                            }`}
                          >
                            <div className="font-medium truncate">{preset.label}</div>
                            <div className="mt-1 font-bold tabular-nums text-slate-800 dark:text-slate-200">
                              {preset.type === 'CUSTOM' ? 'Tùy chỉnh...' : `${tierAmount.toLocaleString('vi-VN')} đ`}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {pricingPreset === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            Mức học phí áp dụng (VND)
                          </div>
                          <InputNumber
                            min={0}
                            precision={0}
                            step={50000}
                            className="w-full"
                            value={customAppliedFee}
                            onChange={(val) => setCustomAppliedFee(val ? Number(val) : null)}
                            placeholder="Nhập mức phí thực thu"
                            formatter={formatVndInput}
                            parser={parseVndInput}
                          />
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            Lý do / Tên gói ưu đãi
                          </div>
                          <Input
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="VD: Học bổng đối tác, ưu đãi VIP..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {pricingPreset === 'promo_1500' && 'Ưu đãi giữ chỗ sớm 1.500.000 đ (giảm 400.000 đ)'}
                        {pricingPreset === 'discount_10' &&
                          `Ưu đãi 10%: ${Math.round(workshop.feeVnd * 0.9).toLocaleString('vi-VN')} đ (giảm ${Math.round(workshop.feeVnd * 0.1).toLocaleString('vi-VN')} đ)`}
                        {pricingPreset === 'discount_50' &&
                          `Ưu đãi 50%: ${Math.round(workshop.feeVnd * 0.5).toLocaleString('vi-VN')} đ (giảm ${Math.round(workshop.feeVnd * 0.5).toLocaleString('vi-VN')} đ)`}
                        {pricingPreset === 'full' && 'Vé tiêu chuẩn: 100% học phí niêm yết'}
                        {pricingPreset === 'custom' &&
                          (customAppliedFee !== null
                            ? `Mức phí áp dụng: ${customAppliedFee.toLocaleString('vi-VN')} đ`
                            : 'Nhập mức phí áp dụng tùy chỉnh')}
                      </div>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        loading={pricingBusy}
                        onClick={handleApplyPricing}
                        disabled={busy || pricingBusy}
                      >
                        Áp dụng gói vé này
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lịch sử bút toán đã đóng */}
              {selected.feePayments && selected.feePayments.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Lịch sử thanh toán ({selected.feePayments.length})
                  </div>
                  <div className="divide-y divide-inherit rounded-xl border border-inherit text-xs">
                    {selected.feePayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                              +{p.amountVnd.toLocaleString('vi-VN')} đ
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">
                              {p.method === 'BANK_TRANSFER'
                                ? 'Chuyển khoản'
                                : p.method === 'CASH'
                                  ? 'Tiền mặt'
                                  : p.method}
                            </span>
                          </div>
                          <div className="text-[11px] opacity-60">
                            {dayjs(p.receivedAt || p.createdAt).format('DD/MM/YYYY HH:mm')}
                            {p.reference ? ` · GD: ${p.reference}` : ''}
                            {p.confirmedBy ? ` · Duyệt: ${p.confirmedBy.displayName}` : ''}
                            {p.note ? ` · ${p.note}` : ''}
                          </div>
                        </div>
                        {onDeleteFeePayment && (
                          <Popconfirm
                            title="Xóa bút toán thanh toán này?"
                            description="Thao tác này sẽ hoàn tác số tiền đã đóng và cập nhật lại trạng thái phí của học viên."
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true, loading: busy }}
                            onConfirm={() => onDeleteFeePayment(p.id)}
                          >
                            <Button danger type="text" size="small" icon={<AppIcon icon={Trash2} />} />
                          </Popconfirm>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form ghi nhận thanh toán ngoài Link/QR */}
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

              {/* Hành động Miễn phí / Hủy miễn phí */}
              {onWaiveFee && workshop.feeVnd > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-dashed border-inherit p-3 text-xs">
                  <div>
                    <div className="font-medium">Chính sách miễn phí workshop</div>
                    <div className="opacity-60">
                      Áp dụng cho khách mời đặc biệt, đối tác hoặc học viên diện tài trợ.
                    </div>
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
      )}

      {onCloseSelections && onSaveSelections && (
        <AcademyWorkshopParticipantSelectionsModal
          open={selectionsOpen}
          participant={selectionsParticipant}
          workshop={workshop}
          busy={busy}
          onClose={onCloseSelections}
          onSave={onSaveSelections}
        />
      )}
    </>
  );
}
