import { z } from 'zod';

/**
 * Login checks presence only. Applying the password policy here would reject a
 * legitimate password chosen before the rules changed, and would tell an
 * attacker what the rules are.
 */
export const loginBodySchema = z.object({
  identifier: z
    .string({ required_error: 'Enter your username or email' })
    .trim()
    .min(1, 'Enter your username or email')
    .max(255, 'Username or email is too long'),
  password: z
    .string({ required_error: 'Enter your password' })
    .min(1, 'Enter your password')
    .max(128, 'Password is too long'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
