'use client';

import React from 'react';
import { Button, Input, InputNumber, Popconfirm, Select, Switch, message } from 'antd';
import { ChevronDown, Plus, Save, Search, Trash2 } from 'lucide-react';
import { removeVietnameseTones, type AcademyCourse, type UpsertAcademyCourseRequest } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '../../../../components/ui';
import type { AcademyTalentCourseConfigurationInput } from './academy-talent-workshop.types';
import styles from './AcademyTalentWorkshop.module.css';

type CourseConfigurationDraft = AcademyTalentCourseConfigurationInput & { clientKey: string };

const COURSE_MARKET_OPTIONS = [
  { value: 'DOMESTIC', label: 'Trong nước' },
  { value: 'OVERSEAS', label: 'Việt kiều & định cư' },
];

function toCourseConfigurationDraft(course: AcademyCourse): CourseConfigurationDraft {
  return {
    clientKey: `course-${course.id}`,
    id: course.id,
    values: {
      code: course.code,
      name: course.name,
      nameEn: course.nameEn,
      tag: course.tag,
      description: course.description,
      market: course.market,
      coverImageUrl: course.coverImageUrl,
      listPriceVnd: course.listPriceVnd,
      promoPriceVnd: course.promoPriceVnd,
      kitName: course.kitName,
      kitUrl: course.kitUrl,
      kitPriceVnd: course.kitPriceVnd,
      samplePriceVnd: course.samplePriceVnd,
      lessonCount: course.lessonCount,
      lashModelCount: course.lashModelCount,
      syllabusHtml: course.syllabusHtml,
      syllabus: course.syllabus,
      sortOrder: course.sortOrder,
      isActive: course.isActive,
    },
  };
}

function createCourseConfigurationDraft(index: number): CourseConfigurationDraft {
  const order = index + 1;
  return {
    clientKey: `new-course-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    values: {
      code: `course-${order}`,
      name: `Khóa học mới ${order}`,
      nameEn: null,
      tag: null,
      description: null,
      market: 'DOMESTIC',
      coverImageUrl: null,
      listPriceVnd: 0,
      promoPriceVnd: 0,
      kitName: null,
      kitUrl: null,
      kitPriceVnd: 0,
      samplePriceVnd: 0,
      lessonCount: 1,
      lashModelCount: 0,
      syllabusHtml: null,
      syllabus: [],
      sortOrder: index,
      isActive: true,
    },
  };
}

function wholeNumber(value: number | null | undefined, min = 0) {
  return Math.max(min, Math.round(Number(value) || 0));
}

function formatGroupedNumber(value: number | string | undefined) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function parseGroupedNumber(value?: string) {
  return Number(value?.replace(/[^\d-]/g, '') || 0);
}

function normalizeDraft(draft: CourseConfigurationDraft): AcademyTalentCourseConfigurationInput {
  const values = draft.values;
  return {
    ...(draft.id ? { id: draft.id } : {}),
    values: {
      ...values,
      code: values.code.trim().toLowerCase(),
      name: values.name.trim(),
      nameEn: values.nameEn?.trim() || null,
      tag: values.tag?.trim() || null,
      description: values.description?.trim() || null,
      coverImageUrl: values.coverImageUrl?.trim() || null,
      kitName: values.kitName?.trim() || null,
      kitUrl: values.kitUrl?.trim() || null,
      listPriceVnd: wholeNumber(values.listPriceVnd),
      promoPriceVnd: wholeNumber(values.promoPriceVnd),
      kitPriceVnd: wholeNumber(values.kitPriceVnd),
      samplePriceVnd: wholeNumber(values.samplePriceVnd),
      lessonCount: wholeNumber(values.lessonCount, 1),
      lashModelCount: wholeNumber(values.lashModelCount),
      sortOrder: wholeNumber(values.sortOrder),
      isActive: values.isActive !== false,
      syllabus: values.syllabus || [],
    },
  };
}

interface CourseConfigurationCardProps {
  draft: CourseConfigurationDraft;
  expanded: boolean;
  index: number;
  onChange: (patch: Partial<UpsertAcademyCourseRequest>) => void;
  onRemoveNew: () => void;
  onToggle: () => void;
}

/** Keeps each course's presentation fields together while the parent owns draft orchestration. */
function CourseConfigurationCard({
  draft,
  expanded,
  index,
  onChange,
  onRemoveNew,
  onToggle,
}: CourseConfigurationCardProps) {
  const { values } = draft;
  const [detailsOpen, setDetailsOpen] = React.useState(!draft.id);
  const rowName = values.name.trim() || `khóa học ${index + 1}`;
  const marketLabel = COURSE_MARKET_OPTIONS.find((option) => option.value === values.market)?.label || 'Trong nước';

  return (
    <article
      className={styles.courseConfigurationCard}
      data-expanded={expanded ? 'true' : undefined}
      data-new-course={draft.id ? undefined : 'true'}
    >
      <header className={styles.courseConfigurationCardHeader}>
        <button
          aria-expanded={expanded}
          className={styles.courseConfigurationCardSummary}
          type="button"
          onClick={onToggle}
        >
          <div className={styles.courseConfigurationCardIdentity}>
            <span className={styles.courseConfigurationCardIndex}>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{rowName}</strong>
              <small>
                {marketLabel} · {values.lessonCount || 0} buổi · {formatGroupedNumber(values.promoPriceVnd)} đ
              </small>
            </div>
          </div>
          <AppIcon icon={ChevronDown} className={styles.courseConfigurationCardChevron} />
        </button>
        <div className={styles.courseConfigurationCardActions}>
          <span>Hiển thị</span>
          <Switch
            aria-label={`Hiển thị ${rowName}`}
            checked={values.isActive !== false}
            onChange={(isActive) => onChange({ isActive })}
          />
          {!draft.id && (
            <Popconfirm
              cancelText="Giữ lại"
              okButtonProps={{ danger: true }}
              okText="Bỏ dòng"
              title={`Bỏ “${rowName}” chưa lưu?`}
              onConfirm={onRemoveNew}
            >
              <Button aria-label={`Bỏ ${rowName}`} danger icon={<AppIcon icon={Trash2} />} size="small" type="text" />
            </Popconfirm>
          )}
        </div>
      </header>

      {expanded && (
        <div className={styles.courseConfigurationCardBody}>
          <div className={styles.courseConfigurationPrimaryFields}>
            <label className={styles.courseConfigurationFieldFull}>
              <span>Tên khóa học</span>
              <Input
                aria-label={`Tên ${rowName}`}
                maxLength={255}
                placeholder="Tên hiển thị trên card"
                value={values.name}
                onChange={(event) => onChange({ name: event.target.value })}
              />
            </label>
            <label>
              <span>Mã</span>
              <Input
                aria-label={`Mã ${rowName}`}
                maxLength={80}
                placeholder="ví dụ: basic"
                value={values.code}
                onChange={(event) => onChange({ code: event.target.value })}
              />
            </label>
            <label>
              <span>Nhãn card</span>
              <Input
                aria-label={`Nhãn ${rowName}`}
                maxLength={80}
                placeholder="ví dụ: NỀN TẢNG"
                value={values.tag || ''}
                onChange={(event) => onChange({ tag: event.target.value || null })}
              />
            </label>
            <label>
              <span>Nhóm học viên</span>
              <Select
                aria-label={`Nhóm học viên ${rowName}`}
                options={COURSE_MARKET_OPTIONS}
                value={values.market || 'DOMESTIC'}
                onChange={(market) => onChange({ market })}
              />
            </label>
            <label>
              <span>Số buổi</span>
              <InputNumber
                aria-label={`Số buổi ${rowName}`}
                formatter={formatGroupedNumber}
                min={1}
                parser={parseGroupedNumber}
                precision={0}
                value={values.lessonCount}
                onChange={(lessonCount) => onChange({ lessonCount: wholeNumber(lessonCount, 1) })}
              />
            </label>
            <label>
              <span>Giá gốc (đ)</span>
              <InputNumber
                aria-label={`Giá gốc ${rowName}`}
                controls={false}
                formatter={formatGroupedNumber}
                min={0}
                parser={parseGroupedNumber}
                precision={0}
                value={values.listPriceVnd}
                onChange={(listPriceVnd) => onChange({ listPriceVnd: wholeNumber(listPriceVnd) })}
              />
            </label>
            <label>
              <span>Học phí (đ)</span>
              <InputNumber
                aria-label={`Học phí ${rowName}`}
                controls={false}
                formatter={formatGroupedNumber}
                min={0}
                parser={parseGroupedNumber}
                precision={0}
                value={values.promoPriceVnd}
                onChange={(promoPriceVnd) => onChange({ promoPriceVnd: wholeNumber(promoPriceVnd) })}
              />
            </label>
          </div>

          <details
            className={styles.courseConfigurationDetails}
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary>Thực hành, đồ nghề & nội dung hiển thị</summary>
            <div className={styles.courseConfigurationFieldGrid}>
              <label>
                <span>Thứ tự hiển thị</span>
                <InputNumber
                  aria-label={`Thứ tự ${rowName}`}
                  formatter={formatGroupedNumber}
                  min={0}
                  parser={parseGroupedNumber}
                  precision={0}
                  value={values.sortOrder}
                  onChange={(sortOrder) => onChange({ sortOrder: wholeNumber(sortOrder) })}
                />
              </label>
              <label>
                <span>Số mẫu</span>
                <InputNumber
                  aria-label={`Số mẫu ${rowName}`}
                  formatter={formatGroupedNumber}
                  min={0}
                  parser={parseGroupedNumber}
                  precision={0}
                  value={values.lashModelCount}
                  onChange={(lashModelCount) => onChange({ lashModelCount: wholeNumber(lashModelCount) })}
                />
              </label>
              <label>
                <span>Ưu đãi mẫu (đ)</span>
                <InputNumber
                  aria-label={`Giá mẫu ${rowName}`}
                  controls={false}
                  formatter={formatGroupedNumber}
                  min={0}
                  parser={parseGroupedNumber}
                  precision={0}
                  value={values.samplePriceVnd}
                  onChange={(samplePriceVnd) => onChange({ samplePriceVnd: wholeNumber(samplePriceVnd) })}
                />
              </label>
              <label className={styles.courseConfigurationFieldFull}>
                <span>Tên đồ nghề</span>
                <Input
                  aria-label={`Tên đồ nghề ${rowName}`}
                  maxLength={255}
                  placeholder="Ví dụ: MS90 Cọp Bạc"
                  value={values.kitName || ''}
                  onChange={(event) => onChange({ kitName: event.target.value || null })}
                />
              </label>
              <label className={styles.courseConfigurationFieldFull}>
                <span>URL ảnh cốp đồ nghề</span>
                <Input
                  aria-label={`URL ảnh cốp đồ nghề ${rowName}`}
                  placeholder="https://... hoặc /academy/kits/ten-anh.jpg"
                  value={values.kitUrl || ''}
                  onChange={(event) => onChange({ kitUrl: event.target.value || null })}
                />
              </label>
              <label>
                <span>Ưu đãi đồ nghề (đ)</span>
                <InputNumber
                  aria-label={`Giá đồ nghề ${rowName}`}
                  controls={false}
                  formatter={formatGroupedNumber}
                  min={0}
                  parser={parseGroupedNumber}
                  precision={0}
                  value={values.kitPriceVnd}
                  onChange={(kitPriceVnd) => onChange({ kitPriceVnd: wholeNumber(kitPriceVnd) })}
                />
              </label>
              <label className={styles.courseConfigurationFieldFull}>
                <span>Mô tả trên card</span>
                <Input
                  aria-label={`Mô tả ${rowName}`}
                  maxLength={500}
                  placeholder="Mô tả ngắn cho người tư vấn"
                  value={values.description || ''}
                  onChange={(event) => onChange({ description: event.target.value || null })}
                />
              </label>
              <label className={styles.courseConfigurationFieldFull}>
                <span>Đường dẫn ảnh bìa</span>
                <Input
                  aria-label={`Ảnh bìa ${rowName}`}
                  placeholder="/academy/courses/ten-anh.jpg"
                  value={values.coverImageUrl || ''}
                  onChange={(event) => onChange({ coverImageUrl: event.target.value || null })}
                />
              </label>
            </div>
          </details>
        </div>
      )}
    </article>
  );
}

export interface AcademyTalentCourseConfigurationModalProps {
  open: boolean;
  courses: AcademyCourse[];
  onCancel: () => void;
  onSave: (input: AcademyTalentCourseConfigurationInput[]) => Promise<AcademyCourse[]>;
}

/**
 * Admin-only bulk editor for the fields rendered in Step 2 course cards.
 * Server mutations stay in the parent so this is an isolated editing surface.
 */
export function AcademyTalentCourseConfigurationModal({
  open,
  courses,
  onCancel,
  onSave,
}: AcademyTalentCourseConfigurationModalProps) {
  const [drafts, setDrafts] = React.useState<CourseConfigurationDraft[]>(() => courses.map(toCourseConfigurationDraft));
  const [expandedClientKey, setExpandedClientKey] = React.useState<string | null>(() =>
    courses[0] ? `course-${courses[0].id}` : null
  );
  const [query, setQuery] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      const nextDrafts = courses.map(toCourseConfigurationDraft);
      setDrafts(nextDrafts);
      setExpandedClientKey(nextDrafts[0]?.clientKey || null);
      setQuery('');
    }
  }, [courses, open]);

  const updateDraft = React.useCallback((clientKey: string, patch: Partial<UpsertAcademyCourseRequest>) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.clientKey === clientKey ? { ...draft, values: { ...draft.values, ...patch } } : draft
      )
    );
  }, []);

  const removeNewDraft = React.useCallback((clientKey: string) => {
    setDrafts((current) => current.filter((draft) => draft.clientKey !== clientKey));
    setExpandedClientKey((expanded) => (expanded === clientKey ? null : expanded));
  }, []);

  const save = React.useCallback(async () => {
    const normalized = drafts.map(normalizeDraft);
    const codes = normalized.map((item) => item.values.code).filter(Boolean);
    const duplicateCode = codes.find((code, index) => codes.indexOf(code) !== index);
    if (normalized.some((item) => !item.values.code || !item.values.name)) {
      message.error('Mỗi khóa học cần có mã và tên hiển thị.');
      return;
    }
    if (duplicateCode) {
      message.error(`Mã khóa học “${duplicateCode}” đang bị trùng.`);
      return;
    }

    setSaving(true);
    try {
      await onSave(normalized);
      message.success('Đã lưu cấu hình khóa học dùng chung cho Academy.');
      onCancel();
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể lưu cấu hình khóa học.');
    } finally {
      setSaving(false);
    }
  }, [drafts, onCancel, onSave]);

  const activeCount = drafts.filter((draft) => draft.values.isActive !== false).length;
  const domesticCount = drafts.filter((draft) => draft.values.market !== 'OVERSEAS').length;
  const normalizedQuery = removeVietnameseTones(query);
  const visibleDrafts = normalizedQuery
    ? drafts.filter((draft) => {
        const searchableText = [draft.values.code, draft.values.name, draft.values.tag, draft.values.market]
          .filter(Boolean)
          .join(' ');
        return removeVietnameseTones(searchableText).includes(normalizedQuery);
      })
    : drafts;

  const addCourse = () => {
    const nextDraft = createCourseConfigurationDraft(drafts.length);
    setDrafts((current) => [...current, nextDraft]);
    setExpandedClientKey(nextDraft.clientKey);
  };

  return (
    <AdaptiveModal
      className={styles.courseConfigurationModal}
      destroyOnHidden
      footer={[
        <Button key="cancel" disabled={saving} onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="save" type="primary" icon={<AppIcon icon={Save} />} loading={saving} onClick={() => void save()}>
          Lưu toàn bộ
        </Button>,
      ]}
      intent="data"
      open={open}
      title={
        <div className={styles.courseConfigurationModalTitle}>
          <span>Cấu hình toàn bộ khóa học Academy</span>
          <small>Áp dụng toàn cục cho các workshop và báo giá mới</small>
        </div>
      }
      zIndex={11070}
      onCancel={onCancel}
    >
      <section className={styles.courseConfigurationEditor} aria-label="Cấu hình khóa học Academy">
        <header className={styles.courseConfigurationIntro}>
          <div>
            <span className={styles.courseConfigurationEyebrow}>DANH MỤC TOÀN CỤC</span>
            <p>Chọn một khóa học để chỉnh. Tắt hiển thị để lưu lịch sử mà không đưa khóa học vào tư vấn.</p>
            <div className={styles.courseConfigurationSummary} aria-label="Tóm tắt khóa học">
              <span>
                <b>{drafts.length}</b> khóa học
              </span>
              <span>
                <b>{activeCount}</b> đang hiển thị
              </span>
              <span>
                <b>{domesticCount}</b> trong nước
              </span>
            </div>
          </div>
          <div className={styles.courseConfigurationToolbarActions}>
            <Input
              allowClear
              aria-label="Tìm khóa học Academy"
              placeholder="Tìm khóa học"
              prefix={<AppIcon icon={Search} />}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button icon={<AppIcon icon={Plus} />} type="primary" onClick={addCourse}>
              Thêm khóa học
            </Button>
          </div>
        </header>

        {visibleDrafts.length ? (
          <div className={styles.courseConfigurationGrid}>
            {visibleDrafts.map((draft) => {
              const index = drafts.findIndex((item) => item.clientKey === draft.clientKey);
              return (
                <CourseConfigurationCard
                  key={draft.clientKey}
                  draft={draft}
                  expanded={expandedClientKey === draft.clientKey}
                  index={index}
                  onChange={(patch) => updateDraft(draft.clientKey, patch)}
                  onRemoveNew={() => removeNewDraft(draft.clientKey)}
                  onToggle={() =>
                    setExpandedClientKey((expanded) => (expanded === draft.clientKey ? null : draft.clientKey))
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className={styles.courseConfigurationEmpty}>
            {drafts.length
              ? 'Không tìm thấy khóa học phù hợp.'
              : 'Chưa có khóa học. Thêm khóa học đầu tiên để bắt đầu cấu hình danh mục.'}
          </div>
        )}
      </section>
    </AdaptiveModal>
  );
}
