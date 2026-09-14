import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zubhbpekaggxelguzfup.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YmhicGVrYWdneGVsZ3V6ZnVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODE1NjcsImV4cCI6MjEwNDE1NzU2N30.h5M3NjMNDlhpixLh1IqqoRzUiXg1w73JN_RSEt1coN8";

let browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (browserClient) return browserClient;
  browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return browserClient;
}

export function authRedirectTo() {
  if (typeof window === "undefined") return "https://compound-two-lyart.vercel.app/auth/callback";
  return `${window.location.origin}/auth/callback`;
}
