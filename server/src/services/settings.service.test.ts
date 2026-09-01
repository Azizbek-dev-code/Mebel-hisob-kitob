import { STORE_RESET_CONFIRMATION, UserRole } from '@furniture-erp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../utils/api-error.js';

const { settingsRepoMock, backupRepoMock, auditMock } = vi.hoisted(() => ({
  settingsRepoMock: {
    findStoreProfile: vi.fn(),
    updateStoreProfile: vi.fn(),
  },
  backupRepoMock: {
    resetStoreData: vi.fn(),
  },
  auditMock: {
    recordAudit: vi.fn(async () => undefined),
  },
}));

vi.mock('../repositories/settings.repository.js', () => settingsRepoMock);
vi.mock('../repositories/backup.repository.js', () => backupRepoMock);
vi.mock('./audit.service.js', () => auditMock);

const {
  assertCanManageStoreSettings,
  canManageStoreSettings,
  getStoreProfile,
  resetStoreProfile,
  updateStoreProfile,
} = await import('./settings.service.js');

const STORE_ID = 'store_1';
const ADMIN = UserRole.ADMIN;
const EMPLOYEE = UserRole.EMPLOYEE;
const ADMIN_ID = 'user_admin';

const STORE = {
  id: STORE_ID,
  name: 'Mebel Savdo',
  phone: '+998901234567',
  address: 'Toshkent',
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
  updatedAt: '2026-08-19T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  settingsRepoMock.findStoreProfile.mockResolvedValue(STORE);
});

describe('settings.service permissions', () => {
  it('allows admin to manage settings', () => {
    expect(canManageStoreSettings(ADMIN)).toBe(true);
    expect(() => assertCanManageStoreSettings(ADMIN)).not.toThrow();
  });

  it('forbids employee updates', () => {
    expect(canManageStoreSettings(EMPLOYEE)).toBe(false);
    expect(() => assertCanManageStoreSettings(EMPLOYEE)).toThrow(ApiError);
  });

  it('allows any signed-in role to read', async () => {
    await expect(getStoreProfile(STORE_ID, EMPLOYEE)).resolves.toEqual(STORE);
  });

  it('forbids employee patch', async () => {
    await expect(
      updateStoreProfile(STORE_ID, EMPLOYEE, { name: 'New name' }),
    ).rejects.toThrow(ApiError);
    expect(settingsRepoMock.updateStoreProfile).not.toHaveBeenCalled();
  });
});

describe('settings.service update', () => {
  it('updates store profile for admin', async () => {
    settingsRepoMock.updateStoreProfile.mockResolvedValue({
      ...STORE,
      name: 'Yangi nom',
    });

    const result = await updateStoreProfile(STORE_ID, ADMIN, { name: '  Yangi nom  ' });

    expect(settingsRepoMock.updateStoreProfile).toHaveBeenCalledWith(STORE_ID, {
      name: 'Yangi nom',
    });
    expect(result.name).toBe('Yangi nom');
  });

  it('clears optional phone when empty string is sent', async () => {
    settingsRepoMock.updateStoreProfile.mockResolvedValue({ ...STORE, phone: null });

    await updateStoreProfile(STORE_ID, ADMIN, { phone: '   ' });

    expect(settingsRepoMock.updateStoreProfile).toHaveBeenCalledWith(STORE_ID, {
      phone: null,
    });
  });

  it('normalises valid phone numbers', async () => {
    settingsRepoMock.updateStoreProfile.mockResolvedValue({
      ...STORE,
      phone: '+998901111111',
    });

    await updateStoreProfile(STORE_ID, ADMIN, { phone: '901111111' });

    expect(settingsRepoMock.updateStoreProfile).toHaveBeenCalledWith(STORE_ID, {
      phone: '+998901111111',
    });
  });

  it('rejects invalid phone numbers', async () => {
    await expect(
      updateStoreProfile(STORE_ID, ADMIN, { phone: '123' }),
    ).rejects.toThrow(ApiError);
  });

  it('rejects unsupported timezone', async () => {
    await expect(
      updateStoreProfile(STORE_ID, ADMIN, { timezone: 'Europe/London' }),
    ).rejects.toThrow(ApiError);
  });

  it('requires at least one field', async () => {
    await expect(updateStoreProfile(STORE_ID, ADMIN, {})).rejects.toThrow(ApiError);
  });

  it('returns not found when store is missing', async () => {
    settingsRepoMock.findStoreProfile.mockResolvedValue(null);

    await expect(getStoreProfile(STORE_ID, ADMIN)).rejects.toThrow(ApiError);
  });
});

describe('settings.service reset', () => {
  it('resets store data for admin with exact confirmation', async () => {
    backupRepoMock.resetStoreData.mockResolvedValue({
      deletedCounts: { sales: 3, customers: 1 },
      totalDeletedRows: 4,
      retainedUserId: ADMIN_ID,
    });

    const result = await resetStoreProfile(
      STORE_ID,
      { id: ADMIN_ID, role: ADMIN },
      STORE_RESET_CONFIRMATION,
    );

    expect(backupRepoMock.resetStoreData).toHaveBeenCalledWith({
      storeId: STORE_ID,
      actorId: ADMIN_ID,
    });
    expect(result.totalDeletedRows).toBe(4);
    expect(auditMock.recordAudit).toHaveBeenCalled();
  });

  it('rejects wrong confirmation phrase', async () => {
    await expect(
      resetStoreProfile(STORE_ID, { id: ADMIN_ID, role: ADMIN }, 'reset'),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.resetStoreData).not.toHaveBeenCalled();
  });

  it('forbids employees from reset', async () => {
    await expect(
      resetStoreProfile(STORE_ID, { id: 'user_ali', role: EMPLOYEE }, STORE_RESET_CONFIRMATION),
    ).rejects.toThrow(ApiError);
    expect(backupRepoMock.resetStoreData).not.toHaveBeenCalled();
  });
});
