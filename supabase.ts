import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// STUBBED CONFIG — fill these in once you create your Supabase project.
// 1. Go to supabase.com -> New project
// 2. Project Settings -> API -> copy "Project URL" and "anon public" key
// 3. Put them in a .env.local file at the project root (see .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // We don't throw here so the app can still boot and show a friendly
  // "not configured" screen instead of a blank crash in dev.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill in your project credentials."
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  }
);
