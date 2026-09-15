'use client';

import React from 'react';
import { Drawer, Typography, Divider, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';
import { renderAuditStatusTag } from '../../types/qa-shop.types';

const { Title, Text } = Typography;

interface AuditDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedAudit: SafeAny | null;
}

export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({ open, onClose, selectedAudit }) => {
  return (
    <Drawer title={`Chi Tiết Biên Bản Kiểm Tra ${selectedAudit?.id || ''}`} open={open} onClose={onClose} width={600}>
      {selectedAudit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {selectedAudit.branchName}
              </Title>
              <Text className="text-xs text-slate-600 dark:text-slate-400">
                Ngày: {selectedAudit.auditDate} | Auditor: {selectedAudit.auditorName}
              </Text>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                {selectedAudit.overallScore || 92}đ
              </div>
              {renderAuditStatusTag(selectedAudit.status, selectedAudit)}
            </div>
          </div>

          <Divider>VI PHẠM CẦN KHẮC PHỤC</Divider>
          {selectedAudit.actionItems && selectedAudit.actionItems.length > 0 ? (
            <div className="space-y-2">
              {selectedAudit.actionItems.map((item: string, idx: number) => (
                <Alert key={idx} message={item} type="warning" showIcon icon={<ExclamationCircleOutlined />} />
              ))}
            </div>
          ) : (
            <Text className="text-xs text-emerald-500">Không có vi phạm phát hiện trong đợt kiểm tra.</Text>
          )}
        </div>
      )}
    </Drawer>
  );
};
