'use client';

import { BottomNav } from "@/components/BottomNav";
import { CalendarTab } from "@/components/CalendarTab";
import { LogTab } from "@/components/LogTab";
import { ProjectsTab } from "@/components/ProjectsTab";
import { PwaRegister } from "@/components/PwaRegister";
import { TodayTab } from "@/components/TodayTab";
import { CompoundProvider, useCompound } from "@/lib/store";

function Shell() {
  const { ready, tab, setTab } = useCompound();

  if (!ready) {
    return (
      <div className="page-desk">
        <div className="phone">
          <PwaRegister />
          <main className="scroll">
            <h1 className="large-title mt-6">Compound</h1>
            <p className="subhead">원장을 여는 중</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="page-desk">
      <div className="phone">
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
