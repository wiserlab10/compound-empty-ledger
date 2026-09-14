'use client';

import { useMemo, useRef, useState } from "react";
import { EmptyState, useFlash } from "@/components/Mobile";
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
  } = useCompound();
  const { flash, node } = useFlash();
  const nameRef = useRef<HTMLInputElement>(null);
  const kgRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const mealRef = useRef<HTMLInputElement>(null);
  const wtRef = useRef<HTMLInputElement>(null);
  const sleepRef = useRef<HTMLInputElement>(null);
  const bookRef = useRef<HTMLInputElement>(null);

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
    weekWeights.length > 0 ? weekWeights.reduce((s, w) => s + w.kg, 0) / weekWeights.length : 0;

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
  const [kg, setKg] = useState("");
  const [reps, setReps] = useState("");
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

  const hintEx = lastSameExercise(log.workouts, exName, date);
  const hintTop = hintEx ? topSet(hintEx.sets) : null;

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compound-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseAmount(raw: string) {
    const n = Number(String(raw).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  function saveSet() {
    const name = exName.trim();
    if (!name) {
      nameRef.current?.focus();
      return;
    }
    if (kg.trim() === "") {
      kgRef.current?.focus();
      return;
    }
    if (reps.trim() === "") {
      repsRef.current?.focus();
      return;
    }
    const nextKg = parseAmount(kg);
    const nextReps = parseAmount(reps);
    if (!Number.isFinite(nextKg) || !Number.isFinite(nextReps)) {
      kgRef.current?.focus();
      return;
    }
    logSet(name, date, nextKg, nextReps);
    setKg("");
    setReps("");
    flash("추가됨");
    requestAnimationFrame(() => kgRef.current?.focus());
  }

  const proteinLeft = log.proteinTarget > 0 ? log.proteinTarget - protein : null;
  const kcalLeft = log.kcalTarget > 0 ? log.kcalTarget - kcal : null;
  const recentReading = [...log.readingDays]
    .filter((d) => d.pages > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <div className="flex flex-col gap-3 pt-2">
      {node}
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="large-title">기록</h1>
          <p className="subhead">{date}</p>
        </div>
        <div className="flex gap-1 pt-1">
          <button type="button" className="text-link" onClick={download}>
            보내기
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (window.confirm("모든 원장을 지우고 빈 상태로 돌립니다.")) resetLedger();
            }}
          >
            초기화
          </button>
        </div>
      </header>

      <section>
        <div className="flex items-end justify-between mb-2">
          <p className="section-title" style={{ marginTop: 8 }}>운동</p>
          <p className="text-[13px] text-muted">
            {dayWorkouts.length === 0 ? "—" : `합계 ${formatVolume(sessVol)}`}
          </p>
        </div>

        <form
          className="card p-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveSet();
          }}
        >
          <input
            ref={nameRef}
            className="input"
            placeholder="동작"
            value={exName}
            enterKeyHint="next"
            onChange={(e) => setExName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="field-label">
              kg
              <input
                ref={kgRef}
                className="input mt-1"
                placeholder="kg"
                inputMode="decimal"
                value={kg}
                aria-label="kg"
                onChange={(e) => setKg(e.target.value)}
              />
            </label>
            <label className="field-label">
              횟수
              <input
                ref={repsRef}
                className="input mt-1"
                placeholder="횟수"
                inputMode="numeric"
                value={reps}
                aria-label="횟수"
                onChange={(e) => setReps(e.target.value)}
              />
            </label>
          </div>
          <button type="submit" className="btn-primary">
            세트 추가
          </button>
          {exName.trim() && hintEx ? (
            <p className="text-[13px] text-muted">
              지난번 {hintEx.date}
              {hintTop ? ` · ${hintTop.kg}kg × ${hintTop.reps}회` : ""} · 최소 합계{" "}
              {formatVolume(exerciseVolume(hintEx.sets))}
            </p>
          ) : exName.trim() ? (
            <p className="text-[13px] text-muted">이 동작의 첫 기록입니다.</p>
          ) : (
            <p className="text-[13px] text-muted">동작·kg·횟수를 한 번에 넣습니다.</p>
          )}
        </form>

        {dayWorkouts.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              text="오늘 세트가 없습니다."
              action="세트 추가"
              onAction={() => {
                if (!exName.trim()) nameRef.current?.focus();
                else kgRef.current?.focus();
              }}
            />
          </div>
        ) : null}

        {dayWorkouts.map((ex) => {
          const last = lastSameExercise(log.workouts, ex.name, date);
          const history = exerciseHistory(log.workouts, ex.name, date, 3);
          const hint = compareHint(ex, last);
          const vol = exerciseVolume(ex.sets);
          const lastVol = last ? exerciseVolume(last.sets) : 0;
          return (
            <div key={ex.id} className="card p-3 mt-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[17px] font-medium">{ex.name}</p>
                  <p className="text-[13px] text-muted mt-1">{hint.minCopy}</p>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => deleteExercise(ex.id)}
                  aria-label="동작 삭제"
                >
                  ×
                </button>
              </div>
              {ex.sets.map((s, i) => (
                <div key={s.id} className="set-row">
                  <span className="text-[13px] text-muted">{i + 1}</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={s.kg}
                    aria-label={`${ex.name} ${i + 1}세트 kg`}
                    onChange={(e) => updateSet(ex.id, s.id, { kg: Number(e.target.value) || 0 })}
                  />
                  <input
                    className="input"
                    inputMode="numeric"
                    value={s.reps}
                    aria-label={`${ex.name} ${i + 1}세트 횟수`}
                    onChange={(e) => updateSet(ex.id, s.id, { reps: Number(e.target.value) || 0 })}
                  />
                  <span className="text-[13px] text-muted">{formatVolume(setVolume(s))}</span>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label="세트 삭제"
                    onClick={() => deleteSet(ex.id, s.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <RepeatSet
                onAdd={(nextKg, nextReps) => {
                  addSet(ex.id, nextKg, nextReps);
                  flash("추가됨");
                }}
              />
              <p className="text-[13px] text-muted mt-2">
                오늘 합계 {formatVolume(vol)}
                {last ? ` · 지난번 ${vol - lastVol >= 0 ? "+" : ""}${formatVolume(vol - lastVol)}` : ""}
              </p>
              {history.length > 0 ? (
                <div className="mt-2">
                  {history.map((h) => {
                    const hTop = topSet(h.sets);
                    return (
                      <p key={h.id} className="text-[12px] text-muted">
                        {h.date} · {h.sets.length}세트 · 합계 {formatVolume(exerciseVolume(h.sets))}
                        {hTop ? ` · ${hTop.kg}kg × ${hTop.reps}회` : ""}
                      </p>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section>
        <p className="section-title">식사</p>
        <div className="card p-3 flex flex-col gap-3">
          {meals.length === 0 && protein === 0 && kcal === 0 ? (
            <div className="empty" style={{ padding: "8px 0 12px" }}>
              <p>식사 기록이 없습니다.</p>
              <button type="button" className="btn-primary" onClick={() => mealRef.current?.focus()}>
                식사 추가
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="field-label">
              단백질 목표 g
              <input
                className="input mt-1"
                inputMode="numeric"
                placeholder="비움"
                value={pGoal}
                onChange={(e) => setPGoal(e.target.value)}
              />
            </label>
            <label className="field-label">
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
            onClick={() => {
              setNutritionGoals(Number(pGoal) || 0, Number(kGoal) || 0);
              flash("저장됨");
            }}
          >
            목표 저장
          </button>
          <Meter
            label="단백질"
            value={`${protein}g`}
            pct={pct(protein, log.proteinTarget)}
            hint={
              log.proteinTarget
                ? `목표 ${log.proteinTarget}g · ${proteinLeft !== null && proteinLeft >= 0 ? `${proteinLeft}g 남음` : `${Math.abs(proteinLeft ?? 0)}g 초과`}`
                : "목표 없음"
            }
          />
          <Meter
            label="칼로리"
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
              <button type="button" className="btn-icon" aria-label="식사 삭제" onClick={() => deleteMeal(m.id)}>
                ×
              </button>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_56px_64px_auto] gap-1">
            <input
              ref={mealRef}
              className="input"
              placeholder="식사"
              value={mealLabel}
              onChange={(e) => setMealLabel(e.target.value)}
            />
            <input
              className="input"
              placeholder="g"
              inputMode="numeric"
              value={mealP}
              onChange={(e) => setMealP(e.target.value)}
            />
            <input
              className="input"
              placeholder="kcal"
              inputMode="numeric"
              value={mealK}
              onChange={(e) => setMealK(e.target.value)}
            />
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
                flash("추가됨");
              }}
            >
              추가
            </button>
          </div>
        </div>
      </section>

      <section>
        <p className="section-title">체중</p>
        <div className="card p-3">
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
              onClick={() => {
                setWeightGoal(Number(wGoal) || 0);
                flash("저장됨");
              }}
            >
              목표
            </button>
          </div>
          {weights.length === 0 ? (
            <div className="empty" style={{ padding: "8px 0 12px" }}>
              <p>체중 기록이 없습니다.</p>
              <button type="button" className="btn-primary" onClick={() => wtRef.current?.focus()}>
                체중 기록
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <p className="large-title">{latestWt.kg.toFixed(1)}</p>
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
              {weights
                .slice(-8)
                .reverse()
                .map((w) => (
                  <div key={w.id} className="flex text-[13px] mt-1 items-center">
                    <span className="flex-1 text-muted">{w.date}</span>
                    <span>{w.kg.toFixed(1)}kg</span>
                    <button
                      type="button"
                      className="btn-icon ml-2"
                      aria-label="체중 삭제"
                      onClick={() => deleteWeight(w.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
            </>
          )}
          <div className="flex gap-2 mt-2">
            <input
              ref={wtRef}
              className="input"
              placeholder="오늘 kg"
              inputMode="decimal"
              value={wt}
              onChange={(e) => setWt(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              style={{ width: "auto", minWidth: 72 }}
              onClick={() => {
                if (!wt) return;
                addWeightEntry({ date, kg: Number(wt) || 0 });
                setWt("");
                flash("추가됨");
              }}
            >
              기록
            </button>
          </div>
        </div>
      </section>

      <section>
        <p className="section-title">수면</p>
        <div className="card p-3">
          {!sleep ? (
            <div className="empty" style={{ padding: "8px 0 12px" }}>
              <p>오늘 수면 기록이 없습니다.</p>
              <button type="button" className="btn-primary" onClick={() => sleepRef.current?.focus()}>
                수면 기록
              </button>
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <p className="large-title">{sleep.hours.toFixed(1)}h</p>
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
          <label className="field-label mt-3">
            시간
            <input
              ref={sleepRef}
              className="input mt-1"
              inputMode="decimal"
              placeholder="시간"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              onBlur={() => {
                if (sleepHours === "") return;
                upsertSleep({ date, hours: Number(sleepHours) || 0, quality: sleep?.quality });
                flash("저장됨");
              }}
            />
          </label>
          <p className="field-label mt-3">질</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((q) => (
              <button
                key={q}
                type="button"
                className="btn-icon"
                aria-pressed={sleep?.quality === q}
                onClick={() =>
                  upsertSleep({
                    date,
                    hours: sleep?.hours ?? (Number(sleepHours) || 0),
                    quality: q,
                  })
                }
              >
                {q}
              </button>
            ))}
          </div>
          <label className="field-label mt-3">
            하루 목표 h
            <input
              className="input mt-1"
              inputMode="decimal"
              placeholder="비움"
              value={log.sleepTarget || ""}
              onChange={(e) => setSleepTarget(Number(e.target.value) || 0)}
            />
          </label>
          <div className="grid grid-cols-7 gap-1 mt-3">
            {weekSleeps.map((d) => (
              <div key={d.iso} className="text-center">
                <p className="text-[10px] text-muted">{d.iso.slice(8)}</p>
                <p className="text-[13px]">{d.hours ? d.hours.toFixed(1) : "·"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <p className="section-title">독서</p>
        <div className="card p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={bookRef}
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
            onClick={() => {
              setBook(book.trim(), Number(pageGoal) || 0);
              flash("저장됨");
            }}
          >
            책 저장
          </button>
          {pagesToday === 0 && pagesTotal === 0 ? (
            <div className="empty" style={{ padding: "12px 0 8px" }}>
              <p>독서 기록이 없습니다.</p>
              <button type="button" className="btn-primary" onClick={() => bookRef.current?.focus()}>
                책 기록
              </button>
            </div>
          ) : null}
          <p className="large-title mt-3">{pagesToday}p</p>
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
              <button key={n} type="button" className="btn-secondary" onClick={() => addReadingPages(date, n)}>
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
              {recentReading.map((d) => (
                <div key={d.date} className="flex text-[13px] items-center">
                  <span className="flex-1 text-muted">{d.date}</span>
                  <span>{d.pages}p</span>
                  <button
                    type="button"
                    className="btn-icon ml-2"
                    aria-label="독서 삭제"
                    onClick={() => deleteReadingDay(d.date)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <p className="section-title">한 줄</p>
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

function RepeatSet({ onAdd }: { onAdd: (kg: number, reps: number) => void }) {
  const [kg, setKg] = useState("");
  const [reps, setReps] = useState("");
  const kgRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="field-label">
          kg
          <input
            ref={kgRef}
            className="input mt-1"
            placeholder="kg"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            aria-label="추가 kg"
          />
        </label>
        <label className="field-label">
          횟수
          <input
            className="input mt-1"
            placeholder="횟수"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            aria-label="추가 횟수"
          />
        </label>
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          if (kg.trim() === "") {
            kgRef.current?.focus();
            return;
          }
          if (reps.trim() === "") return;
          const nextKg = Number(String(kg).replace(/[^\d.]/g, ""));
          const nextReps = Number(String(reps).replace(/[^\d.]/g, ""));
          if (!Number.isFinite(nextKg) || !Number.isFinite(nextReps)) {
            kgRef.current?.focus();
            return;
          }
          onAdd(nextKg, nextReps);
          setKg("");
          setReps("");
          requestAnimationFrame(() => kgRef.current?.focus());
        }}
      >
        세트 추가
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
        <p className="text-[13px] text-muted">{label}</p>
        <p className="text-[16px] font-medium">{value}</p>
      </div>
      <div className="meter mt-1">
        <span style={{ width: `${p}%` }} />
      </div>
      <p className="text-muted text-[12px] mt-1">{hint}</p>
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
        stroke="#007aff"
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
