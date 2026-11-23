'use client';

import React from 'react';
import { Button, Form, Input, Select, type FormInstance } from 'antd';
import { AdaptiveModal } from '~/components/ui';
import type {
  AttachmentFormValues,
  SafetyStageRule,
  SensitiveCaseFormValues,
  SensitiveReactionCase,
  StageRuleFormValues,
} from './safety-risk-types';

const { TextArea } = Input;

interface SafetySopEditModalsProps {
  isAddAttachmentModalOpen: boolean;
  onCancelAddAttachment: () => void;
  attachmentForm: FormInstance<AttachmentFormValues>;
  onAddAttachment: (values: AttachmentFormValues) => void;
  isEditStageModalOpen: boolean;
  editingStage: SafetyStageRule | null;
  onCancelEditStage: () => void;
  stageForm: FormInstance<StageRuleFormValues>;
  onSaveStageRule: (values: StageRuleFormValues) => void;
  isEditCaseModalOpen: boolean;
  editingCase: SensitiveReactionCase | null;
  onCancelEditCase: () => void;
  caseForm: FormInstance<SensitiveCaseFormValues>;
  onSaveSensitiveCase: (values: SensitiveCaseFormValues) => void;
}

export function SafetySopEditModals({
  isAddAttachmentModalOpen,
  onCancelAddAttachment,
  attachmentForm,
  onAddAttachment,
  isEditStageModalOpen,
  editingStage,
  onCancelEditStage,
  stageForm,
  onSaveStageRule,
  isEditCaseModalOpen,
  editingCase,
  onCancelEditCase,
  caseForm,
  onSaveSensitiveCase,
}: SafetySopEditModalsProps) {
  return (
    <>
      {/* MODAL 2: ĐÍNH KÈM TÀI LIỆU SOP */}
      <AdaptiveModal
        open={isAddAttachmentModalOpen}
        onCancel={onCancelAddAttachment}
        title="Đính Kèm Tài Liệu Hướng Dẫn / Hình Ảnh SOP An Toàn"
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form form={attachmentForm} layout="vertical" onFinish={onAddAttachment} className="space-y-3 pt-2">
          <Form.Item
            name="name"
            label="Tên tài liệu / Tệp hình ảnh"
            rules={[{ required: true, message: 'Vui lòng nhập tên tệp' }]}
          >
            <Input placeholder="VD: So-do-khoang-cach-dem-hydrogel-v1.png" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item name="category" label="Phân loại tài liệu">
              <Select
                options={[
                  { value: 'Sơ đồ kỹ thuật', label: 'Sơ đồ kỹ thuật' },
                  { value: 'Hình ảnh hướng dẫn', label: 'Hình ảnh hướng dẫn' },
                  { value: 'Quy chuẩn vệ sinh', label: 'Quy chuẩn vệ sinh' },
                  { value: 'Y văn / Khuyến cáo y tế', label: 'Y văn / Khuyến cáo y tế' },
                ]}
              />
            </Form.Item>

            <Form.Item name="format" label="Định dạng">
              <Select
                options={[
                  { value: 'PDF', label: 'PDF Document' },
                  { value: 'PNG', label: 'PNG Image' },
                  { value: 'DOCX', label: 'Word Document' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="uploadedBy" label="Người đính kèm / Chuyên gia">
            <Input placeholder="Cô Giang Đàm" />
          </Form.Item>

          <Form.Item name="description" label="Ghi chú mô tả nội dung tài liệu">
            <TextArea rows={2} placeholder="Mô tả tóm tắt mục đích sử dụng trong đào tạo KTV..." />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={onCancelAddAttachment}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Đính Kèm Tài Liệu
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* MODAL 3: CHỈNH SỬA QUY TẮC GIAI ĐOẠN (PHẦN 1) */}
      <AdaptiveModal
        open={isEditStageModalOpen}
        onCancel={onCancelEditStage}
        title={`Chỉnh Sửa Quy Tắc Bảo Vệ Niêm Mạc (${editingStage?.stageName})`}
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form form={stageForm} layout="vertical" onFinish={onSaveStageRule} className="space-y-3 pt-2">
          <Form.Item
            name="title"
            label="Tiêu đề quy tắc"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả nguyên lý an toàn"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item
            name="actions"
            label="Các thao tác bắt buộc (Mỗi dòng một thao tác)"
            rules={[{ required: true, message: 'Vui lòng nhập các thao tác' }]}
          >
            <TextArea rows={4} placeholder="Nhập mỗi dòng một thao tác bắt buộc..." />
          </Form.Item>

          <Form.Item name="warningNote" label="Cảnh báo đặc biệt (Lưu ý an toàn)">
            <Input />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={onCancelEditStage}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Quy Tắc
            </Button>
          </div>
        </Form>
      </AdaptiveModal>

      {/* MODAL 4: CHỈNH SỬA TÌNH HUỐNG NHẠY CẢM (PHẦN 2) */}
      <AdaptiveModal
        open={isEditCaseModalOpen}
        onCancel={onCancelEditCase}
        title={`Chỉnh Sửa Chuyên Môn Tình Huống (${editingCase?.name})`}
        footer={null}
        intent="form"
        destroyOnHidden
      >
        <Form form={caseForm} layout="vertical" onFinish={onSaveSensitiveCase} className="space-y-3 pt-2">
          <Form.Item
            name="name"
            label="Tên tình huống nhạy cảm"
            rules={[{ required: true, message: 'Vui lòng nhập tên tình huống' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="recognitionSigns"
            label="Dấu hiệu nhận biết (Mỗi dòng một dấu hiệu)"
            rules={[{ required: true, message: 'Vui lòng nhập dấu hiệu' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="preventionMeasures"
            label="Biện pháp phòng ngừa (Mỗi dòng một biện pháp)"
            rules={[{ required: true, message: 'Vui lòng nhập biện pháp phòng ngừa' }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="clinicalTreatment"
            label="Hướng xử lý chuyên môn tức thì (Mỗi dòng một bước)"
            rules={[{ required: true, message: 'Vui lòng nhập hướng xử lý' }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={onCancelEditCase}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Lưu Chuyên Môn
            </Button>
          </div>
        </Form>
      </AdaptiveModal>
    </>
  );
}
