'use client';

import React from 'react';
import { Button, Input, Select, Typography } from 'antd';
import {
  AdaptiveDrawer,
  AdaptiveModal,
  AdaptiveOverlayFooter,
  ResponsiveFormField,
  ResponsiveFormGrid,
  StatusTag,
} from '~/components/ui';
import { ThemeStudioModal } from '~/components/theme/ThemeStudioModal';

const { Paragraph } = Typography;

export interface DesignSystemDemoOverlaysProps {
  activeDemoModal: string | null;
  onCloseDemoModal: () => void;
  adaptiveModalOpen: boolean;
  onCloseAdaptiveModal: () => void;
  adaptiveDrawerOpen: boolean;
  onCloseAdaptiveDrawer: () => void;
  canManageThemes: boolean;
  studioOpen: boolean;
  onCloseStudio: () => void;
}

export function DesignSystemDemoOverlays({
  activeDemoModal,
  onCloseDemoModal,
  adaptiveModalOpen,
  onCloseAdaptiveModal,
  adaptiveDrawerOpen,
  onCloseAdaptiveDrawer,
  canManageThemes,
  studioOpen,
  onCloseStudio,
}: DesignSystemDemoOverlaysProps) {
  return (
    <>
      <AdaptiveModal
        intent="confirm"
        title={`Demo Test Component: <${activeDemoModal || ''} />`}
        open={!!activeDemoModal}
        onOk={onCloseDemoModal}
        onCancel={onCloseDemoModal}
      >
        <Paragraph>
          Đang xem trước tương tác của component <strong>&lt;{activeDemoModal} /&gt;</strong>. Component này đã được
          đồng bộ chuẩn hóa theo Design Tokens của ứng dụng.
        </Paragraph>
        <StatusTag status="success" label="Verified Component" />
      </AdaptiveModal>

      <AdaptiveModal
        intent="form"
        title="Adaptive form modal"
        open={adaptiveModalOpen}
        onCancel={onCloseAdaptiveModal}
        footer={null}
      >
        <ResponsiveFormGrid columns={2}>
          <ResponsiveFormField>
            <label className="mb-1 block text-sm font-medium" htmlFor="modal-subject">
              Tiêu đề
            </label>
            <Input id="modal-subject" placeholder="Nội dung cần xử lý" />
          </ResponsiveFormField>
          <ResponsiveFormField>
            <label className="mb-1 block text-sm font-medium" htmlFor="modal-owner">
              Người phụ trách
            </label>
            <Select id="modal-owner" className="w-full" options={[{ value: 'cc', label: 'Tư vấn viên' }]} />
          </ResponsiveFormField>
        </ResponsiveFormGrid>
        <AdaptiveOverlayFooter>
          <Button onClick={onCloseAdaptiveModal}>Hủy</Button>
          <Button type="primary" onClick={onCloseAdaptiveModal}>
            Lưu demo
          </Button>
        </AdaptiveOverlayFooter>
      </AdaptiveModal>

      <AdaptiveDrawer
        intent="detail"
        title="Adaptive detail drawer"
        open={adaptiveDrawerOpen}
        onClose={onCloseAdaptiveDrawer}
      >
        <Paragraph>
          Phone dùng toàn màn hình; tablet và desktop dùng chiều rộng theo intent để nội dung vẫn đọc được.
        </Paragraph>
        <AdaptiveOverlayFooter>
          <Button onClick={onCloseAdaptiveDrawer}>Đóng</Button>
        </AdaptiveOverlayFooter>
      </AdaptiveDrawer>

      {canManageThemes && <ThemeStudioModal open={studioOpen} onClose={onCloseStudio} />}
    </>
  );
}
