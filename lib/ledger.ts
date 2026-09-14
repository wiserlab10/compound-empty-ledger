import { endMinutesOf } from "./dates";
import { createEmptyState } from "./seed";
import type { AppState, DayTask } from "./types";

export const STORAGE_KEY = "compound.ledger.v6";
export const LOCAL_WRITTEN_KEY = "compound.localWrittenAt";

const PREV_KEYS = [
  "compound.ledger.v1",
  "compound.ledger.v2",
  "compound.ledger.v3",
  "compound.ledger.v4",
  "compound.ledger.v5",
] as const;

function withEnd(task: DayTask): DayTask {
  return {
    ...task,
    endMinutes:
      !task.pending && task.endMinutes && task.endMinutes > task.minutes
        ? task.endMinutes
        : task.pending
          ? task.endMinutes || 0
          : endMinutesOf(task),
  };
}

export function migrateState(parsed: unknown): AppState | null {
  if (!parsed || typeof parsed !== "object") return null;
  const data = parsed as Partial<AppState> & { version?: number; log?: AppState["log"] };
  if (!Array.isArray(data.tasks) || !data.log?.workouts) return null;
  const version = Number(data.version);
  if (version !== 5 && version !== 6) return null;
  const base = createEmptyState(data.seededDate);
  return {
    ...base,
    ...data,
    version: 6,
    tasks: data.tasks.map(withEnd),
    recurring: (data.recurring ?? []).map((rule) => ({
      ...rule,
      endMinutes: endMinutesOf(rule),
    })),
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createEmptyState();
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem("compound.ledger.v5");
    for (const key of PREV_KEYS) {
      if (key !== "compound.ledger.v5") window.localStorage.removeItem(key);
    }
    if (!raw) return createEmptyState();
    return migrateState(JSON.parse(raw)) ?? createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function saveLocal(state: AppState, touch = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (touch) window.localStorage.setItem(LOCAL_WRITTEN_KEY, new Date().toISOString());
  else if (!window.localStorage.getItem(LOCAL_WRITTEN_KEY) && window.localStorage.getItem(STORAGE_KEY)) {
    window.localStorage.setItem(LOCAL_WRITTEN_KEY, new Date().toISOString());
  }
}

export function localWrittenAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LOCAL_WRITTEN_KEY);
  const n = raw ? Date.parse(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function fetchCloudLedger(userId: string) {
  const { getSupabase } = await import("./supabase");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("compound_ledgers")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { payload: unknown; updated_at: string } | null;
}

export async function upsertCloudLedger(userId: string, state: AppState) {
  const { getSupabase } = await import("./supabase");
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase.from("compound_ledgers").upsert(
    {
      user_id: userId,
      payload: state,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_WRITTEN_KEY, now);
  }
  return now;
}
