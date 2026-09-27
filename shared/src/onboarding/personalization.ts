/**
 * Personalized value-screen copy for Personal registration result.
 * Pure functions — safe for client and server.
 */

import { BiggestProblem, GrowthInterest, PersonalGoal } from './catalog.js';
import type { OnboardingAnswers } from './validation.js';

export interface PersonalValueCard {
  id: 'finance' | 'goals' | 'time' | 'growth' | 'results';
  titleUz: string;
  titleRu: string;
  bodyUz: string;
  bodyRu: string;
  /** Highlight when answers strongly match this pillar. */
  emphasized: boolean;
}

function asKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string' && value) return [value];
  return [];
}

export function buildPersonalValueCards(answers: OnboardingAnswers): PersonalValueCard[] {
  const goals = asKeys(answers.goals);
  const growth = asKeys(answers.growthInterests);
  const problem = typeof answers.biggestProblem === 'string' ? answers.biggestProblem : '';

  const financeHint =
    problem === BiggestProblem.DONT_KNOW_WHERE_MONEY_GOES
      ? 'Avval xarajatlaringizni ko‘rib chiqamiz.'
      : problem === BiggestProblem.CANT_HOLD_BUDGET
        ? 'Budjetni ushlab turish uchun oddiy reja bilan boshlaymiz.'
        : goals.includes(PersonalGoal.CUT_SPENDING)
          ? 'Xarajatlarni kamaytirish uchun kuzatuvni yoqamiz.'
          : 'Daromad, xarajat, hisoblar, kategoriyalar va budjetni bir joyda boshqarasiz.';

  const goalsHint =
    problem === BiggestProblem.HARD_TO_SAVE || goals.includes(PersonalGoal.SAVE_GOAL)
      ? 'Maqsad qo‘yib, unga qancha vaqt/pul kerakligini kuzatasiz.'
      : 'Maqsad qo‘yish va unga qancha vaqt/pul kerakligini kuzatish.';

  const timeEmphasis =
    growth.includes(GrowthInterest.DAILY_TASKS) ||
    growth.includes(GrowthInterest.FOCUS_POMODORO) ||
    growth.includes(GrowthInterest.GOALS) ||
    problem === BiggestProblem.CANT_MANAGE_TIME ||
    problem === BiggestProblem.HARD_TO_FOLLOW_PLANS;

  const timeHint = growth.includes(GrowthInterest.FOCUS_POMODORO)
    ? 'Pomodoro va reja orqali fokusni saqlaysiz.'
    : problem === BiggestProblem.CANT_MANAGE_TIME
      ? 'Vaqtingizni Calendar va vazifalar bilan tartibga solamiz.'
      : 'Reja, vazifalar, Calendar va Pomodoro orqali vaqtdan foydalanishni boshqarasiz.';

  const growthOnlyFinance = growth.length === 1 && growth[0] === GrowthInterest.FINANCE_ONLY;
  const growthEmphasis = !growthOnlyFinance && growth.length > 0;
  let growthHint =
    'O‘qish, kurs, IELTS, dasturlash, skill, habit va boshqa rivojlanish yo‘nalishlarini kuzatasiz.';
  if (growth.includes(GrowthInterest.IELTS_LANGUAGE)) {
    growthHint =
      'IELTS maqsadingizni reja, Pomodoro va progress orqali kuzatishingiz mumkin.';
  } else if (growth.includes(GrowthInterest.PROGRAMMING_SKILL)) {
    growthHint = 'Dasturlash / skill o‘rganishni kunlik reja va habitlar bilan kuzatasiz.';
  } else if (growthOnlyFinance) {
    growthHint = 'Hozircha moliyaga e’tibor — o‘sish modulini keyinroq ochishingiz mumkin.';
  }

  const resultsHint =
    problem === BiggestProblem.WANT_ONE_PLACE || problem === BiggestProblem.TOO_MANY_APPS
      ? 'Hammasi bitta joyda: progress, streak va natijalar ko‘rinadi.'
      : 'XP, Level, Streak, Achievement, Challenge va reyting orqali progressni ko‘rasiz.';

  return [
    {
      id: 'finance',
      titleUz: 'Moliya',
      titleRu: 'Финансы',
      bodyUz: financeHint,
      bodyRu: financeHint,
      emphasized:
        goals.includes(PersonalGoal.CONTROL_MONEY) ||
        goals.includes(PersonalGoal.CUT_SPENDING) ||
        goals.includes(PersonalGoal.BUILD_BUDGET) ||
        problem === BiggestProblem.DONT_KNOW_WHERE_MONEY_GOES ||
        problem === BiggestProblem.CANT_HOLD_BUDGET,
    },
    {
      id: 'goals',
      titleUz: 'Maqsadlar',
      titleRu: 'Цели',
      bodyUz: goalsHint,
      bodyRu: goalsHint,
      emphasized:
        goals.includes(PersonalGoal.SAVE_GOAL) || problem === BiggestProblem.HARD_TO_SAVE,
    },
    {
      id: 'time',
      titleUz: 'Vaqt',
      titleRu: 'Время',
      bodyUz: timeHint,
      bodyRu: timeHint,
      emphasized: timeEmphasis,
    },
    {
      id: 'growth',
      titleUz: 'O‘sish',
      titleRu: 'Рост',
      bodyUz: growthHint,
      bodyRu: growthHint,
      emphasized: growthEmphasis,
    },
    {
      id: 'results',
      titleUz: 'Natija',
      titleRu: 'Результат',
      bodyUz: resultsHint,
      bodyRu: resultsHint,
      emphasized:
        problem === BiggestProblem.WANT_ONE_PLACE || problem === BiggestProblem.TOO_MANY_APPS,
    },
  ];
}

export function personalReadyHeadline(answers: OnboardingAnswers): { uz: string; ru: string } {
  const problem = typeof answers.biggestProblem === 'string' ? answers.biggestProblem : '';
  if (problem === BiggestProblem.DONT_KNOW_WHERE_MONEY_GOES) {
    return {
      uz: 'Balancy xarajatlaringizni tushunishga tayyor.',
      ru: 'Balancy готов помочь понять ваши расходы.',
    };
  }
  return {
    uz: 'Balancy siz uchun tayyor.',
    ru: 'Balancy готов для вас.',
  };
}
