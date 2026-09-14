'use client';

import { useEffect, useRef, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { DeleteConfirm, Sheet, SwipeRow, useFlash } from "@/components/Mobile";
import { TimeField } from "@/components/TimeField";
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
import { AREAS, AREA_MAP, type AreaId } from "@/lib/types";

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
  const emptyRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  const today = todayISO();
  const isToday = selectedDate === today;
  const plan = planFor(selectedDate);
  const doneCount = plan.filter((t) => t.done).length;
  const mins = nowMinutes();

  const [sheet, setSheet] = useState<"add" | "edit" | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [area, setArea] = useState<AreaId>("cls");
  const [repeat, setRepeat] = useState<"none" | "weekly">("none");
  const [advanced, setAdvanced] = useState(false);
  const [editing, setEditing] = useState<PlannedTask | null>(null);

  useEffect(() => {
    if (sheet) titleRef.current?.focus();
  }, [sheet]);

  useEffect(() => {
    if (plan.length === 0 && !sheet) emptyRef.current?.focus();
  }, [plan.length, sheet, selectedDate]);

  function resetComposer(focus?: HTMLInputElement | null) {
    setTitle("");
    setTime("");
    setNote("");
    setArea("cls");
    setRepeat("none");
    setAdvanced(false);
    requestAnimationFrame(() => focus?.focus());
  }

  function saveComposer() {
    const trimmed = title.trim();
    if (!trimmed) {
      (emptyRef.current ?? quickRef.current ?? titleRef.current)?.focus();
      return false;
    }
    const start = time ? parseTimeInput(time) : nowMinutes();
    const range = normalizeRange(start, start + 60);
    addTodayTask(trimmed, area, range.start, repeat === "weekly", note, range.end);
    flash("추가됨");
    return true;
  }

  function saveAdd() {
    if (!saveComposer()) return;
    resetComposer();
    setSheet(null);
  }

  function saveInline(focus?: HTMLInputElement | null) {
    if (!saveComposer()) return;
    resetComposer(focus);
  }

  function openEdit(task: PlannedTask) {
    if (task.virtual) return;
    setEditing(task);
    setTitle(task.title);
    setTime(toTimeInput(task.minutes));
    setNote(task.note ?? "");
    setArea(task.area);
    setRepeat(task.recurring ? "weekly" : "none");
    setAdvanced(Boolean(task.note || task.recurring || task.area !== "cls"));
    setSheet("edit");
  }

  function saveEdit() {
    if (!editing || editing.virtual) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    const start = time ? parseTimeInput(time) : editing.minutes;
    const range = normalizeRange(start, start + Math.max(30, endMinutesOf(editing) - editing.minutes));
    updateTask(editing.id, {
      title: trimmed,
      minutes: range.start,
      endMinutes: range.end,
      note: note.trim() || undefined,
      area,
    });
    setSheet(null);
    setEditing(null);
    flash("저장됨");
  }

  const composerFields = (mode: "empty" | "quick" | "sheet") => {
    const ref = mode === "empty" ? emptyRef : mode === "quick" ? quickRef : titleRef;
    const submitLabel = mode === "empty" ? "첫 작업 추가" : "추가";
    const isEdit = mode === "sheet" && sheet === "edit";
    return (
      <>
        <label className="field-label">
          제목
          <input
            ref={ref}
            className="input mt-1"
            placeholder="무엇을 할까요"
            value={title}
            enterKeyHint="done"
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field-label">
          시간 (선택)
          <div className="mt-1">
            <TimeField value={time} onChange={setTime} optional ariaLabel="시작 시간 24시" />
          </div>
        </label>
        {advanced ? (
          <div className="flex flex-col gap-3">
            <label className="field-label">
              메모
              <textarea
                className="input mt-1"
                placeholder="짧게"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div>
              <p className="field-label">영역</p>
              <div className="chip-row">
                {AREAS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="chip"
                    data-on={area === a.id}
                    onClick={() => setArea(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="field-label">반복</p>
              <div className="chip-row">
                <button
                  type="button"
                  className="chip"
                  data-on={repeat === "none"}
                  onClick={() => setRepeat("none")}
                >
                  없음
                </button>
                <button
                  type="button"
                  className="chip"
                  data-on={repeat === "weekly"}
                  onClick={() => setRepeat("weekly")}
                >
                  주간
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="text-link px-0 self-start"
          onClick={() => setAdvanced((v) => !v)}
        >
          {advanced ? "간단히" : "메모·영역·반복"}
        </button>
        <button type="submit" className="btn-primary">
          {isEdit ? "저장" : submitLabel}
        </button>
      </>
    );
  };

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

      <div className="jump-row">
        <button
          type="button"
          className="jump-link"
          onClick={() => {
            if (plan.length === 0) emptyRef.current?.focus();
            else quickRef.current?.focus();
          }}
        >
          <IconPlus className="jump-icon" /> 할 일
        </button>
        <button
          type="button"
          className="jump-link"
          onClick={() => {
            setSelectedDate(today);
            setTab("calendar");
          }}
        >
          캘린더
        </button>
        <button type="button" className="jump-link" onClick={() => setTab("projects")}>
          프로젝트
        </button>
        <button type="button" className="jump-link" onClick={() => setTab("log")}>
          기록
        </button>
      </div>

      <p className="section-title">오늘</p>
      {plan.length === 0 ? (
        <div className="empty card">
          <p>오늘 할 일이 없습니다.</p>
          <form
            className="empty-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveInline(emptyRef.current);
            }}
          >
            {composerFields("empty")}
          </form>
        </div>
      ) : (
        <>
          <form
            className="card p-3 flex flex-col gap-3 mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveInline(quickRef.current);
            }}
          >
            {composerFields("quick")}
          </form>
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
                      {t.recurring ? " · 주간" : ""}
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
        </>
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
          {composerFields("sheet")}
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
