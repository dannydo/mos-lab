'use client';

import React from 'react';
import dayjs from 'dayjs';
import { BookOpenCheck, Brain, Clock3, Coffee, Eye, Gamepad2, GraduationCap, Sparkles, UsersRound } from 'lucide-react';
import type { AcademyWorkshopAgendaKind } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import styles from '../AcademyWorkshopRegistration.module.css';
import type {
  SelectionSheetKind,
  WorkshopDesignItem,
  WorkshopEquipmentPackage,
  WorkshopMenuSelectionSummary,
  WorkshopPublicDetail,
} from './registrationTypes';
import { formatAgendaDuration, formatCompactAgendaDuration } from './registrationUtils';
import { TimelineAgendaSelections } from './TimelineAgendaSelections';
import { useWorkshopSelectionChangeCountdown } from './useWorkshopSelectionChangeCountdown';

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
    case 'THEORY':
      return { label: 'Lý thuyết', icon: BookOpenCheck, tone: styles.agendaIconNeutral };
    case 'PRACTICE':
      return { label: 'Thực hành', icon: Sparkles, tone: styles.agendaIconViolet };
    case 'OBSERVATION':
      return { label: 'Quan sát', icon: Eye, tone: styles.agendaIconBlue };
    case 'NETWORKING':
      return { label: 'Giao lưu kết nối', icon: UsersRound, tone: styles.agendaIconGreen };
    case 'OTHER':
      return { label: 'Hoạt động workshop', icon: Clock3, tone: styles.agendaIconNeutral };
    default:
      return { label: 'Nội dung học tập', icon: BookOpenCheck, tone: styles.agendaIconNeutral };
  }
}

export interface WorkshopExperienceTimelineProps {
  startsAt: string;
  menuSelectionDeadline?: string | null;
  equipmentSelectionDeadline?: string | null;
  designSelectionDeadline?: string | null;
  agenda: WorkshopPublicDetail['agenda'];
  menuCategoriesCount: number;
  selectedEquipmentPackage: WorkshopEquipmentPackage | undefined;
  selectedDesign: WorkshopDesignItem | undefined;
  selectedMenuItems: WorkshopMenuSelectionSummary[];
  onOpenSelectionSheet: (selection: SelectionSheetKind) => void;
}

export function WorkshopExperienceTimeline({
  startsAt,
  menuSelectionDeadline,
  equipmentSelectionDeadline,
  designSelectionDeadline,
  agenda,
  menuCategoriesCount,
  selectedEquipmentPackage,
  selectedDesign,
  selectedMenuItems,
  onOpenSelectionSheet,
}: WorkshopExperienceTimelineProps) {
  const equipmentCountdown = useWorkshopSelectionChangeCountdown(equipmentSelectionDeadline, startsAt);
  const designCountdown = useWorkshopSelectionChangeCountdown(designSelectionDeadline, startsAt);
  const menuCountdown = useWorkshopSelectionChangeCountdown(menuSelectionDeadline, startsAt);

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
                  <TimelineAgendaSelections
                    item={item}
                    menuCategoriesCount={menuCategoriesCount}
                    selectedEquipmentPackage={selectedEquipmentPackage}
                    selectedDesign={selectedDesign}
                    selectedMenuItems={selectedMenuItems}
                    equipmentCountdown={equipmentCountdown}
                    designCountdown={designCountdown}
                    menuCountdown={menuCountdown}
                    onOpenSelectionSheet={onOpenSelectionSheet}
                  />
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
