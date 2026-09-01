import { CustomerStatus, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { catalogueRepoMock, debtRepoMock } = vi.hoisted(() => ({
  catalogueRepoMock: {
    listCustomers: vi.fn(),
    getCustomerDetail: vi.fn(),
    createCatalogueCustomer: vi.fn(),
    updateCatalogueCustomer: vi.fn(),
    findCustomerByPhoneVariants: vi.fn(),
    setCustomerStatus: vi.fn(),
  },
  debtRepoMock: {
    summarizeDebts: vi.fn(),
  },
}));

vi.mock('../repositories/customer-catalogue.repository.js', () => catalogueRepoMock);
vi.mock('../repositories/debt.repository.js', () => debtRepoMock);
vi.mock('./entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(),
  assertCanCreateResource: vi.fn(),
}));

const {
  archiveCustomer,
  assertCanArchiveCustomers,
  createCustomer,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} = await import('./customer-catalogue.service.js');

const STORE = 'store_1';
const ADMIN = UserRole.ADMIN;
const EMPLOYEE = UserRole.EMPLOYEE;

const CUSTOMER = {
  id: 'cust_1',
  firstName: 'Ali',
  lastName: 'Valiyev',
  fullName: 'Ali Valiyev',
  phone: '+998901234567',
  notes: null,
  address: null,
  status: CustomerStatus.ACTIVE,
  debtStatus: 'CLEAR' as const,
  totalPurchases: 0,
  totalPaid: 0,
  outstandingDebt: 0,
  overdueAmount: 0,
  openSaleCount: 0,
  lastSaleAt: null,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  catalogueRepoMock.findCustomerByPhoneVariants.mockResolvedValue(null);
});

describe('customer-catalogue.service permissions', () => {
  it('allows admin to archive', () => {
    expect(() => assertCanArchiveCustomers(ADMIN)).not.toThrow();
  });

  it('forbids employee archive', () => {
    expect(() => assertCanArchiveCustomers(EMPLOYEE)).toThrow(ApiError);
  });

  it('allows any signed-in role to list', async () => {
    catalogueRepoMock.listCustomers.mockResolvedValue({
      summary: {
        totalCustomers: 1,
        activeCount: 1,
        archivedCount: 0,
        customersInDebt: 0,
        totalOutstanding: 0,
        overdueAmount: 0,
      },
      items: [CUSTOMER],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    });
    await expect(listCustomers(STORE, EMPLOYEE, {})).resolves.toMatchObject({
      items: [CUSTOMER],
    });
  });
});

describe('customer-catalogue.service create/update', () => {
  it('creates with normalised phone', async () => {
    catalogueRepoMock.createCatalogueCustomer.mockResolvedValue(CUSTOMER);
    const created = await createCustomer(STORE, ADMIN, {
      firstName: 'Ali',
      lastName: 'Valiyev',
      phone: '901234567',
    });
    expect(created.phone).toBe('+998901234567');
    expect(catalogueRepoMock.createCatalogueCustomer).toHaveBeenCalledWith(
      STORE,
      expect.objectContaining({ phone: '+998901234567' }),
    );
  });

  it('rejects missing name', async () => {
    await expect(
      createCustomer(STORE, ADMIN, { firstName: '  ', lastName: 'Valiyev', phone: '901234567' }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects invalid phone', async () => {
    await expect(
      createCustomer(STORE, ADMIN, { firstName: 'Ali', lastName: 'Valiyev', phone: '12' }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects duplicate normalised phone', async () => {
    catalogueRepoMock.findCustomerByPhoneVariants.mockResolvedValue({ id: 'other' });
    await expect(
      createCustomer(STORE, ADMIN, {
        firstName: 'Ali',
        lastName: 'Valiyev',
        phone: '+998901234567',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('updates notes without touching debt fields', async () => {
    catalogueRepoMock.updateCatalogueCustomer.mockResolvedValue({
      ...CUSTOMER,
      notes: 'Urgut',
    });
    const updated = await updateCustomer(STORE, EMPLOYEE, 'cust_1', { notes: 'Urgut' });
    expect(updated.notes).toBe('Urgut');
    expect(catalogueRepoMock.updateCatalogueCustomer).toHaveBeenCalledWith(
      STORE,
      'cust_1',
      expect.objectContaining({ notes: 'Urgut' }),
    );
  });
});

describe('customer-catalogue.service archive/restore', () => {
  it('archives as admin', async () => {
    catalogueRepoMock.setCustomerStatus.mockResolvedValue({
      ...CUSTOMER,
      status: CustomerStatus.ARCHIVED,
    });
    const archived = await archiveCustomer(STORE, ADMIN, 'cust_1');
    expect(archived.status).toBe(CustomerStatus.ARCHIVED);
  });

  it('rejects archive for employee', async () => {
    await expect(archiveCustomer(STORE, EMPLOYEE, 'cust_1')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('restores as admin', async () => {
    catalogueRepoMock.setCustomerStatus.mockResolvedValue(CUSTOMER);
    const restored = await restoreCustomer(STORE, ADMIN, 'cust_1');
    expect(restored.status).toBe(CustomerStatus.ACTIVE);
  });
});

describe('customer-catalogue.service detail', () => {
  it('returns detail', async () => {
    catalogueRepoMock.getCustomerDetail.mockResolvedValue({
      ...CUSTOMER,
      financial: {
        totalPurchases: 10_000_000,
        totalPaid: 3_000_000,
        outstandingDebt: 7_000_000,
        overdueAmount: 0,
        openSaleCount: 1,
        revenueSaleCount: 1,
        cancelledSaleCount: 0,
      },
      sales: [],
      payments: [],
      installments: [],
    });
    const detail = await getCustomer(STORE, ADMIN, 'cust_1');
    expect(detail.financial.outstandingDebt).toBe(7_000_000);
  });

  it('404 when missing', async () => {
    catalogueRepoMock.getCustomerDetail.mockResolvedValue(null);
    await expect(getCustomer(STORE, ADMIN, 'missing')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('scopes detail lookup to the session storeId (cross-store isolation)', async () => {
    catalogueRepoMock.getCustomerDetail.mockResolvedValue(null);
    await expect(getCustomer('other_store', EMPLOYEE, 'cust_1')).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(catalogueRepoMock.getCustomerDetail).toHaveBeenCalledWith('other_store', 'cust_1');
  });
});
