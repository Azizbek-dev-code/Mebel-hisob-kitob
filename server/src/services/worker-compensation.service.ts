import {
  AuditEntityType,
  AuditEventType,
  DateRangePreset,
  SALE_WORKER_PAY_ROLE_LABELS,
  SALE_WORKER_PAY_ROLE_RESPONSIBILITY,
  SaleWorkerPayRole,
  UserRole,
  WorkerCompensationType,
  WORKER_COMPENSATION_PREVIEW_DISCLAIMER,
  calculateWorkerCompensation,
  compensationDateRangesOverlap,
  findCompensationRuleForTypeOnDate,
  isFixedCompensationType,
  isPercentCompensationType,
  requiredResponsibilityForCompensationType,
  assertValidBasisPoints,
  MAX_COMPENSATION_BASIS_POINTS,
  MIN_COMPENSATION_BASIS_POINTS,
  type CompensationRuleMatchInput,
  type CreateWorkerCompensationRuleRequest,
  type UpdateWorkerCompensationRuleRequest,
  type WorkerCompensationPreview,
  type WorkerCompensationPreviewBreakdownItem,
  type WorkerCompensationPreviewEventKind,
  type WorkerCompensationRule,
  type WorkerResponsibility,
  type SettleWorkerCompensationResult,
  WorkerFinancialReferenceType,
  WorkerFinancialTransactionType,
} from '@furniture-erp/shared';

import { parseFlexibleDate } from '../lib/date-input.js';
import { resolveDashboardRange } from '../lib/date-range.js';
import { fromDbMoney } from '../lib/money-mapper.js';
import { prisma } from '../lib/prisma.js';
import * as workerCompensationRepository from '../repositories/worker-compensation.repository.js';
import * as workerFinancialRepository from '../repositories/worker-financial.repository.js';
import { ApiError } from '../utils/api-error.js';
import { recordAudit } from './audit.service.js';

const COMPENSATION_MANAGERS: ReadonlySet<string> = new Set([
  UserRole.ADMIN,
  UserRole.PLATFORM_ADMIN,
]);

export function canManageWorkerCompensation(role: string): boolean {
  return COMPENSATION_MANAGERS.has(role);
}

export function assertCanManageWorkerCompensation(role: string): void {
  if (!canManageWorkerCompensation(role)) {
    throw ApiError.forbidden('Only store administrators can manage worker compensation rules');
  }
}

function normaliseNotes(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseEffectiveDateOrThrow(value: string, field: string): Date {
  try {
    const date = parseFlexibleDate(value);
    if (!date || Number.isNaN(date.getTime())) {
      throw new Error('invalid');
    }
    return date;
  } catch {
    throw ApiError.validation(`Invalid ${field}`, [{ field, message: `Invalid ${field}` }]);
  }
}

function parseOptionalEffectiveTo(
  value: string | null | undefined,
  field = 'effectiveTo',
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return parseEffectiveDateOrThrow(value, field);
}

function assertDateOrder(effectiveFrom: Date, effectiveTo: Date | null): void {
  if (effectiveTo && effectiveTo.getTime() < effectiveFrom.getTime()) {
    throw ApiError.validation('effectiveTo must not be before effectiveFrom', [
      { field: 'effectiveTo', message: 'effectiveTo must not be before effectiveFrom' },
    ]);
  }
}

function assertValueForType(type: WorkerCompensationRule['type'], value: number): void {
  if (!Number.isInteger(value)) {
    throw ApiError.validation('value must be a whole number', [
      { field: 'value', message: 'value must be a whole number' },
    ]);
  }

  if (isPercentCompensationType(type)) {
    try {
      assertValidBasisPoints(value);
    } catch {
      throw ApiError.validation(
        `Percentage must be between ${MIN_COMPENSATION_BASIS_POINTS} and ${MAX_COMPENSATION_BASIS_POINTS} basis points (0.01%–100%)`,
        [
          {
            field: 'value',
            message: `Percentage must be between ${MIN_COMPENSATION_BASIS_POINTS} and ${MAX_COMPENSATION_BASIS_POINTS} basis points`,
          },
        ],
      );
    }
    return;
  }

  if (isFixedCompensationType(type)) {
    if (!(value > 0)) {
      throw ApiError.validation('Fixed compensation amount must be greater than zero', [
        { field: 'value', message: 'Fixed compensation amount must be greater than zero' },
      ]);
    }
    return;
  }

  throw ApiError.validation('Unsupported compensation type', [
    { field: 'type', message: 'Unsupported compensation type' },
  ]);
}

function assertResponsibilityMatchesType(
  responsibility: WorkerResponsibility,
  type: WorkerCompensationRule['type'],
): void {
  const required = requiredResponsibilityForCompensationType(type);
  if (responsibility !== required) {
    throw ApiError.validation(
      `Compensation type ${type} requires responsibility ${required}`,
      [
        {
          field: 'responsibility',
          message: `Compensation type ${type} requires responsibility ${required}`,
        },
      ],
    );
  }
}

async function assertWorkerForCreate(
  storeId: string,
  workerId: string,
  responsibility: WorkerResponsibility,
): Promise<string> {
  const worker = await workerCompensationRepository.findWorkerUserInStore(storeId, workerId);
  if (!worker) {
    throw ApiError.notFound('Worker not found');
  }
  if (worker.role !== UserRole.EMPLOYEE) {
    throw ApiError.validation('Worker must be an employee account', [
      { field: 'workerId', message: 'Worker must be an employee account' },
    ]);
  }
  if (!worker.isActive) {
    throw ApiError.validation('Worker is inactive', [
      { field: 'workerId', message: 'Worker is inactive' },
    ]);
  }
  const hasResponsibility = worker.responsibilities.some(
    (row) => row.responsibility === responsibility,
  );
  if (!hasResponsibility) {
    throw ApiError.validation(`Worker does not have responsibility ${responsibility}`, [
      {
        field: 'responsibility',
        message: `Worker does not have responsibility ${responsibility}`,
      },
    ]);
  }
  return worker.id;
}

async function assertWorkerReadable(storeId: string, workerId: string): Promise<void> {
  const worker = await workerCompensationRepository.findWorkerUserInStore(storeId, workerId);
  if (!worker || worker.role !== UserRole.EMPLOYEE) {
    throw ApiError.notFound('Worker not found');
  }
}

export async function createCompensationRule(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  input: CreateWorkerCompensationRuleRequest,
): Promise<WorkerCompensationRule> {
  assertCanManageWorkerCompensation(actor.role);

  assertResponsibilityMatchesType(input.responsibility, input.type);
  assertValueForType(input.type, input.value);

  const resolvedWorkerId = await assertWorkerForCreate(storeId, workerId, input.responsibility);
  const effectiveFrom = parseEffectiveDateOrThrow(input.effectiveFrom, 'effectiveFrom');
  const effectiveTo = parseOptionalEffectiveTo(input.effectiveTo ?? null) ?? null;
  assertDateOrder(effectiveFrom, effectiveTo);

  const isActive = input.isActive ?? true;

  const rule = await workerCompensationRepository.runInTransaction(async (tx) => {
    const candidates = await workerCompensationRepository.findPotentialOverlapRules(
      {
        storeId,
        workerId: resolvedWorkerId,
        responsibility: input.responsibility,
        type: input.type,
      },
      tx,
    );
    const overlaps = candidates.some((candidate) =>
      compensationDateRangesOverlap(
        effectiveFrom,
        effectiveTo,
        candidate.effectiveFrom,
        candidate.effectiveTo,
      ),
    );
    if (overlaps) {
      throw ApiError.conflict(
        'A compensation rule with the same worker, responsibility, and type already overlaps these effective dates',
      );
    }

    return workerCompensationRepository.createRule(
      {
        storeId,
        workerId: resolvedWorkerId,
        responsibility: input.responsibility,
        type: input.type,
        value: input.value,
        isActive,
        effectiveFrom,
        effectiveTo,
        notes: normaliseNotes(input.notes),
        createdById: actor.id,
      },
      tx,
    );
  });

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.COMPENSATION_RULE_CREATED,
    entityType: AuditEntityType.COMPENSATION_RULE,
    entityId: rule.id,
    summary: `Compensation rule created for worker ${resolvedWorkerId}`,
    metadata: {
      workerId: resolvedWorkerId,
      type: rule.type,
      responsibility: rule.responsibility,
    },
  });

  return rule;
}

export async function listCompensationRules(
  storeId: string,
  actorRole: string,
  workerId: string,
  query?: { isActive?: boolean },
): Promise<WorkerCompensationRule[]> {
  assertCanManageWorkerCompensation(actorRole);
  await assertWorkerReadable(storeId, workerId);
  return workerCompensationRepository.listRulesForWorker(storeId, workerId, {
    isActive: query?.isActive,
  });
}

export async function getCompensationRule(
  storeId: string,
  actorRole: string,
  workerId: string,
  ruleId: string,
): Promise<WorkerCompensationRule> {
  assertCanManageWorkerCompensation(actorRole);
  await assertWorkerReadable(storeId, workerId);

  const rule = await workerCompensationRepository.findRuleInStoreForWorker(
    storeId,
    workerId,
    ruleId,
  );
  if (!rule) {
    throw ApiError.notFound('Compensation rule not found');
  }
  return rule;
}

export async function updateCompensationRule(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  ruleId: string,
  input: UpdateWorkerCompensationRuleRequest,
): Promise<WorkerCompensationRule> {
  assertCanManageWorkerCompensation(actor.role);
  await assertWorkerReadable(storeId, workerId);

  const existing = await workerCompensationRepository.findRuleInStoreForWorker(
    storeId,
    workerId,
    ruleId,
  );
  if (!existing) {
    throw ApiError.notFound('Compensation rule not found');
  }

  if (
    Object.prototype.hasOwnProperty.call(input, 'responsibility') ||
    Object.prototype.hasOwnProperty.call(input, 'type') ||
    Object.prototype.hasOwnProperty.call(input, 'workerId') ||
    Object.prototype.hasOwnProperty.call(input, 'storeId') ||
    Object.prototype.hasOwnProperty.call(input, 'createdById')
  ) {
    throw ApiError.validation(
      'responsibility, type, workerId, storeId, and createdById cannot be changed; deactivate and create a new rule instead',
      [{ field: 'type', message: 'Immutable compensation fields cannot be changed' }],
    );
  }

  const nextValue = input.value !== undefined ? input.value : existing.value;
  assertValueForType(existing.type, nextValue);

  const effectiveFrom =
    input.effectiveFrom !== undefined
      ? parseEffectiveDateOrThrow(input.effectiveFrom, 'effectiveFrom')
      : new Date(existing.effectiveFrom);

  const effectiveTo =
    input.effectiveTo !== undefined
      ? (parseOptionalEffectiveTo(input.effectiveTo) ?? null)
      : existing.effectiveTo
        ? new Date(existing.effectiveTo)
        : null;

  assertDateOrder(effectiveFrom, effectiveTo);

  const rule = await workerCompensationRepository
    .runInTransaction(async (tx) => {
      const candidates = await workerCompensationRepository.findPotentialOverlapRules(
        {
          storeId,
          workerId,
          responsibility: existing.responsibility,
          type: existing.type,
          excludeRuleId: ruleId,
        },
        tx,
      );
      const overlaps = candidates.some((candidate) =>
        compensationDateRangesOverlap(
          effectiveFrom,
          effectiveTo,
          candidate.effectiveFrom,
          candidate.effectiveTo,
        ),
      );
      if (overlaps) {
        throw ApiError.conflict(
          'A compensation rule with the same worker, responsibility, and type already overlaps these effective dates',
        );
      }

      return workerCompensationRepository.updateRule(
        storeId,
        ruleId,
        {
          value: input.value,
          isActive: input.isActive,
          effectiveFrom: input.effectiveFrom !== undefined ? effectiveFrom : undefined,
          effectiveTo: input.effectiveTo !== undefined ? effectiveTo : undefined,
          notes: input.notes !== undefined ? normaliseNotes(input.notes) : undefined,
        },
        tx,
      );
    })
    .catch((error) => {
      if (error instanceof Error && error.message === 'COMPENSATION_RULE_NOT_IN_STORE') {
        throw ApiError.notFound('Compensation rule not found');
      }
      throw error;
    });

  await recordAudit({
    storeId,
    actorUserId: actor.id,
    eventType: AuditEventType.COMPENSATION_RULE_UPDATED,
    entityType: AuditEntityType.COMPENSATION_RULE,
    entityId: rule.id,
    summary: `Compensation rule updated for worker ${workerId}`,
    metadata: { workerId, type: rule.type },
  });

  return rule;
}

function productSummary(names: string[]): string {
  return names.filter(Boolean).join(', ') || '—';
}

function rulesToMatchInputs(rules: WorkerCompensationRule[]): CompensationRuleMatchInput[] {
  return rules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    value: rule.value,
    effectiveFrom: new Date(rule.effectiveFrom),
    effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
  }));
}

function pushLine(
  breakdown: WorkerCompensationPreviewBreakdownItem[],
  line: WorkerCompensationPreviewBreakdownItem,
): void {
  breakdown.push(line);
}

/**
 * Pure preview assembly — used by getCompensationPreview and unit tests.
 * Never writes to the database.
 *
 * MANUAL SaleWorkerCompensation rows override RULE lines for the same sale
 * event bucket (SELLER→SALE, ASSEMBLER→ASSEMBLY, DASTAFCHI/SHOPIR→DELIVERY).
 */
export function buildCompensationPreview(options: {
  worker: { id: string; fullName: string; isActive: boolean };
  period: { from: string; to: string };
  rules: WorkerCompensationRule[];
  sales: workerCompensationRepository.PreviewSaleRow[];
  assemblies: workerCompensationRepository.PreviewAssemblyRow[];
  deliveries: workerCompensationRepository.PreviewDeliveryRow[];
  installations: workerCompensationRepository.PreviewInstallationRow[];
  /** All MANUAL rows in period (any worker); override uses sale+role, append filters by worker. */
  manuals?: workerCompensationRepository.PreviewManualCompensationRow[];
}): WorkerCompensationPreview {
  const matchRules = rulesToMatchInputs(options.rules);
  const breakdown: WorkerCompensationPreviewBreakdownItem[] = [];
  const saleIds = new Set<string>();
  const assemblyIds = new Set<string>();
  const deliveryIds = new Set<string>();
  const installationIds = new Set<string>();
  const appliedRuleIds = new Set<string>();

  const manuals = options.manuals ?? [];
  const overrideRolesBySale = new Map<string, Set<SaleWorkerPayRole>>();
  for (const row of manuals) {
    const role = row.role as SaleWorkerPayRole;
    const set = overrideRolesBySale.get(row.saleId) ?? new Set<SaleWorkerPayRole>();
    set.add(role);
    overrideRolesBySale.set(row.saleId, set);
  }

  const saleHasManualRole = (saleId: string, role: SaleWorkerPayRole): boolean =>
    overrideRolesBySale.get(saleId)?.has(role) === true;

  for (const sale of options.sales) {
    if (saleHasManualRole(sale.id, SaleWorkerPayRole.SELLER)) {
      continue;
    }

    const eventDate = sale.saleDate;
    const description = `Sotuv #${sale.saleNumber} · ${productSummary(sale.productNames)}`;
    const totalSalePrice = fromDbMoney(sale.totalSalePrice);
    const grossProfit = fromDbMoney(sale.grossProfit);

    const saleRuleTypes = [
      WorkerCompensationType.PERCENT_OF_SALE,
      WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
      WorkerCompensationType.FIXED_PER_SALE,
    ] as const;

    let matchedOnSale = false;
    for (const type of saleRuleTypes) {
      const rule = findCompensationRuleForTypeOnDate(matchRules, type, eventDate);
      if (!rule) continue;

      const fullRule = options.rules.find((row) => row.id === rule.id);
      if (!fullRule) continue;

      const baseAmount =
        type === WorkerCompensationType.PERCENT_OF_SALE
          ? totalSalePrice
          : type === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT
            ? grossProfit
            : undefined;

      const compensationAmount = calculateWorkerCompensation({
        type,
        value: rule.value,
        baseAmount,
      });

      matchedOnSale = true;
      appliedRuleIds.add(rule.id);
      pushLine(breakdown, {
        id: `${sale.id}:${type}`,
        eventDate: eventDate.toISOString(),
        eventKind: 'SALE',
        description,
        eventAmount:
          type === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT
            ? grossProfit
            : totalSalePrice,
        ruleId: rule.id,
        ruleType: type,
        responsibility: fullRule.responsibility,
        ruleValue: rule.value,
        compensationAmount,
        referenceType: 'SALE',
        referenceId: sale.id,
        source: 'RULE',
      });
    }
    if (matchedOnSale) saleIds.add(sale.id);
  }

  for (const task of options.assemblies) {
    if (saleHasManualRole(task.saleId, SaleWorkerPayRole.ASSEMBLER)) {
      continue;
    }

    const eventDate = task.completedAt;
    const rule = findCompensationRuleForTypeOnDate(
      matchRules,
      WorkerCompensationType.FIXED_PER_ASSEMBLY,
      eventDate,
    );
    if (!rule) continue;
    const fullRule = options.rules.find((row) => row.id === rule.id);
    if (!fullRule) continue;

    const compensationAmount = calculateWorkerCompensation({
      type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
      value: rule.value,
    });
    assemblyIds.add(task.id);
    appliedRuleIds.add(rule.id);
    pushLine(breakdown, {
      id: `${task.id}:FIXED_PER_ASSEMBLY`,
      eventDate: eventDate.toISOString(),
      eventKind: 'ASSEMBLY',
      description: `Terlash · Sotuv #${task.saleNumber} · ${productSummary(task.productNames)}`,
      eventAmount: compensationAmount,
      ruleId: rule.id,
      ruleType: WorkerCompensationType.FIXED_PER_ASSEMBLY,
      responsibility: fullRule.responsibility,
      ruleValue: rule.value,
      compensationAmount,
      referenceType: 'ASSEMBLY_TASK',
      referenceId: task.id,
      source: 'RULE',
    });
  }

  for (const delivery of options.deliveries) {
    if (
      saleHasManualRole(delivery.id, SaleWorkerPayRole.DASTAFCHI) ||
      saleHasManualRole(delivery.id, SaleWorkerPayRole.SHOPIR)
    ) {
      continue;
    }

    const eventDate = delivery.deliveryDate;
    const rule = findCompensationRuleForTypeOnDate(
      matchRules,
      WorkerCompensationType.FIXED_PER_DELIVERY,
      eventDate,
    );
    if (!rule) continue;
    const fullRule = options.rules.find((row) => row.id === rule.id);
    if (!fullRule) continue;

    const compensationAmount = calculateWorkerCompensation({
      type: WorkerCompensationType.FIXED_PER_DELIVERY,
      value: rule.value,
    });
    deliveryIds.add(delivery.id);
    appliedRuleIds.add(rule.id);
    pushLine(breakdown, {
      id: `${delivery.id}:FIXED_PER_DELIVERY`,
      eventDate: eventDate.toISOString(),
      eventKind: 'DELIVERY',
      description: `Yetkazib berish · Sotuv #${delivery.saleNumber} · ${productSummary(delivery.productNames)}`,
      eventAmount: compensationAmount,
      ruleId: rule.id,
      ruleType: WorkerCompensationType.FIXED_PER_DELIVERY,
      responsibility: fullRule.responsibility,
      ruleValue: rule.value,
      compensationAmount,
      referenceType: 'SALE',
      referenceId: delivery.id,
      source: 'RULE',
    });
  }

  for (const installation of options.installations) {
    const eventDate = installation.installationDate;
    const rule = findCompensationRuleForTypeOnDate(
      matchRules,
      WorkerCompensationType.FIXED_PER_INSTALLATION,
      eventDate,
    );
    if (!rule) continue;
    const fullRule = options.rules.find((row) => row.id === rule.id);
    if (!fullRule) continue;

    const compensationAmount = calculateWorkerCompensation({
      type: WorkerCompensationType.FIXED_PER_INSTALLATION,
      value: rule.value,
    });
    installationIds.add(installation.id);
    appliedRuleIds.add(rule.id);
    pushLine(breakdown, {
      id: `${installation.id}:FIXED_PER_INSTALLATION`,
      eventDate: eventDate.toISOString(),
      eventKind: 'INSTALLATION',
      description: `O'rnatish · Sotuv #${installation.saleNumber} · ${productSummary(installation.productNames)}`,
      eventAmount: compensationAmount,
      ruleId: rule.id,
      ruleType: WorkerCompensationType.FIXED_PER_INSTALLATION,
      responsibility: fullRule.responsibility,
      ruleValue: rule.value,
      compensationAmount,
      referenceType: 'SALE',
      referenceId: installation.id,
      source: 'RULE',
    });
  }

  for (const manual of manuals) {
    if (manual.workerId !== options.worker.id) continue;

    const role = manual.role as SaleWorkerPayRole;
    const amount = fromDbMoney(manual.amount);
    const eventKind = manualEventKind(role);
    const ruleType = manualRuleType(role);
    const roleLabel = SALE_WORKER_PAY_ROLE_LABELS[role];

    pushLine(breakdown, {
      id: `${manual.saleId}:MANUAL:${role}`,
      eventDate: manual.saleDate.toISOString(),
      eventKind,
      description: `${roleLabel} · Sotuv #${manual.saleNumber} (qo'lda)`,
      eventAmount: amount,
      ruleId: 'MANUAL',
      ruleType,
      responsibility: SALE_WORKER_PAY_ROLE_RESPONSIBILITY[role],
      ruleValue: amount,
      compensationAmount: amount,
      referenceType: 'SALE',
      referenceId: manual.saleId,
      source: 'MANUAL',
    });

    if (eventKind === 'SALE') saleIds.add(manual.saleId);
    if (eventKind === 'ASSEMBLY') assemblyIds.add(manual.saleId);
    if (eventKind === 'DELIVERY') deliveryIds.add(manual.saleId);
  }

  breakdown.sort((a, b) => {
    const byDate = a.eventDate.localeCompare(b.eventDate);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  const totalCompensation = breakdown.reduce(
    (sum, line) => sum + line.compensationAmount,
    0,
  );

  return {
    worker: {
      id: options.worker.id,
      fullName: options.worker.fullName,
      isActive: options.worker.isActive,
    },
    period: options.period,
    summary: {
      saleEventCount: saleIds.size,
      assemblyEventCount: assemblyIds.size,
      deliveryEventCount: deliveryIds.size,
      installationEventCount: installationIds.size,
      applicableRuleCount: appliedRuleIds.size,
      totalCompensation,
      breakdownItemCount: breakdown.length,
    },
    breakdown,
    readOnly: true,
    disclaimer: WORKER_COMPENSATION_PREVIEW_DISCLAIMER,
  };
}

function manualEventKind(role: SaleWorkerPayRole): WorkerCompensationPreviewEventKind {
  if (role === SaleWorkerPayRole.SELLER) return 'SALE';
  if (role === SaleWorkerPayRole.ASSEMBLER) return 'ASSEMBLY';
  return 'DELIVERY';
}

function manualRuleType(role: SaleWorkerPayRole): WorkerCompensationType {
  if (role === SaleWorkerPayRole.SELLER) return WorkerCompensationType.FIXED_PER_SALE;
  if (role === SaleWorkerPayRole.ASSEMBLER) return WorkerCompensationType.FIXED_PER_ASSEMBLY;
  return WorkerCompensationType.FIXED_PER_DELIVERY;
}

async function resolvePreviewPeriod(
  storeId: string,
  from: string,
  to: string,
): Promise<{ dateFrom: Date; dateTo: Date; fromLabel: string; toLabel: string }> {
  if (from > to) {
    throw ApiError.validation('The start date must not be after the end date', [
      { field: 'from', message: 'The start date must not be after the end date' },
    ]);
  }

  const store = await workerCompensationRepository.findStoreTimezone(storeId);
  if (!store) {
    throw ApiError.notFound('Store not found');
  }

  const range = resolveDashboardRange(
    DateRangePreset.CUSTOM,
    { from, to },
    store.timezone,
  );

  return {
    dateFrom: range.from,
    dateTo: range.to,
    fromLabel: from,
    toLabel: to,
  };
}

/**
 * Read-only compensation preview for a worker and inclusive calendar range.
 * Loads rules + eligible events and calculates with calculateWorkerCompensation.
 * Never creates ledger, payroll, payment, or finance rows.
 */
export async function getCompensationPreview(
  storeId: string,
  actorRole: string,
  workerId: string,
  query: { from: string; to: string },
): Promise<WorkerCompensationPreview> {
  assertCanManageWorkerCompensation(actorRole);

  const worker = await workerCompensationRepository.findWorkerUserInStore(storeId, workerId);
  if (!worker || worker.role !== UserRole.EMPLOYEE) {
    throw ApiError.notFound('Worker not found');
  }

  const period = await resolvePreviewPeriod(storeId, query.from, query.to);

  const [rules, sales, assemblies, deliveries, installations, manuals] = await Promise.all([
    workerCompensationRepository.listRulesForWorker(storeId, workerId),
    workerCompensationRepository.listSellerSalesForPreview(
      storeId,
      workerId,
      period.dateFrom,
      period.dateTo,
    ),
    workerCompensationRepository.listAssembliesForPreview(
      storeId,
      workerId,
      period.dateFrom,
      period.dateTo,
    ),
    workerCompensationRepository.listDeliveriesForPreview(
      storeId,
      workerId,
      period.dateFrom,
      period.dateTo,
    ),
    workerCompensationRepository.listInstallationsForPreview(
      storeId,
      workerId,
      period.dateFrom,
      period.dateTo,
    ),
    workerCompensationRepository.listManualCompensationsForPreview(
      storeId,
      period.dateFrom,
      period.dateTo,
    ),
  ]);

  return buildCompensationPreview({
    worker: {
      id: worker.id,
      fullName: worker.fullName,
      isActive: worker.isActive,
    },
    period: { from: period.fromLabel, to: period.toLabel },
    rules,
    sales,
    assemblies,
    deliveries,
    installations,
    manuals,
  });
}

/**
 * Posts preview compensation lines as COMMISSION ledger rows.
 * Idempotent per breakdown line id (`COMPENSATION` reference).
 * Does not create PAYMENT / payroll rows.
 */
export async function settleCompensation(
  storeId: string,
  actor: { id: string; role: string },
  workerId: string,
  query: { from: string; to: string },
): Promise<SettleWorkerCompensationResult> {
  assertCanManageWorkerCompensation(actor.role);

  const preview = await getCompensationPreview(storeId, actor.role, workerId, query);
  const payable = preview.breakdown.filter((line) => line.compensationAmount > 0);

  if (payable.length === 0) {
    return {
      worker: preview.worker,
      period: preview.period,
      totalCompensation: preview.summary.totalCompensation,
      createdCount: 0,
      skippedAlreadySettled: 0,
      createdTransactionIds: [],
    };
  }

  const lineIds = payable.map((line) => line.id);
  const alreadyPosted = await workerFinancialRepository.findCompensationCommissionRefs(
    storeId,
    workerId,
    lineIds,
  );

  const toCreate = payable.filter((line) => !alreadyPosted.has(line.id));
  const skippedAlreadySettled = payable.length - toCreate.length;
  const createdTransactionIds: string[] = [];

  if (toCreate.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const line of toCreate) {
        const created = await workerFinancialRepository.createTransaction(
          {
            storeId,
            workerId,
            type: WorkerFinancialTransactionType.COMMISSION,
            amount: line.compensationAmount,
            transactionDate: new Date(line.eventDate),
            description: `Komissiya · ${line.description}`,
            referenceType: WorkerFinancialReferenceType.COMPENSATION,
            referenceId: line.id,
            createdById: actor.id,
          },
          tx,
        );
        createdTransactionIds.push(created.id);
      }
    });
  }

  const result = {
    worker: preview.worker,
    period: preview.period,
    totalCompensation: preview.summary.totalCompensation,
    createdCount: createdTransactionIds.length,
    skippedAlreadySettled,
    createdTransactionIds,
  };

  if (createdTransactionIds.length > 0) {
    await recordAudit({
      storeId,
      actorUserId: actor.id,
      eventType: AuditEventType.COMPENSATION_SETTLED,
      entityType: AuditEntityType.WORKER,
      entityId: workerId,
      summary: `Compensation settled for ${preview.worker.fullName} (${createdTransactionIds.length} rows)`,
      metadata: {
        from: query.from,
        to: query.to,
        createdCount: createdTransactionIds.length,
        skippedAlreadySettled,
      },
    });
  }

  return result;
}
