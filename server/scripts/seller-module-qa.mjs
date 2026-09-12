/**
 * Live Seller module QA against a running API (default http://localhost:4000).
 * Marker: SELLER_QA_OK
 *
 * Vali (cashier seller) gets the two NET-PROFIT 15% sales and is left unpaid
 * so the browser journey can pay / cancel. Isolated workers cover the other
 * commission types, multi-responsibility, security, overpay, edit, duplicate.
 */
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4000';
const ADMIN_USER = process.env.QA_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.QA_ADMIN_PASS ?? 'Admin123!';
const CASHIER_USER = process.env.QA_CASHIER_USER ?? 'cashier';
const CASHIER_PASS = process.env.QA_CASHIER_PASS ?? 'Cashier123!';
const MARKER = `SQA${Date.now().toString(36)}`;
const TODAY = new Date().toISOString().slice(0, 10);

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

async function login(identifier, password) {
  cookie = '';
  const res = await request('POST', '/api/auth/login', {
    body: { identifier, password },
    cookie: '',
  });
  mergeCookie(res.setCookie);
  return res;
}

async function createWorker(body) {
  const res = await request('POST', '/api/workers', { body });
  const worker = dataOf(res.body).worker ?? dataOf(res.body);
  if (res.status >= 400) {
    console.log('WORKER_CREATE_ERROR', JSON.stringify(res.body).slice(0, 500));
  }
  return { res, worker, id: String(worker.id ?? '') };
}

async function addRule(workerId, type, value) {
  return request('POST', `/api/workers/${workerId}/compensation-rules`, {
    body: {
      responsibility: 'SELLER',
      type,
      value,
      effectiveFrom: TODAY,
      isActive: true,
    },
  });
}

async function createSale(input) {
  const res = await request('POST', '/api/sales', { body: input });
  if (res.status >= 400) {
    console.log('SALE_CREATE_ERROR', JSON.stringify(res.body).slice(0, 700));
  }
  const sale = dataOf(res.body).sale ?? dataOf(res.body);
  return { res, sale, id: String(sale.id ?? '') };
}

function reportSummary(report) {
  return report?.summary ?? report ?? {};
}

async function sellerReport(workerId, preset = 'THIS_MONTH') {
  const res = await request('GET', `/api/workers/${workerId}/seller-report?preset=${preset}`);
  const report = dataOf(res.body).report ?? dataOf(res.body);
  return { res, report, summary: reportSummary(report) };
}

async function profileModules(workerId) {
  const res = await request('GET', `/api/workers/${workerId}/profile-modules`);
  return { res, modules: dataOf(res.body).modules ?? dataOf(res.body) };
}

async function main() {
  console.log(`SELLER QA against ${BASE} marker=${MARKER}`);

  let res = await login(ADMIN_USER, ADMIN_PASS);
  record('AUTH_ADMIN', res.status === 200 && Boolean(cookie), `status=${res.status}`);

  res = await request('GET', '/api/workers?search=Vali&pageSize=20');
  const workers = dataOf(res.body).items ?? dataOf(res.body).workers ?? [];
  const vali =
    workers.find((w) => String(w.username) === 'cashier') ??
    workers.find((w) => String(w.fullName ?? '').includes('Vali'));
  const valiId = String(vali?.id ?? 'cmt8qtxla0009l7fwxkbqs2bq');
  record('VALI_FOUND', Boolean(valiId), `id=${valiId} name=${vali?.fullName ?? '?'}`);

  res = await request('GET', '/api/customers/options?limit=5');
  let customers = dataOf(res.body).items ?? dataOf(res.body).options ?? [];
  let customerId = String(customers[0]?.id ?? '');
  if (!customerId) {
    res = await request('POST', '/api/customers', {
      body: { firstName: 'Seller', lastName: MARKER, phone: `90${String(Date.now()).slice(-7)}` },
    });
    customerId = String((dataOf(res.body).customer ?? dataOf(res.body)).id ?? '');
  }
  record('CUSTOMER', Boolean(customerId), `id=${customerId}`);

  res = await request('GET', '/api/products/options?limit=8');
  const products = dataOf(res.body).items ?? dataOf(res.body).options ?? [];
  const product = products[0];
  const productId = String(product?.id ?? '');
  record('PRODUCT', Boolean(productId), `id=${productId} sku=${product?.sku ?? '?'}`);

  if (productId) {
    res = await request('POST', '/api/inventory/stock-in', {
      body: { productId, quantity: 20, reason: `Seller QA stock ${MARKER}` },
    });
    record(
      'STOCK_IN',
      res.status === 200 || res.status === 201,
      `status=${res.status}`,
    );
  }

  const sale1 = await createSale({
    customerId,
    sellerId: valiId,
    items: [{ productId, quantity: 1, unitCostPrice: 8_000_000, unitSalePrice: 10_000_000 }],
    paymentType: 'DEPOSIT',
    depositAmount: 0,
    notes: `${MARKER} SALE1`,
  });
  record(
    'VALI_SALE1',
    sale1.res.status === 201 &&
      Number(sale1.sale.totalSalePrice) === 10_000_000 &&
      Number(sale1.sale.netProfit) === 2_000_000 &&
      Number(sale1.sale.sellerCommissionEstimate) === 300_000,
    `status=${sale1.res.status} total=${sale1.sale.totalSalePrice} np=${sale1.sale.netProfit} est=${sale1.sale.sellerCommissionEstimate} id=${sale1.id}`,
  );

  const sale2 = await createSale({
    customerId,
    sellerId: valiId,
    items: [{ productId, quantity: 1, unitCostPrice: 6_000_000, unitSalePrice: 8_000_000 }],
    paymentType: 'DEPOSIT',
    depositAmount: 0,
    notes: `${MARKER} SALE2`,
  });
  record(
    'VALI_SALE2',
    sale2.res.status === 201 &&
      Number(sale2.sale.totalSalePrice) === 8_000_000 &&
      Number(sale2.sale.netProfit) === 2_000_000 &&
      Number(sale2.sale.sellerCommissionEstimate) === 300_000,
    `status=${sale2.res.status} total=${sale2.sale.totalSalePrice} np=${sale2.sale.netProfit} est=${sale2.sale.sellerCommissionEstimate} id=${sale2.id}`,
  );

  const valiReport = await sellerReport(valiId);
  const vr = valiReport.summary;
  record(
    'VALI_REPORT_600',
    valiReport.res.status === 200 &&
      Number(vr.earned) === 600_000 &&
      Number(vr.paid) === 0 &&
      Number(vr.outstanding) === 600_000 &&
      Number(vr.salesAmount) >= 18_000_000 &&
      Number(vr.salesCount) >= 2 &&
      Number(vr.netProfit) >= 4_000_000,
    `status=${valiReport.res.status} ${JSON.stringify(vr)}`,
  );

  const valiMod = await profileModules(valiId);
  const sellerMod = valiMod.modules.seller ?? {};
  record(
    'VALI_SELLER_TAB',
    valiMod.res.status === 200 &&
      Array.isArray(valiMod.modules.tabs) &&
      valiMod.modules.tabs.includes('SELLER') &&
      Number(sellerMod.earnedTotal ?? sellerMod.earned ?? 0) === 600_000,
    `tabs=${(valiMod.modules.tabs ?? []).join(',')} earned=${sellerMod.earnedTotal ?? sellerMod.earned} month=${sellerMod.earnedMonth}`,
  );

  // --- Three commission types on isolated workers ---
  const typeA = await createWorker({
    firstName: 'TypeA',
    lastName: MARKER,
    username: `qa_a_${MARKER}`.slice(0, 40),
    password: 'Worker123!',
    responsibilities: ['SELLER'],
  });
  const typeB = await createWorker({
    firstName: 'TypeB',
    lastName: MARKER,
    username: `qa_b_${MARKER}`.slice(0, 40),
    password: 'Worker123!',
    responsibilities: ['SELLER'],
  });
  const typeC = await createWorker({
    firstName: 'TypeC',
    lastName: MARKER,
    username: `qa_c_${MARKER}`.slice(0, 40),
    password: 'Worker123!',
    responsibilities: ['SELLER'],
  });
  record('WORKERS_ABC', Boolean(typeA.id && typeB.id && typeC.id), `A=${typeA.id} B=${typeB.id} C=${typeC.id}`);

  const ruleA = await addRule(typeA.id, 'PERCENT_OF_SALE', 1500);
  const ruleB = await addRule(typeB.id, 'PERCENT_OF_GROSS_PROFIT', 1500);
  const ruleC = await addRule(typeC.id, 'FIXED_PER_SALE', 100_000);
  record(
    'RULES_ABC',
    ruleA.status === 201 && ruleB.status === 201 && ruleC.status === 201,
    `A=${ruleA.status} B=${ruleB.status} C=${ruleC.status}`,
  );

  const saleA = await createSale({
    customerId,
    sellerId: typeA.id,
    items: [{ productId, quantity: 1, unitCostPrice: 8_000_000, unitSalePrice: 10_000_000 }],
    paymentType: 'DEPOSIT',
    notes: `${MARKER} TYPE_A`,
  });
  record(
    'TYPE_PERCENT_OF_SALE',
    saleA.res.status === 201 && Number(saleA.sale.sellerCommissionEstimate) === 1_500_000,
    `est=${saleA.sale.sellerCommissionEstimate} expected=1500000`,
  );

  const saleBNeg = await createSale({
    customerId,
    sellerId: typeB.id,
    items: [{ productId, quantity: 1, unitCostPrice: 12_000_000, unitSalePrice: 10_000_000 }],
    paymentType: 'DEPOSIT',
    notes: `${MARKER} TYPE_B_NEG`,
  });
  record(
    'TYPE_NET_PROFIT_NEGATIVE_ZERO',
    saleBNeg.res.status === 201 && Number(saleBNeg.sale.sellerCommissionEstimate) === 0,
    `np=${saleBNeg.sale.netProfit} est=${saleBNeg.sale.sellerCommissionEstimate}`,
  );

  const saleB = await createSale({
    customerId,
    sellerId: typeB.id,
    items: [{ productId, quantity: 1, unitCostPrice: 8_000_000, unitSalePrice: 10_000_000 }],
    paymentType: 'DEPOSIT',
    notes: `${MARKER} TYPE_B`,
  });
  record(
    'TYPE_PERCENT_OF_NET_PROFIT',
    saleB.res.status === 201 && Number(saleB.sale.sellerCommissionEstimate) === 300_000,
    `est=${saleB.sale.sellerCommissionEstimate} expected=300000`,
  );

  const saleC = await createSale({
    customerId,
    sellerId: typeC.id,
    items: [{ productId, quantity: 1, unitCostPrice: 8_000_000, unitSalePrice: 10_000_000 }],
    paymentType: 'DEPOSIT',
    notes: `${MARKER} TYPE_C`,
  });
  record(
    'TYPE_FIXED_PER_SALE',
    saleC.res.status === 201 && Number(saleC.sale.sellerCommissionEstimate) === 100_000,
    `est=${saleC.sale.sellerCommissionEstimate} expected=100000`,
  );

  const reportA = await sellerReport(typeA.id);
  record(
    'TYPE_A_EARNED',
    Number(reportA.summary.earned) === 1_500_000,
    `earned=${reportA.summary.earned}`,
  );
  const reportB = await sellerReport(typeB.id);
  record(
    'TYPE_B_EARNED_NO_NEG',
    Number(reportB.summary.earned) === 300_000,
    `earned=${reportB.summary.earned} (neg sale must not add commission)`,
  );
  const reportC = await sellerReport(typeC.id);
  record(
    'TYPE_C_EARNED',
    Number(reportC.summary.earned) === 100_000,
    `earned=${reportC.summary.earned}`,
  );

  // Overpay block on Type C (earned 100k)
  res = await request('POST', '/api/worker-finances/transactions', {
    body: {
      workerId: typeC.id,
      type: 'PAYMENT',
      amount: 100_001,
      transactionDate: TODAY,
      description: `${MARKER} overpay`,
      responsibility: 'SELLER',
    },
  });
  record('OVERPAY_BLOCK', res.status === 422, `status=${res.status} ${JSON.stringify(res.body).slice(0, 180)}`);

  res = await request('POST', '/api/worker-finances/transactions', {
    body: {
      workerId: typeC.id,
      type: 'PAYMENT',
      amount: 100_000,
      transactionDate: TODAY,
      description: `${MARKER} pay C`,
      responsibility: 'SELLER',
    },
  });
  record('PAY_C_OK', res.status === 201 || res.status === 200, `status=${res.status}`);

  // Sale edit: change Type A sale price 10M → 12M → commission 1.5M → 1.8M (15% of sale)
  res = await request('PATCH', `/api/sales/${saleA.id}`, {
    body: {
      items: [{ productId, quantity: 1, unitCostPrice: 8_000_000, unitSalePrice: 12_000_000 }],
    },
  });
  if (res.status >= 400) {
    console.log('SALE_EDIT_ERROR', JSON.stringify(res.body).slice(0, 500));
  }
  const edited = dataOf(res.body).sale ?? dataOf(res.body);
  record(
    'SALE_EDIT_ESTIMATE',
    res.status === 200 && Number(edited.sellerCommissionEstimate) === 1_800_000,
    `status=${res.status} est=${edited.sellerCommissionEstimate}`,
  );
  const reportA2 = await sellerReport(typeA.id);
  record(
    'SALE_EDIT_REPOST',
    Number(reportA2.summary.earned) === 1_800_000,
    `earned=${reportA2.summary.earned} expected=1800000`,
  );

  // Duplicate complete: pay remaining then complete twice should not double commission
  res = await request('POST', `/api/sales/${saleB.id}/payments`, {
    body: { amount: 10_000_000, method: 'CASH' },
  });
  record(
    'SALE_B_PAY_COMPLETE',
    res.status === 200 || res.status === 201,
    `status=${res.status}`,
  );
  const beforeDup = await sellerReport(typeB.id);
  res = await request('POST', `/api/sales/${saleB.id}/payments`, {
    body: { amount: 1, method: 'CASH' },
  });
  const afterDup = await sellerReport(typeB.id);
  record(
    'DUP_COMPLETE_NO_DOUBLE',
    Number(beforeDup.summary.earned) === 300_000 && Number(afterDup.summary.earned) === 300_000,
    `before=${beforeDup.summary.earned} after=${afterDup.summary.earned} pay2=${res.status}`,
  );

  // Multi-responsibility: SELLER + ASSEMBLER, 500k fixed seller + 300k assembler fee
  const multi = await createWorker({
    firstName: 'Multi',
    lastName: MARKER,
    username: `qa_m_${MARKER}`.slice(0, 40),
    password: 'Worker123!',
    responsibilities: ['SELLER', 'ASSEMBLER'],
  });
  record('MULTI_WORKER', Boolean(multi.id), `id=${multi.id}`);
  await addRule(multi.id, 'FIXED_PER_SALE', 500_000);
  const saleM = await createSale({
    customerId,
    sellerId: multi.id,
    assemblerId: multi.id,
    assemblerFee: 300_000,
    items: [{ productId, quantity: 1, unitCostPrice: 1_000_000, unitSalePrice: 2_000_000 }],
    paymentType: 'DEPOSIT',
    notes: `${MARKER} MULTI`,
  });
  record('MULTI_SALE', saleM.res.status === 201, `status=${saleM.res.status} id=${saleM.id}`);

  res = await request('GET', `/api/workers/${multi.id}/tasks`);
  const tasks = dataOf(res.body).items ?? [];
  const task = tasks.find((t) => String(t.saleId) === saleM.id) ?? tasks[0];
  if (task?.id) {
    await request('PATCH', `/api/assembly-tasks/${String(task.id)}`, {
      body: { status: 'IN_PROGRESS' },
    });
    res = await request('PATCH', `/api/assembly-tasks/${String(task.id)}`, {
      body: { status: 'COMPLETED' },
    });
    record('MULTI_ASSEMBLY_DONE', res.status === 200, `status=${res.status}`);
    const dupAsm = await request('PATCH', `/api/assembly-tasks/${String(task.id)}`, {
      body: { status: 'COMPLETED' },
    });
    record(
      'MULTI_ASSEMBLY_DUP',
      dupAsm.status === 200 || dupAsm.status === 400 || dupAsm.status === 409,
      `status=${dupAsm.status}`,
    );
  } else {
    record('MULTI_ASSEMBLY_DONE', false, 'no assembly task');
    record('MULTI_ASSEMBLY_DUP', false, 'skipped');
  }

  const multiMod = await profileModules(multi.id);
  const mSeller = multiMod.modules.seller ?? {};
  const mAsm = multiMod.modules.assembler ?? {};
  const gen = multiMod.modules.general ?? {};
  const tabs = multiMod.modules.tabs ?? [];
  record(
    'MULTI_TABS',
    tabs.includes('GENERAL') && tabs.includes('SELLER') && tabs.includes('ASSEMBLER'),
    `tabs=${tabs.join(',')}`,
  );
  record(
    'MULTI_SELLER_ISOLATED',
    Number(mSeller.earnedTotal ?? mSeller.earned ?? 0) === 500_000,
    `sellerEarned=${mSeller.earnedTotal ?? mSeller.earned}`,
  );
  record(
    'MULTI_ASSEMBLER_ISOLATED',
    Number(mAsm.earnedTotal ?? mAsm.earned ?? mAsm.feeTotal ?? 0) === 300_000,
    `assembler=${JSON.stringify({
      earned: mAsm.earnedTotal ?? mAsm.earned,
      fee: mAsm.feeTotal,
      keys: Object.keys(mAsm),
    }).slice(0, 240)}`,
  );
  const totalEarned = Number(gen.finance?.earned ?? gen.earned ?? 0);
  record(
    'MULTI_TOTAL_800',
    totalEarned === 800_000,
    `totalEarned=${totalEarned} finance=${JSON.stringify(gen.finance ?? {}).slice(0, 200)}`,
  );

  // Security: cashier (Vali) must not read Type A sales/finances/rules/payments
  const adminCookie = cookie;
  const cashierLogin = await login(CASHIER_USER, CASHIER_PASS);
  record('AUTH_CASHIER', cashierLogin.status === 200, `status=${cashierLogin.status}`);

  res = await request('GET', `/api/workers/${typeA.id}/sales`);
  record('SEC_OTHER_SALES', res.status === 403 || res.status === 404, `status=${res.status}`);

  res = await request('GET', `/api/workers/${typeA.id}/seller-report`);
  record('SEC_OTHER_REPORT', res.status === 403 || res.status === 404, `status=${res.status}`);

  res = await request('GET', `/api/worker-finances/workers/${typeA.id}/summary`);
  record('SEC_OTHER_FINANCES', res.status === 403 || res.status === 404, `status=${res.status}`);

  res = await request('POST', `/api/workers/${typeA.id}/compensation-rules`, {
    body: {
      responsibility: 'SELLER',
      type: 'FIXED_PER_SALE',
      value: 1,
      effectiveFrom: TODAY,
    },
  });
  record('SEC_RULE_UPDATE', res.status === 403, `status=${res.status}`);

  res = await request('POST', '/api/worker-finances/transactions', {
    body: {
      workerId: valiId,
      type: 'PAYMENT',
      amount: 1,
      transactionDate: TODAY,
      description: 'seller self pay',
    },
  });
  record('SEC_PAYMENT_CREATE', res.status === 403, `status=${res.status}`);

  res = await request('GET', '/api/me/seller-report?preset=THIS_MONTH');
  const myReport = reportSummary(dataOf(res.body).report ?? dataOf(res.body));
  record(
    'ME_SELLER_REPORT',
    res.status === 200 && Number(myReport.earned) === 600_000,
    `status=${res.status} earned=${myReport.earned}`,
  );

  res = await request('GET', '/api/me/sales?pageSize=50');
  const mySales = dataOf(res.body).items ?? [];
  const sawOther = mySales.some((s) => String(s.id) === saleA.id);
  record(
    'ME_SALES_OWN_ONLY',
    res.status === 200 && !sawOther && mySales.some((s) => String(s.id) === sale1.id),
    `status=${res.status} count=${mySales.length} sawOther=${sawOther}`,
  );

  cookie = adminCookie;

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- SELLER QA SUMMARY ---');
  console.log(`passed=${results.filter((r) => r.ok).length} failed=${failed.length} total=${results.length}`);
  if (failed.length) {
    for (const row of failed) console.log(`  FAIL ${row.id}: ${row.detail}`);
  } else {
    console.log('SELLER_QA_OK');
  }
  console.log(
    JSON.stringify({
      marker: MARKER,
      valiId,
      sale1: sale1.id,
      sale2: sale2.id,
      typeA: typeA.id,
      saleA: saleA.id,
      typeB: typeB.id,
      typeC: typeC.id,
      multi: multi.id,
    }),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
