'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteConfirm, EmptyState, Sheet, useFlash } from "@/components/Mobile";
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
  const [addingTask, setAddingTask] = useState(false);
  const [newName, setNewName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [rename, setRename] = useState("");

  const track = state.projects.find((t) => t.id === openId) ?? null;

  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (addingTask) taskRef.current?.focus();
  }, [addingTask]);

  useEffect(() => {
    if (track) setRename(track.label);
  }, [track]);

  const rows = useMemo(
    () => state.projects.map((p) => ({ track: p, ...trackStats(p) })),
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
    setAddingTask(false);
    flash("추가됨");
  }

  if (track) {
    const stats = trackStats(track);
    const items = track.subprojects.flatMap((sp) => sp.tasks.map((task) => ({ sp, task })));
    return (
      <div className="pt-2">
        {node}
        <button type="button" className="text-link px-0" onClick={() => setOpenId("")}>
          ← 목록
        </button>
        <header className="mt-1">
          <input
            className="large-title"
            style={{ width: "100%", border: 0, background: "transparent", padding: 0, minHeight: 44 }}
            value={rename}
            onChange={(e) => setRename(e.target.value)}
            onBlur={() => {
              if (rename.trim() && rename.trim() !== track.label) {
                renameTrack(track.id, rename.trim());
                flash("저장됨");
              }
            }}
          />
          <p className="subhead">
            {stats.done}/{stats.total} · {stats.pct}%
          </p>
          <div className="meter mt-3">
            <span style={{ width: `${stats.pct}%` }} />
          </div>
        </header>

        <p className="section-title">작업</p>
        {items.length === 0 ? (
          <EmptyState text="작업이 없습니다." action="작업 추가" onAction={() => setAddingTask(true)} />
        ) : (
          <div className="card">
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
                  <span className={`block text-[17px] ${task.done ? "line-through text-muted" : ""}`}>
                    {task.title}
                  </span>
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    if (window.confirm("이 작업을 삭제할까요?")) {
                      deleteProjectTask(track.id, sp.id, task.id);
                      flash("삭제됨");
                    }
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="sticky-cta">
            <button type="button" className="btn-primary" onClick={() => setAddingTask(true)}>
              작업 추가
            </button>
          </div>
        ) : null}

        <div className="mt-4">
          <DeleteConfirm
            label="프로젝트 삭제"
            onDelete={() => {
              deleteTrack(track.id);
              setOpenId("");
              flash("삭제됨");
            }}
          />
        </div>

        <Sheet open={addingTask} title="작업" onClose={() => setAddingTask(false)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              addTask();
            }}
          >
            <label className="field-label">
              제목
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
        </Sheet>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {node}
      <header>
        <h1 className="large-title">프로젝트</h1>
        <p className="subhead">{state.projects.length === 0 ? "아직 없음" : `${state.projects.length}개`}</p>
      </header>

      {state.projects.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="프로젝트가 없습니다." action="프로젝트 추가" onAction={() => setCreating(true)} />
        </div>
      ) : (
        <div className="card mt-4">
          {rows.map(({ track: p, done, total, pct }) => (
            <button key={p.id} type="button" className="row" onClick={() => setOpenId(p.id)}>
              <span className="area-dot wiser" />
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[17px]">{p.label}</span>
                <span className="block text-[13px] text-muted">
                  {done}/{total} · {pct}%
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {state.projects.length > 0 ? (
        <div className="sticky-cta">
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            프로젝트 추가
          </button>
        </div>
      ) : null}

      <Sheet open={creating} title="새 프로젝트" onClose={() => setCreating(false)}>
        <form
          className="flex flex-col gap-3"
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
        </form>
      </Sheet>
    </div>
  );
}
