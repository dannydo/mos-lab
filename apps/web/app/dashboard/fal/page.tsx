'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Alert,
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { FalLogExplanationRecord, FalReadModel } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { FalRulesModal } from './components/FalRulesModal';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });

const { Title, Text } = Typography;
const TRACE_DRAWER_WIDTH_STORAGE_KEY = 'fal_trace_drawer_width';
const TRACE_DRAWER_DEFAULT_WIDTH = 880;
const TRACE_DRAWER_MIN_WIDTH = 560;
const TRACE_DRAWER_MAX_WIDTH = 1200;
type FalCase = {
  orderServiceId: number;
  orderId: number;
  clientId: number;
  checkin: string;
  clientName: string;
  clientAvatar: string | null;
  store: string;
  serviceName: string;
  ccInName: string;
  ccOutName: string;
  ccInAvatar: string | null;
  ccOutAvatar: string | null;
  cvName: string;
  cvAvatar: string | null;
  falRule: string;
  fal: FalReadModel | null;
  logExplanation: FalLogExplanationRecord | null;
  trace: {
    origin: TraceService | null;
    remediation: TraceService;
  };
};

type LedgerItem = {
  staffId: number;
  staffName: string;
  bonusPoints: number;
  cash: number;
  bananaCredit: number;
  trackingKeys: string | null;
  positiveConfiguredRuleCount: number;
  pointMultiplier: number;
  cashMultiplier: number;
};
type TraceService = {
  orderServiceId: number;
  checkin: string | null;
  serviceName: string | null;
  bookerId: number | null;
  bookerName: string | null;
  bookerAvatar: string | null;
  cvName: string | null;
  cvAvatar: string | null;
  ccInName: string | null;
  ccOutName: string | null;
  ccInAvatar: string | null;
  ccOutAvatar: string | null;
  cvId: number | null;
  ccInId: number | null;
  ccOutId: number | null;
  ledger: LedgerItem[];
};

function toWingsAvatarUrl(value?: string | null) {
  if (!value) return undefined;
  if (/^https?:\/\//.test(value) || value.startsWith('data:')) return value.replace(/^http:\/\//, 'https://');
  return `https://wingslashes.com/${value.replace(/^\/+/, '')}`;
}

function formatMoney(value: number) {
  return `${Math.round(value || 0).toLocaleString('vi-VN')} đ`;
}

function CompactDateTime({ value }: { value?: string | null }) {
  if (!value) return <Text type="secondary">-</Text>;
  const date = dayjs(value);
  return (
    <div className="leading-tight tabular-nums">
      <div className="text-xs">{date.isValid() ? date.format('DD/MM/YY') : value.slice(0, 10)}</div>
      <Text type="secondary" className="text-[11px]">
        {date.isValid() ? date.format('HH:mm') : value.slice(11, 16)}
      </Text>
    </div>
  );
}

function CompactPerson({
  name,
  avatar,
  secondary,
  onClick,
}: {
  name?: string | null;
  avatar?: string | null;
  secondary?: string | null;
  onClick?: () => void;
}) {
  const displayName = name || '-';
  const content = (
    <Space size={6} align="start" className="max-w-full">
      <Avatar size={26} src={toWingsAvatarUrl(avatar)}>
        {displayName.slice(0, 1).toUpperCase() || '?'}
      </Avatar>
      <div className="min-w-0 leading-tight">
        <Tooltip title={displayName}>
          <div className="truncate text-xs font-medium">{displayName}</div>
        </Tooltip>
        {secondary ? (
          <Tooltip title={secondary}>
            <Text type="secondary" className="block truncate text-[11px]">
              {secondary}
            </Text>
          </Tooltip>
        ) : null}
      </div>
    </Space>
  );
  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở hồ sơ khách ${displayName}`}
      className="group block max-w-full rounded-md border-0 bg-transparent p-0 text-left transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      {content}
    </button>
  );
}

function CompactOrigin({ service, onClick }: { service: TraceService | null; onClick?: () => void }) {
  if (!service)
    return (
      <Text type="secondary" className="text-xs">
        Chưa liên kết
      </Text>
    );
  const meta = `${service.checkin ? dayjs(service.checkin).format('DD/MM HH:mm') : '-'} · ${service.serviceName || '-'}`;
  const content = (
    <div className="min-w-0 leading-tight">
      <Text strong className="text-xs">
        #{service.orderServiceId}
      </Text>
      <Tooltip title={meta}>
        <Text type="secondary" className="block truncate text-[11px]">
          {meta}
        </Text>
      </Tooltip>
    </div>
  );
  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở Trace FAL cho ca gốc #${service.orderServiceId}`}
      className="block max-w-full rounded-md border-0 bg-transparent p-0 text-left transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      {content}
    </button>
  );
}

function CompactConsultant({
  inName,
  outName,
  inAvatar,
  outAvatar,
}: {
  inName?: string | null;
  outName?: string | null;
  inAvatar?: string | null;
  outAvatar?: string | null;
}) {
  const sameConsultant = inName === outName;
  const displayName = sameConsultant ? inName || '-' : `${inName || '-'} / ${outName || '-'}`;
  return (
    <Space size={6} align="center" className="max-w-full">
      {sameConsultant ? (
        <Avatar size={26} src={toWingsAvatarUrl(inAvatar)}>
          {displayName.slice(0, 1).toUpperCase() || '?'}
        </Avatar>
      ) : (
        <Avatar.Group size={22} max={{ count: 2 }}>
          <Avatar src={toWingsAvatarUrl(inAvatar)}>{inName?.slice(0, 1).toUpperCase() || '?'}</Avatar>
          <Avatar src={toWingsAvatarUrl(outAvatar)}>{outName?.slice(0, 1).toUpperCase() || '?'}</Avatar>
        </Avatar.Group>
      )}
      <Tooltip title={displayName}>
        <Text className="block truncate text-xs">{displayName}</Text>
      </Tooltip>
    </Space>
  );
}

function TraceStaff({ name, avatar }: { name?: string | null; avatar?: string | null }) {
  const displayName = name || '-';
  return (
    <Space size={6} className="min-w-0">
      <Avatar size="small" src={toWingsAvatarUrl(avatar)}>
        {displayName.slice(0, 1).toUpperCase() || '?'}
      </Avatar>
      <Tooltip title={displayName}>
        <Text className="truncate">{displayName}</Text>
      </Tooltip>
    </Space>
  );
}

function clampTraceDrawerWidth(value: number) {
  if (typeof window === 'undefined') return Math.max(TRACE_DRAWER_MIN_WIDTH, Math.min(TRACE_DRAWER_MAX_WIDTH, value));
  const availableWidth = Math.max(320, window.innerWidth - 40);
  return Math.round(
    Math.max(Math.min(TRACE_DRAWER_MIN_WIDTH, availableWidth), Math.min(TRACE_DRAWER_MAX_WIDTH, availableWidth, value))
  );
}

function originRule(rule: string) {
  if (rule === 'Fix')
    return 'Ca gốc: chỉ CV chịu trách nhiệm. Toàn bộ ledger của CV ca gốc bị thu hồi; CC ca gốc giữ nguyên.';
  if (rule === 'Adjust')
    return 'Ca gốc: chỉ CC chịu trách nhiệm. Toàn bộ ledger của CC ca gốc bị thu hồi; CV ca gốc giữ nguyên.';
  return 'Ca gốc giữ nguyên quyền lợi. Log là do khách thay đổi ý, không mặc định là lỗi của CC/CV.';
}

function remediationRule(record: FalCase) {
  const minutes = record.fal?.totalMinutes;
  if (!minutes) return 'Chưa có đủ thời lượng thực tế: chưa cấp tua đầu và chưa được chốt quyền lợi tài chính.';
  const rotation =
    minutes <= 25 ? 'CV đã được cấp tua đầu ngay khi hoàn tất ca.' : 'CV trở về tua cuối theo luồng bình thường.';
  if (record.falRule === 'Log' && record.fal?.financialEligibility !== 'READY') {
    return `${rotation} Điểm và thưởng vẫn bị chặn cho đến khi Log được duyệt.`;
  }
  if (minutes <= 25)
    return `${rotation} CV nhận 15 Chuối; CC nhận tổng 5 Chuối (CC IN khác CC OUT thì chia 50/50). Không cộng thưởng thường chồng lên.`;
  return `${rotation} CC/CV chạy quyền lợi thường. Không cộng Chuối FAL.`;
}

function rotationLabel(record: FalCase) {
  const priority = record.fal?.rotationPriority;
  if (priority?.status === 'CONSUMED') return `Đã dùng · đơn #${priority.consumedOrderId || '-'}`;
  if (priority?.status === 'EXPIRED') return 'Đã hết hiệu lực';
  if (priority?.status === 'READY') return 'Tua đầu · chờ khách kế tiếp';
  if (record.fal?.rotationMode === 'HEAD') return 'Theo rule: tua đầu · chưa có token';
  if (record.fal?.rotationMode === 'FINAL') return 'Tua cuối';
  return 'Chưa đủ dữ liệu tua';
}

function RotationIndicator({ record }: { record: FalCase }) {
  const priority = record.fal?.rotationPriority;
  if (priority?.status === 'CONSUMED') {
    return (
      <Tooltip title={`Tua đầu đã dùng cho đơn #${priority.consumedOrderId || '-'}`}>
        <span aria-label="Tua đầu đã dùng" className="fal-rotation-icon fal-rotation-consumed">
          <CheckCircleOutlined />
        </span>
      </Tooltip>
    );
  }
  if (priority?.status === 'EXPIRED') {
    return (
      <Tooltip title="Tua đầu đã hết hiệu lực khi CV checkout hoặc kết thúc ngày vận hành.">
        <span aria-label="Tua đầu đã hết hiệu lực" className="fal-rotation-icon fal-rotation-final">
          <ClockCircleOutlined />
        </span>
      </Tooltip>
    );
  }
  if (priority?.status === 'READY') {
    return (
      <Tooltip title="Tua đầu đã cấp — CV được ưu tiên nhận khách kế tiếp.">
        <span aria-label="Tua đầu đang chờ khách kế tiếp" className="fal-rotation-icon fal-rotation-head">
          <ArrowUpOutlined />
        </span>
      </Tooltip>
    );
  }
  if (record.fal?.rotationMode === 'HEAD') {
    return (
      <Tooltip title="Theo rule: ca 1–25 phút được tua đầu. Không có token lịch sử vì hệ thống không backfill thứ tự phân khách đã xảy ra.">
        <span aria-label="Theo rule là tua đầu" className="fal-rotation-icon fal-rotation-head">
          <ArrowUpOutlined />
        </span>
      </Tooltip>
    );
  }
  if (record.fal?.rotationMode === 'FINAL') {
    return (
      <Tooltip title="Tua cuối: ca trên 25 phút chạy luồng phân khách bình thường.">
        <span aria-label="Tua cuối" className="fal-rotation-icon fal-rotation-final">
          <ArrowDownOutlined />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Thiếu hoặc bằng 0 phút; chưa đủ điều kiện xác định tua CV.">
      <span aria-label="Chưa đủ dữ liệu tua" className="fal-rotation-icon fal-rotation-undetermined">
        <ExclamationCircleOutlined />
      </span>
    </Tooltip>
  );
}

function ledgerEligibilityMeta(record: FalCase) {
  const eligibility = record.fal?.financialEligibility;
  if (eligibility === 'READY') {
    if (record.falRule === 'Log' && record.logExplanation?.ledgerStatus !== 'APPLIED') {
      return {
        color: 'blue',
        label: 'Đủ điều kiện · chờ ghi thưởng',
        help: 'Log đã được duyệt. Worker Wings sẽ ghi điểm, tiền hoặc Chuối vào staff_bonus trong tối đa 1 phút.',
      };
    }
    return {
      color: 'green',
      label: 'Đủ điều kiện ghi thưởng',
      help: 'Rule cho phép ghi quyền lợi tài chính. Hãy đối chiếu bút toán thực tế trong Trace.',
    };
  }
  if (eligibility === 'PENDING_LOG_APPROVAL') {
    return {
      color: 'gold',
      label: 'Chờ duyệt giải trình',
      help: 'Log chưa được duyệt nên chưa được phép ghi điểm, tiền hoặc Chuối. Tua CV vẫn chạy độc lập.',
    };
  }
  if (eligibility === 'REJECTED') {
    return {
      color: 'red',
      label: 'Từ chối · không ghi thưởng',
      help: 'Giải trình Log bị từ chối; ca này không có bút toán điểm, tiền hoặc Chuối.',
    };
  }
  if (eligibility === 'INVALID_DURATION') {
    return {
      color: 'orange',
      label: 'Thiếu/0 phút · không ghi thưởng',
      help: 'Thiếu servicing_minute hoặc cleaning_minute, hoặc tổng thời lượng bằng 0.',
    };
  }
  return {
    color: 'default',
    label: 'Chưa có dữ liệu điều kiện',
    help: 'API chưa trả về kết quả đánh giá tài chính; đây không phải xác nhận đã được hay mất thưởng.',
  };
}

function FinancialEligibilityIndicator({ record }: { record: FalCase }) {
  const meta = ledgerEligibilityMeta(record);
  const eligibility = record.fal?.financialEligibility;
  if (eligibility === 'READY' && record.falRule === 'Log' && record.logExplanation?.ledgerStatus !== 'APPLIED') {
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-processing">
          <ClockCircleOutlined />
        </span>
      </Tooltip>
    );
  }
  if (eligibility === 'READY')
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-ready">
          <CheckCircleOutlined />
        </span>
      </Tooltip>
    );
  if (eligibility === 'PENDING_LOG_APPROVAL')
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-pending">
          <ClockCircleOutlined />
        </span>
      </Tooltip>
    );
  if (eligibility === 'REJECTED')
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-rejected">
          <CloseCircleOutlined />
        </span>
      </Tooltip>
    );
  if (eligibility === 'INVALID_DURATION')
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-pending">
          <ExclamationCircleOutlined />
        </span>
      </Tooltip>
    );
  return (
    <Tooltip title={meta.help}>
      <span aria-label={meta.label} className="fal-status-icon fal-status-follow">
        <QuestionCircleOutlined />
      </span>
    </Tooltip>
  );
}

function LogDecisionIndicator({ record }: { record: FalCase }) {
  if (record.falRule !== 'Log') {
    return (
      <Tooltip title="Fix/Adjust: theo dõi trách nhiệm FAL, không cần approval Log.">
        <span aria-label="Theo dõi FAL" className="fal-status-icon fal-status-follow">
          <EyeOutlined />
        </span>
      </Tooltip>
    );
  }
  if (record.logExplanation?.decisionStatus === 'APPROVED') {
    return (
      <Tooltip title="Log đã được duyệt giải trình.">
        <span aria-label="Log đã được duyệt" className="fal-status-icon fal-status-ready">
          <CheckCircleOutlined />
        </span>
      </Tooltip>
    );
  }
  if (record.logExplanation?.decisionStatus === 'REJECTED') {
    return (
      <Tooltip title="Log bị từ chối giải trình; không ghi điểm, tiền hoặc Chuối.">
        <span aria-label="Log bị từ chối" className="fal-status-icon fal-status-rejected">
          <CloseCircleOutlined />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip
      title={
        record.logExplanation?.explanation ? 'Đã có giải trình, đang chờ quản lý duyệt.' : 'CC chưa gửi giải trình Log.'
      }
    >
      <span aria-label="Log đang chờ giải trình hoặc duyệt" className="fal-status-icon fal-status-pending">
        <ClockCircleOutlined />
      </span>
    </Tooltip>
  );
}

type LedgerRole = 'BK' | 'CC' | 'CV' | 'Khác';

function isSameStaffId(left?: number | null, right?: number | null) {
  return left != null && right != null && Number(left) === Number(right);
}

function getLedgerRoles(item: LedgerItem, service: TraceService): LedgerRole[] {
  const roles: LedgerRole[] = [];
  if (isSameStaffId(item.staffId, service.bookerId)) roles.push('BK');
  if (isSameStaffId(item.staffId, service.ccInId) || isSameStaffId(item.staffId, service.ccOutId)) roles.push('CC');
  if (isSameStaffId(item.staffId, service.cvId)) roles.push('CV');
  return roles.length ? roles : ['Khác'];
}

function getLedgerRole(item: LedgerItem, service: TraceService) {
  return getLedgerRoles(item, service)[0];
}

function compareLedgerByRole(left: LedgerItem, right: LedgerItem, service: TraceService) {
  const rank: Record<string, number> = { BK: 0, CC: 1, CV: 2, Khác: 3 };
  const rankDiff = rank[getLedgerRole(left, service)] - rank[getLedgerRole(right, service)];
  return rankDiff || left.staffName.localeCompare(right.staffName, 'vi');
}

function getOriginLedgerImpact(
  item: LedgerItem,
  service: TraceService,
  rule: string,
  remediationOrderServiceId: number
) {
  const roles = getLedgerRoles(item, service);
  const role = roles[0];
  const responsibleRole = rule === 'Fix' ? 'CV' : rule === 'Adjust' ? 'CC' : null;
  if (!responsibleRole || !roles.includes(responsibleRole)) {
    const isAdjustCvHistoricalMismatch =
      rule === 'Adjust' &&
      roles.includes('CV') &&
      item.bonusPoints === 0 &&
      item.cash === 0 &&
      item.positiveConfiguredRuleCount > 0 &&
      item.pointMultiplier > 0 &&
      item.cashMultiplier > 0;
    return isAdjustCvHistoricalMismatch
      ? 'Cần backfill — 0 trái rule Adjust'
      : roles.every((currentRole) => currentRole === 'Khác' || currentRole === 'BK')
        ? 'Không thuộc FAL'
        : 'Giữ nguyên';
  }
  return item.trackingKeys?.includes(`\"next_order_service_id\":\"${remediationOrderServiceId}\"`)
    ? `Đã thu hồi → #${remediationOrderServiceId}`
    : 'Cần kiểm tra thu hồi';
}

function LedgerList({
  ledger,
  service,
  rule,
  isOrigin,
  remediationOrderServiceId,
}: {
  ledger: LedgerItem[];
  service: TraceService;
  rule: string;
  isOrigin: boolean;
  remediationOrderServiceId: number;
}) {
  if (!ledger.length) return <Text type="secondary">Chưa có bút toán trong staff_bonus.</Text>;
  return (
    <div className="space-y-2">
      {[...ledger]
        .sort((left, right) => compareLedgerByRole(left, right, service))
        .map((item) => {
          const roles = getLedgerRoles(item, service);
          const impact = isOrigin
            ? getOriginLedgerImpact(item, service, rule, remediationOrderServiceId)
            : 'Ledger ca xử lý';
          return (
            <div key={item.staffId} className="rounded-lg border px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Space size={6} wrap className="min-w-0">
                  <Text strong ellipsis>
                    {item.staffName}
                  </Text>
                  {roles.map((role) => (
                    <Tag
                      key={role}
                      color={role === 'CV' ? 'purple' : role === 'CC' ? 'blue' : role === 'BK' ? 'cyan' : 'default'}
                    >
                      {role}
                    </Tag>
                  ))}
                </Space>
                <Space size={4} wrap className="ml-auto">
                  <Tag color={item.bananaCredit === 0 ? 'default' : 'gold'}>
                    {item.bananaCredit.toLocaleString('vi-VN')} Chuối
                  </Tag>
                  <Tag color={item.bonusPoints === 0 ? 'default' : 'blue'}>
                    {item.bonusPoints.toLocaleString('vi-VN')} điểm
                  </Tag>
                  <Tag color={item.cash === 0 ? 'default' : 'green'}>{formatMoney(item.cash)}</Tag>
                </Space>
              </div>
              <Text type="secondary" className="text-xs">
                {impact}
              </Text>
            </div>
          );
        })}
    </div>
  );
}

function TraceCaseCard({
  title,
  service,
  fallback,
  rule,
  isOrigin,
  remediationOrderServiceId,
}: {
  title: string;
  service: TraceService | null;
  fallback: string;
  rule: string;
  isOrigin: boolean;
  remediationOrderServiceId: number;
}) {
  if (!service)
    return (
      <Card size="small" title={title}>
        <Text type="secondary">{fallback}</Text>
      </Card>
    );
  return (
    <Card size="small" title={title}>
      <Descriptions
        size="small"
        column={1}
        items={[
          { key: 'id', label: 'Mã ca', children: `#${service.orderServiceId}` },
          { key: 'time', label: 'Thời gian', children: service.checkin || '-' },
          { key: 'service', label: 'Dịch vụ', children: service.serviceName || '-' },
          {
            key: 'bk',
            label: 'BK',
            children: <TraceStaff name={service.bookerName} avatar={service.bookerAvatar} />,
          },
          {
            key: 'cc',
            label: 'CC IN / OUT',
            children: (
              <CompactConsultant
                inName={service.ccInName}
                outName={service.ccOutName}
                inAvatar={
                  service.ccInAvatar || (isSameStaffId(service.ccInId, service.bookerId) ? service.bookerAvatar : null)
                }
                outAvatar={
                  service.ccOutAvatar ||
                  (isSameStaffId(service.ccOutId, service.bookerId) ? service.bookerAvatar : null)
                }
              />
            ),
          },
          {
            key: 'cv',
            label: 'CV',
            children: <TraceStaff name={service.cvName} avatar={service.cvAvatar} />,
          },
        ]}
      />
      <Divider className="!my-3" />
      <Text strong>Ledger đã chốt (`staff_bonus`)</Text>
      <div className="mt-2">
        <LedgerList
          ledger={service.ledger}
          service={service}
          rule={rule}
          isOrigin={isOrigin}
          remediationOrderServiceId={remediationOrderServiceId}
        />
      </div>
    </Card>
  );
}

export default function FalControlTowerPage() {
  const [data, setData] = useState<FalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [rule, setRule] = useState<string | undefined>();
  const [dateRangeMode, setDateRangeMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<FalCase | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [traceDrawerWidth, setTraceDrawerWidth] = useState(TRACE_DRAWER_DEFAULT_WIDTH);
  const [isTraceResizing, setIsTraceResizing] = useState(false);
  const [traceDrawerWidthRestored, setTraceDrawerWidthRestored] = useState(false);
  const traceResizeStartX = useRef<number | null>(null);
  const traceResizeStartWidth = useRef(TRACE_DRAWER_DEFAULT_WIDTH);
  const [form] = Form.useForm<{ explanation: string; explanationChannel: string }>();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fal_control_tower_filters');
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        rule?: string;
        dateRangeMode?: string;
        selectedDate?: string;
        page?: number;
        pageSize?: number;
      };
      if (['Fix', 'Adjust', 'Log'].includes(saved.rule || '')) setRule(saved.rule);
      if (['day', 'week', 'month'].includes(saved.dateRangeMode || ''))
        setDateRangeMode(saved.dateRangeMode as 'day' | 'week' | 'month');
      if (saved.selectedDate && dayjs(saved.selectedDate).isValid()) setSelectedDate(dayjs(saved.selectedDate));
      if (Number.isInteger(saved.page) && saved.page! > 0) setPage(saved.page!);
      if ([50, 100, 200, 500].includes(Number(saved.pageSize))) setPageSize(Number(saved.pageSize));
    } catch {
      localStorage.removeItem('fal_control_tower_filters');
    } finally {
      setFiltersRestored(true);
    }
  }, []);

  useEffect(() => {
    try {
      const savedWidth = Number(localStorage.getItem(TRACE_DRAWER_WIDTH_STORAGE_KEY));
      if (Number.isFinite(savedWidth) && savedWidth > 0) setTraceDrawerWidth(clampTraceDrawerWidth(savedWidth));
      else setTraceDrawerWidth(clampTraceDrawerWidth(TRACE_DRAWER_DEFAULT_WIDTH));
    } catch {
      setTraceDrawerWidth(clampTraceDrawerWidth(TRACE_DRAWER_DEFAULT_WIDTH));
    } finally {
      setTraceDrawerWidthRestored(true);
    }
  }, []);

  useEffect(() => {
    const keepDrawerInViewport = () => setTraceDrawerWidth((value) => clampTraceDrawerWidth(value));
    window.addEventListener('resize', keepDrawerInViewport);
    return () => window.removeEventListener('resize', keepDrawerInViewport);
  }, []);

  useEffect(() => {
    if (!isTraceResizing) return;
    const resize = (event: MouseEvent) => {
      if (traceResizeStartX.current === null) return;
      setTraceDrawerWidth(
        clampTraceDrawerWidth(traceResizeStartWidth.current + traceResizeStartX.current - event.clientX)
      );
    };
    const finishResize = () => {
      setIsTraceResizing(false);
      traceResizeStartX.current = null;
    };
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', finishResize);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', finishResize);
    };
  }, [isTraceResizing]);

  useEffect(() => {
    if (traceDrawerWidthRestored && !isTraceResizing) {
      try {
        localStorage.setItem(TRACE_DRAWER_WIDTH_STORAGE_KEY, String(traceDrawerWidth));
      } catch {
        // Storage can be unavailable in private browser contexts; resizing still works for this session.
      }
    }
  }, [isTraceResizing, traceDrawerWidth, traceDrawerWidthRestored]);

  const startTraceResize = (event: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 640) return;
    event.preventDefault();
    traceResizeStartX.current = event.clientX;
    traceResizeStartWidth.current = traceDrawerWidth;
    setIsTraceResizing(true);
  };

  const dateBounds =
    dateRangeMode === 'week'
      ? {
          dateFrom: selectedDate.startOf('isoWeek').format('YYYY-MM-DD'),
          dateTo: selectedDate.endOf('isoWeek').format('YYYY-MM-DD'),
        }
      : dateRangeMode === 'month'
        ? {
            dateFrom: selectedDate.startOf('month').format('YYYY-MM-DD'),
            dateTo: selectedDate.endOf('month').format('YYYY-MM-DD'),
          }
        : { dateFrom: selectedDate.format('YYYY-MM-DD'), dateTo: selectedDate.format('YYYY-MM-DD') };

  const load = useCallback(
    async (nextPage = page, nextPageSize = pageSize, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await apiClient.fal.listCases({ rule, ...dateBounds, page: nextPage, limit: nextPageSize });
        const nextData = response.data as FalCase[];
        setData(nextData);
        setTotal(response.total);
        setSelected((current) =>
          current ? nextData.find((item) => item.orderServiceId === current.orderServiceId) || current : current
        );
      } catch {
        if (!silent) message.error('Không tải được danh sách Fix / Adjust / Log.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [dateBounds.dateFrom, dateBounds.dateTo, page, pageSize, rule]
  );

  useEffect(() => {
    if (filtersRestored) load();
  }, [filtersRestored, load]);

  const hasPendingApprovedLogLedger = data.some(
    (item) =>
      item.falRule === 'Log' &&
      item.logExplanation?.decisionStatus === 'APPROVED' &&
      item.logExplanation.ledgerStatus === 'NOT_APPLIED'
  );

  useEffect(() => {
    if (!filtersRestored || !hasPendingApprovedLogLedger) return;
    const intervalId = window.setInterval(() => {
      void load(page, pageSize, true);
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [filtersRestored, hasPendingApprovedLogLedger, load, page, pageSize]);

  useEffect(() => {
    if (!filtersRestored) return;
    localStorage.setItem(
      'fal_control_tower_filters',
      JSON.stringify({
        rule,
        dateRangeMode,
        selectedDate: selectedDate.format('YYYY-MM-DD'),
        page,
        pageSize,
      })
    );
  }, [dateRangeMode, filtersRestored, page, pageSize, rule, selectedDate]);

  const moveDate = (direction: -1 | 1) => {
    const unit = dateRangeMode === 'day' ? 'day' : dateRangeMode === 'week' ? 'week' : 'month';
    setSelectedDate((value) => value.add(direction, unit));
    setPage(1);
  };

  const changeDateMode = (mode: 'day' | 'week' | 'month') => {
    setDateRangeMode(mode);
    setPage(1);
  };

  const openCustomerDetail = (customerId: number) => {
    if (!customerId) return;
    setSelectedCustomerId(customerId);
    setCustomerDrawerOpen(true);
  };

  const submitExplanation = async (values: { explanation: string; explanationChannel: string }) => {
    if (!selected) return;
    try {
      await apiClient.fal.submitLogExplanation(selected.orderServiceId, values);
      message.success('Đã gửi giải trình Log chờ duyệt.');
      setExplanationOpen(false);
      form.resetFields();
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không gửi được giải trình.');
    }
  };

  const approve = async (record: FalCase, approved: boolean) => {
    const rejectionReason = approved ? undefined : window.prompt('Lý do từ chối Log:') || undefined;
    if (!approved && !rejectionReason) return;
    try {
      await apiClient.fal.approveLog(record.orderServiceId, { approved, rejectionReason });
      message.success(approved ? 'Đã duyệt Log để Wings chốt điểm/thưởng.' : 'Đã từ chối Log.');
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Không cập nhật được approval.');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-0">
            FAL Control Tower
          </Title>
          <Text type="secondary">Danh sách Fix / Adjust / Log thực tế do CC chọn tại Wings. MOS không tạo FAL.</Text>
        </div>
        <Space wrap>
          <Radio.Group
            value={dateRangeMode}
            onChange={(event) => changeDateMode(event.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Tooltip title="Xem theo Ngày">
              <Radio.Button value="day">
                <CalendarOutlined />
              </Radio.Button>
            </Tooltip>
            <Tooltip title="Xem theo Tuần (Thứ 2 đến Chủ Nhật)">
              <Radio.Button value="week">
                <ScheduleOutlined />
              </Radio.Button>
            </Tooltip>
            <Tooltip title="Xem theo Tháng">
              <Radio.Button value="month">
                <ClockCircleOutlined />
              </Radio.Button>
            </Tooltip>
          </Radio.Group>
          <Space.Compact size="small">
            <Button aria-label="Khoảng thời gian trước" icon={<LeftOutlined />} onClick={() => moveDate(-1)} />
            <DatePicker
              value={selectedDate}
              onChange={(value) => {
                if (value) {
                  setSelectedDate(value);
                  setPage(1);
                }
              }}
              picker={dateRangeMode === 'month' ? 'month' : undefined}
              allowClear={false}
              suffixIcon={<CalendarOutlined />}
              format={(value) =>
                dateRangeMode === 'month'
                  ? `Tháng ${value.format('MM/YYYY')}`
                  : dateRangeMode === 'week'
                    ? `Tuần ${value.isoWeek()} (${value.startOf('isoWeek').format('DD/MM')} - ${value.endOf('isoWeek').format('DD/MM/YYYY')})`
                    : value.format('DD/MM/YYYY')
              }
              className={dateRangeMode === 'week' ? 'w-[235px]' : dateRangeMode === 'month' ? 'w-[135px]' : 'w-[130px]'}
            />
            <Button aria-label="Khoảng thời gian sau" icon={<RightOutlined />} onClick={() => moveDate(1)} />
          </Space.Compact>
          <Select
            value={rule}
            allowClear
            placeholder="Tất cả FAL"
            className="min-w-32"
            onChange={(value) => {
              setRule(value);
              setPage(1);
            }}
            options={['Fix', 'Adjust', 'Log'].map((value) => ({ value }))}
          />
          <Tooltip title="Cách tính Fix / Adjust / Log">
            <Button
              aria-label="Giải thích business rules FAL"
              icon={<InfoCircleOutlined />}
              onClick={() => setRulesOpen(true)}
            />
          </Tooltip>
          <Button icon={<ReloadOutlined />} onClick={() => load()}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Alert
        type="warning"
        showIcon
        message="Tua CV chạy ngay theo tổng phút: 1–25 phút về tua đầu, >25 phút về tua cuối. Riêng Log vẫn cần duyệt giải trình trước khi chốt điểm hoặc thưởng."
      />

      <Card title={`FAL từ Wings (${total.toLocaleString('vi-VN')} ca)`}>
        <Table<FalCase>
          rowKey="orderServiceId"
          size="small"
          className="compact-table fal-control-table"
          loading={loading}
          dataSource={data}
          scroll={{ x: 1420 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['50', '100', '200', '500'],
            showTotal: (value) => `Tổng ${value.toLocaleString('vi-VN')} ca`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          columns={[
            {
              title: 'STT',
              width: 52,
              align: 'center',
              render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
            },
            { title: 'Thời gian', width: 104, render: (_, record) => <CompactDateTime value={record.checkin} /> },
            {
              title: 'FAL',
              width: 58,
              dataIndex: 'falRule',
              render: (value) => (
                <Tag
                  className="!mr-0"
                  color={value === 'Fix' ? 'red' : value === 'Adjust' ? 'orange' : value === 'Log' ? 'blue' : 'default'}
                >
                  {value}
                </Tag>
              ),
            },
            {
              title: 'Khách / dịch vụ',
              width: 185,
              render: (_, record) => (
                <CompactPerson
                  name={record.clientName}
                  avatar={record.clientAvatar}
                  secondary={record.serviceName}
                  onClick={() => openCustomerDetail(record.clientId)}
                />
              ),
            },
            {
              title: 'Ca gốc',
              width: 170,
              render: (_, record) => (
                <CompactOrigin
                  service={record.trace.origin}
                  onClick={() => {
                    if (record.trace.origin) {
                      setSelected(record);
                      setTraceOpen(true);
                    }
                  }}
                />
              ),
            },
            {
              title: 'CC chọn',
              width: 150,
              render: (_, record) => (
                <CompactConsultant
                  inName={record.ccInName}
                  outName={record.ccOutName}
                  inAvatar={record.ccInAvatar}
                  outAvatar={record.ccOutAvatar}
                />
              ),
            },
            {
              title: 'CV',
              width: 125,
              render: (_, record) => <CompactPerson name={record.cvName} avatar={record.cvAvatar} />,
            },
            {
              title: 'Phút',
              width: 48,
              align: 'center',
              render: (_, record) => <span className="tabular-nums">{record.fal?.totalMinutes ?? '-'}</span>,
            },
            {
              title: (
                <Tooltip title="Tua CV: ↑ tua đầu, ↓ tua cuối. Hover icon để xem điều kiện và trạng thái token.">
                  Tua CV
                </Tooltip>
              ),
              width: 68,
              align: 'center',
              render: (_, record) => <RotationIndicator record={record} />,
            },
            {
              title: (
                <Tooltip title="Điểm & thưởng: hover icon để xem ca có được phép ghi điểm, tiền thưởng và Chuối vào staff_bonus hay không.">
                  Điểm & thưởng
                </Tooltip>
              ),
              width: 92,
              align: 'center',
              render: (_, record) => <FinancialEligibilityIndicator record={record} />,
            },
            {
              title: (
                <Tooltip title="Trạng thái giải trình Log hoặc trạng thái theo dõi của Fix/Adjust.">Trạng thái</Tooltip>
              ),
              width: 82,
              align: 'center',
              render: (_, record) => <LogDecisionIndicator record={record} />,
            },
            {
              title: 'Giải trình',
              width: 150,
              render: (_, record) =>
                record.falRule === 'Log' ? (
                  record.logExplanation?.explanation ? (
                    <Tooltip title={record.logExplanation.explanation}>
                      <Text className="block truncate text-xs">{record.logExplanation.explanation}</Text>
                    </Tooltip>
                  ) : (
                    <Tooltip title="CC chưa gửi giải trình cho Log này.">
                      <span className="fal-status-icon fal-status-pending">
                        <FileTextOutlined />
                      </span>
                    </Tooltip>
                  )
                ) : (
                  <Text type="secondary">-</Text>
                ),
            },
            {
              title: 'Hành động',
              width: 124,
              render: (_, record) => (
                <Space size={4}>
                  <Tooltip title="Trace quyền lợi">
                    <Button
                      aria-label={`Trace FAL #${record.orderServiceId}`}
                      size="small"
                      icon={<AuditOutlined />}
                      onClick={() => {
                        setSelected(record);
                        setTraceOpen(true);
                      }}
                    />
                  </Tooltip>
                  {record.falRule === 'Log' &&
                  record.logExplanation?.decisionStatus === 'PENDING' &&
                  record.logExplanation.explanation ? (
                    <Tooltip title="Duyệt giải trình">
                      <Button
                        aria-label={`Duyệt giải trình Log #${record.orderServiceId}`}
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => approve(record, true)}
                      />
                    </Tooltip>
                  ) : null}
                  {record.falRule === 'Log' ? (
                    <Tooltip title="Giải trình Log">
                      <Button
                        aria-label={`Giải trình Log #${record.orderServiceId}`}
                        size="small"
                        icon={<FileTextOutlined />}
                        onClick={() => {
                          setSelected(record);
                          setExplanationOpen(true);
                          form.setFieldsValue({
                            explanation: record.logExplanation?.explanation || '',
                            explanationChannel: record.logExplanation?.explanationChannel || 'manual',
                          });
                        }}
                      />
                    </Tooltip>
                  ) : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Drawer
        open={traceOpen}
        onClose={() => setTraceOpen(false)}
        width={traceDrawerWidth}
        title={`Trace FAL #${selected?.orderServiceId || ''}`}
        styles={{ body: { padding: 0 } }}
      >
        <div
          className={`relative h-full overflow-y-auto p-4 md:p-5 ${isTraceResizing ? 'select-none cursor-col-resize' : ''}`}
        >
          <div
            role="separator"
            aria-label="Kéo để đổi độ rộng Trace FAL"
            aria-orientation="vertical"
            onMouseDown={startTraceResize}
            className="absolute inset-y-0 left-0 z-10 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none md:block"
          >
            <span className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-slate-400/40 transition-colors hover:bg-amber-400" />
          </div>
          {selected ? (
            <div className="space-y-4">
              <Alert type="info" showIcon message={`${selected.falRule}: ${originRule(selected.falRule)}`} />
              <Card size="small" title="Liên kết FAL">
                <Steps
                  size="small"
                  current={2}
                  items={[
                    {
                      title: 'Ca gốc',
                      description: selected.trace.origin
                        ? `#${selected.trace.origin.orderServiceId}`
                        : 'Chưa ghi nhận liên kết',
                    },
                    { title: selected.falRule, description: 'CC chọn trong Wings' },
                    { title: 'Ca xử lý', description: `#${selected.trace.remediation.orderServiceId}` },
                  ]}
                />
              </Card>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
                <TraceCaseCard
                  title="1. Ca gốc"
                  service={selected.trace.origin}
                  fallback="Wings chưa lưu liên kết ca gốc cho record này."
                  rule={selected.falRule}
                  isOrigin
                  remediationOrderServiceId={selected.trace.remediation.orderServiceId}
                />
                <TraceCaseCard
                  title="2. Ca đang xử lý"
                  service={selected.trace.remediation}
                  fallback="Không có dữ liệu ca xử lý."
                  rule={selected.falRule}
                  isOrigin={false}
                  remediationOrderServiceId={selected.trace.remediation.orderServiceId}
                />
              </div>
              <Card size="small" title="3. Quyền lợi phải áp dụng">
                <div className="space-y-2">
                  <Text>{originRule(selected.falRule)}</Text>
                  <Divider className="!my-2" />
                  <Text>{remediationRule(selected)}</Text>
                </div>
              </Card>
              <Card size="small" title="4. Tua CV vận hành">
                <Descriptions
                  size="small"
                  column={1}
                  items={[
                    {
                      key: 'mode',
                      label: 'Phân loại',
                      children:
                        selected.fal?.rotationMode === 'HEAD'
                          ? 'Tua đầu (1–25 phút)'
                          : selected.fal?.rotationMode === 'FINAL'
                            ? 'Tua cuối (>25 phút)'
                            : 'Chưa đủ thời lượng',
                    },
                    { key: 'status', label: 'Trạng thái', children: rotationLabel(selected) },
                    {
                      key: 'completed',
                      label: 'Hoàn tất lúc',
                      children: selected.fal?.rotationPriority?.completedAt || '-',
                    },
                  ]}
                />
                <Text type="secondary" className="text-xs">
                  Tua là quyền vận hành của CV, chạy độc lập với approval Log và ledger `staff_bonus`.
                </Text>
              </Card>
              <Alert
                type="warning"
                showIcon
                message="Cách đối soát"
                description="So sánh rule ở bước 3 với ledger ở hai ca. Nếu ledger khác rule, chưa có bút toán hoặc ca gốc không liên kết, quản lý cần mở issue trước khi chốt quyền lợi."
              />
            </div>
          ) : null}
        </div>
      </Drawer>

      <CustomerDetailDrawer
        open={customerDrawerOpen}
        customerId={selectedCustomerId}
        onClose={() => setCustomerDrawerOpen(false)}
      />

      <FalRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <Modal
        open={explanationOpen}
        title={`Giải trình Log #${selected?.orderServiceId || ''}`}
        onCancel={() => setExplanationOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={submitExplanation}
          initialValues={{ explanationChannel: 'manual' }}
        >
          <Form.Item name="explanationChannel" label="Kênh giải trình" rules={[{ required: true }]}>
            <Select options={['manual', 'formal', 'informal'].map((value) => ({ value }))} />
          </Form.Item>
          <Form.Item
            name="explanation"
            label="Nội dung giải trình"
            rules={[{ required: true, message: 'CC cần giải trình trước khi nhận điểm.' }]}
          >
            <Input.TextArea rows={5} placeholder="Khách đổi ý thế nào? CC đã xử lý ra sao?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<SafetyCertificateOutlined />}>
            Gửi giải trình
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
