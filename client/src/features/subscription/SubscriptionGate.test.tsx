import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen } from '@/test/test-utils';

import { SubscriptionGate } from './SubscriptionGate';

describe('SubscriptionGate', () => {
  it('shows the same lock copy for every expired write action', () => {
    renderWithProviders(
      <MemoryRouter>
        <SubscriptionGate open onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /Tarif muddati tugagan/ })).toBeInTheDocument();
    expect(screen.getByText(/Sizning bepul sinov davringiz tugadi/)).toBeInTheDocument();
    expect(screen.getByText(/Ma'lumotlaringiz saqlanib turibdi/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tariflarni ko'rish/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keyinroq/ })).toBeInTheDocument();
  });
});
