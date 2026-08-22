import { AuditEntityType, AuditEventType, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { prismaMock, recordAuditMock } = vi.hoisted(() => ({
  prismaMock: {
    expenseCategory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    expense: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  recordAuditMock: vi.fn().mockResolvedValue(undefined),
}));

// Exercise the real repository so store scoping in every `where` is covered.
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('./audit.service.js', () => ({
  recordAudit: recordAuditMock,
}));

vi.mock('./entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(),
  assertCanCreateResource: vi.fn(),
}));

const {
  cancelExpense,
  createExpense,
  getExpense,
  listExpenses,
  updateExpense,
} = await import('./expense.service.js');

const STORE_ID = 'store_1';
const OTHER_STORE = 'store_2';
const ADMIN_ID = 'user_admin';
const CATEGORY_ID = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';
const EXPENSE_ID = 'clyyyyyyyyyyyyyyyyyyyyyyyyy';

const ACTIVE_CATEGORY = {
  id: CATEGORY_ID,
  storeId: STORE_ID,
  name: 'Elektr',
  isActive: true,
};

function expenseRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPENSE_ID,
    storeId: STORE_ID,
    categoryId: CATEGORY_ID,
    amount: 500_000n,
    expenseDate: new Date('2026-08-09T12:00:00.000Z'),
    description: 'August electricity',
    createdById: ADMIN_ID,
    status: 'ACTIVE',
    cancelledAt: null,
    cancelledById: null,
    cancellationReason: null,
    createdAt: new Date('2026-08-09T12:05:00.000Z'),
    updatedAt: new Date('2026-08-09T12:05:00.000Z'),
    category: {
      id: CATEGORY_ID,
      name: 'Elektr',
      color: 'amber',
      isActive: true,
    },
    createdBy: { id: ADMIN_ID, fullName: 'Store Administrator' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('expense.service createExpense', () => {
  it('creates an expense for the session store', async () => {
    prismaMock.expenseCategory.findFirst.mockResolvedValue(ACTIVE_CATEGORY);
    prismaMock.expense.create.mockResolvedValue(expenseRecord());

    const expense = await createExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        categoryId: CATEGORY_ID,
        amount: 500_000,
        expenseDate: '2026-08-09',
        description: 'August electricity',
      },
    );

    expect(expense.id).toBe(EXPENSE_ID);
    expect(expense.amount).toBe(500_000);
    expect(expense.category.name).toBe('Elektr');
    expect(prismaMock.expenseCategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CATEGORY_ID, storeId: STORE_ID },
      }),
    );
    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: STORE_ID,
          categoryId: CATEGORY_ID,
          amount: 500_000n,
          createdById: ADMIN_ID,
          description: 'August electricity',
        }),
      }),
    );
    expect(recordAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: STORE_ID,
        actorUserId: ADMIN_ID,
        eventType: AuditEventType.EXPENSE_CREATED,
        entityType: AuditEntityType.EXPENSE,
        entityId: EXPENSE_ID,
      }),
    );
  });

  it('persists amount as BigInt so\'m, never a float', async () => {
    prismaMock.expenseCategory.findFirst.mockResolvedValue(ACTIVE_CATEGORY);
    prismaMock.expense.create.mockResolvedValue(expenseRecord({ amount: 1_250_000n }));

    await createExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        categoryId: CATEGORY_ID,
        amount: 1_250_000,
        expenseDate: '2026-08-09',
      },
    );

    const createArgs = prismaMock.expense.create.mock.calls[0]![0] as {
      data: { amount: bigint };
    };
    expect(typeof createArgs.data.amount).toBe('bigint');
    expect(createArgs.data.amount).toBe(1_250_000n);
  });

  it('rejects zero amount', async () => {
    await expect(
      createExpense(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        { categoryId: CATEGORY_ID, amount: 0, expenseDate: '2026-08-09' },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('rejects negative amount', async () => {
    await expect(
      createExpense(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        { categoryId: CATEGORY_ID, amount: -100, expenseDate: '2026-08-09' },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown category', async () => {
    prismaMock.expenseCategory.findFirst.mockResolvedValue(null);

    await expect(
      createExpense(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        { categoryId: CATEGORY_ID, amount: 100_000, expenseDate: '2026-08-09' },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('rejects a category that belongs to another store', async () => {
    // Repository scopes by session storeId — a foreign category is simply not found.
    prismaMock.expenseCategory.findFirst.mockResolvedValue(null);

    await expect(
      createExpense(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        {
          categoryId: 'clzzzzzzzzzzzzzzzzzzzzzzzzz',
          amount: 100_000,
          expenseDate: '2026-08-09',
        },
      ),
    ).rejects.toBeInstanceOf(ApiError);

    expect(prismaMock.expenseCategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clzzzzzzzzzzzzzzzzzzzzzzzzz', storeId: STORE_ID },
      }),
    );
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive category', async () => {
    prismaMock.expenseCategory.findFirst.mockResolvedValue({
      ...ACTIVE_CATEGORY,
      isActive: false,
    });

    await expect(
      createExpense(
        STORE_ID,
        { id: ADMIN_ID, role: UserRole.ADMIN },
        { categoryId: CATEGORY_ID, amount: 100_000, expenseDate: '2026-08-09' },
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });

  it('derives storeId from the session argument, not from client input', async () => {
    prismaMock.expenseCategory.findFirst.mockResolvedValue(ACTIVE_CATEGORY);
    prismaMock.expense.create.mockResolvedValue(expenseRecord());

    await createExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      {
        categoryId: CATEGORY_ID,
        amount: 50_000,
        expenseDate: '2026-08-09',
        // @ts-expect-error — clients may try to smuggle a storeId; it must be ignored.
        storeId: OTHER_STORE,
      },
    );

    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ storeId: STORE_ID }),
      }),
    );
    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ storeId: OTHER_STORE }),
      }),
    );
  });

  it('forbids EMPLOYEE from creating expenses', async () => {
    await expect(
      createExpense(
        STORE_ID,
        { id: 'user_ali', role: UserRole.EMPLOYEE },
        { categoryId: CATEGORY_ID, amount: 50_000, expenseDate: '2026-08-09' },
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(prismaMock.expenseCategory.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.expense.create).not.toHaveBeenCalled();
  });
});

describe('expense.service getExpense', () => {
  it('returns an expense scoped to the session store', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord());

    const expense = await getExpense(STORE_ID, UserRole.ADMIN, EXPENSE_ID);
    expect(expense.id).toBe(EXPENSE_ID);
    expect(prismaMock.expense.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID },
      }),
    );
  });

  it('cannot read a cross-store expense', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(null);

    await expect(getExpense(STORE_ID, UserRole.ADMIN, EXPENSE_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    expect(prismaMock.expense.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID },
      }),
    );
  });

  it('forbids EMPLOYEE from reading expenses', async () => {
    await expect(getExpense(STORE_ID, UserRole.EMPLOYEE, EXPENSE_ID)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
    expect(prismaMock.expense.findFirst).not.toHaveBeenCalled();
  });
});

describe('expense.service listExpenses', () => {
  it('lists expenses for the session store only', async () => {
    prismaMock.expense.findMany.mockResolvedValue([expenseRecord()]);
    prismaMock.expense.count.mockResolvedValue(1);

    const result = await listExpenses({ storeId: STORE_ID, actorRole: UserRole.ADMIN });

    expect(result.items).toHaveLength(1);
    expect(result.meta.totalItems).toBe(1);
    expect(prismaMock.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE_ID, status: 'ACTIVE' },
      }),
    );
  });
});

describe('expense.service updateExpense', () => {
  const OTHER_CATEGORY = 'claaaaaaaaaaaaaaaaaaaaaaaaa';

  it('updates amount as BigInt so\'m', async () => {
    prismaMock.expense.findFirst
      .mockResolvedValueOnce(expenseRecord())
      .mockResolvedValueOnce(expenseRecord({ amount: 750_000n }));
    prismaMock.expense.updateMany.mockResolvedValue({ count: 1 });

    const expense = await updateExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      EXPENSE_ID,
      { amount: 750_000 },
    );

    expect(expense.amount).toBe(750_000);
    expect(prismaMock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID, status: 'ACTIVE' },
        data: expect.objectContaining({ amount: 750_000n }),
      }),
    );
  });

  it('updates category when the category belongs to the store and is active', async () => {
    prismaMock.expense.findFirst
      .mockResolvedValueOnce(expenseRecord())
      .mockResolvedValueOnce(
        expenseRecord({
          categoryId: OTHER_CATEGORY,
          category: { id: OTHER_CATEGORY, name: 'Transport', color: 'blue', isActive: true },
        }),
      );
    prismaMock.expenseCategory.findFirst.mockResolvedValue({
      id: OTHER_CATEGORY,
      storeId: STORE_ID,
      name: 'Transport',
      isActive: true,
    });
    prismaMock.expense.updateMany.mockResolvedValue({ count: 1 });

    const expense = await updateExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      EXPENSE_ID,
      { categoryId: OTHER_CATEGORY },
    );

    expect(expense.category.id).toBe(OTHER_CATEGORY);
    expect(prismaMock.expenseCategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: OTHER_CATEGORY, storeId: STORE_ID },
      }),
    );
    expect(prismaMock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ categoryId: OTHER_CATEGORY }),
      }),
    );
  });

  it('updates expenseDate and description', async () => {
    prismaMock.expense.findFirst
      .mockResolvedValueOnce(expenseRecord())
      .mockResolvedValueOnce(
        expenseRecord({
          expenseDate: new Date('2026-08-15T12:00:00.000Z'),
          description: 'Updated note',
        }),
      );
    prismaMock.expense.updateMany.mockResolvedValue({ count: 1 });

    const expense = await updateExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      EXPENSE_ID,
      { expenseDate: '2026-08-15', description: 'Updated note' },
    );

    expect(expense.description).toBe('Updated note');
    expect(prismaMock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID, status: 'ACTIVE' },
        data: expect.objectContaining({
          expenseDate: expect.any(Date),
          description: 'Updated note',
        }),
      }),
    );
  });

  it('rejects zero amount', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord());

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, { amount: 0 }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('rejects negative amount', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord());

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        amount: -10_000,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown category', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord());
    prismaMock.expenseCategory.findFirst.mockResolvedValue(null);

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        categoryId: OTHER_CATEGORY,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a foreign-store category', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord());
    prismaMock.expenseCategory.findFirst.mockResolvedValue(null);

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        categoryId: OTHER_CATEGORY,
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(prismaMock.expenseCategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: OTHER_CATEGORY, storeId: STORE_ID },
      }),
    );
    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an inactive category', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord());
    prismaMock.expenseCategory.findFirst.mockResolvedValue({
      ...ACTIVE_CATEGORY,
      isActive: false,
    });

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        categoryId: CATEGORY_ID,
      }),
    ).rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown expense', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(null);

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        amount: 100_000,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('returns 404 for a cross-store expense', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(null);

    await expect(
      updateExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        amount: 100_000,
      }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    expect(prismaMock.expense.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID },
      }),
    );
  });

  it('forbids EMPLOYEE from updating expenses', async () => {
    await expect(
      updateExpense(STORE_ID, { id: 'user_ali', role: UserRole.EMPLOYEE }, EXPENSE_ID, {
        amount: 100_000,
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    expect(prismaMock.expense.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.expense.updateMany).not.toHaveBeenCalled();
  });

  it('ignores a smuggled storeId and never writes it', async () => {
    prismaMock.expense.findFirst
      .mockResolvedValueOnce(expenseRecord())
      .mockResolvedValueOnce(expenseRecord({ amount: 100_000n }));
    prismaMock.expense.updateMany.mockResolvedValue({ count: 1 });

    await updateExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      EXPENSE_ID,
      {
        amount: 100_000,
        // @ts-expect-error — clients may try to smuggle storeId
        storeId: OTHER_STORE,
        // @ts-expect-error — immutable field must not be applied
        createdById: 'user_attacker',
      },
    );

    expect(prismaMock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID, status: 'ACTIVE' },
        data: { amount: 100_000n },
      }),
    );
    const data = prismaMock.expense.updateMany.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty('storeId');
    expect(data).not.toHaveProperty('createdById');
    expect(data).not.toHaveProperty('id');
  });
});

describe('expense.service cancelExpense', () => {
  it('soft-cancels an expense scoped to the session store', async () => {
    prismaMock.expense.findFirst
      .mockResolvedValueOnce(expenseRecord())
      .mockResolvedValueOnce(
        expenseRecord({
          status: 'CANCELLED',
          cancellationReason: 'Entered twice',
          cancelledAt: new Date('2026-08-18T10:00:00.000Z'),
          cancelledById: ADMIN_ID,
        }),
      );
    prismaMock.expense.updateMany.mockResolvedValue({ count: 1 });

    const expense = await cancelExpense(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      EXPENSE_ID,
      { reason: 'Entered twice' },
    );

    expect(expense.status).toBe('CANCELLED');
    expect(prismaMock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EXPENSE_ID, storeId: STORE_ID, status: 'ACTIVE' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancellationReason: 'Entered twice',
          cancelledById: ADMIN_ID,
        }),
      }),
    );
  });

  it('returns 404 for an unknown expense', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(null);

    await expect(
      cancelExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        reason: 'Cleanup',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 409 when already cancelled', async () => {
    prismaMock.expense.findFirst.mockResolvedValue(expenseRecord({ status: 'CANCELLED' }));

    await expect(
      cancelExpense(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, EXPENSE_ID, {
        reason: 'Again',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('forbids EMPLOYEE from cancelling expenses', async () => {
    await expect(
      cancelExpense(STORE_ID, { id: 'emp', role: UserRole.EMPLOYEE }, EXPENSE_ID, {
        reason: 'Nope',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
