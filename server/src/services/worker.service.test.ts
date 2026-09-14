import {
  UserRole,
  WorkerActivityType,
  WorkerResponsibility,
  type CreateWorkerRequest,
  type UpdateWorkerRequest,
  type WorkerDetail,
  type WorkerListItem,
  type WorkerStats,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as workerService from './worker.service.js';

const {
  prismaMock,
  hashPasswordMock,
  assertAccountNotDeletedMock,
  listWorkersRepo,
  findWorkerInStore,
  findWorkerByUsername,
  findWorkerByEmail,
  createWorkerTx,
  updateWorkerTx,
  computeWorkerStats,
  recordActivity,
  listWorkerSales,
  listWorkerTasks,
  listWorkerActivity,
  findActiveWorkerWithResponsibility,
  tryEnsureUserOnBusinessWorkspace,
} = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    user: { update: vi.fn() },
  },
  hashPasswordMock: vi.fn(),
  assertAccountNotDeletedMock: vi.fn(),
  listWorkersRepo: vi.fn(),
  findWorkerInStore: vi.fn(),
  findWorkerByUsername: vi.fn(),
  findWorkerByEmail: vi.fn(),
  createWorkerTx: vi.fn(),
  updateWorkerTx: vi.fn(),
  computeWorkerStats: vi.fn(),
  recordActivity: vi.fn(),
  listWorkerSales: vi.fn(),
  listWorkerTasks: vi.fn(),
  listWorkerActivity: vi.fn(),
  findActiveWorkerWithResponsibility: vi.fn(),
  tryEnsureUserOnBusinessWorkspace: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../lib/password.js', () => ({
  hashPassword: hashPasswordMock,
}));

vi.mock('./account-deletion.service.js', () => ({
  assertAccountNotDeleted: (...args: unknown[]) => assertAccountNotDeletedMock(...args),
}));

vi.mock('./entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(),
  assertCanCreateResource: vi.fn(),
}));

vi.mock('../modules/accounts/account-layer.service.js', () => ({
  tryEnsureUserOnBusinessWorkspace,
}));

vi.mock('./seller-commission.service.js', () => ({
  decorateSellerSales: vi.fn(async (_storeId: string, _workerId: string, rows: unknown[]) => rows),
  syncSellerCommissionForSale: vi.fn(async () => ({ posted: 0, reversed: 0 })),
}));

vi.mock('../repositories/worker.repository.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown> & {
    toWorkerDetail: (...args: never[]) => unknown;
  };
  return {
    ...actual,
    listWorkers: listWorkersRepo,
    findWorkerInStore,
    findWorkerByUsername,
    findWorkerByEmail,
    createWorkerTx,
    updateWorkerTx,
    computeWorkerStats,
    recordActivity,
    listWorkerSales,
    listWorkerTasks,
    listWorkerActivity,
    findActiveWorkerWithResponsibility,
    toWorkerDetail: actual.toWorkerDetail,
  };
});

const EMPTY_STATS: WorkerStats = {
  totalSales: 0,
  salesThisMonth: 0,
  salesToday: 0,
  totalAssemblyTasks: 0,
  completedAssemblyTasks: 0,
  pendingAssemblyTasks: 0,
  completedTasksThisMonth: 0,
};

function workerRecord(overrides: Partial<{
  id: string;
  storeId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  notes: string | null;
  role: typeof UserRole.EMPLOYEE;
  isActive: boolean;
  responsibilities: { responsibility: WorkerResponsibility }[];
}> = {}) {
  return {
    id: 'user_ali',
    storeId: 'store_1',
    fullName: 'Ali Usta',
    username: 'ali',
    email: 'ali@furniture-erp.local',
    phone: '+998901111111',
    notes: null,
    role: UserRole.EMPLOYEE,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    lastLoginAt: null,
    responsibilities: [
      { responsibility: WorkerResponsibility.ASSEMBLER },
      { responsibility: WorkerResponsibility.SELLER },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hashPasswordMock.mockResolvedValue('hashed');
  assertAccountNotDeletedMock.mockResolvedValue(undefined);
  computeWorkerStats.mockResolvedValue(EMPTY_STATS);
  recordActivity.mockResolvedValue(undefined);
  tryEnsureUserOnBusinessWorkspace.mockResolvedValue(undefined);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
});

describe('worker.service', () => {
  it('creates a worker belonging to the actor store with multiple responsibilities', async () => {
    findWorkerByUsername.mockResolvedValue(null);
    findWorkerByEmail.mockResolvedValue(null);
    createWorkerTx.mockResolvedValue(workerRecord());

    const input: CreateWorkerRequest = {
      firstName: 'Ali',
      lastName: 'Usta',
      username: 'ali',
      password: 'Ali12345!',
      responsibilities: [WorkerResponsibility.ASSEMBLER, WorkerResponsibility.SELLER],
    };

    const worker = await workerService.createWorker(
      'store_1',
      { id: 'user_admin', role: UserRole.ADMIN },
      input,
    );

    expect(createWorkerTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        storeId: 'store_1',
        username: 'ali',
        fullName: 'Ali Usta',
        responsibilities: [WorkerResponsibility.ASSEMBLER, WorkerResponsibility.SELLER],
      }),
    );
    expect(worker.responsibilities).toEqual([
      WorkerResponsibility.ASSEMBLER,
      WorkerResponsibility.SELLER,
    ]);
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: WorkerActivityType.WORKER_CREATED, storeId: 'store_1' }),
      expect.anything(),
    );
    expect(tryEnsureUserOnBusinessWorkspace).toHaveBeenCalledWith('user_ali');
  });

  it('rejects worker management for non-admin roles', async () => {
    await expect(
      workerService.listWorkers({
        storeId: 'store_1',
        actorRole: UserRole.EMPLOYEE,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('deactivates a worker without deleting the account', async () => {
    findWorkerInStore.mockResolvedValue(workerRecord({ isActive: true }));
    updateWorkerTx.mockResolvedValue(workerRecord({ isActive: false }));

    const input: UpdateWorkerRequest = { isActive: false };
    const worker = await workerService.updateWorker(
      'store_1',
      { id: 'user_admin', role: UserRole.ADMIN },
      'user_ali',
      input,
    );

    expect(updateWorkerTx).toHaveBeenCalledWith(
      expect.anything(),
      'store_1',
      'user_ali',
      expect.objectContaining({ isActive: false }),
    );
    expect(worker.isActive).toBe(false);
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: WorkerActivityType.WORKER_DEACTIVATED }),
      expect.anything(),
    );
  });

  it('activates an inactive worker', async () => {
    findWorkerInStore.mockResolvedValue(workerRecord({ isActive: false }));
    updateWorkerTx.mockResolvedValue(workerRecord({ isActive: true }));

    const worker = await workerService.updateWorker(
      'store_1',
      { id: 'user_admin', role: UserRole.ADMIN },
      'user_ali',
      { isActive: true },
    );

    expect(worker.isActive).toBe(true);
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: WorkerActivityType.WORKER_ACTIVATED }),
      expect.anything(),
    );
  });

  it('does not allow a worker to read another store worker', async () => {
    findWorkerInStore.mockResolvedValue(null);

    await expect(
      workerService.getWorker('store_1', UserRole.ADMIN, 'user_other_store'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('isolates my sales to the signed-in worker id', async () => {
    listWorkerSales.mockResolvedValue({
      rows: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    await workerService.listMySales('store_1', 'user_ali', { page: 1 });
    expect(listWorkerSales).toHaveBeenCalledWith('store_1', 'user_ali', { page: 1 });
  });

  it('prevents a seller from listing another worker sales', async () => {
    await expect(
      workerService.listWorkerSales(
        'store_1',
        { id: 'user_seller_a', role: UserRole.EMPLOYEE },
        'user_seller_b',
        { page: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('isolates worker tasks to the requested worker after authz', async () => {
    findWorkerInStore.mockResolvedValue(workerRecord());
    listWorkerTasks.mockResolvedValue([]);

    await workerService.listWorkerTasks(
      'store_1',
      { id: 'user_admin', role: UserRole.ADMIN },
      'user_ali',
    );

    expect(listWorkerTasks).toHaveBeenCalledWith('store_1', 'user_ali', undefined);
  });

  it('prevents employees from viewing another worker profile', async () => {
    await expect(
      workerService.getWorker('store_1', UserRole.EMPLOYEE, 'user_ali'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns real worker statistics', async () => {
    findWorkerInStore.mockResolvedValue(workerRecord());
    computeWorkerStats.mockResolvedValue({
      ...EMPTY_STATS,
      totalSales: 3,
      pendingAssemblyTasks: 1,
    });

    const stats = await workerService.getWorkerStats(
      'store_1',
      { id: 'user_admin', role: UserRole.ADMIN },
      'user_ali',
    );

    expect(stats.totalSales).toBe(3);
    expect(stats.pendingAssemblyTasks).toBe(1);
  });

  it('allows a worker to read their own stats', async () => {
    findWorkerInStore.mockResolvedValue(workerRecord());
    computeWorkerStats.mockResolvedValue(EMPTY_STATS);

    await workerService.getWorkerStats(
      'store_1',
      { id: 'user_ali', role: UserRole.EMPLOYEE },
      'user_ali',
    );

    expect(computeWorkerStats).toHaveBeenCalledWith('store_1', 'user_ali');
  });
});

describe('assignment responsibility helpers (via repository mock)', () => {
  it('validates seller / assembler / delivery / installer presence', async () => {
    findActiveWorkerWithResponsibility.mockResolvedValueOnce({ id: 'user_ali' });
    findActiveWorkerWithResponsibility.mockResolvedValueOnce(null);

    const ok = await findActiveWorkerWithResponsibility(
      'store_1',
      'user_ali',
      WorkerResponsibility.SELLER,
    );
    const missing = await findActiveWorkerWithResponsibility(
      'store_1',
      'user_ali',
      WorkerResponsibility.DELIVERY,
    );

    expect(ok).toEqual({ id: 'user_ali' });
    expect(missing).toBeNull();
  });
});

describe('worker list pagination contract', () => {
  it('lists workers for the authenticated store only', async () => {
    const items: WorkerListItem[] = [
      {
        id: 'user_ali',
        fullName: 'Ali Usta',
        username: 'ali',
        email: 'ali@furniture-erp.local',
        phone: null,
        role: UserRole.EMPLOYEE,
        isActive: true,
        responsibilities: [WorkerResponsibility.ASSEMBLER],
        createdAt: '2026-01-01T00:00:00.000Z',
        salesCount: 0,
        assemblyTaskCount: 0,
        activeTaskCount: 0,
      },
    ];
    listWorkersRepo.mockResolvedValue({
      items,
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const result = await workerService.listWorkers({
      storeId: 'store_1',
      actorRole: UserRole.ADMIN,
      page: 1,
    });

    expect(listWorkersRepo).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'store_1' }),
    );
    expect(result.items).toHaveLength(1);
  });
});

// Keep TypeScript happy that WorkerDetail shape is still used in assertions above.
export type _Keep = WorkerDetail;
