import React from 'react';
import { Space, Tag, Typography, theme } from 'antd';
import { formatVND } from '~/lib/format-utils';

const { Text } = Typography;

interface ActiveFilterTagsProps {
  filterParams: SafeAny;
  onClearFilter: (key: string) => void;
  hasActiveFilters: boolean;
  staffList?: SafeAny[];
}

export const ActiveFilterTags: React.FC<ActiveFilterTagsProps> = ({
  filterParams,
  onClearFilter,
  hasActiveFilters,
  staffList = [],
}) => {
  const { token } = theme.useToken();
  const {
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    retainedOnly,
  } = filterParams;

  if (!hasActiveFilters) return null;

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
      </Space>
    </div>
  );
};
export default ActiveFilterTags;
