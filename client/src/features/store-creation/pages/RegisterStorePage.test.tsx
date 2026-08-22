import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '@/test/mock-api';
import { renderWithProviders, screen } from '@/test/test-utils';

import { RegisterStorePage } from './RegisterStorePage';

const CREATED = {
  id: 'req_1',
  applicantFirstName: 'Test',
  applicantLastName: 'Store Owner',
  phone: '+998901112233',
  email: 'owner@example.com',
  username: 'testowner',
  storeName: 'TEST Furniture Store',
  region: 'Samarqand',
  district: 'Urgut',
  address: "Bog' ko'chasi 1",
  status: 'PENDING',
  rejectionReason: null,
  reviewedAt: null,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  createdStoreId: null,
};

function renderForm() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/register-store']}>
      <Routes>
        <Route path="/register-store" element={<RegisterStorePage />} />
        <Route path="/register-store/:id" element={<p>Pending screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RegisterStorePage', () => {
  it('renders the Uzbek title and required fields', () => {
    mockApi({});
    renderForm();

    expect(screen.getByRole('heading', { name: "Yangi do'kon ochish" })).toBeInTheDocument();
    expect(screen.getByLabelText('Ism')).toBeInTheDocument();
    expect(screen.getByLabelText('Familiya')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefon raqami')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText("Do'kon nomi")).toBeInTheDocument();
    expect(screen.getByLabelText('Viloyat')).toBeInTheDocument();
    expect(screen.getByLabelText('Tuman/shahar')).toBeInTheDocument();
    expect(screen.getByLabelText('Manzil')).toBeInTheDocument();
    expect(screen.getByLabelText('Login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Do'kon ochish uchun ariza yuborish" })).toBeInTheDocument();
  });

  it('blocks submit when required fields are empty', async () => {
    const fetchMock = mockApi({});
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(screen.getByRole('button', { name: "Do'kon ochish uchun ariza yuborish" }));

    expect(await screen.findByText('Ismni kiriting')).toBeInTheDocument();
    expect(screen.getByText('Familiyani kiriting')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a password confirmation mismatch', async () => {
    mockApi({});
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.type(screen.getByLabelText('Ism'), 'Test');
    await user.type(screen.getByLabelText('Familiya'), 'Store Owner');
    await user.type(screen.getByLabelText('Telefon raqami'), '901112233');
    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.type(screen.getByLabelText("Do'kon nomi"), 'TEST Furniture Store');
    await user.selectOptions(screen.getByLabelText('Viloyat'), 'Samarqand');
    await user.type(screen.getByLabelText('Tuman/shahar'), 'Urgut');
    await user.type(screen.getByLabelText('Manzil'), "Bog' ko'chasi 1");
    await user.type(screen.getByLabelText('Login'), 'testowner');
    await user.type(screen.getByLabelText('Password'), 'Owner123!');
    await user.type(screen.getByLabelText('Password confirmation'), 'Mismatch1');
    await user.click(screen.getByRole('button', { name: "Do'kon ochish uchun ariza yuborish" }));

    expect(await screen.findByText('Parollar mos kelmadi')).toBeInTheDocument();
  });

  it('submits and shows the pending screen', async () => {
    const fetchMock = mockApi({
      '/store-requests': { status: 201, body: { success: true, data: { request: CREATED } } },
    });
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.type(screen.getByLabelText('Ism'), 'Test');
    await user.type(screen.getByLabelText('Familiya'), 'Store Owner');
    await user.type(screen.getByLabelText('Telefon raqami'), '901112233');
    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.type(screen.getByLabelText("Do'kon nomi"), 'TEST Furniture Store');
    await user.selectOptions(screen.getByLabelText('Viloyat'), 'Samarqand');
    await user.type(screen.getByLabelText('Tuman/shahar'), 'Urgut');
    await user.type(screen.getByLabelText('Manzil'), "Bog' ko'chasi 1");
    await user.type(screen.getByLabelText('Login'), 'testowner');
    await user.type(screen.getByLabelText('Password'), 'Owner123!');
    await user.type(screen.getByLabelText('Password confirmation'), 'Owner123!');
    await user.click(screen.getByRole('button', { name: "Do'kon ochish uchun ariza yuborish" }));

    expect(await screen.findByText('Pending screen')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, string>;
    expect(body.password).toBe('Owner123!');
    expect(body.storeName).toBe('TEST Furniture Store');
  });
});
