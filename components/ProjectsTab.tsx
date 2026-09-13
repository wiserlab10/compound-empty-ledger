"use client";

import { useMemo, useState } from "react";
import { Blueprint } from "@/components/Blueprint";
import { useCompound } from "@/lib/store";
import type { TrackId } from "@/lib/types";

export function ProjectsTab() {
  const {
    state,
    toggleProjectTask,
    addSubproject,
    renameSubproject,
    addProjectTask,
    setProjectTaskDue,
    addTrack,
    renameTrack,
    deleteTrack,
    deleteSubproject,
    deleteProjectTask,
  } = useCompound();
  const [trackId, setTrackId] = useState<TrackId>(state.projects[0]?.id ?? "");
  const [open, setOpen] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [rename, setRename] = useState("");
  const [newTrack, setNewTrack] = useState("");
  const [subRename, setSubRename] = useState("");

  const track = state.projects.find((t) => t.id === trackId) ?? state.projects[0];

  const progress = useMemo(() => {
    if (!track) return 0;
    const tasks = track.subprojects.flatMap((s) => s.tasks);
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
  }, [track]);

  if (!track) {
    return (
      <div className="flex flex-col gap-4 pt-1">
        <header>
          <p className="section-label">Tracks</p>
          <h1 className="heading-display text-[42px] mt-1">프로젝트</h1>
        </header>
        <Blueprint className="p-4">
          <p className="text-[14px]">트랙이 없습니다.</p>
          <p className="text-muted text-[12px] mt-1">
            미리 채워 둔 트랙은 없습니다. 이름을 만들면 하위 작업과 마감일을 붙일 수 있습니다.
          </p>
        </Blueprint>
        <Blueprint className="p-3 flex flex-col gap-2">
          <p className="section-label">New track</p>
          <input className="input" placeholder="트랙 이름" value={newTrack} onChange={(e) => setNewTrack(e.target.value)} />
          <button
            type="button"
            className="btn"
            style={{ background: "var(--neutral-900)", color: "#fff" }}
            onClick={() => {
              if (!newTrack.trim()) return;
              addTrack(newTrack.trim());
              setNewTrack("");
            }}
          >
            트랙 추가
          </button>
        </Blueprint>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-1">
      <header className="flex items-end justify-between">
        <div>
          <p className="section-label">Tracks</p>
          <h1 className="heading-display text-[42px] mt-1">프로젝트</h1>
        </div>
        <p className="heading-display text-[28px] text-[var(--color-accent)]">{progress}%</p>
      </header>

      <div className="flex flex-wrap gap-1">
        {state.projects.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn-secondary"
            style={
              t.id === track.id
                ? { background: "var(--neutral-900)", color: "#fff", borderColor: "#111" }
                : undefined
            }
            onClick={() => setTrackId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Blueprint className="p-3 flex flex-col gap-2">
        <p className="section-label">{track.label} · 이름 변경</p>
        <div className="flex gap-2">
          <input className="input" value={rename} placeholder={track.label} onChange={(e) => setRename(e.target.value)} />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (!rename.trim()) return;
              renameTrack(track.id, rename.trim());
              setRename("");
            }}
          >
            이름
          </button>
        </div>
        <div className="meter mt-1">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="text-muted text-[12px]">
          {track.subprojects.flatMap((s) => s.tasks).filter((t) => t.done).length} /{" "}
          {track.subprojects.flatMap((s) => s.tasks).length} 완료
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (!window.confirm(`「${track.label}」 트랙을 삭제할까요?`)) return;
            deleteTrack(track.id);
          }}
        >
          트랙 삭제
        </button>
      </Blueprint>

      {track.subprojects.length === 0 ? (
        <Blueprint className="p-4">
          <p className="text-[14px]">하위 프로젝트가 비어 있습니다.</p>
          <p className="text-muted text-[12px] mt-1">이름만 넣으면 바로 작업과 마감일을 붙일 수 있습니다.</p>
        </Blueprint>
      ) : null}

      {track.subprojects.map((sp) => {
        const pct =
          sp.tasks.length === 0
            ? 0
            : Math.round((sp.tasks.filter((t) => t.done).length / sp.tasks.length) * 100);
        const expanded = open === sp.id;
        return (
          <Blueprint key={sp.id}>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-3 text-left"
              onClick={() => {
                setOpen(expanded ? "" : sp.id);
                setSubRename(sp.title);
              }}
            >
              <span className="heading-display text-[20px] flex-1">{sp.title}</span>
              <span className="section-label">{pct}%</span>
              <span className="text-muted text-[12px]">{expanded ? "▾" : "▸"}</span>
            </button>
            {expanded ? (
              <div className="px-3 pb-3">
                <div className="flex gap-2 mb-2">
                  <input className="input" value={subRename} onChange={(e) => setSubRename(e.target.value)} />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (!subRename.trim()) return;
                      renameSubproject(track.id, sp.id, subRename.trim());
                    }}
                  >
                    이름
                  </button>
                </div>
                <div className="meter mb-2">
                  <span style={{ width: `${pct}%` }} />
                </div>
                {sp.tasks.length === 0 ? (
                  <p className="text-muted text-[13px] py-2">작업 없음</p>
                ) : (
                  sp.tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1.5">
                      <button type="button" onClick={() => toggleProjectTask(track.id, sp.id, t.id)}>
                        <span className={`check ${t.done ? "on" : ""}`}>{t.done ? "✓" : ""}</span>
                      </button>
                      <span className={`flex-1 text-[14px] ${t.done ? "line-through text-muted" : ""}`}>
                        {t.title}
                      </span>
                      <input
                        className="input"
                        type="date"
                        style={{ width: 132, padding: "4px 6px" }}
                        value={t.due ?? ""}
                        onChange={(e) => setProjectTaskDue(track.id, sp.id, t.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="작업 삭제"
                        onClick={() => deleteProjectTask(track.id, sp.id, t.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
                <div className="flex flex-col gap-2 mt-2">
                  <input
                    className="input"
                    placeholder="작업 제목"
                    value={open === sp.id ? taskTitle : ""}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="date"
                      value={taskDue}
                      onChange={(e) => setTaskDue(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn"
                      style={{ background: "var(--neutral-900)", color: "#fff" }}
                      onClick={() => {
                        if (!taskTitle.trim()) return;
                        addProjectTask(track.id, sp.id, taskTitle.trim(), taskDue || undefined);
                        setTaskTitle("");
                        setTaskDue("");
                      }}
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        if (!window.confirm(`「${sp.title}」를 삭제할까요?`)) return;
                        deleteSubproject(track.id, sp.id);
                        setOpen("");
                      }}
                    >
                      하위 삭제
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </Blueprint>
        );
      })}

      <Blueprint className="p-3 flex flex-col gap-2">
        <p className="section-label">Add subproject</p>
        <input
          className="input"
          placeholder="하위 프로젝트 이름"
          value={subTitle}
          onChange={(e) => setSubTitle(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (!subTitle.trim()) return;
            addSubproject(track.id, subTitle.trim());
            setSubTitle("");
          }}
        >
          하위 프로젝트 추가
        </button>
      </Blueprint>

      <Blueprint className="p-3 flex flex-col gap-2">
        <p className="section-label">New track</p>
        <input className="input" placeholder="트랙 이름" value={newTrack} onChange={(e) => setNewTrack(e.target.value)} />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (!newTrack.trim()) return;
            addTrack(newTrack.trim());
            setNewTrack("");
          }}
        >
          트랙 추가
        </button>
      </Blueprint>
    </div>
  );
}
