'use client';

import React from 'react';
import { Button, Popconfirm, Space } from 'antd';
import { CirclePlus, Gamepad2, Pencil, Play, Trophy } from 'lucide-react';
import type { AcademyWorkshopQuiz } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

export interface QuizHeaderActionsProps {
  quiz: AcademyWorkshopQuiz | null;
  templateMode: boolean;
  editable: boolean;
  questionExpired: boolean;
  submitting: boolean;
  hasSaveAsTemplate: boolean;
  onOpenQuizModal: (edit: boolean) => void;
  onOpenQuestionDrawer: () => void;
  onCloneQuiz: () => void;
  onCompleteQuiz: () => void;
  onOpenLiveControl?: () => void;
  onSaveAsTemplate: () => void;
  onOpenTemplateLibrary?: () => void;
  extraActions?: React.ReactNode;
}

export function QuizHeaderActions({
  quiz,
  templateMode,
  editable,
  questionExpired,
  submitting,
  hasSaveAsTemplate,
  onOpenQuizModal,
  onOpenQuestionDrawer,
  onCloneQuiz,
  onCompleteQuiz,
  onOpenLiveControl,
  onSaveAsTemplate,
  onOpenTemplateLibrary,
  extraActions,
}: QuizHeaderActionsProps) {
  return (
    <Space wrap>
      {editable && quiz ? (
        <>
          <Button icon={<AppIcon icon={Pencil} />} onClick={() => onOpenQuizModal(true)}>
            {templateMode ? 'Sửa thông tin mẫu' : 'Sửa tên game'}
          </Button>
          <Button
            type={templateMode ? 'default' : 'primary'}
            icon={<AppIcon icon={CirclePlus} />}
            onClick={onOpenQuestionDrawer}
          >
            Thêm câu hỏi
          </Button>
        </>
      ) : null}
      {!quiz ? (
        <Button type="primary" icon={<AppIcon icon={Gamepad2} />} onClick={() => onOpenQuizModal(false)}>
          {templateMode ? 'Tạo mẫu mới' : 'Tạo bộ câu hỏi mới'}
        </Button>
      ) : null}
      {!templateMode && quiz?.status === 'COMPLETED' ? (
        <Button type="primary" loading={submitting} icon={<AppIcon icon={Pencil} />} onClick={onCloneQuiz}>
          Tạo bản chỉnh sửa
        </Button>
      ) : null}
      {!templateMode && quiz && !editable && quiz.status !== 'COMPLETED' ? (
        <>
          <Popconfirm
            title="Chốt game hiện tại?"
            description="Kết quả và phần thưởng sẽ được khóa; sau đó bạn có thể tạo một bản nháp để chỉnh sửa."
            okText="Chốt game"
            cancelText="Hủy"
            onConfirm={onCompleteQuiz}
          >
            <Button type={questionExpired ? 'primary' : 'default'} loading={submitting}>
              Chốt game
            </Button>
          </Popconfirm>
          <Button icon={<AppIcon icon={Play} />} onClick={onOpenLiveControl}>
            Mở Live Control
          </Button>
        </>
      ) : null}
      {!templateMode && quiz && hasSaveAsTemplate ? (
        <Button loading={submitting} icon={<AppIcon icon={Trophy} />} onClick={onSaveAsTemplate}>
          Lưu thành mẫu
        </Button>
      ) : null}
      {!templateMode && onOpenTemplateLibrary ? (
        <Button icon={<AppIcon icon={Gamepad2} />} onClick={onOpenTemplateLibrary}>
          Thư viện mẫu
        </Button>
      ) : null}
      {extraActions}
    </Space>
  );
}
