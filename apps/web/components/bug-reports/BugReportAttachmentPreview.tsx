'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Image, Typography } from 'antd';
import type { BugReportAttachment } from '@mos-lab/shared';
import { ExternalLink, LoaderCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { AppIcon } from '../ui';

const { Text } = Typography;

export function BugReportAttachmentPreview({
  reportId,
  attachment,
  compact = false,
}: {
  reportId: number;
  attachment: BugReportAttachment;
  compact?: boolean;
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

  if (failed) return <Alert type="warning" showIcon message={`Không tải được ${attachment.fileName}`} />;
  if (!url) {
    return (
      <div className="flex min-h-20 items-center justify-center">
        <AppIcon icon={LoaderCircle} size="md" className="animate-spin" />
      </div>
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
