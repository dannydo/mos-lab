'use client';

import React from 'react';
import { Button, Divider, Space, message } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Copy, Printer, Users, UtensilsCrossed } from 'lucide-react';
import {
  ACADEMY_WORKSHOP_MENU_CATEGORIES,
  ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS,
  type AcademyWorkshopDetail,
  type AcademyWorkshopMenuCategory,
  type AcademyWorkshopParticipant,
} from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, MetricGrid, StatusTag } from '../../../../components/ui';

export interface AcademyWorkshopKitchenOrderModalProps {
  open: boolean;
  onClose: () => void;
  workshop: AcademyWorkshopDetail;
  participants: AcademyWorkshopParticipant[];
}

export default function AcademyWorkshopKitchenOrderModal({
  open,
  onClose,
  workshop,
  participants,
}: AcademyWorkshopKitchenOrderModalProps) {
  const summary = React.useMemo(() => {
    const total = participants.length;
    const selectedCount = participants.filter((p) => p.menuSelections.length > 0).length;
    const unselectedParticipants = participants.filter((p) => p.menuSelections.length === 0);

    const categoryBreakdowns: Record<
      AcademyWorkshopMenuCategory,
      Array<{ name: string; count: number; studentNames: string[] }>
    > = {
      JUICE: [],
      MAIN_COURSE: [],
      DESSERT: [],
    };

    ACADEMY_WORKSHOP_MENU_CATEGORIES.forEach((cat) => {
      const countsMap = new Map<string, { count: number; studentNames: string[] }>();

      // Seed with configured workshop menu items
      workshop.menuItems
        .filter((item) => item.category === cat)
        .forEach((item) => {
          countsMap.set(item.name, { count: 0, studentNames: [] });
        });

      // Count from actual participant selections
      participants.forEach((p) => {
        const selection = p.menuSelections.find((s) => s.category === cat);
        if (selection) {
          const current = countsMap.get(selection.itemName) || { count: 0, studentNames: [] };
          current.count += 1;
          current.studentNames.push(p.lead.name);
          countsMap.set(selection.itemName, current);
        }
      });

      categoryBreakdowns[cat] = Array.from(countsMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count);
    });

    return {
      total,
      selectedCount,
      unselectedCount: total - selectedCount,
      unselectedParticipants,
      categoryBreakdowns,
    };
  }, [participants, workshop.menuItems]);

  const copyOrderText = React.useCallback(() => {
    const lines: string[] = [
      `📋 ĐƠN ĐẶT BẾP & ẨM THỰC · ${workshop.name.toUpperCase()}`,
      `⏰ Thời gian phục vụ: ${dayjs(workshop.startsAt).format('HH:mm, DD/MM/YYYY')}`,
      `📍 Địa điểm: ${workshop.location}`,
      `👥 Tổng số suất ăn: ${summary.total} (Đã chốt chọn món: ${summary.selectedCount}/${summary.total})`,
      '',
    ];

    ACADEMY_WORKSHOP_MENU_CATEGORIES.forEach((cat) => {
      const items = summary.categoryBreakdowns[cat].filter((i) => i.count > 0);
      if (items.length) {
        lines.push(`🔸 ${ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[cat].toUpperCase()}:`);
        items.forEach((item) => {
          lines.push(`   - ${item.name}: ${item.count} suất`);
        });
        lines.push('');
      }
    });

    if (summary.unselectedCount > 0) {
      lines.push(`⚠️ Học viên chưa chọn món (${summary.unselectedCount}):`);
      summary.unselectedParticipants.forEach((p) => {
        lines.push(`   - ${p.lead.name} (${p.lead.phone || 'Chưa có SĐT'})`);
      });
      lines.push('');
    }

    lines.push('Trân trọng cảm ơn!');

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => message.success('Đã sao chép đơn đặt bếp vào bộ nhớ tạm!'))
      .catch(() => message.error('Không thể sao chép văn bản.'));
  }, [summary, workshop]);

  const copyUnselectedPhones = React.useCallback(() => {
    const phones = summary.unselectedParticipants
      .map((p) => p.lead.phone)
      .filter(Boolean)
      .join(', ');
    if (!phones) {
      message.info('Không có số điện thoại nào.');
      return;
    }
    navigator.clipboard
      .writeText(phones)
      .then(() => message.success(`Đã sao chép ${summary.unselectedCount} số điện thoại chưa chọn món.`))
      .catch(() => message.error('Không thể sao chép.'));
  }, [summary]);

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={UtensilsCrossed} className="text-emerald-500" />
          <span>Tổng hợp Bếp & Phiếu Đặt Món</span>
        </div>
      }
      width={860}
      footer={
        <Space className="w-full justify-between" wrap>
          <Button icon={<AppIcon icon={Copy} size="sm" />} onClick={copyOrderText}>
            Sao chép gửi Zalo
          </Button>
          <Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button type="primary" icon={<AppIcon icon={Printer} size="sm" />} onClick={handlePrint}>
              In phiếu đặt bếp (A4)
            </Button>
          </Space>
        </Space>
      }
    >
      <div className="space-y-6 pt-2 print:p-4">
        {/* Header printable information */}
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
                status={summary.unselectedCount === 0 ? 'success' : 'warning'}
                label={summary.unselectedCount === 0 ? 'Đã chốt 100% món' : `Còn ${summary.unselectedCount} chưa chọn`}
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
              title: 'Tổng số học viên',
              value: summary.total,
              format: 'number',
              icon: <AppIcon icon={Users} />,
            },
            {
              key: 'selected',
              title: 'Đã chọn thực đơn',
              value: summary.selectedCount,
              format: 'number',
              icon: <AppIcon icon={CheckCircle2} />,
            },
            {
              key: 'unselected',
              title: 'Chưa chọn món',
              value: summary.unselectedCount,
              format: 'number',
              icon: <AppIcon icon={AlertCircle} />,
            },
          ]}
        />

        {/* Categories Breakdown */}
        <div className="space-y-6">
          {ACADEMY_WORKSHOP_MENU_CATEGORIES.filter((cat) => summary.categoryBreakdowns[cat]?.length > 0).map((cat) => {
            const items = summary.categoryBreakdowns[cat];
            const catTotal = items.reduce((acc, curr) => acc + curr.count, 0);

            return (
              <div
                key={cat}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 print:border-black print:bg-white"
              >
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800 print:border-black">
                  <h4 className="m-0 text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-black">
                    {ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS[cat]}
                  </h4>
                  <span className="tabular-nums text-xs font-bold text-slate-500 print:text-black">
                    Tổng: {catTotal} suất
                  </span>
                </div>

                {items.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <div
                        key={item.name}
                        className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 print:border-black print:bg-white"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                              {item.name}
                            </span>
                            <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 print:border print:border-black print:bg-white print:text-black">
                              {item.count} suất
                            </span>
                          </div>
                          {item.studentNames.length > 0 ? (
                            <p className="mb-0 mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 print:text-black">
                              {item.studentNames.join(', ')}
                            </p>
                          ) : (
                            <p className="mb-0 mt-2 text-[11px] italic text-slate-400">Chưa có ai chọn</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-0 text-xs italic text-slate-400">Không có món ăn nào trong danh mục này.</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Unselected participants section */}
        {summary.unselectedCount > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 print:border-black print:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AppIcon icon={AlertCircle} className="text-amber-600 dark:text-amber-400" />
                <h4 className="m-0 text-sm font-bold text-amber-900 dark:text-amber-200 print:text-black">
                  Danh sách chưa chọn món ({summary.unselectedCount})
                </h4>
              </div>
              <Button size="small" onClick={copyUnselectedPhones} className="print:hidden">
                Sao chép SĐT nhắc nhở
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.unselectedParticipants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-amber-900 dark:bg-slate-900 dark:text-slate-200 print:border-black"
                >
                  {p.lead.name}
                  {p.lead.phone ? <span className="opacity-60 tabular-nums">({p.lead.phone})</span> : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Printable sign-off section */}
        <div className="hidden border-t border-black pt-8 print:block">
          <div className="grid grid-cols-2 text-center text-xs">
            <div>
              <p className="font-bold">ĐẠI DIỆN ACADEMY</p>
              <p className="mt-12">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold">ĐẠI DIỆN ĐỐI TÁC BẾP / NHÀ HÀNG</p>
              <p className="mt-12">(Ký và xác nhận số lượng)</p>
            </div>
          </div>
        </div>
      </div>
    </AdaptiveModal>
  );
}
