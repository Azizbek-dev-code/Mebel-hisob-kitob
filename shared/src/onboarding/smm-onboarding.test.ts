import { describe, expect, it } from 'vitest';

import {
  BusinessType,
  BUSINESS_TYPE_DESCRIPTIONS,
  BUSINESS_TYPE_LABELS_EN,
  ONBOARDING_LAUNCH_BUSINESS_TYPES,
} from '../constants/enums.js';
import { homePathForAuth, type AuthUser, type PersonalAuthUser } from '../types/auth.js';
import {
  FURNITURE_ONBOARDING_QUESTION_KEYS,
  ONBOARDING_SEED_QUESTIONS,
  SMM_ONBOARDING_SEED_QUESTIONS,
} from '../onboarding/seed-catalog.js';

describe('SMM Agency onboarding catalog', () => {
  it('includes SMM in the businessType seed options with localized labels', () => {
    const question = ONBOARDING_SEED_QUESTIONS.find((row) => row.key === 'businessType');
    expect(question).toBeTruthy();
    const smm = question?.options.find((option) => option.key === BusinessType.SMM);
    expect(smm?.labelUz).toBe('SMM Agentlik');
    expect(smm?.labelRu).toMatch(/SMM/);
    expect(BUSINESS_TYPE_LABELS_EN.SMM).toBe('SMM Agency');
    expect(BUSINESS_TYPE_DESCRIPTIONS.SMM.en).toMatch(/content plans/i);
    expect(BUSINESS_TYPE_DESCRIPTIONS.SMM.uz).toMatch(/projectlar/i);
  });

  it('seeds SMM questions with businessType SMM', () => {
    expect(SMM_ONBOARDING_SEED_QUESTIONS).toHaveLength(7);
    for (const question of SMM_ONBOARDING_SEED_QUESTIONS) {
      expect(question.businessType).toBe(BusinessType.SMM);
      expect(question.audience).toBe('BUSINESS');
      expect(ONBOARDING_SEED_QUESTIONS.some((row) => row.key === question.key)).toBe(true);
    }
    expect(SMM_ONBOARDING_SEED_QUESTIONS.map((row) => row.key)).toEqual([
      'smmAgencyName',
      'smmClientCount',
      'smmServices',
      'smmPlatforms',
      'smmTeamSize',
      'smmMainGoal',
      'smmCurrentTools',
    ]);
  });

  it('scopes furniture follow-up questions to FURNITURE', () => {
    for (const key of FURNITURE_ONBOARDING_QUESTION_KEYS) {
      const question = ONBOARDING_SEED_QUESTIONS.find((row) => row.key === key);
      expect(question?.businessType).toBe(BusinessType.FURNITURE);
    }
  });

  it('marks only launch business types active in businessType options', () => {
    const question = ONBOARDING_SEED_QUESTIONS.find((row) => row.key === 'businessType');
    const launch = new Set<string>(ONBOARDING_LAUNCH_BUSINESS_TYPES);
    expect(launch.has(BusinessType.FURNITURE)).toBe(true);
    expect(launch.has(BusinessType.SMM)).toBe(true);
    for (const option of question?.options ?? []) {
      expect(option.isActive).toBe(launch.has(option.key));
      if (option.key === BusinessType.FURNITURE || option.key === BusinessType.SMM) {
        expect(option.descriptionUz).toBeTruthy();
        expect(option.descriptionRu).toBeTruthy();
      }
    }
  });
});

describe('homePathForAuth', () => {
  const baseUser: AuthUser = {
    id: 'u1',
    email: 'a@b.c',
    username: 'admin',
    fullName: 'Admin',
    phone: null,
    role: 'ADMIN',
    responsibilities: [],
    storeId: 's1',
    storeName: 'Store',
  };

  it('routes personal users to the personal dashboard', () => {
    const personal: PersonalAuthUser = {
      kind: 'PERSONAL',
      id: 'idn',
      email: 'p@b.c',
      username: null,
      fullName: 'Person',
      phone: null,
      role: 'PERSONAL',
      responsibilities: [],
      storeId: null,
      storeName: 'Personal',
      workspaceId: 'w1',
      identityId: 'idn',
      membershipRole: 'OWNER',
      emailVerified: true,
    };
    expect(homePathForAuth(personal)).toBe('/personal/dashboard');
  });

  it('routes SMM businesses to SMM projects', () => {
    expect(homePathForAuth({ ...baseUser, businessType: BusinessType.SMM })).toBe('/smm/projects');
  });

  it('routes furniture businesses to the ERP dashboard', () => {
    expect(homePathForAuth({ ...baseUser, businessType: BusinessType.FURNITURE })).toBe('/dashboard');
  });
});
