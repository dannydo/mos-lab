'use client';

import React from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Form, Input, InputNumber, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  CalendarDays,
  Copy,
  Gamepad2,
  ListChecks,
  MapPin,
  PackageCheck,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import type { AcademyWorkshopClonePreview, AcademyWorkshopDetail, CloneAcademyWorkshopRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AdaptiveModal, AppIcon, IconText, StatePanel, StatusTag } from '../../../../components/ui';

interface CloneFormValues {
  name: string;
  slug: string;
  schedule: [Dayjs, Dayjs];
  location: string;
  capacity: number;
  feeVnd: number;
  showInSidebar: boolean;
  includeAgenda: boolean;
  includeMenu: boolean;
  includeEquipment: boolean;
  includeDesigns: boolean;
  includeQuizzes: boolean;
}

export interface AcademyWorkshopCloneModalProps {
  workshopId: number | null;
  workshopName?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (cloned: AcademyWorkshopDetail) => void;
}

export default function AcademyWorkshopCloneModal({
  workshopId,
  workshopName,
  open,
  onClose,
  onSuccess,
}: AcademyWorkshopCloneModalProps) {
  const [form] = Form.useForm<CloneFormValues>();
  const [preview, setPreview] = React.useState<AcademyWorkshopClonePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [cloning, setCloning] = React.useState(false);

  React.useEffect(() => {
    if (!open || !workshopId) {
      setPreview(null);
      form.resetFields();
      return;
    }

    let active = true;
    setLoadingPreview(true);

    apiClient.academySales.workshops
      .getClonePreview(workshopId)
      .then((data) => {
        if (!active) return;
        setPreview(data);
        form.setFieldsValue({
          name: data.suggestedName,
          slug: data.suggestedSlug,
          schedule: [dayjs(data.suggestedStartsAt), dayjs(data.suggestedEndsAt)],
          location: data.location,
          capacity: data.capacity,
          feeVnd: data.feeVnd,
          showInSidebar: false,
          includeAgenda: true,
          includeMenu: true,
          includeEquipment: true,
          includeDesigns: true,
          includeQuizzes: true,
        });
      })
      .catch((cause: any) => {
        if (active) {
          message.error(cause?.response?.data?.message || 'Không thể tải thông tin gợi ý nhân bản.');
          onClose();
        }
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [form, onClose, open, workshopId]);

  const handleSubmit = React.useCallback(
    async (values: CloneFormValues) => {
      if (!workshopId) return;
      setCloning(true);
      try {
        const payload: CloneAcademyWorkshopRequest = {
          name: values.name.trim(),
          slug: values.slug?.trim() || undefined,
          startsAt: values.schedule[0].toISOString(),
          endsAt: values.schedule[1].toISOString(),
          location: values.location.trim(),
          capacity: values.capacity,
          feeVnd: values.feeVnd,
          showInSidebar: values.showInSidebar,
          includeAgenda: values.includeAgenda,
          includeMenu: values.includeMenu,
          includeEquipment: values.includeEquipment,
          includeDesigns: values.includeDesigns,
          includeQuizzes: values.includeQuizzes,
        };

        const cloned = await apiClient.academySales.workshops.clone(workshopId, payload);
        message.success(`Đã nhân bản thành công sang ${cloned.name}!`);
        onClose();
        onSuccess(cloned);
      } catch (cause: any) {
        message.error(cause?.response?.data?.message || 'Nhân bản workshop thất bại.');
      } finally {
        setCloning(false);
      }
    },
    [onClose, onSuccess, workshopId]
  );

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Copy} className="text-emerald-500" />
          <span>Nhân bản Workshop (Tạo khóa tiếp theo)</span>
          {preview ? <StatusTag status="purple" label={`Series: ${preview.seriesKey}`} /> : null}
        </div>
      }
      footer={null}
      width={720}
      destroyOnClose
    >
      {loadingPreview ? (
        <StatePanel
          kind="loading"
          surface={false}
          title="Đang đọc nội dung và phân tích gợi ý khóa tiếp theo…"
          minHeight={240}
        />
      ) : (
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4 space-y-4">
          <Alert
            type="info"
            showIcon
            message="Kế thừa & Cách ly độc lập"
            description={
              <div>
                Nguồn nhân bản: <strong>{preview?.sourceName || workshopName}</strong>. Khóa mới sẽ khởi tạo với danh
                sách <strong>0 học viên</strong>, sẵn sàng mở đăng ký. Mọi chỉnh sửa ở khóa mới là độc lập và không ảnh
                hưởng đến khóa cũ.
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              name="name"
              label="Tên khóa mới"
              rules={[{ required: true, message: 'Vui lòng nhập tên workshop' }]}
            >
              <Input placeholder="Ví dụ: Workshop Đổi Vận (K02)" />
            </Form.Item>

            <Form.Item
              name="slug"
              label="Đường dẫn slug"
              rules={[{ required: true, message: 'Vui lòng nhập slug' }]}
              extra="Đường dẫn định danh duy nhất cho khóa mới"
            >
              <Input placeholder="workshop-doi-van-k02" />
            </Form.Item>
          </div>

          <Form.Item
            name="schedule"
            label="Lịch tổ chức (Bắt đầu - Kết thúc)"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian tổ chức' }]}
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY · HH:mm"
              className="w-full"
              placeholder={['Bắt đầu', 'Kết thúc']}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Form.Item name="location" label="Địa điểm" rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}>
              <Input prefix={<AppIcon icon={MapPin} size="sm" />} />
            </Form.Item>

            <Form.Item
              name="capacity"
              label="Sức chứa (Học viên)"
              rules={[{ required: true, message: 'Nhập sức chứa' }]}
            >
              <InputNumber min={1} max={500} className="w-full" />
            </Form.Item>

            <Form.Item name="feeVnd" label="Học phí (VND)">
              <InputNumber<number>
                min={0}
                step={50000}
                formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0')}
                parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                className="w-full"
              />
            </Form.Item>
          </div>

          <Card
            size="small"
            title="Chọn nội dung sao chép sang khóa mới"
            className="bg-slate-50/50 dark:bg-slate-900/50"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Form.Item name="includeAgenda" valuePropName="checked" className="!mb-0">
                <Checkbox>
                  <IconText icon={<AppIcon icon={ListChecks} size="sm" />}>
                    <strong>Agenda & Timeline</strong> ({preview?.counts.agendaItems ?? 0} chặng)
                  </IconText>
                </Checkbox>
              </Form.Item>

              <Form.Item name="includeMenu" valuePropName="checked" className="!mb-0">
                <Checkbox>
                  <IconText icon={<AppIcon icon={UtensilsCrossed} size="sm" />}>
                    <strong>Thực đơn ăn trưa</strong> ({preview?.counts.menuItems ?? 0} món)
                  </IconText>
                </Checkbox>
              </Form.Item>

              <Form.Item name="includeEquipment" valuePropName="checked" className="!mb-0">
                <Checkbox>
                  <IconText icon={<AppIcon icon={PackageCheck} size="sm" />}>
                    <strong>Bộ dụng cụ đồ nghề</strong> ({preview?.counts.equipmentPackages ?? 0} gói)
                  </IconText>
                </Checkbox>
              </Form.Item>

              <Form.Item name="includeDesigns" valuePropName="checked" className="!mb-0">
                <Checkbox>
                  <IconText icon={<AppIcon icon={Sparkles} size="sm" />}>
                    <strong>Mẫu thiết kế dáng mi</strong> ({preview?.counts.designs ?? 0} mẫu)
                  </IconText>
                </Checkbox>
              </Form.Item>

              <Form.Item name="includeQuizzes" valuePropName="checked" className="!mb-0 md:col-span-2">
                <Checkbox>
                  <IconText icon={<AppIcon icon={Gamepad2} size="sm" />}>
                    <strong>Mini-game & Trắc nghiệm</strong> ({preview?.counts.quizzes ?? 0} game ·{' '}
                    {preview?.counts.quizQuestions ?? 0} câu hỏi)
                  </IconText>
                </Checkbox>
              </Form.Item>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button onClick={onClose} disabled={cloning}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={cloning} icon={<AppIcon icon={Copy} />}>
              Xác nhận nhân bản khóa mới
            </Button>
          </div>
        </Form>
      )}
    </AdaptiveModal>
  );
}
