import { FeatureKey } from '@furniture-erp/shared';
import { Router } from 'express';
import multer from 'multer';

import {
  archiveProduct,
  createProduct,
  createProductCategory,
  deactivateProductCategory,
  deleteProduct,
  getProduct,
  listProductCategories,
  listProducts,
  removeProductImage,
  restoreProduct,
  updateProduct,
  updateProductCategory,
  uploadProductImage,
} from '../controllers/products.controller.js';
import { searchProducts } from '../controllers/lookup.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireFeature } from '../middleware/require-feature.js';
import { validate } from '../middleware/validate.js';
import { PRODUCT_IMAGE_MAX_BYTES } from '../lib/storage/types.js';
import { idParamsSchema } from '../validators/common.validators.js';
import { lookupQuerySchema } from '../validators/sales.validators.js';
import {
  createProductBodySchema,
  createProductCategoryBodySchema,
  productListQuerySchema,
  updateProductBodySchema,
  updateProductCategoryBodySchema,
} from '../validators/products.validators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES, files: 1 },
});

/**
 * Product catalogue + sale-form lookup.
 *
 * - GET /options — ACTIVE products for the sale selector (any signed-in seller)
 * - Remaining routes — admin catalogue CRUD (enforced in service)
 *
 * storeId always comes from the session.
 */
export const productsRouter = Router();
export const productCategoriesRouter = Router();

productsRouter.use(requireAuth, requireFeature(FeatureKey.PRODUCTS));
productCategoriesRouter.use(requireAuth, requireFeature(FeatureKey.PRODUCTS));

productsRouter.get('/options', validate({ query: lookupQuerySchema }), searchProducts);

productsRouter.get('/', validate({ query: productListQuerySchema }), listProducts);
productsRouter.post('/', validate({ body: createProductBodySchema }), createProduct);
productsRouter.get('/:id', validate({ params: idParamsSchema }), getProduct);
productsRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateProductBodySchema }),
  updateProduct,
);
productsRouter.post('/:id/archive', validate({ params: idParamsSchema }), archiveProduct);
productsRouter.post('/:id/restore', validate({ params: idParamsSchema }), restoreProduct);
productsRouter.delete('/:id', validate({ params: idParamsSchema }), deleteProduct);
productsRouter.post(
  '/:id/image',
  validate({ params: idParamsSchema }),
  upload.single('image'),
  uploadProductImage,
);
productsRouter.delete('/:id/image', validate({ params: idParamsSchema }), removeProductImage);

productCategoriesRouter.get('/', listProductCategories);
productCategoriesRouter.post(
  '/',
  validate({ body: createProductCategoryBodySchema }),
  createProductCategory,
);
productCategoriesRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateProductCategoryBodySchema }),
  updateProductCategory,
);
productCategoriesRouter.post(
  '/:id/deactivate',
  validate({ params: idParamsSchema }),
  deactivateProductCategory,
);
