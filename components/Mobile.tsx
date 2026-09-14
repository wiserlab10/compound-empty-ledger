'use client';

import { useEffect, useRef, useState, type ReactNode } from "react";

export function useFlash() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(""), 1400);
    return () => window.clearTimeout(t);
  }, [msg]);
  return {
    flash: setMsg,
    node: msg ? (
      <div className="toast" role="status">
        {msg}
      </div>
    ) : null,
  };
}

export function EmptyState({
  text,
  action,
  onAction,
  children,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="empty card">
      <p>{text}</p>
      {children}
      {action && onAction ? (
        <button type="button" className="btn-primary" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function DeleteConfirm({
  onDelete,
  label = "삭제",
}: {
  onDelete: () => void;
  label?: string;
}) {
  const [ask, setAsk] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      style={ask ? { color: "var(--color-danger)" } : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!ask) {
          setAsk(true);
          return;
        }
        if (!window.confirm("정말 삭제할까요?")) {
          setAsk(false);
          return;
        }
        onDelete();
        setAsk(false);
      }}
    >
      {ask ? "정말 삭제" : label}
    </button>
  );
}

export function SwipeRow({
  children,
  onDelete,
}: {
  children: ReactNode;
  onDelete: () => void;
}) {
  const [x, setX] = useState(0);
  const start = useRef(0);

  return (
    <div className="swipe-wrap">
      <button
        type="button"
        className="swipe-del"
        onClick={() => {
          if (window.confirm("이 항목을 삭제할까요?")) onDelete();
          setX(0);
        }}
      >
        삭제
      </button>
      <div
        className="swipe-front"
        style={{ transform: `translateX(${x}px)` }}
        onTouchStart={(e) => {
          start.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          const dx = e.touches[0].clientX - start.current;
          if (dx < 0) setX(Math.max(-80, dx));
          else setX(0);
        }}
        onTouchEnd={() => setX((v) => (v < -40 ? -80 : 0))}
      >
        {children}
      </div>
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <button type="button" className="text-link" onClick={onClose}>
            닫기
          </button>
          <h2>{title}</h2>
          <span className="text-link" style={{ visibility: "hidden" }}>
            닫기
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
