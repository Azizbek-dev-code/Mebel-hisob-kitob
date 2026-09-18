export interface GrowthPeriodMetricsDto {
  studyMinutes: number;
  focusMinutes: number;
  tasksCompleted: number;
  habitCheckIns: number;
  dailyGoalsDone: number;
  xpEarned: number;
  currentStreak: number;
  bestStreak: number;
  levelStart: number;
  levelEnd: number;
  /** Finance link-in for the same window (live PersonalEntry totals). */
  finance: {
    incomeSom: number;
    expenseSom: number;
    netSom: number;
  };
}

export interface GrowthWeeklyReflectionDto {
  wentWell: string | null;
  wasHard: string | null;
  nextWeekChange: string | null;
  updatedAt: string | null;
}

export interface GrowthWeeklyReviewDto {
  weekStartDayKey: string;
  weekEndDayKey: string;
  metrics: GrowthPeriodMetricsDto;
  reflection: GrowthWeeklyReflectionDto;
}

export interface UpsertGrowthWeeklyReviewRequest {
  weekStartDayKey?: string;
  wentWell?: string | null;
  wasHard?: string | null;
  nextWeekChange?: string | null;
}

export interface GrowthMonthlyReflectionDto {
  highlight: string | null;
  lesson: string | null;
  nextMonthIntent: string | null;
  updatedAt: string | null;
}

export interface GrowthMonthlyReportDto {
  yearMonth: string;
  startDayKey: string;
  endDayKey: string;
  metrics: GrowthPeriodMetricsDto;
  reflection: GrowthMonthlyReflectionDto;
}

export interface UpsertGrowthMonthlyReportRequest {
  yearMonth?: string;
  highlight?: string | null;
  lesson?: string | null;
  nextMonthIntent?: string | null;
}
