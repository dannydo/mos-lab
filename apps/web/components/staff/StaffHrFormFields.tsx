'use client';

import React from 'react';
import { Form, Input, Select, Row, Col, DatePicker, InputNumber, Space, Typography, Tooltip, Divider } from 'antd';
import {
  IdcardOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import { Staff, Role, calculateStaffSeniority, TELESALES_EXECUTIVE_STANDARDS } from '@mos-lab/shared';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface StaffHrFormFieldsProps {
  isHrOrAdmin: boolean;
  currentUser?: Staff | null;
  form?: any;
}

export const StaffHrFormFields: React.FC<StaffHrFormFieldsProps> = ({ isHrOrAdmin, currentUser }) => {
  const isDirectManagerOrHr =
    (currentUser?.role as string) === 'manager' || (currentUser?.role as string) === 'leader' || Boolean(isHrOrAdmin);

  const joinedAtVal = Form.useWatch('joinedAt');
  const seniorityOffsetVal = Form.useWatch('seniorityOffset');
  const roleVal = Form.useWatch('role');

  const seniorityInfo = React.useMemo(() => {
    if (!joinedAtVal) return null;
    return calculateStaffSeniority(joinedAtVal, seniorityOffsetVal || 0);
  }, [joinedAtVal, seniorityOffsetVal]);

  return (
    <>
      {/* Telesales Executive Standards Banner */}
      {roleVal === 'telesales' && (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-2 font-semibold text-amber-600 dark:text-amber-400 text-sm">
            <SolutionOutlined className="text-base" />
            <span>Tiêu chuẩn vận hành vai trò Telesales Executive</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-white/60 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-900/40">
              <span className="text-slate-500 dark:text-zinc-400 block">Lịch làm việc</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100">
                {TELESALES_EXECUTIVE_STANDARDS.schedule.workingHours}
              </span>
              <span className="text-slate-400 text-[11px] block">Thứ 2 – Thứ 7 (Chủ nhật OFF)</span>
            </div>
            <div className="p-2 rounded bg-white/60 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-900/40">
              <span className="text-slate-500 dark:text-zinc-400 block">KPI tối thiểu / ngày</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100">83 cuộc gọi | 25 nghe | 5 BK</span>
              <span className="text-slate-400 text-[11px] block">20 Happy Call/ngày</span>
            </div>
            <div className="p-2 rounded bg-white/60 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-900/40">
              <span className="text-slate-500 dark:text-zinc-400 block">Lương cứng & Mục tiêu tháng</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100">
                {TELESALES_EXECUTIVE_STANDARDS.compensation.baseSalaryFormatted}
              </span>
              <span className="text-slate-400 text-[11px] block">Tối thiểu 100 Done / &gt;300 Done xuất sắc</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Thông tin công việc & Hợp đồng */}
      <Divider orientation="left" className="!my-3 !text-sm !text-amber-600 dark:!text-amber-400">
        Thông tin công việc & Hợp đồng
      </Divider>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="staffCode"
            label="Mã nhân viên"
            tooltip="Mã định danh nội bộ duy nhất của nhân sự (VD: TE001, CC002)"
          >
            <Input placeholder="VD: TE001" maxLength={20} className="font-mono uppercase" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="employmentStatus"
            label="Trạng thái nhân sự"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái nhân sự' }]}
          >
            <Select placeholder="Chọn trạng thái">
              <Option value="ACTIVE">Đang làm việc (Active)</Option>
              <Option value="ON_LEAVE">Tạm nghỉ / Thai sản (On Leave)</Option>
              <Option value="RESIGNED">Đã thôi việc (Resigned)</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="contractStatus"
            label="Tình trạng hợp đồng"
            rules={[{ required: true, message: 'Vui lòng chọn tình trạng hợp đồng' }]}
          >
            <Select placeholder="Chọn tình trạng HĐ">
              <Option value="PROBATION">Thử việc (Probation)</Option>
              <Option value="OFFICIAL">Chính thức (Official)</Option>
              <Option value="TERMINATED">Đã chấm dứt (Terminated)</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="contractStartDate" label="Ngày bắt đầu HĐ">
            <DatePicker className="w-full" placeholder="Từ ngày" format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="contractEndDate" label="Ngày kết thúc HĐ">
            <DatePicker className="w-full" placeholder="Đến ngày (để trống nếu KTH)" format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="joinedAt"
            label={
              <Space>
                <span>Ngày vào làm</span>
                <Tooltip title="Direct Manager và HR có thể cập nhật">
                  <InfoCircleOutlined className="text-slate-400" />
                </Tooltip>
              </Space>
            }
          >
            <DatePicker
              className="w-full"
              placeholder="Chọn ngày"
              format="DD/MM/YYYY"
              disabled={!isDirectManagerOrHr}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Seniority Calculation Row */}
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="seniorityOffset"
            label={
              <Space>
                <span>Thâm niên cộng thêm (tháng)</span>
                <Tooltip title="Tháng kinh nghiệm thỏa thuận trước khi vào làm. Chỉ HR/Admin chỉnh sửa.">
                  <InfoCircleOutlined className="text-slate-400" />
                </Tooltip>
              </Space>
            }
          >
            <InputNumber
              className="w-full"
              placeholder="Ví dụ: 12"
              min={0}
              addonAfter="tháng"
              disabled={!isHrOrAdmin}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <div className="mt-7 p-2 rounded bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <CalendarOutlined />
              Tổng thâm niên tính toán:
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {seniorityInfo ? seniorityInfo.displayFormatted : 'Chưa nhập ngày vào làm'}
            </span>
          </div>
        </Col>
      </Row>

      {/* Section 2: Thông tin cá nhân & Liên hệ */}
      <Divider orientation="left" className="!my-3 !text-sm !text-amber-600 dark:!text-amber-400">
        Thông tin cá nhân & Liên hệ
      </Divider>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="birthDate"
            label={
              <Space>
                <span>Ngày sinh</span>
                <Tooltip title="Direct Manager và HR có quyền cập nhật">
                  <InfoCircleOutlined className="text-slate-400" />
                </Tooltip>
              </Space>
            }
          >
            <DatePicker
              className="w-full"
              placeholder="Chọn ngày"
              format="DD/MM/YYYY"
              disabled={!isDirectManagerOrHr}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="gender" label="Giới tính">
            <Select placeholder="Chọn giới tính" allowClear>
              <Option value="Female">Nữ</Option>
              <Option value="Male">Nam</Option>
              <Option value="Other">Khác</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0901234567" prefix={<PhoneOutlined className="text-slate-400" />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="email"
            label="Email liên hệ"
            rules={[{ type: 'email', message: 'Định dạng email không hợp lệ!' }]}
          >
            <Input placeholder="email@domain.com" prefix={<MailOutlined className="text-slate-400" />} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="address" label="Địa chỉ thường trú">
            <Input placeholder="Số nhà, Tên đường, Quận/Huyện, Tỉnh/TP" />
          </Form.Item>
        </Col>
      </Row>

      {/* Section 3: Pháp lý & BHXH (HR & Admin only) */}
      {isHrOrAdmin && (
        <>
          <Divider orientation="left" className="!my-3 !text-sm !text-amber-600 dark:!text-amber-400">
            Thông tin pháp lý & BHXH (Bảo mật HR/Admin)
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nationalId"
                label={
                  <Space>
                    <IdcardOutlined className="text-slate-400" />
                    <span>Số CCCD / CMND</span>
                  </Space>
                }
              >
                <Input placeholder="12 chữ số căn cước công dân" maxLength={20} className="font-mono" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="socialInsuranceNo"
                label={
                  <Space>
                    <SafetyCertificateOutlined className="text-slate-400" />
                    <span>Mã số BHXH</span>
                  </Space>
                }
              >
                <Input placeholder="10 chữ số sổ BHXH" maxLength={20} className="font-mono" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {/* Section 4: Tài khoản ngân hàng (HR & Admin only) */}
      {isHrOrAdmin && (
        <>
          <Divider orientation="left" className="!my-3 !text-sm !text-amber-600 dark:!text-amber-400">
            Thông tin thanh toán & Ngân hàng (Bảo mật HR/Admin)
          </Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bankName"
                label={
                  <Space>
                    <BankOutlined className="text-slate-400" />
                    <span>Ngân hàng nhận lương</span>
                  </Space>
                }
              >
                <Input placeholder="Ví dụ: Vietcombank, Techcombank, MB Bank..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bankAccountNumber" label="Số tài khoản ngân hàng">
                <Input placeholder="Số tài khoản chính chủ" className="font-mono" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {/* Section 5: Lương & Đãi ngộ (HR & Admin only) */}
      {isHrOrAdmin && (
        <>
          <Divider orientation="left" className="!my-3 !text-sm !text-amber-600 dark:!text-amber-400">
            Cơ chế lương & Đãi ngộ (Bảo mật HR/Admin)
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="payBasis"
                label="Hình thức trả lương"
                rules={[{ required: true, message: 'Chọn hình thức trả lương' }]}
              >
                <Select placeholder="Chọn loại lương" allowClear>
                  <Option value="HOURLY">Lương giờ (Hourly)</Option>
                  <Option value="MONTHLY">Lương cứng tháng (Monthly)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="baseSalary" label="Lương cứng (VND)">
                <InputNumber
                  className="w-full font-mono"
                  placeholder="Ví dụ: 5500000"
                  min={0}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => (val ? (val.replace(/\$\s?|(,*)/g, '') as SafeAny) : '')}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hourlyWage" label="Lương giờ (VND/h)">
                <InputNumber
                  className="w-full font-mono"
                  placeholder="Ví dụ: 25000"
                  min={0}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => (val ? (val.replace(/\$\s?|(,*)/g, '') as SafeAny) : '')}
                  addonAfter="đ/h"
                />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {/* Section 6: Liên hệ khẩn cấp & Ghi chú */}
      <Divider orientation="left" className="!my-3 !text-sm !text-amber-600 dark:!text-amber-400">
        Liên hệ khẩn cấp & Ghi chú
      </Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="emergencyContact" label="Người liên hệ khẩn cấp">
            <Input placeholder="Họ tên người thân" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="emergencyPhone" label="SĐT khẩn cấp">
            <Input placeholder="0901234567" prefix={<PhoneOutlined className="text-slate-400" />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="notes" label="Ghi chú nội bộ">
            <TextArea rows={3} placeholder="Ghi chú hồ sơ, thỏa thuận thử việc, thông tin bổ sung..." />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

export default StaffHrFormFields;
