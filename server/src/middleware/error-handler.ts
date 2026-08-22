import { ApiErrorCode, type ApiErrorResponse, type ApiFieldError } from '@furniture-erp/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../utils/logger.js';

interface NormalisedError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: ApiFieldError[];
  isOperational: boolean;
}

function normalise(error: unknown): NormalisedError {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
      isOperational: true,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      code: ApiErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
      isOperational: true,
    };
  }

  // Anything else is a bug. The real message is logged but never sent to the
  // client, so stack traces and SQL text cannot leak through the API.
  return {
    statusCode: 500,
    code: ApiErrorCode.INTERNAL_ERROR,
    message: 'Something went wrong',
    isOperational: false,
  };
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const normalised = normalise(error);

  const logContext = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: normalised.statusCode,
  };

  if (normalised.isOperational) {
    logger.warn(normalised.message, logContext);
  } else {
    logger.error(error instanceof Error ? error.message : 'Unknown error', {
      ...logContext,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: normalised.code,
      message: normalised.message,
      ...(normalised.details ? { details: normalised.details } : {}),
    },
  };

  if (!normalised.isOperational && !env.isProduction && error instanceof Error) {
    body.error.message = error.message;
  }

  res.status(normalised.statusCode).json(body);
};
