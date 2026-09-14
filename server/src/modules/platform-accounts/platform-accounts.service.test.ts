import {
  BusinessType,
  PlatformAccountDisplayStatus,
  PlatformAccountSource,
  StoreAccessStatus,
  StoreCreationRequestStatus,
  SubscriptionStatus,
  UserRole,
  WorkspaceStatus,
  WorkspaceType,
} from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../utils/api-error.js';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    storeCreationRequest: { findMany: vi.fn(), findUnique: vi.fn() },
    workspace: { findMany: vi.fn(), findUnique: vi.fn() },
    platformInvoice: { findMany: vi.fn() },
  },
}));

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../services/platform-billing.service.js', () => ({
  invoiceInclude: {},
  toInvoiceDto: (row: { id: string }) => ({ id: row.id }),
}));

const { listPlatformAccounts, getPlatformAccount } = await import('./platform-accounts.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listPlatformAccounts', () => {
  it('forbids store ADMIN', async () => {
    await expect(listPlatformAccounts(UserRole.ADMIN)).rejects.toBeInstanceOf(ApiError);
  });

  it('unions pending requests, personal workspaces and furniture stores', async () => {
    prismaMock.storeCreationRequest.findMany.mockResolvedValue([
      {
        id: 'req_1',
        storeName: 'Yangi Mebel',
        applicantFirstName: 'Azizbek',
        applicantLastName: 'Karimov',
        email: 'aziz@example.com',
        createdAt: new Date('2026-09-14T00:00:00.000Z'),
      },
    ]);
    prismaMock.workspace.findMany.mockImplementation(async ({ where }: { where: { type: string } }) => {
      if (where.type === WorkspaceType.PERSONAL) {
        return [
          {
            id: 'ws_p',
            type: WorkspaceType.PERSONAL,
            name: 'Shaxsiy moliya',
            status: WorkspaceStatus.ACTIVE,
            createdAt: new Date('2026-09-13T00:00:00.000Z'),
            memberships: [
              { identity: { fullName: 'Amirxon', email: 'amir@example.com' } },
            ],
            personalSubscription: {
              planKey: 'PERSONAL_PAID',
              status: SubscriptionStatus.ACTIVE,
              startedAt: new Date('2026-09-01T00:00:00.000Z'),
              trialEndsAt: null,
              currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
            },
          },
        ];
      }
      return [
        {
          id: 'ws_b',
          type: WorkspaceType.BUSINESS,
          name: 'Fayz Mebel',
          status: WorkspaceStatus.ACTIVE,
          createdAt: new Date('2026-09-12T00:00:00.000Z'),
          store: {
            id: 'store_1',
            name: 'Fayz Mebel',
            businessType: BusinessType.FURNITURE,
            accessStatus: StoreAccessStatus.ACTIVE,
            subscriptions: [
              {
                status: SubscriptionStatus.ACTIVE,
                startedAt: new Date('2026-08-01T00:00:00.000Z'),
                trialEndsAt: null,
                currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
                plan: { name: 'PRO' },
              },
            ],
            users: [{ fullName: 'Azizbek', email: 'aziz@store.uz' }],
          },
          memberships: [],
        },
      ];
    });

    const result = await listPlatformAccounts(UserRole.PLATFORM_ADMIN);

    expect(result.items.map((row) => row.name)).toEqual([
      'Yangi Mebel',
      'Shaxsiy moliya',
      'Fayz Mebel',
    ]);
    expect(result.items[0]?.status).toBe(PlatformAccountDisplayStatus.PENDING);
    expect(result.items[0]?.source).toBe(PlatformAccountSource.PENDING_REQUEST);
    expect(result.items[1]?.accountType).toBe(WorkspaceType.PERSONAL);
    expect(result.items[1]?.businessType).toBeNull();
    expect(result.items[1]?.planName).toBe('Pullik');
    expect(result.items[2]?.businessType).toBe(BusinessType.FURNITURE);
    expect(result.items[2]?.planName).toBe('PRO');
    expect(result.businessTypes).toEqual([BusinessType.FURNITURE]);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.active).toBe(2);
    expect(result.items.some((row) => row.name === 'Gilam')).toBe(false);
  });

  it('filters business rows by catalog type without mixing personal ledgers', async () => {
    prismaMock.storeCreationRequest.findMany.mockResolvedValue([]);
    prismaMock.workspace.findMany.mockImplementation(async ({ where }: { where: { type: string } }) => {
      if (where.type === WorkspaceType.PERSONAL) return [];
      return [
        {
          id: 'ws_f',
          type: WorkspaceType.BUSINESS,
          name: 'Fayz Mebel',
          status: WorkspaceStatus.ACTIVE,
          createdAt: new Date('2026-09-12T00:00:00.000Z'),
          store: {
            id: 'store_1',
            name: 'Fayz Mebel',
            businessType: BusinessType.FURNITURE,
            accessStatus: StoreAccessStatus.ACTIVE,
            subscriptions: [],
            users: [{ fullName: 'Azizbek', email: 'aziz@store.uz' }],
          },
          memberships: [],
        },
        {
          id: 'ws_c',
          type: WorkspaceType.BUSINESS,
          name: 'Gilam Savdo',
          status: WorkspaceStatus.ACTIVE,
          createdAt: new Date('2026-09-11T00:00:00.000Z'),
          store: {
            id: 'store_2',
            name: 'Gilam Savdo',
            businessType: BusinessType.CARPET,
            accessStatus: StoreAccessStatus.ACTIVE,
            subscriptions: [],
            users: [{ fullName: 'Dilshod', email: 'dil@store.uz' }],
          },
          memberships: [],
        },
      ];
    });

    const result = await listPlatformAccounts(UserRole.PLATFORM_ADMIN, {
      accountType: WorkspaceType.BUSINESS,
      businessType: BusinessType.CARPET,
    });
    expect(result.items.map((row) => row.name)).toEqual(['Gilam Savdo']);
    expect(result.items[0]?.businessType).toBe(BusinessType.CARPET);
  });

  it('does not query personal entry amounts', async () => {
    prismaMock.storeCreationRequest.findMany.mockResolvedValue([]);
    prismaMock.workspace.findMany.mockResolvedValue([]);
    await listPlatformAccounts(UserRole.PLATFORM_ADMIN, { accountType: WorkspaceType.PERSONAL });
    expect(prismaMock.storeCreationRequest.findMany).not.toHaveBeenCalled();
  });
});

describe('getPlatformAccount', () => {
  it('returns a personal workspace without mixing ledger payments', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'ws_p',
      type: WorkspaceType.PERSONAL,
      name: 'Shaxsiy moliya',
      status: WorkspaceStatus.ACTIVE,
      createdAt: new Date('2026-09-13T00:00:00.000Z'),
      memberships: [{ identity: { fullName: 'Amirxon', email: 'amir@example.com' } }],
      personalSubscription: {
        planKey: 'PERSONAL_PAID',
        status: SubscriptionStatus.ACTIVE,
        startedAt: new Date('2026-09-01T00:00:00.000Z'),
        trialEndsAt: null,
        currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z'),
      },
      store: null,
    });

    const detail = await getPlatformAccount(UserRole.PLATFORM_ADMIN, 'ws_p');
    expect(detail.account.accountType).toBe(WorkspaceType.PERSONAL);
    expect(detail.payments).toEqual([]);
    expect(prismaMock.platformInvoice.findMany).not.toHaveBeenCalled();
  });

  it('returns a pending request without creating a workspace', async () => {
    prismaMock.storeCreationRequest.findUnique.mockResolvedValue({
      id: 'req_1',
      storeName: 'Yangi Mebel',
      applicantFirstName: 'Azizbek',
      applicantLastName: 'Karimov',
      email: 'aziz@example.com',
      createdAt: new Date('2026-09-14T00:00:00.000Z'),
      status: StoreCreationRequestStatus.PENDING,
    });

    const detail = await getPlatformAccount(UserRole.PLATFORM_ADMIN, 'pending:req_1');
    expect(detail.account.status).toBe(PlatformAccountDisplayStatus.PENDING);
    expect(detail.payments).toEqual([]);
    expect(detail.subscription).toBeNull();
  });
});
