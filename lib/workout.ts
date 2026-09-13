import type { WorkoutExercise, WorkoutSet } from "./types";

export function setVolume(set: WorkoutSet): number {
  return Math.max(0, set.kg) * Math.max(0, set.reps);
}

export function exerciseVolume(sets: WorkoutSet[]): number {
  return sets.reduce((sum, set) => sum + setVolume(set), 0);
}

export function sessionVolume(exercises: WorkoutExercise[]): number {
  return exercises.reduce((sum, ex) => sum + exerciseVolume(ex.sets), 0);
}

export function topSet(sets: WorkoutSet[]): WorkoutSet | null {
  if (sets.length === 0) return null;
  return [...sets].sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0];
}

export function lastSameExercise(
  all: WorkoutExercise[],
  name: string,
  beforeDate: string,
): WorkoutExercise | null {
  return exerciseHistory(all, name, beforeDate, 1)[0] ?? null;
}

export function exerciseHistory(
  all: WorkoutExercise[],
  name: string,
  beforeDate: string,
  limit = 5,
): WorkoutExercise[] {
  const key = name.trim().toLowerCase();
  return all
    .filter((ex) => ex.name.trim().toLowerCase() === key && ex.date < beforeDate && ex.sets.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function formatVolume(n: number): string {
  return `${Math.round(n).toLocaleString("ko-KR")}`;
}

export function compareHint(today: WorkoutExercise, last: WorkoutExercise | null): {
  minCopy: string;
  status: "none" | "behind" | "match" | "beat" | "pr";
} {
  if (!last) {
    return {
      minCopy: "이 동작의 첫 기록입니다. 세트를 남기면 다음부터 최소 목표가 생깁니다.",
      status: "none",
    };
  }
  const lastVol = exerciseVolume(last.sets);
  const lastTop = topSet(last.sets);
  const todayVol = exerciseVolume(today.sets);
  const todayTop = topSet(today.sets);
  const targetReps = lastTop ? lastTop.reps + 1 : 0;
  const minCopy = lastTop
    ? `지난번 대비 오늘 최소 볼륨 ${formatVolume(lastVol)} · 탑셋 ${lastTop.kg}kg × ${targetReps}회(+1)`
    : `지난번 대비 오늘 최소 볼륨 ${formatVolume(lastVol)}`;

  const beatVol = todayVol > lastVol && today.sets.length > 0;
  const beatTop =
    todayTop && lastTop && (todayTop.kg > lastTop.kg || (todayTop.kg === lastTop.kg && todayTop.reps > lastTop.reps));
  if (beatVol && beatTop) return { minCopy, status: "pr" };
  if (beatVol || beatTop) return { minCopy, status: "beat" };
  if (todayVol === lastVol && today.sets.length > 0) return { minCopy, status: "match" };
  if (today.sets.length === 0) return { minCopy, status: "behind" };
  return { minCopy, status: "behind" };
}
