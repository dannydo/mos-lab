import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { DatePicker, Tooltip, Alert, theme } from 'antd';
import dayjs from 'dayjs';
import { HARDCODED_OFF_DATES } from './constants';
import { apiClient } from '../../lib/api-client';

type SafeAny = any;

export interface CvDatePickerProps {
  value: dayjs.Dayjs | null;
  onChange: (date: dayjs.Dayjs | null) => void;
  selectedCV?: SafeAny;
  staffList?: SafeAny[];
  themeMode?: 'light' | 'dark' | string;
  format?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  showWarningAlert?: boolean;
  className?: string;
}

/**
 * Component Dùng Chung Chọn Ngày Làm Việc / Đặt Lịch Cho Chuyên Viên (CvDatePicker)
 * Tự động khóa ngày quá khứ, gạch ngang ngày nghỉ cố định & phép duyệt,
 * đồng thời hiển thị CẢNH BÁO đối với đơn nghỉ phép CHỜ DUYỆT hoặc BỊ TỪ CHỐI.
 */
export const CvDatePicker: React.FC<CvDatePickerProps> = ({
  value,
  onChange,
  selectedCV,
  staffList = [],
  themeMode = 'dark',
  format = 'DD/MM/YYYY',
  placeholder = 'Chọn ngày đặt lịch...',
  style,
  allowClear = false,
  disabled = false,
  size = 'middle',
  showWarningAlert = true,
  className,
}) => {
  const { token } = theme.useToken();
  const [internalStaffList, setInternalStaffList] = useState<SafeAny[]>([]);

  // Tự động tải danh sách staff nếu props.staffList chưa có dữ liệu
  useEffect(() => {
    if (staffList && staffList.length > 0) return;
    apiClient.customers
      .getStaff()
      .then((res: any[]) => {
        if (Array.isArray(res) && res.length > 0) {
          setInternalStaffList(res);
        }
      })
      .catch((err) => {
        console.error('CvDatePicker: Failed to fetch staff list:', err);
      });
  }, [staffList]);

  const activeStaffList = useMemo(() => {
    return staffList && staffList.length > 0 ? staffList : internalStaffList;
  }, [staffList, internalStaffList]);

  // Extract metadata from selectedCV and activeStaffList
  const { approvedOffDates, pendingOffDates, rejectedOffDates, offDays } = useMemo(() => {
    if (!selectedCV) {
      return {
        approvedOffDates: [] as string[],
        pendingOffDates: [] as string[],
        rejectedOffDates: [] as string[],
        offDays: [] as string[],
      };
    }

    const cvName = (selectedCV.displayName || selectedCV.name || selectedCV.username || '').trim().toLowerCase();
    const cvNormalized = cvName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const matchedStaffs = (activeStaffList || []).filter((s: SafeAny) => {
      if (!s) return false;
      const sId = Number(s.id);
      const selId = Number(selectedCV.id);
      if (sId > 0 && selId > 0 && sId === selId) return true;

      const sName = (s.displayName || s.name || s.username || '').trim().toLowerCase();
      const sNormalized = sName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return (
        (cvName.length > 0 && sName.includes(cvName)) ||
        (cvName.length > 0 && cvName.includes(sName)) ||
        (cvNormalized.length > 0 && sNormalized.includes(cvNormalized)) ||
        (cvNormalized.length > 0 && cvNormalized.includes(sNormalized))
      );
    });

    const fallbackOffDates = HARDCODED_OFF_DATES[cvName] || HARDCODED_OFF_DATES[cvNormalized] || [];

    const approved = Array.from(
      new Set([
        ...(selectedCV.approvedOffDates || []),
        ...matchedStaffs.flatMap((s: SafeAny) => s.approvedOffDates || []),
        ...fallbackOffDates,
      ])
    );

    const pending = Array.from(
      new Set([
        ...(selectedCV.pendingOffDates || []),
        ...matchedStaffs.flatMap((s: SafeAny) => s.pendingOffDates || []),
      ])
    );

    const rejected = Array.from(
      new Set([
        ...(selectedCV.rejectedOffDates || []),
        ...matchedStaffs.flatMap((s: SafeAny) => s.rejectedOffDates || []),
      ])
    );

    const weekly = Array.from(
      new Set([...(selectedCV.offDays || []), ...matchedStaffs.flatMap((s: SafeAny) => s.offDays || [])])
    );

    return {
      approvedOffDates: approved,
      pendingOffDates: pending,
      rejectedOffDates: rejected,
      offDays: weekly,
    };
  }, [selectedCV, activeStaffList]);

  // Check if date is approved off or weekly off day (Disable date)
  const isApprovedOrWeeklyOff = useCallback(
    (current: dayjs.Dayjs) => {
      if (!selectedCV) return false;
      const dateStr = current.format('YYYY-MM-DD');
      if (approvedOffDates.includes(dateStr)) return true;

      if (offDays.length > 0) {
        const dayOfWeek = current.day(); // 0 (Sunday), 1 (Monday) .. 6 (Saturday)
        const dbDayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek); // '1' (Mon) .. '7' (Sun)

        const isMatch = offDays.some((od: any) => {
          const odStr = String(od).trim();
          return (
            odStr === dbDayStr ||
            odStr === String(dayOfWeek) ||
            Number(odStr) === Number(dbDayStr) ||
            Number(odStr) === dayOfWeek
          );
        });

        if (isMatch) return true;
      }
      return false;
    },
    [selectedCV, approvedOffDates, offDays]
  );

  // Check if date has pending leave request ('New')
  const isPendingLeave = useCallback(
    (current: dayjs.Dayjs) => {
      if (!selectedCV) return false;
      const dateStr = current.format('YYYY-MM-DD');
      return pendingOffDates.includes(dateStr);
    },
    [selectedCV, pendingOffDates]
  );

  // Check if date has rejected/unapproved leave request ('Rejected')
  const isRejectedLeave = useCallback(
    (current: dayjs.Dayjs) => {
      if (!selectedCV) return false;
      const dateStr = current.format('YYYY-MM-DD');
      return rejectedOffDates.includes(dateStr);
    },
    [selectedCV, rejectedOffDates]
  );

  // Auto-next available date helper if current date is off
  const getNextAvailableDate = useCallback(
    (targetDate: dayjs.Dayjs) => {
      let candidate = dayjs(targetDate);
      if (candidate.isBefore(dayjs().startOf('day'))) {
        candidate = dayjs().startOf('day');
      }
      let attempts = 0;
      while (attempts < 60) {
        if (!isApprovedOrWeeklyOff(candidate)) {
          return candidate;
        }
        candidate = candidate.add(1, 'day');
        attempts++;
      }
      return candidate;
    },
    [isApprovedOrWeeklyOff]
  );

  // Warning states for currently selected value
  const selectedDateStr = value ? value.format('YYYY-MM-DD') : '';
  const selectedIsPending = selectedDateStr ? pendingOffDates.includes(selectedDateStr) : false;
  const selectedIsRejected = selectedDateStr ? rejectedOffDates.includes(selectedDateStr) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <DatePicker
        value={value}
        onChange={(val) => {
          if (!val) {
            onChange(null);
            return;
          }
          const cDayjs = dayjs(val);
          const adjusted = getNextAvailableDate(cDayjs);
          onChange(adjusted);
        }}
        format={format}
        placeholder={placeholder}
        allowClear={allowClear}
        disabled={disabled}
        size={size}
        style={style}
        className={className}
        disabledDate={(current) => {
          if (!current) return false;
          const cDayjs = dayjs(current);
          if (cDayjs.isBefore(dayjs().startOf('day'))) return true;
          return isApprovedOrWeeklyOff(cDayjs);
        }}
        cellRender={(current, info) => {
          if (info.type !== 'date' || !current) return info.originNode;
          const cDayjs = dayjs(current);
          const dateNum = cDayjs.date();
          const isDisabledOff = isApprovedOrWeeklyOff(cDayjs);
          const isPending = isPendingLeave(cDayjs);
          const isRejected = isRejectedLeave(cDayjs);

          // Render disabled off-day cell (Line-through)
          if (isDisabledOff) {
            return (
              <div
                className="ant-picker-cell-inner ant-picker-cell-disabled"
                style={{
                  color: themeMode === 'dark' ? '#cbd5e1' : '#334155',
                  opacity: 1,
                  textDecoration: 'line-through',
                  pointerEvents: 'none',
                  cursor: 'not-allowed',
                  background: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
                  borderRadius: '4px',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {dateNum}
              </div>
            );
          }

          // Render cell with Warning Badges for Pending or Rejected leave dates
          if (isPending || isRejected) {
            const badgeColor = isPending ? '#f59e0b' : '#ef4444';
            const cvDisplayName = selectedCV?.displayName || selectedCV?.name || '';
            const tooltipTitle = isPending
              ? `⚠️ Cảnh báo: CV ${cvDisplayName} có đơn xin nghỉ phép CHỜ DUYỆT vào ngày này!`
              : `⚠️ Cảnh báo: CV ${cvDisplayName} có đơn xin nghỉ phép BỊ TỪ CHỐI / KHÔNG DUYỆT vào ngày này!`;

            return (
              <Tooltip title={tooltipTitle}>
                <div
                  className="ant-picker-cell-inner"
                  style={{
                    position: 'relative',
                    border: `1px dashed ${badgeColor}`,
                    borderRadius: '4px',
                  }}
                >
                  {dateNum}
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: badgeColor,
                      boxShadow: `0 0 4px ${badgeColor}`,
                    }}
                  />
                </div>
              </Tooltip>
            );
          }

          return info.originNode;
        }}
      />

      {/* Warning Alert Banners if selected date has a pending or rejected leave request */}
      {showWarningAlert && selectedCV && (
        <>
          {selectedIsPending && (
            <Alert
              type="warning"
              showIcon
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
              message={
                <span>
                  <strong>CẢNH BÁO NGHỈ PHÉP CHƯA DUYỆT:</strong> Chuyên viên{' '}
                  <strong>{selectedCV.displayName || selectedCV.name}</strong> hiện có đơn xin nghỉ phép{' '}
                  <span className="underline font-bold">đang chờ duyệt</span> vào ngày{' '}
                  <strong>{value?.format('DD/MM/YYYY')}</strong>. Vui lòng xác nhận kỹ lịch trực trước khi chốt đơn!
                </span>
              }
            />
          )}

          {selectedIsRejected && (
            <Alert
              type="error"
              showIcon
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
              message={
                <span>
                  <strong>CẢNH BÁO NGHỈ PHÉP BỊ TỪ CHỐI:</strong> Chuyên viên{' '}
                  <strong>{selectedCV.displayName || selectedCV.name}</strong> từng gửi đơn xin nghỉ phép{' '}
                  <span className="underline font-bold">bị từ chối / không được duyệt</span> vào ngày{' '}
                  <strong>{value?.format('DD/MM/YYYY')}</strong>. Lưu ý rủi ro vắng mặt ca này!
                </span>
              }
            />
          )}
        </>
      )}
    </div>
  );
};
