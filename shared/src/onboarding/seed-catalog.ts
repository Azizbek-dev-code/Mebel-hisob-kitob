import { BusinessType, OnboardingAnswerType, OnboardingAudience } from '../constants/enums.js';

import {
  ACCOUNT_PURPOSES,
  DISCOVERY_SOURCES,
  FIRST_SAVING_GOALS,
  HELP_WITH_OPTIONS,
  MONTHLY_INCOME_BANDS,
  OnboardingQuestionKey,
  PERSONAL_GOALS,
} from './catalog.js';

export interface OnboardingSeedOption {
  key: string;
  labelUz: string;
  labelRu: string;
  allowsOther?: boolean;
  sortOrder?: number;
}

export interface OnboardingSeedQuestion {
  key: string;
  audience: (typeof OnboardingAudience)[keyof typeof OnboardingAudience];
  businessType?: (typeof BusinessType)[keyof typeof BusinessType] | null;
  promptUz: string;
  promptRu: string;
  hintUz?: string | null;
  hintRu?: string | null;
  answerType: (typeof OnboardingAnswerType)[keyof typeof OnboardingAnswerType];
  required: boolean;
  isSystem?: boolean;
  sortOrder: number;
  options: OnboardingSeedOption[];
}

export interface OnboardingSeedNeed {
  key: string;
  labelUz: string;
  labelRu: string;
  sortOrder: number;
}

export interface OnboardingSeedMapping {
  questionKey: string;
  optionKey: string;
  needKey: string;
  solutionKey: string;
}

const PERSONAL_GOAL_LABELS: Record<string, { uz: string; ru: string }> = {
  CONTROL_EXPENSES: { uz: 'Xarajatlarni nazorat qilish', ru: 'Контролировать расходы' },
  START_SAVING: { uz: 'Pul yig‘ish', ru: 'Начать копить' },
  BUILD_BUDGET: { uz: 'Budjet tuzish', ru: 'Составить бюджет' },
  MANAGE_DEBT: { uz: 'Qarzlarni boshqarish', ru: 'Управлять долгами' },
  TRACK_INCOME: { uz: 'Daromadlarni kuzatish', ru: 'Отслеживать доходы' },
  IMPROVE_FINANCES: { uz: 'Moliyaviy maqsadga erishish', ru: 'Улучшить финансы' },
};

const DISCOVERY_LABELS: Record<string, { uz: string; ru: string }> = {
  INSTAGRAM: { uz: 'Instagram', ru: 'Instagram' },
  TELEGRAM: { uz: 'Telegram', ru: 'Telegram' },
  YOUTUBE: { uz: 'YouTube', ru: 'YouTube' },
  GOOGLE: { uz: 'Google', ru: 'Google' },
  FRIEND: { uz: 'Do‘stim tavsiya qildi', ru: 'Посоветовал друг' },
  OTHER: { uz: 'Boshqa', ru: 'Другое' },
};

const INCOME_LABELS: Record<string, { uz: string; ru: string }> = {
  UNDER_1M: { uz: '1 mln so‘mgacha', ru: 'До 1 млн сум' },
  FROM_1_TO_3M: { uz: '1–3 mln so‘m', ru: '1–3 млн сум' },
  FROM_3_TO_5M: { uz: '3–5 mln so‘m', ru: '3–5 млн сум' },
  FROM_5_TO_10M: { uz: '5–10 mln so‘m', ru: '5–10 млн сум' },
  OVER_10M: { uz: '10 mln so‘mdan yuqori', ru: 'Более 10 млн сум' },
  PREFER_NOT: { uz: 'Kiritishni xohlamayman', ru: 'Предпочитаю не указывать' },
  CUSTOM: { uz: 'O‘zim kiritaman', ru: 'Укажу сам' },
};

const HELP_LABELS: Record<string, { uz: string; ru: string }> = {
  TRACK_EXPENSES: { uz: 'Xarajatlarni yozish', ru: 'Записывать расходы' },
  BUDGET: { uz: 'Budjet', ru: 'Бюджет' },
  SAVE_FOR_GOAL: { uz: 'Maqsad uchun tejash', ru: 'Копить на цель' },
  ANALYTICS: { uz: 'Tahlil', ru: 'Аналитика' },
  TRACK_DEBT: { uz: 'Qarzlarni kuzatish', ru: 'Следить за долгами' },
  MANAGE_INCOME: { uz: 'Daromadni boshqarish', ru: 'Управлять доходом' },
};

const FIRST_GOAL_LABELS: Record<string, { uz: string; ru: string }> = {
  PHONE: { uz: 'Telefon', ru: 'Телефон' },
  CAR: { uz: 'Mashina', ru: 'Машина' },
  HOUSE: { uz: 'Uy', ru: 'Дом' },
  TRAVEL: { uz: 'Sayohat', ru: 'Путешествие' },
  SAVINGS: { uz: 'Jamg‘arma', ru: 'Накопления' },
  OTHER: { uz: 'Boshqa', ru: 'Другое' },
};

const BUSINESS_TYPE_LABELS: Record<string, { uz: string; ru: string }> = {
  FURNITURE: { uz: 'Mebel', ru: 'Мебель' },
  CARPET: { uz: 'Gilam', ru: 'Ковры' },
  CLOTHING: { uz: 'Kiyim', ru: 'Одежда' },
  ELECTRONICS: { uz: 'Telefon/Elektronika', ru: 'Электроника' },
  OTHER: { uz: 'Boshqa', ru: 'Другое' },
};

function labeled(
  keys: readonly string[],
  labels: Record<string, { uz: string; ru: string }>,
  otherKeys: readonly string[] = ['OTHER'],
): OnboardingSeedOption[] {
  return keys.map((key, index) => ({
    key,
    labelUz: labels[key]?.uz ?? key,
    labelRu: labels[key]?.ru ?? key,
    allowsOther: otherKeys.includes(key),
    sortOrder: (index + 1) * 10,
  })) as OnboardingSeedOption[];
}

export const ONBOARDING_SEED_QUESTIONS: readonly OnboardingSeedQuestion[] = [
  {
    key: OnboardingQuestionKey.GOALS,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Moliyaviy maqsadingiz nima?',
    promptRu: 'Какая у вас финансовая цель?',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 10,
    options: labeled(PERSONAL_GOALS, PERSONAL_GOAL_LABELS, []),
  },
  {
    key: OnboardingQuestionKey.DISCOVERY_SOURCE,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Platformaga nima sababdan qo‘shildingiz?',
    promptRu: 'Почему вы присоединились к платформе?',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 20,
    options: labeled(DISCOVERY_SOURCES, DISCOVERY_LABELS),
  },
  {
    key: OnboardingQuestionKey.MONTHLY_INCOME_BAND,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Oylik daromad diapazoni?',
    promptRu: 'Диапазон ежемесячного дохода?',
    hintUz: 'Aniq summa ixtiyoriy. Maxsus summa alohida saqlanadi va admin statistikada ko‘rinmaydi.',
    hintRu: 'Точная сумма необязательна. Сумма хранится отдельно и не попадает в статистику.',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 30,
    options: labeled(MONTHLY_INCOME_BANDS, INCOME_LABELS, ['CUSTOM']),
  },
  {
    key: 'biggestProblem',
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Eng katta muammo?',
    promptRu: 'Самая большая проблема?',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 40,
    options: [
      { key: 'NO_TRACKING', labelUz: 'Hisob-kitob yuritilmaydi', labelRu: 'Нет учёта' },
      { key: 'OVERSPENDING', labelUz: 'Ortiqcha xarajat', labelRu: 'Лишние траты' },
      { key: 'NO_SAVINGS', labelUz: 'Jamg‘arma yo‘q', labelRu: 'Нет накоплений' },
      { key: 'DEBT', labelUz: 'Qarzlar', labelRu: 'Долги' },
      { key: 'NO_BUDGET', labelUz: 'Budjet yo‘q', labelRu: 'Нет бюджета' },
      { key: 'OTHER', labelUz: 'Boshqa', labelRu: 'Другое', allowsOther: true },
    ],
  },
  {
    key: OnboardingQuestionKey.HELP_WITH,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Platformadan nimani kutasiz?',
    promptRu: 'Чего вы ждёте от платформы?',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 50,
    options: labeled(HELP_WITH_OPTIONS, HELP_LABELS, []),
  },
  {
    key: OnboardingQuestionKey.FIRST_SAVING_GOAL,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Birinchi moliyaviy maqsadingiz nima?',
    promptRu: 'Какая первая финансовая цель?',
    hintUz: 'Ixtiyoriy. Keyinroq maqsadlar bo‘limida o‘zgartirasiz.',
    hintRu: 'Необязательно. Позже можно изменить в целях.',
    answerType: OnboardingAnswerType.SINGLE,
    required: false,
    sortOrder: 60,
    options: labeled(FIRST_SAVING_GOALS, FIRST_GOAL_LABELS),
  },
  {
    key: 'businessType',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Biznes turi',
    promptRu: 'Тип бизнеса',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    isSystem: true,
    sortOrder: 10,
    options: labeled(Object.values(BusinessType), BUSINESS_TYPE_LABELS, []),
  },
  {
    key: 'businessSize',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Biznes hajmi',
    promptRu: 'Масштаб бизнеса',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 20,
    options: [
      { key: 'SOLO', labelUz: 'Yakka tadbirkor', labelRu: 'ИП / один' },
      { key: 'MICRO', labelUz: 'Mikro (1–5 kishi)', labelRu: 'Микро (1–5)' },
      { key: 'SMALL', labelUz: 'Kichik (6–20)', labelRu: 'Малый (6–20)' },
      { key: 'MEDIUM', labelUz: 'O‘rta (21–50)', labelRu: 'Средний (21–50)' },
      { key: 'LARGE', labelUz: 'Katta (50+)', labelRu: 'Крупный (50+)' },
    ],
  },
  {
    key: 'staffCount',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Xodimlar soni',
    promptRu: 'Количество сотрудников',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 30,
    options: [
      { key: 'NONE', labelUz: 'Xodim yo‘q', labelRu: 'Нет сотрудников' },
      { key: 'FROM_1_TO_5', labelUz: '1–5', labelRu: '1–5' },
      { key: 'FROM_6_TO_20', labelUz: '6–20', labelRu: '6–20' },
      { key: 'FROM_21_TO_50', labelUz: '21–50', labelRu: '21–50' },
      { key: 'OVER_50', labelUz: '50 dan ortiq', labelRu: 'Более 50' },
    ],
  },
  {
    key: 'monthlyTurnover',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Oylik aylanma diapazoni',
    promptRu: 'Диапазон месячного оборота',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 40,
    options: [
      { key: 'UNDER_10M', labelUz: '10 mln so‘mgacha', labelRu: 'До 10 млн сум' },
      { key: 'FROM_10_TO_50M', labelUz: '10–50 mln so‘m', labelRu: '10–50 млн сум' },
      { key: 'FROM_50_TO_200M', labelUz: '50–200 mln so‘m', labelRu: '50–200 млн сум' },
      { key: 'OVER_200M', labelUz: '200 mln so‘mdan yuqori', labelRu: 'Более 200 млн сум' },
      { key: 'PREFER_NOT', labelUz: 'Kiritishni xohlamayman', labelRu: 'Предпочитаю не указывать' },
    ],
  },
  {
    key: 'currentBookkeeping',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Hozirgi hisob-kitob usuli',
    promptRu: 'Текущий способ учёта',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 50,
    options: [
      { key: 'NOTEBOOK', labelUz: 'Daftar', labelRu: 'Тетрадь' },
      { key: 'EXCEL', labelUz: 'Excel', labelRu: 'Excel' },
      { key: 'ACCOUNTANT', labelUz: 'Buxgalter', labelRu: 'Бухгалтер' },
      { key: 'SOFTWARE', labelUz: 'Dastur', labelRu: 'Программа' },
      { key: 'NONE', labelUz: 'Hisob yuritilmaydi', labelRu: 'Учёта нет' },
    ],
  },
  {
    key: 'businessBiggestProblem',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Eng katta muammo',
    promptRu: 'Самая большая проблема',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 60,
    options: [
      { key: 'MESSY_BOOKS', labelUz: 'Hisob-kitob tartibsiz', labelRu: 'Беспорядочный учёт' },
      { key: 'NO_STOCK_CONTROL', labelUz: 'Ombor nazorati yo‘q', labelRu: 'Нет контроля склада' },
      { key: 'NO_PROFIT_VIEW', labelUz: 'Foyda ko‘rinmaydi', labelRu: 'Не видно прибыль' },
      { key: 'LATE_PAYMENTS', labelUz: 'Kechan to‘lovlar', labelRu: 'Просроченные платежи' },
      { key: 'MANUAL_WORK', labelUz: 'Hammasi qo‘lda', labelRu: 'Всё вручную' },
      { key: 'OTHER', labelUz: 'Boshqa', labelRu: 'Другое', allowsOther: true },
    ],
  },
  {
    key: 'platformNeed',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Platformadan nimaga ehtiyoj bor',
    promptRu: 'Что нужно от платформы',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 70,
    options: [
      { key: 'ORGANIZE_BOOKS', labelUz: 'Hisob-kitobni tartibga solish', labelRu: 'Навести порядок в учёте' },
      { key: 'TRACK_SALES', labelUz: 'Savdoni kuzatish', labelRu: 'Учёт продаж' },
      { key: 'TRACK_EXPENSES', labelUz: 'Xarajatlarni kuzatish', labelRu: 'Учёт расходов' },
      { key: 'INVENTORY', labelUz: 'Ombor', labelRu: 'Склад' },
      { key: 'STAFF', labelUz: 'Xodimlar', labelRu: 'Сотрудники' },
      { key: 'REPORTS', labelUz: 'Hisobotlar', labelRu: 'Отчёты' },
    ],
  },
];

export const ONBOARDING_SEED_NEEDS: readonly OnboardingSeedNeed[] = [
  {
    key: 'ORGANIZE_BOOKKEEPING',
    labelUz: 'Hisob-kitobni tartibga solish',
    labelRu: 'Навести порядок в учёте',
    sortOrder: 10,
  },
  {
    key: 'CONTROL_SPENDING',
    labelUz: 'Xarajatlarni nazorat qilish',
    labelRu: 'Контроль расходов',
    sortOrder: 20,
  },
  {
    key: 'GROW_SAVINGS',
    labelUz: 'Pul yig‘ish',
    labelRu: 'Накопления',
    sortOrder: 30,
  },
  {
    key: 'SEE_CASHFLOW',
    labelUz: 'Aylanmani ko‘rish',
    labelRu: 'Видеть оборот',
    sortOrder: 40,
  },
];

export const ONBOARDING_SEED_SOLUTIONS: readonly OnboardingSeedNeed[] = [
  {
    key: 'AUTO_TRACK',
    labelUz: 'Avtomatik daromad/xarajat tracking',
    labelRu: 'Автоучёт доходов и расходов',
    sortOrder: 10,
  },
  {
    key: 'BUDGETS',
    labelUz: 'Budjet va limitlar',
    labelRu: 'Бюджеты и лимиты',
    sortOrder: 20,
  },
  {
    key: 'GOALS',
    labelUz: 'Moliyaviy maqsadlar',
    labelRu: 'Финансовые цели',
    sortOrder: 30,
  },
  {
    key: 'BUSINESS_LEDGER',
    labelUz: 'Do‘kon savdo va xarajat hisobi',
    labelRu: 'Учёт продаж и расходов магазина',
    sortOrder: 40,
  },
];

export const ONBOARDING_SEED_MAPPINGS: readonly OnboardingSeedMapping[] = [
  {
    questionKey: OnboardingQuestionKey.HELP_WITH,
    optionKey: 'TRACK_EXPENSES',
    needKey: 'CONTROL_SPENDING',
    solutionKey: 'AUTO_TRACK',
  },
  {
    questionKey: OnboardingQuestionKey.HELP_WITH,
    optionKey: 'BUDGET',
    needKey: 'ORGANIZE_BOOKKEEPING',
    solutionKey: 'BUDGETS',
  },
  {
    questionKey: OnboardingQuestionKey.HELP_WITH,
    optionKey: 'SAVE_FOR_GOAL',
    needKey: 'GROW_SAVINGS',
    solutionKey: 'GOALS',
  },
  {
    questionKey: 'biggestProblem',
    optionKey: 'NO_TRACKING',
    needKey: 'ORGANIZE_BOOKKEEPING',
    solutionKey: 'AUTO_TRACK',
  },
  {
    questionKey: 'platformNeed',
    optionKey: 'ORGANIZE_BOOKS',
    needKey: 'ORGANIZE_BOOKKEEPING',
    solutionKey: 'BUSINESS_LEDGER',
  },
  {
    questionKey: 'platformNeed',
    optionKey: 'TRACK_SALES',
    needKey: 'SEE_CASHFLOW',
    solutionKey: 'BUSINESS_LEDGER',
  },
  {
    questionKey: 'businessBiggestProblem',
    optionKey: 'MESSY_BOOKS',
    needKey: 'ORGANIZE_BOOKKEEPING',
    solutionKey: 'BUSINESS_LEDGER',
  },
];

/** Routing-only. Not stored as a DB question — account type gates the rest of the flow. */
export const ACCOUNT_PURPOSE_KEYS = ACCOUNT_PURPOSES;
