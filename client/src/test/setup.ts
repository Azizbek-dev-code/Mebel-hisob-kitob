import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Registered explicitly rather than via the `@testing-library/jest-dom/vitest`
// side-effect entry, which does not hook into Vitest 4's expect instance.
expect.extend(jestDomMatchers);

afterEach(() => {
  cleanup();
});
