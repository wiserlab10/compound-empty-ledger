"use client";

import type { TabId } from "@/lib/types";

const TABS: { id: TabId; code: string; name: string }[] = [
  { id: "today", code: "TDY", name: "오늘" },
  { id: "calendar", code: "CAL", name: "캘린더" },
  { id: "projects", code: "PRJ", name: "프로젝트" },
  { id: "log", code: "LOG", name: "기록" },
];

export function BottomNav({
  tab,
  onChange,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="주 메뉴">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="nav-item"
          data-on={tab === t.id}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-code">{t.code}</span>
          <span className="nav-name">{t.name}</span>
        </button>
      ))}
    </nav>
  );
}
