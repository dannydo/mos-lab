'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Form,
  InputNumber,
  Button,
  Checkbox,
  Input,
  Space,
  Divider,
  Typography,
  message,
  Spin,
  theme,
  Tabs,
  Badge,
} from 'antd';
import { SettingOutlined, SaveOutlined, CalculatorOutlined, TeamOutlined, SearchOutlined } from '@ant-design/icons';
import { BkStaffOption, BkSalaryConfig, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';

const { Text } = Typography;

interface BkConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BkConfigDrawer({ open, onClose, onSuccess }: BkConfigDrawerProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [allStaff, setAllStaff] = useState<BkStaffOption[]>([]);
  const [selectedBkIds, setSelectedBkIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bk.getConfig();
      setAllStaff(res.allStaffOptions || []);
      setSelectedBkIds(res.activeBkIds || []);

      const cfg = res.config || {};

      form.setFieldsValue({
        baseSalary: cfg.baseSalary || 5500000,
        tipsPercent: cfg.tipsPercent || 7,

        fullSet0: cfg.clientBonusFullSet?.discount0 || 35000,
        fullSet30: cfg.clientBonusFullSet?.discount30 || 12000,
        fullSet50: cfg.clientBonusFullSet?.discount50 || 6000,
        fullSetMore: cfg.clientBonusFullSet?.discountMore || 1000,

        refill30: cfg.clientBonusRefill?.discount30 || 9000,
        refill50: cfg.clientBonusRefill?.discount50 || 6000,
        refillMore: cfg.clientBonusRefill?.discountMore || 1000,

        done100: cfg.doneBonusTiers?.[0]?.bonus || 300000,
        done150: cfg.doneBonusTiers?.[1]?.bonus || 600000,
        done200: cfg.doneBonusTiers?.[2]?.bonus || 900000,
        done250: cfg.doneBonusTiers?.[3]?.bonus || 1200000,
        done300: cfg.doneBonusTiers?.[4]?.bonus || 1500000,
        done350: cfg.doneBonusTiers?.[5]?.bonus || 1800000,
        done400: cfg.doneBonusTiers?.[6]?.bonus || 2100000,
        done450: cfg.doneBonusTiers?.[7]?.bonus || 2400000,
        done500: cfg.doneBonusTiers?.[8]?.bonus || 2700000,

        missed10: cfg.missedBonusTiers?.[0]?.bonus || 1000000,
        missed15: cfg.missedBonusTiers?.[1]?.bonus || 500000,
        missed20: cfg.missedBonusTiers?.[2]?.bonus || 0,
        missed25: cfg.missedBonusTiers?.[3]?.bonus || -500000,
        missedMore: cfg.missedBonusTiers?.[4]?.bonus || -1000000,

        rev50M: cfg.revBonusTiers?.[0]?.rate || 0.7,
        rev100M: cfg.revBonusTiers?.[1]?.rate || 0.8,
        rev150M: cfg.revBonusTiers?.[2]?.rate || 0.9,
        rev200M: cfg.revBonusTiers?.[3]?.rate || 1.0,
        rev250M: cfg.revBonusTiers?.[4]?.rate || 1.1,
        rev300M: cfg.revBonusTiers?.[5]?.rate || 1.2,
      });
    } catch (err) {
      console.error('Error loading BK config', err);
      message.error('Lỗi tải cấu hình BK');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const filteredStaff = React.useMemo(() => {
    if (!searchText) return allStaff;
    const q = removeVietnameseTones(searchText);
    return allStaff.filter(
      (s) =>
        removeVietnameseTones(s.displayName).includes(q) ||
        (s.username && removeVietnameseTones(s.username).includes(q)) ||
        (s.store && removeVietnameseTones(s.store).includes(q))
    );
  }, [allStaff, searchText]);

  const handleToggleStaff = (staffId: number, checked: boolean) => {
    if (checked) {
      setSelectedBkIds((prev) => [...prev, staffId]);
    } else {
      setSelectedBkIds((prev) => prev.filter((id) => id !== staffId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBkIds(filteredStaff.map((s) => s.staffId));
    } else {
      setSelectedBkIds([]);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payloadConfig: Partial<BkSalaryConfig> = {
        baseSalary: values.baseSalary,
        tipsPercent: values.tipsPercent,
        clientBonusFullSet: {
          discount0: values.fullSet0,
          discount30: values.fullSet30,
          discount50: values.fullSet50,
          discountMore: values.fullSetMore,
        },
        clientBonusRefill: {
          discount30: values.refill30,
          discount50: values.refill50,
          discountMore: values.refillMore,
        },
        doneBonusTiers: [
          { minCount: 100, bonus: values.done100 },
          { minCount: 150, bonus: values.done150 },
          { minCount: 200, bonus: values.done200 },
          { minCount: 250, bonus: values.done250 },
          { minCount: 300, bonus: values.done300 },
          { minCount: 350, bonus: values.done350 },
          { minCount: 400, bonus: values.done400 },
          { minCount: 450, bonus: values.done450 },
          { minCount: 500, bonus: values.done500 },
        ],
        missedBonusTiers: [
          { maxRate: 10, bonus: values.missed10 },
          { maxRate: 15, bonus: values.missed15 },
          { maxRate: 20, bonus: values.missed20 },
          { maxRate: 25, bonus: values.missed25 },
          { maxRate: 100, bonus: values.missedMore },
        ],
        revBonusTiers: [
          { minRev: 50000000, rate: values.rev50M },
          { minRev: 100000000, rate: values.rev100M },
          { minRev: 150000000, rate: values.rev150M },
          { minRev: 200000000, rate: values.rev200M },
          { minRev: 250000000, rate: values.rev250M },
          { minRev: 300000000, rate: values.rev300M },
        ],
      };

      await apiClient.bk.saveConfig({
        activeBkIds: selectedBkIds,
        config: payloadConfig,
      });

      message.success('Cập nhật cấu hình Telesales thành công!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving BK config', err);
      message.error('Lỗi khi lưu cấu hình Telesales');
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: 'formula',
      label: (
        <span className="flex items-center gap-2">
          <CalculatorOutlined />
          <span>Công Thức Lương & Thưởng</span>
        </span>
      ),
      children: (
        <Form form={form} layout="vertical" className="space-y-6 pt-2">
          {/* Section 1 */}
          <div>
            <h4 className="text-sm font-bold text-amber-500 uppercase mb-3">1. Lương Cơ Bản & Tips</h4>
            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="baseSalary" label="Lương cứng cơ bản (Based)">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  addonAfter="đ"
                />
              </Form.Item>
              <Form.Item name="tipsPercent" label="Phần trăm thưởng Tips">
                <InputNumber className="w-full tabular-nums" min={0} max={100} addonAfter="%" />
              </Form.Item>
            </div>
          </div>

          <Divider className="my-2" />

          {/* Section 2 */}
          <div>
            <h4 className="text-sm font-bold text-amber-500 uppercase mb-3">
              2. Thưởng Check-in Nối Mi Mới (Full Set)
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <Form.Item name="fullSet0" label="Không giảm (0%)">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="fullSet30" label="Giảm <= 30%">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="fullSet50" label="Giảm <= 50%">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="fullSetMore" label="Giảm cực lớn">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </div>
          </div>

          <Divider className="my-2" />

          {/* Section 3 */}
          <div>
            <h4 className="text-sm font-bold text-amber-500 uppercase mb-3">3. Thưởng Check-in Dặm Mi (Refill)</h4>
            <div className="grid grid-cols-3 gap-3">
              <Form.Item name="refill30" label="Giảm <= 30%">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="refill50" label="Giảm <= 50%">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="refillMore" label="Giảm cực lớn">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </div>
          </div>

          <Divider className="my-2" />

          {/* Section 4 */}
          <div>
            <h4 className="text-sm font-bold text-amber-500 uppercase mb-3">
              4. Thưởng Mốc Đạt Khách Hoàn Thành (DONE)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <Form.Item name="done100" label="Đạt >= 100">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done150" label="Đạt >= 150">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done200" label="Đạt >= 200">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done250" label="Đạt >= 250">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done300" label="Đạt >= 300">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done350" label="Đạt >= 350">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done400" label="Đạt >= 400">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done450" label="Đạt >= 450">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="done500" label="Đạt >= 500">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </div>
          </div>

          <Divider className="my-2" />

          {/* Section 5 */}
          <div>
            <h4 className="text-sm font-bold text-amber-500 uppercase mb-3">
              5. Thưởng/Phạt Tỷ Lệ Lỡ Hẹn (Missed Call Rate)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="missed10" label="Tỷ lệ lỡ <= 10% (Thưởng)">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="missed15" label="Tỷ lệ lỡ <= 15% (Thưởng)">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="missed20" label="Tỷ lệ lỡ <= 20% (Hòa)">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="missed25" label="Tỷ lệ lỡ <= 25% (Hòa)">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
              <Form.Item name="missedMore" label="Tỷ lệ lỡ > 25% (Phạt)" className="col-span-2">
                <InputNumber
                  className="w-full tabular-nums"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => v?.replace(/\$\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </div>
          </div>

          <Divider className="my-2" />

          {/* Section 6 */}
          <div>
            <h4 className="text-sm font-bold text-amber-500 uppercase mb-3">6. % Thưởng Doanh Thu Net (REV)</h4>
            <div className="grid grid-cols-3 gap-3">
              <Form.Item name="rev50M" label="Doanh thu >= 50M">
                <InputNumber className="w-full tabular-nums" min={0} max={100} step={0.1} addonAfter="%" />
              </Form.Item>
              <Form.Item name="rev100M" label="Doanh thu >= 100M">
                <InputNumber className="w-full tabular-nums" min={0} max={100} step={0.1} addonAfter="%" />
              </Form.Item>
              <Form.Item name="rev150M" label="Doanh thu >= 150M">
                <InputNumber className="w-full tabular-nums" min={0} max={100} step={0.1} addonAfter="%" />
              </Form.Item>
              <Form.Item name="rev200M" label="Doanh thu >= 200M">
                <InputNumber className="w-full tabular-nums" min={0} max={100} step={0.1} addonAfter="%" />
              </Form.Item>
              <Form.Item name="rev250M" label="Doanh thu >= 250M">
                <InputNumber className="w-full tabular-nums" min={0} max={100} step={0.1} addonAfter="%" />
              </Form.Item>
              <Form.Item name="rev300M" label="Doanh thu >= 300M">
                <InputNumber className="w-full tabular-nums" min={0} max={100} step={0.1} addonAfter="%" />
              </Form.Item>
            </div>
          </div>
        </Form>
      ),
    },
    {
      key: 'staff',
      label: (
        <span className="flex items-center gap-2">
          <TeamOutlined />
          <span>Danh Sách Booker Hoạt Động</span>
        </span>
      ),
      children: (
        <div className="pt-2">
          <div className="mb-4">
            <Text type="secondary" className="text-xs block mb-3">
              Tích chọn các nhân sự được công nhận là <strong>Online Consultant (BK / Telesales)</strong>. Cấu hình này
              sẽ tự động áp dụng toàn cục trên Bảng xếp hạng Booker Leaderboard và các báo cáo BK.
            </Text>

            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Tìm tên hoặc mã nhân viên..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="mb-3 rounded-lg"
            />

            <div className="flex justify-between items-center px-1 mb-3">
              <Checkbox
                checked={filteredStaff.length > 0 && selectedBkIds.length === filteredStaff.length}
                indeterminate={selectedBkIds.length > 0 && selectedBkIds.length < filteredStaff.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                <span className="font-semibold text-xs">Chọn tất cả</span>
              </Checkbox>

              <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-semibold tabular-nums">
                {selectedBkIds.length} / {allStaff.length} được chọn
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filteredStaff.map((staff) => {
              const isChecked = selectedBkIds.includes(staff.staffId);
              return (
                <div
                  key={staff.staffId}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-transparent'
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
                        <Text type="secondary" className="text-xs block">
                          @{staff.username}
                        </Text>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {isChecked ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        BK Active
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                        Chưa bật
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined className="text-amber-500 text-lg" />
          <span>Cấu Hình Công Thức Lương & Thưởng Telesales</span>
        </div>
      }
      placement="right"
      width={740}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-600 border-amber-500"
          >
            Lưu Cấu Hình ({selectedBkIds.length} BK)
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Tabs defaultActiveKey="formula" items={tabItems} type="line" />
      </Spin>
    </Drawer>
  );
}
