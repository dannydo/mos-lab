'use client';

import React, { useState } from 'react';
import { Modal, Input, Button, message, Checkbox } from 'antd';
import { apiClient } from '../../../../lib/api-client';
import StarRatingInput from './StarRatingInput';

const { TextArea } = Input;

interface SurveyModalProps {
  open: boolean;
  onClose: () => void;
  taskId: number;
}

export default function SurveyModal({ open, onClose, taskId }: SurveyModalProps) {
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [customerNote, setCustomerNote] = useState('');
  const [csNote, setCsNote] = useState('');
  const [autoCreateTicket, setAutoCreateTicket] = useState(true);

  const categories = [
    { key: 'quality', label: 'Chất lượng dịch vụ' },
    { key: 'attitude', label: 'Thái độ nhân viên' },
    { key: 'space', label: 'Không gian, vệ sinh' },
    { key: 'wait_time', label: 'Thời gian chờ đợi' },
    { key: 'price', label: 'Giá cả hợp lý' },
    { key: 'consultation', label: 'Tư vấn dịch vụ' },
    { key: 'checkout', label: 'Quy trình thanh toán' },
    { key: 'overall', label: 'Đánh giá chung' },
  ];

  const [technicalIssueTags, setTechnicalIssueTags] = useState<string[]>([]);

  const technicalIssueOptions = [
    { label: '👁️ Cay mắt / Đỏ mắt', value: 'EYE_STINGING' },
    { label: '⚡ Rụng mi nhanh (≤ 3 ngày)', value: 'FAST_SHEDDING' },
    { label: '📌 Cộm mi / Đâm vào mí mắt', value: 'EYELID_POKING' },
    { label: '💧 Bết keo / Dính chùm mi', value: 'GLUE_CLUMPING' },
    { label: '📐 Sai dáng mi / Sai độ dài / Độ cong', value: 'WRONG_STYLE' },
    { label: '⌛ Làm quá lâu / Thô bạo khi nối', value: 'SERVICE_PAINFUL_TOO_LONG' },
  ];

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(ratings).length === 0) {
      message.warning('Vui lòng chọn ít nhất một tiêu chí đánh giá');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.cs.submitSurvey(taskId, {
        overallRating: ratings.overall || 5,
        technicianQualityRating: ratings.quality || ratings.ktv || null,
        staffAttitudeRating: ratings.attitude || null,
        facilityRating: ratings.space || null,
        valueForMoneyRating: ratings.price || null,
        checkInExperienceRating: ratings.consultation || null,
        checkOutExperienceRating: ratings.checkout || null,
        bookingExperienceRating: ratings.wait_time || null,
        ratings,
        customerNote,
        csNote,
        technicalIssueTags,
        autoCreateTicket,
      });

      const ticketsCreated = res?.data?.ticketsCreated ?? res?.ticketsCreated ?? 0;
      message.success('Đã lưu kết quả khảo sát thành công');

      if (ticketsCreated > 0) {
        message.info(`Đã tự động tạo ${ticketsCreated} ticket phàn nàn do có đánh giá ≤ 3 sao`);
      } else {
        const hasLowRating = Object.values(ratings).some((val) => val <= 3);
        if (hasLowRating && autoCreateTicket) {
          message.info('Hệ thống kiểm tra và tự động xử lý ticket liên quan.');
        }
      }

      // Reset form & close
      setRatings({});
      setCustomerNote('');
      setCsNote('');
      setTechnicalIssueTags([]);
      onClose();
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi lưu khảo sát');
    } finally {
      setLoading(false);
    }
  };

  const showTechnicalTags = (ratings.quality && ratings.quality <= 3) || (ratings.ktv && ratings.ktv <= 3);

  return (
    <Modal
      title="Khảo Sát Khách Hàng (Happy Call)"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Lưu khảo sát
        </Button>,
      ]}
      width={700}
    >
      <div className="flex flex-col gap-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <StarRatingInput
              key={cat.key}
              label={cat.label}
              value={ratings[cat.key] || 0}
              onChange={(val) => handleRatingChange(cat.key, val)}
            />
          ))}
        </div>

        {/* Dynamic Technical Quality Issue Tags Checklist */}
        {showTechnicalTags && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠️ Bóc tách Lỗi Kỹ Thuật (Chất lượng dịch vụ ≤ 3 sao):</span>
            </div>
            <Checkbox.Group
              options={technicalIssueOptions}
              value={technicalIssueTags}
              onChange={(checkedValues) => setTechnicalIssueTags(checkedValues as string[])}
              className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm"
            />
          </div>
        )}

        <div>
          <div className="font-medium mb-2">Ghi chú của Khách Hàng (Ý kiến đóng góp):</div>
          <TextArea
            rows={3}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Nhập ý kiến của khách hàng..."
          />
        </div>

        <div>
          <div className="font-medium mb-2">Ghi chú Nội Bộ (CSKH):</div>
          <TextArea
            rows={3}
            value={csNote}
            onChange={(e) => setCsNote(e.target.value)}
            placeholder="Nhập ghi chú nội bộ (không hiển thị cho khách hàng)..."
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
          <Checkbox checked={autoCreateTicket} onChange={(e) => setAutoCreateTicket(e.target.checked)}>
            Tự động tạo Ticket xử lý phàn nàn nếu có đánh giá ≤ 3 sao
          </Checkbox>
        </div>
      </div>
    </Modal>
  );
}
