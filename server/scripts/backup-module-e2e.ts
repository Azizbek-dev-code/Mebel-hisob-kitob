/**
 * Admin backup create + list smoke against a live API.
 * Marker: BACKUP_MODULE_E2E_OK
 */
/* eslint-disable no-console */
const API = process.env.BACKUP_API_BASE ?? 'http://localhost:4000/api';

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'Admin123!' }),
  });
  if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);
  const cookie = loginRes.headers.getSetCookie?.()?.join('; ') ?? loginRes.headers.get('set-cookie') ?? '';
  if (!cookie) throw new Error('no session cookie');

  const headers = { Accept: 'application/json', Cookie: cookie.split(',')[0]!.split(';')[0]! };

  const forbidden = await fetch(`${API}/backups`, {
    headers: { Accept: 'application/json' },
  });
  if (forbidden.status !== 401) throw new Error(`expected 401 unauthenticated, got ${forbidden.status}`);

  const createRes = await fetch(`${API}/backups`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const createJson = (await createRes.json()) as {
    success: boolean;
    data?: { backup: { id: string; status: string; sizeBytes: number | null } };
    error?: { message: string };
  };
  if (!createRes.ok || !createJson.success) {
    throw new Error(`create failed: ${createJson.error?.message ?? createRes.status}`);
  }
  if (createJson.data!.backup.status !== 'SUCCEEDED') {
    throw new Error(`backup status ${createJson.data!.backup.status}`);
  }

  const listRes = await fetch(`${API}/backups`, { headers });
  const listJson = (await listRes.json()) as {
    success: boolean;
    data?: { backups: { id: string }[] };
  };
  if (!listRes.ok || !listJson.data?.backups.some((b) => b.id === createJson.data!.backup.id)) {
    throw new Error('created backup missing from list');
  }

  const dl = await fetch(`${API}/backups/${createJson.data!.backup.id}/download`, {
    headers: { Cookie: headers.Cookie, Accept: 'application/gzip' },
  });
  if (!dl.ok) throw new Error(`download failed: ${dl.status}`);
  const bytes = Buffer.from(await dl.arrayBuffer());
  if (bytes.length < 20) throw new Error('download too small');

  console.log('BACKUP_MODULE_E2E_OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
