import {
  AccountPurpose,
  AuditEntityType,
  AuditEventType,
  MonthlyIncomeBand,
  ONBOARDING_FLOW_KEY,
  ONBOARDING_FLOW_VERSION,
  OnboardingSubmissionStatus,
  isCustomIncomeBand,
  mergeOnboardingAnswers,
  readOnboardingAnswers,
  sanitizeAnswersForPersistence,
  sanitizeOnboardingAnswers,
  validateOnboardingComplete,
  validateRegisterPersonalAccountDraft,
  type CompletePersonalOnboardingRequest,
  type CompletePersonalOnboardingResponse,
  type OnboardingAnswerRowDto,
  type OnboardingAnswers,
  type OnboardingCatalogResponse,
  type OnboardingStatsResponse,
  type OnboardingSubmissionDto,
  type SaveOnboardingAnswersRequest,
} from '@furniture-erp/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { prisma as defaultPrisma } from '../../../lib/prisma.js';
import { recordAudit } from '../../../services/audit.service.js';
import { ApiError } from '../../../utils/api-error.js';
import {
  createPersonalAccountForUser,
  registerPersonalAccount,
} from '../../accounts/personal-account.service.js';
import { getPublicOnboardingCatalog, loadSanitizeCatalog } from './onboarding-catalog.service.js';

function newPublicToken(): string {
  return randomBytes(24).toString('hex');
}

function toSubmissionDto(
  row: {
    publicToken: string;
    flowKey: string;
    flowVersion: number;
    experimentKey: string | null;
    status: string;
    answers: Prisma.JsonValue;
    identityId: string | null;
    workspaceId: string | null;
    createdAt: Date;
    completedAt: Date | null;
    sensitive?: { customMonthlyIncomeSom: bigint | null } | null;
  },
): OnboardingSubmissionDto {
  return {
    publicToken: row.publicToken,
    flowKey: row.flowKey,
    flowVersion: row.flowVersion,
    experimentKey: row.experimentKey,
    status: row.status as OnboardingSubmissionDto['status'],
    answers: readOnboardingAnswers(row.answers),
    hasCustomIncome: Boolean(row.sensitive?.customMonthlyIncomeSom),
    customMonthlyIncomeSom: row.sensitive?.customMonthlyIncomeSom
      ? Number(row.sensitive.customMonthlyIncomeSom)
      : null,
    identityId: row.identityId,
    workspaceId: row.workspaceId,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

async function loadOpenSubmission(token: string, db: PrismaClient) {
  const row = await db.onboardingSubmission.findUnique({
    where: { publicToken: token },
    include: { sensitive: { select: { customMonthlyIncomeSom: true } } },
  });
  if (!row) {
    throw ApiError.notFound('Onboarding topilmadi');
  }
  if (row.status === OnboardingSubmissionStatus.COMPLETED) {
    throw ApiError.conflict('Onboarding allaqachon yakunlangan');
  }
  return row;
}

export async function getOnboardingCatalog(
  filter: { accountType?: 'PERSONAL' | 'BUSINESS' | null; businessType?: string | null } = {},
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingCatalogResponse> {
  return getPublicOnboardingCatalog(filter, db);
}

export async function startOnboarding(
  experimentKey?: string | null,
  identityId?: string | null,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingSubmissionDto> {
  const created = await db.onboardingSubmission.create({
    data: {
      publicToken: newPublicToken(),
      flowKey: ONBOARDING_FLOW_KEY,
      flowVersion: ONBOARDING_FLOW_VERSION,
      experimentKey: experimentKey?.trim() || null,
      status: OnboardingSubmissionStatus.IN_PROGRESS,
      answers: {},
      identityId: identityId ?? null,
    },
    include: { sensitive: { select: { customMonthlyIncomeSom: true } } },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.ONBOARDING_STARTED,
    entityType: AuditEntityType.ONBOARDING_SUBMISSION,
    entityId: created.id,
    summary: 'Onboarding started',
    metadata: { flowKey: created.flowKey, flowVersion: created.flowVersion },
  });

  return toSubmissionDto(created);
}

export async function getOnboarding(
  token: string,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingSubmissionDto> {
  const row = await db.onboardingSubmission.findUnique({
    where: { publicToken: token },
    include: { sensitive: { select: { customMonthlyIncomeSom: true } } },
  });
  if (!row) {
    throw ApiError.notFound('Onboarding topilmadi');
  }
  return toSubmissionDto(row);
}

export async function saveOnboardingAnswers(
  token: string,
  input: SaveOnboardingAnswersRequest,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingSubmissionDto> {
  const row = await loadOpenSubmission(token, db);
  const catalog = await loadSanitizeCatalog(db).catch(() => []);
  const patch = sanitizeAnswersForPersistence(input.answers, catalog);
  const merged = sanitizeAnswersForPersistence(
    mergeOnboardingAnswers(readOnboardingAnswers(row.answers), patch),
    catalog,
  );

  const customAmount =
    isCustomIncomeBand(merged.monthlyIncomeBand) &&
    input.customMonthlyIncomeSom != null &&
    Number.isInteger(input.customMonthlyIncomeSom) &&
    input.customMonthlyIncomeSom > 0
      ? BigInt(input.customMonthlyIncomeSom)
      : null;

  const updated = await db.$transaction(async (tx) => {
    const submission = await tx.onboardingSubmission.update({
      where: { id: row.id },
      data: { answers: merged as Prisma.InputJsonValue },
    });

    if (isCustomIncomeBand(merged.monthlyIncomeBand) && customAmount != null) {
      await tx.onboardingSensitiveAnswer.upsert({
        where: { submissionId: row.id },
        create: { submissionId: row.id, customMonthlyIncomeSom: customAmount },
        update: { customMonthlyIncomeSom: customAmount },
      });
    } else if (!isCustomIncomeBand(merged.monthlyIncomeBand)) {
      await tx.onboardingSensitiveAnswer.deleteMany({ where: { submissionId: row.id } });
    }

    const sensitive = await tx.onboardingSensitiveAnswer.findUnique({
      where: { submissionId: row.id },
      select: { customMonthlyIncomeSom: true },
    });
    return { ...submission, sensitive };
  });

  return toSubmissionDto(updated);
}

async function finishPersonalSubmission(
  token: string,
  workspaceId: string,
  identityId: string,
  answers: OnboardingAnswers,
  db: PrismaClient,
): Promise<OnboardingSubmissionDto> {
  const row = await loadOpenSubmission(token, db);

  const updated = await db.onboardingSubmission.update({
    where: { id: row.id },
    data: {
      status: OnboardingSubmissionStatus.COMPLETED,
      completedAt: new Date(),
      identityId,
      workspaceId,
      answers: answers as Prisma.InputJsonValue,
    },
    include: { sensitive: { select: { customMonthlyIncomeSom: true } } },
  });

  await db.personalProfile.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      goals: answers.goals ?? [],
      discoverySource: answers.discoverySource ?? null,
      monthlyIncomeBand: answers.monthlyIncomeBand ?? null,
      helpWith: answers.helpWith ?? [],
    },
    update: {
      goals: answers.goals ?? [],
      discoverySource: answers.discoverySource ?? null,
      monthlyIncomeBand: answers.monthlyIncomeBand ?? null,
      helpWith: answers.helpWith ?? [],
    },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.ONBOARDING_COMPLETED,
    entityType: AuditEntityType.ONBOARDING_SUBMISSION,
    entityId: row.id,
    summary: 'Personal onboarding completed',
    metadata: {
      workspaceId,
      monthlyIncomeBand: answers.monthlyIncomeBand ?? null,
      discoverySource: answers.discoverySource ?? null,
      firstSavingGoal: answers.firstSavingGoal ?? null,
    },
  });

  return toSubmissionDto(updated);
}

/** BUSINESS purpose: require catalogue answers, then the UI continues on /register-store. */
export async function completeBusinessOnboarding(
  token: string,
  identityId?: string | null,
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingSubmissionDto> {
  const row = await loadOpenSubmission(token, db);
  const catalog = await loadSanitizeCatalog(db).catch(() => []);
  const answers = sanitizeAnswersForPersistence(
    mergeOnboardingAnswers(readOnboardingAnswers(row.answers), {
      purpose: AccountPurpose.BUSINESS,
    }),
    catalog,
  );
  const fieldErrors = validateOnboardingComplete(answers, catalog);
  if (fieldErrors.length > 0) {
    throw ApiError.validation('Onboarding savollarini to‘ldiring', fieldErrors);
  }

  const updated = await db.onboardingSubmission.update({
    where: { id: row.id },
    data: {
      status: OnboardingSubmissionStatus.COMPLETED,
      completedAt: new Date(),
      answers: answers as Prisma.InputJsonValue,
      identityId: identityId ?? row.identityId,
    },
    include: { sensitive: { select: { customMonthlyIncomeSom: true } } },
  });

  await recordAudit({
    storeId: null,
    actorUserId: null,
    eventType: AuditEventType.ONBOARDING_COMPLETED,
    entityType: AuditEntityType.ONBOARDING_SUBMISSION,
    entityId: row.id,
    summary: 'Business onboarding redirected to store registration',
    metadata: {
      purpose: AccountPurpose.BUSINESS,
      businessType: answers.businessType ?? null,
      workspaceId: null,
    },
  });

  return toSubmissionDto(updated);
}

export async function completePersonalOnboardingRegister(
  token: string,
  input: CompletePersonalOnboardingRequest,
  db: PrismaClient = defaultPrisma,
  attribution?: { code?: string | null; visitorKey?: string | null },
): Promise<CompletePersonalOnboardingResponse> {
  const row = await loadOpenSubmission(token, db);
  const answers = readOnboardingAnswers(row.answers);
  const customSom = row.sensitive?.customMonthlyIncomeSom
    ? Number(row.sensitive.customMonthlyIncomeSom)
    : null;
  const catalog = await loadSanitizeCatalog(db).catch(() => []);
  const fieldErrors = validateOnboardingComplete(answers, catalog, customSom);
  if (fieldErrors.length > 0) {
    throw ApiError.validation('Onboarding savollarini to‘ldiring', fieldErrors);
  }

  const registerDraft = {
    firstName: input.firstName ?? '',
    lastName: input.lastName ?? '',
    email: input.email ?? '',
    password: input.password ?? '',
    passwordConfirmation: input.passwordConfirmation ?? '',
    name: input.name,
  };
  const registerErrors = validateRegisterPersonalAccountDraft(registerDraft);
  if (registerErrors.length > 0) {
    throw ApiError.validation('Hisob ma’lumotlarini to‘ldiring', registerErrors);
  }

  const created = await registerPersonalAccount(
    {
      ...registerDraft,
      referralCode: attribution?.code,
      visitorKey: attribution?.visitorKey,
    },
    db,
  );
  const submission = await finishPersonalSubmission(
    token,
    created.workspace.id,
    created.identity.id,
    answers,
    db,
  );
  return { ...created, submission };
}

export async function completePersonalOnboardingForUser(
  token: string,
  userId: string,
  input: CompletePersonalOnboardingRequest,
  db: PrismaClient = defaultPrisma,
): Promise<CompletePersonalOnboardingResponse> {
  const row = await loadOpenSubmission(token, db);
  const answers = readOnboardingAnswers(row.answers);
  const customSom = row.sensitive?.customMonthlyIncomeSom
    ? Number(row.sensitive.customMonthlyIncomeSom)
    : null;
  const catalog = await loadSanitizeCatalog(db).catch(() => []);
  const fieldErrors = validateOnboardingComplete(answers, catalog, customSom);
  if (fieldErrors.length > 0) {
    throw ApiError.validation('Onboarding savollarini to‘ldiring', fieldErrors);
  }

  const created = await createPersonalAccountForUser(userId, { name: input.name }, db);
  const submission = await finishPersonalSubmission(
    token,
    created.workspace.id,
    created.identity.id,
    answers,
    db,
  );
  return { ...created, submission };
}

function countBy(values: Array<string | undefined>): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function countMulti(values: Array<string[] | undefined>): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const list of values) {
    for (const value of list ?? []) {
      map.set(value, (map.get(value) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

async function loadNeedMappings(db: PrismaClient) {
  try {
    return await db.onboardingNeedMapping.findMany({
      include: { question: { select: { key: true } }, need: { select: { key: true, isActive: true } } },
    });
  } catch {
    return [];
  }
}

/** Aggregate analytics. Never returns custom income amounts. */
export async function getOnboardingStats(
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingStatsResponse> {
  const [started, completedRows, mappings] = await Promise.all([
    db.onboardingSubmission.count({
      where: { flowKey: ONBOARDING_FLOW_KEY, flowVersion: ONBOARDING_FLOW_VERSION },
    }),
    db.onboardingSubmission.findMany({
      where: {
        flowKey: ONBOARDING_FLOW_KEY,
        flowVersion: ONBOARDING_FLOW_VERSION,
        status: OnboardingSubmissionStatus.COMPLETED,
      },
      select: { answers: true, sensitive: { select: { id: true } } },
    }),
    loadNeedMappings(db),
  ]);

  const answers = completedRows.map((row) => readOnboardingAnswers(row.answers));
  const personalCompleted = answers.filter((item) => item.purpose === AccountPurpose.PERSONAL).length;
  const businessCompleted = answers.filter((item) => item.purpose === AccountPurpose.BUSINESS).length;
  const customIncomeEnteredCount = completedRows.filter(
    (row) =>
      sanitizeOnboardingAnswers(row.answers).monthlyIncomeBand === MonthlyIncomeBand.CUSTOM &&
      row.sensitive,
  ).length;

  const topAnswerMap = new Map<string, number>();
  for (const item of answers) {
    for (const [questionKey, value] of Object.entries(item)) {
      if (questionKey === 'purpose' || questionKey.endsWith('Other')) continue;
      const keys = Array.isArray(value) ? value : value ? [value] : [];
      for (const optionKey of keys) {
        if (typeof optionKey !== 'string') continue;
        const mapKey = `${questionKey}::${optionKey}`;
        topAnswerMap.set(mapKey, (topAnswerMap.get(mapKey) ?? 0) + 1);
      }
    }
  }
  const topAnswers = [...topAnswerMap.entries()]
    .map(([key, count]) => {
      const [questionKey, optionKey] = key.split('::');
      return { questionKey: questionKey ?? '', optionKey: optionKey ?? '', count };
    })
    .sort((a, b) => b.count - a.count || a.questionKey.localeCompare(b.questionKey))
    .slice(0, 20);

  const needMap = new Map<string, number>();
  const mappingRows = Array.isArray(mappings) ? mappings : [];
  for (const item of answers) {
    for (const mapping of mappingRows) {
      if (!mapping.need?.isActive) continue;
      const selected = item[mapping.question.key];
      const keys = Array.isArray(selected) ? selected : selected ? [selected] : [];
      if (keys.includes(mapping.optionKey)) {
        needMap.set(mapping.need.key, (needMap.get(mapping.need.key) ?? 0) + 1);
      }
    }
  }

  return {
    flowKey: ONBOARDING_FLOW_KEY,
    flowVersion: ONBOARDING_FLOW_VERSION,
    started,
    completed: completedRows.length,
    conversionRate: started > 0 ? completedRows.length / started : 0,
    personalCompleted,
    businessCompleted,
    purpose: countBy(answers.map((item) => item.purpose)),
    businessType: countBy(answers.map((item) => item.businessType)),
    discoverySource: countBy(answers.map((item) => item.discoverySource)),
    goals: countMulti(answers.map((item) => item.goals)),
    helpWith: countMulti(answers.map((item) => item.helpWith)),
    monthlyIncomeBand: countBy(answers.map((item) => item.monthlyIncomeBand)),
    firstSavingGoal: countBy(answers.map((item) => item.firstSavingGoal)),
    topAnswers,
    needs: [...needMap.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    customIncomeEnteredCount,
  };
}

export async function listOnboardingAnswers(
  db: PrismaClient = defaultPrisma,
): Promise<OnboardingAnswerRowDto[]> {
  const rows = await db.onboardingSubmission.findMany({
    where: { flowKey: ONBOARDING_FLOW_KEY, flowVersion: ONBOARDING_FLOW_VERSION },
    include: { sensitive: { select: { customMonthlyIncomeSom: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return rows.map((row) => {
    const answers = readOnboardingAnswers(row.answers);
    return {
      id: row.id,
      publicToken: row.publicToken,
      status: row.status as OnboardingAnswerRowDto['status'],
      purpose: answers.purpose ?? null,
      businessType: answers.businessType ?? null,
      identityId: row.identityId,
      workspaceId: row.workspaceId,
      answers,
      hasCustomIncome: Boolean(row.sensitive?.customMonthlyIncomeSom),
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  });
}
