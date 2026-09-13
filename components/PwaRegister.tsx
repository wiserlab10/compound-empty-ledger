"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const modes = ["standalone", "fullscreen", "minimal-ui"] as const;
  if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) {
    return true;
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* ignore offline register errors */
      });
    }

    setStandalone(isStandalone());
    setDismissed(window.localStorage.getItem("compound.install.dismissed") === "1");

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || dismissed) return null;

  return (
    <div className="install-bar" role="region" aria-label="홈 화면 설치">
      <div className="min-w-0">
        <p className="section-label">Install</p>
        <p className="text-[12px] leading-snug mt-0.5">
          {deferred
            ? "Android Chrome에서 홈 화면에 추가합니다."
            : "Chrome ⋮ → 앱 설치 · Safari 공유 → 홈 화면에 추가"}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {deferred ? (
          <button
            type="button"
            className="btn"
            style={{ background: "var(--neutral-900)", color: "#fff", minHeight: 32 }}
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            }}
          >
            설치
          </button>
        ) : null}
        <button
          type="button"
          className="btn-icon"
          aria-label="설치 안내 닫기"
          onClick={() => {
            window.localStorage.setItem("compound.install.dismissed", "1");
            setDismissed(true);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
