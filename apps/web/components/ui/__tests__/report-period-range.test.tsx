import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { ReportPeriodNavigator } from '../ReportPeriodNavigator';

dayjs.extend(isoWeek);

describe('ReportPeriodNavigator date range integration', () => {
  it('allows selecting past custom date range 01.07.2026 -> 10.07.2026 and updates label', () => {
    const TestHost = () => {
      const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
      const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs('2026-08-15'));
      const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
        dayjs('2026-08-01'),
        dayjs('2026-08-31'),
      ]);
      const [isCustomRange, setIsCustomRange] = useState(false);

      const handleRangeChange = (dates: [Dayjs, Dayjs]) => {
        setIsCustomRange(true);
        setDateRange(dates);
        setReferenceDate(dates[0]);
      };

      const getPeriodLabel = () => {
        if (isCustomRange) {
          if (dateRange[0].isSame(dateRange[1], 'day')) {
            return dateRange[0].format('DD/MM/YYYY');
          }
          return `${dateRange[0].format('DD/MM/YYYY')} - ${dateRange[1].format('DD/MM/YYYY')}`;
        }
        if (viewMode === 'month') {
          return `Tháng ${referenceDate.format('MM/YYYY')}`;
        }
        return referenceDate.format('DD/MM/YYYY');
      };

      return (
        <ReportPeriodNavigator
          mode={viewMode}
          value={referenceDate}
          label={getPeriodLabel()}
          onModeChange={setViewMode}
          onPrevious={() => setReferenceDate((d) => d.add(-1, 'month'))}
          onNext={() => setReferenceDate((d) => d.add(1, 'month'))}
          onValueChange={setReferenceDate}
          rangeValue={dateRange}
          onRangeChange={handleRangeChange}
        />
      );
    };

    render(<TestHost />);

    // Initially shows Month 08/2026
    expect(screen.getByText('08/2026')).toBeTruthy();

    // The inputs for RangePicker
    const inputs = document.querySelectorAll('.ant-picker-input input');
    expect(inputs.length).toBe(2);

    // User clicks start date input
    fireEvent.mouseDown(inputs[0]);
    fireEvent.click(inputs[0]);

    // Go to previous month (July 2026)
    const prevMonthBtns = document.querySelectorAll('.ant-picker-header-prev-btn');
    expect(prevMonthBtns.length).toBeGreaterThan(0);
    fireEvent.click(prevMonthBtns[0]);

    // Select July 1, 2026
    const cellJul1 = document.querySelector('td[title="2026-07-01"]');
    expect(cellJul1).toBeTruthy();
    if (cellJul1) fireEvent.click(cellJul1);

    // Select July 10, 2026
    const cellJul10 = document.querySelector('td[title="2026-07-10"]');
    expect(cellJul10).toBeTruthy();
    if (cellJul10) fireEvent.click(cellJul10);

    // Label should now reflect the custom range 01/07/2026 - 10/07/2026
    expect(screen.getByText('01/07/2026 - 10/07/2026')).toBeTruthy();
  });
});
