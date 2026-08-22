import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

/** Attaches a correlation id to every request and echoes it back as `X-Request-Id`. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get('X-Request-Id');
  req.requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
