import { describe, expect, it, vi } from 'vitest';

import { createOnboardingQuestion, listCatalogQuestions } from './onboarding-catalog.service.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    onboardingQuestion: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    onboardingOption: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    onboardingNeed: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    onboardingSolution: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    onboardingNeedMapping: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: prismaMock }));

describe('onboarding catalog admin', () => {
  it('creates an active question with options', async () => {
    prismaMock.onboardingQuestion.count.mockResolvedValue(4);
    prismaMock.onboardingQuestion.findMany.mockResolvedValue([]);
    prismaMock.onboardingNeed.findMany.mockResolvedValue([]);
    prismaMock.onboardingSolution.findMany.mockResolvedValue([]);
    prismaMock.onboardingNeed.upsert.mockResolvedValue({});
    prismaMock.onboardingSolution.upsert.mockResolvedValue({});
    prismaMock.onboardingNeedMapping.upsert.mockResolvedValue({});
    prismaMock.onboardingQuestion.aggregate.mockResolvedValue({ _max: { sortOrder: 50 } });
    prismaMock.onboardingQuestion.findUnique.mockResolvedValue(null);
    prismaMock.onboardingQuestion.create.mockResolvedValue({
      id: 'q_new',
      key: 'join_reason',
      audience: 'PERSONAL',
      businessType: null,
      promptUz: 'Nima uchun?',
      promptRu: 'Почему?',
      hintUz: null,
      hintRu: null,
      answerType: 'SINGLE',
      required: true,
      isActive: true,
      isSystem: false,
      sortOrder: 60,
      options: [
        {
          id: 'o1',
          key: 'ADS',
          labelUz: 'Reklama',
          labelRu: 'Реклама',
          allowsOther: false,
          isActive: true,
          sortOrder: 10,
        },
      ],
    });

    const created = await createOnboardingQuestion({
      key: 'join_reason',
      audience: 'PERSONAL',
      promptUz: 'Nima uchun?',
      promptRu: 'Почему?',
      answerType: 'SINGLE',
      options: [{ key: 'ADS', labelUz: 'Reklama', labelRu: 'Реклама' }],
    });

    expect(created.key).toBe('join_reason');
    expect(created.options).toHaveLength(1);
    expect(prismaMock.onboardingQuestion.create).toHaveBeenCalled();
  });

  it('filters business questions by vertical when provided', async () => {
    prismaMock.onboardingQuestion.count.mockResolvedValue(2);
    prismaMock.onboardingNeed.findMany.mockResolvedValue([]);
    prismaMock.onboardingSolution.findMany.mockResolvedValue([]);
    prismaMock.onboardingNeed.upsert.mockResolvedValue({});
    prismaMock.onboardingSolution.upsert.mockResolvedValue({});
    prismaMock.onboardingNeedMapping.findMany.mockResolvedValue([]);
    prismaMock.onboardingQuestion.findMany.mockResolvedValue([
      {
        id: 'q1',
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
        options: [],
      },
      {
        id: 'q2',
        key: 'carpetOnly',
        audience: 'BUSINESS',
        businessType: 'CARPET',
        promptUz: 'Gilam',
        promptRu: 'Ковры',
        hintUz: null,
        hintRu: null,
        answerType: 'SINGLE',
        required: true,
        isActive: true,
        isSystem: false,
        sortOrder: 25,
        options: [],
      },
    ]);

    const furniture = await listCatalogQuestions({
      accountType: 'BUSINESS',
      businessType: 'FURNITURE',
    });
    expect(furniture.map((item) => item.key)).toEqual(['businessSize']);

    const carpet = await listCatalogQuestions({
      accountType: 'BUSINESS',
      businessType: 'CARPET',
    });
    expect(carpet.map((item) => item.key)).toEqual(['businessSize', 'carpetOnly']);
  });
});
