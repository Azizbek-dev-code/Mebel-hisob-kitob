import { Router } from 'express';

import { getServiceInfo } from '../controllers/service-info.controller.js';

export const rootRouter = Router();

rootRouter.get('/', getServiceInfo);
