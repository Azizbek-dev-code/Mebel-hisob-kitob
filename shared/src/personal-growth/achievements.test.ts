import { describe, expect, it } from 'vitest';

import {
  GROWTH_ACHIEVEMENT_CATALOG,
  listNewlyUnlockedAchievements,
  type AchievementStats,
} from './achievements.js';

const EMPTY: AchievementStats = {
  todosCompleted: 0,
  focusSessionsCompleted: 0,
  focusMinutesTotal: 0,
  bestStreak: 0,
  currentStreak: 0,
  habitCheckIns: 0,
  dailyGoalsDone: 0,
  learningGoalsCreated: 0,
  learningGoalsCompleted: 0,
  level: 1,
  savingGoalsCount: 0,
  friendsAccepted: 0,
  challengesJoined: 0,
  fightsCompleted: 0,
  bestFriendStreak: 0,
  expenseEntriesCount: 0,
  savingContributionsCount: 0,
};

describe('listNewlyUnlockedAchievements', () => {
  it('unlocks first-task when a todo is done', () => {
    const next = listNewlyUnlockedAchievements(
      { ...EMPTY, todosCompleted: 1 },
      new Set(),
    );
    expect(next.map((a) => a.key)).toContain('FIRST_TASK');
  });

  it('skips already unlocked keys', () => {
    const next = listNewlyUnlockedAchievements(
      {
        ...EMPTY,
        todosCompleted: 5,
        focusSessionsCompleted: 2,
        bestStreak: 8,
        level: 5,
      },
      new Set(['FIRST_TASK', 'FIRST_POMODORO']),
    );
    const keys = next.map((a) => a.key);
    expect(keys).toContain('STREAK_7');
    expect(keys).toContain('LEVEL_5');
    expect(keys).not.toContain('FIRST_TASK');
    expect(keys).not.toContain('FIRST_CHALLENGE');
  });

  it('requires 10h credited focus minutes', () => {
    const almost = listNewlyUnlockedAchievements(
      { ...EMPTY, focusMinutesTotal: 599 },
      new Set(),
    );
    expect(almost.map((a) => a.key)).not.toContain('FOCUS_10H');
    const done = listNewlyUnlockedAchievements(
      { ...EMPTY, focusMinutesTotal: 600 },
      new Set(),
    );
    expect(done.map((a) => a.key)).toContain('FOCUS_10H');
  });

  it('unlocks challenge and fight badges from social stats', () => {
    const next = listNewlyUnlockedAchievements(
      { ...EMPTY, challengesJoined: 1, fightsCompleted: 1, friendsAccepted: 1 },
      new Set(),
    );
    const keys = next.map((a) => a.key);
    expect(keys).toContain('FIRST_CHALLENGE');
    expect(keys).toContain('FIRST_FIGHT');
    expect(keys).toContain('FIRST_FRIEND');
  });

  it('unlocks finance discipline badges', () => {
    const next = listNewlyUnlockedAchievements(
      { ...EMPTY, expenseEntriesCount: 1, savingContributionsCount: 1, savingGoalsCount: 1 },
      new Set(),
    );
    const keys = next.map((a) => a.key);
    expect(keys).toContain('FIRST_EXPENSE_LOG');
    expect(keys).toContain('FIRST_SAVING_CONTRIB');
    expect(keys).toContain('FIRST_SAVING_GOAL');
  });

  it('keeps catalog keys unique', () => {
    const keys = GROWTH_ACHIEVEMENT_CATALOG.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
