import { Router } from 'express';

import { requireAuth } from '../../../middleware/require-auth.js';
import { requirePersonalSession } from '../../../middleware/require-personal-session.js';
import { validate } from '../../../middleware/validate.js';
import { idParamsSchema } from '../../../validators/common.validators.js';

import {
  getTodayTodos,
  getTodos,
  patchTodo,
  postSuggestTodo,
  postTodo,
} from './personal-growth-todo.controller.js';
import {
  createTodoBodySchema,
  listTodosQuerySchema,
  suggestTodoBodySchema,
  updateTodoBodySchema,
} from './personal-growth-todo.validators.js';

export const personalGrowthTodoRouter = Router();
personalGrowthTodoRouter.use(requireAuth, requirePersonalSession);

personalGrowthTodoRouter.get(
  '/growth/todos',
  validate({ query: listTodosQuerySchema }),
  getTodos,
);
personalGrowthTodoRouter.get('/growth/todos/today', getTodayTodos);
personalGrowthTodoRouter.post(
  '/growth/todos/suggest',
  validate({ body: suggestTodoBodySchema }),
  postSuggestTodo,
);
personalGrowthTodoRouter.post(
  '/growth/todos',
  validate({ body: createTodoBodySchema }),
  postTodo,
);
personalGrowthTodoRouter.patch(
  '/growth/todos/:id',
  validate({ params: idParamsSchema, body: updateTodoBodySchema }),
  patchTodo,
);
