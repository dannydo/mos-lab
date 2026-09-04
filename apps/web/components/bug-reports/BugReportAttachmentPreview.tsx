'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Image, Typography } from 'antd';
import type { BugReportAttachment } from '@mos-lab/shared';
import { ExternalLink, ImageOff, LoaderCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { AppIcon } from '../ui';

const { Text } = Typography;

export function BugReportAttachmentPreview({
  reportId,
  attachment,
  compact = false,
  thumbnail = false,
}: {
  reportId: number;
  attachment: BugReportAttachment;
  compact?: boolean;
  /** A compact, click-to-enlarge preview for the reporter's evidence strip. */
  thumbnail?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    void apiClient.bugReports
      .attachment(reportId, attachment.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, reportId]);

  if (failed) {
    if (thumbnail) {
      return (
        <span
          className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-lg border"
          title="Ảnh này chưa có trong bản dữ liệu hiện tại"
          aria-label="Ảnh chưa có trong bản dữ liệu hiện tại"
        >
          <AppIcon icon={ImageOff} size="sm" />
        </span>
      );
    }
    return <Alert type="warning" showIcon message={`Không tải được ${attachment.fileName}`} />;
  }
  if (!url) {
    return (
      <div
        className={
          thumbnail
            ? 'flex h-[72px] w-[72px] items-center justify-center rounded-lg'
            : 'flex min-h-20 items-center justify-center'
        }
      >
        <AppIcon icon={LoaderCircle} size="md" className="animate-spin" />
      </div>
    );
  }

  if (thumbnail) {
    return (
      <Image
        src={url}
        alt={`Ảnh bạn đã gửi: ${attachment.fileName}`}
        width={72}
        height={72}
        preview={{ mask: 'Phóng to' }}
        className="rounded-lg object-cover"
        style={{ border: '1px solid currentColor', objectFit: 'cover' }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <Image
        src={url}
        alt={`Ảnh đính kèm ${attachment.fileName}`}
        className={compact ? 'max-h-40 rounded-lg object-contain' : 'max-h-60 rounded-lg object-contain'}
      />
      <div className="flex items-center justify-between gap-2">
        <Text ellipsis title={attachment.fileName} className="text-xs">
          {attachment.fileName}
        </Text>
        <Button
          type="link"
          size="small"
          aria-label={`Tải ảnh ${attachment.fileName}`}
          icon={<AppIcon icon={ExternalLink} size="sm" />}
          href={url}
          download={attachment.fileName}
        />
      </div>
    </div>
  );
}
