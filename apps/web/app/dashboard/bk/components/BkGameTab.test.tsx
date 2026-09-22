import dayjs from 'dayjs';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BkGameTab from './BkGameTab';

const apiMocks = vi.hoisted(() => ({
  getBookingLeaderboard: vi.fn(),
  getGames: vi.fn(),
  getGameDetail: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    bk: {
      getBookingLeaderboard: apiMocks.getBookingLeaderboard,
      getGames: apiMocks.getGames,
      getGameDetail: apiMocks.getGameDetail,
    },
  },
}));

vi.mock('./BkAvatar', () => ({
  default: ({ name, src }: { name: string; src?: string | null }) => (
    <span data-testid="booker-avatar" data-src={src || ''}>
      {name}
    </span>
  ),
}));

describe('BkGameTab', () => {
  beforeEach(() => {
    apiMocks.getBookingLeaderboard.mockResolvedValue({
      leaderboard: [],
      summary: {
        totalBookings: 0,
        doneBookings: 0,
        missedBookings: 0,
        conversionRate: 0,
        totalCalls: 0,
        totalPickups: 0,
      },
    });
    apiMocks.getGames.mockResolvedValue({ games: [] });
    apiMocks.getGameDetail.mockResolvedValue(null);
  });

  it('renders the visible, accessible Game BK ranking selector on the direct route', async () => {
    render(<BkGameTab dateRange={[dayjs('2026-09-05'), dayjs('2026-09-05')]} comparisonMode="day" />);

    expect(screen.getByText('Game BK')).toBeInTheDocument();
    expect(screen.getByLabelText('Chỉ số xếp hạng Game BK')).toBeVisible();

    await waitFor(() =>
      expect(apiMocks.getBookingLeaderboard).toHaveBeenCalledWith({
        dateFrom: '2026-09-05',
        dateTo: '2026-09-05',
        storeId: 'ALL',
      })
    );
  });

  it('shows each ranked Telesales avatar without changing the displayed ranking data', async () => {
    apiMocks.getBookingLeaderboard.mockResolvedValue({
      leaderboard: [
        {
          rank: 1,
          bookerId: 42,
          displayName: 'Ngọc Điệp',
          avatar: 'avatars/ngoc-diep.jpg',
          store: 'ALL',
          totalCreatedBookings: 8,
          doneBookings: 4,
          missedBookings: 0,
          conversionRate: 50,
          callCount: 12,
          pickupCount: 6,
          pickupRate: 50,
        },
      ],
      summary: {
        totalBookings: 8,
        doneBookings: 4,
        missedBookings: 0,
        conversionRate: 50,
        totalCalls: 12,
        totalPickups: 6,
      },
    });

    render(<BkGameTab dateRange={[dayjs('2026-09-05'), dayjs('2026-09-05')]} comparisonMode="day" />);

    expect(await screen.findByTestId('booker-avatar')).toHaveTextContent('Ngọc Điệp');
    expect(screen.getByTestId('booker-avatar')).toHaveAttribute('data-src', 'avatars/ngoc-diep.jpg');
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
  });

  it('renders the Tạo Game Mới action button for managers', () => {
    render(<BkGameTab dateRange={[dayjs('2026-09-05'), dayjs('2026-09-05')]} comparisonMode="day" />);
    expect(screen.getByRole('button', { name: /Tạo Game Mới/i })).toBeInTheDocument();
  });

  it('renders the scoring formula info trigger and table disclaimer when a game is active', async () => {
    const mockGame = {
      id: 37,
      title: '[BK_LÔNG][T9] CUỘC ĐUA KỲ THÚ',
      gameType: 'INDIVIDUAL',
      metricType: 'BOOKINGS',
      status: 'ACTIVE',
      startDate: '2026-09-01T00:00:00Z',
      endDate: '2026-09-30T23:59:59Z',
      targetScore: 50,
      rewardPool: 500000,
      entryFee: 0,
      description: 'Cuộc đua kỳ thú tháng 9',
    };

    apiMocks.getGames.mockResolvedValue({ games: [mockGame] });
    apiMocks.getGameDetail.mockResolvedValue({
      game: mockGame,
      scoringRule: {
        metricType: 'BOOKINGS',
        label: 'Booking tạo mới',
        formula: '1 Booking tạo mới hợp lệ = 1 Điểm',
        unit: 'booking',
        description: 'Đếm số lượng booking mới được tạo ra trong thời gian diễn ra cuộc thi.',
        dataSource: 'CRM Booking (crm.order)',
      },
      leaderboard: [],
      stats: { totalScore: 0, activeParticipants: 0, averageScore: 0, timeRemainingSeconds: 3600 },
    });

    render(<BkGameTab dateRange={[dayjs('2026-09-05'), dayjs('2026-09-05')]} comparisonMode="day" />);

    expect(await screen.findByText('[BK_LÔNG][T9] CUỘC ĐUA KỲ THÚ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem công thức tính điểm/i })).toBeInTheDocument();
    expect(screen.getByTestId('bk-game-table-disclaimer')).toHaveTextContent(/1 Booking tạo mới hợp lệ = 1 Điểm/i);
    await waitFor(() =>
      expect(apiMocks.getBookingLeaderboard).toHaveBeenCalledWith({
        gameId: 37,
        storeId: 'ALL',
      })
    );
  });
});
