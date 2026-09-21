'use client';

import React from 'react';
import { Typography, Descriptions, Tag, Avatar, Card, Spin, Empty, Tooltip } from 'antd';
import {
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  SolutionOutlined,
  CalendarOutlined,
  LockOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Staff, Role, StaffAuditLog, calculateStaffSeniority, TELESALES_EXECUTIVE_STANDARDS } from '@mos-lab/shared';

const { Text } = Typography;

export interface StaffDetailDrawerContentProps {
  selectedStaff: Staff;
  roles: Role[];
  legacyStaffList: any[];
  currentUser?: Staff | null;
  isHrOrAdmin: boolean;
  canManageStaff: boolean;
  auditLogs: StaffAuditLog[];
  loadingAuditLogs: boolean;
}

export const StaffDetailDrawerContent: React.FC<StaffDetailDrawerContentProps> = ({
  selectedStaff,
  roles,
  legacyStaffList,
  currentUser,
  isHrOrAdmin,
  canManageStaff,
  auditLogs,
  loadingAuditLogs,
}) => {
  const roleInfo = roles.find((r) => r.key === selectedStaff.role);
  const legacyStaff = legacyStaffList.find((s) => s.id === selectedStaff.id);
  const initials = selectedStaff.displayName
    ? selectedStaff.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(-2)
        .toUpperCase()
    : 'U';

  const canViewCompensation = isHrOrAdmin || (currentUser?.role === 'manager' && selectedStaff.id !== currentUser.id);

  const seniority = selectedStaff.joinedAt
    ? calculateStaffSeniority(selectedStaff.joinedAt, selectedStaff.seniorityOffset || 0)
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header Profile Summary */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
        <Avatar size={64} src={selectedStaff.avatarUrl} className="bg-amber-600 font-semibold text-lg">
          {initials}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 m-0">{selectedStaff.displayName}</h3>
            {selectedStaff.staffCode && (
              <Tag color="blue" className="font-mono font-bold text-xs">
                {selectedStaff.staffCode}
              </Tag>
            )}
            <Tag color={selectedStaff.isActive ? 'success' : 'error'} className="text-xs">
              {selectedStaff.isActive ? 'Tài khoản: Bật' : 'Tài khoản: Khóa'}
            </Tag>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-zinc-400">
            <span>@{selectedStaff.username}</span>
            <span>•</span>
            <Tag color={roleInfo?.color || 'default'} className="m-0">
              {roleInfo?.name || selectedStaff.role}
            </Tag>
            {selectedStaff.employmentStatus && (
              <Tag
                color={
                  selectedStaff.employmentStatus === 'ACTIVE'
                    ? 'green'
                    : selectedStaff.employmentStatus === 'ON_LEAVE'
                      ? 'warning'
                      : 'default'
                }
                className="m-0"
              >
                {selectedStaff.employmentStatus === 'ACTIVE'
                  ? 'Đang làm việc'
                  : selectedStaff.employmentStatus === 'ON_LEAVE'
                    ? 'Tạm nghỉ'
                    : 'Thôi việc'}
              </Tag>
            )}
            {selectedStaff.contractStatus && (
              <Tag
                color={
                  selectedStaff.contractStatus === 'OFFICIAL'
                    ? 'purple'
                    : selectedStaff.contractStatus === 'PROBATION'
                      ? 'cyan'
                      : 'default'
                }
                className="m-0"
              >
                {selectedStaff.contractStatus === 'OFFICIAL'
                  ? 'HĐ Chính thức'
                  : selectedStaff.contractStatus === 'PROBATION'
                    ? 'Thử việc'
                    : 'Đã chấm dứt HĐ'}
              </Tag>
            )}
          </div>
        </div>
      </div>

      {/* Telesales Executive Standards Banner */}
      {selectedStaff.role === 'telesales' && (
        <Card
          size="small"
          className="border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20"
          title={
            <span className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400 text-sm">
              <SolutionOutlined />
              Tiêu chuẩn Vận hành Telesales Executive
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-900/30">
              <span className="text-slate-500 dark:text-zinc-400 block font-medium">Lịch làm việc chuẩn</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100">
                {TELESALES_EXECUTIVE_STANDARDS.schedule.workingHours}
              </span>
              <span className="text-slate-400 text-[11px] block">Thứ 2 – Thứ 7 (Chủ nhật OFF)</span>
            </div>
            <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-900/30">
              <span className="text-slate-500 dark:text-zinc-400 block font-medium">KPIs Tối thiểu Ngày</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100">83 cuộc gọi | 25 nghe | 5 BK</span>
              <span className="text-slate-400 text-[11px] block">20 Happy Call/ngày</span>
            </div>
            <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-900/30">
              <span className="text-slate-500 dark:text-zinc-400 block font-medium">Lương cứng & Mục tiêu tháng</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-100">
                {TELESALES_EXECUTIVE_STANDARDS.compensation.baseSalaryFormatted}
              </span>
              <span className="text-slate-400 text-[11px] block">Tối thiểu 100 Done / &gt;300 Done xuất sắc</span>
            </div>
          </div>
        </Card>
      )}

      {/* Thông tin công việc & Hợp đồng */}
      <Descriptions
        title={<span className="font-bold text-amber-600 dark:text-amber-400">Thông tin công việc & Hợp đồng</span>}
        bordered
        size="small"
        column={2}
      >
        <Descriptions.Item label="Mã nhân viên">
          <span className="font-mono font-semibold">{selectedStaff.staffCode || 'Chưa thiết lập'}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái làm việc">
          <Tag
            color={
              selectedStaff.employmentStatus === 'ACTIVE'
                ? 'green'
                : selectedStaff.employmentStatus === 'ON_LEAVE'
                  ? 'warning'
                  : 'default'
            }
          >
            {selectedStaff.employmentStatus === 'ACTIVE'
              ? 'Đang làm việc'
              : selectedStaff.employmentStatus === 'ON_LEAVE'
                ? 'Tạm nghỉ'
                : 'Đã thôi việc'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Tình trạng hợp đồng">
          <Tag
            color={
              selectedStaff.contractStatus === 'OFFICIAL'
                ? 'purple'
                : selectedStaff.contractStatus === 'PROBATION'
                  ? 'cyan'
                  : 'default'
            }
          >
            {selectedStaff.contractStatus === 'OFFICIAL'
              ? 'Chính thức'
              : selectedStaff.contractStatus === 'PROBATION'
                ? 'Thử việc'
                : 'Đã chấm dứt'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Thời hạn hợp đồng">
          {selectedStaff.contractStartDate ? (
            <span>
              {dayjs(selectedStaff.contractStartDate).format('DD/MM/YYYY')}
              {selectedStaff.contractEndDate
                ? ` đến ${dayjs(selectedStaff.contractEndDate).format('DD/MM/YYYY')}`
                : ' (Không thời hạn)'}
            </span>
          ) : (
            <span className="text-slate-400 italic">Chưa cập nhật</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày vào làm">
          {selectedStaff.joinedAt ? (
            <span>{dayjs(selectedStaff.joinedAt).format('DD/MM/YYYY')}</span>
          ) : (
            <span className="text-slate-400 italic">Chưa cập nhật</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tổng thâm niên">
          {seniority ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {seniority.displayFormatted}
              {seniority.offsetMonths > 0 && (
                <span className="text-xs text-slate-400 ml-1 font-normal">
                  (Đã gồm +{seniority.offsetMonths} th thỏa thuận)
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 italic">Chưa tính</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Thông tin cá nhân & Liên hệ */}
      <Descriptions
        title={<span className="font-bold text-amber-600 dark:text-amber-400">Thông tin cá nhân & Liên hệ</span>}
        bordered
        size="small"
        column={2}
      >
        <Descriptions.Item label="Ngày sinh">
          {selectedStaff.birthDate ? (
            dayjs(selectedStaff.birthDate).format('DD/MM/YYYY')
          ) : (
            <span className="text-slate-400 italic">Chưa thiết lập</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Giới tính">
          {selectedStaff.gender === 'Female' ? 'Nữ' : selectedStaff.gender === 'Male' ? 'Nam' : 'Khác'}
        </Descriptions.Item>
        <Descriptions.Item label="Số điện thoại">
          {selectedStaff.phone ? (
            <span className="flex items-center gap-1 font-mono">
              <PhoneOutlined className="text-slate-400" />
              {selectedStaff.phone}
            </span>
          ) : (
            <span className="text-slate-400 italic">Chưa thiết lập</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {selectedStaff.email ? (
            <span className="flex items-center gap-1">
              <MailOutlined className="text-slate-400" />
              {selectedStaff.email}
            </span>
          ) : (
            <span className="text-slate-400 italic">Chưa thiết lập</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={2}>
          {selectedStaff.address || <span className="text-slate-400 italic">Chưa thiết lập</span>}
        </Descriptions.Item>
      </Descriptions>

      {/* Thông tin pháp lý & BHXH (Privacy Guard) */}
      <Descriptions
        title={
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-600 dark:text-amber-400">Thông tin pháp lý & BHXH</span>
            {!isHrOrAdmin && (
              <Tag icon={<LockOutlined />} color="default">
                Bảo mật HR/Admin
              </Tag>
            )}
          </div>
        }
        bordered
        size="small"
        column={2}
      >
        <Descriptions.Item label="Số CCCD / CMND">
          {isHrOrAdmin ? (
            <span className="font-mono font-semibold">{selectedStaff.nationalId || 'Chưa cập nhật'}</span>
          ) : (
            <span className="text-slate-400 italic">•••••••••••• (Ẩn bảo mật)</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Mã số BHXH">
          {isHrOrAdmin ? (
            <span className="font-mono font-semibold">{selectedStaff.socialInsuranceNo || 'Chưa cập nhật'}</span>
          ) : (
            <span className="text-slate-400 italic">•••••••••• (Ẩn bảo mật)</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Tài khoản ngân hàng (Privacy Guard) */}
      <Descriptions
        title={
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-600 dark:text-amber-400">Tài khoản ngân hàng nhận lương</span>
            {!isHrOrAdmin && (
              <Tag icon={<LockOutlined />} color="default">
                Bảo mật HR/Admin
              </Tag>
            )}
          </div>
        }
        bordered
        size="small"
        column={2}
      >
        <Descriptions.Item label="Ngân hàng">
          {isHrOrAdmin ? (
            selectedStaff.bankName || <span className="text-slate-400 italic">Chưa cập nhật</span>
          ) : (
            <span className="text-slate-400 italic">•••••• (Ẩn bảo mật)</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Số tài khoản">
          {isHrOrAdmin ? (
            <span className="font-mono font-semibold">{selectedStaff.bankAccountNumber || 'Chưa cập nhật'}</span>
          ) : (
            <span className="text-slate-400 italic">•••••••••••• (Ẩn bảo mật)</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Lương & Đãi ngộ */}
      <Descriptions
        title={
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-600 dark:text-amber-400">Cơ chế lương & Đãi ngộ</span>
            {!canViewCompensation && (
              <Tag icon={<LockOutlined />} color="default">
                Bảo mật
              </Tag>
            )}
          </div>
        }
        bordered
        size="small"
        column={2}
      >
        <Descriptions.Item label="Hình thức trả lương">
          {canViewCompensation ? (
            <Tag color={selectedStaff.payBasis === 'HOURLY' ? 'blue' : 'purple'}>
              {selectedStaff.payBasis === 'HOURLY' ? 'Lương giờ (Hourly)' : 'Lương cứng (Monthly)'}
            </Tag>
          ) : (
            <span className="text-slate-400 italic">Ẩn bảo mật</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Mức lương cơ bản">
          {canViewCompensation ? (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {selectedStaff.baseSalary
                ? `${selectedStaff.baseSalary.toLocaleString()} đ/tháng`
                : selectedStaff.hourlyWage
                  ? `${selectedStaff.hourlyWage.toLocaleString()} đ/h`
                  : 'Chưa thiết lập'}
            </span>
          ) : (
            <span className="text-slate-400 italic">Ẩn bảo mật</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Emergency Contact */}
      <Descriptions
        title={<span className="font-bold text-amber-600 dark:text-amber-400">Liên hệ khẩn cấp & Ghi chú</span>}
        bordered
        size="small"
        column={2}
      >
        <Descriptions.Item label="Người liên hệ khẩn cấp">
          {selectedStaff.emergencyContact || <span className="text-slate-400 italic">Chưa thiết lập</span>}
        </Descriptions.Item>
        <Descriptions.Item label="SĐT khẩn cấp">
          {selectedStaff.emergencyPhone || <span className="text-slate-400 italic">Chưa thiết lập</span>}
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú nội bộ" span={2}>
          {selectedStaff.notes || <span className="text-slate-400 italic">Không có ghi chú</span>}
        </Descriptions.Item>
      </Descriptions>

      {/* Audit Log Section (HR & Admin only) */}
      {isHrOrAdmin && (
        <Card
          size="small"
          title={
            <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-100 text-sm">
              <HistoryOutlined />
              Lịch sử kiểm toán thay đổi (Audit Log)
            </span>
          }
          className="border-slate-200 dark:border-zinc-800"
        >
          {loadingAuditLogs ? (
            <div className="p-4 text-center">
              <Spin size="small" />
            </div>
          ) : auditLogs.length === 0 ? (
            <Empty
              description="Chưa có ghi nhận kiểm toán nào cho nhân viên này"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Thay đổi trường: {log.fieldName}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 line-through">{log.oldValue || '(trống)'}</span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">{log.newValue || '(trống)'}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Thực hiện bởi:{' '}
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      {log.actorStaffName || (log.actorStaffId ? `ID: ${log.actorStaffId}` : 'Hệ thống')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default StaffDetailDrawerContent;
