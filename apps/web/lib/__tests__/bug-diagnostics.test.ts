import { beforeEach, describe, expect, it } from 'vitest';
import { captureBugReportContext, recordApiFailure, recordClientError } from '../bug-diagnostics';

describe('bug diagnostics privacy boundary', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/dashboard/customers?phone=0909000000&customerId=42&search=Nguyen');
  });

  it('redacts sensitive query values and stores no request payload', () => {
    recordApiFailure({
      config: {
        method: 'post',
        url: '/customers?token=top-secret&customerId=42',
        data: { password: 'must-never-be-stored', formValue: 'private' },
        headers: { Authorization: 'Bearer must-never-be-stored' },
      },
      response: {
        status: 500,
        data: {
          message:
            'Bearer secret-token failed for danny@example.com phone=0909000000 token=eyJabcdefgh.ijklmnop.qrstuvwx',
          privateBody: 'hidden',
        },
      },
    });

    const context = captureBugReportContext(null);
    const serialized = JSON.stringify(context);
    expect(context.path).toBe('/dashboard/customers');
    expect(context.query.phone).toBe('[REDACTED]');
    expect(context.query.search).toBe('[REDACTED]');
    expect(context.query.customerId).toBe('42');
    expect(context.recentApiFailures[0].url).toContain('token=%5BREDACTED%5D');
    expect(serialized).not.toContain('must-never-be-stored');
    expect(serialized).not.toContain('privateBody');
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('danny@example.com');
    expect(serialized).not.toContain('0909000000');
    expect(serialized).not.toContain('eyJabcdefgh');
  });

  it('keeps only the ten most recent API and client failures', () => {
    for (let index = 0; index < 12; index += 1) {
      recordApiFailure({ config: { method: 'get', url: `/safe/${index}` }, message: `API ${index}` });
      recordClientError(new Error(`Client ${index}`));
    }
    const context = captureBugReportContext(null);
    expect(context.recentApiFailures).toHaveLength(10);
    expect(context.recentApiFailures[0].url).toBe('/safe/2');
    expect(context.recentClientErrors).toHaveLength(10);
    expect(context.recentClientErrors[0].message).toBe('Client 2');
  });
});
