'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth";
import { endMinutesOf, mondayIndex, uid } from "./dates";
import {
  fetchCloudLedger,
  LOCAL_WRITTEN_KEY,
  loadState,
  localWrittenAt,
  migrateState,
  saveLocal,
  upsertCloudLedger,
} from "./ledger";
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

export { STORAGE_KEY } from "./ledger";

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
    endMinutes?: number,
  ) => void;
  addCalendarPlan: (
    title: string,
    area: AreaId,
    minutes: number,
    endMinutes: number,
    recurId?: string,
  ) => void;
  deleteTask: (id: string) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<DayTask, "title" | "note" | "area" | "minutes" | "endMinutes">>,
  ) => void;
  updateTaskNote: (id: string, note: string) => void;
  toggleGoalTick: (goalId: string, index: number) => void;
  addWeeklyGoal: (title: string, area: AreaId, target: number) => void;
  deleteWeeklyGoal: (goalId: string) => void;
  assignPending: (taskId: string, date: string, minutes: number, endMinutes?: number) => void;
  unassign: (task: PlannedTask, date: string) => void;
  toggleRecurringSlot: (task: PlannedTask, date: string) => void;
  toggleDowRecurring: (dow: number) => void;
  addPending: (title: string, area: AreaId) => void;
  toggleProjectTask: (trackId: TrackId, subId: string, taskId: string) => void;
  addSubproject: (trackId: TrackId, title: string) => void;
  renameSubproject: (trackId: TrackId, subId: string, title: string) => void;
  addProjectTask: (trackId: TrackId, subId: string, title: string, due?: string) => void;
  addTrackTask: (trackId: TrackId, title: string, due?: string) => void;
  setProjectTaskDue: (trackId: TrackId, subId: string, taskId: string, due: string) => void;
  addTrack: (label: string) => void;
  renameTrack: (trackId: TrackId, label: string) => void;
  deleteTrack: (trackId: TrackId) => void;
  deleteSubproject: (trackId: TrackId, subId: string) => void;
  deleteProjectTask: (trackId: TrackId, subId: string, taskId: string) => void;
  addExercise: (name: string, date: string) => void;
  logSet: (name: string, date: string, kg: number, reps: number) => void;
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
  syncStatus: "local" | "syncing" | "synced" | "error";
};

const StoreContext = createContext<StoreValue | null>(null);

export function CompoundProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const empty = useMemo(() => createEmptyState(), []);
  const [state, setState] = useState<AppState>(empty);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<StoreValue["tab"]>("today");
  const [selectedDate, setSelectedDate] = useState(empty.seededDate);
  const [syncStatus, setSyncStatus] = useState<StoreValue["syncStatus"]>("local");
  const skipCloud = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setSelectedDate(loaded.seededDate);
    setReady(true);
  }, []);

  const persistTouch = useRef(false);

  useEffect(() => {
    if (!ready) return;
    saveLocal(state, persistTouch.current);
    if (!user) persistTouch.current = true;
  }, [state, ready, user]);

  useEffect(() => {
    if (!ready || !authReady || !user) {
      if (!user) setSyncStatus("local");
      return;
    }
    let cancelled = false;
    skipCloud.current = true;
    setSyncStatus("syncing");
    fetchCloudLedger(user.id)
      .then(async (row) => {
        if (cancelled) return;
        if (!row) {
          await upsertCloudLedger(user.id, stateRef.current);
          if (!cancelled) setSyncStatus("synced");
          return;
        }
        const cloudTime = Date.parse(row.updated_at);
        if (Number.isFinite(cloudTime) && cloudTime > localWrittenAt()) {
          const next = migrateState(row.payload);
          if (next) {
            setState(next);
            setSelectedDate(next.seededDate);
            saveLocal(next, false);
            window.localStorage.setItem(LOCAL_WRITTEN_KEY, row.updated_at);
          }
        } else {
          await upsertCloudLedger(user.id, stateRef.current);
        }
        if (!cancelled) setSyncStatus("synced");
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("error");
      })
      .finally(() => {
        persistTouch.current = true;
        window.setTimeout(() => {
          skipCloud.current = false;
        }, 400);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authReady, user]);

  useEffect(() => {
    if (!ready || !user || skipCloud.current) return;
    setSyncStatus("syncing");
    const t = window.setTimeout(() => {
      upsertCloudLedger(user.id, state)
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("error"));
    }, 800);
    return () => window.clearTimeout(t);
  }, [state, ready, user]);

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
            endMinutes: endMinutesOf(rule),
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
              endMinutes: endMinutesOf(rule),
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
    (
      title: string,
      area: AreaId,
      minutes: number,
      recurring: boolean,
      note?: string,
      endMinutes?: number,
    ) => {
      setState((prev) => {
        const end = endMinutes && endMinutes > minutes ? endMinutes : minutes + 60;
        const task: DayTask = {
          id: uid("t"),
          title,
          area,
          minutes,
          endMinutes: end,
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
            { id: rid, title, area, minutes, endMinutes: end, dows: [mondayIndex(selectedDate)] },
          ];
        }
        return { ...prev, tasks: [...prev.tasks, task], recurring: recurringRules };
      });
    },
    [selectedDate],
  );

  const addCalendarPlan = useCallback(
    (title: string, area: AreaId, minutes: number, endMinutes: number, recurId?: string) => {
      setState((prev) => {
        const end = endMinutes > minutes ? endMinutes : minutes + 30;
        return {
          ...prev,
          tasks: [
            ...prev.tasks,
            {
              id: uid("t"),
              title,
              area,
              minutes,
              endMinutes: end,
              date: selectedDate,
              done: false,
              recurring: Boolean(recurId),
              recurId,
              pending: false,
            },
          ],
        };
      });
    },
    [selectedDate],
  );

  const deleteTask = useCallback((id: string) => {
    setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Pick<DayTask, "title" | "note" | "area" | "minutes" | "endMinutes">>) => {
      setState((prev) => {
        const current = prev.tasks.find((t) => t.id === id);
        const tasks = prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
        if (!current?.recurId) return { ...prev, tasks };
        return {
          ...prev,
          tasks,
          recurring: prev.recurring.map((r) =>
            r.id !== current.recurId
              ? r
              : {
                  ...r,
                  title: patch.title ?? r.title,
                  area: patch.area ?? r.area,
                  minutes: patch.minutes ?? r.minutes,
                  endMinutes: patch.endMinutes ?? r.endMinutes,
                },
          ),
        };
      });
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

  const assignPending = useCallback(
    (taskId: string, date: string, minutes: number, endMinutes?: number) => {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                pending: false,
                date,
                minutes,
                endMinutes: endMinutes && endMinutes > minutes ? endMinutes : minutes + 30,
                done: false,
              }
            : t,
        ),
      }));
    },
    [],
  );

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
          t.id === task.id
            ? { ...t, pending: true, date: "", minutes: 0, endMinutes: 0, done: false }
            : t,
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
          {
            id: rid,
            title: task.title,
            area: task.area,
            minutes: task.minutes,
            endMinutes: endMinutesOf(task),
            dows: [dow],
          },
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
          endMinutes: 0,
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

  const addTrackTask = useCallback((trackId: TrackId, title: string, due?: string) => {
    setState((prev) =>
      mapTrack(prev, trackId, (tr) => {
        const subs = tr.subprojects.length
          ? tr.subprojects
          : [{ id: uid("sp"), title: "작업", tasks: [] }];
        const targetId = subs[0].id;
        return {
          ...tr,
          subprojects: subs.map((sp) =>
            sp.id === targetId
              ? {
                  ...sp,
                  tasks: [...sp.tasks, { id: uid("pt"), title, done: false, due: due || undefined }],
                }
              : sp,
          ),
        };
      }),
    );
  }, []);

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
    const id = String(trackId);
    setState((prev) => {
      const next = prev.projects.filter((tr) => String(tr.id) !== id);
      if (next.length === prev.projects.length) return prev;
      return { ...prev, projects: next };
    });
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

  const logSet = useCallback((name: string, date: string, kg: number, reps: number) => {
    setState((prev) => {
      const key = name.trim();
      if (!key) return prev;
      const existing = prev.log.workouts.find(
        (w) => w.date === date && w.name.trim().toLowerCase() === key.toLowerCase(),
      );
      const nextSet = { id: uid("s"), kg, reps };
      if (existing) {
        return {
          ...prev,
          log: {
            ...prev.log,
            workouts: prev.log.workouts.map((w) =>
              w.id === existing.id ? { ...w, sets: [...w.sets, nextSet] } : w,
            ),
          },
        };
      }
      return {
        ...prev,
        log: {
          ...prev.log,
          workouts: [...prev.log.workouts, { id: uid("ex"), name: key, date, sets: [nextSet] }],
        },
      };
    });
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
      addCalendarPlan,
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
      addTrackTask,
      setProjectTaskDue,
      addTrack,
      renameTrack,
      deleteTrack,
      deleteSubproject,
      deleteProjectTask,
      addExercise,
      logSet,
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
      syncStatus,
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
      addCalendarPlan,
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
      addTrackTask,
      setProjectTaskDue,
      addTrack,
      renameTrack,
      deleteTrack,
      deleteSubproject,
      deleteProjectTask,
      addExercise,
      logSet,
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
      syncStatus,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useCompound() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useCompound must be used within CompoundProvider");
  return ctx;
}
