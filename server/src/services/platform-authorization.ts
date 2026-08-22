import { UserRole } from '@furniture-erp/shared';

import { ApiError } from '../utils/api-error.js';

export function canReviewStoreCreationRequests(role: string): boolean {
  return role === UserRole.PLATFORM_ADMIN;
}

export function assertCanReviewStoreCreationRequests(role: string): void {
  if (!canReviewStoreCreationRequests(role)) {
    throw ApiError.forbidden("Faqat Platform Admin bu bo'limni ko'ra oladi");
  }
}
