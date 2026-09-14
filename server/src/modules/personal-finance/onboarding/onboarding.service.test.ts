import {
  AccountPurpose,
  MonthlyIncomeBand,
  ONBOARDING_FLOW_KEY,
  ONBOARDING_FLOW_VERSION,
  OnboardingSubmissionStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, recordAuditMock, registerPersonalAccount, createPersonalAccountForUser } =
  vi.hoisted(() => ({
    prismaMock: {
      $transaction: vi.fn(),
      onboardingSubmission: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      onboardingSensitiveAnswer: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        findUnique: vi.fn(),
      },
      onboardingQuestion: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
      onboardingNeed: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      onboardingSolution: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      onboardingNeedMapping: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      personalProfile: { upsert: vi.fn() },
    },
    recordAuditMock: vi.fn(),
    registerPersonalAccount: vi.fn(),
    createPersonalAccountForUser: vi.fn(),
  }));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../services/audit.service.js', () => ({ recordAudit: recordAuditMock }));
vi.mock('../../accounts/personal-account.service.js', () => ({
  registerPersonalAccount,
  createPersonalAccountForUser,
}));

const {
  completeBusinessOnboarding,
  completePersonalOnboardingRegister,
  getOnboardingCatalog,
  getOnboardingStats,
  saveOnboardingAnswers,
  startOnboarding,
} = await import('./onboarding.service.js');

const OPEN = {
  id: 'ob_1',
  publicToken: 'aa'.repeat(24),
  flowKey: ONBOARDING_FLOW_KEY,
  flowVersion: ONBOARDING_FLOW_VERSION,
  experimentKey: null,
  status: OnboardingSubmissionStatus.IN_PROGRESS,
  answers: { purpose: AccountPurpose.PERSONAL },
  identityId: null,
  workspaceId: null,
  createdAt: new Date('2026-09-13T00:00:00.000Z'),
  completedAt: null,
  sensitive: null,
};

const PERSONAL_ANSWERS = {
  purpose: AccountPurpose.PERSONAL,
  goals: ['CONTROL_EXPENSES'],
  discoverySource: 'INSTAGRAM',
  monthlyIncomeBand: MonthlyIncomeBand.UNDER_1M,
  helpWith: ['TRACK_EXPENSES'],
};

beforeEach(() => {
  vi.clearAllMocks();
  recordAuditMock.mockResolvedValue(undefined);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
    fn(prismaMock),
  );
  prismaMock.onboardingQuestion.count.mockResolvedValue(1);
  prismaMock.onboardingQuestion.findMany.mockResolvedValue([]);
  prismaMock.onboardingNeed.findMany.mockResolvedValue([]);
  prismaMock.onboardingSolution.findMany.mockResolvedValue([]);
  prismaMock.onboardingNeedMapping.findMany.mockResolvedValue([]);
  prismaMock.onboardingNeed.upsert.mockResolvedValue({});
  prismaMock.onboardingSolution.upsert.mockResolvedValue({});
  prismaMock.onboardingNeedMapping.upsert.mockResolvedValue({});
});

describe('getOnboardingCatalog', () => {
  it('returns active questions from the database catalogue', async () => {
    prismaMock.onboardingQuestion.findMany.mockResolvedValue([
      {
        id: 'q_goals',
        key: 'goals',
        audience: 'PERSONAL',
        businessType: null,
        promptUz: 'Moliyaviy maqsadingiz nima?',
        promptRu: 'Цель',
        hintUz: null,
        hintRu: null,
        answerType: 'MULTI',
        required: true,
        isActive: true,
        isSystem: false,
        sortOrder: 10,
        options: [
          {
            id: 'o1',
            key: 'CONTROL_EXPENSES',
            labelUz: 'Xarajat',
            labelRu: 'Расход',
            allowsOther: false,
            isActive: true,
            sortOrder: 10,
          },
        ],
      },
    ]);
    const catalog = await getOnboardingCatalog();
    expect(catalog.flowKey).toBe(ONBOARDING_FLOW_KEY);
    expect(catalog.flowVersion).toBe(ONBOARDING_FLOW_VERSION);
    expect(catalog.questions.map((question) => question.key)).toEqual(['goals']);
  });
});

describe('startOnboarding', () => {
  it('creates an in-progress submission and writes an audit row', async () => {
    prismaMock.onboardingSubmission.create.mockResolvedValue({ ...OPEN, sensitive: null });
    const dto = await startOnboarding();
    expect(dto.status).toBe(OnboardingSubmissionStatus.IN_PROGRESS);
    expect(dto.hasCustomIncome).toBe(false);
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ONBOARDING_STARTED', storeId: null }),
    );
  });
});

describe('saveOnboardingAnswers', () => {
  it('never writes a custom amount into the answers JSON', async () => {
    prismaMock.onboardingSubmission.findUnique.mockResolvedValue(OPEN);
    prismaMock.onboardingSubmission.update.mockResolvedValue({
      ...OPEN,
      answers: { ...PERSONAL_ANSWERS, monthlyIncomeBand: MonthlyIncomeBand.CUSTOM },
    });
    prismaMock.onboardingSensitiveAnswer.upsert.mockResolvedValue({});
    prismaMock.onboardingSensitiveAnswer.findUnique.mockResolvedValue({
      customMonthlyIncomeSom: 2_500_000n,
    });

    const dto = await saveOnboardingAnswers(OPEN.publicToken, {
      answers: { ...PERSONAL_ANSWERS, monthlyIncomeBand: MonthlyIncomeBand.CUSTOM },
      customMonthlyIncomeSom: 2_500_000,
    });

    const written = prismaMock.onboardingSubmission.update.mock.calls[0][0].data.answers;
    expect(JSON.stringify(written)).not.toContain('2500000');
    expect(written.customMonthlyIncomeSom).toBeUndefined();
    expect(prismaMock.onboardingSensitiveAnswer.upsert).toHaveBeenCalled();
    expect(dto.hasCustomIncome).toBe(true);
  });

  it('drops personal keys when the submission switches to BUSINESS', async () => {
    prismaMock.onboardingQuestion.findMany.mockResolvedValue([
      {
        id: 'q_goals',
        key: 'goals',
        audience: 'PERSONAL',
        businessType: null,
        promptUz: 'Maqsad',
        promptRu: 'Цель',
        hintUz: null,
        hintRu: null,
        answerType: 'MULTI',
        required: true,
        isActive: true,
        isSystem: false,
        sortOrder: 10,
        options: [
          {
            id: 'o1',
            key: 'CONTROL_EXPENSES',
            labelUz: 'Xarajat',
            labelRu: 'Расход',
            allowsOther: false,
            isActive: true,
            sortOrder: 10,
          },
        ],
      },
      {
        id: 'q_size',
        key: 'businessSize',
        audience: 'BUSINESS',
        businessType: null,
        promptUz: 'Hajm',
        promptRu: 'Масштаб',
        hintUz: null,
        hintRu: null,
        answerType: 'SINGLE',
        required: true,
        isActive: true,
        isSystem: false,
        sortOrder: 20,
        options: [
          {
            id: 'o2',
            key: 'SOLO',
            labelUz: 'Yakka',
            labelRu: 'ИП',
            allowsOther: false,
            isActive: true,
            sortOrder: 10,
          },
        ],
      },
    ]);
    prismaMock.onboardingSubmission.findUnique.mockResolvedValue({
      ...OPEN,
      answers: { purpose: AccountPurpose.PERSONAL, goals: ['CONTROL_EXPENSES'] },
    });
    prismaMock.onboardingSubmission.update.mockResolvedValue({
      ...OPEN,
      answers: { purpose: AccountPurpose.BUSINESS, businessType: 'FURNITURE' },
    });
    prismaMock.onboardingSensitiveAnswer.findUnique.mockResolvedValue(null);

    await saveOnboardingAnswers(OPEN.publicToken, {
      answers: { purpose: AccountPurpose.BUSINESS, businessType: 'FURNITURE' },
    });

    const written = prismaMock.onboardingSubmission.update.mock.calls[0][0].data.answers;
    expect(written.purpose).toBe(AccountPurpose.BUSINESS);
    expect(written.goals).toBeUndefined();
    expect(written.businessType).toBe('FURNITURE');
  });
});

describe('completePersonalOnboardingRegister', () => {
  it('refuses incomplete answers before creating an account', async () => {
    prismaMock.onboardingSubmission.findUnique.mockResolvedValue(OPEN);
    await expect(
      completePersonalOnboardingRegister(OPEN.publicToken, {
        firstName: 'Aziz',
        lastName: 'Karimov',
        email: 'aziz@example.com',
        password: 'Secret123',
        passwordConfirmation: 'Secret123',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(registerPersonalAccount).not.toHaveBeenCalled();
  });

  it('creates the personal account then marks onboarding complete', async () => {
    prismaMock.onboardingSubmission.findUnique.mockResolvedValue({
      ...OPEN,
      answers: PERSONAL_ANSWERS,
    });
    registerPersonalAccount.mockResolvedValue({
      identity: {
        id: 'idn_1',
        email: 'aziz@example.com',
        fullName: 'Aziz Karimov',
        createdAt: '2026-09-13T00:00:00.000Z',
      },
      workspace: {
        id: 'ws_1',
        type: WorkspaceType.PERSONAL,
        name: "Aziz Karimovning shaxsiy moliyasi",
        status: 'ACTIVE',
        storeId: null,
        createdAt: '2026-09-13T00:00:00.000Z',
      },
    });
    prismaMock.onboardingSubmission.update.mockResolvedValue({
      ...OPEN,
      status: OnboardingSubmissionStatus.COMPLETED,
      identityId: 'idn_1',
      workspaceId: 'ws_1',
      answers: PERSONAL_ANSWERS,
      completedAt: new Date('2026-09-13T01:00:00.000Z'),
      sensitive: null,
    });
    prismaMock.personalProfile.upsert.mockResolvedValue({});

    const result = await completePersonalOnboardingRegister(OPEN.publicToken, {
      firstName: 'Aziz',
      lastName: 'Karimov',
      email: 'aziz@example.com',
      password: 'Secret123',
      passwordConfirmation: 'Secret123',
    });

    expect(registerPersonalAccount).toHaveBeenCalled();
    expect(result.workspace.storeId).toBeNull();
    expect(result.workspace.type).toBe(WorkspaceType.PERSONAL);
    expect(prismaMock.personalProfile.upsert).toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('customMonthlyIncomeSom');
  });
});

describe('completeBusinessOnboarding', () => {
  it('completes without creating a personal workspace', async () => {
    prismaMock.onboardingSubmission.findUnique.mockResolvedValue({
      ...OPEN,
      answers: { purpose: AccountPurpose.BUSINESS, businessType: 'FURNITURE' },
    });
    prismaMock.onboardingSubmission.update.mockResolvedValue({
      ...OPEN,
      status: OnboardingSubmissionStatus.COMPLETED,
      answers: { purpose: AccountPurpose.BUSINESS, businessType: 'FURNITURE' },
      completedAt: new Date(),
      sensitive: null,
    });

    const dto = await completeBusinessOnboarding(OPEN.publicToken);
    expect(dto.answers.purpose).toBe(AccountPurpose.BUSINESS);
    expect(dto.answers.businessType).toBe('FURNITURE');
    expect(dto.workspaceId).toBeNull();
    expect(registerPersonalAccount).not.toHaveBeenCalled();
    expect(createPersonalAccountForUser).not.toHaveBeenCalled();
  });

  it('refuses to complete business onboarding without a business type', async () => {
    prismaMock.onboardingSubmission.findUnique.mockResolvedValue({
      ...OPEN,
      answers: { purpose: AccountPurpose.BUSINESS },
    });
    await expect(completeBusinessOnboarding(OPEN.publicToken)).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});

describe('getOnboardingStats', () => {
  it('aggregates counts and never returns custom income amounts', async () => {
    prismaMock.onboardingSubmission.count.mockResolvedValue(5);
    prismaMock.onboardingSubmission.findMany.mockResolvedValue([
      {
        answers: {
          purpose: AccountPurpose.PERSONAL,
          monthlyIncomeBand: MonthlyIncomeBand.CUSTOM,
          customMonthlyIncomeSom: 9_999_999,
        },
        sensitive: { id: 'sens_1' },
      },
      {
        answers: { purpose: AccountPurpose.BUSINESS },
        sensitive: null,
      },
    ]);

    const stats = await getOnboardingStats();
    expect(stats.started).toBe(5);
    expect(stats.completed).toBe(2);
    expect(stats.conversionRate).toBe(0.4);
    expect(stats.personalCompleted).toBe(1);
    expect(stats.businessCompleted).toBe(1);
    expect(stats.customIncomeEnteredCount).toBe(1);
    expect(stats.purpose).toEqual(
      expect.arrayContaining([
        { key: AccountPurpose.PERSONAL, count: 1 },
        { key: AccountPurpose.BUSINESS, count: 1 },
      ]),
    );
    expect(JSON.stringify(stats)).not.toContain('9999999');
    expect(stats.firstSavingGoal).toEqual([]);
    expect(JSON.stringify(stats)).not.toMatch(/customMonthlyIncomeSom/i);
    expect(prismaMock.onboardingSubmission.findMany.mock.calls[0][0].select.sensitive).toEqual({
      select: { id: true },
    });
  });
});
