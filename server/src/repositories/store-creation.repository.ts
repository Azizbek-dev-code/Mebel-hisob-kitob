import {
  StoreCreationRequestStatus,
  applicantFullName,
  type StoreCreationRequestAdmin,
  type StoreCreationRequestPublic,
} from '@furniture-erp/shared';
import type { Prisma, StoreCreationRequest } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

const publicSelect = {
  id: true,
  applicantFirstName: true,
  applicantLastName: true,
  phone: true,
  email: true,
  username: true,
  storeName: true,
  region: true,
  district: true,
  address: true,
  status: true,
  rejectionReason: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  createdStoreId: true,
  reviewedById: true,
  createdUserId: true,
  reviewedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.StoreCreationRequestSelect;

export type StoreCreationRequestRecord = Prisma.StoreCreationRequestGetPayload<{
  select: typeof publicSelect;
}>;

function toPublic(row: StoreCreationRequestRecord): StoreCreationRequestPublic {
  return {
    id: row.id,
    applicantFirstName: row.applicantFirstName,
    applicantLastName: row.applicantLastName,
    phone: row.phone,
    email: row.email,
    username: row.username,
    storeName: row.storeName,
    region: row.region,
    district: row.district,
    address: row.address,
    status: row.status as StoreCreationRequestStatus,
    rejectionReason: row.rejectionReason,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdStoreId: row.createdStoreId,
  };
}

export function toAdminView(row: StoreCreationRequestRecord): StoreCreationRequestAdmin {
  return {
    ...toPublic(row),
    reviewedById: row.reviewedById,
    reviewedByName: row.reviewedBy?.fullName ?? null,
  };
}

export function toPublicView(row: StoreCreationRequestRecord): StoreCreationRequestPublic {
  return toPublic(row);
}

export function applicantDisplayName(row: Pick<StoreCreationRequest, 'applicantFirstName' | 'applicantLastName'>): string {
  return applicantFullName(row.applicantFirstName, row.applicantLastName);
}

export async function createPendingRequest(data: {
  applicantFirstName: string;
  applicantLastName: string;
  phone: string;
  email: string;
  username: string;
  passwordHash: string;
  storeName: string;
  region: string;
  district: string;
  address: string;
}): Promise<StoreCreationRequestRecord> {
  return prisma.storeCreationRequest.create({
    data: {
      ...data,
      status: StoreCreationRequestStatus.PENDING,
    },
    select: publicSelect,
  });
}

export function findById(id: string): Promise<StoreCreationRequestRecord | null> {
  return prisma.storeCreationRequest.findUnique({ where: { id }, select: publicSelect });
}

export function findPendingByPhone(phone: string): Promise<{ id: string } | null> {
  return prisma.storeCreationRequest.findFirst({
    where: { phone, status: StoreCreationRequestStatus.PENDING },
    select: { id: true },
  });
}

export function findPendingByEmail(email: string): Promise<{ id: string } | null> {
  return prisma.storeCreationRequest.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, status: StoreCreationRequestStatus.PENDING },
    select: { id: true },
  });
}

export function findPendingByUsername(username: string): Promise<{ id: string } | null> {
  return prisma.storeCreationRequest.findFirst({
    where: {
      username: { equals: username, mode: 'insensitive' },
      status: StoreCreationRequestStatus.PENDING,
    },
    select: { id: true },
  });
}

export function findPendingByStoreName(storeName: string): Promise<{ id: string } | null> {
  return prisma.storeCreationRequest.findFirst({
    where: {
      storeName: { equals: storeName, mode: 'insensitive' },
      status: StoreCreationRequestStatus.PENDING,
    },
    select: { id: true },
  });
}

export function findUserByEmail(email: string): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
}

export function findUserByUsername(username: string): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  });
}

export async function listRequests(options: {
  status?: StoreCreationRequestStatus;
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}): Promise<{ rows: StoreCreationRequestRecord[]; totalItems: number; pendingCount: number }> {
  const where: Prisma.StoreCreationRequestWhereInput = options.status
    ? { status: options.status }
    : {};

  const [rows, totalItems, pendingCount] = await Promise.all([
    prisma.storeCreationRequest.findMany({
      where,
      select: publicSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: options.skip,
      take: options.take,
    }),
    prisma.storeCreationRequest.count({ where }),
    prisma.storeCreationRequest.count({ where: { status: StoreCreationRequestStatus.PENDING } }),
  ]);

  return { rows, totalItems, pendingCount };
}

export function countPending(): Promise<number> {
  return prisma.storeCreationRequest.count({
    where: { status: StoreCreationRequestStatus.PENDING },
  });
}

export function loadPendingForUpdate(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<{
  id: string;
  status: StoreCreationRequestStatus;
  passwordHash: string | null;
  applicantFirstName: string;
  applicantLastName: string;
  phone: string;
  email: string;
  username: string;
  storeName: string;
  region: string;
  district: string;
  address: string;
} | null> {
  return tx.storeCreationRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      passwordHash: true,
      applicantFirstName: true,
      applicantLastName: true,
      phone: true,
      email: true,
      username: true,
      storeName: true,
      region: true,
      district: true,
      address: true,
    },
  });
}
