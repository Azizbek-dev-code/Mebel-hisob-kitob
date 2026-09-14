import {
  ONBOARDING_FLOW_KEY,
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_SEED_MAPPINGS,
  ONBOARDING_SEED_NEEDS,
  ONBOARDING_SEED_QUESTIONS,
  ONBOARDING_SEED_SOLUTIONS,
  isBusinessType,
  type CatalogQuestionForSanitize,
  type OnboardingAudience,
  type OnboardingCatalogResponse,
  type OnboardingNeedDto,
  type OnboardingNeedMappingDto,
  type OnboardingQuestionDto,
  type OnboardingSolutionDto,
  type ReorderOnboardingItemsRequest,
  type UpsertOnboardingMappingRequest,
  type UpsertOnboardingNeedRequest,
  type UpsertOnboardingQuestionRequest,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { ApiError } from '../../../utils/api-error.js';

type QuestionRow = Prisma.OnboardingQuestionGetPayload<{
  include: { options: true };
}>;

function slugKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function toQuestionDto(row: QuestionRow): OnboardingQuestionDto {
  const options = [...row.options].sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  return {
    id: row.id,
    key: row.key,
    audience: row.audience,
    businessType: row.businessType,
    promptUz: row.promptUz,
    promptRu: row.promptRu,
    hintUz: row.hintUz,
    hintRu: row.hintRu,
    answerType: row.answerType,
    required: row.required,
    isActive: row.isActive,
    isSystem: row.isSystem,
    sortOrder: row.sortOrder,
    options: options.map((option) => ({
      id: option.id,
      key: option.key,
      labelUz: option.labelUz,
      labelRu: option.labelRu,
      allowsOther: option.allowsOther,
      isActive: option.isActive,
      sortOrder: option.sortOrder,
    })),
  };
}

export function toSanitizeCatalog(rows: OnboardingQuestionDto[]): CatalogQuestionForSanitize[] {
  return rows.map((question) => ({
    key: question.key,
    audience: question.audience,
    businessType: question.businessType,
    answerType: question.answerType,
    required: question.required,
    optionKeys: question.options.filter((option) => option.isActive).map((option) => option.key),
    allowsOtherKeys: question.options
      .filter((option) => option.isActive && option.allowsOther)
      .map((option) => option.key),
  }));
}

export async function ensureOnboardingCatalog(db: PrismaClient = defaultPrisma): Promise<void> {
  const existing = await db.onboardingQuestion.count();
  if (existing > 0) {
    await ensureNeedsAndSolutions(db);
    return;
  }

  for (const question of ONBOARDING_SEED_QUESTIONS) {
    await db.onboardingQuestion.create({
      data: {
        key: question.key,
        audience: question.audience,
        businessType: question.businessType ?? null,
        promptUz: question.promptUz,
        promptRu: question.promptRu,
        hintUz: question.hintUz ?? null,
        hintRu: question.hintRu ?? null,
        answerType: question.answerType,
        required: question.required,
        isSystem: question.isSystem ?? false,
        sortOrder: question.sortOrder,
        options: {
          create: question.options.map((option, index) => ({
            key: option.key,
            labelUz: option.labelUz,
            labelRu: option.labelRu,
            allowsOther: option.allowsOther ?? false,
            sortOrder: option.sortOrder ?? (index + 1) * 10,
          })),
        },
      },
    });
  }

  await ensureNeedsAndSolutions(db);
}

async function ensureNeedsAndSolutions(db: PrismaClient): Promise<void> {
  for (const need of ONBOARDING_SEED_NEEDS) {
    await db.onboardingNeed.upsert({
      where: { key: need.key },
      create: {
        key: need.key,
        labelUz: need.labelUz,
        labelRu: need.labelRu,
        sortOrder: need.sortOrder,
      },
      update: {},
    });
  }
  for (const solution of ONBOARDING_SEED_SOLUTIONS) {
    await db.onboardingSolution.upsert({
      where: { key: solution.key },
      create: {
        key: solution.key,
        labelUz: solution.labelUz,
        labelRu: solution.labelRu,
        sortOrder: solution.sortOrder,
      },
      update: {},
    });
  }

  const questions = await db.onboardingQuestion.findMany({ select: { id: true, key: true } });
  const needs = await db.onboardingNeed.findMany({ select: { id: true, key: true } });
  const solutions = await db.onboardingSolution.findMany({ select: { id: true, key: true } });
  const questionByKey = new Map((questions ?? []).map((row) => [row.key, row.id]));
  const needByKey = new Map((needs ?? []).map((row) => [row.key, row.id]));
  const solutionByKey = new Map((solutions ?? []).map((row) => [row.key, row.id]));

  for (const mapping of ONBOARDING_SEED_MAPPINGS) {
    const questionId = questionByKey.get(mapping.questionKey);
    const needId = needByKey.get(mapping.needKey);
    const solutionId = solutionByKey.get(mapping.solutionKey);
    if (!questionId || !needId || !solutionId) continue;
    await db.onboardingNeedMapping.upsert({
      where: {
        questionId_optionKey_needId_solutionId: {
          questionId,
          optionKey: mapping.optionKey,
          needId,
          solutionId,
        },
      },
      create: { questionId, optionKey: mapping.optionKey, needId, solutionId },
      update: {},
    });
  }
}

export async function listCatalogQuestions(
  filter: { accountType?: OnboardingAudience | null; businessType?: string | null; includeInactive?: boolean },
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingQuestionDto[]> {
  await ensureOnboardingCatalog(db);
  const rows = await db.onboardingQuestion.findMany({
    where: {
      ...(filter.includeInactive ? {} : { isActive: true }),
      ...(filter.accountType ? { audience: filter.accountType } : {}),
    },
    include: { options: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
  });

  return rows
    .map(toQuestionDto)
    .filter((question) => {
      if (!filter.businessType) return true;
      if (question.audience !== 'BUSINESS') return true;
      return question.businessType == null || question.businessType === filter.businessType;
    })
    .map((question) =>
      filter.includeInactive
        ? question
        : { ...question, options: question.options.filter((option) => option.isActive) },
    );
}

export async function getPublicOnboardingCatalog(
  filter: { accountType?: OnboardingAudience | null; businessType?: string | null } = {},
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingCatalogResponse> {
  const questions = await listCatalogQuestions(
    { accountType: filter.accountType, businessType: filter.businessType, includeInactive: false },
    db,
  );
  return {
    flowKey: ONBOARDING_FLOW_KEY,
    flowVersion: ONBOARDING_FLOW_VERSION,
    questions,
  };
}

export async function loadSanitizeCatalog(
  db: PrismaClient = defaultPrisma,
): Promise<CatalogQuestionForSanitize[]> {
  const questions = await listCatalogQuestions({ includeInactive: false }, db);
  return toSanitizeCatalog(questions);
}

export async function createOnboardingQuestion(
  input: UpsertOnboardingQuestionRequest,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingQuestionDto> {
  await ensureOnboardingCatalog(db);
  const key = slugKey(input.key || input.promptUz);
  if (!key) throw ApiError.validation('Savol kaliti kerak', [{ field: 'key', message: 'Kalit kerak' }]);
  const exists = await db.onboardingQuestion.findUnique({ where: { key }, select: { id: true } });
  if (exists) throw ApiError.conflict('Bu kalit allaqachon bor');

  const maxOrder = await db.onboardingQuestion.aggregate({
    where: { audience: input.audience },
    _max: { sortOrder: true },
  });

  const created = await db.onboardingQuestion.create({
    data: {
      key,
      audience: input.audience,
      businessType: input.businessType && isBusinessType(input.businessType) ? input.businessType : null,
      promptUz: input.promptUz.trim(),
      promptRu: input.promptRu.trim(),
      hintUz: input.hintUz?.trim() || null,
      hintRu: input.hintRu?.trim() || null,
      answerType: input.answerType,
      required: input.required ?? true,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 10,
      options: input.options?.length
        ? {
            create: input.options.map((option, index) => ({
              key: option.key.trim(),
              labelUz: option.labelUz.trim(),
              labelRu: option.labelRu.trim(),
              allowsOther: option.allowsOther ?? false,
              isActive: option.isActive ?? true,
              sortOrder: option.sortOrder ?? (index + 1) * 10,
            })),
          }
        : undefined,
    },
    include: { options: true },
  });
  return toQuestionDto(created);
}

export async function updateOnboardingQuestion(
  id: string,
  input: UpsertOnboardingQuestionRequest,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingQuestionDto> {
  const row = await db.onboardingQuestion.findUnique({ where: { id }, include: { options: true } });
  if (!row) throw ApiError.notFound('Savol topilmadi');

  const nextKey = input.key ? slugKey(input.key) : row.key;
  if (nextKey !== row.key) {
    if (row.isSystem) throw ApiError.conflict('Tizim savolini kalitini o‘zgartirib bo‘lmaydi');
    const clash = await db.onboardingQuestion.findUnique({ where: { key: nextKey }, select: { id: true } });
    if (clash) throw ApiError.conflict('Bu kalit allaqachon bor');
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.onboardingQuestion.update({
      where: { id },
      data: {
        key: nextKey,
        audience: input.audience,
        businessType: input.businessType && isBusinessType(input.businessType) ? input.businessType : null,
        promptUz: input.promptUz.trim(),
        promptRu: input.promptRu.trim(),
        hintUz: input.hintUz?.trim() || null,
        hintRu: input.hintRu?.trim() || null,
        answerType: input.answerType,
        required: input.required ?? row.required,
        isActive: input.isActive ?? row.isActive,
        sortOrder: input.sortOrder ?? row.sortOrder,
      },
    });

    if (input.options) {
      const incomingKeys = new Set(input.options.map((option) => option.key.trim()));
      await tx.onboardingOption.deleteMany({
        where: { questionId: id, key: { notIn: [...incomingKeys] } },
      });
      for (const [index, option] of input.options.entries()) {
        await tx.onboardingOption.upsert({
          where: { questionId_key: { questionId: id, key: option.key.trim() } },
          create: {
            questionId: id,
            key: option.key.trim(),
            labelUz: option.labelUz.trim(),
            labelRu: option.labelRu.trim(),
            allowsOther: option.allowsOther ?? false,
            isActive: option.isActive ?? true,
            sortOrder: option.sortOrder ?? (index + 1) * 10,
          },
          update: {
            labelUz: option.labelUz.trim(),
            labelRu: option.labelRu.trim(),
            allowsOther: option.allowsOther ?? false,
            isActive: option.isActive ?? true,
            sortOrder: option.sortOrder ?? (index + 1) * 10,
          },
        });
      }
    }

    return tx.onboardingQuestion.findUniqueOrThrow({ where: { id }, include: { options: true } });
  });

  return toQuestionDto(updated);
}

export async function deactivateOnboardingQuestion(
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingQuestionDto> {
  const row = await db.onboardingQuestion.findUnique({ where: { id }, include: { options: true } });
  if (!row) throw ApiError.notFound('Savol topilmadi');
  if (row.isSystem) throw ApiError.conflict('Tizim savolini o‘chirib bo‘lmaydi — faqat tahrirlash');
  const updated = await db.onboardingQuestion.update({
    where: { id },
    data: { isActive: false },
    include: { options: true },
  });
  return toQuestionDto(updated);
}

export async function reorderOnboardingQuestions(
  input: ReorderOnboardingItemsRequest,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingQuestionDto[]> {
  await db.$transaction(
    input.ids.map((id, index) =>
      db.onboardingQuestion.update({
        where: { id },
        data: { sortOrder: (index + 1) * 10 },
      }),
    ),
  );
  return listCatalogQuestions({ includeInactive: true }, db);
}

export async function listOnboardingNeeds(db: PrismaClient = defaultPrisma): Promise<OnboardingNeedDto[]> {
  await ensureOnboardingCatalog(db);
  const rows = await db.onboardingNeed.findMany({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] });
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    labelUz: row.labelUz,
    labelRu: row.labelRu,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }));
}

export async function listOnboardingSolutions(
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingSolutionDto[]> {
  await ensureOnboardingCatalog(db);
  const rows = await db.onboardingSolution.findMany({ orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }] });
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    labelUz: row.labelUz,
    labelRu: row.labelRu,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }));
}

async function upsertLabeled(
  kind: 'need' | 'solution',
  id: string | null,
  input: UpsertOnboardingNeedRequest,
  db: PrismaClient,
) {
  const key = slugKey(input.key || input.labelUz).toUpperCase();
  if (!key) throw ApiError.validation('Kalit kerak', [{ field: 'key', message: 'Kalit kerak' }]);
  const data = {
    key,
    labelUz: input.labelUz.trim(),
    labelRu: input.labelRu.trim(),
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 10,
  };
  if (kind === 'need') {
    const row = id
      ? await db.onboardingNeed.update({ where: { id }, data })
      : await db.onboardingNeed.create({ data });
    return {
      id: row.id,
      key: row.key,
      labelUz: row.labelUz,
      labelRu: row.labelRu,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  }
  const row = id
    ? await db.onboardingSolution.update({ where: { id }, data })
    : await db.onboardingSolution.create({ data });
  return {
    id: row.id,
    key: row.key,
    labelUz: row.labelUz,
    labelRu: row.labelRu,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function createOnboardingNeed(input: UpsertOnboardingNeedRequest, db: PrismaClient = defaultPrisma) {
  return upsertLabeled('need', null, input, db);
}

export async function updateOnboardingNeed(
  id: string,
  input: UpsertOnboardingNeedRequest,
  db: PrismaClient = defaultPrisma,
) {
  return upsertLabeled('need', id, input, db);
}

export async function deactivateOnboardingNeed(id: string, db: PrismaClient = defaultPrisma) {
  const row = await db.onboardingNeed.update({ where: { id }, data: { isActive: false } });
  return {
    id: row.id,
    key: row.key,
    labelUz: row.labelUz,
    labelRu: row.labelRu,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function createOnboardingSolution(
  input: UpsertOnboardingNeedRequest,
  db: PrismaClient = defaultPrisma,
) {
  return upsertLabeled('solution', null, input, db);
}

export async function updateOnboardingSolution(
  id: string,
  input: UpsertOnboardingNeedRequest,
  db: PrismaClient = defaultPrisma,
) {
  return upsertLabeled('solution', id, input, db);
}

export async function deactivateOnboardingSolution(id: string, db: PrismaClient = defaultPrisma) {
  const row = await db.onboardingSolution.update({ where: { id }, data: { isActive: false } });
  return {
    id: row.id,
    key: row.key,
    labelUz: row.labelUz,
    labelRu: row.labelRu,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

export async function reorderLabeled(
  kind: 'need' | 'solution',
  input: ReorderOnboardingItemsRequest,
  db: PrismaClient = defaultPrisma,
) {
  await db.$transaction(
    input.ids.map((id, index) =>
      kind === 'need'
        ? db.onboardingNeed.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } })
        : db.onboardingSolution.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } }),
    ),
  );
  return kind === 'need' ? listOnboardingNeeds(db) : listOnboardingSolutions(db);
}

export async function listOnboardingMappings(
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingNeedMappingDto[]> {
  await ensureOnboardingCatalog(db);
  const rows = await db.onboardingNeedMapping.findMany({
    include: { question: { select: { key: true } }, need: true, solution: true },
    orderBy: { id: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    questionId: row.questionId,
    questionKey: row.question.key,
    optionKey: row.optionKey,
    needId: row.needId,
    needKey: row.need.key,
    needLabelUz: row.need.labelUz,
    solutionId: row.solutionId,
    solutionKey: row.solution.key,
    solutionLabelUz: row.solution.labelUz,
  }));
}

export async function createOnboardingMapping(
  input: UpsertOnboardingMappingRequest,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingNeedMappingDto> {
  const created = await db.onboardingNeedMapping.create({
    data: {
      questionId: input.questionId,
      optionKey: input.optionKey.trim(),
      needId: input.needId,
      solutionId: input.solutionId,
    },
    include: { question: { select: { key: true } }, need: true, solution: true },
  });
  return {
    id: created.id,
    questionId: created.questionId,
    questionKey: created.question.key,
    optionKey: created.optionKey,
    needId: created.needId,
    needKey: created.need.key,
    needLabelUz: created.need.labelUz,
    solutionId: created.solutionId,
    solutionKey: created.solution.key,
    solutionLabelUz: created.solution.labelUz,
  };
}

export async function deleteOnboardingMapping(id: string, db: PrismaClient = defaultPrisma): Promise<void> {
  await db.onboardingNeedMapping.delete({ where: { id } });
}
