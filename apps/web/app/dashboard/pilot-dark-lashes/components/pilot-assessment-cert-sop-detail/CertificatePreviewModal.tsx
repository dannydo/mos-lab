'use client';

import React from 'react';
import { Button } from 'antd';
import { Award, Printer } from 'lucide-react';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import type { TechnicianAssessmentRecord } from './assessment-cert-config';

interface CertificatePreviewModalProps {
  previewCertTech: TechnicianAssessmentRecord | null;
  onClose: () => void;
}

export function CertificatePreviewModal({ previewCertTech, onClose }: CertificatePreviewModalProps) {
  return (
    <AdaptiveModal
      open={Boolean(previewCertTech)}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      className="certificate-preview-modal"
      title={null}
    >
      {previewCertTech && (
        <div className="p-4 sm:p-6 space-y-4" data-testid="certificate-preview-container">
          {/* Khung Bằng Chứng Nhận thiết kế sang trọng */}
          <div className="relative p-6 sm:p-8 rounded-2xl border-4 border-double border-amber-500/50 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-md text-center space-y-4">
            {/* Huy hiệu đỉnh */}
            <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md">
              <Award size={28} />
            </div>

            {/* Tên tổ chức */}
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold tracking-widest text-amber-700 dark:text-amber-400 uppercase">
                WINGS NAILS &amp; LASHES ACADEMY
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-wide m-0">
                GIẤY CHỨNG NHẬN CHUYÊN MÔN
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                DARK LASHES SPECIALIST CERTIFICATE
              </span>
            </div>

            {/* Nội dung chứng nhận */}
            <div className="py-3 space-y-1.5 border-y border-dashed border-amber-400/40 my-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Chứng nhận xác thực trao cho:</p>
              <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-serif">
                {previewCertTech.technicianName}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto m-0 leading-relaxed">
                Đã hoàn thành xuất sắc chương trình đào tạo nghiệp vụ và vượt qua kỳ sát hạch độc lập theo đúng quy
                chuẩn <strong>SOP Kỹ Thuật Uốn Mi Bóng Tối</strong>.
              </p>
            </div>

            {/* Thông tin kết quả & chữ ký */}
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="text-center space-y-1">
                <span className="text-slate-400 block text-[11px]">Trưởng Ban Đào Tạo</span>
                <div className="font-serif italic font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Cô Giang Đàm
                </div>
                <span className="text-[10px] text-slate-400 block">Wings Master Lash Artisan</span>
              </div>
              <div className="text-center space-y-1">
                <span className="text-slate-400 block text-[11px]">Chủ Tịch &amp; Tổng Giám Đốc</span>
                <div className="font-serif italic font-bold text-amber-600 dark:text-amber-400 text-sm">
                  CEO Danny Đỗ
                </div>
                <span className="text-[10px] text-slate-400 block">Ký duyệt &amp; Xác thực thẩm định</span>
              </div>
            </div>

            {/* Mã chứng chỉ footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Mã chứng chỉ:{' '}
                <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                  {previewCertTech.certificateCode || 'WINGS-DL-2026-PENDING'}
                </strong>
              </span>
              <span>
                Ngày cấp:{' '}
                <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                  {previewCertTech.certificateIssuedAt || previewCertTech.examDate}
                </strong>
              </span>
            </div>
          </div>

          {/* Actions modal */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Hồ sơ đã được lưu trữ vĩnh viễn trên hệ thống quản lý mOS.</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  window.print();
                }}
                className="text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <AppIcon icon={Printer} size={14} />
                <span>In Chứng Chỉ</span>
              </Button>
              <Button
                type="primary"
                onClick={onClose}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdaptiveModal>
  );
}
