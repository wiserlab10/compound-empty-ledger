'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevron } from "@/components/Icons";
import { EmptyState, useFlash } from "@/components/Mobile";
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

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingId, setAddingId] = useState<TrackId | "">("");
  const [taskTitle, setTaskTitle] = useState("");
  const [openId, setOpenId] = useState<TrackId | "">("");

  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (addingId) taskRef.current?.focus();
  }, [addingId]);

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

  function addTaskOn(trackId: TrackId) {
    const title = taskTitle.trim();
    if (!title) {
      taskRef.current?.focus();
      return;
    }
    addTrackTask(trackId, title);
    setTaskTitle("");
    flash("추가됨");
    requestAnimationFrame(() => taskRef.current?.focus());
  }

  function removeTrack(id: TrackId, label: string) {
    if (!window.confirm(`「${label}」 프로젝트를 삭제할까요?`)) return;
    deleteTrack(id);
    if (openId === id) setOpenId("");
    if (addingId === id) setAddingId("");
    flash("삭제됨");
  }

  function startAdd(id: TrackId) {
    setOpenId(id);
    setAddingId(id);
    setTaskTitle("");
  }

  return (
    <div className="pt-2">
      {node}
      <header>
        <h1 className="large-title">프로젝트</h1>
        <p className="subhead">{state.projects.length === 0 ? "아직 없음" : `${state.projects.length}개`}</p>
      </header>

      {state.projects.length === 0 && !creating ? (
        <div className="mt-4">
          <EmptyState
            text="프로젝트가 없습니다."
            action="프로젝트 추가"
            onAction={() => setCreating(true)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-4">
          {rows.map(({ track: p, done, total, pct }) => {
            const items = p.subprojects.flatMap((sp) => sp.tasks.map((task) => ({ sp, task })));
            const open = openId === p.id || addingId === p.id || items.length === 0;
            return (
              <div key={p.id} className="card">
                <div className="row">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left flex items-center gap-2"
                    onClick={() => setOpenId((cur) => (cur === p.id ? "" : p.id))}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px]">{p.label}</span>
                      <span className="block text-[13px] text-muted">
                        {done}/{total} · {pct}%
                      </span>
                    </span>
                    <IconChevron />
                  </button>
                  <button type="button" className="text-link" onClick={() => startAdd(p.id)}>
                    작업
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`${p.label} 삭제`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeTrack(p.id, p.label);
                    }}
                  >
                    ×
                  </button>
                </div>
                {open ? (
                  <div className="px-3 pb-3">
                    <div className="meter mb-2">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <input
                      className="input mb-2"
                      value={p.label}
                      aria-label="프로젝트 이름"
                      onChange={(e) => renameTrack(p.id, e.target.value)}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next && next !== p.label) {
                          renameTrack(p.id, next);
                          flash("저장됨");
                        }
                      }}
                    />
                    {items.length === 0 && addingId !== p.id ? (
                      <div className="empty" style={{ padding: "16px 8px 8px" }}>
                        <p>작업이 없습니다. 트랙에서 바로 추가하세요.</p>
                        <button type="button" className="btn-primary" onClick={() => startAdd(p.id)}>
                          작업 추가
                        </button>
                      </div>
                    ) : (
                      items.map(({ sp, task }) => (
                        <div key={task.id} className="row" style={{ paddingLeft: 4, paddingRight: 4 }}>
                          <button
                            type="button"
                            className="hit"
                            onClick={() => toggleProjectTask(p.id, sp.id, task.id)}
                          >
                            <span className={`check ${task.done ? "on" : ""}`}>{task.done ? "✓" : ""}</span>
                          </button>
                          <button
                            type="button"
                            className="flex-1 min-w-0 text-left"
                            onClick={() => toggleProjectTask(p.id, sp.id, task.id)}
                          >
                            <span className={`block text-[17px] ${task.done ? "line-through text-muted" : ""}`}>
                              {task.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            aria-label="작업 삭제"
                            onClick={() => {
                              if (window.confirm("이 작업을 삭제할까요?")) {
                                deleteProjectTask(p.id, sp.id, task.id);
                                flash("삭제됨");
                              }
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                    {addingId === p.id ? (
                      <form
                        className="flex flex-col gap-2 mt-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          addTaskOn(p.id);
                        }}
                      >
                        <input
                          ref={taskRef}
                          className="input"
                          placeholder="할 일"
                          value={taskTitle}
                          enterKeyHint="done"
                          autoComplete="off"
                          onChange={(e) => setTaskTitle(e.target.value)}
                        />
                        <button type="submit" className="btn-primary">
                          작업 추가
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {creating ? (
        <form
          className="card p-3 mt-3 flex flex-col gap-3"
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
              autoComplete="off"
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">
            저장
          </button>
          <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
            취소
          </button>
        </form>
      ) : state.projects.length > 0 ? (
        <div className="sticky-cta">
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            프로젝트 추가
          </button>
        </div>
      ) : null}
    </div>
  );
}
