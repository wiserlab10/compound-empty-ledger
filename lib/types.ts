export type AreaId = "wiser" | "invest" | "body" | "food" | "sleep" | "read" | "cls";

export type TabId = "today" | "calendar" | "projects" | "log";

export type TrackId = string;

/** Minutes from midnight, e.g. 06:30 → 390 */
export type Minutes = number;

export interface DayTask {
  id: string;
  title: string;
  area: AreaId;
  minutes: Minutes;
  date: string;
  done: boolean;
  recurring: boolean;
  recurId?: string;
  note?: string;
  pending: boolean;
}

export interface RecurringRule {
  id: string;
  title: string;
  area: AreaId;
  minutes: Minutes;
  /** Monday=0 … Sunday=6 */
  dows: number[];
}

export interface WeeklyGoal {
  id: string;
  title: string;
  area: AreaId;
  target: number;
  ticks: boolean[];
}

export interface ProjectTask {
  id: string;
  title: string;
  done: boolean;
  due?: string;
}

export interface Subproject {
  id: string;
  title: string;
  tasks: ProjectTask[];
}

export interface ProjectTrack {
  id: TrackId;
  label: string;
  subprojects: Subproject[];
}

export interface WorkoutSet {
  id: string;
  kg: number;
  reps: number;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  date: string;
  sets: WorkoutSet[];
}

export interface MealEntry {
  id: string;
  date: string;
  label: string;
  protein: number;
  kcal: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
}

export interface SleepEntry {
  id: string;
  date: string;
  hours: number;
  quality?: number;
}

export interface ReadingDay {
  date: string;
  pages: number;
}

export interface LogState {
  proteinTarget: number;
  kcalTarget: number;
  weightGoal: number;
  sleepTarget: number;
  pageTarget: number;
  book: string;
  meals: MealEntry[];
  weights: WeightEntry[];
  sleeps: SleepEntry[];
  readingDays: ReadingDay[];
  notes: { date: string; text: string }[];
  workouts: WorkoutExercise[];
}

export interface AppState {
  version: 5;
  seededDate: string;
  tasks: DayTask[];
  recurring: RecurringRule[];
  hiddenRecurring: string[];
  weeklyGoals: WeeklyGoal[];
  projects: ProjectTrack[];
  log: LogState;
  recurDowEnabled: boolean[];
}

export const AREAS: {
  id: AreaId;
  letter: string;
  label: string;
}[] = [
  { id: "wiser", letter: "W", label: "Wiserlab" },
  { id: "invest", letter: "I", label: "투자 리서치" },
  { id: "body", letter: "B", label: "웨이트" },
  { id: "food", letter: "F", label: "식사" },
  { id: "sleep", letter: "S", label: "수면" },
  { id: "read", letter: "R", label: "독서" },
  { id: "cls", letter: "C", label: "수업·루틴" },
];

export const AREA_MAP = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<
  AreaId,
  (typeof AREAS)[number]
>;
