import { ProductStatus, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { catalogueRepoMock, storageMock } = vi.hoisted(() => ({
  catalogueRepoMock: {
    listCatalogueProducts: vi.fn(),
    getProductDetail: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    findProductInStore: vi.fn(),
    setProductImage: vi.fn(),
    findCategoryInStore: vi.fn(),
    listProductCategories: vi.fn(),
    createProductCategory: vi.fn(),
    updateProductCategory: vi.fn(),
    deactivateProductCategory: vi.fn(),
    countProductPurchaseItems: vi.fn(),
    deleteProductPermanent: vi.fn(),
  },
  storageMock: {
    getStorageDriver: vi.fn(),
  },
}));

vi.mock('../repositories/product-catalogue.repository.js', () => catalogueRepoMock);
vi.mock('../lib/storage/index.js', () => storageMock);
vi.mock('./entitlement.service.js', () => ({
  assertCanUseFeature: vi.fn(),
  assertCanCreateResource: vi.fn(),
}));
vi.mock('./audit.service.js', () => ({
  recordAudit: vi.fn(),
}));

const {
  archiveProduct,
  assertCanManageCatalogue,
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  uploadProductImage,
} = await import('./product-catalogue.service.js');

const STORE = 'store_1';
const ADMIN = UserRole.ADMIN;
const EMPLOYEE = UserRole.EMPLOYEE;

const PRODUCT = {
  id: 'prod_1',
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

beforeEach(() => {
  vi.clearAllMocks();
  catalogueRepoMock.findCategoryInStore.mockResolvedValue(null);
});

describe('product-catalogue.service permissions', () => {
  it('allows admin to manage catalogue', () => {
    expect(() => assertCanManageCatalogue(ADMIN)).not.toThrow();
  });

  it('forbids employee catalogue management', () => {
    expect(() => assertCanManageCatalogue(EMPLOYEE)).toThrow(ApiError);
  });

  it('rejects list for non-admin', async () => {
    await expect(listProducts(STORE, EMPLOYEE, {})).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('product-catalogue.service create/update', () => {
  it('creates a product with stock 0', async () => {
    catalogueRepoMock.createProduct.mockResolvedValue(PRODUCT);
    const created = await createProduct(STORE, ADMIN, {
      name: 'Divan',
      costPrice: 5_000_000,
      defaultSalePrice: 7_300_000,
      sku: 'DV-01',
    });
    expect(created.sku).toBe('DV-01');
    expect(catalogueRepoMock.createProduct).toHaveBeenCalledWith(
      STORE,
      expect.objectContaining({ name: 'Divan', costPrice: 5_000_000 }),
    );
  });

  it('allows create without cost price (filled in later)', async () => {
    catalogueRepoMock.createProduct.mockResolvedValue({ ...PRODUCT, costPrice: 0, sku: 'MB-0001' });
    const created = await createProduct(STORE, ADMIN, {
      name: 'Divan',
      defaultSalePrice: 7_300_000,
    });
    expect(created.costPrice).toBe(0);
    expect(catalogueRepoMock.createProduct).toHaveBeenCalledWith(
      STORE,
      expect.objectContaining({ name: 'Divan', defaultSalePrice: 7_300_000 }),
    );
  });

  it('maps duplicate SKU to validation error', async () => {
    catalogueRepoMock.createProduct.mockRejectedValue({ code: 'P2002' });
    await expect(
      createProduct(STORE, ADMIN, {
        name: 'Divan',
        costPrice: 1,
        defaultSalePrice: 2,
        sku: 'DUP',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('updates prices without touching other stores', async () => {
    catalogueRepoMock.updateProduct.mockResolvedValue({
      ...PRODUCT,
      costPrice: 6_000_000,
      defaultSalePrice: 8_000_000,
    });
    const updated = await updateProduct(STORE, ADMIN, 'prod_1', {
      costPrice: 6_000_000,
      defaultSalePrice: 8_000_000,
    });
    expect(updated.costPrice).toBe(6_000_000);
    expect(catalogueRepoMock.updateProduct).toHaveBeenCalledWith(
      STORE,
      'prod_1',
      expect.objectContaining({ costPrice: 6_000_000 }),
    );
  });

  it('archives a product', async () => {
    catalogueRepoMock.updateProduct.mockResolvedValue({
      ...PRODUCT,
      status: ProductStatus.ARCHIVED,
    });
    const archived = await archiveProduct(STORE, ADMIN, 'prod_1');
    expect(archived.status).toBe(ProductStatus.ARCHIVED);
  });

  it('permanently deletes an archived product', async () => {
    catalogueRepoMock.findProductInStore.mockResolvedValue({
      ...PRODUCT,
      status: ProductStatus.ARCHIVED,
      imageKey: null,
    });
    catalogueRepoMock.countProductPurchaseItems.mockResolvedValue(0);
    catalogueRepoMock.deleteProductPermanent.mockResolvedValue({
      id: 'prod_1',
      name: 'Divan',
      imageKey: null,
    });

    await expect(deleteProduct(STORE, ADMIN, 'prod_1')).resolves.toBeUndefined();
    expect(catalogueRepoMock.deleteProductPermanent).toHaveBeenCalledWith(STORE, 'prod_1');
  });

  it('refuses to delete an active product', async () => {
    catalogueRepoMock.findProductInStore.mockResolvedValue({
      ...PRODUCT,
      status: ProductStatus.ACTIVE,
    });
    await expect(deleteProduct(STORE, ADMIN, 'prod_1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses to delete a product used in purchases', async () => {
    catalogueRepoMock.findProductInStore.mockResolvedValue({
      ...PRODUCT,
      status: ProductStatus.ARCHIVED,
    });
    catalogueRepoMock.countProductPurchaseItems.mockResolvedValue(2);
    await expect(deleteProduct(STORE, ADMIN, 'prod_1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects inactive category on create', async () => {
    catalogueRepoMock.findCategoryInStore.mockResolvedValue({
      id: 'cat_1',
      isActive: false,
    });
    await expect(
      createProduct(STORE, ADMIN, {
        name: 'Divan',
        costPrice: 1,
        defaultSalePrice: 2,
        categoryId: 'cat_1',
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('product-catalogue.service images', () => {
  it('uploads an image through the storage driver', async () => {
    const driver = {
      upload: vi.fn().mockResolvedValue({
        key: 'stores/store_1/products/x',
        url: 'http://localhost:4000/uploads/x.jpg',
        contentType: 'image/jpeg',
        bytes: 12,
      }),
      delete: vi.fn(),
      name: 'local' as const,
    };
    storageMock.getStorageDriver.mockReturnValue(driver);
    catalogueRepoMock.findProductInStore.mockResolvedValue({
      ...PRODUCT,
      imageKey: null,
      storeId: STORE,
    });
    catalogueRepoMock.setProductImage.mockResolvedValue({
      ...PRODUCT,
      imageUrl: 'http://localhost:4000/uploads/x.jpg',
    });

    const result = await uploadProductImage(STORE, ADMIN, 'prod_1', {
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/jpeg',
      originalname: 'sofa.jpg',
      size: 12,
    });

    expect(result.imageUrl).toContain('/uploads/');
    expect(driver.upload).toHaveBeenCalled();
  });

  it('rejects oversized images', async () => {
    await expect(
      uploadProductImage(STORE, ADMIN, 'prod_1', {
        buffer: Buffer.alloc(10),
        mimetype: 'image/jpeg',
        originalname: 'big.jpg',
        size: 5 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
