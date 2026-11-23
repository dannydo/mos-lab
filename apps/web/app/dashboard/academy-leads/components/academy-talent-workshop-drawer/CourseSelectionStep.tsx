'use client';

import React from 'react';
import { Alert } from 'antd';
import type { AcademyCourse, AcademyTalentInstructor } from '@mos-lab/shared';
import { StatePanel } from '~/components/ui';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentCourseSelectionRule,
  AcademyTalentDraft,
  AcademyTalentLead,
  AcademyTalentPricing,
  AcademyTalentPricingAddOn,
  AcademyTalentPricingLine,
  AcademyTalentResult,
} from '../academy-talent-workshop.types';
import styles from '../AcademyTalentWorkshop.module.css';
import { CoursePickerCard } from './CoursePickerCard';

export interface CourseSelectionStepProps {
  courseSelectionReady: boolean;
  displayView: AcademyTalentAssessmentView | null | undefined;
  lead: AcademyTalentLead | null;
  courseMarket: 'DOMESTIC' | 'OVERSEAS';
  domesticCourseCount: number;
  overseasCourseCount: number;
  domesticPriceLabel: string;
  overseasPriceLabel: string;
  marketCourses: AcademyCourse[];
  selectedCourseIds: Set<number>;
  recommendedIds: Set<number>;
  buomUnlocked: boolean;
  inputDisabled: boolean;
  courseSelectionRules: Record<number, AcademyTalentCourseSelectionRule>;
  draft: AcademyTalentDraft;
  pricing: AcademyTalentPricing | null | undefined;
  result: AcademyTalentResult | null | undefined;
  instructors: AcademyTalentInstructor[];
  instructorsById: Map<number, AcademyTalentInstructor>;
  autoInstructor: AcademyTalentInstructor | null;
  instructorMenuCourseId: number | null;
  coursePriceHint: (courseId: number) => AcademyTalentPricingLine | null;
  courseAddOnPriceHint: (courseId: number, kind: 'SAMPLE' | 'KIT') => AcademyTalentPricingAddOn | null;
  onChangeCourseMarket: (market: 'DOMESTIC' | 'OVERSEAS') => void;
  onSelectCourse: (courseId: number) => void;
  onToggleInstructorMenu: (courseId: number) => void;
  onSelectCourseInstructor: (courseId: number, instructorId: number) => void;
  onToggleAddOn: (courseId: number, kind: 'SAMPLE' | 'KIT') => void;
}

export function CourseSelectionStep({
  courseSelectionReady,
  displayView,
  lead,
  courseMarket,
  domesticCourseCount,
  overseasCourseCount,
  domesticPriceLabel,
  overseasPriceLabel,
  marketCourses,
  selectedCourseIds,
  recommendedIds,
  buomUnlocked,
  inputDisabled,
  courseSelectionRules,
  draft,
  pricing,
  result,
  instructors,
  instructorsById,
  autoInstructor,
  instructorMenuCourseId,
  coursePriceHint,
  courseAddOnPriceHint,
  onChangeCourseMarket,
  onSelectCourse,
  onToggleInstructorMenu,
  onSelectCourseInstructor,
  onToggleAddOn,
}: CourseSelectionStepProps) {
  const sampleRewardPct = Math.round(pricing?.sampleRewardPct || 0);
  const kitRewardPct = Math.round(pricing?.kitRewardPct || 0);

  return (
    <section className={styles.stepPanel} aria-label="Chọn khóa học phù hợp">
      {courseSelectionReady && (
        <>
          {!displayView && (
            <Alert
              type="info"
              showIcon
              message="Lưu chấm điểm trước để nhận đề xuất chính xác"
              description="Tố Chất không tự tính học bổng ở trình duyệt. Hãy quay lại bước 1 và lưu đánh giá."
              className={styles.inlineAlert}
            />
          )}

          <section className={styles.courseSelectionContent} aria-labelledby="academy-talent-courses-title">
            <h3 className={styles.visuallyHidden} id="academy-talent-courses-title">
              Chọn lộ trình phù hợp
            </h3>

            <div className={styles.marketSwitcher} role="tablist" aria-label="Nhóm học viên Academy">
              <button
                type="button"
                role="tab"
                aria-selected={courseMarket === 'DOMESTIC'}
                className={courseMarket === 'DOMESTIC' ? styles.marketActive : ''}
                onClick={() => onChangeCourseMarket('DOMESTIC')}
              >
                <strong>Học viên trong nước</strong>
                <small>
                  {domesticCourseCount} khóa học · {domesticPriceLabel}
                </small>
              </button>
              <span
                aria-hidden="true"
                className={styles.marketFlag}
                data-has-avatar={lead?.avatarUrl ? 'true' : undefined}
              >
                {lead?.avatarUrl ? <img alt="" src={lead.avatarUrl} /> : '🇻🇳'}
              </span>
              <button
                type="button"
                role="tab"
                aria-selected={courseMarket === 'OVERSEAS'}
                className={courseMarket === 'OVERSEAS' ? styles.marketActive : ''}
                onClick={() => onChangeCourseMarket('OVERSEAS')}
              >
                <strong>Việt kiều & định cư</strong>
                <small>
                  {overseasCourseCount} khóa học · {overseasPriceLabel}
                </small>
              </button>
            </div>

            {marketCourses.length ? (
              <div
                className={styles.coursePickerGrid}
                role="listbox"
                aria-label={`Khóa học ${courseMarket === 'DOMESTIC' ? 'trong nước' : 'Việt kiều và định cư'}`}
              >
                {marketCourses.map((course, index) => (
                  <CoursePickerCard
                    key={course.id}
                    course={course}
                    index={index}
                    selected={selectedCourseIds.has(course.id)}
                    recommended={recommendedIds.has(course.id)}
                    buomUnlocked={buomUnlocked}
                    inputDisabled={inputDisabled}
                    courseRule={courseSelectionRules[course.id] || { kind: 'COURSE' as const }}
                    coursePrice={coursePriceHint(course.id)}
                    sampleQuote={courseAddOnPriceHint(course.id, 'SAMPLE')}
                    kitQuote={courseAddOnPriceHint(course.id, 'KIT')}
                    sampleRewardPct={sampleRewardPct}
                    kitRewardPct={kitRewardPct}
                    draft={draft}
                    result={result}
                    instructors={instructors}
                    instructorsById={instructorsById}
                    autoInstructor={autoInstructor}
                    instructorMenuOpen={instructorMenuCourseId === course.id}
                    onSelectCourse={onSelectCourse}
                    onToggleInstructorMenu={onToggleInstructorMenu}
                    onSelectCourseInstructor={onSelectCourseInstructor}
                    onToggleAddOn={onToggleAddOn}
                  />
                ))}
              </div>
            ) : (
              <StatePanel
                kind="empty"
                surface={false}
                title="Chưa có khóa học đang dùng"
                description="Admin hoặc Manager cần kích hoạt khóa học ở danh mục Academy trước."
              />
            )}
          </section>
        </>
      )}
    </section>
  );
}
