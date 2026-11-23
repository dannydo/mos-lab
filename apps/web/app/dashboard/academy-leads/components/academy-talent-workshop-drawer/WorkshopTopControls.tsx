'use client';

import React from 'react';
import { Button, Tooltip } from 'antd';
import { GripVertical, Maximize2, Pencil, X } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import styles from '../AcademyTalentWorkshop.module.css';

export interface WorkshopTopControlsProps {
  layoutMode: 'viewport' | 'custom';
  editMode: boolean;
  step: 1 | 2;
  canEditLadder: boolean;
  canManageCourses: boolean;
  hasLadderConfiguration: boolean;
  canSaveLadderConfiguration: boolean;
  canSaveCourseConfiguration: boolean;
  onSetLayoutMode: (mode: 'viewport' | 'custom') => void;
  onToggleGlobalEdit: () => void;
  onClose: () => void;
}

export function WorkshopTopControls({
  layoutMode,
  editMode,
  step,
  canEditLadder,
  canManageCourses,
  hasLadderConfiguration,
  canSaveLadderConfiguration,
  canSaveCourseConfiguration,
  onSetLayoutMode,
  onToggleGlobalEdit,
  onClose,
}: WorkshopTopControlsProps) {
  const editButtonLabel = editMode
    ? 'Tắt chế độ chỉnh sửa toàn cục'
    : step === 2
      ? 'Chỉnh sửa khóa học toàn cục'
      : 'Chỉnh sửa bảng quyền lợi toàn cục';

  const editButtonDisabled =
    step === 2
      ? !canManageCourses || !canSaveCourseConfiguration
      : !canEditLadder || !hasLadderConfiguration || !canSaveLadderConfiguration;

  return (
    <div className={styles.topControls} aria-label="Điều khiển hiển thị workshop">
      <Tooltip title="Tự căn theo màn hình (margin 20px)">
        <Button
          aria-label="Tự căn workshop theo màn hình"
          className={`${styles.topControlButton} ${layoutMode === 'viewport' ? styles.topControlButtonActive : ''}`}
          icon={<AppIcon icon={Maximize2} />}
          size="small"
          type="text"
          onClick={() => onSetLayoutMode('viewport')}
        />
      </Tooltip>
      <Tooltip title="Tùy chỉnh kích thước (kéo góc phải dưới để resize, tự nhớ sau F5)">
        <Button
          aria-label="Tùy chỉnh kích thước workshop"
          className={`${styles.topControlButton} ${layoutMode === 'custom' ? styles.topControlButtonActive : ''}`}
          icon={<AppIcon icon={GripVertical} />}
          size="small"
          type="text"
          onClick={() => onSetLayoutMode('custom')}
        />
      </Tooltip>
      {(canEditLadder || canManageCourses) && (
        <Tooltip title={editButtonLabel}>
          <Button
            aria-label={editButtonLabel}
            className={`${styles.topControlButton} ${editMode ? styles.topControlButtonActive : ''}`}
            disabled={editButtonDisabled}
            icon={<AppIcon icon={Pencil} />}
            size="small"
            type="text"
            onClick={onToggleGlobalEdit}
          />
        </Tooltip>
      )}
      <span className={styles.topControlDivider} aria-hidden="true" />
      <Tooltip title="Đóng workshop">
        <Button
          aria-label="Đóng workshop Tố Chất"
          className={`${styles.topControlButton} ${styles.topControlCloseButton}`}
          icon={<AppIcon icon={X} />}
          size="small"
          type="text"
          onClick={onClose}
        />
      </Tooltip>
    </div>
  );
}
