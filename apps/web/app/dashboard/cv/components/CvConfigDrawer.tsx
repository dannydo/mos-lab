'use client';

import React, { useState, useEffect } from 'react';
import { Drawer, Checkbox, Input, Button, Typography, Spin, message, theme, Badge } from 'antd';
import { SearchOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { apiClient } from '../../../../lib/api-client';
import { CvStaffOption, removeVietnameseTones } from '@mos-lab/shared';

const { Text } = Typography;

interface CvConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function CvConfigDrawer({ open, onClose, onSaveSuccess }: CvConfigDrawerProps) {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allStaff, setAllStaff] = useState<CvStaffOption[]>([]);
  const [selectedCvIds, setSelectedCvIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');

  const loadCvConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.kpi.getCvConfig();
      if (res) {
        setAllStaff(res.allStaffOptions || []);
        setSelectedCvIds(res.activeCvIds || []);
      }
    } catch (err) {
      message.error('Không thể lấy danh sách cấu hình CV.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCvConfig();
    }
  }, [open]);

  const validStaffList = React.useMemo(() => {
    return allStaff.filter((s) => s.displayName && s.displayName.trim() !== '');
  }, [allStaff]);

  const filteredStaff = React.useMemo(() => {
    if (!searchText) return validStaffList;
    const q = removeVietnameseTones(searchText);
    return validStaffList.filter(
      (s) =>
        removeVietnameseTones(s.displayName).includes(q) ||
        (s.username && removeVietnameseTones(s.username).includes(q))
    );
  }, [validStaffList, searchText]);

  const handleToggleStaff = (staffId: number, checked: boolean) => {
    if (checked) {
      setSelectedCvIds((prev) => [...prev, staffId]);
    } else {
      setSelectedCvIds((prev) => prev.filter((id) => id !== staffId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCvIds(filteredStaff.map((s) => s.staffId));
    } else {
      setSelectedCvIds([]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiClient.kpi.updateCvConfig(selectedCvIds);
      if (res && res.success) {
        message.success('Đã lưu danh sách Chuyên viên toàn cục thành công!');
        onSaveSuccess();
        onClose();
      }
    } catch (err) {
      message.error('Không thể lưu cấu hình CV.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined className="text-blue-500" />
          <span style={{ color: token.colorText }} className="font-bold">
            Cấu Hình Danh Sách Chuyên Viên Toàn Cục (Global CV Config)
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
            Lưu Cấu Hình Global ({selectedCvIds.length} CV)
          </Button>
        </div>
      }
    >
      <div className="mb-4">
        <Text type="secondary" className="text-xs block mb-3">
          Tích chọn các nhân sự được công nhận là <strong>Chuyên viên (Technician / CV)</strong>. Cấu hình này sẽ tự
          động áp dụng toàn cục trên Báo cáo CV Xoay, CV Tip và CV Thu Nhập.
        </Text>

        <Input
          id="cv-config-drawer-search-input"
          name="cvConfigSearch"
          prefix={<SearchOutlined />}
          placeholder="Tìm tên hoặc mã nhân viên..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          className="mb-3"
        />

        <div className="flex justify-between items-center px-1 mb-2">
          <Checkbox
            checked={filteredStaff.length > 0 && selectedCvIds.length === filteredStaff.length}
            indeterminate={selectedCvIds.length > 0 && selectedCvIds.length < filteredStaff.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            <span className="font-semibold text-xs">Chọn tất cả</span>
          </Checkbox>

          <Badge
            count={`${selectedCvIds.length} / ${validStaffList.length} được chọn`}
            style={{ backgroundColor: '#1890ff' }}
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
            const isChecked = selectedCvIds.includes(staff.staffId);
            return (
              <div
                key={staff.staffId}
                className={`p-3 rounded-lg border flex items-center justify-between transition-colors cursor-pointer ${
                  isChecked
                    ? 'border-blue-500/50 bg-blue-500/5'
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

                {isChecked ? (
                  <Badge status="processing" text="CV Active" />
                ) : (
                  <Badge status="default" text="Chưa bật" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
