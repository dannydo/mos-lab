'use client';

import React from 'react';
import { Alert, Button, Card, Divider, Drawer, Form, Input, Radio, Result, Spin, Tag, Typography } from 'antd';
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Clock3,
  Gamepad2,
  GraduationCap,
  MessageCircle,
  PackageCheck,
  Sparkles,
  UsersRound,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import dayjs from 'dayjs';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import type {
  AcademyWorkshopPublicRegistrationInfo,
  AcademyWorkshopAgendaKind,
  AcademyWorkshopMenuCategory,
  RegisterAcademyWorkshopRequest,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../../lib/api-client';
import { AppIcon, IconText } from '../../../../../components/ui';
import { useTheme } from '../../../../../context/ThemeContext';
import GoogleWorkshopJoinButton from '../../components/GoogleWorkshopJoinButton';
import AcademyWorkshopRegistrationHero from '../../components/AcademyWorkshopRegistrationHero';
import styles from './AcademyWorkshopRegistration.module.css';

type RegistrationFormValues = Omit<RegisterAcademyWorkshopRequest, 'menuSelections'> & {
  menuSelections?: Partial<Record<AcademyWorkshopMenuCategory, number>>;
};

type WorkshopMenuSelectionSummary = {
  id: number;
  category: AcademyWorkshopMenuCategory;
  label: string;
  name: string;
  imageUrl: string | null;
};

function useBottomSheetDragToDismiss(onDismiss: () => void, isOpen: boolean) {
  const pointerStartY = React.useRef<number | null>(null);
  const dragOffsetRef = React.useRef(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const resetDrag = React.useCallback(() => {
    pointerStartY.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (!isOpen) resetDrag();
  }, [isOpen, resetDrag]);

  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStartY.current = event.clientY;
    dragOffsetRef.current = 0;
    setIsDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile() || pointerStartY.current == null) return;
    const offset = Math.max(0, event.clientY - pointerStartY.current);
    if (!offset) return;
    event.preventDefault();
    const nextOffset = Math.min(offset, 180);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const onPointerUp = () => {
    const shouldDismiss = dragOffsetRef.current >= 88;
    if (shouldDismiss) onDismiss();
    resetDrag();
  };

  return {
    contentStyle: {
      transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
      transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
    },
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: resetDrag,
    },
  };
}

function failureMessage(cause: unknown, fallback: string) {
  return (
    (cause as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
    (cause as Error)?.message ||
    fallback
  );
}

function formatFee(feeVnd: number) {
  return feeVnd > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(feeVnd))} đ` : 'Miễn phí';
}

function formatAgendaDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`;
}

function formatCompactAgendaDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}p` : `${hours}h`;
}

function agendaKindMeta(kind: AcademyWorkshopAgendaKind) {
  switch (kind) {
    case 'TALENT_TEST':
      return { label: 'Đánh giá năng khiếu', icon: Brain, tone: styles.agendaIconViolet };
    case 'GAME':
      return { label: 'Tương tác & trò chơi', icon: Gamepad2, tone: styles.agendaIconBlue };
    case 'BREAK':
      return { label: 'Khoảng nghỉ', icon: Coffee, tone: styles.agendaIconWarm };
    case 'SALES':
      return {
        label: 'Định hướng khóa học',
        icon: GraduationCap,
        tone: styles.agendaIconGreen,
      };
    case 'OTHER':
      return { label: 'Hoạt động workshop', icon: Clock3, tone: styles.agendaIconNeutral };
    default:
      return { label: 'Nội dung học tập', icon: BookOpenCheck, tone: styles.agendaIconNeutral };
  }
}

function agendaSelectionSurface(title: string, equipmentRequired: boolean, menuRequired: boolean) {
  const normalizedTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

  if (equipmentRequired && /\b(thuc hanh|practice)\b/.test(normalizedTitle)) return 'equipment';
  if (menuRequired && /\b(nha hang|bua trua|an trua|lunch|dinner|viet thai)\b/.test(normalizedTitle)) return 'menu';
  return null;
}

function WorkshopExperienceTimeline({
  startsAt,
  agenda,
  equipment,
  menu,
  selectedEquipmentPackage,
  selectedMenuItems,
  onOpenSelectionSheet,
}: {
  startsAt: string;
  agenda: AcademyWorkshopPublicRegistrationInfo['workshop']['agenda'];
  equipment: AcademyWorkshopPublicRegistrationInfo['workshop']['equipment'];
  menu: AcademyWorkshopPublicRegistrationInfo['workshop']['menu'];
  selectedEquipmentPackage:
    AcademyWorkshopPublicRegistrationInfo['workshop']['equipment']['packages'][number] | undefined;
  selectedMenuItems: WorkshopMenuSelectionSummary[];
  onOpenSelectionSheet: (selection: 'equipment' | 'menu') => void;
}) {
  const timeline = React.useMemo(() => {
    let cursor = dayjs(startsAt);
    return [...agenda]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
      .map((item) => {
        const beginsAt = cursor;
        cursor = cursor.add(item.plannedDurationSeconds, 'second');
        return { item, beginsAt: beginsAt.format('HH:mm'), endsAt: cursor.format('HH:mm') };
      });
  }, [agenda, startsAt]);
  const totalDuration = React.useMemo(
    () => agenda.reduce((total, item) => total + Math.max(0, item.plannedDurationSeconds), 0),
    [agenda]
  );

  return (
    <section aria-labelledby="workshop-experience-title" className={`w-full min-w-0 ${styles.timeline}`}>
      <div className="px-4 pb-7 pt-6 sm:p-8">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white sm:h-11 sm:w-11 ${styles.journeyIcon}`}
            >
              <AppIcon icon={Sparkles} size="md" />
            </span>
            <div className="min-w-0">
              <h2
                id="workshop-experience-title"
                className={`m-0 text-[22px] font-semibold tracking-[-0.025em] sm:text-[28px] ${styles.timelineTitle}`}
              >
                Bạn sẽ trải nghiệm gì?
              </h2>
              <p
                className={`mb-0 mt-1 max-w-md text-[13px] leading-5 sm:mt-1.5 sm:text-sm sm:leading-6 ${styles.mutedText}`}
              >
                Một hành trình được thiết kế theo nhịp học, thực hành và kết nối cùng Academy.
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-5 flex items-center justify-between text-xs font-medium ${styles.mutedText}`}>
          <span>{timeline.length} nội dung trong ngày</span>
          <span className="hidden sm:inline">Lịch trình workshop</span>
        </div>

        <div
          className={`mt-3 grid grid-cols-3 overflow-hidden rounded-[22px] sm:rounded-[24px] ${styles.scheduleSummary}`}
        >
          <div className={`min-w-0 px-3 py-3 sm:px-4 sm:py-3.5 ${styles.scheduleSummaryCell}`}>
            <p className={`m-0 text-[10px] font-medium ${styles.mutedText}`}>Bắt đầu</p>
            <p className={`mb-0 mt-1 text-[15px] font-semibold tabular-nums sm:text-base ${styles.timelineTitle}`}>
              {dayjs(startsAt).format('HH:mm')}
            </p>
          </div>
          <div className={`min-w-0 px-3 py-3 sm:px-4 sm:py-3.5 ${styles.scheduleSummaryCell}`}>
            <p className={`m-0 text-[10px] font-medium ${styles.mutedText}`}>Thời lượng</p>
            <p
              className={`mb-0 mt-1 whitespace-nowrap text-[13px] font-semibold tabular-nums sm:text-base ${styles.timelineTitle}`}
            >
              {formatCompactAgendaDuration(totalDuration)}
            </p>
          </div>
          <div className="min-w-0 px-3 py-3 sm:px-4 sm:py-3.5">
            <p className={`m-0 text-[10px] font-medium ${styles.mutedText}`}>Kết thúc</p>
            <p className={`mb-0 mt-1 text-[15px] font-semibold tabular-nums sm:text-base ${styles.timelineTitle}`}>
              {timeline.at(-1)?.endsAt || dayjs(startsAt).format('HH:mm')}
            </p>
          </div>
        </div>

        <ol className="relative mt-4 list-none space-y-2.5 p-0 sm:mt-5 sm:space-y-3">
          {timeline.map(({ item, beginsAt, endsAt }) => {
            const meta = agendaKindMeta(item.kind);
            const KindIcon = meta.icon;
            const selectionSurface = agendaSelectionSurface(item.title, equipment.required, menu.required);
            const hasCompleteMenuSelection =
              menu.categories.length > 0 && selectedMenuItems.length === menu.categories.length;
            return (
              <li key={item.id}>
                <article
                  className={`min-w-0 rounded-[20px] p-3 sm:rounded-[22px] sm:p-3.5 ${styles.agendaCard} ${item.kind === 'BREAK' ? styles.agendaCardBreak : ''}`}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ring-1 ${meta.tone}`}
                    >
                      <AppIcon icon={KindIcon} size="sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span
                          className={`min-w-0 truncate text-[11px] font-medium tabular-nums sm:text-xs ${styles.agendaMeta}`}
                        >
                          {beginsAt} — {endsAt}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium leading-none tabular-nums sm:px-2.5 sm:text-xs ${styles.agendaDuration}`}
                        >
                          {formatAgendaDuration(item.plannedDurationSeconds)}
                        </span>
                      </div>
                      <h3
                        className={`mb-0 mt-1 text-[15px] font-semibold leading-5 sm:text-[17px] sm:leading-6 ${styles.agendaTitle}`}
                      >
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  {item.description ? (
                    <p
                      className={`mb-0 mt-1.5 text-[13px] leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${styles.agendaDescription}`}
                    >
                      {item.description}
                    </p>
                  ) : null}
                  <span
                    className={`mt-3 hidden items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] sm:inline-flex ${styles.agendaKind}`}
                  >
                    {meta.label}
                  </span>
                  {selectionSurface === 'equipment' ? (
                    selectedEquipmentPackage ? (
                      <div className={`mt-3 overflow-hidden rounded-2xl ${styles.selectionSummary}`}>
                        <div className="flex items-start gap-3 p-3">
                          {selectedEquipmentPackage.images[0] ? (
                            <img
                              src={selectedEquipmentPackage.images[0].imageUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-emerald-100"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                              <AppIcon icon={PackageCheck} size="sm" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="m-0 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                Bộ dụng cụ của bạn
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white">
                                <Check size={12} strokeWidth={3} aria-hidden="true" /> Đã chọn
                              </span>
                            </div>
                            <p className={`mb-0 mt-1 truncate text-sm font-semibold ${styles.agendaTitle}`}>
                              {selectedEquipmentPackage.name}
                            </p>
                            <p className={`mb-0 mt-0.5 text-xs font-medium tabular-nums ${styles.agendaDescription}`}>
                              +{formatFee(selectedEquipmentPackage.priceVnd)}
                            </p>
                          </div>
                        </div>
                        {selectedEquipmentPackage.includedItems.length ? (
                          <div className={`flex flex-wrap gap-1.5 px-3 py-2.5 ${styles.selectionSummaryItems}`}>
                            {selectedEquipmentPackage.includedItems.slice(0, 3).map((includedItem) => (
                              <span
                                key={includedItem}
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${styles.selectionChip}`}
                              >
                                {includedItem}
                              </span>
                            ))}
                            {selectedEquipmentPackage.includedItems.length > 3 ? (
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${styles.selectionChip}`}
                              >
                                +{selectedEquipmentPackage.includedItems.length - 3}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium transition ${styles.selectionSummaryAction}`}
                          onClick={() => onOpenSelectionSheet('equipment')}
                        >
                          Thay đổi bộ dụng cụ <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        className={`group mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left transition ${styles.selectionAction}`}
                        onClick={() => onOpenSelectionSheet('equipment')}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${styles.selectionActionIcon}`}
                        >
                          <AppIcon icon={Wrench} size="sm" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold ${styles.selectionActionTitle}`}>
                            Chọn bộ dụng cụ
                          </span>
                          <span className={`mt-0.5 block text-xs leading-5 ${styles.selectionActionDescription}`}>
                            Sẵn sàng cho phần thực hành.
                          </span>
                        </span>
                        <AppIcon icon={ArrowRight} size="sm" className={`shrink-0 ${styles.selectionActionArrow}`} />
                      </button>
                    )
                  ) : null}
                  {selectionSurface === 'menu' ? (
                    hasCompleteMenuSelection ? (
                      <div className={`mt-3 overflow-hidden rounded-2xl ${styles.selectionSummary}`}>
                        <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                              <AppIcon icon={UtensilsCrossed} size="sm" />
                            </span>
                            <div className="min-w-0">
                              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Bữa trưa của bạn
                              </p>
                              <p className="mb-0 mt-0.5 text-xs font-medium text-slate-600">
                                Đã gửi nhà hàng Việt Thái
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
                            <Check size={12} strokeWidth={3} aria-hidden="true" /> Đủ món
                          </span>
                        </div>
                        <div className="grid gap-1.5 px-3 pb-3">
                          {selectedMenuItems.map((selection) => (
                            <div
                              key={selection.category}
                              className="flex min-w-0 items-center gap-2 rounded-lg bg-white/80 p-1.5 ring-1 ring-amber-100"
                            >
                              {selection.imageUrl ? (
                                <img
                                  src={selection.imageUrl}
                                  alt=""
                                  className="h-8 w-8 shrink-0 rounded-md object-cover"
                                />
                              ) : null}
                              <div className="min-w-0">
                                <p className="m-0 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                  {selection.label}
                                </p>
                                <p className="m-0 truncate text-xs font-extrabold text-slate-900">{selection.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between border-t border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-white"
                          onClick={() => onOpenSelectionSheet('menu')}
                        >
                          Thay đổi phần ăn <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        className={`group mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl p-3 text-left transition ${styles.selectionAction}`}
                        onClick={() => onOpenSelectionSheet('menu')}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${styles.selectionActionIcon}`}
                        >
                          <AppIcon icon={UtensilsCrossed} size="sm" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold ${styles.selectionActionTitle}`}>
                            {selectedMenuItems.length
                              ? `Hoàn tất phần ăn (${selectedMenuItems.length}/${menu.categories.length})`
                              : 'Chọn phần ăn'}
                          </span>
                          <span
                            className={`mt-0.5 block truncate text-xs leading-5 ${styles.selectionActionDescription}`}
                          >
                            {selectedMenuItems.length
                              ? selectedMenuItems.map((selection) => selection.name).join(' · ')
                              : 'Chọn món để nhà hàng chuẩn bị riêng.'}
                          </span>
                        </span>
                        <AppIcon icon={ArrowRight} size="sm" className={`shrink-0 ${styles.selectionActionArrow}`} />
                      </button>
                    )
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function googleProfile(credential: string): { name: string; email: string } {
  try {
    const segment = credential.split('.')[1];
    if (!segment) return { name: '', email: '' };
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { name?: unknown; email?: unknown };
    return {
      name: String(payload.name || '').trim(),
      email: String(payload.email || '')
        .trim()
        .toLowerCase(),
    };
  } catch {
    return { name: '', email: '' };
  }
}

function zaloProfile(ticket: string): { name: string } {
  try {
    const segment = ticket.split('.')[1];
    if (!segment) return { name: '' };
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { name?: unknown };
    return { name: String(payload.name || '').trim() };
  } catch {
    return { name: '' };
  }
}

function phaseCopy(info: AcademyWorkshopPublicRegistrationInfo) {
  switch (info.phase) {
    case 'CHECKIN':
      return {
        type: 'success' as const,
        title: 'Workshop đã mở check-in',
        description: 'Nếu bạn đã đăng ký, hãy vào lobby để xác minh và bắt đầu trải nghiệm workshop.',
        action: 'Vào check-in',
      };
    case 'LIVE':
      return {
        type: 'info' as const,
        title: 'Workshop đang diễn ra',
        description: 'Bạn có thể vào lobby để xác minh danh tính và theo dõi nội dung đang diễn ra.',
        action: 'Vào workshop',
      };
    case 'COMPLETED':
      return {
        type: 'success' as const,
        title: 'Workshop đã hoàn thành',
        description: 'Cảm ơn bạn đã quan tâm. Academy sẽ liên hệ về các buổi học tiếp theo.',
        action: null,
      };
    default:
      return {
        type: 'warning' as const,
        title: 'Đăng ký hiện đang đóng',
        description: 'Vui lòng liên hệ Academy nếu bạn cần được hỗ trợ thêm.',
        action: null,
      };
  }
}

function EquipmentImageCarousel({
  images,
  label,
}: {
  images: AcademyWorkshopPublicRegistrationInfo['workshop']['equipment']['packages'][number]['images'];
  label: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);
  const count = images.length;
  const safeIndex = count ? Math.min(activeIndex, count - 1) : 0;
  const image = images[safeIndex];

  React.useEffect(() => {
    if (activeIndex >= count) setActiveIndex(0);
  }, [activeIndex, count]);

  if (!image) return null;
  const goTo = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((index + count) % count);
  };

  return (
    <div
      className="relative mb-3 overflow-hidden rounded-xl bg-slate-100"
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        const endX = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (startX == null || endX == null || Math.abs(endX - startX) < 36 || count < 2) return;
        setActiveIndex((current) => (endX < startX ? (current + 1) % count : (current - 1 + count) % count));
      }}
    >
      <img src={image.imageUrl} alt={image.altText || label} className="h-36 w-full object-cover sm:h-40" />
      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-slate-950"
            onClick={(event) => goTo(event, safeIndex - 1)}
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Ảnh tiếp theo"
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-slate-950"
            onClick={(event) => goTo(event, safeIndex + 1)}
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {images.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === safeIndex}
                className={`h-1.5 rounded-full transition-all ${index === safeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'}`}
                onClick={(event) => goTo(event, index)}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs font-bold tabular-nums text-white">
            {safeIndex + 1}/{count}
          </span>
        </>
      ) : null}
    </div>
  );
}

export default function AcademyWorkshopRegistrationPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(String(params.code || '')).trim();
  const { themeMode, toggleTheme } = useTheme();
  const [form] = Form.useForm<RegistrationFormValues>();
  const selectedMenuChoices = Form.useWatch('menuSelections', form);
  const selectedEquipmentPackageId = Form.useWatch('equipmentPackageId', form);
  const [info, setInfo] = React.useState<AcademyWorkshopPublicRegistrationInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<string | null>(null);
  const [googleCredential, setGoogleCredential] = React.useState<string | null>(null);
  const [zaloTicket, setZaloTicket] = React.useState<string | null>(null);
  const [activeSelectionSheet, setActiveSelectionSheet] = React.useState<'equipment' | 'menu' | null>(null);
  const closeSelectionSheet = React.useCallback(() => setActiveSelectionSheet(null), []);
  const selectionSheetDrag = useBottomSheetDragToDismiss(closeSelectionSheet, activeSelectionSheet !== null);
  const receiptStorageKey = React.useMemo(
    () => (code ? `academy-workshop-registration-receipt:${code}` : null),
    [code]
  );
  const rememberReceipt = React.useCallback(
    (message: string) => {
      setReceipt(message);
      if (receiptStorageKey) window.sessionStorage.setItem(receiptStorageKey, message);
    },
    [receiptStorageKey]
  );

  const load = React.useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      setInfo(await apiClient.academyWorkshopsPublic.getRegistrationInfo(code));
    } catch (cause) {
      setError(failureMessage(cause, 'Không thể mở link đăng ký workshop.'));
    } finally {
      setLoading(false);
    }
  }, [code]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!receiptStorageKey) {
      setReceipt(null);
      return;
    }
    setReceipt(window.sessionStorage.getItem(receiptStorageKey));
  }, [receiptStorageKey]);

  React.useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const ticket = hash.get('zalo_ticket');
    const zaloError = hash.get('zalo_error');
    if (!ticket && !zaloError) return;

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    if (ticket) {
      const profile = zaloProfile(ticket);
      setZaloTicket(ticket);
      setGoogleCredential(null);
      setError(null);
      if (profile.name) form.setFieldValue('name', profile.name);
      void apiClient.academyWorkshopsPublic
        .findRegistrationWithZalo(code, { ticket })
        .then((existingRegistration) => {
          if (existingRegistration) rememberReceipt(existingRegistration.message);
        })
        .catch(() => undefined);
      return;
    }
    setError('Bạn chưa hoàn tất đăng nhập Zalo. Vui lòng thử lại.');
  }, [code, form, rememberReceipt]);

  const submit = React.useCallback(async () => {
    try {
      const values = await form.validateFields();
      const menuSelections = Object.entries(values.menuSelections || {}).map(([category, menuItemId]) => ({
        category: category as AcademyWorkshopMenuCategory,
        menuItemId: Number(menuItemId),
      }));
      const registration = { ...values, menuSelections };
      setSubmitting(true);
      const result = googleCredential
        ? await apiClient.academyWorkshopsPublic.registerWithGoogle(code, {
            credential: googleCredential,
            phone: registration.phone,
            goal: registration.goal,
            referrer: registration.referrer,
            menuSelections: registration.menuSelections,
            equipmentPackageId: registration.equipmentPackageId,
          } satisfies RegisterAcademyWorkshopWithGoogleRequest)
        : zaloTicket
          ? await apiClient.academyWorkshopsPublic.registerWithZalo(code, {
              ticket: zaloTicket,
              phone: registration.phone,
              email: registration.email,
              goal: registration.goal,
              referrer: registration.referrer,
              menuSelections: registration.menuSelections,
              equipmentPackageId: registration.equipmentPackageId,
            } satisfies RegisterAcademyWorkshopWithZaloRequest)
          : await apiClient.academyWorkshopsPublic.register(code, registration);
      rememberReceipt(result.message);
      await load();
    } catch (cause) {
      const errorFields = (cause as { errorFields?: Array<{ name?: Array<string | number> }> })?.errorFields;
      if (errorFields) {
        const firstInvalidField = errorFields[0]?.name?.[0];
        if (firstInvalidField === 'equipmentPackageId') setActiveSelectionSheet('equipment');
        if (firstInvalidField === 'menuSelections') setActiveSelectionSheet('menu');
        return;
      }
      setError(failureMessage(cause, 'Không thể gửi đăng ký. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  }, [code, form, googleCredential, load, rememberReceipt, zaloTicket]);

  const startAnotherRegistration = React.useCallback(() => {
    if (receiptStorageKey) window.sessionStorage.removeItem(receiptStorageKey);
    setReceipt(null);
    setGoogleCredential(null);
    setZaloTicket(null);
    setActiveSelectionSheet(null);
    setError(null);
    form.resetFields();
  }, [form, receiptStorageKey]);

  const receiveGoogleCredential = React.useCallback(
    async (credential: string) => {
      const profile = googleProfile(credential);
      setGoogleCredential(credential);
      setZaloTicket(null);
      setError(null);
      form.setFieldsValue({
        name: profile.name || form.getFieldValue('name'),
        email: profile.email || form.getFieldValue('email'),
      });
      try {
        const existingRegistration = await apiClient.academyWorkshopsPublic.findRegistrationWithGoogle(code, {
          credential,
        });
        if (existingRegistration) rememberReceipt(existingRegistration.message);
      } catch {
        // A status lookup must not block a learner from completing a new registration.
      }
    },
    [code, form, rememberReceipt]
  );

  if (loading) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${styles.stateScreen}`}>
        <Spin size="large" />
        <span className="ml-3">Đang mở workshop…</span>
      </main>
    );
  }

  if (error && !info) {
    return (
      <main className={`flex min-h-screen items-center justify-center p-6 ${styles.stateScreen}`}>
        <Result
          status="warning"
          title="Không thể mở workshop"
          subTitle={error}
          extra={<Button onClick={() => void load()}>Thử lại</Button>}
        />
      </main>
    );
  }

  if (!info) return null;
  const { workshop } = info;
  const nonRegistrationPhase = info.phase !== 'REGISTRATION';
  const status = nonRegistrationPhase ? phaseCopy(info) : null;
  const menuIncomplete = workshop.menu.required && workshop.menu.categories.some((category) => !category.items.length);
  const selectedMenuCount = Object.values(selectedMenuChoices || {}).filter(Boolean).length;
  const selectedEquipmentPackage = workshop.equipment.packages.find(
    (item) => item.id === Number(selectedEquipmentPackageId)
  );
  const selectedMenuItems = workshop.menu.categories.flatMap((category) => {
    const selectedItem = category.items.find((item) => item.id === Number(selectedMenuChoices?.[category.category]));
    return selectedItem
      ? [
          {
            id: selectedItem.id,
            category: category.category,
            label: category.label,
            name: selectedItem.name,
            imageUrl: selectedItem.imageUrl,
          },
        ]
      : [];
  });
  const openSelectionSheet = (selection: 'equipment' | 'menu') => setActiveSelectionSheet(selection);
  return (
    <main className={`min-h-[100svh] p-3 sm:p-6 lg:p-8 ${styles.shell}`}>
      <div className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-6">
        <section className={`min-w-0 overflow-hidden rounded-[28px] sm:rounded-[32px] ${styles.primarySurface}`}>
          <AcademyWorkshopRegistrationHero
            workshop={workshop}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            registrationHref="#workshop-registration"
          />

          <WorkshopExperienceTimeline
            startsAt={workshop.startsAt}
            agenda={workshop.agenda}
            equipment={workshop.equipment}
            menu={workshop.menu}
            selectedEquipmentPackage={selectedEquipmentPackage}
            selectedMenuItems={selectedMenuItems}
            onOpenSelectionSheet={openSelectionSheet}
          />
        </section>

        <aside id="workshop-registration" className="self-start scroll-mt-3 lg:sticky lg:top-8 lg:scroll-mt-8">
          <Card
            className={`overflow-hidden !rounded-[28px] !border sm:!rounded-[32px] ${styles.asideCard}`}
            bodyStyle={{ padding: 0 }}
          >
            <div className={`border-b px-5 py-5 sm:px-6 ${styles.asideHeader}`}>
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${styles.journeyIcon}`}
                >
                  <AppIcon icon={UsersRound} size="sm" />
                </span>
                <div>
                  <p className={`m-0 text-[11px] font-medium uppercase tracking-[0.14em] ${styles.mutedText}`}>
                    Tham dự workshop
                  </p>
                  <h2 className={`m-0 mt-0.5 text-lg font-semibold tracking-[-0.02em] ${styles.timelineTitle}`}>
                    Đăng ký giữ chỗ
                  </h2>
                </div>
              </div>
              <p className={`mb-0 mt-4 text-sm leading-6 ${styles.mutedText}`}>
                Xác minh nhanh, Academy sẽ liên hệ để xác nhận trước buổi học.
              </p>
            </div>
            <div className={`p-5 sm:p-6 ${styles.asideBody}`}>
              {error ? (
                <Alert
                  type="error"
                  showIcon
                  closable
                  message="Chưa thể xử lý"
                  description={error}
                  onClose={() => setError(null)}
                  className="mb-4"
                />
              ) : null}
              {receipt ? (
                <Result
                  status="success"
                  icon={<CheckCircle2 className="mx-auto text-emerald-500" size={48} aria-hidden="true" />}
                  title="Đăng ký đã hoàn tất"
                  subTitle={receipt}
                  extra={
                    <Button type="link" onClick={startAnotherRegistration}>
                      Đăng ký người khác
                    </Button>
                  }
                />
              ) : nonRegistrationPhase && status ? (
                <>
                  <Alert type={status.type} showIcon message={status.title} description={status.description} />
                  {status.action && workshop.joinUrl ? (
                    <Button type="primary" size="large" block className="mt-5" href={workshop.joinUrl}>
                      {status.action}
                    </Button>
                  ) : null}
                </>
              ) : info.canRegister ? (
                <>
                  <Typography.Paragraph className={`!mb-5 !text-sm !leading-6 ${styles.formIntro}`}>
                    Dùng Google hoặc Zalo để điền nhanh thông tin; số điện thoại giúp Academy xác nhận chỗ của bạn.
                  </Typography.Paragraph>
                  {googleCredential ? (
                    <Alert
                      className="mb-4"
                      type="success"
                      showIcon
                      message="Google đã xác minh"
                      description="Tên và email lấy từ Google. Hoàn tất số điện thoại để gửi đăng ký."
                      action={
                        <Button type="link" size="small" onClick={() => setGoogleCredential(null)}>
                          Dùng form
                        </Button>
                      }
                    />
                  ) : zaloTicket ? (
                    <Alert
                      className="mb-4"
                      type="success"
                      showIcon
                      message="Zalo đã xác minh"
                      description="Tên lấy từ Zalo. Hoàn tất số điện thoại để Academy liên hệ và xác nhận chỗ tham dự."
                      action={
                        <Button type="link" size="small" onClick={() => setZaloTicket(null)}>
                          Dùng form
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <div className={`rounded-[20px] border p-3.5 text-center ${styles.authOption}`}>
                        <div className={`text-sm font-semibold ${styles.authOptionTitle}`}>Tiếp tục với Google</div>
                        <p className={`mt-1 text-xs leading-5 ${styles.mutedText}`}>
                          Tên và email của bạn được xác minh trực tiếp bởi Google.
                        </p>
                        <div className="mx-auto mt-3 w-full max-w-[320px]">
                          <GoogleWorkshopJoinButton disabled={submitting} onCredential={receiveGoogleCredential} />
                        </div>
                      </div>
                      <Divider plain className="!my-4 !text-xs !text-slate-400">
                        hoặc
                      </Divider>
                      <div className={`rounded-[20px] border p-3.5 text-center ${styles.authOption}`}>
                        <div className={`text-sm font-semibold ${styles.authOptionTitle}`}>Tiếp tục với Zalo</div>
                        <p className={`mt-1 text-xs leading-5 ${styles.mutedText}`}>
                          Xác minh tài khoản Zalo, sau đó quay lại để hoàn tất số điện thoại.
                        </p>
                        <Button
                          className={
                            info.zaloAuthAvailable
                              ? 'mt-3 !h-11 !rounded-full !border-0 !bg-[#0071e3] !font-medium hover:!bg-[#0077ed]'
                              : 'mt-3 !h-11 !rounded-full !border-slate-300 !bg-slate-50 !text-slate-600 !opacity-100'
                          }
                          size="large"
                          block
                          icon={<MessageCircle size={18} aria-hidden="true" />}
                          disabled={!info.zaloAuthAvailable || submitting}
                          href={
                            info.zaloAuthAvailable ? apiClient.academyWorkshopsPublic.zaloAuthorizeUrl(code) : undefined
                          }
                        >
                          Tiếp tục với Zalo
                        </Button>
                        {!info.zaloAuthAvailable ? (
                          <p className={`mt-2 text-xs ${styles.mutedText}`}>
                            Zalo đang chờ API Academy được cấu hình bảo mật.
                          </p>
                        ) : null}
                      </div>
                      <Divider plain className="!my-5 !text-xs !text-slate-400">
                        hoặc điền trực tiếp
                      </Divider>
                    </>
                  )}
                  <Form form={form} layout="vertical" requiredMark="optional">
                    <Form.Item
                      label="Họ và tên"
                      name="name"
                      rules={
                        googleCredential || zaloTicket ? [] : [{ required: true, message: 'Vui lòng nhập họ và tên.' }]
                      }
                    >
                      <Input
                        size="large"
                        autoComplete="name"
                        placeholder="Tên của bạn"
                        disabled={Boolean(googleCredential || zaloTicket)}
                      />
                    </Form.Item>
                    <Form.Item
                      label="Số điện thoại"
                      name="phone"
                      rules={[
                        { required: true, message: 'Vui lòng nhập số điện thoại.' },
                        { pattern: /^\+?[0-9\s.()-]{8,20}$/, message: 'Số điện thoại không hợp lệ.' },
                      ]}
                    >
                      <Input size="large" inputMode="tel" autoComplete="tel" placeholder="Ví dụ: 0901 234 567" />
                    </Form.Item>
                    <Form.Item
                      label={googleCredential ? 'Email Google' : 'Email'}
                      name="email"
                      rules={[{ type: 'email', message: 'Email chưa đúng định dạng.' }]}
                    >
                      <Input
                        size="large"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        disabled={Boolean(googleCredential)}
                      />
                    </Form.Item>
                    <Form.Item label="Bạn mong chờ điều gì?" name="goal">
                      <Input.TextArea
                        rows={3}
                        maxLength={2000}
                        placeholder="Mục tiêu học, vấn đề bạn muốn được giải đáp…"
                      />
                    </Form.Item>
                    <Form.Item label="Ai giới thiệu bạn?" name="referrer">
                      <Input placeholder="Tên hoặc số điện thoại người giới thiệu" />
                    </Form.Item>
                    {workshop.equipment.required ? (
                      <Drawer
                        open={activeSelectionSheet === 'equipment'}
                        placement="bottom"
                        closable={false}
                        destroyOnClose={false}
                        rootClassName={styles.selectionDrawer}
                        height="min(860px, calc(100dvh - 16px))"
                        onClose={closeSelectionSheet}
                        styles={{
                          body: { display: 'flex', minHeight: 0, overflow: 'hidden', padding: 0 },
                          content: selectionSheetDrag.contentStyle,
                        }}
                      >
                        <div className={`flex min-h-0 flex-1 flex-col ${styles.selectionSheet}`}>
                          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pb-5 sm:px-5">
                            <div className="mx-auto max-w-2xl">
                              <div
                                aria-label="Kéo xuống để đóng"
                                className={`sticky top-0 z-10 -mx-3 flex h-11 touch-none items-center justify-center px-3 backdrop-blur sm:-mx-5 sm:h-9 sm:px-5 ${styles.selectionSheetGrip}`}
                                {...selectionSheetDrag.dragHandleProps}
                              >
                                <span className="h-1.5 w-11 rounded-full bg-slate-300" aria-hidden="true" />
                              </div>
                              <section
                                className={`mb-5 overflow-hidden rounded-3xl border ${styles.selectionSheetCard}`}
                              >
                                <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-4 text-white sm:px-5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20">
                                        <AppIcon icon={Wrench} size="sm" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-amber-200">
                                          Phần thực hành có hướng dẫn
                                        </p>
                                        <h3 className="mb-0 mt-1 text-lg font-black leading-tight">
                                          Chọn bộ dụng cụ của bạn
                                        </h3>
                                      </div>
                                    </div>
                                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold">
                                      1 lựa chọn
                                    </span>
                                  </div>
                                </div>
                                <div className={`space-y-4 p-4 sm:p-5 ${styles.selectionSheetContent}`}>
                                  <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
                                      <AppIcon icon={PackageCheck} size="sm" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-amber-800">
                                        Bộ dụng cụ cá nhân
                                      </p>
                                      <p className="mb-0 mt-1 text-sm leading-5 text-slate-700">
                                        Chọn một bộ để Academy chuẩn bị sẵn cho phần thực hành. Phụ thu được hiển thị rõ
                                        trước khi gửi đăng ký.
                                      </p>
                                    </div>
                                  </div>
                                  <Form.Item
                                    className="!mb-0"
                                    name="equipmentPackageId"
                                    rules={[{ required: true, message: 'Vui lòng chọn một bộ dụng cụ thực hành.' }]}
                                  >
                                    <Radio.Group className="grid w-full grid-cols-1 gap-3" disabled={submitting}>
                                      {workshop.equipment.packages.map((item) => (
                                        <Radio
                                          key={item.id}
                                          value={item.id}
                                          className="!relative !ml-0 !flex !w-full !rounded-2xl border border-slate-200 bg-white !p-0 text-left shadow-sm transition hover:!border-amber-400 hover:bg-amber-50 [&>.ant-radio]:!absolute [&>.ant-radio]:!opacity-0 [&>span:last-child]:!min-w-0 [&>span:last-child]:!flex-1 [&>span:last-child]:!p-0"
                                        >
                                          <span className="relative flex min-h-[104px] min-w-0 flex-1 flex-col justify-center px-4 py-3">
                                            {Number(selectedEquipmentPackageId) === item.id ? (
                                              <span
                                                aria-hidden="true"
                                                className="absolute left-6 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-amber-500 bg-amber-400 text-slate-950 shadow-sm"
                                              >
                                                <Check size={16} strokeWidth={3} />
                                              </span>
                                            ) : null}
                                            <EquipmentImageCarousel images={item.images} label={item.name} />
                                            <span className="flex items-start justify-between gap-3">
                                              <span className="min-w-0 text-base font-extrabold leading-5 text-slate-900">
                                                {item.name}
                                              </span>
                                              <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 text-sm font-black tabular-nums text-amber-900">
                                                +{formatFee(item.priceVnd)}
                                              </span>
                                            </span>
                                            {item.description ? (
                                              <span className="mt-1.5 block text-sm leading-5 text-slate-600">
                                                {item.description}
                                              </span>
                                            ) : null}
                                            <span className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs font-medium leading-5 text-slate-600">
                                              {item.includedItems.map((includedItem) => (
                                                <span key={includedItem} className="inline-flex items-center gap-1.5">
                                                  <span
                                                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                                                    aria-hidden="true"
                                                  />
                                                  {includedItem}
                                                </span>
                                              ))}
                                            </span>
                                          </span>
                                        </Radio>
                                      ))}
                                    </Radio.Group>
                                  </Form.Item>
                                </div>
                              </section>
                            </div>
                          </div>
                          <div className={`shrink-0 border-t px-3 py-3 sm:px-5 ${styles.selectionSheetFooter}`}>
                            <div className="mx-auto flex max-w-2xl items-center gap-3">
                              {selectedEquipmentPackage ? (
                                <>
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                                    <Check size={18} strokeWidth={3} aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-bold text-emerald-700">Bộ dụng cụ đã chọn</p>
                                    <div className="flex min-w-0 items-baseline gap-1.5">
                                      <p className="m-0 min-w-0 flex-1 truncate text-sm font-extrabold text-slate-950">
                                        {selectedEquipmentPackage.name}
                                      </p>
                                      <span className="shrink-0 text-sm font-black tabular-nums text-amber-800">
                                        +{formatFee(selectedEquipmentPackage.priceVnd)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    type="primary"
                                    size="large"
                                    className="!h-11 !rounded-xl !px-4 !font-bold"
                                    onClick={closeSelectionSheet}
                                  >
                                    Xác nhận
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-black text-amber-800 ring-1 ring-amber-200">
                                    1
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 text-sm font-extrabold text-slate-950">Chọn một bộ để tiếp tục</p>
                                    <p className="m-0 text-xs leading-5 text-slate-500">
                                      Chạm vào bộ phù hợp với phần thực hành của bạn.
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Drawer>
                    ) : null}
                    {workshop.menu.required ? (
                      <Drawer
                        open={activeSelectionSheet === 'menu'}
                        placement="bottom"
                        closable={false}
                        destroyOnClose={false}
                        rootClassName={styles.selectionDrawer}
                        height="min(860px, calc(100dvh - 16px))"
                        onClose={closeSelectionSheet}
                        styles={{
                          body: { display: 'flex', minHeight: 0, overflow: 'hidden', padding: 0 },
                          content: selectionSheetDrag.contentStyle,
                        }}
                      >
                        <div className={`flex min-h-0 flex-1 flex-col ${styles.selectionSheet}`}>
                          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pb-5 sm:px-5">
                            <div className="mx-auto max-w-2xl">
                              <div
                                aria-label="Kéo xuống để đóng"
                                className={`sticky top-0 z-10 -mx-3 flex h-11 touch-none items-center justify-center px-3 backdrop-blur sm:-mx-5 sm:h-9 sm:px-5 ${styles.selectionSheetGrip}`}
                                {...selectionSheetDrag.dragHandleProps}
                              >
                                <span className="h-1.5 w-11 rounded-full bg-slate-300" aria-hidden="true" />
                              </div>
                              <section
                                className={`mb-5 overflow-hidden rounded-3xl border ${styles.selectionSheetCard}`}
                              >
                                <div className="relative h-44 overflow-hidden sm:h-48">
                                  <Image
                                    src="/academy/viet-thai-menu-hero-v1.webp"
                                    alt="Bữa trưa Việt Thái với nước ép, món chính và tráng miệng"
                                    fill
                                    priority
                                    sizes="(max-width: 640px) 100vw, 420px"
                                    className="object-cover object-center"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/15" />
                                  <div className="absolute left-0 top-0 p-4 sm:p-5">
                                    <span className="inline-flex rounded-full border border-white/15 bg-slate-950/55 px-2.5 py-1.5 backdrop-blur-sm">
                                      <IconText
                                        icon={<AppIcon icon={UtensilsCrossed} size="sm" className="text-amber-200" />}
                                        className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200"
                                      >
                                        Bữa trưa Việt Thái
                                      </IconText>
                                    </span>
                                  </div>
                                  <div className="absolute inset-x-0 bottom-0 border-t border-white/15 bg-slate-950/55 p-4 text-white backdrop-blur-sm sm:p-5">
                                    <div className="flex items-center justify-between gap-3">
                                      <h3 className="m-0 min-w-0 text-lg font-black leading-tight">
                                        Chọn phần ăn của bạn
                                      </h3>
                                      <span className="shrink-0 whitespace-nowrap rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
                                        {selectedMenuCount}/3 đã chọn
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`space-y-5 p-4 sm:p-5 ${styles.selectionSheetContent}`}>
                                  <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm ring-1 ring-amber-100">
                                      <AppIcon icon={UtensilsCrossed} size="sm" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-amber-800">
                                        Thực đơn theo set
                                      </p>
                                      <p className="mb-0 mt-1 text-sm leading-5 text-slate-700">
                                        Chọn một món ở mỗi phần. Academy sẽ tổng hợp trước cho nhà hàng Việt Thái.
                                      </p>
                                    </div>
                                  </div>
                                  {menuIncomplete ? (
                                    <Alert
                                      type="warning"
                                      showIcon
                                      message="Thực đơn đang được Academy hoàn thiện"
                                      description="Vui lòng quay lại sau hoặc liên hệ Academy để được hỗ trợ."
                                    />
                                  ) : (
                                    <div className="space-y-4">
                                      {workshop.menu.categories.map((category, categoryIndex) => (
                                        <section
                                          key={category.category}
                                          className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"
                                        >
                                          <header className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-extrabold tabular-nums text-amber-800">
                                                {categoryIndex + 1}
                                              </span>
                                              <div className="min-w-0">
                                                <h4 className="m-0 text-sm font-extrabold leading-5 text-slate-900">
                                                  {category.label}
                                                </h4>
                                                <p className="mb-0 mt-0.5 text-xs leading-4 text-slate-500">
                                                  Chọn một món
                                                </p>
                                              </div>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                              1 lựa chọn
                                            </span>
                                          </header>
                                          <Form.Item
                                            className="!mb-0 !mt-3"
                                            name={['menuSelections', category.category]}
                                            rules={[
                                              {
                                                required: true,
                                                message: `Vui lòng chọn ${category.label.toLowerCase()}.`,
                                              },
                                            ]}
                                          >
                                            <Radio.Group
                                              className="grid w-full grid-cols-1 gap-2.5"
                                              disabled={submitting}
                                            >
                                              {category.items.map((item) => (
                                                <Radio
                                                  key={item.id}
                                                  value={item.id}
                                                  className="!ml-0 flex min-h-20 w-full items-center !gap-2 rounded-xl border border-slate-200 bg-slate-50 !px-3 !py-2 text-left transition hover:border-amber-400 hover:bg-amber-50 [&>.ant-radio]:!flex [&>.ant-radio]:!h-[var(--mos-control-height)] [&>.ant-radio]:!w-8 [&>.ant-radio]:!items-center [&>.ant-radio]:!justify-center [&>span:last-child]:!min-w-0 [&>span:last-child]:!flex-1 [&>span:last-child]:!p-0"
                                                >
                                                  <span className="flex min-w-0 items-center gap-3">
                                                    {item.imageUrl ? (
                                                      <img
                                                        src={item.imageUrl}
                                                        alt=""
                                                        className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-slate-200"
                                                      />
                                                    ) : null}
                                                    <span className="min-w-0 flex-1 line-clamp-2 text-sm font-bold leading-5 text-slate-800">
                                                      {item.name}
                                                    </span>
                                                  </span>
                                                </Radio>
                                              ))}
                                            </Radio.Group>
                                          </Form.Item>
                                        </section>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </section>
                            </div>
                          </div>
                          <div className={`shrink-0 border-t px-3 py-3 sm:px-5 ${styles.selectionSheetFooter}`}>
                            <div className="mx-auto flex max-w-2xl items-center gap-3">
                              {menuIncomplete ? (
                                <>
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200">
                                    <AppIcon icon={UtensilsCrossed} size="sm" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 text-sm font-extrabold text-slate-950">
                                      Thực đơn đang được hoàn thiện
                                    </p>
                                    <p className="m-0 text-xs leading-5 text-slate-500">
                                      Academy sẽ cập nhật lựa chọn sớm nhất.
                                    </p>
                                  </div>
                                </>
                              ) : selectedMenuCount === workshop.menu.categories.length ? (
                                <>
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                                    <Check size={18} strokeWidth={3} aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 text-xs font-bold text-emerald-700">Thực đơn đã sẵn sàng</p>
                                    <p className="m-0 text-sm font-extrabold tabular-nums text-slate-950">
                                      {selectedMenuCount}/{workshop.menu.categories.length} phần đã chọn
                                    </p>
                                  </div>
                                  <Button
                                    type="primary"
                                    size="large"
                                    className="!h-11 !rounded-xl !px-5 !font-bold"
                                    onClick={closeSelectionSheet}
                                  >
                                    Xác nhận
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm font-black tabular-nums text-amber-800 ring-1 ring-amber-200">
                                    {selectedMenuCount}/{workshop.menu.categories.length}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="m-0 text-sm font-extrabold text-slate-950">
                                      Hoàn tất lựa chọn phần ăn
                                    </p>
                                    <p className="m-0 text-xs leading-5 text-slate-500">
                                      Còn {workshop.menu.categories.length - selectedMenuCount} phần cần chọn.
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Drawer>
                    ) : null}
                    <Button
                      type="primary"
                      size="large"
                      block
                      className={`!mt-1 !h-12 !rounded-full !border-0 !font-semibold ${styles.submitButton}`}
                      loading={submitting}
                      disabled={menuIncomplete}
                      onClick={() => void submit()}
                    >
                      Gửi đăng ký workshop
                    </Button>
                  </Form>
                </>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Workshop đã đủ chỗ"
                  description="Vui lòng liên hệ Academy để được hỗ trợ vào danh sách chờ."
                />
              )}
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
