"use client";

import { useMemo, useState } from "react";
import { Blueprint } from "@/components/Blueprint";
import {
  WEEKDAYS_KR,
  addDays,
  daysInMonth,
  formatKoreanDate,
  formatTime,
  mondayIndex,
  monthLabel,
  parseISODate,
  startOfMonth,
  startOfWeekMonday,
  addMonths,
} from "@/lib/dates";
import { useCompound } from "@/lib/store";
import { AREA_MAP, AREAS, type AreaId } from "@/lib/types";
import type { PlannedTask } from "@/lib/store";

const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i);

export function CalendarTab() {
  const {
    state,
    selectedDate,
    setSelectedDate,
    planFor,
    pending,
    assignPending,
    unassign,
    toggleRecurringSlot,
    toggleDowRecurring,
    addPending,
    toggleDone,
    deleteTask,
  } = useCompound();

  const [mode, setMode] = useState<"month" | "week">("week");
  const [area, setArea] = useState<AreaId | "all">("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingArea, setPendingArea] = useState<AreaId>("wiser");

  const plan = planFor(selectedDate, area);
  const dow = mondayIndex(selectedDate);
  const recurOn = state.recurDowEnabled[dow] !== false;

  const monthIso = startOfMonth(selectedDate);
  const monthGrid = useMemo(() => {
    const first = startOfMonth(selectedDate);
    const lead = mondayIndex(first);
    const count = daysInMonth(selectedDate);
    const cells: (string | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= count; d++) {
      cells.push(`${first.slice(0, 8)}${String(d).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [selectedDate]);

  const week = useMemo(() => {
    const start = startOfWeekMonday(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const occupied = useMemo(() => {
    const map = new Map<number, PlannedTask>();
    for (const t of plan) map.set(t.minutes, t);
    return map;
  }, [plan]);

  function onAssign(minutes: number) {
    if (!picked) return;
    assignPending(picked, selectedDate, minutes);
    setPicked(null);
  }

  function onDropAssign(minutes: number, e?: React.DragEvent) {
    const id = e?.dataTransfer.getData("text/plain") || picked;
    if (!id) return;
    assignPending(id, selectedDate, minutes);
    setPicked(null);
    setDragOver(null);
  }

  function slotClick(minutes: number, task?: PlannedTask) {
    if (task) {
      unassign(task, selectedDate);
      return;
    }
    if (picked) onAssign(minutes);
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-end justify-between">
        <div>
          <p className="section-label">Schedule</p>
          <h1 className="heading-display text-[42px] mt-1">캘린더</h1>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn-icon"
            aria-pressed={mode === "week"}
            onClick={() => setMode("week")}
          >
            W
          </button>
          <button
            type="button"
            className="btn-icon"
            aria-pressed={mode === "month"}
            onClick={() => setMode("month")}
          >
            M
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <p className="heading-display text-[22px]">{monthLabel(selectedDate)}</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn-icon"
            onClick={() =>
              setSelectedDate(
                mode === "month" ? addMonths(selectedDate, -1) : addDays(selectedDate, -7),
              )
            }
          >
            ‹
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() =>
              setSelectedDate(
                mode === "month" ? addMonths(selectedDate, 1) : addDays(selectedDate, 7),
              )
            }
          >
            ›
          </button>
        </div>
      </div>

      {mode === "month" ? (
        <Blueprint className="p-2">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS_KR.map((d) => (
              <div key={d} className="section-label py-1">
                {d}
              </div>
            ))}
            {monthGrid.map((iso, i) => {
              if (!iso) return <div key={`e${i}`} />;
              const n = planFor(iso).length;
              const on = iso === selectedDate;
              return (
                <button
                  key={iso}
                  type="button"
                  className="h-11 text-[13px] relative"
                  style={{
                    background: on ? "var(--neutral-900)" : "transparent",
                    color: on ? "#fff" : "inherit",
                  }}
                  onClick={() => setSelectedDate(iso)}
                >
                  {parseISODate(iso).getDate()}
                  {n > 0 ? (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1"
                      style={{ background: on ? "#fff" : "var(--color-accent)" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </Blueprint>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {week.map((iso, i) => {
            const on = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                className="card py-2 text-center"
                style={{
                  background: on ? "var(--neutral-900)" : "#fff",
                  color: on ? "#fff" : "inherit",
                }}
                onClick={() => setSelectedDate(iso)}
              >
                <div className="section-label" style={{ color: on ? "#9aa0a6" : undefined }}>
                  {WEEKDAYS_KR[i]}
                </div>
                <div className="heading-display text-[18px] mt-1">
                  {parseISODate(iso).getDate()}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[13px]">{formatKoreanDate(selectedDate)}</p>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="chip"
          data-on={area === "all"}
          onClick={() => setArea("all")}
        >
          ALL
        </button>
        {AREAS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="chip"
            data-on={area === a.id}
            onClick={() => setArea(a.id)}
          >
            <span className={`area-dot ${a.id}`} />
            {a.letter}
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between card px-3 py-2 text-[13px]">
        <span>이 요일 주간 반복</span>
        <button
          type="button"
          className="btn-icon"
          aria-pressed={recurOn}
          onClick={() => toggleDowRecurring(dow)}
        >
          {recurOn ? "ON" : "OFF"}
        </button>
      </label>

      <section>
        <p className="section-label mb-2">Day plan · 탭하면 해제 / 대기 선택 후 슬롯 지정</p>
        <Blueprint>
          {HOURS.map((h) => {
            const slots = [h * 60, h * 60 + 30];
            return (
              <div key={h} className="grid grid-cols-[44px_1fr] border-b border-[#ececee]">
                <div className="heading-display text-[13px] text-muted px-2 pt-2">
                  {String(h).padStart(2, "0")}
                </div>
                <div>
                  {slots.map((m) => {
                    const task = occupied.get(m);
                    return (
                      <div
                        key={m}
                        className={`slot flex items-center gap-2 px-2 ${dragOver === m ? "drop" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(m);
                        }}
                        onDragLeave={() => setDragOver((v) => (v === m ? null : v))}
                        onDrop={(e) => {
                          e.preventDefault();
                          onDropAssign(m, e);
                        }}
                        onClick={() => slotClick(m, task)}
                      >
                        {task ? (
                          <>
                            <span className={`area-dot ${task.area}`} />
                            <span className="flex-1 text-[13px] truncate">
                              {formatTime(task.minutes)} {task.title}
                            </span>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: 28, height: 28, fontSize: 16 }}
                              aria-pressed={task.recurring}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRecurringSlot(task, selectedDate);
                              }}
                              title="이 요일 반복"
                            >
                              ⟳
                            </button>
                            <button
                              type="button"
                              className={`check ${task.done ? "on" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDone(task.id, selectedDate);
                              }}
                            >
                              {task.done ? "✓" : ""}
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted">
                            {formatTime(m)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Blueprint>
      </section>

      <section>
        <p className="section-label mb-2">Pending · 드래그 또는 탭 후 슬롯</p>
        <Blueprint>
          {pending.length === 0 ? (
            <p className="text-muted text-[13px] px-3 py-4">
              대기 없음. 작업을 만들고 슬롯을 탭하거나 끄어다 놓으세요. 날짜를 바꿜도 저장됩니다.
            </p>
          ) : (
            pending.map((t) => (
              <div
                key={t.id}
                draggable
                className="pending-item flex items-center gap-2 px-3 py-2.5 border-b border-[#ececee] last:border-b-0"
                data-selected={picked === t.id}
                onClick={() => setPicked((p) => (p === t.id ? null : t.id))}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", t.id);
                  setPicked(t.id);
                }}
              >
                <span className={`area-dot ${t.area}`} />
                <span className="flex-1 text-[14px]">{t.title}</span>
                <span className="text-[11px] text-muted">{AREA_MAP[t.area].letter}</span>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="대기 삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(t.id);
                    setPicked((p) => (p === t.id ? null : p));
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </Blueprint>
        {adding ? (
          <div className="flex flex-col gap-2 mt-2">
            <input
              className="input"
              placeholder="대기 작업"
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
            />
            <select
              className="input"
              value={pendingArea}
              onChange={(e) => setPendingArea(e.target.value as AreaId)}
            >
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
                취소
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "var(--neutral-900)", color: "#fff" }}
                onClick={() => {
                  if (!pendingTitle.trim()) return;
                  addPending(pendingTitle.trim(), pendingArea);
                  setPendingTitle("");
                  setAdding(false);
                }}
              >
                대기 추가
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary w-full mt-2" onClick={() => setAdding(true)}>
            대기 작업 추가
          </button>
        )}
      </section>
      <p className="text-muted text-[11px]">
        {monthIso} 기준 · 슬롯을 탭하면 대기로 되돌립니다. ⟳ 는 해당 요일 반복을 토글합니다.
      </p>
    </div>
  );
}
