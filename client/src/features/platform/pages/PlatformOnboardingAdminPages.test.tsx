import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PLATFORM_ADMIN } from '@/test/auth-fixtures';
import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { PlatformOnboardingQuestionsPage } from './PlatformOnboardingAdminPages';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlatformOnboardingQuestionsPage', () => {
  it('lists admin-managed questions', async () => {
    mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PLATFORM_ADMIN } } },
      '/platform/onboarding/questions': {
        status: 200,
        body: {
          success: true,
          data: {
            items: [
              {
                id: 'q1',
                key: 'goals',
                audience: 'PERSONAL',
                businessType: null,
                promptUz: 'Moliyaviy maqsadingiz nima?',
                promptRu: 'Цель',
                hintUz: null,
                hintRu: null,
                answerType: 'MULTI',
                required: true,
                isActive: true,
                isSystem: false,
                sortOrder: 10,
                options: [],
              },
            ],
          },
        },
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <PlatformOnboardingQuestionsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Moliyaviy maqsadingiz nima?')).toBeInTheDocument();
    expect(screen.getByText(/PERSONAL/)).toBeInTheDocument();
  });
});
