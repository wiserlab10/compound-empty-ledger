'use client';

import { useState } from "react";
import { Sheet } from "@/components/Mobile";
import { useAuth } from "@/lib/auth";
import { useCompound } from "@/lib/store";

export function AuthBar() {
  const { user, email, open, setOpen, signIn, signUp, sendMagic, signOut } = useAuth();
  const { syncStatus } = useCompound();
  const [mode, setMode] = useState<"in" | "up" | "magic">("in");
  const [addr, setAddr] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    const mail = addr.trim();
    if (!mail) return;
    setBusy(true);
    setMsg("");
    let next: string | null = null;
    if (mode === "magic") next = await sendMagic(mail);
    else if (mode === "up") next = await signUp(mail, password);
    else next = await signIn(mail, password);
    setBusy(false);
    if (next) setMsg(next);
  }

  if (user) {
    return (
      <div className="auth-bar">
        <p className="min-w-0 truncate">
          {syncStatus === "syncing" ? "동기화 중" : syncStatus === "error" ? "동기화 실패" : "동기화됨"}
          <span className="text-muted"> · {email}</span>
        </p>
        <button type="button" className="text-link" onClick={() => void signOut()}>
          나가기
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="auth-bar">
        <p>로그인하면 기기 간 동기화</p>
        <button type="button" className="text-link" onClick={() => setOpen(true)}>
          로그인
        </button>
      </div>
      <Sheet open={open} title="계정" onClose={() => setOpen(false)}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="text-[13px] text-muted">
            iOS 홈 화면에서는 이메일·비밀번호가 가장 안정적입니다. 링크는 메일이 같은 브라우저에서 열려야 합니다.
          </p>
          <label className="field-label">
            이메일
            <input
              className="input mt-1"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="you@email.com"
            />
          </label>
          {mode !== "magic" ? (
            <label className="field-label">
              비밀번호
              <input
                className="input mt-1"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
              />
            </label>
          ) : null}
          {msg ? <p className="text-[13px]">{msg}</p> : null}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy
              ? "처리 중"
              : mode === "up"
                ? "계정 만들기"
                : mode === "magic"
                  ? "링크 보내기"
                  : "로그인"}
          </button>
          <div className="chip-row">
            <button type="button" className="chip" data-on={mode === "in"} onClick={() => setMode("in")}>
              로그인
            </button>
            <button type="button" className="chip" data-on={mode === "up"} onClick={() => setMode("up")}>
              가입
            </button>
            <button type="button" className="chip" data-on={mode === "magic"} onClick={() => setMode("magic")}>
              이메일 링크
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
