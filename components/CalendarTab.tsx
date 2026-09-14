'use client';

import { useMemo, useState } from "react";
import { Blueprint } from "@/components/Blueprint";
import {
  WEEKDAYS_KR,
  addDays,
  daysInMonth,
  durationLabel,
  endMinutesOf,
  formatKoreanDate,
  formatRange,
  formatTime,
  mondayIndex,
  monthLabel,
  normalizeRange,
  parseISODate,
  parseTimeInput,
  startOfMonth,
  startOfWeekMonday,
  addMonths,
  toTimeInput,
} from "@/lib/dates";
import { useCompound } from "@/lib/store";
import { AREA_MAP, AREAS, type AreaId } from "@/lib/types";
import type { PlannedTask } from "@/lib/store";

const HOURS = Array.from({ length: 18 }, (_, i) => 6 + i);

type Draft = {
  id?: string;
  recurId?: string;
  title: string;
  area: AreaId;
  start: string;
  end: string;
};

function emptyDraft(startMin = 9 * 60, endMin = 10 * 60): Draft {
  return {
    title: "",
    area: "wiser",
    start: toTimeInput(startMin),
    end: toTimeInput(endMin),
  };
}

function draftFromTask(task: PlannedTask): Draft {
  return {
    id: task.virtual ? undefined : task.id,
    recurId: task.recurId,
    title: task.title,
    area: task.area,
    start: toTimeInput(task.minutes),
    end: toTimeInput(endMinutesOf(task)),
  };
}

export function CalendarTab() {
  const {
    selectedDate,
    setSelectedDate,
    planFor,
    pending,
    assignPending,
    unassign,
    toggleRecurringSlot,
    toggleDowRecurring,
    addPending,
    addCalendarPlan,
    updateTask,
    toggleDone,
    deleteTask,
    state,
  } = useCompound();

  const [mode, setMode] = useState<"month" | "week">("week");
  const [area, setArea] = useState<AreaId | "all">("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(true);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingArea, setPendingArea] = useState<AreaId>("wiser");
  const [addingPending, setAddingPending] = useState(false);

  const plan = planFor(selectedDate, area);
  const dow = mondayIndex(selectedDate);
  const recurOn = state.recurDowEnabled[dow] !== false;
  const range = normalizeRange(parseTimeInput(draft.start), parseTimeInput(draft.end));

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

  function openNew(startMin = 9 * 60, endMin = 10 * 60) {
    setDraft(emptyDraft(startMin, endMin));
    setFormOpen(true);
  }

  function openEdit(task: PlannedTask) {
    setDraft(draftFromTask(task));
    setFormOpen(true);
  }

  function saveDraft() {
    const title = draft.title.trim();
    if (!title) return;
    if (draft.id) {
      updateTask(draft.id, {
        title,
        area: draft.area,
        minutes: range.start,
        endMinutes: range.end,
      });
    } else {
      addCalendarPlan(title, draft.area, range.start, range.end, draft.recurId);
    }
    setDraft(emptyDraft(range.end, range.end + 60));
    setFormOpen(true);
  }

  function onAssign(minutes: number) {
    if (!picked) {
      openNew(minutes, minutes + 30);
      return;
    }
    assignPending(picked, selectedDate, minutes, minutes + 30);
    setPicked(null);
  }

  function onDropAssign(minutes: number, e?: React.DragEvent) {
    const id = e?.dataTransfer.getData("text/plain") || picked;
    if (!id) {
      openNew(minutes, minutes + 30);
      return;
    }
    assignPending(id, selectedDate, minutes, minutes + 30);
    setPicked(null);
    setDragOver(null);
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
              const dayPlan = planFor(iso);
              const on = iso === selectedDate;
              const first = dayPlan[0];
              return (
                <button
                  key={iso}
                  type="button"
                  className="h-14 text-[13px] relative flex flex-col items-center justify-center"
                  style={{
                    background: on ? "var(--neutral-900)" : "transparent",
                    color: on ? "#fff" : "inherit",
                  }}
                  onClick={() => setSelectedDate(iso)}
                >
                  {parseISODate(iso).getDate()}
                  {first ? (
                    <span
                      className="text-[9px] leading-none mt-0.5"
                      style={{ color: on ? "#c9d6e3" : "var(--color-accent)" }}
                    >
                      {dayPlan.length === 1
                        ? formatRange(first.minutes, endMinutesOf(first))
                        : `${dayPlan.length}건`}
                    </span>
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
            const dayPlan = planFor(iso);
            return (
              <button
                key={iso}
                type="button"
                className="card py-1.5 px-0.5 text-center min-h-[72px]"
                style={{
                  background: on ? "var(--neutral-900)" : "#fff",
                  color: on ? "#fff" : "inherit",
                }}
                onClick={() => setSelectedDate(iso)}
              >
                <div className="section-label" style={{ color: on ? "#9aa0a6" : undefined }}>
                  {WEEKDAYS_KR[i]}
                </div>
                <div className="heading-display text-[18px]">{parseISODate(iso).getDate()}</div>
                {dayPlan.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className="text-[8px] leading-tight truncate px-0.5 mt-0.5"
                    style={{ color: on ? "#c9d6e3" : "var(--color-accent)" }}
                  >
                    {formatRange(t.minutes, endMinutesOf(t))}
                  </div>
                ))}
                {dayPlan.length > 2 ? (
                  <div className="text-[8px] text-muted">+{dayPlan.length - 2}</div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[13px]">{formatKoreanDate(selectedDate)}</p>

      <div className="flex flex-wrap gap-1">
        <button type="button" className="chip" data-on={area === "all"} onClick={() => setArea("all")}>
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

      <section>
        <div className="flex items-end justify-between mb-2">
          <p className="section-label">{draft.id || draft.recurId ? "일정 수정" : "일정 추가"}</p>
          <button type="button" className="btn-secondary" onClick={() => (formOpen ? setFormOpen(false) : openNew())}>
            {formOpen ? "접기" : "일정＋"}
          </button>
        </div>
        {formOpen ? (
          <Blueprint className="p-3 flex flex-col gap-2">
            <input
              className="input"
              placeholder="제목"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px]">
                시작 시간
                <input
                  className="input mt-1"
                  type="time"
                  value={draft.start}
                  onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                />
              </label>
              <label className="text-[12px]">
                끝 시간
                <input
                  className="input mt-1"
                  type="time"
                  value={draft.end}
                  onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
                />
              </label>
            </div>
            <p className="text-[12px] text-muted">
              {formatRange(range.start, range.end)} · {durationLabel(range.start, range.end)}
            </p>
            <select
              className="input"
              value={draft.area}
              onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value as AreaId }))}
            >
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.letter} · {a.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDraft(emptyDraft());
                  setFormOpen(false);
                }}
              >
                취소
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: "var(--neutral-900)", color: "#fff" }}
                onClick={saveDraft}
              >
                저장
              </button>
            </div>
          </Blueprint>
        ) : null}
      </section>

      <section>
        <p className="section-label mb-2">이날 일정</p>
        <Blueprint>
          {plan.length === 0 ? (
            <p className="text-muted text-[13px] px-3 py-4">
              아직 일정이 없습니다. 위에서 제목·시작·끝을 넣고 저장하세요.
            </p>
          ) : (
            plan.map((t) => {
              const end = endMinutesOf(t);
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-2 px-3 py-2.5 border-b border-[#ececee] last:border-b-0"
                >
                  <button type="button" onClick={() => toggleDone(t.id, selectedDate)}>
                    <span className={`check ${t.done ? "on" : ""}`}>{t.done ? "✓" : ""}</span>
                  </button>
                  <button type="button" className="flex-1 min-w-0 text-left" onClick={() => openEdit(t)}>
                    <span className="heading-display text-[15px] block">
                      {formatRange(t.minutes, end)}
                    </span>
                    <span className={`block text-[14px] mt-0.5 ${t.done ? "line-through text-muted" : ""}`}>
                      {t.title}
                    </span>
                    <span className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                      <span className={`area-dot ${t.area}`} />
                      {AREA_MAP[t.area].label} · {durationLabel(t.minutes, end)}
                      {t.recurring ? " · 반복" : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-pressed={t.recurring}
                    onClick={() => toggleRecurringSlot(t, selectedDate)}
                    title="이 요일 반복"
                  >
                    ⟳
                  </button>
                  {!t.virtual ? (
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label="삭제"
                      onClick={() => deleteTask(t.id)}
                    >
                      ×
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label="이 날 숨기기"
                      onClick={() => unassign(t, selectedDate)}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })
          )}
        </Blueprint>
      </section>

      <section>
        <p className="section-label mb-2">시간표 · 빈 칸을 탭하면 그 시간으로 폼이 채워집니다</p>
        <Blueprint>
          {HOURS.map((h) => {
            const hourStart = h * 60;
            const hourEnd = hourStart + 60;
            const covering = plan.filter((t) => t.minutes < hourEnd && endMinutesOf(t) > hourStart);
            const firstHere = covering.filter((t) => t.minutes >= hourStart && t.minutes < hourEnd);
            return (
              <div key={h} className="grid grid-cols-[44px_1fr] border-b border-[#ececee]">
                <div className="heading-display text-[13px] text-muted px-2 pt-2">
                  {String(h).padStart(2, "0")}
                </div>
                <div
                  className={`slot min-h-[36px] px-2 py-1 ${dragOver === hourStart ? "drop" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(hourStart);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === hourStart ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropAssign(hourStart, e);
                  }}
                  onClick={() => {
                    if (firstHere[0]) openEdit(firstHere[0]);
                    else onAssign(hourStart);
                  }}
                >
                  {covering.length === 0 ? (
                    <span className="text-[11px] text-muted">{formatTime(hourStart)}</span>
                  ) : (
                    firstHere.map((t) => (
                      <div key={t.id} className="plan-span flex items-center gap-2 py-0.5">
                        <span className={`area-dot ${t.area}`} />
                        <span className="flex-1 text-[13px] truncate">
                          {formatRange(t.minutes, endMinutesOf(t))} {t.title}
                        </span>
                      </div>
                    ))
                  )}
                  {covering.length > 0 && firstHere.length === 0 ? (
                    <span className="text-[10px] text-muted">계속</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Blueprint>
      </section>

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
        <p className="section-label mb-2">대기 · 끌어다 놓거나, 위에서 시간으로 바로 저장</p>
        <Blueprint>
          {pending.length === 0 ? (
            <p className="text-muted text-[13px] px-3 py-4">대기 없음. 일정은 시작·끝 시간으로 바로 넣으면 됩니다.</p>
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
        {addingPending ? (
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
              <button type="button" className="btn-secondary" onClick={() => setAddingPending(false)}>
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
                  setAddingPending(false);
                }}
              >
                대기 추가
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary w-full mt-2" onClick={() => setAddingPending(true)}>
            대기 작업 추가
          </button>
        )}
      </section>
    </div>
  );
}
