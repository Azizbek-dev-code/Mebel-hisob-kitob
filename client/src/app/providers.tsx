import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/query-client';

/**
 * Wraps the tree in every cross-cutting provider.
 *
 * The query client is created in state rather than at module scope so each test
 * render — and each React StrictMode remount — gets an isolated cache.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
