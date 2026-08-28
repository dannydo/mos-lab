import { Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { HolidayCandidateScore } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';

const { Text } = Typography;

export const holidayCandidateColumns: ColumnsType<HolidayCandidateScore> = [
  {
    title: 'Ngày',
    dataIndex: 'workDate',
    key: 'workDate',
    render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM')}</span>,
  },
  {
    title: 'Nhân sự',
    dataIndex: 'displayName',
    key: 'displayName',
    render: (value, row) => (
      <div>
        <b>{value}</b>
        <div>
          <Text type="secondary" className="text-xs">
            {row.teamCode} · {row.storeKey}
          </Text>
        </div>
      </div>
    ),
  },
  {
    title: 'Điểm',
    dataIndex: 'totalScore',
    key: 'totalScore',
    align: 'right',
    sorter: (a, b) => (a.totalScore || 0) - (b.totalScore || 0),
    render: (value, row) =>
      row.dataSufficient ? (
        <Tooltip title={row.explanation.join(' ')}>
          <b className="tabular-nums">{Number(value).toFixed(2)}</b>
        </Tooltip>
      ) : (
        <StatusTag status="warning" label="Dữ liệu chưa đủ" />
      ),
  },
  {
    title: 'Feedback / Fix',
    key: 'quality',
    render: (_, row) => (
      <span className="tabular-nums">
        {row.metrics.verifiedNegativeFeedbackCount} / {row.metrics.fixCount}
      </span>
    ),
  },
  {
    title: 'Tip',
    dataIndex: ['metrics', 'tipRate'],
    key: 'tip',
    render: (_, row) =>
      row.metrics.tipRate === null ? (
        '-'
      ) : (
        <span className="tabular-nums">{(row.metrics.tipRate * 100).toFixed(1)}%</span>
      ),
  },
];
