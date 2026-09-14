'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { DeleteConfirm, EmptyState, Sheet, useFlash } from "@/components/Mobile";
import {
  WEEKDAYS_KR,
  addDays,
  addMonths,
  daysInMonth,
  durationLabel,
  endMinutesOf,
  formatKoreanDate,
  formatRange,
  mondayIndex,
  monthLabel,
  normalizeRange,
  parseISODate,
  parseTimeInput,
  startOfMonth,
  startOfWeekMonday,
  todayISO,
  toTimeInput,
} from "@/lib/dates";
import { useCompound, type PlannedTask } from "@/lib/store";
import { AREA_MAP, type AreaId } from "@/lib/types";

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());

  const plan = planFor(selectedDate);
  const range = normalizeRange(parseTimeInput(draft.start), parseTimeInput(draft.end));
  const today = todayISO();

  useEffect(() => {
    if (sheetOpen) titleRef.current?.focus();
  }, [sheetOpen]);

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

  function openNew() {
    setDraft(emptyDraft(9 * 60, 10 * 60));
    setSheetOpen(true);
  }

  function openEdit(task: PlannedTask) {
    setDraft(draftFromTask(task));
    setSheetOpen(true);
  }

  function openPending(id: string, title: string) {
    setDraft({ ...emptyDraft(), pendingId: id, title });
    setSheetOpen(true);
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
    setSheetOpen(false);
    flash("저장됨");
  }

  return (
    <div className="pt-2">
      {node}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="large-title">캘린더</h1>
          <p className="subhead">{monthLabel(selectedDate).replace(".", "년 ")}월</p>
        </div>
        <div className="flex gap-1 pt-1">
          <button
            type="button"
            className="btn-icon"
            onClick={() => setSelectedDate(addMonths(selectedDate, -1))}
          >
            ‹
          </button>
          <button type="button" className="btn-icon" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>
            ›
          </button>
          <button type="button" className="btn-icon" aria-label="일정 추가" onClick={openNew}>
            <IconPlus className="nav-icon" />
          </button>
        </div>
      </header>

      <div className="card mt-4 px-1 pb-2">
        <div className="cal-grid">
          {WEEKDAYS_KR.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {monthGrid.map((iso, i) => {
            if (!iso) return <div key={`e${i}`} />;
            const on = iso === selectedDate;
            const isToday = iso === today;
            const count = planFor(iso).length;
            return (
              <button
                key={iso}
                type="button"
                className="cal-cell"
                data-on={on}
                data-today={isToday}
                onClick={() => setSelectedDate(iso)}
              >
                <span className="num">{parseISODate(iso).getDate()}</span>
                {count ? <div className="cal-dot" /> : <div style={{ height: 7 }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="week-strip">
        {week.map((iso, i) => {
          const on = iso === selectedDate;
          return (
            <button key={iso} type="button" className="week-cell" data-on={on} onClick={() => setSelectedDate(iso)}>
              <div className="text-[11px] font-semibold" style={{ opacity: 0.7 }}>
                {WEEKDAYS_KR[i]}
              </div>
              <div className="text-[17px] font-semibold">{parseISODate(iso).getDate()}</div>
            </button>
          );
        })}
      </div>

      <p className="section-title" style={{ marginTop: 4 }}>
        {formatKoreanDate(selectedDate)}
      </p>

      {pending.length > 0 ? (
        <div className="card mb-3">
          {pending.map((t) => (
            <button key={t.id} type="button" className="row" onClick={() => openPending(t.id, t.title)}>
              <span className={`area-dot ${t.area}`} />
              <span className="text-[17px]">{t.title}</span>
            </button>
          ))}
        </div>
      ) : null}

      {plan.length === 0 ? (
        <EmptyState text="이 날 일정이 없습니다." action="일정 추가" onAction={openNew} />
      ) : (
        <div className="card">
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
                <span className={`block text-[17px] ${t.done ? "line-through text-muted" : ""}`}>
                  {t.title}
                </span>
                <span className="text-[13px] text-muted flex items-center gap-1.5 mt-0.5">
                  <span className={`area-dot ${t.area}`} />
                  {formatRange(t.minutes, endMinutesOf(t))} · {durationLabel(t.minutes, endMinutesOf(t))} ·{" "}
                  {AREA_MAP[t.area].label}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} title={draft.id || draft.pendingId ? "일정 수정" : "새 일정"} onClose={() => setSheetOpen(false)}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveDraft();
          }}
        >
          <label className="field-label">
            제목
            <input
              ref={titleRef}
              className="input mt-1"
              placeholder="일정 이름"
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
          {draft.id ? (
            <DeleteConfirm
              onDelete={() => {
                deleteTask(draft.id!);
                setSheetOpen(false);
                flash("삭제됨");
              }}
            />
          ) : null}
        </form>
      </Sheet>
    </div>
  );
}
