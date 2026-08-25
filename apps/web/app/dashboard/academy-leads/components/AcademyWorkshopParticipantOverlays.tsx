'use client';

import React from 'react';
import { Button, Descriptions, Form, Image, Input, InputNumber, Select, Space, Upload } from 'antd';
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
  Trophy,
  UserPlus,
} from 'lucide-react';
import type {
  AcademyLead,
  AcademyWorkshopDetail,
  AcademyWorkshopParticipant,
  AcademyWorkshopResourcesResponse,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AdaptiveModal, AppIcon, StatusTag } from '../../../../components/ui';
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
  onOpenFee: () => void;
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
}

export default function AcademyWorkshopParticipantOverlays({
  workshop,
  selected,
  resources,
  busy,
  talentLoading,
  careDrawerOpen,
  qrDataUrl,
  qrTargetUrl,
  addOpen,
  addLeadIds,
  leadSearch,
  leadLoading,
  leadError,
  availableLeadOptions,
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
}: AcademyWorkshopParticipantOverlaysProps) {
  return (
    <>
      <AdaptiveDrawer
        open={careDrawerOpen && Boolean(selected)}
        title={selected?.lead.name || 'Học viên'}
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
              <Descriptions.Item label="Liên hệ">{selected.lead.phone || selected.lead.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phí">
                <span className="tabular-nums">
                  {selected.feePaidVnd.toLocaleString('vi-VN')} đ · {WORKSHOP_FEE_LABELS[selected.feeStatus]}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Check-in">
                {selected.checkedInAt ? dayjs(selected.checkedInAt).format('DD/MM HH:mm') : 'Chưa đến'}
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
                {selected.lead.facebookChatLink ? (
                  <Button href={selected.lead.facebookChatLink} target="_blank" icon={<AppIcon icon={MessageCircle} />}>
                    Mở Pancake/chat
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
                <Button icon={<AppIcon icon={CircleDollarSign} />} onClick={onOpenFee}>
                  Thu phí
                </Button>
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
              {selected.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {selected.photos.map((photo) =>
                    photo.signedUrl ? (
                      <Image
                        key={photo.id}
                        src={photo.signedUrl}
                        alt={photo.caption || selected.lead.name}
                        className="aspect-square rounded-lg object-cover"
                      />
                    ) : null
                  )}
                </div>
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
        okText={addLeadIds.length ? `Thêm ${addLeadIds.length} học viên` : 'Thêm vào workshop'}
        okButtonProps={{ disabled: !addLeadIds.length }}
        confirmLoading={busy}
        onOk={onAddExisting}
        onCancel={onCloseAdd}
        destroyOnHidden
      >
        <div className="mb-2 text-sm opacity-70">
          Tìm theo họ tên, số điện thoại hoặc email. Có thể chọn nhiều học viên cùng lúc.
        </div>
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
        {leadError && <div className="mt-2 text-sm text-red-500">{leadError}</div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-inherit p-3">
          <div className="text-sm">
            <strong>Chưa có học viên?</strong>
            <div className="text-xs opacity-60">Tạo mới và cấp QR ngay trong workshop.</div>
          </div>
          <Button icon={<AppIcon icon={UserPlus} />} onClick={onOpenWalkInFromAdd}>
            Tạo học viên mới
          </Button>
        </div>
      </AdaptiveModal>

      <AdaptiveModal
        open={walkInOpen}
        title="Tạo học viên walk-in"
        okText="Tạo & cấp QR"
        confirmLoading={busy}
        onOk={() => walkInForm.submit()}
        onCancel={onCloseWalkIn}
        destroyOnHidden
      >
        <Form form={walkInForm} layout="vertical" onFinish={onCreateWalkIn}>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item name="phone" label="Số điện thoại">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="primaryInstructorId" label="Giáo viên chính">
            <Select
              allowClear
              options={resources.instructors.map((item) => ({ value: item.id, label: item.displayName }))}
            />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      <AdaptiveModal
        open={feeOpen}
        title={`${workshop.feeVnd === 0 ? 'Phí workshop' : 'Thu phí'} · ${selected?.lead.name || ''}`}
        okText="Ghi bút toán"
        confirmLoading={busy}
        footer={
          workshop.feeVnd === 0 ? (
            <Button type="primary" onClick={onCloseFee}>
              Đóng
            </Button>
          ) : undefined
        }
        onOk={() => feeForm.submit()}
        onCancel={onCloseFee}
        destroyOnHidden
      >
        {workshop.feeVnd === 0 ? (
          <div className="rounded-xl border border-inherit p-4 text-center">
            <StatusTag status="success" label="Miễn phí" />
            <div className="mt-3 font-semibold">Workshop đang được cấu hình phí 0đ</div>
            <div className="mt-1 text-sm opacity-60">Học viên không cần đóng phí workshop.</div>
          </div>
        ) : (
          <Form form={feeForm} layout="vertical" onFinish={onSaveFee} initialValues={{ method: 'BANK_TRANSFER' }}>
            <Form.Item name="amountVnd" label="Số tiền" rules={[{ required: true }]}>
              <InputNumber
                min={1}
                precision={0}
                step={100000}
                className="w-full"
                formatter={(value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`}
              />
            </Form.Item>
            <Form.Item name="method" label="Phương thức">
              <Select
                options={[
                  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
                  { value: 'CASH', label: 'Tiền mặt' },
                ]}
              />
            </Form.Item>
            <Form.Item name="reference" label="Mã tham chiếu">
              <Input />
            </Form.Item>
            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        )}
      </AdaptiveModal>
    </>
  );
}
