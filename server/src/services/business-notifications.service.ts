import {
  AssemblyTaskStatus,
  BusinessNotificationCategory,
  BusinessNotificationKind,
  DEFAULT_BUSINESS_NOTIFICATION_PREFS,
  FulfilmentStatus,
  PersonalNotificationSeverity,
  ProductStatus,
  SaleStatus,
  UserRole,
  WorkerFinancialTransactionType,
  WorkerResponsibility,
  type BusinessNotificationDto,
  type BusinessNotificationListResponse,
  type BusinessNotificationPrefs,
  type MarkBusinessNotificationsReadRequest,
  type UpdateBusinessNotificationPrefsRequest,
} from '@furniture-erp/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma as defaultPrisma } from '../lib/prisma.js';
import { getStoreSubscription } from './store-billing.service.js';

const LOOKBACK_MS = 48 * 60 * 60 * 1000;

type Actor = {
  id: string;
  role: string;
  responsibilities: string[];
};

function isAdmin(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.PLATFORM_ADMIN;
}

function parsePrefs(raw: unknown): BusinessNotificationPrefs {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    notifySales: src.notifySales !== false,
    notifyInventory: src.notifyInventory !== false,
    notifyDelivery: src.notifyDelivery !== false,
    notifyAssembly: src.notifyAssembly !== false,
    notifyWorkers: src.notifyWorkers !== false,
    notifyBilling: src.notifyBilling !== false,
    notifyImportant: src.notifyImportant !== false,
  };
}

function parseReads(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function hasResponsibility(actor: Actor, responsibility: WorkerResponsibility): boolean {
  return actor.responsibilities.includes(responsibility);
}

function canSeeSales(actor: Actor): boolean {
  return isAdmin(actor.role) || actor.role === UserRole.CASHIER || hasResponsibility(actor, WorkerResponsibility.SELLER);
}

function canSeeInventory(actor: Actor): boolean {
  return isAdmin(actor.role);
}

function canSeeDelivery(actor: Actor): boolean {
  return isAdmin(actor.role) || hasResponsibility(actor, WorkerResponsibility.DELIVERY);
}

function canSeeAssembly(actor: Actor): boolean {
  return (
    isAdmin(actor.role) ||
    actor.role === UserRole.CASHIER ||
    hasResponsibility(actor, WorkerResponsibility.ASSEMBLER) ||
    hasResponsibility(actor, WorkerResponsibility.INSTALLER)
  );
}

function canSeeWorkers(actor: Actor): boolean {
  return isAdmin(actor.role);
}

function canSeeBilling(actor: Actor): boolean {
  return isAdmin(actor.role);
}

export async function listBusinessNotifications(
  storeId: string,
  actor: Actor,
  db: PrismaClient = defaultPrisma,
): Promise<BusinessNotificationListResponse> {
  const user = await db.user.findFirst({
    where: { id: actor.id, storeId },
    select: { bizNotifyPrefs: true, bizNotifyReads: true },
  });
  if (!user) {
    return {
      items: [],
      prefs: DEFAULT_BUSINESS_NOTIFICATION_PREFS,
      unreadCount: 0,
    };
  }

  const prefs = parsePrefs(user.bizNotifyPrefs);
  const reads = new Set(parseReads(user.bizNotifyReads));
  const since = new Date(Date.now() - LOOKBACK_MS);
  const items: BusinessNotificationDto[] = [];

  if (prefs.notifySales && canSeeSales(actor)) {
    const sales = await db.sale.findMany({
      where: { storeId, OR: [{ createdAt: { gte: since } }, { cancelledAt: { gte: since } }] },
      select: {
        id: true,
        saleNumber: true,
        status: true,
        createdAt: true,
        cancelledAt: true,
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    for (const sale of sales) {
      const name = `${sale.customer.firstName} ${sale.customer.lastName}`.trim();
      if (sale.status === SaleStatus.CANCELLED && sale.cancelledAt && sale.cancelledAt >= since) {
        items.push({
          id: `sale-cancelled:${sale.id}`,
          category: BusinessNotificationCategory.SALES,
          kind: BusinessNotificationKind.SALE_CANCELLED,
          severity: PersonalNotificationSeverity.WARNING,
          href: `/sales/${sale.id}`,
          title: `Sotuv #${sale.saleNumber} bekor qilindi`,
          body: name || null,
          createdAt: sale.cancelledAt.toISOString(),
          read: false,
        });
      } else if (sale.createdAt >= since && sale.status !== SaleStatus.CANCELLED) {
        items.push({
          id: `sale-new:${sale.id}`,
          category: BusinessNotificationCategory.SALES,
          kind: BusinessNotificationKind.SALE_NEW,
          severity: PersonalNotificationSeverity.INFO,
          href: `/sales/${sale.id}`,
          title: `Yangi sotuv #${sale.saleNumber}`,
          body: name || null,
          createdAt: sale.createdAt.toISOString(),
          read: false,
        });
      }
    }
  }

  if (prefs.notifyInventory && canSeeInventory(actor)) {
    const products = await db.product.findMany({
      where: { storeId, trackStock: true, status: ProductStatus.ACTIVE, minStockQty: { gt: 0 } },
      select: { id: true, name: true, stockQty: true, minStockQty: true, updatedAt: true },
      take: 80,
    });
    for (const product of products) {
      if (product.stockQty > product.minStockQty) continue;
      items.push({
        id: `stock-low:${product.id}`,
        category: BusinessNotificationCategory.INVENTORY,
        kind: BusinessNotificationKind.STOCK_LOW,
        severity:
          product.stockQty <= 0 ? PersonalNotificationSeverity.DANGER : PersonalNotificationSeverity.WARNING,
        href: '/inventory',
        title: `${product.name} kam qoldi`,
        body: `Qoldiq: ${product.stockQty} (min: ${product.minStockQty})`,
        createdAt: product.updatedAt.toISOString(),
        read: false,
      });
    }
  }

  if (prefs.notifyDelivery && canSeeDelivery(actor)) {
    const deliveries = await db.sale.findMany({
      where: {
        storeId,
        deliveryStatus: {
          in: [FulfilmentStatus.PENDING, FulfilmentStatus.SCHEDULED, FulfilmentStatus.IN_TRANSIT],
        },
      },
      select: {
        id: true,
        saleNumber: true,
        deliveryDueDate: true,
        createdAt: true,
        deliveryPerson: { select: { fullName: true } },
      },
      take: 40,
    });
    const now = Date.now();
    for (const sale of deliveries) {
      const overdue = sale.deliveryDueDate != null && sale.deliveryDueDate.getTime() < now;
      items.push({
        id: overdue ? `delivery-overdue:${sale.id}` : `delivery-open:${sale.id}`,
        category: BusinessNotificationCategory.DELIVERY,
        kind: overdue ? BusinessNotificationKind.DELIVERY_OVERDUE : BusinessNotificationKind.DELIVERY_NEW,
        severity: overdue ? PersonalNotificationSeverity.DANGER : PersonalNotificationSeverity.INFO,
        href: '/delivery',
        title: overdue
          ? `Yetkazib berish muddati o‘tdi #${sale.saleNumber}`
          : `Yetkazib berish vazifasi #${sale.saleNumber}`,
        body: sale.deliveryPerson?.fullName ? `Mas'ul: ${sale.deliveryPerson.fullName}` : null,
        createdAt: (sale.deliveryDueDate ?? sale.createdAt).toISOString(),
        read: false,
      });
    }
  }

  if (prefs.notifyAssembly && canSeeAssembly(actor)) {
    const tasks = await db.assemblyTask.findMany({
      where: {
        storeId,
        status: { in: [AssemblyTaskStatus.PENDING, AssemblyTaskStatus.IN_PROGRESS] },
      },
      select: {
        id: true,
        assignedAt: true,
        sale: { select: { saleNumber: true, items: { select: { productName: true }, take: 1 } } },
        assignee: { select: { fullName: true } },
      },
      take: 40,
    });
    for (const task of tasks) {
      const product = task.sale.items[0]?.productName ?? 'Mebel';
      items.push({
        id: `assembly-open:${task.id}`,
        category: BusinessNotificationCategory.ASSEMBLY,
        kind: BusinessNotificationKind.ASSEMBLY_OPEN,
        severity: PersonalNotificationSeverity.INFO,
        href: '/assembly-tasks',
        title: `${task.assignee.fullName} — ${product}`,
        body: `Sotuv #${task.sale.saleNumber}`,
        createdAt: task.assignedAt.toISOString(),
        read: false,
      });
    }
  }

  if (prefs.notifyWorkers && canSeeWorkers(actor)) {
    const payments = await db.workerFinancialTransaction.findMany({
      where: {
        storeId,
        type: WorkerFinancialTransactionType.PAYMENT,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        createdAt: true,
        worker: { select: { fullName: true } },
      },
      take: 20,
    });
    for (const payment of payments) {
      items.push({
        id: `worker-pay:${payment.id}`,
        category: BusinessNotificationCategory.WORKERS,
        kind: BusinessNotificationKind.WORKER_PAYMENT,
        severity: PersonalNotificationSeverity.INFO,
        href: '/workers',
        title: `Ishchi to‘lovi: ${payment.worker.fullName}`,
        body: null,
        createdAt: payment.createdAt.toISOString(),
        read: false,
      });
    }
  }

  if ((prefs.notifyBilling || prefs.notifyImportant) && canSeeBilling(actor)) {
    const subscription = await getStoreSubscription(storeId);
    if (subscription) {
      const days = subscription.daysRemaining;
      if (prefs.notifyImportant && (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED')) {
        items.push({
          id: `sub-expired:${subscription.planId ?? 'none'}`,
          category: BusinessNotificationCategory.IMPORTANT,
          kind: BusinessNotificationKind.SUBSCRIPTION_EXPIRED,
          severity: PersonalNotificationSeverity.DANGER,
          href: '/billing',
          title: 'Obuna muddati tugagan',
          body: subscription.planName,
          createdAt: subscription.expiresAt,
          read: false,
        });
      } else if (prefs.notifyBilling && days != null && days <= 7) {
        items.push({
          id: `sub-expiring:${subscription.planId ?? 'none'}:${days}`,
          category: BusinessNotificationCategory.BILLING,
          kind: BusinessNotificationKind.SUBSCRIPTION_EXPIRING,
          severity: days <= 2 ? PersonalNotificationSeverity.DANGER : PersonalNotificationSeverity.WARNING,
          href: '/billing',
          title: `Obunaga ${days} kun qoldi`,
          body: subscription.planName,
          createdAt: subscription.expiresAt,
          read: false,
        });
      }
    }
  }

  const rank: Record<PersonalNotificationSeverity, number> = {
    DANGER: 0,
    WARNING: 1,
    INFO: 2,
  };
  items.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );

  const withRead = items.map((item) => ({ ...item, read: reads.has(item.id) }));
  return {
    items: withRead,
    prefs,
    unreadCount: withRead.filter((item) => !item.read).length,
  };
}

export async function updateBusinessNotificationPrefs(
  storeId: string,
  userId: string,
  input: UpdateBusinessNotificationPrefsRequest,
  db: PrismaClient = defaultPrisma,
): Promise<BusinessNotificationPrefs> {
  const user = await db.user.findFirst({
    where: { id: userId, storeId },
    select: { bizNotifyPrefs: true },
  });
  if (!user) {
    return DEFAULT_BUSINESS_NOTIFICATION_PREFS;
  }
  const next = { ...parsePrefs(user.bizNotifyPrefs), ...input };
  await db.user.updateMany({
    where: { id: userId, storeId },
    data: { bizNotifyPrefs: next },
  });
  return next;
}

export async function markBusinessNotificationsRead(
  storeId: string,
  userId: string,
  input: MarkBusinessNotificationsReadRequest,
  db: PrismaClient = defaultPrisma,
): Promise<{ unreadCount: number }> {
  const user = await db.user.findFirst({
    where: { id: userId, storeId },
    select: { bizNotifyReads: true, role: true, responsibilities: { select: { responsibility: true } } },
  });
  if (!user) return { unreadCount: 0 };

  const current = await listBusinessNotifications(
    storeId,
    {
      id: userId,
      role: user.role,
      responsibilities: user.responsibilities.map((row) => row.responsibility),
    },
    db,
  );
  const keys = input.keys?.length ? input.keys : current.items.map((item) => item.id);
  const allowed = new Set(current.items.map((item) => item.id));
  const merged = Array.from(
    new Set([...parseReads(user.bizNotifyReads), ...keys.filter((key) => allowed.has(key))]),
  ).slice(-500);

  await db.user.updateMany({
    where: { id: userId, storeId },
    data: { bizNotifyReads: merged },
  });

  return { unreadCount: current.items.filter((item) => !merged.includes(item.id)).length };
}
