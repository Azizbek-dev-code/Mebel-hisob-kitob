/** Snapshot used by the achievement catalog predicates. */
export type AchievementStats = {
  todosCompleted: number;
  focusSessionsCompleted: number;
  focusMinutesTotal: number;
  bestStreak: number;
  currentStreak: number;
  habitCheckIns: number;
  dailyGoalsDone: number;
  learningGoalsCreated: number;
  learningGoalsCompleted: number;
  level: number;
  savingGoalsCount: number;
  friendsAccepted: number;
  challengesJoined: number;
  fightsCompleted: number;
  bestFriendStreak: number;
  expenseEntriesCount: number;
  savingContributionsCount: number;
};

export type GrowthAchievementDefinition = {
  key: string;
  /** i18n key suffix under personal.achievement.* */
  titleKey: string;
  hintKey: string;
  rewardXp: number;
  /** Social / later phases — shown locked until available. */
  comingSoon?: boolean;
  isUnlocked: (stats: AchievementStats) => boolean;
};

/**
 * Code catalog — add a row here to ship a new badge without a migration.
 * Fight / Challenge unlock once Phase 11 stats are live.
 */
export const GROWTH_ACHIEVEMENT_CATALOG: readonly GrowthAchievementDefinition[] = [
  {
    key: 'FIRST_TASK',
    titleKey: 'firstTask',
    hintKey: 'firstTaskHint',
    rewardXp: 25,
    isUnlocked: (s) => s.todosCompleted >= 1,
  },
  {
    key: 'FIRST_POMODORO',
    titleKey: 'firstPomodoro',
    hintKey: 'firstPomodoroHint',
    rewardXp: 25,
    isUnlocked: (s) => s.focusSessionsCompleted >= 1,
  },
  {
    key: 'FIRST_HABIT',
    titleKey: 'firstHabit',
    hintKey: 'firstHabitHint',
    rewardXp: 25,
    isUnlocked: (s) => s.habitCheckIns >= 1,
  },
  {
    key: 'FIRST_DAILY_GOAL',
    titleKey: 'firstDailyGoal',
    hintKey: 'firstDailyGoalHint',
    rewardXp: 25,
    isUnlocked: (s) => s.dailyGoalsDone >= 1,
  },
  {
    key: 'FIRST_LEARNING_GOAL',
    titleKey: 'firstLearningGoal',
    hintKey: 'firstLearningGoalHint',
    rewardXp: 30,
    isUnlocked: (s) => s.learningGoalsCreated >= 1,
  },
  {
    key: 'LEARNING_GOAL_COMPLETED',
    titleKey: 'learningGoalCompleted',
    hintKey: 'learningGoalCompletedHint',
    rewardXp: 50,
    isUnlocked: (s) => s.learningGoalsCompleted >= 1,
  },
  {
    key: 'STREAK_7',
    titleKey: 'streak7',
    hintKey: 'streak7Hint',
    rewardXp: 40,
    isUnlocked: (s) => Math.max(s.bestStreak, s.currentStreak) >= 7,
  },
  {
    key: 'STREAK_30',
    titleKey: 'streak30',
    hintKey: 'streak30Hint',
    rewardXp: 100,
    isUnlocked: (s) => Math.max(s.bestStreak, s.currentStreak) >= 30,
  },
  {
    key: 'FOCUS_10H',
    titleKey: 'focus10h',
    hintKey: 'focus10hHint',
    rewardXp: 60,
    isUnlocked: (s) => s.focusMinutesTotal >= 10 * 60,
  },
  {
    key: 'FOCUS_100H',
    titleKey: 'focus100h',
    hintKey: 'focus100hHint',
    rewardXp: 200,
    isUnlocked: (s) => s.focusMinutesTotal >= 100 * 60,
  },
  {
    key: 'LEVEL_5',
    titleKey: 'level5',
    hintKey: 'level5Hint',
    rewardXp: 40,
    isUnlocked: (s) => s.level >= 5,
  },
  {
    key: 'LEVEL_10',
    titleKey: 'level10',
    hintKey: 'level10Hint',
    rewardXp: 80,
    isUnlocked: (s) => s.level >= 10,
  },
  {
    key: 'FIRST_SAVING_GOAL',
    titleKey: 'firstSavingGoal',
    hintKey: 'firstSavingGoalHint',
    rewardXp: 30,
    isUnlocked: (s) => s.savingGoalsCount >= 1,
  },
  {
    key: 'FIRST_EXPENSE_LOG',
    titleKey: 'firstExpenseLog',
    hintKey: 'firstExpenseLogHint',
    rewardXp: 25,
    isUnlocked: (s) => s.expenseEntriesCount >= 1,
  },
  {
    key: 'FIRST_SAVING_CONTRIB',
    titleKey: 'firstSavingContrib',
    hintKey: 'firstSavingContribHint',
    rewardXp: 30,
    isUnlocked: (s) => s.savingContributionsCount >= 1,
  },
  {
    key: 'FIRST_FRIEND',
    titleKey: 'firstFriend',
    hintKey: 'firstFriendHint',
    rewardXp: 40,
    isUnlocked: (s) => s.friendsAccepted >= 1,
  },
  {
    key: 'FIRST_CHALLENGE',
    titleKey: 'firstChallenge',
    hintKey: 'firstChallengeHint',
    rewardXp: 40,
    isUnlocked: (s) => s.challengesJoined >= 1,
  },
  {
    key: 'FIRST_FIGHT',
    titleKey: 'firstFight',
    hintKey: 'firstFightHint',
    rewardXp: 50,
    isUnlocked: (s) => s.fightsCompleted >= 1,
  },
  {
    key: 'FRIEND_STREAK_7',
    titleKey: 'friendStreak7',
    hintKey: 'friendStreak7Hint',
    rewardXp: 60,
    isUnlocked: (s) => s.bestFriendStreak >= 7,
  },
] as const;

export type GrowthAchievementKey = (typeof GROWTH_ACHIEVEMENT_CATALOG)[number]['key'];

export function getAchievementDefinition(key: string): GrowthAchievementDefinition | undefined {
  return GROWTH_ACHIEVEMENT_CATALOG.find((item) => item.key === key);
}

/** Newly unlockable keys given stats + already unlocked set. */
export function listNewlyUnlockedAchievements(
  stats: AchievementStats,
  alreadyUnlocked: ReadonlySet<string>,
): GrowthAchievementDefinition[] {
  return GROWTH_ACHIEVEMENT_CATALOG.filter(
    (item) =>
      !item.comingSoon &&
      !alreadyUnlocked.has(item.key) &&
      item.isUnlocked(stats),
  );
}
