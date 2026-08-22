import { ProductStatus, UserRole, WorkerResponsibility } from '@furniture-erp/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';

const { prismaMock, catalogueServiceMock, lookupServiceMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
  catalogueServiceMock: {
    listProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    archiveProduct: vi.fn(),
    restoreProduct: vi.fn(),
    uploadProductImage: vi.fn(),
    removeProductImage: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deactivateCategory: vi.fn(),
  },
  lookupServiceMock: {
    searchProducts: vi.fn(),
    searchCustomers: vi.fn(),
    createCustomer: vi.fn(),
  },
}));

vi.mock('../lib/prisma.js', () => ({
  prisma: prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('../services/product-catalogue.service.js', () => catalogueServiceMock);
vi.mock('../services/lookup.service.js', () => lookupServiceMock);

const app = createApp();
const PASSWORD = 'Admin123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const ADMIN_RECORD = {
  id: 'user_admin',
  email: 'admin@furniture-erp.local',
  username: 'admin',
  fullName: 'Store Administrator',
  phone: null,
  role: UserRole.ADMIN,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [{ responsibility: WorkerResponsibility.SELLER }],
};

const EMPLOYEE_RECORD = {
  id: 'user_ali',
  email: 'ali@furniture-erp.local',
  username: 'ali',
  fullName: 'Ali Usta',
  phone: '+998901111111',
  role: UserRole.EMPLOYEE,
  passwordHash: PASSWORD_HASH,
  storeId: 'store_1',
  store: { name: 'Mebel Savdo' },
  responsibilities: [{ responsibility: WorkerResponsibility.ASSEMBLER }],
};

const PRODUCT = {
  id: 'clxxxxxxxxxxxxxxxxxxxxxxxx1',
  name: 'Divan',
  sku: 'DV-01',
  description: null,
  imageUrl: null,
  categoryId: null,
  categoryName: null,
  costPrice: 5_000_000,
  defaultSalePrice: 7_300_000,
  stockQty: 0,
  minStockQty: 0,
  trackStock: true,
  stockStatus: 'OUT_OF_STOCK',
  status: ProductStatus.ACTIVE,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

async function signedInAs(record: typeof ADMIN_RECORD) {
  prismaMock.user.findFirst.mockResolvedValue(record);
  prismaMock.user.update.mockResolvedValue(record);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ identifier: record.username, password: PASSWORD });
  return agent;
}

beforeEach(() => {
  vi.clearAllMocks();
  catalogueServiceMock.listProducts.mockResolvedValue({
    summary: {
      totalProducts: 1,
      activeCount: 1,
      archivedCount: 0,
      lowStockCount: 0,
      outOfStockCount: 1,
    },
    items: [PRODUCT],
    meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  });
  catalogueServiceMock.createProduct.mockResolvedValue(PRODUCT);
  catalogueServiceMock.getProduct.mockResolvedValue({
    ...PRODUCT,
    imageKey: null,
    stockSummary: {
      stockIn: 0,
      sold: 0,
      cancelledRestored: 0,
      manualAdjustments: 0,
      currentQty: 0,
    },
    salesSummary: {
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      saleCount: 0,
    },
  });
  lookupServiceMock.searchProducts.mockResolvedValue([
    {
      id: PRODUCT.id,
      name: PRODUCT.name,
      sku: PRODUCT.sku,
      imageUrl: null,
      costPrice: PRODUCT.costPrice,
      defaultSalePrice: PRODUCT.defaultSalePrice,
      categoryName: null,
      stockQty: 0,
      minStockQty: 0,
      trackStock: true,
    },
  ]);
});

describe('products catalogue routes', () => {
  it('lists products for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(catalogueServiceMock.listProducts).toHaveBeenCalled();
  });

  it('creates a product for admin', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/products').send({
      name: 'Divan',
      costPrice: 5_000_000,
      defaultSalePrice: 7_300_000,
      sku: 'DV-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.product.name).toBe('Divan');
  });

  it('rejects create with negative price', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/products').send({
      name: 'Divan',
      costPrice: -1,
      defaultSalePrice: 1000,
    });
    expect(res.status).toBe(422);
  });

  it('rejects empty name', async () => {
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post('/api/products').send({
      name: '  ',
      costPrice: 1,
      defaultSalePrice: 2,
    });
    expect(res.status).toBe(422);
  });

  it('forbids employee catalogue list', async () => {
    catalogueServiceMock.listProducts.mockRejectedValue({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only store administrators can manage the product catalogue',
      isOperational: true,
      name: 'ApiError',
    });
    // Service throws ApiError — mock must throw real ApiError for error handler
    const { ApiError } = await import('../utils/api-error.js');
    catalogueServiceMock.listProducts.mockRejectedValue(
      ApiError.forbidden('Only store administrators can manage the product catalogue'),
    );

    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.get('/api/products');
    expect(res.status).toBe(403);
  });

  it('serves ACTIVE product options for sale lookup', async () => {
    const agent = await signedInAs(EMPLOYEE_RECORD);
    const res = await agent.get('/api/products/options').query({ q: 'Div' });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].name).toBe('Divan');
    expect(lookupServiceMock.searchProducts).toHaveBeenCalled();
  });

  it('archives a product', async () => {
    catalogueServiceMock.archiveProduct.mockResolvedValue({
      ...PRODUCT,
      status: ProductStatus.ARCHIVED,
    });
    const agent = await signedInAs(ADMIN_RECORD);
    const res = await agent.post(`/api/products/${PRODUCT.id}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.status).toBe(ProductStatus.ARCHIVED);
  });
});
