'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Tooltip, Tag, message, Badge } from 'antd';
import { PushpinOutlined, PushpinFilled, StarOutlined, StarFilled } from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';
import { Customer, SafeAny } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

interface RetainDataButtonProps {
  customer?: Customer;
  selectedRowKeys?: React.Key[];
  onSuccess?: () => void;
  mode?: 'single' | 'bulk' | 'bulk-compact' | 'quota-badge';
  retainedOnly?: boolean;
  onToggleRetainedFilter?: () => void;
}

export const RetainDataButton: React.FC<RetainDataButtonProps> = ({
  customer,
  selectedRowKeys = [],
  onSuccess,
  mode = 'single',
  retainedOnly = false,
  onToggleRetainedFilter,
}) => {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    retainedCount: number;
    quotaLimit: number;
    remainingQuota: number;
  } | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      const info = await apiClient.customers.getRetainQuota();
      setQuotaInfo(info);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const handleToggleRetain = async (isRetained: boolean) => {
    const ids = customer ? [customer.id] : selectedRowKeys.map((k) => Number(k));
    if (ids.length === 0) {
      message.warning('Vui lòng chọn khách hàng!');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.customers.retain({ customerIds: ids, isRetained });
      if (res.success) {
        message.success(res.message);
        await fetchQuota();
        if (onSuccess) onSuccess();
      }
    } catch (error: SafeAny) {
      const errMsg = error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật giữ data.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'quota-badge') {
    if (!quotaInfo) return null;
    return (
      <Tooltip
        title={
          retainedOnly
            ? 'Đang lọc xem KH đã giữ. Bấm để hiển thị tất cả KH.'
            : `Hạn ngạch giữ data: ${quotaInfo.retainedCount}/${quotaInfo.quotaLimit} data. Bấm để LỌC CHỈ XEM KH ĐÃ GIỮ!`
        }
      >
        <Tag
          color={
            retainedOnly
              ? 'gold'
              : quotaInfo.remainingQuota === 0
                ? 'error'
                : quotaInfo.remainingQuota <= 5
                  ? 'warning'
                  : 'blue'
          }
          style={{
            borderRadius: '12px',
            padding: '4px 12px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: retainedOnly ? '1px solid #d4b106' : undefined,
            boxShadow: retainedOnly ? '0 0 8px rgba(212, 168, 75, 0.4)' : undefined,
          }}
          onClick={onToggleRetainedFilter}
        >
          <PushpinFilled style={{ color: retainedOnly ? '#fff' : undefined }} />
          <span>
            {retainedOnly ? '📌 Đang lọc data đã giữ: ' : 'Đã giữ '}
            {quotaInfo.retainedCount}/{quotaInfo.quotaLimit} data
          </span>
        </Tag>
      </Tooltip>
    );
  }

  if (mode === 'bulk' || mode === 'bulk-compact') {
    return (
      <Tooltip title="Giữ lại các data được chọn để không bị tự động thu hồi khi hết hạn">
        <Button
          icon={<PushpinOutlined />}
          aria-label={`Giữ lại ${selectedRowKeys.length} data`}
          shape={mode === 'bulk-compact' ? 'circle' : undefined}
          loading={loading}
          disabled={selectedRowKeys.length === 0}
          onClick={() => handleToggleRetain(true)}
        >
          {mode === 'bulk' ? `Giữ lại data (${selectedRowKeys.length})` : null}
        </Button>
      </Tooltip>
    );
  }

  // Single mode (per row or card)
  const isRetained = !!customer?.isRetained;
  const hasSmartHint = !!customer?.lastBookingDate || !!customer?.callbackDate;

  return (
    <Tooltip
      title={
        isRetained
          ? 'Đã chọn giữ data này (Không bị thu hồi tự động khi hết hạn)'
          : hasSmartHint
            ? 'Gợi ý: Khách hàng có Lịch hẹn/Hẹn gọi lại, bấm để Giữ data!'
            : 'Bấm để Giữ data này không bị thu hồi khi hết hạn'
      }
    >
      <Button
        type={isRetained ? 'primary' : 'default'}
        size="small"
        shape="circle"
        icon={
          isRetained ? (
            <PushpinFilled style={{ color: '#fff' }} />
          ) : (
            <PushpinOutlined style={{ color: hasSmartHint ? '#faad14' : undefined }} />
          )
        }
        loading={loading}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleRetain(!isRetained);
        }}
        style={{
          borderColor: hasSmartHint && !isRetained ? '#faad14' : undefined,
        }}
      />
    </Tooltip>
  );
};
