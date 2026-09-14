import type { RequestHandler } from 'express';

import { ApiError } from '../utils/api-error.js';

/** Personal Finance routes. Store ERP sessions are rejected here. */
export const requirePersonalSession: RequestHandler = (req, _res, next) => {
  if (!req.personalAuth) {
    throw ApiError.forbidden('Bu marshrut faqat shaxsiy moliya sessiyasi uchun.');
  }
  next();
};
