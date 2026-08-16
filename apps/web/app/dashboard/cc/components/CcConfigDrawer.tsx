'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Checkbox, Input, Button, Space, Typography, Spin, message, theme, Badge } from 'antd';
import { SearchOutlined, SaveOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';
import { CcStaffOption, removeVietnameseTones } from '@mos-lab/shared';

const { Text, Title } = Typography;

interface CcConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function CcConfigDrawer({ open, onClose, onSaveSuccess }: CcConfigDrawerProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allStaff, setAllStaff] = useState<CcStaffOption[]>([]);
  const [selectedCcIds, setSelectedCcIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');

  const loadCcConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.kpi.getCcConfig();
      if (res) {
        setAllStaff(res.allStaffOptions || []);
        setSelectedCcIds(res.activeCcIds || []);
      }
    } catch (err) {
      message.error('Không thể lấy danh sách cấu hình CC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCcConfig();
    }
  }, [open]);

  const filteredStaff = React.useMemo(() => {
    if (!searchText) return allStaff;
    const q = removeVietnameseTones(searchText);
    return allStaff.filter(
      (s) =>
        removeVietnameseTones(s.displayName).includes(q) ||
        (s.username && removeVietnameseTones(s.username).includes(q))
    );
  }, [allStaff, searchText]);

  const handleToggleStaff = (staffId: number, checked: boolean) => {
    if (checked) {
      setSelectedCcIds((prev) => [...prev, staffId]);
    } else {
      setSelectedCcIds((prev) => prev.filter((id) => id !== staffId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCcIds(filteredStaff.map((s) => s.staffId));
    } else {
      setSelectedCcIds([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.kpi.updateCcConfig(selectedCcIds);
      if (res && res.success) {
        message.success('Đã lưu danh sách CC toàn cục thành công!');
        onSaveSuccess();
        onClose();
      }
    } catch (err) {
      message.error('Không thể lưu cấu hình CC.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined className="text-amber-500" />
          <span style={{ color: token.colorText }} className="font-bold">
            Cấu Hình Danh Sách CC Toàn Cục (Global CC Config)
          </span>
        </div>
      }
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      footer={
        <div className="flex justify-between items-center px-2 py-2">
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            style={{ background: token.colorPrimary, fontWeight: '600' }}
          >
            Lưu Cấu Hình Global ({selectedCcIds.length} CC)
          </Button>
        </div>
      }
    >
      <div className="mb-4">
        <Text type="secondary" className="text-xs block mb-3">
          Tích chọn các nhân sự được công nhận là <strong>Client Consultant (CC)</strong>. Cấu hình này sẽ tự động áp
          dụng toàn cục trên Bảng xếp hạng CC Leaderboard, Báo cáo CC Xoay và các tab thưởng live.
        </Text>

        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm tên hoặc mã nhân viên..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          className="mb-3"
        />

        <div className="flex justify-between items-center px-1 mb-2">
          <Checkbox
            checked={filteredStaff.length > 0 && selectedCcIds.length === filteredStaff.length}
            indeterminate={selectedCcIds.length > 0 && selectedCcIds.length < filteredStaff.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            <span className="font-semibold text-xs">Chọn tất cả</span>
          </Checkbox>

          <Badge
            count={`${selectedCcIds.length} / ${allStaff.length} được chọn`}
            style={{ backgroundColor: '#52c41a' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="default" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
          {filteredStaff.map((staff) => {
            const isChecked = selectedCcIds.includes(staff.staffId);
            return (
              <div
                key={staff.staffId}
                className={`p-3 rounded-lg border flex items-center justify-between transition-colors cursor-pointer ${
                  isChecked
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                }`}
                onClick={() => handleToggleStaff(staff.staffId, !isChecked)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleStaff(staff.staffId, e.target.checked);
                    }}
                  />
                  <div>
                    <div className="font-semibold text-sm" style={{ color: token.colorText }}>
                      {staff.displayName}
                    </div>
                    {staff.username && (
                      <Text type="secondary" className="text-xs">
                        @{staff.username}
                      </Text>
                    )}
                  </div>
                </div>

                {isChecked ? <Badge status="success" text="CC Active" /> : <Badge status="default" text="Chưa bật" />}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
