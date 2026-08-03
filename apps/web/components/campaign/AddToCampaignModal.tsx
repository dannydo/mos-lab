'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Select, Typography, Space, Button, message, Tag, Spin, Empty } from 'antd';
import { RocketOutlined, FieldTimeOutlined, GiftOutlined } from '@ant-design/icons';
import { apiClient } from '../../lib/api-client';
import { Campaign } from '@mos-lab/shared';
import { useTheme } from '../../context/ThemeContext';
import CampaignPlusIcon from '../icons/CampaignPlusIcon';

const { Text, Paragraph } = Typography;

interface AddToCampaignModalProps {
  visible: boolean;
  onClose: () => void;
  selectedCustomerIds: number[];
  customerName?: string;
  onSuccess: () => void;
}

export function AddToCampaignModal({
  visible,
  onClose,
  selectedCustomerIds,
  customerName,
  onSuccess,
}: AddToCampaignModalProps) {
  const { themeMode } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      fetchActiveCampaigns();
    } else {
      setSelectedCampaignId(null);
    }
  }, [visible]);

  const fetchActiveCampaigns = async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.campaigns.list({ status: 'ACTIVE' });
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      setCampaigns(list);
      if (list.length > 0) {
        setSelectedCampaignId(list[0].id);
      }
    } catch (err) {
      console.error('Fetch active campaigns error:', err);
      message.error('Không thể tải danh sách chiến dịch');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCampaignId) {
      message.warning('Vui lòng chọn 1 chiến dịch');
      return;
    }
    if (!selectedCustomerIds || selectedCustomerIds.length === 0) {
      message.warning('Không có khách hàng nào được chọn');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
      const res = await apiClient.campaigns.addCustomers(selectedCampaignId, {
        customerIds: selectedCustomerIds,
      });

      message.success(
        res?.message || `Đã thêm ${selectedCustomerIds.length} khách hàng vào chiến dịch "${selectedCampaign?.name}"!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Add customers to campaign error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể thêm khách hàng vào chiến dịch';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <Modal
      title={
        <Space>
          <CampaignPlusIcon fontSize={18} badgeBg="#047857" />
          <span className="font-bold">
            {customerName
              ? `Thêm khách hàng "${customerName}" vào Chiến dịch`
              : `Thêm ${selectedCustomerIds.length} khách hàng vào Chiến dịch`}
          </span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<CampaignPlusIcon fontSize={16} badgeBg="#047857" />}
          loading={submitting}
          disabled={!selectedCampaignId || campaigns.length === 0}
          onClick={handleConfirm}
          style={{
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            fontWeight: 'bold',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Xác nhận thêm vào chiến dịch
        </Button>,
      ]}
      width={540}
      destroyOnClose
    >
      <div className="py-2">
        <Paragraph type="secondary" className="text-xs mb-4">
          Khách hàng được thêm vào chiến dịch sẽ tự động chuyển sang theo dõi riêng của chiến dịch đó và ẩn khỏi danh
          sách NYC chính.
        </Paragraph>

        {loading ? (
          <div className="text-center py-8">
            <Spin tip="Đang tải danh sách chiến dịch..." />
          </div>
        ) : campaigns.length === 0 ? (
          <Empty description="Hiện chưa có chiến dịch custom nào ở trạng thái HOẠT ĐỘNG." className="my-4">
            <Text type="secondary" className="text-xs">
              Vui lòng tạo chiến dịch mới tại trang <strong>Quản lý Chiến dịch NYC</strong> trước.
            </Text>
          </Empty>
        ) : (
          <div className="space-y-4">
            <div>
              <Text strong className="block text-xs mb-1.5">
                Chọn Chiến Dịch Đích:
              </Text>
              <Select
                value={selectedCampaignId}
                onChange={(val) => setSelectedCampaignId(val)}
                className="w-full"
                size="large"
                options={campaigns.map((c) => ({
                  value: c.id,
                  label: (
                    <div className="flex justify-between items-center w-full pr-2">
                      <span className="font-semibold">{c.name}</span>
                      <Tag color="green" className="m-0 text-[10px]">
                        {c._count?.customers ?? 0} KH hiện tại
                      </Tag>
                    </div>
                  ),
                }))}
              />
            </div>

            {selectedCampaign && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-2 ${
                  themeMode === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center font-medium">
                  <span className="text-slate-400">Slug đường dẫn:</span>
                  <code className="text-emerald-500 font-mono">/dashboard/nyc/campaigns/{selectedCampaign.slug}</code>
                </div>
                {selectedCampaign.description && (
                  <div>
                    <span className="text-slate-400">Mô tả: </span>
                    <span>{selectedCampaign.description}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-slate-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <FieldTimeOutlined /> {selectedCampaign._count?.touchpoints ?? 0} Chạm
                  </span>
                  <span className="flex items-center gap-1">
                    <GiftOutlined /> {selectedCampaign._count?.promotions ?? 0} Ưu đãi
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
