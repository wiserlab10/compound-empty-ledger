'use client';

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("로그인 처리 중");

  useEffect(() => {
    const supabase = getSupabase();
    const href = window.location.href;
    const run = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(href);
      if (error) {
        const hash = new URL(href).hash;
        if (!hash.includes("access_token")) {
          setMsg(error.message);
          return;
        }
      }
      window.location.replace("/");
    };
    void run();
  }, []);

  return (
    <div className="page-desk">
      <div className="phone">
        <main className="scroll">
          <h1 className="large-title mt-6">Compound</h1>
          <p className="subhead">{msg}</p>
        </main>
      </div>
    </div>
  );
}
