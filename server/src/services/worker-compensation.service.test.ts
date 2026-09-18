import {
  SaleWorkerPayRole,
  UserRole,
  WorkerCompensationType,
  WorkerResponsibility,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repoMock, financeRepoMock, prismaMock } = vi.hoisted(() => ({
  repoMock: {
    findWorkerUserInStore: vi.fn(),
    findRuleInStoreForWorker: vi.fn(),
    listRulesForWorker: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    findPotentialOverlapRules: vi.fn(),
    countWorkerFinancialTransactions: vi.fn(),
    findStoreTimezone: vi.fn(),
    listSellerSalesForPreview: vi.fn(),
    listAssembliesForPreview: vi.fn(),
    listDeliveriesForPreview: vi.fn(),
    listInstallationsForPreview: vi.fn(),
    listManualCompensationsForPreview: vi.fn(),
    runInTransaction: vi.fn(),
  },
  financeRepoMock: {
    findCompensationCommissionRefs: vi.fn(),
    createTransaction: vi.fn(),
  },
  prismaMock: {
    $transaction: vi.fn(),
  },
}));

vi.mock('../repositories/worker-compensation.repository.js', () => repoMock);
vi.mock('../repositories/worker-financial.repository.js', () => financeRepoMock);
vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));
vi.mock('./audit.service.js', () => ({
  recordAudit: vi.fn(async () => undefined),
}));

const {
  buildCompensationPreview,
  createCompensationRule,
  getCompensationPreview,
  getCompensationRule,
  listCompensationRules,
  settleCompensation,
  updateCompensationRule,
} = await import('./worker-compensation.service.js');

const STORE_ID = 'store_1';
const OTHER_STORE = 'store_2';
const ADMIN_ID = 'user_admin';
const WORKER_ID = 'clxxxxxxxxxxxxxxxxworker';
const RULE_ID = 'clxxxxxxxxxxxxxxxxxrule';

const activeEmployee = {
  id: WORKER_ID,
  storeId: STORE_ID,
  role: UserRole.EMPLOYEE,
  isActive: true,
  fullName: 'Temp Worker',
  responsibilities: [
    { responsibility: WorkerResponsibility.SELLER },
    { responsibility: WorkerResponsibility.ASSEMBLER },
    { responsibility: WorkerResponsibility.DELIVERY },
    { responsibility: WorkerResponsibility.INSTALLER },
  ],
};

function makeRule(overrides: Record<string, unknown> = {}) {
  return {
    id: RULE_ID,
    workerId: WORKER_ID,
    responsibility: WorkerResponsibility.SELLER,
    type: WorkerCompensationType.PERCENT_OF_SALE,
    value: 1000,
    isActive: true,
    effectiveFrom: '2026-01-01T12:00:00.000Z',
    effectiveTo: '2026-06-30T12:00:00.000Z',
    notes: 'PHASE8_STEP4A_TEMP',
    worker: { id: WORKER_ID, fullName: 'Temp Worker', isActive: true },
    createdAt: '2026-08-09T00:00:00.000Z',
    updatedAt: '2026-08-09T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repoMock.runInTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({}),
  );
  repoMock.findPotentialOverlapRules.mockResolvedValue([]);
  repoMock.findWorkerUserInStore.mockResolvedValue(activeEmployee);
  repoMock.listManualCompensationsForPreview.mockResolvedValue([]);
  repoMock.createRule.mockImplementation(async (input: Record<string, unknown>) =>
    makeRule({
      responsibility: input.responsibility,
      type: input.type,
      value: input.value,
      isActive: input.isActive,
      effectiveFrom: (input.effectiveFrom as Date).toISOString(),
      effectiveTo: input.effectiveTo
        ? (input.effectiveTo as Date).toISOString()
        : null,
      notes: input.notes,
    }),
  );
  repoMock.updateRule.mockImplementation(async (_storeId, _ruleId, input) =>
    makeRule({
      value: input.value ?? 1000,
      isActive: input.isActive ?? true,
      notes: input.notes ?? 'PHASE8_STEP4A_TEMP',
    }),
  );
});

describe('worker-compensation.service', () => {
  it('creates a valid seller percent-of-sale rule', async () => {
    const rule = await createCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-06-30',
        notes: 'PHASE8_STEP4A_TEMP',
      },
    );

    expect(rule.type).toBe(WorkerCompensationType.PERCENT_OF_SALE);
    expect(rule.value).toBe(1000);
    expect(repoMock.createRule).toHaveBeenCalled();
  });

  it('creates a valid assembler fixed rule', async () => {
    const rule = await createCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      {
        responsibility: WorkerResponsibility.ASSEMBLER,
        type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
        value: 50_000,
        effectiveFrom: '2026-01-01',
      },
    );
    expect(rule.type).toBe(WorkerCompensationType.FIXED_PER_ASSEMBLY);
    expect(rule.value).toBe(50_000);
  });

  it('creates a valid delivery rule', async () => {
    const rule = await createCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      {
        responsibility: WorkerResponsibility.DELIVERY,
        type: WorkerCompensationType.FIXED_PER_DELIVERY,
        value: 30_000,
        effectiveFrom: '2026-01-01',
      },
    );
    expect(rule.type).toBe(WorkerCompensationType.FIXED_PER_DELIVERY);
  });

  it('creates a valid installer rule', async () => {
    const rule = await createCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      {
        responsibility: WorkerResponsibility.INSTALLER,
        type: WorkerCompensationType.FIXED_PER_INSTALLATION,
        value: 40_000,
        effectiveFrom: '2026-01-01',
      },
    );
    expect(rule.type).toBe(WorkerCompensationType.FIXED_PER_INSTALLATION);
  });

  it('rejects wrong responsibility for compensation type', async () => {
    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
        value: 50_000,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects when worker lacks the responsibility', async () => {
    repoMock.findWorkerUserInStore.mockResolvedValue({
      ...activeEmployee,
      responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
    });

    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.ASSEMBLER,
        type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
        value: 50_000,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects inactive worker', async () => {
    repoMock.findWorkerUserInStore.mockResolvedValue({ ...activeEmployee, isActive: false });

    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects non-employee accounts', async () => {
    repoMock.findWorkerUserInStore.mockResolvedValue({
      ...activeEmployee,
      role: UserRole.ADMIN,
    });

    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('forbids EMPLOYEE from creating', async () => {
    await expect(
      createCompensationRule(STORE_ID, { id: WORKER_ID, role: UserRole.EMPLOYEE }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns 404 for cross-store worker', async () => {
    repoMock.findWorkerUserInStore.mockResolvedValue(null);

    await expect(
      createCompensationRule(OTHER_STORE, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 404 for cross-store rule', async () => {
    repoMock.findRuleInStoreForWorker.mockResolvedValue(null);

    await expect(
      getCompensationRule(STORE_ID, UserRole.ADMIN, WORKER_ID, RULE_ID),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects overlapping rules', async () => {
    repoMock.findPotentialOverlapRules.mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxold1',
        effectiveFrom: new Date('2026-01-01T12:00:00.000Z'),
        effectiveTo: new Date('2026-08-31T12:00:00.000Z'),
      },
    ]);

    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1200,
        effectiveFrom: '2026-08-01',
        effectiveTo: '2026-12-31',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('allows adjacent non-overlapping rules', async () => {
    repoMock.findPotentialOverlapRules.mockResolvedValue([
      {
        id: 'clxxxxxxxxxxxxxxxxxold1',
        effectiveFrom: new Date('2026-01-01T12:00:00.000Z'),
        effectiveTo: new Date('2026-06-30T12:00:00.000Z'),
      },
    ]);

    const rule = await createCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1200,
        effectiveFrom: '2026-07-01',
      },
    );
    expect(rule.value).toBe(1200);
  });

  it('rejects effectiveTo before effectiveFrom', async () => {
    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 1000,
        effectiveFrom: '2026-08-01',
        effectiveTo: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects invalid percentage', async () => {
    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 0,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.SELLER,
        type: WorkerCompensationType.PERCENT_OF_SALE,
        value: 10_001,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects invalid fixed amount', async () => {
    await expect(
      createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
        responsibility: WorkerResponsibility.ASSEMBLER,
        type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
        value: 0,
        effectiveFrom: '2026-01-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('deactivates a rule via PATCH isActive=false', async () => {
    repoMock.findRuleInStoreForWorker.mockResolvedValue(makeRule());
    repoMock.updateRule.mockResolvedValue(makeRule({ isActive: false }));

    const rule = await updateCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      RULE_ID,
      { isActive: false },
    );
    expect(rule.isActive).toBe(false);
  });

  it('updates rule value and keeps historical rule readable', async () => {
    repoMock.findRuleInStoreForWorker.mockResolvedValue(makeRule({ isActive: false }));
    repoMock.listRulesForWorker.mockResolvedValue([makeRule({ isActive: false, value: 1500 })]);
    repoMock.updateRule.mockResolvedValue(makeRule({ isActive: false, value: 1500 }));

    const updated = await updateCompensationRule(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      RULE_ID,
      { value: 1500 },
    );
    expect(updated.value).toBe(1500);

    const items = await listCompensationRules(STORE_ID, UserRole.ADMIN, WORKER_ID);
    expect(items[0]?.isActive).toBe(false);
  });

  it('TEST 9: creating a compensation rule does not post commission or touch existing sales', async () => {
    await createCompensationRule(STORE_ID, { id: ADMIN_ID, role: UserRole.ADMIN }, WORKER_ID, {
      responsibility: WorkerResponsibility.SELLER,
      type: WorkerCompensationType.PERCENT_OF_SALE,
      value: 1000,
      effectiveFrom: '2026-01-01',
    });

    expect(repoMock.countWorkerFinancialTransactions).not.toHaveBeenCalled();
    expect(financeRepoMock.createTransaction).not.toHaveBeenCalled();
    expect(repoMock.createRule).toHaveBeenCalledTimes(1);
  });
});

describe('buildCompensationPreview / getCompensationPreview', () => {
  const saleDate = new Date('2026-08-05T09:00:00.000Z');

  function saleRule(overrides: Record<string, unknown> = {}) {
    return makeRule({
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveTo: null,
      ...overrides,
    });
  }

  beforeEach(() => {
    repoMock.findStoreTimezone.mockResolvedValue({ id: STORE_ID, timezone: 'Asia/Tashkent' });
    repoMock.listRulesForWorker.mockResolvedValue([saleRule()]);
    repoMock.listSellerSalesForPreview.mockResolvedValue([
      {
        id: 'sale_1',
        saleNumber: 42,
        saleDate,
        totalSalePrice: 5_000_000n,
        grossProfit: 1_000_000n,
        productNames: ['Divan'],
      },
    ]);
    repoMock.listAssembliesForPreview.mockResolvedValue([]);
    repoMock.listDeliveriesForPreview.mockResolvedValue([]);
    repoMock.listInstallationsForPreview.mockResolvedValue([]);
  });

  it('calculates percentage compensation with basis-point precision', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali Karimov', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [saleRule({ value: 1000 })],
      sales: [
        {
          id: 'sale_1',
          saleNumber: 1,
          saleDate,
          totalSalePrice: 5_000_000n,
          grossProfit: 1_000_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
    });

    expect(preview.readOnly).toBe(true);
    expect(preview.summary.totalCompensation).toBe(500_000);
    expect(preview.summary.saleEventCount).toBe(1);
    expect(preview.breakdown[0]?.compensationAmount).toBe(500_000);
  });

  it('PERCENT_OF_GROSS_PROFIT uses yalpi foyda, not net after usta/shopir fees', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Vali Sotuvchi', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [
        saleRule({
          type: WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
          value: 1500,
          effectiveTo: null,
        }),
      ],
      sales: [
        {
          id: 'sale_9m',
          saleNumber: 13,
          saleDate,
          totalSalePrice: 9_000_000n,
          grossProfit: 3_000_000n,
          netProfit: 2_520_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
    });

    expect(preview.breakdown).toHaveLength(1);
    expect(preview.breakdown[0]?.compensationAmount).toBe(450_000);
    expect(preview.breakdown[0]?.eventAmount).toBe(3_000_000);
    expect(preview.summary.totalCompensation).toBe(450_000);
  });

  it('keeps seller commission separate from assembly and delivery fees', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali Multi', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [
        saleRule({
          id: 'r_seller',
          type: WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
          value: 1500,
          responsibility: WorkerResponsibility.SELLER,
          effectiveTo: null,
        }),
        saleRule({
          id: 'r_asm',
          type: WorkerCompensationType.FIXED_PER_ASSEMBLY,
          value: 300_000,
          responsibility: WorkerResponsibility.ASSEMBLER,
          effectiveTo: null,
        }),
        saleRule({
          id: 'r_del',
          type: WorkerCompensationType.FIXED_PER_DELIVERY,
          value: 180_000,
          responsibility: WorkerResponsibility.DELIVERY,
          effectiveTo: null,
        }),
      ],
      sales: [
        {
          id: 'sale_multi',
          saleNumber: 13,
          saleDate,
          totalSalePrice: 9_000_000n,
          grossProfit: 3_000_000n,
          netProfit: 2_070_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [
        {
          id: 'asm_1',
          saleId: 'sale_multi',
          completedAt: saleDate,
          saleNumber: 13,
          productNames: ['Divan'],
          installationCost: 300_000n,
        },
      ],
      deliveries: [
        {
          id: 'sale_multi',
          saleNumber: 13,
          deliveryDate: saleDate,
          productNames: ['Divan'],
          deliveryCost: 180_000n,
        },
      ],
      installations: [],
    });

    const sellerLine = preview.breakdown.find(
      (line) => line.ruleType === WorkerCompensationType.PERCENT_OF_GROSS_PROFIT,
    );
    expect(sellerLine?.compensationAmount).toBe(450_000);
    expect(
      preview.breakdown.some(
        (line) => line.ruleType === WorkerCompensationType.FIXED_PER_ASSEMBLY,
      ),
    ).toBe(false);
    expect(
      preview.breakdown.some(
        (line) => line.ruleType === WorkerCompensationType.FIXED_PER_DELIVERY,
      ),
    ).toBe(false);
    expect(preview.summary.totalCompensation).toBe(450_000);
  });

  it('applies historical rules by effective date window', () => {
    const oldRule = saleRule({
      id: 'rule_old',
      value: 1000,
      effectiveFrom: '2026-01-01T00:00:00.000Z',
      effectiveTo: '2026-06-30T23:59:59.000Z',
      isActive: false,
    });
    const newRule = saleRule({
      id: 'rule_new',
      value: 1200,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
      effectiveTo: null,
    });

    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [oldRule, newRule],
      sales: [
        {
          id: 'sale_aug',
          saleNumber: 2,
          saleDate: new Date('2026-08-10T12:00:00.000Z'),
          totalSalePrice: 3_000_000n,
          grossProfit: 500_000n,
          productNames: ['Stol'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
    });

    expect(preview.breakdown).toHaveLength(1);
    expect(preview.breakdown[0]?.ruleId).toBe('rule_new');
    expect(preview.breakdown[0]?.compensationAmount).toBe(360_000);
  });

  it('supports multiple rule types on one sale', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [
        saleRule({ id: 'r_pct', type: WorkerCompensationType.PERCENT_OF_SALE, value: 1000 }),
        saleRule({
          id: 'r_fixed',
          type: WorkerCompensationType.FIXED_PER_SALE,
          value: 50_000,
        }),
      ],
      sales: [
        {
          id: 'sale_1',
          saleNumber: 1,
          saleDate,
          totalSalePrice: 5_000_000n,
          grossProfit: 1_000_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
    });

    expect(preview.summary.applicableRuleCount).toBe(2);
    expect(preview.summary.saleEventCount).toBe(1);
    expect(preview.summary.totalCompensation).toBe(550_000);
  });

  it('returns empty zero preview when no matching events', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [saleRule()],
      sales: [],
      assemblies: [],
      deliveries: [],
      installations: [],
    });

    expect(preview.summary.totalCompensation).toBe(0);
    expect(preview.breakdown).toHaveLength(0);
    expect(preview.disclaimer).toContain('hisob-kitob');
  });

  it('returns zero when no rule covers the event date', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [
        saleRule({
          effectiveFrom: '2026-01-01T00:00:00.000Z',
          effectiveTo: '2026-06-30T00:00:00.000Z',
        }),
      ],
      sales: [
        {
          id: 'sale_1',
          saleNumber: 1,
          saleDate,
          totalSalePrice: 5_000_000n,
          grossProfit: 1_000_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
    });

    expect(preview.summary.totalCompensation).toBe(0);
    expect(preview.breakdown).toHaveLength(0);
  });

  it('loads preview via getCompensationPreview without mutations', async () => {
    const preview = await getCompensationPreview(STORE_ID, UserRole.ADMIN, WORKER_ID, {
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(preview.summary.totalCompensation).toBe(500_000);
    expect(repoMock.createRule).not.toHaveBeenCalled();
    expect(repoMock.updateRule).not.toHaveBeenCalled();
    expect(repoMock.runInTransaction).not.toHaveBeenCalled();
    expect(repoMock.listSellerSalesForPreview).toHaveBeenCalledWith(
      STORE_ID,
      WORKER_ID,
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('rejects invalid date order', async () => {
    await expect(
      getCompensationPreview(STORE_ID, UserRole.ADMIN, WORKER_ID, {
        from: '2026-08-31',
        to: '2026-08-01',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('forbids employees from preview', async () => {
    await expect(
      getCompensationPreview(STORE_ID, UserRole.EMPLOYEE, WORKER_ID, {
        from: '2026-08-01',
        to: '2026-08-31',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns 404 for worker in another store', async () => {
    repoMock.findWorkerUserInStore.mockResolvedValue(null);
    await expect(
      getCompensationPreview(OTHER_STORE, UserRole.ADMIN, WORKER_ID, {
        from: '2026-08-01',
        to: '2026-08-31',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('includes FIXED_PER_DELIVERY lines for completed deliveries', () => {
    const deliveryDate = new Date('2026-08-12T10:00:00.000Z');
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Courier', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [
        saleRule({
          id: 'rule_delivery',
          responsibility: WorkerResponsibility.DELIVERY,
          type: WorkerCompensationType.FIXED_PER_DELIVERY,
          value: 30_000,
        }),
      ],
      sales: [],
      assemblies: [],
      deliveries: [
        {
          id: 'sale_d1',
          saleNumber: 7,
          deliveryDate,
          productNames: ['Shkaf'],
        },
      ],
      installations: [],
    });

    expect(preview.summary.totalCompensation).toBe(30_000);
    expect(preview.summary.deliveryEventCount).toBe(1);
    expect(preview.breakdown[0]).toMatchObject({
      ruleType: WorkerCompensationType.FIXED_PER_DELIVERY,
      compensationAmount: 30_000,
      referenceId: 'sale_d1',
    });
  });

  it('loads deliveries via repository for getCompensationPreview', async () => {
    repoMock.listRulesForWorker.mockResolvedValue([
      saleRule({
        id: 'rule_delivery',
        responsibility: WorkerResponsibility.DELIVERY,
        type: WorkerCompensationType.FIXED_PER_DELIVERY,
        value: 25_000,
      }),
    ]);
    repoMock.listSellerSalesForPreview.mockResolvedValue([]);
    repoMock.listDeliveriesForPreview.mockResolvedValue([
      {
        id: 'sale_d2',
        saleNumber: 9,
        deliveryDate: saleDate,
        productNames: ['Kreslo'],
      },
    ]);

    const preview = await getCompensationPreview(STORE_ID, UserRole.ADMIN, WORKER_ID, {
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(preview.summary.totalCompensation).toBe(25_000);
    expect(repoMock.listDeliveriesForPreview).toHaveBeenCalledWith(
      STORE_ID,
      WORKER_ID,
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('MANUAL seller overrides percent RULE for that sale', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [saleRule({ value: 1000 })],
      sales: [
        {
          id: 'sale_1',
          saleNumber: 1,
          saleDate,
          totalSalePrice: 5_000_000n,
          grossProfit: 1_000_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
      manuals: [
        {
          id: 'swc_1',
          saleId: 'sale_1',
          saleNumber: 1,
          saleDate,
          workerId: WORKER_ID,
          role: SaleWorkerPayRole.SELLER,
          amount: 200_000n,
        },
      ],
    });

    expect(preview.breakdown).toHaveLength(1);
    expect(preview.breakdown[0]).toMatchObject({
      id: 'sale_1:MANUAL:SELLER',
      source: 'MANUAL',
      compensationAmount: 200_000,
      eventKind: 'SALE',
    });
    expect(preview.summary.totalCompensation).toBe(200_000);
  });

  it('applies percent RULE when no MANUAL seller row exists', () => {
    const preview = buildCompensationPreview({
      worker: { id: WORKER_ID, fullName: 'Ali', isActive: true },
      period: { from: '2026-08-01', to: '2026-08-31' },
      rules: [saleRule({ value: 1000 })],
      sales: [
        {
          id: 'sale_1',
          saleNumber: 1,
          saleDate,
          totalSalePrice: 5_000_000n,
          grossProfit: 1_000_000n,
          productNames: ['Divan'],
        },
      ],
      assemblies: [],
      deliveries: [],
      installations: [],
      manuals: [],
    });

    expect(preview.breakdown[0]?.source).toBe('RULE');
    expect(preview.summary.totalCompensation).toBe(500_000);
  });

  it('excludes MANUAL rows that belong to cancelled sales (repo filter)', async () => {
    // Repository must not return cancelled-sale manuals; service trusts that filter.
    repoMock.listManualCompensationsForPreview.mockResolvedValue([]);
    repoMock.listSellerSalesForPreview.mockResolvedValue([]);

    const preview = await getCompensationPreview(STORE_ID, UserRole.ADMIN, WORKER_ID, {
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(preview.breakdown).toHaveLength(0);
    expect(repoMock.listManualCompensationsForPreview).toHaveBeenCalled();
  });

  it('does not include cancelled seller sales in active compensation preview', async () => {
    // listSellerSalesForPreview filters status: { not: 'CANCELLED' }; cancelled
    // sale fees stay in history but never enter this active query result.
    repoMock.listSellerSalesForPreview.mockResolvedValue([]);
    repoMock.listManualCompensationsForPreview.mockResolvedValue([]);

    const preview = await getCompensationPreview(STORE_ID, UserRole.ADMIN, WORKER_ID, {
      from: '2026-08-01',
      to: '2026-08-31',
    });

    expect(preview.breakdown).toHaveLength(0);
    expect(repoMock.listSellerSalesForPreview).toHaveBeenCalledWith(
      STORE_ID,
      WORKER_ID,
      expect.any(Date),
      expect.any(Date),
    );
  });
});

describe('settleCompensation', () => {
  const saleDate = new Date('2026-08-05T09:00:00.000Z');

  beforeEach(() => {
    repoMock.findStoreTimezone.mockResolvedValue({ id: STORE_ID, timezone: 'Asia/Tashkent' });
    repoMock.listRulesForWorker.mockResolvedValue([
      makeRule({
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveTo: null,
      }),
    ]);
    repoMock.listSellerSalesForPreview.mockResolvedValue([
      {
        id: 'sale_1',
        saleNumber: 42,
        saleDate,
        totalSalePrice: 5_000_000n,
        grossProfit: 1_000_000n,
        productNames: ['Divan'],
      },
    ]);
    repoMock.listAssembliesForPreview.mockResolvedValue([]);
    repoMock.listDeliveriesForPreview.mockResolvedValue([]);
    repoMock.listInstallationsForPreview.mockResolvedValue([]);
    financeRepoMock.findCompensationCommissionRefs.mockResolvedValue(new Set());
    financeRepoMock.createTransaction.mockImplementation(async (input: { referenceId: string }) => ({
      id: `tx_${input.referenceId}`,
    }));
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({}),
    );
  });

  it('posts COMMISSION rows for unsettled preview lines', async () => {
    const result = await settleCompensation(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );

    expect(result.createdCount).toBe(1);
    expect(result.skippedAlreadySettled).toBe(0);
    expect(result.totalCompensation).toBe(500_000);
    expect(financeRepoMock.createTransaction).toHaveBeenCalledTimes(1);
    expect(financeRepoMock.createTransaction.mock.calls[0]![0]).toMatchObject({
      type: 'COMMISSION',
      referenceType: 'COMPENSATION',
      referenceId: 'sale_1:PERCENT_OF_SALE',
      amount: 500_000,
      createdById: ADMIN_ID,
    });
  });

  it('skips already settled breakdown lines on second settle', async () => {
    financeRepoMock.findCompensationCommissionRefs.mockResolvedValue(
      new Set(['sale_1:PERCENT_OF_SALE']),
    );

    const result = await settleCompensation(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );

    expect(result.createdCount).toBe(0);
    expect(result.skippedAlreadySettled).toBe(1);
    expect(financeRepoMock.createTransaction).not.toHaveBeenCalled();
  });

  it('forbids employees from settle', async () => {
    await expect(
      settleCompensation(
        STORE_ID,
        { id: 'emp', role: UserRole.EMPLOYEE },
        WORKER_ID,
        { from: '2026-08-01', to: '2026-08-31' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('settles FIXED_PER_DELIVERY lines with idempotent commission refs', async () => {
    repoMock.listRulesForWorker.mockResolvedValue([
      makeRule({
        id: 'rule_delivery',
        responsibility: WorkerResponsibility.DELIVERY,
        type: WorkerCompensationType.FIXED_PER_DELIVERY,
        value: 30_000,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveTo: null,
      }),
    ]);
    repoMock.listSellerSalesForPreview.mockResolvedValue([]);
    repoMock.listDeliveriesForPreview.mockResolvedValue([
      {
        id: 'sale_d1',
        saleNumber: 7,
        deliveryDate: saleDate,
        productNames: ['Shkaf'],
      },
    ]);

    const result = await settleCompensation(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );

    expect(result.createdCount).toBe(1);
    expect(financeRepoMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceId: 'sale_d1:FIXED_PER_DELIVERY',
        amount: 30_000,
      }),
      expect.anything(),
    );

    financeRepoMock.findCompensationCommissionRefs.mockResolvedValue(
      new Set(['sale_d1:FIXED_PER_DELIVERY']),
    );
    financeRepoMock.createTransaction.mockClear();

    const second = await settleCompensation(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );

    expect(second.createdCount).toBe(0);
    expect(second.skippedAlreadySettled).toBe(1);
    expect(financeRepoMock.createTransaction).not.toHaveBeenCalled();
  });

  it('settles MANUAL line ids idempotently', async () => {
    repoMock.listRulesForWorker.mockResolvedValue([]);
    repoMock.listSellerSalesForPreview.mockResolvedValue([]);
    repoMock.listManualCompensationsForPreview.mockResolvedValue([
      {
        id: 'swc_m',
        saleId: 'sale_1',
        saleNumber: 42,
        saleDate,
        workerId: WORKER_ID,
        role: SaleWorkerPayRole.SELLER,
        amount: 120_000n,
      },
    ]);

    const result = await settleCompensation(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );

    expect(result.createdCount).toBe(1);
    expect(financeRepoMock.createTransaction.mock.calls[0]![0]).toMatchObject({
      referenceId: 'sale_1:MANUAL:SELLER',
      amount: 120_000,
    });

    financeRepoMock.findCompensationCommissionRefs.mockResolvedValue(
      new Set(['sale_1:MANUAL:SELLER']),
    );
    financeRepoMock.createTransaction.mockClear();

    const second = await settleCompensation(
      STORE_ID,
      { id: ADMIN_ID, role: UserRole.ADMIN },
      WORKER_ID,
      { from: '2026-08-01', to: '2026-08-31' },
    );

    expect(second.createdCount).toBe(0);
    expect(second.skippedAlreadySettled).toBe(1);
    expect(financeRepoMock.createTransaction).not.toHaveBeenCalled();
  });
});
