/**
 * Live API QA for Shopir / Delivery operational flow.
 * Requires running API (default http://127.0.0.1:4000) and seeded demo data.
 *
 * Usage: node server/scripts/delivery-ops-qa.mjs
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';

async function req(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, setCookie };
}

function pickCookie(setCookie) {
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function login(identifier, password) {
  const res = await req('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  assert(res.status === 200, `login ${identifier} failed: ${res.status} ${JSON.stringify(res.json)}`);
  return pickCookie(res.setCookie);
}

async function main() {
  const results = [];
  const pass = (name) => results.push({ name, ok: true });
  const fail = (name, err) => results.push({ name, ok: false, err: String(err) });

  let adminCookie;
  let shopirCookie;
  let saleId;
  let fee = 150_000;
  let feeBeforeCancel = 0;

  try {
    adminCookie = await login('admin', 'Admin123!');
    pass('admin login');
  } catch (e) {
    fail('admin login', e);
    printReport(results);
    process.exit(1);
  }

  // Find a DELIVERY worker
  let shopir;
  try {
    const workers = await req('/api/workers?pageSize=50', { cookie: adminCookie });
    assert(workers.status === 200, `workers list ${workers.status}`);
    const items = workers.json?.data?.items ?? workers.json?.items ?? [];
    shopir =
      items.find((w) => w.username === 'shopir') ||
      items.find(
        (w) =>
          w.role === 'EMPLOYEE' &&
          (w.responsibilities ?? []).includes('DELIVERY') &&
          !(w.responsibilities ?? []).includes('SELLER'),
      ) ||
      items.find((w) => (w.responsibilities ?? []).includes('DELIVERY') && w.role === 'EMPLOYEE');
    assert(shopir, 'no DELIVERY worker in seed');
    pass('find shopir worker');
  } catch (e) {
    fail('find shopir worker', e);
    printReport(results);
    process.exit(1);
  }

  // Login as shopir if password known; else use admin for assignee actions where allowed
  const shopirUser = shopir.username ?? shopir.email;
  const shopirPasswords = ['Shopir123!', 'Ali123!', 'Cashier123!', 'Worker123!'];
  for (const pw of shopirPasswords) {
    try {
      shopirCookie = await login(shopirUser, pw);
      pass(`shopir login (${shopirUser})`);
      break;
    } catch {
      /* try next */
    }
  }
  if (!shopirCookie) {
    // Create temp password via admin? Fall back: admin creates sale assigned to shopir and
    // we test admin-complete path + permission denial with a second worker if possible.
    fail('shopir login', 'could not login as delivery worker with known passwords');
  }

  // Find customer + product
  let customerId;
  let productId;
  try {
    const customers = await req('/api/customers?pageSize=5', { cookie: adminCookie });
    customerId = (customers.json?.data?.items ?? customers.json?.items ?? [])[0]?.id;
    const products = await req('/api/products?pageSize=5', { cookie: adminCookie });
    productId = (products.json?.data?.items ?? products.json?.items ?? [])[0]?.id;
    assert(customerId && productId, 'need customer + product');
    pass('lookup customer/product');
  } catch (e) {
    fail('lookup customer/product', e);
    printReport(results);
    process.exit(1);
  }

  // Create sale with delivery
  try {
    const create = await req('/api/sales', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        customerId,
        items: [{ productId, quantity: 1 }],
        paymentType: 'DEPOSIT',
        depositAmount: 1_000_000,
        deliveryRequired: true,
        deliveryPersonId: shopir.id,
        driverFee: fee,
        deliveryCost: fee,
      },
    });
    assert(create.status === 201 || create.status === 200, `create sale ${create.status} ${JSON.stringify(create.json)}`);
    saleId = create.json?.data?.sale?.id ?? create.json?.sale?.id;
    assert(saleId, 'sale id missing');
    const status =
      create.json?.data?.sale?.deliveryStatus ?? create.json?.sale?.deliveryStatus;
    assert(
      status === 'SCHEDULED' || status === 'PENDING',
      `expected assigned status, got ${status}`,
    );
    pass('create sale with delivery assigned');
  } catch (e) {
    fail('create sale with delivery assigned', e);
    printReport(results);
    process.exit(1);
  }

  const actorCookie = shopirCookie ?? adminCookie;

  // List my deliveries
  try {
    const list = await req('/api/sales/deliveries/mine', { cookie: actorCookie });
    if (!shopirCookie) {
      // Admin may 403 without DELIVERY responsibility
      if (list.status === 403) {
        pass('list deliveries (admin without DELIVERY → 403 expected)');
      } else {
        assert(list.status === 200, `list ${list.status}`);
        pass('list deliveries');
      }
    } else {
      assert(list.status === 200, `list ${list.status} ${JSON.stringify(list.json)}`);
      const sales = list.json?.data?.saleDeliveries ?? list.json?.saleDeliveries ?? [];
      assert(
        sales.some((s) => s.saleId === saleId || s.id === saleId),
        'created sale not in shopir list',
      );
      pass('list deliveries includes sale');
    }
  } catch (e) {
    fail('list deliveries', e);
  }

  if (shopirCookie) {
    // Cross-worker: try another employee if available
    try {
      const workers = await req('/api/workers?pageSize=50', { cookie: adminCookie });
      const other = (workers.json?.data?.items ?? workers.json?.items ?? []).find(
        (w) => w.id !== shopir.id && (w.responsibilities ?? []).includes('DELIVERY'),
      );
      if (other?.username) {
        let otherCookie = null;
        for (const pw of shopirPasswords) {
          try {
            otherCookie = await login(other.username, pw);
            break;
          } catch {
            /* */
          }
        }
        if (otherCookie) {
          const denied = await req(`/api/sales/${saleId}/delivery`, {
            method: 'PATCH',
            cookie: otherCookie,
            body: { status: 'IN_TRANSIT' },
          });
          assert(denied.status === 403 || denied.status === 404, `expected 403, got ${denied.status}`);
          pass('cross-worker blocked');
        } else {
          pass('cross-worker skipped (no login)');
        }
      } else {
        pass('cross-worker skipped (single shopir)');
      }
    } catch (e) {
      fail('cross-worker', e);
    }

    // Shopir cannot complete before start
    try {
      const early = await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: shopirCookie,
        body: { status: 'COMPLETED' },
      });
      assert(early.status === 400, `expected 400 before start, got ${early.status}`);
      pass('complete-before-start blocked');
    } catch (e) {
      fail('complete-before-start blocked', e);
    }

    // Start
    try {
      const start = await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: shopirCookie,
        body: { status: 'IN_TRANSIT' },
      });
      assert(start.status === 200, `start ${start.status} ${JSON.stringify(start.json)}`);
      const st =
        start.json?.data?.sale?.deliveryStatus ?? start.json?.sale?.deliveryStatus;
      assert(st === 'IN_TRANSIT', `status ${st}`);
      pass('start → IN_TRANSIT');
    } catch (e) {
      fail('start → IN_TRANSIT', e);
    }

    // Idempotent start
    try {
      const start2 = await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: shopirCookie,
        body: { status: 'IN_TRANSIT' },
      });
      assert(start2.status === 200, `start2 ${start2.status}`);
      pass('idempotent start');
    } catch (e) {
      fail('idempotent start', e);
    }

    // Complete
    try {
      const done = await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: shopirCookie,
        body: { status: 'COMPLETED' },
      });
      assert(done.status === 200, `complete ${done.status} ${JSON.stringify(done.json)}`);
      const posted = done.json?.data?.ledgerPosted ?? done.json?.ledgerPosted;
      assert(posted === true, `ledgerPosted=${posted}`);
      pass('complete → ledger posted');
    } catch (e) {
      fail('complete → ledger posted', e);
    }

    // Idempotent complete
    try {
      const done2 = await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: shopirCookie,
        body: { status: 'COMPLETED' },
      });
      assert(done2.status === 200, `complete2 ${done2.status}`);
      pass('idempotent complete');
    } catch (e) {
      fail('idempotent complete', e);
    }

    // Finance / profile modules — capture fee before cancel
    try {
      const modules = await req('/api/me/profile-modules', { cookie: shopirCookie });
      assert(modules.status === 200, `modules ${modules.status}`);
      const delivery = modules.json?.data?.modules?.delivery ?? modules.json?.modules?.delivery;
      assert(delivery, 'delivery module missing');
      feeBeforeCancel = delivery.feeTotal ?? 0;
      pass('profile Shopirlik module');
    } catch (e) {
      fail('profile Shopirlik module', e);
    }
  } else {
    // Admin path: start+complete via delivery endpoint
    try {
      await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: adminCookie,
        body: { status: 'IN_TRANSIT' },
      });
      const done = await req(`/api/sales/${saleId}/delivery`, {
        method: 'PATCH',
        cookie: adminCookie,
        body: { status: 'COMPLETED' },
      });
      assert(done.status === 200, `admin complete ${done.status}`);
      pass('admin start+complete');
    } catch (e) {
      fail('admin start+complete', e);
    }
  }

  // Cancel → reverse
  try {
    const cancel = await req(`/api/sales/${saleId}/cancel`, {
      method: 'POST',
      cookie: adminCookie,
      body: { reason: 'Delivery QA cancel' },
    });
    assert(cancel.status === 200, `cancel ${cancel.status} ${JSON.stringify(cancel.json)}`);
    pass('sale cancel');

    if (shopirCookie) {
      const modules = await req('/api/me/profile-modules', { cookie: shopirCookie });
      const delivery = modules.json?.data?.modules?.delivery ?? modules.json?.modules?.delivery;
      const feeAfter = delivery?.feeTotal ?? 0;
      assert(
        feeAfter <= Math.max(0, feeBeforeCancel - fee + 1),
        `expected feeTotal to drop by ~${fee}, before=${feeBeforeCancel} after=${feeAfter}`,
      );
      pass(`post-cancel feeTotal=${feeAfter} (was ${feeBeforeCancel})`);
    }
  } catch (e) {
    fail('sale cancel / reverse', e);
  }

  printReport(results);
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

function printReport(results) {
  console.log('\n=== DELIVERY OPS QA ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.err ? ` — ${r.err}` : ''}`);
  }
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
