import { describe, expect, it } from 'vitest';

import {
  FeatureKey,
  FEATURE_KEYS,
  STARTER_FEATURE_KEYS,
  TRIAL_FEATURE_KEYS,
  isUnsafeFreePlanFeatureSet,
  resolvePlanEntitlements,
} from './catalog.js';

describe('resolvePlanEntitlements', () => {
  it('does not give a free trial the START feature set', () => {
    const trial = resolvePlanEntitlements({
      isDefaultTrial: true,
      monthlyPrice: 0,
      enabledFeatureKeys: STARTER_FEATURE_KEYS,
      hasPlanFeatureRows: true,
    });
    const start = resolvePlanEntitlements({
      isDefaultTrial: false,
      monthlyPrice: 150_000,
      enabledFeatureKeys: STARTER_FEATURE_KEYS,
      hasPlanFeatureRows: true,
    });

    expect(trial.featureKeys).toEqual([...TRIAL_FEATURE_KEYS]);
    expect(trial.featuresRestricted).toBe(true);
    expect(trial.featureKeys).not.toContain(FeatureKey.INVENTORY);
    expect(trial.featureKeys).not.toContain(FeatureKey.WORKERS);
    expect(start.featureKeys).toEqual([...STARTER_FEATURE_KEYS]);
    expect(start.featureKeys).toContain(FeatureKey.INVENTORY);
  });

  it('clamps a free plan that was seeded with the whole catalog', () => {
    const resolved = resolvePlanEntitlements({
      isDefaultTrial: true,
      monthlyPrice: 0,
      enabledFeatureKeys: FEATURE_KEYS,
      hasPlanFeatureRows: true,
    });
    expect(resolved.featureKeys).toEqual([...TRIAL_FEATURE_KEYS]);
    expect(isUnsafeFreePlanFeatureSet(FEATURE_KEYS)).toBe(true);
  });

  it('falls back to the trial preset when a free plan has no rows', () => {
    const resolved = resolvePlanEntitlements({
      isDefaultTrial: true,
      monthlyPrice: 0,
      enabledFeatureKeys: [],
      hasPlanFeatureRows: false,
    });
    expect(resolved).toEqual({
      featureKeys: [...TRIAL_FEATURE_KEYS],
      featuresRestricted: true,
    });
  });

  it('keeps a legacy unpaid paid plan fully open', () => {
    const resolved = resolvePlanEntitlements({
      isDefaultTrial: false,
      monthlyPrice: 150_000,
      enabledFeatureKeys: [],
      hasPlanFeatureRows: false,
    });
    expect(resolved).toEqual({ featureKeys: [], featuresRestricted: false });
  });

  it('keeps a deliberately narrow trial selection', () => {
    const custom = [FeatureKey.DASHBOARD, FeatureKey.SALES];
    const resolved = resolvePlanEntitlements({
      isDefaultTrial: true,
      monthlyPrice: 0,
      enabledFeatureKeys: custom,
      hasPlanFeatureRows: true,
    });
    expect(resolved.featureKeys).toEqual(custom);
  });
});
