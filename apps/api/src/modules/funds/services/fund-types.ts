export class FundError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'FundError';
  }
}

export interface FundActor {
  id: number;
  name: string;
  role?: string;
}

export const DEFAULT_TELESALE_FUND_ID = 'fund-telesale-card';
