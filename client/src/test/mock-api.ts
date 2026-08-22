import { vi } from 'vitest';

export interface MockApiRoute {
  status: number;
  body?: unknown;
}

/** Matched against the request URL by substring, e.g. `'/auth/me'`. */
export type MockApiRoutes = Record<string, MockApiRoute>;

export const SIGNED_OUT_RESPONSE: MockApiRoute = {
  status: 401,
  body: {
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'You must be signed in to do that.' },
  },
};

/**
 * Replaces `fetch` with a router over the API paths a test cares about.
 *
 * Any request the test did not describe rejects loudly rather than falling
 * through to a stray response, which is how a component that quietly gained a
 * second API call would otherwise slip past its own test.
 */
export function mockApi(routes: MockApiRoutes): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const match = Object.entries(routes).find(([path]) => url.includes(path));

    if (!match) {
      return Promise.reject(new Error(`Unhandled request in test: ${url}`));
    }

    const [, route] = match;
    return Promise.resolve({
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: () => Promise.resolve(route.body),
    } as Response);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
