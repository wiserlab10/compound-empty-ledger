import type { AppState, DayTask } from "./types";
import { todayISO } from "./dates";

/** First open is a blank ledger. No demo tasks, goals, tracks, or log rows. */
export function createEmptyState(date = todayISO()): AppState {
  return {
    version: 6,
    seededDate: date,
    tasks: [],
    recurring: [],
    hiddenRecurring: [],
    weeklyGoals: [],
    projects: [],
    log: {
      proteinTarget: 0,
      kcalTarget: 0,
      weightGoal: 0,
      sleepTarget: 0,
      pageTarget: 0,
      book: "",
      meals: [],
      weights: [],
      sleeps: [],
      readingDays: [],
      notes: [],
      workouts: [],
    },
    recurDowEnabled: [true, true, true, true, true, true, true],
  };
}

export function newPending(title: string, area: DayTask["area"]): DayTask {
  return {
    id: `p_${Math.random().toString(36).slice(2, 9)}`,
    title,
    area,
    minutes: 0,
    endMinutes: 0,
    date: "",
    done: false,
    recurring: false,
    pending: true,
  };
}
