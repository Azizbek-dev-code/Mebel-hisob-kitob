/**
 * V2 AI extension points for habits. Not implemented in V1.
 * The V1 statistics engine (`buildHabitStatistics`, analytics DTOs) is the
 * intended data source for future AI fill / analysis / coaching.
 */
export const HABIT_AI_V2_CAPABILITIES = [
  'magic-fill',
  'habit-creation',
  'analysis',
  'insight',
  'recommendation',
  'coaching',
] as const;

export type HabitAiV2Capability = (typeof HABIT_AI_V2_CAPABILITIES)[number];

export type HabitAiMagicFillInput = { prompt: string };
export type HabitAiCreationInput = { prompt: string; locale?: string };
export type HabitAiAnalysisInput = { statistics: unknown };
