import React from 'react';
import { Card } from 'antd';
import type { RevenueBranchHourlyRow } from '@mos-lab/shared';

interface RevenueBranchHeatmapProps {
  themeMode: 'light' | 'dark';
  token: any;
  branchHourlyMatrix: RevenueBranchHourlyRow[];
  onCellClick?: (branchKey: string, hour: string) => void;
}

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
  return String(Math.round(val));
};

export const RevenueBranchHeatmap: React.FC<RevenueBranchHeatmapProps> = ({
  themeMode,
  token,
  branchHourlyMatrix,
  onCellClick,
}) => {
  const isDark = themeMode === 'dark';

  if (!branchHourlyMatrix || branchHourlyMatrix.length === 0) return null;

  const hours = branchHourlyMatrix[0].hours.map((h) => h.hour);
  let maxCell = 0;
  branchHourlyMatrix.forEach((row) => {
    row.hours.forEach((h) => {
      if (h.revenue > maxCell) maxCell = h.revenue;
    });
  });

  const hourTotals = hours.map((h) => {
    return branchHourlyMatrix.reduce((sum, row) => sum + (row.hours.find((hh) => hh.hour === h)?.revenue || 0), 0);
  });

  const grandTotal = branchHourlyMatrix.reduce((sum, row) => sum + row.totalRevenue, 0);

  return (
    <Card title="🌡️ Heatmap Doanh Thu Chi Nhánh × Giờ" style={{ overflowX: 'auto' }}>
      <table className="tabular-nums" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', borderBottom: `1px solid ${token.colorBorder}` }}>
              Chi nhánh
            </th>
            {hours.map((h) => (
              <th
                key={h}
                style={{ padding: '8px', textAlign: 'center', borderBottom: `1px solid ${token.colorBorder}` }}
              >
                {h}
              </th>
            ))}
            <th style={{ padding: '8px', textAlign: 'right', borderBottom: `1px solid ${token.colorBorder}` }}>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {branchHourlyMatrix.map((row) => (
            <tr key={row.branchKey}>
              <td
                style={{ padding: '8px', borderBottom: `1px solid ${token.colorBorderSecondary}`, fontWeight: 'bold' }}
              >
                {row.branchName}
              </td>
              {row.hours.map((h) => {
                const intensity = maxCell > 0 ? h.revenue / maxCell : 0;
                const bg = `rgba(16, 185, 129, ${intensity * 0.8})`;
                return (
                  <td
                    key={h.hour}
                    onClick={() => onCellClick && onCellClick(row.branchKey, h.hour)}
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      backgroundColor: bg,
                      cursor: 'pointer',
                      color: intensity > 0.5 && !isDark ? '#fff' : token.colorText,
                    }}
                  >
                    {h.revenue > 0 ? formatCompact(h.revenue) : '-'}
                  </td>
                );
              })}
              <td
                style={{ padding: '8px', textAlign: 'right', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
              >
                {formatCompact(row.totalRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ padding: '8px', fontWeight: 'bold' }}>Tổng giờ</td>
            {hourTotals.map((tot, i) => (
              <td key={i} style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
                {tot > 0 ? formatCompact(tot) : '-'}
              </td>
            ))}
            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCompact(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
};
