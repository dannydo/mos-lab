'use client';

import React from 'react';
import { Button, Card } from 'antd';
import { Award, CheckCircle2, Clock, Eye, XCircle } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import type { TechnicianAssessmentRecord } from './assessment-cert-config';

interface AssessmentCertificateTabProps {
  records: TechnicianAssessmentRecord[];
  onPreviewCert: (record: TechnicianAssessmentRecord) => void;
  onApproveCertificate: (techId: string) => void;
}

export function AssessmentCertificateTab({
  records,
  onPreviewCert,
  onApproveCertificate,
}: AssessmentCertificateTabProps) {
  return (
    <div className="space-y-6" data-testid="section-certificate-management">
      {/* Quy định cấp chứng chỉ */}
      <div className="p-4 rounded-xl bg-purple-500/10 dark:bg-purple-950/30 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-sm text-purple-800 dark:text-purple-300">
          <AppIcon icon={Award} size={16} />
          <span>Quy Chuẩn Cấp Chứng Chỉ Chuyên Môn Vận Hành Dịch Vụ Uốn Mi Bóng Tối</span>
        </div>
        <p className="leading-relaxed m-0">
          Chứng chỉ chuyên môn là căn cứ pháp lý nội bộ xác nhận <strong>Chuyên Viên Kỹ Thuật</strong> đã vượt qua kỳ
          sát hạch độc lập, đủ năng lực trực tiếp nhận ca khách hàng độc lập tại các chi nhánh.
        </p>
        <p className="leading-relaxed m-0 font-medium">
          🔒 <strong>Cơ chế bảo vệ</strong>: Không tự động cấp chứng chỉ khi chưa có phê duyệt chính thức từ{' '}
          <strong>CEO Danny Đỗ</strong>. Mọi chứng chỉ đều được định danh bằng mã số độc bản (Unique Certificate ID) và
          lưu trữ vĩnh viễn trong hồ sơ nhân sự.
        </p>
      </div>

      {/* Danh sách quản lý cấp chứng chỉ */}
      <Card
        variant="outlined"
        className="rounded-xl border-slate-200 dark:border-slate-800"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <AppIcon icon={Award} size={16} className="text-amber-500" />
              <span>Hồ Sơ &amp; Trạng Thái Phê Duyệt Cấp Chứng Chỉ ({records.length} Chuyên Viên)</span>
            </div>
            <span className="text-xs text-slate-400">Thẩm quyền ký duyệt: CEO Danny Đỗ</span>
          </div>
        }
      >
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
              data-testid={`cert-card-${rec.id}`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{rec.technicianName}</span>
                  <span className="text-xs text-slate-400">• {rec.branch}</span>
                  {rec.certificateApproved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={12} />
                      <span>Đã Cấp Chứng Chỉ: {rec.certificateCode}</span>
                    </span>
                  ) : rec.status === 'PASSED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      <Clock size={12} />
                      <span>Đạt Sát Hạch • Chờ CEO Phê Duyệt</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                      <XCircle size={12} />
                      <span>Chưa Đạt Sát Hạch (Cần Rèn Luyện Thêm)</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span>
                    Lý thuyết:{' '}
                    <strong className="text-slate-700 dark:text-slate-300 tabular-nums">{rec.theoryScore}/100đ</strong>
                  </span>
                  <span>
                    Thực hành:{' '}
                    <strong className="text-slate-700 dark:text-slate-300 tabular-nums">
                      {rec.practicalTotalScore}/100đ
                    </strong>
                  </span>
                  <span>Người đào tạo: Cô Giang Đàm</span>
                  <span>Người chấm: CEO Danny Đỗ</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 m-0 italic">
                  &ldquo;{rec.examinerNotes}&rdquo;
                </p>
              </div>

              {/* Hành động phê duyệt & xem chứng chỉ */}
              <div className="shrink-0 flex items-center gap-2 flex-wrap">
                {rec.certificateApproved ? (
                  <Button
                    type="default"
                    onClick={() => onPreviewCert(rec)}
                    className="text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    data-testid={`btn-preview-cert-${rec.id}`}
                  >
                    <AppIcon icon={Eye} size={14} />
                    <span>Xem Bằng Chứng Nhận</span>
                  </Button>
                ) : rec.status === 'PASSED' ? (
                  <>
                    <Button
                      type="default"
                      onClick={() => onPreviewCert(rec)}
                      className="text-xs font-semibold rounded-lg flex items-center gap-1"
                    >
                      <AppIcon icon={Eye} size={14} />
                      <span>Xem trước Bằng</span>
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => onApproveCertificate(rec.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm"
                      data-testid={`btn-approve-cert-${rec.id}`}
                    >
                      <AppIcon icon={Award} size={14} className="mr-1" />
                      <span>CEO Danny Phê Duyệt Cấp</span>
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">Yêu cầu hoàn thành bài thi đạt ≥ 80đ</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
