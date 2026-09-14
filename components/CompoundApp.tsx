'use client';

import { BottomNav } from "@/components/BottomNav";
import { CalendarTab } from "@/components/CalendarTab";
import { LogTab } from "@/components/LogTab";
import { ProjectsTab } from "@/components/ProjectsTab";
import { PwaRegister } from "@/components/PwaRegister";
import { TodayTab } from "@/components/TodayTab";
import { CompoundProvider, useCompound } from "@/lib/store";
import { formatClock, todayISO } from "@/lib/dates";
import { useEffect, useState } from "react";

function Shell() {
  const { ready, tab, setTab, planFor } = useCompound();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const t = () => setClock(formatClock());
    t();
    const id = window.setInterval(t, 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!ready) {
    return (
      <div className="page-desk">
        <div className="phone">
          <div className="brand-bar">
            <span className="brand">Compound</span>
            <span className="brand-meta">불러오는 중</span>
          </div>
          <PwaRegister />
          <main className="scroll">
            <p className="text-muted mt-8 text-[15px]">원장을 여는 중</p>
          </main>
        </div>
      </div>
    );
  }

  const todayPlan = planFor(todayISO());
  const done = todayPlan.filter((t) => t.done).length;

  return (
    <div className="page-desk">
      <div className="phone">
        <div className="brand-bar">
          <span className="brand">Compound</span>
          <span className="brand-meta">
            {clock || "—"} · {done}/{todayPlan.length}
          </span>
        </div>
        <PwaRegister />
        <main className="scroll">
          {tab === "today" ? <TodayTab /> : null}
          {tab === "calendar" ? <CalendarTab /> : null}
          {tab === "projects" ? <ProjectsTab /> : null}
          {tab === "log" ? <LogTab /> : null}
        </main>
        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </div>
  );
}

export function CompoundApp() {
  return (
    <CompoundProvider>
      <Shell />
    </CompoundProvider>
  );
}
