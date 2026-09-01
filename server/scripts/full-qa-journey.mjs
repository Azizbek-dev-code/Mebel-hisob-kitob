/**
 * Live QA journey against a running API (BASE default http://localhost:4000).
 * Marker: FULL_QA_OK
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const ADMIN_USER = process.env.QA_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.QA_ADMIN_PASS ?? 'Admin123!';
const MARKER = `QA${Date.now().toString(36)}`;

let cookie = '';
const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${id}: ${detail}`);
}

async function request(method, path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const jar = Object.prototype.hasOwnProperty.call(options, 'cookie')
    ? options.cookie
    : cookie;
  if (jar) headers.Cookie = jar;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: res.status,
    body: await res.json().catch(() => ({})),
    setCookie: res.headers.get('set-cookie'),
  };
}

function mergeCookie(setCookie) {
  if (!setCookie) return;
  const parts = setCookie.split(/,(?=\s*[^;]+=)/);
  const next = cookie
    ? cookie
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  for (const part of parts) {
    const pair = part.split(';')[0]?.trim();
    if (!pair) continue;
    const name = pair.split('=')[0];
    const idx = next.findIndex((c) => c.startsWith(`${name}=`));
    if (idx >= 0) next[idx] = pair;
    else next.push(pair);
  }
  cookie = next.join('; ');
}

function dataOf(body) {
  return body?.data ?? body ?? {};
}

async function main() {
  console.log(`FULL QA against ${BASE} marker=${MARKER}`);

  // Successful login first (avoid burning rate-limit budget on intentional failures).
  let res = await request('POST', '/api/auth/login', {
    body: { identifier: ADMIN_USER, password: ADMIN_PASS },
  });
  mergeCookie(res.setCookie);
  record('AUTH_LOGIN', res.status === 200 && Boolean(cookie), `status=${res.status}`);

  res = await request('GET', '/api/auth/me');
  const me = dataOf(res.body).user ?? dataOf(res.body);
  record('AUTH_SESSION', res.status === 200 && Boolean(me.id), `role=${String(me.role)}`);

  res = await request('GET', '/api/workers', { cookie: '' });
  record('AUTH_UNAUTHORIZED', res.status === 401, `status=${res.status}`);

  const wrong = await request('POST', '/api/auth/login', {
    body: { identifier: ADMIN_USER, password: 'WrongPass!' },
    cookie: '',
  });
  record('AUTH_WRONG_PASSWORD', wrong.status === 401 || wrong.status === 400, `status=${wrong.status}`);

  const workerUser = `qa_multi_${MARKER}`;
  res = await request('POST', '/api/workers', {
    body: {
      firstName: 'QA',
      lastName: 'Multi',
      username: workerUser,
      password: 'Worker123!',
      phone: '+998901112233',
      responsibilities: ['SELLER', 'ASSEMBLER', 'DELIVERY', 'INSTALLER'],
    },
  });
  const worker = dataOf(res.body).worker ?? dataOf(res.body);
  const workerId = String(worker.id ?? '');
  record(
    'WORKER_MULTI_CREATE',
    res.status === 201 && workerId.length > 0,
    `id=${workerId} status=${res.status}`,
  );

  res = await request('GET', `/api/workers/${workerId}/profile-modules`);
  const modules = dataOf(res.body).modules ?? dataOf(res.body);
  const tabs = modules.tabs ?? [];
  record(
    'PROFILE_MODULES_ADMIN',
    res.status === 200 &&
      tabs.includes('GENERAL') &&
      tabs.includes('SELLER') &&
      tabs.includes('ASSEMBLER') &&
      tabs.includes('DELIVERY') &&
      tabs.includes('INSTALLER'),
    `status=${res.status} tabs=${tabs.join(',')}`,
  );

  res = await request('GET', '/api/customers/options?limit=5');
  let customers = dataOf(res.body).items ?? dataOf(res.body).options ?? [];
  let customerId = String(customers[0]?.id ?? '');
  if (!customerId) {
    res = await request('POST', '/api/customers', {
      body: {
        firstName: 'QA',
        lastName: MARKER,
        phone: `90${String(Date.now()).slice(-7)}`,
      },
    });
    customerId = String((dataOf(res.body).customer ?? dataOf(res.body)).id ?? '');
  }
  record('CUSTOMER_READY', Boolean(customerId), `id=${customerId}`);

  res = await request('GET', '/api/products/options?limit=5');
  const products = dataOf(res.body).items ?? dataOf(res.body).options ?? [];
  const productId = String(products[0]?.id ?? '');
  const unitPrice = Number(
    products[0]?.defaultSalePrice ?? products[0]?.salePrice ?? products[0]?.price ?? 10_000_000,
  );
  record('PRODUCT_READY', Boolean(productId), `id=${productId} price=${unitPrice}`);

  res = await request('POST', '/api/sales', {
    body: {
      customerId,
      sellerId: workerId,
      items: [{ productId, quantity: 1, unitPrice }],
      paymentType: 'DEPOSIT',
      payments: [{ amount: 1_000_000, method: 'CASH' }],
      assemblyRequired: true,
      assemblerId: workerId,
      installationCost: 500_000,
      deliveryRequired: true,
      deliveryPersonId: workerId,
      deliveryCost: 150_000,
      deliveryStatus: 'SCHEDULED',
      installationRequired: true,
      installerId: workerId,
      installerFee: 200_000,
    },
  });
  if (res.status >= 400) {
    console.log('SALE_CREATE_ERROR', JSON.stringify(res.body).slice(0, 600));
  }
  const sale = dataOf(res.body).sale ?? dataOf(res.body);
  const saleId = String(sale.id ?? '');
  record('SALE_CREATE', res.status === 201 && Boolean(saleId), `status=${res.status} sale=${saleId}`);

  res = await request('GET', `/api/workers/${workerId}/attributed-fees`);
  const feesBefore = dataOf(res.body).fees ?? dataOf(res.body);
  const deliveryBefore = Number(feesBefore.deliveryFeeTotal ?? 0);
  record('DELIVERY_SCHEDULED_NO_LEDGER', deliveryBefore === 0, `deliveryFeeTotal=${deliveryBefore}`);

  res = await request('GET', `/api/workers/${workerId}/tasks`);
  const tasks = dataOf(res.body).items ?? [];
  const task = tasks.find((t) => String(t.saleId) === saleId) ?? tasks[0];
  if (task?.id) {
    await request('PATCH', `/api/assembly-tasks/${String(task.id)}`, {
      body: { status: 'IN_PROGRESS' },
    });
    res = await request('PATCH', `/api/assembly-tasks/${String(task.id)}`, {
      body: { status: 'COMPLETED' },
    });
    record('ASSEMBLY_COMPLETE', res.status === 200, `status=${res.status}`);
    const dup = await request('PATCH', `/api/assembly-tasks/${String(task.id)}`, {
      body: { status: 'COMPLETED' },
    });
    record(
      'ASSEMBLY_DUP_COMPLETE',
      dup.status === 200 || dup.status === 400 || dup.status === 409,
      `status=${dup.status}`,
    );
  } else {
    record('ASSEMBLY_COMPLETE', false, 'no assembly task found');
    record('ASSEMBLY_DUP_COMPLETE', false, 'skipped');
  }

  res = await request('PATCH', `/api/sales/${saleId}`, {
    body: { deliveryStatus: 'COMPLETED' },
  });
  record('DELIVERY_COMPLETE', res.status === 200, `status=${res.status}`);

  await request('PATCH', `/api/sales/${saleId}`, {
    body: { installationStatus: 'IN_TRANSIT' },
  });
  res = await request('PATCH', `/api/sales/${saleId}`, {
    body: { installationStatus: 'COMPLETED' },
  });
  record('INSTALL_COMPLETE', res.status === 200, `status=${res.status}`);

  res = await request('GET', `/api/workers/${workerId}/attributed-fees`);
  const feesAfter = dataOf(res.body).fees ?? dataOf(res.body);
  const asm = Number(feesAfter.assemblerFeeTotal ?? 0);
  const del = Number(feesAfter.deliveryFeeTotal ?? 0);
  const inst = Number(feesAfter.installerFeeTotal ?? 0);
  record(
    'FEES_POSTED',
    asm >= 500_000 && del >= 150_000 && inst >= 200_000,
    `asm=${asm} del=${del} inst=${inst}`,
  );

  res = await request('GET', `/api/workers/${workerId}/profile-modules`);
  const mod2 = dataOf(res.body).modules ?? {};
  const finance = mod2.general?.finance ?? {};
  const earned = Number(finance.earned ?? 0);
  record(
    'PROFILE_EARNED_OPS',
    res.status === 200 && earned >= 850_000,
    `status=${res.status} earned=${earned}`,
  );

  res = await request('POST', '/api/worker-finances/transactions', {
    body: {
      workerId,
      type: 'PAYMENT',
      amount: 600_000,
      transactionDate: new Date().toISOString().slice(0, 10),
      description: `QA payment ${MARKER}`,
    },
  });
  if (res.status >= 400) {
    console.log('WORKER_PAYMENT_ERROR', JSON.stringify(res.body).slice(0, 400));
  }
  record('WORKER_PAYMENT', res.status === 201 || res.status === 200, `status=${res.status}`);

  res = await request('GET', `/api/worker-finances/workers/${workerId}/summary`);
  const summary = dataOf(res.body).summary ?? dataOf(res.body);
  const paid = Number(summary.totalPayments ?? 0);
  record('FINANCE_AFTER_PAY', paid >= 600_000, `paid=${paid} outstanding=${summary.netFinancialPosition}`);

  res = await request('GET', '/api/workers/fee-reconciliation');
  record('RECONCILIATION', res.status === 200, `status=${res.status}`);

  res = await request('POST', `/api/sales/${saleId}/cancel`, {
    body: { reason: `QA cancel ${MARKER}` },
  });
  record('SALE_CANCEL', res.status === 200 || res.status === 201, `status=${res.status}`);

  res = await request('GET', `/api/workers/${workerId}/profile-modules`);
  record('PROFILE_AFTER_CANCEL', res.status === 200, `status=${res.status}`);

  await request('POST', '/api/auth/logout');
  cookie = '';
  res = await request('POST', '/api/auth/login', {
    body: { identifier: workerUser, password: 'Worker123!' },
  });
  mergeCookie(res.setCookie);
  record('WORKER_LOGIN', res.status === 200, `status=${res.status}`);

  res = await request('GET', '/api/me/profile-modules');
  record(
    'ME_PROFILE_MODULES',
    res.status === 200 && Boolean(dataOf(res.body).modules?.tabs),
    `status=${res.status}`,
  );

  res = await request('GET', '/api/me/finances/summary');
  record('ME_FINANCES', res.status === 200, `status=${res.status}`);

  res = await request('GET', '/api/workers/nonexistent_other_store_id/profile-modules');
  record(
    'CROSS_STORE_WORKER_404',
    res.status === 404 || res.status === 403 || res.status === 422,
    `status=${res.status}`,
  );

  res = await request('POST', '/api/debts/fake_sale/payments', {
    body: { amount: 1000, method: 'CASH' },
  });
  record(
    'EMPLOYEE_DEBT_PAYMENT_FORBIDDEN',
    res.status === 403 || res.status === 404 || res.status === 422,
    `status=${res.status}`,
  );

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log('\n=== FULL_QA SUMMARY ===');
  console.log(`PASSED ${passed}/${results.length}`);
  if (failed.length) {
    console.log('FAILED:');
    for (const f of failed) console.log(` - ${f.id}: ${f.detail}`);
  } else {
    console.log('FULL_QA_OK');
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
