'use client';

import React from 'react';
import { Button, Space, message } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Copy, PackageCheck, Printer, Wrench, Users } from 'lucide-react';
import type { AcademyWorkshopDetail, AcademyWorkshopParticipant } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, MetricGrid, StatusTag } from '../../../../components/ui';

export interface AcademyWorkshopEquipmentPrepModalProps {
  open: boolean;
  onClose: () => void;
  workshop: AcademyWorkshopDetail;
  participants: AcademyWorkshopParticipant[];
}

export default function AcademyWorkshopEquipmentPrepModal({
  open,
  onClose,
  workshop,
  participants,
}: AcademyWorkshopEquipmentPrepModalProps) {
  const summary = React.useMemo(() => {
    const total = participants.length;
    const selectedCount = participants.filter((p) => Boolean(p.equipmentSelection)).length;
    const unselectedParticipants = participants.filter((p) => !p.equipmentSelection);

    const packageBreakdowns = workshop.equipmentPackages.map((pkg) => {
      const chosenParticipants = participants.filter(
        (p) => p.equipmentSelection?.equipmentPackageId === pkg.id || p.equipmentSelection?.packageName === pkg.name
      );

      return {
        pkg,
        count: chosenParticipants.length,
        items: pkg.includedItems,
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
      packageBreakdowns,
    };
  }, [participants, workshop.equipmentPackages]);

  const copyPrepText = React.useCallback(() => {
    const lines: string[] = [
      `🧰 DANH SÁCH SOẠN CỐP DỤNG CỤ THỰC HÀNH · ${workshop.name.toUpperCase()}`,
      `⏰ Thời gian: ${dayjs(workshop.startsAt).format('HH:mm, DD/MM/YYYY')}`,
      `📍 Địa điểm: ${workshop.location}`,
      `👥 Tổng số học viên: ${summary.total} (Đã đăng ký dụng cụ: ${summary.selectedCount}/${summary.total})`,
      '',
    ];

    summary.packageBreakdowns.forEach(({ pkg, count, items, students }) => {
      lines.push(`📦 GÓI: ${pkg.name.toUpperCase()} (Số lượng: ${count} bộ)`);
      if (items.length) {
        lines.push(`   Chi tiết phụ kiện gồm: ${items.join(', ')}`);
      }
      if (students.length) {
        lines.push(`   Học viên nhận: ${students.map((s) => s.name).join(', ')}`);
      }
      lines.push('');
    });

    if (summary.unselectedCount > 0) {
      lines.push(`⚠️ Học viên chưa đăng ký bộ dụng cụ (${summary.unselectedCount}):`);
      summary.unselectedParticipants.forEach((p) => {
        lines.push(`   - ${p.lead.name} (${p.lead.phone || 'Chưa có SĐT'})`);
      });
      lines.push('');
    }

    lines.push('Đề nghị Thủ kho chuẩn bị sẵn sàng trước 02 giờ đón khách.');

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => message.success('Đã sao chép danh sách soạn kho vào bộ nhớ tạm!'))
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
          <AppIcon icon={Wrench} className="text-amber-500" />
          <span>Tổng hợp Kho & Soạn Cốp Dụng Cụ</span>
        </div>
      }
      width={900}
      footer={
        <Space className="w-full justify-between" wrap>
          <Button icon={<AppIcon icon={Copy} size="sm" />} onClick={copyPrepText}>
            Sao chép gửi Kho
          </Button>
          <Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button type="primary" icon={<AppIcon icon={Printer} size="sm" />} onClick={handlePrint}>
              In phiếu kho & Tem nhãn dán (A4)
            </Button>
          </Space>
        </Space>
      }
    >
      <div className="space-y-6 pt-2 print:p-4">
        {/* Header printable */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 print:border-black print:bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="m-0 text-base font-bold text-slate-900 dark:text-white print:text-black">
                {workshop.name}
              </h3>
              <p className="mb-0 mt-1 text-xs text-slate-500 dark:text-slate-400 print:text-black">
                Thời gian:{' '}
                <strong className="tabular-nums">{dayjs(workshop.startsAt).format('HH:mm, DD/MM/YYYY')}</strong> · Địa
                điểm: <strong>{workshop.location}</strong>
              </p>
            </div>
            <div className="text-right">
              <StatusTag
                status={summary.selectedCount > 0 ? 'processing' : 'default'}
                label={`Đã đăng ký ${summary.selectedCount}/${summary.total} bộ dụng cụ`}
              />
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <MetricGrid
          className="print:hidden"
          items={[
            {
              key: 'total',
              title: 'Tổng học viên',
              value: summary.total,
              format: 'number',
              icon: <AppIcon icon={Users} />,
            },
            {
              key: 'selected',
              title: 'Đã chọn gói kit',
              value: summary.selectedCount,
              format: 'number',
              icon: <AppIcon icon={CheckCircle2} />,
            },
            {
              key: 'unselected',
              title: 'Chưa chọn dụng cụ',
              value: summary.unselectedCount,
              format: 'number',
              icon: <AppIcon icon={AlertCircle} />,
            },
          ]}
        />

        {/* Package breakdown list */}
        <div className="space-y-4">
          <h4 className="m-0 text-xs font-black uppercase tracking-wider text-slate-500 print:text-black">
            Bảng tổng hợp số lượng cốp đồ nghề
          </h4>

          {summary.packageBreakdowns.map(({ pkg, count, items, students }) => (
            <div
              key={pkg.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-black print:bg-white"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800 print:border-black">
                <div>
                  <h5 className="m-0 text-sm font-bold text-slate-900 dark:text-white print:text-black">{pkg.name}</h5>
                  {pkg.priceVnd > 0 ? (
                    <span className="tabular-nums text-xs text-amber-600 dark:text-amber-400 print:text-black">
                      Phụ thu: {pkg.priceVnd.toLocaleString('vi-VN')} đ
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600 print:text-black">Đã bao gồm trong học phí</span>
                  )}
                </div>
                <span className="rounded-xl bg-amber-100 px-3 py-1 text-sm font-black text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 print:border print:border-black print:bg-white print:text-black">
                  Cần soạn: {count} bộ
                </span>
              </div>

              {items.length ? (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                    Các dụng cụ đi kèm:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((it, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 print:border-black print:bg-white print:text-black"
                      >
                        ✓ {it}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400 print:text-black">
                  Học viên sử dụng ({students.length}):
                </p>
                {students.length ? (
                  <p className="mb-0 text-xs leading-relaxed text-slate-500 dark:text-slate-400 print:text-black">
                    {students.map((s) => `${s.name}${s.phone ? ` (${s.phone})` : ''}`).join(' · ')}
                  </p>
                ) : (
                  <p className="mb-0 text-xs italic text-slate-400">Chưa có học viên nào đăng ký bộ này.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Print-only: Toolkit Name Tags (Tem dán giỏ dụng cụ) */}
        <div className="hidden border-t-2 border-dashed border-black pt-6 print:block">
          <h4 className="mb-4 text-center text-sm font-black uppercase">
            TEM DÁN GIỎ ĐỒ NGHỀ HỌC VIÊN (CẮT DÁN LÊN TỪNG TÚI)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {participants
              .filter((p) => p.equipmentSelection)
              .map((p) => (
                <div key={p.id} className="break-inside-avoid rounded-lg border-2 border-black p-3 text-center">
                  <p className="m-0 text-[10px] font-bold uppercase">{workshop.name}</p>
                  <h5 className="m-0 my-1 text-base font-black uppercase">{p.lead.name}</h5>
                  <p className="m-0 text-xs tabular-nums">{p.lead.phone || 'Học viên Workshop'}</p>
                  <div className="mt-2 border-t border-black pt-1">
                    <span className="text-xs font-bold uppercase">📦 {p.equipmentSelection?.packageName}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Printable sign-off section */}
        <div className="hidden border-t border-black pt-8 print:block">
          <div className="grid grid-cols-2 text-center text-xs">
            <div>
              <p className="font-bold">ĐẠI DIỆN BỘ PHẬN KHO</p>
              <p className="mt-12">(Ký và bàn giao đủ số lượng)</p>
            </div>
            <div>
              <p className="font-bold">ĐẠI DIỆN BAN TỔ CHỨC</p>
              <p className="mt-12">(Ký và nhận bàn giao tại lớp)</p>
            </div>
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
}
