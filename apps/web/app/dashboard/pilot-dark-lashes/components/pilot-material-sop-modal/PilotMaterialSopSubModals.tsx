'use client';

import React from 'react';
import { Form, Input, InputNumber, Select } from 'antd';
import type { FormInstance } from 'antd';
import type { PilotGlueRodStandardItem, PilotSanitizationItem, PilotSolutionNormItem } from '@mos-lab/shared';
import { AdaptiveModal } from '~/components/ui';
import {
  GLUE_ROD_CATEGORY_OPTIONS,
  SANITIZATION_CLASSIFICATION_OPTIONS,
  type EndorseFormValues,
  type GlueRodFormValues,
  type SanitizationFormValues,
  type SolutionNormFormValues,
} from './pilot-material-sop-helpers';

const { TextArea } = Input;

interface PilotMaterialSopSubModalsProps {
  normEditModalOpen: boolean;
  editingNorm: PilotSolutionNormItem | null;
  normForm: FormInstance<SolutionNormFormValues>;
  onCloseNormModal: () => void;
  onSaveNorm: () => void;

  glueRodModalOpen: boolean;
  editingGlueRod: PilotGlueRodStandardItem | null;
  glueRodForm: FormInstance<GlueRodFormValues>;
  onCloseGlueRodModal: () => void;
  onSaveGlueRod: () => void;

  sanitModalOpen: boolean;
  editingSanit: PilotSanitizationItem | null;
  sanitForm: FormInstance<SanitizationFormValues>;
  onCloseSanitModal: () => void;
  onSaveSanit: () => void;

  endorseModalOpen: boolean;
  endorseForm: FormInstance<EndorseFormValues>;
  reviewing: boolean;
  onCloseEndorseModal: () => void;
  onConfirmEndorse: () => void;
}

export function PilotMaterialSopSubModals({
  normEditModalOpen,
  editingNorm,
  normForm,
  onCloseNormModal,
  onSaveNorm,
  glueRodModalOpen,
  editingGlueRod,
  glueRodForm,
  onCloseGlueRodModal,
  onSaveGlueRod,
  sanitModalOpen,
  editingSanit,
  sanitForm,
  onCloseSanitModal,
  onSaveSanit,
  endorseModalOpen,
  endorseForm,
  reviewing,
  onCloseEndorseModal,
  onConfirmEndorse,
}: PilotMaterialSopSubModalsProps) {
  return (
    <>
      {/* Sub-Modal: Add / Edit Solution Norm (Phần 1) */}
      <AdaptiveModal
        intent="form"
        open={normEditModalOpen}
        onCancel={onCloseNormModal}
        onOk={onSaveNorm}
        okText={editingNorm ? 'Lưu định mức' : 'Thêm vào định mức'}
        cancelText="Hủy"
        title={editingNorm ? 'Chỉnh sửa Định mức Thuốc & Dung dịch' : 'Thêm Dung dịch vào Định mức'}
        width={540}
      >
        <Form form={normForm} layout="vertical" className="pt-2">
          <Form.Item
            name="materialName"
            label={<span className="text-xs font-semibold">Tên vật tư / Dung dịch uốn mi</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên dung dịch.' }]}
          >
            <Input placeholder="Ví dụ: Thuốc số 1 (Perming Cream)" className="rounded-lg" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="unit"
              label={<span className="text-xs font-semibold">Đơn vị tính</span>}
              rules={[{ required: true, message: 'Nhập đơn vị tính.' }]}
            >
              <Input placeholder="ml, g, giọt, gói..." className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="costPerUnit"
              label={<span className="text-xs font-semibold">Đơn giá gốc / 1 đơn vị (đ)</span>}
              rules={[{ required: true, message: 'Nhập đơn giá gốc.' }]}
            >
              <InputNumber<number>
                className="w-full rounded-lg tabular-nums"
                min={0}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => (val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0)}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="standardDosagePerSession"
            label={<span className="text-xs font-semibold">Định lượng tiêu chuẩn đề xuất cho mỗi ca</span>}
            rules={[{ required: true, message: 'Nhập định lượng tiêu chuẩn mỗi ca.' }]}
            extra="Cô Giang Đàm trực tiếp nhập định lượng tiêu chuẩn để kiểm soát chi phí từng ca."
          >
            <InputNumber<number>
              className="w-full rounded-lg tabular-nums font-bold text-emerald-600"
              min={0.01}
              step={0.1}
            />
          </Form.Item>

          <Form.Item
            name="usageInstructions"
            label={<span className="text-xs font-semibold">Hướng dẫn &amp; Cách thức sử dụng</span>}
          >
            <TextArea rows={2} placeholder="Thời gian ủ, cách phết thuốc, lưu ý vị trí..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="technicalNotes"
            label={<span className="text-xs font-semibold">Lưu ý kỹ thuật an toàn</span>}
          >
            <Input placeholder="Lưu ý về nang mi, nồng độ, tránh cay mắt..." className="rounded-lg" />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      {/* Sub-Modal: Add / Edit Glue & Rod Standard (Phần 2) */}
      <AdaptiveModal
        intent="form"
        open={glueRodModalOpen}
        onCancel={onCloseGlueRodModal}
        onOk={onSaveGlueRod}
        okText={editingGlueRod ? 'Lưu quy chuẩn' : 'Thêm mới'}
        cancelText="Hủy"
        title={editingGlueRod ? 'Chỉnh sửa Quy chuẩn Keo & Trục Silicon' : 'Thêm Quy chuẩn Keo & Trục Silicon'}
        width={580}
      >
        <Form form={glueRodForm} layout="vertical" className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="category"
              label={<span className="text-xs font-semibold">Phân loại</span>}
              rules={[{ required: true }]}
            >
              <Select options={GLUE_ROD_CATEGORY_OPTIONS} className="rounded-lg" />
            </Form.Item>

            <Form.Item name="materialRef" label={<span className="text-xs font-semibold">Vật tư áp dụng</span>}>
              <Input placeholder="Trục Form C, Sáp uốn..." className="rounded-lg" />
            </Form.Item>
          </div>

          <Form.Item
            name="title"
            label={<span className="text-xs font-semibold">Tên tiêu chuẩn / Quy cách</span>}
            rules={[{ required: true, message: 'Nhập tên quy chuẩn.' }]}
          >
            <Input placeholder="Ví dụ: Trục Silicon Form C (Uốn cong tự nhiên)" className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="selectionCriteria"
            label={<span className="text-xs font-semibold">Hướng dẫn lựa chọn &amp; Sử dụng</span>}
            rules={[{ required: true, message: 'Nhập tiêu chí lựa chọn.' }]}
          >
            <TextArea rows={2} placeholder="Phù hợp dáng mắt nào, độ dài mi tối thiểu..." className="rounded-lg" />
          </Form.Item>

          <Form.Item
            name="standardOperation"
            label={<span className="text-xs font-semibold">Tiêu chuẩn thao tác kỹ thuật</span>}
            rules={[{ required: true, message: 'Nhập tiêu chuẩn thao tác.' }]}
          >
            <TextArea
              rows={2}
              placeholder="Cách đặt trục cách chân mi bao nhiêu mm, hướng vuốt căng mi..."
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="commonMistakesToAvoid"
            label={<span className="text-xs font-semibold">Lưu ý kỹ thuật &amp; Các lỗi cần tránh</span>}
            rules={[{ required: true, message: 'Nhập các lỗi cần tránh.' }]}
          >
            <TextArea
              rows={2}
              placeholder="Tránh bóng khí dưới trục, tránh dính keo chân mi, không kéo quá căng..."
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="illustrationImageUrl"
            label={<span className="text-xs font-semibold">URL Ảnh minh họa (Tùy chọn)</span>}
          >
            <Input placeholder="https://example.com/rod-illustration.png" className="rounded-lg" />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      {/* Sub-Modal: Add / Edit Sanitization Procedure (Phần 3) */}
      <AdaptiveModal
        intent="form"
        open={sanitModalOpen}
        onCancel={onCloseSanitModal}
        onOk={onSaveSanit}
        okText={editingSanit ? 'Lưu quy trình' : 'Thêm mới'}
        cancelText="Hủy"
        title={editingSanit ? 'Chỉnh sửa Quy trình Khử khuẩn' : 'Thêm Quy trình Khử khuẩn & Vệ sinh'}
        width={580}
      >
        <Form form={sanitForm} layout="vertical" className="pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="toolName"
              label={<span className="text-xs font-semibold">Tên dụng cụ / Vật tư</span>}
              rules={[{ required: true, message: 'Nhập tên dụng cụ.' }]}
            >
              <Input placeholder="Trục silicon, nhíp uốn, eye pad..." className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="classification"
              label={<span className="text-xs font-semibold">Phân loại an toàn</span>}
              rules={[{ required: true }]}
            >
              <Select options={SANITIZATION_CLASSIFICATION_OPTIONS} className="rounded-lg" />
            </Form.Item>
          </div>

          <Form.Item
            name="procedure"
            label={<span className="text-xs font-semibold">Quy trình vệ sinh, khử khuẩn &amp; bảo quản</span>}
            rules={[{ required: true, message: 'Nhập quy trình vệ sinh.' }]}
          >
            <TextArea
              rows={3}
              placeholder="Ngâm cồn 70°, sấy UV, bảo quản kín trong túi vô trùng..."
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="criticalSafetyPoint"
            label={<span className="text-xs font-semibold">Điểm kiểm soát an toàn (CSAP)</span>}
            rules={[{ required: true, message: 'Nhập điểm kiểm soát an toàn.' }]}
          >
            <Input
              placeholder="Kiểm tra không gờ sắc nhọn, không rách trục, kiểm tra vô trùng..."
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="checklistStepsText"
            label={<span className="text-xs font-semibold">Checklist thực hiện từng ca (Mỗi dòng 1 bước)</span>}
            extra="Nhập mỗi bước checklist trên một dòng để hiển thị dạng checklist kiểm tra."
          >
            <TextArea
              rows={3}
              placeholder="Bước 1: Rửa xà phòng y tế&#10;Bước 2: Ngâm cồn 70 độ 15p&#10;Bước 3: Hấp tiệt trùng UV&#10;Bước 4: Bảo quản kín"
              className="rounded-lg"
            />
          </Form.Item>
        </Form>
      </AdaptiveModal>

      {/* Modal: Xác nhận thẩm định Cô Giang Đàm */}
      <AdaptiveModal
        intent="confirm"
        open={endorseModalOpen}
        onCancel={onCloseEndorseModal}
        onOk={onConfirmEndorse}
        confirmLoading={reviewing}
        okText="Ký Xác Nhận Thẩm Định"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' }}
        title="Xác Nhận Thẩm Định Chuyên Môn (Cô Giang Đàm)"
        width={500}
      >
        <Form form={endorseForm} layout="vertical" className="pt-2">
          <Form.Item
            name="reviewerName"
            label={<span className="text-xs font-semibold">Người xác nhận thẩm định</span>}
            rules={[{ required: true }]}
          >
            <Input readOnly className="rounded-lg bg-slate-50 dark:bg-slate-900 font-semibold text-emerald-600" />
          </Form.Item>

          <Form.Item
            name="note"
            label={<span className="text-xs font-semibold">Ghi chú &amp; Ý kiến chuyên môn</span>}
            rules={[{ required: true, message: 'Vui lòng nhập ý kiến thẩm định.' }]}
          >
            <TextArea rows={4} className="rounded-lg" />
          </Form.Item>

          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
            ✅ Sau khi xác nhận, toàn bộ các mục định mức, quy chuẩn keo/trục và quy trình khử khuẩn sẽ chuyển sang
            trạng thái <strong>Đã thẩm định</strong> để hoàn tất hồ sơ trình CEO duyệt Scale.
          </div>
        </Form>
      </AdaptiveModal>
    </>
  );
}
