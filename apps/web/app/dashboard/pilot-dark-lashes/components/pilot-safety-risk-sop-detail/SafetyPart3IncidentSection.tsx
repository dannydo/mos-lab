'use client';

import React from 'react';
import { Button, Card } from 'antd';
import { CheckCircle2, Plus, ShieldCheck } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { FOLLOW_UP_MILESTONE_META } from './safety-risk-data';
import type { FollowUpMilestone, IncidentReport } from './safety-risk-types';

interface SafetyPart3IncidentSectionProps {
  incidents: IncidentReport[];
  onOpenCreateIncident: () => void;
  onUpdateFollowUp: (incidentId: string, milestone: FollowUpMilestone, text: string) => void;
  onSelectIncidentDetail: (incident: IncidentReport) => void;
}

export function SafetyPart3IncidentSection({
  incidents,
  onOpenCreateIncident,
  onUpdateFollowUp,
  onSelectIncidentDetail,
}: SafetyPart3IncidentSectionProps) {
  return (
    <section className="space-y-4 pt-2" data-testid="safety-part-3-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
            Phần 3 – Quản trị rủi ro &amp; Chăm sóc
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Biên Bản Ghi Nhận Sự Cố &amp; Quy Trình Chăm Sóc Bổ Sung Sau 24h – 48h – 72h
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            danger
            icon={<AppIcon icon={Plus} size={13} />}
            onClick={onOpenCreateIncident}
            className="text-xs font-medium"
            data-testid="create-incident-btn"
          >
            Tạo Biên Bản Sự Cố Mới
          </Button>
        </div>
      </div>

      {/* Banner Khẳng Định Nguyên Tắc Pilot: 0 Sự Cố Thực Nghiệm */}
      <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <AppIcon icon={ShieldCheck} size={18} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 m-0">
                Nguyên Tắc Thực Nghiệm Pilot: Tỷ Lệ An Toàn Giác Mạc Tuyệt Đối 100%
              </h4>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">
                Đã đối soát 17 ca
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
              Trong toàn bộ 17 ca thực nghiệm Pilot tại chi nhánh Đề Thám do Cô Đẫm phụ trách, hệ thống{' '}
              <strong className="text-emerald-700 dark:text-emerald-300">
                chưa ghi nhận bất kỳ trường hợp cay mắt, kích ứng đỏ hay sự cố kỹ thuật nào
              </strong>
              . Tuân thủ nguyên tắc mos-lab: không tự tạo dữ liệu sự cố giả mạo; biểu mẫu được chuẩn hóa sẵn sàng tiếp
              nhận khi có phát sinh.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-right">
          <div>
            <span className="text-[11px] text-slate-500 block">Sự cố phát sinh</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">0 ca</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Tỷ lệ an toàn</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">100%</span>
          </div>
        </div>
      </div>

      {/* Danh Sách Biên Bản Sự Cố / Empty State */}
      {incidents.length === 0 ? (
        <div
          className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 bg-white/40 dark:bg-slate-900/40"
          data-testid="incidents-empty-state"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <AppIcon icon={CheckCircle2} size={24} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 m-0">
              Chưa Ghi Nhận Sự Cố Kỹ Thuật Nào
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
              Tất cả các ca uốn mi bóng tối trong giai đoạn Pilot đều tuân thủ nghiêm ngặt cữ trục ≥ 0.8mm và đệm
              hydrogel, không có ca nào phải dừng dịch vụ hoặc chuyển y tế.
            </p>
          </div>
          <Button
            type="dashed"
            size="small"
            icon={<AppIcon icon={Plus} size={12} />}
            onClick={onOpenCreateIncident}
            className="text-xs"
          >
            Thử nghiệm lập biên bản sự cố giả định phục vụ đào tạo
          </Button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="incidents-list">
          {incidents.map((inc) => (
            <Card
              key={inc.id}
              variant="outlined"
              className="rounded-2xl border border-rose-500/30 hover:shadow-md transition-all p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 m-0">
                      {inc.code}
                    </span>
                    <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 m-0">
                      {inc.incidentTypeLabel}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">{inc.incidentTime}</span>
                    {inc.sessionCode && (
                      <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 m-0">
                        {inc.sessionCode}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                    Khách hàng: {inc.customerName} ({inc.customerPhone}) · KTV phụ trách: {inc.technicianName}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold border m-0 ${
                      inc.status === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : inc.status === 'TRANSFERRED_MEDICAL'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {inc.status === 'RESOLVED'
                      ? 'Đã xử lý & Ổn định'
                      : inc.status === 'TRANSFERRED_MEDICAL'
                        ? 'Đã chuyển y tế'
                        : 'Đang theo dõi chăm sóc'}
                  </span>
                  <Button size="small" onClick={() => onSelectIncidentDetail(inc)} className="text-xs">
                    Chi tiết biên bản
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Tình trạng phát sinh:</span>
                  <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed">{inc.description}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Phương án xử lý tại chỗ:</span>
                  <p className="text-slate-700 dark:text-slate-300 m-0 leading-relaxed">{inc.immediateAction}</p>
                </div>
              </div>

              {/* Lộ Trình Theo Dõi & Chăm Sóc Bổ Sung (24h - 48h - 72h) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  Tiến độ theo dõi &amp; Chăm sóc sau sự cố:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {FOLLOW_UP_MILESTONE_META.map((item) => {
                    const record = inc[item.field];
                    return (
                      <div
                        key={item.milestone}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.title}</span>
                          {record ? (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">
                              {item.doneBadge}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 m-0">
                              Chờ theo dõi
                            </span>
                          )}
                        </div>
                        {record ? (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 tabular-nums">
                            {record.condition} ({record.recordedAt})
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUpdateFollowUp(inc.id, item.milestone, item.defaultCondition)}
                            className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer bg-transparent border-0 p-0"
                          >
                            {item.actionLabel}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
