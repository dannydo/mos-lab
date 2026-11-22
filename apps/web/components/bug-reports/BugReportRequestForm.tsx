'use client';

import React from 'react';
import { Alert, Button, Checkbox, Collapse, Image, Input, Select, Upload, theme } from 'antd';
import { ImagePlus, X } from 'lucide-react';
import {
  BUG_REPORT_Z_INDEX,
  type BugReportContext,
  type BugReportExpertDetails,
  type BugReportExpertImpact,
  type FeatureRequestAudience,
  type RequestClassificationJob,
} from '@mos-lab/shared';
import { AppIcon } from '../ui';
import { RichTextEditor } from '../ui/rich-text';
import { GuidedRequestConversation } from './GuidedRequestConversation';
import type { RequestDraft, RequestDraftView } from './bug-report-drafts';
import { EXPERT_IMPACT_OPTIONS, FEATURE_AUDIENCE_OPTIONS, MAX_ATTACHMENTS } from './bug-report-surface.helpers';

function BugReportFileThumbnail({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = React.useState('');

  React.useEffect(() => {
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  if (!previewUrl) {
    return (
      <span aria-label={`Đang tạo ảnh xem trước ${file.name}`} className="h-[52px] w-[52px] shrink-0 rounded-md" />
    );
  }

  return (
    <Image
      alt={`Ảnh xem trước ${file.name}`}
      src={previewUrl}
      width={52}
      height={52}
      style={{ borderRadius: 6, objectFit: 'cover' }}
      preview={{
        mask: <span className="text-[10px] font-medium text-white">Xem</span>,
        zIndex: BUG_REPORT_Z_INDEX.PREVIEW,
      }}
    />
  );
}

interface BugReportRequestFormProps {
  activeView: 'bug' | 'feature';
  activeRequestView: RequestDraftView;
  activeDraft: RequestDraft;
  descriptionFieldId: string;
  pathname: string;
  context: BugReportContext | null;
  classification: RequestClassificationJob | null;
  expertDetailsExpanded: boolean;
  onExpertDetailsExpandedChange: (expanded: boolean) => void;
  rememberExpertDetails: boolean;
  onRememberExpertDetailsChange: (checked: boolean) => void;
  featureReason: string;
  onFeatureReasonChange: (value: string) => void;
  featureAudience: FeatureRequestAudience;
  onFeatureAudienceChange: (value: FeatureRequestAudience) => void;
  featureDesiredOutcome: string;
  onFeatureDesiredOutcomeChange: (value: string) => void;
  onConversationSession: (sessionId: string | null) => void;
  onSwitchRequestView: (nextView: RequestDraftView) => void;
  onDescriptionChange: (value: string) => void;
  onApplyGuidedDescription: (value: string) => void;
  onUpdateExpertDetails: (update: Partial<BugReportExpertDetails>) => void;
  onAddFiles: (files: File[], draftView: RequestDraftView) => void;
  onRemoveFile: (index: number) => void;
}

export function BugReportRequestForm({
  activeView,
  activeRequestView,
  activeDraft,
  descriptionFieldId,
  pathname,
  context,
  classification,
  expertDetailsExpanded,
  onExpertDetailsExpandedChange,
  rememberExpertDetails,
  onRememberExpertDetailsChange,
  featureReason,
  onFeatureReasonChange,
  featureAudience,
  onFeatureAudienceChange,
  featureDesiredOutcome,
  onFeatureDesiredOutcomeChange,
  onConversationSession,
  onSwitchRequestView,
  onDescriptionChange,
  onApplyGuidedDescription,
  onUpdateExpertDetails,
  onAddFiles,
  onRemoveFile,
}: BugReportRequestFormProps) {
  const { token } = theme.useToken();

  return (
    <div
      className="space-y-5"
      onPaste={(event) => {
        const pasted = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
        if (pasted.length) {
          event.preventDefault();
          onAddFiles(pasted, activeRequestView);
        }
      }}
    >
      {activeView === 'feature' ? (
        <Alert
          type="info"
          showIcon
          message="Bạn chỉ cần mô tả nhu cầu — AI Agent sẽ hỏi tiếp nếu còn thiếu"
          description="Bạn không cần viết đặc tả kỹ thuật. mOS chỉ hỏi thêm khi thật sự cần để hiểu nhu cầu."
        />
      ) : null}
      {classification && ['FAILED', 'EXPIRED'].includes(classification.status) ? (
        <Alert
          type={
            classification.status === 'COMPLETED'
              ? 'success'
              : classification.status === 'FAILED' || classification.status === 'EXPIRED'
                ? 'warning'
                : 'info'
          }
          showIcon
          message="Bạn vẫn có thể gửi yêu cầu ngay"
          description={classification.fallbackReason || 'mOS sẽ xem lại loại yêu cầu sau khi bạn gửi.'}
        />
      ) : null}
      <GuidedRequestConversation
        key={`${activeRequestView}:${activeDraft.description}`}
        description={activeDraft.description}
        requestType={activeView === 'feature' ? 'FEATURE' : 'BUG'}
        path={context?.path || pathname}
        pageTitle={context?.pageTitle || document.title}
        attachmentCount={activeDraft.files.length}
        onSession={onConversationSession}
        onTypeRecommendation={(type) => onSwitchRequestView(type === 'FEATURE' ? 'feature' : 'bug')}
        onApply={onApplyGuidedDescription}
      />
      <div>
        <label htmlFor={descriptionFieldId} className="mb-2 block text-sm font-semibold">
          {activeView === 'feature' ? 'Bạn muốn mOS giúp làm việc gì?' : 'Bạn đang gặp vấn đề gì?'}
        </label>
        <RichTextEditor
          key={activeRequestView}
          id={descriptionFieldId}
          autoFocus
          value={activeDraft.description}
          onChange={onDescriptionChange}
          maxLength={2000}
          rows={5}
          placeholder={
            activeView === 'feature'
              ? 'Ví dụ: Tôi muốn xem lịch sử khách đã đổi lịch ngay trong hồ sơ…'
              : 'Ví dụ: Tôi bấm Lưu nhưng popup vẫn đứng yên…'
          }
        />
        <p className="mb-0 mt-3 text-xs" style={{ color: token.colorTextSecondary }}>
          {activeView === 'feature'
            ? 'Không cần viết đặc tả kỹ thuật. Hãy mô tả công việc theo cách bạn đang làm hằng ngày.'
            : 'mOS tự đính kèm trang, popup, phiên bản và lỗi kỹ thuật gần nhất. Bạn không cần biết thuật ngữ kỹ thuật.'}
        </p>
      </div>

      <Collapse
        activeKey={expertDetailsExpanded ? ['expert'] : []}
        onChange={(keys) => onExpertDetailsExpandedChange(keys.includes('expert'))}
        items={[
          {
            key: 'expert',
            label: 'Thêm chi tiết cho người quen kỹ thuật',
            children: (
              <div className="space-y-4">
                <p className="m-0 text-sm" style={{ color: token.colorTextSecondary }}>
                  Không bắt buộc. Chi tiết này giúp mOS hiểu và xử lý nhanh hơn, nhưng bạn vẫn gửi được ngay.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="mos-expert-reproduction" className="mb-2 block text-sm font-semibold">
                      Bước tái hiện
                    </label>
                    <Input.TextArea
                      id="mos-expert-reproduction"
                      value={activeDraft.expertDetails.reproductionSteps || ''}
                      onChange={(event) => onUpdateExpertDetails({ reproductionSteps: event.target.value || null })}
                      maxLength={1200}
                      rows={3}
                      placeholder="Ví dụ: Mở Danh sách lỗi → zoom browser 150% → cuộn xuống cuối trang"
                    />
                  </div>
                  <div>
                    <label htmlFor="mos-expert-expected" className="mb-2 block text-sm font-semibold">
                      Kết quả mong đợi
                    </label>
                    <Input.TextArea
                      id="mos-expert-expected"
                      value={activeDraft.expertDetails.expectedResult || ''}
                      onChange={(event) => onUpdateExpertDetails({ expectedResult: event.target.value || null })}
                      maxLength={1200}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label htmlFor="mos-expert-actual" className="mb-2 block text-sm font-semibold">
                      Kết quả thực tế
                    </label>
                    <Input.TextArea
                      id="mos-expert-actual"
                      value={activeDraft.expertDetails.actualResult || ''}
                      onChange={(event) => onUpdateExpertDetails({ actualResult: event.target.value || null })}
                      maxLength={1200}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label htmlFor="mos-expert-impact" className="mb-2 block text-sm font-semibold">
                      Mức ảnh hưởng
                    </label>
                    <Select
                      id="mos-expert-impact"
                      aria-label="Mức ảnh hưởng"
                      value={activeDraft.expertDetails.impact || undefined}
                      onChange={(impact) =>
                        onUpdateExpertDetails({ impact: (impact as BugReportExpertImpact | undefined) ?? null })
                      }
                      options={EXPERT_IMPACT_OPTIONS}
                      placeholder="Chọn nếu bạn biết"
                      allowClear
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="mos-expert-environment" className="mb-2 block text-sm font-semibold">
                      Môi trường
                    </label>
                    <Input
                      id="mos-expert-environment"
                      value={activeDraft.expertDetails.environment || ''}
                      onChange={(event) => onUpdateExpertDetails({ environment: event.target.value || null })}
                      maxLength={500}
                      placeholder="Ví dụ: Chrome 124 · 4K · zoom 150%"
                    />
                  </div>
                  <div>
                    <label htmlFor="mos-expert-workaround" className="mb-2 block text-sm font-semibold">
                      Cách làm tạm thời
                    </label>
                    <Input
                      id="mos-expert-workaround"
                      value={activeDraft.expertDetails.workaround || ''}
                      onChange={(event) => onUpdateExpertDetails({ workaround: event.target.value || null })}
                      maxLength={1200}
                      placeholder="Nếu có"
                    />
                  </div>
                  <div>
                    <label htmlFor="mos-expert-related" className="mb-2 block text-sm font-semibold">
                      Ticket liên quan
                    </label>
                    <Input
                      id="mos-expert-related"
                      value={activeDraft.expertDetails.relatedTicket || ''}
                      onChange={(event) => onUpdateExpertDetails({ relatedTicket: event.target.value || null })}
                      maxLength={120}
                      placeholder="Ví dụ: MOS-BUG-17"
                    />
                  </div>
                </div>
                {activeView === 'feature' ? (
                  <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="mos-feature-reason" className="mb-2 block text-sm font-semibold">
                        Vì sao cải tiến này cần thiết?
                      </label>
                      <Input.TextArea
                        id="mos-feature-reason"
                        value={featureReason}
                        onChange={(event) => onFeatureReasonChange(event.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder="Hiện tại bạn phải làm thủ công, mất thời gian hoặc dễ sai ở bước nào?"
                      />
                    </div>
                    <div>
                      <label htmlFor="mos-feature-audience" className="mb-2 block text-sm font-semibold">
                        Ai sẽ sử dụng?
                      </label>
                      <Select
                        id="mos-feature-audience"
                        aria-label="Ai sẽ sử dụng chức năng"
                        value={featureAudience}
                        onChange={onFeatureAudienceChange}
                        options={FEATURE_AUDIENCE_OPTIONS}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="mos-feature-outcome" className="mb-2 block text-sm font-semibold">
                        Kết quả mong muốn
                      </label>
                      <Input
                        id="mos-feature-outcome"
                        value={featureDesiredOutcome}
                        onChange={(event) => onFeatureDesiredOutcomeChange(event.target.value)}
                        maxLength={2000}
                        placeholder="Ví dụ: Giảm còn 1 lần bấm"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <span className="text-sm" style={{ color: token.colorTextSecondary }}>
                    Độ đủ thông tin · {activeDraft.files.length ? 'đã có ảnh' : 'ảnh là tùy chọn'} · mOS tự lưu môi
                    trường.
                  </span>
                  <Checkbox
                    checked={rememberExpertDetails}
                    onChange={(event) => onRememberExpertDetailsChange(event.target.checked)}
                  >
                    Lưu cách nhập chi tiết này cho lần sau
                  </Checkbox>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Upload.Dragger
        key={`${activeRequestView}-upload`}
        accept="image/jpeg,image/png,image/webp"
        multiple
        showUploadList={false}
        disabled={activeDraft.processingImages || activeDraft.files.length >= MAX_ATTACHMENTS}
        beforeUpload={(file, selected) => {
          if (file.uid === selected[0]?.uid) onAddFiles(selected as File[], activeRequestView);
          return Upload.LIST_IGNORE;
        }}
      >
        <div className="flex flex-col items-center gap-2 py-2">
          <AppIcon icon={ImagePlus} size="lg" style={{ color: token.colorTextSecondary }} />
          <span className="text-sm font-medium">
            {activeView === 'feature' ? 'Thêm ảnh minh họa nhu cầu' : 'Thêm ảnh chụp lỗi nếu cần'}
          </span>
          <span className="text-xs" style={{ color: token.colorTextSecondary }}>
            Không bắt buộc · tối đa {MAX_ATTACHMENTS} ảnh · mỗi ảnh 5 MB
          </span>
        </div>
      </Upload.Dragger>

      {activeDraft.files.length > 0 && (
        <Image.PreviewGroup
          preview={{
            zIndex: BUG_REPORT_Z_INDEX.PREVIEW,
            countRender: (current: number, total: number) => (
              <span className="tabular-nums font-semibold tracking-wide">
                {current} / {total}
              </span>
            ),
          }}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeDraft.files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex min-w-0 items-center gap-3 rounded-lg border p-2"
                style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
              >
                <BugReportFileThumbnail file={file} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium" title={file.name}>
                    {file.name}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: token.colorTextSecondary }}>
                    {(file.size / 1024).toFixed(0)} KB · bấm ảnh để lướt xem
                  </div>
                </div>
                <Button
                  type="text"
                  size="small"
                  aria-label={`Xóa ảnh ${file.name}`}
                  icon={<AppIcon icon={X} size="sm" />}
                  onClick={() => onRemoveFile(index)}
                />
              </div>
            ))}
          </div>
        </Image.PreviewGroup>
      )}
    </div>
  );
}
