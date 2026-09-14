'use client';

import { useEffect, useMemo, useState } from "react";
import { Blueprint } from "@/components/Blueprint";
import {
  addDays,
  endMinutesOf,
  formatClock,
  formatRange,
  formatTime,
  normalizeRange,
  nowMinutes,
  parseTimeInput,
  todayISO,
} from "@/lib/dates";
import { useCompound } from "@/lib/store";
import { AREA_MAP, AREAS, type AreaId } from "@/lib/types";
import type { PlannedTask } from "@/lib/store";

function sectionOf(minutes: number): "AM" | "PM" | "EVE" {
  if (minutes < 12 * 60) return "AM";
  if (minutes < 18 * 60) return "PM";
  return "EVE";
}

export function TodayTab() {
  const {
    state,
    selectedDate,
    setSelectedDate,
    setTab,
    planFor,
    toggleDone,
    addTodayTask,
    deleteTask,
    updateTask,
    toggleGoalTick,
    addWeeklyGoal,
    deleteWeeklyGoal,
  } = useCompound();

  const today = todayISO();
  const isToday = selectedDate === today;
  const plan = planFor(selectedDate);
  const doneCount = plan.filter((t) => t.done).length;
  const pct = plan.length === 0 ? 0 : Math.round((doneCount / plan.length) * 100);

  const [clock, setClock] = useState("00:00");
  const [mins, setMins] = useState(0);
  const [blockOffset, setBlockOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [area, setArea] = useState<AreaId>("wiser");
  const [time, setTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [rec, setRec] = useState(false);
  const [gTitle, setGTitle] = useState("");
  const [gArea, setGArea] = useState<AreaId>("invest");
  const [gTarget, setGTarget] = useState("3");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    const tick = () => {
      setClock(formatClock());
      setMins(nowMinutes());
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isToday) setBlockOffset(0);
  }, [isToday, selectedDate]);

  const current = useMemo(() => {
    if (plan.length === 0) return null;
    const ref = isToday ? mins : plan.find((t) => !t.done)?.minutes ?? plan[0].minutes;
    let idx = plan.findIndex((t, i) => {
      const next = plan[i + 1];
      return ref >= t.minutes && (!next || ref < next.minutes);
    });
    if (idx < 0) idx = plan.findIndex((t) => t.minutes >= ref);
    if (idx < 0) idx = plan.length - 1;
    idx = Math.min(plan.length - 1, Math.max(0, idx + blockOffset));
    return { task: plan[idx], index: idx };
  }, [plan, mins, isToday, blockOffset]);

  const remaining = useMemo(() => {
    if (!current) return 0;
    const next = plan[current.index + 1];
    const end = next ? next.minutes : endMinutesOf(current.task);
    const ref = isToday ? mins : current.task.minutes;
    return Math.max(0, end - ref);
  }, [current, plan, mins, isToday]);

  const grouped = useMemo(() => {
    const g: Record<"AM" | "PM" | "EVE", PlannedTask[]> = { AM: [], PM: [], EVE: [] };
    for (const t of plan) g[sectionOf(t.minutes)].push(t);
    return g;
  }, [plan]);

  function submitAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const range = normalizeRange(parseTimeInput(time), parseTimeInput(endTime));
    addTodayTask(trimmed, area, range.start, rec, note, range.end);
    setTitle("");
    setNote("");
    setAdding(false);
    setRec(false);
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-end justify-between">
        <div>
          <p className="section-label">Daily ledger</p>
          <h1 className="heading-display text-[42px] mt-1">오늘</h1>
        </div>
        <div className="text-right">
          <p className="section-label">
            {doneCount} / {plan.length} 완료
          </p>
          <p className="text-muted text-[12px] mt-1">
            {isToday ? "오늘" : selectedDate} · {clock}
          </p>
        </div>
      </header>

      <div className="meter">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="text-muted text-[11px]">{pct}% · AM / PM / EVE 블록</p>

      {current ? (
        <Blueprint dark className="p-4">
          <div className="flex justify-between text-[11px] tracking-[0.14em] uppercase text-[#9aa0a6] font-[family-name:var(--font-heading)]">
            <span>
              {isToday ? "지금" : "블록"} · {isToday ? clock : formatTime(current.task.minutes)}
            </span>
            <span>{remaining}분 남음</span>
          </div>
          <h2 className="heading-display text-[28px] leading-[1.05] mt-3">{current.task.title}</h2>
          <p className="mt-2 text-[13px] text-[#b5b8bc] flex items-center gap-2">
            <span className={`area-dot ${current.task.area}`} />
            {AREA_MAP[current.task.area].label} · {formatTime(current.task.minutes)}
          </p>
          {current.task.note ? (
            <p className="mt-2 text-[12px] text-[#8f959b]">{current.task.note}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              className="btn"
              onClick={() => toggleDone(current.task.id, selectedDate)}
            >
              {current.task.done ? "완료 취소" : "완료 표시"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setBlockOffset((n) => n + 1)}>
              다음 블록
            </button>
          </div>
        </Blueprint>
      ) : (
        <Blueprint className="p-5">
          <p className="section-label">Empty day</p>
          <p className="mt-2 text-[14px]">아직 블록이 없습니다. 아래에서 첫 작업을 넣으세요.</p>
        </Blueprint>
      )}

      <section>
        <p className="section-label mb-2">Weekly goals</p>
        {state.weeklyGoals.length === 0 ? (
          <Blueprint className="p-4 mb-2">
            <p className="text-muted text-[13px]">직접 목표를 만드세요. 틱바로 주간 진행을 표시합니다.</p>
          </Blueprint>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {state.weeklyGoals.map((g) => {
              const on = g.ticks.filter(Boolean).length;
              return (
                <Blueprint key={g.id} className="p-3">
                  <div className="flex justify-between">
                    <p className="text-[11px] text-muted flex items-center gap-1.5">
                      <span className={`area-dot ${g.area}`} />
                      {AREA_MAP[g.area].letter}
                    </p>
                    <button type="button" className="btn-icon" onClick={() => deleteWeeklyGoal(g.id)}>
                      ×
                    </button>
                  </div>
                  <p className="heading-display text-[18px] mt-1 leading-tight">{g.title}</p>
                  <p className="text-[11px] text-muted mt-1">
                    {on} / {g.target}
                  </p>
                  <div className="tick-bar mt-2">
                    {g.ticks.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`tick ${t ? "on" : ""}`}
                        aria-label={`${g.title} ${i + 1}일차`}
                        onClick={() => toggleGoalTick(g.id, i)}
                      />
                    ))}
                  </div>
                </Blueprint>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-[1fr_72px_48px_auto] gap-1">
          <input className="input" placeholder="주간 목표" value={gTitle} onChange={(e) => setGTitle(e.target.value)} />
          <select className="input" value={gArea} onChange={(e) => setGArea(e.target.value as AreaId)}>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.letter}
              </option>
            ))}
          </select>
          <input className="input" value={gTarget} onChange={(e) => setGTarget(e.target.value)} />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (!gTitle.trim()) return;
              addWeeklyGoal(gTitle.trim(), gArea, Number(gTarget) || 1);
              setGTitle("");
            }}
          >
            ＋
          </button>
        </div>
      </section>

      {(["AM", "PM", "EVE"] as const).map((sec) => (
        <section key={sec}>
          <p className="section-label mb-2">
            {sec === "AM" ? "오전 AM" : sec === "PM" ? "오후 PM" : "저녁 EVE"}
          </p>
          <Blueprint>
            {grouped[sec].length === 0 ? (
              <p className="text-muted text-[13px] px-3 py-4">블록 없음</p>
            ) : (
              grouped[sec].map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 px-3 py-2.5 border-b border-[#ececee] last:border-b-0"
                >
                  <button type="button" onClick={() => toggleDone(t.id, selectedDate)}>
                    <span className={`check ${t.done ? "on" : ""}`}>{t.done ? "✓" : ""}</span>
                  </button>
                  <span className="heading-display text-[13px] w-[72px] shrink-0 text-muted pt-0.5">
                    {formatRange(t.minutes, endMinutesOf(t))}
                  </span>
                  <span className="flex-1 min-w-0">
                    {editingId === t.id && !t.virtual ? (
                      <input
                        className="input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => {
                          if (editTitle.trim()) updateTask(t.id, { title: editTitle.trim() });
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editTitle.trim()) updateTask(t.id, { title: editTitle.trim() });
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className={`block text-left text-[14px] ${t.done ? "line-through text-muted" : ""}`}
                        onClick={() => {
                          if (t.virtual) return;
                          setEditingId(t.id);
                          setEditTitle(t.title);
                        }}
                      >
                        {t.title}
                      </button>
                    )}
                    <span className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                      <span className={`area-dot ${t.area}`} />
                      {AREA_MAP[t.area].label}
                      {t.recurring ? " · 반복" : ""}
                      {t.note ? ` · ${t.note}` : ""}
                    </span>
                  </span>
                  {!t.virtual ? (
                    <button type="button" className="btn-icon" onClick={() => deleteTask(t.id)} aria-label="삭제">
                      ×
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </Blueprint>
        </section>
      ))}

      <section>
        {adding ? (
          <Blueprint className="p-3 flex flex-col gap-2">
            <p className="section-label">Quick add</p>
            <input className="input" placeholder="작업 제목" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="input" placeholder="메모 (선택)" value={note} onChange={(e) => setNote(e.target.value)} />
            <select className="input" value={area} onChange={(e) => setArea(e.target.value as AreaId)}>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.letter} · {a.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px]">
                시작 시간
                <input className="input mt-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <label className="text-[12px]">
                끝 시간
                <input className="input mt-1" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </label>
            </div>
            <label className="text-[12px] flex items-center gap-2">
              <input type="checkbox" checked={rec} onChange={(e) => setRec(e.target.checked)} />
              이 요일 반복
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
                취소
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "var(--neutral-900)", color: "#fff" }}
                onClick={submitAdd}
              >
                추가
              </button>
            </div>
          </Blueprint>
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={() => setAdding(true)}>
            작업 추가
          </button>
        )}
      </section>

      <Blueprint className="p-4">
        <p className="section-label">Day review</p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Stat label="완료" value={`${doneCount}/${plan.length}`} />
          <Stat label="잔여" value={`${plan.length - doneCount}`} />
          <Stat
            label="영역"
            value={`${new Set(plan.filter((t) => t.done).map((t) => t.area)).size}`}
          />
        </div>
        <p className="text-muted text-[12px] mt-3">
          {plan.length === 0
            ? "완료 통계는 작업을 체크하면 바로 반영됩니다."
            : doneCount === plan.length
              ? "오늘 블록을 모두 닫았습니다."
              : "미완료는 캘린더에서 시간을 옮길 수 있습니다."}
        </p>
        <button
          type="button"
          className="btn-secondary w-full mt-3"
          onClick={() => {
            setSelectedDate(today);
            setTab("calendar");
          }}
        >
          캘린더로 이동
        </button>
        <button
          type="button"
          className="btn w-full mt-2"
          style={{ background: "var(--neutral-900)", color: "#fff" }}
          onClick={() => setSelectedDate(addDays(today, 1))}
        >
          내일로 이동
        </button>
      </Blueprint>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <p className="heading-display text-[26px] mt-1">{value}</p>
    </div>
  );
}
