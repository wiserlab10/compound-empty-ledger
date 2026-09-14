'use client';

import { useEffect, useRef, useState } from "react";
import { DeleteConfirm, EmptyState, SwipeRow, useFlash } from "@/components/Mobile";
import {
  addDays,
  endMinutesOf,
  formatKoreanDate,
  formatRange,
  normalizeRange,
  nowMinutes,
  parseTimeInput,
  todayISO,
  toTimeInput,
} from "@/lib/dates";
import { useCompound, type PlannedTask } from "@/lib/store";

export function TodayTab() {
  const { selectedDate, setSelectedDate, planFor, toggleDone, addTodayTask, deleteTask, updateTask } =
    useCompound();
  const { flash, node } = useFlash();
  const titleRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const isToday = selectedDate === today;
  const plan = planFor(selectedDate);
  const doneCount = plan.filter((t) => t.done).length;

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState<PlannedTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");

  useEffect(() => {
    if (adding) titleRef.current?.focus();
  }, [adding]);

  function openAdd() {
    setEditing(null);
    setTitle("");
    setTime(toTimeInput(nowMinutes()));
    setAdding(true);
  }

  function saveAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const start = time ? parseTimeInput(time) : nowMinutes();
    const range = normalizeRange(start, start + 60);
    addTodayTask(trimmed, "cls", range.start, false, undefined, range.end);
    setTitle("");
    setAdding(false);
    flash("추가됨");
  }

  function openEdit(task: PlannedTask) {
    if (task.virtual) return;
    setAdding(false);
    setEditing(task);
    setEditTitle(task.title);
    setEditTime(toTimeInput(task.minutes));
  }

  function saveEdit() {
    if (!editing || editing.virtual) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    const start = editTime ? parseTimeInput(editTime) : editing.minutes;
    const range = normalizeRange(start, start + Math.max(30, endMinutesOf(editing) - editing.minutes));
    updateTask(editing.id, { title: trimmed, minutes: range.start, endMinutes: range.end });
    setEditing(null);
    flash("저장됨");
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      {node}
      <header className="flex items-end justify-between">
        <div>
          <h1 className="page-title">{isToday ? "오늘" : formatKoreanDate(selectedDate)}</h1>
          <p className="text-muted text-[13px] mt-1">
            {isToday ? formatKoreanDate(today) : selectedDate} · {doneCount}/{plan.length} 완료
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" className="btn-icon" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
            ‹
          </button>
          <button type="button" className="btn-icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            ›
          </button>
        </div>
      </header>

      {!isToday ? (
        <button type="button" className="btn-secondary w-full" onClick={() => setSelectedDate(today)}>
          오늘로
        </button>
      ) : null}

      {adding ? (
        <form
          className="card p-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveAdd();
          }}
        >
          <label className="field-label">
            할 일
            <input
              ref={titleRef}
              className="input mt-1"
              placeholder="제목"
              value={title}
              enterKeyHint="done"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field-label">
            시간 (선택)
            <input
              className="input mt-1"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">
            저장
          </button>
          <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
            닫기
          </button>
        </form>
      ) : null}

      {editing ? (
        <form
          className="card p-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveEdit();
          }}
        >
          <label className="field-label">
            수정
            <input
              className="input mt-1"
              value={editTitle}
              autoFocus
              enterKeyHint="done"
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </label>
          <label className="field-label">
            시간
            <input
              className="input mt-1"
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">
            저장
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              닫기
            </button>
            <DeleteConfirm
              onDelete={() => {
                deleteTask(editing.id);
                setEditing(null);
                flash("삭제됨");
              }}
            />
          </div>
        </form>
      ) : null}

      {!adding && !editing && plan.length === 0 ? (
        <EmptyState text="오늘 할 일이 없습니다." action="＋ 할 일 추가" onAction={openAdd} />
      ) : null}

      {plan.length > 0 ? (
        <div className="card overflow-hidden">
          {plan.map((t) => (
            <SwipeRow
              key={t.id}
              onDelete={() => {
                if (t.virtual) return;
                deleteTask(t.id);
                flash("삭제됨");
              }}
            >
              <div className="row">
                <button
                  type="button"
                  className="hit"
                  aria-label={t.done ? "완료 취소" : "완료"}
                  onClick={() => toggleDone(t.id, selectedDate)}
                >
                  <span className={`check ${t.done ? "on" : ""}`}>{t.done ? "✓" : ""}</span>
                </button>
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => toggleDone(t.id, selectedDate)}
                >
                  <span className={`block text-[16px] ${t.done ? "line-through text-muted" : ""}`}>
                    {t.title}
                  </span>
                  <span className="text-[13px] text-muted">
                    {formatRange(t.minutes, endMinutesOf(t))}
                  </span>
                </button>
                {!t.virtual ? (
                  <button type="button" className="btn-secondary" onClick={() => openEdit(t)}>
                    수정
                  </button>
                ) : null}
              </div>
            </SwipeRow>
          ))}
        </div>
      ) : null}

      {!adding && !editing && plan.length > 0 ? (
        <div className="sticky-cta">
          <button type="button" className="btn-primary" onClick={openAdd}>
            ＋ 할 일 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
