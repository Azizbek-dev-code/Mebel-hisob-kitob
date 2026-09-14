import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_PERSONAL } from '@/test/auth-fixtures';
import { mockApi, SIGNED_OUT_RESPONSE } from '@/test/mock-api';
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

function renderForm(path = '/register-store') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
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
  it('renders the Uzbek title and required fields', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    renderForm();

    expect(await screen.findByRole('heading', { name: "Yangi do'kon ochish" })).toBeInTheDocument();
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
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.click(await screen.findByRole('button', { name: "Do'kon ochish uchun ariza yuborish" }));

    expect(await screen.findByText('Ismni kiriting')).toBeInTheDocument();
    expect(screen.getByText('Familiyani kiriting')).toBeInTheDocument();
  });

  it('rejects a password confirmation mismatch', async () => {
    mockApi({ '/auth/me': SIGNED_OUT_RESPONSE });
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.type(await screen.findByLabelText('Ism'), 'Test');
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
      '/auth/me': SIGNED_OUT_RESPONSE,
      '/store-requests': { status: 201, body: { success: true, data: { request: CREATED } } },
    });
    const user = userEvent.setup({ delay: null });
    renderForm();

    await user.type(await screen.findByLabelText('Ism'), 'Test');
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

    const storeCall = fetchMock.mock.calls.find(([url]) => String(url).includes('/store-requests'));
    expect(storeCall).toBeTruthy();
    const body = JSON.parse((storeCall?.[1] as RequestInit).body as string) as Record<string, string>;
    expect(body.password).toBe('Owner123!');
    expect(body.storeName).toBe('TEST Furniture Store');
    expect(body.businessType).toBe('FURNITURE');
  });

  it('skips identity fields for a signed-in personal session', async () => {
    const fetchMock = mockApi({
      '/auth/me': { status: 200, body: { success: true, data: { user: TEST_PERSONAL } } },
      '/accounts/business-requests': {
        status: 201,
        body: { success: true, data: { request: CREATED } },
      },
    });
    const user = userEvent.setup({ delay: null });
    renderForm('/register-store?businessType=CARPET');

    expect(await screen.findByRole('heading', { name: "Yangi do'kon ochish" })).toBeInTheDocument();
    expect(screen.queryByLabelText('Ism')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Login')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Telefon raqami'), '901112233');
    await user.type(screen.getByLabelText("Do'kon nomi"), 'Fayz Gilam');
    await user.selectOptions(screen.getByLabelText('Viloyat'), 'Samarqand');
    await user.type(screen.getByLabelText('Tuman/shahar'), 'Urgut');
    await user.type(screen.getByLabelText('Manzil'), "Bog' ko'chasi 1");
    await user.click(screen.getByRole('button', { name: "Do'kon ochish uchun ariza yuborish" }));

    expect(await screen.findByText('Pending screen')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/accounts/business-requests'));
    expect(call).toBeTruthy();
    const body = JSON.parse((call?.[1] as RequestInit).body as string) as Record<string, string>;
    expect(body.businessType).toBe('CARPET');
    expect(body.storeName).toBe('Fayz Gilam');
    expect(body.password).toBeUndefined();
    expect(body.email).toBeUndefined();
  });
});
