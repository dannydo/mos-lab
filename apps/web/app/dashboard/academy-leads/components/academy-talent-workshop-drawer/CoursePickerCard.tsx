'use client';

import React from 'react';
import { CircleCheck, Gift, Plus, UserRound, Wrench } from 'lucide-react';
import { isAcademyBuomCourse } from '@mos-lab/shared';
import type { AcademyCourse, AcademyTalentInstructor } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import type {
  AcademyTalentCourseSelectionRule,
  AcademyTalentDraft,
  AcademyTalentPricingAddOn,
  AcademyTalentPricingLine,
  AcademyTalentResult,
} from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';
import { academyCourseCoverUrl, academyCourseTone } from './workshop-drawer-utils';

export interface CoursePickerCardProps {
  course: AcademyCourse;
  index: number;
  selected: boolean;
  recommended: boolean;
  buomUnlocked: boolean;
  inputDisabled: boolean;
  courseRule: AcademyTalentCourseSelectionRule;
  coursePrice: AcademyTalentPricingLine | null;
  sampleQuote: AcademyTalentPricingAddOn | null;
  kitQuote: AcademyTalentPricingAddOn | null;
  sampleRewardPct: number;
  kitRewardPct: number;
  draft: AcademyTalentDraft;
  result: AcademyTalentResult | null | undefined;
  instructors: AcademyTalentInstructor[];
  instructorsById: Map<number, AcademyTalentInstructor>;
  autoInstructor: AcademyTalentInstructor | null;
  instructorMenuOpen: boolean;
  onSelectCourse: (courseId: number) => void;
  onToggleInstructorMenu: (courseId: number) => void;
  onSelectCourseInstructor: (courseId: number, instructorId: number) => void;
  onToggleAddOn: (courseId: number, kind: 'SAMPLE' | 'KIT') => void;
}

export function CoursePickerCard({
  course,
  index,
  selected,
  recommended,
  buomUnlocked,
  inputDisabled,
  courseRule,
  coursePrice,
  sampleQuote,
  kitQuote,
  sampleRewardPct,
  kitRewardPct,
  draft,
  result,
  instructors,
  instructorsById,
  autoInstructor,
  instructorMenuOpen,
  onSelectCourse,
  onToggleInstructorMenu,
  onSelectCourseInstructor,
  onToggleAddOn,
}: CoursePickerCardProps) {
  const isBuom = isAcademyBuomCourse(course);
  const courseLocked = isBuom && !buomUnlocked;
  const courseUnlockedBadge = isBuom && buomUnlocked;
  const cardDisabled = inputDisabled || courseLocked;
  const sampleSelected = draft.selectedSampleCourseIds.includes(course.id);
  const kitSelected = draft.selectedKitCourseIds.includes(course.id);
  const selectedInstructorId = draft.selectedInstructorIdsByCourse[String(course.id)];
  const rawInstructor = instructorsById.get(selectedInstructorId) || coursePrice?.instructor || autoInstructor;
  const instructor = isBuom ? autoInstructor || rawInstructor : rawInstructor;
  const instructorLocked = isBuom || inputDisabled || !selected || !instructor;
  const instructorSurchargeVnd = isBuom ? 0 : coursePrice?.instructorSurchargeVnd || 0;

  const sampleRewardLabel = isBuom
    ? 'Tự mang mẫu · Miễn phí'
    : sampleSelected && sampleQuote
      ? sampleQuote.scholarshipVnd > 0
        ? `Ưu đãi tố chất ${sampleRewardPct}% · giảm ${formatVND(sampleQuote.scholarshipVnd)}`
        : 'Chưa có ưu đãi'
      : sampleRewardPct > 0
        ? `Ưu đãi tố chất ${sampleRewardPct}% khi thêm`
        : 'Chưa có ưu đãi';

  const kitRewardLabel = isBuom
    ? 'Tự mang đồ nghề · NVL Wings cấp'
    : kitSelected && kitQuote
      ? kitQuote.scholarshipVnd > 0
        ? `Ưu đãi tố chất ${kitRewardPct}% · giảm ${formatVND(kitQuote.scholarshipVnd)}`
        : 'Chưa có ưu đãi'
      : kitRewardPct > 0
        ? `Ưu đãi tố chất ${kitRewardPct}% khi thêm`
        : 'Chưa có ưu đãi';

  const courseScholarshipVnd = isBuom ? 0 : coursePrice?.scholarshipVnd || 0;
  const roundedScholarshipPct = Math.round(result?.scholarshipPct || 0);
  const courseFeeRewardLabel = isBuom
    ? 'Giá cố định · Không áp dụng học bổng'
    : courseScholarshipVnd > 0
      ? `Ưu đãi tố chất ${roundedScholarshipPct}% · giảm ${formatVND(courseScholarshipVnd)}`
      : roundedScholarshipPct > 0
        ? `Ưu đãi tố chất ${roundedScholarshipPct}% khi chọn`
        : 'Chưa có ưu đãi tố chất';

  const courseRewardLabel = isBuom
    ? 'Giá cố định · Không áp dụng học bổng'
    : selected
      ? courseScholarshipVnd > 0
        ? `Học bổng tố chất: giảm ${formatVND(courseScholarshipVnd)}`
        : 'Chưa có ưu đãi học bổng'
      : roundedScholarshipPct > 0
        ? `Học bổng tố chất ${roundedScholarshipPct}% khi chọn`
        : 'Chưa có ưu đãi học bổng';

  const coverUrl = academyCourseCoverUrl(course);
  const courseTone = academyCourseTone(course, index);
  const totalInvestment = selected
    ? (coursePrice?.finalPriceVnd ?? course.promoPriceVnd ?? course.listPriceVnd) +
      instructorSurchargeVnd +
      (sampleQuote?.finalPriceVnd ?? (sampleSelected ? course.samplePriceVnd : 0)) +
      (kitQuote?.finalPriceVnd ?? (kitSelected ? course.kitPriceVnd : 0))
    : course.promoPriceVnd || course.listPriceVnd;

  return (
    <article
      role="option"
      aria-selected={selected}
      aria-disabled={courseLocked ? 'true' : undefined}
      data-course-tone={courseTone}
      data-course-kind={courseRule.kind.toLowerCase()}
      tabIndex={cardDisabled ? -1 : 0}
      className={`${styles.coursePickerCard} ${selected ? styles.coursePickerCardSelected : ''} ${recommended ? styles.coursePickerCardRecommended : ''} ${courseUnlockedBadge ? styles.coursePickerCardBuomUnlocked : ''} ${courseLocked ? styles.coursePickerCardLocked : ''}`}
      onClick={() => !cardDisabled && onSelectCourse(course.id)}
      onKeyDown={(event) => {
        if (!cardDisabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelectCourse(course.id);
        }
      }}
    >
      <div className={styles.coursePickerMeta}>
        <span className={styles.courseTag}>{course.tag || course.code}</span>
        <span>{isBuom ? 'Chuẩn Bướm' : `${course.lessonCount} buổi`}</span>
        <button
          type="button"
          aria-label={`${selected ? 'Bỏ chọn' : 'Chọn'} ${course.name}`}
          aria-pressed={selected}
          disabled={cardDisabled}
          className={styles.courseSelectButton}
          onClick={(event) => {
            event.stopPropagation();
            if (!cardDisabled) onSelectCourse(course.id);
          }}
        >
          {selected ? <AppIcon icon={CircleCheck} /> : <span />}
        </button>
      </div>
      <div className={styles.courseVisual} data-tone={courseTone}>
        {coverUrl && (
          <>
            <img alt="" src={coverUrl} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(8,13,29,0.08)] to-[rgba(8,13,29,0.82)]"
            />
          </>
        )}
        {!coverUrl && <span>{course.tag || 'WINGS'}</span>}
        {courseUnlockedBadge ? (
          <b className={styles.courseBuomUnlockedMark}>Đã mở khóa · Chuẩn Bướm</b>
        ) : courseLocked ? (
          <b className={styles.courseBuomLockedMark}>Khóa · Cần Thiên Thần Bóng Tối</b>
        ) : (
          recommended && <b className={styles.courseRecommendedMark}>Phù hợp</b>
        )}
      </div>
      <div className={styles.coursePickerCopy}>
        <h4>{course.name}</h4>
        <p>{course.description || 'Lộ trình Academy được tư vấn theo kết quả workshop.'}</p>
        <a href="/dashboard/academy-leads/courses" onClick={(event) => event.stopPropagation()}>
          Xem chi tiết buổi học →
        </a>
      </div>
      <div className={styles.courseFeeRow}>
        {isBuom ? (
          <span>Chuẩn Bướm · Cố định</span>
        ) : (
          <span>
            Giá gốc <del className="tabular-nums">{formatVND(course.listPriceVnd)}</del>
          </span>
        )}
        <span>
          Học phí{' '}
          <strong className="tabular-nums">
            {formatVND(coursePrice?.finalPriceVnd ?? (course.promoPriceVnd || course.listPriceVnd))}
          </strong>
        </span>
        <small className={styles.courseFeeReward}>{courseFeeRewardLabel}</small>
      </div>
      <div className={styles.courseInstructorPicker}>
        <button
          type="button"
          className={styles.courseInstructorTrigger}
          disabled={instructorLocked}
          onClick={(event) => {
            event.stopPropagation();
            if (instructorLocked) return;
            onToggleInstructorMenu(course.id);
          }}
          aria-expanded={!isBuom && instructorMenuOpen}
          aria-controls={`academy-talent-instructor-menu-${course.id}`}
        >
          {instructor?.avatarUrl ? (
            <img src={instructor.avatarUrl} alt="" className={styles.courseInstructorAvatar} />
          ) : (
            <span className={styles.courseInstructorAvatar}>
              <AppIcon icon={UserRound} />
            </span>
          )}
          <span>
            <b>{instructor?.displayName || 'Chưa có giảng viên'}</b>
            <small>
              {isBuom
                ? 'Mặc định · Tự động phân bổ giảng viên (khóa)'
                : instructor && (instructor.surchargePercent || 0) > 0
                  ? `${instructor.description || 'Chỉ định giảng viên chính'} · phụ phí +${formatVND(instructorSurchargeVnd)}`
                  : instructor?.description || 'Chọn giảng viên sau khi chọn khóa học'}
            </small>
          </span>
          <strong>
            {!isBuom && instructor && instructor.surchargePercent > 0 ? `+${instructor.surchargePercent}%` : 'Miễn phí'}
          </strong>
        </button>
        {!isBuom && instructorMenuOpen && selected && !inputDisabled && (
          <div
            id={`academy-talent-instructor-menu-${course.id}`}
            className={styles.courseInstructorMenu}
            role="menu"
            onClick={(event) => event.stopPropagation()}
          >
            {instructors.map((option) => {
              const active = option.id === (selectedInstructorId || autoInstructor?.id || coursePrice?.instructor?.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={active ? styles.courseInstructorOptionActive : ''}
                  onClick={() => onSelectCourseInstructor(course.id, option.id)}
                >
                  {option.avatarUrl ? (
                    <img src={option.avatarUrl} alt="" />
                  ) : (
                    <span>
                      <AppIcon icon={UserRound} />
                    </span>
                  )}
                  <span>
                    <b>{option.displayName}</b>
                    <small>{option.description || 'Giảng viên Academy'}</small>
                  </span>
                  <strong>{option.surchargePercent > 0 ? `+${option.surchargePercent}%` : 'Miễn phí'}</strong>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.courseAddOns}>
        <button
          type="button"
          disabled={inputDisabled || !selected || course.samplePriceVnd <= 0}
          aria-pressed={sampleSelected}
          className={sampleSelected ? styles.courseAddOnSelected : ''}
          onClick={(event) => {
            event.stopPropagation();
            onToggleAddOn(course.id, 'SAMPLE');
          }}
        >
          <span className={styles.courseAddOnCopy}>
            <b>
              <AppIcon icon={Gift} /> {isBuom ? 'Mẫu học viên' : `Mẫu ${course.lashModelCount} mẫu`}
            </b>
          </span>
          <strong className="tabular-nums">
            {sampleSelected && sampleQuote ? formatVND(sampleQuote.finalPriceVnd) : formatVND(course.samplePriceVnd)}
          </strong>
          <i>{sampleSelected ? <AppIcon icon={CircleCheck} /> : <AppIcon icon={Plus} />}</i>
          <small className={styles.courseAddOnReward}>{sampleRewardLabel}</small>
        </button>
        <button
          type="button"
          disabled={inputDisabled || !selected || course.kitPriceVnd <= 0}
          aria-pressed={kitSelected}
          className={kitSelected ? styles.courseAddOnSelected : ''}
          onClick={(event) => {
            event.stopPropagation();
            onToggleAddOn(course.id, 'KIT');
          }}
        >
          <span className={styles.courseAddOnCopy}>
            <b>
              <AppIcon icon={Wrench} /> {isBuom ? 'Đồ nghề học viên' : course.kitName || 'Đồ nghề học viên'}
            </b>
          </span>
          <strong className="tabular-nums">
            {kitSelected && kitQuote ? formatVND(kitQuote.finalPriceVnd) : formatVND(course.kitPriceVnd)}
          </strong>
          <i>{kitSelected ? <AppIcon icon={CircleCheck} /> : <AppIcon icon={Plus} />}</i>
          <small className={styles.courseAddOnReward}>{kitRewardLabel}</small>
        </button>
      </div>
      <div className={styles.courseInvestment}>
        <span>Tổng đầu tư</span>
        <strong className="tabular-nums">{formatVND(totalInvestment)}</strong>
        <small>{courseRewardLabel}</small>
      </div>
      <small className={styles.coursePickerRule}>
        {courseLocked
          ? 'Cần đạt Thiên Thần Bóng Tối (35+ sợi, ≤ 5 lỗi)'
          : isBuom
            ? 'Khóa độc lập · chuẩn Bướm (chọn riêng)'
            : courseRule.kind === 'COMBO'
              ? 'Combo trọn gói · chọn riêng'
              : 'Khóa học lẻ · có thể chọn nhiều'}
      </small>
    </article>
  );
}
