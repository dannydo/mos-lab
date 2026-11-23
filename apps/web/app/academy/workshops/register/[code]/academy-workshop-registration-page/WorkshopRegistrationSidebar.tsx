'use client';

import React from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { CheckCircle2, UsersRound } from 'lucide-react';
import type { AcademyWorkshopPublicRegistrationInfo } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import type {
  RegistrationFormValues,
  SelectionSheetKind,
  WorkshopDesignItem,
  WorkshopEquipmentPackage,
} from './registrationTypes';
import { phaseCopy } from './registrationUtils';
import { DesignSelectionDrawer } from './DesignSelectionDrawer';
import { EquipmentSelectionDrawer } from './EquipmentSelectionDrawer';
import { MenuSelectionDrawer } from './MenuSelectionDrawer';
import { RegistrationAuthProviders } from './RegistrationAuthProviders';
import { RegistrationSelectionSummaryCards } from './RegistrationSelectionSummaryCards';
import { WorkshopLaunchCountdown } from './WorkshopLaunchCountdown';

export interface WorkshopRegistrationSidebarProps {
  code: string;
  info: AcademyWorkshopPublicRegistrationInfo;
  form: FormInstance<RegistrationFormValues>;
  submitting: boolean;
  error: string | null;
  receipt: string | null;
  googleCredential: string | null;
  zaloTicket: string | null;
  activeSelectionSheet: SelectionSheetKind | null;
  selectedEquipmentPackageId: number | undefined;
  selectedDesignItemId: number | undefined;
  selectedEquipmentPackage: WorkshopEquipmentPackage | undefined;
  selectedDesign: WorkshopDesignItem | undefined;
  selectedMenuCount: number;
  menuIncomplete: boolean;
  onDismissError: () => void;
  onReload: () => void;
  onStartAnotherRegistration: () => void;
  onClearGoogle: () => void;
  onClearZalo: () => void;
  onGoogleCredential: (credential: string) => Promise<void>;
  onPersistDraft: (values: RegistrationFormValues) => void;
  onOpenSelectionSheet: (selection: SelectionSheetKind) => void;
  onCloseSelectionSheet: () => void;
  onSubmit: () => Promise<void>;
}

export function WorkshopRegistrationSidebar({
  code,
  info,
  form,
  submitting,
  error,
  receipt,
  googleCredential,
  zaloTicket,
  activeSelectionSheet,
  selectedEquipmentPackageId,
  selectedDesignItemId,
  selectedEquipmentPackage,
  selectedDesign,
  selectedMenuCount,
  menuIncomplete,
  onDismissError,
  onReload,
  onStartAnotherRegistration,
  onClearGoogle,
  onClearZalo,
  onGoogleCredential,
  onPersistDraft,
  onOpenSelectionSheet,
  onCloseSelectionSheet,
  onSubmit,
}: WorkshopRegistrationSidebarProps) {
  const { workshop } = info;
  const nonRegistrationPhase = info.phase !== 'REGISTRATION';
  const status = nonRegistrationPhase ? phaseCopy(info) : null;

  return (
    <aside id="workshop-registration" className="self-start scroll-mt-3 lg:sticky lg:top-8 lg:scroll-mt-8">
      <Card
        className={`overflow-hidden !rounded-[28px] !border sm:!rounded-[32px] [&_.ant-card-body]:!p-0 ${styles.asideCard}`}
      >
        <div className={`border-b px-5 py-5 sm:px-6 ${styles.asideHeader}`}>
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${styles.journeyIcon}`}
            >
              <AppIcon icon={UsersRound} size="sm" />
            </span>
            <div>
              <p className={`m-0 text-[11px] font-medium uppercase tracking-[0.14em] ${styles.mutedText}`}>
                Tham dự workshop
              </p>
              <h2 className={`m-0 mt-0.5 text-lg font-semibold tracking-[-0.02em] ${styles.timelineTitle}`}>
                Đăng ký giữ chỗ
              </h2>
            </div>
          </div>
          <p className={`mb-0 mt-4 text-sm leading-6 ${styles.mutedText}`}>
            Xác minh nhanh, Academy sẽ liên hệ để xác nhận trước buổi học.
          </p>
        </div>

        <div className={`p-5 sm:p-6 ${styles.asideBody}`}>
          {error ? (
            <Alert
              type="error"
              showIcon
              closable
              message="Chưa thể xử lý"
              description={error}
              onClose={onDismissError}
              className="mb-4"
            />
          ) : null}

          {receipt ? (
            <div className="flex flex-col items-center px-3 py-8 text-center">
              <CheckCircle2 className="mx-auto text-emerald-500" size={48} aria-hidden="true" />
              <h3 className={`mt-4 mb-0 text-xl font-semibold ${styles.timelineTitle}`}>Đăng ký đã hoàn tất</h3>
              <p className={`mt-2 mb-0 text-sm leading-6 ${styles.mutedText}`}>{receipt}</p>
              <div className="mt-5">
                <Button type="link" onClick={onStartAnotherRegistration}>
                  Đăng ký người khác
                </Button>
              </div>
            </div>
          ) : nonRegistrationPhase && status ? (
            <>
              {workshop.scheduledPublishAt && dayjs(workshop.scheduledPublishAt).isAfter(dayjs()) ? (
                <WorkshopLaunchCountdown targetIso={workshop.scheduledPublishAt} onExpired={onReload} />
              ) : (
                <Alert type={status.type} showIcon message={status.title} description={status.description} />
              )}
              {status.action && workshop.joinUrl ? (
                <Button type="primary" size="large" block className="mt-5" href={workshop.joinUrl}>
                  {status.action}
                </Button>
              ) : null}
            </>
          ) : info.canRegister ? (
            <>
              <Typography.Paragraph className={`!mb-5 !text-sm !leading-6 ${styles.formIntro}`}>
                Dùng Google hoặc Zalo để điền nhanh thông tin; số điện thoại giúp Academy xác nhận chỗ của bạn.
              </Typography.Paragraph>

              <RegistrationAuthProviders
                code={code}
                submitting={submitting}
                zaloAuthAvailable={info.zaloAuthAvailable}
                googleCredential={googleCredential}
                zaloTicket={zaloTicket}
                onClearGoogle={onClearGoogle}
                onClearZalo={onClearZalo}
                onGoogleCredential={onGoogleCredential}
              />

              <Form
                form={form}
                layout="vertical"
                requiredMark="optional"
                onValuesChange={(_changedValues, values) => onPersistDraft(values as RegistrationFormValues)}
              >
                <p className={`-mt-1 mb-4 text-xs leading-5 ${styles.mutedText}`}>
                  Thông tin và lựa chọn của bạn tự lưu trên thiết bị này. Khi gửi đăng ký, Academy sẽ lưu xác nhận của
                  bạn lâu dài.
                </p>
                <Form.Item
                  label="Họ và tên"
                  name="name"
                  rules={
                    googleCredential || zaloTicket ? [] : [{ required: true, message: 'Vui lòng nhập họ và tên.' }]
                  }
                >
                  <Input
                    size="large"
                    autoComplete="name"
                    placeholder="Tên của bạn"
                    disabled={Boolean(googleCredential || zaloTicket)}
                  />
                </Form.Item>
                <Form.Item
                  label="Số điện thoại"
                  name="phone"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại.' },
                    { pattern: /^\+?[0-9\s.()-]{8,20}$/, message: 'Số điện thoại không hợp lệ.' },
                  ]}
                >
                  <Input size="large" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0901 234 567" />
                </Form.Item>
                <Form.Item
                  label={googleCredential ? 'Email Google' : 'Email'}
                  name="email"
                  rules={[{ type: 'email', message: 'Email chưa đúng định dạng.' }]}
                >
                  <Input
                    size="large"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    disabled={Boolean(googleCredential)}
                  />
                </Form.Item>
                <Form.Item label="Bạn mong chờ điều gì?" name="goal">
                  <Input.TextArea
                    rows={3}
                    maxLength={2000}
                    placeholder="Mục tiêu học, vấn đề bạn muốn được giải đáp…"
                  />
                </Form.Item>
                <Form.Item label="Ai giới thiệu bạn?" name="referrer">
                  <Input placeholder="Tên hoặc số điện thoại người giới thiệu" />
                </Form.Item>

                {workshop.equipment.required ? (
                  <EquipmentSelectionDrawer
                    open={activeSelectionSheet === 'equipment'}
                    submitting={submitting}
                    equipment={workshop.equipment}
                    selectedEquipmentPackageId={selectedEquipmentPackageId}
                    selectedEquipmentPackage={selectedEquipmentPackage}
                    onClose={onCloseSelectionSheet}
                  />
                ) : null}

                {workshop.design.required || workshop.design.items.length > 0 ? (
                  <DesignSelectionDrawer
                    open={activeSelectionSheet === 'design'}
                    submitting={submitting}
                    design={workshop.design}
                    selectedDesignItemId={selectedDesignItemId}
                    selectedDesign={selectedDesign}
                    onClose={onCloseSelectionSheet}
                  />
                ) : null}

                {workshop.menu.required ? (
                  <MenuSelectionDrawer
                    open={activeSelectionSheet === 'menu'}
                    submitting={submitting}
                    menu={workshop.menu}
                    menuIncomplete={menuIncomplete}
                    selectedMenuCount={selectedMenuCount}
                    onClose={onCloseSelectionSheet}
                  />
                ) : null}

                <RegistrationSelectionSummaryCards
                  workshop={workshop}
                  selectedEquipmentPackage={selectedEquipmentPackage}
                  selectedDesign={selectedDesign}
                  selectedMenuCount={selectedMenuCount}
                  onOpenSelectionSheet={onOpenSelectionSheet}
                />

                <Button
                  type="primary"
                  size="large"
                  block
                  className={`!mt-1 !h-12 !rounded-full !border-0 !font-semibold ${styles.submitButton}`}
                  loading={submitting}
                  disabled={menuIncomplete}
                  onClick={() => void onSubmit()}
                >
                  Gửi đăng ký workshop
                </Button>
              </Form>
            </>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Workshop đã đủ chỗ"
              description="Vui lòng liên hệ Academy để được hỗ trợ vào danh sách chờ."
            />
          )}
        </div>
      </Card>
    </aside>
  );
}
