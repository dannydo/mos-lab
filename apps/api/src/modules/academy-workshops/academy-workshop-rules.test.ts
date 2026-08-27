import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateAcademyWorkshopAgendaRemainingSeconds,
  calculateAcademyWorkshopFeeStatus,
  calculateAcademyWorkshopQuestionScore,
  getAcademyWorkshopQuizProgress,
  selectAcademyWorkshopRewardParticipantIds,
  sortAcademyWorkshopTalentLeaderboard,
  type SafeAny,
} from '@mos-lab/shared';
import { AcademyWorkshopBonusService } from './academy-workshop-bonus.service.js';
import {
  AcademyWorkshopPublicJoinService,
  getAcademyWorkshopPublicRegistrationPhase,
  normalizeAcademyWorkshopPhone,
} from './academy-workshop-public.service.js';
import {
  WorkshopRealtimeHub,
  buildAcademyWorkshopQuizDraftReplacementData,
  broadcastAcademyTalentAssessmentState,
  buildAcademyWorkshopQuizCloneData,
  buildAcademyWorkshopQuestionWindow,
  normalizeAcademyWorkshopQuestionInput,
} from './academy-workshop-live.service.js';
import { toAcademyWorkshopQuiz } from './academy-workshop.service.js';

test('derives workshop fee readiness exclusively from append-only ledger totals and waiver state', () => {
  assert.equal(calculateAcademyWorkshopFeeStatus(0, 0, false), 'FREE');
  assert.equal(calculateAcademyWorkshopFeeStatus(500_000, 0, false), 'UNPAID');
  assert.equal(calculateAcademyWorkshopFeeStatus(500_000, 250_000, false), 'PARTIAL');
  assert.equal(calculateAcademyWorkshopFeeStatus(500_000, 500_000, false), 'PAID');
  assert.equal(calculateAcademyWorkshopFeeStatus(500_000, 0, true), 'WAIVED');
  assert.equal(calculateAcademyWorkshopFeeStatus(500_000, 550_000 - 50_000, false), 'PAID');
});

test('keeps public registration, check-in, and live workshop phases separate', () => {
  assert.equal(
    getAcademyWorkshopPublicRegistrationPhase({ status: 'SCHEDULED', registrationOpen: true }),
    'REGISTRATION'
  );
  assert.equal(getAcademyWorkshopPublicRegistrationPhase({ status: 'SCHEDULED', registrationOpen: false }), 'CLOSED');
  assert.equal(
    getAcademyWorkshopPublicRegistrationPhase({ status: 'CHECKIN_OPEN', registrationOpen: true }),
    'CHECKIN'
  );
  assert.equal(getAcademyWorkshopPublicRegistrationPhase({ status: 'LIVE', registrationOpen: true }), 'LIVE');
  assert.equal(getAcademyWorkshopPublicRegistrationPhase({ status: 'COMPLETED', registrationOpen: true }), 'COMPLETED');
});

test('scores correct answers from 500–1000 and preserves lower response time as tie-break evidence', () => {
  assert.equal(calculateAcademyWorkshopQuestionScore(20_000, 0, true), 1000);
  assert.equal(calculateAcademyWorkshopQuestionScore(20_000, 10_000, true), 750);
  assert.equal(calculateAcademyWorkshopQuestionScore(20_000, 20_000, true), 500);
  assert.equal(calculateAcademyWorkshopQuestionScore(20_000, 20_001, true), 0);
  assert.equal(calculateAcademyWorkshopQuestionScore(20_000, 1_000, false), 0);
});

test('marks the final revealed question as podium-only and never exposes a next question', () => {
  const questions = [{ id: 11 }, { id: 12 }, { id: 13 }];

  const middle = getAcademyWorkshopQuizProgress(questions, 12);
  assert.equal(middle.currentQuestionNumber, 2);
  assert.equal(middle.hasNextQuestion, true);
  assert.equal(middle.nextQuestion?.id, 13);
  assert.equal(middle.isLastQuestion, false);

  const final = getAcademyWorkshopQuizProgress(questions, 13);
  assert.equal(final.currentQuestionNumber, 3);
  assert.equal(final.hasNextQuestion, false);
  assert.equal(final.nextQuestion, null);
  assert.equal(final.isLastQuestion, true);
});

test('reveals correct options only after the host publishes the answer', () => {
  const quiz = {
    id: 1,
    workshopId: 2,
    title: 'Academy Challenge',
    description: null,
    isTemplate: false,
    status: 'REVEALED',
    activeQuestionId: 10,
    questionOpenedAt: null,
    questionClosesAt: null,
    podiumRewardsJson: '{}',
    questions: [
      {
        id: 10,
        quizId: 1,
        type: 'TRUE_FALSE',
        prompt: 'Tốc độ phải đi cùng độ chính xác.',
        imageUrl: null,
        durationSeconds: 15,
        sortOrder: 1,
        rewardRule: 'NONE',
        fastestCount: 1,
        rewardLabel: null,
        rewardQuantity: 1,
        options: [
          { id: 101, label: 'Đúng', color: null, sortOrder: 1, isCorrect: true },
          { id: 102, label: 'Sai', color: null, sortOrder: 2, isCorrect: false },
        ],
      },
    ],
  };

  const hidden = toAcademyWorkshopQuiz(quiz, false)!;
  const revealed = toAcademyWorkshopQuiz(quiz, true)!;

  assert.equal('isCorrect' in hidden.questions[0].options[0], false);
  assert.equal(revealed.questions[0].options[0].isCorrect, true);
  assert.equal(revealed.questions[0].options[1].isCorrect, false);
});

test('normalizes a draft workshop question and keeps exactly one correct option', () => {
  const normalized = normalizeAcademyWorkshopQuestionInput({
    type: 'SINGLE_CHOICE',
    prompt: '  Nội dung câu hỏi?  ',
    durationSeconds: 20,
    rewardRule: 'FASTEST_N',
    fastestCount: 2,
    rewardLabel: '  Voucher  ',
    rewardQuantity: 1,
    options: [
      { label: '  Đáp án đúng  ', isCorrect: true },
      { label: 'Đáp án sai', isCorrect: false },
    ],
  });

  assert.equal(normalized.questionData.prompt, 'Nội dung câu hỏi?');
  assert.equal(normalized.questionData.rewardLabel, 'Voucher');
  assert.deepEqual(
    normalized.options.map((option) => option.label),
    ['Đáp án đúng', 'Đáp án sai']
  );
  assert.equal(normalized.options.filter((option) => option.isCorrect).length, 1);
});

test('rejects invalid workshop question option contracts', () => {
  const base = {
    type: 'SINGLE_CHOICE' as const,
    prompt: 'Câu hỏi?',
    durationSeconds: 20,
  };

  assert.throws(
    () => normalizeAcademyWorkshopQuestionInput({ ...base, options: [{ label: 'A', isCorrect: true }] }),
    /2 đến 6/
  );
  assert.throws(
    () =>
      normalizeAcademyWorkshopQuestionInput({
        ...base,
        options: [
          { label: 'A', isCorrect: true },
          { label: '', isCorrect: false },
        ],
      }),
    /không được để trống/
  );
  assert.throws(
    () =>
      normalizeAcademyWorkshopQuestionInput({
        ...base,
        options: [
          { label: 'A', isCorrect: true },
          { label: 'B', isCorrect: true },
        ],
      }),
    /đúng một đáp án/
  );
  assert.throws(
    () =>
      normalizeAcademyWorkshopQuestionInput({
        ...base,
        type: 'TRUE_FALSE',
        options: [
          { label: 'Đúng', isCorrect: true },
          { label: 'Sai', isCorrect: false },
          { label: 'Khác', isCorrect: false },
        ],
      }),
    /đúng 2 lựa chọn/
  );
});

test('clones quiz content into a clean draft without historical answers or rewards', () => {
  const data = buildAcademyWorkshopQuizCloneData(
    {
      title: 'Academy Challenge',
      description: 'Phiên chính',
      podiumRewardsJson: JSON.stringify({ 1: 'Voucher' }),
      answers: [{ id: 99 }],
      rewards: [{ id: 88 }],
      questions: [
        {
          type: 'SINGLE_CHOICE',
          prompt: 'Câu hỏi?',
          imageUrl: null,
          durationSeconds: 20,
          sortOrder: 1,
          rewardRule: 'FASTEST_N',
          fastestCount: 1,
          rewardLabel: 'Quà',
          rewardQuantity: 1,
          answers: [{ id: 77 }],
          rewards: [{ id: 66 }],
          options: [
            { label: 'A', color: null, isCorrect: true, sortOrder: 1 },
            { label: 'B', color: null, isCorrect: false, sortOrder: 2 },
          ],
        },
      ],
    },
    12,
    34
  );

  assert.equal(data.status, 'DRAFT');
  assert.equal(data.workshopId, 12);
  assert.equal(data.createdByStaffId, 34);
  assert.equal(data.title, 'Academy Challenge · Bản chỉnh sửa');
  assert.equal(data.questions.create.length, 1);
  assert.deepEqual(
    data.questions.create[0].options.create.map((option: SafeAny) => option.label),
    ['A', 'B']
  );
  assert.equal('answers' in data, false);
  assert.equal('rewards' in data, false);
  assert.equal('answers' in data.questions.create[0], false);
  assert.equal('rewards' in data.questions.create[0], false);
});

test('replaces a draft game with fresh template content and clears its runtime question state', () => {
  const data = buildAcademyWorkshopQuizDraftReplacementData(
    {
      title: 'Nỗi đau cô chủ salon mi nhỏ',
      description: 'Mẫu câu hỏi mới',
      podiumRewardsJson: '{}',
      questions: [
        {
          type: 'SINGLE_CHOICE',
          prompt: 'Khi nào cô chủ thấy mệt nhất?',
          imageUrl: null,
          durationSeconds: 20,
          sortOrder: 1,
          rewardRule: 'NONE',
          fastestCount: 1,
          rewardLabel: null,
          rewardQuantity: 1,
          options: [
            { label: 'A', color: null, isCorrect: true, sortOrder: 1 },
            { label: 'B', color: null, isCorrect: false, sortOrder: 2 },
          ],
        },
      ],
    },
    12,
    34
  );

  assert.equal(data.status, 'DRAFT');
  assert.equal(data.activeQuestionId, null);
  assert.equal(data.questionOpenedAt, null);
  assert.equal(data.questionClosesAt, null);
  assert.equal(data.questions.create[0].prompt, 'Khi nào cô chủ thấy mệt nhất?');
});

test('materializes independent games from one reusable question template', () => {
  const template = {
    title: 'Kiến thức nối mi căn bản',
    description: 'Mẫu dùng chung',
    podiumRewardsJson: '{}',
    questions: [
      {
        type: 'TRUE_FALSE',
        prompt: 'Tốc độ luôn đi cùng độ chính xác.',
        imageUrl: null,
        durationSeconds: 15,
        sortOrder: 1,
        rewardRule: 'NONE',
        fastestCount: 1,
        rewardLabel: null,
        rewardQuantity: 1,
        options: [
          { label: 'Đúng', color: null, isCorrect: true, sortOrder: 1 },
          { label: 'Sai', color: null, isCorrect: false, sortOrder: 2 },
        ],
      },
    ],
  };

  const firstGame = buildAcademyWorkshopQuizCloneData(template, 21, 7, { title: template.title });
  const secondGame = buildAcademyWorkshopQuizCloneData(template, 22, 8, { title: template.title });

  assert.equal(firstGame.workshopId, 21);
  assert.equal(secondGame.workshopId, 22);
  assert.equal(firstGame.status, 'DRAFT');
  assert.equal(secondGame.status, 'DRAFT');
  assert.notEqual(firstGame.questions.create, secondGame.questions.create);
  assert.notEqual(firstGame.questions.create[0].options.create, secondGame.questions.create[0].options.create);
  firstGame.questions.create[0].prompt = 'Nội dung riêng của workshop 21';
  assert.equal(secondGame.questions.create[0].prompt, 'Tốc độ luôn đi cùng độ chính xác.');
  assert.equal('answers' in firstGame, false);
  assert.equal('rewards' in secondGame, false);
});

test('normalizes Vietnamese workshop phone numbers without exposing formatting differences', () => {
  assert.equal(normalizeAcademyWorkshopPhone('090 123 4567'), '0901234567');
  assert.equal(normalizeAcademyWorkshopPhone('+84 90 123 4567'), '0901234567');
  assert.equal(normalizeAcademyWorkshopPhone('0084-90-123-4567'), '0901234567');
  assert.equal(normalizeAcademyWorkshopPhone(null), '');
});

test('shared workshop join lists only avatar/name and requires phone verification when configured', async () => {
  const workshop = {
    id: 5,
    campaign: { name: 'Happy Friday', slug: 'happy-friday' },
    startsAt: new Date('2026-08-28T02:30:00.000Z'),
    endsAt: new Date('2026-08-28T05:30:00.000Z'),
    location: 'Wings Academy',
    status: 'LIVE',
    participants: [
      {
        id: 1,
        createdAt: new Date(),
        campaignLead: { lead: { name: 'Có SĐT', phone: '+84 901234567', avatarUrl: 'avatar.jpg' } },
      },
      { id: 2, createdAt: new Date(), campaignLead: { lead: { name: 'Không SĐT', phone: null, avatarUrl: null } } },
    ],
  };
  const fastify = {
    prisma: { crm: { crmAcademyWorkshop: { findUnique: async () => workshop } } },
  } as SafeAny;

  const info = await AcademyWorkshopPublicJoinService.sharedJoinInfo(fastify, 'EFBD14A0');

  assert.deepEqual(info.participants, [
    { id: 1, name: 'Có SĐT', avatarUrl: 'avatar.jpg', requiresPhone: true },
    { id: 2, name: 'Không SĐT', avatarUrl: null, requiresPhone: false },
  ]);
  assert.equal('phone' in info.participants[0], false);
});

test('does not expose the event-day lobby before check-in opens', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmAcademyWorkshop: {
          findUnique: async () => ({
            id: 5,
            campaign: { name: 'Happy Friday', slug: 'happy-friday' },
            startsAt: new Date('2026-08-28T02:30:00.000Z'),
            endsAt: new Date('2026-08-28T05:30:00.000Z'),
            location: 'Wings Academy',
            status: 'SCHEDULED',
            participants: [],
          }),
        },
      },
    },
  } as SafeAny;

  await assert.rejects(() => AcademyWorkshopPublicJoinService.sharedJoinInfo(fastify, 'EFBD14A0'), /chưa mở check-in/);
});

test('shared workshop join verifies a configured phone and lets phone-less students enter directly', async () => {
  const selfCheckInEvents: Array<{ eventType: string }> = [];
  const participant = {
    id: 7,
    workshopId: 5,
    tokenVersion: 1,
    checkedInAt: null as Date | null,
    workshop: { status: 'LIVE', endsAt: new Date(), campaign: { name: 'Workshop', slug: 'workshop' } },
    campaignLead: { lead: { phone: '0901234567' } },
  };
  const tx = {
    crmAcademyWorkshopParticipant: {
      updateMany: async () => ({ count: participant.checkedInAt ? 0 : 1 }),
    },
    crmAcademyWorkshopParticipantEvent: {
      create: async ({ data }: SafeAny) => {
        selfCheckInEvents.push(data);
        participant.checkedInAt = new Date() as SafeAny;
        return data;
      },
    },
  };
  const fastify = {
    prisma: {
      crm: {
        crmAcademyWorkshopParticipant: { findFirst: async () => participant },
        $transaction: async (callback: (transaction: SafeAny) => Promise<unknown>) => callback(tx),
      },
    },
  } as SafeAny;

  await assert.doesNotReject(() =>
    AcademyWorkshopPublicJoinService.selectParticipant(fastify, {
      displayCode: 'EFBD14A0',
      participantId: 7,
      phone: '+84 90 123 4567',
    })
  );
  await assert.rejects(
    () =>
      AcademyWorkshopPublicJoinService.selectParticipant(fastify, {
        displayCode: 'EFBD14A0',
        participantId: 7,
        phone: '0900000000',
      }),
    /chưa khớp/
  );

  participant.campaignLead.lead.phone = null as SafeAny;
  await assert.doesNotReject(() =>
    AcademyWorkshopPublicJoinService.selectParticipant(fastify, {
      displayCode: 'EFBD14A0',
      participantId: 7,
    })
  );
  assert.equal(selfCheckInEvents.length, 1);
  assert.equal(selfCheckInEvents[0].eventType, 'SELF_CHECKED_IN');
});

test('Google workshop join creates one walk-in participant and self-checks in idempotently', async () => {
  const events: Array<{ eventType: string }> = [];
  let storedLead: SafeAny = null;
  let storedParticipant: SafeAny = null;
  const workshop = {
    id: 5,
    campaignId: 9,
    capacity: 100,
    status: 'LIVE',
    endsAt: new Date('2026-08-28T05:30:00.000Z'),
    campaign: { id: 9, name: 'Happy Friday', slug: 'happy-friday' },
  };
  const tx: SafeAny = {
    crmAcademyWorkshop: { findUnique: async () => workshop },
    crmAcademyLead: {
      findUnique: async () => storedLead,
      findFirst: async () => null,
      update: async ({ data }: SafeAny) => (storedLead = { ...storedLead, ...data }),
      upsert: async ({ create, update }: SafeAny) => {
        storedLead = storedLead ? { ...storedLead, ...update } : { id: 41, ...create };
        return storedLead;
      },
    },
    crmAcademyCampaignLead: {
      upsert: async () => ({ id: 51, campaignId: 9, leadId: 41 }),
    },
    crmAcademyWorkshopParticipant: {
      findUnique: async () => storedParticipant,
      count: async () => (storedParticipant ? 1 : 0),
      create: async ({ data }: SafeAny) =>
        (storedParticipant = { id: 61, tokenVersion: 1, checkedInAt: null, ...data }),
      updateMany: async () => {
        if (storedParticipant?.checkedInAt) return { count: 0 };
        storedParticipant.checkedInAt = new Date();
        return { count: 1 };
      },
    },
    crmAcademyWorkshopParticipantEvent: {
      create: async ({ data }: SafeAny) => {
        events.push(data);
        return data;
      },
    },
  };
  const fastify = {
    prisma: { crm: { $transaction: async (callback: (transaction: SafeAny) => Promise<unknown>) => callback(tx) } },
  } as SafeAny;
  const request = { displayCode: 'EFBD14A0', credential: 'verified-by-route' };
  const identity = {
    subject: 'google-123',
    email: 'student@gmail.com',
    name: 'Student Google',
    avatarUrl: 'avatar.jpg',
  };

  const first = await AcademyWorkshopPublicJoinService.joinWithGoogle(fastify, request, identity);
  const second = await AcademyWorkshopPublicJoinService.joinWithGoogle(fastify, request, identity);

  assert.equal(first.id, 61);
  assert.equal(second.id, 61);
  assert.ok(first.checkedInAt);
  assert.equal(storedLead.externalKey, 'GOOGLE:google-123');
  assert.equal(storedLead.sourceSystem, 'GOOGLE');
  assert.deepEqual(
    events.map((event) => event.eventType),
    ['SELF_REGISTERED_GOOGLE', 'SELF_CHECKED_IN']
  );
});

test('reopens an expired question with a fresh server-authoritative answer window', () => {
  const reopenedAt = new Date('2026-08-25T00:30:00.000Z');
  const window = buildAcademyWorkshopQuestionWindow({ id: 19, durationSeconds: 20 }, reopenedAt);

  assert.equal(window.status, 'QUESTION_OPEN');
  assert.equal(window.activeQuestionId, 19);
  assert.equal(window.questionOpenedAt.toISOString(), '2026-08-25T00:30:00.000Z');
  assert.equal(window.questionClosesAt.toISOString(), '2026-08-25T00:30:20.000Z');
});

test('selects reward recipients deterministically without duplicates', () => {
  const answers = [
    { participantId: 3, isCorrect: true, responseTimeMs: 900 },
    { participantId: 2, isCorrect: true, responseTimeMs: 800 },
    { participantId: 1, isCorrect: false, responseTimeMs: 100 },
    { participantId: 2, isCorrect: true, responseTimeMs: 800 },
  ];
  assert.deepEqual(selectAcademyWorkshopRewardParticipantIds('FASTEST_N', answers, 2), [2, 3]);
  assert.deepEqual(selectAcademyWorkshopRewardParticipantIds('ALL_CORRECT', answers), [2, 3]);
  assert.deepEqual(selectAcademyWorkshopRewardParticipantIds('NONE', answers), []);
});

test('records late answers as zero-score evidence and excludes them from rewards', () => {
  const answers = [
    { participantId: 1, isCorrect: true, responseTimeMs: 19_500 },
    { participantId: 2, isCorrect: true, responseTimeMs: 20_001 },
  ];

  assert.deepEqual(selectAcademyWorkshopRewardParticipantIds('ALL_CORRECT', answers, 1, 20_000), [1]);
  assert.deepEqual(selectAcademyWorkshopRewardParticipantIds('FASTEST_N', answers, 2, 20_000), [1]);
});

test('broadcasts one realtime snapshot to 100 connected participants', () => {
  const hub = new WorkshopRealtimeHub();
  const received = Array.from({ length: 100 }, () => [] as string[]);
  received.forEach((messages, index) => {
    hub.add(12, {
      audience: 'PARTICIPANT',
      participantId: index + 1,
      socket: {
        readyState: 1,
        send: (payload: string) => messages.push(payload),
        close: () => undefined,
      },
    });
  });

  hub.broadcast(12, { type: 'STATE_SNAPSHOT', data: { serverNow: '2026-08-24T12:00:00.000Z' } as SafeAny });

  assert.equal(hub.connectedParticipants(12), 100);
  assert.ok(received.every((messages) => messages.length === 1));
  assert.ok(received.every((messages) => JSON.parse(messages[0]).type === 'STATE_SNAPSHOT'));
});

test('broadcasts an assessment update only to its linked workshop', async () => {
  const workshopIds: number[] = [];
  const fastify = {
    prisma: {
      crm: {
        crmAcademyTalentAssessment: {
          findUnique: async () => ({ workshopParticipant: { workshopId: 27 } }),
        },
      },
    },
  } as SafeAny;

  const workshopId = await broadcastAcademyTalentAssessmentState(fastify, 12, async (_instance, linkedWorkshopId) => {
    workshopIds.push(linkedWorkshopId);
  });

  assert.equal(workshopId, 27);
  assert.deepEqual(workshopIds, [27]);
});

test('does not broadcast a Lead Manager assessment without workshop attribution', async () => {
  let broadcastCount = 0;
  const fastify = {
    prisma: {
      crm: {
        crmAcademyTalentAssessment: {
          findUnique: async () => ({ workshopParticipant: null }),
        },
      },
    },
  } as SafeAny;

  const workshopId = await broadcastAcademyTalentAssessmentState(fastify, 99, async () => {
    broadcastCount += 1;
  });

  assert.equal(workshopId, null);
  assert.equal(broadcastCount, 0);
});

test('recovers an agenda timer from persisted server timestamps including pause and overtime', () => {
  assert.equal(
    calculateAcademyWorkshopAgendaRemainingSeconds(
      60,
      '2026-08-24T10:00:00.000Z',
      null,
      10,
      '2026-08-24T10:00:50.000Z'
    ),
    20
  );
  assert.equal(
    calculateAcademyWorkshopAgendaRemainingSeconds(60, '2026-08-24T10:00:00.000Z', null, 0, '2026-08-24T10:01:15.000Z'),
    -15
  );
});

test('orders Tố Chất by qualified, strands, errors, eye+hand and completion timestamp', () => {
  const rows = sortAcademyWorkshopTalentLeaderboard([
    {
      id: 'late',
      qualified: true,
      strands5Min: 20,
      totalErrors: 1,
      eyeScore: 4,
      handScore: 4,
      completedAt: '2026-08-24T03:02:00Z',
    },
    {
      id: 'early',
      qualified: true,
      strands5Min: 20,
      totalErrors: 1,
      eyeScore: 4,
      handScore: 4,
      completedAt: '2026-08-24T03:01:00Z',
    },
    {
      id: 'errors',
      qualified: true,
      strands5Min: 20,
      totalErrors: 2,
      eyeScore: 5,
      handScore: 5,
      completedAt: '2026-08-24T03:00:00Z',
    },
    {
      id: 'unqualified',
      qualified: false,
      strands5Min: 40,
      totalErrors: 0,
      eyeScore: 5,
      handScore: 5,
      completedAt: '2026-08-24T02:00:00Z',
    },
  ]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['early', 'late', 'errors', 'unqualified']
  );
});

test('reconciles one instructor bonus per selected course and is idempotent across retries', async () => {
  const created = new Map<string, SafeAny>();
  const assessment = {
    id: 91,
    quoteSnapshotJson: JSON.stringify({
      finalPriceVnd: 3_000_000,
      courses: [
        { courseId: 1, name: 'Foundation' },
        { courseId: 2, name: 'Advanced' },
      ],
    }),
    payments: [{ amountVnd: 1_000_000 }, { amountVnd: 2_000_000 }],
    workshopParticipant: { id: 7, workshopId: 5, primaryInstructorId: 11 },
  };
  const client = {
    crmAcademyTalentAssessment: { findUnique: async () => assessment },
    crmAcademyCourse: {
      findMany: async () => [
        { id: 1, name: 'Foundation', teacherBonusVnd: 300_000 },
        { id: 2, name: 'Advanced', teacherBonusVnd: 0 },
      ],
    },
    crmAcademyInstructorBonus: {
      upsert: async ({ where, create }: SafeAny) => {
        const composite = where.participantId_assessmentId_courseId;
        const key = `${composite.participantId}:${composite.assessmentId}:${composite.courseId}`;
        if (!created.has(key)) created.set(key, create);
        return created.get(key);
      },
      findMany: async () => [...created.values()],
    },
    $transaction: async (promises: Promise<unknown>[]) => Promise.all(promises),
  };
  const fastify = { prisma: { crm: client } } as SafeAny;

  await AcademyWorkshopBonusService.reconcileForAssessment(fastify, 91);
  await AcademyWorkshopBonusService.reconcileForAssessment(fastify, 91);

  assert.equal(created.size, 2);
  assert.equal(created.get('7:91:1').status, 'EARNED');
  assert.equal(created.get('7:91:1').amountVnd, 300_000);
  assert.equal(created.get('7:91:2').status, 'MISSING_CONFIG');
});
