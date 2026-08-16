/** Shared transport contracts for all new paginated or command-style APIs. */
export interface PageQuery {
  page?: number;
  limit?: number;
}

/**
 * New list and report endpoints use one predictable response envelope.
 * Existing endpoints retain their legacy response shapes until intentionally migrated.
 */
export interface PageResponse<T, TSummary = undefined> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  summary?: TSummary;
}

/** Standard success envelope for a mutation or explicit command. */
export interface ActionResponse<T = undefined> {
  success: true;
  data?: T;
  message?: string;
}

/** Standard failure payload returned by new Fastify routes. */
export interface ApiProblem {
  error: string;
  message: string;
  code?: string;
}
