import { BusinessType, OnboardingAnswerType, OnboardingAudience, BUSINESS_TYPE_DESCRIPTIONS, ONBOARDING_LAUNCH_BUSINESS_TYPES } from '../constants/enums.js';

import {
  ACCOUNT_PURPOSES,
  BIGGEST_PROBLEMS_V2,
  DISCOVERY_SOURCES,
  FIRST_SAVING_GOALS,
  GROWTH_INTERESTS,
  HELP_WITH_OPTIONS,
  MONTHLY_INCOME_BANDS,
  OnboardingQuestionKey,
  PERSONAL_GOALS_V2,
} from './catalog.js';

export interface OnboardingSeedOption {
  key: string;
  labelUz: string;
  labelRu: string;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  allowsOther?: boolean;
  /** When false, option is seeded inactive (admin can enable later). Default true. */
  isActive?: boolean;
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
  CONTROL_MONEY: { uz: 'Pulimni nazorat qilish', ru: 'Контролировать деньги' },
  CUT_SPENDING: { uz: 'Xarajatlarimni kamaytirish', ru: 'Сократить расходы' },
  BUILD_BUDGET: { uz: 'Budjet tuzish', ru: 'Составить бюджет' },
  SAVE_GOAL: { uz: 'Jamg‘arish / maqsadga pul yig‘ish', ru: 'Копить на цель' },
  MANAGE_DEBT: { uz: 'Qarzlarimni boshqarish', ru: 'Управлять долгами' },
  MANAGE_INCOME: { uz: 'Daromadimni yaxshiroq boshqarish', ru: 'Лучше управлять доходом' },
  ALL_IN_ONE: { uz: 'Hammasini bir joyda boshqarish', ru: 'Всё в одном месте' },
};

const GROWTH_LABELS: Record<string, { uz: string; ru: string }> = {
  READING_COURSES: { uz: 'O‘qish va kurslar', ru: 'Чтение и курсы' },
  IELTS_LANGUAGE: { uz: 'IELTS / til o‘rganish', ru: 'IELTS / язык' },
  PROGRAMMING_SKILL: { uz: 'Dasturlash / skill', ru: 'Программирование / навык' },
  DAILY_TASKS: { uz: 'Kunlik vazifalar', ru: 'Ежедневные задачи' },
  HABITS: { uz: 'Habitlar', ru: 'Привычки' },
  FOCUS_POMODORO: { uz: 'Fokus / Pomodoro', ru: 'Фокус / Pomodoro' },
  GOALS: { uz: 'Maqsadlar', ru: 'Цели' },
  FINANCE_ONLY: { uz: 'Hozircha faqat moliya', ru: 'Пока только финансы' },
};

const BIGGEST_PROBLEM_LABELS: Record<string, { uz: string; ru: string }> = {
  DONT_KNOW_WHERE_MONEY_GOES: {
    uz: 'Pul qayerga ketayotganini bilmayman',
    ru: 'Не знаю, куда уходят деньги',
  },
  CANT_HOLD_BUDGET: { uz: 'Budjetni ushlab turolmayman', ru: 'Не удерживаю бюджет' },
  HARD_TO_SAVE: { uz: 'Maqsad uchun pul yig‘ish qiyin', ru: 'Сложно копить на цель' },
  CANT_MANAGE_TIME: { uz: 'Vaqtimni to‘g‘ri taqsimlay olmayman', ru: 'Не умею распределять время' },
  HARD_TO_FOLLOW_PLANS: {
    uz: 'Rejalarimni bajarishda qiynalaman',
    ru: 'Сложно выполнять планы',
  },
  TOO_MANY_APPS: {
    uz: 'Bir nechta dasturdan foydalanishga to‘g‘ri keladi',
    ru: 'Приходится пользоваться несколькими приложениями',
  },
  WANT_ONE_PLACE: {
    uz: 'Hammasini bitta joyda boshqarishni xohlayman',
    ru: 'Хочу управлять всем в одном месте',
  },
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
  SMM: { uz: 'SMM Agentlik', ru: 'SMM Агентство' },
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

function businessTypeOptions(): OnboardingSeedOption[] {
  const launch = new Set<string>(ONBOARDING_LAUNCH_BUSINESS_TYPES);
  return Object.values(BusinessType).map((key, index) => ({
    key,
    labelUz: BUSINESS_TYPE_LABELS[key]?.uz ?? key,
    labelRu: BUSINESS_TYPE_LABELS[key]?.ru ?? key,
    descriptionUz: BUSINESS_TYPE_DESCRIPTIONS[key as BusinessType]?.uz ?? null,
    descriptionRu: BUSINESS_TYPE_DESCRIPTIONS[key as BusinessType]?.ru ?? null,
    allowsOther: false,
    isActive: launch.has(key),
    sortOrder: (index + 1) * 10,
  }));
}

/**
 * Active Personal registration questions (3). Legacy Personal questions remain in
 * PERSONAL_LEGACY_SEED_QUESTIONS for reference / inactive sync.
 */
export const PERSONAL_REGISTRATION_SEED_QUESTIONS: readonly OnboardingSeedQuestion[] = [
  {
    key: OnboardingQuestionKey.GOALS,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Balancy‘dan eng ko‘p nimada foydalanmoqchisiz?',
    promptRu: 'Для чего вы хотите использовать Balancy?',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 10,
    options: labeled(PERSONAL_GOALS_V2, PERSONAL_GOAL_LABELS, []),
  },
  {
    key: OnboardingQuestionKey.GROWTH_INTERESTS,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Vaqtingiz va rivojlanishingizni ham boshqarishni xohlaysizmi?',
    promptRu: 'Хотите управлять временем и развитием тоже?',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 20,
    options: labeled(GROWTH_INTERESTS, GROWTH_LABELS, []),
  },
  {
    key: OnboardingQuestionKey.BIGGEST_PROBLEM,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Hozir siz uchun eng katta muammo nima?',
    promptRu: 'Какая сейчас ваша главная проблема?',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 30,
    options: labeled(BIGGEST_PROBLEMS_V2, BIGGEST_PROBLEM_LABELS, []),
  },
];

/** Legacy Personal questions — deactivated by catalog sync, kept for history. */
export const PERSONAL_LEGACY_SEED_QUESTIONS: readonly OnboardingSeedQuestion[] = [
  {
    key: OnboardingQuestionKey.DISCOVERY_SOURCE,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Platformaga nima sababdan qo‘shildingiz?',
    promptRu: 'Почему вы присоединились к платформе?',
    answerType: OnboardingAnswerType.SINGLE,
    required: false,
    sortOrder: 100,
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
    required: false,
    sortOrder: 110,
    options: labeled(MONTHLY_INCOME_BANDS, INCOME_LABELS, ['CUSTOM']),
  },
  {
    key: OnboardingQuestionKey.HELP_WITH,
    audience: OnboardingAudience.PERSONAL,
    promptUz: 'Platformadan nimani kutasiz?',
    promptRu: 'Чего вы ждёте от платформы?',
    answerType: OnboardingAnswerType.MULTI,
    required: false,
    sortOrder: 120,
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
    sortOrder: 130,
    options: labeled(FIRST_SAVING_GOALS, FIRST_GOAL_LABELS),
  },
];

const SMM_SERVICE_LABELS: Record<string, { uz: string; ru: string }> = {
  SMM: { uz: 'SMM', ru: 'SMM' },
  CONTENT_CREATION: { uz: 'Kontent yaratish', ru: 'Создание контента' },
  REELS: { uz: 'Reels', ru: 'Reels' },
  VIDEO_EDITING: { uz: 'Video montaj', ru: 'Видеомонтаж' },
  GRAPHIC_DESIGN: { uz: 'Grafik dizayn', ru: 'Графический дизайн' },
  TARGET_ADS: { uz: 'Target reklama', ru: 'Таргет-реклама' },
  STRATEGY: { uz: 'Strategiya', ru: 'Стратегия' },
  BRANDING: { uz: 'Brending', ru: 'Брендинг' },
  COPYWRITING: { uz: 'Kopirayting', ru: 'Копирайтинг' },
  OTHER: { uz: 'Boshqa', ru: 'Другое' },
};

const SMM_PLATFORM_LABELS: Record<string, { uz: string; ru: string }> = {
  INSTAGRAM: { uz: 'Instagram', ru: 'Instagram' },
  TIKTOK: { uz: 'TikTok', ru: 'TikTok' },
  TELEGRAM: { uz: 'Telegram', ru: 'Telegram' },
  YOUTUBE: { uz: 'YouTube', ru: 'YouTube' },
  FACEBOOK: { uz: 'Facebook', ru: 'Facebook' },
  LINKEDIN: { uz: 'LinkedIn', ru: 'LinkedIn' },
  OTHER: { uz: 'Boshqa', ru: 'Другое' },
};

const SMM_GOAL_LABELS: Record<string, { uz: string; ru: string }> = {
  GROW_CLIENTS: { uz: 'Mijozlar sonini oshirish', ru: 'Увеличить число клиентов' },
  GROW_SALES: { uz: 'Sotuvni oshirish', ru: 'Рост продаж' },
  SYSTEMIZE: { uz: 'Jarayonlarni tizimlashtirish', ru: 'Систематизировать процессы' },
  MANAGE_TEAM: { uz: 'Jamoani boshqarish', ru: 'Управлять командой' },
  SPEED_CONTENT: { uz: 'Kontentni tezroq chiqarish', ru: 'Ускорить выпуск контента' },
  ANALYTICS: { uz: 'Analitika va hisobotlar', ru: 'Аналитика и отчёты' },
  OTHER: { uz: 'Boshqa', ru: 'Другое' },
};

const SMM_TOOLS_LABELS: Record<string, { uz: string; ru: string }> = {
  EXCEL_SHEETS: { uz: 'Excel / Google Sheets', ru: 'Excel / Google Sheets' },
  TELEGRAM: { uz: 'Telegram', ru: 'Telegram' },
  NOTION: { uz: 'Notion', ru: 'Notion' },
  TRELLO_ASANA: { uz: 'Trello / Asana', ru: 'Trello / Asana' },
  OTHER_CRM: { uz: 'Boshqa CRM', ru: 'Другая CRM' },
  NO_SYSTEM: { uz: 'Tizim yo‘q', ru: 'Нет системы' },
};

/** Furniture-scoped BUSINESS follow-up questions (not shared across verticals). */
export const FURNITURE_ONBOARDING_QUESTION_KEYS = [
  'businessSize',
  'staffCount',
  'monthlyTurnover',
  'currentBookkeeping',
  'businessBiggestProblem',
  'platformNeed',
] as const;

export const SMM_ONBOARDING_SEED_QUESTIONS: readonly OnboardingSeedQuestion[] = [
  {
    key: 'smmAgencyName',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Agentligingiz nomi nima?',
    promptRu: 'Как называется ваше агентство?',
    answerType: OnboardingAnswerType.TEXT,
    required: true,
    sortOrder: 20,
    options: [],
  },
  {
    key: 'smmClientCount',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Hozir nechta mijoz bilan ishlaysiz?',
    promptRu: 'С сколькими клиентами вы сейчас работаете?',
    answerType: OnboardingAnswerType.NUMBER,
    required: true,
    sortOrder: 30,
    options: [],
  },
  {
    key: 'smmServices',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Qaysi xizmatlarni ko‘rsatasiz?',
    promptRu: 'Какие услуги вы оказываете?',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 40,
    options: labeled(
      [
        'SMM',
        'CONTENT_CREATION',
        'REELS',
        'VIDEO_EDITING',
        'GRAPHIC_DESIGN',
        'TARGET_ADS',
        'STRATEGY',
        'BRANDING',
        'COPYWRITING',
        'OTHER',
      ],
      SMM_SERVICE_LABELS,
    ),
  },
  {
    key: 'smmPlatforms',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Qaysi platformalarda ishlaysiz?',
    promptRu: 'На каких платформах вы работаете?',
    answerType: OnboardingAnswerType.MULTI,
    required: true,
    sortOrder: 50,
    options: labeled(
      ['INSTAGRAM', 'TIKTOK', 'TELEGRAM', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN', 'OTHER'],
      SMM_PLATFORM_LABELS,
    ),
  },
  {
    key: 'smmTeamSize',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Jamoangiz nechta kishidan iborat?',
    promptRu: 'Из скольких человек состоит ваша команда?',
    answerType: OnboardingAnswerType.NUMBER,
    required: true,
    sortOrder: 60,
    options: [],
  },
  {
    key: 'smmMainGoal',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Agentlikning asosiy maqsadi nima?',
    promptRu: 'Какова главная цель агентства?',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 70,
    options: labeled(
      [
        'GROW_CLIENTS',
        'GROW_SALES',
        'SYSTEMIZE',
        'MANAGE_TEAM',
        'SPEED_CONTENT',
        'ANALYTICS',
        'OTHER',
      ],
      SMM_GOAL_LABELS,
    ),
  },
  {
    key: 'smmCurrentTools',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.SMM,
    promptUz: 'Siz hozir agentlikni qanday boshqarasiz?',
    promptRu: 'Как вы сейчас управляете агентством?',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    sortOrder: 80,
    options: labeled(
      ['EXCEL_SHEETS', 'TELEGRAM', 'NOTION', 'TRELLO_ASANA', 'OTHER_CRM', 'NO_SYSTEM'],
      SMM_TOOLS_LABELS,
      [],
    ),
  },
];

export const ONBOARDING_SEED_QUESTIONS: readonly OnboardingSeedQuestion[] = [
  ...PERSONAL_REGISTRATION_SEED_QUESTIONS,
  ...PERSONAL_LEGACY_SEED_QUESTIONS,
  {
    key: 'businessType',
    audience: OnboardingAudience.BUSINESS,
    promptUz: 'Biznes turi',
    promptRu: 'Тип бизнеса',
    answerType: OnboardingAnswerType.SINGLE,
    required: true,
    isSystem: true,
    sortOrder: 10,
    options: businessTypeOptions(),
  },
  {
    key: 'businessSize',
    audience: OnboardingAudience.BUSINESS,
    businessType: BusinessType.FURNITURE,
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
    businessType: BusinessType.FURNITURE,
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
    businessType: BusinessType.FURNITURE,
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
    businessType: BusinessType.FURNITURE,
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
    businessType: BusinessType.FURNITURE,
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
    businessType: BusinessType.FURNITURE,
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
  ...SMM_ONBOARDING_SEED_QUESTIONS,
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
  {
    key: 'MANAGE_TIME',
    labelUz: 'Vaqtni boshqarish',
    labelRu: 'Управлять временем',
    sortOrder: 50,
  },
  {
    key: 'GROW_SKILLS',
    labelUz: 'Rivojlanish',
    labelRu: 'Развитие',
    sortOrder: 60,
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
  {
    key: 'GROWTH_SUITE',
    labelUz: 'O‘sish: vazifa, habit, fokus',
    labelRu: 'Рост: задачи, привычки, фокус',
    sortOrder: 50,
  },
];

export const ONBOARDING_SEED_MAPPINGS: readonly OnboardingSeedMapping[] = [
  {
    questionKey: OnboardingQuestionKey.GOALS,
    optionKey: 'CONTROL_MONEY',
    needKey: 'CONTROL_SPENDING',
    solutionKey: 'AUTO_TRACK',
  },
  {
    questionKey: OnboardingQuestionKey.GOALS,
    optionKey: 'BUILD_BUDGET',
    needKey: 'ORGANIZE_BOOKKEEPING',
    solutionKey: 'BUDGETS',
  },
  {
    questionKey: OnboardingQuestionKey.GOALS,
    optionKey: 'SAVE_GOAL',
    needKey: 'GROW_SAVINGS',
    solutionKey: 'GOALS',
  },
  {
    questionKey: OnboardingQuestionKey.BIGGEST_PROBLEM,
    optionKey: 'DONT_KNOW_WHERE_MONEY_GOES',
    needKey: 'CONTROL_SPENDING',
    solutionKey: 'AUTO_TRACK',
  },
  {
    questionKey: OnboardingQuestionKey.BIGGEST_PROBLEM,
    optionKey: 'CANT_HOLD_BUDGET',
    needKey: 'ORGANIZE_BOOKKEEPING',
    solutionKey: 'BUDGETS',
  },
  {
    questionKey: OnboardingQuestionKey.GROWTH_INTERESTS,
    optionKey: 'IELTS_LANGUAGE',
    needKey: 'GROW_SKILLS',
    solutionKey: 'GROWTH_SUITE',
  },
  {
    questionKey: OnboardingQuestionKey.GROWTH_INTERESTS,
    optionKey: 'FOCUS_POMODORO',
    needKey: 'MANAGE_TIME',
    solutionKey: 'GROWTH_SUITE',
  },
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
