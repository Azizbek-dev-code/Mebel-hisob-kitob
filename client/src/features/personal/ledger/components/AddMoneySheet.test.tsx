import { PersonalCategoryKind, PersonalWalletKind } from '@furniture-erp/shared';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';

import { AddMoneySheet } from './AddMoneySheet';

const WALLETS = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'wal_1',
          name: 'Naqd',
          kind: PersonalWalletKind.CASH,
          openingBalanceSom: 0,
          balanceSom: 10_000,
          sortOrder: 0,
          isArchived: false,
        },
        {
          id: 'wal_2',
          name: 'Karta',
          kind: PersonalWalletKind.CARD,
          openingBalanceSom: 0,
          balanceSom: 2_000,
          sortOrder: 1,
          isArchived: false,
        },
      ],
    },
  },
};

const CATEGORIES = {
  status: 200,
  body: {
    success: true,
    data: {
      items: [
        {
          id: 'cat_1',
          kind: PersonalCategoryKind.EXPENSE,
          key: 'food',
          name: 'Oziq-ovqat',
          color: 'teal',
          sortOrder: 0,
          isActive: true,
        },
        {
          id: 'cat_2',
          kind: PersonalCategoryKind.INCOME,
          key: 'salary',
          name: 'Oylik',
          color: 'green',
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AddMoneySheet', () => {
  it('offers income, expense and transfer without treating transfer as a category', async () => {
    mockApi({
      '/personal/wallets': WALLETS,
      '/personal/categories': CATEGORIES,
    });
    renderWithProviders(<AddMoneySheet open onClose={() => undefined} />);

    expect(await screen.findByRole('button', { name: 'Chiqim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'O‘tkazma' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Chiqim' }));
    expect((await screen.findAllByText('Oziq-ovqat')).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'O‘tkazma' }));

    expect(
      await screen.findByText('Pul hisobdan hisobga o‘tadi. Daromad yoki xarajat hisoblanmaydi.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Qayerdan')).toBeInTheDocument();
    expect(screen.getByText('Qayerga')).toBeInTheDocument();
    expect(screen.queryByText('Oziq-ovqat')).not.toBeInTheDocument();
  });

  it('posts a transfer between two wallets', async () => {
    const fetchMock = mockApi({
      '/personal/wallets': WALLETS,
      '/personal/categories': CATEGORIES,
      '/personal/transfers': { status: 201, body: { success: true, data: { transfer: { id: 'tr_1' } } } },
    });
    const onClose = vi.fn();
    renderWithProviders(<AddMoneySheet open onClose={onClose} />);

    await userEvent.click(await screen.findByRole('button', { name: 'O‘tkazma' }));
    const amount = await screen.findByLabelText('Summa');
    await userEvent.type(amount, '3000');
    await userEvent.click(screen.getByRole('button', { name: 'Saqlash' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const transferCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/personal/transfers'));
    expect(transferCall).toBeTruthy();
    const init = transferCall?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.fromWalletId).toBe('wal_1');
    expect(body.toWalletId).toBe('wal_2');
    expect(body.amount).toBe(3000);
  });
});
