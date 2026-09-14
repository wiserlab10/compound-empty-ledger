'use client';

import type { TabId } from "@/lib/types";

const TABS: { id: TabId; name: string }[] = [
  { id: "today", name: "오늘" },
  { id: "calendar", name: "캘린더" },
  { id: "projects", name: "프로젝트" },
  { id: "log", name: "기록" },
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
          aria-current={tab === t.id ? "page" : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-name">{t.name}</span>
        </button>
      ))}
    </nav>
  );
}
