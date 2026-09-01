'use client';

import React from 'react';
import { Alert, Button, Pagination, Popconfirm, message, theme } from 'antd';
import { BookCopy, Check, CopyPlus, LibraryBig, Trash2 } from 'lucide-react';
import type {
  AcademyWorkshopQuiz,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  AdaptiveDrawer,
  AppIcon,
  DataSection,
  IconButton,
  SearchField,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import AcademyWorkshopQuizManager from './AcademyWorkshopQuizManager';
import { useAcademyWorkshopQuizTemplates } from './useAcademyWorkshopQuizTemplates';

export interface AcademyWorkshopQuizTemplateLibraryProps {
  open: boolean;
  workshopId: number;
  onClose: () => void;
  onApplied: (quiz: AcademyWorkshopQuiz) => void;
}

function mutationMessage(cause: unknown, fallback: string): string {
  const error = cause as { response?: { data?: { message?: string } }; message?: string };
  return error.response?.data?.message || error.message || fallback;
}

export default function AcademyWorkshopQuizTemplateLibrary({
  open,
  workshopId,
  onClose,
  onApplied,
}: AcademyWorkshopQuizTemplateLibraryProps) {
  const { token } = theme.useToken();
  const library = useAcademyWorkshopQuizTemplates(open);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [applying, setApplying] = React.useState(false);

  const selected = React.useMemo(
    () => library.data.find((template) => template.id === selectedId) || null,
    [library.data, selectedId]
  );

  React.useEffect(() => {
    if (!open || creating || library.loading) return;
    if (library.data.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!library.data.some((template) => template.id === selectedId)) {
      setSelectedId(library.data[0].id);
    }
  }, [creating, library.data, library.loading, open, selectedId]);

  const createTemplate = React.useCallback(
    async (dto: UpsertAcademyWorkshopQuizRequest) => {
      const template = await library.createTemplate(dto);
      setCreating(false);
      setSelectedId(template.id);
    },
    [library]
  );

  const updateTemplate = React.useCallback(
    async (templateId: number, dto: UpsertAcademyWorkshopQuizRequest) => {
      const template = await library.updateTemplate(templateId, dto);
      setSelectedId(template.id);
    },
    [library]
  );

  const saveQuestion = React.useCallback(
    async (templateId: number, questionId: number | null, dto: UpsertAcademyWorkshopQuestionRequest) => {
      await library.saveQuestion(templateId, questionId, dto);
    },
    [library]
  );

  const deleteQuestion = React.useCallback(
    async (templateId: number, questionId: number) => {
      await library.deleteQuestion(templateId, questionId);
    },
    [library]
  );

  const deleteTemplate = React.useCallback(async () => {
    if (!selected) return;
    try {
      await library.deleteTemplate(selected.id);
      setSelectedId(null);
      setCreating(false);
      message.success('Đã xóa mẫu câu hỏi. Các game đã tạo từ mẫu vẫn được giữ nguyên.');
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể xóa mẫu câu hỏi.'));
    }
  }, [library, selected]);

  const applyTemplate = React.useCallback(async () => {
    if (!selected) return;
    setApplying(true);
    try {
      const quiz = await apiClient.academySales.workshops.applyQuizTemplate(workshopId, selected.id);
      onApplied(quiz);
      message.success(`Đã dùng mẫu “${selected.title}” cho workshop.`);
      onClose();
    } catch (cause) {
      message.error(mutationMessage(cause, 'Không thể dùng mẫu cho workshop này.'));
    } finally {
      setApplying(false);
    }
  }, [onApplied, onClose, selected, workshopId]);

  const selectTemplate = React.useCallback((templateId: number) => {
    setCreating(false);
    setSelectedId(templateId);
  }, []);

  return (
    <AdaptiveDrawer
      open={open}
      intent="data"
      width="min(94vw, 1280px)"
      title={
        <span className="inline-flex items-center gap-3">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: token.colorPrimaryBg, color: token.colorPrimary }}
          >
            <AppIcon icon={LibraryBig} />
          </span>
          <span>
            <span className="block text-sm font-semibold">Thư viện mẫu câu hỏi</span>
            <span className="block text-xs font-normal opacity-60">Chuẩn hóa game trước khi dùng trong workshop</span>
          </span>
        </span>
      }
      onClose={onClose}
      destroyOnHidden
    >
      <Alert
        className="mb-3"
        type="info"
        showIcon
        message="Mỗi workshop nhận một bản sao độc lập"
        description="Dùng mẫu chỉ sao chép câu hỏi sang game mới; câu trả lời, điểm, BXH và phần thưởng không được dùng chung."
      />

      <div className="grid items-start gap-3 xl:grid-cols-[288px_minmax(0,1fr)]">
        <DataSection
          className="h-fit xl:sticky xl:top-0"
          title={
            <span className="inline-flex items-center gap-2">
              <AppIcon icon={LibraryBig} size="sm" />
              Mẫu câu hỏi
            </span>
          }
          extra={
            <Button
              type="primary"
              size="small"
              icon={<AppIcon icon={CopyPlus} />}
              onClick={() => {
                setCreating(true);
                setSelectedId(null);
              }}
            >
              Tạo mẫu
            </Button>
          }
        >
          <SearchField
            behavior="filter"
            value={library.search}
            placeholder="Tìm tên mẫu không dấu…"
            onChange={(event) => library.setSearch(event.target.value)}
          />

          {library.loading ? (
            <StatePanel kind="loading" title="Đang tải thư viện…" minHeight={240} surface={false} />
          ) : library.error ? (
            <StatePanel
              kind="error"
              title="Không thể tải thư viện"
              description={library.error}
              minHeight={240}
              surface={false}
              extra={<Button onClick={() => void library.refresh()}>Thử lại</Button>}
            />
          ) : library.data.length === 0 ? (
            <StatePanel
              kind="empty"
              title={library.search ? 'Không tìm thấy mẫu phù hợp' : 'Chưa có mẫu câu hỏi'}
              description={
                library.search ? 'Thử một từ khóa khác.' : 'Tạo mẫu mới hoặc lưu bộ câu hỏi đang có thành mẫu.'
              }
              minHeight={240}
              surface={false}
              extra={
                !library.search ? (
                  <Button type="primary" onClick={() => setCreating(true)}>
                    Tạo mẫu đầu tiên
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="mt-3 space-y-2">
              {library.data.map((template) => {
                const active = !creating && selectedId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className="w-full rounded-xl border p-2.5 text-left transition-colors"
                    style={{
                      borderColor: active ? token.colorPrimary : token.colorBorderSecondary,
                      background: active ? token.colorPrimaryBg : token.colorBgContainer,
                      color: token.colorText,
                    }}
                    aria-pressed={active}
                    onClick={() => selectTemplate(template.id)}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{template.title}</span>
                        <span className="mt-1 block line-clamp-2 text-xs opacity-60">
                          {template.description || 'Không có mô tả'}
                        </span>
                      </span>
                      {active ? (
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{ background: token.colorPrimary, color: token.colorTextLightSolid }}
                        >
                          <AppIcon icon={Check} size="sm" />
                        </span>
                      ) : null}
                    </span>
                    <StatusTag label={`${template.questions.length} câu`} className="!mb-0 !mt-2 tabular-nums" />
                  </button>
                );
              })}

              <div className="flex justify-center pt-2">
                <Pagination
                  size="small"
                  current={library.page}
                  pageSize={library.pageSize}
                  total={library.total}
                  showSizeChanger
                  pageSizeOptions={['10', '20', '50', '100']}
                  showTotal={(total) => `${total} mẫu`}
                  onChange={library.setPagination}
                />
              </div>
            </div>
          )}
        </DataSection>

        <div className="min-w-0">
          <AcademyWorkshopQuizManager
            workshopId={workshopId}
            mode="TEMPLATE"
            quiz={creating ? null : selected}
            onCreateQuiz={createTemplate}
            onUpdateQuiz={updateTemplate}
            onSaveQuestion={saveQuestion}
            onDeleteQuestion={deleteQuestion}
            extraActions={
              selected && !creating ? (
                <>
                  <Popconfirm
                    title="Xóa mẫu câu hỏi này?"
                    description="Các game đã tạo từ mẫu vẫn được giữ nguyên."
                    okText="Xóa mẫu"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void deleteTemplate()}
                  >
                    <IconButton label="Xóa mẫu" icon={Trash2} tone="danger" />
                  </Popconfirm>
                  <Popconfirm
                    title="Dùng mẫu cho workshop này?"
                    description="Game bản nháp hiện có sẽ được thay toàn bộ câu hỏi theo mẫu này. Nếu chưa có, hệ thống tạo game nháp mới. Game đang chạy phải kết thúc trước."
                    okText="Thay bản nháp"
                    cancelText="Hủy"
                    onConfirm={() => void applyTemplate()}
                  >
                    <Button
                      type="primary"
                      loading={applying}
                      disabled={selected.questions.length === 0}
                      icon={<AppIcon icon={BookCopy} />}
                    >
                      Dùng cho workshop
                    </Button>
                  </Popconfirm>
                </>
              ) : null
            }
          />
        </div>
      </div>
    </AdaptiveDrawer>
  );
}
