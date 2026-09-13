'use client';

import { useMemo, useState } from "react";
import { Blueprint } from "@/components/Blueprint";
import { addDays, todayISO } from "@/lib/dates";
import { useCompound } from "@/lib/store";
import {
  compareHint,
  exerciseHistory,
  exerciseVolume,
  formatVolume,
  lastSameExercise,
  sessionVolume,
  setVolume,
  topSet,
} from "@/lib/workout";

export function LogTab() {
  const {
    state,
    selectedDate,
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
  } = useCompound();

  const date = selectedDate || todayISO();
  const log = state.log;
  const dayWorkouts = log.workouts.filter((w) => w.date === date);
  const sessVol = sessionVolume(dayWorkouts);
  const meals = log.meals.filter((m) => m.date === date);
  const protein = meals.reduce((s, m) => s + m.protein, 0);
  const kcal = meals.reduce((s, m) => s + m.kcal, 0);
  const sleep = log.sleeps.find((s) => s.date === date);
  const pagesToday = log.readingDays.find((d) => d.date === date)?.pages ?? 0;
  const pagesTotal = log.readingDays.reduce((s, d) => s + d.pages, 0);
  const note = log.notes.find((n) => n.date === date)?.text ?? "";
  const weights = [...log.weights].sort((a, b) => a.date.localeCompare(b.date));
  const latestWt = weights[weights.length - 1];
  const prevWt = weights[weights.length - 2];
  const weekWeights = weights.filter((w) => w.date >= addDays(date, -6));
  const weekAvg =
    weekWeights.length > 0
      ? weekWeights.reduce((s, w) => s + w.kg, 0) / weekWeights.length
      : 0;

  const sleepStreak = useMemo(() => {
    if (!log.sleepTarget) return 0;
    const byDate = new Map(log.sleeps.map((s) => [s.date, s.hours]));
    let n = 0;
    let cursor = date;
    for (;;) {
      const h = byDate.get(cursor) ?? 0;
      if (h >= log.sleepTarget) {
        n += 1;
        cursor = addDays(cursor, -1);
      } else break;
    }
    return n;
  }, [log.sleeps, log.sleepTarget, date]);

  const weekSleeps = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDays(date, i - 6);
      return { iso, hours: log.sleeps.find((s) => s.date === iso)?.hours ?? 0 };
    });
  }, [log.sleeps, date]);
  const weekSleepAvg =
    weekSleeps.filter((d) => d.hours > 0).reduce((s, d) => s + d.hours, 0) /
    Math.max(1, weekSleeps.filter((d) => d.hours > 0).length);

  const [exName, setExName] = useState("");
  const [mealLabel, setMealLabel] = useState("");
  const [mealP, setMealP] = useState("");
  const [mealK, setMealK] = useState("");
  const [wt, setWt] = useState("");
  const [pGoal, setPGoal] = useState(log.proteinTarget ? String(log.proteinTarget) : "");
  const [kGoal, setKGoal] = useState(log.kcalTarget ? String(log.kcalTarget) : "");
  const [wGoal, setWGoal] = useState(log.weightGoal ? String(log.weightGoal) : "");
  const [book, setBookTitle] = useState(log.book);
  const [pageGoal, setPageGoal] = useState(log.pageTarget ? String(log.pageTarget) : "");
  const [customPages, setCustomPages] = useState("");
  const [sleepHours, setSleepHours] = useState(sleep ? String(sleep.hours) : "");

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compound-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const proteinLeft = log.proteinTarget > 0 ? log.proteinTarget - protein : null;
  const kcalLeft = log.kcalTarget > 0 ? log.kcalTarget - kcal : null;
  const recentReading = [...log.readingDays]
    .filter((d) => d.pages > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-end justify-between gap-2">
        <div>
          <p className="section-label">Body of work</p>
          <h1 className="heading-display text-[42px] mt-1">기록</h1>
        </div>
        <div className="flex gap-1">
          <button type="button" className="btn-secondary" onClick={download}>
            보내기
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm("모든 원장을 지우고 빈 상태로 돌립니다.")) resetLedger();
            }}
          >
            초기화
          </button>
        </div>
      </header>
      <p className="text-muted text-[12px]">{date} 세션 · 캘린더에서 날짜를 바꾸면 같이 움직입니다.</p>

      <section>
        <div className="flex items-end justify-between mb-2">
          <p className="section-label">Workout</p>
          <p className="heading-display text-[20px]">
            {dayWorkouts.length === 0 ? "—" : `Σ ${formatVolume(sessVol)}`}
          </p>
        </div>
        {dayWorkouts.length === 0 ? (
          <Blueprint className="p-4 mb-2">
            <p className="text-[14px]">오늘 운동이 없습니다.</p>
            <p className="text-muted text-[12px] mt-1">
              동작마다 kg × 회를 남기면 세션 볼륨 Σ(kg×회)와, 같은 이름 직전 세션 대비
              「지난번 같은 운동 대비 오늘 최소 …」 목표가 생깁니다.
            </p>
          </Blueprint>
        ) : (
          <p className="text-muted text-[12px] mb-2">
            세션 볼륨 {formatVolume(sessVol)} · 동작 {dayWorkouts.length} · 세트{" "}
            {dayWorkouts.reduce((n, ex) => n + ex.sets.length, 0)}
          </p>
        )}
        {dayWorkouts.map((ex) => {
          const last = lastSameExercise(log.workouts, ex.name, date);
          const history = exerciseHistory(log.workouts, ex.name, date, 5);
          const hint = compareHint(ex, last);
          const vol = exerciseVolume(ex.sets);
          const top = topSet(ex.sets);
          const lastVol = last ? exerciseVolume(last.sets) : 0;
          return (
            <Blueprint key={ex.id} className="p-3 mb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="heading-display text-[22px]">{ex.name}</p>
                  <p className="text-[12px] mt-1">{hint.minCopy}</p>
                </div>
                <button type="button" className="btn-icon" onClick={() => deleteExercise(ex.id)} aria-label="동작 삭제">
                  ×
                </button>
              </div>
              {last ? (
                <p className="text-[11px] text-muted mt-2">
                  지난 세션 {last.date} · 볼륨 {formatVolume(lastVol)}
                  {topSet(last.sets)
                    ? ` · 탑셋 ${topSet(last.sets)!.kg}kg × ${topSet(last.sets)!.reps}`
                    : ""}
                </p>
              ) : null}
              <div className="flex gap-2 mt-2">
                {hint.status === "pr" ? <span className="chip" data-on="true">PR</span> : null}
                {hint.status === "beat" ? <span className="chip" data-on="true">지난번 초과</span> : null}
                {hint.status === "match" ? <span className="chip">지난번과 동일</span> : null}
                {hint.status === "behind" && ex.sets.length > 0 ? (
                  <span className="chip">최소 미달</span>
                ) : null}
              </div>
              <table className="table mt-2">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>kg</th>
                    <th>회</th>
                    <th>볼륨</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ex.sets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-muted">
                        세트 없음. 무게와 횟수를 넣으세요.
                      </td>
                    </tr>
                  ) : (
                    ex.sets.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>
                          <input
                            className="input"
                            inputMode="decimal"
                            aria-label={`${ex.name} ${i + 1}세트 kg`}
                            value={s.kg}
                            onChange={(e) =>
                              updateSet(ex.id, s.id, { kg: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            inputMode="numeric"
                            aria-label={`${ex.name} ${i + 1}세트 회`}
                            value={s.reps}
                            onChange={(e) =>
                              updateSet(ex.id, s.id, { reps: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="heading-display">{formatVolume(setVolume(s))}</td>
                        <td>
                          <button type="button" className="btn-icon" onClick={() => deleteSet(ex.id, s.id)}>
                            ×
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <SetAdder
                onAdd={(kg, reps) => addSet(ex.id, kg, reps)}
                suggestKg={top?.kg ?? (last ? (topSet(last.sets)?.kg ?? 0) : 0)}
                suggestReps={top?.reps ?? (last ? (topSet(last.sets)?.reps ?? 0) : 0)}
              />
              <p className="text-[12px] mt-2">
                오늘 볼륨 {formatVolume(vol)}
                {last ? ` · 지난번 대비 ${vol - lastVol >= 0 ? "+" : ""}${formatVolume(vol - lastVol)}` : ""}
              </p>
              {history.length > 0 ? (
                <div className="mt-3">
                  <p className="section-label mb-1">이 동작 기록</p>
                  {history.map((h) => {
                    const hTop = topSet(h.sets);
                    return (
                      <p key={h.id} className="text-[11px] text-muted">
                        {h.date} · {h.sets.length}세트 · Σ{formatVolume(exerciseVolume(h.sets))}
                        {hTop ? ` · 탑 ${hTop.kg}×${hTop.reps}` : ""}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted mt-2">이전 세션 없음 · 오늘이 기준점이 됩니다.</p>
              )}
            </Blueprint>
          );
        })}
        <div className="flex gap-2 mt-2">
          <input
            className="input"
            placeholder="동작 이름"
            value={exName}
            onChange={(e) => setExName(e.target.value)}
          />
          <button
            type="button"
            className="btn"
            style={{ background: "var(--neutral-900)", color: "#fff" }}
            onClick={() => {
              if (!exName.trim()) return;
              addExercise(exName.trim(), date);
              setExName("");
            }}
          >
            운동＋
          </button>
        </div>
      </section>

      <section>
        <p className="section-label mb-2">Nutrition</p>
        <Blueprint className="p-3 flex flex-col gap-3">
          {meals.length === 0 && protein === 0 && kcal === 0 ? (
            <p className="text-[13px] text-muted">식사 기록이 없습니다. 목표와 끼니를 직접 넣으세요.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px]">
              단백질 목표 g
              <input
                className="input mt-1"
                inputMode="numeric"
                placeholder="비움"
                value={pGoal}
                onChange={(e) => setPGoal(e.target.value)}
              />
            </label>
            <label className="text-[12px]">
              칼로리 목표
              <input
                className="input mt-1"
                inputMode="numeric"
                placeholder="비움"
                value={kGoal}
                onChange={(e) => setKGoal(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setNutritionGoals(Number(pGoal) || 0, Number(kGoal) || 0)}
          >
            목표 저장
          </button>
          <Meter
            label="Protein"
            value={`${protein}g`}
            pct={pct(protein, log.proteinTarget)}
            hint={
              log.proteinTarget
                ? `목표 ${log.proteinTarget}g · ${proteinLeft !== null && proteinLeft >= 0 ? `${proteinLeft}g 남음` : `${Math.abs(proteinLeft ?? 0)}g 초과`}`
                : "목표 없음"
            }
          />
          <Meter
            label="Energy"
            value={`${kcal.toLocaleString("ko-KR")} kcal`}
            pct={pct(kcal, log.kcalTarget)}
            hint={
              log.kcalTarget
                ? `목표 ${log.kcalTarget.toLocaleString("ko-KR")} · ${kcalLeft !== null && kcalLeft >= 0 ? `${kcalLeft.toLocaleString("ko-KR")} 남음` : `${Math.abs(kcalLeft ?? 0).toLocaleString("ko-KR")} 초과`}`
                : "목표 없음"
            }
          />
          {meals.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_56px_64px_auto] gap-1 items-center">
              <input
                className="input"
                value={m.label}
                onChange={(e) => updateMeal(m.id, { label: e.target.value })}
              />
              <input
                className="input"
                inputMode="numeric"
                value={m.protein}
                onChange={(e) => updateMeal(m.id, { protein: Number(e.target.value) || 0 })}
                aria-label="단백질"
              />
              <input
                className="input"
                inputMode="numeric"
                value={m.kcal}
                onChange={(e) => updateMeal(m.id, { kcal: Number(e.target.value) || 0 })}
                aria-label="칼로리"
              />
              <button type="button" className="btn-icon" onClick={() => deleteMeal(m.id)}>
                ×
              </button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_56px_64px_auto] gap-1">
            <input className="input" placeholder="식사" value={mealLabel} onChange={(e) => setMealLabel(e.target.value)} />
            <input className="input" placeholder="g" inputMode="numeric" value={mealP} onChange={(e) => setMealP(e.target.value)} />
            <input className="input" placeholder="kcal" inputMode="numeric" value={mealK} onChange={(e) => setMealK(e.target.value)} />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                addMealEntry({
                  date,
                  label: mealLabel.trim() || "식사",
                  protein: Number(mealP) || 0,
                  kcal: Number(mealK) || 0,
                });
                setMealLabel("");
                setMealP("");
                setMealK("");
              }}
            >
              식사＋
            </button>
          </div>
          <p className="text-[11px] text-muted">
            이름이 비어 있으면 「식사」로 추가됩니다. g·kcal는 넣은 뒤에도 고칠 수 있습니다.
          </p>
        </Blueprint>
      </section>

      <section>
        <p className="section-label mb-2">Weight</p>
        <Blueprint className="p-3">
          <div className="flex gap-2 mb-2">
            <input
              className="input"
              placeholder="목표 kg"
              inputMode="decimal"
              value={wGoal}
              onChange={(e) => setWGoal(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setWeightGoal(Number(wGoal) || 0)}
            >
              목표
            </button>
          </div>
          {weights.length === 0 ? (
            <p className="text-muted text-[13px]">체중 기록이 없습니다. 오늘 숫자를 넣으면 추세가 생깁니다.</p>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <p className="heading-display text-[36px]">{latestWt.kg.toFixed(1)}</p>
                <p className="text-muted text-[12px] text-right">
                  {prevWt
                    ? `직전 대비 ${latestWt.kg - prevWt.kg >= 0 ? "+" : ""}${(latestWt.kg - prevWt.kg).toFixed(1)}`
                    : "첫 기록"}
                  <br />
                  {log.weightGoal > 0
                    ? `목표 ${log.weightGoal}kg · 차이 ${(latestWt.kg - log.weightGoal).toFixed(1)}`
                    : "목표 없음"}
                </p>
              </div>
              {weekWeights.length > 1 ? (
                <p className="text-[11px] text-muted mt-1">최근 7일 평균 {weekAvg.toFixed(1)}kg</p>
              ) : null}
              <Sparkline values={weights.map((w) => w.kg)} />
              {weights.slice(-8).reverse().map((w) => (
                <div key={w.id} className="flex text-[12px] mt-1 items-center">
                  <span className="flex-1 text-muted">{w.date}</span>
                  <span>{w.kg.toFixed(1)}kg</span>
                  <button type="button" className="btn-icon ml-2" onClick={() => deleteWeight(w.id)}>
                    ×
                  </button>
                </div>
              ))}
            </>
          )}
          <div className="flex gap-2 mt-2">
            <input
              className="input"
              placeholder="오늘 kg"
              inputMode="decimal"
              value={wt}
              onChange={(e) => setWt(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (!wt) return;
                addWeightEntry({ date, kg: Number(wt) || 0 });
                setWt("");
              }}
            >
              기록
            </button>
          </div>
        </Blueprint>
      </section>

      <section>
        <p className="section-label mb-2">Sleep</p>
        <Blueprint className="p-3">
          {!sleep ? (
            <p className="text-muted text-[13px] mb-2">오늘 수면 기록이 없습니다. 시간과 질을 남기세요.</p>
          ) : (
            <div className="flex items-end justify-between">
              <p className="heading-display text-[36px]">{sleep.hours.toFixed(1)}h</p>
              <p className="text-muted text-[12px] text-right">
                {log.sleepTarget > 0 ? `연속 ${sleepStreak}일 · 목표 ${log.sleepTarget}h` : "목표 없음"}
                <br />
                기록일 평균 {weekSleepAvg.toFixed(1)}h
              </p>
            </div>
          )}
          {log.sleepTarget > 0 ? (
            <div className="meter mt-2">
              <span style={{ width: `${pct(sleep?.hours ?? 0, log.sleepTarget)}%` }} />
            </div>
          ) : null}
          <div className="flex gap-1 mt-3">
            {[0, 0.5, 1].map((d) => (
              <button
                key={d}
                type="button"
                className="btn-icon"
                onClick={() => {
                  const next = Math.max(0, (sleep?.hours ?? 0) + (d === 0 ? -0.5 : d === 0.5 ? 0.5 : 1));
                  upsertSleep({ date, hours: next, quality: sleep?.quality });
                  setSleepHours(String(next));
                }}
              >
                {d === 0 ? "−" : d === 0.5 ? "+0.5" : "+1"}
              </button>
            ))}
          </div>
          <label className="text-[12px] block mt-3">
            시간 직접 입력
            <input
              className="input mt-1"
              inputMode="decimal"
              placeholder="시간"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              onBlur={() => {
                if (sleepHours === "") return;
                upsertSleep({ date, hours: Number(sleepHours) || 0, quality: sleep?.quality });
              }}
            />
          </label>
          <p className="section-label mt-3 mb-1">수면 질</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                type="button"
                className="btn-icon"
                aria-pressed={sleep?.quality === q}
                onClick={() => upsertSleep({ date, hours: sleep?.hours ?? 0, quality: q })}
              >
                {q}
              </button>
            ))}
          </div>
          <label className="text-[12px] block mt-3">
            하루 목표 h
            <input
              className="input mt-1"
              inputMode="decimal"
              placeholder="비움"
              value={log.sleepTarget || ""}
              onChange={(e) => setSleepTarget(Number(e.target.value) || 0)}
            />
          </label>
          <p className="section-label mt-3 mb-1">최근 7일</p>
          <div className="grid grid-cols-7 gap-1">
            {weekSleeps.map((d) => (
              <div key={d.iso} className="text-center">
                <p className="text-[10px] text-muted">{d.iso.slice(8)}</p>
                <p className="heading-display text-[13px]">{d.hours ? d.hours.toFixed(1) : "·"}</p>
              </div>
            ))}
          </div>
        </Blueprint>
      </section>

      <section>
        <p className="section-label mb-2">Reading</p>
        <Blueprint className="p-3">
          {!log.book && pagesTotal === 0 ? (
            <p className="text-muted text-[13px] mb-2">읽고 있는 책과 페이지가 없습니다.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="책 제목"
              value={book}
              onChange={(e) => setBookTitle(e.target.value)}
            />
            <input
              className="input"
              placeholder="목표 페이지"
              inputMode="numeric"
              value={pageGoal}
              onChange={(e) => setPageGoal(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-secondary w-full mt-2"
            onClick={() => setBook(book.trim(), Number(pageGoal) || 0)}
          >
            책 저장
          </button>
          <p className="heading-display text-[36px] mt-3">{pagesToday}p</p>
          <p className="text-muted text-[12px]">
            오늘 {pagesToday}p · 누적 {pagesTotal}p
            {log.book ? ` · ${log.book}` : ""}
            {log.pageTarget > 0 ? ` / ${log.pageTarget}` : ""}
          </p>
          {log.pageTarget > 0 ? (
            <div className="meter mt-2">
              <span style={{ width: `${pct(pagesTotal, log.pageTarget)}%` }} />
            </div>
          ) : null}
          <div className="grid grid-cols-4 gap-1 mt-2">
            {[1, 5, 10, -1].map((n) => (
              <button
                key={n}
                type="button"
                className="btn-secondary"
                onClick={() => addReadingPages(date, n)}
              >
                {n > 0 ? `+${n}p` : "−1p"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              className="input"
              placeholder="오늘 페이지 수"
              inputMode="numeric"
              value={customPages}
              onChange={(e) => setCustomPages(e.target.value)}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (customPages === "") return;
                setReadingPages(date, Number(customPages) || 0);
                setCustomPages("");
              }}
            >
              지정
            </button>
          </div>
          {recentReading.length === 0 ? null : (
            <div className="mt-3">
              <p className="section-label mb-1">최근</p>
              {recentReading.map((d) => (
                <div key={d.date} className="flex text-[12px] items-center">
                  <span className="flex-1 text-muted">{d.date}</span>
                  <span>{d.pages}p</span>
                  <button type="button" className="btn-icon ml-2" onClick={() => deleteReadingDay(d.date)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Blueprint>
      </section>

      <section>
        <p className="section-label mb-2">Daily note</p>
        <textarea
          className="input"
          placeholder="오늘 한 줄"
          value={note}
          onChange={(e) => setNoteFor(date, e.target.value)}
        />
      </section>
    </div>
  );
}

function SetAdder({
  onAdd,
  suggestKg,
  suggestReps,
}: {
  onAdd: (kg: number, reps: number) => void;
  suggestKg: number;
  suggestReps: number;
}) {
  const [kg, setKg] = useState(suggestKg ? String(suggestKg) : "");
  const [reps, setReps] = useState(suggestReps ? String(suggestReps) : "");
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-1 mt-2">
      <input
        className="input"
        placeholder="kg"
        inputMode="decimal"
        value={kg}
        onChange={(e) => setKg(e.target.value)}
        aria-label="kg"
      />
      <input
        className="input"
        placeholder="회"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        aria-label="reps"
      />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          onAdd(Number(kg) || 0, Number(reps) || 0);
        }}
      >
        세트＋
      </button>
    </div>
  );
}

function pct(n: number, t: number) {
  if (!t) return 0;
  return Math.min(100, (n / t) * 100);
}

function Meter({
  label,
  value,
  pct: p,
  hint,
}: {
  label: string;
  value: string;
  pct: number;
  hint: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <p className="section-label">{label}</p>
        <p className="heading-display text-[20px]">{value}</p>
      </div>
      <div className="meter mt-1">
        <span style={{ width: `${p}%` }} />
      </div>
      <p className="text-muted text-[11px] mt-1">{hint}</p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const w = 320;
  const h = 56;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.4, max - min);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full mt-2" aria-hidden>
      <polyline
        fill="none"
        stroke="#5980a6"
        strokeWidth="1.6"
        points={values
          .map((v, i) => {
            const x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 8) + 4;
            const y = h - 8 - ((v - min) / span) * (h - 16);
            return `${x},${y}`;
          })
          .join(" ")}
      />
    </svg>
  );
}
