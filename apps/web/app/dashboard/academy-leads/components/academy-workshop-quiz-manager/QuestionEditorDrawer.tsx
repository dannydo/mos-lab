'use client';

import { Button, Form, Input, InputNumber, Radio, Select, type FormInstance } from 'antd';
import { CirclePlus, Trash2 } from 'lucide-react';
import type {
  AcademyWorkshopQuestionType,
  AcademyWorkshopQuizQuestion,
  AcademyWorkshopRewardRule,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AdaptiveOverlayFooter, AppIcon, EntityForm, EntityFormField } from '~/components/ui';
import AcademyWorkshopServerImageUpload from '../AcademyWorkshopServerImageUpload';
import { QUESTION_TYPE_LABELS, REWARD_RULE_LABELS, type QuestionFormValues } from './quiz-manager-utils';

export interface QuestionEditorDrawerProps {
  open: boolean;
  workshopId: number;
  editingQuestion: AcademyWorkshopQuizQuestion | null;
  submitting: boolean;
  form: FormInstance<QuestionFormValues>;
  questionType?: AcademyWorkshopQuestionType;
  rewardRule?: AcademyWorkshopRewardRule;
  correctOptionIndex?: number;
  optionValues: Array<{ label: string }>;
  onClose: () => void;
  onSubmit: (values: QuestionFormValues) => void;
  onChangeQuestionType: (type: AcademyWorkshopQuestionType) => void;
}

export function QuestionEditorDrawer({
  open,
  workshopId,
  editingQuestion,
  submitting,
  form,
  questionType,
  rewardRule,
  correctOptionIndex,
  optionValues,
  onClose,
  onSubmit,
  onChangeQuestionType,
}: QuestionEditorDrawerProps) {
  return (
    <AdaptiveDrawer
      open={open}
      title={editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}
      intent="form"
      destroyOnHidden
      onClose={onClose}
      footer={
        <AdaptiveOverlayFooter>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={submitting} onClick={() => form.submit()}>
            {editingQuestion ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
          </Button>
        </AdaptiveOverlayFooter>
      }
    >
      <EntityForm form={form} columns={2} onFinish={onSubmit}>
        <EntityFormField name="type" label="Loại câu hỏi" rules={[{ required: true }]}>
          <Select
            options={Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={onChangeQuestionType}
          />
        </EntityFormField>
        <EntityFormField name="durationSeconds" label="Thời gian trả lời" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={5} max={120} addonAfter="giây" />
        </EntityFormField>
        <EntityFormField
          name="prompt"
          label="Nội dung câu hỏi"
          fullWidth
          rules={[{ required: true, message: 'Nhập nội dung câu hỏi.' }]}
        >
          <Input.TextArea rows={3} placeholder="Nhập câu hỏi hiển thị trên màn hình sân khấu…" />
        </EntityFormField>
        <EntityFormField
          name="imageUrl"
          label="Ảnh minh họa"
          extra="Tải ảnh lên Academy Media để hiển thị cùng câu hỏi."
          fullWidth
        >
          <AcademyWorkshopServerImageUpload workshopId={workshopId} area="quiz" disabled={submitting} />
        </EntityFormField>
        <EntityFormField name="sortOrder" label="Thứ tự" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={1} max={999} />
        </EntityFormField>
        <EntityFormField name="rewardRule" label="Cách trao thưởng" rules={[{ required: true }]}>
          <Select options={Object.entries(REWARD_RULE_LABELS).map(([value, label]) => ({ value, label }))} />
        </EntityFormField>

        {rewardRule === 'FASTEST_N' ? (
          <EntityFormField name="fastestCount" label="Số người nhanh nhất" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={1} max={100} />
          </EntityFormField>
        ) : null}
        {rewardRule && rewardRule !== 'NONE' ? (
          <>
            <EntityFormField
              name="rewardLabel"
              label="Nội dung phần thưởng"
              rules={[{ required: true, message: 'Nhập phần thưởng.' }]}
            >
              <Input placeholder="Ví dụ: Voucher 200.000đ" />
            </EntityFormField>
            <EntityFormField name="rewardQuantity" label="Số lượng mỗi người" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={1} max={100} />
            </EntityFormField>
          </>
        ) : null}

        <EntityFormField fullWidth label="Các lựa chọn và đáp án đúng" required>
          <Form.Item name="correctOptionIndex" hidden rules={[{ required: true }]}>
            <InputNumber />
          </Form.Item>
          <Form.List
            name="options"
            rules={[
              {
                validator: async (_, options) => {
                  if (!options || options.length < 2 || options.length > 6) throw new Error('Cần từ 2 đến 6 lựa chọn.');
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.key} className="flex items-start gap-2 rounded-lg border border-inherit p-2">
                    <Radio
                      className="mt-2"
                      checked={correctOptionIndex === index}
                      aria-label={`Chọn lựa chọn ${index + 1} làm đáp án đúng`}
                      onChange={() => form.setFieldValue('correctOptionIndex', index)}
                    />
                    <span className="mt-2 w-5 shrink-0 font-semibold">{String.fromCharCode(65 + index)}</span>
                    <Form.Item
                      name={[field.name, 'label']}
                      className="mb-0 flex-1"
                      rules={[{ required: true, message: 'Nhập nội dung lựa chọn.' }]}
                    >
                      <Input placeholder={`Lựa chọn ${index + 1}`} />
                    </Form.Item>
                    {questionType !== 'TRUE_FALSE' ? (
                      <Button
                        danger
                        type="text"
                        aria-label={`Xóa lựa chọn ${index + 1}`}
                        disabled={fields.length <= 2}
                        icon={<AppIcon icon={Trash2} />}
                        onClick={() => {
                          remove(field.name);
                          if (correctOptionIndex === index) form.setFieldValue('correctOptionIndex', 0);
                          else if ((correctOptionIndex ?? 0) > index)
                            form.setFieldValue('correctOptionIndex', (correctOptionIndex ?? 0) - 1);
                        }}
                      />
                    ) : null}
                  </div>
                ))}
                <Form.ErrorList errors={errors} />
                {questionType !== 'TRUE_FALSE' && optionValues.length < 6 ? (
                  <Button block type="dashed" icon={<AppIcon icon={CirclePlus} />} onClick={() => add({ label: '' })}>
                    Thêm lựa chọn
                  </Button>
                ) : null}
              </div>
            )}
          </Form.List>
        </EntityFormField>
      </EntityForm>
    </AdaptiveDrawer>
  );
}
