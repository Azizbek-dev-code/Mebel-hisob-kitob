import { describe, expect, it } from 'vitest';

import {
  StoreCreationRequestStatus,
  STORE_CREATION_STATUS_LABELS,
} from '../constants/enums.js';
import { UZBEKISTAN_REGIONS } from '../constants/regions.js';
import { AuditEntityType, AuditEventType } from '../constants/audit.js';
import {
  applicantFullName,
  formatStoreCreationDate,
  normalizeEmail,
  normalizeStoreName,
  normalizeUsername,
  validateStoreCreationDraft,
  type StoreCreationDraft,
} from './validation.js';

function validDraft(overrides: Partial<StoreCreationDraft> = {}): StoreCreationDraft {
  return {
    applicantFirstName: 'Test',
    applicantLastName: 'Store Owner',
    phone: '+998901112233',
    email: 'owner@example.com',
    username: 'testowner',
    password: 'Owner123!',
    passwordConfirmation: 'Owner123!',
    storeName: 'TEST Furniture Store',
    region: 'Samarqand',
    district: 'Urgut',
    address: "Bog' ko'chasi 1",
    ...overrides,
  };
}

describe('StoreCreationRequestStatus', () => {
  it('has exactly the three platform-review states', () => {
    expect(Object.values(StoreCreationRequestStatus)).toEqual([
      'PENDING',
      'APPROVED',
      'REJECTED',
    ]);
  });

  it('exposes Uzbek labels for the status page', () => {
    expect(STORE_CREATION_STATUS_LABELS.PENDING).toBe('KUTILMOQDA');
    expect(STORE_CREATION_STATUS_LABELS.APPROVED).toBe('QABUL QILINDI');
    expect(STORE_CREATION_STATUS_LABELS.REJECTED).toBe('RAD ETILDI');
  });
});

describe('audit vocabulary', () => {
  it('includes store-creation events without credential names', () => {
    expect(AuditEventType.STORE_CREATION_REQUESTED).toBe('STORE_CREATION_REQUESTED');
    expect(AuditEventType.STORE_CREATION_APPROVED).toBe('STORE_CREATION_APPROVED');
    expect(AuditEventType.STORE_CREATION_REJECTED).toBe('STORE_CREATION_REJECTED');
    expect(AuditEntityType.STORE_CREATION_REQUEST).toBe('STORE_CREATION_REQUEST');
  });
});

describe('validateStoreCreationDraft', () => {
  it('accepts a complete valid application', () => {
    expect(validateStoreCreationDraft(validDraft())).toEqual([]);
  });

  it('normalises a 9-digit national phone before accepting it', () => {
    expect(validateStoreCreationDraft(validDraft({ phone: '901112233' }))).toEqual([]);
  });

  it('rejects missing required fields', () => {
    const errors = validateStoreCreationDraft(
      validDraft({
        applicantFirstName: '  ',
        applicantLastName: '',
        phone: '',
        email: '',
        username: '',
        password: '',
        passwordConfirmation: '',
        storeName: ' ',
        region: '',
        district: '',
        address: '',
      }),
    );
    const fields = errors.map((error) => error.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        'applicantFirstName',
        'applicantLastName',
        'phone',
        'email',
        'username',
        'password',
        'passwordConfirmation',
        'storeName',
        'region',
        'district',
        'address',
      ]),
    );
  });

  it('rejects an invalid phone', () => {
    const errors = validateStoreCreationDraft(validDraft({ phone: '123' }));
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'phone' }),
    );
  });

  it('rejects an invalid email', () => {
    const errors = validateStoreCreationDraft(validDraft({ email: 'not-an-email' }));
    expect(errors.some((error) => error.field === 'email')).toBe(true);
  });

  it('rejects a short password using the existing auth minimum', () => {
    const errors = validateStoreCreationDraft(
      validDraft({ password: 'short', passwordConfirmation: 'short' }),
    );
    expect(errors.some((error) => error.field === 'password')).toBe(true);
  });

  it('rejects a password confirmation mismatch', () => {
    const errors = validateStoreCreationDraft(
      validDraft({ password: 'Owner123!', passwordConfirmation: 'Other123!' }),
    );
    expect(errors).toContainEqual({
      field: 'passwordConfirmation',
      message: 'Parollar mos kelmadi',
    });
  });

  it('rejects a username with spaces', () => {
    const errors = validateStoreCreationDraft(validDraft({ username: 'bad name' }));
    expect(errors.some((error) => error.field === 'username')).toBe(true);
  });

  it('rejects a region that is not in the catalogue', () => {
    const errors = validateStoreCreationDraft(validDraft({ region: 'California' }));
    expect(errors.some((error) => error.field === 'region')).toBe(true);
  });

  it('never returns the password in error payloads', () => {
    const errors = validateStoreCreationDraft(
      validDraft({ password: 'Secret123!', passwordConfirmation: 'Nope123!' }),
    );
    const serialised = JSON.stringify(errors);
    expect(serialised).not.toContain('Secret123!');
    expect(serialised).not.toContain('Nope123!');
  });
});

describe('normalisers', () => {
  it('joins applicant names', () => {
    expect(applicantFullName('  Ali  ', '  Valiyev ')).toBe('Ali Valiyev');
  });

  it('collapses store-name whitespace', () => {
    expect(normalizeStoreName('  Fayz   Mebel  ')).toBe('Fayz Mebel');
  });

  it('lowercases username and email', () => {
    expect(normalizeUsername('Admin.User')).toBe('admin.user');
    expect(normalizeEmail('Owner@Example.COM')).toBe('owner@example.com');
  });
});

describe('UZBEKISTAN_REGIONS', () => {
  it('includes Samarqand for the documented example', () => {
    expect(UZBEKISTAN_REGIONS).toContain('Samarqand');
    expect(UZBEKISTAN_REGIONS.length).toBeGreaterThanOrEqual(14);
  });
});

describe('formatStoreCreationDate', () => {
  it('formats as dd.MM.yyyy in Tashkent time', () => {
    expect(formatStoreCreationDate('2026-08-21T12:00:00.000Z')).toBe('21.08.2026');
  });
});
