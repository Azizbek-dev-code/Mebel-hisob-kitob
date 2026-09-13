import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { BACKUP_DELETE_ORDER, BACKUP_MODELS } from './models.js';

/** Models that carry a `storeId` but are deliberately not part of an export. */
const INTENTIONALLY_EXCLUDED = new Set([
  'BackupJob',
  'AuditLog',
  'AccountDeletion',
  'StoreSubscription',
  'PlatformInvoice',
  'SubscriptionRequest',
]);

function delegateName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

describe('backup model list', () => {
  it('covers every store-scoped model in the schema', () => {
    const storeScoped = Prisma.dmmf.datamodel.models
      .filter((model) => model.fields.some((field) => field.name === 'storeId'))
      .filter((model) => !INTENTIONALLY_EXCLUDED.has(model.name))
      .map((model) => delegateName(model.name));

    const covered = new Set(BACKUP_MODELS.map((model) => model.delegate));
    const missing = storeScoped.filter((name) => !covered.has(name));

    // A store-scoped model absent from BACKUP_MODELS is silently dropped from
    // every backup, so this failing means data loss, not a stale test.
    expect(missing).toEqual([]);
  });

  it('names delegates that exist on the generated client', () => {
    const known = new Set(Prisma.dmmf.datamodel.models.map((model) => delegateName(model.name)));
    for (const model of BACKUP_MODELS) {
      expect(known.has(model.delegate), `unknown delegate ${model.delegate}`).toBe(true);
    }
  });

  it('never exports the backup catalogue itself', () => {
    expect(BACKUP_MODELS.some((model) => model.delegate === 'backupJob')).toBe(false);
  });

  it('never exports or purges the audit trail', () => {
    // A restore deletes everything in this list. Including the trail would make
    // "restore an old backup" a way to erase the record of what you did.
    expect(BACKUP_MODELS.some((model) => model.delegate === 'auditLog')).toBe(false);
    expect(BACKUP_DELETE_ORDER.some((model) => model.delegate === 'auditLog')).toBe(false);
  });

  it('uses unique collection keys', () => {
    const keys = BACKUP_MODELS.map((model) => model.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('deletes in the exact reverse of the insert order', () => {
    expect(BACKUP_DELETE_ORDER.map((model) => model.key)).toEqual(
      [...BACKUP_MODELS].reverse().map((model) => model.key),
    );
  });

  it('inserts parents before the children that reference them', () => {
    const position = new Map(BACKUP_MODELS.map((model, index) => [model.delegate, index]));

    // Relations Postgres enforces on insert: the referenced row must already
    // exist. Listed explicitly rather than derived, so a schema change that
    // reorders the list has to be justified against the actual foreign keys.
    const mustPrecede: [string, string][] = [
      ['user', 'userResponsibility'],
      ['productCategory', 'product'],
      ['product', 'purchaseItem'],
      ['product', 'stockMovement'],
      ['supplier', 'purchase'],
      ['purchase', 'purchaseItem'],
      ['purchase', 'supplierPayment'],
      ['customer', 'sale'],
      ['sale', 'saleItem'],
      ['sale', 'saleWorkerCompensation'],
      ['user', 'saleWorkerCompensation'],
      ['sale', 'installmentPlan'],
      ['sale', 'assemblyTask'],
      ['installmentPlan', 'installmentPayment'],
      ['installmentPayment', 'payment'],
      ['expenseCategory', 'expense'],
      ['user', 'workerFinancialTransaction'],
      ['user', 'workerCompensationRule'],
      ['user', 'workerActivity'],
    ];

    for (const [parent, child] of mustPrecede) {
      expect(
        position.get(parent)!,
        `${parent} must be inserted before ${child}`,
      ).toBeLessThan(position.get(child)!);
    }
  });
});
