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
}: {
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty card">
      <p>{text}</p>
      <button type="button" className="btn-primary" onClick={onAction}>
        {action}
      </button>
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
      onClick={() => {
        if (!ask) {
          setAsk(true);
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
