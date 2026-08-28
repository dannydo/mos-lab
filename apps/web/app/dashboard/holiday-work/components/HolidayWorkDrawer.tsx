'use client';

import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  type FormInstance,
} from 'antd';
import dayjs from 'dayjs';
import type {
  CrmBranch,
  HolidayCandidateScore,
  HolidayPayrollLedgerEntry,
  HolidayRosterEntry,
  Staff,
} from '@mos-lab/shared';
import { AdaptiveDrawer, ResponsiveFormField, ResponsiveFormGrid } from '~/components/ui';
import { formatHolidayMoney, holidayNormalizedIncludes, HOLIDAY_ROSTER_STATUS_META } from './holidayWorkPresentation';

const { Text } = Typography;

export type HolidayWorkDrawerMode = 'period' | 'coverage' | 'roster' | 'event' | 'adjustment' | null;

interface HolidayWorkDrawerProps {
  form: FormInstance;
  mode: HolidayWorkDrawerMode;
  canManage: boolean;
  branches: CrmBranch[];
  candidateOptions: HolidayCandidateScore[];
  staffOptions: Staff[];
  editingRoster: HolidayRosterEntry | null;
  editingLedger: HolidayPayrollLedgerEntry | null;
  adjustmentTotal: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export function HolidayWorkDrawer({
  form,
  mode,
  canManage,
  branches,
  candidateOptions,
  staffOptions,
  editingRoster,
  editingLedger,
  adjustmentTotal,
  submitting,
  onClose,
  onSubmit,
}: HolidayWorkDrawerProps) {
  return (
    <AdaptiveDrawer
      open={Boolean(mode)}
      intent="form"
      title={
        mode === 'period'
          ? 'Tạo kỳ lễ'
          : mode === 'coverage'
            ? 'Nhu cầu theo chi nhánh'
            : mode === 'roster'
              ? 'Roster ngày lễ'
              : mode === 'adjustment'
                ? 'Adjustment sau khóa lương'
                : 'Sự kiện hiệu suất'
      }
      onClose={onClose}
      destroyOnHidden
      extra={
        <Button type="primary" loading={submitting} onClick={() => void onSubmit()}>
          Lưu
        </Button>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        {mode === 'period' ? (
          <>
            <Form.Item name="code" label="Mã kỳ" rules={[{ required: true }]}>
              <Input placeholder="QUOC_KHANH_2026" />
            </Form.Item>
            <Form.Item name="name" label="Tên kỳ lễ" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="dates" label="Thời gian" rules={[{ required: true }]}>
              <DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
            <Space wrap className="w-full" align="start">
              <Form.Item name="standardShiftHours" label="Giờ/ca">
                <InputNumber min={1} max={24} />
              </Form.Item>
              <Form.Item name="workPremiumMultiplier" label="Phụ cấp đi làm (x)">
                <InputNumber min={0} />
              </Form.Item>
              <Form.Item name="paidLeaveMultiplier" label="Nghỉ lễ (x)">
                <InputNumber min={0} />
              </Form.Item>
              <Form.Item name="monthlyStandardDays" label="Ngày chuẩn/tháng">
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item name="monthlyStandardHours" label="Giờ chuẩn/tháng">
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item name="selectionWindowDays" label="Cửa sổ đánh giá">
                <InputNumber min={1} max={365} addonAfter="ngày" />
              </Form.Item>
            </Space>
            <Text strong>Trọng số đề cử (%)</Text>
            <Space wrap className="mt-3" align="start">
              {['feedback', 'fix', 'tip', 'speed', 'attendance'].map((key) => (
                <Form.Item key={key} name={key} label={key}>
                  <InputNumber min={0} max={100} />
                </Form.Item>
              ))}
            </Space>
            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea rows={3} />
            </Form.Item>
          </>
        ) : mode === 'coverage' ? (
          <>
            <Alert
              showIcon
              type="info"
              className="mb-4"
              message="Thiết lập một lần cho cả chi nhánh"
              description="Nhập số CC và CV cần có mặt trong cùng ngày và khung giờ. Hệ thống sẽ lưu hai nhu cầu riêng để đối chiếu roster."
            />
            <ResponsiveFormGrid columns={2}>
              <ResponsiveFormField>
                <Form.Item name="workDate" label="Ngày" rules={[{ required: true }]}>
                  <DatePicker className="w-full" format="DD/MM/YYYY" />
                </Form.Item>
              </ResponsiveFormField>
              <ResponsiveFormField>
                <Form.Item name="storeId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh.' }]}>
                  <Select
                    showSearch
                    placeholder="Chọn chi nhánh"
                    filterOption={(input, option) => holidayNormalizedIncludes(option?.label, input)}
                    options={branches.map((branch) => ({
                      value: branch.id,
                      label:
                        branch.name.trim().toUpperCase() === branch.code.trim().toUpperCase()
                          ? branch.name
                          : `${branch.name} (${branch.code})`,
                    }))}
                  />
                </Form.Item>
              </ResponsiveFormField>
              <ResponsiveFormField>
                <Form.Item name="shiftStart" label="Bắt đầu" rules={[{ required: true }]}>
                  <Input placeholder="09:00" />
                </Form.Item>
              </ResponsiveFormField>
              <ResponsiveFormField>
                <Form.Item name="shiftEnd" label="Kết thúc" rules={[{ required: true }]}>
                  <Input placeholder="18:00" />
                </Form.Item>
              </ResponsiveFormField>
              <ResponsiveFormField>
                <Form.Item
                  name="ccRequiredCount"
                  label="Số CC cần"
                  rules={[{ required: true, message: 'Nhập số CC cần.' }]}
                >
                  <InputNumber className="w-full" min={0} precision={0} />
                </Form.Item>
              </ResponsiveFormField>
              <ResponsiveFormField>
                <Form.Item
                  name="cvRequiredCount"
                  label="Số CV cần"
                  dependencies={['ccRequiredCount']}
                  rules={[
                    { required: true, message: 'Nhập số CV cần.' },
                    ({ getFieldValue }) => ({
                      validator: () =>
                        Number(getFieldValue('ccRequiredCount') || 0) + Number(getFieldValue('cvRequiredCount') || 0) >
                        0
                          ? Promise.resolve()
                          : Promise.reject(new Error('Cần ít nhất 1 CC hoặc CV.')),
                    }),
                  ]}
                >
                  <InputNumber className="w-full" min={0} precision={0} />
                </Form.Item>
              </ResponsiveFormField>
            </ResponsiveFormGrid>
            <Form.Item name="notes" label="Ghi chú">
              <Input.TextArea rows={3} />
            </Form.Item>
          </>
        ) : mode === 'roster' ? (
          <>
            <Form.Item name="workDate" label="Ngày" rules={[{ required: true }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
            {!editingRoster ? (
              <Form.Item name="legacyStaffId" label="Nhân sự từ bảng xếp hạng" rules={[{ required: true }]}>
                <Select
                  showSearch
                  filterOption={(input, option) => holidayNormalizedIncludes(option?.label, input)}
                  options={candidateOptions.map((row) => ({
                    value: row.legacyStaffId,
                    label: `${row.displayName} · ${row.teamCode} · ${row.storeKey}`,
                  }))}
                />
              </Form.Item>
            ) : !editingRoster.legacyStaffId ? (
              <Form.Item
                name="legacyStaffId"
                label="Gắn với hồ sơ nhân sự"
                rules={[{ required: true, message: 'Chọn hồ sơ đúng để xử lý ngoại lệ tên.' }]}
              >
                <Select
                  showSearch
                  filterOption={(input, option) => holidayNormalizedIncludes(option?.label, input)}
                  options={staffOptions.map((row) => ({
                    value: row.legacyStaffId as number,
                    label: `${row.displayName} · ${row.role}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <Alert
                showIcon
                message={editingRoster.displayName}
                description={`${editingRoster.teamCode} · ${editingRoster.storeKey}`}
                className="mb-4"
              />
            )}
            <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
              <Select
                disabled={!canManage}
                options={(canManage ? Object.keys(HOLIDAY_ROSTER_STATUS_META) : ['NOMINATED']).map((value) => ({
                  value,
                  label: HOLIDAY_ROSTER_STATUS_META[value].label,
                }))}
              />
            </Form.Item>
            <Space className="w-full" align="start">
              <Form.Item name="shiftStart" label="Bắt đầu" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="shiftEnd" label="Kết thúc" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Space>
            <Form.Item name="nominationReason" label="Lý do đề cử" rules={canManage ? [] : [{ required: true }]}>
              <Input.TextArea rows={3} />
            </Form.Item>
            {canManage ? (
              <Form.Item
                name="decisionReason"
                label="Lý do quyết định / ngoại lệ"
                rules={
                  editingRoster?.status === 'PAYROLL_EXCEPTION'
                    ? [{ required: true, message: 'Ghi lý do xử lý ngoại lệ để lưu audit.' }]
                    : []
                }
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            ) : null}
          </>
        ) : mode === 'event' ? (
          <>
            <Form.Item name="legacyStaffId" label="Nhân sự liên quan" rules={[{ required: true }]}>
              <Select
                showSearch
                filterOption={(input, option) => holidayNormalizedIncludes(option?.label, input)}
                options={staffOptions.map((row) => ({
                  value: row.legacyStaffId as number,
                  label: `${row.displayName} · ${row.role}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="eventType" label="Loại sự kiện" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'NEGATIVE_FEEDBACK', label: 'Feedback tiêu cực' },
                  { value: 'UNAPPROVED_OFF', label: 'Off không duyệt' },
                  { value: 'LATE', label: 'Đi trễ' },
                  { value: 'EARLY_LEAVE', label: 'Về sớm' },
                  { value: 'TIME_ISSUE', label: 'Vấn đề thời gian' },
                ]}
              />
            </Form.Item>
            <Space className="w-full" align="start">
              <Form.Item name="source" label="Nguồn" rules={[{ required: true }]}>
                <Select options={['COUNTER', 'CS', 'HR', 'SYSTEM'].map((value) => ({ value }))} />
              </Form.Item>
              <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
                <Select options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((value) => ({ value }))} />
              </Form.Item>
            </Space>
            <Form.Item name="occurredAt" label="Thời điểm" rules={[{ required: true }]}>
              <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
            </Form.Item>
            <Space className="w-full" align="start">
              <Form.Item name="relatedOrderId" label="Order ID">
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item name="relatedTicketId" label="Ticket ID">
                <InputNumber min={1} />
              </Form.Item>
            </Space>
            <Form.Item name="evidenceUrl" label="Link chứng cứ">
              <Input />
            </Form.Item>
            <Form.Item name="note" label="Nội dung" rules={[{ required: true }]}>
              <Input.TextArea rows={5} />
            </Form.Item>
          </>
        ) : mode === 'adjustment' && editingLedger ? (
          <>
            <Alert
              showIcon
              type="warning"
              message={`${editingLedger.displayName} · ${dayjs(editingLedger.workDate).format('DD/MM/YYYY')}`}
              description={`Ledger gốc ${formatHolidayMoney(editingLedger.payrollAdditionAmount)} sẽ không bị ghi đè. Adjustment hiện tại: ${formatHolidayMoney(adjustmentTotal)}.`}
              className="mb-4"
            />
            <Form.Item name="amount" label="Số tiền điều chỉnh (+/- VND)" rules={[{ required: true }]}>
              <InputNumber className="w-full" precision={0} addonAfter="đ" />
            </Form.Item>
            <Form.Item name="reason" label="Lý do kiểm toán" rules={[{ required: true, min: 5 }]}>
              <Input.TextArea rows={5} placeholder="Nêu rõ căn cứ và người xác nhận…" />
            </Form.Item>
          </>
        ) : null}
      </Form>
    </AdaptiveDrawer>
  );
}
