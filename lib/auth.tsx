'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { authRedirectTo, getSupabase } from "./supabase";

type AuthValue = {
  ready: boolean;
  user: User | null;
  email: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  sendMagic: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (session?.user) setOpen(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    return error ? koreanAuthError(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectTo() },
    });
    if (error) return koreanAuthError(error.message);
    if (!data.session) return "확인 메일을 보냈습니다. 받은편지함을 열어주세요.";
    return null;
  }, []);

  const sendMagic = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirectTo() },
    });
    if (error) return koreanAuthError(error.message);
    return "로그인 링크를 보냈습니다. 같은 브라우저에서 열어주세요.";
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      user,
      email: user?.email ?? "",
      open,
      setOpen,
      signIn,
      signUp,
      sendMagic,
      signOut,
    }),
    [ready, user, open, signIn, signUp, sendMagic, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function koreanAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "이메일 또는 비밀번호가 맞지 않습니다.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "이미 가입된 이메일입니다. 로그인하세요.";
  }
  if (m.includes("password")) return "비밀번호는 6자 이상이어야 합니다.";
  if (m.includes("rate")) return "잠시 후 다시 시도하세요.";
  return message;
}
