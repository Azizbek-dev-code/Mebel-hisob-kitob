import { ApiErrorCode } from '@furniture-erp/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../../../config/env.js';
import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePlatformAdmin } from '../../../middleware/require-platform-admin.js';
import { validate } from '../../../middleware/validate.js';
import { ApiError } from '../../../utils/api-error.js';
import {
  deleteAdminMapping,
  getAdminAnswers,
  getAdminMappings,
  getAdminNeeds,
  getAdminQuestions,
  getAdminSolutions,
  getCatalog,
  getStats,
  getSubmission,
  patchAdminNeed,
  patchAdminQuestion,
  patchAdminSolution,
  patchAnswers,
  postAdminMapping,
  postAdminNeed,
  postAdminNeedDeactivate,
  postAdminNeedsReorder,
  postAdminQuestion,
  postAdminQuestionDeactivate,
  postAdminQuestionsReorder,
  postAdminSolution,
  postAdminSolutionDeactivate,
  postAdminSolutionsReorder,
  postCompleteAuthenticated,
  postCompleteBusiness,
  postCompleteRegister,
  postStart,
} from './onboarding.controller.js';
import {
  completeAuthenticatedOnboardingBodySchema,
  completePersonalOnboardingBodySchema,
  idParamsSchema,
  onboardingTokenParamsSchema,
  reorderBodySchema,
  saveOnboardingAnswersBodySchema,
  startOnboardingBodySchema,
  upsertMappingBodySchema,
  upsertNeedBodySchema,
  upsertQuestionBodySchema,
} from './onboarding.validators.js';

const onboardingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        429,
        ApiErrorCode.RATE_LIMITED,
        "Juda ko'p so'rov yuborildi. Birozdan so'ng qayta urinib ko'ring.",
      ),
    );
  },
});

/**
 * Public onboarding capture. Personal complete-register does not issue a JWT.
 * Authenticated complete attaches a PERSONAL workspace to the signed-in Identity.
 */
export const onboardingRouter = Router();

onboardingRouter.get('/catalog', getCatalog);
onboardingRouter.post(
  '/',
  onboardingRateLimiter,
  validate({ body: startOnboardingBodySchema }),
  postStart,
);
onboardingRouter.get(
  '/:token',
  validate({ params: onboardingTokenParamsSchema }),
  getSubmission,
);
onboardingRouter.patch(
  '/:token',
  onboardingRateLimiter,
  validate({ params: onboardingTokenParamsSchema, body: saveOnboardingAnswersBodySchema }),
  patchAnswers,
);
onboardingRouter.post(
  '/:token/complete-register',
  onboardingRateLimiter,
  validate({ params: onboardingTokenParamsSchema, body: completePersonalOnboardingBodySchema }),
  postCompleteRegister,
);
onboardingRouter.post(
  '/:token/complete-business',
  onboardingRateLimiter,
  validate({ params: onboardingTokenParamsSchema }),
  postCompleteBusiness,
);
onboardingRouter.post(
  '/:token/complete',
  requireAuth,
  validate({ params: onboardingTokenParamsSchema, body: completeAuthenticatedOnboardingBodySchema }),
  postCompleteAuthenticated,
);

export const platformOnboardingRouter = Router();
platformOnboardingRouter.use(requireAuth, requirePlatformAdmin);
platformOnboardingRouter.get('/stats', getStats);
platformOnboardingRouter.get('/answers', getAdminAnswers);
platformOnboardingRouter.get('/questions', getAdminQuestions);
platformOnboardingRouter.post(
  '/questions',
  validate({ body: upsertQuestionBodySchema }),
  postAdminQuestion,
);
platformOnboardingRouter.post(
  '/questions/reorder',
  validate({ body: reorderBodySchema }),
  postAdminQuestionsReorder,
);
platformOnboardingRouter.patch(
  '/questions/:id',
  validate({ params: idParamsSchema, body: upsertQuestionBodySchema }),
  patchAdminQuestion,
);
platformOnboardingRouter.post(
  '/questions/:id/deactivate',
  validate({ params: idParamsSchema }),
  postAdminQuestionDeactivate,
);
platformOnboardingRouter.get('/needs', getAdminNeeds);
platformOnboardingRouter.post('/needs', validate({ body: upsertNeedBodySchema }), postAdminNeed);
platformOnboardingRouter.post(
  '/needs/reorder',
  validate({ body: reorderBodySchema }),
  postAdminNeedsReorder,
);
platformOnboardingRouter.patch(
  '/needs/:id',
  validate({ params: idParamsSchema, body: upsertNeedBodySchema }),
  patchAdminNeed,
);
platformOnboardingRouter.post(
  '/needs/:id/deactivate',
  validate({ params: idParamsSchema }),
  postAdminNeedDeactivate,
);
platformOnboardingRouter.get('/solutions', getAdminSolutions);
platformOnboardingRouter.post(
  '/solutions',
  validate({ body: upsertNeedBodySchema }),
  postAdminSolution,
);
platformOnboardingRouter.post(
  '/solutions/reorder',
  validate({ body: reorderBodySchema }),
  postAdminSolutionsReorder,
);
platformOnboardingRouter.patch(
  '/solutions/:id',
  validate({ params: idParamsSchema, body: upsertNeedBodySchema }),
  patchAdminSolution,
);
platformOnboardingRouter.post(
  '/solutions/:id/deactivate',
  validate({ params: idParamsSchema }),
  postAdminSolutionDeactivate,
);
platformOnboardingRouter.get('/mappings', getAdminMappings);
platformOnboardingRouter.post(
  '/mappings',
  validate({ body: upsertMappingBodySchema }),
  postAdminMapping,
);
platformOnboardingRouter.delete(
  '/mappings/:id',
  validate({ params: idParamsSchema }),
  deleteAdminMapping,
);
