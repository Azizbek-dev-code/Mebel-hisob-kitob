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
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    onboardingOption: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
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

function stubPersonalSync() {
  prismaMock.onboardingQuestion.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.onboardingOption.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.onboardingOption.upsert.mockResolvedValue({});
  prismaMock.onboardingQuestion.update.mockResolvedValue({});
  // Existing personal registration questions — sync updates, does not create.
  prismaMock.onboardingQuestion.findUnique.mockImplementation(async ({ where }: { where: { key?: string; id?: string } }) => {
    if (where.key === 'goals' || where.key === 'growthInterests' || where.key === 'biggestProblem') {
      return {
        id: `q_${where.key}`,
        key: where.key,
        audience: 'PERSONAL',
      };
    }
    return null;
  });
}

describe('onboarding catalog admin', () => {
  it('creates an active question with options', async () => {
    stubPersonalSync();
    prismaMock.onboardingQuestion.count.mockResolvedValue(4);
    prismaMock.onboardingQuestion.findMany.mockResolvedValue([]);
    prismaMock.onboardingNeed.findMany.mockResolvedValue([]);
    prismaMock.onboardingSolution.findMany.mockResolvedValue([]);
    prismaMock.onboardingNeed.upsert.mockResolvedValue({});
    prismaMock.onboardingSolution.upsert.mockResolvedValue({});
    prismaMock.onboardingNeedMapping.upsert.mockResolvedValue({});
    prismaMock.onboardingQuestion.aggregate.mockResolvedValue({ _max: { sortOrder: 50 } });
    const createdRow = {
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
          descriptionUz: null,
          descriptionRu: null,
          allowsOther: false,
          isActive: true,
          sortOrder: 10,
        },
      ],
    };
    prismaMock.onboardingQuestion.findUnique.mockImplementation(
      async ({ where }: { where: { key?: string; id?: string } }) => {
        if (where.key === 'goals' || where.key === 'growthInterests' || where.key === 'biggestProblem') {
          return { id: `q_${where.key}`, key: where.key, audience: 'PERSONAL' };
        }
        if (where.key === 'join_reason') return null;
        if (where.id === 'q_new') return createdRow;
        return null;
      },
    );
    prismaMock.onboardingQuestion.create.mockResolvedValue(createdRow);

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
    stubPersonalSync();
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
