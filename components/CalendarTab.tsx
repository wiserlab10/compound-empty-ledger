'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteConfirm, EmptyState, useFlash } from "@/components/Mobile";
import {
  WEEKDAYS_KR,
  addDays,
  addMonths,
  durationLabel,
  endMinutesOf,
  formatKoreanDate,
  formatRange,
  monthLabel,
  normalizeRange,
  parseISODate,
  parseTimeInput,
  startOfMonth,
  startOfWeekMonday,
  daysInMonth,
  mondayIndex,
  toTimeInput,
} from "@/lib/dates";
import { useCompound, type PlannedTask } from "@/lib/store";
import type { AreaId } from "@/lib/types";

type Draft = {
  id?: string;
  pendingId?: string;
  title: string;
  start: string;
  end: string;
};

function emptyDraft(startMin = 9 * 60, endMin = 10 * 60): Draft {
  return { title: "", start: toTimeInput(startMin), end: toTimeInput(endMin) };
}

function draftFromTask(task: PlannedTask): Draft {
  return {
    id: task.virtual ? undefined : task.id,
    title: task.title,
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
    addCalendarPlan,
    updateTask,
    toggleDone,
    deleteTask,
  } = useCompound();
  const { flash, node } = useFlash();
  const titleRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"week" | "month">("week");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());

  const plan = planFor(selectedDate);
  const range = normalizeRange(parseTimeInput(draft.start), parseTimeInput(draft.end));

  useEffect(() => {
    if (formOpen) titleRef.current?.focus();
  }, [formOpen]);

  const week = useMemo(() => {
    const start = startOfWeekMonday(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

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

  function openNew(startMin = 9 * 60, endMin = 10 * 60) {
    setDraft(emptyDraft(startMin, endMin));
    setFormOpen(true);
  }

  function openEdit(task: PlannedTask) {
    setDraft(draftFromTask(task));
    setFormOpen(true);
  }

  function openPending(id: string, title: string) {
    setDraft({ ...emptyDraft(), pendingId: id, title });
    setFormOpen(true);
  }

  function saveDraft() {
    const title = draft.title.trim();
    if (!title) return;
    if (draft.pendingId) {
      assignPending(draft.pendingId, selectedDate, range.start, range.end);
    } else if (draft.id) {
      updateTask(draft.id, { title, minutes: range.start, endMinutes: range.end });
    } else {
      addCalendarPlan(title, "cls" as AreaId, range.start, range.end);
    }
    setDraft(emptyDraft(range.end, range.end + 60));
    setFormOpen(false);
    flash("저장됨");
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      {node}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="page-title">캘린더</h1>
          <p className="text-muted text-[13px] mt-1">{formatKoreanDate(selectedDate)}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn-secondary"
            style={mode === "week" ? { background: "var(--neutral-900)", color: "#fff" } : undefined}
            onClick={() => setMode("week")}
          >
            주
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={mode === "month" ? { background: "var(--neutral-900)", color: "#fff" } : undefined}
            onClick={() => setMode("month")}
          >
            월
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium">{monthLabel(selectedDate)}</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn-icon"
            onClick={() =>
              setSelectedDate(mode === "month" ? addMonths(selectedDate, -1) : addDays(selectedDate, -7))
            }
          >
            ‹
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() =>
              setSelectedDate(mode === "month" ? addMonths(selectedDate, 1) : addDays(selectedDate, 7))
            }
          >
            ›
          </button>
        </div>
      </div>

      {mode === "week" ? (
        <div className="grid grid-cols-7 gap-1">
          {week.map((iso, i) => {
            const on = iso === selectedDate;
            const count = planFor(iso).length;
            return (
              <button
                key={iso}
                type="button"
                className="card text-center"
                style={{
                  minHeight: 64,
                  background: on ? "var(--neutral-900)" : "#fff",
                  color: on ? "#fff" : "inherit",
                }}
                onClick={() => setSelectedDate(iso)}
              >
                <div className="text-[12px] mt-1" style={{ color: on ? "#c9d6e3" : "var(--neutral-500)" }}>
                  {WEEKDAYS_KR[i]}
                </div>
                <div className="text-[18px] font-semibold leading-none mt-1">
                  {parseISODate(iso).getDate()}
                </div>
                <div className="text-[11px] mt-1 mb-1" style={{ color: on ? "#c9d6e3" : "var(--color-accent)" }}>
                  {count ? `${count}` : "·"}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card p-2">
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS_KR.map((d) => (
              <div key={d} className="text-[12px] text-muted py-1">
                {d}
              </div>
            ))}
            {monthGrid.map((iso, i) => {
              if (!iso) return <div key={`e${i}`} />;
              const on = iso === selectedDate;
              const count = planFor(iso).length;
              return (
                <button
                  key={iso}
                  type="button"
                  className="min-h-[44px] text-[14px] relative"
                  style={{
                    background: on ? "var(--neutral-900)" : "transparent",
                    color: on ? "#fff" : "inherit",
                  }}
                  onClick={() => setSelectedDate(iso)}
                >
                  {parseISODate(iso).getDate()}
                  {count ? (
                    <span
                      className="block text-[10px]"
                      style={{ color: on ? "#c9d6e3" : "var(--color-accent)" }}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {formOpen ? (
        <form
          className="card p-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveDraft();
          }}
        >
          <label className="field-label">
            {draft.id || draft.pendingId ? "일정 수정" : "일정"}
            <input
              ref={titleRef}
              className="input mt-1"
              placeholder="제목"
              value={draft.title}
              enterKeyHint="done"
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="field-label">
              시작
              <input
                className="input mt-1"
                type="time"
                value={draft.start}
                onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
              />
            </label>
            <label className="field-label">
              끝
              <input
                className="input mt-1"
                type="time"
                value={draft.end}
                onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
              />
            </label>
          </div>
          <p className="text-[13px] text-muted">
            {formatRange(range.start, range.end)} · {durationLabel(range.start, range.end)}
          </p>
          <button type="submit" className="btn-primary">
            저장
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setDraft(emptyDraft());
                setFormOpen(false);
              }}
            >
              닫기
            </button>
            {draft.id ? (
              <DeleteConfirm
                onDelete={() => {
                  deleteTask(draft.id!);
                  setFormOpen(false);
                  flash("삭제됨");
                }}
              />
            ) : (
              <span />
            )}
          </div>
        </form>
      ) : null}

      {pending.length > 0 ? (
        <section>
          <p className="text-[13px] text-muted mb-1">시간 없는 항목 · 탭해서 시간 넣기</p>
          <div className="card overflow-hidden">
            {pending.map((t) => (
              <button key={t.id} type="button" className="row" onClick={() => openPending(t.id, t.title)}>
                <span className="text-[16px]">{t.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!formOpen && plan.length === 0 ? (
        <EmptyState text="이 날 일정이 없습니다." action="＋ 일정 추가" onAction={() => openNew()} />
      ) : null}

      {plan.length > 0 ? (
        <div className="card overflow-hidden">
          {plan.map((t) => (
            <div key={t.id} className="row">
              <button
                type="button"
                className="hit"
                aria-label={t.done ? "완료 취소" : "완료"}
                onClick={() => toggleDone(t.id, selectedDate)}
              >
                <span className={`check ${t.done ? "on" : ""}`}>{t.done ? "✓" : ""}</span>
              </button>
              <button type="button" className="flex-1 min-w-0 text-left" onClick={() => openEdit(t)}>
                <span className="block text-[13px] text-muted">
                  {formatRange(t.minutes, endMinutesOf(t))}
                </span>
                <span className={`block text-[16px] ${t.done ? "line-through text-muted" : ""}`}>
                  {t.title}
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!formOpen && plan.length > 0 ? (
        <div className="sticky-cta">
          <button type="button" className="btn-primary" onClick={() => openNew()}>
            ＋ 일정 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
