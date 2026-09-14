import {
  BusinessType,
  PERSONAL_PLAN_KEY,
  PlatformAccountDisplayStatus,
  PlatformAccountSource,
  StoreCreationRequestStatus,
  UserRole,
  WorkspaceMembershipRole,
  WorkspaceType,
  applicantFullName,
  platformAccountDisplayStatus,
  type PlatformAccountDetailResponse,
  type PlatformAccountListQuery,
  type PlatformAccountListResponse,
  type PlatformAccountRow,
  type PlatformAccountSummary,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../../lib/prisma.js';
import { invoiceInclude, toInvoiceDto } from '../../services/platform-billing.service.js';
import { assertCanReviewStoreCreationRequests } from '../../services/platform-authorization.js';
import { ApiError } from '../../utils/api-error.js';

const TENANT_STORE_WHERE = { users: { some: { role: UserRole.ADMIN } } } as const;

function personalPlanName(planKey: string | null | undefined): string | null {
  if (!planKey) return null;
  if (planKey === PERSONAL_PLAN_KEY.TRIAL) return 'Sinov';
  if (planKey === PERSONAL_PLAN_KEY.PAID) return 'Pullik';
  return planKey;
}

function emptySummary(): PlatformAccountSummary {
  return { total: 0, active: 0, trial: 0, pending: 0, expired: 0, blocked: 0, cancelled: 0 };
}

function tally(rows: PlatformAccountRow[]): PlatformAccountSummary {
  const summary = emptySummary();
  summary.total = rows.length;
  for (const row of rows) {
    if (row.status === PlatformAccountDisplayStatus.ACTIVE) summary.active += 1;
    else if (row.status === PlatformAccountDisplayStatus.TRIAL) summary.trial += 1;
    else if (row.status === PlatformAccountDisplayStatus.PENDING) summary.pending += 1;
    else if (row.status === PlatformAccountDisplayStatus.EXPIRED) summary.expired += 1;
    else if (row.status === PlatformAccountDisplayStatus.BLOCKED) summary.blocked += 1;
    else if (row.status === PlatformAccountDisplayStatus.CANCELLED) summary.cancelled += 1;
  }
  return summary;
}

function pendingRow(request: {
  id: string;
  storeName: string;
  applicantFirstName: string;
  applicantLastName: string;
  email: string;
  createdAt: Date;
  businessType?: BusinessType | null;
}): PlatformAccountRow {
  return {
    id: `pending:${request.id}`,
    source: PlatformAccountSource.PENDING_REQUEST,
    accountType: WorkspaceType.BUSINESS,
    businessType: request.businessType ?? BusinessType.FURNITURE,
    name: request.storeName,
    ownerName: applicantFullName(request.applicantFirstName, request.applicantLastName),
    ownerEmail: request.email,
    status: PlatformAccountDisplayStatus.PENDING,
    planName: null,
    createdAt: request.createdAt.toISOString(),
    workspaceId: null,
    storeId: null,
    requestId: request.id,
  };
}

export async function listPlatformAccounts(
  actorRole: string,
  query: PlatformAccountListQuery = {},
  db: PrismaClient = defaultPrisma,
): Promise<PlatformAccountListResponse> {
  assertCanReviewStoreCreationRequests(actorRole);

  const includePending = query.accountType !== WorkspaceType.PERSONAL;
  const includePersonal = query.accountType !== WorkspaceType.BUSINESS;
  const includeBusiness = query.accountType !== WorkspaceType.PERSONAL;

  const [pendingRequests, personalWorkspaces, businessWorkspaces] = await Promise.all([
    includePending
      ? db.storeCreationRequest.findMany({
          where: { status: StoreCreationRequestStatus.PENDING },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            storeName: true,
            applicantFirstName: true,
            applicantLastName: true,
            email: true,
            createdAt: true,
            businessType: true,
          },
        })
      : Promise.resolve([]),
    includePersonal
      ? db.workspace.findMany({
          where: { type: WorkspaceType.PERSONAL },
          orderBy: { createdAt: 'desc' },
          include: {
            memberships: {
              where: { role: WorkspaceMembershipRole.OWNER },
              take: 1,
              include: { identity: { select: { fullName: true, email: true } } },
            },
            personalSubscription: true,
          },
        })
      : Promise.resolve([]),
    includeBusiness
      ? db.workspace.findMany({
          where: { type: WorkspaceType.BUSINESS, store: TENANT_STORE_WHERE },
          orderBy: { createdAt: 'desc' },
          include: {
            store: {
              include: {
                subscriptions: {
                  where: { isCurrent: true },
                  include: { plan: true },
                  take: 1,
                },
                users: {
                  where: { role: UserRole.ADMIN },
                  take: 1,
                  select: { fullName: true, email: true },
                },
              },
            },
            memberships: {
              where: { role: WorkspaceMembershipRole.OWNER },
              take: 1,
              include: { identity: { select: { fullName: true, email: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const rows: PlatformAccountRow[] = [];

  if (includePending) {
    for (const request of pendingRequests) {
      rows.push(pendingRow(request));
    }
  }

  for (const workspace of personalWorkspaces) {
    const owner = workspace.memberships[0]?.identity;
    const sub = workspace.personalSubscription;
    rows.push({
      id: workspace.id,
      source: PlatformAccountSource.WORKSPACE,
      accountType: WorkspaceType.PERSONAL,
      businessType: null,
      name: workspace.name,
      ownerName: owner?.fullName ?? workspace.name,
      ownerEmail: owner?.email ?? null,
      status: platformAccountDisplayStatus({
        source: PlatformAccountSource.WORKSPACE,
        workspaceStatus: workspace.status,
        subscription: sub,
      }),
      planName: personalPlanName(sub?.planKey),
      createdAt: workspace.createdAt.toISOString(),
      workspaceId: workspace.id,
      storeId: null,
      requestId: null,
    });
  }

  for (const workspace of businessWorkspaces) {
    const store = workspace.store;
    if (!store) continue;
    if (query.businessType && store.businessType !== query.businessType) continue;
    const owner = workspace.memberships[0]?.identity ?? store.users[0];
    const sub = store.subscriptions[0];
    rows.push({
      id: workspace.id,
      source: PlatformAccountSource.WORKSPACE,
      accountType: WorkspaceType.BUSINESS,
      businessType: store.businessType as BusinessType,
      name: workspace.name || store.name,
      ownerName: owner?.fullName ?? store.name,
      ownerEmail: owner && 'email' in owner ? owner.email : null,
      status: platformAccountDisplayStatus({
        source: PlatformAccountSource.WORKSPACE,
        workspaceStatus: workspace.status,
        accessStatus: store.accessStatus,
        subscription: sub,
      }),
      planName: sub?.plan.name ?? null,
      createdAt: workspace.createdAt.toISOString(),
      workspaceId: workspace.id,
      storeId: store.id,
      requestId: null,
    });
  }

  const typeScoped = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const businessTypes = [
    ...new Set(
      typeScoped
        .map((row) => row.businessType)
        .filter((value): value is BusinessType => Boolean(value)),
    ),
  ];
  const items = query.status ? typeScoped.filter((row) => row.status === query.status) : typeScoped;
  const summary = tally(items);

  return { items, summary, businessTypes };
}

export async function getPlatformAccount(
  actorRole: string,
  id: string,
  db: PrismaClient = defaultPrisma,
): Promise<PlatformAccountDetailResponse> {
  assertCanReviewStoreCreationRequests(actorRole);

  const accountId = decodeURIComponent(id);
  if (accountId.startsWith('pending:')) {
    const requestId = accountId.slice('pending:'.length);
    const request = await db.storeCreationRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        storeName: true,
        applicantFirstName: true,
        applicantLastName: true,
        email: true,
        createdAt: true,
        status: true,
        businessType: true,
      },
    });
    if (!request || request.status !== StoreCreationRequestStatus.PENDING) {
      throw ApiError.notFound('Akkaunt topilmadi');
    }
    const account = pendingRow(request);
    return {
      account,
      subscription: null,
      payments: [],
      events: [{ label: 'Ariza yuborildi', at: account.createdAt }],
    };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: accountId },
    include: {
      store: {
        include: {
          subscriptions: { where: { isCurrent: true }, include: { plan: true }, take: 1 },
          users: {
            where: { role: UserRole.ADMIN },
            take: 1,
            select: { fullName: true, email: true },
          },
        },
      },
      memberships: {
        where: { role: WorkspaceMembershipRole.OWNER },
        take: 1,
        include: { identity: { select: { fullName: true, email: true } } },
      },
      personalSubscription: true,
    },
  });
  if (!workspace) throw ApiError.notFound('Akkaunt topilmadi');

  if (workspace.type === WorkspaceType.PERSONAL) {
    const owner = workspace.memberships[0]?.identity;
    const sub = workspace.personalSubscription;
    const status = platformAccountDisplayStatus({
      source: PlatformAccountSource.WORKSPACE,
      workspaceStatus: workspace.status,
      subscription: sub,
    });
    const account: PlatformAccountRow = {
      id: workspace.id,
      source: PlatformAccountSource.WORKSPACE,
      accountType: WorkspaceType.PERSONAL,
      businessType: null,
      name: workspace.name,
      ownerName: owner?.fullName ?? workspace.name,
      ownerEmail: owner?.email ?? null,
      status,
      planName: personalPlanName(sub?.planKey),
      createdAt: workspace.createdAt.toISOString(),
      workspaceId: workspace.id,
      storeId: null,
      requestId: null,
    };
    return {
      account,
      subscription: sub
        ? {
            planName: account.planName ?? personalPlanName(sub.planKey) ?? sub.planKey,
            status,
            startedAt: sub.startedAt.toISOString(),
            expiresAt: (sub.trialEndsAt ?? sub.currentPeriodEnd).toISOString(),
          }
        : null,
      payments: [],
      events: [{ label: 'Akkaunt ochildi', at: account.createdAt }],
    };
  }

  const store = workspace.store;
  if (!store) throw ApiError.notFound('Akkaunt topilmadi');

  const owner = workspace.memberships[0]?.identity ?? store.users[0];
  const sub = store.subscriptions[0];
  const status = platformAccountDisplayStatus({
    source: PlatformAccountSource.WORKSPACE,
    workspaceStatus: workspace.status,
    accessStatus: store.accessStatus,
    subscription: sub,
  });
  const account: PlatformAccountRow = {
    id: workspace.id,
    source: PlatformAccountSource.WORKSPACE,
    accountType: WorkspaceType.BUSINESS,
    businessType: store.businessType as BusinessType,
    name: workspace.name || store.name,
    ownerName: owner?.fullName ?? store.name,
    ownerEmail: owner && 'email' in owner ? owner.email : null,
    status,
    planName: sub?.plan.name ?? null,
    createdAt: workspace.createdAt.toISOString(),
    workspaceId: workspace.id,
    storeId: store.id,
    requestId: null,
  };

  const invoices = await db.platformInvoice.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: invoiceInclude,
  });

  const events = [{ label: 'Akkaunt ochildi', at: account.createdAt }];
  const lastPaid = invoices.find((row) => row.paidAt);
  if (lastPaid?.paidAt) {
    events.push({ label: 'Oxirgi to‘lov', at: lastPaid.paidAt.toISOString() });
  }

  return {
    account,
    subscription: sub
      ? {
          planName: sub.plan.name,
          status,
          startedAt: sub.startedAt.toISOString(),
          expiresAt: (sub.trialEndsAt ?? sub.currentPeriodEnd).toISOString(),
        }
      : null,
    payments: invoices.map(toInvoiceDto),
    events,
  };
}
