import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activationIntervalsOverlap,
  isAllowedMarketingCtaUrl,
  normalizeUiExperienceInput,
  resolveUiExperienceRuntimeState,
  routeMatchesScope,
} from './ui-experience.service.js';
import { createUiExperiencePreviewToken, verifyUiExperiencePreviewToken } from './routes.js';

test('derives scheduled, active, and ended state without a cron transition', () => {
  const now = new Date('2026-09-02T05:00:00.000Z');
  assert.equal(
    resolveUiExperienceRuntimeState('PUBLISHED', new Date('2026-09-03T00:00:00.000Z'), null, now),
    'SCHEDULED'
  );
  assert.equal(
    resolveUiExperienceRuntimeState(
      'PUBLISHED',
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-03T00:00:00.000Z'),
      now
    ),
    'ACTIVE'
  );
  assert.equal(resolveUiExperienceRuntimeState('PUBLISHED', null, new Date('2026-09-01T00:00:00.000Z'), now), 'ENDED');
  assert.equal(resolveUiExperienceRuntimeState('PAUSED', null, null, now), 'PAUSED');
});

test('matches route scopes only on pathname boundaries', () => {
  assert.equal(routeMatchesScope('/dashboard/customers', '/dashboard'), true);
  assert.equal(routeMatchesScope('/dashboard-old', '/dashboard'), false);
  assert.equal(routeMatchesScope('/campaigns/quoc-khanh-02-09-2026', '/campaigns/quoc-khanh-02-09-2026'), true);
});

test('detects schedule conflicts with open and adjacent intervals', () => {
  assert.equal(
    activationIntervalsOverlap(
      { startsAt: null, endsAt: null },
      { startsAt: new Date('2026-09-01T00:00:00.000Z'), endsAt: new Date('2026-09-02T00:00:00.000Z') }
    ),
    true
  );
  assert.equal(
    activationIntervalsOverlap(
      { startsAt: new Date('2026-09-01T00:00:00.000Z'), endsAt: new Date('2026-09-02T00:00:00.000Z') },
      { startsAt: new Date('2026-09-02T00:00:00.000Z'), endsAt: new Date('2026-09-03T00:00:00.000Z') }
    ),
    false
  );
});

test('allows only https and telephone CTA schemes', () => {
  assert.equal(isAllowedMarketingCtaUrl('https://zalo.me/example'), true);
  assert.equal(isAllowedMarketingCtaUrl('tel:+84901234567'), true);
  assert.equal(isAllowedMarketingCtaUrl('http://example.com'), false);
  assert.equal(isAllowedMarketingCtaUrl('javascript:alert(1)'), false);
  assert.equal(isAllowedMarketingCtaUrl('data:text/html,hello'), false);
});

test('fails closed when a landing manifest is not deployed', () => {
  assert.throws(
    () =>
      normalizeUiExperienceInput({
        surface: 'PUBLIC_LANDING',
        routeScope: '/campaigns/not-deployed',
        experienceKey: 'not-deployed',
        experienceVersion: '1.0.0',
        ctaLabel: 'Đặt lịch',
        ctaUrl: 'https://example.com',
        trackingKey: 'not-deployed',
      }),
    /chưa được deploy/
  );
});

test('accepts valid preview tokens and rejects expired or tampered tokens', () => {
  const valid = createUiExperiencePreviewToken(42, Date.now() + 60_000);
  assert.equal(verifyUiExperiencePreviewToken(valid), 42);

  const expired = createUiExperiencePreviewToken(42, Date.now() - 1);
  assert.throws(() => verifyUiExperiencePreviewToken(expired), /Expired preview token/);

  const tampered = `${valid.slice(0, -1)}${valid.endsWith('a') ? 'b' : 'a'}`;
  assert.throws(() => verifyUiExperiencePreviewToken(tampered), /Invalid preview signature/);
});
