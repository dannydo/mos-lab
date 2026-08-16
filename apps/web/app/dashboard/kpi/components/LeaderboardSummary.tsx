import React from 'react';
import { Table } from 'antd';

interface LeaderboardSummaryProps {
  pageData: readonly SafeAny[];
  selectedRole: 'oc' | 'telesales';
  token: SafeAny;
}

export const LeaderboardSummary: React.FC<LeaderboardSummaryProps> = ({ pageData, selectedRole, token }) => {
  let totalPlanned = 0;
  let totalCalled = 0;
  let totalBooked = 0;
  let totalCheckin = 0;

  let totalBaseSalary = 0;
  let totalClientBonus = 0;
  let totalDoneBonus = 0;
  let totalMissedBonus = 0;
  let totalTipBonus = 0;
  let totalRevBonus = 0;

  let totalSalesReward = 0;
  let totalServicingReward = 0;
  let totalGrowthReward = 0;
  let totalStoreServicingReward = 0;

  let totalEarnings = 0;

  pageData.forEach((record: SafeAny) => {
    totalPlanned += record.totalPlanned || 0;
    totalCalled += record.totalCalled || 0;
    totalBooked += record.totalBooked || 0;
    totalCheckin += record.totalCheckin || 0;

    totalBaseSalary += record.salary?.baseSalary || 0;
    totalClientBonus += record.salary?.clientBonus || 0;
    totalDoneBonus += record.salary?.doneBonus || 0;
    totalMissedBonus += record.salary?.missedBonus || 0;
    totalTipBonus += record.salary?.tipBonus || 0;
    totalRevBonus += record.salary?.revBonus || 0;

    totalSalesReward += record.salary?.salesReward || 0;
    totalServicingReward += record.salary?.servicingReward || 0;
    totalGrowthReward += record.salary?.growthReward || 0;
    totalStoreServicingReward += record.salary?.storeServicingReward || 0;

    totalEarnings += record.totalEarnings || 0;
  });

  return (
    <Table.Summary fixed="bottom">
      <Table.Summary.Row
        style={{
          background: selectedRole === 'oc' ? 'rgba(114, 46, 209, 0.05)' : 'rgba(212, 168, 75, 0.05)',
        }}
      >
        <Table.Summary.Cell index={0} colSpan={1}>
          <span style={{ fontWeight: 'bold', color: token.colorText }}>Tổng cộng</span>
        </Table.Summary.Cell>
        {selectedRole === 'oc' ? (
          <>
            <Table.Summary.Cell index={1}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalCheckin}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                -
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalBaseSalary.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalSalesReward.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalServicingReward.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalGrowthReward.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalStoreServicingReward.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}
              >
                {totalEarnings.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
          </>
        ) : (
          <>
            <Table.Summary.Cell index={1}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalPlanned}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalCalled}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorPrimary, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalBooked}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: '#722ED1', fontVariantNumeric: 'tabular-nums' }}
              >
                {totalCheckin}
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalBaseSalary.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalClientBonus.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalDoneBonus.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8}>
              <span
                className="tabular-nums"
                style={{
                  fontWeight: 'bold',
                  color: totalMissedBonus < 0 ? '#FF4D4F' : token.colorText,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {totalMissedBonus >= 0 ? '+' : ''}
                {totalMissedBonus.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={9}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalTipBonus.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={10}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: token.colorText, fontVariantNumeric: 'tabular-nums' }}
              >
                {totalRevBonus.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={11}>
              <span
                className="tabular-nums"
                style={{ fontWeight: 'bold', color: '#D4A84B', fontSize: '15px', fontVariantNumeric: 'tabular-nums' }}
              >
                {totalEarnings.toLocaleString('vi-VN')} đ
              </span>
            </Table.Summary.Cell>
          </>
        )}
      </Table.Summary.Row>
    </Table.Summary>
  );
};
