import { Router } from 'express';

import {
  createWorkerCompensationRule,
  getWorkerCompensationPreview,
  getWorkerCompensationRule,
  listWorkerCompensationRules,
  settleWorkerCompensation,
  updateWorkerCompensationRule,
} from '../controllers/worker-compensation.controller.js';
import {
  createWorker,
  getWorker,
  getWorkerStats,
  listWorkerActivity,
  listWorkers,
  listWorkerSales,
  listWorkerTasks,
  resetWorkerPassword,
  searchWorkerOptions,
  updateWorker,
} from '../controllers/workers.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/common.validators.js';
import {
  createWorkerCompensationRuleBodySchema,
  settleWorkerCompensationBodySchema,
  updateWorkerCompensationRuleBodySchema,
  workerCompensationPreviewQuerySchema,
  workerCompensationRuleListQuerySchema,
  workerCompensationRuleParamsSchema,
} from '../validators/worker-compensation.validators.js';
import {
  createWorkerBodySchema,
  resetWorkerPasswordBodySchema,
  updateWorkerBodySchema,
  workerListQuerySchema,
  workerOptionsQuerySchema,
  workerSalesQuerySchema,
  workerTasksQuerySchema,
} from '../validators/workers.validators.js';

/**
 * Worker management.
 *
 * Lookup options used by the sale form live at GET /workers/options so they
 * stay available to cashiers without exposing the management list.
 * Self-service endpoints live under /api/me.
 *
 * Compensation rules (Phase 8 Step 4A/4B) are admin-only configuration —
 * they never post WorkerFinancialTransaction rows.
 * Compensation preview (Step 4C) is read-only calculation over rules + events.
 * Compensation settle posts COMMISSION ledger rows for a preview period.
 */
export const workersRouter = Router();

workersRouter.use(requireAuth);

workersRouter.get('/options', validate({ query: workerOptionsQuerySchema }), searchWorkerOptions);

workersRouter.get('/', validate({ query: workerListQuerySchema }), listWorkers);
workersRouter.post('/', validate({ body: createWorkerBodySchema }), createWorker);

workersRouter.get('/:id', validate({ params: idParamsSchema }), getWorker);
workersRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: updateWorkerBodySchema }),
  updateWorker,
);
workersRouter.post(
  '/:id/reset-password',
  validate({ params: idParamsSchema, body: resetWorkerPasswordBodySchema }),
  resetWorkerPassword,
);
workersRouter.get('/:id/stats', validate({ params: idParamsSchema }), getWorkerStats);
workersRouter.get(
  '/:id/sales',
  validate({ params: idParamsSchema, query: workerSalesQuerySchema }),
  listWorkerSales,
);
workersRouter.get(
  '/:id/tasks',
  validate({ params: idParamsSchema, query: workerTasksQuerySchema }),
  listWorkerTasks,
);
workersRouter.get('/:id/activity', validate({ params: idParamsSchema }), listWorkerActivity);

workersRouter.get(
  '/:id/compensation-preview',
  validate({ params: idParamsSchema, query: workerCompensationPreviewQuerySchema }),
  getWorkerCompensationPreview,
);
workersRouter.post(
  '/:id/compensation-settle',
  validate({ params: idParamsSchema, body: settleWorkerCompensationBodySchema }),
  settleWorkerCompensation,
);
workersRouter.get(
  '/:id/compensation-rules',
  validate({ params: idParamsSchema, query: workerCompensationRuleListQuerySchema }),
  listWorkerCompensationRules,
);
workersRouter.post(
  '/:id/compensation-rules',
  validate({ params: idParamsSchema, body: createWorkerCompensationRuleBodySchema }),
  createWorkerCompensationRule,
);
workersRouter.get(
  '/:id/compensation-rules/:ruleId',
  validate({ params: workerCompensationRuleParamsSchema }),
  getWorkerCompensationRule,
);
workersRouter.patch(
  '/:id/compensation-rules/:ruleId',
  validate({
    params: workerCompensationRuleParamsSchema,
    body: updateWorkerCompensationRuleBodySchema,
  }),
  updateWorkerCompensationRule,
);
