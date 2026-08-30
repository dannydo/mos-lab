import assert from 'node:assert/strict';
import test from 'node:test';
import {
  academyWorkshopTalentSnapshotFromAssessment,
  calculateAcademyWorkshopEndsAtFromAgenda,
  resolveAcademyWorkshopPublicOrigin,
} from './academy-workshop.service.js';
import { normalizeAcademyWorkshopAgendaDefinition } from './academy-workshop-agenda-template.service.js';

const assessment = {
  id: 12,
  status: 'QUOTED',
  strands5Min: 12,
  eyeScore: 4,
  handScore: 3,
  errorRoot: 0,
  errorSkin: 0,
  errorStickies: 0,
  errorDirection: 0,
  payments: [],
  invoiceNumber: null,
  updatedAt: new Date('2026-08-24T16:00:00.000Z'),
};

test('Workshop talent snapshot keeps the configured assessment policy result', () => {
  const talent = academyWorkshopTalentSnapshotFromAssessment({
    ...assessment,
    quoteSnapshotJson: JSON.stringify({
      result: {
        totalErrors: 0,
        qualified: true,
        tier: {
          key: 'level4',
          title: 'Vượt Trội',
          strands: 10,
          scholarshipPercent: 20,
          sampleRewardPercent: 15,
          kitRewardPercent: 15,
          color: '#10b981',
        },
        scholarshipPercent: 20,
        rankLabel: 'Vượt Trội (Học bổng 20%)',
        rewardLabel: 'Học bổng 20% · Mẫu 15% · Đồ nghề 15%',
      },
      finalPriceVnd: 8_000_000,
      sampleRewardPercent: 15,
      kitRewardPercent: 15,
    }),
  });

  assert.equal(talent.scholarshipPercent, 20);
  assert.equal(talent.rankLabel, 'Vượt Trội (Học bổng 20%)');
  assert.equal(talent.rewardLabel, 'Học bổng 20% · Mẫu 15% · Đồ nghề 15%');
  assert.equal(talent.sampleRewardPercent, 15);
  assert.equal(talent.kitRewardPercent, 15);
});

test('Workshop talent snapshot falls back for legacy assessments without a quote snapshot', () => {
  const talent = academyWorkshopTalentSnapshotFromAssessment({
    ...assessment,
    quoteSnapshotJson: null,
  });

  assert.equal(talent.scholarshipPercent, 10);
  assert.equal(talent.rankLabel, 'Vượt Trội (Học bổng 10%)');
});

test('Workshop QR prefers its configured public origin', () => {
  assert.equal(
    resolveAcademyWorkshopPublicOrigin('https://lab.masteros.app/', 'production', {}),
    'https://lab.masteros.app'
  );
});

test('Workshop QR uses the local Wi-Fi address during development instead of localhost', () => {
  assert.equal(
    resolveAcademyWorkshopPublicOrigin(undefined, 'development', {
      bridge100: [
        { address: '192.168.139.3', netmask: '255.255.254.0', family: 'IPv4', mac: '', internal: false, cidr: null },
      ],
      en0: [
        { address: '192.168.1.25', netmask: '255.255.255.0', family: 'IPv4', mac: '', internal: false, cidr: null },
      ],
    }),
    'http://192.168.1.25:4000'
  );
});

test('Agenda template definitions normalize their order and reject empty templates', () => {
  const items = normalizeAcademyWorkshopAgendaDefinition([
    { title: 'Mở đầu', kind: 'CONTENT', plannedDurationSeconds: 15 * 60, sortOrder: 99 },
    { title: 'Hỏi đáp', kind: 'OTHER', plannedDurationSeconds: 20 * 60, sortOrder: 1 },
  ]);

  assert.deepEqual(
    items.map((item) => item.sortOrder),
    [1, 2]
  );
  assert.throws(() => normalizeAcademyWorkshopAgendaDefinition([]), /ít nhất một mục/);
});

test('Workshop end time is derived from the planned agenda duration', () => {
  const endsAt = calculateAcademyWorkshopEndsAtFromAgenda(new Date('2026-08-31T02:00:00.000Z'), [
    { plannedDurationSeconds: 15 * 60 },
    { plannedDurationSeconds: 45 * 60 },
    { plannedDurationSeconds: 75 * 60 },
  ]);

  assert.equal(endsAt.toISOString(), '2026-08-31T04:15:00.000Z');
});
