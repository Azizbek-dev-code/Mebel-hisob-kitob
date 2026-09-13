import {
  ACCOUNT_DELETE_CONFIRMATION,
  AccountDeletionReasonCode,
} from '@furniture-erp/shared';
import { z } from 'zod';

const reasonCodeSchema = z.enum([
  AccountDeletionReasonCode.NOT_NEEDED,
  AccountDeletionReasonCode.TOO_HARD,
  AccountDeletionReasonCode.MISSING_FEATURES,
  AccountDeletionReasonCode.SWITCHED_APP,
  AccountDeletionReasonCode.TOO_EXPENSIVE,
  AccountDeletionReasonCode.OTHER,
]);

export const deleteAccountBodySchema = z
  .object({
    password: z.string().min(1, 'Enter your password').max(128),
    confirmation: z.literal(ACCOUNT_DELETE_CONFIRMATION, {
      errorMap: () => ({ message: `Type ${ACCOUNT_DELETE_CONFIRMATION} exactly` }),
    }),
    reasonCode: reasonCodeSchema,
    reasonDetail: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.reasonCode === AccountDeletionReasonCode.OTHER && !value.reasonDetail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reasonDetail'],
        message: 'Please describe the other reason',
      });
    }
  });

export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;
