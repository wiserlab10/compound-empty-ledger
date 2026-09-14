'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteConfirm, EmptyState, useFlash } from "@/components/Mobile";
import { useCompound } from "@/lib/store";
import type { TrackId } from "@/lib/types";

function trackStats(track: { subprojects: { tasks: { done: boolean }[] }[] }) {
  const tasks = track.subprojects.flatMap((s) => s.tasks);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  return { total: tasks.length, done, pct };
}

export function ProjectsTab() {
  const {
    state,
    toggleProjectTask,
    addTrack,
    addTrackTask,
    renameTrack,
    deleteTrack,
    deleteProjectTask,
  } = useCompound();
  const { flash, node } = useFlash();
  const nameRef = useRef<HTMLInputElement>(null);
  const taskRef = useRef<HTMLInputElement>(null);

  const [openId, setOpenId] = useState<TrackId | "">("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [rename, setRename] = useState("");

  const track = state.projects.find((t) => t.id === openId) ?? null;

  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (track) {
      setRename(track.label);
      taskRef.current?.focus();
    }
  }, [track]);

  const rows = useMemo(
    () =>
      state.projects.map((p) => ({
        track: p,
        ...trackStats(p),
      })),
    [state.projects],
  );

  function createProject() {
    const name = newName.trim();
    if (!name) return;
    addTrack(name);
    setNewName("");
    setCreating(false);
    flash("추가됨");
  }

  function addTask() {
    if (!track) return;
    const title = taskTitle.trim();
    if (!title) return;
    addTrackTask(track.id, title);
    setTaskTitle("");
    flash("추가됨");
    requestAnimationFrame(() => taskRef.current?.focus());
  }

  if (track) {
    const stats = trackStats(track);
    const items = track.subprojects.flatMap((sp) => sp.tasks.map((task) => ({ sp, task })));
    return (
      <div className="flex flex-col gap-3 pt-1">
        {node}
        <button type="button" className="btn-secondary w-full" onClick={() => setOpenId("")}>
          ← 목록
        </button>
        <header>
          <input
            className="input"
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            onBlur={() => {
              if (rename.trim() && rename.trim() !== track.label) {
                renameTrack(track.id, rename.trim());
                flash("저장됨");
              }
            }}
          />
          <p className="text-muted text-[13px] mt-2">
            {stats.done}/{stats.total} · {stats.pct}%
          </p>
          <div className="meter mt-2">
            <span style={{ width: `${stats.pct}%` }} />
          </div>
        </header>

        <form
          className="card p-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
        >
          <label className="field-label">
            작업
            <input
              ref={taskRef}
              className="input mt-1"
              placeholder="할 일"
              value={taskTitle}
              enterKeyHint="done"
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">
            추가
          </button>
        </form>

        {items.length === 0 ? (
          <p className="text-muted text-[14px] px-1">작업을 위에 적고 추가하세요.</p>
        ) : (
          <div className="card overflow-hidden">
            {items.map(({ sp, task }) => (
              <div key={task.id} className="row">
                <button
                  type="button"
                  className="hit"
                  onClick={() => toggleProjectTask(track.id, sp.id, task.id)}
                >
                  <span className={`check ${task.done ? "on" : ""}`}>{task.done ? "✓" : ""}</span>
                </button>
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => toggleProjectTask(track.id, sp.id, task.id)}
                >
                  <span className={`block text-[16px] ${task.done ? "line-through text-muted" : ""}`}>
                    {task.title}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="삭제"
                  onClick={() => {
                    if (window.confirm("이 작업을 삭제할까요?")) {
                      deleteProjectTask(track.id, sp.id, task.id);
                      flash("삭제됨");
                    }
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <DeleteConfirm
          label="프로젝트 삭제"
          onDelete={() => {
            deleteTrack(track.id);
            setOpenId("");
            flash("삭제됨");
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      {node}
      <header>
        <h1 className="page-title">프로젝트</h1>
        <p className="text-muted text-[13px] mt-1">{state.projects.length}개</p>
      </header>

      {creating ? (
        <form
          className="card p-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            createProject();
          }}
        >
          <label className="field-label">
            이름
            <input
              ref={nameRef}
              className="input mt-1"
              placeholder="프로젝트"
              value={newName}
              enterKeyHint="done"
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">
            저장
          </button>
          <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
            닫기
          </button>
        </form>
      ) : null}

      {!creating && state.projects.length === 0 ? (
        <EmptyState text="프로젝트가 없습니다." action="＋ 프로젝트 추가" onAction={() => setCreating(true)} />
      ) : null}

      {rows.length > 0 ? (
        <div className="card overflow-hidden">
          {rows.map(({ track: p, done, total, pct }) => (
            <button key={p.id} type="button" className="row" onClick={() => setOpenId(p.id)}>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[16px]">{p.label}</span>
                <span className="block text-[13px] text-muted">
                  {done}/{total} · {pct}%
                </span>
                <span className="meter mt-2">
                  <span style={{ width: `${pct}%` }} />
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!creating && state.projects.length > 0 ? (
        <div className="sticky-cta">
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            ＋ 프로젝트 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
