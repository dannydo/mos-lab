import React from 'react';
import { Space, Tag, Typography, theme } from 'antd';
import { CustomerServiceFilterCategory } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';

const { Text } = Typography;

interface ActiveFilterTagsProps {
  filterParams: SafeAny;
  onClearFilter: (key: string) => void;
  hasActiveFilters: boolean;
  staffList?: SafeAny[];
  serviceFilterOptions?: Array<{ id: number; name: string }>;
  serviceFilterCategories?: CustomerServiceFilterCategory[];
}

export const ActiveFilterTags: React.FC<ActiveFilterTagsProps> = ({
  filterParams,
  onClearFilter,
  hasActiveFilters,
  staffList = [],
  serviceFilterOptions = [],
  serviceFilterCategories = [],
}) => {
  const { token } = theme.useToken();
  const {
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    serviceIds,
    serviceCategories,
    serviceVisitCountMin,
    serviceVisitCountMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    retainedOnly,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
    callStatuses,
    lastCallDaysMin,
    lastCallDaysMax,
  } = filterParams;

  const isAnyActive =
    hasActiveFilters ||
    dobMonth !== undefined ||
    birthdayPreset !== undefined ||
    ageMin !== undefined ||
    ageMax !== undefined ||
    (callStatuses && callStatuses.length > 0) ||
    lastCallDaysMin !== undefined ||
    lastCallDaysMax !== undefined;

  if (!isAnyActive) return null;

  const selectedServiceNames = String(serviceIds || '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .map((id) => serviceFilterOptions.find((service) => service.id === id)?.name || `#${id}`);

  const selectedServiceCategoryNames = String(serviceCategories || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => serviceFilterCategories.find((category) => category.key === key)?.label || key);

  const renderAssignedTag = () => {
    if (!assignedStaffId || assignedStaffId === 'all') return null;
    if (assignedStaffId === 'unassigned') {
      return (
        <Tag color="orange" closable onClose={() => onClearFilter('assignedStaffId')}>
          Phụ trách: Chưa phân bổ
        </Tag>
      );
    }
    if (assignedStaffId === 'me') {
      return (
        <Tag color="orange" closable onClose={() => onClearFilter('assignedStaffId')}>
          Khách hàng của tôi
        </Tag>
      );
    }
    const staff = staffList.find((s) => s.id?.toString() === assignedStaffId);
    return (
      <Tag color="orange" closable onClose={() => onClearFilter('assignedStaffId')}>
        Booker: {staff?.displayName || assignedStaffId}
      </Tag>
    );
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <Space wrap size="small">
        <Text style={{ fontSize: '12px', color: token.colorTextDescription }}>Đang lọc:</Text>

        {renderAssignedTag()}

        {assignedDaysMin !== undefined && (
          <Tag color="orange" closable onClose={() => onClearFilter('assignedDaysMin')}>
            Đã phân bổ &gt;= {assignedDaysMin} ngày
          </Tag>
        )}

        {assignedDaysMax !== undefined && (
          <Tag color="orange" closable onClose={() => onClearFilter('assignedDaysMax')}>
            Đã phân bổ &lt;= {assignedDaysMax} ngày
          </Tag>
        )}

        {retainedOnly === 'true' && (
          <Tag color="gold" closable onClose={() => onClearFilter('retainedOnly')}>
            📌 Chỉ Data đã giữ
          </Tag>
        )}

        {daysSinceLastVisitMin !== undefined && (
          <Tag color="blue" closable onClose={() => onClearFilter('daysSinceLastVisitMin')}>
            Chưa ghé &gt;= {daysSinceLastVisitMin} ngày
          </Tag>
        )}

        {daysSinceLastVisitMax !== undefined && (
          <Tag color="blue" closable onClose={() => onClearFilter('daysSinceLastVisitMax')}>
            Chưa ghé &lt;= {daysSinceLastVisitMax} ngày
          </Tag>
        )}

        {totalSpentMin !== undefined && (
          <Tag color="gold" closable onClose={() => onClearFilter('totalSpentMin')}>
            Chi tiêu &gt;= {formatVND(totalSpentMin)}
          </Tag>
        )}

        {totalSpentMax !== undefined && (
          <Tag color="gold" closable onClose={() => onClearFilter('totalSpentMax')}>
            Chi tiêu &lt;= {formatVND(totalSpentMax)}
          </Tag>
        )}

        {totalVisitsMin !== undefined && (
          <Tag color="purple" closable onClose={() => onClearFilter('totalVisitsMin')}>
            Ghé &gt;= {totalVisitsMin} lần
          </Tag>
        )}

        {totalVisitsMax !== undefined && (
          <Tag color="purple" closable onClose={() => onClearFilter('totalVisitsMax')}>
            Ghé &lt;= {totalVisitsMax} lần
          </Tag>
        )}

        {selectedServiceNames.length > 0 && (
          <Tag color="blue" closable onClose={() => onClearFilter('serviceIds')}>
            Dịch vụ: {selectedServiceNames.slice(0, 2).join(', ')}
            {selectedServiceNames.length > 2 ? ` +${selectedServiceNames.length - 2}` : ''}
          </Tag>
        )}

        {selectedServiceCategoryNames.length > 0 && (
          <Tag color="geekblue" closable onClose={() => onClearFilter('serviceCategories')}>
            Thể loại: {selectedServiceCategoryNames.join(', ')}
          </Tag>
        )}

        {serviceVisitCountMin !== undefined && (
          <Tag color="blue" closable onClose={() => onClearFilter('serviceVisitCountMin')}>
            Dùng dịch vụ &gt;= {serviceVisitCountMin} lần
          </Tag>
        )}

        {serviceVisitCountMax !== undefined && (
          <Tag color="blue" closable onClose={() => onClearFilter('serviceVisitCountMax')}>
            Dùng dịch vụ &lt;= {serviceVisitCountMax} lần
          </Tag>
        )}

        {promoUsed !== 'all' && promoCountMin === undefined && promoCountMax === undefined && (
          <Tag color="cyan" closable onClose={() => onClearFilter('promoUsed')}>
            Promo: {promoUsed === 'yes' ? 'Đã dùng' : 'Chưa dùng'}
          </Tag>
        )}

        {promoCountMin !== undefined && (
          <Tag color="cyan" closable onClose={() => onClearFilter('promoCountMin')}>
            Dùng Promo &gt;= {promoCountMin} lần
          </Tag>
        )}

        {promoCountMax !== undefined && (
          <Tag color="cyan" closable onClose={() => onClearFilter('promoCountMax')}>
            Dùng Promo &lt;= {promoCountMax} lần
          </Tag>
        )}

        {referralUsed !== 'all' && referralCountMin === undefined && referralCountMax === undefined && (
          <Tag color="magenta" closable onClose={() => onClearFilter('referralUsed')}>
            Giới thiệu: {referralUsed === 'yes' ? 'Đã giới thiệu' : 'Chưa giới thiệu'}
          </Tag>
        )}

        {referralCountMin !== undefined && (
          <Tag color="magenta" closable onClose={() => onClearFilter('referralCountMin')}>
            Giới thiệu &gt;= {referralCountMin} người
          </Tag>
        )}

        {referralCountMax !== undefined && (
          <Tag color="magenta" closable onClose={() => onClearFilter('referralCountMax')}>
            Giới thiệu &lt;= {referralCountMax} người
          </Tag>
        )}

        {dobMonth !== undefined && (
          <Tag color="purple" closable onClose={() => onClearFilter('dobMonth')}>
            Sinh nhật: Tháng {dobMonth} 🎂
          </Tag>
        )}

        {birthdayPreset && (
          <Tag color="purple" closable onClose={() => onClearFilter('birthdayPreset')}>
            Sinh nhật:{' '}
            {birthdayPreset === 'today'
              ? 'Hôm nay 🎂'
              : birthdayPreset === 'this_month'
                ? 'Tháng này 🎉'
                : 'Tháng sau 🎁'}
          </Tag>
        )}

        {ageMin !== undefined && (
          <Tag color="geekblue" closable onClose={() => onClearFilter('ageMin')}>
            Tuổi &gt;= {ageMin}
          </Tag>
        )}

        {ageMax !== undefined && (
          <Tag color="geekblue" closable onClose={() => onClearFilter('ageMax')}>
            Tuổi &lt;= {ageMax}
          </Tag>
        )}

        {callStatuses && callStatuses.length > 0 && (
          <Tag color="volcano" closable onClose={() => onClearFilter('callStatuses')}>
            Trạng thái gọi: {callStatuses.split(',').join(', ')}
          </Tag>
        )}

        {lastCallDaysMin !== undefined && (
          <Tag color="volcano" closable onClose={() => onClearFilter('lastCallDaysMin')}>
            Gọi gần nhất &gt;= {lastCallDaysMin} ngày
          </Tag>
        )}

        {lastCallDaysMax !== undefined && (
          <Tag color="volcano" closable onClose={() => onClearFilter('lastCallDaysMax')}>
            Gọi gần nhất &lt;= {lastCallDaysMax} ngày
          </Tag>
        )}
      </Space>
    </div>
  );
};
export default ActiveFilterTags;
