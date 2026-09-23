'use client';

import React from 'react';
import { Button, Space, message } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Copy, Printer, Sparkles, Star, Users } from 'lucide-react';
import type {
  AcademyWorkshopDetail,
  AcademyWorkshopParticipant,
  AcademyWorkshopDesignDifficultyLevel,
} from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, MetricGrid, StatusTag } from '../../../../components/ui';
import { WorkshopImage, WorkshopImageGallery } from './AcademyWorkshopImageGallery';

export interface AcademyWorkshopDesignPrepModalProps {
  open: boolean;
  onClose: () => void;
  workshop: AcademyWorkshopDetail;
  participants: AcademyWorkshopParticipant[];
}

function difficultyMeta(level: AcademyWorkshopDesignDifficultyLevel) {
  switch (level) {
    case 'BASIC':
      return {
        label: 'Cơ bản',
        stars: 1,
        color: 'green',
        className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      };
    case 'ADVANCED':
      return { label: 'Nâng cao', stars: 2, color: 'blue', className: 'text-sky-600 bg-sky-50 border-sky-200' };
    case 'MASTER':
      return {
        label: 'Chuyên sâu',
        stars: 3,
        color: 'purple',
        className: 'text-purple-600 bg-purple-50 border-purple-200',
      };
    default:
      return { label: 'Cơ bản', stars: 1, color: 'default', className: 'text-gray-600 bg-gray-50 border-gray-200' };
  }
}

export default function AcademyWorkshopDesignPrepModal({
  open,
  onClose,
  workshop,
  participants,
}: AcademyWorkshopDesignPrepModalProps) {
  const summary = React.useMemo(() => {
    const total = participants.length;
    const selectedCount = participants.filter((p) => Boolean(p.designSelection)).length;
    const unselectedParticipants = participants.filter((p) => !p.designSelection);

    let basicCount = 0;
    let advancedCount = 0;
    let masterCount = 0;

    const designBreakdowns = (workshop.designs || []).map((design) => {
      const chosenParticipants = participants.filter(
        (p) => p.designSelection?.designItemId === design.id || p.designSelection?.designName === design.name
      );

      if (design.difficultyLevel === 'BASIC') basicCount += chosenParticipants.length;
      else if (design.difficultyLevel === 'ADVANCED') advancedCount += chosenParticipants.length;
      else if (design.difficultyLevel === 'MASTER') masterCount += chosenParticipants.length;

      return {
        design,
        count: chosenParticipants.length,
        students: chosenParticipants.map((p) => ({
          name: p.lead.name,
          phone: p.lead.phone,
        })),
      };
    });

    return {
      total,
      selectedCount,
      unselectedCount: total - selectedCount,
      unselectedParticipants,
      designBreakdowns,
      basicCount,
      advancedCount,
      masterCount,
    };
  }, [participants, workshop.designs]);

  const copyPrepText = React.useCallback(() => {
    const lines: string[] = [
      `✨ DANH SÁCH MẪU THIẾT KẾ MI THỰC HÀNH · ${workshop.name.toUpperCase()}`,
      `⏰ Thời gian: ${dayjs(workshop.startsAt).format('HH:mm, DD/MM/YYYY')}`,
      `📍 Địa điểm: ${workshop.location}`,
      `👥 Tổng số học viên: ${summary.total} (Đã đăng ký mẫu: ${summary.selectedCount}/${summary.total})`,
      `📊 Phân bổ trình độ: Cơ bản (⭐): ${summary.basicCount} | Nâng cao (⭐⭐): ${summary.advancedCount} | Chuyên sâu (⭐⭐⭐): ${summary.masterCount}`,
      '',
    ];

    summary.designBreakdowns.forEach(({ design, count, students }) => {
      const meta = difficultyMeta(design.difficultyLevel);
      const stars = '⭐'.repeat(meta.stars);
      lines.push(`👁️ MẪU: ${design.name.toUpperCase()} [${stars} ${meta.label}] (Số lượng: ${count} học viên)`);
      if (design.priceVnd > 0) {
        lines.push(`   Phụ thu: ${design.priceVnd.toLocaleString('vi-VN')} đ`);
      }
      if (students.length) {
        lines.push(`   Học viên thực hành: ${students.map((s) => s.name).join(', ')}`);
      }
      lines.push('');
    });

    if (summary.unselectedCount > 0) {
      lines.push(`⚠️ Học viên chưa chọn mẫu thiết kế (${summary.unselectedCount}):`);
      summary.unselectedParticipants.forEach((p) => {
        lines.push(`   - ${p.lead.name} (${p.lead.phone || 'Chưa có SĐT'})`);
      });
      lines.push('');
    }

    lines.push('Đề nghị Giảng viên & Trợ giảng chuẩn bị sơ đồ mẫu mi và lông mi tương ứng trước giờ thực hành.');

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => message.success('Đã sao chép danh sách mẫu mi thực hành vào bộ nhớ tạm!'))
      .catch(() => message.error('Không thể sao chép văn bản.'));
  }, [summary, workshop]);

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Sparkles} className="text-pink-500" />
          <span>Tổng hợp Mẫu Thiết Kế Mi Thực Hành</span>
        </div>
      }
      width={720}
      footer={
        <div className="flex items-center justify-between">
          <Button icon={<AppIcon icon={Printer} />} onClick={handlePrint}>
            In danh sách
          </Button>
          <Space>
            <Button icon={<AppIcon icon={Copy} />} onClick={copyPrepText} type="primary">
              Sao chép văn bản
            </Button>
            <Button onClick={onClose}>Đóng</Button>
          </Space>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        <MetricGrid
          columns={4}
          items={[
            {
              key: 'total',
              title: 'Tổng Học Viên',
              value: summary.total,
              icon: <AppIcon icon={Users} />,
            },
            {
              key: 'selected',
              title: 'Đã Chọn Mẫu',
              value: `${summary.selectedCount}/${summary.total}`,
              icon: <AppIcon icon={CheckCircle2} />,
            },
            {
              key: 'unselected',
              title: 'Chưa Chọn',
              value: summary.unselectedCount,
              icon: <AppIcon icon={AlertCircle} />,
            },
            {
              key: 'levels',
              title: 'Cơ bản / Nâng cao / Master',
              value: `${summary.basicCount} / ${summary.advancedCount} / ${summary.masterCount}`,
              icon: <AppIcon icon={Star} />,
            },
          ]}
        />

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Chi Tiết Học Viên Theo Mẫu Thiết Kế
          </h4>
          <div className="space-y-3">
            {summary.designBreakdowns.map(({ design, count, students }) => {
              const meta = difficultyMeta(design.difficultyLevel);
              return (
                <div
                  key={design.id}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{design.name}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}
                        >
                          {'⭐'.repeat(meta.stars)} {meta.label}
                        </span>
                        {design.priceVnd > 0 ? (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            +{design.priceVnd.toLocaleString('vi-VN')} đ
                          </span>
                        ) : null}
                      </div>
                      {design.description ? (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {design.description}
                        </p>
                      ) : null}
                      {design.images && design.images.length > 0 && (
                        <WorkshopImageGallery>
                          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto">
                            {design.images.map((img) => (
                              <div
                                key={img.id}
                                className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-purple-100 dark:border-purple-900/60"
                              >
                                <WorkshopImage
                                  src={img.imageUrl}
                                  alt={img.altText || design.name}
                                  className="h-full w-full object-cover"
                                  wrapperClassName="!h-full !w-full"
                                />
                              </div>
                            ))}
                          </div>
                        </WorkshopImageGallery>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-pink-50 px-2.5 py-1 text-sm font-bold text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
                      {count} học viên
                    </span>
                  </div>

                  {students.length > 0 ? (
                    <div className="mt-3 border-t border-gray-50 pt-2.5 dark:border-gray-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Danh sách ({students.length}):{' '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {students.map((s) => s.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs italic text-gray-400">Chưa có học viên nào chọn mẫu này</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {summary.unselectedCount > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AppIcon icon={AlertCircle} className="h-4 w-4" />
              <span className="font-semibold text-sm">
                Học viên chưa chọn mẫu thiết kế mi ({summary.unselectedCount})
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.unselectedParticipants.map((p) => (
                <StatusTag
                  key={p.id}
                  status="warning"
                  label={`${p.lead.name}${p.lead.phone ? ` (${p.lead.phone})` : ''}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AdaptiveModal>
  );
}
