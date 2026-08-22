import { Router } from 'express';

import { analyticsRouter } from './analytics.routes.js';
import { auditRouter } from './audit.routes.js';
import { authRouter } from './auth.routes.js';
import { backupsRouter } from './backups.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { debtsRouter } from './debts.routes.js';
import { expenseCategoriesRouter, expensesRouter } from './expenses.routes.js';
import { customersRouter } from './customers.routes.js';
import { healthRouter } from './health.routes.js';
import { inventoryRouter } from './inventory.routes.js';
import { productCategoriesRouter, productsRouter } from './products.routes.js';
import { meRouter } from './me.routes.js';
import { platformBillingRouter, storeAccessRouter } from './platform-billing.routes.js';
import { storeBillingRouter } from './store-billing.routes.js';
import { platformShopsRouter } from './platform-shops.routes.js';
import { platformStoreRequestsRouter } from './platform-store-requests.routes.js';
import { purchasesRouter, suppliersRouter } from './purchasing.routes.js';
import { storeRequestsRouter } from './store-requests.routes.js';
import { reportsRouter } from './reports.routes.js';
import { settingsRouter } from './settings.routes.js';
import { assemblyTasksRouter, salesRouter } from './sales.routes.js';
import { workerFinancesRouter } from './worker-finances.routes.js';
import { workersRouter } from './workers.routes.js';

/**
 * Every route in the application mounts here under `/api`.
 * Feature routers are added as each phase lands.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/store-requests', storeRequestsRouter);
apiRouter.use('/platform/store-requests', platformStoreRequestsRouter);
apiRouter.use('/platform/shops', platformShopsRouter);
apiRouter.use('/platform', platformBillingRouter);
apiRouter.use('/store-access', storeAccessRouter);
apiRouter.use('/billing', storeBillingRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/assembly-tasks', assemblyTasksRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/product-categories', productCategoriesRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/suppliers', suppliersRouter);
apiRouter.use('/purchases', purchasesRouter);
apiRouter.use('/debts', debtsRouter);
apiRouter.use('/workers', workersRouter);
apiRouter.use('/worker-finances', workerFinancesRouter);
apiRouter.use('/expenses', expensesRouter);
apiRouter.use('/expense-categories', expenseCategoriesRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/backups', backupsRouter);
apiRouter.use('/audit', auditRouter);
