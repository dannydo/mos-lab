'use client';

import { Button, Descriptions, Image, Select, Space, Upload } from 'antd';
import dayjs from 'dayjs';
import { Camera, Check, CircleDollarSign, ImagePlus, MessageCircle, QrCode, RotateCcw, Trophy } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  type AcademyWorkshopDetail,
  type AcademyWorkshopParticipant,
  type AcademyWorkshopResourcesResponse,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, StatusTag } from '~/components/ui';
import { WorkshopImageGallery } from '../AcademyWorkshopImageGallery';
import { WORKSHOP_ATTENDANCE_LABELS, WORKSHOP_FEE_LABELS } from '../AcademyWorkshopRoster';

export interface ParticipantCareDrawerProps {
  open: boolean;
  workshop: AcademyWorkshopDetail;
  selected: AcademyWorkshopParticipant | null;
  resources: AcademyWorkshopResourcesResponse;
  busy: boolean;
  talentLoading: boolean;
  canManageRestricted: boolean;
  qrDataUrl: string;
  qrTargetUrl: string;
  onClose: () => void;
  onReissueQr: () => void;
  onUpdateCare: (
    input: { infoSent?: boolean; attendanceStatus?: AcademyWorkshopParticipant['attendanceStatus'] },
    success: string
  ) => void;
  onCheckIn: (checkedIn: boolean) => void;
  onOpenFee: (participant?: AcademyWorkshopParticipant) => void;
  onAssignInstructor: (instructorId: number | null) => void;
  onSetPhotoConsent: (consent: boolean) => void;
  onUploadPhoto: (file: File) => void;
  onOpenTalent: () => void;
  onOpenZaloScript?: (participant: AcademyWorkshopParticipant) => void;
  onOpenSelections?: (participant: AcademyWorkshopParticipant) => void;
}

function resolveQrHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function ParticipantCareDrawer({
  open,
  workshop,
  selected,
  resources,
  busy,
  talentLoading,
  canManageRestricted,
  qrDataUrl,
  qrTargetUrl,
  onClose,
  onReissueQr,
  onUpdateCare,
  onCheckIn,
  onOpenFee,
  onAssignInstructor,
  onSetPhotoConsent,
  onUploadPhoto,
  onOpenTalent,
  onOpenZaloScript,
  onOpenSelections,
}: ParticipantCareDrawerProps) {
  return (
    <AdaptiveDrawer
      open={open && Boolean(selected)}
      title={selected?.lead?.name || 'Học viên'}
      width={620}
      onClose={onClose}
      extra={
        <Button icon={<AppIcon icon={RotateCcw} />} loading={busy} onClick={onReissueQr}>
          Cấp lại QR
        </Button>
      }
    >
      {selected && (
        <div className="space-y-5">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Liên hệ">{selected.lead?.phone || selected.lead?.email || '—'}</Descriptions.Item>
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
              {(selected.menuSelections?.length ?? 0) > 0 ? (
                <div className="space-y-1">
                  {selected.menuSelections.map((selection) => (
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
              {selected.lead?.facebookChatLink ? (
                <Button href={selected.lead.facebookChatLink} target="_blank" icon={<AppIcon icon={MessageCircle} />}>
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
            {(selected.photos?.length ?? 0) > 0 && (
              <WorkshopImageGallery>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {selected.photos.map((photo) =>
                    photo.signedUrl ? (
                      <Image
                        key={photo.id}
                        src={photo.signedUrl}
                        alt={photo.caption || selected.lead?.name || 'Học viên'}
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
                    Mở qua: <span className="tabular-nums">{resolveQrHost(qrTargetUrl)}</span>
                  </div>
                )}
                <div className="mt-1 text-xs opacity-60">QR một lần; cấp lại sẽ revoke session cũ.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdaptiveDrawer>
  );
}
