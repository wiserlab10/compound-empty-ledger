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
  /** Exclusive end, minutes from midnight. Duration = endMinutes − minutes. */
  endMinutes: Minutes;
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
  endMinutes: Minutes;
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
  version: 6;
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
  { id: "wiser", letter: "주", label: "주간" },
  { id: "invest", letter: "투", label: "투자" },
  { id: "body", letter: "운", label: "운동" },
  { id: "food", letter: "식", label: "식사" },
  { id: "sleep", letter: "수", label: "수면" },
  { id: "read", letter: "독", label: "독서" },
  { id: "cls", letter: "일", label: "일정" },
];

export const AREA_MAP = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<
  AreaId,
  (typeof AREAS)[number]
>;
