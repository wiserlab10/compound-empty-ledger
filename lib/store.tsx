"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mondayIndex, uid } from "./dates";
import { createEmptyState } from "./seed";
import type {
  AppState,
  AreaId,
  DayTask,
  MealEntry,
  SleepEntry,
  TrackId,
  WeightEntry,
  WorkoutSet,
} from "./types";

export const STORAGE_KEY = "compound.ledger.v5";

export interface PlannedTask extends DayTask {
  virtual?: boolean;
}

type StoreValue = {
  ready: boolean;
  state: AppState;
  tab: "today" | "calendar" | "projects" | "log";
  setTab: (t: StoreValue["tab"]) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  planFor: (date: string, area?: AreaId | "all") => PlannedTask[];
  pending: DayTask[];
  toggleDone: (id: string, date: string) => void;
  addTodayTask: (
    title: string,
    area: AreaId,
    minutes: number,
    recurring: boolean,
    note?: string,
  ) => void;
  deleteTask: (id: string) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<DayTask, "title" | "note" | "area" | "minutes">>,
  ) => void;
  updateTaskNote: (id: string, note: string) => void;
  toggleGoalTick: (goalId: string, index: number) => void;
  addWeeklyGoal: (title: string, area: AreaId, target: number) => void;
  deleteWeeklyGoal: (goalId: string) => void;
  assignPending: (taskId: string, date: string, minutes: number) => void;
  unassign: (task: PlannedTask, date: string) => void;
  toggleRecurringSlot: (task: PlannedTask, date: string) => void;
  toggleDowRecurring: (dow: number) => void;
  addPending: (title: string, area: AreaId) => void;
  toggleProjectTask: (trackId: TrackId, subId: string, taskId: string) => void;
  addSubproject: (trackId: TrackId, title: string) => void;
  renameSubproject: (trackId: TrackId, subId: string, title: string) => void;
  addProjectTask: (trackId: TrackId, subId: string, title: string, due?: string) => void;
  setProjectTaskDue: (trackId: TrackId, subId: string, taskId: string, due: string) => void;
  addTrack: (label: string) => void;
  renameTrack: (trackId: TrackId, label: string) => void;
  deleteTrack: (trackId: TrackId) => void;
  deleteSubproject: (trackId: TrackId, subId: string) => void;
  deleteProjectTask: (trackId: TrackId, subId: string, taskId: string) => void;
  addExercise: (name: string, date: string) => void;
  deleteExercise: (id: string) => void;
  addSet: (exerciseId: string, kg: number, reps: number) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => void;
  deleteSet: (exerciseId: string, setId: string) => void;
  addMealEntry: (entry: Omit<MealEntry, "id">) => void;
  updateMeal: (id: string, patch: Partial<Omit<MealEntry, "id">>) => void;
  deleteMeal: (id: string) => void;
  setNutritionGoals: (protein: number, kcal: number) => void;
  addWeightEntry: (entry: Omit<WeightEntry, "id">) => void;
  deleteWeight: (id: string) => void;
  setWeightGoal: (kg: number) => void;
  upsertSleep: (entry: Omit<SleepEntry, "id">) => void;
  setSleepTarget: (hours: number) => void;
  addReadingPages: (date: string, pages: number) => void;
  setReadingPages: (date: string, pages: number) => void;
  deleteReadingDay: (date: string) => void;
  setBook: (book: string, pageTarget: number) => void;
  setNoteFor: (date: string, text: string) => void;
  resetLedger: () => void;
  exportJson: () => string;
};

const StoreContext = createContext<StoreValue | null>(null);

function loadState(): AppState {
  if (typeof window === "undefined") return createEmptyState();
  try {
    window.localStorage.removeItem("compound.ledger.v1");
    window.localStorage.removeItem("compound.ledger.v2");
    window.localStorage.removeItem("compound.ledger.v3");
    window.localStorage.removeItem("compound.ledger.v4");
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 5 || !Array.isArray(parsed.tasks) || !parsed.log?.workouts) {
      return createEmptyState();
    }
    return parsed;
  } catch {
    return createEmptyState();
  }
}

export function CompoundProvider({ children }: { children: React.ReactNode }) {
  const empty = useMemo(() => createEmptyState(), []);
  const [state, setState] = useState<AppState>(empty);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<StoreValue["tab"]>("today");
  const [selectedDate, setSelectedDate] = useState(empty.seededDate);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setSelectedDate(loaded.seededDate);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const planFor = useCallback(
    (date: string, area: AreaId | "all" = "all"): PlannedTask[] => {
      const dow = mondayIndex(date);
      const assigned = state.tasks.filter((t) => !t.pending && t.date === date);
      const assignedRecur = new Set(assigned.map((t) => t.recurId).filter(Boolean));
      const virtual: PlannedTask[] = [];
      if (state.recurDowEnabled[dow] !== false) {
        for (const rule of state.recurring) {
          if (!rule.dows.includes(dow)) continue;
          if (assignedRecur.has(rule.id)) continue;
          if (state.hiddenRecurring.includes(`${date}:${rule.id}`)) continue;
          virtual.push({
            id: `virt:${date}:${rule.id}`,
            title: rule.title,
            area: rule.area,
            minutes: rule.minutes,
            date,
            done: false,
            recurring: true,
            recurId: rule.id,
            pending: false,
            virtual: true,
          });
        }
      }
      const merged = [...assigned, ...virtual].sort((a, b) => a.minutes - b.minutes);
      if (area === "all") return merged;
      return merged.filter((t) => t.area === area);
    },
    [state],
  );

  const pending = useMemo(() => state.tasks.filter((t) => t.pending), [state.tasks]);

  const toggleDone = useCallback((id: string, date: string) => {
    setState((prev) => {
      const existing = prev.tasks.find((t) => t.id === id);
      if (existing) {
        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        };
      }
      if (id.startsWith("virt:")) {
        const recurId = id.split(":")[2];
        const rule = prev.recurring.find((r) => r.id === recurId);
        if (!rule) return prev;
        return {
          ...prev,
          tasks: [
            ...prev.tasks,
            {
              id: uid("t"),
              title: rule.title,
              area: rule.area,
              minutes: rule.minutes,
              date,
              done: true,
              recurring: true,
              recurId: rule.id,
              pending: false,
            },
          ],
        };
      }
      return prev;
    });
  }, []);

  const addTodayTask = useCallback(
    (title: string, area: AreaId, minutes: number, recurring: boolean, note?: string) => {
      setState((prev) => {
        const task: DayTask = {
          id: uid("t"),
          title,
          area,
          minutes,
          date: selectedDate,
          done: false,
          recurring,
          pending: false,
          note: note?.trim() || undefined,
        };
        let recurringRules = prev.recurring;
        if (recurring) {
          const rid = uid("rec");
          task.recurId = rid;
          recurringRules = [
            ...prev.recurring,
            { id: rid, title, area, minutes, dows: [mondayIndex(selectedDate)] },
          ];
        }
        return { ...prev, tasks: [...prev.tasks, task], recurring: recurringRules };
      });
    },
    [selectedDate],
  );

  const deleteTask = useCallback((id: string) => {
    setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Pick<DayTask, "title" | "note" | "area" | "minutes">>) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    [],
  );

  const updateTaskNote = useCallback((id: string, note: string) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, note } : t)),
    }));
  }, []);

  const toggleGoalTick = useCallback((goalId: string, index: number) => {
    setState((prev) => ({
      ...prev,
      weeklyGoals: prev.weeklyGoals.map((g) =>
        g.id === goalId ? { ...g, ticks: g.ticks.map((t, i) => (i === index ? !t : t)) } : g,
      ),
    }));
  }, []);

  const addWeeklyGoal = useCallback((title: string, area: AreaId, target: number) => {
    setState((prev) => ({
      ...prev,
      weeklyGoals: [
        ...prev.weeklyGoals,
        {
          id: uid("g"),
          title,
          area,
          target: Math.max(1, target),
          ticks: [false, false, false, false, false, false, false],
        },
      ],
    }));
  }, []);

  const deleteWeeklyGoal = useCallback((goalId: string) => {
    setState((prev) => ({
      ...prev,
      weeklyGoals: prev.weeklyGoals.filter((g) => g.id !== goalId),
    }));
  }, []);

  const assignPending = useCallback((taskId: string, date: string, minutes: number) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, pending: false, date, minutes, done: false } : t,
      ),
    }));
  }, []);

  const unassign = useCallback((task: PlannedTask, date: string) => {
    setState((prev) => {
      if (task.virtual && task.recurId) {
        return {
          ...prev,
          hiddenRecurring: [...prev.hiddenRecurring, `${date}:${task.recurId}`],
        };
      }
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id ? { ...t, pending: true, date: "", minutes: 0, done: false } : t,
        ),
      };
    });
  }, []);

  const toggleRecurringSlot = useCallback((task: PlannedTask, date: string) => {
    const dow = mondayIndex(date);
    setState((prev) => {
      if (task.recurId) {
        return {
          ...prev,
          recurring: prev.recurring.map((r) => {
            if (r.id !== task.recurId) return r;
            const has = r.dows.includes(dow);
            return { ...r, dows: has ? r.dows.filter((d) => d !== dow) : [...r.dows, dow].sort() };
          }),
          tasks: prev.tasks.map((t) =>
            t.id === task.id ? { ...t, recurring: !t.recurring } : t,
          ),
        };
      }
      const rid = uid("rec");
      return {
        ...prev,
        recurring: [
          ...prev.recurring,
          { id: rid, title: task.title, area: task.area, minutes: task.minutes, dows: [dow] },
        ],
        tasks: prev.tasks.map((t) =>
          t.id === task.id ? { ...t, recurring: true, recurId: rid } : t,
        ),
      };
    });
  }, []);

  const toggleDowRecurring = useCallback((dow: number) => {
    setState((prev) => ({
      ...prev,
      recurDowEnabled: prev.recurDowEnabled.map((v, i) => (i === dow ? !v : v)),
    }));
  }, []);

  const addPending = useCallback((title: string, area: AreaId) => {
    setState((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          id: uid("p"),
          title,
          area,
          minutes: 0,
          date: "",
          done: false,
          recurring: false,
          pending: true,
        },
      ],
    }));
  }, []);

  const mapTrack = (
    prev: AppState,
    trackId: TrackId,
    fn: (tr: AppState["projects"][number]) => AppState["projects"][number],
  ): AppState => ({
    ...prev,
    projects: prev.projects.map((tr) => (tr.id === trackId ? fn(tr) : tr)),
  });

  const toggleProjectTask = useCallback((trackId: TrackId, subId: string, taskId: string) => {
    setState((prev) =>
      mapTrack(prev, trackId, (tr) => ({
        ...tr,
        subprojects: tr.subprojects.map((sp) =>
          sp.id !== subId
            ? sp
            : {
                ...sp,
                tasks: sp.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
              },
        ),
      })),
    );
  }, []);

  const addSubproject = useCallback((trackId: TrackId, title: string) => {
    setState((prev) =>
      mapTrack(prev, trackId, (tr) => ({
        ...tr,
        subprojects: [...tr.subprojects, { id: uid("sp"), title, tasks: [] }],
      })),
    );
  }, []);

  const renameSubproject = useCallback((trackId: TrackId, subId: string, title: string) => {
    setState((prev) =>
      mapTrack(prev, trackId, (tr) => ({
        ...tr,
        subprojects: tr.subprojects.map((sp) => (sp.id === subId ? { ...sp, title } : sp)),
      })),
    );
  }, []);

  const addProjectTask = useCallback(
    (trackId: TrackId, subId: string, title: string, due?: string) => {
      setState((prev) =>
        mapTrack(prev, trackId, (tr) => ({
          ...tr,
          subprojects: tr.subprojects.map((sp) =>
            sp.id !== subId
              ? sp
              : {
                  ...sp,
                  tasks: [...sp.tasks, { id: uid("pt"), title, done: false, due: due || undefined }],
                },
          ),
        })),
      );
    },
    [],
  );

  const setProjectTaskDue = useCallback(
    (trackId: TrackId, subId: string, taskId: string, due: string) => {
      setState((prev) =>
        mapTrack(prev, trackId, (tr) => ({
          ...tr,
          subprojects: tr.subprojects.map((sp) =>
            sp.id !== subId
              ? sp
              : {
                  ...sp,
                  tasks: sp.tasks.map((t) => (t.id === taskId ? { ...t, due } : t)),
                },
          ),
        })),
      );
    },
    [],
  );

  const addTrack = useCallback((label: string) => {
    setState((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: uid("tr"), label, subprojects: [] }],
    }));
  }, []);

  const renameTrack = useCallback((trackId: TrackId, label: string) => {
    setState((prev) => mapTrack(prev, trackId, (tr) => ({ ...tr, label })));
  }, []);

  const deleteTrack = useCallback((trackId: TrackId) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((tr) => tr.id !== trackId),
    }));
  }, []);

  const deleteSubproject = useCallback((trackId: TrackId, subId: string) => {
    setState((prev) =>
      mapTrack(prev, trackId, (tr) => ({
        ...tr,
        subprojects: tr.subprojects.filter((sp) => sp.id !== subId),
      })),
    );
  }, []);

  const deleteProjectTask = useCallback((trackId: TrackId, subId: string, taskId: string) => {
    setState((prev) =>
      mapTrack(prev, trackId, (tr) => ({
        ...tr,
        subprojects: tr.subprojects.map((sp) =>
          sp.id !== subId ? sp : { ...sp, tasks: sp.tasks.filter((t) => t.id !== taskId) },
        ),
      })),
    );
  }, []);

  const addExercise = useCallback((name: string, date: string) => {
    setState((prev) => ({
      ...prev,
      log: {
        ...prev.log,
        workouts: [...prev.log.workouts, { id: uid("ex"), name, date, sets: [] }],
      },
    }));
  }, []);

  const deleteExercise = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, workouts: prev.log.workouts.filter((w) => w.id !== id) },
    }));
  }, []);

  const addSet = useCallback((exerciseId: string, kg: number, reps: number) => {
    setState((prev) => ({
      ...prev,
      log: {
        ...prev.log,
        workouts: prev.log.workouts.map((w) =>
          w.id !== exerciseId
            ? w
            : { ...w, sets: [...w.sets, { id: uid("s"), kg, reps }] },
        ),
      },
    }));
  }, []);

  const updateSet = useCallback((exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => {
    setState((prev) => ({
      ...prev,
      log: {
        ...prev.log,
        workouts: prev.log.workouts.map((w) =>
          w.id !== exerciseId
            ? w
            : {
                ...w,
                sets: w.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
              },
        ),
      },
    }));
  }, []);

  const deleteSet = useCallback((exerciseId: string, setId: string) => {
    setState((prev) => ({
      ...prev,
      log: {
        ...prev.log,
        workouts: prev.log.workouts.map((w) =>
          w.id !== exerciseId ? w : { ...w, sets: w.sets.filter((s) => s.id !== setId) },
        ),
      },
    }));
  }, []);

  const addMealEntry = useCallback((entry: Omit<MealEntry, "id">) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, meals: [...prev.log.meals, { ...entry, id: uid("m") }] },
    }));
  }, []);

  const updateMeal = useCallback((id: string, patch: Partial<Omit<MealEntry, "id">>) => {
    setState((prev) => ({
      ...prev,
      log: {
        ...prev.log,
        meals: prev.log.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      },
    }));
  }, []);

  const deleteMeal = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, meals: prev.log.meals.filter((m) => m.id !== id) },
    }));
  }, []);

  const setNutritionGoals = useCallback((protein: number, kcal: number) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, proteinTarget: protein, kcalTarget: kcal },
    }));
  }, []);

  const addWeightEntry = useCallback((entry: Omit<WeightEntry, "id">) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, weights: [...prev.log.weights, { ...entry, id: uid("wt") }] },
    }));
  }, []);

  const deleteWeight = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, weights: prev.log.weights.filter((w) => w.id !== id) },
    }));
  }, []);

  const setWeightGoal = useCallback((kg: number) => {
    setState((prev) => ({ ...prev, log: { ...prev.log, weightGoal: kg } }));
  }, []);

  const upsertSleep = useCallback((entry: Omit<SleepEntry, "id">) => {
    setState((prev) => {
      const rest = prev.log.sleeps.filter((s) => s.date !== entry.date);
      return {
        ...prev,
        log: { ...prev.log, sleeps: [...rest, { ...entry, id: uid("sl") }] },
      };
    });
  }, []);

  const setSleepTarget = useCallback((hours: number) => {
    setState((prev) => ({ ...prev, log: { ...prev.log, sleepTarget: hours } }));
  }, []);

  const addReadingPages = useCallback((date: string, pages: number) => {
    setState((prev) => {
      const existing = prev.log.readingDays.find((d) => d.date === date);
      const readingDays = existing
        ? prev.log.readingDays.map((d) =>
            d.date === date ? { ...d, pages: d.pages + pages } : d,
          )
        : [...prev.log.readingDays, { date, pages }];
      return { ...prev, log: { ...prev.log, readingDays } };
    });
  }, []);

  const setReadingPages = useCallback((date: string, pages: number) => {
    setState((prev) => {
      const nextPages = Math.max(0, pages);
      const existing = prev.log.readingDays.find((d) => d.date === date);
      const readingDays =
        nextPages === 0
          ? prev.log.readingDays.filter((d) => d.date !== date)
          : existing
            ? prev.log.readingDays.map((d) => (d.date === date ? { ...d, pages: nextPages } : d))
            : [...prev.log.readingDays, { date, pages: nextPages }];
      return { ...prev, log: { ...prev.log, readingDays } };
    });
  }, []);

  const deleteReadingDay = useCallback((date: string) => {
    setState((prev) => ({
      ...prev,
      log: { ...prev.log, readingDays: prev.log.readingDays.filter((d) => d.date !== date) },
    }));
  }, []);

  const setBook = useCallback((book: string, pageTarget: number) => {
    setState((prev) => ({ ...prev, log: { ...prev.log, book, pageTarget } }));
  }, []);

  const setNoteFor = useCallback((date: string, text: string) => {
    setState((prev) => {
      const rest = prev.log.notes.filter((n) => n.date !== date);
      return { ...prev, log: { ...prev.log, notes: [...rest, { date, text }] } };
    });
  }, []);

  const resetLedger = useCallback(() => {
    const next = createEmptyState();
    setState(next);
    setSelectedDate(next.seededDate);
  }, []);

  const exportJson = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      state,
      tab,
      setTab,
      selectedDate,
      setSelectedDate,
      planFor,
      pending,
      toggleDone,
      addTodayTask,
      deleteTask,
      updateTask,
      updateTaskNote,
      toggleGoalTick,
      addWeeklyGoal,
      deleteWeeklyGoal,
      assignPending,
      unassign,
      toggleRecurringSlot,
      toggleDowRecurring,
      addPending,
      toggleProjectTask,
      addSubproject,
      renameSubproject,
      addProjectTask,
      setProjectTaskDue,
      addTrack,
      renameTrack,
      deleteTrack,
      deleteSubproject,
      deleteProjectTask,
      addExercise,
      deleteExercise,
      addSet,
      updateSet,
      deleteSet,
      addMealEntry,
      updateMeal,
      deleteMeal,
      setNutritionGoals,
      addWeightEntry,
      deleteWeight,
      setWeightGoal,
      upsertSleep,
      setSleepTarget,
      addReadingPages,
      setReadingPages,
      deleteReadingDay,
      setBook,
      setNoteFor,
      resetLedger,
      exportJson,
    }),
    [
      ready,
      state,
      tab,
      selectedDate,
      planFor,
      pending,
      toggleDone,
      addTodayTask,
      deleteTask,
      updateTask,
      updateTaskNote,
      toggleGoalTick,
      addWeeklyGoal,
      deleteWeeklyGoal,
      assignPending,
      unassign,
      toggleRecurringSlot,
      toggleDowRecurring,
      addPending,
      toggleProjectTask,
      addSubproject,
      renameSubproject,
      addProjectTask,
      setProjectTaskDue,
      addTrack,
      renameTrack,
      deleteTrack,
      deleteSubproject,
      deleteProjectTask,
      addExercise,
      deleteExercise,
      addSet,
      updateSet,
      deleteSet,
      addMealEntry,
      updateMeal,
      deleteMeal,
      setNutritionGoals,
      addWeightEntry,
      deleteWeight,
      setWeightGoal,
      upsertSleep,
      setSleepTarget,
      addReadingPages,
      setReadingPages,
      deleteReadingDay,
      setBook,
      setNoteFor,
      resetLedger,
      exportJson,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useCompound() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useCompound must be used within CompoundProvider");
  return ctx;
}
