'use client';

import { useEffect, useRef, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { DeleteConfirm, EmptyState, Sheet, SwipeRow, useFlash } from "@/components/Mobile";
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
import { AREA_MAP } from "@/lib/types";

function greeting(mins: number) {
  const h = mins / 60;
  if (h < 12) return "좋은 아침";
  if (h < 18) return "좋은 오후";
  return "좋은 저녁";
}

export function TodayTab() {
  const {
    selectedDate,
    setSelectedDate,
    setTab,
    planFor,
    toggleDone,
    addTodayTask,
    deleteTask,
    updateTask,
  } = useCompound();
  const { flash, node } = useFlash();
  const titleRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const isToday = selectedDate === today;
  const plan = planFor(selectedDate);
  const doneCount = plan.filter((t) => t.done).length;
  const mins = nowMinutes();

  const [sheet, setSheet] = useState<"add" | "edit" | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [editing, setEditing] = useState<PlannedTask | null>(null);

  useEffect(() => {
    if (sheet) titleRef.current?.focus();
  }, [sheet]);

  function openAdd() {
    setEditing(null);
    setTitle("");
    setTime(toTimeInput(nowMinutes()));
    setSheet("add");
  }

  function saveAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const start = time ? parseTimeInput(time) : nowMinutes();
    const range = normalizeRange(start, start + 60);
    addTodayTask(trimmed, "cls", range.start, false, undefined, range.end);
    setTitle("");
    setSheet(null);
    flash("추가됨");
  }

  function openEdit(task: PlannedTask) {
    if (task.virtual) return;
    setEditing(task);
    setTitle(task.title);
    setTime(toTimeInput(task.minutes));
    setSheet("edit");
  }

  function saveEdit() {
    if (!editing || editing.virtual) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const start = time ? parseTimeInput(time) : editing.minutes;
    const range = normalizeRange(start, start + Math.max(30, endMinutesOf(editing) - editing.minutes));
    updateTask(editing.id, { title: trimmed, minutes: range.start, endMinutes: range.end });
    setSheet(null);
    setEditing(null);
    flash("저장됨");
  }

  return (
    <div className="pt-2">
      {node}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="large-title">{isToday ? greeting(mins) : formatKoreanDate(selectedDate)}</h1>
          <p className="subhead">
            {isToday ? formatKoreanDate(today) : selectedDate} · {doneCount}/{plan.length} 완료
          </p>
        </div>
        <div className="flex gap-1 pt-1">
          <button type="button" className="btn-icon" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
            ‹
          </button>
          <button type="button" className="btn-icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            ›
          </button>
        </div>
      </header>

      {!isToday ? (
        <button type="button" className="btn-secondary w-full mt-3" onClick={() => setSelectedDate(today)}>
          오늘로
        </button>
      ) : null}

      <div className="capsules">
        <button type="button" className="capsule" onClick={openAdd}>
          <IconPlus className="nav-icon" /> 할 일
        </button>
        <button
          type="button"
          className="capsule"
          onClick={() => {
            setSelectedDate(today);
            setTab("calendar");
          }}
        >
          <IconPlus className="nav-icon" /> 일정
        </button>
        <button type="button" className="capsule" onClick={() => setTab("log")}>
          <IconPlus className="nav-icon" /> 운동
        </button>
        <button type="button" className="capsule" onClick={() => setTab("projects")}>
          <IconPlus className="nav-icon" /> 프로젝트
        </button>
      </div>

      <p className="section-title">오늘 일정</p>
      {plan.length === 0 ? (
        <EmptyState text="오늘 할 일이 없습니다." action="할 일 추가" onAction={openAdd} />
      ) : (
        <div className="card">
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
                  <span className={`block text-[17px] ${t.done ? "line-through text-muted" : ""}`}>
                    {t.title}
                  </span>
                  <span className="text-[13px] text-muted flex items-center gap-1.5 mt-0.5">
                    <span className={`area-dot ${t.area}`} />
                    {formatRange(t.minutes, endMinutesOf(t))} · {AREA_MAP[t.area].label}
                  </span>
                </button>
                {!t.virtual ? (
                  <button type="button" className="text-link" onClick={() => openEdit(t)}>
                    수정
                  </button>
                ) : null}
              </div>
            </SwipeRow>
          ))}
        </div>
      )}

      <Sheet
        open={sheet !== null}
        title={sheet === "edit" ? "할 일 수정" : "할 일"}
        onClose={() => {
          setSheet(null);
          setEditing(null);
        }}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (sheet === "edit") saveEdit();
            else saveAdd();
          }}
        >
          <label className="field-label">
            제목
            <input
              ref={titleRef}
              className="input mt-1"
              placeholder="무엇을 할까요"
              value={title}
              enterKeyHint="done"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field-label">
            시간 (선택)
            <input className="input mt-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary">
            저장
          </button>
          {sheet === "edit" && editing && !editing.virtual ? (
            <DeleteConfirm
              onDelete={() => {
                deleteTask(editing.id);
                setSheet(null);
                setEditing(null);
                flash("삭제됨");
              }}
            />
          ) : null}
        </form>
      </Sheet>
    </div>
  );
}
