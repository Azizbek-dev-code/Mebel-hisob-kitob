/**
 * Level unlock catalog — progressive status/rewards without gating core features.
 * Extend here (or later via admin DB) without locking Finance/Habits/Focus.
 */

export type GrowthLevelUnlockDefinition = {
  /** Stable key for i18n / analytics. */
  key: string;
  /** Minimum level required. */
  minLevel: number;
  /** i18n suffix under personal.levelUnlock.* */
  titleKey: string;
  hintKey: string;
};

export const GROWTH_LEVEL_UNLOCK_CATALOG: readonly GrowthLevelUnlockDefinition[] = [
  {
    key: 'ACHIEVEMENT_BADGE',
    minLevel: 5,
    titleKey: 'achievementBadge',
    hintKey: 'achievementBadgeHint',
  },
  {
    key: 'PROFILE_BADGE',
    minLevel: 10,
    titleKey: 'profileBadge',
    hintKey: 'profileBadgeHint',
  },
  {
    key: 'CUSTOMIZATION',
    minLevel: 15,
    titleKey: 'customization',
    hintKey: 'customizationHint',
  },
  {
    key: 'SPECIAL_CHALLENGE',
    minLevel: 20,
    titleKey: 'specialChallenge',
    hintKey: 'specialChallengeHint',
  },
  {
    key: 'RANKING_BADGE',
    minLevel: 25,
    titleKey: 'rankingBadge',
    hintKey: 'rankingBadgeHint',
  },
  {
    key: 'PROFILE_STATUS',
    minLevel: 30,
    titleKey: 'profileStatus',
    hintKey: 'profileStatusHint',
  },
  {
    key: 'ELITE_STATUS',
    minLevel: 50,
    titleKey: 'eliteStatus',
    hintKey: 'eliteStatusHint',
  },
];

export type GrowthLevelTitleDefinition = {
  minLevel: number;
  /** i18n suffix under personal.levelTitleName.* */
  titleKey: string;
};

/** Soft titles for level bands — presentation only. */
export const GROWTH_LEVEL_TITLES: readonly GrowthLevelTitleDefinition[] = [
  { minLevel: 1, titleKey: 'starter' },
  { minLevel: 5, titleKey: 'builder' },
  { minLevel: 10, titleKey: 'disciplined' },
  { minLevel: 15, titleKey: 'focused' },
  { minLevel: 20, titleKey: 'competitor' },
  { minLevel: 25, titleKey: 'challenger' },
  { minLevel: 30, titleKey: 'veteran' },
  { minLevel: 50, titleKey: 'elite' },
];

export function levelTitleKeyFor(level: number): string {
  let key = GROWTH_LEVEL_TITLES[0]!.titleKey;
  for (const row of GROWTH_LEVEL_TITLES) {
    if (level >= row.minLevel) key = row.titleKey;
  }
  return key;
}

export function unlocksForLevel(level: number): {
  unlocked: GrowthLevelUnlockDefinition[];
  next: GrowthLevelUnlockDefinition | null;
} {
  const unlocked = GROWTH_LEVEL_UNLOCK_CATALOG.filter((row) => level >= row.minLevel);
  const next = GROWTH_LEVEL_UNLOCK_CATALOG.find((row) => level < row.minLevel) ?? null;
  return { unlocked, next };
}
